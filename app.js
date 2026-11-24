const $ = (id) => document.getElementById(id);
const input = $("urlInput");
const statusText = $("statusText");
const resultPanel = $("resultPanel");

function validHttpUrl(raw) {
  try {
    const u = new URL(raw.trim());
    return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u : null;
  } catch { return null; }
}

function option(title, detail, href, label) {
  const card = document.createElement("div");
  card.className = "option";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("small");
  small.textContent = detail;
  const action = document.createElement("a");
  action.href = href;
  action.target = "_blank";
  action.rel = "noopener noreferrer";
  action.textContent = label;
  card.append(strong, small, action);
  return card;
}

function showResult(info, url) {
  const options = $("options");
  const preview = $("preview");
  options.replaceChildren();
  preview.replaceChildren();
  preview.classList.add("hidden");
  $("resultDescription").textContent = url;

  if (info.kind === "video" || info.kind === "audio") {
    const isVideo = info.kind === "video";
    const ext = info.formats?.[0]?.extension || "";
    $("resultTitle").textContent = isVideo ? "Direct video detected" : "Direct audio detected";
    $("sourceTag").textContent = isVideo ? "DIRECT VIDEO" : "DIRECT AUDIO";

    const player = document.createElement(isVideo ? "video" : "audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = url;
    player.addEventListener("error", () => {
      statusText.textContent = "The link was recognised, but the source did not allow an in-page preview.";
    }, { once: true });
    preview.append(player);
    preview.classList.remove("hidden");

    options.append(option(
      isVideo ? "Video · Original file" : "Audio · Original file",
      `Original source format${ext ? " (" + ext.toUpperCase() + ")" : ""}. No conversion or quality variants are offered.`,
      url,
      "Open original file"
    ));
    $("permissionNote").textContent =
      "AyoDownloader does not copy or proxy the remote file. Use the media player's controls or the source website's save option where permitted. The source host and browser decide whether saving is available.";
    statusText.textContent = "Online analysis complete — direct " + info.kind + " recognised.";
  } else if (info.kind === "platform") {
    $("resultTitle").textContent = info.name + " link recognised";
    $("sourceTag").textContent = info.name.toUpperCase();
    options.append(option("Open source page", "Continue to the original platform.", url, "Open source"));
    $("permissionNote").textContent =
      "This version identifies platform links but does not extract media or list quality options. Those features require a permitted integration from the platform or content owner. It will not bypass DRM, private content, login controls or download restrictions.";
    statusText.textContent = info.name + " recognised. No permitted media-format integration is connected.";
  } else {
    $("resultTitle").textContent = "Link received";
    $("sourceTag").textContent = "UNKNOWN SOURCE";
    options.append(option("No direct media format found", "Try a public direct MP4, WebM, MP3 or other supported media-file link.", url, "Open source page"));
    $("permissionNote").textContent = "Some websites do not expose direct media-file URLs. AyoDownloader does not attempt to bypass their access controls.";
    statusText.textContent = "The link is valid, but no supported direct media-file extension was detected.";
  }
  resultPanel.classList.remove("hidden");
}

async function analyse(raw = input.value.trim()) {
  const url = validHttpUrl(raw);
  if (!url) {
    statusText.textContent = "Please enter a valid public HTTP or HTTPS link.";
    resultPanel.classList.add("hidden");
    return;
  }
  input.value = url.href;
  statusText.textContent = "Checking with AyoDownloader online…";
  $("analyseBtn").disabled = true;
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.href })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "The service could not analyse this link.");
    showResult(data, url.href);
  } catch (error) {
    statusText.textContent = error.message || "Could not reach the online service. Please try again.";
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
    statusText.textContent = "Link pasted. Tap Analyse link.";
  } catch {
    statusText.textContent = "Clipboard access unavailable. Long-press the box and choose Paste.";
  }
});

const params = new URLSearchParams(location.search);
const shared = params.get("url") || params.get("text") || "";
if (shared) {
  const match = shared.match(/https?:\/\/[^\s]+/i);
  input.value = match ? match[0].replace(/[),.]+$/, "") : shared;
  analyse(input.value);
}
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
