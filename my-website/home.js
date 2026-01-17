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
  const data = await fetchJSON(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`);
  return data ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" })) : [];
}

async function fetchLatestMovies() {
  const data = await fetchJSON(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`);
  return data ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" })) : [];
}

async function fetchTrendingAnime() {
  let anime = [];
  for (let page = 1; page <= 2; page++) {
    const data = await fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    if (data) {
      const filtered = data.results.filter(item => item.original_language === "ja" && item.genre_ids.includes(16) && item.poster_path);
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
  container.innerHTML = Array(8).fill('<div class="skeleton"></div>').join('');
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.loading = "lazy";
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
    const bannerDesc = document.getElementById("banner-desc");
    if(bannerDesc) bannerDesc.textContent = item.overview ? item.overview.substring(0, 150) + "..." : "";
    banner.style.opacity = 1;
  }, 300);
}

function autoRotateBanner(items) {
  if (!items || items.length === 0) return;
  let index = 0;
  setBanner(items[index]);
  clearInterval(bannerInterval);
  bannerInterval = setInterval(() => {
    index = (index + 1) % items.length;
    setBanner(items[index]);
  }, 8000);
}

/* =========================
   MODAL & PLAYER
========================= */
async function showDetails(item) {
  currentItem = item;
  document.body.style.overflow = "hidden"; 
  
  const modal = document.getElementById("modal");
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  const stars = Math.round(item.vote_average / 2);
  document.getElementById("modal-rating").innerHTML = "★".repeat(stars) + `<span style="opacity:0.2">${"★".repeat(5-stars)}</span>` + ` (${item.vote_average.toFixed(1)})`;
  
  modal.style.display = "block";

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
      <strong>EPISODE ${ep.episode_number}</strong>
      <span>${ep.name}</span>
    </div>
  `).join('');
  
  document.getElementById("modal").scrollTo({ top: 0, behavior: 'smooth' });
  playEpisode(seasonNum, 1);
}

function playEpisode(season, episode) {
    const server = document.getElementById("server").value;
    const iframe = document.getElementById("modal-video");
    iframe.src = `https://${server}/tv/${currentItem.id}/${season}/${episode}`;
}

function changeServer() {
  const server = document.getElementById("server").value;
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  const iframe = document.getElementById("modal-video");
  
  if (isTv) {
      const season = document.getElementById("seasonSelect").value || 1;
      playEpisode(season, 1);
  } else {
      iframe.src = `https://${server}/movie/${currentItem.id}`;
  }
}
/* =========================
   SEARCH SYSTEM
========================= */

function openSearchModal() {
  const modal = document.getElementById("search-modal");
  modal.classList.add("active");

  document.body.style.overflow = "hidden";

  // Netflix-style instant focus
  setTimeout(() => {
    document.getElementById("search-input").focus();
  }, 250);
}

function closeSearchModal() {
  const modal = document.getElementById("search-modal");
  modal.classList.remove("active");

  document.body.style.overflow = "auto";

  setTimeout(() => {
    document.getElementById("search-results").innerHTML = "";
    document.getElementById("search-input").value = "";
  }, 300);
}

async function searchTMDB() {
  const input = document.getElementById("search-input");
  const resultsBox = document.getElementById("search-results");
  const query = input.value.trim();

  if (query.length < 2) {
    resultsBox.innerHTML = "";
    return;
  }

  const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const data = await fetchJSON(url);

  if (!data || !data.results) return;

  const items = data.results.filter(
    item =>
      item.poster_path &&
      (item.media_type === "movie" || item.media_type === "tv")
  );

  resultsBox.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "search-card";

    card.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}">
      <h4>${item.title || item.name}</h4>
      <span>${item.media_type.toUpperCase()}</span>
    `;

    // ✅ SAFE CLICK (same as rows)
    card.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };

    resultsBox.appendChild(card);
  });
}


/* =========================
   INITIALIZE
========================= */
const saved = localStorage.getItem("continueWatchingItem");
if (saved) {
  const item = JSON.parse(saved);
  document.getElementById("continue-row").style.display = "block";
  displayList([item], "continue-list");
}
showSkeleton("movies-list");
showSkeleton("latest-movies-list");
showSkeleton("top-rated-list");
showSkeleton("tvshows-list");
showSkeleton("anime-list");

Promise.all([
  fetchTrending("movie"),
  fetchLatestMovies(),
  fetchTopRatedMovies(),
  fetchTrending("tv"),
  fetchTrendingAnime()
]).then(([trending, latest, top, tv, anime]) => {
  autoRotateBanner(trending);
  displayList(trending, "movies-list");
  displayList(latest, "latest-movies-list");
  displayList(top, "top-rated-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
});

function goHome() { window.scrollTo({ top: 0, behavior: "smooth" }); }
function toggleMenu() {
  const menu = document.getElementById("menuDrawer");
  const overlay = document.getElementById("menuOverlay");

  const isOpen = menu.style.display === "flex";

  menu.style.display = isOpen ? "none" : "flex";
  overlay.style.display = isOpen ? "none" : "block";

  document.body.style.overflow = isOpen ? "auto" : "hidden";
}

function closeMenu() {
  document.getElementById("menuDrawer").style.display = "none";
  document.getElementById("menuOverlay").style.display = "none";
  document.body.style.overflow = "auto";
}
function openAccount() {
  document.getElementById("accountModal").style.display = "block";
  document.body.style.overflow = "hidden";
  updateAccountUI();
}

function closeAccount() {
  document.getElementById("accountModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;

      localStorage.setItem("cineflexUser", JSON.stringify({
        name: user.displayName,
        email: user.email,
        photo: user.photoURL
      }));

      function updateAccountUI() {
  const userRaw = localStorage.getItem("cineflexUser");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const usernameInput = document.getElementById("usernameInput");
  const accountStatus = document.getElementById("accountStatus");

  if (!accountStatus) return;

  if (loginBtn) loginBtn.style.display = user ? "none" : "block";
  if (logoutBtn) logoutBtn.style.display = user ? "block" : "none";
  if (usernameInput) usernameInput.style.display = "none";

  accountStatus.innerHTML = user
    ? `<img src="${user.photo}" style="width:40px;border-radius:50%;margin-bottom:6px;"><br>${user.name}`
    : "Login to continue";
}
      function highlightAccount(active) {
  const buttons = document.querySelectorAll(".mobile-footer button");

  // SAFETY CHECK
  if (!buttons || buttons.length < 4) return;

  const accountBtn = buttons[3];
  if (!accountBtn) return;

  accountBtn.style.color = active ? "#e50914" : "#888";
}
      function closeAccount() {
  const modal = document.getElementById("accountModal");
  if (!modal) return;

  modal.style.display = "none";
  document.body.style.overflow = "auto";
}
    })
    .catch((error) => {
      alert(error.message);
    });
}
function updateAccountUI() {
  const userRaw = localStorage.getItem("cineflexUser");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const logoutBtn = document.getElementById("logoutBtn");
  const googleBtn = document.getElementById("googleLoginBtn");
  const accountStatus = document.getElementById("accountStatus");

  if (!accountStatus) return;

  if (user) {
    if (logoutBtn) logoutBtn.style.display = "block";
    if (googleBtn) googleBtn.style.display = "none";

    accountStatus.innerHTML = `
      <img src="${user.photo}"
           style="width:56px;height:56px;border-radius:50%;margin-bottom:10px;">
      <div style="font-weight:bold">${user.name}</div>
      ${user.email ? `<div style="font-size:12px;opacity:.7">${user.email}</div>` : ""}
    `;
  } else {
    if (logoutBtn) logoutBtn.style.display = "none";
    if (googleBtn) googleBtn.style.display = "block";

    accountStatus.textContent = "Login with Google to continue";
  }
}
function logoutAccount() {
  // Firebase logout
  if (typeof auth !== "undefined") {
    auth.signOut().catch(() => {});
  }

  localStorage.removeItem("cineflexUser");

  updateAccountUI();
  highlightAccount(false);
}

/* AUTO CHECK ON LOAD */
window.addEventListener("load", () => {
  if (localStorage.getItem("cineflexUser")) {
    highlightAccount(true);
  }
});
function startPlayback() {
  const user = localStorage.getItem("cineflexUser");

  // 🔒 BLOCK IF NOT LOGGED IN
  if (!user) {
    openAccount(); // show login modal
    alert("Please login with Google to play this video.");
    return;
  }

  // ✅ USER LOGGED IN — ALLOW PLAY
  localStorage.setItem("continueWatchingItem", JSON.stringify(currentItem));

  const container = document.querySelector(".video-container");
  const iframe = document.getElementById("modal-video");

  if (!currentItem || !container || !iframe) return;

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
window.addEventListener("load", () => {
  if (localStorage.getItem("cineflexUser")) {
    updateAccountUI();
    highlightAccount(true);
  }
});
