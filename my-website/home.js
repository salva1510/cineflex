/* =============================================================== */
/* 1️⃣  Global constants & helpers                             */
/* =============================================================== */

const API_KEY = '742aa17a327005b91fb6602054523286';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

/* Show an AJAX request with graceful error handling */
async function fetchJSON(url) {
  try {
    const r = await fetch(url);
    const c = r.ok ? await r.json() : null;
    return c;
  } catch (e) {
    console.error('fetchJSON error', e);
    return null;
  }
}

/* =============================================================== */
/* 2️⃣  Data Fetching – keep all existing functions (shown below) */
/* =============================================================== */

const fetchTrending = async type => {
  const d = await fetchJSON(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return d?.results.filter(i => i.poster_path).map(i => ({ ...i, media_type: type })) ?? [];
};

const fetchTopRatedMovies = async () => {
  const d = await fetchJSON(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`);
  return d?.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: 'movie' })) ?? [];
};

const fetchLatestMovies = async () => {
  const d = await fetchJSON(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`);
  return d?.results.filter(m => m.poster_path).map(m => ({ ...m, media_type: 'movie' })) ?? [];
};

const fetchTrendingAnime = async () => {
  const a = [];
  for (let p = 1; p <= 2; p++) {
    const d = await fetchJSON(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${p}`);
    if (!d) continue;
    const inc = d.results.filter(
      t => t.original_language === 'ja' && t.genre_ids.includes(16) && t.poster_path
    );
    a.push(...inc);
  }
  return a.map(i => ({ ...i, media_type: 'tv' }));
};

/* =============================================================== */
/* 3️⃣  UI helpers                                            */
/* =============================================================== */

/* Skeleton loader */
function showSkeleton(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = Array(8)
    .fill('<div class="skeleton"></div>')
    .join('');
}

/* Render a list of posters in a grid container */
function renderList(items, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  items.forEach(it => {
    const img = document.createElement('img');
    img.src = `${IMG_URL}${it.poster_path}`;
    img.alt = it.title ?? it.name;
    img.className = 'poster-item';
    img.loading = 'lazy';
    img.onclick = () => showDetails(it);
    el.appendChild(img);
  });
}

/* Scroll a row (if you still want a left/right button) */
function scrollRow(id, dx) {
  const r = document.getElementById(id);
  r?.scrollBy({ left: dx, behavior: 'smooth' });
}

/* =============================================================== */
/* 4️⃣  Hero Banner logic (touch swipe + auto rotate)           */
/* =============================================================== */

let bannerItems = [];
let bannerIdx  = 0;
let bannerLock = false;
let bannerTimer;

function setBanner(item) {
  const hero = document.getElementById('hero');
  if (!hero || !item) return;

  hero.style.opacity = 0.7;          // fade out
  hero.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;

  document.getElementById('hero-title