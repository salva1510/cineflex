const CATS=["Trending","Romance","Billionaire / CEO","Revenge","Contract Marriage","Royal / Empress","Werewolf / Fantasy","Betrayal","Thriller","Completed Series"];
let data={series:[]};
fetch("freereels-catalog.json").then(r=>r.json()).then(d=>{data=d;render();}).catch(()=>render());

function makeCard(s){
 const c=document.createElement("article"); c.className="card";
 c.innerHTML='<div class="poster"><b>'+esc(s.title)+'</b></div>'+(s.licensed?'<div class="badge">LICENSED</div>':'');
 c.onclick=()=>{ if(s.episodes?.some(e=>e.video)){ location.href="freereels.html?series="+encodeURIComponent(s.id); } else alert("This title is waiting for an authorized video source."); };
 return c;
}
function render(){
 const rows=document.getElementById("rows"); rows.innerHTML="";
 CATS.forEach(cat=>{
   let arr=data.series.filter(s=>s.category===cat);
   const sec=document.createElement("section"); sec.className="row";
   sec.innerHTML="<h2>"+icon(cat)+" "+esc(cat)+"</h2><div class='cards'></div>";
   const cards=sec.querySelector(".cards");
   if(!arr.length){cards.innerHTML="<div class='empty'>Authorized titles will appear here.</div>";}
   else arr.forEach(s=>cards.appendChild(makeCard(s)));
   rows.appendChild(sec);
 });
}
function icon(cat){return {"Trending":"🔥","Romance":"❤️","Billionaire / CEO":"💰","Revenge":"💔","Contract Marriage":"💍","Royal / Empress":"👑","Werewolf / Fantasy":"🐺","Betrayal":"😭","Thriller":"🔥","Completed Series":"✨"}[cat]||"🎬"}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
document.getElementById("browseBtn").onclick=()=>document.querySelector(".row")?.scrollIntoView({behavior:"smooth"});
const modal=document.getElementById("searchModal"), input=document.getElementById("searchInput"), results=document.getElementById("searchResults");
document.getElementById("searchBtn").onclick=()=>{modal.hidden=false;input.focus()};
document.getElementById("closeSearch").onclick=()=>modal.hidden=true;
input.oninput=()=>{let q=input.value.toLowerCase();results.innerHTML=data.series.filter(s=>(s.title+" "+s.category).toLowerCase().includes(q)).map(s=>"<div class='result'><b>"+esc(s.title)+"</b><br><small>"+esc(s.category)+"</small></div>").join("")||"<div class='empty'>No results.</div>"};
