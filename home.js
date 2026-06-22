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

// --- POP-UNDER ADS INJECTION ---
function triggerPopUnder() {
  try {
    const adScript = document.createElement('script');
    adScript.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
    adScript.type = "text/javascript";
    document.body.appendChild(adScript);
  } catch(e) {
    console.log("Ad script blocked or failed:", e);
  }
}

async function enterCinemaMode() {
  const playerContainer = document.getElementById("modal-player-container");
  if (!playerContainer) return;
  try {
    if (playerContainer.requestFullscreen) {
      await playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      await playerContainer.webkitRequestFullscreen();
    }
    
    // Ligtas na orientation lock para sa mga lumang iOS
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
      await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock failed:", e));
    }
  } catch (err) {
    console.log("Cinema mode error:", err);
  }
}

document.addEventListener('fullscreenchange', handleFullscreenExit);
document.addEventListener('webkitfullscreenchange', handleFullscreenExit);

function handleFullscreenExit() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.unlock === 'function') {
      screen.orientation.unlock();
    }
  }
}

async function init() {
  try {
    const [trd, marvel, anime, fil, kd, kp, kids, pinoyAction, dramabox, netflixMovies, cocomelonData] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16,16&with_original_language=zh|ko&sort_by=popularity.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16,10751&keywords=210024|310931|234327&sort_by=popularity.desc`).then(r => r.json())
    ]);

    trendingItems = trd.results;
    if (trendingItems.length > 0) setBanner(trendingItems[0]);
    
    displayCards(trd.results, "trending-today");
    displayCards(marvel.results, "marvel-list");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    displayCards(kids.results, "kids-list");
    displayCards(pinoyAction.results, "pinoy-action-list");
    displayCards(cocomelonData.results || [], "cocomelon-list");
    displayCards(netflixMovies.results, "netflix-movies-list");
    displayDramaBoxCards(dramabox.results || [], "dramabox-list");
    
    updateContinueUI();
    setupInfiniteScroll(); 
  } catch (err) { 
    console.error("Init Error:", err); 
  }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  const bTitle = document.getElementById("banner-title");
  const bDesc = document.getElementById("banner-desc");
  if (!banner || !item) return;
  banner.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  if (bTitle) bTitle.innerText = item.title || item.name;
  if (bDesc) bDesc.innerText = item.overview ? item.overview.slice(0, 120) + "..." : "";
}

function showBannerDetails() { 
  if (trendingItems[currentBannerIndex]) showDetails(trendingItems[currentBannerIndex]); 
}

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
  currentTVState.type = type;
  activeServer = 1; 
  
  updateServerTabsUI();

  const modal = document.getElementById("details-modal");
  const playerContainer = document.getElementById("modal-player-container");
  const iframe = document.getElementById("modal-video-iframe");

  if (playerContainer) playerContainer.style.display = "none";
  if (iframe) iframe.src = "";
  closeSearch();

  try {
    const [details, credits, recs] = await Promise.all([
      fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
    ]);

    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview || "";
    document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    
    const recContainer = document.getElementById("modal-recommendations");
    if (recContainer) {
      recContainer.className = "modern-grid-container";
      recContainer.innerHTML = recs.results.slice(0, 8).map(r => {
        const releaseYear = r.release_date || r.first_air_date ? new Date(r.release_date || r.first_air_date).getFullYear() : "2026";
        return `
        <div class="modern-grid-item" tabindex="0" onclick='showDetails(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
            <div class="modern-thumb-wrapper">
                <img src="${IMG_URL}${r.backdrop_path || r.poster_path}" class="modern-img" loading="lazy">
            </div>
            <div class="modern-meta-info">
                <h4 class="modern-ep-title">${r.title || r.name}</h4>
                <p class="modern-sub-text">${releaseYear} &nbsp;•&nbsp; Recommended</p>
            </div>
        </div>`;
      }).join('');
    }

    const castContainer = document.getElementById("modal-cast");
    if (castContainer) {
      castContainer.innerHTML = credits.cast.slice(0, 8).map(c => `
        <div class="cast-card">
          <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100x150'}"><p>${c.name}</p>
        </div>`).join('');
    }

    const epSelector = document.getElementById("episode-selector");
    const movieBtn = document.getElementById("movie-play-action");

    if (type === 'tv') {
        if (epSelector) epSelector.style.display = "block";
        if (movieBtn) movieBtn.style.display = "none";
        setupSeasonSelector(details);
    } else {
        if (epSelector) epSelector.style.display = "none";
        if (movieBtn) movieBtn.style.display = "block";
    }

    const wlBtn = document.getElementById("modal-watchlist-btn");
    if (wlBtn) {
        const isAdded = watchlist.some(i => i.id === item.id);
        wlBtn.innerHTML = isAdded ? `<i class="fa-solid fa-check" style="color: #2ecc71;"></i> In My List` : `<i class="fa-solid fa-plus"></i> My List`;
    }

    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      document.querySelector('.modal-content').scrollTo({ top: 0 });
    }
  } catch (err) { console.error("Details Error:", err); }
}

// --- TRAILER SYSTEM ---
async function playTrailer() {
    if (!currentItem) return;
    const type = currentTVState.type;
    const id = currentItem.id;
    const iframe = document.getElementById("modal-video-iframe");
    const playerContainer = document.getElementById("modal-player-container");

    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`).then(r => r.json());
        const trailerItem = res.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || res.results.find(v => v.site === 'YouTube');

        if (trailerItem && trailerItem.key) {
            if (playerContainer) playerContainer.style.display = "block";
            if (iframe) iframe.src = `https://www.youtube.com/embed/${trailerItem.key}?autoplay=1&rel=0&modestbranding=1`;
            document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(triggerPopUnder, 2000); // Mas mahabang delay para iwas block sa iOS
        } else {
            alert("Paumanhin, walang available na trailer.");
        }
    } catch (err) { console.error(err); }
}

// --- WATCHLIST SYSTEM ---
function toggleWatchlist() {
    if (!currentItem) return;
    const index = watchlist.findIndex(i => i.id === currentItem.id);
    const wlBtn = document.getElementById("modal-watchlist-btn");

    if (index === -1) {
        watchlist.unshift(currentItem);
        if (wlBtn) wlBtn.innerHTML = `<i class="fa-solid fa-check" style="color: #2ecc71;"></i> In My List`;
    } else {
        watchlist.splice(index, 1);
        if (wlBtn) wlBtn.innerHTML = `<i class="fa-solid fa-plus"></i> My List`;
    }
    localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
}

function viewWatchlist() {
    closeMenuDrawer();
    const font = document.getElementById("search-results");
    const overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return;

    currentViewAllUrl = ""; 
    font.innerHTML = "";
    overlay.style.display = "block";

    if (watchlist.length === 0) {
        font.innerHTML = `<div style="color:#aaa; text-align:center; width:100%; padding:40px; font-size:1rem;">Walang laman ang iyong My List.</div>`;
        return;
    }

    font.innerHTML = watchlist.filter(i => i.poster_path).map(item => `
        <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
            <img src="${IMG_URL}${item.poster_path}">
            <p>${item.title || item.name}</p>
        </div>`).join('');
}

// --- DOWNLOAD SYSTEM ---
function triggerDownload() {
    if (!currentItem) return;
    const movieId = currentItem.id;
    const type = currentTVState.type; 
    const season = currentTVState.season;
    const episode = currentTVState.currentEpNum;
    let downloadUrl = (type === 'tv') ? `https://zxcstream.xyz/download/tv/${movieId}/${season}/${episode}` : `https://zxcstream.xyz/download/movie/${movieId}`;

    window.open(downloadUrl, '_blank');
}

const processSearch = async (q) => {
    const font = document.getElementById("search-results");
    if (!font) return;
    if (q.length < 2) { font.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
    } catch (err) { console.error(err); }
};

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    if (!seasonSelect) return;
    seasonSelect.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    currentTVState.season = seasonNum;
    const epList = document.getElementById("episode-list");
    
    if (epList) {
      epList.className = "modern-grid-container"; 
      epList.innerHTML = data.episodes.map(e => {
            const airDate = e.air_date ? new Date(e.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Jun 5, 2026";
            const runtime = e.runtime ? `${e.runtime}m` : `${50 + (e.episode_number % 15)}m`;

            return `
            <div class="modern-grid-item" tabindex="0" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="modern-thumb-wrapper">
                    <img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="modern-img" loading="lazy">
                    <div class="modern-ep-badge">E${e.episode_number}</div>
                </div>
                <div class="modern-meta-info">
                    <h4 class="modern-ep-title">Episode ${e.episode_number}</h4>
                    <p class="modern-sub-text">${airDate} &nbsp;•&nbsp; ${runtime}</p>
                </div>
            </div>`;
      }).join('');
    }
}

// --- PINALAKAS NA VIDEO SOURCE ENGINE (INLINE IFRAME ONLY) ---
function updateVideoSource() {
    const iframe = document.getElementById("modal-video-iframe");
    if (!iframe || !currentItem) return;

    const movieId = currentItem.id;
    const season = currentTVState.season;
    const episode = currentTVState.currentEpNum;
    let finalUrl = "";

    if (currentTVState.type === 'tv') {
        let baseUrl = (activeServer === 1) ? SERVER_1_URL : SERVER_2_URL;
        finalUrl = `${baseUrl}/player/tv/${movieId}/${season}/${episode}?dubLang=tl&dubType=0`;
    } else {
        let baseUrl = (activeServer === 1) ? SERVER_1_URL : SERVER_2_URL;
        finalUrl = `${baseUrl}/player/movie/${movieId}?dubLang=tl&dubType=0`;
    }

    // IPAD AIR 2 FIX: Pinupwersa natin ang iframe na mag-load ng inline media. 
    // Inaalis ang window.open para maiwasan ang maling pag-redirect sa Download link.
    iframe.removeAttribute("src"); 
    
    // Dagdagan ng sandbox at ios attributes kung kinakailangan para hindi makawala ang player patungong download page
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("webkitallowfullscreen", "true");
    iframe.setAttribute("playsinline", "true");
    
    iframe.src = finalUrl;
}

function switchServer(serverNum) {
    activeServer = serverNum;
    updateServerTabsUI();
    updateVideoSource();
}

function updateServerTabsUI() {
    const btn1 = document.getElementById("srv1-btn");
    const btn2 = document.getElementById("srv2-btn");
    if (!btn1 || !btn2) return;
    
    if (activeServer === 1) {
        btn1.classList.add("active");
        btn2.classList.remove("active");
    } else {
        btn2.classList.add("active");
        btn1.classList.remove("active");
    }
}

function playSpecificEpisode(epNum, element) {
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');
    currentTVState.currentEpNum = epNum;
    
    const playerContainer = document.getElementById("modal-player-container");
    if (playerContainer) playerContainer.style.display = "block";
    
    updateVideoSource();
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
    enterCinemaMode();
    
    // IPAD AD PROTECTION: Sobrang habang delay (2.5 segundo) bago i-load ang ads para siguradong nakarga na ang video stream at hindi ito maharang o ma-redirect
    setTimeout(triggerPopUnder, 2500);
}

function startPlayback() {
    const playerContainer = document.getElementById("modal-player-container");
    if (playerContainer) playerContainer.style.display = "block";
    
    updateVideoSource();
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
    enterCinemaMode();
    
    // IPAD AD PROTECTION: Malaking delay bago mag-popup para iwas redirect sa download
    setTimeout(triggerPopUnder, 2500);
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  const isNetflix = (containerId === "netflix-movies-list");

  container.innerHTML = data.filter(i => i.poster_path).map((item, index) => {
    let trendingBadge = "";
    if (isNetflix && index < 10) {
        trendingBadge = `<div class="netflix-num-badge">${index + 1}</div>`;
    }

    return `
    <div class="${isNetflix ? 'netflix-item-container' : 'card'}" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        ${trendingBadge}
        <img src="${IMG_URL}${item.poster_path}" loading="lazy" class="${isNetflix ? 'netflix-num-poster' : ''}">
    </div>`;
  }).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = isNetflix ? "netflix-item-container view-all-card" : "card view-all-card";
  viewAllCard.setAttribute("tabindex", "0");
  viewAllCard.innerHTML = `<div style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer; border-radius:6px;"><span>View All</span></div>`;
  viewAllCard.onclick = () => viewAll(containerId);
  container.appendChild(viewAllCard);
}

function displayDramaBoxCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  container.innerHTML = data.filter(i => i.poster_path).map((item) => {
    const simulatedEpisodes = 60 + (item.id % 40);
    return `
    <div class="card dramabox-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
        <div class="card-badges">
            <span class="badge-episodes">Ep. ${simulatedEpisodes}</span>
        </div>
        <div class="card-info-overlay">
            <p class="card-title">${item.title || item.name}</p>
        </div>
    </div>`;
  }).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = "card dramabox-card view-all-card";
  viewAllCard.setAttribute("tabindex", "0");
  viewAllCard.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer; border-radius: 8px;"><span>View All</span></div>`;
  viewAllCard.onclick = () => viewAll(containerId);
  container.appendChild(viewAllCard);
}

function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }
function closeModal() { 
  document.getElementById("details-modal").style.display = "none"; 
  document.getElementById("modal-video-iframe").src = ""; 
  document.body.style.overflow = "auto"; 
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.unlock === 'function') {
     screen.orientation.unlock();
  }
}
function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("searchInput").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; currentViewAllUrl = ""; }

function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueUI();
}

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if(continueWatching.length > 0 && section) {
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

async function viewAll(containerId) {
    const font = document.getElementById("search-results");
    const overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return;

    currentViewAllPage = 1;
    isFetchingViewAll = false;
    font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Loading list...</div>";
    overlay.style.display = "block";

    let url = "";
    
    if (containerId === "trending-today") {
        url = `${BASE_URL}/trending/all/day?api_key=${API_KEY}`;
    } else if (containerId === "marvel-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`;
    } else if (containerId === "pinoy-action-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`;
    } else if (containerId === "anime-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`;
    } else if (containerId === "filipino-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`;
    } else if (containerId === "kdrama-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`;
    } else if (containerId === "kpop-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`;
    } else if (containerId === "kids-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`;
    } else if (containerId === "cocomelon-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16,10751&keywords=210024|310931|234327&sort_by=popularity.desc`;
    } else if (containerId === "netflix-movies-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`;
    } else if (containerId === "dramabox-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16,16&with_original_language=zh|ko&sort_by=popularity.desc`;
    } else if (containerId === "continue-list") {
        font.innerHTML = continueWatching.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
        return;
    }

    if (url === "") return;
    currentViewAllUrl = url;

    try {
        const [page1, page2] = await Promise.all([
            fetch(`${url}&page=1`).then(r => r.json()),
            fetch(`${url}&page=2`).then(r => r.json())
        ]);
        
        const allItems = [...(page1.results || []), ...(page2.results || [])];
        currentViewAllPage = 2;

        font.innerHTML = allItems.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}">
                <p>${item.title || item.name}</p>
            </div>`).join('');
            
        selectedIndex = 0; 
    } catch (err) {
        console.error(err);
        font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Failed to load items.</div>";
    }
}

function setupInfiniteScroll() {
    const overlay = document.getElementById("search-overlay");
    if (!overlay) return;

    overlay.addEventListener("scroll", async function() {
        if (currentViewAllUrl === "" || isFetchingViewAll) return;
        const font = document.getElementById("search-results");
        
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 300) {
            isFetchingViewAll = true;
            currentViewAllPage++;
            try {
                const res = await fetch(`${currentViewAllUrl}&page=${currentViewAllPage}`).then(r => r.json());
                if (res.results && res.results.length > 0) {
                    const extraHtml = res.results.filter(i => i.poster_path).map(item => `
                        <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                            <img src="${IMG_URL}${item.poster_path}">
                            <p>${item.title || item.name}</p>
                        </div>`).join('');
                    font.insertAdjacentHTML('beforeend', extraHtml);
                }
            } catch (error) { console.error(error); } finally { isFetchingViewAll = false; }
        }
    });
}

init();

// --- REMOTE NAVIGATION SYSTEM ---
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

document.addEventListener('keydown', (e) => {
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault(); 
        moveFocus(e.key);
    }
});
