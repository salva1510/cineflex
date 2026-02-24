const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";

async function loadContent(genreId = 'all', element = null) {
    if(element) {
        document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
        element.classList.add('active');
    }
    
    let url = `${BASE}/trending/all/week?api_key=${API_KEY}`;
    if(genreId !== 'all') url = `${BASE}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`;
    
    const res = await fetch(url).then(r => r.json());
    const list = document.getElementById('movie-list');
    list.innerHTML = res.results.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        </div>
    `).join('');
}

function showSection(section, el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    
    const searchSec = document.getElementById('search-section');
    const mainSec = document.getElementById('main-content');
    
    if(section === 'search') {
        searchSec.style.display = 'block';
        mainSec.style.display = 'none';
    } else {
        searchSec.style.display = 'none';
        mainSec.style.display = 'block';
        document.getElementById('row-title').innerText = section.toUpperCase();
        loadContent(); // Refresh content
    }
}

async function searchAPI(q) {
    if(q.length < 2) return;
    const res = await fetch(`${BASE}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
    document.getElementById('search-results').innerHTML = res.results.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        </div>
    `).join('');
}

async function openModal(id, type, title) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('player');
    const castList = document.getElementById('cast-list');
    
    // Set Video
    player.src = type === 'tv' ? `https://zxcstream.xyz/embed/tv/${id}/1/1` : `https://zxcstream.xyz/embed/movie/${id}`;
    document.getElementById('modal-title').innerText = title;
    
    // Load Cast Logos
    const cast = await fetch(`${BASE}/${type}/${id}/credits?api_key=${API_KEY}`).then(r => r.json());
    castList.innerHTML = cast.cast.slice(0, 8).map(c => `
        <div class="cast-card">
            <img src="https://image.tmdb.org/t/p/w185${c.profile_path || ''}" onerror="this.src='https://via.placeholder.com/100'">
            <span class="cast-name">${c.name}</span>
        </div>
    `).join('');
    
    modal.style.display = 'block';
}

loadContent(); // Initial Load
