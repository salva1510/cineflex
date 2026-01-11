/* =========================
   UPDATED CONFIG & STATE
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerInterval = null;

/* =========================
   CORE FUNCTIONS
========================= */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB failed");
  return res.json();
}

// Fixed Fetching Logic
async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type }));
}

/* =========================
   UI RENDERING
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  items.forEach((item, i) => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.loading = "lazy";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

async function showDetails(item) {
  currentItem = item;
  const isTV = item.media_type === "tv" || !item.title;
  
  const modal = document.getElementById("modal");
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview;
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;

  const tvControls = document.getElementById("tv-controls");
  if (isTV) {
    tvControls.style.display = "block";
    await loadSeasons(item.id);
  } else {
    tvControls.style.display = "none";
    const server = await autoPickFastestServer(item.id, "movie");
    document.getElementById("modal-video").src = `https://${server}/embed/movie/${item.id}`;
  }

  modal.style.display = "flex";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
    document.getElementById("modal-video").src = ""; // Stop video on close
}

/* =========================
   PREMIUM FEATURES
========================= */
function toggleWatchlist() {
    let list = JSON.parse(localStorage.getItem("watchlist")) || [];
    const index = list.findIndex(i => i.id === currentItem.id);
    
    if(index > -1) {
        list.splice(index, 1);
        alert("Removed from Watchlist");
    } else {
        list.push(currentItem);
        alert("Added to Watchlist!");
    }
    localStorage.setItem("watchlist", JSON.stringify(list));
}

// Scroll Navbar Effect
window.onscroll = () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
};

/* =========================
   INITIALIZATION
========================= */
async function init() {
  try {
    const [movies, tv, anime] = await Promise.all([
      fetchTrending("movie"),
      fetchTrending("tv"),
      fetchTrendingAnime()
    ]);

    setBanner(movies[0]); // Initial Banner
    displayList(movies, "movies-list");
    displayList(tv, "tvshows-list");
    displayList(anime, "anime-list");
    
    initGenreBrowse();
  } catch (err) {
    console.error("Initialization Error:", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
