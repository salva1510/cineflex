const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let currentTVState = { season: 1, episode: 1 };
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
  showSkeletons("main-list");
  showSkeletons("tv-list");
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

function showSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if(container) container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
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
    return `
      <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <div class="card-badges">
          <span class="badge-rating"><i class="fa-solid fa-star"></i> ${item.vote_average.toFixed(1)}</span>
          <span class="badge-year">${year}</span>
        </div>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
      </div>
    `;
  }).join('');
}

async function showDetails(item) {
  currentItem = item;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());
  
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-meta-row").innerHTML = `<span>${item.vote_average.toFixed(1)} Rating</span> • <span>${details.runtime || details.number_of_seasons + ' Seasons'}</span>`;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  const epSelector = document.getElementById("episode-selector");
  if (type === 'tv') {
      epSelector.style.display = "flex";
      setupSeasonSelector(details);
  } else {
      epSelector.style.display = "none";
  }

  const btn = document.getElementById("mylist-btn");
  btn.innerHTML = myFavorites.some(f => f.id === item.id) ? `<i class="fa-solid fa-check"></i>` : `<i class="fa-solid fa-plus"></i>`;
  document.getElementById("details-modal").style.display = "flex";
}

function setupSeasonSelector(series) {
    const sSelect = document.getElementById("season-select");
    sSelect.innerHTML = series.seasons.filter(s => s.season_number > 0).map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(id, sNum) {
    const data = await fetch(`${BASE_URL}/tv/${id}/season/${sNum}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById("episode-select").innerHTML = data.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`).join('');
}

function startPlayback() {
  const isTV = currentItem.first_air_date || currentItem.name;
  const nextBtn = document.getElementById("next-ep-btn");
  const skipBtn = document.getElementById("skip-intro-btn");
  
  if (isTV) {
      currentTVState.season = document.getElementById("season-select").value;
      currentTVState.episode = document.getElementById("episode-select").value;
      document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.episode}`;
      nextBtn.style.display = "block";
      skipBtn.style.display = "block";
  } else {
      document.getElementById("video-player").src = `https://zxcstream.xyz/embed/movie/${currentItem.id}`;
      nextBtn.style.display = "none";
      skipBtn.style.display = "none";
  }
  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  addToContinueWatching(currentItem);
  closeModal();
}

function skipIntro() {
    // Reloads the current episode starting at 1 minute and 25 seconds
    const id = currentItem.id;
    document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${id}/${currentTVState.season}/${currentTVState.episode}?start=85`;
    document.getElementById("skip-intro-btn").style.display = "none"; // Hide after use
}

function playNextEpisode() {
    currentTVState.episode++;
    document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.episode}`;
    document.getElementById("player-title-display").innerText = `Playing: ${currentItem.name} (S${currentTVState.season} E${currentTVState.episode})`;
    document.getElementById("skip-intro-btn").style.display = "block";
}

function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching.slice(0, 10)));
  updateContinueUI();
}

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if (continueWatching.length > 0) {
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

function toggleMyList() {
  const idx = myFavorites.findIndex(f => f.id === currentItem.id);
  if (idx === -1) myFavorites.push(currentItem);
  else myFavorites.splice(idx, 1);
  localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
  updateMyListUI();
  showDetails(currentItem);
}

function updateMyListUI() {
  const section = document.getElementById("my-list-section");
  if (myFavorites.length > 0) {
    section.style.display = "block";
    displayCards(myFavorites, "my-list");
  } else section.style.display = "none";
}

function debounce(func) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => { func.apply(this, args); }, 500); };
}

const processSearch = debounce(async (q) => {
  if (q.length < 2) return;
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
  document.getElementById("search-results").innerHTML = res.results.filter(i => i.poster_path).map(item => `
    <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
      <img src="${IMG_URL}${item.poster_path}">
      <p>${item.title || item.name}</p>
    </div>
  `).join('');
});

function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { document.getElementById("video-player").src = ""; document.getElementById("player-container").style.display = "none"; }

init();
      
