/* =========================
   CONFIG
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerInterval = null;

function getConnectionProfile() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!conn) {
    return {
      quality: "high",
      server: "vidsrc.cc"
    };
  }

  // Save-Data mode (Android / Chrome)
  if (conn.saveData) {
    return {
      quality: "low",
      server: "player.videasy.net"
    };
  }

  // Effective connection types
  switch (conn.effectiveType) {
    case "slow-2g":
    case "2g":
      return {
        quality: "low",
        server: "player.videasy.net"
      };

    case "3g":
      return {
        quality: "medium",
        server: "vidsrc.me"
      };

    case "4g":
    default:
      return {
        quality: "high",
        server: "vidsrc.cc"
      };
  }
}

/* =========================
   FETCH HELPERS
========================= */
async function fetchTrending(type) {
  const data = await fetchJSON(
    `${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`
  );
  return data.results
    .filter(i => i.poster_path)
    .map(i => ({ ...i, media_type: type }));
}
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
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
// Get trailer URL from TMDB
// 1) Ask TMDB for a trailer and return a YouTube URL
async function getTrailer(id, type) {
  try {
    const data = await fetchJSON(
      `${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=en-US`
    );

    if (!data.results || !data.results.length) {
      console.log("No videos found for", id, type);
      return null;
    }

    // Prefer official Trailer
    const trailer =
      data.results.find(v => v.type === "Trailer" && v.site === "YouTube") ||
      data.results.find(v => v.site === "YouTube");

    if (!trailer) {
      console.log("No YouTube trailer found for", id, type);
      return null;
    }

    const url = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`;
    console.log("Trailer URL:", url);
    return url;
  } catch (err) {
    console.error("Error fetching trailer:", err);
    return null;
  }
}

// 2) Add hover behavior to one poster image
function attachTrailerHover(img, item) {
  let iframe;

  img.addEventListener("mouseenter", async () => {
    // Avoid creating multiple iframes if you wiggle the mouse
    if (iframe) return;

    const type = item.media_type || (item.first_air_date ? "tv" : "movie");
    const url = await getTrailer(item.id, type);
    if (!url) return; // no trailer, do nothing

    iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.className = "hover-trailer";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "autoplay; encrypted-media");
    iframe.setAttribute("allowfullscreen", "true");

    // SIMPLE: put trailer right under the poster for now
    iframe.style.display = "block";
    iframe.style.width = "100%";
    iframe.style.height = "180px";
    iframe.style.marginTop = "5px";

    // Wrap img + iframe in a small container
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";

    img.parentElement.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrapper.appendChild(iframe);
  });

  img.addEventListener("mouseleave", () => {
    if (iframe) {
      iframe.remove();
      iframe = null;
      // We do NOT unwrap img for simplicity – it still works fine
    }
  });
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
    img.style.animationDelay = `${i * 40}ms`;
    img.classList.add("poster-item");

    // Click: open details modal
    img.onclick = () => showDetails(item);

    // Hover: show trailer (IMPORTANT)
    attachTrailerHover(img, item);

    container.appendChild(img);
  });
}

/* =========================
   MODAL
========================= */
   async function showDetails(item) {
  currentItem = item;

  // Set Modal Text & Image
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;

  // Rating Stars
  const stars = Math.round(item.vote_average / 2);
  document.getElementById("modal-rating").innerHTML = "★".repeat(stars) + "☆".repeat(5 - stars);

  // Show Modal early so user sees it loading
  document.getElementById("modal").style.display = "flex";

  // Pick Server: Try to auto-pick, fallback to bandwidth profile
  const type = (item.media_type === "movie" || !item.first_air_date) ? "movie" : "tv";
  const fastestServer = await autoPickFastestServer(item.id, type);
  
  const profile = getConnectionProfile();
  document.getElementById("server").value = fastestServer || profile.server;

  changeServer();
}
  function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
}
   
/* =========================
   VIDEO SERVERS
========================= */
function changeServer() {
  const server = document.getElementById("server").value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";

  if (server === "vidsrc.cc") {
    embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;

  } else if (server === "vsrc.su") {
    // ✅ vsrc.su embed
    embedURL = `https://vsrc.su/embed/${type}/${currentItem.id}`;

  } else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }

  const iframe = document.getElementById("modal-video");
  iframe.src = embedURL;
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

  // Initialize Browse by Category (after main content)
  initGenreBrowse();
}

init();
     /* =========================
   GENRES / BROWSE BY CATEGORY
========================= */
async function fetchGenres() {
  const data = await fetchJSON(
    `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`
  );
  return data.genres; // [{ id, name }, ...]
}

async function fetchByGenre(genreId, page = 1) {
  const data = await fetchJSON(
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
  );

  // Make sure each result has media_type "movie" so your existing code works
  return data.results
    .filter(item => item.poster_path)
    .map(item => ({ ...item, media_type: "movie" }));
}

async function initGenreBrowse() {
  const select = document.getElementById("genre-select");
  const containerId = "genre-movies-list";

  if (!select) return;

  // Show skeletons in the category list while loading genres
  //showSkeleton(containerId);

  try {
    const genres = await fetchGenres();

    // Clear and fill dropdown
    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a genre";
    select.appendChild(defaultOption);

    genres.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });

    // When the user picks a genre
    select.addEventListener("change", async () => {
      const genreId = select.value;
      const listEl = document.getElementById(containerId);

      if (!genreId) {
        listEl.innerHTML = "";
        return;
      }

      // Show skeletons while loading movies
      showSkeleton(containerId);

      try {
        const items = await fetchByGenre(genreId);
        displayList(items, containerId); // uses your existing click-to-open-modal logic
      } catch (err) {
        console.error("Failed to load movies for this genre:", err);
        listEl.innerHTML =
          "<p style='margin: 20px; color: #aaa;'>Failed to load movies for this category.</p>";
      }
    });
  } catch (err) {
    console.error("Failed to load genres:", err);
    // Hide the whole section if genres fail
    const row = document.getElementById("browse-category-row");
    if (row) row.style.display = "none";
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
 {
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
}
async function loadEpisodes() {
  if (!currentItem || !currentItem.first_air_date) return;
  
  const seasonNum = document.getElementById("seasonSelect").value;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`);
  
  const episodesGrid = document.getElementById("episodes");
  episodesGrid.innerHTML = data.episodes.map(ep => `
    <div class="episode-card" onclick="playEpisode(${ep.episode_number})">
      <h4>Ep ${ep.episode_number}: ${ep.name}</h4>
      <p>${ep.air_date}</p>
    </div>
  `).join('');
}

function playEpisode(epNum) {
  currentEpisode = epNum;
  const server = document.getElementById("server").value;
  const season = document.getElementById("seasonSelect").value;
  
  // Update iframe for TV show format: /tv/id/season/episode
  let url = `https://${server}/embed/tv/${currentItem.id}/${season}/${epNum}`;
  document.getElementById("modal-video").src = url;
}



































































