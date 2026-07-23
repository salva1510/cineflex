(function () {
  'use strict';

  const STORAGE_KEY = 'cineflex_plugin_settings_v1';
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

  window.CineFlexPlugins = Object.freeze({
    version: '300.7',
    register,
    invoke,
    isEnabled,
    setEnabled,
    list,
    getSettings: () => ({ ...settings }),
    subscribe(fn) { if (typeof fn === 'function') listeners.add(fn); return () => listeners.delete(fn); }
  });

  document.documentElement.dataset.cineflexPlugins = '300.7';
  window.dispatchEvent(new CustomEvent('cineflex-plugins-ready', { detail: { version: '300.7' } }));
})();
