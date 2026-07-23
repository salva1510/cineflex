(function () {
  'use strict';
  const info = Object.freeze({
    version: '300.4',
    channel: 'LTS',
    milestone: 'CMS Foundation',
    cacheVersion: 'cineflex-v300-cms-4',
    releasedAt: '2026-07-23'
  });
  window.CineFlexBuild = info;
  document.documentElement.dataset.cineflexBuild = info.version;
  window.dispatchEvent(new CustomEvent('cineflex-build-ready', { detail: info }));
})();
