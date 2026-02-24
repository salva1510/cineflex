const TMDB_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";
let heroMovie = null;

async function initSite() {
    const [trending, series] = await Promise.all([
        fetch(`${BASE}/trending/all/week?api_key=${TMDB_KEY}`).then(r => r.json()),
        fetch(`${BASE}/tv/popular?api_key=${TMDB_KEY}`).then(r => r.json())
    ]);

    renderList(trending.results, 'trending-list');
    renderList(series.results, 'series-list');

    heroMovie = trending.results[0];
    setHero(heroMovie);
}

function setHero(m) {
    document.getElementById('hero').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    document.getElementById('h-title').innerText = m.title || m.name;
    document.getElementById('h-desc').innerText = m.overview.slice(0, 180) + "...";
}

function renderList(data, id) {
    const el = document.getElementById(id);
    el.innerHTML = data.map(m => `
        <div class="card" onclick="openPlayer('${m.id}', '${m.media_type || (m.name ? 'tv' : 'movie')}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        </div>
    `).join('');
}

let activeId, activeType;

function openPlayer(id, type, title) {
    activeId = id; activeType = type;
    const modal = document.getElementById('playerModal');
    const iframe = document.getElementById('player-iframe');
    document.getElementById('m-title').innerText = "Streaming: " + title;

    if (type === 'tv') {
        document.getElementById('tv-controls').style.display = 'flex';
        loadTVDetails(id);
    } else {
        document.getElementById('tv-controls').style.display = 'none';
        iframe.src = `https://zxcstream.xyz/embed/movie/${id}`;
    }
    modal.style.display = 'block';
}

async function loadTVDetails(id) {
    const res = await fetch(`${BASE}/tv/${id}?api_key=${TMDB_KEY}`).then(r => r.json());
    const sSelect = document.getElementById('s-select');
    sSelect.innerHTML = res.seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    updateEpisodeList();
}

async function updateEpisodeList() {
    const sNum = document.getElementById('s-select').value;
    const res = await fetch(`${BASE}/tv/${activeId}/season/${sNum}?api_key=${TMDB_KEY}`).then(r => r.json());
    const eSelect = document.getElementById('e-select');
    eSelect.innerHTML = res.episodes.map(e => `<option value="${e.episode_number}">Episode ${e.episode_number}: ${e.name}</option>`).join('');
    changeEpisode();
}

function changeEpisode() {
    const s = document.getElementById('s-select').value;
    const e = document.getElementById('e-select').value;
    document.getElementById('player-iframe').src = `https://zxcstream.xyz/embed/tv/${activeId}/${s}/${e}`;
}

function closePlayer() {
    document.getElementById('playerModal').style.display = 'none';
    document.getElementById('player-iframe').src = '';
}

function playHero() {
    if(heroMovie) openPlayer(heroMovie.id, heroMovie.media_type || 'movie', heroMovie.title || heroMovie.name);
}

initSite();
