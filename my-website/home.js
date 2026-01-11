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

// Fixed showDetails to handle both movies and TV correctly
async function showDetails(item) {
  currentItem = item;
  const isTV = item.media_type === "tv" || (!item.title && item.name);
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
    // If you have a function to load episodes, call it here
    if (typeof loadSeasons === "function") {
        await loadSeasons(item.id);
    }
  } else {
    tvControls.style.display = "none";
    const server = "vidsrc.cc"; // Default premium server
    videoIframe.src = `https://${server}/embed/movie/${item.id}`;
    
    // SAVE PROGRESS IMMEDIATELY FOR MOVIES
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

// Saves the item to LocalStorage
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

    // Remove duplicates to move the item to the top of the list
    history = history.filter(i => i.id !== item.id);
    
    // Add to start and limit to 10 items
    history.unshift(progressData);
    if (history.length > 10) history.pop();

    localStorage.setItem("cineflex_history", JSON.stringify(history));
    renderContinueWatching();
}

// Renders the Continue Watching row in the UI
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
        
        // Show S:E badge for TV shows
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

// Call this function when an episode is clicked in your TV menu
function playEpisode(season, episode) {
    if(!currentItem) return;
    saveProgress(currentItem, season, episode);
    
    const server = document.getElementById("server")?.value || "vidsrc.cc";
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
    
    // Initial render of saved progress
    renderContinueWatching();
  } catch (err) {
    console.error("Initialization Error:", err);
  }
}

// Simple Watchlist function
function toggleWatchlist() {
    if(!currentItem) return;
    let list = JSON.parse(localStorage.getItem("watchlist")) || [];
    const index = list.findIndex(i => i.id === currentItem.id);
    
    if(index > -1) {
        list.splice(index, 1);
        alert("Removed from Watchlist");
    } else {
        list.push(currentItem);
        alert("Added to Watchlist!");
    }
    localStorage.setItem("watchlist", JSON.stringify(list));
}

// Initialize on load
document.addEventListener("DOMContentLoaded", init);

// Navbar Scroll Effect
window.onscroll = () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
};
