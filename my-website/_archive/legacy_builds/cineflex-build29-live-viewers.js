// =====================================================
// CINEFLEX BUILD 29 - LIVE ONLINE VIEWERS
// Firestore heartbeat based presence counter
// =====================================================
(function () {
  'use strict';

  const PRESENCE_COLLECTION = 'cineflex_online_viewers';
  const HEARTBEAT_MS = 20000;
  const ACTIVE_WINDOW_MS = 75000;
  const CLEANUP_WINDOW_MS = 5 * 60 * 1000;

  let sessionId = localStorage.getItem('cineflex_viewer_session_id');
  if (!sessionId) {
    sessionId = 'cf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('cineflex_viewer_session_id', sessionId);
  }

  let heartbeatTimer = null;
  let countTimer = null;
  let lastKnownCount = 1;
  let started = false;

  function $(id) { return document.getElementById(id); }

  function ensureLiveViewerUI() {
    if (!$('cfLiveViewerPill')) {
      const nav = document.querySelector('.navbar .nav-icons') || document.querySelector('.navbar');
      if (nav) {
        const pill = document.createElement('button');
        pill.id = 'cfLiveViewerPill';
        pill.className = 'cf-live-viewer-pill';
        pill.type = 'button';
        pill.title = 'Online viewers now';
        pill.innerHTML = '<span class="cf-live-dot"></span><strong id="cfLiveViewerCount">1</strong><span>online</span>';
        nav.insertBefore(pill, nav.firstChild);
      }
    }

    if (!$('cfLiveViewerFloat')) {
      const float = document.createElement('div');
      float.id = 'cfLiveViewerFloat';
      float.className = 'cf-live-viewer-float';
      float.innerHTML = '<span class="cf-live-dot"></span><span><b id="cfLiveViewerFloatCount">1</b> viewers online</span>';
      document.body.appendChild(float);
    }

    if (!$('cfDrawerLiveViewers')) {
      const accountSection = Array.from(document.querySelectorAll('.drawer-section h4'))
        .find(h => (h.textContent || '').trim().toLowerCase() === 'account');
      const host = accountSection ? accountSection.parentElement : document.querySelector('#menu-drawer .drawer-links');
      if (host) {
        const card = document.createElement('div');
        card.id = 'cfDrawerLiveViewers';
        card.className = 'cf-drawer-live-card';
        card.innerHTML = `
          <div class="cf-drawer-live-icon"><i class="fa-solid fa-signal"></i></div>
          <div>
            <div class="cf-drawer-live-label">Live Website Viewers</div>
            <div class="cf-drawer-live-count"><b id="cfLiveViewerDrawerCount">1</b> online now</div>
          </div>
        `;
        host.insertBefore(card, host.children[1] || null);
      }
    }
  }

  function setViewerCount(count, mode) {
    const safeCount = Math.max(1, Number(count) || 1);
    lastKnownCount = safeCount;
    const ids = ['cfLiveViewerCount', 'cfLiveViewerFloatCount', 'cfLiveViewerDrawerCount'];
    ids.forEach(id => {
      const el = $(id);
      if (el) el.textContent = safeCount.toLocaleString();
    });
    document.body.classList.toggle('cf-live-fallback', mode === 'fallback');
  }

  function firebaseReady() {
    return window.firebase && window.db && typeof window.db.collection === 'function';
  }

  function viewerName() {
    const user = (window.auth && window.auth.currentUser) || window.currentUser;
    const profile = JSON.parse(localStorage.getItem('cineflex_profile') || 'null');
    return (profile && profile.name) || (user && (user.displayName || user.email)) || 'Guest Viewer';
  }

  function viewerPhoto() {
    const user = (window.auth && window.auth.currentUser) || window.currentUser;
    const profile = JSON.parse(localStorage.getItem('cineflex_profile') || 'null');
    return (profile && profile.avatar) || (user && user.photoURL) || '';
  }

  async function sendHeartbeat() {
    if (!firebaseReady()) {
      setViewerCount(lastKnownCount || 1, 'fallback');
      return;
    }

    const user = (window.auth && window.auth.currentUser) || window.currentUser;
    const ref = window.db.collection(PRESENCE_COLLECTION).doc(sessionId);

    try {
      await ref.set({
        sessionId,
        uid: user ? user.uid : 'guest',
        email: user ? (user.email || '') : '',
        name: viewerName(),
        photo: viewerPhoto(),
        page: location.pathname || '/',
        userAgent: navigator.userAgent.slice(0, 180),
        lastSeenMs: Date.now(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('CineFlex live viewers heartbeat failed:', err);
      setViewerCount(lastKnownCount || 1, 'fallback');
    }
  }

  async function refreshViewerCount() {
    if (!firebaseReady()) {
      setViewerCount(lastKnownCount || 1, 'fallback');
      return;
    }

    try {
      const activeSince = Date.now() - ACTIVE_WINDOW_MS;
      const snap = await window.db.collection(PRESENCE_COLLECTION)
        .where('lastSeenMs', '>=', activeSince)
        .get();
      setViewerCount(snap.size || 1, 'cloud');
    } catch (err) {
      console.warn('CineFlex live viewers count failed:', err);
      setViewerCount(lastKnownCount || 1, 'fallback');
    }
  }

  async function cleanupOldSessions() {
    if (!firebaseReady()) return;
    try {
      const oldBefore = Date.now() - CLEANUP_WINDOW_MS;
      const snap = await window.db.collection(PRESENCE_COLLECTION)
        .where('lastSeenMs', '<', oldBefore)
        .limit(20)
        .get();
      const batch = window.db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      if (!snap.empty) await batch.commit();
    } catch (err) {
      // Safe to ignore. Counter already filters stale sessions.
    }
  }

  async function removeOwnSession() {
    if (!firebaseReady()) return;
    try {
      await window.db.collection(PRESENCE_COLLECTION).doc(sessionId).delete();
    } catch (err) {}
  }

  function startLiveViewers() {
    if (started) return;
    started = true;
    ensureLiveViewerUI();
    sendHeartbeat();
    refreshViewerCount();
    cleanupOldSessions();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
    countTimer = setInterval(refreshViewerCount, HEARTBEAT_MS);
  }

  document.addEventListener('DOMContentLoaded', startLiveViewers);
  window.addEventListener('cineflex-login', () => setTimeout(sendHeartbeat, 600));
  window.addEventListener('cineflex-profile-changed', () => setTimeout(sendHeartbeat, 600));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
      refreshViewerCount();
    }
  });
  window.addEventListener('beforeunload', removeOwnSession);
})();
