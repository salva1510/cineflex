const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";
let currentType = 'movie'; 
let activeID = null;

async function init() {
    loadContent('trending/all/week');
}

async function loadContent(path) {
    const res = await fetch(`${BASE}/${path}?api_key=${API_KEY}`).then(r => r.json());
    renderGrid(res.results, 'movie-grid');
}

function renderGrid(data, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = data.map(m => `
        <div class="card" onclick="openPlayer('${m.id}', '${m.media_type || (m.name ? 'tv' : 'movie')}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
        </div>
    `).join('');
}

// Navigation Logic
function navTo(type, el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    
    const searchOverlay = document.getElementById('search-overlay');
    const mainView = document.getElementById('main-view');
    const catBar = document.getElementById('category-bar');

    if(type === 'search') {
        searchOverlay.style.display = 'block';
        mainView.style.display = 'none';
        catBar.style.display = 'none';
    } else {
        searchOverlay.style.display = 'none';
        mainView.style.display = 'block';
        catBar.style.display = 'flex';
        currentType = type;
        
        if(type === 'home') {
            document.getElementById('section-title').innerText = "Trending Now";
            loadContent('trending/all/week');
        } else if(type === 'movie') {
            document.getElementById('section-title').innerText = "Popular Movies";
            loadContent('movie/popular');
        } else if(type === 'tv') {
            document.getElementById('section-title').innerText = "Popular TV Shows";
            loadContent('tv/popular');
        }
    }
}

// Genre Filter Logic
async function loadByGenre(id, el) {
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    
    let path = (id === 'all') ? `${currentType}/popular` : `discover/${currentType}?with_genres=${id}`;
    const res = await fetch(`${BASE}/${path}&api_key=${API_KEY}`).then(r => r.json());
    renderGrid(res.results, 'movie-grid');
}

// Live Search
async function liveSearch(q) {
    if(q.length < 2) return;
    const res = await fetch(`${BASE}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
    renderGrid(res.results, 'search-results');
}

// Player Modal Logic
async function openPlayer(id, type, title) {
    activeID = id;
    const modal = document.getElementById('playerModal');
    const iframe = document.getElementById('vIframe');
    
    // Details & Cast
    const det = await fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits`).then(r => r.json());
    
    document.getElementById('mTitle').innerText = title;
    document.getElementById('mDesc').innerText = det.overview.slice(0, 200) + "...";
    
    // Render Circular Cast
    document.getElementById('mCast').innerHTML = det.credits.cast.slice(0, 10).map(c => `
        <div class="cast-card">
            <img src="https://image.tmdb.org/t/p/w185${c.profile_path}" onerror="this.src='https://via.placeholder.com/100?text=No+Img'">
            <span class="cast-name">${c.name}</span>
        </div>
    `).join('');

    if(type === 'tv') {
        document.getElementById('tv-controls').style.display = 'block';
        const sSelect = document.getElementById('s-select');
        sSelect.innerHTML = det.seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
        updateEps();
    } else {
        document.getElementById('tv-controls').style.display = 'none';
        iframe.src = `https://zxcstream.xyz/embed/movie/${id}`;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function updateEps() {
    const s = document.getElementById('s-select').value;
    const res = await fetch(`${BASE}/tv/${activeID}/season/${s}?api_key=${API_KEY}`).then(r => r.json());
    document.getElementById('e-select').innerHTML = res.episodes.map(e => `<option value="${e.episode_number}">Episode ${e.episode_number}</option>`).join('');
    playTV();
}

function playTV() {
    const s = document.getElementById('s-select').value;
    const e = document.getElementById('e-select').value;
    document.getElementById('vIframe').src = `https://zxcstream.xyz/embed/tv/${activeID}/${s}/${e}`;
}

function closeModal() {
    document.getElementById('playerModal').style.display = 'none';
    document.getElementById('vIframe').src = '';
    document.body.style.overflow = 'auto';
}

init();
