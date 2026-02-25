const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";
let bannerData = [];
let bannerIdx = 0;

async function init() {
    const res = await fetch(`${BASE}/trending/all/week?api_key=${API_KEY}`).then(r => r.json());
    bannerData = res.results.slice(0, 5);
    renderBanner();
    setInterval(() => { bannerIdx = (bannerIdx + 1) % 5; renderBanner(); }, 8000); // Slide every 8s

    renderList(res.results, 'trending-row');
}

function renderBanner() {
    const m = bannerData[bannerIdx];
    const banner = document.getElementById('banner');
    banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    document.getElementById('banner-content').innerHTML = `
        <h1 style="font-size:3rem; margin:0;">${m.title || m.name}</h1>
        <p style="margin:15px 0; color:#ccc;">${m.overview.slice(0, 150)}...</p>
        <div class="banner-btns">
            <button class="btn btn-play" onclick="openModal('${m.id}', '${m.media_type}', '${m.title || m.name}')"><i class="fa fa-play"></i> Play</button>
            <button class="btn btn-trailer" onclick="openTrailer('${m.id}', '${m.media_type}')"><i class="fa fa-info-circle"></i> Trailer</button>
        </div>
    `;
}

function renderList(data, containerId) {
    document.getElementById(containerId).innerHTML = data.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        </div>
    `).join('');
}

async function navTo(type, el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    
    const views = ['home-view', 'grid-view', 'search-view'];
    views.forEach(v => document.getElementById(v).style.display = 'none');

    if(type === 'home') {
        document.getElementById('home-view').style.display = 'block';
    } else if(type === 'search') {
        document.getElementById('search-view').style.display = 'block';
    } else {
        document.getElementById('grid-view').style.display = 'block';
        document.getElementById('grid-title').innerText = type === 'movie' ? 'Movies' : 'TV Shows';
        const res = await fetch(`${BASE}/${type}/popular?api_key=${API_KEY}`).then(r => r.json());
        renderList(res.results, 'grid-content');
    }
}

async function searchAPI(q) {
    if(q.length < 2) return;
    const res = await fetch(`${BASE}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
    renderList(res.results, 'search-results');
}

async function openModal(id, type, title) {
    const modal = document.getElementById('pModal');
    const iframe = document.getElementById('pIframe');
    
    const [det, sim] = await Promise.all([
        fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits`).then(r => r.json()),
        fetch(`${BASE}/${type}/${id}/similar?api_key=${API_KEY}`).then(r => r.json())
    ]);

    document.getElementById('pTitle').innerText = title;
    document.getElementById('pDesc').innerText = det.overview;
    
    // Cast
    document.getElementById('pCast').innerHTML = det.credits.cast.slice(0, 8).map(c => `
        <div style="text-align:center; min-width:80px;" class="cast-item">
            <img src="https://image.tmdb.org/t/p/w185${c.profile_path}" onerror="this.src='https://via.placeholder.com/80'">
            <span style="font-size:0.7rem; display:block; margin-top:5px;">${c.name}</span>
        </div>
    `).join('');

    // More Like This
    document.getElementById('pSimilar').innerHTML = sim.results.slice(0, 6).map(s => `
        <div class="similar-card" onclick="openModal('${s.id}', '${type}', '${s.title || s.name}')">
            <img src="https://image.tmdb.org/t/p/w342${s.poster_path}">
        </div>
    `).join('');

    iframe.src = type === 'tv' ? `https://zxcstream.xyz/embed/tv/${id}/1/1` : `https://zxcstream.xyz/embed/movie/${id}`;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function openTrailer(id, type) {
    const res = await fetch(`${BASE}/${type}/${id}/videos?api_key=${API_KEY}`).then(r => r.json());
    const trailer = res.results.find(v => v.type === 'Trailer');
    if(trailer) {
        document.getElementById('pIframe').src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
        document.getElementById('pModal').style.display = 'block';
    }
}

function closeModal() {
    document.getElementById('pModal').style.display = 'none';
    document.getElementById('pIframe').src = '';
    document.body.style.overflow = 'auto';
}

init();
