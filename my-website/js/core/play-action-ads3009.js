(function () {
  'use strict';

  const AD_URL = 'https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js';
  const COOLDOWN_MS = 1500;
  const ALLOWED_ACTIONS = new Set(['play-now', 'episode-click']);
  const LOG_KEY = 'cineflex_ad_events_301';
  let lastTriggerAt = 0;
  let sequence = 0;
  let membership = { resolved: false, vip: false, source: 'boot' };

  function pluginAllowsAds() {
    return !window.CineFlexPlugins || window.CineFlexPlugins.isEnabled('ads');
  }

  function isActiveVip(data) {
    const expiry = Number(data?.expiresAtMs || data?.vipExpiry || 0);
    const vipPlan = data?.plan === 'vip' || data?.vip === true;
    return data?.active !== false && vipPlan && (data?.lifetime === true || !expiry || expiry > Date.now());
  }

  function record(action, result, reason) {
    const event = { action, result, reason, at: Date.now(), build: '301.1' };
    try {
      const history = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      history.push(event);
      localStorage.setItem(LOG_KEY, JSON.stringify(history.slice(-50)));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('cineflex-ad-event', { detail: event }));
  }

  async function resolveMembership(user) {
    if (!user) {
      membership = { resolved: true, vip: false, source: 'guest' };
      return membership;
    }
    try {
      const firestore = window.db || window.firebase?.firestore?.();
      if (!firestore) return membership;
      const snapshot = await firestore.collection('users').doc(user.uid).collection('membership').doc('status').get();
      membership = { resolved: true, vip: isActiveVip(snapshot.exists ? snapshot.data() : {}), source: 'firebase' };
    } catch (error) {
      membership = { resolved: false, vip: false, source: 'unavailable' };
      console.warn('CineFlex membership check unavailable; ad skipped to protect VIP:', error);
    }
    return membership;
  }

  function connectAuth() {
    const auth = window.auth || window.firebase?.auth?.();
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      membership = { resolved: true, vip: false, source: 'guest-no-auth' };
      return;
    }
    auth.onAuthStateChanged(resolveMembership);
  }

  function trigger(kind) {
    const action = String(kind || '');
    try {
      if (!ALLOWED_ACTIONS.has(action)) { record(action, 'blocked', 'unsupported-action'); return false; }
      if (!pluginAllowsAds()) { record(action, 'blocked', 'plugin-disabled'); return false; }
      if (!membership.resolved) { record(action, 'blocked', 'membership-unresolved'); return false; }
      if (membership.vip) { record(action, 'blocked', 'vip-ad-free'); return false; }
      const now = Date.now();
      if (now - lastTriggerAt < COOLDOWN_MS) { record(action, 'blocked', 'cooldown'); return false; }
      lastTriggerAt = now;

      document.getElementById('cineflex-action-popad-script')?.remove();
      const script = document.createElement('script');
      script.id = 'cineflex-action-popad-script';
      script.async = true;
      script.src = `${AD_URL}?cf_action=${encodeURIComponent(action)}_${now}_${++sequence}`;
      script.onload = () => { record(action, 'triggered', 'loaded'); window.setTimeout(() => script.remove(), 15000); };
      script.onerror = () => { record(action, 'attempted', 'blocked-or-failed'); window.setTimeout(() => script.remove(), 15000); };
      document.body.appendChild(script);
      return true;
    } catch (error) {
      record(action, 'attempted', 'exception');
      console.info('CineFlex pop-ad blocked or unavailable:', error);
      return false;
    }
  }

  connectAuth();
  window.CineFlexPlayAds = Object.freeze({
    version: '301.1',
    trigger,
    refreshMembership: () => resolveMembership((window.auth || window.firebase?.auth?.())?.currentUser || null),
    getState: () => ({ ...membership }),
    getRecentEvents: () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (_) { return []; } }
  });
})();
