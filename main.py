from pathlib import Path
from urllib.parse import urlsplit, urljoin, unquote
import ipaddress
import socket
import re

import aiohttp
from aiohttp.abc import AbstractResolver
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent
PLATFORMS = {
    "youtube.com": "YouTube", "youtu.be": "YouTube",
    "tiktok.com": "TikTok", "instagram.com": "Instagram",
    "facebook.com": "Facebook", "fb.watch": "Facebook",
    "x.com": "X", "twitter.com": "X", "vimeo.com": "Vimeo",
}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"}
MEDIA_EXTENSIONS = VIDEO_EXTENSIONS | AUDIO_EXTENSIONS
MAX_DOWNLOAD_BYTES = 150 * 1024 * 1024
MAX_REDIRECTS = 4

app = FastAPI(title="AyoDownloader API", version="7.0.0")


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)

    @field_validator("url")
    @classmethod
    def trim_url(cls, value: str) -> str:
        return value.strip()


class DownloadRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)

    @field_validator("url")
    @classmethod
    def trim_url(cls, value: str) -> str:
        return value.strip()


def validate_public_url(raw: str) -> str:
    try:
        parsed = urlsplit(raw)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError
        if parsed.username or parsed.password:
            raise ValueError
        if parsed.port not in (None, 80, 443):
            raise ValueError
        host = parsed.hostname.lower().rstrip(".")
        if host == "localhost" or host.endswith((".localhost", ".local")):
            raise ValueError
        try:
            ip = ipaddress.ip_address(host)
            if not ip.is_global:
                raise ValueError
        except ValueError:
            # A non-IP hostname is resolved by SafePublicResolver before connecting.
            if re.fullmatch(r"[0-9.]+", host):
                raise ValueError
        return parsed.geturl()
    except Exception:
        raise HTTPException(status_code=400, detail="Enter a valid public HTTP or HTTPS media URL.")


class SafePublicResolver(AbstractResolver):
    """Resolve hostnames and reject every non-public address before a socket connects."""
    async def resolve(self, host, port=0, family=socket.AF_INET):
        try:
            infos = await aiohttp.resolver.DefaultResolver().resolve(host, port, family)
        except Exception:
            raise OSError("Could not resolve the media host.")
        if not infos:
            raise OSError("Could not resolve the media host.")
        for item in infos:
            ip = ipaddress.ip_address(item["host"].split("%")[0])
            if not ip.is_global:
                raise OSError("Private or reserved network addresses are blocked.")
        return infos

    async def close(self):
        return None


def classify_url(raw: str) -> dict:
    safe_url = validate_public_url(raw)
    parsed = urlsplit(safe_url)
    host = (parsed.hostname or "").lower().rstrip(".")
    suffix = Path(unquote(parsed.path).lower()).suffix
    platform = next(
        (name for domain, name in PLATFORMS.items()
         if host == domain or host.endswith("." + domain)),
        None,
    )
    if platform:
        return {
            "status": "recognised", "kind": "platform", "source": platform,
            "url": safe_url, "formats": [], "can_download": False,
            "message": f"{platform} link recognised. A permitted media integration is not connected for this source.",
        }
    if suffix in VIDEO_EXTENSIONS or suffix in AUDIO_EXTENSIONS:
        kind = "video" if suffix in VIDEO_EXTENSIONS else "audio"
        return {
            "status": "recognised", "kind": kind,
            "source": "Direct video file" if kind == "video" else "Direct audio file",
            "url": safe_url, "can_download": True,
            "formats": [{"id": "original", "type": kind, "container": suffix[1:].upper(),
                         "quality": "Original source quality", "label": f"{kind.title()} · {suffix[1:].upper()} · Original"}],
            "message": "Original direct media file detected. No conversion or extra quality variants are advertised.",
        }
    return {
        "status": "unavailable", "kind": "unknown", "source": "Unknown source",
        "url": safe_url, "can_download": False, "formats": [],
        "message": "No supported direct media-file extension or connected source integration was detected.",
    }


@app.get("/api/health")
def health():
    return {"ok": True, "service": "AyoDownloader API", "version": app.version}


@app.post("/api/analyze")
def analyze(payload: AnalyzeRequest):
    return classify_url(payload.url)


async def open_public_media(start_url: str):
    url = validate_public_url(start_url)
    timeout = aiohttp.ClientTimeout(total=90, connect=12, sock_read=25)
    connector = aiohttp.TCPConnector(resolver=SafePublicResolver(), use_dns_cache=False, force_close=True)
    session = aiohttp.ClientSession(timeout=timeout, connector=connector, auto_decompress=False,
                                    headers={"User-Agent": "AyoDownloader/7.0"})
    try:
        for hop in range(MAX_REDIRECTS + 1):
            parsed = urlsplit(url)
            suffix = Path(unquote(parsed.path).lower()).suffix
            if suffix not in MEDIA_EXTENSIONS:
                raise HTTPException(status_code=400, detail="Only direct MP4, WebM, MOV, M4V, MP3, M4A, AAC, WAV, OGG or FLAC files can be downloaded here.")
            try:
                response = await session.get(url, allow_redirects=False)
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=502, detail="The source could not be reached safely. Try opening the original link.")
            if response.status in {301, 302, 303, 307, 308}:
                location = response.headers.get("Location")
                response.release()
                if not location or hop >= MAX_REDIRECTS:
                    raise HTTPException(status_code=502, detail="The source redirected too many times.")
                url = validate_public_url(urljoin(url, location))
                continue
            if response.status < 200 or response.status >= 300:
                response.release()
                raise HTTPException(status_code=502, detail=f"The source returned HTTP {response.status}.")
            content_type = response.headers.get("Content-Type", "").lower()
            allowed_types = ("video/", "audio/", "application/octet-stream", "binary/octet-stream")
            if content_type and not any(content_type.startswith(x) for x in allowed_types):
                response.release()
                raise HTTPException(status_code=415, detail="The source did not return a recognised audio or video file.")
            length = response.content_length
            if length is not None and length > MAX_DOWNLOAD_BYTES:
                response.release()
                raise HTTPException(status_code=413, detail="This file is larger than the 150 MB download limit.")
            filename = unquote(Path(urlsplit(url).path).name) or f"ayo-download{suffix}"
            filename = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", filename)[:140]
            return session, response, filename, suffix
        raise HTTPException(status_code=502, detail="Could not follow the source redirect.")
    except Exception:
        await session.close()
        raise


@app.post("/api/download")
async def download(payload: DownloadRequest):
    session, upstream, filename, suffix = await open_public_media(payload.url)
    async def stream():
        total = 0
        try:
            async for chunk in upstream.content.iter_chunked(64 * 1024):
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    raise RuntimeError("File exceeded the 150 MB download limit.")
                yield chunk
        finally:
            upstream.release()
            await session.close()
    media_type = "video/mp4" if suffix in VIDEO_EXTENSIONS else "audio/mpeg"
    from urllib.parse import quote
    ascii_name = filename.encode("ascii", "ignore").decode() or f"ayo-download{suffix}"
    headers = {
        "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(filename)}',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if upstream.content_length is not None:
        headers["Content-Length"] = str(upstream.content_length)
    return StreamingResponse(stream(), media_type="application/octet-stream", headers=headers)


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "index.html")


app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
