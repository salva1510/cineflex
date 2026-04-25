const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let currentTVState = { season: 1, episode: 1 };
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
  try {
    const popular = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r=>r.json());
    const filipino = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json());
    const kdrama = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r=>r.json());
    const kpop = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r=>r.json());
    const trending = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json());

    displayCards(popular.results, "popular-list");
    displayCards(filipino.results, "filipino-list");
    displayCards(kdrama.results, "kdrama-list"); 
    displayCards(kpop.results, "kpop-list"); 
    displayCards(trending.results, "trending-today");
    displayCards(continueWatching, "continue-list");

    currentItem = trending.results[0];
    setBanner(currentItem);
  } catch (err) { console.error("Init fail:", err); }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
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
  const type = item.first_air_date ? 'tv' : 'movie';
  
  const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  const epSelector = document.getElementById("episode-selector");
  if (type === 'tv') {
      epSelector.style.display = "block";
      setupSeasonSelector(details);
  } else {
      epSelector.style.display = "none";
  }

  document.getElementById("details-modal").style.display = "flex";
}

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = series.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

// --- NETFLIX STYLE EPISODE LOADER (BASE SA IMAGE MO) ---
async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    const epList = document.getElementById("episode-list");
    
    currentTVState.season = seasonNum;

    epList.innerHTML = data.episodes.map(e => {
        const thumb = e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : 'https://via.placeholder.com/300x170?text=CineFlex';
        return `
            <div class="episode-item ${currentTVState.episode == e.episode_number ? 'active' : ''}" 
                 onclick="playSpecificEpisode(${e.episode_number})">
                <div class="ep-thumb-wrapper">
                    <img src="${thumb}" class="ep-thumb">
                </div>
                <div class="ep-info">
                    <h4>${e.episode_number}. ${e.name}</h4>
                    <p>${e.overview || 'Watch this episode on CineFlex.'}</p>
                </div>
            </div>
        `;
    }).join('');
}

function playSpecificEpisode(epNum) {
    currentTVState.episode = epNum;
    startPlayback();
}

function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const iframe = document.getElementById("video-player");

  if (isTV) {
      iframe.src = `https://zxcstream.xyz/embed/tv/${id}/${currentTVState.season}/${currentTVState.episode}`;
  } else {
      iframe.src = `https://zxcstream.xyz/player/movie/${id}`;
  }

  document.getElementById("player-container").style.display = "block";
  addToContinueWatching(currentItem);
  closeModal();
}

function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
}

function closePlayer() { 
    document.getElementById("video-player").src = ""; 
    document.getElementById("player-container").style.display = "none"; 
}
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

init();
