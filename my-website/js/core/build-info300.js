(function () {
  'use strict';
  const info = Object.freeze({
    version: '301.0',
    channel: 'LTS',
    milestone: 'Ad Control & Release Polish',
    cacheVersion: 'cineflex-v301-ad-placement-2',
    releasedAt: '2026-07-23'
  });
  window.CineFlexBuild = info;
  document.documentElement.dataset.cineflexBuild = info.version;
  window.dispatchEvent(new CustomEvent('cineflex-build-ready', { detail: info }));
})();
