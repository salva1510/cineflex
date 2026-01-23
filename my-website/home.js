const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;

// Initialize the app
async function init() {
  try {
    const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`);
    const data = await res.json();
    displayList(data.results, "movies-list");
    if(data.results[0]) setBanner(data.results[0]);
  } catch(e) { console.error("API Error", e); }
}

function displayList(items, id) {
  const container = document.getElementById(id);
  if(!container) return;
  container.innerHTML = items.map(item => `
    <div class="poster-wrapper" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}" class="poster-item">
    </div>
  `).join('');
}

function setBanner(item) {
  currentItem = item;
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById("banner-title").textContent = item.title || item.name;
  document.getElementById("banner-desc").textContent = item.overview.slice(0, 150) + "...";
}

// THE PLAY FUNCTION - This is what was broken
function startPlayback() {
  const container = document.querySelector(".video-container");
  const iframe = document.getElementById("modal-video");
  const server = document.getElementById("server").value;

  if (!currentItem || !iframe) return;

  // 1. Visually hide the play button and show the iframe
  container.classList.add("video-playing");

  // 2. Determine if it's a Movie or TV Show
  const isTv = currentItem.media_type === "tv" || currentItem.first_air_date;
  
  // 3. Set the source URL
  if (isTv) {
    const season = document.getElementById("seasonSelect").value || 1;
    iframe.src = `https://${server}/tv/${currentItem.id}/${season}/1`;
  } else {
    iframe.src = `https://${server}/movie/${currentItem.id}`;
  }
}

function showDetails(item) {
  currentItem = item;
  const modal = document.getElementById("modal");
  modal.style.display = "block";
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview;
  
  // Reset the player UI for the new movie
  document.getElementById("modal-video").src = ""; 
  document.querySelector(".video-container").classList.remove("video-playing");

  const isTv = item.media_type === "tv" || item.first_air_date;
  document.getElementById("tv-controls").style.display = isTv ? "block" : "none";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-video").src = "";
}

function playBanner(e) {
  e.stopPropagation();
  showDetails(currentItem);
  // Auto-play after opening
  setTimeout(startPlayback, 500);
}

window.onload = init;

