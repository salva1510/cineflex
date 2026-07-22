(function () {
  'use strict';
  const info = Object.freeze({
    version: '300.0',
    channel: 'LTS',
    milestone: 'Core Refactor',
    cacheVersion: 'cineflex-v300-core-1',
    releasedAt: '2026-07-22'
  });
  window.CineFlexBuild = info;
  document.documentElement.dataset.cineflexBuild = info.version;
  window.dispatchEvent(new CustomEvent('cineflex-build-ready', { detail: info }));
})();
