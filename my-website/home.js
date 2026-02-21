const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
    loadTrending();
    loadSection("tv-list", `${BASE_URL}/tv/popular?api_key=${API_KEY}`);
    loadSection("action-list", `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`);
    updateMyListUI();
    updateContinueUI();
}

async function loadTrending() {
    const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
    const data = await res.json();
    if (data.results.length > 0) {
        setBanner(data.results[0]);
        renderList("main-list", data.results);
    }
}

async function loadSection(id, url) {
    const res = await fetch(url);
    const data = await res.json();
    renderList(id, data.results);
}

function renderList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.map(item => `
        <div class="card" onclick='openModal(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
        </div>
    `).join('');
}

function setBanner(item) {
    currentItem = item;
    const banner = document.getElementById("banner");
    banner.style.backgroundImage = `linear-gradient(to top, #050505 10%, transparent 90%), url(${IMG_URL}${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview ? item.overview.slice(0, 150) + "..." : "No description available.";
}

// MODAL & PLAYER LOGIC
async function openModal(item) {
    currentItem = item;
    const modal = document.getElementById("movie-modal");
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview;
    
    // Reset Player
    const playerContainer = document.getElementById("player-container");
    playerContainer.style.display = "none";
    document.getElementById("video-iframe").src = "";

    // TV or Movie Check
    const isTV = item.first_air_date || item.media_type === "tv";
    const episodeSelector = document.getElementById("episode-selector");
    
    if (isTV) {
        episodeSelector.style.display = "flex";
        await loadSeasons(item.id);
    } else {
        episodeSelector.style.display = "none";
    }

    loadCast(item.id, isTV ? 'tv' : 'movie');
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function loadSeasons(id) {
    const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("season-select");
    select.innerHTML = data.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">${s.name}</option>`).join('');
    loadEpisodes(id, select.value);
}

async function loadEpisodes(id, seasonNum) {
    const res = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNum}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("episode-select");
    select.innerHTML = data.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`).join('');
}

function startPlayback() {
    const playerContainer = document.getElementById("player-container");
    const iframe = document.getElementById("video-iframe");
    const isTV = document.getElementById("episode-selector").style.display === "flex";
    
    let embedUrl = "";
    if (isTV) {
        const s = document.getElementById("season-select").value;
        const e = document.getElementById("episode-select").value;
        embedUrl = `https://vidsrc.me/embed/tv?tmdb=${currentItem.id}&season=${s}&episode=${e}`;
    } else {
        embedUrl = `https://vidsrc.me/embed/movie?tmdb=${currentItem.id}`;
    }

    iframe.src = embedUrl;
    playerContainer.style.display = "block";
    
    // Add to Continue Watching
    addToContinue(currentItem);
}

function closeModal() {
    document.getElementById("movie-modal").style.display = "none";
    document.getElementById("video-iframe").src = "";
    document.body.style.overflow = "auto";
}

// ADDITIONAL FUNCTIONS
async function loadCast(id, type) {
    const res = await fetch(`${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`);
    const data = await res.json();
    const castContainer = document.getElementById("modal-cast");
    castContainer.innerHTML = data.cast.slice(0, 10).map(c => `
        <div class="cast-item">
            <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100'}" alt="${c.name}">
            <p>${c.name}</p>
        </div>
    `).join('');
}

function handleSearch(query) {
    const section = document.getElementById("search-section");
    if (query.length < 3) { section.style.display = "none"; return; }
    
    fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`)
        .then(r => r.json())
        .then(data => {
            section.style.display = "block";
            renderList("search-results", data.results.filter(i => i.poster_path));
        });
}

function toggleMyList() {
    const idx = myFavorites.findIndex(f => f.id === currentItem.id);
    if (idx > -1) {
        myFavorites.splice(idx, 1);
    } else {
        myFavorites.push(currentItem);
    }
    localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
    updateMyListUI();
}

function updateMyListUI() {
    renderList("mylist-list", myFavorites);
}

function addToContinue(item) {
    continueWatching = continueWatching.filter(i => i.id !== item.id);
    continueWatching.unshift(item);
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching.slice(0, 10)));
    updateContinueUI();
}

function updateContinueUI() {
    const section = document.getElementById("continue-section");
    if (continueWatching.length > 0) {
        section.style.display = "block";
        renderList("continue-list", continueWatching);
    }
}

window.onload = init;
