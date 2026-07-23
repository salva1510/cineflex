(function () {
  'use strict';

  const AD_URL = 'https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js';
  const COOLDOWN_MS = 1500;
  let lastTriggerAt = 0;
  let sequence = 0;
  let membership = { resolved: false, vip: false };

  function pluginAllowsAds() {
    return !window.CineFlexPlugins || window.CineFlexPlugins.isEnabled('ads');
  }

  function isActiveVip(data) {
    const expiry = Number(data?.expiresAtMs || data?.vipExpiry || 0);
    const vipPlan = data?.plan === 'vip' || data?.vip === true;
    return data?.active !== false && vipPlan && (data?.lifetime === true || !expiry || expiry > Date.now());
  }

  async function resolveMembership(user) {
    if (!user) {
      membership = { resolved: true, vip: false };
      return membership;
    }

    try {
      const firestore = window.db || window.firebase?.firestore?.();
      if (!firestore) return membership;
      const snapshot = await firestore.collection('users').doc(user.uid).collection('membership').doc('status').get();
      membership = { resolved: true, vip: isActiveVip(snapshot.exists ? snapshot.data() : {}) };
    } catch (error) {
      // Do not guess while signed in. Skipping protects VIP accounts.
      membership = { resolved: false, vip: false };
      console.warn('CineFlex membership check unavailable:', error);
    }
    return membership;
  }

  function connectAuth() {
    const auth = window.auth || window.firebase?.auth?.();
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      membership = { resolved: true, vip: false };
      return;
    }
    auth.onAuthStateChanged(resolveMembership);
  }

  function trigger(kind) {
    try {
      if (!pluginAllowsAds() || !membership.resolved || membership.vip) return false;
      const now = Date.now();
      if (now - lastTriggerAt < COOLDOWN_MS) return false;
      lastTriggerAt = now;

      const old = document.getElementById('cineflex-action-popad-script');
      if (old) old.remove();

      const script = document.createElement('script');
      script.id = 'cineflex-action-popad-script';
      script.async = true;
      script.src = `${AD_URL}?cf_action=${encodeURIComponent(kind || 'play')}_${now}_${++sequence}`;
      script.onload = script.onerror = () => window.setTimeout(() => script.remove(), 15000);
      document.body.appendChild(script);
      return true;
    } catch (error) {
      console.info('CineFlex pop-ad blocked or unavailable:', error);
      return false;
    }
  }

  connectAuth();
  window.CineFlexPlayAds = Object.freeze({
    version: '300.9',
    trigger,
    refreshMembership: () => resolveMembership((window.auth || window.firebase?.auth?.())?.currentUser || null),
    getState: () => ({ ...membership })
  });
})();
