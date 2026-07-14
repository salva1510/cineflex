(function () {
  'use strict';

  const ROTATE_MS = 10000;
  const TRAILER_DELAY_MS = 1800;
  let rotateTimer = null;
  let trailerTimer = null;
  let trailerToken = 0;
  let paused = false;

  const $ = (id) => document.getElementById(id);
  const getCurrent = () => Array.isArray(window.trendingItems) ? window.trendingItems[window.currentBannerIndex || 0] : null;
  const mediaType = (item) => (item && (item.media_type === 'tv' || item.first_air_date || (!item.title && item.name))) ? 'tv' : 'movie';

  function ensureHeroEnhancements() {
    const banner = $('banner');
    const content = banner && banner.querySelector('.banner-content');
    if (!banner || !content) return false;

    if (!$('cf-hero-video')) {
      const video = document.createElement('div');
      video.id = 'cf-hero-video';
      video.className = 'cf-hero-video';
      banner.insertBefore(video, banner.firstChild);
    }

    if (!$('cf-hero-eyebrow')) {
      const eyebrow = document.createElement('div');
      eyebrow.id = 'cf-hero-eyebrow';
      eyebrow.className = 'cf-hero-eyebrow';
      eyebrow.innerHTML = '<span class="live-dot"></span><span>FEATURED ON CINEFLEX</span>';
      content.insertBefore(eyebrow, content.firstChild);
    }

    if (!$('cf-hero-meta')) {
      const meta = document.createElement('div');
      meta.id = 'cf-hero-meta';
      meta.className = 'cf-hero-meta';
      const desc = $('banner-desc');
      desc && desc.parentNode.insertBefore(meta, desc);
    }

    if (!$('cf-hero-mylist')) {
      const buttons = content.querySelector('.banner-buttons');
      if (buttons) {
        const myList = document.createElement('button');
        myList.id = 'cf-hero-mylist';
        myList.type = 'button';
        myList.className = 'cf-hero-mylist';
        myList.innerHTML = '<i class="fa-solid fa-plus"></i><span>My List</span>';
        myList.addEventListener('click', toggleHeroWatchlist);
        buttons.appendChild(myList);
      }
    }

    if (!$('cf-hero-progress')) {
      const progress = document.createElement('div');
      progress.id = 'cf-hero-progress';
      progress.className = 'cf-hero-progress';
      progress.innerHTML = '<span></span>';
      banner.appendChild(progress);
    }
    return true;
  }

  function updateMyListButton(item) {
    const btn = $('cf-hero-mylist');
    if (!btn || !item) return;
    const list = Array.isArray(window.watchlist) ? window.watchlist : [];
    const saved = list.some((entry) => Number(entry.id) === Number(item.id));
    btn.classList.toggle('active', saved);
    btn.innerHTML = saved
      ? '<i class="fa-solid fa-check"></i><span>In My List</span>'
      : '<i class="fa-solid fa-plus"></i><span>My List</span>';
  }

  function toggleHeroWatchlist() {
    const item = getCurrent();
    if (!item) return;
    if (!Array.isArray(window.watchlist)) window.watchlist = [];
    const index = window.watchlist.findIndex((entry) => Number(entry.id) === Number(item.id));
    if (index >= 0) window.watchlist.splice(index, 1);
    else window.watchlist.unshift(item);
    localStorage.setItem('cineflex_watchlist', JSON.stringify(window.watchlist));
    updateMyListButton(item);
    if (typeof window.renderWatchlist === 'function') window.renderWatchlist();
  }

  function updateDots() {
    const dots = $('cf-hero-dots');
    if (!dots || !Array.isArray(window.trendingItems)) return;
    const max = Math.min(window.trendingItems.length, 8);
    dots.innerHTML = '';
    for (let i = 0; i < max; i += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = i === (window.currentBannerIndex || 0) ? 'active' : '';
      button.setAttribute('aria-label', `Show featured title ${i + 1}`);
      button.addEventListener('click', () => {
        window.currentBannerIndex = i;
        if (typeof window.setBanner === 'function') window.setBanner(window.trendingItems[i]);
        restartRotation();
      });
      dots.appendChild(button);
    }
  }

  function restartProgress() {
    const bar = document.querySelector('#cf-hero-progress span');
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = `cfHeroSprintProgress ${ROTATE_MS}ms linear forwards`;
  }

  function updateMeta(item) {
    const meta = $('cf-hero-meta');
    if (!meta || !item) return;
    const date = item.release_date || item.first_air_date || '';
    const year = date ? date.slice(0, 4) : 'New';
    const score = Number(item.vote_average || 0);
    const type = mediaType(item) === 'tv' ? 'Series' : 'Movie';
    meta.innerHTML = `
      <span class="match">${Math.max(78, Math.min(99, Math.round(score * 10)))}% Match</span>
      <span>${year}</span>
      <span class="age">16+</span>
      <span>${type}</span>
      <span><i class="fa-solid fa-star"></i> ${score ? score.toFixed(1) : 'New'}</span>`;
  }

  async function loadTrailer(item) {
    const box = $('cf-hero-video');
    if (!box || !item || !item.id || !window.BASE_URL || !window.API_KEY) return;
    const token = ++trailerToken;
    box.classList.remove('active');
    box.innerHTML = '';
    clearTimeout(trailerTimer);

    trailerTimer = setTimeout(async () => {
      try {
        const response = await fetch(`${window.BASE_URL}/${mediaType(item)}/${item.id}/videos?api_key=${window.API_KEY}`);
        if (!response.ok) return;
        const data = await response.json();
        if (token !== trailerToken) return;
        const videos = Array.isArray(data.results) ? data.results : [];
        const trailer = videos.find((v) => v.site === 'YouTube' && /official trailer|trailer/i.test(v.name || v.type || ''))
          || videos.find((v) => v.site === 'YouTube' && /trailer|teaser/i.test(v.type || ''));
        if (!trailer || !trailer.key) return;
        box.innerHTML = `<iframe title="CineFlex trailer preview" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${encodeURIComponent(trailer.key)}&playsinline=1&modestbranding=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        requestAnimationFrame(() => box.classList.add('active'));
      } catch (error) {
        console.warn('Hero trailer unavailable:', error);
      }
    }, TRAILER_DELAY_MS);
  }

  function applyHero(item) {
    if (!item || !ensureHeroEnhancements()) return;
    const banner = $('banner');
    banner.classList.remove('cf-hero-ready');
    requestAnimationFrame(() => banner.classList.add('cf-hero-ready'));
    updateMeta(item);
    updateMyListButton(item);
    updateDots();
    restartProgress();
    loadTrailer(item);
  }

  function rotate(direction) {
    if (!Array.isArray(window.trendingItems) || !window.trendingItems.length) return;
    const length = window.trendingItems.length;
    window.currentBannerIndex = ((window.currentBannerIndex || 0) + direction + length) % length;
    window.setBanner(window.trendingItems[window.currentBannerIndex]);
  }

  function startRotation() {
    clearInterval(rotateTimer);
    rotateTimer = setInterval(() => {
      if (!paused && !document.hidden) rotate(1);
    }, ROTATE_MS);
  }

  function restartRotation() {
    startRotation();
    restartProgress();
  }

  function patchSetBanner() {
    if (typeof window.setBanner !== 'function' || window.setBanner.__heroV2) return;
    const original = window.setBanner;
    window.setBanner = function (item) {
      const result = original.apply(this, arguments);
      applyHero(item);
      return result;
    };
    window.setBanner.__heroV2 = true;
  }

  function bindControls() {
    const banner = $('banner');
    $('cf-hero-prev')?.addEventListener('click', () => { rotate(-1); restartRotation(); });
    $('cf-hero-next')?.addEventListener('click', () => { rotate(1); restartRotation(); });
    banner?.addEventListener('mouseenter', () => { paused = true; });
    banner?.addEventListener('mouseleave', () => { paused = false; });
    banner?.addEventListener('focusin', () => { paused = true; });
    banner?.addEventListener('focusout', () => { paused = false; });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) restartRotation(); });
  }

  function init() {
    ensureHeroEnhancements();
    patchSetBanner();
    bindControls();
    startRotation();
    const wait = setInterval(() => {
      patchSetBanner();
      const item = getCurrent();
      if (item) {
        applyHero(item);
        clearInterval(wait);
      }
    }, 350);
    setTimeout(() => clearInterval(wait), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
