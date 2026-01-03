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
    const card = document.createElement("div");
    card.className = "netflix-card";

    card.innerHTML = `
      <img class="poster" src="${IMG_URL}${item.poster_path}">
      <video
        class="preview"
        muted
        loop
        playsinline
        preload="none"
      ></video>
    `;

    card.onclick = () => showDetails(item);
    container.appendChild(card);

    attachNetflixPreview(card, item);
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
      const server = document.getElementById('server').value;
      const type = currentItem.media_type === "movie" ? "movie" : "tv";
      let embedURL = "";

      if (server === "vidsrc.cc") {
        embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      } else if (server === "vidsrc.me") {
        embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
      } else if (server === "player.videasy.net") {
        embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
      } 
  
  document.getElementById("modal-video").src = embedURL;
}


/* =========================
   SEARCH
========================= */
async function searchTMDB() {
  const query = document.getElementById("search-input").value.trim();
  const resultsBox = document.getElementById("search-results");
    let searchTimeout;

async function liveSearch(query) {
  clearTimeout(searchTimeout);
  const dropdown = document.getElementById("search-dropdown");

  if (!query.trim()) {
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
    return;
  }

  // Debounce (wait a bit before searching)
  searchTimeout = setTimeout(async () => {
    try {
      const data = await fetchJSON(
        `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
      );

      const results = data.results.filter(item => item.poster_path).slice(0, 6);
      if (!results.length) {
        dropdown.innerHTML = `<div>No results found</div>`;
        dropdown.style.display = "flex";
        return;
      }

      dropdown.innerHTML = results
        .map(
          item => `
          <div onclick="selectSearchResult(${item.id}, '${item.media_type}')">
            <img src="${IMG_URL}${item.poster_path}" alt="">
            <span>${item.title || item.name}</span>
          </div>
        `
        )
        .join("");

      dropdown.style.display = "flex";
    } catch (err) {
      console.error("Search failed", err);
    }
  }, 400);
}

async function selectSearchResult(id, type) {
  const dropdown = document.getElementById("search-dropdown");
  dropdown.style.display = "none";

  try {
    const item = await fetchJSON(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
    showDetails(item);
  } catch (err) {
    console.error("Failed to fetch item details", err);
  }
}

// Hide dropdown when clicking outside
document.addEventListener("click", e => {
  const dropdown = document.getElementById("search-dropdown");
  const searchBar = document.getElementById("search-bar");
  if (!dropdown || !searchBar) return;
  if (!dropdown.contains(e.target) && !searchBar.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

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
function personalizedGreeting() {
  const hour = new Date().getHours();
  let greeting = "Welcome";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  let visits = Number(localStorage.getItem("visits") || 0) + 1;
  localStorage.setItem("visits", visits);

  document.getElementById("banner-title").textContent =
    `${greeting}! Visit #${visits}`;
}
attachTrailerHover(img, item);
window.addEventListener("load", () => {
  const logo = document.querySelector(".logo");
  logo.classList.add("netflix-intro");
});
document.addEventListener("DOMContentLoaded", () => {
  const logo = document.getElementById("cineflex-logo");

  const dunSound = new Audio("assets/netflix-dun.mp3");
  dunSound.volume = 0.6;

  let played = false;

  const playDun = () => {
    if (played) return;
    played = true;
    dunSound.play().catch(() => {});
  };

  // Play on first user interaction (browser-safe)
  window.addEventListener("click", playDun, { once: true });
  window.addEventListener("keydown", playDun, { once: true });
});
async function autoPickFastestServer(movieId, type = "movie") {
  const servers = [
    "vidsrc.cc",
    "vidsrc.me",
    "player.videasy.net"
  ];

  const testResults = [];

  for (const server of servers) {
    const start = performance.now();

    try {
      const testUrl =
        type === "movie"
          ? `https://${server}/embed/movie/${movieId}`
          : `https://${server}/embed/tv/${movieId}`;

      // lightweight HEAD request
      await fetch(testUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store"
      });

      const time = performance.now() - start;
      testResults.push({ server, time });
    } catch {
      // ignore failed servers
    }
  }

  if (!testResults.length) return servers[0];

  testResults.sort((a, b) => a.time - b.time);
  return testResults[0].server;
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch(err => console.error("SW failed", err));
  });
}
let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").style.display = "block";
});

document.getElementById("installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});
let currentShow = null;
let currentSeason = 1;
let currentEpisode = 1;
document.querySelectorAll(".preview-card").forEach(card => {
  const video = card.querySelector(".preview-video");

  // Desktop hover
  card.addEventListener("mouseenter", () => {
    video.currentTime = 0;
    video.play().catch(() => {});
  });

  card.addEventListener("mouseleave", () => {
    video.pause();
  });

  // Mobile tap
  card.addEventListener("touchstart", () => {
    video.currentTime = 0;
    video.play().catch(() => {});
  });
});
async function attachNetflixPreview(card, item) {
  const video = card.querySelector(".preview");
  let hoverTimer;

  card.addEventListener("mouseenter", async () => {
    hoverTimer = setTimeout(async () => {
      const trailer = await getTrailer(item.id, item.media_type || "movie");
      if (!trailer) return;

      video.src = trailer;
      video.style.opacity = 1;
      video.play().catch(() => {});
    }, 500); // Netflix-style delay
  });

  card.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimer);
    video.pause();
    video.src = "";
    video.style.opacity = 0;
  });
}

















