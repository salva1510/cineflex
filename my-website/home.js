/* =========================
   CONFIG & STATE
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let currentSeason = 1;
let currentEpisode = 1;
let bannerInterval = null;

/* =========================
   CONNECTION & UTILS
========================= */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

function getConnectionProfile() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn || conn.saveData) return { quality: "low", server: "player.videasy.net" };
  
  if (conn.effectiveType === "4g") return { quality: "high", server: "vidsrc.cc" };
  return { quality: "medium", server: "vsrc.su" };
}

/* =========================
   CONTENT FETCHING
========================= */
async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type }));
}

async function fetchTrendingAnime() {
  let anime = [];
  for (let page = 1; page <= 2; page++) {
    const data = await fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const filtered = data.results.filter(item => item.original_language === "ja" && item.genre_ids.includes(16));
    anime.push(...filtered);
  }
  return anime;
}

/* =========================
   UI RENDERING
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  items.forEach((item, i) => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.style.animationDelay = `${i * 50}ms`;
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent = item.title || item.name;
}

function autoRotateBanner(items) {
  let index = 0;
  setBanner(items[0]);
  if (bannerInterval) clearInterval(bannerInterval);
  bannerInterval = setInterval(() => {
    index = (index + 1) % items.length;
    setBanner(items[index]);
  }, 8000);
}

/* =========================
   MODAL & VIDEO LOGIC
========================= */
async function showDetails(item) {
  currentItem = item;
  currentSeason = 1;
  currentEpisode = 1;

  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;

  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const tvControls = document.getElementById("tv-controls");

  if (type === "tv") {
    tvControls.style.display = "block";
    await loadSeasons(item.id);
  } else {
    tvControls.style.display = "none";
  }

  const profile = getConnectionProfile();
  document.getElementById("server").value = profile.server;
  
  changeServer();
  document.getElementById("modal").style.display = "flex";
}

async function loadSeasons(tvId) {
  const data = await fetchJSON(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
  const select = document.getElementById("seasonSelect");
  select.innerHTML = data.seasons
    .filter(s => s.season_number > 0)
    .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`)
    .join("");
  loadEpisodes();
}

async function loadEpisodes() {
  currentSeason = document.getElementById("seasonSelect").value;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${currentSeason}?api_key=${API_KEY}`);
  const container = document.getElementById("episodes");
  
  container.innerHTML = data.episodes.map(ep => `
    <div class="episode-card ${currentEpisode == ep.episode_number ? 'active' : ''}" 
         onclick="playEpisode(${ep.episode_number})">
      <h4>Ep ${ep.episode_number}</h4>
      <p>${ep.name}</p>
    </div>
  `).join("");
}

function playEpisode(epNum) {
  currentEpisode = epNum;
  document.querySelectorAll('.episode-card').forEach(el => el.classList.remove('active'));
  changeServer();
}

function changeServer() {
  const server = document.getElementById("server").value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";

  if (server === "vidsrc.cc") {
    embedURL = type === "movie" 
      ? `https://vidsrc.cc/v2/embed/movie/${currentItem.id}`
      : `https://vidsrc.cc/v2/embed/tv/${currentItem.id}/${currentSeason}/${currentEpisode}`;
  } else if (server === "vsrc.su") {
    embedURL = `https://vsrc.su/embed/${type}/${currentItem.id}${type === 'tv' ? `/${currentSeason}/${currentEpisode}` : ''}`;
  } else {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}${type === 'tv' ? `/${currentSeason}/${currentEpisode}` : ''}`;
  }

  document.getElementById("modal-video").src = embedURL;
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
}

/* =========================
   SEARCH & THEME
========================= */
async function searchTMDB() {
  const query = document.getElementById("search-input").value;
  if (!query) return;
  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  const resultsBox = document.getElementById("search-results");
  resultsBox.innerHTML = "";
  data.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.onclick = () => { closeSearchModal(); showDetails(item); };
    resultsBox.appendChild(img);
  });
}

function openSearchModal() { document.getElementById("search-modal").style.display = "flex"; }
function closeSearchModal() { document.getElementById("search-modal").style.display = "none"; }

/* =========================
   INIT
========================= */
async function init() {
  const [movies, tv, anime] = await Promise.all([
    fetchTrending("movie"),
    fetchTrending("tv"),
    fetchTrendingAnime()
  ]);
  autoRotateBanner(movies);
  displayList(movies, "movies-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
}

window.onload = init;

// Service Worker Registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
   }

