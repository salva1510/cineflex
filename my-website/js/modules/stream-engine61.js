// CineFlex Build 6.1 — Multi-server Stream Engine & Diagnostics
(() => {
  'use strict';
  const providers = [
    {
      id: 'zxc', name: 'CineFlex', badge: 'Main',
      movie: id => `https://zxcstream.xyz/player/movie/${id}?dubLang=tl&dubType=0`,
      tv: (id,s,e) => `https://zxcstream.xyz/player/tv/${id}/${s}/${e}?dubLang=tl&dubType=0`
    },
    {
      id: 'vidsrc', name: 'Server 2', badge: 'Backup',
      movie: id => `https://vidsrc.to/embed/movie/${id}`,
      tv: (id,s,e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
    },
    {
      id: 'embedsu', name: 'Server 3', badge: 'Backup',
      movie: id => `https://embed.su/embed/movie/${id}`,
      tv: (id,s,e) => `https://embed.su/embed/tv/${id}/${s}/${e}`
    }
  ];

  let active = Number(localStorage.getItem('cineflex_server61') || 0);
  if (!providers[active]) active = 0;
  let loadTimer = null;
  let attemptStarted = 0;
  const $ = id => document.getElementById(id);

  function mediaUrl(provider) {
    const item = window.currentItem;
    const state = window.currentTVState || {};
    if (!item?.id) return '';
    return state.type === 'tv'
      ? provider.tv(item.id, state.season || 1, state.currentEpNum || state.episode || 1)
      : provider.movie(item.id);
  }

  function status(text, tone = '') {
    const el = $('cf61-stream-status');
    if (!el) return;
    el.textContent = text;
    el.dataset.tone = tone;
  }

  function renderTabs() {
    const tabs = document.querySelector('#modal-player-container .server-tabs');
    if (!tabs) return;
    tabs.classList.add('cf61-server-tabs');
    tabs.innerHTML = providers.map((p, i) => `
      <button type="button" class="server-btn cf61-server-btn${i === active ? ' active' : ''}" data-server="${i}" onclick="cf61SwitchServer(${i})">
        <span>${p.name}</span><small>${p.badge}</small>
      </button>`).join('');

    if (!$('cf61-stream-status')) {
      const info = document.createElement('div');
      info.id = 'cf61-stream-status';
      info.className = 'cf61-stream-status';
      info.setAttribute('aria-live', 'polite');
      info.textContent = 'Stream ready';
      tabs.insertAdjacentElement('afterend', info);
    }
  }

  function markActive() {
    document.querySelectorAll('.cf61-server-btn').forEach((button, i) => {
      button.classList.toggle('active', i === active);
    });
  }

  function configureFrame(frame) {
    frame.removeAttribute('src');
    frame.removeAttribute('sandbox');
    frame.setAttribute('allow', 'autoplay; encrypted-media; gyroscope; picture-in-picture; clipboard-write; fullscreen');
    frame.setAttribute('allowfullscreen', 'true');
    frame.setAttribute('webkitallowfullscreen', 'true');
    frame.setAttribute('playsinline', 'true');
    frame.setAttribute('referrerpolicy', 'origin');
  }

  function load(reason = 'manual') {
    renderTabs();
    markActive();
    const frame = $('modal-video-iframe');
    const provider = providers[active];
    const url = mediaUrl(provider);
    if (!frame || !url) return;

    clearTimeout(loadTimer);
    attemptStarted = Date.now();
    status(`Connecting to ${provider.name}…`);
    configureFrame(frame);
    frame.src = url;

    loadTimer = setTimeout(() => {
      status(`${provider.name} is taking longer than usual. Try another server.`, 'warn');
    }, 14000);

    window.dispatchEvent(new CustomEvent('cineflex:stream-attempt', {
      detail: { provider: provider.id, reason, mediaId: window.currentItem?.id }
    }));
  }

  function switchTo(index, reason = 'manual') {
    const next = Number(index);
    if (!providers[next]) return;
    active = next;
    localStorage.setItem('cineflex_server61', String(active));
    window.activeServer = active + 1;
    load(reason);
  }

  function nextServer() {
    switchTo((active + 1) % providers.length, 'fallback');
  }

  function hook() {
    renderTabs();
    const frame = $('modal-video-iframe');
    if (frame && !frame.dataset.cf61Hooked) {
      frame.dataset.cf61Hooked = '1';
      frame.addEventListener('load', () => {
        clearTimeout(loadTimer);
        const seconds = Math.max(0.1, (Date.now() - attemptStarted) / 1000).toFixed(1);
        status(`${providers[active].name} connected in ${seconds}s`, 'ok');
      });
      frame.addEventListener('error', () => status('Stream failed. Choose another server.', 'error'));
    }

    window.updateVideoSource = () => load('playback');
    window.switchServer = n => switchTo(Math.max(0, Number(n) - 1));
    window.updateServerTabsUI = markActive;
  }

  window.cf61SwitchServer = switchTo;
  window.cf61NextServer = nextServer;
  window.CineFlexStreams = Object.freeze({ providers, load, switchTo, nextServer, get active(){ return active; } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
  else hook();
})();
