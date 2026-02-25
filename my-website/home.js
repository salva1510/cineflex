const KEY = "742aa17a327005b91fb6602054523286";
const BASE = "https://api.themoviedb.org/3";

let bannerData = [];
let bIdx = 0;
let currentItem = null;

// Storage
let favs = JSON.parse(localStorage.getItem('cine_fav')) || [];
let hist = JSON.parse(localStorage.getItem('cine_hist')) || [];

async function init() {
    const res = await fetch(`${BASE}/trending/all/week?api_key=${KEY}`).then(r => r.json());
    bannerData = res.results.slice(0, 8);
    renderBanner();
    renderList(res.results, 'trending-row');
    updateSpecialRows();
    setupSwipe();
}

function renderBanner() {
    const m = bannerData[bIdx];
    const isAdded = favs.some(f => f.id === m.id);
    document.getElementById('banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${m.backdrop_path})`;
    document.getElementById('banner-content').innerHTML = `
        <h1>${m.title || m.name}</h1>
        <p>${m.overview}</p>
        <div class="banner-btns">
            <button class="btn btn-play" onclick="openModal('${m.id}', '${m.media_type}', '${m.title || m.name}')"><i class="fa fa-play"></i> Play</button>
            <button class="btn btn-mylist" onclick="bannerFav(${bIdx})"><i class="fa ${isAdded?'fa-check':'fa-plus'}"></i> My List</button>
        </div>
    `;
}

// Swipe Control
function setupSwipe() {
    let startX = 0;
    const area = document.getElementById('swipe-area');
    area.addEventListener('touchstart', e => startX = e.touches[0].clientX);
    area.addEventListener('touchend', e => {
        let diff = startX - e.changedTouches[0].clientX;
        if(Math.abs(diff) > 50) { bIdx = (bIdx + (diff > 0 ? 1 : -1) + 8) % 8; renderBanner(); }
    });
    area.addEventListener('mousedown', e => startX = e.clientX);
    area.addEventListener('mouseup', e => {
        let diff = startX - e.clientX;
        if(Math.abs(diff) > 50) { bIdx = (bIdx + (diff > 0 ? 1 : -1) + 8) % 8; renderBanner(); }
    });
}

async function openModal(id, type, title) {
    const [det, sim] = await Promise.all([
        fetch(`${BASE}/${type}/${id}?api_key=${KEY}&append_to_response=credits`).then(r => r.json()),
        fetch(`${BASE}/${type}/${id}/similar?api_key=${KEY}`).then(r => r.json())
    ]);
    currentItem = det; currentItem.media_type = type;
    saveHist(det);
    
    document.getElementById('pTitle').innerText = title;
    document.getElementById('pDesc').innerText = det.overview;
    updateModalBtn();

    // Circular Cast
    document.getElementById('pCast').innerHTML = det.credits.cast.slice(0, 10).map(c => `
        <div class="cast-item">
            <img src="${c.profile_path?'https://image.tmdb.org/t/p/w185'+c.profile_path:'https://via.placeholder.com/100'}" class="cast-img">
            <span>${c.name}</span>
        </div>
    `).join('');

    // More Like This Grid
    document.getElementById('pSimilar').innerHTML = sim.results.slice(0, 6).map(s => `
        <div class="card" onclick="openModal('${s.id}', '${type}', '${s.title||s.name}')"><img src="https://image.tmdb.org/t/p/w342${s.poster_path}"></div>
    `).join('');

    document.getElementById('pIframe').src = `https://zxcstream.xyz/embed/${type}/${id}`;
    document.getElementById('pModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function renderList(data, id) {
    document.getElementById(id).innerHTML = data.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type||'movie'}', '${m.title||m.name}')"><img src="https://image.tmdb.org/t/p/w500${m.poster_path}"></div>
    `).join('');
}

function updateSpecialRows() {
    if(hist.length) { document.getElementById('history-sec').style.display='block'; renderList(hist, 'history-row'); }
    if(favs.length) { document.getElementById('mylist-sec').style.display='block'; renderList(favs, 'mylist-row'); }
}

function saveHist(m) {
    hist = hist.filter(h => h.id !== m.id); hist.unshift(m);
    if(hist.length > 15) hist.pop();
    localStorage.setItem('cine_hist', JSON.stringify(hist)); updateSpecialRows();
}

function bannerFav(i) { toggleList(bannerData[i]); renderBanner(); }
function toggleFav() { toggleList(currentItem); updateModalBtn(); }

function toggleList(item) {
    const idx = favs.findIndex(f => f.id === item.id);
    if(idx > -1) favs.splice(idx, 1); else favs.unshift(item);
    localStorage.setItem('cine_fav', JSON.stringify(favs)); updateSpecialRows();
}

function updateModalBtn() {
    const isAdded = favs.some(f => f.id === currentItem.id);
    document.getElementById('modal-list-btn').innerHTML = `<i class="fa ${isAdded?'fa-check':'fa-plus'}"></i> My List`;
}

function navTo(page, el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active');
    document.getElementById('home-page').style.display = page === 'home' ? 'block' : 'none';
    document.getElementById('search-page').style.display = page === 'search' ? 'block' : 'none';
}

async function runSearch(q) {
    if(q.length < 2) return;
    const res = await fetch(`${BASE}/search/multi?api_key=${KEY}&query=${q}`).then(r => r.json());
    document.getElementById('search-results').innerHTML = res.results.map(m => `
        <div class="card" onclick="openModal('${m.id}', '${m.media_type}', '${m.title||m.name}')"><img src="https://image.tmdb.org/t/p/w342${m.poster_path}"></div>
    `).join('');
}

function closeModal() { document.getElementById('pModal').style.display='none'; document.getElementById('pIframe').src=''; document.body.style.overflow='auto'; }

init();
