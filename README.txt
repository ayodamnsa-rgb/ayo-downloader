AYODOWNLOADER V5 — DEPLOYMENT PACKAGE
=====================================

WHAT THIS VERSION DOES
- Hosts the V5 web interface and FastAPI backend on one Render service.
- Validates public HTTP/HTTPS URLs and recognises supported platform domains.
- Detects direct video extensions (MP4, WebM, MOV, M4V).
- Detects direct audio extensions (MP3, M4A, AAC, WAV, OGG, FLAC).
- Shows a preview for direct media URLs when the source permits playback.
- Lists the original source file as the available format for direct media links.
- Supports PWA manifest and Android browser Share Target on compatible browsers.
- Health endpoint: /api/health (expected API version 5.0.0).

IMPORTANT
This is a functioning direct-media link analyser and preview/open tool. It is
NOT yet a universal social-platform downloader. Platform links are recognised,
but the API intentionally returns no download formats for them until an
authorised provider integration is connected. No DRM, private/login-only
content, access controls or platform download restrictions are bypassed.

The app does not fetch or proxy user-submitted URLs. This avoids turning the
service into an arbitrary remote-fetch proxy. For direct media links, the
browser opens the original source URL; saving availability depends on the
source host and browser. Only download content you own or are authorised to save.

REPLACE THE CURRENT GITHUB PROJECT
1. Extract this ZIP.
2. Open your existing GitHub repository: ayodownloader.
3. Click Add file > Upload files.
4. Open the extracted AyoDownloader_V5 folder and select ALL contents inside.
5. Upload to the repository root, replacing the old files.
6. Commit changes to the main branch.
7. Render should deploy the new commit automatically.
8. Wait for Live, then open /api/health. It should show version 5.0.0.

RENDER CONFIGURATION
render.yaml sets:
  buildCommand: pip install -r requirements.txt
  startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
  healthCheckPath: /api/health

ANDROID SHARE
Deploy over HTTPS, open the site in Chrome on Android, then install/add to
home screen. Share-target availability depends on browser/device support.
A native APK would require a separate Android wrapper with share intents.

LOCAL DEVELOPMENT (optional)
Python 3.10+:
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn main:app --reload
