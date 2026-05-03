const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const PLAYER_BASE_URL = "https://peachify.top";

let currentItem = null;
let trendingItems = [];
let currentBrightness = 0; 
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
    setupGestures();
    
    const config = [
        { path: 'trending/all/day', id: 'trending-today' },
        { path: 'discover/tv?with_original_language=ko&with_genres=18', id: 'kdrama-list' },
        { path: 'discover/movie?with_genres=16,10751', id: 'kids-list' },
        { path: 'discover/tv?with_genres=16&with_original_language=ja', id: 'anime-list' },
        { path: 'discover/movie?with_origin_country=PH', id: 'filipino-list' }
    ];

    for (const item of config) {
        try {
            const res = await fetch(`${BASE_URL}/${item.path}&api_key=${API_KEY}`);
            const data = await res.json();
            if (item.id === 'trending-today') {
                trendingItems = data.results;
                if(data.results.length > 0) setBanner(data.results[0]);
            }
            displayCards(data.results, item.id);
        } catch (err) { console.log("Failed to load: " + item.id); }
    }
    updateContinueUI();
}

function setBanner(item) {
    const banner = document.getElementById("banner");
    if(!banner || !item) return;
    banner.style.backgroundImage = `linear-gradient(to top, #050505 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview ? item.overview.slice(0, 100) + "..." : "";
}

function showBannerDetails() { if(trendingItems.length > 0) showDetails(trendingItems[0]); }

async function showDetails(item) {
    currentItem = item;
    const type = (item.name || item.first_air_date) ? 'tv' : 'movie';
    const modal = document.getElementById("details-modal");
    
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview || "";
    document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    
    document.getElementById("modal-player-container").style.display = "none";
    document.getElementById("modal-video-iframe").src = "";

    const isTV = type === 'tv';
    document.getElementById("episode-selector").style.display = isTV ? "block" : "none";
    document.getElementById("movie-play-action").style.display = isTV ? "none" : "block";

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Load Cast and Recommendations
    try {
        const [credits, rec] = await Promise.all([
            fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
        ]);

        document.getElementById("modal-cast").innerHTML = credits.cast.slice(0, 10).map(c => `
            <div class="cast-card">
                <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100'}">
                <p style="color:white; font-size:0.7rem;">${c.name}</p>
            </div>`).join('');

        displayCards(rec.results, "modal-recommendations");
        if(isTV) setupSeasonSelector(item.id);
    } catch (e) { console.log("Details load error"); }
}

function startPlayback() {
    document.getElementById("modal-player-container").style.display = "block";
    document.getElementById("modal-video-iframe").src = `${PLAYER_BASE_URL}/embed/movie/${currentItem.id}`;
    addToContinueWatching(currentItem);
}

function playSpecificEpisode(epNum) {
    const sn = document.getElementById("season-select").value;
    document.getElementById("modal-player-container").style.display = "block";
    document.getElementById("modal-video-iframe").src = `${PLAYER_BASE_URL}/embed/tv/${currentItem.id}/${sn}/${epNum}`;
    addToContinueWatching(currentItem);
}

function displayCards(data, id) {
    const container = document.getElementById(id);
    if(!container || !data) return;
    container.innerHTML = data.filter(i => i.poster_path).map(i => `
        <div class="card" onclick='showDetails(${JSON.stringify(i).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${i.poster_path}">
        </div>`).join('');
}

async function setupSeasonSelector(id) {
    const series = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`).then(r => r.json());
    const s = document.getElementById("season-select");
    s.innerHTML = series.seasons.filter(x => x.season_number > 0).map(x => `<option value="${x.season_number}">Season ${x.season_number}</option>`).join('');
    loadEpisodes(id, 1);
}

async function loadEpisodes(id, sn) {
    const d = await fetch(`${BASE_URL}/tv/${id}/season/${sn}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById("episode-list").innerHTML = d.episodes.map(e => `
        <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number})" style="display:flex; gap:10px; margin-bottom:10px; background:#111; padding:10px; border-radius:8px; cursor:pointer;">
            <img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/120x67'}" style="width:120px; border-radius:5px;">
            <div><h4>${e.episode_number}. ${e.name}</h4></div>
        </div>`).join('');
}

function openSearch() { document.getElementById("search-overlay").style.display = "flex"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

async function processSearch(q) {
    if(q.length < 2) return;
    const r = await fetch(`${BASE_URL}/search/multi?query=${q}&api_key=${API_KEY}`).then(res => res.json());
    displayCards(r.results, "search-results");
}

function closeModal() {
    document.getElementById("details-modal").style.display = "none";
    document.getElementById("modal-video-iframe").src = "";
    document.body.style.overflow = "auto";
}

function setupGestures() { /* Gesture code remains the same */ }
async function enterCinemaMode() { /* Fullscreen logic remains the same */ }

init();
