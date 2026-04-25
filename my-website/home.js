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
    updateContinueUI();

    currentItem = trending.results[0];
    setBanner(currentItem);
  } catch (err) { console.error("Init fail:", err); }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  if(!banner) return;
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
  const type = (item.first_air_date || item.name) ? 'tv' : 'movie';
  
  // Hide player initially
  document.getElementById("modal-player-container").style.display = "none";
  document.getElementById("modal-video-iframe").src = "";

  const [details, credits] = await Promise.all([
    fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json())
  ]);

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  // Cast
  const castCont = document.getElementById("modal-cast");
  if(castCont) {
    castCont.innerHTML = credits.cast.slice(0, 8).map(c => `
      <div class="cast-card">
        <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100x150'}">
        <p>${c.name}</p>
      </div>
    `).join('');
  }

  // Type Logic
  const epSelector = document.getElementById("episode-selector");
  const movieBtn = document.getElementById("movie-play-action");

  if (type === 'tv') {
      epSelector.style.display = "block";
      movieBtn.style.display = "none"; // Hide single play button for series
      setupSeasonSelector(details);
  } else {
      epSelector.style.display = "none";
      movieBtn.style.display = "block"; // Show single play button for movies
  }

  document.getElementById("details-modal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = series.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const epList = document.getElementById("episode-list");
    epList.innerHTML = "<p style='color:white; padding:20px;'>Loading episodes...</p>";

    try {
        const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
        currentTVState.season = seasonNum;

        epList.innerHTML = data.episodes.map(e => {
            const thumb = e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : 'https://via.placeholder.com/300x170?text=CineFlex';
            return `
                <div class="episode-item" onclick="playSpecificEpisode(${e.episode_number}, this)">
                    <div class="ep-thumb-container">
                        <img src="${thumb}" class="ep-thumb">
                    </div>
                    <div class="ep-info">
                        <h4>${e.episode_number}. ${e.name}</h4>
                        <p>${e.overview || 'Watch this amazing episode on CineFlex.'}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { epList.innerHTML = "<p style='color:red;'>Failed to load.</p>"; }
}

// THE NEW PLAY LOGIC (IN-MODAL)
function playSpecificEpisode(epNum, element) {
    currentTVState.episode = epNum;

    // UI Feedback
    document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Show Player
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");
    
    playerContainer.style.display = "block";
    iframe.src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`;
    
    // Scroll to top of modal to see video
    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
}

// Movie Play Logic (In-Modal)
function startPlayback() {
    const isTV = (currentItem.first_air_date || currentItem.name);
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");

    playerContainer.style.display = "block";
    
    if (isTV) {
        iframe.src = `https://zxcstream.xyz/embed/tv/${currentItem.id}/${currentTVState.season}/${currentTVState.episode}`;
    } else {
        iframe.src = `https://zxcstream.xyz/player/movie/${currentItem.id}`;
    }

    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    addToContinueWatching(currentItem);
}

function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueUI();
}

function updateContinueUI() {
  const contList = document.getElementById("continue-list");
  if(contList && continueWatching.length > 0) {
    document.getElementById("continue-watching-section").style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

function closeModal() { 
    document.getElementById("details-modal").style.display = "none"; 
    document.getElementById("modal-video-iframe").src = "";
    document.body.style.overflow = "auto";
}

function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

const processSearch = (q) => {
    if(q.length < 3) return;
    fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`)
        .then(r => r.json())
        .then(res => {
            const resultsDiv = document.getElementById("search-results");
            resultsDiv.innerHTML = res.results.filter(i => i.poster_path).map(item => `
                <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                    <img src="${IMG_URL}${item.poster_path}">
                    <p>${item.title || item.name}</p>
                </div>
            `).join('');
        });
};

init();
