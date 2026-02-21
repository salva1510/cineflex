const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];

async function init() {
    loadTrending();
    loadPopularTV();
    updateMyListUI();
}

async function loadTrending() {
    const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
    const data = await res.json();
    setBanner(data.results[0]);
    renderList("main-list", data.results);
}

async function loadPopularTV() {
    const res = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`);
    const data = await res.json();
    renderList("tv-list", data.results);
}

function renderList(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => `
        <div class="card" onclick='openModal(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="">
        </div>
    `).join('');
}

function setBanner(item) {
    currentItem = item;
    const banner = document.getElementById("banner");
    banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

// SEARCH FUNCTION
async function handleSearch(query) {
    const section = document.getElementById("search-section");
    const resultsContainer = document.getElementById("search-results");
    if (query.length < 3) { section.style.display = "none"; return; }
    
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
    const data = await res.json();
    section.style.display = "block";
    renderList("search-results", data.results.filter(i => i.poster_path));
}

// MODAL LOGIC
async function openModal(item) {
    currentItem = item;
    const modal = document.getElementById("movie-modal");
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview;
    document.getElementById("player-container").style.display = "none";
    document.getElementById("video-iframe").src = "";
    
    // Check if TV or Movie
    const isTV = item.media_type === 'tv' || item.first_air_date;
    document.getElementById("episode-selector").style.display = isTV ? "flex" : "none";
    if (isTV) loadSeasons(item.id);

    loadCast(item.id, isTV ? 'tv' : 'movie');
    modal.style.display = "flex";
}

async function loadSeasons(id) {
    const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("season-select");
    select.innerHTML = data.seasons.map(s => `<option value="${s.season_number}">${s.name}</option>`).join('');
    loadEpisodes(id, 1);
}

async function loadEpisodes(id, seasonNum) {
    const res = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNum}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("episode-select");
    select.innerHTML = data.episodes.map(e => `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`).join('');
}

function startPlayback() {
    const isTV = !!document.getElementById("season-select").value && document.getElementById("episode-selector").style.display !== 'none';
    const iframe = document.getElementById("video-iframe");
    const id = currentItem.id;
    
    if (isTV) {
        const s = document.getElementById("season-select").value;
        const e = document.getElementById("episode-select").value;
        iframe.src = `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
    } else {
        iframe.src = `https://vidsrc.me/embed/movie?tmdb=${id}`;
    }
    document.getElementById("player-container").style.display = "block";
}

function closeModal() {
    document.getElementById("movie-modal").style.display = "none";
    document.getElementById("video-iframe").src = "";
}

// MY LIST LOGIC
function toggleMyList() {
    const idx = myFavorites.findIndex(f => f.id === currentItem.id);
    if (idx > -1) myFavorites.splice(idx, 1);
    else myFavorites.push(currentItem);
    
    localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
    updateMyListUI();
}

function updateMyListUI() {
    renderList("mylist-list", myFavorites);
}

window.onload = init;
