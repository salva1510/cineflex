const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500"; // Changed to w500 for faster search loading

let currentItem = null;

async function init() {
  const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
  const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
  
  currentItem = trending.results[0];
  setBanner(currentItem);
  
  displayCards(trending.results, "movies-list");
  displayCards(tvShows.results, "tvshows-list");
}

function setBanner(item) {
  document.getElementById("banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}">
    </div>
  `).join('');
}

/* SEARCH LOGIC */
function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("search-input").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

async function handleSearch(query) {
  if (query.length < 2) {
    document.getElementById("search-results").innerHTML = "";
    return;
  }
  
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`).then(r => r.json());
  const grid = document.getElementById("search-results");
  
  grid.innerHTML = res.results.filter(i => i.poster_path).map(item => `
    <div class="search-card" onclick='selectFromSearch(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}">
      <p>${item.title || item.name}</p>
    </div>
  `).join('');
}

function selectFromSearch(item) {
  closeSearch();
  showDetails(item);
}

/* PLAYER LOGIC */
function startPlayback() {
  if (!currentItem) return;
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const embedUrl = isTV ? `https://zxcstream.xyz/embed/tv/${id}/1/1` : `https://zxcstream.xyz/embed/movie/${id}`;

  document.getElementById("video-player").src = embedUrl;
  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  closeModal();
  document.getElementById("player-container").scrollIntoView({ behavior: 'smooth' });
}

function showDetails(item) {
  currentItem = item;
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("details-modal").style.display = "flex";
}

function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { document.getElementById("video-player").src = ""; document.getElementById("player-container").style.display = "none"; }

init();

