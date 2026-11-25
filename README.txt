AYODOWNLOADER V6 — DEPLOYMENT PACKAGE
=====================================

WHAT CHANGED FROM V5
- Adds a visible "Download original" action for direct video/audio file URLs.
- Keeps a separate "Open source file" action.
- Adds clearer information when the browser or remote host does not honour a download request.
- Updates API version and PWA cache name to 6.0.0.

WHAT THIS VERSION SUPPORTS
- FastAPI web interface and API on one Render service.
- Recognition of YouTube, TikTok, Instagram, Facebook, X and Vimeo URLs.
- Direct video extensions: MP4, WebM, MOV, M4V.
- Direct audio extensions: MP3, M4A, AAC, WAV, OGG, FLAC.
- Browser preview and a download-request link for direct media files.
- PWA manifest and Android browser Share Target on compatible browsers.

IMPORTANT LIMITATIONS
The download action asks the browser to download the original remote file. Browsers
may ignore the download attribute for cross-origin URLs, and the remote host may
open a player or apply its own behaviour. AyoDownloader does not proxy, convert or
re-host the remote file.

Platform URLs are recognised but do not yet have authorised format integrations.
Therefore YouTube/TikTok/Instagram/etc. will not show invented quality choices.
A genuine platform integration must be permitted by that platform or the content
owner. This app will not bypass DRM, private/login-only content, access controls,
or platform download restrictions. Only save content you own or are authorised
to download.

DEPLOY
1. Extract this ZIP.
2. Open GitHub repository: ayodownloader.
3. Add file > Upload files.
4. Open the extracted AyoDownloader_V6 folder and select ALL contents inside.
5. Upload to the repository root, replacing old files.
6. Commit changes to the main branch.
7. Wait for Render deployment to finish.
8. Open /api/health. Expected version: 6.0.0.

RENDER
Build: pip install -r requirements.txt
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
Health check: /api/health

TEST
Use this public sample direct MP4:
https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4

LOCAL DEVELOPMENT (optional)
Python 3.10+:
  python -m venv .venv
  .venv\\Scripts\\activate
  pip install -r requirements.txt
  uvicorn main:app --reload
