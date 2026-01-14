/* =========================
   CONFIG
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerInterval = null;

/* =========================
   FETCH DATA
========================= */
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  } catch (err) {
    return null;
  }
}

async function fetchLists() {
  const [trending, latest, top, tv, anime] = await Promise.all([
    fetchTrending("movie"),
    fetchJSON(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}`),
    fetchJSON(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`),
    fetchTrending("tv"),
    fetchAnime()
  ]);

  autoRotateBanner(trending);
  displayList(trending, "movies-list");
  displayList(latest?.results, "latest-movies-list");
  displayList(top?.results, "top-rated-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
}

async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data?.results.map(i => ({ ...i, media_type: type })) || [];
}

async function fetchAnime() {
  const data = await fetchJSON(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`);
  return data?.results.map(i => ({ ...i, media_type: "tv" })) || [];
}

/* =========================
   SEARCH LOGIC
========================= */
function openSearchModal() {
  const modal = document.getElementById("search-modal");
  modal.style.display = "flex";
  document.getElementById("search-input").focus();
  document.body.style.overflow = "hidden";
}

function closeSearchModal() {
  document.getElementById("search-modal").style.display = "none";
  document.body.style.overflow = "auto";
}

async function searchTMDB() {
  const query = document.getElementById("search-input").value.trim();
  const resultsBox = document.getElementById("search-results");
  
  if (!query) {
    resultsBox.innerHTML = "";
    return;
  }

  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  if (!data) return;

  resultsBox.innerHTML = "";
  data.results.forEach(item => {
    if (!item.poster_path) return;
    
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };
    resultsBox.appendChild(img);
  });
}

/* =========================
   UI FUNCTIONS
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;
  container.innerHTML = "";
  items.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function showSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = Array(8).fill('<div class="skeleton"></div>').join('');
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  if (!banner || !item) return;
  banner.style.opacity = 0;
  setTimeout(() => {
    banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    document.getElementById("banner-title").textContent = item.title || item.name;
    banner.style.opacity = 1;
  }, 300);
}

function autoRotateBanner(items) {
  if (!items || items.length === 0) return;
  let index = 0;
  setBanner(items[0]);
  clearInterval(bannerInterval);
  bannerInterval = setInterval(() => {
    index = (index + 1) % items.length;
    setBanner(items[index]);
  }, 8000);
}

/* =========================
   DETAILS & PLAYER
========================= */
async function showDetails(item) {
  currentItem = item;
  document.body.style.overflow = "hidden";
  const modal = document.getElementById("modal");
  
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  modal.style.display = "block";
  const isTv = item.media_type === "tv" || item.first_air_date;
  
  if (isTv) {
    document.getElementById("tv-controls").style.display = "block";
    await loadSeasons(item.id);
  } else {
    document.getElementById("tv-controls").style.display = "none";
    document.getElementById("modal-video").src = `https://${document.getElementById("server").value}/movie/${item.id}`;
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
  document.body.style.overflow = "auto";
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const select = document.getElementById("seasonSelect");
  select.innerHTML = "";
  data.seasons.forEach(s => {
    if (s.season_number > 0) {
      const opt = document.createElement("option");
      opt.value = s.season_number;
      opt.textContent = s.name;
      select.appendChild(opt);
    }
  });
  loadEpisodes();
}

async function loadEpisodes() {
  const season = document.getElementById("seasonSelect").value || 1;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${season}?api_key=${API_KEY}`);
  const grid = document.getElementById("episodes");
  grid.innerHTML = data.episodes.map(ep => `
    <div class="episode-card" onclick="playEpisode(${season}, ${ep.episode_number})">
      <strong>EPISODE ${ep.episode_number}</strong>
      <span>${ep.name}</span>
    </div>
  `).join('');
  playEpisode(season, 1);
}

function playEpisode(s, e) {
  const server = document.getElementById("server").value;
  document.getElementById("modal-video").src = `https://${server}/tv/${currentItem.id}/${s}/${e}`;
}

function changeServer() {
  if (currentItem.media_type === "tv" || currentItem.first_air_date) {
    loadEpisodes();
  } else {
    showDetails(currentItem);
  }
}

/* =========================
   INIT
========================= */
showSkeleton("movies-list");
showSkeleton("latest-movies-list");
showSkeleton("top-rated-list");
showSkeleton("tvshows-list");
showSkeleton("anime-list");
fetchLists();

function goHome() { window.scrollTo({ top: 0, behavior: "smooth" }); }
function toggleMenu() {
  const menu = document.getElementById("menuDrawer");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}
