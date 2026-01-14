const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  } catch (err) { return null; }
}

/* UI LOADING */
function showSkeleton(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
}

function displayList(items, id) {
  const el = document.getElementById(id);
  if (!el || !items) return;
  el.innerHTML = "";
  items.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    el.appendChild(img);
  });
}

/* SEARCH FUNCTIONS */
function openSearchModal() {
  document.getElementById("search-modal").style.display = "flex";
  document.getElementById("search-input").focus();
}

function closeSearchModal() {
  document.getElementById("search-modal").style.display = "none";
}

async function searchTMDB() {
  const query = document.getElementById("search-input").value;
  const results = document.getElementById("search-results");
  if (!query.trim()) { results.innerHTML = ""; return; }

  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  results.innerHTML = "";
  data?.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => {
      closeSearchModal(); // Close search before opening player
      showDetails(item);
    };
    results.appendChild(img);
  });
}

/* PLAYER & DETAILS */
async function showDetails(item) {
  currentItem = item;
  document.getElementById("modal").style.display = "block";
  document.body.style.overflow = "hidden";

  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  const isTv = item.media_type === "tv" || item.first_air_date;
  if (isTv) {
    document.getElementById("tv-controls").style.display = "block";
    loadSeasons(item.id);
  } else {
    document.getElementById("tv-controls").style.display = "none";
    document.getElementById("modal-video").src = `https://player.videasy.net/movie/${item.id}`;
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
  document.body.style.overflow = "auto";
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const sel = document.getElementById("seasonSelect");
  sel.innerHTML = data.seasons.filter(s => s.season_number > 0)
    .map(s => `<option value="${s.season_number}">${s.name}</option>`).join('');
  loadEpisodes();
}

async function loadEpisodes() {
  const s = document.getElementById("seasonSelect").value;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${s}?api_key=${API_KEY}`);
  document.getElementById("episodes").innerHTML = data.episodes.map(ep => `
    <div class="episode-card" onclick="playEp(${s}, ${ep.episode_number})">
      <strong>EP ${ep.episode_number}</strong>
    </div>
  `).join('');
  playEp(s, 1);
}

function playEp(s, e) {
  document.getElementById("modal-video").src = `https://player.videasy.net/tv/${currentItem.id}/${s}/${e}`;
}

/* INIT */
showSkeleton("movies-list");
fetchJSON(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`).then(data => {
  displayList(data.results, "movies-list");
  document.getElementById("banner").style.backgroundImage = `url(${IMG_URL}${data.results[0].backdrop_path})`;
  document.getElementById("banner-title").textContent = data.results[0].title;
});
