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

// --- PWA REGISTRATION ---
let deferredPrompt;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered successfully!', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// ========================================================
// ===                  AUTH SYSTEM                    ===
// ========================================================

function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem("cineflex_logged_in");
    const loginScreen = document.getElementById("login-screen");
    
    if (isLoggedIn === "true") {
        if (loginScreen) loginScreen.style.display = "none";
    } else {
        if (loginScreen) loginScreen.style.display = "flex";
    }
}

function toggleAuthMode(isSignUp) {
    if (isSignUp) {
        document.getElementById("signin-box").style.display = "none";
        document.getElementById("signup-box").style.display = "block";
    } else {
        document.getElementById("signin-box").style.display = "block";
        document.getElementById("signup-box").style.display = "none";
    }
}

function handleLogin() {
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value.trim();

    if (!email || !pass) {
        alert("Pakisagutan ang lahat ng kahon.");
        return;
    }

    // Kunin ang mga rehistradong users mula sa localStorage
    let registeredUsers = JSON.parse(localStorage.getItem("cineflex_users")) || [];
    
    // Default account para sa testing
    if (email === "admin@cineflex.com" && pass === "123456") {
        localStorage.setItem("cineflex_logged_in", "true");
        localStorage.setItem("cineflex_user_name", "Admin");
        checkAuthStatus();
        return;
    }

    // Suriin kung tugma sa database
    const user = registeredUsers.find(u => u.email === email && u.password === pass);
    
    if (user) {
        localStorage.setItem("cineflex_logged_in", "true");
        localStorage.setItem("cineflex_user_name", user.name);
        checkAuthStatus();
    } else {
        alert("Maling email o password! Subukan uli o mag-sign up.");
    }
}

function handleRegister() {
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const pass = document.getElementById("reg-password").value.trim();

    if (!name || !email || !pass) {
        alert("Pakisagutan ang lahat ng fields para mag-register.");
        return;
    }

    let registeredUsers = JSON.parse(localStorage.getItem("cineflex_users")) || [];
    
    // Suriin kung may kaparehong email na
    if (registeredUsers.some(u => u.email === email)) {
        alert("Ang email na ito ay may rehistradong account na.");
        return;
    }

    // I-save ang bagong user
    registeredUsers.push({ name: name, email: email, password: pass });
    localStorage.setItem("cineflex_users", JSON.stringify(registeredUsers));
    
    // Auto login matapos mag-register
    localStorage.setItem("cineflex_logged_in", "true");
    localStorage.setItem("cineflex_user_name", name);
    
    alert("Rehistrasyon Tagumpay! Welcome sa Cineflex, " + name);
    checkAuthStatus();
}

function handleLogout() {
    localStorage.removeItem("cineflex_logged_in");
    localStorage.removeItem("cineflex_user_name");
    window.location.reload();
}

// ========================================================
// ===              MAIN APP LOGIC ENGINE              ===
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Patakbuhin muna ang Auth check bago mag-load ng data
  checkAuthStatus();

  loadHomepageData();
  setupScrollNavbar();
  setupInfiniteScrollForViewAll();

  // Swiping controls para sa mobile hero banner
  const banner = document.getElementById("hero-banner");
  if(banner) {
    banner.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
    banner.addEventListener('touchend', e => { 
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) changeBanner(1);
        if (touchEndX - touchStartX > 50) changeBanner(-1);
    });
  }
});

async function loadHomepageData() {
  await fetchBannerMovies();
  updateContinueWatchingUI();
  updateWatchlistUI();
  
  fetchRow(`${BASE_URL}/trending/movie/day?api_key=${API_KEY}`, "trending-movies", "movie");
  fetchRow(`${BASE_URL}/trending/tv/day?api_key=${API_KEY}`, "trending-tv", "tv");
  fetchRow(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`, "action-movies", "movie");
  fetchRow(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=35`, "comedy-movies", "movie");
  fetchRow(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=27,53`, "horror-movies", "movie");
  fetchRow(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16&with_keywords=210024|287501`, "anime-movies", "movie");
}

async function fetchBannerMovies() {
  try {
    const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
    const data = await res.getJson ? await res.getJson() : await res.json();
    trendingItems = data.results.filter(item => item.backdrop_path);
    if(trendingItems.length > 0) displayBanner(0);
  } catch(e) { console.error(e); }
}

function displayBanner(index) {
  if(trendingItems.length === 0) return;
  currentBannerIndex = index;
  const item = trendingItems[index];
  document.getElementById("banner-img").style.backgroundImage = `url('https://image.tmdb.org/t/p/original${item.backdrop_path}')`;
  document.getElementById("banner-title").innerText = item.title || item.name || "Untitled";
  document.getElementById("banner-desc").innerText = item.overview ? (item.overview.substring(0, 140) + "...") : "";
}

function changeBanner(dir) {
  let next = currentBannerIndex + dir;
  if(next >= trendingItems.length) next = 0;
  if(next < 0) next = trendingItems.length - 1;
  displayBanner(next);
}

function openHeroDetails() {
  if (trendingItems[currentBannerIndex]) openModal(trendingItems[currentBannerIndex], trendingItems[currentBannerIndex].media_type || 'movie');
}

async function fetchRow(url, elementId, type) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById(elementId);
    if(!container) return;
    container.innerHTML = "";
    
    data.results.forEach(item => {
      if(!item.poster_path) return;
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("onclick", `openModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${type}')`);
      card.innerHTML = `
        <img src="${IMG_URL}${item.poster_path}" alt="poster">
        <div class="card-info">
          <h3>${item.title || item.name}</h3>
          <p>${(item.release_date || item.first_air_date || '').substring(0,4)} • <i class="fa-solid fa-star" style="color:#ffcc00; font-size:0.75rem;"></i> ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</p>
        </div>
      `;
      container.appendChild(card);
    });
  } catch(e) { console.error(elementId, e); }
}

function openModal(item, type) {
  currentItem = item;
  currentTVState.type = type;
  currentTVState.season = 1;
  currentTVState.episode = 1;
  currentTVState.currentEpNum = 1;

  document.getElementById("detail-modal").style.display = "flex";
  document.body.style.overflow = "hidden";

  document.getElementById("modal-bg").style.backgroundImage = `url('https://image.tmdb.org/t/p/original${item.backdrop_path || item.poster_path}')`;
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-year").innerText = (item.release_date || item.first_air_date || '').substring(0, 4) || 'N/A';
  document.getElementById("modal-rating").innerHTML = `<i class="fa-solid fa-star" style="color:#ffcc00;"></i> ${item.vote_average ? item.vote_average.toFixed(1) : '0.0'}`;
  document.getElementById("modal-type-badge").innerText = type.toUpperCase();
  document.getElementById("modal-overview").innerText = item.overview || "No overview available.";

  document.getElementById("player-section").style.display = "none";
  document.getElementById("video-player").src = "";

  const watchBtn = document.getElementById("modal-watchlist-btn");
  const isInWatchlist = watchlist.some(x => x.id === item.id);
  watchBtn.innerHTML = isInWatchlist ? `<i class="fa-solid fa-check" style="color:#e50914;"></i>` : `<i class="fa-solid fa-plus"></i>`;

  if (type === 'tv') {
    document.getElementById("tv-episodes-wrapper").style.display = "block";
    fetchSeasonsList(item.id);
  } else {
    document.getElementById("tv-episodes-wrapper").style.display = "none";
  }

  fetchRecommendations(item.id, type);
}

function closeModal() {
  document.getElementById("detail-modal").style.display = "none";
  document.body.style.overflow = "auto";
  document.getElementById("video-player").src = "";
}

function playCurrentItem() {
  document.getElementById("player-section").style.display = "block";
  activeServer = 1;
  updatePlayerFrame();
  addToContinueWatching();
}

function updatePlayerFrame() {
  const player = document.getElementById("video-player");
  const statusTxt = document.getElementById("playing-title-status");
  const srv1 = document.getElementById("btn-srv-1");
  const srv2 = document.getElementById("btn-srv-2");

  if(activeServer === 1) {
    srv1.style.background = "#e50914"; srv1.style.color = "#fff";
    srv2.style.background = "#222"; srv2.style.color = "#ccc";
  } else {
    srv2.style.background = "#e50914"; srv2.style.color = "#fff";
    srv1.style.background = "#222"; srv1.style.color = "#ccc";
  }

  const baseSrv = (activeServer === 1) ? SERVER_1_URL : SERVER_2_URL;

  if (currentTVState.type === 'movie') {
     player.src = `${baseSrv}/movie/${currentItem.id}`;
     statusTxt.innerText = `NOW STREAMING: MOVIE`;
  } else {
     player.src = `${baseSrv}/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.episode}`;
     statusTxt.innerText = `STREAMING: S${currentTVState.season} E${currentTVState.episode} (${currentTVState.currentEpNum})`;
  }
}

function switchServer(srvId) {
  activeServer = srvId;
  updatePlayerFrame();
}

async function fetchSeasonsList(tvId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
    const data = await res.json();
    const select = document.getElementById("season-select");
    select.innerHTML = "";
    if(data.seasons) {
       data.seasons.forEach(s => {
          if (s.season_number === 0) return; // Laktawan ang specials
          const opt = document.createElement("option");
          opt.value = s.season_number;
          opt.innerText = s.name || `Season ${s.season_number}`;
          select.appendChild(opt);
       });
       if(data.seasons.length > 0) loadEpisodes(tvId, select.value || 1);
    }
  } catch(e) { console.error(e); }
}

async function loadEpisodes(tvId, seasonNum) {
  try {
    currentTVState.season = parseInt(seasonNum);
    const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
    const data = await res.json();
    const container = document.getElementById("episode-list");
    container.innerHTML = "";
    
    if(data.episodes) {
      data.episodes.forEach(ep => {
         const div = document.createElement("div");
         div.className = "episode-item";
         div.setAttribute("onclick", `playEpisode(${ep.episode_number}, ${ep.id})`);
         
         let thumb = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300';
         
         div.innerHTML = `
            <div class="ep-thumb" style="background-image: url('${thumb}')">
               <div class="ep-play-overlay"><i class="fa-solid fa-play"></i></div>
            </div>
            <div class="ep-meta">
               <h4>Epi ${ep.episode_number}: ${ep.name}</h4>
               <p>${ep.overview ? ep.overview.substring(0, 75)+'...' : 'No description available.'}</p>
            </div>
         `;
         container.appendChild(div);
      });
    }
  } catch(e) { console.error(e); }
}

function playEpisode(epNum) {
  currentTVState.episode = epNum;
  currentTVState.currentEpNum = epNum;
  document.getElementById("player-section").style.display = "block";
  updatePlayerFrame();
  addToContinueWatching();
  document.getElementById("player-section").scrollIntoView({behavior:'smooth', block:'start'});
}

async function fetchRecommendations(id, type) {
  try {
     const res = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}`);
     const data = await res.json();
     const container = document.getElementById("modal-recommendations");
     container.innerHTML = "";
     
     let items = data.results ? data.results.slice(0, 6) : [];
     items.forEach(rec => {
        if(!rec.backdrop_path) return;
        const div = document.createElement("div");
        div.className = "rec-card-row";
        div.setAttribute("onclick", `openModal(${JSON.stringify(rec).replace(/"/g, '&quot;')}, '${type}')`);
        div.innerHTML = `
           <img src="https://image.tmdb.org/t/p/w300${rec.backdrop_path}" alt="thumb">
           <div class="rec-info">
              <h4>${rec.title || rec.name}</h4>
              <p>${rec.overview || ''}</p>
           </div>
        `;
        container.appendChild(div);
     });
  } catch(e) { console.error(e); }
}

// ========================================================
// ===               LOCALSTORAGE HANDLERS             ===
// ========================================================

function addToContinueWatching() {
  continueWatching = continueWatching.filter(x => x.id !== currentItem.id);
  continueWatching.unshift({ ...currentItem, appType: currentTVState.type, timestamp: Date.now() });
  if(continueWatching.length > 15) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueWatchingUI();
}

function updateContinueWatchingUI() {
  const container = document.getElementById("continue-watching-list");
  if(!container) return;
  container.innerHTML = "";
  if(continueWatching.length === 0) {
    container.innerHTML = `<p style="padding:20px; color:#666; font-size:0.9rem;">Wala ka pang pinanood kamakailan.</p>`;
    return;
  }
  continueWatching.forEach(item => {
     const card = document.createElement("div");
     card.className = "card";
     card.setAttribute("onclick", `openModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${item.appType || "movie"}')`);
     card.innerHTML = `
        <img src="${IMG_URL}${item.poster_path}" alt="poster">
        <div class="card-info">
          <h3>${item.title || item.name}</h3>
          <p><i class="fa-solid fa-clock-rotate-left" style="color:#e50914;"></i> History</p>
        </div>
     `;
     container.appendChild(card);
  });
}

function toggleWatchlist() {
  const isInWatchlist = watchlist.some(x => x.id === currentItem.id);
  const btn = document.getElementById("modal-watchlist-btn");
  
  if (isInWatchlist) {
     watchlist = watchlist.filter(x => x.id !== currentItem.id);
     btn.innerHTML = `<i class="fa-solid fa-plus"></i>`;
  } else {
     watchlist.unshift({ ...currentItem, appType: currentTVState.type });
     btn.innerHTML = `<i class="fa-solid fa-check" style="color:#e50914;"></i>`;
  }
  localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
  updateWatchlistUI();
}

function updateWatchlistUI() {
  const container = document.getElementById("my-watchlist-list");
  if(!container) return;
  container.innerHTML = "";
  if(watchlist.length === 0) {
     container.innerHTML = `<p style="padding:20px; color:#666; font-size:0.9rem;">Walang pelikula sa iyong listahan.</p>`;
     return;
  }
  watchlist.forEach(item => {
     const card = document.createElement("div");
     card.className = "card";
     card.setAttribute("onclick", `openModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${item.appType || "movie"}')`);
     card.innerHTML = `
        <img src="${IMG_URL}${item.poster_path}" alt="poster">
        <div class="card-info">
          <h3>${item.title || item.name}</h3>
          <p><i class="fa-solid fa-bookmark" style="color:#e50914;"></i> Saved</p>
        </div>
     `;
     container.appendChild(card);
  });
}

function clearContinueWatching() {
   if(confirm("Sigurado ka bang nais mong burahin ang iyong watch history?")) {
      localStorage.removeItem("cineflex_recent");
      continueWatching = [];
      updateContinueWatchingUI();
   }
}

// ========================================================
// ===                SEARCH ENGINE LOGIC              ===
// ========================================================
function openSearch() {
  document.getElementById("search-overlay").style.display = "block";
  document.getElementById("searchInput").focus();
  document.body.style.overflow = "hidden";
}
function closeSearch() {
  document.getElementById("search-overlay").style.display = "none";
  document.body.style.overflow = "auto";
  document.getElementById("searchInput").value = "";
  document.getElementById("search-results-grid").innerHTML = "";
}
async function handleSearch(query) {
  const container = document.getElementById("search-results-grid");
  if(!query.trim()) { container.innerHTML = ""; return; }
  try {
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    container.innerHTML = "";
    
    data.results.forEach(item => {
       if(!item.poster_path || (item.media_type !== 'movie' && item.media_type !== 'tv')) return;
       const div = document.createElement("div");
       div.className = "modern-grid-item";
       div.setAttribute("onclick", `closeSearch(); openModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${item.media_type}')`);
       div.innerHTML = `
          <div class="modern-thumb-wrapper">
             <img src="${IMG_URL}${item.poster_path}" class="modern-img" alt="img">
          </div>
          <div style="padding:6px 2px;">
             <h4 style="margin:2px 0; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title || item.name}</h4>
             <p style="margin:0; font-size:0.75rem; color:#888;">${item.media_type.toUpperCase()}</p>
          </div>
       `;
       container.appendChild(div);
    });
  } catch(e) { console.error(e); }
}

// ========================================================
// ===              VIEW ALL / PAGINATION              ===
// ========================================================
function viewAll(category) {
   document.getElementById("homepage-lists").style.display = "none";
   document.getElementById("hero-banner").style.display = "none";
   
   const grid = document.getElementById("view-all-grid");
   const title = document.getElementById("view-all-title");
   const viewAllBox = document.getElementById("view-all-container");
   
   viewAllBox.style.display = "block";
   grid.innerHTML = "";
   window.scrollTo(0,0);
   
   currentViewAllPage = 1;
   isFetchingViewAll = false;
   
   if (category === 'continue') {
       title.innerText = "Continue Watching History";
       renderLocalGrid(continueWatching, 'movie');
       currentViewAllUrl = ""; 
   } else if (category === 'watchlist') {
       title.innerText = "My Full Watchlist";
       renderLocalGrid(watchlist, 'movie');
       currentViewAllUrl = "";
   } else {
       if(category === 'trending-movies') { title.innerText = "Trending Movies"; currentViewAllUrl = `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`; }
       if(category === 'trending-tv') { title.innerText = "Trending TV Shows"; currentViewAllUrl = `${BASE_URL}/trending/tv/day?api_key=${API_KEY}`; }
       if(category === 'action') { title.innerText = "Action & Adventure"; currentViewAllUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`; }
       if(category === 'comedy') { title.innerText = "Comedy Zone"; currentViewAllUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=35`; }
       if(category === 'horror') { title.innerText = "Horror & Thriller"; currentViewAllUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=27,53`; }
       if(category === 'anime') { title.innerText = "Anime & Animation"; currentViewAllUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16&with_keywords=210024|287501`; }
       
       fetchMoreViewAll();
   }
}

function closeViewAll() {
   document.getElementById("view-all-container").style.display = "none";
   document.getElementById("homepage-lists").style.display = "block";
   document.getElementById("hero-banner").style.display = "block";
   currentViewAllUrl = "";
}

function renderLocalGrid(list, defaultType) {
   const grid = document.getElementById("view-all-grid");
   if(list.length === 0) { grid.innerHTML = `<p style="color:#666; padding:20px 0;">Walang laman ang listahan na ito.</p>`; return; }
   list.forEach(item => {
      const div = document.createElement("div");
      div.className = "modern-grid-item";
      div.setAttribute("onclick", `openModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${item.appType || defaultType}')`);
      div.innerHTML = `
         <div class="modern-thumb-wrapper">
            <img src="${IMG_URL}${item.poster_path}" class="modern-img" alt="img">
         </div>
         <div style="padding:6px 2px;">
            <h4 style="margin:2px 0; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title || item.name}</h4>
         </div>
      `;
      grid.appendChild(div);
   });
}

async function fetchMoreViewAll() {
   if(!currentViewAllUrl || isFetchingViewAll) return;
   isFetchingViewAll = true;
   document.getElementById("view-all-loading").style.display = "block";
   
   try {
      let connector = currentViewAllUrl.includes("?") ? "&" : "?";
      let fullUrl = `${currentViewAllUrl}${connector}page=${currentViewAllPage}`;
      
      const res = await fetch(fullUrl);
      const data = await res.json();
      
      let deducedType = currentViewAllUrl.includes("/tv") ? "tv" : "movie";
      const grid = document.getElementById("view-all-grid");
      
      if(data.results && data.results.length > 0) {
         data.results.forEach(item => {
            if(!item.poster_path) return;
            const div = document.createElement("div");
            div.className = "modern-grid-item";
            div.setAttribute("onclick", `openModal(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${deducedType}')`);
            div.innerHTML = `
               <div class="modern-thumb-wrapper">
                  <img src="${IMG_URL}${item.poster_path}" class="modern-img" alt="img">
               </div>
               <div style="padding:6px 2px;">
                  <h4 style="margin:2px 0; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title || item.name}</h4>
                  <p style="margin:0; font-size:0.75rem; color:#666;">⭐ ${item.vote_average ? item.vote_average.toFixed(1) : '0.0'}</p>
               </div>
            `;
            grid.appendChild(div);
         });
         currentViewAllPage++;
      }
   } catch(e) { console.error(e); }
   finally {
      isFetchingViewAll = false;
      document.getElementById("view-all-loading").style.display = "none";
   }
}

function setupInfiniteScrollForViewAll() {
   window.addEventListener("scroll", () => {
      if(!currentViewAllUrl) return; 
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 700) {
          fetchMoreViewAll();
      }
   });
}

// ========================================================
// ===               DRAWER & MISC UTILS               ===
// ========================================================
function openMenuDrawer() { document.getElementById("menu-drawer").style.transform = "translateX(0%)"; }
function closeMenuDrawer() { document.getElementById("menu-drawer").style.transform = "translateX(100%)"; }
function setupScrollNavbar() {
  const nav = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if(nav) {
      if (window.scrollY > 30) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    }
  });
}
