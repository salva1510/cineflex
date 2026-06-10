const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const SERVER_1_URL = "https://1embed.cc";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let activeServer = 1;
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;

// --- DYNAMIC DOWNLOAD LINK ---
function updateDownloadLink(type, id, season = null, episode = null) {
    const btn = document.getElementById('download-btn');
    if (!btn) return;
    let url = (type === 'movie') 
        ? `https://1embed.cc/download/movie/${id}` 
        : `https://1embed.cc/download/tv/${id}/${season}/${episode}`;
    btn.setAttribute('href', url);
}

// --- CORE LOGIC ---
function triggerPopUnder() {
    const adScript = document.createElement('script');
    adScript.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
    document.body.appendChild(adScript);
}

async function enterCinemaMode() {
    const playerContainer = document.getElementById("modal-player-container");
    if (!playerContainer) return;
    try {
        if (playerContainer.requestFullscreen) await playerContainer.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    } catch (err) { console.log(err); }
}

async function init() {
    try {
        const [trd, marvel, anime, fil, kd, kp, kids, pinoyAction] = await Promise.all([
            fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`).then(r => r.json())
        ]);
        trendingItems = trd.results;
        if (trendingItems.length > 0) setBanner(trendingItems[0]);
        displayCards(trd.results, "trending-today");
        displayCards(marvel.results, "marvel-list");
        displayCards(anime.results, "anime-list");
        displayCards(fil.results, "filipino-list");
        displayCards(kd.results, "kdrama-list");
        displayCards(kp.results, "kpop-list");
        displayCards(kids.results, "kids-list");
        displayCards(pinoyAction.results, "pinoy-action-list");
        updateContinueUI();
    } catch (err) { console.error("Init Error:", err); }
}

async function showDetails(item) {
    currentItem = item;
    const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
    currentTVState.type = type;
    if (type === 'movie') updateDownloadLink('movie', item.id);
    
    const modal = document.getElementById("details-modal");
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    
    try {
        const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());
        document.getElementById("episode-selector").style.display = (type === 'tv') ? "block" : "none";
        document.getElementById("movie-play-action").style.display = (type === 'tv') ? "none" : "block";
        if (type === 'tv') setupSeasonSelector(details);
        modal.style.display = "flex";
    } catch (err) { console.error("Details Error:", err); }
}

function playSpecificEpisode(epNum, element) {
    currentTVState.currentEpNum = epNum;
    updateDownloadLink('tv', currentItem.id, currentTVState.season, epNum);
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById("modal-player-container").style.display = "block";
    updateVideoSource();
    enterCinemaMode();
    triggerPopUnder();
}

function updateVideoSource() {
    const iframe = document.getElementById("modal-video-iframe");
    if (!iframe || !currentItem) return;
    const path = (currentTVState.type === 'tv') 
        ? `/embed/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.currentEpNum}`
        : `/embed/movie/${currentItem.id}`;
    iframe.src = `${SERVER_1_URL}${path}`;
}

function displayCards(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}" loading="lazy">
        </div>`).join('');
}

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
    document.getElementById("episode-list").innerHTML = data.episodes.map(e => `
        <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
            <h4>${e.episode_number}. ${e.name}</h4>
        </div>`).join('');
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
}

// --- INITIALIZE ---
init();
