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
    
  });
}

/* =========================
   MODAL
========================= */
function showDetails(item) {
async function showDetails(item) {
  currentItem = item;
  const isTV = item.media_type === "tv" || !item.title; // TMDB TV shows use 'name', not 'title'

  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;

  const stars = Math.round(item.vote_average / 2);
  document.getElementById("modal-rating").innerHTML = "★".repeat(stars) + "☆".repeat(5 - stars);

  const tvControls = document.getElementById("tv-controls");
  
  if (isTV) {
    tvControls.style.display = "block";
    await loadSeasons(item.id);
  } else {
    tvControls.style.display = "none";
    const type = "movie";
    const fastestServer = await autoPickFastestServer(item.id, type);
    document.getElementById("server").value = fastestServer || "vidsrc.cc";
    changeServer();
  }

  document.getElementById("modal").style.display = "flex";
}
   
/* =========================
   VIDEO SERVERS
========================= */
function playEpisode(season, episode) {
  const server = document.getElementById("server").value;
  let embedURL = "";

  // Update global tracking (optional)
  currentSeason = season;
  currentEpisode = episode;

  if (server === "vidsrc.cc") {
    embedURL = `https://vidsrc.cc/v2/embed/tv/${currentItem.id}/${season}/${episode}`;
  } else if (server === "vsrc.su") {
    embedURL = `https://vsrc.su/embed/tv/${currentItem.id}/${season}/${episode}`;
  } else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/tv/${currentItem.id}/${season}/${episode}`;
  }

  document.getElementById("modal-video").src = embedURL;
  
  // Highlight active episode card
  document.querySelectorAll('.episode-card').forEach(card => card.classList.remove('active'));
  event.currentTarget.classList.add('active');
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
  const next = current === "dark" ? "light" : "dark";
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

   async function loadSeasons(tvId) {
  try {
    const data = await fetchJSON(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
    const select = document.getElementById("seasonSelect");
    select.innerHTML = "";

    data.seasons.forEach(season => {
      // Filter out 'Specials' (Season 0) if desired
      if (season.season_number > 0) {
        const option = document.createElement("option");
        option.value = season.season_number;
        option.textContent = `Season ${season.season_number}`;
        select.appendChild(option);
      }
    });

    // Automatically load the first season's episodes
    if (data.seasons.length > 0) {
      loadEpisodes();
    }
  } catch (err) {
    console.error("Error fetching seasons:", err);
  }
}

async function loadEpisodes() {
  const tvId = currentItem.id;
  const seasonNum = document.getElementById("seasonSelect").value;
  const episodeContainer = document.getElementById("episodes");
  
  episodeContainer.innerHTML = "<p>Loading episodes...</p>";

  try {
    const data = await fetchJSON(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
    episodeContainer.innerHTML = "";

    data.episodes.forEach(ep => {
      const epCard = document.createElement("div");
      epCard.className = "episode-card";
      epCard.innerHTML = `
        <h4>EP ${ep.episode_number}: ${ep.name}</h4>
        <p>${ep.air_date || "N/A"}</p>
      `;
      
      epCard.onclick = () => playEpisode(seasonNum, ep.episode_number);
      episodeContainer.appendChild(epCard);
    });
  } catch (err) {
    episodeContainer.innerHTML = "<p>Error loading episodes.</p>";
  }
}
   




























































