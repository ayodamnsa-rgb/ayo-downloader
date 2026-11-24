AYODOWNLOADER V4 — ONLINE MEDIA LINK TOOL
=========================================

DEPLOYMENT STATUS
This package is intended to replace the current repository contents. It uses
FastAPI on Render and serves the website and API from the same service.

FEATURES
- Online URL validation and source classification.
- Recognises direct video files: MP4, WebM, MOV, M4V.
- Recognises direct audio files: MP3, M4A, AAC, WAV, OGG, FLAC.
- In-page preview for direct media URLs when the source permits it.
- Opens the original direct media URL; does not proxy or re-host remote files.
- Recognises YouTube, TikTok, Instagram, Facebook, X and Vimeo links.
- PWA manifest and Android Share Target support over HTTPS.
- Health endpoint: /api/health

IMPORTANT CAPABILITY LIMITS
Platform recognition is not media extraction. This release does not retrieve
video/audio streams from social platforms and does not show platform quality
variants. Such features require a permitted platform API or a source integration
authorised by the content owner. This app does not bypass DRM, logins, private
content, access controls, or platform download restrictions.

For direct media links, the available choice is the original source file only.
Whether it can be saved depends on the source host, browser and your permission
to save it. The service does not fetch or proxy the submitted URL.

UPDATE THE EXISTING RENDER DEPLOYMENT
1. Extract this ZIP on your computer.
2. Open your existing GitHub repository: ayodownloader.
3. Choose Add file > Upload files.
4. Open the extracted AyoDownloader_V4 folder and select all CONTENTS inside it.
5. Drag the files/folders into GitHub's upload area. Replace existing files when
   GitHub asks; keep the files at repository root.
6. Commit the changes to the main branch.
7. Render should detect the new commit and start a deployment automatically.
8. Wait until the Render service shows Live.
9. Test https://YOUR-SERVICE.onrender.com/api/health. It should return JSON
   containing "ok": true and version "4.0.0".
10. Open the main service URL and test a public direct media URL you are
    authorised to access.

ANDROID SHARE
When deployed over HTTPS, open the site in Chrome on Android and choose
Install app / Add to Home screen. Then try sharing a link from another app and
select AyoDownloader if the browser offers the installed PWA share target.
PWA share support varies by browser/device; a native APK would need a separate
Android wrapper and share-intent implementation.

LOCAL DEVELOPMENT
Python 3.10+ is required. In this folder:
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn main:app --reload
Then open http://127.0.0.1:8000

PRIVACY / SAFETY
The API validates and classifies URL text; it does not request remote URLs.
Do not paste private URLs or links containing credentials. Only save content
you own or have permission to save.
