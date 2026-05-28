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

// --- ADD-ONLY: POP-UNDER ADS INJECTION ---
function triggerPopUnder() {
  const adScript = document.createElement('script');
  adScript.src = "https://pl28389725.profitablecpmratenetwork.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
  adScript.type = "text/javascript";
  document.body.appendChild(adScript);
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
    // Idinagdag ang fetch para sa Marvel Studios (with_companies=420)
    const [trd, marvel, anime, fil, kd, kp, kids] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json())
    ]);

    trendingItems = trd.results;
    if (trendingItems.length > 0) setBanner(trendingItems[0]);
    
    // I-display ang cards sa mga lalagyan
    displayCards(trd.results, "trending-today");
    displayCards(marvel.results, "marvel-list");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    displayCards(kids.results, "kids-list");
    
    updateContinueUI();
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
      recContainer.innerHTML = recs.results.slice(0, 8).map(r => `
        <div class="rec-item" onclick='showDetails(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
            <div class="rec-thumb-container"><img src="${IMG_URL}${r.backdrop_path || r.poster_path}" class="rec-thumb"></div>
            <div class="rec-info"><h4>${r.title || r.name}</h4><p>${r.overview || 'Watch now.'}</p></div>
        </div>`).join('');
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

const processSearch = async (q) => {
    const font = document.getElementById("search-results");
    if (!font) return;
    if (q.length < 2) { font.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => `
            <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
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
    triggerPopUnder();
}

function startPlayback() {
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    if (playerContainer) playerContainer.style.display = "block";
    
    iframe.src = `${PLAYER_BASE_URL}/embed/movie/${currentItem.id}`;
    
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
    enterCinemaMode();
    triggerPopUnder();
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>`).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = "card view-all-card";
  viewAllCard.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer;"><span>View All</span></div>`;
  viewAllCard.onclick = () => viewAll(containerId);
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

async function viewAll(containerId) {
    const resultsDiv = document.getElementById("search-results");
    const overlay = document.getElementById("search-overlay");
    if (!resultsDiv || !overlay) return;

    resultsDiv.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Loading full list...</div>";
    overlay.style.display = "block";

    let url = "";
    
    if (containerId === "trending-today") {
        url = `${BASE_URL}/trending/all/day?api_key=${API_KEY}`;
    } else if (containerId === "marvel-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`;
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
    } else if (containerId === "continue-list") {
        resultsDiv.innerHTML = continueWatching.filter(i => i.poster_path).map(item => `
            <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
        return;
    }

    try {
        const [page1, page2] = await Promise.all([
            fetch(`${url}&page=1`).then(r => r.json()),
            fetch(`${url}&page=2`).then(r => r.json())
        ]);
        
        const allItems = [...(page1.results || []), ...(page2.results || [])];

        resultsDiv.innerHTML = allItems.filter(i => i.poster_path).map(item => `
            <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}">
                <p>${item.title || item.name}</p>
            </div>`).join('');
            
    } catch (err) {
        console.error("View All Fetch Error:", err);
        resultsDiv.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Failed to load items. Please try again.</div>";
    }
}

init();
