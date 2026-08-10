/* CineFlex Unified Presence v1.0 — guest + member, all primary pages */
(() => {
  'use strict';
  if (window.__CINEFLEX_UNIFIED_PRESENCE__) return;
  window.__CINEFLEX_UNIFIED_PRESENCE__ = true;

  const COLLECTION = 'cineflex_presence';
  const SESSION_KEY = 'cineflex_presence_tab_v2';
  const WATCHING_KEY = 'cineflex_current_watching_v1';
  const HEARTBEAT_MS = 25000;
  const REFRESH_MS = 15000;
  const ACTIVE_WINDOW_MS = 120000;
  let heartbeatTimer = null;
  let refreshTimer = null;
  let unsubscribe = null;
  let currentTitle = detectTitle();

  function randomId() {
    try {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
  }

  function sessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'cf2_' + randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function firestoreReady() {
    return !!(window.db && window.firebase && firebase.firestore);
  }

  function detectTitle() {
    const p = new URLSearchParams(location.search);
    const id = p.get('id');
    if (!id) {
      try { return JSON.parse(localStorage.getItem(WATCHING_KEY) || 'null'); } catch (_) { return null; }
    }
    const type = p.get('type') === 'tv' ? 'tv' : 'movie';
    const title = p.get('title') || document.querySelector('#watchTitle,h1')?.textContent?.trim() || null;
    return { id: String(id), key: `${type}_${id}`, type, title: title || null };
  }

  function userInfo() {
    const user = window.auth?.currentUser || window.currentUser || null;
    return user ? {
      uid: user.uid,
      userType: 'user',
      displayName: user.displayName || user.email || 'CineFlex User'
    } : { uid: null, userType: 'guest', displayName: 'Guest Viewer' };
  }

  function deviceType() {
    const ua = navigator.userAgent || '';
    if (/Android TV|SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|AFT|BRAVIA|HbbTV/i.test(ua)) return 'tv';
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function payload(active = true) {
    const user = userInfo();
    const title = currentTitle;
    return {
      sessionId: sessionId(),
      uid: user.uid,
      userType: user.userType,
      displayName: user.displayName,
      page: location.pathname.split('/').pop() || 'index.html',
      pageUrl: location.pathname + location.search,
      deviceType: deviceType(),
      titleKey: active && title?.key ? title.key : null,
      titleId: active && title?.id ? String(title.id) : null,
      titleType: active && title?.type ? title.type : null,
      titleName: active && title?.title ? String(title.title).slice(0, 140) : null,
      visible: !document.hidden,
      lastActiveMs: active ? Date.now() : 0,
      lastActiveAt: firestoreReady() ? firebase.firestore.FieldValue.serverTimestamp() : null,
      version: 2
    };
  }

  async function heartbeat(active = true) {
    if (!firestoreReady()) return;
    try {
      await db.collection(COLLECTION).doc(sessionId()).set(payload(active), { merge: true });
    } catch (error) {
      console.warn('Unified presence heartbeat failed:', error?.message || error);
    }
  }

  function paintCount(online, watching) {
    const onlineIds = ['cf-drawer-online-count', 'cf-card-online-count', 'cf-top-online-count', 'cf-global-online-count'];
    const watchingIds = ['cf-drawer-watching-count', 'cf-card-watching-count', 'cf-global-watching-count'];
    onlineIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = String(Math.max(0, online)); });
    watchingIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = String(Math.max(0, watching)); });
    window.dispatchEvent(new CustomEvent('cineflex-presence-count', { detail: { online, watching } }));
  }

  async function refreshCounts() {
    if (!firestoreReady()) return;
    const cutoff = Date.now() - ACTIVE_WINDOW_MS;
    try {
      const snap = await db.collection(COLLECTION).where('lastActiveMs', '>', cutoff).get();
      let online = 0;
      let watching = 0;
      snap.forEach(doc => {
        const data = doc.data() || {};
        if (data.lastActiveMs > cutoff) {
          online += 1;
          if (currentTitle?.key && data.titleKey === currentTitle.key) watching += 1;
        }
      });
      paintCount(online, watching);
    } catch (error) {
      console.warn('Unified presence count failed:', error?.message || error);
    }
  }

  function start() {
    clearInterval(heartbeatTimer);
    clearInterval(refreshTimer);
    heartbeat(true);
    refreshCounts();
    heartbeatTimer = setInterval(() => heartbeat(true), HEARTBEAT_MS);
    refreshTimer = setInterval(refreshCounts, REFRESH_MS);
  }

  window.CineFlexPresence = {
    refresh: refreshCounts,
    heartbeat,
    setWatching(item) {
      if (!item?.id) return;
      const type = item.type === 'tv' || item.media_type === 'tv' ? 'tv' : 'movie';
      currentTitle = {
        id: String(item.id),
        key: `${type}_${item.id}`,
        type,
        title: item.title || item.name || item.titleName || null
      };
      try { localStorage.setItem(WATCHING_KEY, JSON.stringify(currentTitle)); } catch (_) {}
      heartbeat(true); refreshCounts();
    },
    clearWatching() {
      currentTitle = null;
      try { localStorage.removeItem(WATCHING_KEY); } catch (_) {}
      heartbeat(true); refreshCounts();
    }
  };

  document.addEventListener('visibilitychange', () => {
    heartbeat(true);
    if (!document.hidden) refreshCounts();
  });
  window.addEventListener('focus', () => { heartbeat(true); refreshCounts(); });
  window.addEventListener('pagehide', () => heartbeat(false));
  window.addEventListener('beforeunload', () => heartbeat(false));
  window.addEventListener('cineflex-login', () => setTimeout(() => heartbeat(true), 250));
  window.addEventListener('cineflex-logout', () => setTimeout(() => heartbeat(true), 250));

  const boot = () => {
    currentTitle = detectTitle();
    start();
    setTimeout(() => { currentTitle = detectTitle(); heartbeat(true); refreshCounts(); }, 1800);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
