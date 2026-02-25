const API_KEY="742aa17a327005b91fb6602054523286";
const BASE="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/w500";

let currentItem=null;
let trendingItems=[];
let bannerIndex=0;

async function init(){
  await loadTrending();
  revealSections();
}

async function loadTrending(){
  const res=await fetch(`${BASE}/trending/all/week?api_key=${API_KEY}`).then(r=>r.json());
  trendingItems=res.results;
  setBanner(trendingItems[0]);
  displayRow(trendingItems,"main-list");
}

function setBanner(item){
  currentItem=item;
  const banner=document.getElementById("banner");
  banner.style.backgroundImage=`url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText=item.title||item.name;
  document.getElementById("banner-desc").innerText=item.overview.slice(0,150)+"...";
}

function changeBanner(dir){
  bannerIndex+=dir;
  if(bannerIndex<0) bannerIndex=trendingItems.length-1;
  if(bannerIndex>=trendingItems.length) bannerIndex=0;
  setBanner(trendingItems[bannerIndex]);
}

function displayRow(data,id){
  const container=document.getElementById(id);
  container.innerHTML=data.filter(i=>i.poster_path).map(item=>`
    <div class="card" onclick='openModal(${JSON.stringify(item).replace(/'/g,"&apos;")})'>
      <img src="${IMG}${item.poster_path}">
    </div>
  `).join("");
  document.querySelector(".row").classList.add("visible");
}

async function openModal(item){
  currentItem=item;
  document.getElementById("modal-title").innerText=item.title||item.name;
  document.getElementById("modal-desc").innerText=item.overview;
  document.getElementById("modal-banner").style.backgroundImage=
    `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("details-modal").style.display="flex";
}

function closeModal(){
  document.getElementById("details-modal").style.display="none";
}

function playNow(){
  const type=currentItem.first_air_date?"tv":"movie";
  const url=type==="tv"
    ?`https://zxcstream.xyz/embed/tv/${currentItem.id}/1/1`
    :`https://zxcstream.xyz/embed/movie/${currentItem.id}`;

  document.getElementById("video-player").src=url;
  document.getElementById("player-container").style.display="block";
  closeModal();
}

function revealSections(){
  const rows=document.querySelectorAll(".row");
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add("visible");
    });
  },{threshold:.2});
  rows.forEach(r=>obs.observe(r));
}

init();
