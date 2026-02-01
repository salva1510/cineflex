const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let trendingItems = []; // Para sa manual banner swipe
let currentBannerIndex = 0; // Index ng kasalukuyang banner
let currentTVState = { season: 1, episode: 1 };
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let autoplayTimer = null;
let touchStartX = 0;
 let touchEndX = 0;

async function init() {
  showSkeletons("main-list");
  showSkeletons("tv-list");
  updateMyListUI();
  updateContinueUI();

  try {
    const popular = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r=>r.json());
const topRated = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`).then(r=>r.json());
const nowPlaying = await fetch(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}`).then(r=>r.json());
const upcoming = await fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}`).then(r=>r.json());

const action = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`).then(r=>r.json());
const comedy = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=35`).then(r=>r.json());
const horror = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=27`).then(r=>r.json());
const romance = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10749`).then(r=>r.json());
const scifi = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=878`).then(r=>r.json());
const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
const asian = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=ja|ko|zh`).then(r=>r.json());
const filipino = await fetch(
  `${BASE_URL}/discover/movie?` +
  `api_key=${API_KEY}` +
  `&region=PH` +
  `&with_origin_country=PH` +
  `&sort_by=popularity.desc`
).then(r => r.json());

const korean = await fetch(
  `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=ko`
).then(r => r.json());
// DISPLAY
displayCards(popular.results, "popular-list");
displayCards(topRated.results, "toprated-list");
displayCards(nowPlaying.results, "nowplaying-list");
displayCards(upcoming.results, "upcoming-list");
displayCards(action.results, "action-list");
displayCards(comedy.results, "comedy-list");
displayCards(horror.results, "horror-list");
displayCards(romance.results, "romance-list");
displayCards(scifi.results, "scifi-list");
displayCards(asian.results, "asian-list");
displayCards(trending.results, "main-list");
displayCards(tvShows.results, "tv-list"); 
displayCards(filipino.results, "filipino-list");
displayCards(korean.results, "korean-list"); 
    // I-save ang trending results para sa slider
    trendingItems = trending.results; 
    currentItem = trendingItems[0];
    
    setBanner(currentItem);
    
  } catch (err) {
    console.error("Failed to fetch data:", err);
  }
}

// BAGONG FUNCTION: Para sa manual swipe ng banner
function changeBanner(direction) {
    if (trendingItems.length === 0) return;

    currentBannerIndex += direction;

    // Unlimited loop logic
    if (currentBannerIndex < 0) {
        currentBannerIndex = trendingItems.length - 1;
    } else if (currentBannerIndex >= trendingItems.length) {
        currentBannerIndex = 0;
    }

    currentItem = trendingItems[currentBannerIndex];
    setBanner(currentItem);
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const nextBtn = document.getElementById("next-ep-btn");
  const autoContainer = document.getElementById("autoplay-container");
  
  clearTimeout(autoplayTimer);
  document.getElementById("next-timer").innerText = "";

  if (isTV) {
      const s = parseInt(document.getElementById("season-select")?.value) || 1;
      const e = parseInt(document.getElementById("episode-select")?.value) || 1;
      currentTVState.season = s;
      currentTVState.episode = e;
      
      document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${id}/${s}/${e}`;
      if(nextBtn) nextBtn.style.display = "block";
      if(autoContainer) autoContainer.style.display = "flex";
      
      startAutoplayCheck();
  } else {
      document.getElementById("video-player").src = `https://zxcstream.xyz/embed/movie/${id}`;
      if(nextBtn) nextBtn.style.display = "none";
      if(autoContainer) autoContainer.style.display = "none";
  }

  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  addToContinueWatching(currentItem);
  closeModal();
  document.getElementById("player-container").scrollIntoView({ behavior: 'smooth' });
}

function playNextEpisode() {
    clearTimeout(autoplayTimer);
    currentTVState.episode++;
    const id = currentItem.id;
    document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${id}/${currentTVState.season}/${currentTVState.episode}`;
    document.getElementById("player-title-display").innerText = `Playing: ${currentItem.name} (S${currentTVState.season} E${currentTVState.episode})`;
    document.getElementById("next-timer").innerText = "";
    
    startAutoplayCheck();
}

function startAutoplayCheck() {
    const isSitcom = currentItem.overview && currentItem.overview.length < 200;
    const duration = isSitcom ? 22 * 60 * 1000 : 45 * 60 * 1000;

    autoplayTimer = setTimeout(() => {
        const toggle = document.getElementById("autoplay-toggle");
        if (toggle && toggle.checked) {
            let countdown = 10;
            const timerEl = document.getElementById("next-timer");
            
            const interval = setInterval(() => {
                if(timerEl) timerEl.innerText = `Next in ${countdown}s...`;
                countdown--;
                if (countdown < 0) {
                    clearInterval(interval);
                    playNextEpisode();
                }
            }, 1000);
        }
    }, duration);
}

function showSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if(container) container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => {
    const date = item.release_date || item.first_air_date || "";
    const year = date ? date.split('-')[0] : "";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "NR";

    return `
      <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <div class="card-badges">
          <span class="badge-rating"><i class="fa-solid fa-star"></i> ${rating}</span>
          <span class="badge-year">${year}</span>
        </div>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
      </div>
    `;
  }).join('');
}

async function showDetails(item) {
  currentItem = item;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  
  // I-fetch ang details at credits (cast) nang sabay
  const [details, credits] = await Promise.all([
    fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json())
  ]);

  const runtime = details.runtime ? `${details.runtime}m` : (details.number_of_seasons ? `${details.number_of_seasons} Seasons` : "");

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-meta-row").innerHTML = `<span>${item.vote_average.toFixed(1)} Rating</span> • <span>${runtime}</span>`;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  // I-display ang Cast
  displayCast(credits.cast);

  const epSelector = document.getElementById("episode-selector");
  if (type === 'tv') {
      epSelector.style.display = "flex";
      setupSeasonSelector(details);
  } else {
      epSelector.style.display = "none";
  }

  const btn = document.getElementById("mylist-btn");
  if(btn) btn.innerHTML = myFavorites.some(f => f.id === item.id) ? `<i class="fa-solid fa-check"></i>` : `<i class="fa-solid fa-plus"></i>`;
  document.getElementById("details-modal").style.display = "flex";
}

// Bagong function para i-render ang cast cards
function displayCast(cast) {
    const castContainer = document.getElementById("modal-cast");
    if (!castContainer) return;

    // Limitahan lang sa top 10 cast members
    castContainer.innerHTML = cast.slice(0, 10).map(person => `
        <div class="cast-card">
            <img src="${person.profile_path ? 'https://image.tmdb.org/t/p/w200' + person.profile_path : 'https://via.placeholder.com/100x150?text=No+Image'}" alt="${person.name}">
            <p class="cast-name">${person.name}</p>
            <p class="cast-character">${person.character}</p>
        </div>
    `).join('');
}


function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    if(!seasonSelect) return;
    seasonSelect.innerHTML = series.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    const epSelect = document.getElementById("episode-select");
    if(!epSelect) return;
    epSelect.innerHTML = data.episodes.map(e => 
        `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`
    ).join('');
}

function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueUI();
}

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if (continueWatching.length > 0) {
    if(section) section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  } else if(section) section.style.display = "none";
}

function toggleMyList() {
  const idx = myFavorites.findIndex(f => f.id === currentItem.id);
  if (idx === -1) myFavorites.push(currentItem);
  else myFavorites.splice(idx, 1);
  localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
  updateMyListUI();
  showDetails(currentItem);
}

function updateMyListUI() {
  const section = document.getElementById("my-list-section");
  if (myFavorites.length > 0) {
    if(section) section.style.display = "block";
    displayCards(myFavorites, "my-list");
  } else if(section) section.style.display = "none";
}

function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const processSearch = debounce((q) => handleSearch(q));

async function handleSearch(q) {
  if (q.length < 2) return;
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
  document.getElementById("search-results").innerHTML = res.results.filter(i => i.poster_path).map(item => `
    <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
      <img src="${IMG_URL}${item.poster_path}">
      <p>${item.title || item.name}</p>
    </div>
  `).join('');
}

async function filterByGenre(id, el) {
  document.querySelectorAll('.genre-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (id === 'all') return init();
  
  showSkeletons("main-list");
  const data = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${id}`).then(r => r.json());
  displayCards(data.results, "main-list");
  const tvSection = document.getElementById("tv-section");
  if(tvSection) tvSection.style.display = "none";
}

// Palitan ang dating playTrailer function
async function playTrailer() {
  const type = currentItem.first_air_date ? 'tv' : 'movie';
  const data = await fetch(`${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}`).then(r => r.json());
  
  // Hanapin ang YouTube Trailer
  const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  
  if (trailer) {
    const container = document.getElementById("trailer-container");
    container.style.display = "block";
    
    // I-render ang YouTube Iframe sa loob ng banner
    document.getElementById("player").innerHTML = `
      <iframe 
        width="100%" 
        height="100%" 
        src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0" 
        frameborder="0" 
        allow="autoplay; encrypted-media" 
        allowfullscreen 
        style="position:absolute; top:0; left:0;">
      </iframe>`;
  } else {
    alert("Pasensya na, walang trailer na available.");
  }
}

// Function para isara ang trailer at ibalik ang background image
function closeTrailer() {
  const container = document.getElementById("trailer-container");
  container.style.display = "none";
  document.getElementById("player").innerHTML = ""; // Stop the video
}

// Mahalaga: I-update din ang changeBanner para isara ang trailer kapag nag-swipe
function changeBanner(direction) {
    closeTrailer(); // Isara ang trailer kung sakaling naka-play
    if (trendingItems.length === 0) return;
    currentBannerIndex += direction;
    if (currentBannerIndex < 0) currentBannerIndex = trendingItems.length - 1;
    else if (currentBannerIndex >= trendingItems.length) currentBannerIndex = 0;
    currentItem = trendingItems[currentBannerIndex];
    setBanner(currentItem);
}


function openDownload() { window.open(`https://getpvid.com/download/${currentItem.id}`, '_blank'); }
function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { 
    document.getElementById("video-player").src = ""; 
    document.getElementById("player-container").style.display = "none"; 
    clearTimeout(autoplayTimer);
}

init();
// Function para sa Menu Drawer
function openMenuDrawer() {
    document.getElementById("menu-drawer").classList.add("open");
}

function closeMenuDrawer() {
    document.getElementById("menu-drawer").classList.remove("open");
}

// Function para sa More Info (ipapakita ang details ng nasa banner)
function showBannerInfo() {
    if (currentItem) {
        showDetails(currentItem);
    }
}

// Placeholder para sa Account
function openAccount() {
    alert("Account settings coming soon!");
}
function openDMCA() {
  document.getElementById("dmca-modal").style.display = "flex";
}

function closeDMCA() {
  document.getElementById("dmca-modal").style.display = "none";
}
// ===== ADD-ONLY: SAFE LOAD HELPERS =====
async function safeLoadSection(id, url) {
  try {
    const el = document.getElementById(id);
    if (!el) return;
    const data = await fetch(url).then(r=>r.json());
    if (data && data.results) displayCards(data.results, id);
  } catch (e) { console.error('LOAD FAIL', id, e); }
}

// ===== ADD-ONLY: EXTRA SECTIONS LOADER =====
async function loadExtraCountrySections() {
  // 🇵🇭 PINOY
  safeLoadSection('pinoy-list', `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&region=PH&sort_by=popularity.desc`);
  safeLoadSection('pinoy-classics-list', `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&primary_release_date.lte=2015-12-31&sort_by=vote_average.desc`);
  safeLoadSection('pinoy-romance-list', `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&with_genres=10749`);
  safeLoadSection('pinoy-horror-list', `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&with_genres=27`);
  safeLoadSection('pinoy-comedy-list', `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=PH&with_genres=35`);

  // 🇰🇷 KOREAN
  safeLoadSection('korean-list', `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=KR&sort_by=popularity.desc`);
  safeLoadSection('korean-tv-list', `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_origin_country=KR&sort_by=popularity.desc`);
}

// ===== ADD-ONLY: DMCA HOOKS =====
function showBannerInfo(){ openDMCA(); }
function openDMCA(){ const m=document.getElementById('dmca-modal'); if(m) m.style.display='flex'; }
function closeDMCA(){ const m=document.getElementById('dmca-modal'); if(m) m.style.display='none'; }

// ===== ADD-ONLY: TRIGGER AFTER INITIAL LOAD =====
setTimeout(loadExtraCountrySections, 1500);
// ===== ADD-ONLY: BANNER TOUCH SWIPE =====


const bannerEl = document.getElementById("banner");

if (bannerEl) {
  bannerEl.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  bannerEl.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleBannerSwipe();
  }, { passive: true });
}

function handleBannerSwipe() {
  const swipeDistance = touchEndX - touchStartX;

  if (Math.abs(swipeDistance) < 50) return; // ignore maliit na galaw

  if (swipeDistance > 0) {
    changeBanner(-1); // swipe right → previous
  } else {
    changeBanner(1);  // swipe left → next
  }
}
function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
        closeMenuDrawer();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


  
