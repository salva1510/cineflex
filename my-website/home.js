const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1 };
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

// --- NETFLIX LANDSCAPE LOGIC ---
async function enterCinemaMode() {
    const playerContainer = document.getElementById("modal-player-container");
    try {
        if (playerContainer.requestFullscreen) {
            await playerContainer.requestFullscreen();
        } else if (playerContainer.webkitRequestFullscreen) {
            await playerContainer.webkitRequestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape").catch(() => {});
        }
    } catch (e) { console.log("Orientation lock not supported"); }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
});

// --- LOAD ALL DATA ---
async function init() {
    try {
        const [pop, fil, kd, kp, trd, anime] = await Promise.all([
            fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r=>r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r=>r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r=>r.json()),
            fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16`).then(r=>r.json())
        ]);

        trendingItems = trd.results;
        updateBanner();
        setInterval(nextBanner, 8000);

        // I-load ang mga sections base sa IDs mo
        displayCards(pop.results, "popular-list");
        displayCards(fil.results, "pinoy-list");
        displayCards(kd.results, "kdrama-list");
        displayCards(kp.results, "kpop-list");
        displayCards(anime.results, "anime-list");
        displayCards(trd.results, "trending-list");
        
        updateContinueUI();
    } catch (e) { console.error("Init Error:", e); }
}

function displayCards(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;
    container.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}" loading="lazy">
        </div>`).join('');
}

// --- MODAL & PLAYER LOGIC ---
async function showDetails(item) {
    currentItem = item;
    const isTV = !!(item.first_air_date || item.name);
    const type = isTV ? 'tv' : 'movie';
    
    const modal = document.getElementById("details-modal");
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    
    // Reset player
    document.getElementById("modal-player-container").style.display = "none";
    document.getElementById("modal-video-iframe").src = "";
    document.getElementById("episode-list-overlay").classList.remove("hidden");

    const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());
    
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-overview").innerText = item.overview;

    if (isTV) {
        document.getElementById("tv-controls").style.display = "block";
        document.getElementById("movie-play-btn").style.display = "none";
        setupSeasonSelector(details);
    } else {
        document.getElementById("tv-controls").style.display = "none";
        document.getElementById("movie-play-btn").style.display = "block";
    }
}

function setupSeasonSelector(series) {
    const select = document.getElementById("season-select");
    if (!select) return;
    select.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(id, sNum) {
    currentTVState.season = sNum;
    const data = await fetch(`${BASE_URL}/tv/${id}/season/${sNum}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById("episode-list").innerHTML = data.episodes.map(e => `
        <div class="episode-item" onclick="playEpisode(${e.episode_number})">
            <img src="${IMG_URL + e.still_path}" class="ep-img">
            <div class="ep-txt"><b>${e.episode_number}. ${e.name}</b></div>
        </div>`).join('');
}

function playMovie() {
    startVideo(`https://bcine.app/embed/movie/${currentItem.id}`);
}

function playEpisode(epNum) {
    startVideo(`https://bcine.app/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`);
}

function startVideo(url) {
    const container = document.getElementById("modal-player-container");
    container.style.display = "block";
    document.getElementById("episode-list-overlay").classList.add("hidden");
    document.getElementById("modal-video-iframe").src = url;
    enterCinemaMode();
    addToContinueWatching(currentItem);
}

// --- OTHERS ---
function updateBanner() {
    const item = trendingItems[currentBannerIndex];
    const banner = document.getElementById("banner");
    if (!banner) return;
    banner.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-play-btn").onclick = () => showDetails(item);
}

function nextBanner() {
    currentBannerIndex = (currentBannerIndex + 1) % trendingItems.length;
    updateBanner();
}

function closeModal() {
    document.getElementById("details-modal").style.display = "none";
    document.getElementById("modal-video-iframe").src = "";
    document.body.style.overflow = "auto";
}

init();
