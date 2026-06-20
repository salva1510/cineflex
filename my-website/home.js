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

let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;

// --- PAGINATION AT STATE VARIABLES PARA SA VIEW ALL ---
let currentViewAllPage = 1;
let currentViewAllUrl = "";
let isFetchingViewAll = false;

// --- POP-UNDER ADS INJECTION ---
function triggerPopUnder() {
  const adScript = document.createElement('script');
  adScript.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
  adScript.type = "text/javascript";
  document.body.appendChild(adScript);
}

async function init() {
  try {
    // Kinuha ang lahat ng kailangang data kasama ang Netflix (PH region providers)
    const [trd, marvel, anime, fil, kd, kp, kids, pinoyAction, dramabox, netflixMovies] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16,16&with_original_language=zh|ko&sort_by=popularity.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`).then(r => r.json())
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
    
    // Renders para sa Netflix Movies at DramaBox
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
  if (trendingItems[currentBannerIndex]) {
    const item = trendingItems[currentBannerIndex];
    const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
    window.location.href = `movie.html?id=${item.id}&type=${type}`;
  } 
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

// --- RENDERING FUNCTION NA NAG-REREDIRECT SA MOVIE.HTML (DULO.TV STYLE) ---
function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  container.innerHTML = data.filter(i => i.poster_path).map(item => {
    const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
    return `
    <div class="card" tabindex="0" onclick="window.location.href='movie.html?id=${item.id}&type=${type}'">
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>`;
  }).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = "card view-all-card";
  viewAllCard.setAttribute("tabindex", "0");
  viewAllCard.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer;"><span>View All</span></div>`;
  viewAllCard.onclick = () => viewAll(containerId);
  container.appendChild(viewAllCard);
}

// --- DRAMABOX VERTICAL CARDS WITH REDIRECT ---
function displayDramaBoxCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  container.innerHTML = data.filter(i => i.poster_path).map((item) => {
    const simulatedEpisodes = 60 + (item.id % 40);
    return `
    <div class="card dramabox-card" tabindex="0" onclick="window.location.href='movie.html?id=${item.id}&type=tv'">
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

const processSearch = async (q) => {
    const font = document.getElementById("search-results");
    if (!font) return;
    if (q.length < 2) { font.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => {
            const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
            return `
            <div class="search-card" tabindex="0" onclick="window.location.href='movie.html?id=${item.id}&type=${type}'">
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`;
        }).join('');
    } catch (err) { console.error(err); }
};

function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }
function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("searchInput").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; currentViewAllUrl = ""; }

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if(continueWatching.length > 0 && section) {
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

// --- VIEW ALL REDIRECT SYSTEM ---
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
    } else if (containerId === "netflix-movies-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`;
    } else if (containerId === "dramabox-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16,16&with_original_language=zh|ko&sort_by=popularity.desc`;
    } else if (containerId === "continue-list") {
        font.innerHTML = continueWatching.filter(i => i.poster_path).map(item => {
            const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
            return `
            <div class="search-card" tabindex="0" onclick="window.location.href='movie.html?id=${item.id}&type=${type}'">
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`;
        }).join('');
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

        font.innerHTML = allItems.filter(i => i.poster_path).map(item => {
            const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
            return `
            <div class="search-card" tabindex="0" onclick="window.location.href='movie.html?id=${item.id}&type=${type}'">
                <img src="${IMG_URL}${item.poster_path}">
                <p>${item.title || item.name}</p>
            </div>`;
        }).join('');
            
        selectedIndex = 0; 
    } catch (err) {
        console.error("View All Error:", err);
        font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Failed to load items.</div>";
    }
}

// --- AUTOMATIC SCROLL LOADING ---
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
                    const extraHtml = res.results.filter(i => i.poster_path).map(item => {
                        const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
                        return `
                        <div class="search-card" tabindex="0" onclick="window.location.href='movie.html?id=${item.id}&type=${type}'">
                            <img src="${IMG_URL}${item.poster_path}">
                            <p>${item.title || item.name}</p>
                        </div>`;
                    }).join('');
                    font.insertAdjacentHTML('beforeend', extraHtml);
                }
            } catch (error) {
                console.error("Error loading next page:", error);
            } finally {
                isFetchingViewAll = false;
            }
        }
    });
}

init();

// --- REMOTE NAVIGATION SYSTEM ---
let selectedIndex = 0;
const getFocusables = () => document.querySelectorAll('button, [onclick], .card, .nav-item, .search-card');

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
