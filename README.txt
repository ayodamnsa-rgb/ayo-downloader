AYODOWNLOADER V7
================

V7 adds a same-origin download endpoint for direct public media files and keeps Android PWA Share Target support.

FEATURES
- FastAPI backend and responsive web interface.
- Recognises direct MP4, WebM, MOV, M4V, MP3, M4A, AAC, WAV, OGG and FLAC URLs.
- Downloads supported direct media through /api/download and returns Content-Disposition: attachment.
- Shows transfer progress in the browser.
- Android share target receives shared URL/text parameters and automatically analyses the first URL.
- PWA install support over HTTPS.
- Platform links (YouTube, TikTok, Instagram, Facebook, X, Vimeo) are recognised, but no platform extraction is provided.

DOWNLOAD LIMITS AND SAFETY
- Direct media files only; maximum 150 MB per download.
- Only HTTP/HTTPS, standard ports 80/443, public DNS/IP addresses, and known media extensions are accepted.
- Redirects are revalidated; non-public network addresses are blocked by the DNS resolver.
- This is not an open proxy and does not bypass DRM, login restrictions, private content, or platform download controls.
- Only download content you own or are authorised to save.
- The free Render plan may have memory, bandwidth, and request-duration limits. Browser download buffering uses memory.

ANDROID SHARING
1. Open https://ayodownloader.onrender.com in a compatible Android browser (Chrome recommended).
2. Install AyoDownloader using the browser's Install app / Add to Home Screen option.
3. Open another app, tap Share, and choose AyoDownloader.
4. The shared URL should populate and analyse automatically.
5. If AyoDownloader does not appear in the Android share sheet, confirm the PWA is installed and the browser supports Web Share Target.

This is PWA sharing, not a native APK. A future native Android wrapper would need its own Android intent filter.

DEPLOYMENT
- Runtime: Python
- Build: pip install -r requirements.txt
- Start: uvicorn main:app --host 0.0.0.0 --port $PORT
- Health: /api/health
- Render health check path: /api/health

After deployment, /api/health should report version 7.0.0.
