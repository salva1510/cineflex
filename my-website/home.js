const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerItems = [];

/* FETCH DATA */
async function init() {
  const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
  const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
  
  bannerItems = trending.results;
  setBanner(bannerItems[0]);
  
  displayCards(trending.results, "movies-list");
  displayCards(tvShows.results, "tvshows-list");
}

function setBanner(item) {
  bannerCurrentItem = item;
  document.getElementById("banner").style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = data.map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}">
    </div>
  `).join('');
}

/* PLAYER LOGIC */
function showDetails(item) {
  currentItem = item;
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("details-modal").style.display = "flex";
}

function startPlayback() {
  if (!currentItem) return;

  const playerIframe = document.getElementById("video-player");
  const playerContainer = document.getElementById("player-container");
  const id = currentItem.id;
  
  // Check if it's a TV show (TV shows have 'first_air_date' or 'name')
  const isTV = currentItem.first_air_date || currentItem.name;
  let embedUrl = isTV 
    ? `https://zxcstream.xyz/embed/tv/${id}/1/1` // Default to S1 E1
    : `https://zxcstream.xyz/embed/movie/${id}`;

  playerIframe.src = embedUrl;
  playerContainer.style.display = "block";
  document.getElementById("player-title-display").innerText = "Playing: " + (currentItem.title || currentItem.name);
  
  closeModal(); // Close info window
  playerContainer.scrollIntoView({ behavior: 'smooth' });
}

function closePlayer() {
  const playerIframe = document.getElementById("video-player");
  playerIframe.src = ""; 
  document.getElementById("player-container").style.display = "none";
}

function closeModal() {
  document.getElementById("details-modal").style.display = "none";
}

init();

