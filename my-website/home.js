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
    const [pop, fil, kd, kp, trd] = await Promise.all([
      fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r=>r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r=>r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r=>r.json()),
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json())
    ]);

    displayCards(pop.results, "popular-list");
    displayCards(fil.results, "filipino-list");
    displayCards(kd.results, "kdrama-list"); 
    displayCards(kp.results, "kpop-list"); 
    displayCards(trd.results, "trending-today");
    updateContinueUI();

    trendingItems = trd.results;
    currentItem = trendingItems[0];
    setBanner(currentItem);
    generateAdvancedRecommendations(); // Ibinalik ang More Like This
  } catch (err) { console.error(err); }
}

// --- BANNER SWIPE LOGIC ---
function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 120) + "...";
}

function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) { 
    touchEndX = e.changedTouches[0].screenX; 
    if (touchStartX - touchEndX > 50) changeBanner(1);
    if (touchEndX - touchStartX > 50) changeBanner(-1);
}

function changeBanner(dir) {
    currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
    currentItem = trendingItems[currentBannerIndex];
    setBanner(currentItem);
}

// --- MORE LIKE THIS (RECOMMENDATIONS) ---
async function generateAdvancedRecommendations() {
    const type = currentItem.first_air_date ? 'tv' : 'movie';
    const data = await fetch(`${BASE_URL}/${type}/${currentItem.id}/recommendations?api_key=${API_KEY}`).then(r => r.json());
    displayCards(data.results, "recommended-list");
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>
  `).join('');
}

async function showDetails(item) {
  currentItem = item;
  const type = (item.first_air_date || item.name) ? 'tv' : 'movie';
  
  document.getElementById("modal-player-container").style.display = "none";
  document.getElementById("modal-video-iframe").src = "";

  const [details, credits] = await Promise.all([
    fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json())
  ]);

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
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
  generateAdvancedRecommendations(); // Refresh "More Like This" based on modal item
}

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    currentTVState.season = seasonNum;
    document.getElementById("episode-list").innerHTML = data.episodes.map(e => {
        const thumb = e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : 'https://via.placeholder.com/300x170?text=CineFlex';
        return `
            <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="ep-thumb-container"><img src="${thumb}" class="ep-thumb"></div>
                <div class="ep-info"><h4>${e.episode_number}. ${e.name}</h4><p>${e.overview || 'Watch now.'}</p></div>
            </div>`;
    }).join('');
}

function playSpecificEpisode(epNum, element) {
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    playerContainer.style.display = "block";
    iframe.src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`;
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function startPlayback() {
    const isTV = (currentItem.first_air_date || currentItem.name);
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    playerContainer.style.display = "block";
    iframe.src = isTV ? `https://zxcstream.xyz/embed/tv/${currentItem.id}/1/1` : `https://zxcstream.xyz/player/movie/${currentItem.id}`;
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function closeModal() { 
    document.getElementById("details-modal").style.display = "none"; 
    document.getElementById("modal-video-iframe").src = "";
    document.body.style.overflow = "auto";
}

function updateContinueUI() {
    const list = document.getElementById("continue-list");
    if(continueWatching.length > 0) {
        document.getElementById("continue-watching-section").style.display = "block";
        displayCards(continueWatching, "continue-list");
    }
}

init();
