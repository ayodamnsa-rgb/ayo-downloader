const $ = id => document.getElementById(id);
const input = $("urlInput");
const resultPanel = $("resultPanel");

function getHttpUrl(raw) {
  try {
    const url = new URL(raw.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function safeFilename(url, fallback) {
  let name = "";
  try { name = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean).pop() || ""; } catch {}
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120);
  return name || fallback;
}
function serverFilename(disposition, fallback) {
  if (!disposition) return fallback;
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) { try { return decodeURIComponent(star[1]); } catch {} }
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : fallback;
}
async function downloadOriginal(url, button, fallbackName) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing download…";
  $("statusText").textContent = "Connecting to the original media host safely…";
  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({url})
    });
    if (!response.ok) {
      let message = "Download could not be started.";
      try { const body = await response.json(); message = body.detail || message; } catch {}
      throw new Error(message);
    }
    const total = Number(response.headers.get("Content-Length") || 0);
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      const mb = (received / 1048576).toFixed(1);
      button.textContent = total ? `Downloading ${Math.min(100, Math.round(received / total * 100))}%` : `Downloading ${mb} MB`;
      $("statusText").textContent = total
        ? `Downloading ${(received / 1048576).toFixed(1)} of ${(total / 1048576).toFixed(1)} MB…`
        : `Downloaded ${(received / 1048576).toFixed(1)} MB…`;
    }
    const blob = new Blob(chunks, {type: response.headers.get("Content-Type") || "application/octet-stream"});
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = serverFilename(response.headers.get("Content-Disposition"), fallbackName);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    button.textContent = "✓ Download started";
    $("statusText").textContent = "Your download has been handed to the browser.";
  } catch (error) {
    button.textContent = "Try download again";
    $("statusText").textContent = error.message || "Download failed. Try opening the original source.";
  } finally {
    button.disabled = false;
    if (button.textContent === "Preparing download…") button.textContent = originalText;
  }
}
function makeFormatCard(format, url) {
  const card = document.createElement("article");
  card.className = "format-card";
  const heading = document.createElement("strong");
  heading.textContent = format.label || `${format.type} · ${format.container}`;
  const detail = document.createElement("small");
  detail.textContent = format.quality || "Original source format";
  const actions = document.createElement("div");
  actions.className = "format-actions";
  const download = document.createElement("button");
  download.className = "download-link";
  download.type = "button";
  download.textContent = "↓  Download original";
  download.addEventListener("click", () => downloadOriginal(url, download, safeFilename(url, `ayo-original.${(format.container || "media").toLowerCase()}`)));
  const open = document.createElement("a");
  open.className = "open-link";
  open.href = url;
  open.target = "_blank";
  open.rel = "noopener noreferrer";
  open.textContent = "Open source file";
  actions.append(download, open);
  card.append(heading, detail, actions);
  return card;
}
function renderResult(data, url) {
  $("resultDescription").textContent = url;
  $("sourceTag").textContent = data.source.toUpperCase();
  $("formatList").replaceChildren();
  $("preview").replaceChildren();
  $("preview").classList.add("hidden");
  if (data.kind === "video" || data.kind === "audio") {
    $("resultTitle").textContent = "Original media format found";
    data.formats.forEach(f => $("formatList").append(makeFormatCard(f, url)));
    const player = document.createElement(data.kind === "video" ? "video" : "audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = url;
    $("preview").append(player);
    $("preview").classList.remove("hidden");
    $("permissionNote").textContent = "Download Original sends the direct media URL through AyoDownloader's protected download endpoint and returns it as an attachment. Direct files only; 150 MB maximum. Only download content you own or are authorised to save.";
    $("statusText").textContent = `Direct ${data.kind} recognised. Original download is available.`;
  } else if (data.kind === "platform") {
    $("resultTitle").textContent = `${data.source} link recognised`;
    const card = document.createElement("article");
    card.className = "format-card";
    const strong = document.createElement("strong");
    strong.textContent = "No formats available yet";
    const small = document.createElement("small");
    small.textContent = "A permitted integration for this source is not connected.";
    const link = document.createElement("a");
    link.className = "open-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open source website";
    card.append(strong, small, link);
    $("formatList").append(card);
    $("permissionNote").textContent = "Recognising a platform URL does not provide its media streams. Format and quality options require an authorised integration from the platform or content owner. AyoDownloader does not bypass DRM, login restrictions, private content or download protections.";
    $("statusText").textContent = `${data.source} recognised; no authorised format integration is connected.`;
  } else {
    $("resultTitle").textContent = "No supported format found";
    const card = document.createElement("article");
    card.className = "format-card";
    const strong = document.createElement("strong");
    strong.textContent = "Try a direct media-file URL";
    const small = document.createElement("small");
    small.textContent = "Supported direct extensions include MP4, WebM, MOV, MP3, M4A and WAV.";
    card.append(strong, small);
    $("formatList").append(card);
    $("permissionNote").textContent = "Some websites do not expose direct media files. This version does not bypass website access controls.";
    $("statusText").textContent = "The URL is valid, but no supported media format was found.";
  }
  resultPanel.classList.remove("hidden");
}
async function analyse(raw = input.value) {
  const url = getHttpUrl(raw);
  if (!url) {
    $("statusText").textContent = "Enter a valid public HTTP or HTTPS URL.";
    resultPanel.classList.add("hidden");
    return;
  }
  input.value = url.href;
  $("analyseBtn").disabled = true;
  $("statusText").textContent = "Analysing link…";
  try {
    const response = await fetch("/api/analyze", {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({url:url.href})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Analysis failed.");
    renderResult(data, url.href);
  } catch (err) {
    $("statusText").textContent = err.message || "Could not reach AyoDownloader. Try again.";
    resultPanel.classList.add("hidden");
  } finally { $("analyseBtn").disabled = false; }
}
$("analyseBtn").addEventListener("click", () => analyse());
input.addEventListener("keydown", e => { if (e.key === "Enter") analyse(); });
$("pasteBtn").addEventListener("click", async () => {
  try { input.value = await navigator.clipboard.readText(); $("statusText").textContent = "Link pasted. Select Analyse link."; }
  catch { $("statusText").textContent = "Clipboard permission unavailable. Paste into the box manually."; }
});
function findSharedUrl() {
  const params = new URLSearchParams(location.search);
  const candidates = [params.get("url"), params.get("text"), params.get("title")].filter(Boolean);
  for (const candidate of candidates) {
    const match = candidate.match(/https?:\/\/[^\s<>"']+/i);
    if (match) return match[0].replace(/[),.\]}]+$/, "");
    const direct = getHttpUrl(candidate);
    if (direct) return direct.href;
  }
  return "";
}
const sharedUrl = findSharedUrl();
if (sharedUrl) {
  input.value = sharedUrl;
  $("statusText").textContent = "Link received from Android Share. Analysing…";
  analyse(sharedUrl);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
