const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let searchTimeout = null;
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
  updateContinueUI();
  try {
    const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
    const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
    
    currentItem = trending.results[0];
    setBanner(currentItem);
    displayCards(trending.results, "main-list");
    displayCards(tvShows.results, "tv-list");
  } catch (err) { console.error(err); }
}

function setBanner(item) {
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
      <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <span class="badge-rating">★ ${item.vote_average.toFixed(1)}</span>
        <img src="${IMG_URL}${item.poster_path}" alt="Poster">
      </div>
  `).join('');
}

// SEARCH PROCESS
function processSearch(query) {
    const resultsGrid = document.getElementById("search-results");
    if (!query) { resultsGrid.innerHTML = ""; return; }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderSearch(data.results);
    }, 500);
}

function renderSearch(results) {
    const grid = document.getElementById("search-results");
    grid.innerHTML = results.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}">
            <p style="font-size: 0.7rem; text-align: center;">${item.title || item.name}</p>
        </div>
    `).join('');
}

// PLAYER & LANDSCAPE
async function lockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (e) { console.log("Lock failed"); }
}

function startPlayback() {
  const playerCont = document.getElementById("player-container");
  const isTV = currentItem.first_air_date || currentItem.name;
  let src;

  if (isTV) {
      const s = document.getElementById("season-select").value || 1;
      const e = document.getElementById("episode-select").value || 1;
      src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${s}/${e}`;
  } else {
      src = `https://zxcstream.xyz/embed/movie/${currentItem.id}`;
  }

  document.getElementById("video-player").src = src;
  playerCont.style.display = "block";

  if (playerCont.requestFullscreen) {
      playerCont.requestFullscreen().then(lockLandscape);
  } else if (playerCont.webkitRequestFullscreen) {
      playerCont.webkitRequestFullscreen();
      lockLandscape();
  }
  
  addToContinue(currentItem);
  closeModal();
}

function closePlayer() {
    document.getElementById("video-player").src = "";
    document.getElementById("player-container").style.display = "none";
    if (document.exitFullscreen) document.exitFullscreen();
    if (screen.orientation.unlock) screen.orientation.unlock();
}

// RECOMMENDATIONS & DETAILS
async function showDetails(item) {
  currentItem = item;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  // More Like This
  fetchRecs(type, item.id);

  if (type === 'tv') {
      document.getElementById("episode-selector").style.display = "flex";
      loadSeasons(item.id);
  } else document.getElementById("episode-selector").style.display = "none";

  document.getElementById("details-modal").style.display = "flex";
}

async function fetchRecs(type, id) {
    const data = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}`).then(r => r.json());
    const section = document.getElementById("recommendations-section");
    if (data.results.length > 0) {
        section.style.display = "block";
        displayCards(data.results, "recommendations-list");
    } else section.style.display = "none";
}

async function loadSeasons(id) {
    const data = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById("season-select").innerHTML = data.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(id, 1);
}

async function loadEpisodes(id, sNum) {
    const data = await fetch(`${BASE_URL}/tv/${id}/season/${sNum}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById("episode-select").innerHTML = data.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}</option>`).join('');
}

function addToContinue(item) {
    continueWatching = continueWatching.filter(i => i.id !== item.id);
    continueWatching.unshift(item);
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching.slice(0, 10)));
    updateContinueUI();
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
    
