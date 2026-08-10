/* CineFlex Viewer Retention Pro v311.0 */
(() => {
  'use strict';

  const MISSION_KEY = 'cineflex_weekly_mission_311';
  const NOTIFY_KEY = 'cineflex_retention_seen_311';
  const RECENT_KEY = 'cineflex_recent';
  const WATCHLIST_KEYS = ['cineflex_watchlist', 'cineflex_my_list'];
  const GOAL = 3;
  const $ = (id) => document.getElementById(id);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function weekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  function mission() {
    const currentWeek = weekKey();
    const saved = read(MISSION_KEY, null);
    if (!saved || saved.week !== currentWeek) {
      const fresh = { week: currentWeek, explored: [], completed: false, completedAt: null };
      write(MISSION_KEY, fresh);
      return fresh;
    }
    return saved;
  }

  function titleOf(item) { return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled'; }
  function recentItems() {
    const items = read(RECENT_KEY, []);
    return Array.isArray(items) ? items.filter(x => x && x.id) : [];
  }
  function watchlistItems() {
    for (const key of WATCHLIST_KEYS) {
      const value = read(key, []);
      if (Array.isArray(value) && value.length) return value.filter(x => x && x.id);
    }
    return [];
  }

  function insert() {
    if ($('cf-retention-pro')) return;
    const main = document.querySelector('main.content');
    if (!main) return;
    const anchor = $('cf-comeback-hub') || main.firstElementChild;
    const section = document.createElement('section');
    section.id = 'cf-retention-pro';
    section.className = 'cf-retention-pro';
    section.innerHTML = `
      <div class="cf311-heading">
        <div><span><i class="fa-solid fa-wand-magic-sparkles"></i> MADE FOR YOUR RETURN</span><h2>Your CineFlex Tonight</h2></div>
        <button id="cf311-refresh" type="button"><i class="fa-solid fa-rotate"></i> Refresh</button>
      </div>
      <div class="cf311-grid">
        <article class="cf311-panel cf311-mission">
          <div class="cf311-panel-top"><span class="cf311-icon"><i class="fa-solid fa-trophy"></i></span><div><small>WEEKLY MISSION</small><h3>Explore ${GOAL} titles</h3></div></div>
          <p>Open movies or series this week to unlock a profile achievement.</p>
          <div class="cf311-progress"><span id="cf311-mission-fill"></span></div>
          <div class="cf311-progress-meta"><strong id="cf311-mission-count">0 / ${GOAL}</strong><span id="cf311-mission-status">Keep exploring</span></div>
        </article>
        <button class="cf311-panel cf311-resume" id="cf311-resume" type="button">
          <div class="cf311-panel-top"><span class="cf311-icon"><i class="fa-solid fa-clock-rotate-left"></i></span><div><small>QUICK RETURN</small><h3 id="cf311-resume-title">Continue your last watch</h3></div></div>
          <p id="cf311-resume-copy">Your latest title will appear here.</p><span class="cf311-action">Resume now <i class="fa-solid fa-play"></i></span>
        </button>
        <button class="cf311-panel cf311-list" id="cf311-list" type="button">
          <div class="cf311-panel-top"><span class="cf311-icon"><i class="fa-solid fa-heart"></i></span><div><small>MY LIST REMINDER</small><h3 id="cf311-list-title">Build your watchlist</h3></div></div>
          <p id="cf311-list-copy">Save titles so your next movie night is ready.</p><span class="cf311-action">Open My List <i class="fa-solid fa-arrow-right"></i></span>
        </button>
      </div>
      <div class="cf311-comeback-note" id="cf311-comeback-note" hidden>
        <i class="fa-solid fa-bell"></i><div><strong>Welcome back!</strong><span id="cf311-note-text">Your CineFlex picks are ready.</span></div><button type="button" id="cf311-note-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
      </div>`;
    if (anchor) anchor.insertAdjacentElement('afterend', section); else main.prepend(section);
  }

  function renderMission() {
    const data = mission();
    const count = Math.min(GOAL, new Set(data.explored || []).size);
    const completed = count >= GOAL;
    const fill = $('cf311-mission-fill');
    if (fill) fill.style.width = `${Math.round((count / GOAL) * 100)}%`;
    if ($('cf311-mission-count')) $('cf311-mission-count').textContent = `${count} / ${GOAL}`;
    if ($('cf311-mission-status')) $('cf311-mission-status').textContent = completed ? 'Achievement unlocked!' : `${GOAL - count} title${GOAL-count===1?'':'s'} remaining`;
    if (completed && !data.completed) {
      data.completed = true;
      data.completedAt = Date.now();
      write(MISSION_KEY, data);
      window.showToast?.('Weekly mission completed: Movie Explorer badge unlocked!');
    }
    document.querySelector('.cf311-mission')?.classList.toggle('is-complete', completed);
  }

  function markExplored(item) {
    const id = item?.id || item?.tmdbId || item?.movieId;
    if (!id) return;
    const data = mission();
    data.explored = Array.from(new Set([...(data.explored || []), String(id)])).slice(-20);
    write(MISSION_KEY, data);
    renderMission();
  }

  function renderCards() {
    const recent = recentItems();
    const last = recent[0];
    const resume = $('cf311-resume');
    if (last && resume) {
      $('cf311-resume-title').textContent = titleOf(last);
      $('cf311-resume-copy').textContent = last.episode ? `Continue ${last.episode}` : 'Pick up where you left off.';
      resume.onclick = () => window.showDetails?.(last);
    } else if (resume) {
      resume.onclick = () => $('top10-section')?.scrollIntoView({ behavior: 'smooth' });
    }

    const list = watchlistItems();
    if ($('cf311-list-title')) $('cf311-list-title').textContent = list.length ? `${list.length} saved title${list.length === 1 ? '' : 's'} waiting` : 'Build your watchlist';
    if ($('cf311-list-copy')) $('cf311-list-copy').textContent = list.length ? `Next up: ${titleOf(list[0])}` : 'Save titles so your next movie night is ready.';
    const listBtn = $('cf311-list');
    if (listBtn) listBtn.onclick = () => {
      if (typeof window.openMyList === 'function') window.openMyList();
      else if (document.querySelector('[data-action="my-list"]')) document.querySelector('[data-action="my-list"]').click();
      else location.href = 'library.html';
    };
  }

  function notification() {
    const today = new Date().toISOString().slice(0, 10);
    const seen = read(NOTIFY_KEY, '');
    if (seen === today) return;
    const recent = recentItems();
    const list = watchlistItems();
    const note = $('cf311-comeback-note');
    if (!note) return;
    let message = 'Fresh recommendations and your Daily Pick are ready.';
    if (recent.length && list.length) message = `Continue ${titleOf(recent[0])}, plus ${list.length} saved title${list.length===1?'':'s'} in My List.`;
    else if (recent.length) message = `${titleOf(recent[0])} is ready to continue.`;
    else if (list.length) message = `${list.length} saved title${list.length===1?' is':'s are'} waiting in My List.`;
    $('cf311-note-text').textContent = message;
    note.hidden = false;
    $('cf311-note-close').onclick = () => { note.hidden = true; write(NOTIFY_KEY, today); };

    const menu = document.querySelector('.bottom-nav [data-nav="menu"], .bottom-nav .menu, .bottom-nav button:last-child, .bottom-nav a:last-child');
    if (menu && !menu.querySelector('.cf311-nav-dot')) {
      const dot = document.createElement('span'); dot.className = 'cf311-nav-dot'; dot.setAttribute('aria-label', 'New CineFlex update'); menu.appendChild(dot);
      menu.addEventListener('click', () => { dot.remove(); write(NOTIFY_KEY, today); }, { once: true });
    }
  }

  function hookDetails() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const original = window.showDetails;
      if (typeof original === 'function' && !original.__cf311Wrapped) {
        const wrapped = function(item, ...args) { markExplored(item); return original.call(this, item, ...args); };
        wrapped.__cf311Wrapped = true;
        window.showDetails = wrapped;
        clearInterval(timer);
      } else if (attempts > 40) clearInterval(timer);
    }, 250);
  }

  function start() {
    insert();
    renderMission();
    renderCards();
    notification();
    hookDetails();
    $('cf311-refresh')?.addEventListener('click', () => {
      renderCards();
      window.cfRefreshRecommendations?.();
      window.showToast?.('Your CineFlex picks were refreshed.');
    });
    window.addEventListener('storage', renderCards);
    window.addEventListener('cineflex-login', () => setTimeout(renderCards, 400));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
