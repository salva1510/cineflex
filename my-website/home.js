const API_KEY = "742aa17a327005b91fb6602054523286"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerItem = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// 1. INITIALIZE GENRES DROPDOWN
async function initGenres() {
  const select = document.getElementById("genre-select");
  if (!select) return;

  try {
    const data = await fetchJSON(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
    select.innerHTML = '<option value="">Select a genre</option>';
    data.genres.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });
  } catch (e) {
    select.innerHTML = '<option value="">Error loading genres</option>';
  }
}

// 2. LOAD MOVIES FOR SELECTED GENRE
async function loadGenreMovies() {
  const genreId = document.getElementById("genre-select").value;
  const container = document.getElementById("genre-movies-list");
  
  if (!genreId) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "<p style='padding-left:4%'>Loading...</p>";

  try {
    const data = await fetchJSON(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
    const items = data.results.map(i => ({ ...i, media_type: 'movie' }));
    displayList(items, "genre-movies-list");
  } catch (e) {
    container.innerHTML = "<p>Failed to load movies.</p>";
  }
}

// UI HELPERS
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  items.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function setBanner(item) {
  bannerItem = item;
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9), transparent), url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent = item.title || item.name;
}

// MODAL & PLAYER LOGIC
async function showDetails(item) {
  currentItem = item;
  saveProgress(item); // If you are using the Continue Watching feature
  
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  document.getElementById("modal").style.display = "flex";

  const isTv = item.media_type === "tv" || item.first_air_date;
  if (isTv) {
    document.getElementById("tv-controls").style.display = "block";
    await loadSeasons(item.id);
  } else {
    document.getElementById("tv-controls").style.display = "none";
  }
  changeServer();
}

// ... (Rest of your server and scroll functions remain the same) ...

function scrollRow(id, amount) { document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' }); }
function closeModal() { document.getElementById("modal").style.display = "none"; document.getElementById("modal-video").src = ""; }

// STARTUP CALLS
document.addEventListener("DOMContentLoaded", () => {
  initGenres(); // Fills the dropdown
  
  Promise.all([
    fetchJSON(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`),
    fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}`)
  ]).then(([movies, tv]) => {
    setBanner(movies.results[0]);
    displayList(movies.results.map(i => ({...i, media_type: 'movie'})), "movies-list");
    displayList(tv.results.map(i => ({...i, media_type: 'tv'})), "tvshows-list");
  });
});
