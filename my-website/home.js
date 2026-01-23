/* =========================
   CONFIG & STATE
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerInterval = null;
let bannerCurrentItem = null;
let bannerItems = [];
let bannerIndex = 0;
let bannerLocked = false;

/* =========================
   FETCH HELPERS
========================= */
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

async function fetchTopRatedMovies() {
  const data = await fetchJSON(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`);
  return data ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" })) : [];
}

async function fetchLatestMovies() {
  const data = await fetchJSON(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}`);
  return data ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" })) : [];
}

async function fetchPinoyMovies() {
  const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=tl&sort_by=popularity.desc`;
  const data = await fetchJSON(url);
  return data ? data.results.map(m => ({ ...m, media_type: "movie" })) : [];
}

async function fetchTrendingAnime() {
  const data = await fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}`);
  return data ? data.results.filter(item => item.genre_ids.includes(16)).map(i => ({ ...i, media_type: "tv" })) : [];
}

/* =========================
   UI DISPLAY
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;
  container.innerHTML = "";
  
  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "poster-wrapper";
    wrapper.onclick = () => showDetails(item);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    
    wrapper.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" class="poster-item" loading="lazy">
      <div class="poster-rating"><i class="fa-solid fa-star"></i><span>${rating}</span></div>
    `;
    container.appendChild(wrapper);
  });
}

function scrollRow(id, amount) {
  document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' });
}

/* =========================
   BANNER LOGIC
========================= */
function setBanner(item) {
  const banner = document.getElementById("banner");
  if (!banner || !item) return;
  bannerCurrentItem = item;
  currentItem = item;
  banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent = item.title || item.name;
  document.getElementById("banner-desc").textContent = item.overview ? item.overview.substring(0, 150) + "..." : "";
}

function autoRotateBanner(items) {
  if (!items.length) return;
  setBanner(items[0]);
  bannerInterval = setInterval(() => {
    if (bannerLocked) return;
    bannerIndex = (bannerIndex + 1) % items.length;
    setBanner(items[bannerIndex]);
  }, 8000);
}

/* =========================
   CORE PLAYBACK (GUEST MODE)
========================= */
function startPlayback() {
  // Save to "Continue Watching" automatically
  localStorage.setItem("continueWatchingItem", JSON.stringify(currentItem));

  const container = document.querySelector(".video-container");
  const iframe = document.getElementById("modal-video");
  if (!currentItem || !iframe) return;

  container.classList.add("video-playing");
  const server = document.getElementById("server").value;
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;

  if (isTv) {
    const season = document.getElementById("seasonSelect").value || 1;
    iframe.src = `https://${server}/tv/${currentItem.id}/${season}/1`;
  } else {
    iframe.src = `https://${server}/movie/${currentItem.id}`;
  }
}

async function showDetails(item) {
  currentItem = item;
  document.body.style.overflow = "hidden"; 
  document.getElementById("modal").style.display = "block";
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview;
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  const isTv = item.media_type === "tv" || item.first_air_date;
  document.getElementById("tv-controls").style.display = isTv ? "block" : "none";
  
  if (isTv) await loadSeasons(item.id);

  // Fetch Similar
  const similarUrl = `${BASE_URL}/${isTv ? 'tv' : 'movie'}/${item.id}/similar?api_key=${API_KEY}`;
  const data = await fetchJSON(similarUrl);
  if (data) displayList(data.results.slice(0, 10), "similar-list");
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
  document.body.style.overflow = "auto";
}

/* =========================
   SEARCH & MENU
========================= */
function openSearchModal() { document.getElementById("search-modal").classList.add("active"); }
function closeSearchModal() { document.getElementById("search-modal").classList.remove("active"); }

async function searchTMDB() {
  const query = document.getElementById("search-input").value;
  if (query.length < 2) return;
  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  if (data) displayList(data.results.filter(i => i.poster_path), "search-results");
}

function toggleMenu() {
  const menu = document.getElementById("menuDrawer");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function goHome() { window.scrollTo({ top: 0, behavior: "smooth" }); }

/* =========================
   INITIALIZE
========================= */
window.addEventListener("load", () => {
  const saved = localStorage.getItem("continueWatchingItem");
  if (saved) {
    document.getElementById("continue-row").style.display = "block";
    displayList([JSON.parse(saved)], "continue-list");
  }

  Promise.all([
    fetchTrending("movie"),
    fetchLatestMovies(),
    fetchTopRatedMovies(),
    fetchTrending("tv"),
    fetchTrendingAnime(),
    fetchPinoyMovies()
  ]).then(([trending, latest, top, tv, anime, pinoy]) => {
    bannerItems = pinoy;
    autoRotateBanner(pinoy);
    displayList(trending, "movies-list");
    displayList(latest, "latest-movies-list");
    displayList(top, "top-rated-list");
    displayList(tv, "tvshows-list");
    displayList(anime, "anime-list");
    displayList(pinoy, "pinoy-list");
  });
});
    
