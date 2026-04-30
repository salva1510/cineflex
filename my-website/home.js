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

// --- NETFLIX-STYLE LANDSCAPE LOGIC START ---
async function enterCinemaMode() {
  const playerContainer = document.getElementById("modal-player-container");
  try {
    // Kinakailangan ang Fullscreen para payagan ng mobile browser ang orientation lock
    if (playerContainer.requestFullscreen) {
      await playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      await playerContainer.webkitRequestFullscreen();
    }

    // I-lock sa Landscape orientation
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock not supported on this device"));
    }
  } catch (err) {
    console.log("Cinema mode activation error:", err);
  }
}

// Kapag lumabas ang user sa Fullscreen, i-unlock ang rotation
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
});
// --- NETFLIX-STYLE LANDSCAPE LOGIC END ---

async function init() {
  try {
    const [pop, fil, kd, kp, trd, anime] = await Promise.all([
      fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`).then(r=>r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`).then(r=>r.json()),
      fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`).then(r=>r.json()),
      fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_keywords=210024|222243`).then(r=>r.json())
    ]);

    trendingItems = trd.results;
    updateBanner();
    setInterval(nextBanner, 8000);

    displayCards(pop.results, "popular-list");
    displayCards(fil.results, "pinoy-list");
    displayCards(kd.results, "kdrama-list");
    displayCards(kp.results, "kpop-list");
    displayCards(anime.results, "anime-list");
    updateContinueUI();
  } catch (e) { console.error("Init Error:", e); }
}

function updateBanner() {
  const item = trendingItems[currentBannerIndex];
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
  document.getElementById("banner-play-btn").onclick = () => showDetails(item);
}

function nextBanner() {
  currentBannerIndex = (currentBannerIndex + 1) % trendingItems.length;
  updateBanner();
}

async function showDetails(item) {
  currentItem = item;
  const modal = document.getElementById("details-modal");
  const isTV = item.media_type === 'tv' || item.first_air_date;
  
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
  document.getElementById("modal-player-container").style.display = "none";
  document.getElementById("modal-video-iframe").src = "";
  
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-overview").innerText = item.overview;
  document.getElementById("modal-year").innerText = (item.release_date || item.first_air_date || "").split('-')[0];
  document.getElementById("modal-rating").innerText = `⭐ ${item.vote_average.toFixed(1)}`;

  if (isTV) {
    document.getElementById("tv-controls").style.display = "block";
    loadEpisodes(1);
  } else {
    document.getElementById("tv-controls").style.display = "none";
  }

  const recs = await fetch(`${BASE_URL}/${isTV?'tv':'movie'}/${item.id}/recommendations?api_key=${API_KEY}`).then(r=>r.json());
  displayCards(recs.results.slice(0,12), "modal-recommendations");

  const castData = await fetch(`${BASE_URL}/${isTV?'tv':'movie'}/${item.id}/credits?api_key=${API_KEY}`).then(r=>r.json());
  const castContainer = document.getElementById("modal-cast");
  castContainer.innerHTML = castData.cast.slice(0,10).map(c => `
    <div class="cast-card">
      <img src="${c.profile_path ? IMG_URL+c.profile_path : 'https://via.placeholder.com/100x150?text=No+Image'}" alt="${c.name}">
      <p>${c.name}</p>
    </div>
  `).join('');
}

async function loadEpisodes(seasonNum) {
  currentTVState.season = seasonNum;
  const data = await fetch(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`).then(r=>r.json());
  const container = document.getElementById("episode-list");
  container.innerHTML = data.episodes.map(ep => `
    <div class="episode-item" onclick="playSpecificEpisode(${ep.episode_number}, this)">
      <div class="ep-img-wrapper">
        <img src="${ep.still_path ? IMG_URL+ep.still_path : IMG_URL+currentItem.backdrop_path}">
        <i class="fa-solid fa-play"></i>
      </div>
      <div class="ep-info">
        <h5>${ep.episode_number}. ${ep.name}</h5>
        <p>${ep.air_date}</p>
      </div>
    </div>
  `).join('');
}

function startPlayback() {
  const playerContainer = document.getElementById("modal-player-container");
  const iframe = document.getElementById("modal-video-iframe");
  playerContainer.style.display = "block";
  
  iframe.src = `https://bcine.app/embed/movie/${currentItem.id}`;
  
  document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
  addToContinueWatching(currentItem);
  
  // ACTIVATION NG AUTO-LANDSCAPE
  enterCinemaMode();
}

function playSpecificEpisode(epNum, element) {
  document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  const playerContainer = document.getElementById("modal-player-container");
  const iframe = document.getElementById("modal-video-iframe");
  playerContainer.style.display = "block";
  
  iframe.src = `https://bcine.app/embed/tv/${currentItem.id}/${currentTVState.season}/${epNum}`;
  
  document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
  addToContinueWatching(currentItem);

  // ACTIVATION NG AUTO-LANDSCAPE
  enterCinemaMode();
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>`).join('');
}

function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }

function closeModal() { 
  document.getElementById("details-modal").style.display = "none"; 
  document.getElementById("modal-video-iframe").src = ""; 
  document.body.style.overflow = "auto"; 
  // I-unlock ang screen orientation pag-close ng modal
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
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
  if(continueWatching.length > 0) {
    document.getElementById("continue-watching-section").style.display = "block";
    displayCards(continueWatching, "continue-list");
  }
}

init();
