const KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";

async function init() {
    const trend = await fetch(`${BASE}/trending/all/week?api_key=${KEY}`).then(r => r.json());
    const tv = await fetch(`${BASE}/tv/popular?api_key=${KEY}`).then(r => r.json());

    fillScroller(trend.results, 'trending');
    fillScroller(tv.results, 'tv-series');
    setHero(trend.results[0]);
}

function setHero(m) {
    const hero = document.getElementById('hero');
    hero.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    hero.innerHTML = `
        <div class="banner-content">
            <h1 class="banner-title">${m.title || m.name}</h1>
            <p style="font-size: 1.2rem; max-width: 500px;">${m.overview.slice(0, 150)}...</p>
            <button onclick="openP('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')" style="padding: 12px 35px; background: #fff; color: #000; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 1.1rem;"><i class="fa fa-play"></i> Play Now</button>
        </div>
    `;
}

function fillScroller(data, id) {
    const list = document.getElementById(id);
    list.innerHTML = data.map(m => `
        <div class="card" onclick="openP('${m.id}', '${m.media_type || (m.name ? 'tv' : 'movie')}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}" alt="CineFlex">
        </div>
    `).join('');
}

// Smart Search
async function liveSearch(q) {
    const row = document.getElementById('search-row');
    if(q.length < 2) { row.style.display = 'none'; return; }
    const res = await fetch(`${BASE}/search/multi?api_key=${KEY}&query=${q}`).then(r => r.json());
    fillScroller(res.results, 'search-list');
    row.style.display = 'block';
}

let activeID, activeTYPE;

function openP(id, type, title) {
    activeID = id; activeTYPE = type;
    const modal = document.getElementById('p-modal');
    const iframe = document.getElementById('player');
    document.getElementById('m-title').innerText = "CineFlex: " + title;

    if(type === 'tv') {
        document.getElementById('tv-panel').style.display = 'flex';
        loadTV(id);
    } else {
        document.getElementById('tv-panel').style.display = 'none';
        iframe.src = `https://zxcstream.xyz/embed/movie/${id}`;
    }
    modal.style.display = 'block';
}

async function loadTV(id) {
    const res = await fetch(`${BASE}/tv/${id}?api_key=${KEY}`).then(r => r.json());
    const sSel = document.getElementById('s-select');
    sSel.innerHTML = res.seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEps();
}

async function loadEps() {
    const s = document.getElementById('s-select').value;
    const res = await fetch(`${BASE}/tv/${activeID}/season/${s}?api_key=${KEY}`).then(r => r.json());
    const eSel = document.getElementById('e-select');
    eSel.innerHTML = res.episodes.map(e => `<option value="${e.episode_number}">Episode ${e.episode_number}: ${e.name}</option>`).join('');
    playEp();
}

function playEp() {
    const s = document.getElementById('s-select').value;
    const e = document.getElementById('e-select').value;
    document.getElementById('player').src = `https://zxcstream.xyz/embed/tv/${activeID}/${s}/${e}`;
}

function closeP() {
    document.getElementById('p-modal').style.display = 'none';
    document.getElementById('player').src = '';
}

init();
