const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let currentTVState = { season: 1, episode: 1 };
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
/* ADD THESE AT THE TOP WITH OTHER VARIABLES */
let autoplayTimer = null;

/* UPDATE startPlayback() */
function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const nextBtn = document.getElementById("next-ep-btn");
  
  let embedUrl;
  if (isTV) {
      const s = parseInt(document.getElementById("season-select").value) || 1;
      const e = parseInt(document.getElementById("episode-select").value) || 1;
      currentTVState.season = s;
      currentTVState.episode = e;
      // Updated TV URL structure (adjust if the provider uses /player/ for TV too)
      embedUrl = `https://zxcstream.xyz/embed/tv/${id}/${s}/${e}?back=true&autoplay=true`;
      nextBtn.style.display = "block";
  } else {
      // Updated Movie URL structure based on your link
      embedUrl = `https://www.zxcstream.xyz/player/movie/${id}?back=true&autoplay=true`;
      nextBtn.style.display = "none";
  }

  const playerEl = document.getElementById("video-player");
  playerEl.src = embedUrl;
  
  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  addToContinueWatching(currentItem);
  closeModal();
  document.getElementById("player-container").scrollIntoView({ behavior: 'smooth' });
}


/* ADD THIS NEW FUNCTION */
function playNextEpisode() {
    clearTimeout(autoplayTimer);
    currentTVState.episode++;
    const id = currentItem.id;
    document.getElementById("video-player").src = `https://zxcstream.xyz/embed/tv/${id}/${currentTVState.season}/${currentTVState.episode}`;
    document.getElementById("player-title-display").innerText = `Playing: ${currentItem.name} (S${currentTVState.season} E${currentTVState.episode})`;
    document.getElementById("next-timer").innerText = "";
    
    // Restart the timer logic for the new episode
    startAutoplayCheck();
}

/* SIMULATED AUTOPLAY LOGIC */
function startAutoplayCheck() {
    // Since we can't know exactly when the video ends, 
    // we set a safety timer or simply allow the "Next" button to handle it.
    // However, if the user toggles Autoplay ON, we can show a prompt after ~20 mins (typical episode length)
    // or just leave it for the user to trigger. 
    // To actually AUTO-trigger, we'll wait 45 minutes for drama or 22 for sitcoms:
    
    const isSitcom = currentItem.overview.length < 200; // Rough guess
    const duration = isSitcom ? 22 * 60 * 1000 : 45 * 60 * 1000;

    autoplayTimer = setTimeout(() => {
        if (document.getElementById("autoplay-toggle").checked) {
            let countdown = 10;
            const timerEl = document.getElementById("next-timer");
            
            const interval = setInterval(() => {
                timerEl.innerText = `Next in ${countdown}s...`;
                countdown--;
                if (countdown < 0) {
                    clearInterval(interval);
                    playNextEpisode();
                }
            }, 1000);
        }
    }, duration);
}


async function init() {
  showSkeletons("main-list");
  showSkeletons("tv-list");
  updateMyListUI();
  updateContinueUI();

  try {
    const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
    const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
    
    currentItem = trending.results[0];
    setBanner(currentItem);
    displayCards(trending.results, "main-list");
    displayCards(tvShows.results, "tv-list");
  } catch (err) {
    console.error("Failed to fetch data:", err);
  }
}

function showSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if(container) container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
}

function setBanner(item) {
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
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
  
  const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());
  const runtime = details.runtime ? `${details.runtime}m` : (details.number_of_seasons ? `${details.number_of_seasons} Seasons` : "");

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-meta-row").innerHTML = `<span>${item.vote_average.toFixed(1)} Rating</span> • <span>${runtime}</span>`;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  // Episode Selector Logic
  const epSelector = document.getElementById("episode-selector");
  if (type === 'tv') {
      epSelector.style.display = "flex";
      setupSeasonSelector(details);
  } else {
      epSelector.style.display = "none";
  }

  const btn = document.getElementById("mylist-btn");
  btn.innerHTML = myFavorites.some(f => f.id === item.id) ? `<i class="fa-solid fa-check"></i>` : `<i class="fa-solid fa-plus"></i>`;
  document.getElementById("details-modal").style.display = "flex";
}

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    seasonSelect.innerHTML = series.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    const epSelect = document.getElementById("episode-select");
    epSelect.innerHTML = data.episodes.map(e => 
        `<option value="${e.episode_number}">Ep ${e.episode_number}: ${e.name}</option>`
    ).join('');
}

function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const nextBtn = document.getElementById("next-ep-btn");
  
  let embedUrl;
  if (isTV) {
      const s = parseInt(document.getElementById("season-select").value) || 1;
      const e = parseInt(document.getElementById("episode-select").value) || 1;
      currentTVState.season = s;
      currentTVState.episode = e;
      embedUrl = `https://zxcstream.xyz/embed/tv/${id}/${s}/${e}`;
      nextBtn.style.display = "block";
  } else {
      embedUrl = `https://zxcstream.xyz/embed/movie/${id}`;
      nextBtn.style.display = "none";
  }

  document.getElementById("video-player").src = embedUrl;
  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  addToContinueWatching(currentItem);
  closeModal();
  document.getElementById("player-container").scrollIntoView({ behavior: 'smooth' });
}

function playNextEpisode() {
    currentTVState.episode++;
    const id = currentItem.id;
    const embedUrl = `https://zxcstream.xyz/embed/tv/${id}/${currentTVState.season}/${currentTVState.episode}`;
    
    document.getElementById("video-player").src = embedUrl;
    document.getElementById("player-title-display").innerText = `Playing: ${currentItem.name} (S${currentTVState.season} E${currentTVState.episode})`;
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
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  } else section.style.display = "none";
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
    section.style.display = "block";
    displayCards(myFavorites, "my-list");
  } else section.style.display = "none";
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
  document.getElementById("tv-section").style.display = "none";
}

async function playTrailer() {
  const type = currentItem.first_air_date ? 'tv' : 'movie';
  const data = await fetch(`${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}`).then(r => r.json());
  const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
}

function openDownload() { window.open(`https://getpvid.com/download/${currentItem.id}`, '_blank'); }
function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { document.getElementById("video-player").src = ""; document.getElementById("player-container").style.display = "none"; }

init();
      
