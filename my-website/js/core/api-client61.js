// CineFlex Build 6.1 — Cached API Client
(() => {
  'use strict';
  const CACHE_PREFIX = 'cf61_api_';
  const DEFAULT_TTL = 15 * 60 * 1000;

  function cacheKey(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    return CACHE_PREFIX + Math.abs(hash);
  }

  function read(url, ttl = DEFAULT_TTL) {
    try {
      const raw = sessionStorage.getItem(cacheKey(url));
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (!item || Date.now() - item.savedAt > ttl) return null;
      return item.data;
    } catch { return null; }
  }

  function write(url, data) {
    try {
      sessionStorage.setItem(cacheKey(url), JSON.stringify({ savedAt: Date.now(), data }));
    } catch { /* storage full/private mode */ }
  }

  async function json(url, options = {}) {
    const ttl = Number(options.ttl ?? DEFAULT_TTL);
    const cached = options.force ? null : read(url, ttl);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeout || 12000));
    try {
      const response = await fetch(url, { ...options.fetchOptions, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      write(url, data);
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function clear() {
    Object.keys(sessionStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => sessionStorage.removeItem(k));
  }

  window.CineFlexAPI = Object.freeze({ json, clear, cacheKey });
})();
