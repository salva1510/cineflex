const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
// BAGONG PLAYER DOMAIN
const PLAYER_BASE_URL = "https://peachify.top";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1 };
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;

// --- POPUNDER FUNCTION ---
function triggerPopunder() {
    const script = document.createElement('script');
    script.src = "https://pl28389725.profitablecpmratenetwork.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
    document.body.appendChild(script);
}

// --- FIXED FULLSCREEN & LANDSCAPE LOGIC ---
async function enterCinemaMode() {
  const playerContainer = document.getElementById("modal-player-container");
  if (!playerContainer) return;
  try {
    if (playerContainer.requestFullscreen) {
      await playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      await playerContainer.webkitRequestFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock error:", e));
    }
  } catch (err) {
    console.log("Cinema mode error:", err);
  }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
});

// --- CORE LOGIC ---
async function init() {
  try {
    const [trd, anime, fil, kd, kp, kids] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json())
    ]);

    trendingItems = trd.results;
    if (trendingItems.length > 0) setBanner(trendingItems[0]);
    
    displayCards(trd.results, "trending-today");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    displayCards(kids.results, "kids-list");
    
    updateContinueUI();
  } catch (err) { console.error("Init Error:", err); }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  const bTitle = document.getElementById("banner-title");
  const bDesc = document.getElementById("banner-desc");
  if (!banner || !item) return;
  banner.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  if (bTitle) bTitle.innerText = item.title || item.name;
  if (bDesc) bDesc.innerText = item.overview ? item.overview.slice(0, 120) + "..." : "";
}

async function showDetails(item) {
  currentItem = item;
  const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
  const modal = document.getElementById("details-modal");
  const playerContainer = document.getElementById("modal-player-container");
  const iframe = document.getElementById("modal-video-iframe");
  
  if (playerContainer) playerContainer.style.display = "none";
  if (iframe) iframe.src = "";
  
  try {
    const [details, credits, recs] = await Promise.all([
      fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
    ]);

    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview || "";
    document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    
    const epSelector = document.getElementById("episode-selector");
    const movieBtn = document.getElementById("movie-play-action");

    if (type === 'tv') {
        epSelector.style.display = "block";
        movieBtn.style.display = "none";
        setupSeasonSelector(details);
    } else {
        epSelector.style.display = "none";
        movieBtn.style.display = "block";
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  } catch (err) { console.error(err); }
}

function startPlayback() {
    triggerPopunder();
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    playerContainer.style.display = "block";
    // Updated Domain
    iframe.src = `${PLAYER_BASE_URL}/embed/movie/${currentItem.id}`;
    enterCinemaMode();
    addToContinueWatching(currentItem);
}

function playSpecificEpisode(epNum, element) {
    triggerPopunder();
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    playerContainer.style.display = "block";
    // Updated Domain
    iframe.src = `${PLAYER_BASE_URL}/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`;
    enterCinemaMode();
    addToContinueWatching(currentItem);
}

// ... (Keep other functions like displayCards, openMenuDrawer, etc. exactly as they were)

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    if (!seasonSelect) return;
    seasonSelect.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    currentTVState.season = seasonNum;
    const epList = document.getElementById("episode-list");
    epList.innerHTML = data.episodes.map(e => `
        <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
            <div class="ep-thumb-container"><img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="ep-thumb"></div>
            <div class="ep-info"><h4>${e.episode_number}. ${e.name}</h4><p>${e.overview || 'Watch now.'}</p></div>
        </div>`).join('');
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>`).join('');
}

function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }
function closeModal() { 
  document.getElementById("details-modal").style.display = "none"; 
  document.getElementById("modal-video-iframe").src = ""; 
  document.body.style.overflow = "auto"; 
}
function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueUI();
}
function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if(continueWatching.length > 0 && section) {
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

init();
