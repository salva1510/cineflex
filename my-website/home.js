const API_KEY = "742aa17a327005b91fb6602054523286"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerItem = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

/* =========================
   CONTINUE WATCHING LOGIC
========================= */
function saveProgress(item) {
  let progress = JSON.parse(localStorage.getItem("continueWatching") || "[]");
  progress = progress.filter(i => i.id !== item.id);
  progress.unshift(item); 
  if (progress.length > 10) progress.pop();
  localStorage.setItem("continueWatching", JSON.stringify(progress));
  displayContinueWatching();
}

function displayContinueWatching() {
  const progress = JSON.parse(localStorage.getItem("continueWatching") || "[]");
  const container = document.getElementById("continue-list");
  const row = document.getElementById("continue-row");

  if (progress.length === 0) {
    row.style.display = "none";
    return;
  }

  row.style.display = "block";
  container.innerHTML = "";
  progress.forEach(item => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

/* =========================
   GENRE FIX LOGIC
========================= */
async function initGenres() {
  const select = document.getElementById("genre-select");
  if (!select) return;

  try {
    const data = await fetchJSON(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
    select.innerHTML = '<option value="">Select a genre</option>';
    data.genres.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });
  } catch (e) {
    select.innerHTML = '<option value="">Error loading genres</option>';
  }
}

async function loadGenreMovies() {
  const genreId = document.getElementById("genre-select").value;
  const container = document.getElementById("genre-movies-list");
  if (!genreId) return;

  container.innerHTML = "<p style='padding-left:4%'>Loading items...</p>";
  const data = await fetchJSON(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
  displayList(data.results.map(i => ({...i, media_type: 'movie'})), "genre-movies-list");
}

/* =========================
   CORE UI LOGIC
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  items.forEach(item => {
    if(!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function setBanner(item) {
  bannerItem = item;
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9), transparent), url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent = item.title || item.name;
}

function showDetailsFromBanner() { if(bannerItem) showDetails(bannerItem); }

async function showDetails(item) {
  currentItem = item;
  saveProgress(item); 
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  const rating = Math.round(item.vote_average * 10) / 10;
  document.getElementById("modal-rating").innerHTML = `<i class="fas fa-star" style="color:gold"></i> ${rating}`;
  
  document.getElementById("modal").style.display = "flex";

  const isTv = item.media_type === "tv" || item.first_air_date;
  if (isTv) {
    document.getElementById("tv-controls").style.display = "block";
    await loadSeasons(item.id);
  } else {
    document.getElementById("tv-controls").style.display = "none";
  }
  changeServer();
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const select = document.getElementById("seasonSelect");
  select.innerHTML = data.seasons.filter(s => s.season_number > 0).map(s => 
    `<option value="${s.season_number}">${s.name}</option>`
  ).join('');
  loadEpisodes();
}

async function loadEpisodes() {
  const seasonNum = document.getElementById("seasonSelect").value || 1;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`);
  document.getElementById("episodes").innerHTML = data.episodes.map(ep => 
    `<div class="episode-card" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
      <strong>Ep ${ep.episode_number}</strong>
    </div>`
  ).join('');
}

function playEpisode(s, e) {
  const server = document.getElementById("server").value;
  document.getElementById("modal-video").src = `https://${server}/embed/tv/${currentItem.id}/${s}/${e}`;
}

function changeServer() {
  const server = document.getElementById("server").value;
  const iframe = document.getElementById("modal-video");
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  if (isTv) {
    playEpisode(document.getElementById("seasonSelect").value || 1, 1);
  } else {
    iframe.src = `https://${server}/embed/movie/${currentItem.id}`;
  }
}

// STARTUP
document.addEventListener("DOMContentLoaded", () => {
  displayContinueWatching();
  initGenres();
  
  Promise.all([
    fetchJSON(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`),
    fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}`)
  ]).then(([movies, tv]) => {
    setBanner(movies.results[0]);
    displayList(movies.results.map(i => ({...i, media_type: 'movie'})), "movies-list");
    displayList(tv.results.map(i => ({...i, media_type: 'tv'})), "tvshows-list");
  });
});

function scrollRow(id, amount) { document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' }); }
function closeModal() { document.getElementById("modal").style.display = "none"; document.getElementById("modal-video").src = ""; }
function openSearchModal() { document.getElementById("search-modal").style.display = "flex"; document.getElementById("search-input").focus(); }
function closeSearchModal() { document.getElementById("search-modal").style.display = "none"; }

async function searchTMDB() {
  const query = document.getElementById("search-input").value.trim();
  if(!query) return;
  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  const results = document.getElementById("search-results");
  results.innerHTML = data.results.filter(i => i.poster_path).map(item => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.onclick = () => { closeSearchModal(); showDetails(item); };
    return img.outerHTML;
  }).join('');
}
