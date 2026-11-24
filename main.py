from pathlib import Path
from urllib.parse import urlsplit
import ipaddress

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR

PLATFORMS = {
    "youtube.com": "YouTube", "youtu.be": "YouTube",
    "tiktok.com": "TikTok", "instagram.com": "Instagram",
    "facebook.com": "Facebook", "fb.watch": "Facebook",
    "x.com": "X", "twitter.com": "X", "vimeo.com": "Vimeo",
}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"}

app = FastAPI(title="AyoDownloader API", version="1.0.0")

class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


def classify_url(raw: str) -> dict:
    try:
        parsed = urlsplit(raw.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Only public HTTP and HTTPS links are supported.")
        if parsed.username or parsed.password:
            raise ValueError("Links containing embedded login details are not accepted.")
        host = parsed.hostname.lower().rstrip(".")
        if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
            raise ValueError("Local network addresses are not accepted.")
        try:
            ip = ipaddress.ip_address(host)
            if not ip.is_global:
                raise ValueError("Private or reserved network addresses are not accepted.")
        except ValueError as exc:
            if str(exc).startswith("Private or reserved"):
                raise
        suffix = Path(parsed.path.lower()).suffix
        platform = next((name for domain, name in PLATFORMS.items()
                         if host == domain or host.endswith("." + domain)), None)
        safe_url = parsed.geturl()
        if platform:
            return {"kind": "platform", "name": platform, "url": safe_url,
                    "formats": [], "message": "Source recognised. An approved source integration is required to list media formats."}
        if suffix in VIDEO_EXTENSIONS:
            return {"kind": "video", "name": "Direct video", "url": safe_url,
                    "formats": [{"type": "video", "quality": "Original file", "extension": suffix}],
                    "message": "Direct video link recognised. The source host controls whether the file opens or downloads."}
        if suffix in AUDIO_EXTENSIONS:
            return {"kind": "audio", "name": "Direct audio", "url": safe_url,
                    "formats": [{"type": "audio", "quality": "Original file", "extension": suffix}],
                    "message": "Direct audio link recognised. The source host controls whether the file opens or downloads."}
        return {"kind": "unknown", "name": "Unknown source", "url": safe_url,
                "formats": [], "message": "No supported direct media format was detected."}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/health")
def health():
    return {"ok": True, "service": "AyoDownloader API", "version": app.version}


@app.post("/api/analyze")
def analyze(payload: AnalyzeRequest):
    return classify_url(payload.url)


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")

app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
