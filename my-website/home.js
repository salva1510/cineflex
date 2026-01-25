const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let trendingItems = [];
let currentItem = null;

async function init() {
  try {
    showSkeletons("main-list");
    showSkeletons("tv-list");

    const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(r=>r.json());
    const tv = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(r=>r.json());

    trendingItems = trending.results;
    currentItem = trendingItems[0];

    setBanner(currentItem);
    displayCards(trending.results, "main-list");
    displayCards(tv.results, "tv-list");

    // load heavy sections AFTER
    setTimeout(loadExtraSections, 1200);

  } catch(e) { console.error(e); }
}

async function loadExtraSections() {
  try {
    loadSection("pinoy-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&sort_by=popularity.desc`);
    loadSection("pinoy-classics-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&primary_release_date.lte=2015-12-31`);
    loadSection("pinoy-romance-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&with_genres=10749`);
    loadSection("pinoy-horror-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&with_genres=27`);
    loadSection("pinoy-comedy-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&with_genres=35`);

    loadSection("korean-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=KR`);
    loadSection("korean-tv-list", `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_origin_country=KR`);
  } catch(e) { console.error(e); }
}

async function loadSection(id, url) {
  if (!document.getElementById(id)) return;
  const data = await fetch(url).then(r=>r.json());
  displayCards(data.results, id);
}

function displayCards(data, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = data.filter(i=>i.poster_path).map(i=>`
    <div class="card">
      <img src="${IMG_URL}${i.poster_path}" />
    </div>`).join('');
}

function showSkeletons(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<div class="skeleton-card"></div>'.repeat(6);
}

function setBanner(item) {
  if (!item) return;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview?.slice(0,120) || '';
}

function openDMCA(){document.getElementById("dmca-modal").style.display="flex"}
function closeDMCA(){document.getElementById("dmca-modal").style.display="none"}
function openSearch(){alert("Search ready")}

init();
