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
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

async function fetchTrending(type) {
  const data = await fetchJSON(
    `${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`
  );
  return data.results.filter(i => i.poster_path);
}

async function fetchTrendingAnime() {
  let anime = [];

  for (let page = 1; page <= 3; page++) {
    const data = await fetchJSON(
      `${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`
    );

    const filtered = data.results.filter(
      item =>
        item.original_language === "ja" &&
        item.genre_ids.includes(16) &&
        item.poster_path
    );

    anime.push(...filtered);
  }

  return anime;
}

/* =========================
   BANNER
========================= */
function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.opacity = 0;

  setTimeout(() => {
    banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    document.getElementById("banner-title").textContent =
      item.title || item.name;
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
   LIST RENDERING
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  items.forEach((item, i) => {
    const img = document.createElement("img");

    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.loading = "lazy";
    img.style.animationDelay = `${i * 40}ms`;

    img.classList.add("poster-item");

    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

/* =========================
   MODAL
========================= */
function showDetails(item) {
  currentItem = item;

  document.getElementById("modal-title").textContent =
    item.title || item.name;
  document.getElementById("modal-description").textContent =
    item.overview || "No description available.";
  document.getElementById("modal-image").src =
    `${IMG_URL}${item.poster_path}`;

  const stars = Math.round(item.vote_average / 2);
  document.getElementById("modal-rating").innerHTML =
    "★".repeat(stars) + "☆".repeat(5 - stars);

  changeServer();
  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
}

/* =========================
   VIDEO SERVERS
========================= */
function changeServer() {
  if (!currentItem) return;

  const server = document.getElementById("server").value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";

  switch (server) {
    case "vidsrc.cc":
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;
    case "vidsrc.me":
      embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
      break;
    case "player.videasy.net":
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
      break;
  }

  document.getElementById("modal-video").src = embedURL;
}

/* =========================
   SEARCH
========================= */
async function searchTMDB() {
  const query = document.getElementById("search-input").value.trim();
  const resultsBox = document.getElementById("search-results");

  if (!query) {
    resultsBox.innerHTML = "";
    return;
  }

  const data = await fetchJSON(
    `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`
  );

  resultsBox.innerHTML = "";

  data.results.forEach(item => {
    if (!item.poster_path) return;

    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };

    resultsBox.appendChild(img);
  });
}

function openSearchModal() {
  document.getElementById("search-modal").style.display = "flex";
  document.getElementById("search-input").focus();
}

function closeSearchModal() {
  document.getElementById("search-modal").style.display = "none";
  document.getElementById("search-results").innerHTML = "";
}

/* =========================
   INIT
========================= */
async function init() {
  try {
    const [movies, tvShows, anime] = await Promise.all([
      fetchTrending("movie"),
      fetchTrending("tv"),
      fetchTrendingAnime()
    ]);

    autoRotateBanner(movies);
    displayList(movies, "movies-list");
    displayList(tvShows, "tvshows-list");
    displayList(anime, "anime-list");
  } catch (err) {
    console.error("Failed to load content:", err);
  }
}

init();
document.querySelectorAll(".scroll-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const row = btn.parentElement.querySelector(".row-list");
    const scrollAmount = row.clientWidth * 0.8;
    row.scrollBy({
      left: btn.classList.contains("right") ? scrollAmount : -scrollAmount,
      behavior: "smooth"
    });
  });
});
document.addEventListener("keydown", e => {
  const row = document.querySelector(".row-list:hover");
  if (!row) return;

  if (e.key === "ArrowRight") row.scrollBy({ left: 300, behavior: "smooth" });
  if (e.key === "ArrowLeft") row.scrollBy({ left: -300, behavior: "smooth" });
  if (e.key === "Escape") closeModal();
});
const toggleBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme");

if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

toggleBtn.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
};
function toggleFavorite(item) {
  let favs = JSON.parse(localStorage.getItem("favorites")) || [];
  const exists = favs.find(f => f.id === item.id);

  if (exists) {
    favs = favs.filter(f => f.id !== item.id);
  } else {
    favs.push(item);
  }

  localStorage.setItem("favorites", JSON.stringify(favs));
  alert(exists ? "Removed from favorites" : "Added to favorites ❤️");
}
function showSkeleton(containerId, count = 8) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const div = document.createElement("div");
    div.className = "skeleton";
    container.appendChild(div);
  }
}
showSkeleton("movies-list");
showSkeleton("tvshows-list");
showSkeleton("anime-list");
async function getTrailer(id, type) {
  const data = await fetchJSON(
    `${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`
  );
  const trailer = data.results.find(v => v.type === "Trailer");
  return trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1` : null;
}
async function attachTrailerHover(img, item) {
  let iframe;

  img.addEventListener("mouseenter", async () => {
    const url = await getTrailer(item.id, item.media_type || "movie");
    if (!url) return;

    iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.className = "hover-trailer";
    img.parentElement.appendChild(iframe);
  });

  img.addEventListener("mouseleave", () => {
    if (iframe) iframe.remove();
  });
}
attachTrailerHover(img, item);
const PROFILE_KEY = "profiles";
const ACTIVE_PROFILE_KEY = "activeProfile";

function getProfiles() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY)) || [];
}

function setProfiles(profiles) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function setActiveProfile(profileId) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

function getActiveProfile() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

