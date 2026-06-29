const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

// --- PLAYERS DOMAINS ---
const SERVER_1_URL = "https://zxcstream.xyz";
const SERVER_2_URL = "https://zxcstream.xyz"; 

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let activeServer = 1;

// --- LOCAL STORAGE DATA STORES ---
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let watchlist = JSON.parse(localStorage.getItem("cineflex_watchlist")) || [];

let touchStartX = 0;
let touchEndX = 0;

// --- PAGINATION AT STATE VARIABLES PARA SA VIEW ALL ---
let currentViewAllPage = 1;
let currentViewAllUrl = "";
let isFetchingViewAll = false;

// ==========================================
// 1. SPLASH SCREEN ENGINE & AUDIO CODES (ADDED)
// ==========================================
function startAppWithSound() {
    const sound = document.getElementById("intro-sound");
    const splash = document.getElementById("splash-overlay");
    
    // Subukang patugtugin ang Netflix-style sound
    if (sound) {
        sound.play()
          .then(() => console.log("Intro sound successfully played!"))
          .catch(err => console.log("Audio playback blocked or failed:", err));
    }
    
    // Smooth Fade-out para sa Splash Overlay upang lumitaw ang website sa likod
    if (splash) {
        splash.style.opacity = "0";
        splash.style.visibility = "hidden";
        setTimeout(() => {
            splash.style.display = "none";
        }, 500); // Mawawala nang tuluyan pagkatapos ng 0.5 segundo
    }
}

// --- POP-UNDER ADS INJECTION ---
function triggerPopUnder() {
  try {
    const adScript = document.createElement('script');
    adScript.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js\";";
    adScript.type = "text/javascript";
    document.body.appendChild(adScript);
  } catch (e) {
    console.error("Ads injection failed", e);
  }
}

// --- CORE INITIALIZATION ---
async function init() {
    // I-setup ang click trigger para sa Splash Screen Engine agad pagka-load
    const splashOverlay = document.getElementById("splash-overlay");
    if (splashOverlay) {
        splashOverlay.addEventListener("click", startAppWithSound);
    }

    // I-load ang mga content mula sa TMDB API
    await fetchTrending();
    await fetchNetflixOriginals();
    await fetchDramaBox();
    await fetchKDrama();
    await fetchPinoyAction();
    await fetchAnime();
    await fetchMarvel();
    await fetchFilipinoMovies();
    await fetchKPop();
    await fetchCocomelon();
    await fetchKidsFamily();
    
    renderContinueWatching();
    setupBannerSlider();
    setupPWAInstall();
}

// --- API FETCHERS & RENDERING ---
async function fetchTrending() {
    try {
        const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
        const data = await res.json();
        trendingItems = data.results || [];
        if (trendingItems.length > 0) {
            updateBanner(trendingItems[0]);
        }
        renderRow(trendingItems, "trending-today");
    } catch (err) { console.error(err); }
}

async function fetchNetflixOriginals() {
    try {
        const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_networks=213`);
        const data = await res.json();
        renderRow(data.results, "netflix-movies-list", true);
    } catch (err) { console.error(err); }
}

async function fetchDramaBox() {
    try {
        const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_keywords=210024|234180`);
        const data = await res.json();
        renderRow(data.results, "dramabox-list");
    } catch (err) { console.error(err); }
}

async function fetchKDrama() {
    try {
        const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko`);
        const data = await res.json();
        renderRow(data.results, "kdrama-list");
    } catch (err) { console.error(err); }
}

async function fetchPinoyAction() {
    try {
        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28&with_original_language=tl`);
        const data = await res.json();
        renderRow(data.results, "pinoy-action-list");
    } catch (err) { console.error(err); }
}

async function fetchAnime() {
    try {
        const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`);
        const data = await res.json();
        renderRow(data.results, "anime-list");
    } catch (err) { console.error(err); }
}

async function fetchMarvel() {
    try {
        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420`);
        const data = await res.json();
        renderRow(data.results, "marvel-list");
    } catch (err) { console.error(err); }
}

async function fetchFilipinoMovies() {
    try {
        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=tl`);
        const data = await res.json();
        renderRow(data.results, "filipino-list");
    } catch (err) { console.error(err); }
}

async function fetchKPop() {
    try {
        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_keywords=256173|6075`);
        const data = await res.json();
        renderRow(data.results, "kpop-list");
    } catch (err) { console.error(err); }
}

async function fetchCocomelon() {
    try {
        const res = await fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=Cocomelon`);
        const data = await res.json();
        renderRow(data.results, "cocomelon-list");
    } catch (err) { console.error(err); }
}

async function fetchKidsFamily() {
    try {
        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10751`);
        const data = await res.json();
        renderRow(data.results, "kids-list");
    } catch (err) { console.error(err); }
}

function renderRow(items, elementId, isNetflixRow = false) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = "";

    items.forEach(item => {
        if (!item.poster_path && !item.backdrop_path) return;
        const card = document.createElement("div");
        card.className = isNetflixRow ? "netflix-card" : "card";
        
        const imgUrl = item.poster_path ? `${IMG_URL}${item.poster_path}` : `${IMG_URL}${item.backdrop_path}`;
        card.innerHTML = `<img src="${imgUrl}" alt="${item.title || item.name}">`;
        card.onclick = () => showDetails(item);
        container.appendChild(card);
    });
}

// --- HERO BANNER CONTROLS ---
function updateBanner(item) {
    const banner = document.getElementById("banner");
    const title = document.getElementById("banner-title");
    const desc = document.getElementById("banner-desc");
    if (!banner) return;

    const bgUrl = item.backdrop_path ? `${IMG_URL}${item.backdrop_path}` : `${IMG_URL}${item.poster_path}`;
    banner.style.backgroundImage = `linear-gradient(to top, #050505 0%, rgba(5,5,5,0.1) 60%, rgba(5,5,5,0.8) 100%), url('${bgUrl}')`;
    title.innerText = item.title || item.name || "Featured Content";
    desc.innerText = item.overview ? item.overview.slice(0, 130) + "..." : "No description available.";
    
    banner.onclick = () => showDetails(item);
}

function setupBannerSlider() {
    setInterval(() => {
        if (trendingItems.length > 0) {
            currentBannerIndex = (currentBannerIndex + 1) % Math.min(trendingItems.length, 6);
            updateBanner(trendingItems[currentBannerIndex]);
        }
    }, 8000);
}

function showBannerDetails() {
    if(trendingItems[currentBannerIndex]) {
        showDetails(trendingItems[currentBannerIndex]);
    }
}

// --- DETAILS MODAL ENGINE ---
async function showDetails(item) {
    currentItem = item;
    triggerPopUnder();

    const modal = document.getElementById("details-modal");
    const title = document.getElementById("modal-title");
    const desc = document.getElementById("modal-desc");
    const modalBanner = document.getElementById("modal-banner");
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    const epSelector = document.getElementById("episode-selector");

    title.innerText = item.title || item.name;
    desc.innerText = item.overview || "No description provided.";
    
    const bgUrl = item.backdrop_path ? `${IMG_URL}${item.backdrop_path}` : `${IMG_URL}${item.poster_path}`;
    modalBanner.style.backgroundImage = `url('${bgUrl}')`;

    // I-reset ang players setup
    playerContainer.style.display = "none";
    iframe.src = "";
    epSelector.style.display = "none";

    const isTV = item.media_type === "tv" || !item.release_date;
    currentTVState.type = isTV ? 'tv' : 'movie';

    if (isTV) {
        await setupTVShow(item.id);
    }

    updateWatchlistButton();
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    
    fetchRecommendations(item.id, currentTVState.type);
    fetchCast(item.id, currentTVState.type);
}

function closeModal() {
    const modal = document.getElementById("details-modal");
    const iframe = document.getElementById("modal-video-iframe");
    if(modal) modal.style.display = "none";
    if(iframe) iframe.src = "";
    document.body.style.overflow = "auto";
}

// --- SERVER AT VIDEO PLAYBACK STREAMING ---
function startPlayback() {
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    if (!currentItem) return;

    playerContainer.style.display = "block";
    
    let embedUrl = "";
    if (currentTVState.type === 'tv') {
        embedUrl = activeServer === 1 
            ? `${SERVER_1_URL}/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.episode}`
            : `${SERVER_2_URL}/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.episode}`;
    } else {
        embedUrl = activeServer === 1 
            ? `${SERVER_1_URL}/movie/${currentItem.id}`
            : `${SERVER_2_URL}/movie/${currentItem.id}`;
    }
    
    iframe.src = embedUrl;
    saveToContinueWatching();
}

function switchServer(serverNum) {
    activeServer = serverNum;
    document.getElementById("srv1-btn").classList.toggle("active", serverNum === 1);
    document.getElementById("srv2-btn").classList.toggle("active", serverNum === 2);
    
    const playerContainer = document.getElementById("modal-player-container");
    if (playerContainer && playerContainer.style.display === "block") {
        startPlayback();
    }
}

// --- SEASONS & EPISODES MANAGER ---
async function setupTVShow(tvId) {
    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
        const data = await res.json();
        const seasonSelect = document.getElementById("season-select");
        const epSelector = document.getElementById("episode-selector");
        
        seasonSelect.innerHTML = "";
        if(data.seasons && data.seasons.length > 0) {
            data.seasons.forEach(s => {
                if(s.season_number === 0) return; // Laktawan ang Specials
                const opt = document.createElement("option");
                opt.value = s.season_number;
                opt.innerText = s.name;
                seasonSelect.appendChild(opt);
            });
            epSelector.style.display = "block";
            await loadEpisodes(tvId, data.seasons[0].season_number);
        }
    } catch(err) { console.error(err); }
}

async function loadEpisodes(tvId, seasonNum) {
    try {
        currentTVState.season = seasonNum;
        const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
        const data = await res.json();
        const epList = document.getElementById("episode-list");
        epList.innerHTML = "";

        if(data.episodes) {
            data.episodes.forEach(ep => {
                const epItem = document.createElement("div");
                epItem.className = `episode-item ${currentTVState.episode == ep.episode_number ? 'active' : ''}`;
                
                const thumb = ep.still_path ? `${IMG_URL}${ep.still_path}` : `${IMG_URL}${currentItem.backdrop_path}`;
                epItem.innerHTML = `
                    <img src="${thumb}" alt="Ep ${ep.episode_number}">
                    <div class="ep-meta">
                        <h4>Ep ${ep.episode_number}: ${ep.name || 'Episode Name'}</h4>
                        <p>${ep.overview ? ep.overview.slice(0, 70) + '...' : 'No description available.'}</p>
                    </div>
                `;
                epItem.onclick = () => {
                    currentTVState.episode = ep.episode_number;
                    document.querySelectorAll(".episode-item").forEach(el => el.classList.remove("active"));
                    epItem.classList.add("active");
                    startPlayback();
                };
                epList.appendChild(epItem);
            });
        }
    } catch(err) { console.error(err); }
}

// --- CAST & RECOMMENDATIONS SYSTEM ---
async function fetchCast(id, type) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`);
        const data = await res.json();
        const castList = document.getElementById("modal-cast");
        castList.innerHTML = "";
        
        if(data.cast) {
            data.cast.slice(0, 10).forEach(c => {
                const avatar = c.profile_path ? `${IMG_URL}${c.profile_path}` : 'https://via.placeholder.com/100x100?text=No+Img';
                const div = document.createElement("div");
                div.className = "cast-item";
                div.innerHTML = `<img src="${avatar}"><span>${c.name}</span>`;
                castList.appendChild(div);
            });
        }
    } catch(err) { console.error(err); }
}

async function fetchRecommendations(id, type) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}`);
        const data = await res.json();
        const recList = document.getElementById("modal-recommendations");
        recList.innerHTML = "";
        
        if(data.results) {
            data.results.slice(0, 5).forEach(item => {
                const row = document.createElement("div");
                row.className = "rec-row";
                const poster = item.poster_path ? `${IMG_URL}${item.poster_path}` : `${IMG_URL}${item.backdrop_path}`;
                row.innerHTML = `
                    <img src="${poster}">
                    <div class="rec-info">
                        <h4>${item.title || item.name}</h4>
                        <p>${item.overview ? item.overview.slice(0, 80) + '...' : ''}</p>
                    </div>
                `;
                row.onclick = () => showDetails(item);
                recList.appendChild(row);
            });
        }
    } catch(err) { console.error(err); }
}

// --- CONTINUE WATCHING HISTORY ---
function saveToContinueWatching() {
    if(!currentItem) return;
    continueWatching = continueWatching.filter(i => i.id !== currentItem.id);
    continueWatching.unshift({
        id: currentItem.id,
        title: currentItem.title || currentItem.name,
        poster_path: currentItem.poster_path,
        backdrop_path: currentItem.backdrop_path,
        media_type: currentTVState.type,
        progress: currentTVState
    });
    if(continueWatching.length > 15) continueWatching.pop();
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
    renderContinueWatching();
}

function renderContinueWatching() {
    const sect = document.getElementById("continue-watching-section");
    const list = document.getElementById("continue-list");
    if(!list || !sect) return;

    if(continueWatching.length === 0) {
        sect.style.display = "none";
        return;
    }
    sect.style.display = "block";
    list.innerHTML = "";

    continueWatching.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        const img = item.poster_path ? `${IMG_URL}${item.poster_path}` : `${IMG_URL}${item.backdrop_path}`;
        card.innerHTML = `<img src="${img}">`;
        card.onclick = () => {
            currentTVState = item.progress;
            showDetails(item);
        };
        list.appendChild(card);
    });
}

// --- WATCHLIST (MY LIST) MANAGEMENT ---
function toggleWatchlist() {
    if(!currentItem) return;
    const exists = watchlist.some(i => i.id === currentItem.id);
    if(exists) {
        watchlist = watchlist.filter(i => i.id !== currentItem.id);
    } else {
        watchlist.push(currentItem);
    }
    localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
    updateWatchlistButton();
}

function updateWatchlistButton() {
    const btn = document.getElementById("modal-watchlist-btn");
    if(!btn || !currentItem) return;
    const exists = watchlist.some(i => i.id === currentItem.id);
    btn.innerHTML = exists ? `<i class="fa-solid fa-check"></i>` : `<i class="fa-solid fa-plus"></i>`;
}

// --- DRAWER NAVIGATION & MENU ---
function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }

function viewWatchlist() {
    closeMenuDrawer();
    const listContainer = document.getElementById("trending-today");
    document.querySelector(".section-title").innerText = "My Watchlist";
    renderRow(watchlist, "trending-today");
    window.scrollTo({top: 300, behavior: "smooth"});
}

// --- REALTIME ENGINE SEARCH OVERLAY ---
function openSearch() {
    document.getElementById("search-overlay").style.display = "block";
    document.getElementById("searchInput").focus();
}
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

document.getElementById("searchInput")?.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if(query.length < 2) return;
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        const grid = document.getElementById("search-results");
        grid.innerHTML = "";
        
        if(data.results) {
            data.results.forEach(item => {
                if(!item.poster_path && !item.backdrop_path) return;
                const card = document.createElement("div");
                card.className = "search-card";
                const img = item.poster_path ? `${IMG_URL}${item.poster_path}` : `${IMG_URL}${item.backdrop_path}`;
                card.innerHTML = `<img src="${img}">`;
                card.onclick = () => { closeSearch(); showDetails(item); };
                grid.appendChild(card);
            });
        }
    } catch(err) { console.error(err); }
});

// --- TRAILER PLAYER ---
async function playTrailer() {
    if(!currentItem) return;
    try {
        const res = await fetch(`${BASE_URL}/${currentTVState.type}/${currentItem.id}/videos?api_key=${API_KEY}`);
        const data = await res.json();
        if(data.results && data.results.length > 0) {
            const youtube = data.results.find(v => v.site === "YouTube" && v.type === "Trailer") || data.results[0];
            window.open(`https://www.youtube.com/watch?v=${youtube.key}`, '_blank');
        } else {
            alert("Trailer not found for this title!");
        }
    } catch(err) { console.error(err); }
}

function triggerDownload() {
    alert("Streaming link extraction ready. Downloading is managed by external media handlers.");
}

// --- PWA APPLICATION INSTALL SYSTEM ---
function setupPWAInstall() {
    let deferredPrompt;
    const installBtn = document.getElementById("installBtn");
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if(installBtn) installBtn.style.display = "block";
    });

    installBtn?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') installBtn.style.display = "none";
            deferredPrompt = null;
        }
    });
}

// --- INTERACTIVE KEYBOARD REMOTE MANIPULATION ---
let selectedIndex = 0;
const getFocusables = () => document.querySelectorAll('button, [onclick], .card, .episode-item, .nav-item, .search-card, .netflix-item-container, .modern-grid-item');

function moveFocus(direction) {
    const items = getFocusables();
    if (items.length === 0) return;

    const cols = 4; 
    let newIndex = selectedIndex;

    switch(direction) {
        case 'ArrowRight': newIndex = Math.min(selectedIndex + 1, items.length - 1); break;
        case 'ArrowLeft':  newIndex = Math.max(selectedIndex - 1, 0); break;
        case 'ArrowDown':  newIndex = Math.min(selectedIndex + cols, items.length - 1); break;
        case 'ArrowUp':    newIndex = Math.max(selectedIndex - cols, 0); break;
        case 'Enter':
            if (items[selectedIndex]) items[selectedIndex].click();
            return;
    }

    selectedIndex = newIndex;
    if (items[selectedIndex]) {
        items.forEach(el => { if(el.style) el.style.outline = "none"; });
        items[selectedIndex].focus();
        if(items[selectedIndex].style) items[selectedIndex].style.outline = "2px solid #e50914";
        items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

document.addEventListener("keydown", (e) => {
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key)) {
        moveFocus(e.key);
    }
});

// Patakbuhin ang initialization engine pagka-load ng page
init();
