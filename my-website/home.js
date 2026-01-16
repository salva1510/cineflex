const API_KEY="742aa17a327005b91fb6602054523286";
const BASE="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/original";

let currentItem=null;

async function fetchJSON(url){
  const r=await fetch(url);
  return r.json();
}

function display(items,id){
  const box=document.getElementById(id);
  box.innerHTML="";
  items.forEach(i=>{
    const img=document.createElement("img");
    img.src=IMG+i.poster_path;
    img.className="poster-item";
    img.onclick=()=>showDetails(i);
    box.appendChild(img);
  });
}

async function init(){
  const t=await fetchJSON(`${BASE}/trending/movie/week?api_key=${API_KEY}`);
  display(t.results,"movies-list");
}
init();

function showDetails(item){
  currentItem=item;
  document.getElementById("modal").style.display="block";
  document.getElementById("modal-title").innerText=item.title||item.name;
  document.getElementById("modal-description").innerText=item.overview;
}

function closeModal(){
  document.getElementById("modal").style.display="none";
  document.getElementById("modal-video").src="";
}

function startPlayback(){
  localStorage.setItem("continue",JSON.stringify(currentItem));
  changeServer();
}

function changeServer(){
  const s=document.getElementById("server").value;
  document.getElementById("modal-video").src=`https://${s}/movie/${currentItem.id}`;
}

function goHome(){
  window.scrollTo({top:0,behavior:"smooth"});
}
