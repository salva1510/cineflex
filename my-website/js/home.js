/* ===========================================================
 *  home.js – Trending Movies / TV / Anime viewer (with wow style)
 *  Author: Your Name (feel free to rename)
 *  Date:   2025‑10‑30
 *  -----------------------------------------------------------
 *  This file includes inline CSS for quick deployment.  
 *  If you prefer external CSS, move the <style> block to a .css file.
 * =========================================================== */

/* ---------- CONFIGURATION (customize these) ---------- */
const THEME = {
  LIGHT: '--bg-light',
  DARK: '--bg-dark',
};

const COLORS = {
  // Light theme
  bg: 'var(--bg-light)',            // page background
  surface: 'var(--surface-light)',  // cards, modals
  title: '#2d2d2d',                  // headings
  text: '#555555',                   // body text
  accent: '#ff5722',                 // hover/active accent
  // Dark theme
  bgDark: 'var(--bg-dark)',
  surfaceDark: 'var(--surface-dark)',
  titleDark: '#e0e0e0',
  textDark: '#cccccc',
  accentDark: '#ff9800',
};

/* ---------- GLOBAL VARIABLES ---------- */
const API_KEY = '742aa17a327005b91fb6602054523286';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem = null;

/* ---------- UTILITIES ---------- */
function setTheme(isDark) {
  if (!isDark) {
    document.documentElement.style.setProperty('--bg', COLORS.bg);
    document.documentElement.style.setProperty('--surface', COLORS.surface);
    document.documentElement.style.setProperty('--title-color', COLORS.title);
    document.documentElement.style.setProperty('--text-color', COLORS.text);
    document.documentElement.style.setProperty('--accent', COLORS.accent);
    document.getElementById('theme-switch').textContent = '🌙 Dark Mode';
  } else {
    document.documentElement.style.setProperty('--bg', COLORS.bgDark);
    document.documentElement.style.setProperty('--surface', COLORS.surfaceDark);
    document.documentElement.style.setProperty('--title-color', COLORS.titleDark);
    document.documentElement.style.setProperty('--text-color', COLORS.textDark);
    document.documentElement.style.setProperty('--accent', COLORS.accentDark);
    document.getElementById('theme-switch').textContent = '☀️ Light Mode';
  }
}

/* ---------- FETCH HELPERS ---------- */
async function fetchTrending(type) {
  const url = `${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Network error for ${type}`);
  const data = await res.json();
  return data.results;
}

/* Anime filter – Japanese (ja) + TV genre_id 16 (Animation) */
async function fetchTrendingAnime() {
  const all = [];
  for (let page = 1; page <= 3; page++) {
    const data = await fetchTrending('tv')
      .then(r => r.results)
      .catch(console.error);
    if (!data) continue;
    const filtered = data.filter(
      it => it.original_language === 'ja' && it.genre_ids.includes(16)
    );
    all.push(...filtered);
  }
  // Remove duplicates by id
  const uniq = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  return uniq;
}

/* ---------- UI RENDERING ---------- */
function injectStyle() {
  const style = document.createElement('style');
  style.textContent = `
/* ==== CSS VARIABLES ==== */
:root {
  --bg: #ffffff;                /* page bg (light) */
  --bg-dark: #121212;           /* page bg (dark) */
  --surface: #ffffff;           /* card / modal bg (light) */
  --surface-dark: #1e1e1e;      /* card / modal bg (dark) */
  --title-color: #2d2d2d;
  --text-color: #555555;
  --accent: #ff5722;
  --accent-dark: #ff9800;
  --transition: all 0.35s ease;
}

/* ==== GLOBAL LAYOUT ==== */
body {
  margin:0; font-family:Arial,Helvetica,sans-serif; background:var(--bg); color:var(--text-color);
  display:flex; flex-direction:column; min-height:100vh;
}
a { color:inherit; text-decoration:none; }
button { cursor:pointer; }

/* ==== THEME SWITCHER ==== */
#theme-switch {
  background:none; border:none; color:var(--accent); font-size:1.1rem;
  padding:0.4rem 0.8rem; border-radius:4px; transition:var(--transition);
}
#theme-switch:hover { background:rgba(255,87,34,0.1); }

/* ==== HEADER ==== */
header {
  background: var(--surface);
  padding:0.5rem 1rem;
  align-items:center; display:flex; justify-content:space-between;
}
header h1 { margin:0; color:var(--title-color); font-size:1.4rem; }

/* ==== SEARCH BAR ==== */
#search-container {
  position:fixed; top:0; left:0; width:100%; background:rgba(255,255,255,0.95);
  backdrop-filter:blur(5px); padding:0.6rem; display:flex; gap:0.5rem;
  z-index:1000;
}
#search-input {
  flex:1; padding:0.5rem; border:1px solid #ccc; border-radius:4px;
}
#search-open, #search-close { background:none; border:none; font-size:1.2rem; }

/* ==== BANNER ==== */
#banner {
  position:relative; height:300px; overflow:hidden; background:#000;
}
#banner img {
  width:100%; height:100%; object-fit:cover; transition:var(--transition);
}
#banner-title {
  position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.4);
  color:#fff; padding:0.5rem; text-align:center; font-size:1.5rem;
  transition:var(--transition);
}

/* ==== LIST COLUMNS ==== */
#movies-list,
#tvshows-list,
#anime-list {
  display:grid; gap:1rem; grid-template-columns:repeat(auto-fill, minmax(150px,1fr));
  padding:1rem;
}
.card {
  background:#fff; border-radius:6px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1);
  transition:var(--transition);
}
.card:hover { transform:translateY(-4px); box-shadow:0 8px 16px rgba(0,0,0,0.15); }
.card img { width:100%; }
.card img:hover { opacity:0.8; }

/* ==== MODAL ==== */
#modal {
  position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex;
  align-items:center; justify-content:center; z-index:10000;
}
.modal-content {
  background:var(--surface);
  padding:1.5rem; border-radius:8px; position:relative; max-width:800px;
  width:90%; backdrop-filter:blur(4px); animation:fadeIn 0.4s ease forwards;
}
@keyframes fadeIn {
  from {opacity:0; transform:translateY(20px);}
  to   {opacity:1; transform:none;}
}
.modal-header {
  display:flex; justify-content:space-between; align-items:center;
}
.modal-image { max-width:100%; height:auto; border-radius:4px; }
.modal-rating { margin-top:0.5rem; font-size:1.2rem; }
.modal-description { margin-top:0.75rem; line-height:1.4; }

/* ==== VIDEO EMBED ==== */
.modal-video {
  width:100%; height:0; padding-bottom:56.25%; /* 16:9 */
  position:relative; overflow:hidden;
}
.modal-video iframe {
  position:absolute; inset:0; width:100%; height:100%;
  border:none;
}

/* ==== SCROLL‑REVEAL ==== */
[data-reveal] {
  opacity:0; transform:translateY(30px);
  transition:opacity var(--transition), transform var(--transition);
}
[data-visible] {
  opacity:1; transform:none;
}
`;
  document.head.appendChild(style);
}

/* ---------- UI FUNCTIONS ---------- */
function displayBanner(item) {
  const banner = document.getElementById('banner');
  banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  banner.title = item.title || item.name;
  bannerTitle.textContent = item.title || item.name;
  // Trigger animation
  banner.style.opacity = 1;
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p>No items found.</p>';
    return;
  }
  items.forEach(it => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.reveal = '';
    const img = document.createElement('img');
    img.src = `${IMG_URL}${it.poster_path}`;
    img.alt = it.title || it.name;
    img.onclick = () => showDetails(it);
    card.appendChild(img);
    container.appendChild(card);
  });
}

/* Simple IntersectionObserver for scroll‑reveal */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.dataset.visible = 'true';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
}

/* ---------- DETAILS MODAL ---------- */
function showDetails(item) {
  currentItem = item;
  const modal = document.getElementById('modal');
  const box = document.querySelector('.modal-content');
  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-description');
  const imgEl = document.getElementById('modal-image');
  const ratingEl = document.getElementById('modal-rating');
  const videoEl = document.getElementById('modal-video');

  titleEl.textContent = item.title || item.name;
  descEl.textContent = item.overview || 'No description available.';
  imgEl.src = `${IMG_URL}${item.poster_path}`;
  ratingEl.innerHTML = '★'.repeat(Math.round(item.vote_average / 2));

  // Choose video embed
  const type = item.media_type === 'movie' ? 'movie' : 'tv';
  let embedURL = '';
  const server = document.getElementById('server').value;
  if (server === 'vidsrc.cc') {
    embedURL = `https://vidsrc.cc/v2/embed/${type}/${item.id}`;
  } else if (server === 'vidsrc.me') {
    embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${item.id}`;
  } else if (server === 'player.videasy.net') {
    embedURL = `https://player.videasy.net/${type}/${item.id}`;
  }
  videoEl.src = embedURL;

  modal.style.display = 'flex';
  // Small UI polish
  modal.querySelector('.modal-content').classList.add('visible');
}

/* ---------- SEARCH ---------- */
function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}
async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return closeSearchModal();
  const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return closeSearchModal();
  const data = await res.json();
  const container = document.getElementById('search-results');
  container.innerHTML = data.results.length
    ? data.results.map(it => {
        const img = document.createElement('img');
        img.src = `${IMG_URL}${it.poster_path}`;
        img.alt = it.title || it.name;
        img.onclick = () => {
          closeSearchModal();
          showDetails(it);
        };
        return `
          <div class="card" style="cursor:pointer;">
            ${img.outerHTML}
          </div>
        `;
      }).join('')
    : '<p>No results found.</p>';
}

/* ---------- MODAL CONTROLS ---------- */
function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
}

/* ---------- INITIAL SETUP ---------- */
async function init() {
  injectStyle();                     // <-- injects CSS variables & theme switch
  setTheme(true);                   // default: light mode

  // 1️⃣ Banners (random movie, tv, anime)
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();

  const randomMovie = movies[Math.floor(Math.random() * movies.length)];
  const randomTV = tvShows[Math.floor(Math.random() * tvShows.length)];
  const randomAnime = anime[Math.floor(Math.random() * anime.length)];

  displayBanner(randomMovie);
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');

  // 2️⃣ Search modal
  document.getElementById('search-open')
    .addEventListener('click', () => {
      document.getElementById('search-modal').style.display = 'flex';
      document.getElementById('search-input').focus();
    });

  document.getElementById('search-close')
    .addEventListener('click', closeSearchModal);

  // 3️⃣ Scroll reveal
  initScrollReveal();

  // 4️⃣ Theme switch
  document.getElementById('theme-switch')
    .addEventListener('click', () => setTheme(document.documentElement.classList.toggle(THEME.DARK)));
}

/* ---------------------------------------------------------- */
/*  Run on page load                                             */
/* ---------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', init);
