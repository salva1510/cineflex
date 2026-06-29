const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

const SERVER_1_URL = "https://zxcstream.xyz";
const SERVER_2_URL = "https://zxcstream.xyz"; 

let currentItem = null, trendingItems = [], currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let activeServer = 1, touchStartX = 0, touchEndX = 0;
let currentViewAllPage = 1, currentViewAllUrl = "", isFetchingViewAll = false;

let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let watchlist = JSON.parse(localStorage.getItem("cineflex_watchlist")) || [];

// --- PWA ENGINE ---
let deferredPrompt;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW Registered', reg.scope))
      .catch(err => console.error('SW Failed', err));
  });
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'block';
});

function triggerPopUnder() {
  try {
    const s = document.createElement('script');
    s.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
    document.body.appendChild(s);
  } catch(e) {}
}

async function enterCinemaMode() {
  const p = document.getElementById("modal-player-container");
  if (!p) return;
  try {
    if (p.requestFullscreen) await p.requestFullscreen();
    else if (p.webkitRequestFullscreen) await p.webkitRequestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape").catch(()=>{});
  } catch (e) {}
}

async function init() {
  try {
    const fetchSection = (url) => fetch(`${BASE_URL}/${url}&api_key=${API_KEY}`).then(r => r.json());
    const [trd, marvel, anime, fil, kd, kp, kids, pinoy, drama, netflix, coco] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetchSection("discover/movie?with_companies=420&sort_by=release_date.desc"),
      fetchSection("discover/tv?with_genres=16&with_original_language=ja"),
      fetchSection("discover/movie?region=PH&with_origin_country=PH"),
      fetchSection("discover/tv?with_original_language=ko&with_genres=18"),
      fetchSection("discover/movie?with_genres=10402&with_original_language=ko"),
      fetchSection("discover/movie?with_genres=16,10751"),
      fetchSection("discover/movie?region=PH&with_genres=28&with_origin_country=PH"),
      fetchSection("discover/tv?with_genres=18,10766&without_genres=16&with_original_language=zh|ko&sort_by=popularity.desc"),
      fetchSection("discover/movie?with_watch_providers=8&watch_region=PH&sort_by=popularity.desc"),
      fetchSection("discover/tv?with_genres=16,10751&keywords=210024|310931&sort_by=popularity.desc")
    ]);

    trendingItems = trd.results || [];
    if (trendingItems.length > 0) setBanner(trendingItems[0]);
    
    displayCards(trd.results, "trending-today");
    displayCards(marvel.results, "marvel-list");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    displayCards(kids.results, "kids-list");
    displayCards(pinoy.results, "pinoy-action-list");
    displayCards(coco.results, "cocomelon-list");
    displayCards(netflix.results, "netflix-movies-list");
    displayDramaBoxCards(drama.results, "dramabox-list");
    
    updateContinueUI();
    setupInfiniteScroll(); 
  } catch (err) { console.error(err); }
}

function setBanner(item) {
  const b = document.getElementById("banner"), t = document.getElementById("banner-title"), d = document.getElementById("banner-desc");
  if (!b || !item) return;
  b.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  if (t) t.innerText = item.title || item.name;
  if (d) d.innerText = item.overview ? item.overview.slice(0, 120) + "..." : "";
}

function showBannerDetails() { if (trendingItems[currentBannerIndex]) showDetails(trendingItems[currentBannerIndex]); }
function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) { 
    touchEndX = e.changedTouches[0].screenX; 
    if (touchStartX - touchEndX > 50) changeBanner(1);
    if (touchEndX - touchStartX > 50) changeBanner(-1);
}
function changeBanner(dir) {
    currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}

async function showDetails(item) {
  currentItem = item;
  const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
  currentTVState.type = type; activeServer = 1; updateServerTabsUI();

  const m = document.getElementById("details-modal"), pc = document.getElementById("modal-player-container"), f = document.getElementById("modal-video-iframe");
  if (pc) pc.style.display = "none"; if (f) f.src = ""; closeSearch();

  try {
    const [details, credits, recs] = await Promise.all([
      fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
    ]);

    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview || "";
    document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    
    const rc = document.getElementById("modal-recommendations");
    if (rc && recs.results) {
      rc.className = "modern-grid-container";
      rc.innerHTML = recs.results.slice(0, 8).map(r => `
        <div class="modern-grid-item" onclick='showDetails(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
            <div class="modern-thumb-wrapper"><img src="${IMG_URL}${r.backdrop_path || r.poster_path}" class="modern-img" loading="lazy"></div>
            <div class="modern-meta-info"><h4 class="modern-ep-title">${r.title || r.name}</h4></div>
        </div>`).join('');
    }

    const cc = document.getElementById("modal-cast");
    if (cc && credits.cast) {
      cc.innerHTML = credits.cast.slice(0, 8).map(c => `<div class="cast-card"><img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100x150'}"><p>${c.name}</p></div>`).join('');
    }

    const es = document.getElementById("episode-selector"), mb = document.getElementById("movie-play-action");
    if (type === 'tv') { if(es) es.style.display = "block"; if(mb) mb.style.display = "none"; setupSeasonSelector(details); }
    else { if(es) es.style.display = "none"; if(mb) mb.style.display = "block"; }

    const wl = document.getElementById("modal-watchlist-btn");
    if (wl) wl.innerHTML = watchlist.some(i => i.id === item.id) ? `<i class="fa-solid fa-check" style="color:#2ecc71;"></i> In My List` : `<i class="fa-solid fa-plus"></i> My List`;
    if (m) { m.style.display = "flex"; document.body.style.overflow = "hidden"; document.querySelector('.modal-content').scrollTo({ top: 0 }); }
  } catch (err) { console.error(err); }
}

async function playTrailer() {
    if (!currentItem) return;
    const f = document.getElementById("modal-video-iframe"), pc = document.getElementById("modal-player-container");
    try {
        const res = await fetch(`${BASE_URL}/${currentTVState.type}/${currentItem.id}/videos?api_key=${API_KEY}`).then(r => r.json());
        const t = res.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') || res.results[0];
        if (t && t.key) {
            if (pc) pc.style.display = "block";
            if (f) f.src = `https://www.youtube.com/embed/${t.key}?autoplay=1`;
            setTimeout(triggerPopUnder, 2000);
        } else { alert("Walang magagamit na trailer."); }
    } catch (err) { console.error(err); }
}

function toggleWatchlist() {
    if (!currentItem) return;
    const idx = watchlist.findIndex(i => i.id === currentItem.id), wl = document.getElementById("modal-watchlist-btn");
    if (idx === -1) { watchlist.unshift(currentItem); if (wl) wl.innerHTML = `<i class="fa-solid fa-check" style="color:#2ecc71;"></i> In My List`; }
    else { watchlist.splice(idx, 1); if (wl) wl.innerHTML = `<i class="fa-solid fa-plus"></i> My List`; }
    localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
}

function viewWatchlist() {
    closeMenuDrawer(); const font = document.getElementById("search-results"), overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return; currentViewAllUrl = ""; font.innerHTML = ""; overlay.style.display = "block";
    if (watchlist.length === 0) { font.innerHTML = `<div style="color:#aaa;text-align:center;width:100%;padding:40px;">Walang laman ang My List.</div>`; return; }
    font.innerHTML = watchlist.filter(i => i.poster_path).map(item => `
        <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'><img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p></div>`).join('');
}

function triggerDownload() {
    if (!currentItem) return; triggerPopUnder();
    const url = (currentTVState.type === 'tv') ? `https://zxcstream.xyz/download/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.currentEpNum}` : `https://zxcstream.xyz/download/movie/${currentItem.id}`;
    window.open(url, '_blank');
}

const processSearch = async (q) => {
    const font = document.getElementById("search-results"); if (!font) return;
    if (q.length < 2) { font.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => `<div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'><img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p></div>`).join('');
    } catch (err) { console.error(err); }
};

function setupSeasonSelector(series) {
    const ss = document.getElementById("season-select"); if (!ss || !series.seasons) return;
    ss.innerHTML = series.seasons.filter(s => s.season_number > 0).map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    try {
        const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
        currentTVState.season = seasonNum; const el = document.getElementById("episode-list");
        if (el && data.episodes) {
          el.className = "modern-grid-container"; 
          el.innerHTML = data.episodes.map(e => `
            <div class="modern-grid-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="modern-thumb-wrapper">
                    <img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="modern-img" loading="lazy">
                    <div class="modern-ep-badge">E${e.episode_number}</div>
                </div>
                <div class="modern-meta-info"><h4 class="modern-ep-title">Episode ${e.episode_number}</h4></div>
            </div>`).join('');
        }
    } catch(e) {}
}

function updateVideoSource() {
    const f = document.getElementById("modal-video-iframe"); if (!f || !currentItem) return;
    let url = `${SERVER_1_URL}/player/${currentTVState.type}/${currentItem.id}`;
    if (currentTVState.type === 'tv') url += `/${currentTVState.season}/${currentTVState.currentEpNum}`;
    url += "?dubLang=tl&dubType=0";
    f.removeAttribute("src"); f.setAttribute("allowfullscreen", "true"); f.setAttribute("playsinline", "true"); f.src = url;
}

function switchServer(num) { activeServer = num; updateServerTabsUI(); updateVideoSource(); }
function updateServerTabsUI() {
    const b1 = document.getElementById("srv1-btn"), b2 = document.getElementById("srv2-btn"); if (!b1 || !b2) return;
    if (activeServer === 1) { b1.classList.add("active"); b2.classList.remove("active"); } 
    else { b2.classList.add("active"); b1.classList.remove("active"); }
}

function playSpecificEpisode(epNum, element) {
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active'); currentTVState.currentEpNum = epNum;
    const pc = document.getElementById("modal-player-container"); if (pc) pc.style.display = "block";
    updateVideoSource(); document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem); enterCinemaMode(); setTimeout(triggerPopUnder, 2500);
}

function startPlayback() {
    const pc = document.getElementById("modal-player-container"); if (pc) pc.style.display = "block";
    updateVideoSource(); document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem); enterCinemaMode(); setTimeout(triggerPopUnder, 2500);
}

function displayCards(data, containerId) {
    const c = document.getElementById(containerId); if (!c || !data) return;
    c.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}" loading="lazy"><div class="card-title">${item.title || item.name}</div>
        </div>`).join('');
}

function displayDramaBoxCards(data, containerId) {
    const c = document.getElementById(containerId); if (!c || !data) return;
    c.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="netflix-item-container" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img class="netflix-item-img" src="${IMG_URL}${item.poster_path}" loading="lazy"><p class="netflix-item-text">${item.title || item.name}</p>
        </div>`).join('');
}

// --- ITO ANG NAWALANG CODE KAYA NAG-ERROR ---
function addToContinueWatching(item) {
    if (!item) return;
    const idx = continueWatching.findIndex(i => i.id === item.id);
    if (idx !== -1) continueWatching.splice(idx, 1);
    continueWatching.unshift({ id: item.id, title: item.title || item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview });
    if (continueWatching.length > 10) continueWatching.pop();
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
    updateContinueUI();
}

function updateContinueUI() {
    const c = document.getElementById("continue-list"), s = document.getElementById("continue-watching-section"); if (!c) return;
    if (continueWatching.length === 0) { if (s) s.style.display = "none"; return; }
    if (s) s.style.display = "block";
    c.innerHTML = continueWatching.map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}" loading="lazy"><div class="card-title">${item.title}</div>
        </div>`).join('');
}

function setupInfiniteScroll() {
    const ov = document.getElementById("search-overlay"); if (!ov) return;
    ov.addEventListener("scroll", async () => {
        if (!currentViewAllUrl || isFetchingViewAll) return;
        if (ov.scrollTop + ov.clientHeight >= ov.scrollHeight - 300) {
            isFetchingViewAll = true; currentViewAllPage++;
            try {
                const res = await fetch(`${currentViewAllUrl}&page=${currentViewAllPage}`).then(r => r.json());
                const font = document.getElementById("search-results");
                if (font && res.results) {
                    font.innerHTML += res.results.filter(i => i.poster_path).map(item => `
                        <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'><img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p></div>`).join('');
                }
            } catch(e) {} finally { isFetchingViewAll = false; }
        }
    });
}

function viewAll(title, endpoint) {
    closeMenuDrawer(); const font = document.getElementById("search-results"), overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return;
    currentViewAllUrl = `${BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
    currentViewAllPage = 1; font.innerHTML = ""; overlay.style.display = "block";
    fetch(`${currentViewAllUrl}&page=1`).then(r => r.json()).then(res => {
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => `<div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'><img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p></div>`).join('');
    }).catch(err => console.error(err));
}

function closeDetails() { const m = document.getElementById("details-modal"), f = document.getElementById("modal-video-iframe"); if (m) m.style.display = "none"; if (f) f.src = ""; document.body.style.overflow = "auto"; }
function openSearch() { const o = document.getElementById("search-overlay"); if (o) o.style.display = "block"; }
function closeSearch() { const o = document.getElementById("search-overlay"), i = document.getElementById("searchInput"), r = document.getElementById("search-results"); if (o) o.style.display = "none"; if (i) i.value = ""; if (r) r.innerHTML = ""; currentViewAllUrl = ""; }
function openMenuDrawer() { const d = document.getElementById("menu-drawer"); if (d) d.style.transform = "translateX(0)"; }
function closeMenuDrawer() { const d = document.getElementById("menu-drawer"); if (d) d.style.transform = "translateX(100%)"; }

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('installBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null; btn.style.display = 'none';
    });
  }
  window.addEventListener('appinstalled', () => { if (btn) btn.style.display = 'none'; deferredPrompt = null; });

  const si = document.getElementById("searchInput"); if (si) si.addEventListener("input", (e) => processSearch(e.target.value));
  const b = document.getElementById("banner"); if (b) { b.addEventListener('touchstart', handleTouchStart, false); b.addEventListener('touchend', handleTouchEnd, false); }

  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".navbar");
    if (nav) { if (window.scrollY > 30) nav.classList.add("scrolled"); else nav.classList.remove("scrolled"); }
  });
});

init();
