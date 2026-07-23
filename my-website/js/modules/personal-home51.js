(() => {
  'use strict';

  const SIGNAL_KEY = 'cineflex_taste_signals_v2';
  const RECENT_KEY = 'cineflex_recent';
  const WATCHLIST_KEY = 'cineflex_watchlist';
  const cache = new Map();

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  };
  const typeOf = item => item?.media_type || (item?.first_air_date || item?.name ? 'tv' : 'movie');
  const titleOf = item => item?.title || item?.name || 'Untitled';
  const artOf = item => item?.backdrop_path || item?.poster_path;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const encodeItem = item => encodeURIComponent(JSON.stringify(item));

  function tasteData() {
    const signals = read(SIGNAL_KEY, { items: [], genres: {} });
    const recent = read(RECENT_KEY, []);
    const watchlist = read(WATCHLIST_KEY, []);
    return { signals, recent, watchlist };
  }

  function matchScore(item, genres) {
    const votes = Math.min(10, Number(item.vote_average || 0));
    const popularity = Math.min(100, Number(item.popularity || 0));
    const affinity = (item.genre_ids || []).reduce((sum, id) => sum + Math.min(6, Number(genres[id] || 0)), 0);
    return Math.max(71, Math.min(99, Math.round(67 + votes * 2 + popularity / 20 + affinity)));
  }

  function openItem(encoded) {
    try {
      const item = JSON.parse(decodeURIComponent(encoded));
      if (typeof window.showDetails === 'function') window.showDetails(item);
    } catch (error) {
      console.warn('CineFlex 5.1 card error', error);
    }
  }

  function bind(root) {
    root?.querySelectorAll('[data-cf51-item]').forEach(card => {
      const open = () => openItem(card.dataset.cf51Item);
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    });
  }

  function topTenCard(item, index) {
    return `<article class="cf-top10-card" tabindex="0" data-cf51-item="${encodeItem(item)}">
      <span class="cf-top10-number">${index + 1}</span>
      <div class="cf-top10-poster">
        <img loading="lazy" src="${IMG_URL}${item.poster_path || artOf(item)}" alt="${escapeHtml(titleOf(item))}">
        <span class="cf-top10-badge">TOP 10</span>
        <button type="button" aria-label="Open ${escapeHtml(titleOf(item))}"><i class="fa-solid fa-play"></i></button>
      </div>
    </article>`;
  }

  function becauseCard(item, seed, genres) {
    const score = matchScore(item, genres);
    return `<article class="cf51-because-card" tabindex="0" data-cf51-item="${encodeItem(item)}">
      <div class="cf51-because-art"><img loading="lazy" src="${IMG_URL}${artOf(item)}" alt="${escapeHtml(titleOf(item))}"><span>${score}% Match</span><button type="button"><i class="fa-solid fa-play"></i></button></div>
      <div class="cf51-because-info"><strong>${escapeHtml(titleOf(item))}</strong><small>Because of ${escapeHtml(titleOf(seed))}</small></div>
    </article>`;
  }

  async function api(path) {
    if (cache.has(path)) return cache.get(path);
    const promise = fetch(`${BASE_URL}${path}${path.includes('?') ? '&' : '?'}api_key=${API_KEY}`).then(response => {
      if (!response.ok) throw new Error(`TMDB ${response.status}`);
      return response.json();
    });
    cache.set(path, promise);
    return promise;
  }

  async function renderTopTen() {
    const row = document.getElementById('top10-list');
    if (!row) return;
    try {
      const data = await api('/trending/all/day?language=en-US');
      const items = (data.results || []).filter(item => item.poster_path && item.id).slice(0, 10);
      row.innerHTML = items.map(topTenCard).join('');
      bind(row);
    } catch (error) {
      row.innerHTML = '<div class="cf-row-loading">Top 10 is temporarily unavailable.</div>';
      console.warn(error);
    }
  }

  function chooseSeed() {
    const { signals, recent, watchlist } = tasteData();
    return signals.items?.find(item => item?.id) || recent.find(item => item?.id) || watchlist.find(item => item?.id) || null;
  }

  async function renderBecause() {
    const section = document.getElementById('because-section');
    const row = document.getElementById('because-list');
    const heading = document.getElementById('because-title');
    if (!section || !row || !heading) return;
    const seed = chooseSeed();
    if (!seed) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    heading.textContent = `Because You Watched ${titleOf(seed)}`;
    row.innerHTML = '<div class="cf-row-loading">Finding titles that match your taste...</div>';
    try {
      const data = await api(`/${typeOf(seed)}/${seed.id}/recommendations?language=en-US&page=1`);
      const { signals } = tasteData();
      const items = (data.results || []).filter(item => item.id && artOf(item)).slice(0, 14);
      if (!items.length) throw new Error('No recommendation results');
      row.innerHTML = items.map(item => becauseCard(item, seed, signals.genres || {})).join('');
      bind(row);
    } catch (error) {
      section.style.display = 'none';
      console.warn('CineFlex Because You Watched unavailable', error);
    }
  }

  function upgradePersonalHeader() {
    const note = document.querySelector('#for-you-section .cf-personal-note');
    if (note) note.textContent = 'Ranks picks from your watches, opens, My List, genres, and ratings';
  }

  async function refresh() {
    cache.clear();
    document.querySelector('#top10-list')?.classList.add('is-refreshing');
    await Promise.allSettled([renderTopTen(), renderBecause()]);
    document.querySelector('#top10-list')?.classList.remove('is-refreshing');
    if (typeof window.cfRefreshPersonalized === 'function') window.cfRefreshPersonalized();
  }

  window.cfRefreshHome51 = refresh;
  const boot = () => {
    upgradePersonalHeader();
    renderTopTen();
    setTimeout(renderBecause, 900);
    window.addEventListener('cineflex-login', () => setTimeout(renderBecause, 500));
    window.addEventListener('cineflex-profile-changed', () => setTimeout(refresh, 350));
    window.addEventListener('storage', event => {
      if ([SIGNAL_KEY, RECENT_KEY, WATCHLIST_KEY].includes(event.key)) renderBecause();
    });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
