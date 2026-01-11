/* =========================
   CONFIG & STATE
========================= */
const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";

let currentItem = null;

/* =========================
   CORE FUNCTIONS
========================= */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB failed");
  return res.json();
}

async function fetchTrending(type) {
  try {
    const data = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    return data.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type }));
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

/* =========================
   UI RENDERING
========================= */
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
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

async function showDetails(item) {
  currentItem = item;
  const isTV = item.media_type === "tv" || !item.title;
  const modal = document.getElementById("modal");
  
  // Set UI Elements
  document.getElementById("modal-title").textContent = item.title || item.name;
  document.getElementById("modal-description").textContent = item.overview;
  
  const modalImg = document.getElementById("modal-image");
  if(modalImg) modalImg.src = `${IMG_URL}${item.poster_path}`;

  const tvControls = document.getElementById("tv-controls");
  const videoIframe = document.getElementById("modal-video");

  if (isTV) {
    tvControls.style.display = "block";
    // If you have a loadSeasons function, call it here:
    // await loadSeasons(item.id); 
  } else {
    tvControls.style.display = "none";
    // Use default server if autoPick is not defined
    const server = "vidsrc.cc"; 
    videoIframe.src = `https://${server}/embed/movie/${item.id}`;
    
    // AUTO-SAVE PROGRESS FOR MOVIES
    saveProgress(item);
  }

  modal.style.display = "flex";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
    document.getElementById("modal-video").src = "";
}

/* =========================
   CONTINUE WATCHING LOGIC
========================= */

function saveProgress(item, season = null, episode = null) {
    if (!item) return;
    
    let history = JSON.parse(localStorage.getItem("cineflex_history")) || [];
    
    const progressData = {
        id: item.id,
        title: item.title || item.name,
        name: item.name || item.title,
        poster_path: item.poster_path,
        overview: item.overview,
        media_type: (season || item.media_type === 'tv') ? 'tv' : 'movie',
        last_watched: new Date().getTime(),
        season: season,
        episode: episode
    };

    // Remove duplicates
    history = history.filter(i => i.id !== item.id);
    
    // Add to front and limit to 10
    history.unshift(progressData);
    if (history.length > 10) history.pop();

    localStorage.setItem("cineflex_history", JSON.stringify(history));
    renderContinueWatching();
}

function renderContinueWatching() {
    const history = JSON.parse(localStorage.getItem("cineflex_history")) || [];
    const container = document.getElementById("continue-list");
    const section = document.getElementById("continue-watching-section");

    if (!container || !section) return;

    if (history.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    container.innerHTML = "";

    history.forEach(item => {
        const div = document.createElement("div");
        div.className = "continue-card";
        
        const badge = item.season ? `<span class="ep-badge">S${item.season}:E${item.episode}</span>` : '';
        
        div.innerHTML = `
            <div class="poster-wrapper">
                <img src="${IMG_URL}${item.poster_path}" class="poster-item">
                ${badge}
                <div class="progress-bar"><div class="progress-fill"></div></div>
            </div>
            <p class="continue-title">${item.title || item.name}</p>
        `;
        
        div.onclick = () => showDetails(item);
        container.appendChild(div);
    });
}

// For TV shows, call this whenever an episode is clicked
function playEpisode(season, episode) {
    // This assumes currentItem is set to the TV show object
    saveProgress(currentItem, season, episode);
    
    const server = "vidsrc.cc";
    document.getElementById("modal-video").src = `https://${server}/embed/tv/${currentItem.id}/${season}/${episode}`;
}

/* =========================
   INITIALIZATION
========================= */
async function init() {
  try {
    const [movies, tv] = await Promise.all([
      fetchTrending("movie"),
      fetchTrending("tv")
    ]);

    displayList(movies, "movies-list");
    displayList(tv, "tvshows-list");
    
    renderContinueWatching();
  } catch (err) {
    console.error("Initialization Error:", err);
  }
}

// Watchlist Placeholder
function toggleWatchlist() {
    if(!currentItem) return;
    alert("Watchlist updated!");
}

document.addEventListener("DOMContentLoaded", init);

// Navbar Scroll Effect
window.onscroll = () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
};
