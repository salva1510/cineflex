const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// CONTINUE WATCHING
function saveProgress(item) {
  let progress = JSON.parse(localStorage.getItem("cineflex_watch") || "[]");
  progress = progress.filter(i => i.id !== item.id);
  progress.unshift(item);
  localStorage.setItem("cineflex_watch", JSON.stringify(progress.slice(0, 10)));
  displayContinueWatching();
}

function displayContinueWatching() {
  const progress = JSON.parse(localStorage.getItem("cineflex_watch") || "[]");
  const container = document.getElementById("continue-list");
  if (progress.length === 0) return;
  document.getElementById("continue-row").style.display = "block";
  displayList(progress, "continue-list");
}

// GENRE LOGIC (FIXED)
async function initBrowse() {
  const select = document.getElementById("genre-select");
  const data = await fetchJSON(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  select.innerHTML = `<option value="">Select a genre</option>`;
  data.genres.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", async () => {
    if(!select.value) return;
    const res = await fetchJSON(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${select.value}`);
    displayList(res.results.map(i => ({...i, media_type: 'movie'})), "genre-movies-list");
  });
}

// TV & EPISODE LOGIC (FIXED)
async function showDetails(item) {
  currentItem = item;
  saveProgress(item);
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview;
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  document.getElementById("modal").style.display = "flex";

  const isTv = item.media_type === "tv" || item.first_air_date;
  if (isTv) {
    document.getElementById("tv-controls").style.display = "block";
    await loadSeasons(item.id);
  } else {
    document.getElementById("tv-controls").style.display = "none";
    changeServer();
  }
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const select = document.getElementById("seasonSelect");
  select.innerHTML = data.seasons.filter(s => s.season_number > 0).map(s => 
    `<option value="${s.season_number}">${s.name}</option>`
  ).join('');
  await loadEpisodes(); // Automatically load Ep 1
}

async function loadEpisodes() {
  const sNum = document.getElementById("seasonSelect").value || 1;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${sNum}?api_key=${API_KEY}`);
  document.getElementById("episodes").innerHTML = data.episodes.map(ep => 
    `<div class="episode-item" onclick="playEpisode(${sNum}, ${ep.episode_number})">EP ${ep.episode_number}</div>`
  ).join('');
  playEpisode(sNum, 1);
}

function playEpisode(s, e) {
  const server = document.getElementById("server").value;
  document.getElementById("modal-video").src = `https://${server}/embed/tv/${currentItem.id}/${s}/${e}`;
}

function changeServer() {
  const server = document.getElementById("server").value;
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  if (isTv) {
    playEpisode(document.getElementById("seasonSelect").value || 1, 1);
  } else {
    document.getElementById("modal-video").src = `https://${server}/embed/movie/${currentItem.id}`;
  }
}

// CORE HELPERS
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  items.forEach(item => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
}

document.addEventListener("DOMContentLoaded", () => {
  displayContinueWatching();
  initBrowse();
  fetchJSON(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(data => {
    displayList(data.results.filter(i => i.media_type==='movie'), "movies-list");
    displayList(data.results.filter(i => i.media_type==='tv'), "tvshows-list");
  });
});
