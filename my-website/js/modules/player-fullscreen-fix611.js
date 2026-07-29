// CineFlex Build 6.1.1 — Reliable native/fallback fullscreen
(() => {
  'use strict';
  const getBox = () => document.getElementById('modal-player-container');
  const isNative = () => document.fullscreenElement || document.webkitFullscreenElement;

  function setFallback(on) {
    const box = getBox();
    if (!box) return;
    box.classList.toggle('cf-cinema-fallback', on);
    document.body.classList.toggle('cf-cinema-open', on);
  }

  async function exitCinema() {
    try {
      if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen();
      else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
    } catch (_) {}
    setFallback(false);
    try { screen.orientation?.unlock?.(); } catch (_) {}
  }

  async function toggleCinema() {
    const box = getBox();
    if (!box) return;
    if (isNative() || box.classList.contains('cf-cinema-fallback')) {
      await exitCinema();
      return;
    }

    let entered = false;
    try {
      if (box.requestFullscreen) {
        await box.requestFullscreen({ navigationUI: 'hide' });
        entered = true;
      } else if (box.webkitRequestFullscreen) {
        box.webkitRequestFullscreen();
        entered = true;
      }
    } catch (_) {}

    // Installed PWAs and some mobile browsers may reject native fullscreen.
    if (!entered && !isNative()) setFallback(true);
    else document.body.classList.add('cf-cinema-open');

    try { await screen.orientation?.lock?.('landscape'); } catch (_) {}
  }

  function syncState() {
    if (!isNative()) {
      document.body.classList.remove('cf-cinema-open');
      try { screen.orientation?.unlock?.(); } catch (_) {}
    } else {
      document.body.classList.add('cf-cinema-open');
    }
  }

  document.addEventListener('fullscreenchange', syncState);
  document.addEventListener('webkitfullscreenchange', syncState);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && getBox()?.classList.contains('cf-cinema-fallback')) exitCinema();
  });

  const oldClose = window.closeModal;
  if (typeof oldClose === 'function') {
    window.closeModal = function(...args) {
      exitCinema();
      return oldClose.apply(this, args);
    };
  }

  window.enterCinemaMode = toggleCinema;
  window.cf60Fullscreen = toggleCinema;
  window.cf611ExitCinema = exitCinema;
})();
