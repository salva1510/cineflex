/* =========================================================
   CINEFLEX BUILD 26 - DEVELOPER STABILITY + HEALTH CENTER
   Non-destructive add-on. Keeps old features alive while adding diagnostics.
========================================================= */
(function () {
  'use strict';

  const BUILD = '26.0';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function toast(message, type = 'info') {
    let host = $('#cf-dev-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'cf-dev-toast-host';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = `cf-dev-toast ${type}`;
    item.textContent = message;
    host.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => item.remove(), 250);
    }, 3200);
  }

  function installNetworkBanner() {
    let banner = $('#cf-network-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cf-network-banner';
      banner.innerHTML = '<i class="fa-solid fa-wifi"></i><span></span>';
      document.body.appendChild(banner);
    }
    const update = () => {
      const text = banner.querySelector('span');
      if (navigator.onLine) {
        text.textContent = 'Back online — CineFlex connection restored';
        banner.className = 'online flash';
        setTimeout(() => banner.className = 'online', 2600);
      } else {
        text.textContent = 'You are offline — some movies or login features may not load';
        banner.className = 'offline flash';
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (!navigator.onLine) update();
  }

  function getAuthUser() {
    try {
      if (window.auth && typeof auth.currentUser !== 'undefined') return auth.currentUser;
      if (window.firebase && firebase.auth) return firebase.auth().currentUser;
    } catch (e) {}
    return null;
  }

  function currentProfileName() {
    try {
      const raw = localStorage.getItem('cineflex_active_profile') || localStorage.getItem('cineflex_current_profile');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && (obj.name || obj.profileName || obj.displayName);
    } catch (e) {
      return localStorage.getItem('cineflex_active_profile') || null;
    }
  }

  function runHealthCheck() {
    const checks = [
      { key: 'Firebase App', ok: !!(window.firebase || window.app), hint: 'firebase.js loaded' },
      { key: 'Auth User', ok: !!getAuthUser(), hint: getAuthUser()?.email || 'Not logged in yet' },
      { key: 'Active Profile', ok: !!currentProfileName(), hint: currentProfileName() || 'Guest / no selected profile' },
      { key: 'Local Storage', ok: testStorage(), hint: 'Watchlist/Profile data storage' },
      { key: 'Poster Close', ok: !!findPosterModalClose(), hint: 'Movie details close button' },
      { key: 'Player Iframe', ok: !!$('#modal-video-iframe'), hint: 'Embed player target' },
      { key: 'Network', ok: navigator.onLine, hint: navigator.onLine ? 'Online' : 'Offline' },
      { key: 'Build 23-25 Addons', ok: !!window.CineFlexBuild25 || !!$('#cf-continue-row') || !!$('.top10-row'), hint: 'Previous upgrades preserved' }
    ];
    renderHealthPanel(checks);
    toast('CineFlex health check complete', checks.every(c => c.ok) ? 'success' : 'warn');
    return checks;
  }

  function testStorage() {
    try {
      localStorage.setItem('__cf_test', '1');
      localStorage.removeItem('__cf_test');
      return true;
    } catch (e) { return false; }
  }

  function renderHealthPanel(checks) {
    const list = $('#cf-health-list');
    if (!list) return;
    list.innerHTML = checks.map(c => `
      <div class="cf-health-item ${c.ok ? 'ok' : 'warn'}">
        <span class="dot"></span>
        <div><strong>${c.key}</strong><small>${c.hint}</small></div>
      </div>
    `).join('');
  }

  function installHealthCenter() {
    const drawer = $('#menu-drawer') || $('.menu-drawer') || $('#drawer') || $('.drawer');
    if (!drawer || $('#cf-health-card')) return;
    const card = document.createElement('section');
    card.id = 'cf-health-card';
    card.className = 'cf-health-card';
    card.innerHTML = `
      <div class="cf-health-title">
        <i class="fa-solid fa-code"></i>
        <div><strong>Developer Stability</strong><small>Build ${BUILD}</small></div>
      </div>
      <button id="cf-run-health" type="button"><i class="fa-solid fa-stethoscope"></i> Run Site Check</button>
      <div id="cf-health-list"></div>
    `;
    drawer.appendChild(card);
    $('#cf-run-health', card)?.addEventListener('click', runHealthCheck);
  }

  function findPosterModalClose() {
    return $('.modal-close') || $('.details-close') || $('#modal-close-btn') || $('[onclick="closeModal()"]') || $('[onclick="closeDetailsModal()"]');
  }

  function ensurePosterCloseButton() {
    const modal = $('#movie-modal') || $('#modal') || $('.movie-modal') || $('.modal');
    const content = $('.modal-content', modal || document) || modal;
    if (!content) return;
    let btn = findPosterModalClose();
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cf-poster-close-btn modal-close';
      btn.setAttribute('aria-label', 'Close movie details');
      btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      btn.addEventListener('click', () => {
        if (typeof window.closeModal === 'function') return window.closeModal();
        if (typeof window.closeDetailsModal === 'function') return window.closeDetailsModal();
        if (modal) modal.style.display = 'none';
      });
      content.appendChild(btn);
    }
    btn.classList.add('cf-poster-close-btn');
  }

  function syncPlayerFullscreenControls() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    document.body.classList.toggle('cf-player-is-fullscreen', isFs);
  }

  function protectImages() {
    $$('img').forEach(img => {
      if (img.dataset.cfProtected) return;
      img.dataset.cfProtected = '1';
      img.loading = img.loading || 'lazy';
      img.addEventListener('error', () => {
        img.classList.add('cf-img-fallback');
        img.alt = img.alt || 'CineFlex poster image unavailable';
      });
    });
  }

  function installGlobalSafeguards() {
    window.addEventListener('error', (e) => {
      console.warn('[CineFlex Build26]', e.message);
    });
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'].forEach(evt => {
      document.addEventListener(evt, syncPlayerFullscreenControls);
    });
    const observer = new MutationObserver(() => {
      ensurePosterCloseButton();
      protectImages();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      ensurePosterCloseButton();
      syncPlayerFullscreenControls();
    }, 1500);
  }

  ready(() => {
    document.documentElement.dataset.cineflexBuild = BUILD;
    installNetworkBanner();
    installHealthCenter();
    installGlobalSafeguards();
    ensurePosterCloseButton();
    protectImages();
    setTimeout(runHealthCheck, 1000);
  });

  window.CineFlexBuild26 = { version: BUILD, runHealthCheck, toast };
})();
