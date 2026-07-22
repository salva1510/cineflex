// CINEFLEX 7.2.1 — remove stale third-party Monetag workers from older builds.
// Keep only CineFlex's own /service-worker.js registration.
(function cleanupLegacyMonetagWorkers(){
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const urls = [
          registration.active?.scriptURL,
          registration.waiting?.scriptURL,
          registration.installing?.scriptURL
        ].filter(Boolean);
        const isCineFlexWorker = urls.some(url => /\/service-worker\.js(?:[?#]|$)/.test(url));
        const isMonetagWorker = urls.some(url => /(?:3nbf4\.com|quge5\.com|\/sw\.js(?:[?#]|$))/i.test(url));
        if (isMonetagWorker && !isCineFlexWorker) await registration.unregister();
      }
    } catch (error) {
      console.warn("Legacy Monetag worker cleanup skipped:", error);
    }
  }, { once: true });
})();

const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

// --- PLAYERS DOMAINS ---
const PEACHIFY_URL = "https://peachify.top";

let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let activeServer = 1;

// --- LOCAL STORAGE DATA STORES ---
let continueWatching = [];
let watchlist = [];

function cineflexSignedIn() {
  try { return !!(window.auth && window.auth.currentUser); }
  catch (e) { return false; }
}

function guestSaveNotice(feature = 'progress') {
  const message = feature === 'list'
    ? 'Mag-login para magamit at ma-save ang My List.'
    : 'Guest viewing: makakapanood ka, pero mag-login para ma-save ang Continue Watching at history.';
  if (typeof showToast === 'function') showToast(message);
  else alert(message);
}

let touchStartX = 0;
let touchEndX = 0;

// --- PAGINATION AT STATE VARIABLES PARA SA VIEW ALL ---
let currentViewAllPage = 1;
let currentViewAllUrl = "";
let isFetchingViewAll = false;

// --- PWA REGISTRATION & INSTALLATION ENGINE ---
let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js?v=300.1', {
        updateViaCache: 'none'
      });
      await reg.update();
      console.log('CineFlex Service Worker ready:', reg.scope);

      // Activate a newly installed worker without trapping users in a reload loop.
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }, { once: true });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

// --- NETFLIX INTRO SOUND ENGINE ---
function startAppWithSound() {
    const sound = document.getElementById("intro-sound");
    const splash = document.getElementById("splash-overlay");
    
    if (sound) {
        sound.play().catch(err => console.log("Autoplay prevented:", err));
    }
    
    if (splash) {
        splash.style.transition = "opacity 0.6s ease, visibility 0.6s";
        splash.style.opacity = "0";
        splash.style.visibility = "hidden";
        setTimeout(() => {
            splash.style.display = "none";
        }, 600);
    }
}

// --- FREE-MEMBER POP AD: AFTER 5 MINUTES, ON NEXT SCREEN TOUCH ---
// Build 250.5: trigger the supplied pop-ad only from an intentional Play action.
// VIP members remain ad-free, and rapid double-clicks cannot create duplicates.
const CINEFLEX_PLAY_AD_COOLDOWN_MS = 1500;
let cineflexLastPlayAdAt = 0;
let cineflexPlayAdSequence = 0;

function cineflexIsVipMember() {
  return !!window.CineFlexMembership?.isVip?.();
}

function triggerPlaybackPopAd() {
  try {
    if (cineflexIsVipMember()) return false;

    const now = Date.now();
    if ((now - cineflexLastPlayAdAt) < CINEFLEX_PLAY_AD_COOLDOWN_MS) return false;
    cineflexLastPlayAdAt = now;

    const previous = document.getElementById("cineflex-play-popad-script");
    if (previous) previous.remove();

    const adScript = document.createElement("script");
    adScript.id = "cineflex-play-popad-script";
    adScript.src = `https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js?cf_play=${now}_${++cineflexPlayAdSequence}`;
    adScript.type = "text/javascript";
    adScript.async = true;
    document.body.appendChild(adScript);

    const cleanup = () => window.setTimeout(() => adScript.remove(), 15000);
    adScript.addEventListener("load", cleanup, { once: true });
    adScript.addEventListener("error", cleanup, { once: true });
    return true;
  } catch (error) {
    console.log("Play pop-ad blocked or failed:", error);
    return false;
  }
}

// Kept as compatibility wrappers for existing buttons/player calls.
function triggerPopUnder() {
  return triggerPlaybackPopAd();
}

function triggerPlayPopUnderForCurrentTitle() {
  return armFreeMemberTouchAd();
}

async function enterCinemaMode() {
  const playerContainer = document.getElementById("modal-player-container");
  if (!playerContainer) return;
  try {
    if (playerContainer.requestFullscreen) {
      await playerContainer.requestFullscreen();
    } else if (playerContainer.webkitRequestFullscreen) {
      await playerContainer.webkitRequestFullscreen();
    }
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
      await screen.orientation.lock("landscape").catch(e => console.log("Orientation lock failed:", e));
    }
  } catch (err) {
    console.log("Cinema mode error:", err);
  }
}

document.addEventListener('fullscreenchange', handleFullscreenExit);
document.addEventListener('webkitfullscreenchange', handleFullscreenExit);

function handleFullscreenExit() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.unlock === 'function') {
      screen.orientation.unlock();
    }
  }
}

async function cfFetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function cfRenderHomeError(containerId, retryLabel = 'Retry') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="cf-home-error"><i class="fa-solid fa-triangle-exclamation"></i><strong>Unable to load this section</strong><button type="button" onclick="init()">${retryLabel}</button></div>`;
}

async function init() {
  const requests = [
    cfFetchJson(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`),
    cfFetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH&sort_by=popularity.desc`),
    cfFetchJson(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18&sort_by=popularity.desc`)
  ];
  const [trendingResult, filipinoResult, koreanResult] = await Promise.allSettled(requests);

  if (trendingResult.status === 'fulfilled') {
    trendingItems = Array.isArray(trendingResult.value.results) ? trendingResult.value.results : [];
    if (trendingItems.length) setBanner(trendingItems[0]);
  } else {
    console.warn('Trending load failed:', trendingResult.reason);
    document.getElementById('cf-hero-status-text')?.replaceChildren(document.createTextNode('Offline preview'));
  }

  if (filipinoResult.status === 'fulfilled') displayCards(filipinoResult.value.results || [], 'filipino-list');
  else cfRenderHomeError('filipino-list');

  if (koreanResult.status === 'fulfilled') displayCards(koreanResult.value.results || [], 'kdrama-list');
  else cfRenderHomeError('kdrama-list');

  updateContinueUI();
  setupInfiniteScroll();
  document.body.classList.add('cf-home-ready');
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  const bTitle = document.getElementById("banner-title");
  const bDesc = document.getElementById("banner-desc");
  if (!banner || !item) return;
  banner.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  if (bTitle) bTitle.innerText = item.title || item.name;
  const heroStatus = document.getElementById("cf-hero-status-text");
  if (heroStatus) heroStatus.textContent = `${item.media_type === "tv" || item.name ? "Series" : "Movie"} • ${Number(item.vote_average || 0).toFixed(1)} rating`;
  if (bDesc) bDesc.textContent = "";
}

function showBannerDetails() { 
  if (trendingItems[currentBannerIndex]) showDetails(trendingItems[currentBannerIndex]); 
}

function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) { 
    touchEndX = e.changedTouches[0].screenX; 
    if (touchStartX - touchEndX > 50) changeBanner(1);
    if (touchEndX - touchStartX > 50) changeBanner(-1);
}

function changeBanner(dir) {
    currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
    setBanner(trendingItems[currentBannerIndex]);
}


function cfEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function cfFormatRuntime(minutes) {
  const total = Number(minutes || 0);
  if (!total) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function cfGetCertification(details, type) {
  if (type === 'movie') {
    const countries = details.release_dates?.results || [];
    const preferred = countries.find(x => x.iso_3166_1 === 'US') || countries.find(x => x.iso_3166_1 === 'PH') || countries[0];
    return preferred?.release_dates?.find(x => x.certification)?.certification || '';
  }
  const ratings = details.content_ratings?.results || [];
  return (ratings.find(x => x.iso_3166_1 === 'US') || ratings.find(x => x.iso_3166_1 === 'PH') || ratings[0])?.rating || '';
}

function cfComputeMatch(details) {
  const vote = Math.max(0, Math.min(10, Number(details.vote_average || 0)));
  const popularity = Math.min(100, Math.log10(Math.max(1, Number(details.popularity || 1))) * 34);
  let score = 68 + vote * 2.2 + popularity * .08;
  try {
    const history = JSON.parse(localStorage.getItem('cineflex_recent') || '[]');
    const list = JSON.parse(localStorage.getItem('cineflex_watchlist') || '[]');
    const genreIds = new Set([...(history || []), ...(list || [])].flatMap(x => x.genre_ids || []));
    const overlap = (details.genres || []).filter(g => genreIds.has(g.id)).length;
    score += Math.min(7, overlap * 2.5);
  } catch (_) {}
  return Math.max(72, Math.min(99, Math.round(score)));
}

function cfRenderPremiumDetails(details, credits, type) {
  const date = details.release_date || details.first_air_date || '';
  const year = date ? new Date(date).getFullYear() : '';
  const runtime = type === 'tv'
    ? cfFormatRuntime((details.episode_run_time || [])[0])
    : cfFormatRuntime(details.runtime);
  const certification = cfGetCertification(details, type);
  const score = Number(details.vote_average || 0);
  const match = cfComputeMatch(details);
  const meta = document.getElementById('modal-meta-row');
  const matchBadge = document.getElementById('modal-match-badge');
  const facts = document.getElementById('modal-facts');
  if (matchBadge) matchBadge.textContent = `${match}% Match`;
  if (meta) {
    const pieces = [
      year && `<span>${year}</span>`,
      certification && `<span class="cf-certification">${cfEscapeHtml(certification)}</span>`,
      runtime && `<span>${runtime}</span>`,
      score > 0 && `<span class="cf-tmdb-score"><i class="fa-solid fa-star"></i> ${score.toFixed(1)}</span>`,
      `<span class="cf-quality-pill">HD</span>`
    ].filter(Boolean);
    meta.innerHTML = pieces.join('');
  }
  if (!facts) return;
  const director = (credits.crew || []).find(p => p.job === 'Director');
  const creators = details.created_by || [];
  const creatorText = director?.name || creators.map(x => x.name).slice(0, 2).join(', ');
  const cast = (credits.cast || []).slice(0, 4).map(x => x.name).join(', ');
  const genres = (details.genres || []).map(x => x.name).join(', ');
  const countries = (details.production_countries || details.origin_country || []).map(x => x.name || x).slice(0, 2).join(', ');
  const language = (details.spoken_languages || []).map(x => x.english_name || x.name).filter(Boolean).slice(0, 2).join(', ');
  const rows = [
    cast && ['Starring', cast],
    creatorText && [type === 'movie' ? 'Director' : 'Creator', creatorText],
    genres && ['Genres', genres],
    language && ['Language', language],
    countries && ['Country', countries],
    details.status && ['Status', details.status]
  ].filter(Boolean);
  facts.innerHTML = rows.map(([label,value]) => `<div><span>${label}:</span> ${cfEscapeHtml(value)}</div>`).join('');
}

async function showDetails(item) {
  if (!item || !item.id) return;
  closeSearch();
  const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
  const params = new URLSearchParams({
    id: String(item.id),
    type,
    title: item.title || item.name || 'CineFlex'
  });
  if (item.backdrop_path) params.set('backdrop', item.backdrop_path);
  if (item.poster_path) params.set('poster', item.poster_path);
  window.location.href = `details.html?${params.toString()}`;
}

async function playTrailer() {
    if (!currentItem) return;
    const type = currentTVState.type;
    const id = currentItem.id;
    const iframe = document.getElementById("modal-video-iframe");
    const playerContainer = document.getElementById("modal-player-container");

    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`).then(r => r.json());
        const trailerItem = res.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || res.results.find(v => v.site === 'YouTube');

        if (trailerItem && trailerItem.key) {
            if (playerContainer) playerContainer.style.display = "block";
            if (iframe) iframe.src = `https://www.youtube.com/embed/${trailerItem.key}?autoplay=1&rel=0&modestbranding=1`;
            document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Paumanhin, walang available na trailer.");
        }
    } catch (err) { console.error(err); }
}

function toggleWatchlist() {
    if (!currentItem) return;
    if (!cineflexSignedIn()) {
        guestSaveNotice('list');
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }
    const index = watchlist.findIndex(i => i.id === currentItem.id);
    const wlBtn = document.getElementById("modal-watchlist-btn");

    if (index === -1) {
        watchlist.unshift(currentItem);
        if (wlBtn) wlBtn.innerHTML = `<i class="fa-solid fa-check" style="color: #2ecc71;"></i> In My List`;
    } else {
        watchlist.splice(index, 1);
        if (wlBtn) wlBtn.innerHTML = `<i class="fa-solid fa-plus"></i> My List`;
    }
    localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
    saveUserData();
}

function viewWatchlist() {
    closeMenuDrawer();
    if (!cineflexSignedIn()) {
      guestSaveNotice('list');
      if (typeof openLoginModal === 'function') openLoginModal();
      return;
    }
    const font = document.getElementById("search-results");
    const overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return;

    currentViewAllUrl = ""; 
    font.innerHTML = "";
    overlay.style.display = "block";

    if (watchlist.length === 0) {
        font.innerHTML = `<div style="color:#aaa; text-align:center; width:100%; padding:40px; font-size:1rem;">Walang laman ang iyong My List.</div>`;
        return;
    }

    font.innerHTML = watchlist.filter(i => i.poster_path).map(item => `
        <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
            <img src="${IMG_URL}${item.poster_path}">
            <p>${item.title || item.name}</p>
        </div>`).join('');
}

function triggerDownload() {
    if (!currentItem) return;
    triggerPopUnder();

    const movieId = currentItem.id;
    const type = currentTVState.type; 
    const season = currentTVState.season;
    const episode = currentTVState.currentEpNum;
    let downloadUrl = (type === 'tv') ? `https://zxcstream.xyz/download/tv/${movieId}/${season}/${episode}` : `https://zxcstream.xyz/download/movie/${movieId}`;

    window.open(downloadUrl, '_blank');
}

const processSearch = async (q) => {
    const font = document.getElementById("search-results");
    if (!font) return;
    if (q.length < 2) { font.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
    } catch (err) { console.error(err); }
};

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    if (!seasonSelect) return;
    seasonSelect.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    currentTVState.season = seasonNum;
    window.currentTVState = currentTVState;
    const epList = document.getElementById("episode-list");
    
    if (epList) {
      epList.className = "modern-grid-container"; 
      epList.innerHTML = data.episodes.map(e => {
            const airDate = e.air_date ? new Date(e.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Jun 5, 2026";
            const runtime = e.runtime ? `${e.runtime}m` : `${50 + (e.episode_number % 15)}m`;

            return `
            <div class="modern-grid-item" tabindex="0" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="modern-thumb-wrapper">
                    <img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="modern-img" loading="lazy">
                    <div class="modern-ep-badge">E${e.episode_number}</div>
                </div>
                <div class="modern-meta-info">
                    <h4 class="modern-ep-title">Episode ${e.episode_number}</h4>
                    <p class="modern-sub-text">${airDate} &nbsp;•&nbsp; ${runtime}</p>
                </div>
            </div>`;
      }).join('');
    }
}

// --- CONFIGURATION RE-PATCHED FOR LAPTOP BROWSERS ---
function updateVideoSource() {
    const iframe = document.getElementById("modal-video-iframe");
    if (!iframe || !currentItem) return;

    const movieId = currentItem.id;
    const season = currentTVState.season;
    const episode = currentTVState.currentEpNum;
    const finalUrl = currentTVState.type === "tv"
        ? `${PEACHIFY_URL}/embed/tv/${movieId}/${season}/${episode}`
        : `${PEACHIFY_URL}/embed/movie/${movieId}`;

    iframe.removeAttribute("src");
    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture; gyroscope; clipboard-write");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("webkitallowfullscreen", "");
    iframe.setAttribute("mozallowfullscreen", "");
    iframe.removeAttribute("sandbox");
    iframe.src = finalUrl;
}

function switchServer(serverNum) {
    activeServer = serverNum;
    updateServerTabsUI();
    updateVideoSource();
}

function updateServerTabsUI() {
    const btn1 = document.getElementById("srv1-btn");
    const btn2 = document.getElementById("srv2-btn");
    if (!btn1 || !btn2) return;
    
    if (activeServer === 1) {
        btn1.classList.add("active");
        btn2.classList.remove("active");
    } else {
        btn2.classList.add("active");
        btn1.classList.remove("active");
    }
}

function openPremiumWatchPage({ episode = 1 } = {}) {
    if (!currentItem) return;
    const type = currentTVState.type === 'tv' ? 'tv' : 'movie';
    const title = currentItem.title || currentItem.name || 'CineFlex';
    const params = new URLSearchParams({
        id: String(currentItem.id),
        type,
        title,
        season: String(currentTVState.season || 1),
        episode: String(episode || currentTVState.currentEpNum || 1)
    });
    if (currentItem.backdrop_path) params.set('backdrop', currentItem.backdrop_path);
    if (currentItem.poster_path) params.set('poster', currentItem.poster_path);
    if (cineflexSignedIn()) addToContinueWatching(currentItem);
    const destination = `watch.html?${params.toString()}`;
    const adTriggered = triggerPlaybackPopAd();
    // Give the third-party script a brief moment to run before leaving the page.
    window.setTimeout(() => { window.location.href = destination; }, adTriggered ? 350 : 0);
}

function playSpecificEpisode(epNum, element) {
    if (element) element.classList.add('active');
    currentTVState.currentEpNum = epNum;
    window.currentTVState = currentTVState;
    openPremiumWatchPage({ episode: epNum });
}

function startPlayback() {
    openPremiumWatchPage();
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  const isNetflix = (containerId === "netflix-movies-list");

  container.innerHTML = data.filter(i => i.poster_path).map((item, index) => {
    let trendingBadge = "";
    if (isNetflix && index < 10) {
        trendingBadge = `<div class="netflix-num-badge">${index + 1}</div>`;
    }

    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const score = Number(item.vote_average || 0);
    return `
    <div class="${isNetflix ? 'netflix-item-container' : 'card cf-premium-card'}" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})' aria-label="Open ${cfEscapeHtml(title)} details">
        ${trendingBadge}
        <img src="${IMG_URL}${item.poster_path}" loading="lazy" decoding="async" class="${isNetflix ? 'netflix-num-poster' : ''}" alt="${cfEscapeHtml(title)} poster">
        ${!isNetflix ? `<div class="cf-card-badges"><span>HD</span>${score ? `<span class="cf-card-rating"><i class="fa-solid fa-star"></i> ${score.toFixed(1)}</span>` : ''}</div><div class="cf-card-overlay"><strong>${cfEscapeHtml(title)}</strong><small>${year || 'CineFlex'} • ${item.media_type === 'tv' || item.name ? 'Series' : 'Movie'}</small><div class="cf-card-actions"><button type="button" class="cf-card-play" onclick="event.stopPropagation(); showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})" aria-label="Play ${cfEscapeHtml(title)}"><i class="fa-solid fa-play"></i></button><button type="button" onclick="event.stopPropagation(); showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})" aria-label="More information"><i class="fa-solid fa-circle-info"></i></button></div></div>` : ''}
    </div>`;
  }).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = isNetflix ? "netflix-item-container view-all-card" : "card view-all-card";
  viewAllCard.setAttribute("tabindex", "0");
  viewAllCard.innerHTML = `<div style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer; border-radius:6px;"><span>View All</span></div>`;
  viewAllCard.onclick = () => viewAll(containerId);
  container.appendChild(viewAllCard);
}

function displayDramaBoxCards(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container || !data) return;
  
  container.innerHTML = data.filter(i => i.poster_path).map((item) => {
    const simulatedEpisodes = 60 + (item.id % 40);
    return `
    <div class="card dramabox-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        <img src="${IMG_URL}${item.poster_path}" loading="lazy">
        <div class="card-badges">
            <span class="badge-episodes">Ep. ${simulatedEpisodes}</span>
        </div>
        <div class="card-info-overlay">
            <p class="card-title">${item.title || item.name}</p>
        </div>
    </div>`;
  }).join('');

  const viewAllCard = document.createElement('div');
  viewAllCard.className = "card dramabox-card view-all-card";
  viewAllCard.setAttribute("tabindex", "0");
  viewAllCard.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer; border-radius: 8px;"><span>View All</span></div>`;
  viewAllCard.onclick = () => viewAll(containerId);
  container.appendChild(viewAllCard);
}

// --- MGA DRAWER, MODAL, AT SEARCH NAV INTERFACES ---
function openMenuDrawer() {
  const drawer = document.getElementById("menu-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (!drawer) return;
  const isOpen = drawer.classList.contains("active");
  drawer.classList.toggle("active", !isOpen);
  backdrop && backdrop.classList.toggle("active", !isOpen);
  document.body.classList.toggle("drawer-open", !isOpen);
}
function closeMenuDrawer() {
  const drawer = document.getElementById("menu-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  drawer && drawer.classList.remove("active");
  backdrop && backdrop.classList.remove("active");
  document.body.classList.remove("drawer-open");
}
function closeModal() { 
  document.getElementById("details-modal").style.display = "none"; 
  document.getElementById("modal-video-iframe").src = ""; 
  document.body.style.overflow = "auto"; 
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.unlock === 'function') {
     screen.orientation.unlock();
  }
}
function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("searchInput").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; currentViewAllUrl = ""; }

function addToContinueWatching(item) {
  if (!cineflexSignedIn()) return;
  continueWatching = continueWatching.filter(i => i.id !== item.id);
  continueWatching.unshift(item);
  if (continueWatching.length > 10) continueWatching.pop();
  localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
  saveUserData();
  updateContinueUI();
}

function updateContinueUI() {
  const section = document.getElementById("continue-watching-section");
  if (!section) return;
  if (!cineflexSignedIn() || continueWatching.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  displayCards(continueWatching, "continue-list");
}

async function viewAll(containerId) {
    const font = document.getElementById("search-results");
    const overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return;

    currentViewAllPage = 1;
    isFetchingViewAll = false;
    font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Loading list...</div>";
    overlay.style.display = "block";

    let url = "";
    
    if (containerId === "trending-today") {
        url = `${BASE_URL}/trending/all/day?api_key=${API_KEY}`;
    } else if (containerId === "marvel-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`;
    } else if (containerId === "pinoy-action-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`;
    } else if (containerId === "anime-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`;
    } else if (containerId === "filipino-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`;
    } else if (containerId === "kdrama-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`;
    } else if (containerId === "kpop-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`;
    } else if (containerId === "kids-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`;
    } else if (containerId === "cocomelon-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16,10751&keywords=210024|310931|234327&sort_by=popularity.desc`;
    } else if (containerId === "netflix-movies-list") {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`;
    } else if (containerId === "dramabox-list") {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16,16&with_original_language=zh|ko&sort_by=popularity.desc`;
    } else if (containerId === "continue-list") {
        font.innerHTML = continueWatching.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
        return;
    }

    if (url === "") return;
    currentViewAllUrl = url;

    try {
        const [page1, page2] = await Promise.all([
            fetch(`${url}&page=1`).then(r => r.json()),
            fetch(`${url}&page=2`).then(r => r.json())
        ]);
        
        const allItems = [...(page1.results || []), ...(page2.results || [])];
        currentViewAllPage = 2;

        font.innerHTML = allItems.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                <img src="${IMG_URL}${item.poster_path}">
                <p>${item.title || item.name}</p>
            </div>`).join('');
            
        selectedIndex = 0; 
    } catch (err) {
        console.error(err);
        font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Failed to load items.</div>";
    }
}

function setupInfiniteScroll() {
    const overlay = document.getElementById("search-overlay");
    if (!overlay) return;

    overlay.addEventListener("scroll", async function() {
        if (currentViewAllUrl === "" || isFetchingViewAll) return;
        const font = document.getElementById("search-results");
        
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 300) {
            isFetchingViewAll = true;
            currentViewAllPage++;
            try {
                const res = await fetch(`${currentViewAllUrl}&page=${currentViewAllPage}`).then(r => r.json());
                if (res.results && res.results.length > 0) {
                    const extraHtml = res.results.filter(i => i.poster_path).map(item => `
                        <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                            <img src="${IMG_URL}${item.poster_path}">
                            <p>${item.title || item.name}</p>
                        </div>`).join('');
                    font.insertAdjacentHTML('beforeend', extraHtml);
                }
            } catch (error) { console.error(error); } finally { isFetchingViewAll = false; }
        }
    });
}

// Patakbuhin ang API Engine Initializer
init();

// --- DOM CONTENT LOADED - ATTACH ALL INTERACTIONS SAFETY ---
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('installBtn');
  
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.log("Deferred prompt ay hindi pa ready.");
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice outcome: ${outcome}`);
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('Cineflex PWA installed successfully!');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => processSearch(e.target.value));
  }

  const banner = document.getElementById("banner");
  if (banner) {
     banner.addEventListener('touchstart', handleTouchStart, false);
     banner.addEventListener('touchend', handleTouchEnd, false);
  }

  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".navbar");
    if (nav) {
      if (window.scrollY > 30) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    }
  });
});

// --- REMOTE NAVIGATION SYSTEM ---
let selectedIndex = 0;
const getFocusables = () => document.querySelectorAll('button, [onclick], .card, .episode-item, .nav-item, .search-card, .netflix-item-container, .modern-grid-item');

function moveFocus(direction) {
    const items = getFocusables();
    if (items.length === 0) return;

    const cols = 4; 
    let newIndex = selectedIndex;

    switch(direction) {
        case 'ArrowRight': newIndex = Math.min(selectedIndex + 1, items.length - 1); break;
        case 'ArrowLeft':  newIndex = Math.max(selectedIndex - 1, 0); break;
        case 'ArrowDown':  newIndex = Math.min(selectedIndex + cols, items.length - 1); break;
        case 'ArrowUp':    newIndex = Math.max(selectedIndex - cols, 0); break;
        case 'Enter':
            if (items[selectedIndex]) items[selectedIndex].click();
            return;
    }

    selectedIndex = newIndex;
    if (items[selectedIndex]) {
        items.forEach(el => { if(el.style) el.style.outline = "none"; });
        items[selectedIndex].focus();
        if(items[selectedIndex].style) items[selectedIndex].style.outline = "2px solid #e50914";
        items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

document.addEventListener('keydown', (e) => {
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault(); 
        moveFocus(e.key);
    }
});

// ======================================
// CINEFLEX AI ENGINE v1.0
// ======================================

function getRecommendedContent() {
    if (continueWatching.length === 0) return;
    const last = continueWatching[0];

    fetch(`${BASE_URL}/${currentTVState.type}/${last.id}/recommendations?api_key=${API_KEY}`)
        .then(r => r.json())
        .then(data => {
            if (!data.results) return;
            let row = document.getElementById("recommended-list");

            if (!row) {
                const section = document.createElement("section");
                section.className = "row";
                section.innerHTML = `
                    <h2>Recommended For You</h2>
                    <div class="scroller" id="recommended-list"></div>
                `;
                document.querySelector("main").prepend(section);
                row = document.getElementById("recommended-list");
            }
            displayCards(data.results, "recommended-list");
        });
}

function savePlayback(movieId, time) {
    localStorage.setItem("resume_" + movieId, time);
}

function getPlayback(movieId) {
    return Number(localStorage.getItem("resume_" + movieId) || 0);
}

const iframePlayer = document.getElementById("modal-video-iframe");
if (iframePlayer) {
    iframePlayer.addEventListener("load", () => {
        console.log("Player Loaded");
    });
}

setTimeout(getRecommendedContent, 2000);

// ======================================
// CINEFLEX PREMIUM ENGINE v2.0
// Part 5
// ======================================

window.addEventListener("load", () => {
    const splash = document.getElementById("splash-overlay");
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = "0";
            setTimeout(() => {
                splash.remove();
            }, 700);
        }, 1800);
    }
});

setInterval(() => {
    if (trendingItems.length > 1) {
        changeBanner(1);
    }
}, 10000);

const lazyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("loaded");
            lazyObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.2
});

function observeImages() {
    document.querySelectorAll("img").forEach(img => {
        lazyObserver.observe(img);
    });
}
setTimeout(observeImages, 1500);

function hideSkeleton() {
    document.querySelectorAll(".skeleton").forEach(el => {
        el.remove();
    });
}

window.addEventListener("load", () => {
    setTimeout(hideSkeleton, 1000);
});

document.addEventListener("mouseover", (e) => {
    if (e.target.closest(".card")) {
        e.target.closest(".card").classList.add("hovering");
    }
});

document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".card")) {
        e.target.closest(".card").classList.remove("hovering");
    }
});

setInterval(() => {
    const iframe = document.getElementById("modal-video-iframe");
    if (currentItem && iframe) {
        savePlayback(currentItem.id, Date.now());
    }
}, 5000);

function showResumeNotice() {
    if (!currentItem) return;
    const time = getPlayback(currentItem.id);
    if (time > 0) {
        console.log("Resume available.");
    }
}

setTimeout(() => {
    if (deferredPrompt) {
        const btn = document.getElementById("installBtn");
        if (btn) {
            btn.classList.add("install-pulse");
        }
    }
}, 10000);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal();
        closeSearch();
    }
});

const bodyObserver = new MutationObserver(() => {
    observeImages();
});

bodyObserver.observe(document.body, {
    childList: true,
    subtree: true
});

console.log("✅ Cineflex Premium Engine Loaded");

// ======================================
// CINEFLEX PERFORMANCE ENGINE
// Part 6
// ======================================

const apiCache = new Map();

async function cachedFetch(url) {
    if (apiCache.has(url)) {
        return apiCache.get(url);
    }
    const response = await fetch(url);
    const data = await response.json();
    apiCache.set(url, data);
    return data;
}

function preloadBanner() {
    if (!trendingItems.length) return;
    const next = trendingItems[(currentBannerIndex + 1) % trendingItems.length];
    if (!next.backdrop_path) return;

    const img = new Image();
    img.src = `https://image.tmdb.org/t/p/original${next.backdrop_path}`;
}

setInterval(() => {
    if (apiCache.size > 100) {
        apiCache.clear();
        console.log("TMDB cache cleared.");
    }
}, 300000);

setInterval(preloadBanner, 8000);

window.addEventListener("offline", () => {
    alert("You're offline.");
});

window.addEventListener("online", () => {
    console.log("Internet restored.");
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        console.log("Background mode");
    } else {
        console.log("Foreground mode");
    }
});

console.log("Performance Engine Loaded");

// ===========================
// FIREBASE CLOUD SYNC
// ===========================

async function saveUserData() {
    const activeProfile = localStorage.getItem("cineflex_profile") || (typeof currentProfile !== "undefined" ? currentProfile : null);
    if (!auth.currentUser || !activeProfile) return;
    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(activeProfile)
        .set({
            watchlist: watchlist,
            continueWatching: continueWatching
        }, { merge: true });
}

async function loadUserData() {
    const activeProfile = localStorage.getItem("cineflex_profile") || (typeof currentProfile !== "undefined" ? currentProfile : null);
    if (!auth.currentUser || !activeProfile) return;
    const doc = await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(activeProfile)
        .get();

    if (!doc.exists) {
        watchlist = [];
        continueWatching = [];
        updateContinueUI();

getRecommendedContent();
        return;
    }

    const data = doc.data();

    // Build 250.3: merge device data with cloud data instead of overwriting it.
    // This keeps My List and Continue Watching safe when the user signs in on a new device.
    const localWatchlist = (() => {
        try { return JSON.parse(localStorage.getItem("cineflex_watchlist") || "[]"); }
        catch (_) { return []; }
    })();
    const localRecent = (() => {
        try { return JSON.parse(localStorage.getItem("cineflex_recent") || "[]"); }
        catch (_) { return []; }
    })();

    const mediaKey = (item) => `${item?.media_type || item?.type || (item?.name ? "tv" : "movie")}:${item?.id || ""}`;
    const mergeUnique = (cloudItems, localItems, limit = 100) => {
        const merged = [];
        const seen = new Set();
        [...(cloudItems || []), ...(localItems || [])].forEach(item => {
            if (!item || !item.id) return;
            const key = mediaKey(item);
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(item);
        });
        return merged.slice(0, limit);
    };

    watchlist = mergeUnique(data.watchlist, localWatchlist, 100);
    continueWatching = mergeUnique(data.continueWatching, localRecent, 20);

    localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
    updateContinueUI();

    // Persist only when a merge changed the cloud copy.
    if ((data.watchlist || []).length !== watchlist.length || (data.continueWatching || []).length !== continueWatching.length) {
        saveUserData().catch(error => console.warn("CineFlex data merge sync skipped:", error));
    }
}

// ======================================
// CINEFLEX PROFILE ENGINE v1.0
// ======================================

let currentProfile = null;
let profiles = [];

// Load profiles from Firebase
async function loadProfiles() {
    if (!auth.currentUser) return;

    const doc = await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .get();

    profiles = [];

doc.forEach(d => {
    profiles.push({
        id: d.id,
        ...d.data()
    });
});

if (profiles.length === 0) {
    await createDefaultProfile();
    return;
}

    const savedProfile = localStorage.getItem("cineflex_profile");
    if (savedProfile && profiles.find(p => p.id === savedProfile)) {
        await selectProfile(savedProfile);
    } else {
        showProfileSelector();
    }
}

// Create default profile
async function createDefaultProfile() {
    const name = auth.currentUser.displayName || "Profile";
    await db.collection("users")
.doc(auth.currentUser.uid)
.collection("profiles")
.add({

    name:name,
    avatar:auth.currentUser.photoURL ||
    "https://ui-avatars.com/api/?name="+encodeURIComponent(name),

    watchlist:[],
    continueWatching:[]

});
    loadProfiles();
}

// Show Profile Screen
function showProfileSelector(){
    const selector = document.getElementById("profile-selector");
    const container = document.getElementById("profiles");
    if (!container || !selector) return;

    container.innerHTML = "";
    profiles.forEach(profile => {
        container.innerHTML += `
        <div class="profile-card" onclick="selectProfile('${profile.id}')">
            <img src="${profile.avatar}">
            <span>${profile.name}</span>
        </div>
        `;
    });
    selector.style.display = "flex";
}

// Select profile (Inayos na gamit ang ASYNC)
async function selectProfile(id){
    currentProfile = id;
    localStorage.setItem("cineflex_profile", id);
    
    const selector = document.getElementById("profile-selector");
    if (selector) selector.style.display = "none";

    await loadUserData();
    console.log("Current Profile:", id);
}

// Add profile
async function createProfile(){
    const name = prompt("Profile name");
    if(!name) return;

    await db.collection("users")
    .doc(auth.currentUser.uid)
    .collection("profiles")
    .add({
        name: name,
        avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(name)
    });

    loadProfiles();
}

// =========================================================
// CINEFLEX MAANGAS PREMIUM UI UPGRADE v3.0
// Safe UI-only layer. Hindi nito binabago ang API/player logic.
// =========================================================
(function cineflexPremiumUI(){
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();

  ready(() => {
    const progress = document.getElementById('cf-progress-bar');
    const navItems = Array.from(document.querySelectorAll('.bottom-nav .nav-item'));
    const rows = Array.from(document.querySelectorAll('.row'));

    const updateProgress = () => {
      if (!progress) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };

    const updateNav = () => {
      navItems.forEach(item => item.classList.remove('active'));
      if (window.scrollY < 180 && navItems[0]) navItems[0].classList.add('active');
    };

    const revealRows = () => {
      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        if (rect.top < window.innerHeight - 70) row.classList.add('cf-visible');
      });
    };

    window.addEventListener('scroll', () => {
      updateProgress();
      updateNav();
      revealRows();
    }, { passive: true });

    document.addEventListener('click', (event) => {
      const item = event.target.closest('.bottom-nav .nav-item');
      if (!item) return;
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });

    const improveSearch = () => {
      const input = document.getElementById('searchInput');
      if (!input) return;
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('inputmode', 'search');
      input.setAttribute('aria-label', 'Search CineFlex');
    };

    const addDragHint = () => {
      document.querySelectorAll('.scroller').forEach(scroller => {
        scroller.setAttribute('aria-label', 'Swipe movie row');
      });
    };

    updateProgress();
    updateNav();
    revealRows();
    improveSearch();
    addDragHint();
  });
})();

// =====================================================
// CINEFLEX COMMUNITY EDITION - SPRINT 1 REAL BUILD
// Live online viewers + watching now + CineFlex trending
// =====================================================
(function CineFlexCommunitySprint1(){
  const HEARTBEAT_MS = 20000;
  const ONLINE_WINDOW_MS = 70000;
  const SESSION_KEY = 'cineflex_session_id_v1';
  const WATCHING_KEY = 'cineflex_current_watching_v1';
  const LOCAL_TREND_KEY = 'cineflex_local_trending_v1';
  let heartbeatTimer = null;
  let uiTimer = null;
  let currentWatching = null;
  let lastOnlineCount = 1;
  let lastWatchingCount = 0;

  function getSessionId(){
    let id = localStorage.getItem(SESSION_KEY);
    if(!id){
      id = 'cf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function getUserLabel(){
    const u = (window.auth && window.auth.currentUser) || window.currentUser || null;
    if(!u) return { uid: null, name: 'Guest Viewer', email: null, type: 'guest' };
    return { uid: u.uid, name: u.displayName || u.email || 'CineFlex User', email: u.email || null, type: 'user' };
  }

  function titleKey(item){
    if(!item || !item.id) return null;
    const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
    return `${type}_${item.id}`;
  }

  function normalizeTitle(item){
    if(!item || !item.id) return null;
    const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
    return {
      id: item.id,
      key: `${type}_${item.id}`,
      type,
      title: item.title || item.name || 'Untitled',
      poster_path: item.poster_path || null,
      backdrop_path: item.backdrop_path || null,
      media_type: type
    };
  }

  function nowMs(){ return Date.now(); }

  function hasDb(){ return !!(window.db && window.firebase && firebase.firestore); }

  function safeText(n, fallback='0'){
    return typeof n === 'number' && isFinite(n) ? String(n) : fallback;
  }

  function ensureCommunityUI(){
    // Online status is intentionally shown only inside the menu drawer.
    document.getElementById('cf-top-live-pill')?.remove();

    const drawer = document.getElementById('menu-drawer');
    if(drawer && !document.getElementById('cf-drawer-community-card')){
      const card = document.createElement('div');
      card.id = 'cf-drawer-community-card';
      card.className = 'drawer-community-card';
      card.innerHTML = `
        <strong><i class="fa-solid fa-signal"></i> CineFlex Live</strong>
        <div class="rowline"><span>Online viewers</span><b id="cf-drawer-online-count">1</b></div>
        <div class="rowline"><span>Watching this title</span><b id="cf-drawer-watching-count">0</b></div>
        <small>Real-time count, private at walang user names na ipinapakita.</small>`;
      const links = drawer.querySelector('.drawer-links') || drawer;
      links.insertBefore(card, links.firstChild);
    }

    const main = null; // Keep online activity off the homepage.
    document.getElementById('cf-community-section')?.remove();
    if(main && !document.getElementById('cf-community-section')){
      const sec = document.createElement('section');
      sec.id = 'cf-community-section';
      sec.className = 'cf-community-section';
      sec.innerHTML = `
        <div class="cf-community-head">
          <h2><i class="fa-solid fa-fire" style="color:#ff3b7a"></i> Live on CineFlex</h2>
          <small class="cf-community-live-label">Real-time activity</small>
        </div>
        <div class="cf-community-grid">
          <div class="cf-community-card"><span>Online right now</span><strong id="cf-card-online-count">1</strong><small>active viewers on the website</small></div>
          <div class="cf-community-card"><span>Watching current title</span><strong id="cf-card-watching-count">0</strong><small>updates while users play videos</small></div>
          <div class="cf-community-card"><span>Community activity</span><strong id="cf-card-activity-count">Live</strong><small>foundation for trending, watch party, and admin stats</small></div>
        </div>
        <div class="cf-community-head" style="margin-top:24px;">
          <h2><i class="fa-solid fa-chart-line" style="color:#00e5ff"></i> Trending in CineFlex</h2>
          <small style="color:#9fb0c4;">based on plays on your site</small>
        </div>
        <div id="cf-live-trending-list" class="cf-trending-list"></div>`;
      const firstRow = main.querySelector('.row');
      if(firstRow) main.insertBefore(sec, firstRow.nextSibling); else main.prepend(sec);
    }
  }

  function updateCountsUI(online, watching){
    lastOnlineCount = online || lastOnlineCount || 1;
    lastWatchingCount = watching || 0;
    const idsOnline = ['cf-top-online-count','cf-drawer-online-count','cf-card-online-count'];
    idsOnline.forEach(id => { const el = document.getElementById(id); if(el) el.textContent = safeText(lastOnlineCount, '1'); });
    const idsWatching = ['cf-drawer-watching-count','cf-card-watching-count'];
    idsWatching.forEach(id => { const el = document.getElementById(id); if(el) el.textContent = safeText(lastWatchingCount, '0'); });
  }

  function getLocalTrending(){
    try { return JSON.parse(localStorage.getItem(LOCAL_TREND_KEY) || '{}'); } catch(e) { return {}; }
  }

  function saveLocalTrending(obj){
    localStorage.setItem(LOCAL_TREND_KEY, JSON.stringify(obj));
  }

  function bumpLocalTrending(item){
    const t = normalizeTitle(item);
    if(!t) return;
    const map = getLocalTrending();
    const old = map[t.key] || {};
    map[t.key] = { ...t, plays: (old.plays || 0) + 1, lastPlayedAt: nowMs() };
    saveLocalTrending(map);
    renderLocalTrending();
  }

  function renderLocalTrending(remoteItems){
    const list = document.getElementById('cf-live-trending-list');
    if(!list) return;
    let items = Array.isArray(remoteItems) ? remoteItems : Object.values(getLocalTrending());
    items = items.sort((a,b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10);
    if(!items.length){
      list.innerHTML = `<div class="cf-community-card" style="min-width:260px;"><span>Wala pang play data</span><strong>Start watching</strong><small>Magkakaroon ng CineFlex trending kapag may nanood.</small></div>`;
      return;
    }
    list.innerHTML = items.map((it, idx) => {
      const img = it.backdrop_path || it.poster_path;
      const src = img ? `${IMG_URL}${img}` : '';
      return `<div class="cf-trending-item" onclick="cfOpenTrendingTitle('${it.type || it.media_type || 'movie'}', '${it.id}')">
        ${src ? `<img src="${src}" loading="lazy" onerror="this.style.display='none'">` : `<div style="height:107px;background:#15151d"></div>`}
        <div class="cf-trending-info"><b>#${idx+1} ${it.title || 'Untitled'}</b><small>${it.plays || 0} plays today</small></div>
      </div>`;
    }).join('');
  }

  window.cfOpenTrendingTitle = async function(type, id){
    try {
      const data = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`).then(r=>r.json());
      showDetails({...data, media_type:type});
    } catch(e) { console.warn('Open trending failed', e); }
  };

  async function sendHeartbeat(){
    ensureCommunityUI();
    const watching = currentWatching || (() => { try { return JSON.parse(localStorage.getItem(WATCHING_KEY) || 'null'); } catch(e){ return null; }})();
    const user = getUserLabel();
    const payload = {
      sessionId: getSessionId(),
      uid: user.uid,
      userType: user.type,
      displayName: user.name,
      email: user.email,
      page: location.pathname,
      titleKey: watching ? watching.key : null,
      titleId: watching ? watching.id : null,
      titleType: watching ? watching.type : null,
      titleName: watching ? watching.title : null,
      lastActiveMs: nowMs(),
      lastActiveAt: hasDb() ? firebase.firestore.FieldValue.serverTimestamp() : null,
      userAgent: navigator.userAgent.slice(0, 180)
    };

    if(hasDb()){
      try {
        await db.collection('cineflex_presence').doc(getSessionId()).set(payload, { merge:true });
      } catch(e) {
        console.warn('CineFlex presence write blocked:', e.message || e);
      }
    }
    updateLiveCounts();
  }

  async function updateLiveCounts(){
    const cutoff = nowMs() - ONLINE_WINDOW_MS;
    let online = 1;
    let watching = currentWatching ? 1 : 0;
    if(hasDb()){
      try {
        const onlineSnap = await db.collection('cineflex_presence').where('lastActiveMs', '>', cutoff).get();
        online = Math.max(onlineSnap.size, 1);
        if(currentWatching){
          const watchSnap = await db.collection('cineflex_presence')
            .where('lastActiveMs', '>', cutoff)
            .where('titleKey', '==', currentWatching.key)
            .get();
          watching = watchSnap.size;
        }
      } catch(e) {
        console.warn('CineFlex live count read blocked:', e.message || e);
      }
    }
    updateCountsUI(online, watching);
  }

  async function recordPlay(item){
    const t = normalizeTitle(item);
    if(!t) return;
    bumpLocalTrending(t);
    if(hasDb()){
      try {
        const key = `${t.key}_${new Date().toISOString().slice(0,10)}`;
        await db.collection('cineflex_title_activity').doc(key).set({
          ...t,
          date: new Date().toISOString().slice(0,10),
          plays: firebase.firestore.FieldValue.increment(1),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedMs: nowMs()
        }, { merge:true });
      } catch(e){
        console.warn('CineFlex activity write blocked:', e.message || e);
      }
    }
    loadRemoteTrending();
  }

  async function loadRemoteTrending(){
    renderLocalTrending();
    if(!hasDb()) return;
    try {
      const today = new Date().toISOString().slice(0,10);
      const snap = await db.collection('cineflex_title_activity')
        .where('date', '==', today)
        .orderBy('plays', 'desc')
        .limit(10)
        .get();
      const items = [];
      snap.forEach(doc => items.push(doc.data()));
      if(items.length) renderLocalTrending(items);
    } catch(e) {
      console.warn('CineFlex trending read blocked or index needed:', e.message || e);
    }
  }

  function setCurrentWatching(item){
    const t = normalizeTitle(item);
    currentWatching = t;
    if(t) localStorage.setItem(WATCHING_KEY, JSON.stringify(t));
    updateCountsUI(lastOnlineCount, t ? Math.max(lastWatchingCount, 1) : 0);
    sendHeartbeat();
  }

  function clearCurrentWatching(){
    currentWatching = null;
    localStorage.removeItem(WATCHING_KEY);
    sendHeartbeat();
  }

  function startTimers(){
    if(heartbeatTimer) clearInterval(heartbeatTimer);
    if(uiTimer) clearInterval(uiTimer);
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
    uiTimer = setInterval(updateLiveCounts, 15000);
  }

  function patchExistingFunctions(){
    const oldStart = window.startPlayback;
    if(typeof oldStart === 'function' && !oldStart.__cfCommunityPatched){
      const patched = function(){
        if(window.currentItem) { setCurrentWatching(window.currentItem); recordPlay(window.currentItem); }
        return oldStart.apply(this, arguments);
      };
      patched.__cfCommunityPatched = true;
      window.startPlayback = patched;
    }

    const oldEp = window.playSpecificEpisode;
    if(typeof oldEp === 'function' && !oldEp.__cfCommunityPatched){
      const patchedEp = function(){
        if(window.currentItem) { setCurrentWatching(window.currentItem); recordPlay(window.currentItem); }
        return oldEp.apply(this, arguments);
      };
      patchedEp.__cfCommunityPatched = true;
      window.playSpecificEpisode = patchedEp;
    }

    const oldTrailer = window.playTrailer;
    if(typeof oldTrailer === 'function' && !oldTrailer.__cfCommunityPatched){
      const patchedTrailer = function(){
        if(window.currentItem) setCurrentWatching(window.currentItem);
        return oldTrailer.apply(this, arguments);
      };
      patchedTrailer.__cfCommunityPatched = true;
      window.playTrailer = patchedTrailer;
    }

    const oldClose = window.closeModal;
    if(typeof oldClose === 'function' && !oldClose.__cfCommunityPatched){
      const patchedClose = function(){
        clearCurrentWatching();
        return oldClose.apply(this, arguments);
      };
      patchedClose.__cfCommunityPatched = true;
      window.closeModal = patchedClose;
    }
  }

  window.addEventListener('beforeunload', () => {
    if(hasDb()){
      try { db.collection('cineflex_presence').doc(getSessionId()).set({ lastActiveMs: 0, titleKey: null }, { merge:true }); } catch(e) {}
    }
  });

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) sendHeartbeat();
    else { sendHeartbeat(); loadRemoteTrending(); }
  });

  window.addEventListener('cineflex-login', () => setTimeout(sendHeartbeat, 400));
  window.addEventListener('cineflex-logout', () => setTimeout(sendHeartbeat, 400));

  window.addEventListener('load', () => {
    ensureCommunityUI();
    patchExistingFunctions();
    startTimers();
    loadRemoteTrending();
    setTimeout(patchExistingFunctions, 1200);
    setTimeout(loadRemoteTrending, 2200);
  });

  if(document.readyState !== 'loading'){
    ensureCommunityUI();
    patchExistingFunctions();
    startTimers();
    loadRemoteTrending();
  }
})();

// ===========================================
// CINEFLEX COMMUNITY COMMENTS v1
// Real-time comments per movie/series using Firestore
// ===========================================
(function(){
  let cfCommentsUnsub = null;
  let cfActiveCommentKey = null;

  function cfHasFirestore(){ return typeof db !== 'undefined' && db && typeof db.collection === 'function'; }
  function cfGetUser(){
    try { return (typeof auth !== 'undefined' && auth) ? auth.currentUser : (window.currentUser || null); }
    catch(e){ return window.currentUser || null; }
  }
  function cfTitleKey(item){
    if(!item) return null;
    const type = currentTVState && currentTVState.type ? currentTVState.type : ((item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie');
    return `${type}_${item.id}`;
  }
  function cfEscape(value){
    return String(value || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function cfRelativeTime(date){
    if(!date) return 'now';
    const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
    if(seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if(minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if(hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if(days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
  function cfUpdateCommentAuthUI(){
    const user = cfGetUser();
    const note = document.getElementById('cf-comment-login-note');
    const input = document.getElementById('cf-comment-input');
    const send = document.getElementById('cf-comment-send');
    const avatar = document.getElementById('cf-comment-user-avatar');
    if(note) note.style.display = user ? 'none' : 'block';
    if(input){
      input.disabled = !user;
      input.placeholder = user ? 'Magkwento tungkol sa movie na ito... maganda ba? sulit ba panoorin?' : 'Mag-login muna para makapag-comment...';
    }
    if(send) send.disabled = !user;
    if(avatar) avatar.src = (user && user.photoURL) ? user.photoURL : 'icon-192.png';
  }
  function cfRenderComments(docs){
    const list = document.getElementById('cf-comments-list');
    const count = document.getElementById('cf-comments-count');
    if(count) count.textContent = `${docs.length} comment${docs.length === 1 ? '' : 's'}`;
    if(!list) return;
    if(!docs.length){
      list.innerHTML = '<div class="cf-comment-empty">Wala pang comments. Ikaw ang unang magkwento kung maganda ang movie na ito.</div>';
      return;
    }
    list.innerHTML = docs.map(doc => {
      const c = doc.data ? doc.data() : doc;
      const created = c.createdAt && c.createdAt.toDate ? c.createdAt.toDate() : (c.createdAtMs ? new Date(c.createdAtMs) : null);
      const avatar = c.photoURL || 'icon-192.png';
      return `<div class="cf-comment-item">
        <img class="cf-comment-avatar" src="${cfEscape(avatar)}" alt="">
        <div class="cf-comment-body">
          <div class="cf-comment-meta">
            <span class="cf-comment-name">${cfEscape(c.displayName || 'CineFlex User')}</span>
            <span class="cf-comment-time">${cfEscape(cfRelativeTime(created))}</span>
          </div>
          <div class="cf-comment-text">${cfEscape(c.text)}</div>
        </div>
      </div>`;
    }).join('');
  }

  window.cfLoadCommentsForCurrent = function(){
    const box = document.getElementById('cf-comments-box');
    const list = document.getElementById('cf-comments-list');
    const count = document.getElementById('cf-comments-count');
    if(!box || !currentItem) return;
    cfUpdateCommentAuthUI();
    const key = cfTitleKey(currentItem);
    cfActiveCommentKey = key;
    if(count) count.textContent = 'Loading...';
    if(list) list.innerHTML = '<div class="cf-comment-empty">Loading comments...</div>';

    if(cfCommentsUnsub){
      try { cfCommentsUnsub(); } catch(e) {}
      cfCommentsUnsub = null;
    }
    if(!cfHasFirestore()){
      if(list) list.innerHTML = '<div class="cf-comment-empty">Comments need Firebase Firestore connection.</div>';
      return;
    }
    try {
      cfCommentsUnsub = db.collection('cineflex_comments').doc(key).collection('items')
        .orderBy('createdAtMs', 'desc')
        .limit(50)
        .onSnapshot((snap) => {
          if(cfActiveCommentKey !== key) return;
          const docs = [];
          snap.forEach(d => docs.push(d));
          cfRenderComments(docs);
        }, (err) => {
          console.warn('CineFlex comments read blocked:', err.message || err);
          if(list) list.innerHTML = '<div class="cf-comment-empty">Hindi ma-load ang comments. I-check ang Firestore rules.</div>';
        });
    } catch(e){
      console.warn('CineFlex comments error:', e.message || e);
      if(list) list.innerHTML = '<div class="cf-comment-empty">Hindi ma-load ang comments ngayon.</div>';
    }
  };

  window.cfPostComment = async function(){
    const user = cfGetUser();
    const input = document.getElementById('cf-comment-input');
    const send = document.getElementById('cf-comment-send');
    if(!currentItem || !input) return;
    if(!user){
      cfUpdateCommentAuthUI();
      if(typeof openLoginModal === 'function') openLoginModal();
      return;
    }
    const text = input.value.trim().replace(/\s+\n/g, '\n');
    if(!text){ input.focus(); return; }
    if(text.length > 500){ alert('Hanggang 500 characters lang muna ang comment.'); return; }
    if(!cfHasFirestore()){ alert('Firebase Firestore is not ready.'); return; }
    const key = cfTitleKey(currentItem);
    const type = currentTVState && currentTVState.type ? currentTVState.type : 'movie';
    try {
      if(send) send.disabled = true;
      await db.collection('cineflex_comments').doc(key).collection('items').add({
        titleKey: key,
        tmdbId: currentItem.id,
        type,
        title: currentItem.title || currentItem.name || 'Untitled',
        text,
        uid: user.uid,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'CineFlex User'),
        photoURL: user.photoURL || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        likes: 0,
        status: 'visible'
      });
      await db.collection('cineflex_comment_stats').doc(key).set({
        titleKey: key,
        tmdbId: currentItem.id,
        type,
        title: currentItem.title || currentItem.name || 'Untitled',
        lastCommentAtMs: Date.now(),
        commentCount: firebase.firestore.FieldValue.increment(1)
      }, { merge:true });
      input.value = '';
    } catch(e){
      console.warn('CineFlex comment post blocked:', e.message || e);
      alert('Hindi na-post ang comment. I-check ang Firestore rules o internet connection.');
    } finally {
      cfUpdateCommentAuthUI();
    }
  };

  // Patch showDetails and closeModal safely without touching the player logic.
  const patchComments = () => {
    if(typeof window.showDetails === 'function' && !window.showDetails.__cfCommentsPatched){
      const oldShow = window.showDetails;
      const patchedShow = async function(){
        const result = await oldShow.apply(this, arguments);
        setTimeout(() => window.cfLoadCommentsForCurrent && window.cfLoadCommentsForCurrent(), 250);
        return result;
      };
      patchedShow.__cfCommentsPatched = true;
      window.showDetails = patchedShow;
    }
    if(typeof window.closeModal === 'function' && !window.closeModal.__cfCommentsPatched){
      const oldClose = window.closeModal;
      const patchedClose = function(){
        if(cfCommentsUnsub){ try { cfCommentsUnsub(); } catch(e){} cfCommentsUnsub = null; }
        cfActiveCommentKey = null;
        return oldClose.apply(this, arguments);
      };
      patchedClose.__cfCommentsPatched = true;
      window.closeModal = patchedClose;
    }
  };

  window.addEventListener('cineflex-login', () => setTimeout(() => { cfUpdateCommentAuthUI(); window.cfLoadCommentsForCurrent && window.cfLoadCommentsForCurrent(); }, 300));
  window.addEventListener('cineflex-logout', () => setTimeout(cfUpdateCommentAuthUI, 300));
  window.addEventListener('load', () => { patchComments(); cfUpdateCommentAuthUI(); setTimeout(patchComments, 1200); });
  if(document.readyState !== 'loading'){ patchComments(); cfUpdateCommentAuthUI(); }
})();


// ===========================================
// CINEFLEX COMMUNITY RATINGS v1
// Like / Dislike / 1-5 stars per movie/series
// ===========================================
(function(){
  let cfRatingUnsub = null;
  let cfActiveRatingKey = null;
  let cfUserRatingCache = { reaction:null, stars:0 };

  function hasFirestore(){ return typeof db !== 'undefined' && db && typeof db.collection === 'function'; }
  function getUser(){ try { return (typeof auth !== 'undefined' && auth) ? auth.currentUser : (window.currentUser || null); } catch(e){ return window.currentUser || null; } }
  function titleKey(item){
    if(!item) return null;
    const type = currentTVState && currentTVState.type ? currentTVState.type : ((item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie');
    return `${type}_${item.id}`;
  }
  function titleType(){ return currentTVState && currentTVState.type ? currentTVState.type : (currentItem && (currentItem.first_air_date || currentItem.name || currentItem.media_type === 'tv') ? 'tv' : 'movie'); }
  function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }
  function updateAuthNote(){ const note=document.getElementById('cf-rating-login-note'); if(note) note.style.display=getUser()?'none':'block'; }
  function updateButtons(stats){
    const likes = stats.likes || 0, dislikes = stats.dislikes || 0, starCount = stats.starCount || 0, starSum = stats.starSum || 0;
    const average = starCount ? (starSum / starCount) : 0;
    setText('cf-like-count', likes);
    setText('cf-dislike-count', dislikes);
    setText('cf-rating-average', starCount ? average.toFixed(1) : '--');
    setText('cf-rating-summary', starCount ? `${starCount} user rating${starCount===1?'':'s'} • ${likes} likes • ${dislikes} dislikes` : 'Wala pang rating. Ikaw ang unang mag-rate.');
    document.getElementById('cf-like-btn')?.classList.toggle('active', cfUserRatingCache.reaction === 'like');
    document.getElementById('cf-dislike-btn')?.classList.toggle('active', cfUserRatingCache.reaction === 'dislike');
    document.querySelectorAll('.cf-stars button').forEach((btn, idx)=>btn.classList.toggle('active', idx < (cfUserRatingCache.stars || 0)));
    updateAuthNote();
  }
  async function loadUserRating(key){
    const user=getUser(); cfUserRatingCache={reaction:null, stars:0};
    if(!user || !hasFirestore()) return;
    try{
      const doc=await db.collection('cineflex_ratings').doc(key).collection('users').doc(user.uid).get();
      if(doc.exists){ const d=doc.data()||{}; cfUserRatingCache={reaction:d.reaction||null, stars:Number(d.stars||0)}; }
    }catch(e){ console.warn('CineFlex user rating read blocked:', e.message||e); }
  }
  window.cfLoadRatingForCurrent = async function(){
    if(!currentItem) return;
    const box=document.getElementById('cf-rating-box'); if(!box) return;
    const key=titleKey(currentItem); cfActiveRatingKey=key; updateAuthNote();
    if(cfRatingUnsub){ try{ cfRatingUnsub(); }catch(e){} cfRatingUnsub=null; }
    setText('cf-rating-summary','Loading community score...');
    await loadUserRating(key);
    if(!hasFirestore()){ updateButtons({}); setText('cf-rating-summary','Community rating needs Firebase Firestore.'); return; }
    try{
      cfRatingUnsub = db.collection('cineflex_ratings').doc(key).onSnapshot((doc)=>{
        if(cfActiveRatingKey !== key) return;
        updateButtons(doc.exists ? (doc.data()||{}) : {});
      }, (err)=>{ console.warn('CineFlex ratings read blocked:', err.message||err); setText('cf-rating-summary','Hindi ma-load ang ratings. I-check ang Firestore rules.'); });
    }catch(e){ console.warn('CineFlex ratings error:', e.message||e); updateButtons({}); }
  };

  async function saveRating(next){
    const user=getUser();
    if(!currentItem) return;
    if(!user){ updateAuthNote(); if(typeof openLoginModal==='function') openLoginModal(); return; }
    if(!hasFirestore()){ alert('Firebase Firestore is not ready.'); return; }
    const key=titleKey(currentItem), type=titleType();
    const prev={...cfUserRatingCache};
    const reaction = next.reaction !== undefined ? next.reaction : prev.reaction;
    const stars = next.stars !== undefined ? Number(next.stars||0) : Number(prev.stars||0);
    try{
      const batch=db.batch();
      const ratingRef=db.collection('cineflex_ratings').doc(key);
      const userRef=ratingRef.collection('users').doc(user.uid);
      const delta={
        titleKey:key, tmdbId:currentItem.id, type,
        title: currentItem.title || currentItem.name || 'Untitled',
        updatedAtMs: Date.now()
      };
      if(prev.reaction !== reaction){
        if(prev.reaction === 'like') delta.likes = firebase.firestore.FieldValue.increment(-1);
        if(prev.reaction === 'dislike') delta.dislikes = firebase.firestore.FieldValue.increment(-1);
        if(reaction === 'like') delta.likes = firebase.firestore.FieldValue.increment(1);
        if(reaction === 'dislike') delta.dislikes = firebase.firestore.FieldValue.increment(1);
      }
      if(prev.stars !== stars){
        if(prev.stars > 0){ delta.starCount = firebase.firestore.FieldValue.increment(-1); delta.starSum = firebase.firestore.FieldValue.increment(-prev.stars); }
        if(stars > 0){ delta.starCount = firebase.firestore.FieldValue.increment(1); delta.starSum = firebase.firestore.FieldValue.increment(stars); }
      }
      batch.set(ratingRef, delta, {merge:true});
      batch.set(userRef, {uid:user.uid, reaction, stars, updatedAtMs:Date.now(), displayName:user.displayName||'', photoURL:user.photoURL||''}, {merge:true});
      cfUserRatingCache={reaction, stars}; updateButtons({});
      await batch.commit();
    }catch(e){ console.warn('CineFlex rating save blocked:', e.message||e); alert('Hindi na-save ang rating. I-check ang Firestore rules o internet connection.'); }
  }
  window.cfReactToTitle = function(reaction){ const current=cfUserRatingCache.reaction; saveRating({ reaction: current === reaction ? null : reaction }); };
  window.cfRateTitle = function(stars){ saveRating({ stars: Number(stars||0) }); };

  const patchRatings = () => {
    if(typeof window.showDetails === 'function' && !window.showDetails.__cfRatingsPatched){
      const oldShow = window.showDetails;
      const patchedShow = async function(){ const result = await oldShow.apply(this, arguments); setTimeout(()=>window.cfLoadRatingForCurrent && window.cfLoadRatingForCurrent(), 300); return result; };
      patchedShow.__cfRatingsPatched = true; window.showDetails = patchedShow;
    }
    if(typeof window.closeModal === 'function' && !window.closeModal.__cfRatingsPatched){
      const oldClose = window.closeModal;
      const patchedClose = function(){ if(cfRatingUnsub){ try{cfRatingUnsub();}catch(e){} cfRatingUnsub=null; } cfActiveRatingKey=null; return oldClose.apply(this, arguments); };
      patchedClose.__cfRatingsPatched = true; window.closeModal = patchedClose;
    }
  };
  window.addEventListener('cineflex-login', () => setTimeout(()=>{ updateAuthNote(); window.cfLoadRatingForCurrent && window.cfLoadRatingForCurrent(); }, 400));
  window.addEventListener('cineflex-logout', () => setTimeout(()=>{ cfUserRatingCache={reaction:null,stars:0}; updateAuthNote(); window.cfLoadRatingForCurrent && window.cfLoadRatingForCurrent(); }, 400));
  window.addEventListener('load', () => { patchRatings(); updateAuthNote(); setTimeout(patchRatings, 1300); });
  if(document.readyState !== 'loading'){ patchRatings(); updateAuthNote(); }
})();

// CineFlex Top 10 desktop navigation
function cfScrollTop10(direction) {
  const row = document.getElementById('top10-list');
  if (!row) return;
  const amount = Math.max(320, Math.round(row.clientWidth * 0.78));
  row.scrollBy({ left: direction * amount, behavior: 'smooth' });
}


// BUILD 240: Guests can watch, but private viewing data is account-only.
(function initGuestViewingPrivacy(){
  function applyUserState(user){
    if (!user) {
      watchlist = [];
      continueWatching = [];
      updateContinueUI();
    }
  }
  window.addEventListener('cineflex-auth-state', event => applyUserState(event.detail && event.detail.user));
  window.addEventListener('cineflex-logout', () => applyUserState(null));
  if (window.cineflexAuthReady) applyUserState(window.currentUser || null);
})();


// BUILD 250.6 — Hero autoplay, progress, preload, and efficient search input.
(function initPremiumHomepage2506(){
  const ROTATE_MS = 8000;
  let heroTimer = null;

  function preloadHero(index){
    if(!Array.isArray(window.trendingItems || trendingItems) || !trendingItems.length) return;
    const item = trendingItems[index % trendingItems.length];
    if(item?.backdrop_path){ const img = new Image(); img.src = `https://image.tmdb.org/t/p/original${item.backdrop_path}`; }
  }
  function drawHeroDots(){
    const holder = document.getElementById('cf-hero-dots');
    if(!holder || !trendingItems?.length) return;
    const count = Math.min(6, trendingItems.length);
    holder.innerHTML = Array.from({length:count},(_,i)=>`<button class="cf-hero-dot ${i===currentBannerIndex?'active':''}" type="button" aria-label="Featured title ${i+1}" data-index="${i}"></button>`).join('');
    holder.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      currentBannerIndex=Number(btn.dataset.index||0); setBanner(trendingItems[currentBannerIndex]); restartHero();
    }));
  }
  function restartProgress(){
    const bar=document.getElementById('cf-hero-progress-bar'); if(!bar)return;
    bar.classList.remove('is-running'); void bar.offsetWidth; bar.classList.add('is-running');
  }
  function restartHero(){
    clearInterval(heroTimer); restartProgress(); drawHeroDots(); preloadHero(currentBannerIndex+1);
    if(trendingItems?.length>1) heroTimer=setInterval(()=>{
      const banner=document.getElementById('banner'); banner?.classList.add('cf-hero-changing');
      setTimeout(()=>{ changeBanner(1); banner?.classList.remove('cf-hero-changing'); drawHeroDots(); preloadHero(currentBannerIndex+1); restartProgress(); },180);
    },ROTATE_MS);
  }
  const oldSetBanner=window.setBanner;
  if(typeof oldSetBanner==='function') window.setBanner=function(item){ const out=oldSetBanner.apply(this,arguments); drawHeroDots(); return out; };
  window.addEventListener('load',()=>setTimeout(restartHero,700));
  document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(heroTimer):restartHero());
  document.getElementById('banner')?.addEventListener('mouseenter',()=>clearInterval(heroTimer));
  document.getElementById('banner')?.addEventListener('mouseleave',restartHero);

  const input=document.getElementById('searchInput');
  if(input){
    input.removeAttribute('oninput');
    let timer=null;
    input.addEventListener('input',e=>{ clearTimeout(timer); timer=setTimeout(()=>window.processSearch?.(e.target.value),260); });
  }
})();


// CineFlex Build 250.8 — premium navigation state
(function(){
  function setActiveNav(button){
    document.querySelectorAll('.cf-native-bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
    if(button) button.classList.add('active');
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cf-native-bottom-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => setActiveNav(btn));
    });
  });
  window.cfSetActiveNav = setActiveNav;
})();
