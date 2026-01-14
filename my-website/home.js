/* =========================
   CONFIG
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerInterval = null;

/* =========================
   FETCH HELPERS
========================= */
async function fetchTopRatedMovies() {
  const data = await fetchJSON(
    `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
  );
  return data
    ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" }))
    : [];
}
async function fetchLatestMovies() {
  const data = await fetchJSON(
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`
  );
  return data
    ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" }))
    : [];
}
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("TMDB request failed");
    return res.json();
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
}

async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data ? data.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type })) : [];
}

async function fetchTrendingAnime() {
  let anime = [];
  for (let page = 1; page <= 2; page++) {
    const data = await fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    if (data) {
      const filtered = data.results.filter(item => 
        item.original_language === "ja" && item.genre_ids.includes(16) && item.poster_path
      );
      anime.push(...filtered);
    }
  }
  return anime.map(i => ({ ...i, media_type: "tv" }));
}

/* =========================
   UI HELPERS
========================= */
function showSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;
  container.innerHTML = "";

  items.forEach((item) => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.loading = "lazy";
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function scrollRow(id, amount) {
  const row = document.getElementById(id);
  row.scrollBy({ left: amount, behavior: 'smooth' });
}

/* =========================
   BANNER LOGIC
========================= */
function setBanner(item) {
  const banner = document.getElementById("banner");
  if (!banner || !item) return;
  
  banner.style.opacity = 0;
  setTimeout(() => {
    banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    document.getElementById("banner-title").textContent = item.title || item.name;
    
    // Premium addition: Description on banner
    const bannerDesc = document.getElementById("banner-desc");
    if(bannerDesc) {
        bannerDesc.textContent = item.overview ? item.overview.substring(0, 160) + "..." : "Discover the latest trending entertainment.";
    }
    
    banner.style.opacity = 1;
  }, 300);
}

function autoRotateBanner(items) {
  if (!items || items.length === 0) return;
  let index = 0;
  clearInterval(bannerInterval);
  setBanner(items[index]);
  bannerInterval = setInterval(() => {
    index = (index + 1) % items.length;
    setBanner(items[index]);
  }, 8000);
}

/* =========================
   MODAL & PLAYER
========================= */
renderContinueWatching();
async function showDetails(item) {
  currentItem = item;
  document.body.style.overflow = "hidden"; 
  
  const modal = document.getElementById("modal");
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  // Rating Stars
  const stars = Math.round(item.vote_average / 2);
  document.getElementById("modal-rating").innerHTML = "★".repeat(stars) + `<span style="opacity:0.3">${"★".repeat(5-stars)}</span>` + ` (${item.vote_average.toFixed(1)})`;
  
  modal.style.display = "flex";

  const isTv = item.media_type === "tv" || item.first_air_date;
  const tvControls = document.getElementById("tv-controls");
  
  if (isTv) {
    tvControls.style.display = "block";
    await loadSeasons(item.id);
  } else {
    tvControls.style.display = "none";
    changeServer();
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
  document.body.style.overflow = "auto";
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const seasonSelect = document.getElementById("seasonSelect");
  if(!data || !seasonSelect) return;
  
  seasonSelect.innerHTML = "";
  data.seasons.forEach(s => {
    if(s.season_number > 0) { 
        const opt = document.createElement("option");
        opt.value = s.season_number;
        opt.textContent = s.name;
        seasonSelect.appendChild(opt);
    }
  });
  loadEpisodes();
}

async function loadEpisodes() {
  if (!currentItem) return;
  const seasonNum = document.getElementById("seasonSelect").value || 1;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`);
  const episodesGrid = document.getElementById("episodes");
  
  if(!data || !episodesGrid) return;
  
  episodesGrid.innerHTML = data.episodes.map(ep => `
    <div class="episode-card" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
      <strong>Ep ${ep.episode_number}</strong>: ${ep.name}
    </div>
  `).join('');
  
  // Auto-play first episode
  if (data.episodes.length > 0) {
  playEpisode(seasonNum, data.episodes[0].episode_number);
}

function playEpisode(season, episode) {
    const server = document.getElementById("server").value;
    const iframe = document.getElementById("modal-video");
    if(server.includes("vidsrc")) {
        iframe.src = `https://${server}/embed/tv/${currentItem.id}/${season}/${episode}`;
    } else {
        iframe.src = `https://${server}/tv/${currentItem.id}/${season}/${episode}`;
       saveContinueWatching(currentItem, season, episode);
    }
}

function changeServer() {
  const server = document.getElementById("server").value;
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  const iframe = document.getElementById("modal-video");
  
  if (isTv) {
      const season = document.getElementById("seasonSelect").value || 1;
      playEpisode(season, 1);
  } else {
      if(server.includes("vidsrc")) {
          iframe.src = `https://${server}/embed/movie/${currentItem.id}`;
      } else {
          iframe.src = `https://${server}/movie/${currentItem.id}`;
      }
     saveContinueWatching(currentItem);
  }
}

/* =========================
   SEARCH
========================= */
async function searchTMDB() {
  const query = document.getElementById("search-input").value.trim();
  const resultsBox = document.getElementById("search-results");
  
  if (!query) { resultsBox.innerHTML = ""; return; }

  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  if(!data) return;
  
  resultsBox.innerHTML = "";
  data.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.onclick = () => { closeSearchModal(); showDetails(item); };
    resultsBox.appendChild(img);
  });
}

function openSearchModal() { 
    document.getElementById("search-modal").style.display = "flex"; 
    document.getElementById("search-input").focus(); 
}
function closeSearchModal() { 
    document.getElementById("search-modal").style.display = "none"; 
}

/* =========================
   GENRE BROWSER
========================= */
async function initGenreBrowse() {
  const select = document.getElementById("genre-select");
  if (!select) return;
  
  const genres = await fetchJSON(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  if(!genres) return;

  select.innerHTML = `<option value="">Select a genre</option>`;
  genres.genres.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", async () => {
    if(!select.value) return;
    showSkeleton("genre-movies-list");
    const data = await fetchJSON(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${select.value}`);
    if(data) {
        const items = data.results.map(i => ({...i, media_type: 'movie'}));
        displayList(items, "genre-movies-list");
    }
  });
}

/* =========================
   THEME & INIT
========================= */
const toggleBtn = document.getElementById("theme-toggle");
if(toggleBtn) {
    toggleBtn.onclick = () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      toggleBtn.textContent = next === "light" ? "🌙" : "☀️";
    };
}

// Start Application
showSkeleton("top-rated-list");
showSkeleton("latest-movies-list");
showSkeleton("movies-list");
showSkeleton("tvshows-list");
showSkeleton("anime-list");

Promise.all([
  fetchTrending("movie"),
  fetchLatestMovies(),
  fetchTopRatedMovies(),
  fetchTrending("tv"),
  fetchTrendingAnime()
]).then(([movies, latest, topRated, tv, anime]) => {
  autoRotateBanner(movies);
  displayList(movies, "movies-list");
  displayList(latest, "latest-movies-list");
  displayList(topRated, "top-rated-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
  initGenreBrowse();
});
/* =========================
   FOOTER NAV FUNCTIONS
========================= */

function goHome() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenu() {
  const menu = document.getElementById("menuDrawer");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function openAccount() {
  alert("Account system coming soon 🚀");
}
function saveContinueWatching(item, season = null, episode = null) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];

  // Remove duplicates
  list = list.filter(i => i.id !== item.id);

  list.unshift({
    id: item.id,
    title: item.title || item.name,
    poster: item.poster_path,
    backdrop: item.backdrop_path,
    overview: item.overview,
    media_type: item.media_type || (item.first_air_date ? "tv" : "movie"),
    season,
    episode,
    time: Date.now()
  });

  // Limit to 12 items
  localStorage.setItem("continueWatching", JSON.stringify(list.slice(0, 12)));

  renderContinueWatching();
}
function renderContinueWatching() {
  const row = document.getElementById("continue-row");
  const listEl = document.getElementById("continue-list");

  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  if (!row || list.length === 0) {
    if(row) row.style.display = "none";
    return;
  }

  row.style.display = "block";
  listEl.innerHTML = "";

  list.forEach(item => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster}`;
    img.className = "poster-item";
    img.onclick = () => resumeWatching(item);
    listEl.appendChild(img);
  });
}
async function resumeWatching(savedItem) {
  closeModal();

  // Fetch FULL TMDB data again
  const url = savedItem.media_type === "tv"
    ? `${BASE_URL}/tv/${savedItem.id}?api_key=${API_KEY}`
    : `${BASE_URL}/movie/${savedItem.id}?api_key=${API_KEY}`;

  const fullItem = await fetchJSON(url);
  if (!fullItem) return;

  // Restore needed fields
  fullItem.media_type = savedItem.media_type;
  fullItem.season = savedItem.season;
  fullItem.episode = savedItem.episode;

  setTimeout(() => {
    showDetails(fullItem);

    // Resume episode correctly
    if (fullItem.media_type === "tv" && savedItem.season && savedItem.episode) {
      setTimeout(() => {
        document.getElementById("seasonSelect").value = savedItem.season;
        loadEpisodes();
        playEpisode(savedItem.season, savedItem.episode);
      }, 700);
    }
  }, 300);
}
