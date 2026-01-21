/* =========================
   CONFIG
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
let isLoggingIn = false; // This is our Gatekeeper


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
async function fetchPinoyMovies() {
  // Using 'tl' (Tagalog) as the original language filter for Filipino movies
  const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=tl&sort_by=popularity.desc`;
  const data = await fetchJSON(url);
  return data ? data.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: "movie" })) : [];
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
async function filterByGenre(genreId, element) {
  // 1. UI Update: Change active button
  document.querySelectorAll('.genre-pill').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');

  // 2. Clear current rows to show the results
  const mainContent = document.querySelector('main');
  
  if (genreId === 'all') {
      location.reload(); // Simplest way to go back to default
      return;
  }

  // 3. Fetch from TMDB by Genre
  const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`;
  const data = await fetchJSON(url);

  if (data && data.results) {
    // We will clear and repurpose the first row to show results
    const trendingList = document.getElementById("movies-list");
    const trendingHeader = trendingList.parentElement.querySelector('h2');
    
    trendingHeader.innerText = element.innerText + " Movies";
    displayList(data.results, "movies-list");
    
    // Hide other rows to make it look like a filtered view
    document.getElementById("tvshows-list").parentElement.parentElement.style.display = 'none';
    document.getElementById("top-rated-list").parentElement.parentElement.style.display = 'none';
  }
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
    const wrapper = document.createElement("div");
    wrapper.className = "poster-wrapper";
    wrapper.onclick = () => showDetails(item);

    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    
    wrapper.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" class="poster-item" loading="lazy">
      <div class="poster-rating">
        <i class="fa-solid fa-star"></i>
        <span>${rating}</span>
      </div>
    `;
    container.appendChild(wrapper);
  });
}

function scrollRow(id, amount) {
  const row = document.getElementById(id);
  row.scrollBy({ left: amount, behavior: 'smooth' });
}

/* =========================
   BANNER LOGIC
========================= */
/* =========================
   UPDATED BANNER LOGIC
========================= */
function setBanner(item) {
  const banner = document.getElementById("banner");
  if (!banner || !item) return;

  bannerCurrentItem = item;
  currentItem = item;

  banner.style.opacity = 0;

  setTimeout(() => {
    // UPDATED: Apply both a gradient and the dynamic image
    banner.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0) 50%), url(${IMG_URL}${item.backdrop_path})`;
    
    document.getElementById("banner-title").textContent = item.title || item.name;

    const bannerDesc = document.getElementById("banner-desc");
    if (bannerDesc) {
      bannerDesc.textContent = item.overview
        ? item.overview.substring(0, 150) + "..."
        : "";
    }

    banner.style.opacity = 1;
  }, 300);
}

function autoRotateBanner(items) {
  if (!items || items.length === 0) return;

  bannerIndex = 0;
  setBanner(items[bannerIndex]);

  clearInterval(bannerInterval);
  bannerInterval = setInterval(() => {
    if (bannerLocked) return;
    bannerIndex = (bannerIndex + 1) % items.length;
    setBanner(items[bannerIndex]);
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
   // --- START OF SIMILAR MOVIES CODE ---
  const similarContainer = document.getElementById("similar-list");
  similarContainer.innerHTML = "Loading..."; // Show loading text

  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const similarUrl = `${BASE_URL}/${type}/${item.id}/similar?api_key=${API_KEY}`;

  fetch(similarUrl)
    .then(res => res.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        // This uses your existing displayList function to show the cards
        displayList(data.results.slice(0, 10), "similar-list");
      } else {
        similarContainer.innerHTML = "No similar titles found.";
      }
    })
    .catch(err => console.error("Error fetching similar:", err));
  // --- END OF SIMILAR MOVIES CODE ---
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

  // Find this section inside searchTMDB items.forEach loop:
items.forEach(item => {
  const card = document.createElement("div");
  card.className = "search-card";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";

  card.innerHTML = `
    <div class="poster-wrapper">
      <img src="${IMG_URL}${item.poster_path}">
      <div class="poster-rating">
        <i class="fa-solid fa-star"></i>
        <span>${rating}</span>
      </div>
    </div>
    <h4>${item.title || item.name}</h4>
    <span>${item.media_type.toUpperCase()}</span>
  `;
  
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
showSkeleton("pinoy-list");
showSkeleton("movies-list");
showSkeleton("latest-movies-list");
showSkeleton("top-rated-list");
showSkeleton("tvshows-list");
showSkeleton("anime-list");

// Add the skeleton for the new list
showSkeleton("pinoy-list");

Promise.all([
  fetchTrending("movie"),
  fetchLatestMovies(),
  fetchTopRatedMovies(),
  fetchTrending("tv"),
  fetchTrendingAnime(),
  fetchPinoyMovies() // <--- Add this
]).then(([trending, latest, top, tv, anime, pinoy]) => { // <--- Add pinoy here
  bannerItems = pinoy;
  autoRotateBanner(pinoy);
  displayList(trending, "movies-list");
  displayList(latest, "latest-movies-list");
  displayList(top, "top-rated-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
  displayList(pinoy, "pinoy-list"); // <--- Add this
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

async function googleLogin() {
  // 1. Check if the Gatekeeper is already busy
  if (isLoggingIn) {
    return; // Stop here! Don't do anything else.
  }

  // 2. Lock the door so no more clicks get through
  isLoggingIn = true;

  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    // Start the Firebase popup
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Save user data to the browser
    localStorage.setItem("cineflexUser", JSON.stringify({
      name: user.displayName,
      email: user.email,
      photo: user.photoURL
    }));

    // Update your website look (UI)
    updateAccountUI(); 
    closeLoginPopup();

  } catch (error) {
    // 3. Handle the error silently if it's just a double-click/cancel
    if (error.code !== 'auth/cancelled-popup-request') {
      console.error("Login Error:", error.message);
      alert("Login failed. Please try again.");
    }
  } finally {
    // 4. UNLOCK the door so the user can try again later
    isLoggingIn = false;
  }
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
    openLoginPopup();
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
/* =========================
   SLIDING FOOTER INDICATOR
========================= */

const footerButtons = document.querySelectorAll(".mobile-footer button");
const indicator = document.querySelector(".footer-indicator");

function moveIndicator(index) {
  footerButtons.forEach(btn => btn.classList.remove("active"));

  const btn = footerButtons[index];
  if (!btn) return;

  btn.classList.add("active");

  const btnRect = btn.getBoundingClientRect();
  const footerRect = btn.parentElement.getBoundingClientRect();

  const centerX = btnRect.left - footerRect.left + btnRect.width / 2 - 26;

  indicator.style.transform = `translateX(${centerX}px)`;
}

/* HOME */
footerButtons[0].onclick = () => {
  moveIndicator(0);
  goHome();
};

/* SEARCH */
footerButtons[1].onclick = () => {
  moveIndicator(1);
  openSearchModal();
};

/* MENU */
footerButtons[2].onclick = () => {
  moveIndicator(2);
  toggleMenu();
};

/* ACCOUNT */
footerButtons[3].onclick = () => {
  moveIndicator(3);
  openAccount();
};

/* DEFAULT */
window.addEventListener("load", () => {
  moveIndicator(0);
});
/* =========================
   PLAY BANNER MOVIE
========================= */

function playBanner() {
  if (!currentItem) return;

  // Open details modal
  showDetails(currentItem);

  // Auto start playback
  setTimeout(() => {
    startPlayback();
  }, 600);
}
/* =========================
   BANNER TAP LOGIC
========================= */

function activateBanner() {
  const banner = document.getElementById("banner");
  banner.classList.toggle("active");
}

function playBanner(event) {
  event.stopPropagation();

  if (!bannerCurrentItem) return;

  showDetails(bannerCurrentItem);

  setTimeout(() => {
    startPlayback();
  }, 600);
}
/* =========================
   SWIPE BANNER (MOBILE)
========================= */

const bannerEl = document.getElementById("banner");
let touchStartX = 0;
let touchEndX = 0;

bannerEl.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

bannerEl.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleBannerSwipe();
});

function handleBannerSwipe() {
  if (!bannerItems.length) return;

  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) < 50) return; // ignore small swipes

  bannerLocked = true; // ⛔ stop auto slide

  if (diff > 0) {
    // 👉 Swipe LEFT (next)
    bannerIndex = (bannerIndex + 1) % bannerItems.length;
  } else {
    // 👈 Swipe RIGHT (prev)
    bannerIndex =
      (bannerIndex - 1 + bannerItems.length) % bannerItems.length;
  }

  setBanner(bannerItems[bannerIndex]);

  // reset active state
  document.getElementById("banner").classList.remove("active");
}
function openLoginPopup() {
  const popup = document.getElementById("loginPopup");
  if (popup) popup.style.display = "flex";
}

function closeLoginPopup() {
  const popup = document.getElementById("loginPopup");
  if (popup) popup.style.display = "none";
}
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  closeMenu();
}
