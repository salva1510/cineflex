(function () {
  'use strict';

  const AD_URL = 'https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js';
  const COOLDOWN_MS = 1800;
  const ALLOWED_ACTIONS = new Set(['play-now', 'episode-click']);
  const LOG_KEY = 'cineflex_ad_events_301';
  const SESSION_KEY = 'cineflex_ad_first_play_3012';
  const CONFIG_REF = () => (window.db || window.firebase?.firestore?.())?.collection('cineflexConfig').doc('plugins');
  let lastTriggerAt = 0;
  let membership = { resolved: false, vip: false, source: 'boot' };
  let placement = 'play_episode';

  function pluginAllowsAds() {
    return !window.CineFlexPlugins || window.CineFlexPlugins.isEnabled('ads');
  }

  function normalizePlacement(value) {
    return ['play_episode', 'play_only', 'first_session'].includes(value) ? value : 'play_episode';
  }

  function placementAllows(action) {
    if (placement === 'play_only') return action === 'play-now';
    if (placement === 'first_session') return action === 'play-now' && sessionStorage.getItem(SESSION_KEY) !== '1';
    return action === 'play-now' || action === 'episode-click';
  }

  function isActiveVip(data) {
    const expiry = Number(data?.expiresAtMs || data?.vipExpiry || data?.vipExpiryMs || 0);
    const vipPlan = data?.plan === 'vip' || data?.vip === true;
    return data?.active !== false && vipPlan && (data?.lifetime === true || !expiry || expiry > Date.now());
  }

  function localVipState() {
    try {
      if (window.CineFlexMembership?.isVip?.()) return true;
      if (document.documentElement.classList.contains('cf-user-vip')) return true;
    } catch (_) {}
    return false;
  }

  function record(action, result, reason) {
    const event = { action, result, reason, placement, at: Date.now(), build: '301.3' };
    try {
      const history = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      history.push(event);
      localStorage.setItem(LOG_KEY, JSON.stringify(history.slice(-50)));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('cineflex-ad-event', { detail: event }));
  }

  async function resolveMembership(user) {
    if (localVipState()) {
      membership = { resolved: true, vip: true, source: 'local-membership' };
      return membership;
    }
    if (!user) {
      membership = { resolved: true, vip: false, source: 'guest' };
      return membership;
    }
    try {
      const firestore = window.db || window.firebase?.firestore?.();
      if (!firestore) {
        membership = { resolved: true, vip: false, source: 'signed-in-no-firestore' };
        return membership;
      }
      const snapshot = await firestore.collection('users').doc(user.uid).collection('membership').doc('status').get();
      membership = { resolved: true, vip: isActiveVip(snapshot.exists ? snapshot.data() : {}), source: 'firebase' };
    } catch (error) {
      // Do not permanently disable ads for ordinary signed-in users when a membership read fails.
      membership = { resolved: true, vip: localVipState(), source: 'fallback' };
      console.warn('CineFlex membership check unavailable; using local membership state:', error);
    }
    return membership;
  }

  function connectAuth() {
    const auth = window.auth || window.firebase?.auth?.();
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      membership = { resolved: true, vip: localVipState(), source: 'guest-no-auth' };
      return;
    }
    auth.onAuthStateChanged(resolveMembership);
    // Prevent early clicks from being blocked forever while auth initializes.
    window.setTimeout(() => {
      if (!membership.resolved) membership = { resolved: true, vip: localVipState(), source: 'auth-timeout-fallback' };
    }, 1200);
  }

  async function loadPlacement() {
    try {
      const ref = CONFIG_REF();
      if (!ref) return placement;
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : {};
      placement = normalizePlacement(data.adPlacement || data.ads?.placement);
    } catch (error) {
      console.warn('CineFlex ad placement config unavailable; using default.', error);
    }
    return placement;
  }

  function trigger(kind) {
    const action = String(kind || '');
    try {
      if (!ALLOWED_ACTIONS.has(action)) { record(action, 'blocked', 'unsupported-action'); return false; }
      if (!pluginAllowsAds()) { record(action, 'blocked', 'plugin-disabled'); return false; }
      if (localVipState()) { membership = { resolved: true, vip: true, source: 'local-membership' }; }
      if (!membership.resolved) { membership = { resolved: true, vip: false, source: 'click-fallback' }; }
      if (membership.vip) { record(action, 'blocked', 'vip-ad-free'); return false; }
      if (!placementAllows(action)) { record(action, 'blocked', 'placement-rule'); return false; }
      const now = Date.now();
      if (now - lastTriggerAt < COOLDOWN_MS) { record(action, 'blocked', 'cooldown'); return false; }
      lastTriggerAt = now;
      if (placement === 'first_session') sessionStorage.setItem(SESSION_KEY, '1');

      document.getElementById('cineflex-action-popad-script')?.remove();
      const script = document.createElement('script');
      script.id = 'cineflex-action-popad-script';
      script.async = false;
      // Load the provider URL exactly as supplied; extra query parameters can invalidate some ad tags.
      script.src = AD_URL;
      script.onload = () => { record(action, 'triggered', 'loaded'); window.setTimeout(() => script.remove(), 15000); };
      script.onerror = () => { record(action, 'attempted', 'blocked-or-failed'); window.setTimeout(() => script.remove(), 15000); };
      (document.head || document.body).appendChild(script);
      return true;
    } catch (error) {
      record(action, 'attempted', 'exception');
      console.info('CineFlex pop-ad blocked or unavailable:', error);
      return false;
    }
  }

  connectAuth();
  loadPlacement();
  window.addEventListener('cineflex-membership-change', event => {
    membership = { resolved: true, vip: !!event.detail?.vip, source: 'membership-event' };
  });
  window.addEventListener('cineflex-plugin-change', loadPlacement);

  window.CineFlexPlayAds = Object.freeze({
    version: '301.3',
    trigger,
    refreshMembership: () => resolveMembership((window.auth || window.firebase?.auth?.())?.currentUser || null),
    refreshPlacement: loadPlacement,
    getState: () => ({ ...membership, placement }),
    getRecentEvents: () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (_) { return []; } }
  });
})();
