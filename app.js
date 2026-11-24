const $ = (id) => document.getElementById(id);
const input = $("urlInput"), statusText = $("statusText"), resultPanel = $("resultPanel");
const knownPlatforms = [
  ["youtube.com","YouTube"],["youtu.be","YouTube"],["tiktok.com","TikTok"],
  ["instagram.com","Instagram"],["facebook.com","Facebook"],["fb.watch","Facebook"],
  ["x.com","X"],["twitter.com","X"],["vimeo.com","Vimeo"]
];
const videoExt = [".mp4",".webm",".mov",".m4v"];
const audioExt = [".mp3",".m4a",".aac",".wav",".ogg",".flac"];
function validHttpUrl(raw){try{const u=new URL(raw);return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password?u:null}catch{return null}}
function extension(path){const clean=path.split("?")[0].split("#")[0].toLowerCase();return clean.slice(clean.lastIndexOf("."))}
function localDetect(url){
  const host=url.hostname.toLowerCase().replace(/^www\./,"");
  const platform=knownPlatforms.find(([domain])=>host===domain||host.endsWith("."+domain));
  if(platform)return {kind:"platform",name:platform[1],url:url.href,formats:[]};
  const ext=extension(url.pathname);
  if(videoExt.includes(ext))return {kind:"video",name:"Direct video",url:url.href,formats:[{type:"video",quality:"Original file",extension:ext}]};
  if(audioExt.includes(ext))return {kind:"audio",name:"Direct audio",url:url.href,formats:[{type:"audio",quality:"Original file",extension:ext}]};
  return {kind:"unknown",name:"Unknown source",url:url.href,formats:[]};
}
function option(title,detail,href,label,disabled=false){
  const card=document.createElement("div");card.className="option";
  const strong=document.createElement("strong");strong.textContent=title;
  const small=document.createElement("small");small.textContent=detail;
  const action=document.createElement(disabled?"span":"a");
  action.className=disabled?"disabled":"";action.textContent=label;
  if(!disabled){action.href=href;action.target="_blank";action.rel="noopener noreferrer";}
  card.append(strong,small,action);return card;
}
function showResult(info, url){
  const options=$("options");options.replaceChildren();
  $("resultDescription").textContent=url;
  if(info.kind==="video"){
    $("resultTitle").textContent="Video link detected";$("sourceTag").textContent="DIRECT VIDEO";
    const ext=info.formats?.[0]?.extension||extension(new URL(url).pathname);
    options.append(option("Video · Original quality",`Original file (${ext.toUpperCase()})`,url,"Open video"));
    $("permissionNote").textContent="This is a direct media-file link. The browser or host may control whether it downloads or opens. This version does not convert or re-encode media.";
    statusText.textContent="Online analysis complete — direct video recognised.";
  }else if(info.kind==="audio"){
    $("resultTitle").textContent="Audio link detected";$("sourceTag").textContent="DIRECT AUDIO";
    const ext=info.formats?.[0]?.extension||extension(new URL(url).pathname);
    options.append(option("Audio · Original quality",`Original file (${ext.toUpperCase()})`,url,"Open audio"));
    $("permissionNote").textContent="This is a direct audio-file link. The browser or host may control whether it downloads or opens.";
    statusText.textContent="Online analysis complete — direct audio recognised.";
  }else if(info.kind==="platform"){
    $("resultTitle").textContent=info.name+" link recognised";$("sourceTag").textContent=info.name.toUpperCase();
    options.append(option("Video options","Formats appear when an approved source integration provides them.","#","Not available yet",true));
    options.append(option("Audio options","Audio options require an approved source integration.","#","Not available yet",true));
    $("permissionNote").textContent="The online service recognises this platform, but does not extract its media. A supported API or permission from the content owner is required. AyoDownloader will not bypass DRM, private content, logins or download restrictions.";
    statusText.textContent=info.name+" recognised. No approved media integration is connected yet.";
  }else{
    $("resultTitle").textContent="Link received";$("sourceTag").textContent="UNKNOWN SOURCE";
    options.append(option("Media details unavailable","No supported direct media format was detected.","#","No formats found",true));
    $("permissionNote").textContent="Try a public direct media-file URL, or a supported platform link. Some sites do not expose media details to third-party apps.";
    statusText.textContent="Online analysis complete, but no supported media file was detected.";
  }
  resultPanel.classList.remove("hidden");
}
async function analyse(raw=input.value.trim()){
  const url=validHttpUrl(raw);
  if(!url){statusText.textContent="Please enter a valid public http or https link.";resultPanel.classList.add("hidden");return}
  input.value=url.href;statusText.textContent="Checking with AyoDownloader online…";
  try{
    const response=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.href})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.detail||"The online service could not analyse this link.");
    showResult(data,url.href);
  }catch(error){
    if(location.protocol==="file:"){
      showResult(localDetect(url),url.href);
      statusText.textContent="Local preview only — deploy online to use the AyoDownloader server.";
    }else{
      statusText.textContent=error.message||"Could not reach the online service. Please try again.";
      resultPanel.classList.add("hidden");
    }
  }
}
$("analyseBtn").addEventListener("click",()=>analyse());
input.addEventListener("keydown",e=>{if(e.key==="Enter")analyse()});
$("pasteBtn").addEventListener("click",async()=>{try{input.value=await navigator.clipboard.readText();statusText.textContent="Link pasted. Tap Analyse link."}catch{statusText.textContent="Clipboard access unavailable. Long-press the box and choose Paste."}});
const params=new URLSearchParams(location.search);
const shared=params.get("url")||params.get("text")||"";
if(shared){input.value=shared;analyse(shared)}
if("serviceWorker" in navigator && location.protocol!=="file:"){navigator.serviceWorker.register("./service-worker.js").catch(()=>{})}
