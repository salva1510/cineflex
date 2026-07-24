(function () {
  'use strict';

  const STORAGE_KEY = 'cineflex_plugin_settings_v1';
  const REMOTE_DOC = 'plugins';
  const defaults = Object.freeze({
    ads: true,
    recommendations: true,
    youtubeMovies: true,
    youtubeMusic: true
  });

  const definitions = Object.freeze({
    ads: { label: 'Ads', optional: true },
    recommendations: { label: 'Recommendations', optional: true },
    youtubeMovies: { label: 'YT Movies', optional: true },
    youtubeMusic: { label: 'YT Music', optional: true }
  });

  const handlers = new Map();
  const listeners = new Set();

  function readSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...defaults, ...(stored && typeof stored === 'object' ? stored : {}) };
    } catch (_) {
      return { ...defaults };
    }
  }

  let settings = readSettings();

  function emit(name) {
    const detail = { name, enabled: isEnabled(name), settings: { ...settings } };
    window.dispatchEvent(new CustomEvent('cineflex-plugin-change', { detail }));
    listeners.forEach(fn => { try { fn(detail); } catch (_) {} });
  }

  function isEnabled(name) {
    return Object.prototype.hasOwnProperty.call(settings, name) ? settings[name] !== false : true;
  }

  function register(name, api) {
    if (!name || !definitions[name]) return false;
    handlers.set(name, api || {});
    window.dispatchEvent(new CustomEvent('cineflex-plugin-ready', {
      detail: { name, enabled: isEnabled(name), api: api || {} }
    }));
    return true;
  }

  function invoke(name, action, ...args) {
    if (!isEnabled(name)) {
      const message = `${definitions[name]?.label || name} is currently disabled.`;
      if (typeof window.showToast === 'function') window.showToast(message);
      else console.info(message);
      return false;
    }
    const api = handlers.get(name);
    const fn = api && api[action];
    if (typeof fn !== 'function') return false;
    return fn(...args);
  }

  function canManage() {
    try {
      const membership = window.CineFlexMembership;
      return Boolean(membership?.isAdmin?.() || membership?.getState?.()?.admin);
    } catch (_) {
      return false;
    }
  }

  function setEnabled(name, enabled, options = {}) {
    if (!definitions[name]) return false;
    if (!options.internal && !canManage()) {
      console.warn('CineFlex plugin setting rejected: admin session required.');
      return false;
    }
    settings[name] = Boolean(enabled);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {}
    emit(name);
    return true;
  }

  function list() {
    return Object.keys(definitions).map(name => ({
      name,
      label: definitions[name].label,
      enabled: isEnabled(name),
      ready: handlers.has(name)
    }));
  }


  function applyVisibilityGuards() {
    const root = document.documentElement;
    Object.keys(definitions).forEach(name => {
      root.dataset[`plugin${name.charAt(0).toUpperCase()}${name.slice(1)}`] = isEnabled(name) ? 'on' : 'off';
    });
    document.querySelectorAll('[data-plugin]').forEach(el => {
      const name = el.getAttribute('data-plugin');
      el.hidden = !isEnabled(name);
      el.setAttribute('aria-hidden', String(!isEnabled(name)));
    });
  }

  async function connectRemoteSettings() {
    try {
      const firestore = window.db || (window.firebase && firebase.apps.length ? firebase.firestore() : null);
      if (!firestore) return false;
      const ref = firestore.collection('cineflexConfig').doc(REMOTE_DOC);
      ref.onSnapshot(doc => {
        if (!doc.exists) { applyVisibilityGuards(); return; }
        const data = doc.data() || {};
        const remote = data.plugins && typeof data.plugins === 'object' ? data.plugins : data;
        settings = { ...defaults, ...remote };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {}
        applyVisibilityGuards();
        Object.keys(definitions).forEach(emit);
      }, error => console.warn('Plugin settings sync unavailable:', error));
      return true;
    } catch (error) {
      console.warn('Plugin settings sync failed:', error);
      return false;
    }
  }

  function setRemoteSettings(nextSettings) {
    const firestore = window.db || (window.firebase && firebase.apps.length ? firebase.firestore() : null);
    if (!firestore) return Promise.reject(new Error('Firebase is not ready.'));
    return firestore.collection('cineflexConfig').doc(REMOTE_DOC).set({
      plugins: { ...defaults, ...nextSettings },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: (firebase.auth().currentUser && (firebase.auth().currentUser.email || firebase.auth().currentUser.uid)) || 'admin'
    }, { merge: true });
  }

  applyVisibilityGuards();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyVisibilityGuards, { once: true });
  connectRemoteSettings();

  window.CineFlexPlugins = Object.freeze({
    version: '300.8',
    register,
    invoke,
    isEnabled,
    setEnabled,
    list,
    getSettings: () => ({ ...settings }),
    saveRemote: setRemoteSettings,
    syncRemote: connectRemoteSettings,
    subscribe(fn) { if (typeof fn === 'function') listeners.add(fn); return () => listeners.delete(fn); }
  });

  document.documentElement.dataset.cineflexPlugins = '300.8';
  window.dispatchEvent(new CustomEvent('cineflex-plugins-ready', { detail: { version: '300.8' } }));
})();
