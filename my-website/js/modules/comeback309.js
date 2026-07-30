(() => {
  'use strict';

  const CHECKIN_KEY = 'cineflex_daily_checkin_v1';
  const RECENT_KEY = 'cineflex_recent';
  const SIGNAL_KEY = 'cineflex_taste_signals_v2';
  const MOOD_KEY = 'cineflex_last_mood_v1';
  const GENRES = { action: 28, kilig: 10749, laugh: 35, thrill: 53, family: 10751 };
  const MOOD_LABELS = { action: 'Action Rush', kilig: 'Kilig Night', laugh: 'Good Vibes', thrill: 'Thrill Me', family: 'Family Time' };

  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const titleOf = item => item?.title || item?.name || 'Untitled';
  const typeOf = item => item?.media_type || (item?.first_air_date || item?.name ? 'tv' : 'movie');
  const artOf = item => item?.backdrop_path || item?.poster_path;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const encode = item => encodeURIComponent(JSON.stringify(item));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

  function dayDiff(a, b) {
    const one = new Date(`${a}T00:00:00`), two = new Date(`${b}T00:00:00`);
    return Math.round((two - one) / 86400000);
  }

  function updateCheckin() {
    const today = dateKey(new Date());
    const data = read(CHECKIN_KEY, { last: '', streak: 0, best: 0, visits: 0 });
    if (data.last !== today) {
      const gap = data.last ? dayDiff(data.last, today) : 99;
      data.streak = gap === 1 ? Number(data.streak || 0) + 1 : 1;
      data.last = today;
      data.visits = Number(data.visits || 0) + 1;
      data.best = Math.max(Number(data.best || 0), data.streak);
      write(CHECKIN_KEY, data);
    }
    return data;
  }

  function getLastItem() {
    const recent = read(RECENT_KEY, []);
    const signals = read(SIGNAL_KEY, { items: [] });
    return recent.find(item => item?.id) || signals.items?.find(item => item?.id) || null;
  }

  function insertHub() {
    if (document.getElementById('cf-comeback-hub')) return;
    const main = document.querySelector('main.content');
    if (!main) return;
    const hub = document.createElement('section');
    hub.id = 'cf-comeback-hub';
    hub.className = 'cf-comeback-hub';
    hub.innerHTML = `
      <div class="cf-comeback-top">
        <div>
          <span class="cf-comeback-eyebrow"><i class="fa-solid fa-bolt"></i> YOUR CINEFLEX NIGHT</span>
          <h2 id="cf-comeback-greeting">Welcome back</h2>
          <p id="cf-comeback-subtitle">Fresh picks are waiting for you.</p>
        </div>
        <div class="cf-streak-card" title="Visit CineFlex on consecutive days">
          <i class="fa-solid fa-fire-flame-curved"></i>
          <strong id="cf-streak-count">1</strong>
          <span>day streak</span>
        </div>
      </div>
      <div class="cf-comeback-grid">
        <button class="cf-return-card" id="cf-return-card" type="button">
          <span class="cf-return-shade"></span>
          <span class="cf-return-copy"><small>JUMP BACK IN</small><strong id="cf-return-title">Find something to watch</strong><em><i class="fa-solid fa-play"></i> Resume</em></span>
        </button>
        <button class="cf-daily-card" id="cf-daily-card" type="button">
          <span class="cf-daily-badge"><i class="fa-solid fa-star"></i> DAILY PICK</span>
          <span class="cf-daily-copy"><small>Changes in <b id="cf-daily-countdown">--:--:--</b></small><strong id="cf-daily-title">Loading today's pick…</strong><em>Open pick <i class="fa-solid fa-arrow-right"></i></em></span>
        </button>
      </div>
      <div class="cf-mood-bar">
        <div><strong>What are you in the mood for?</strong><span>One tap creates a fresh row.</span></div>
        <div class="cf-mood-chips" role="group" aria-label="Choose your mood">
          <button type="button" data-cf-mood="action">🔥 Action</button>
          <button type="button" data-cf-mood="kilig">💗 Kilig</button>
          <button type="button" data-cf-mood="laugh">😂 Laugh</button>
          <button type="button" data-cf-mood="thrill">😱 Thrill</button>
          <button type="button" data-cf-mood="family">👨‍👩‍👧 Family</button>
        </div>
      </div>
      <div class="cf-mood-results" id="cf-mood-results" hidden>
        <div class="cf-mood-results-head"><div><span>Made for this moment</span><h2 id="cf-mood-heading">Tonight's Picks</h2></div><button type="button" id="cf-mood-close" aria-label="Close mood recommendations"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="scroller cf-mood-scroller" id="cf-mood-list"></div>
      </div>`;
    main.prepend(hub);
  }

  function openItem(item) {
    if (item && typeof window.showDetails === 'function') window.showDetails(item);
  }

  function updateWelcome() {
    const checkin = updateCheckin();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Tonight on CineFlex';
    const el = document.getElementById('cf-comeback-greeting');
    if (el) el.textContent = greeting;
    const streak = document.getElementById('cf-streak-count');
    if (streak) streak.textContent = checkin.streak;
    const subtitle = document.getElementById('cf-comeback-subtitle');
    if (subtitle) subtitle.textContent = checkin.streak > 1 ? `You're on a ${checkin.streak}-day streak. Keep it going tomorrow.` : 'Come back tomorrow to build your viewing streak.';

    const item = getLastItem();
    const card = document.getElementById('cf-return-card');
    if (!card) return;
    if (item) {
      document.getElementById('cf-return-title').textContent = titleOf(item);
      const path = artOf(item);
      if (path) card.style.backgroundImage = `linear-gradient(90deg, rgba(4,4,6,.2), rgba(4,4,6,.95)), url("${window.IMG_URL || 'https://image.tmdb.org/t/p/w500'}${path}")`;
      card.onclick = () => openItem(item);
    } else {
      card.onclick = () => document.getElementById('top10-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function loadDailyPick() {
    const card = document.getElementById('cf-daily-card');
    if (!card || !window.BASE_URL || !window.API_KEY) return;
    try {
      const response = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=en-US`);
      const data = await response.json();
      const choices = (data.results || []).filter(item => item?.id && artOf(item));
      if (!choices.length) return;
      const now = new Date();
      const seed = Number(`${now.getFullYear()}${now.getMonth()+1}${now.getDate()}`);
      const item = choices[seed % choices.length];
      document.getElementById('cf-daily-title').textContent = titleOf(item);
      card.style.backgroundImage = `linear-gradient(90deg, rgba(10,3,5,.92), rgba(10,3,5,.18)), url("${window.IMG_URL || 'https://image.tmdb.org/t/p/w500'}${artOf(item)}")`;
      card.onclick = () => openItem(item);
    } catch (error) { console.warn('Daily Pick unavailable', error); }
  }

  function countdown() {
    const el = document.getElementById('cf-daily-countdown');
    if (!el) return;
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0);
      const seconds = Math.max(0, Math.floor((end - now) / 1000));
      const h = String(Math.floor(seconds / 3600)).padStart(2,'0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2,'0');
      const s = String(seconds % 60).padStart(2,'0');
      el.textContent = `${h}:${m}:${s}`;
    };
    tick(); setInterval(tick, 1000);
  }

  function moodCard(item) {
    return `<article class="cf-mood-card" tabindex="0" data-cf-item="${encode(item)}">
      <img loading="lazy" src="${window.IMG_URL || 'https://image.tmdb.org/t/p/w500'}${item.poster_path || artOf(item)}" alt="${esc(titleOf(item))}">
      <span><strong>${esc(titleOf(item))}</strong><small>${Math.round(Number(item.vote_average || 0) * 10)}% Match</small></span>
      <i class="fa-solid fa-play"></i>
    </article>`;
  }

  async function selectMood(mood) {
    const genre = GENRES[mood];
    const results = document.getElementById('cf-mood-results');
    const list = document.getElementById('cf-mood-list');
    if (!genre || !results || !list) return;
    write(MOOD_KEY, mood);
    document.querySelectorAll('[data-cf-mood]').forEach(btn => btn.classList.toggle('active', btn.dataset.cfMood === mood));
    results.hidden = false;
    document.getElementById('cf-mood-heading').textContent = MOOD_LABELS[mood];
    list.innerHTML = '<div class="cf-mood-loading">Building your perfect row…</div>';
    try {
      const type = mood === 'kilig' || mood === 'family' ? 'movie' : 'movie';
      const page = (new Date().getDate() % 4) + 1;
      const response = await fetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&with_genres=${genre}&page=${page}`);
      const data = await response.json();
      const items = (data.results || []).filter(item => item?.id && item.poster_path).slice(0, 14).map(item => ({ ...item, media_type: type }));
      list.innerHTML = items.map(moodCard).join('') || '<div class="cf-mood-loading">No picks available right now.</div>';
      list.querySelectorAll('[data-cf-item]').forEach(card => {
        const open = () => { try { openItem(JSON.parse(decodeURIComponent(card.dataset.cfItem))); } catch {} };
        card.addEventListener('click', open);
        card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
      });
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      list.innerHTML = '<div class="cf-mood-loading">Mood picks are temporarily unavailable.</div>';
      console.warn('Mood row unavailable', error);
    }
  }

  function bind() {
    document.querySelectorAll('[data-cf-mood]').forEach(btn => btn.addEventListener('click', () => selectMood(btn.dataset.cfMood)));
    document.getElementById('cf-mood-close')?.addEventListener('click', () => { document.getElementById('cf-mood-results').hidden = true; });
  }

  function boot() {
    insertHub(); updateWelcome(); bind(); loadDailyPick(); countdown();
    const savedMood = read(MOOD_KEY, '');
    if (savedMood && GENRES[savedMood]) document.querySelector(`[data-cf-mood="${savedMood}"]`)?.classList.add('active');
    window.addEventListener('storage', event => { if ([RECENT_KEY, SIGNAL_KEY].includes(event.key)) updateWelcome(); });
    window.addEventListener('cineflex-profile-changed', () => setTimeout(updateWelcome, 250));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
