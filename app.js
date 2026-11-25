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
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    name = path.split("/").filter(Boolean).pop() || "";
  } catch {}
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120);
  return name || fallback;
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

  const download = document.createElement("a");
  download.className = "download-link";
  download.href = url;
  download.download = safeFilename(url, `ayo-original.${(format.container || "media").toLowerCase()}`);
  download.textContent = "↓  Download original";

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
    $("permissionNote").textContent =
      "Download original asks your browser to save the source file. Some external hosts ignore browser download requests and may open the media player instead. AyoDownloader does not proxy, convert or re-host this file; the result depends on the source host and browser.";
    $("statusText").textContent = `Direct ${data.kind} recognised. Original download option is ready.`;
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
    $("permissionNote").textContent =
      "Recognising a platform URL does not provide its media streams. Format and quality options require an authorised integration from the platform or content owner. AyoDownloader will not bypass DRM, login restrictions, private content or download protections.";
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
    $("permissionNote").textContent =
      "Some websites do not expose direct media files. This version does not attempt to bypass website access controls.";
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
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({url:url.href})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Analysis failed.");
    renderResult(data, url.href);
  } catch (err) {
    $("statusText").textContent = err.message || "Could not reach AyoDownloader. Try again.";
    resultPanel.classList.add("hidden");
  } finally {
    $("analyseBtn").disabled = false;
  }
}
$("analyseBtn").addEventListener("click", () => analyse());
input.addEventListener("keydown", e => { if (e.key === "Enter") analyse(); });
$("pasteBtn").addEventListener("click", async () => {
  try {
    input.value = await navigator.clipboard.readText();
    $("statusText").textContent = "Link pasted. Select Analyse link.";
  } catch {
    $("statusText").textContent = "Clipboard permission unavailable. Paste into the box manually.";
  }
});
const params = new URLSearchParams(location.search);
const shared = params.get("url") || params.get("text") || "";
if (shared) {
  const match = shared.match(/https?:\/\/[^\s]+/i);
  input.value = match ? match[0].replace(/[),.]+$/, "") : shared;
  analyse(input.value);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
