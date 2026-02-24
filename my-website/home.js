const KEY = "742aa17a327005b91fb6602054523286";
const TMDB = "https://api.themoviedb.org/3";
let heroItem = null;

async function startCineflex() {
    // Multi-load rows
    const [t, tv, a] = await Promise.all([
        fetch(`${TMDB}/trending/all/week?api_key=${KEY}`).then(r => r.json()),
        fetch(`${TMDB}/tv/popular?api_key=${KEY}`).then(r => r.json()),
        fetch(`${TMDB}/discover/movie?api_key=${KEY}&with_genres=28`).then(r => r.json())
    ]);

    renderRow(t.results, 'trending');
    renderRow(tv.results, 'popular-tv');
    renderRow(a.results, 'action-row');

    heroItem = t.results[0];
    initHero(heroItem);
}

function initHero(m) {
    const hero = document.getElementById('hero');
    hero.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    hero.innerHTML = `
        <div class="hero-content">
            <h1 class="hero-title">${m.title || m.name}</h1>
            <p style="font-size:1.3rem; margin:20px 0;">${m.overview.substring(0, 160)}...</p>
            <button class="btn-play" onclick="openModal('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')"><i class="fa fa-play"></i> PLAY NOW</button>
        </div>
    `;
}

function renderRow(data, id) {
    const el = document.getElementById(id);
    el.innerHTML = data.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || (m.name ? 'tv' : 'movie')}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}" loading="lazy">
        </div>
    `).join('');
}

async function doSearch(q) {
    const overlay = document.getElementById('search-overlay');
    if(q.length < 2) { overlay.style.display = 'none'; return; }
    const res = await fetch(`${TMDB}/search/multi?api_key=${KEY}&query=${q}`).then(r => r.json());
    renderRow(res.results, 'search-results');
    overlay.style.display = 'block';
}

let curID, curType;

async function openModal(id, type, title) {
    curID = id; curType = type;
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('main-player');
    
    // Fetch Details & Cast
    const details = await fetch(`${TMDB}/${type}/${id}?api_key=${KEY}&append_to_response=credits`).then(r => r.json());
    
    document.getElementById('m-title').innerText = title;
    document.getElementById('m-desc').innerText = details.overview;
    document.getElementById('m-meta').innerHTML = `${(details.release_date || details.first_air_date || '').split('-')[0]} • ${type.toUpperCase()} • HD`;
    document.getElementById('m-cast').innerText = details.credits.cast.slice(0, 5).map(c => c.name).join(', ');

    if(type === 'tv') {
        document.getElementById('tv-controls').style.display = 'flex';
        const sSelect = document.getElementById('s-select');
        sSelect.innerHTML = details.seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
        fetchEpisodes();
    } else {
        document.getElementById('tv-controls').style.display = 'none';
        player.src = `https://zxcstream.xyz/embed/movie/${id}`;
    }
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function fetchEpisodes() {
    const s = document.getElementById('s-select').value;
    const res = await fetch(`${TMDB}/tv/${curID}/season/${s}?api_key=${KEY}`).then(r => r.json());
    const eSelect = document.getElementById('e-select');
    eSelect.innerHTML = res.episodes.map(e => `<option value="${e.episode_number}">Episode ${e.episode_number}: ${e.name}</option>`).join('');
    playEpisode();
}

function playEpisode() {
    const s = document.getElementById('s-select').value;
    const e = document.getElementById('e-select').value;
    document.getElementById('main-player').src = `https://zxcstream.xyz/embed/tv/${curID}/${s}/${e}`;
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    document.getElementById('main-player').src = '';
    document.body.style.overflow = 'auto';
}

startCineflex();
