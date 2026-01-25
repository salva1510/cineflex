const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let searchTimeout = null;
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
  updateContinueUI();
  const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
  setBanner(trending.results[0]);
  displayCards(trending.results, "main-list");
}

function setBanner(item) {
  currentItem = item;
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
      <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
      </div>
  `).join('');
}

function processSearch(query) {
    const resultsGrid = document.getElementById("search-results");
    if (!query || query.length < 2) { resultsGrid.innerHTML = ""; return; }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        resultsGrid.innerHTML = data.results.filter(i => i.poster_path).map(item => `
            <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}">
            </div>
        `).join('');
    }, 500);
}

async function startPlayback() {
  const playerCont = document.getElementById("player-container");
  const isTV = currentItem.first_air_date || currentItem.name;
  let src = isTV ? 
    `https://zxcstream.xyz/embed/tv/${currentItem.id}/${document.getElementById("season-select").value || 1}/${document.getElementById("episode-select").value || 1}` :
    `https://zxcstream.xyz/embed/movie/${currentItem.id}`;

  document.getElementById("video-player").src = src;
  playerCont.style.display = "flex";
  document.getElementById("player-title-display").innerText = currentItem.title || currentItem.name;

  if (playerCont.requestFullscreen) {
      playerCont.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(e => {});
      });
  }
  addToContinue(currentItem);
  closeModal();
}

function closePlayer() {
    document.getElementById("video-player").src = "";
    document.getElementById("player-container").style.display = "none";
    if (document.fullscreenElement) document.exitFullscreen();
}

async function showDetails(item) {
  currentItem = item;
  const type = item.first_air_date ? 'tv' : 'movie';
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  fetchRecs(type, item.id);

  if (type === 'tv') {
      document.getElementById("episode-selector").style.display = "flex";
      const data = await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`).then(r => r.json());
      document.getElementById("season-select").innerHTML = data.seasons.filter(s => s.season_number > 0).map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
      loadEpisodes(item.id, 1);
  } else document.getElementById("episode-selector").style.display = "none";
  document.getElementById("details-modal").style.display = "flex";
}

async function fetchRecs(type, id) {
    const data = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}`).then(r => r.json());
    if (data.results.length > 0) {
        document.getElementById("recommendations-section").style.display = "block";
        displayCards(data.results, "recommendations-list");
    }
}

async function loadEpisodes(id, sNum) {
    const data = await fetch(`${BASE_URL}/tv/${id}/season/${sNum}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById("episode-select").innerHTML = data.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}</option>`).join('');
}

async function filterByGenre(id, el) {
    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    const endpoint = id === 'all' ? `${BASE_URL}/trending/all/week` : `${BASE_URL}/discover/movie?with_genres=${id}`;
    const data = await fetch(`${endpoint}&api_key=${API_KEY}`).then(r => r.json());
    displayCards(data.results, "main-list");
}

async function playTrailer() {
  const type = currentItem.first_air_date ? 'tv' : 'movie';
  const data = await fetch(`${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}`).then(r => r.json());
  const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
}

function addToContinue(item) {
    continueWatching = continueWatching.filter(i => i.id !== item.id);
    continueWatching.unshift(item);
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching.slice(0, 10)));
}

function updateContinueUI() {
    if (continueWatching.length > 0) {
        document.getElementById("continue-watching-section").style.display = "block";
        displayCards(continueWatching, "continue-list");
    }
}

function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }

init();
    
