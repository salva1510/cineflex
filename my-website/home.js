const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;

// --- CINEMA MODE ---
async function enterCinemaMode() {
  const playerContainer = document.getElementById("modal-player-container");
  try {
    if (playerContainer.requestFullscreen) {
      await playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      await playerContainer.webkitRequestFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock not supported"));
    }
  } catch (err) {
    console.log("Cinema mode error:", err);
  }
}

// --- CORE LOGIC ---
async function init() {
  try {
    const [trd, anime, fil, kd, kp] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_keywords=210024`).then(r => r.json()),
      fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_keywords=k-pop`).then(r => r.json())
    ]);

    trendingItems = trd.results;
    setBanner(trendingItems[0]);

    // Top 10 Today Row
    displayTop10(trd.results.slice(0, 10), "top10-list");
    
    // Normal Rows
    displayCards(trd.results, "trending-list");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "movie-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    updateContinueUI();
    setupBannerSwipe();
  } catch (err) { console.error(err); }
}

function displayTop10(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.map((item, index) => `
        <div class="top10-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <div class="top10-rank">${index + 1}</div>
            <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" loading="lazy">
        </div>
    `).join('');
}

function displayCards(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}" loading="lazy">
        </div>
    `).join('');
}

function setBanner(item) {
    const banner = document.getElementById("main-banner");
    banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function openBannerDetails() {
    showDetails(trendingItems[currentBannerIndex]);
}

function showDetails(item) {
    currentItem = item;
    const modal = document.getElementById("details-modal");
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview;
    
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    const embedUrl = type === 'tv' 
        ? `https://vidsrc.me/embed/tv?tmdb=${item.id}&s=1&e=1` 
        : `https://vidsrc.me/embed/movie?tmdb=${item.id}`;
        
    document.getElementById("modal-video-iframe").src = embedUrl;
    
    if (type === 'tv') {
        document.getElementById("series-controls").style.display = "block";
        loadSeasons(item.id);
    } else {
        document.getElementById("series-controls").style.display = "none";
    }
    
    fetchCast(item.id, type);
    fetchRecommendations(item.id, type);
    addToContinueWatching(item);
}

// --- EPISODES/CAST/RECOMMENDATIONS ---
async function loadSeasons(id) {
    const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("season-select");
    select.innerHTML = data.seasons.map(s => `<option value="${s.season_number}">${s.name}</option>`).join('');
    loadEpisodes();
}

async function loadEpisodes() {
    const seasonNum = document.getElementById("season-select").value;
    const res = await fetch(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`);
    const data = await res.json();
    const list = document.getElementById("episode-list");
    list.innerHTML = data.episodes.map(ep => `
        <div class="episode-card" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
            <div class="thumbnail-wrapper">
                <img src="${IMG_URL}${ep.still_path || currentItem.backdrop_path}">
                <div class="episode-number">EP ${ep.episode_number}</div>
            </div>
            <div style="padding:10px;"><strong>${ep.name}</strong></div>
        </div>
    `).join('');
}

function playEpisode(s, e) {
    document.getElementById("modal-video-iframe").src = `https://vidsrc.me/embed/tv?tmdb=${currentItem.id}&s=${s}&e=${e}`;
}

async function fetchCast(id, type) {
    const res = await fetch(`${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`);
    const data = await res.json();
    const scroller = document.getElementById("modal-cast");
    scroller.innerHTML = data.cast.slice(0, 10).map(c => `
        <div class="cast-item">
            <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100x100?text=No+Img'}">
            <p>${c.name}</p>
        </div>
    `).join('');
}

async function fetchRecommendations(id, type) {
    const res = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}`);
    const data = await res.json();
    const list = document.getElementById("modal-recommendations");
    list.innerHTML = data.results.slice(0, 6).map(r => `
        <div class="mini-card" onclick='showDetails(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${r.backdrop_path || r.poster_path}">
            <div class="mini-info"><strong>${r.title || r.name}</strong></div>
        </div>
    `).join('');
}

// --- UTILS ---
function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
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

function closeModal() { 
  document.getElementById("details-modal").style.display = "none"; 
  document.getElementById("modal-video-iframe").src = ""; 
  document.body.style.overflow = "auto"; 
  if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
}

function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("searchInput").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function openMenuDrawer() { /* original logic */ }

function setupBannerSwipe() {
    const banner = document.getElementById("main-banner");
    banner.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
    banner.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextBanner();
        else if (touchEndX - touchStartX > 50) prevBanner();
    });
}

function nextBanner() {
    currentBannerIndex = (currentBannerIndex + 1) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}
function prevBanner() {
    currentBannerIndex = (currentBannerIndex - 1 + trendingItems.length) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}
