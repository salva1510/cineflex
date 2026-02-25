const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";

let bannerItems = [];
let bannerIdx = 0;
let currentItem = null;

// LocalStorage Persistence
let myFavorites = JSON.parse(localStorage.getItem('cine_mylist')) || [];
let recentlyWatched = JSON.parse(localStorage.getItem('cine_recent')) || [];

async function init() {
    const res = await fetch(`${BASE}/trending/all/week?api_key=${API_KEY}`).then(r => r.json());
    bannerItems = res.results.slice(0, 10);
    
    renderBanner();
    renderList(res.results, 'trending-row');
    updateSpecialRows();
}

// Manual Banner
function slideBanner(dir) {
    bannerIdx = (bannerIdx + dir + bannerItems.length) % bannerItems.length;
    renderBanner();
}

function renderBanner() {
    const m = bannerItems[bannerIdx];
    const banner = document.getElementById('banner');
    const isAdded = myFavorites.some(f => f.id === m.id);
    
    banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    document.getElementById('banner-content').innerHTML = `
        <h1 style="font-size:3rem; margin:0;">${m.title || m.name}</h1>
        <p style="margin:15px 0; color:#ccc;">${m.overview.slice(0, 140)}...</p>
        <div class="banner-btns">
            <button class="btn btn-play" onclick="openModal('${m.id}', '${m.media_type}', '${m.title || m.name}')"><i class="fa fa-play"></i> Play</button>
            <button class="btn btn-mylist ${isAdded ? 'active' : ''}" onclick="quickListAdd(${bannerIdx})">
                <i class="fa ${isAdded ? 'fa-check' : 'fa-plus'}"></i> My List
            </button>
        </div>
    `;
}

// UI Update para sa Special Rows
function updateSpecialRows() {
    const mlRow = document.getElementById('mylist-row');
    const cwRow = document.getElementById('continue-row');

    if (myFavorites.length > 0) {
        document.getElementById('mylist-section').style.display = 'block';
        renderList(myFavorites, 'mylist-row');
    } else { document.getElementById('mylist-section').style.display = 'none'; }

    if (recentlyWatched.length > 0) {
        document.getElementById('continue-section').style.display = 'block';
        renderList(recentlyWatched, 'continue-row');
    } else { document.getElementById('continue-section').style.display = 'none'; }
}

function renderList(data, containerId) {
    document.getElementById(containerId).innerHTML = data.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type || 'movie'}', '${m.title || m.name}')">
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        </div>
    `).join('');
}

// Player Modal + More Like This
async function openModal(id, type, title) {
    const modal = document.getElementById('pModal');
    const iframe = document.getElementById('pIframe');
    
    // Save to Continue Watching
    saveToRecent(id, type, title);

    const [det, sim] = await Promise.all([
        fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits`).then(r => r.json()),
        fetch(`${BASE}/${type}/${id}/similar?api_key=${API_KEY}`).then(r => r.json())
    ]);

    currentItem = det;
    currentItem.media_type = type;

    document.getElementById('pTitle').innerText = title;
    document.getElementById('pDesc').innerText = det.overview;
    updateModalListBtn();

    // Cast & Similar
    document.getElementById('pCast').innerHTML = det.credits.cast.slice(0, 10).map(c => `
        <div style="text-align:center; min-width:85px;"><img src="https://image.tmdb.org/t/p/w185${c.profile_path}" class="cast-item"><span>${c.name}</span></div>
    `).join('');
    
    document.getElementById('pSimilar').innerHTML = sim.results.slice(0, 6).map(s => `
        <div class="similar-card" onclick="openModal('${s.id}', '${type}', '${s.title || s.name}')"><img src="https://image.tmdb.org/t/p/w342${s.poster_path}"></div>
    `).join('');

    iframe.src = type === 'tv' ? `https://zxcstream.xyz/embed/tv/${id}/1/1` : `https://zxcstream.xyz/embed/movie/${id}`;
    modal.style.display = 'block';
}

// Favorites & History Logic
function saveToRecent(id, type, title) {
    fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}`).then(r=>r.json()).then(m => {
        m.media_type = type;
        recentlyWatched = recentlyWatched.filter(x => x.id != id);
        recentlyWatched.unshift(m);
        if(recentlyWatched.length > 12) recentlyWatched.pop();
        localStorage.setItem('cine_recent', JSON.stringify(recentlyWatched));
        updateSpecialRows();
    });
}

function toggleMyList() {
    const idx = myFavorites.findIndex(f => f.id === currentItem.id);
    if(idx > -1) myFavorites.splice(idx, 1);
    else myFavorites.unshift(currentItem);
    
    localStorage.setItem('cine_mylist', JSON.stringify(myFavorites));
    updateModalListBtn();
    updateSpecialRows();
    renderBanner();
}

function quickListAdd(idx) {
    const item = bannerItems[idx];
    const exists = myFavorites.findIndex(f => f.id === item.id);
    if(exists > -1) myFavorites.splice(exists, 1);
    else myFavorites.unshift(item);
    
    localStorage.setItem('cine_mylist', JSON.stringify(myFavorites));
    renderBanner();
    updateSpecialRows();
}

function updateModalListBtn() {
    const isAdded = myFavorites.some(f => f.id === currentItem.id);
    document.getElementById('modal-mylist-btn').innerHTML = isAdded ? '<i class="fa fa-check"></i> In My List' : '<i class="fa fa-plus"></i> My List';
}

async function doSearch(q) {
    if(q.length < 2) return;
    const res = await fetch(`${BASE}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
    renderList(res.results, 'search-results');
}

function showSearch() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('search-view').style.display = 'block';
}

function closeModal() {
    document.getElementById('pModal').style.display = 'none';
    document.getElementById('pIframe').src = '';
}

init();
