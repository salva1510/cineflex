const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];

async function init() {
  const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
  const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
  
  currentItem = trending.results[0];
  setBanner(currentItem);
  displayCards(trending.results, "main-list");
  displayCards(tvShows.results, "tv-list");
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}">
    </div>
  `).join('');
}

async function showDetails(item) {
  currentItem = item;
  const isTV = item.first_air_date || item.name;
  const type = isTV ? 'tv' : 'movie';
  
  const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  const epArea = document.getElementById("episode-selection-area");
  if (isTV) {
    epArea.style.display = "block";
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = details.seasons.map(s => `<option value="${s.season_number}">${s.name}</option>`).join('');
    loadEpisodes(); // Fetch first season episodes
  } else {
    epArea.style.display = "none";
  }

  document.getElementById("details-modal").style.display = "flex";
}

async function loadEpisodes() {
    const seasonNum = document.getElementById("season-select").value;
    const res = await fetch(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    const episodeSelect = document.getElementById("episode-select");
    episodeSelect.innerHTML = res.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`).join('');
}

function startPlayback() {
  const isTV = currentItem.first_air_date || currentItem.name;
  let embedUrl = "";

  if (isTV) {
    const s = document.getElementById("season-select").value;
    const e = document.getElementById("episode-select").value;
    embedUrl = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${s}/${e}`;
  } else {
    embedUrl = `https://zxcstream.xyz/embed/movie/${currentItem.id}`;
  }

  document.getElementById("video-player").src = embedUrl;
  document.getElementById("player-container").style.display = "block";
  closeModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utility Helpers
function setBanner(item) {
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { document.getElementById("video-player").src = ""; document.getElementById("player-container").style.display = "none"; }
function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

init();
      
