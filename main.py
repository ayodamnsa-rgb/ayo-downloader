from pathlib import Path
from urllib.parse import urlsplit
import ipaddress

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
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

app = FastAPI(title="AyoDownloader API", version="5.0.0")


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)

    @field_validator("url")
    @classmethod
    def trim_url(cls, value: str) -> str:
        return value.strip()


def classify_url(raw: str) -> dict:
    parsed = urlsplit(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Enter a valid public HTTP or HTTPS link.")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="Links containing embedded login details are not accepted.")

    host = parsed.hostname.lower().rstrip(".")
    if host == "localhost" or host.endswith((".localhost", ".local")):
        raise HTTPException(status_code=400, detail="Local network addresses are not accepted.")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise HTTPException(status_code=400, detail="Private or reserved network addresses are not accepted.")

    suffix = Path(parsed.path.lower()).suffix
    platform = next(
        (name for domain, name in PLATFORMS.items()
         if host == domain or host.endswith("." + domain)),
        None,
    )
    safe_url = parsed.geturl()

    if platform:
        return {
            "status": "recognised", "kind": "platform", "source": platform,
            "url": safe_url, "formats": [],
            "can_download": False,
            "message": (
                f"{platform} link recognised. This deployment has no authorised "
                "media-format integration connected for this source."
            ),
        }
    if suffix in VIDEO_EXTENSIONS:
        return {
            "status": "recognised", "kind": "video", "source": "Direct video file",
            "url": safe_url, "can_download": True,
            "formats": [{"id": "original", "type": "video", "container": suffix[1:].upper(),
                         "quality": "Original source quality", "label": f"Video · {suffix[1:].upper()} · Original"}],
            "message": "Direct video file recognised. The original source file is the only format advertised.",
        }
    if suffix in AUDIO_EXTENSIONS:
        return {
            "status": "recognised", "kind": "audio", "source": "Direct audio file",
            "url": safe_url, "can_download": True,
            "formats": [{"id": "original", "type": "audio", "container": suffix[1:].upper(),
                         "quality": "Original source quality", "label": f"Audio · {suffix[1:].upper()} · Original"}],
            "message": "Direct audio file recognised. The original source file is the only format advertised.",
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


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "index.html")


app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
