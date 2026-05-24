const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

// --- UPDATED PLAYER DOMAIN ---
const PLAYER_BASE_URL = "https://peachify.top";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1 };
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;
let isDragging = false; // Flag para sa desktop mouse drag

async function enterCinemaMode() {
  const playerContainer = document.getElementById("modal-player-container");
  if (!playerContainer) return;
  try {
    if (playerContainer.requestFullscreen) {
      await playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      await playerContainer.webkitRequestFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock failed:", e));
    }
  } catch (err) {
    console.log("Cinema mode error:", err);
  }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
});

async function init() {
  try {
    const [trd, anime, fil, kd, kp, kids] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json())
    ]);

    trendingItems = trd.results;
    if (trendingItems.length > 0) setBanner(trendingItems[0]);
    
    displayCards(trd.results, "trending-today");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    displayCards(kids.results, "kids-list");
    
    updateContinueUI();
    enableMouseDragScroll(); // Pinapagana ang pag-drag sa mga section gamit ang mouse sa PC
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

// --- NAVIGATION FUNCTIONS (SHARED LOGIC) ---
function handleSwipeDirection() {
    const threshold = 40;
    if (touchStartX - touchEndX > threshold) changeBanner(1);
    if (touchEndX - touchStartX > threshold) changeBanner(-1);
}

// --- MOBILE TOUCH EVENTS ---
function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) { 
    touchEndX = e.changedTouches[0].screenX; 
    handleSwipeDirection();
}

// --- DESKTOP MOUSE EVENTS (FOR BANNER DRAG) ---
function handleMouseDown(e) {
    isDragging = true;
    touchStartX = e.screenX;
    e.preventDefault(); 
}

function handleMouseMove(e) {
    if (!isDragging) return;
    touchEndX = e.screenX;
}

function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    handleSwipeDirection();
}

function handleMouseLeave() {
    if (!isDragging) return;
    isDragging = false;
    handleSwipeDirection();
}

function changeBanner(dir) {
    currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}

async function showDetails(item) {
  currentItem = item;
  const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
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
      recContainer.innerHTML = recs.results.slice(0, 8).map(r => {
        const secureData = btoa(encodeURIComponent(JSON.stringify(r)));
        return `
        <div class="rec-item" onclick="showDetailsFromB64('${secureData}')">
            <div class="rec-thumb-container"><img src="${IMG_URL}${r.backdrop_path || r.poster_path}" class="rec-thumb"></div>
            <div class="rec-info"><h4>${r.title || r.name}</h4><p>${r.overview || 'Watch now.'}</p></div>
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

    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      document.querySelector('.modal-content').scrollTo({ top: 0 });
    }
  } catch (err) { console.error("Details Error:", err); }
}

// Ligtas na paraan para magpasa ng movie objects sa onclick attributes nang hindi nasisira ang HTML tags
function showDetailsFromB64(base64Data) {
    const decodedItem = JSON.parse(decodeURIComponent(atob(base64Data)));
    showDetails(decodedItem);
}

const processSearch = async (q) => {
    const resultsDiv = document.getElementById("search-results");
    if (!resultsDiv) return;
    if (q.length < 2) { resultsDiv.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        resultsDiv.innerHTML = res.results.filter(i => i.poster_path).map(item => {
            const secureData = btoa(encodeURIComponent(JSON.stringify(item)));
            return `
            <div class="search-card" onclick="showDetailsFromB64('${secureData}')">
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`;
        }).join('');
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
      epList.innerHTML = data.episodes.map(e => `
            <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="ep-thumb-container"><img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="ep-thumb"></div>
                <div class="ep-info"><h4>${e.episode_number}. ${e.name}</h4><p>${e.overview || 'Watch now.'}</p></div>
            </div>`).join('');
    }
}

function playSpecificEpisode(epNum, element) {
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    if (playerContainer) playerContainer.style.display = "block";
    
    iframe.src = `${PLAYER_BASE_URL}/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`;
    
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
    enterCinemaMode();
}

function startPlayback() {
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    if (playerContainer) playerContainer.style.display = "block";
    
    iframe.src = `${PLAYER_BASE_URL}/embed/movie/${currentItem.id}`;
    
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
    enterCinemaMode();
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  container.innerHTML = data.filter(i => i.poster_path).map(item => {
    const secureData = btoa(encodeURIComponent(JSON.stringify(item)));
    return `
    <div class="card" onclick="showDetailsFromB64('${secureData}')">
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>`;
  }).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = "card view-all-card";
  viewAllCard.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer;"><span>View All</span></div>`;
  
  // Pinapasa nang tama ang buong listahan ng pelikula sa viewAll
  const listData = btoa(encodeURIComponent(JSON.stringify(data)));
  viewAllCard.setAttribute("onclick", `viewAllFromB64('${listData}')`);
  container.appendChild(viewAllCard);
}

function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }
function closeModal() { 
  document.getElementById("details-modal").style.display = "none"; 
  document.getElementById("modal-video-iframe").src = ""; 
  document.body.style.overflow = "auto"; 
  if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
}
function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("searchInput").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

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

// Function para sa Mouse Swipe/Scroll ng Rows sa Desktop PC
function enableMouseDragScroll() {
    const scrollers = document.querySelectorAll('.scroller');
    scrollers.forEach(scroller => {
        let isDown = false;
        let startX;
        let scrollLeft;

        scroller.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - scroller.offsetLeft;
            scrollLeft = scroller.scrollLeft;
        });
        scroller.addEventListener('mouseleave', () => { isDown = false; });
        scroller.addEventListener('mouseup', () => { isDown = false; });
        scroller.addEventListener('mousemove', (e) => {
            if(!isDown) return;
            e.preventDefault();
            const x = e.pageX - scroller.offsetLeft;
            const walk = (x - startX) * 2; 
            scroller.scrollLeft = scrollLeft - walk;
        });
    });
}

// Gagamitin ng View All Button para ma-decode ang buong listahan ng may kumpletong detalye
function viewAllFromB64(base64Data) {
    const items = JSON.parse(decodeURIComponent(atob(base64Data)));
    viewAll(items);
}

function viewAll(items) {
    const resultsDiv = document.getElementById("search-results"); 
    const overlay = document.getElementById("search-overlay");
    
    // Nilalagyan ng tamang click event ang bawat card sa View All para lumabas ang full details modal
    resultsDiv.innerHTML = items.filter(i => i.poster_path).map(item => {
        const secureData = btoa(encodeURIComponent(JSON.stringify(item)));
        return `
        <div class="search-card" onclick="showDetailsFromB64('${secureData}'); closeSearch();">
            <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
        </div>`;
    }).join('');
    
    overlay.style.display = "block";
}

init();
