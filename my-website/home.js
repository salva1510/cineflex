const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const SERVER_1_URL = "https://1embed.cc";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let touchStartX = 0;
let touchEndX = 0;
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

// --- CORE FUNCTIONS ---
function downloadMedia() {
    if (!currentItem) return;
    let url = currentTVState.type === 'tv' 
        ? `${SERVER_1_URL}/download/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.currentEpNum}`
        : `${SERVER_1_URL}/download/movie/${currentItem.id}`;
    window.open(url, '_blank');
}

async function init() {
    try {
        const trd = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json());
        trendingItems = trd.results;
        if (trendingItems.length > 0) setBanner(trendingItems[0]);
        displayCards(trd.results, "trending-today");
        updateContinueUI();
    } catch (e) { console.error(e); }
}

function setBanner(item) {
    const banner = document.getElementById("banner");
    banner.style.backgroundImage = `linear-gradient(to top, #050505 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview?.slice(0, 120) + "...";
}

// --- SWIPE & VIEW ALL ---
function changeBanner(dir) {
    currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}

function handleTouchStart(e) { touchStartX = e.touches[0].clientX; }
function handleTouchEnd(e) { 
    touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 50) changeBanner(1);
    if (touchEndX - touchStartX > 50) changeBanner(-1);
}

function displayCards(data, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}" onerror="this.src='https://via.placeholder.com/500x750'">
        </div>`).join('');
    
    const vAll = document.createElement('div');
    vAll.className = "card view-all-card";
    vAll.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer;"><span>View All</span></div>`;
    vAll.onclick = () => viewAll(containerId);
    container.appendChild(vAll);
}

async function viewAll(id) { alert("Viewing all for: " + id); }

// --- UI HELPERS ---
function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }

window.addEventListener('DOMContentLoaded', () => {
    init();
    const b = document.getElementById('banner');
    b.addEventListener('touchstart', handleTouchStart);
    b.addEventListener('touchend', handleTouchEnd);
});
