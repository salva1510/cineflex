const API_KEY = "742aa17a327005b91fb6602054523286";
const TMDB_BASE = "https://api.themoviedb.org/3";
let currentHero = null;

async function fetchData() {
    const trending = await fetch(`${TMDB_BASE}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
    const tv = await fetch(`${TMDB_BASE}/tv/popular?api_key=${API_KEY}`).then(res => res.json());

    renderRow(trending.results, 'trending-scroller');
    renderRow(tv.results, 'tv-scroller');
    
    currentHero = trending.results[0];
    updateHero(currentHero);
}

function updateHero(item) {
    document.getElementById('hero-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById('main-title').innerText = item.title || item.name;
    document.getElementById('main-desc').innerText = item.overview.slice(0, 150) + "...";
}

function renderRow(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => `
        <div class="card" onclick="openPlayer('${item.id}', '${item.media_type || (item.name ? 'tv' : 'movie')}', '${item.title || item.name}')">
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="CineFlex">
        </div>
    `).join('');
}

function openPlayer(id, type, title) {
    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('video-iframe');
    document.getElementById('playing-title').innerText = `CineFlex Streaming: ${title}`;
    
    // Eksaktong streaming source gaya ng zxcprime
    const source = type === 'tv' ? `https://zxcstream.xyz/embed/tv/${id}/1/1` : `https://zxcstream.xyz/embed/movie/${id}`;
    
    iframe.src = source;
    modal.style.display = 'block';
}

function closePlayer() {
    document.getElementById('player-modal').style.display = 'none';
    document.getElementById('video-iframe').src = '';
}

function playCurrent() {
    if(currentHero) openPlayer(currentHero.id, currentHero.media_type || 'movie', currentHero.title || currentHero.name);
}

fetchData();
