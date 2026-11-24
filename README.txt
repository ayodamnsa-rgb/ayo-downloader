AYODOWNLOADER V3 — ONLINE BACKEND STARTER
========================================

WHAT IS INCLUDED
- Your existing navy/green V3 interface (layout kept as-is).
- FastAPI backend with /api/health and /api/analyze endpoints.
- The frontend calls the online API when deployed.
- Render deployment blueprint (render.yaml).
- PWA manifest and Android Share Target support over HTTPS.

IMPORTANT — CURRENT CAPABILITIES
This is the first online backend foundation, not a universal media extractor.
It recognises public direct media-file URLs and supported platform links.
For direct MP4/MP3-style links, it offers the original source URL; whether that
opens or downloads depends on the source host and browser.
Platform links are recognised, but video/audio extraction and quality listings
are NOT connected yet. Those require an approved API/source integration and
permission to save the content. This app does not bypass DRM, private/login-only
content, access controls, or platform download restrictions.

DEPLOY ONLINE (NO PYTHON INSTALL NEEDED ON YOUR COMPUTER)
1. Extract this ZIP.
2. Sign in to GitHub and create a NEW repository named ayodownloader.
3. Upload the CONTENTS of the AyoDownloader_V3 folder into the repository root.
   Make sure main.py, requirements.txt and render.yaml are at the top level.
4. Sign in to Render and choose New > Blueprint.
5. Connect the GitHub repository you just created.
6. Render reads render.yaml. Review the service, then apply/create it.
7. Wait for the first deploy to finish. Render will show your public https:// URL.
8. Open that URL. Add /api/health to the end; it should return JSON with
   "ok": true. Then test the main website.

Render's free web services can sleep after 15 minutes without activity and may
need around a minute to wake up. Check Render's current plan details before
relying on it for continuous availability.

ANDROID SHARE
After the site is live over HTTPS:
1. Open it in Chrome on Android.
2. Use the browser menu and choose Install app / Add to Home screen.
3. From another app, use Share and select AyoDownloader if the browser exposes
   the installed PWA share target.

TROUBLESHOOTING
- If the site does not load, open Render > your service > Logs and check deploy.
- If /api/health works but the page does not, confirm index.html and assets are
  in the repository root alongside main.py.
- Every future change pushed to the connected GitHub branch can trigger a new
  deployment.

PRIVACY / SAFETY
The current API classifies the submitted URL; it does not fetch or proxy remote
files. Do not submit private links or links containing login credentials.
Only save content you own or have permission to save.
