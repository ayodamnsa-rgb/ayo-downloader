from pathlib import Path
from urllib.parse import urlsplit
import ipaddress

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
PLATFORMS = {
    "youtube.com": "YouTube", "youtu.be": "YouTube",
    "tiktok.com": "TikTok", "instagram.com": "Instagram",
    "facebook.com": "Facebook", "fb.watch": "Facebook",
    "x.com": "X", "twitter.com": "X", "vimeo.com": "Vimeo",
}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"}

app = FastAPI(title="AyoDownloader API", version="4.0.0")


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


def classify_url(raw: str) -> dict:
    try:
        parsed = urlsplit(raw.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Enter a public HTTP or HTTPS link.")
        if parsed.username or parsed.password:
            raise ValueError("Links containing embedded login details are not accepted.")

        host = parsed.hostname.lower().rstrip(".")
        if host == "localhost" or host.endswith((".localhost", ".local")):
            raise ValueError("Local network addresses are not accepted.")
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            address = None
        if address is not None and not address.is_global:
            raise ValueError("Private or reserved network addresses are not accepted.")

        suffix = Path(parsed.path.lower()).suffix
        platform = next(
            (name for domain, name in PLATFORMS.items()
             if host == domain or host.endswith("." + domain)),
            None,
        )
        safe_url = parsed.geturl()

        if platform:
            return {
                "kind": "platform", "name": platform, "url": safe_url,
                "formats": [],
                "message": (
                    "Platform recognised. Media formats are available only "
                    "when a permitted source integration provides them."
                ),
            }
        if suffix in VIDEO_EXTENSIONS:
            return {
                "kind": "video", "name": "Direct video", "url": safe_url,
                "formats": [{"type": "video", "quality": "Original file",
                             "extension": suffix}],
                "message": "Direct video file recognised. Only the original source file is available.",
            }
        if suffix in AUDIO_EXTENSIONS:
            return {
                "kind": "audio", "name": "Direct audio", "url": safe_url,
                "formats": [{"type": "audio", "quality": "Original file",
                             "extension": suffix}],
                "message": "Direct audio file recognised. Only the original source file is available.",
            }
        return {
            "kind": "unknown", "name": "Unknown source", "url": safe_url,
            "formats": [],
            "message": "No supported direct media-file extension was detected.",
        }
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
    return FileResponse(BASE_DIR / "index.html")


app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
