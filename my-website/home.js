const KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";
let activeID = null;

async function init() {
    // Load Trending for Home
    const res = await fetch(`${BASE}/trending/all/week?api_key=${KEY}`).then(r => r.json());
    render(res.results, 'trending-grid');
    setHero(res.results[0]);
}

function render(data, containerId) {
    const cont = document.getElementById(containerId);
    cont.innerHTML = data.map(m => {
        if(!m.poster_path) return '';
        return `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || (m.name ? 'tv' : 'movie')}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w342${m.poster_path}">
        </div>`;
    }).join('');
}

function setHero(m) {
    const hero = document.getElementById('hero-banner');
    hero.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    document.getElementById('hero-title').innerText = m.title || m.name;
    document.getElementById('hero-desc').innerText = m.overview.slice(0, 150) + "...";
}

// Navigation Logic
async function nav(type, el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');

    const pages = ['home-page', 'grid-page', 'search-view'];
    pages.forEach(p => document.getElementById(p).style.display = 'none');

    if (type === 'home') {
        document.getElementById('home-page').style.display = 'block';
    } else if (type === 'search') {
        document.getElementById('search-view').style.display = 'block';
    } else {
        document.getElementById('grid-page').style.display = 'block';
        document.getElementById('grid-title').innerText = type === 'movie' ? 'Popular Movies' : 'TV Series';
        const res = await fetch(`${BASE}/${type}/popular?api_key=${KEY}`).then(r => r.json());
        render(res.results, 'main-grid');
    }
}

// Search Function (FIXED)
async function handleSearch(query) {
    const resCont = document.getElementById('search-results');
    if (query.length < 2) { resCont.innerHTML = ""; return; }
    
    const res = await fetch(`${BASE}/search/multi?api_key=${KEY}&query=${query}`).then(r => r.json());
    render(res.results, 'search-results');
}

// Modal & Cast Logic
async function openModal(id, type, title) {
    activeID = id;
    const modal = document.getElementById('pModal');
    const iframe = document.getElementById('pIframe');
    
    const det = await fetch(`${BASE}/${type}/${id}?api_key=${KEY}&append_to_response=credits`).then(r => r.json());
    
    document.getElementById('pTitle').innerText = title;
    document.getElementById('pDesc').innerText = det.overview;
    
    // Circular Cast
    document.getElementById('pCast').innerHTML = det.credits.cast.slice(0, 10).map(c => `
        <div class="cast-item">
            <img src="${c.profile_path ? 'https://image.tmdb.org/t/p/w185'+c.profile_path : 'https://via.placeholder.com/100'}">
            <span>${c.name}</span>
        </div>
    `).join('');

    if (type === 'tv') {
        document.getElementById('tv-panel').style.display = 'block';
        document.getElementById('s-sel').innerHTML = det.seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
        updateEpisodes();
    } else {
        document.getElementById('tv-panel').style.display = 'none';
        iframe.src = `https://zxcstream.xyz/embed/movie/${id}`;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function updateEpisodes() {
    const s = document.getElementById('s-sel').value;
    const res = await fetch(`${BASE}/tv/${activeID}/season/${s}?api_key=${KEY}`).then(r => r.json());
    document.getElementById('e-sel').innerHTML = res.episodes.map(e => `<option value="${e.episode_number}">Episode ${e.episode_number}</option>`).join('');
    playTV();
}

function playTV() {
    const s = document.getElementById('s-sel').value;
    const e = document.getElementById('e-sel').value;
    document.getElementById('pIframe').src = `https://zxcstream.xyz/embed/tv/${activeID}/${s}/${e}`;
}

function closeModal() {
    document.getElementById('pModal').style.display = 'none';
    document.getElementById('pIframe').src = "";
    document.body.style.overflow = 'auto';
}

init();
