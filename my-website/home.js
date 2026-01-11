const API_KEY = "742aa17a327005b91fb6602054523286"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;
let bannerItem = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function fetchTrending(type) {
  const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type }));
}

async function fetchTrendingAnime() {
  const data = await fetchJSON(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`);
  return data.results.map(i => ({ ...i, media_type: "tv" }));
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  items.forEach(item => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.className = "poster-item";
    img.loading = "lazy";
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function setBanner(item) {
  bannerItem = item;
  const banner = document.getElementById("banner");
  if(!banner) return;
  banner.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9), transparent), url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent = item.title || item.name;
}

function showDetailsFromBanner() { if(bannerItem) showDetails(bannerItem); }

async function showDetails(item) {
  currentItem = item;
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview || "No description available.";
  document.getElementById("modal-image").src = `${IMG_URL}${item.poster_path}`;
  
  const rating = Math.round(item.vote_average * 10) / 10;
  document.getElementById("modal-rating").innerHTML = `<i class="fas fa-star"></i> ${rating} Rating`;
  
  document.getElementById("modal").style.display = "flex";

  const isTv = item.media_type === "tv" || item.first_air_date;
  if (isTv) {
    document.getElementById("tv-controls").style.display = "block";
    await loadSeasons(item.id);
  } else {
    document.getElementById("tv-controls").style.display = "none";
  }
  changeServer();
}

async function loadSeasons(id) {
  const data = await fetchJSON(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  const select = document.getElementById("seasonSelect");
  select.innerHTML = data.seasons.filter(s => s.season_number > 0).map(s => 
    `<option value="${s.season_number}">${s.name}</option>`
  ).join('');
  loadEpisodes();
}

async function loadEpisodes() {
  const seasonNum = document.getElementById("seasonSelect").value || 1;
  const data = await fetchJSON(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`);
  document.getElementById("episodes").innerHTML = data.episodes.map(ep => 
    `<div class="episode-card" onclick="playEpisode(${seasonNum}, ${ep.episode_number})">
      <strong>Ep ${ep.episode_number}</strong>: ${ep.name}
    </div>`
  ).join('');
}

function playEpisode(s, e) {
  const server = document.getElementById("server").value;
  const iframe = document.getElementById("modal-video");
  iframe.src = `https://${server}/embed/tv/${currentItem.id}/${s}/${e}`;
}

function changeServer() {
  const server = document.getElementById("server").value;
  const iframe = document.getElementById("modal-video");
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  if (isTv) {
    playEpisode(document.getElementById("seasonSelect").value || 1, 1);
  } else {
    iframe.src = `https://${server}/embed/movie/${currentItem.id}`;
  }
}

async function initGenres() {
  const data = await fetchJSON(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  const select = document.getElementById("genre-select");
  select.innerHTML = '<option value="">Select Genre</option>' + data.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

async function loadGenreMovies() {
  const genreId = document.getElementById("genre-select").value;
  if(!genreId) return;
  const data = await fetchJSON(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
  displayList(data.results.map(i => ({...i, media_type: 'movie'})), "genre-movies-list");
}

async function searchTMDB() {
  const query = document.getElementById("search-input").value.trim();
  if(!query) return;
  const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  const results = document.getElementById("search-results");
  results.innerHTML = data.results.filter(i => i.poster_path).map(item => {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.onclick = () => { closeSearchModal(); showDetails(item); };
    return img.outerHTML;
  }).join('');
}

// Startup
Promise.all([fetchTrending("movie"), fetchTrending("tv"), fetchTrendingAnime()]).then(([movies, tv, anime]) => {
  setBanner(movies[0]);
  displayList(movies, "movies-list");
  displayList(tv, "tvshows-list");
  displayList(anime, "anime-list");
  initGenres();
});

function scrollRow(id, amount) { document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' }); }
function closeModal() { document.getElementById("modal").style.display = "none"; document.getElementById("modal-video").src = ""; }
function openSearchModal() { document.getElementById("search-modal").style.display = "flex"; document.getElementById("search-input").focus(); }
function closeSearchModal() { document.getElementById("search-modal").style.display = "none"; }
