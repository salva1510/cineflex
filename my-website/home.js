const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let currentTVState = { season: 1, episode: 1 };
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let autoplayTimer = null;

async function init() {
  updateMyListUI();
  updateContinueUI();

  try {
    const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
    const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
    
    currentItem = trending.results[0];
    setBanner(currentItem);
    displayCards(trending.results, "main-list");
    displayCards(tvShows.results, "tv-list");
  } catch (err) {
    console.error("Failed to fetch data:", err);
  }
}

function setBanner(item) {
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => {
    const date = item.release_date || item.first_air_date || "";
    const year = date ? date.split('-')[0] : "";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "NR";

    return `
      <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <div class="card-badges">
          <span class="badge-rating"><i class="fa-solid fa-star"></i> ${rating}</span>
          <span class="badge-year">${year}</span>
        </div>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
      </div>
    `;
  }).join('');
}

async function applyLandscapeLock() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (err) {
        console.warn("Orientation lock not supported on this device/browser.");
    }
}

function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const nextBtn = document.getElementById("next-ep-btn");
  const playerContainer = document.getElementById("player-container");
  
  clearTimeout(autoplayTimer);

  if (isTV) {
      const s = parseInt(document.getElementById("season-select").value) || 1;
      const e = parseInt(document.getElementById("episode-select").value) || 1;
      currentTVState.season = s;
      currentTVState.episode = e;
      document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${id}/${s}/${e}`;
      nextBtn.style.display = "block";
  } else {
      document.getElementById("video-player").src = `https://zxcstream.xyz/embed/movie/${id}`;
      nextBtn.style.display = "none";
  }

  playerContainer.style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  // Enter Fullscreen & Lock Orientation
  if (playerContainer.requestFullscreen) {
      playerContainer.requestFullscreen().then(applyLandscapeLock);
  } else if (playerContainer.webkitRequestFullscreen) {
      playerContainer.webkitRequestFullscreen();
      applyLandscapeLock();
  }

  addToContinueWatching(currentItem);
  closeModal();
}

function closePlayer() {
  document.getElementById("video-player").src = "";
  document.getElementById("player-container").style.display = "none";
  
  if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
  }
  if (document.exitFullscreen) {
      document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
  }
}

async function showDetails(item) {
  currentItem = item;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());
  
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  const epSelector = document.getElementById("episode-selector");
  if (type === 'tv') {
      epSelector.style.display = "flex";
      setupSeasonSelector(details);
  } else epSelector.style.display = "none";

  document.getElementById("details-modal").style.display = "flex";
}

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = series.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    const epSelect = document.getElementById("episode-select");
    epSelect.innerHTML = data.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}</option>`).join('');
}

function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueUI();
}

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if (continueWatching.length > 0) {
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  } else section.style.display = "none";
}

function updateMyListUI() {
  const section = document.getElementById("my-list-section");
  if (myFavorites.length > 0) {
    section.style.display = "block";
    displayCards(myFavorites, "my-list");
  } else section.style.display = "none";
}

function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }

init();

