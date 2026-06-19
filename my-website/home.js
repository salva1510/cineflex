const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

// --- PLAYERS DOMAINS (Gawin nating malinis na Base URL lang) ---
const SERVER_1_URL = "https://zxcstream.xyz";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let activeServer = 1;

let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;
let lastVisibleDrama = null; // Taga-tanda kung saan huling huminto ang load
let currentRegion = 'all';    // Kasalukuyang rehiyon
const DRAMA_LIMIT = 12;      // Ilang drama ang ilo-load kada batch

// 1. Function kapag nagpalit ng Region sa Dropdown
async function changeRegion(region) {
    currentRegion = region;
    lastVisibleDrama = null; // I-reset ang pagination
    document.getElementById('kdrama-list').innerHTML = '<p style="color: #aaa; padding-left: 10px;">Loading...</p>';
    
    await fetchDramas(true);
}

// 2. Pangunahing Function para kumuha ng Data sa Firebase
async function fetchDramas(isNewRegion = false) {
    const db = firebase.firestore();
    let query = db.collection('dramas'); // Palitan mo ito kung ano ang totoong pangalan ng Collection mo sa Firestore

    // Kung may piniling partikular na rehiyon
    if (currentRegion !== 'all') {
        query = query.where('region', '==', currentRegion);
    }

    // I-order at i-limit ang load para hindi mabigla ang website
    query = query.orderBy('createdAt', 'desc').limit(DRAMA_LIMIT);

    // Kung maglo-load ng susunod na batch (Load More)
    if (!isNewRegion && lastVisibleDrama) {
        query = query.startAfter(lastVisibleDrama);
    }

    try {
        const documentSnapshots = await query.get();
        
        if (isNewRegion) {
            document.getElementById('kdrama-list').innerHTML = ''; // Linisin ang lumang listahan
        }

        if (documentSnapshots.empty) {
            if (isNewRegion) {
                document.getElementById('kdrama-list').innerHTML = '<p style="color: #666; padding-left: 10px;">No dramas found.</p>';
            }
            document.getElementById('load-more-container').style.display = 'none';
            return;
        }

        // Itabi ang huling dokumento para sa susunod na "Load More"
        lastVisibleDrama = documentSnapshots.docs[documentSnapshots.docs.length - 1];

                // I-render ang bawat Drama Card galing Firebase
        documentSnapshots.forEach((doc) => {
            const drama = doc.data();
            
            // Gumawa ng object na kamukha ng istruktura ng TMDB para gumana ang showDetails()
            const itemData = {
                id: doc.id,
                title: drama.title,
                overview: drama.overview || '',
                backdrop_path: drama.backdrop || drama.poster,
                poster_path: drama.poster,
                first_air_date: drama.type === 'tv' ? '2026' : undefined, // flag para sa TV o Movie
                name: drama.type === 'tv' ? drama.title : undefined
            };

            // Dito gagamitin natin ang class="card" para sumunod sa CSS mo, at i-wrap natin sa isang div para sa grid layout
            const dramaCard = `
                <div class="card" onclick='showDetails(${JSON.stringify(itemData).replace(/'/g, "&apos;")})' style="flex: 0 0 calc(33.33% - 10px); max-width: 180px; margin-bottom: 15px;">
                    <img src="${drama.poster}" loading="lazy">
                </div>
            `;
            document.getElementById('kdrama-list').insertAdjacentHTML('beforeend', dramaCard);
        });


        // Ipakita ang button kung mas marami o katumbas ng LIMIT ang nakuha natin
        if (documentSnapshots.docs.length === DRAMA_LIMIT) {
            document.getElementById('load-more-container').style.display = 'block';
        } else {
            document.getElementById('load-more-container').style.display = 'none';
        }

    } catch (error) {
        console.error("Error loading dramas: ", error);
    }
}

// 3. Function kapag pinalo ang "Load More" button
function loadMoreDramas() {
    fetchDramas(false);
}


// --- POP-UNDER ADS INJECTION ---
function triggerPopUnder() {
  const adScript = document.createElement('script');
  adScript.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
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
    const [trd, marvel, anime, fil, kp, kids, pinoyAction] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      // Tinanggal na natin ang TMDB Kdrama fetch dito dahil Firebase na ang gagamitin natin
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`).then(r => r.json())
    ]);

    trendingItems = trd.results;
    if (trendingItems.length > 0) setBanner(trendingItems[0]);
    
    displayCards(trd.results, "trending-today");
    displayCards(marvel.results, "marvel-list");
    displayCards(anime.results, "anime-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kp.results, "kpop-list");
    displayCards(kids.results, "kids-list");
    displayCards(pinoyAction.results, "pinoy-action-list");
    
    // Eto ang magpapagana sa Firebase Drama layout mo pagkabukas ng site
    await fetchDramas(true);
    
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
  currentTVState.type = type;
  activeServer = 1; // reset sa server 1 tuwing bubukas ang modal
  
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

function updateVideoSource() {
    const iframe = document.getElementById("modal-video-iframe");
    if (!iframe || !currentItem) return;

    // Kukunin natin ang tamang IDs mula sa kasalukuyang pinapanood ng user
    const movieId = currentItem.id;
    const season = currentTVState.season;
    const episode = currentTVState.currentEpNum;

    if (currentTVState.type === 'tv') {
        if (activeServer === 1) {
            // Dito natin bubuuin nang tama ang template literal gamit ang backticks (``)
            iframe.src = `${SERVER_1_URL}/player/tv/${movieId}/${season}/${episode}?dubLang=tl&dubType=0`;
        } else {
            // Kung may server 2 ka, siguraduhing tama rin ang format nito
            iframe.src = `${SERVER_2_URL}/player/tv/${movieId}/${season}/${episode}?dubLang=tl&dubType=0`;
        }
    } else {
        if (activeServer === 1) {
            // Para sa Movie, karaniwang tinatanggal ang season at episode numbers sa dulo
            iframe.src = `${SERVER_1_URL}/player/movie/${movieId}?dubLang=tl&dubType=0`;
        } else {
            iframe.src = `${SERVER_2_URL}/player/movie/${movieId}?dubLang=tl&dubType=0`;
        }
    }
}


function switchServer(serverNum) {
    activeServer = serverNum;
    updateServerTabsUI();
    updateVideoSource();
    triggerPopUnder();
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
    element.classList.add('active');
    
    currentTVState.currentEpNum = epNum;
    
    const playerContainer = document.getElementById("modal-player-container");
    if (playerContainer) playerContainer.style.display = "block";
    
    updateVideoSource();
    
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
    enterCinemaMode();
    triggerPopUnder();
}

function startPlayback() {
    const playerContainer = document.getElementById("modal-player-container");
    if (playerContainer) playerContainer.style.display = "block";
    
    updateVideoSource();
    
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
    
    // --- Dito natin inayos ang flow ---
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
    } else if (containerId === "continue-list") {
        resultsDiv.innerHTML = continueWatching.filter(i => i.poster_path).map(item => `
            <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
        return; // Hihinto na dito ang function para sa continue-list
    }

    // Siguraduhing may URL bago mag-fetch
    if (url === "") return;

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

// --- TV REMOTE NAVIGATION SYSTEM ---
// Hindi nito babaguhin ang iyong existing functions.
const focusableElements = 'button, [onclick], .card, .episode-item, .nav-item';
let currentFocusIndex = 0;

function updateFocus() {
    const elements = document.querySelectorAll(focusableElements);
    elements.forEach((el, index) => {
        if (index === currentFocusIndex) {
            el.focus();
            el.style.outline = "2px solid #e50914"; // Visual indicator para alam kung nasaan ang focus
        } else {
            el.style.outline = "none";
        }
    });
}

document.addEventListener('keydown', (e) => {
    const elements = document.querySelectorAll(focusableElements);
    
    switch(e.key) {
        case 'ArrowRight':
            if (currentFocusIndex < elements.length - 1) currentFocusIndex++;
            updateFocus();
            break;
        case 'ArrowLeft':
            if (currentFocusIndex > 0) currentFocusIndex--;
            updateFocus();
            break;
        case 'ArrowDown':
            // Logic para sa pagbaba (maaari mong i-adjust ang step base sa grid mo)
            currentFocusIndex = Math.min(currentFocusIndex + 3, elements.length - 1);
            updateFocus();
            break;
        case 'ArrowUp':
            currentFocusIndex = Math.max(currentFocusIndex - 3, 0);
            updateFocus();
            break;
        case 'Enter':
            const activeElement = document.activeElement;
            if (activeElement) activeElement.click();
            break;
    }
});
// --- NETFLIX-STYLE REMOTE NAVIGATION ---
let selectedIndex = 0;
// Target natin ang lahat ng card/item na clickable
const getFocusables = () => document.querySelectorAll('.card, .episode-item, .nav-item, .search-card');

function moveFocus(direction) {
    const items = getFocusables();
    if (items.length === 0) return;

    // Logic para sa Grid (3 columns base sa CSS mo)
    const cols = 3; 
    let newIndex = selectedIndex;

    switch(direction) {
        case 'ArrowRight': newIndex = Math.min(selectedIndex + 1, items.length - 1); break;
        case 'ArrowLeft':  newIndex = Math.max(selectedIndex - 1, 0); break;
        case 'ArrowDown':  newIndex = Math.min(selectedIndex + cols, items.length - 1); break;
        case 'ArrowUp':    newIndex = Math.max(selectedIndex - cols, 0); break;
        case 'Enter':
            items[selectedIndex].click();
            return;
    }

    selectedIndex = newIndex;
    items[selectedIndex].focus();
    items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('keydown', (e) => {
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault(); // Iwasan ang default scroll ng browser
        moveFocus(e.key);
    }
});


