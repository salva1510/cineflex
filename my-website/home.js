const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1 };
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let touchStartX = 0;
let touchEndX = 0;

async function init() {
  try {
    const [pop, fil, kd, kp, trd, anime] = await Promise.all([
      fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r=>r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r=>r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r=>r.json()),
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json())
    ]);

    displayCards(pop.results, "popular-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list"); 
    displayCards(kp.results, "kpop-list"); 
    displayCards(trd.results, "trending-today");
    displayCards(anime.results, "anime-list");
    
    updateContinueUI();
    trendingItems = trd.results;
    if(trendingItems.length > 0) setBanner(trendingItems[0]);
  } catch (err) { console.error(err); }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  if(!banner) return;
  banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 120) + "...";
}

function showBannerDetails() { showDetails(trendingItems[currentBannerIndex]); }

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
  const type = (item.first_air_date || item.name) ? 'tv' : 'movie';
  
  document.getElementById("modal-player-container").style.display = "none";
  document.getElementById("modal-video-iframe").src = "";
  closeSearch();

  const [details, credits, recs] = await Promise.all([
    fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
  ]);

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  // More Like This Logic
  const recContainer = document.getElementById("modal-recommendations");
  recContainer.innerHTML = recs.results.slice(0, 8).map(r => `
    <div class="rec-item" onclick='showDetails(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
        <div class="rec-thumb-container"><img src="${IMG_URL}${r.backdrop_path || r.poster_path}" class="rec-thumb"></div>
        <div class="rec-info"><h4>${r.title || r.name}</h4><p>${r.overview || 'Suggested anime/movie.'}</p></div>
    </div>`).join('');

  document.getElementById("modal-cast").innerHTML = credits.cast.slice(0, 8).map(c => `
    <div class="cast-card">
      <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100x150'}"><p>${c.name}</p>
    </div>`).join('');

  const epSelector = document.getElementById("episode-selector");
  const movieBtn = document.getElementById("movie-play-action");

  if (type === 'tv') {
      epSelector.style.display = "block";
      movieBtn.style.display = "none";
      setupSeasonSelector(details);
  } else {
      epSelector.style.display = "none";
      movieBtn.style.display = "block";
  }

  document.getElementById("details-modal").style.display = "flex";
  document.body.style.overflow = "hidden";
  document.querySelector('.modal-content').scrollTo({ top: 0 });
}

// SEARCH FUNCTION
const processSearch = async (q) => {
    const resultsDiv = document.getElementById("search-results");
    if(q.length < 2) { resultsDiv.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        resultsDiv.innerHTML = res.results.filter(i => i.poster_path).map(item => `
            <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
    } catch (err) { console.error(err); }
};

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    currentTVState.season = seasonNum;
    document.getElementById("episode-list").innerHTML = data.episodes.map(e => `
            <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="ep-thumb-container"><img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="ep-thumb"></div>
                <div class="ep-info"><h4>${e.episode_number}. ${e.name}</h4><p>${e.overview || 'Watch now.'}</p></div>
            </div>`).join('');
}

function playSpecificEpisode(epNum, element) {
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    playerContainer.style.display = "block";
    iframe.src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`;
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
}

function startPlayback() {
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    playerContainer.style.display = "block";
    iframe.src = `https://zxcstream.xyz/player/movie/${currentItem.id}`;
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>`).join('');
}

// DRAWER & MODAL CONTROLS
function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }
function closeModal() { document.getElementById("details-modal").style.display = "none"; document.getElementById("modal-video-iframe").src = ""; document.body.style.overflow = "auto"; }
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
  if(continueWatching.length > 0) {
    document.getElementById("continue-watching-section").style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

init();
