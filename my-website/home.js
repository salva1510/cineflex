const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let myFavorites = JSON.parse(localStorage.getItem("cineflex_list")) || [];
let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];

async function init() {
  try {
    const trending = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json());
    trendingItems = trending.results;
    currentItem = trendingItems[0];
    setBanner(currentItem);
    displayCards(trendingItems, "main-list");
    updateContinueUI();
  } catch (err) { console.error(err); }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `linear-gradient(to top, #050505, transparent), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function changeBanner(dir) {
  currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
  currentItem = trendingItems[currentBannerIndex];
  setBanner(currentItem);
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = data.filter(i => i.poster_path).map(item => `
    <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}" loading="lazy">
    </div>
  `).join('');
}

async function showDetails(item) {
  currentItem = item;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  document.getElementById("modal-title").innerText = item.title || item.name;
  document.getElementById("modal-desc").innerText = item.overview;
  document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("details-modal").style.display = "flex";
}

function openSearch() {
  document.getElementById("search-overlay").style.display = "block";
  document.getElementById("search-input").focus();
}

function closeSearch() {
  document.getElementById("search-overlay").style.display = "none";
  document.getElementById("search-input").value = "";
}

const processSearch = (q) => {
  if (q.length < 2) return;
  debounceSearch(q);
};

const debounceSearch = debounce(async (q) => {
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
  document.getElementById("search-results").innerHTML = res.results.filter(i => i.poster_path).map(item => `
    <div class="search-card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
      <img src="${IMG_URL}${item.poster_path}">
      <p>${item.title || item.name}</p>
    </div>
  `).join('');
});

function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

function closeModal() { document.getElementById("details-modal").style.display = "none"; }
function startPlayback() { alert("Playing: " + (currentItem.title || currentItem.name)); }

init();

