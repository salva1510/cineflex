const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";

let bannerItems = [];
let bannerIdx = 0;
let currentItem = null;

// Persistence
let myFavorites = JSON.parse(localStorage.getItem('cine_fav')) || [];
let history = JSON.parse(localStorage.getItem('cine_history')) || [];

async function init() {
    const res = await fetch(`${BASE}/trending/all/week?api_key=${API_KEY}`).then(r => r.json());
    bannerItems = res.results.slice(0, 10);
    
    renderBanner();
    renderList(res.results, 'trending-row');
    updateSpecialSections();
}

function slideBanner(dir) {
    bannerIdx = (bannerIdx + dir + bannerItems.length) % bannerItems.length;
    renderBanner();
}

function renderBanner() {
    const m = bannerItems[bannerIdx];
    const banner = document.getElementById('banner');
    const isFav = myFavorites.some(f => f.id === m.id);
    
    banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    document.getElementById('banner-content').innerHTML = `
        <h1>${m.title || m.name}</h1>
        <p>${m.overview}</p>
        <div class="banner-btns">
            <button class="btn btn-play" onclick="openModal('${m.id}', '${m.media_type}', '${m.title || m.name}')"><i class="fa fa-play"></i> Play</button>
            <button class="btn btn-mylist" onclick="toggleFavorite(${bannerIdx})">
                <i class="fa ${isFav ? 'fa-check' : 'fa-plus'}"></i> My List
            </button>
        </div>
    `;
}

async function openModal(id, type, title) {
    const modal = document.getElementById('pModal');
    const iframe = document.getElementById('pIframe');
    
    // Fetch Details + Cast + Similar
    const [det, sim] = await Promise.all([
        fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits`).then(r => r.json()),
        fetch(`${BASE}/${type}/${id}/similar?api_key=${API_KEY}`).then(r => r.json())
    ]);

    currentItem = det; currentItem.media_type = type;
    saveToHistory(det);

    document.getElementById('pTitle').innerText = title;
    document.getElementById('pDesc').innerText = det.overview;
    updateModalBtn();

    // Render Circular Cast
    document.getElementById('pCast').innerHTML = det.credits.cast.slice(0, 10).map(c => `
        <div class="cast-item">
            <img src="${c.profile_path ? 'https://image.tmdb.org/t/p/w185'+c.profile_path : 'https://via.placeholder.com/100'}" class="cast-img">
            <span>${c.name}</span>
        </div>
    `).join('');

    // Render Similar
    document.getElementById('pSimilar').innerHTML = sim.results.slice(0, 6).map(s => `
        <div class="similar-card" onclick="openModal('${s.id}', '${type}', '${s.title || s.name}')">
            <img src="https://image.tmdb.org/t/p/w342${s.poster_path}">
        </div>
    `).join('');

    iframe.src = type === 'tv' ? `https://zxcstream.xyz/embed/tv/${id}/1/1` : `https://zxcstream.xyz/embed/movie/${id}`;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function renderList(data, containerId) {
    document.getElementById(containerId).innerHTML = data.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        </div>
    `).join('');
}

function updateSpecialSections() {
    if(myFavorites.length > 0) {
        document.getElementById('mylist-section').style.display = 'block';
        renderList(myFavorites, 'mylist-row');
    }
    if(history.length > 0) {
        document.getElementById('continue-section').style.display = 'block';
        renderList(history, 'continue-row');
    }
}

function saveToHistory(item) {
    history = history.filter(h => h.id !== item.id);
    history.unshift(item);
    if(history.length > 15) history.pop();
    localStorage.setItem('cine_history', JSON.stringify(history));
    updateSpecialSections();
}

function toggleFavorite(idx) {
    const item = bannerItems[idx] || currentItem;
    const fIdx = myFavorites.findIndex(f => f.id === item.id);
    if(fIdx > -1) myFavorites.splice(fIdx, 1);
    else myFavorites.unshift(item);
    localStorage.setItem('cine_fav', JSON.stringify(myFavorites));
    renderBanner(); updateSpecialSections(); updateModalBtn();
}

function toggleMyList() { toggleFavorite(-1); }

function updateModalBtn() {
    const isFav = myFavorites.some(f => f.id === currentItem.id);
    document.getElementById('modal-mylist-btn').innerHTML = `<i class="fa ${isFav ? 'fa-check' : 'fa-plus'}"></i> My List`;
}

function closeModal() {
    document.getElementById('pModal').style.display = 'none';
    document.getElementById('pIframe').src = '';
    document.body.style.overflow = 'auto';
}

init();
