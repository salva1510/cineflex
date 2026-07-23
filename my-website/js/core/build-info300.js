(function () {
  'use strict';
  const info = Object.freeze({
    version: '300.7',
    channel: 'LTS',
    milestone: 'Plugin Foundation',
    cacheVersion: 'cineflex-v300-plugins-7',
    releasedAt: '2026-07-23'
  });
  window.CineFlexBuild = info;
  document.documentElement.dataset.cineflexBuild = info.version;
  window.dispatchEvent(new CustomEvent('cineflex-build-ready', { detail: info }));
})();
