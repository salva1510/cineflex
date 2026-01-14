const API_KEY="742aa17a327005b91fb6602054523286";
const BASE="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/original";

let currentItem=null;

async function fetchJSON(url){try{const r=await fetch(url);return r.json()}catch{return null}}

async function init(){
 const movies=await fetchJSON(`${BASE}/trending/movie/week?api_key=${API_KEY}`);
 const tv=await fetchJSON(`${BASE}/trending/tv/week?api_key=${API_KEY}`);
 showList(movies.results,'movies-list');
 showList(tv.results,'tvshows-list');
 renderContinueWatching();
}

function showList(items,id){
 const el=document.getElementById(id);
 el.innerHTML='';
 items.forEach(i=>{
  if(!i.poster_path)return;
  const img=document.createElement('img');
  img.src=IMG+i.poster_path;
  img.className='poster-item';
  img.onclick=()=>openItem(i);
  el.appendChild(img);
 })
}

function openItem(item){
 currentItem=item;
 document.getElementById('modal').style.display='flex';
 document.getElementById('modal-title').textContent=item.title||item.name;
 document.getElementById('modal-description').textContent=item.overview||'';

 if(item.first_air_date){
  document.getElementById('tv-controls').style.display='block';
  loadSeasons();
 }else{
  document.getElementById('tv-controls').style.display='none';
  playMovie();
 }
}

function playMovie(){
 const iframe=document.getElementById('modal-video');
 iframe.src=`https://player.videasy.net/movie/${currentItem.id}`;
 saveContinue(currentItem);
}

async function loadSeasons(){
 const data=await fetchJSON(`${BASE}/tv/${currentItem.id}?api_key=${API_KEY}`);
 const s=document.getElementById('seasonSelect');
 s.innerHTML='';
 data.seasons.forEach(se=>{
  if(se.season_number>0){
   const o=document.createElement('option');
   o.value=se.season_number;o.textContent=se.name;s.appendChild(o);
  }
 });
 loadEpisodes();
}

async function loadEpisodes(){
 const season=document.getElementById('seasonSelect').value;
 const data=await fetchJSON(`${BASE}/tv/${currentItem.id}/season/${season}?api_key=${API_KEY}`);
 const grid=document.getElementById('episodes');
 const prog=JSON.parse(localStorage.getItem('episodeProgress'))||{};
 const key=`${currentItem.id}-S${season}`;
 const last=prog[key]?.episode||1;

 grid.innerHTML=data.episodes.map(e=>`
  <div class="episode-card ${e.episode_number<last?'watched':''} ${e.episode_number===last?'current':''}"
   onclick="playEpisode(${season},${e.episode_number})">
   Ep ${e.episode_number}: ${e.name}
  </div>`).join('');
 playEpisode(season,last);
}

function playEpisode(season,ep){
 const iframe=document.getElementById('modal-video');
 iframe.src=`https://player.videasy.net/tv/${currentItem.id}/${season}/${ep}`;
 saveContinue(currentItem,season,ep);
 saveEpisodeProgress(currentItem,season,ep);
}

function saveEpisodeProgress(item,season,ep){
 let p=JSON.parse(localStorage.getItem('episodeProgress'))||{};
 p[`${item.id}-S${season}`]={episode:ep};
 localStorage.setItem('episodeProgress',JSON.stringify(p));
}

function saveContinue(item,season=null,ep=null){
 let list=JSON.parse(localStorage.getItem('continueWatching'))||[];
 list=list.filter(i=>i.id!==item.id);
 list.unshift({id:item.id,title:item.title||item.name,poster:item.poster_path,media:item.first_air_date?'tv':'movie',season,ep});
 localStorage.setItem('continueWatching',JSON.stringify(list.slice(0,10)));
 renderContinueWatching();
}

function renderContinueWatching(){
 const row=document.getElementById('continue-row');
 const list=document.getElementById('continue-list');
 const data=JSON.parse(localStorage.getItem('continueWatching'))||[];
 if(!data.length){row.style.display='none';return}
 row.style.display='block';
 list.innerHTML='';
 data.forEach(i=>{
  const img=document.createElement('img');
  img.src=IMG+i.poster;
  img.className='poster-item';
  img.onclick=()=>resume(i);
  list.appendChild(img);
 })
}

async function resume(saved){
 const url=saved.media==='tv'?`${BASE}/tv/${saved.id}?api_key=${API_KEY}`:`${BASE}/movie/${saved.id}?api_key=${API_KEY}`;
 const full=await fetchJSON(url);
 openItem(full);
 if(saved.media==='tv'){
  setTimeout(()=>{
   document.getElementById('seasonSelect').value=saved.season;
   loadEpisodes();
   playEpisode(saved.season,saved.ep);
  },500)
 }
}

function closeModal(){
 document.getElementById('modal').style.display='none';
 document.getElementById('modal-video').src='';
}

init();
