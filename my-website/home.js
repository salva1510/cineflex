const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
  // Show Skeletons while loading
  showSkeletons("main-list");
  showSkeletons("tv-list");
  
  updateMyListUI();
  updateContinueUI();

  try {
    const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
    const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
    
    currentItem = trending.results[0];
    setBanner(currentItem);
    
    displayCards(trending.results, "main-list");
    displayCards(tvShows.results, "tv-list");
  } catch (err) {
    console.error("Failed to fetch data:", err);
  }
}

/* SKELETON LOADING */
function showSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
}

/* UI RENDERING */
function setBanner(item) {
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = data.filter(i => i.poster_path).map(item => {
    const date = item.release_date || item.first_air_date || "";
    const year = date ? date.split('-')[0] : "";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "NR";

    return `
      <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <div class="card-badges">
          <span class="badge-rating"><i class="fa-solid fa-star"></i> ${rating}</span>
          <span class="badge-year">${year}</span>
        </div>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
      </div>
    `;
  }).join('');
}

/* MODAL & PLAYER LOGIC */
async function showDetails(item) {
  currentItem = item;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  
  const details = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json());
  const runtime = details.runtime ? `${details.runtime}m` : (details.episode_run_time ? `${details.episode_run_time[0]}m` : "");

  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-meta-row").innerHTML = `<span>${item.vote_average.toFixed(1)} Rating</span> • <span>${runtime}</span>`;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  const btn = document.getElementById("mylist-btn");
  btn.innerHTML = myFavorites.some(f => f.id === item.id) ? `<i class="fa-solid fa-check"></i>` : `<i class="fa-solid fa-plus"></i>`;
  
  document.getElementById("details-modal").style.display = "flex";
}

function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const embedUrl = isTV ? `https://zxcstream.xyz/embed/tv/{tmdb-Id}/{season}/{episode}/1/1` : `https://zxcstream.xyz/embed/movie/{tmdb-Id}`;

  document.getElementById("video-player").src = embedUrl;
  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  addToContinueWatching(currentItem);
  closeModal();
  document.getElementById("player-container").scrollIntoView({ behavior: 'smooth' });
}

/* HISTORY & FAVORITES */
function addToContinueWatching(item) {
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  updateContinueUI();
}

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if (continueWatching.length > 0) {
    section.style.display = "block";
    displayCards(continueWatching, "continue-list");
  } else section.style.display = "none";
}

function toggleMyList() {
  const idx = myFavorites.findIndex(f => f.id === currentItem.id);
  if (idx === -1) myFavorites.push(currentItem);
  else myFavorites.splice(idx, 1);
  localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
  updateMyListUI();
  showDetails(currentItem);
}

function updateMyListUI() {
  const section = document.getElementById("my-list-section");
  if (myFavorites.length > 0) {
    section.style.display = "block";
    displayCards(myFavorites, "my-list");
  } else section.style.display = "none";
}

/* SEARCH & DEBOUNCE */
function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const processSearch = debounce((q) => handleSearch(q));

async function handleSearch(q) {
  if (q.length < 2) return;
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
  document.getElementById("search-results").innerHTML = res.results.filter(i => i.poster_path).map(item => `
    <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
      <img src="${IMG_URL}${item.poster_path}">
      <p>${item.title || item.name}</p>
    </div>
  `).join('');
}

/* GENRE & CONTROLS */
async function filterByGenre(id, el) {
  document.querySelectorAll('.genre-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (id === 'all') return init();
  
  showSkeletons("main-list");
  const data = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${id}`).then(r => r.json());
  displayCards(data.results, "main-list");
  document.getElementById("tv-section").style.display = "none";
}

async function playTrailer() {
  const type = currentItem.first_air_date ? 'tv' : 'movie';
  const data = await fetch(`${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}`).then(r => r.json());
  const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
}

function openDownload() { window.open(`https://getpvid.com/download/${currentItem.id}`, '_blank'); }
function openSearch() { document.getElementById("search-overlay").style.display = "block"; }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { document.getElementById("video-player").src = ""; document.getElementById("player-container").style.display = "none"; }

init();

