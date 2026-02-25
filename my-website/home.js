const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";
let currentView = 'movie';
let activeID = null;

async function init() {
    loadGenres();
    loadContent();
}

async function loadGenres() {
    const res = await fetch(`${BASE}/genre/${currentView}/list?api_key=${API_KEY}`).then(r => r.json());
    const bar = document.getElementById('genre-bar');
    bar.innerHTML = `<div class="cat-btn active" onclick="filterGenre('all', this)">All</div>` + 
        res.genres.map(g => `<div class="cat-btn" onclick="filterGenre('${g.id}', this)">${g.name}</div>`).join('');
}

async function loadContent(genreId = 'all') {
    const grid = document.getElementById('app-view');
    grid.innerHTML = Array(12).fill('<div class="movie-card skeleton"></div>').join(''); // Skeletons

    let url = `${BASE}/${currentView}/popular?api_key=${API_KEY}`;
    if (genreId !== 'all') url = `${BASE}/discover/${currentView}?api_key=${API_KEY}&with_genres=${genreId}`;

    const res = await fetch(url).then(r => r.json());
    grid.innerHTML = res.results.map(m => `
        <div class="movie-card" onclick="openModal('${m.id}', '${currentView}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w342${m.poster_path}" loading="lazy">
        </div>
    `).join('');
}

function switchView(type, el) {
    currentView = type;
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    loadGenres();
    loadContent();
    window.scrollTo(0, 0);
}

function filterGenre(id, el) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    loadContent(id);
}

async function openModal(id, type, title) {
    activeID = id;
    const modal = document.getElementById('modal');
    const det = await fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits`).then(r => r.json());
    
    document.getElementById('m-title').innerText = title;
    document.getElementById('m-desc').innerText = det.overview;
    
    // Cast Circular Hub
    document.getElementById('m-cast').innerHTML = det.credits.cast.slice(0, 12).map(c => `
        <div class="cast-item">
            <img class="cast-img" src="https://image.tmdb.org/t/p/w185${c.profile_path}" onerror="this.src='https://via.placeholder.com/60'">
            <span class="cast-name">${c.name}</span>
        </div>
    `).join('');

    if(type === 'tv') {
        document.getElementById('tv-controls').style.display = 'block';
        const sSel = document.getElementById('s-select');
        sSel.innerHTML = det.seasons.filter(s => s.season_number > 0).map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
        updateEps();
    } else {
        document.getElementById('tv-controls').style.display = 'none';
        document.getElementById('main-iframe').src = `https://zxcstream.xyz/embed/movie/${id}`;
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
    document.getElementById('main-iframe').src = `https://zxcstream.xyz/embed/tv/${activeID}/${s}/${e}`;
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('main-iframe').src = '';
    document.body.style.overflow = 'auto';
}

init();
