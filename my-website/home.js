const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w1280";
const POSTER_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

// SERVERS
const altMovieServers = [
    (id) => `https://zxcstream.xyz/embed/movie/${id}`,
    (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    (id) => `https://autoembed.to/movie/tmdb/${id}`
];

const altTVServers = [
    (id, s, e) => `https://zxcstream.xyz/embed/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&sea=${s}&epi=${e}`,
    (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`
];

async function init() {
    showSkeletons("main-list");
    showSkeletons("tv-list");
    updateMyListUI();
    updateContinueUI();

    try {
        // Load All Categories
        const [pop, top, trending, action, horror] = await Promise.all([
            fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?with_genres=28&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?with_genres=27&api_key=${API_KEY}`).then(r => r.json())
        ]);

        trendingItems = trending.results;
        updateBanner();
        
        displayList(pop.results, "main-list", "movie");
        displayList(top.results, "tv-list", "tv");
        displayList(action.results, "action-list", "movie");
        displayList(horror.results, "horror-list", "movie");

    } catch (err) { console.error("Initialization failed", err); }
}

function showSkeletons(id) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
}

function displayList(data, elementId, type) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = data.map(item => `
        <div class="card" onclick="showDetails(${item.id}, '${item.title ? 'movie' : 'tv'}')">
            <img src="${POSTER_URL + item.poster_path}" alt="${item.title || item.name}">
        </div>
    `).join('');
}

function updateBanner() {
    const item = trendingItems[currentBannerIndex];
    const banner = document.getElementById("banner");
    banner.style.backgroundImage = `url(${IMG_URL + item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview.slice(0, 160) + "...";
}

// SEARCH LOGIC
async function searchMovies(query) {
    if (!query) return init();
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
    const data = await res.json();
    displayList(data.results.filter(i => i.poster_path), "main-list", "movie");
}

// DETAILS & EPISODES
async function showDetails(id, type) {
    const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits,seasons`);
    currentItem = await res.json();
    currentItem.media_type = type;

    document.getElementById("modal-title").innerText = currentItem.title || currentItem.name;
    document.getElementById("modal-desc").innerText = currentItem.overview;
    document.getElementById("details-modal").style.display = "block";

    const epBox = document.getElementById("episode-selector");
    if (type === 'tv') {
        epBox.style.display = "block";
        loadSeasons(currentItem.seasons);
    } else {
        epBox.style.display = "none";
    }
    updateMyListButton();
}

function loadSeasons(seasons) {
    const select = document.getElementById("season-select");
    select.innerHTML = seasons.filter(s => s.season_number > 0).map(s => 
        `<option value="${s.season_number}">Season ${s.season_number}</option>`
    ).join('');
    loadEpisodes(currentItem.id, select.value);
}

async function loadEpisodes(id, seasonNum) {
    const res = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNum}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("episode-select");
    select.innerHTML = data.episodes.map(e => 
        `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`
    ).join('');
}

// --- UPGRADED START PLAYBACK ---
async function startPlayback(serverIndex = 0) {
    if (!currentItem) return;
    const container = document.getElementById("player-container");
    const iframe = document.getElementById("video-player");
    const type = currentItem.title ? 'movie' : 'tv';

    container.style.display = "block";
    
    let url = "";
    if (type === 'tv') {
        const s = document.getElementById("season-select").value || 1;
        const e = document.getElementById("episode-select").value || 1;
        url = altTVServers[serverIndex % altTVServers.length](currentItem.id, s, e);
    } else {
        url = altMovieServers[serverIndex % altMovieServers.length](currentItem.id);
    }

    iframe.src = url;
    renderServerUI(serverIndex);
    addToContinueWatching(currentItem);

    // LANDSCAPE & FULLSCREEN FIX
    try {
        if (container.requestFullscreen) { await container.requestFullscreen(); }
        else if (container.webkitRequestFullscreen) { await container.webkitRequestFullscreen(); }

        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock requested"));
        }
    } catch (err) { console.log("Fullscreen ignored"); }
}

function renderServerUI(activeIdx) {
    let ui = document.getElementById("server-ui");
    if (!ui) {
        ui = document.createElement("div");
        ui.id = "server-ui";
        ui.className = "server-options";
        document.getElementById("player-container").appendChild(ui);
    }
    ui.innerHTML = "";
    const servers = currentItem.title ? altMovieServers : altTVServers;
    servers.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.className = `srv-btn ${i === activeIdx ? 'active' : ''}`;
        btn.innerText = `Server ${i + 1}`;
        btn.onclick = (e) => { e.stopPropagation(); startPlayback(i); };
        ui.appendChild(btn);
    });
}

function closePlayer() {
    const container = document.getElementById("player-container");
    document.getElementById("video-player").src = "";
    container.style.display = "none";

    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
    }
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
}

// MY LIST & RECENT
function toggleMyList() {
    const idx = myFavorites.findIndex(i => i.id === currentItem.id);
    if (idx === -1) myFavorites.push(currentItem);
    else myFavorites.splice(idx, 1);
    localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
    updateMyListUI();
    updateMyListButton();
}

function updateMyListUI() {
    const container = document.getElementById("mylist-scroller");
    if (container) displayList(myFavorites, "mylist-scroller", "movie");
}

function addToContinueWatching(item) {
    continueWatching = continueWatching.filter(i => i.id !== item.id);
    continueWatching.unshift(item);
    if (continueWatching.length > 10) continueWatching.pop();
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
    updateContinueUI();
}

function updateContinueUI() {
    const container = document.getElementById("continue-scroller");
    if (container) displayList(continueWatching, "continue-scroller", "movie");
}

function updateMyListButton() {
    const btn = document.getElementById("mylist-btn");
    const isIn = myFavorites.some(i => i.id === currentItem.id);
    btn.innerHTML = isIn ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>';
}

function closeModal() { document.getElementById("details-modal").style.display = "none"; }

window.onload = init;
