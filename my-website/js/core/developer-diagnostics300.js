(function () {
  'use strict';
  const PARAM = new URLSearchParams(location.search);
  const requested = PARAM.get('debug') === '1' || localStorage.getItem('cineflex_developer_mode') === '1';
  if (!requested) return;

  const $ = (id) => document.getElementById(id);
  const state = { allowed: false, frames: 0, fps: 0, lastFpsAt: performance.now(), requests: 0 };
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    state.requests += 1;
    return originalFetch.apply(this, args);
  };

  function tick(now) {
    state.frames += 1;
    if (now - state.lastFpsAt >= 1000) {
      state.fps = state.frames;
      state.frames = 0;
      state.lastFpsAt = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function value(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function render() {
    if (!state.allowed || $('cf-dev-panel')) return;
    const panel = document.createElement('aside');
    panel.id = 'cf-dev-panel';
    panel.className = 'cf-dev-panel';
    panel.innerHTML = `
      <div class="cf-dev-head"><strong>Developer Mode</strong><button type="button" id="cf-dev-close" aria-label="Close">×</button></div>
      <dl>
        <div><dt>Build</dt><dd id="cf-dev-build">-</dd></div>
        <div><dt>Auth</dt><dd id="cf-dev-auth">-</dd></div>
        <div><dt>Network</dt><dd id="cf-dev-network">-</dd></div>
        <div><dt>FPS</dt><dd id="cf-dev-fps">-</dd></div>
        <div><dt>Requests</dt><dd id="cf-dev-requests">-</dd></div>
        <div><dt>Memory</dt><dd id="cf-dev-memory">n/a</dd></div>
        <div><dt>Cache</dt><dd id="cf-dev-cache">-</dd></div>
      </dl>`;
    document.body.appendChild(panel);
    $('cf-dev-close').onclick = () => panel.remove();
    setInterval(() => {
      const build = window.CineFlexBuild || {};
      value('cf-dev-build', build.version || 'unknown');
      value('cf-dev-auth', window.auth?.currentUser?.email || 'Guest');
      value('cf-dev-network', navigator.onLine ? 'Online' : 'Offline');
      value('cf-dev-fps', String(state.fps));
      value('cf-dev-requests', String(state.requests));
      value('cf-dev-cache', build.cacheVersion || 'unknown');
      if (performance.memory) value('cf-dev-memory', `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`);
    }, 1000);
  }

  async function authorize(user) {
    if (!user || !window.db) return;
    try {
      const snap = await window.db.collection('cineflexAdmins').doc(user.uid).get();
      const data = snap.exists ? snap.data() : null;
      state.allowed = !!(data && data.active !== false && ['admin', 'superadmin', 'owner'].includes(String(data.role || '').toLowerCase()));
      if (state.allowed) render();
    } catch (error) {
      console.warn('Developer diagnostics authorization skipped:', error);
    }
  }

  window.addEventListener('cineflex-auth-state', (event) => authorize(event.detail?.user || null));
  if (window.auth?.currentUser) authorize(window.auth.currentUser);
})();
