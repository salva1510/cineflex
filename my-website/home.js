/* =========================
   CONFIG
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286"; // Note: Public keys may be rate-limited
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerInterval = null;

/* =========================
   FETCH HELPERS
========================= */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type }));
}

async function fetchTrendingAnime() {
  let anime = [];
  for (let page = 1; page <= 3; page++) {
    const data = await fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const filtered = data.results.filter(item => 
      item.original_language === "ja" && item.genre_ids.includes(16) && item.poster_path
    );
    anime.push(...filtered);
  }
  return anime.map(i => ({ ...i, media_type: "tv" }));
}

/* =========================
   UI HELPERS
========================= */
function showSkeleton(containerId, count = 8) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const div = document.createElement("div");
    div.className = "skeleton";
    container.appendChild(div);
  }
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  items.forEach((item, i) => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.loading = "lazy";
    img.className = "poster-item";
    img.onclick = () => showDetails(item);

    // Hover effect logic
    attachTrailerHover(img, item);
    container.appendChild(img);
  });
}

function scrollRow(id, amount) {
  const row = document.getElementById(id);
  if(row) row.scrollBy({ left: amount, behavior: "smooth" });
}

/* =========================
   BANNER
========================= */
function setBanner(item) {
  const banner = document.getElementById("banner");
  if(!banner) return;
  banner.style.opacity = 0;
  setTimeout(() => {
    banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    document.getElementById("banner-title").textContent = item.title || item.name;
    banner.style.opacity = 1;
  }, 300);
}

function autoRotateBanner(items) {
  let index = 0;
  clearInterval(bannerInterval);
  setBanner(items[index]);
  bannerInterval = setInterval(() => {
    index = (index + 1) % items.length;
    setBanner(items[index]);
  }, 8000);
}

/* =========================
   TRAILERS (HOVER)
========================= */
async function getTrailerUrl(id, type) {
  try {
    const data = await fetchJSON(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`);
    const trailer = data.results.find(v => v.site === "YouTube" && v.type === "Trailer") || data.results[0];
    return trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0` : null;
  } catch (e) { return null; }
}

function attachTrailerHover(img, item) {
  let iframe;
  let timeout;
  
  img.addEventListener("mouseenter", () => {
    timeout = setTimeout(async () => {
      const type = item.media_type || "movie";
      const url = await getTrailerUrl(item.id, type);
      if (!url) return;

      iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.className = "hover-trailer";
      iframe.style.position = "absolute"; 
      iframe.style.zIndex = "50";
      // This is a simplified hover logic
      // Ideally you'd use a wrapper, but for this code structure:
      // We are just preloading logic here.
    }, 1000); // 1s delay before trailer fetch
  });

  img.addEventListener("mouseleave", () => {
    clearTimeout(timeout);
    if (iframe) { iframe.remove(); iframe = null; }
  });
}

/* =========================
   MODAL & PLAYER
========================= */
async function showDetails(item) {
  currentItem = item;
  
  // UI Updates
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  const stars = Math.round(item.vote_average / 2);
  document.getElementById("modal-rating").textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
  document.getElementById("modal").style.display = "flex";

  // Handle TV vs Movie controls
  const isTv = item.media_type === "tv" || item.first_air_date;
  const tvControls = document.getElementById("tv-controls");
  
  if (isTv) {
    tvControls.style.display = "block";
    await loadSeasons(item.id);
  } else {
    tvControls.style.display = "none";
  }

  // Set default server
  changeServer();
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const seasonSelect = document.getElementById("seasonSelect");
  seasonSelect.innerHTML = "";
  
  data.seasons.forEach(s => {
    if(s.season_number > 0) { // skip specials usually
        const opt = document.createElement("option");
        opt.value = s.season_number;
        opt.textContent = s.name;
        seasonSelect.appendChild(opt);
    }
  });
  
  // Load episodes for first season
  loadEpisodes();
}

async function loadEpisodes() {
  if (!currentItem) return;
  const seasonNum = document.getElementById("seasonSelect").value || 1;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`);
  
  const episodesGrid = document.getElementById("episodes");
  episodesGrid.innerHTML = data.episodes.map(ep => `
    <div class="episode-card" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
      <strong>Ep ${ep.episode_number}</strong>: ${ep.name}
    </div>
  `).join('');
}

function playEpisode(season, episode) {
    const server = document.getElementById("server").value;
    const iframe = document.getElementById("modal-video");
    // TV Show URL Format
    if(server.includes("vidsrc")) {
        iframe.src = `https://${server}/embed/tv/${currentItem.id}/${season}/${episode}`;
    } else {
        iframe.src = `https://${server}/tv/${currentItem.id}/${season}/${episode}`;
    }
}

function changeServer() {
  const server = document.getElementById("server").value;
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  const iframe = document.getElementById("modal-video");
  
  if (isTv) {
      // If TV, default to S1 E1 on server change
      const season = document.getElementById("seasonSelect").value || 1;
      playEpisode(season, 1);
  } else {
      // Movie URL Format
      if(server.includes("vidsrc")) {
          iframe.src = `https://${server}/embed/movie/${currentItem.id}`;
      } else {
          iframe.src = `https://${server}/movie/${currentItem.id}`;
      }
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
  resultsBox.innerHTML = "";

  data.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.onclick = () => { closeSearchModal(); showDetails(item); };
    resultsBox.appendChild(img);
  });
}

function openSearchModal() { document.getElementById("search-modal").style.display = "flex"; document.getElementById("search-input").focus(); }
function closeSearchModal() { document.getElementById("search-modal").style.display = "none"; }

/* =========================
   CATEGORIES
========================= */
async function initGenreBrowse() {
  const select = document.getElementById("genre-select");
  if (!select) return;
  
  const genres = await fetchJSON(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
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
    const items = data.results.map(i => ({...i, media_type: 'movie'}));
    displayList(items, "genre-movies-list");
  });
}

/* =========================
   INIT
========================= */
const toggleBtn = document.getElementById("theme-toggle");
toggleBtn.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
};

// Start App
showSkeleton("movies-list");
showSkeleton("tvshows-list");
showSkeleton("anime-list");

Promise.all([
  fetchTrending("movie"),
  fetchTrending("tv"),
  fetchTrendingAnime()
]).then(([movies, tv, anime]) => {
  autoRotateBanner(movies);
  displayList(movies, "movies-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
  initGenreBrowse();
});
       
