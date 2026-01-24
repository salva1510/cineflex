const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];

async function init() {
  const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
  const tvShows = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`).then(res => res.json());
  
  currentItem = trending.results[0];
  setBanner(currentItem);
  
  displayCards(trending.results, "main-list");
  displayCards(tvShows.results, "tv-list");
  updateMyListUI();
}

/* MY LIST LOGIC */
function toggleMyList() {
    const index = myFavorites.findIndex(item => item.id === currentItem.id);
    const btn = document.getElementById("mylist-btn");

    if (index === -1) {
        myFavorites.push(currentItem);
        btn.innerHTML = `<i class="fa-solid fa-check"></i> In List`;
    } else {
        myFavorites.splice(index, 1);
        btn.innerHTML = `<i class="fa-solid fa-plus"></i> My List`;
    }

    localStorage.setItem("cineflex_list", JSON.stringify(myFavorites));
    updateMyListUI();
}

function updateMyListUI() {
    const container = document.getElementById("my-list");
    const section = document.getElementById("my-list-section");

    if (myFavorites.length === 0) {
        section.style.display = "none";
    } else {
        section.style.display = "block";
        displayCards(myFavorites, "my-list");
    }
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

/* GENRE FILTER LOGIC */
async function filterByGenre(genreId, element) {
  document.querySelectorAll('.genre-pill').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');

  const rowTitle = document.getElementById("row-title");
  const tvSection = document.getElementById("tv-section");
  const myListSection = document.getElementById("my-list-section");

  if (genreId === 'all') {
    rowTitle.innerText = "Trending Now";
    tvSection.style.display = "block";
    updateMyListUI();
    init();
    return;
  }

  tvSection.style.display = "none";
  myListSection.style.display = "none";
  rowTitle.innerText = element.innerText + " Movies";

  const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`;
  const data = await fetch(url).then(res => res.json());
  displayCards(data.results, "main-list");
}

/* SEARCH & MODAL LOGIC */
function showDetails(item) {
  currentItem = item;
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  
  // Update My List button state
  const btn = document.getElementById("mylist-btn");
  const isInList = myFavorites.some(fav => fav.id === item.id);
  btn.innerHTML = isInList ? `<i class="fa-solid fa-check"></i> In List` : `<i class="fa-solid fa-plus"></i> My List`;
  
  document.getElementById("details-modal").style.display = "flex";
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

function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("search-input").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

async function handleSearch(query) {
  if (query.length < 2) { document.getElementById("search-results").innerHTML = ""; return; }
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`).then(r => r.json());
  document.getElementById("search-results").innerHTML = res.results.filter(i => i.poster_path).map(item => `
    <div class="search-card" onclick='selectFromSearch(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}">
      <p>${item.title || item.name}</p>
    </div>
  `).join('');
}

function selectFromSearch(item) { closeSearch(); showDetails(item); }
function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function closePlayer() { document.getElementById("video-player").src = ""; document.getElementById("player-container").style.display = "none"; }

init();

