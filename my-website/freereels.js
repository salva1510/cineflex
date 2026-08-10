/* CineFlex FreeReels — playable open-license starter catalog.
   Sources are CC-licensed/public-domain media. Replace/add entries only
   with media you have permission to stream. */
const CATALOG = [
  {
    id:"bbb",
    title:"Big Buck Bunny",
    category:"Animation • Open Cinema",
    description:"A Blender Foundation open movie presented as a FreeReels-style episode experience.",
    credit:"Blender Foundation • CC BY 3.0",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Big_Buck_Bunny_medium.ogv",
    poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Big_Buck_Bunny_medium.ogv/640px--Big_Buck_Bunny_medium.ogv.jpg",
    video:"https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
    segments:5
  },
  {
    id:"ed",
    title:"Elephants Dream",
    category:"Animation • Open Cinema",
    description:"An open movie from the Blender Foundation, formatted here as short vertical episodes.",
    credit:"Blender Foundation • open movie",
    sourcePage:"https://archive.org/details/ElephantsDream",
    poster:"https://archive.org/services/img/ElephantsDream",
    video:"https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4",
    segments:4
  },
  {
    id:"flower",
    title:"Flower",
    category:"Relaxing • CC0",
    description:"A CC0 sample video used as a lightweight FreeReels test title.",
    credit:"Mozilla sample media • CC0",
    sourcePage:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster:"https://mdn.github.io/shared-assets/images/examples/grapefruit-slice.jpg",
    video:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    segments:1
  }
];

const episodes = [];
for (const s of CATALOG) {
  for (let i=1;i<=s.segments;i++) {
    episodes.push({...s, episode:i, key:`${s.id}-${i}`});
  }
}

const box=document.getElementById("reels");
const toast=document.getElementById("toast");
let active=0, muted=true, touchY=0, wheelLock=false;

function saved(key){ return localStorage.getItem("fr-list-"+key)==="1"; }
function liked(key){ return localStorage.getItem("fr-like-"+key)==="1"; }
function progress(key){ return Number(localStorage.getItem("fr-progress-"+key)||0); }

function notify(msg){
  toast.textContent=msg; toast.classList.add("show");
  clearTimeout(notify.t); notify.t=setTimeout(()=>toast.classList.remove("show"),1400);
}

function render(){
  box.innerHTML="";
  episodes.forEach((x,i)=>{
    const reel=document.createElement("section");
    reel.className="reel";
    reel.dataset.index=i;
    reel.innerHTML=`
      <video class="media" playsinline preload="${i<2?"metadata":"none"}"
             poster="${x.poster||""}" muted controlslist="nodownload noplaybackrate"></video>
      <div class="shade"></div>
      <div class="loader">Loading…</div>
      <div class="info">
        <div class="pill">FREE • ${x.category}</div>
        <h1>${escapeHtml(x.title)}</h1>
        <div class="ep">Episode ${x.episode} / ${x.segments}</div>
        <p>${escapeHtml(x.description)}</p>
        <small>${escapeHtml(x.credit)}</small>
        <a class="credit" target="_blank" rel="noopener" href="${x.sourcePage}">Source / license ↗</a>
      </div>
      <div class="actions">
        <button class="action like ${liked(x.key)?"on":""}" data-act="like">♥<span>Like</span></button>
        <button class="action list ${saved(x.key)?"on":""}" data-act="list">＋<span>My List</span></button>
        <button class="action fs" data-act="fs">⛶<span>Full</span></button>
      </div>
      <div class="progress"><i></i></div>`;
    box.appendChild(reel);
    const v=reel.querySelector("video");
    v.src=x.video;
    v.addEventListener("loadedmetadata",()=>{ 
      const p=progress(x.key);
      if(p>3 && p<v.duration-5) v.currentTime=p;
    });
    v.addEventListener("timeupdate",()=>{
      if(Math.abs(v.currentTime-Math.floor(v.currentTime))<0.05)
        localStorage.setItem("fr-progress-"+x.key,String(v.currentTime));
      reel.querySelector(".progress i").style.width=(v.duration?100*v.currentTime/v.duration:0)+"%";
      // Segmenting a long open movie into FreeReels episodes.
      if(x.segments>1){
        const seg=Math.ceil(v.duration/x.segments);
        const end=Math.min(v.duration, x.episode*seg);
        if(v.currentTime>=end-0.15) next();
      }
    });
    v.addEventListener("ended",next);
    v.addEventListener("waiting",()=>reel.querySelector(".loader").classList.add("show"));
    v.addEventListener("playing",()=>reel.querySelector(".loader").classList.remove("show"));
  });
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function play(i){
  active=Math.max(0,Math.min(episodes.length-1,i));
  [...box.children].forEach((r,j)=>{
    const v=r.querySelector("video");
    if(j===active){ v.muted=muted; v.play().catch(()=>{}); r.classList.add("active"); }
    else { v.pause(); r.classList.remove("active"); }
  });
}
function next(){ if(active<episodes.length-1){box.children[active+1].scrollIntoView({behavior:"smooth"}); setTimeout(()=>play(active+1),450);} }
function prev(){ if(active>0){box.children[active-1].scrollIntoView({behavior:"smooth"}); setTimeout(()=>play(active-1),450);} }

box.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b)return;
  const r=b.closest(".reel"), i=Number(r.dataset.index), x=episodes[i], v=r.querySelector("video");
  if(b.dataset.act==="like"){const on=!liked(x.key); localStorage.setItem("fr-like-"+x.key,on?"1":"0"); b.classList.toggle("on",on); notify(on?"Added Like":"Like removed");}
  if(b.dataset.act==="list"){const on=!saved(x.key); localStorage.setItem("fr-list-"+x.key,on?"1":"0"); b.classList.toggle("on",on); notify(on?"Added to My List":"Removed from My List");}
  if(b.dataset.act==="fs"){(r.requestFullscreen||r.webkitRequestFullscreen)?.call(r);}
});
document.getElementById("backBtn").onclick=()=>history.length>1?history.back():location.href="index.html";
document.getElementById("muteAll").onclick=()=>{
  muted=!muted; document.querySelectorAll("video").forEach(v=>v.muted=muted);
  document.getElementById("muteAll").textContent=muted?"🔇":"🔊";
};

box.addEventListener("touchstart",e=>touchY=e.changedTouches[0].clientY,{passive:true});
box.addEventListener("touchend",e=>{
  const d=touchY-e.changedTouches[0].clientY;
  if(Math.abs(d)>50) d>0?next():prev();
},{passive:true});
box.addEventListener("wheel",e=>{
  if(wheelLock)return; wheelLock=true; e.deltaY>0?next():prev();
  setTimeout(()=>wheelLock=false,600);
},{passive:true});
document.addEventListener("keydown",e=>{
  if(["ArrowDown","PageDown"].includes(e.key)) next();
  if(["ArrowUp","PageUp"].includes(e.key)) prev();
  if(e.key==="m")document.getElementById("muteAll").click();
});
const io=new IntersectionObserver(entries=>{
  entries.forEach(en=>{if(en.isIntersecting && en.intersectionRatio>.7)play(Number(en.target.dataset.index));});
},{threshold:[.7]});
render();
[...box.children].forEach(r=>io.observe(r));
setTimeout(()=>{play(0);document.getElementById("hint").classList.add("fade");},700);
