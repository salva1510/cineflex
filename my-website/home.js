const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;

async function init() {
    try {
        const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
        const data = await res.json();
        trendingItems = data.results;
        
        setBanner(trendingItems[0]);
        loadSections();
        
        // Auto-rotate banner every 8 seconds
        setInterval(nextBanner, 8000);
    } catch (err) {
        console.error("Failed to load data", err);
    }
}

function setBanner(item) {
    const banner = document.getElementById("banner");
    banner.style.opacity = "0"; // Fade effect start
    
    setTimeout(() => {
        banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
        document.getElementById("banner-title").innerText = item.title || item.name;
        document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
        banner.style.opacity = "1"; // Fade effect end
        currentItem = item;
    }, 400);
}

function nextBanner() {
    currentBannerIndex = (currentBannerIndex + 1) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}

function openModal(item) {
    currentItem = item;
    const modal = document.getElementById("movie-modal");
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview;
    
    // Reset player
    document.getElementById("video-iframe").src = "";
    document.querySelector(".player-wrapper").style.display = "none";
    
    modal.style.display = "flex";
}

function startPlayback() {
    const playerWrapper = document.querySelector(".player-wrapper");
    const iframe = document.getElementById("video-iframe");
    
    // Halimbawa ng embed URL (Vidsrc)
    const type = currentItem.media_type === 'tv' ? 'tv' : 'movie';
    iframe.src = `https://vidsrc.me/embed/${type}?tmdb=${currentItem.id}`;
    
    playerWrapper.style.display = "block";
}

function closeModal() {
    document.getElementById("movie-modal").style.display = "none";
    document.getElementById("video-iframe").src = "";
}

// Helper para sa pag-load ng rows
async function loadSections() {
    const sections = [
        { id: "main-list", url: `${BASE_URL}/movie/popular?api_key=${API_KEY}` },
        { id: "tv-list", url: `${BASE_URL}/tv/popular?api_key=${API_KEY}` }
    ];

    for (let s of sections) {
        const res = await fetch(s.url);
        const data = await res.json();
        const container = document.getElementById(s.id);
        container.innerHTML = data.results.map(item => `
            <div class="card" onclick='openModal(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title}">
            </div>
        `).join('');
    }
}

window.onload = init;
