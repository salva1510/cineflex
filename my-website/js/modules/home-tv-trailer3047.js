(() => {
  'use strict';

  const MODE_KEY = 'cineflex_tv_mode';
  const POSTER_SELECTOR = [
    '.card', '.movie-card', '.dramabox-card', '.netflix-item-container',
    '.search-card', '.cf-smart-card', '.cf-top10-card', '.cf51-because-card',
    '.cf-catalog-card', '.similar-card', '.modern-grid-item', '.cf-premium-card',
    '[data-tv-focusable="poster"]'
  ].join(',');
  const CONTROL_SELECTOR = 'button:not([disabled]),a[href],[tabindex="0"]';
  let tvMode = false;
  let focused = null;

  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0.04 && rect.width > 10 && rect.height > 10;
  };

  const getCenter = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  };

  const activeLayer = () => {
    const layers = [...document.querySelectorAll('.modal,.search-overlay,.menu-drawer,[role="dialog"]')]
      .filter(isVisible);
    return layers.at(-1) || document;
  };

  function preparePosters(root = document) {
    root.querySelectorAll?.(POSTER_SELECTOR).forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute('data-tv-focusable', 'poster');
      card.querySelectorAll?.('.cf-card-actions button').forEach((button) => { button.tabIndex = -1; });
    });
  }

  function posters() {
    preparePosters(activeLayer());
    return [...activeLayer().querySelectorAll(POSTER_SELECTOR)].filter(isVisible)
      .filter((el) => !el.closest('#banner,.cf-hero-video'));
  }

  function controls() {
    return [...activeLayer().querySelectorAll(CONTROL_SELECTOR)].filter(isVisible)
      .filter((el) => !el.closest('.cf-card-actions'));
  }

  function setTVMode(on, persist = true) {
    tvMode = Boolean(on);
    document.documentElement.classList.toggle('cf3047-tv', tvMode);
    document.body.classList.toggle('cf3047-tv', tvMode);
    document.documentElement.classList.toggle('cf-tv-mode', tvMode);
    document.body.classList.toggle('cf-tv-mode', tvMode);
    if (persist) localStorage.setItem(MODE_KEY, tvMode ? 'on' : 'off');
    const text = document.getElementById('cfTvModeText');
    if (text) text.textContent = tvMode ? 'Exit TV Mode' : 'TV Mode';
    if (!tvMode) {
      document.querySelectorAll('.cf3047-focus').forEach((el) => el.classList.remove('cf3047-focus'));
      focused = null;
    }
  }

  function focusElement(el, scroll = true) {
    if (!isVisible(el)) return false;
    document.querySelectorAll('.cf3047-focus').forEach((node) => node.classList.remove('cf3047-focus'));
    focused = el;
    el.classList.add('cf3047-focus');
    if (!el.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.tabIndex = 0;
    try { el.focus({ preventScroll: true }); } catch (_) { try { el.focus(); } catch (_) {} }
    if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    return true;
  }

  function bannerPlay() {
    return document.getElementById('banner-play-btn') || document.querySelector('#banner .play-btn');
  }

  function firstPoster() {
    return posters().sort((a, b) => {
      const A = getCenter(a), B = getCenter(b);
      return A.y - B.y || A.x - B.x;
    })[0] || null;
  }

  function rowFor(el) {
    const holder = el?.closest('.scroller,.cf-top10-scroller,.main-list,.tv-list,.similar-grid,.search-results-grid,.modern-grid,.cf-catalog-grid');
    return holder ? [...holder.querySelectorAll(POSTER_SELECTOR)].filter(isVisible) : [];
  }

  function moveHorizontal(direction) {
    const row = rowFor(focused);
    if (!row.length) return false;
    row.sort((a, b) => getCenter(a).x - getCenter(b).x);
    const index = row.indexOf(focused);
    const next = row[index + (direction === 'left' ? -1 : 1)];
    if (next) return focusElement(next);
    focused?.closest('.scroller,.cf-top10-scroller')?.scrollBy({
      left: (direction === 'left' ? -1 : 1) * Math.max(420, innerWidth * 0.72), behavior: 'smooth'
    });
    return true;
  }

  function moveVertical(direction) {
    const list = posters();
    if (!list.length) return false;
    if (!focused || !focused.matches?.(POSTER_SELECTOR)) {
      if (direction === 'down') return focusElement(firstPoster());
      const play = bannerPlay();
      return direction === 'up' && isVisible(play) ? focusElement(play) : false;
    }
    const from = getCenter(focused);
    const candidates = list.filter((el) => {
      if (el === focused) return false;
      const c = getCenter(el);
      return direction === 'down' ? c.y > from.y + Math.min(24, from.h * 0.25) : c.y < from.y - Math.min(24, from.h * 0.25);
    });
    if (!candidates.length) {
      if (direction === 'up' && isVisible(bannerPlay())) return focusElement(bannerPlay());
      window.scrollBy({ top: (direction === 'down' ? 1 : -1) * innerHeight * 0.72, behavior: 'smooth' });
      return true;
    }
    candidates.sort((a, b) => {
      const A = getCenter(a), B = getCenter(b);
      const scoreA = Math.abs(A.y - from.y) + Math.abs(A.x - from.x) * 2.8;
      const scoreB = Math.abs(B.y - from.y) + Math.abs(B.x - from.x) * 2.8;
      return scoreA - scoreB;
    });
    return focusElement(candidates[0]);
  }

  function geometricMove(direction) {
    const list = [...posters(), ...controls()];
    if (!list.length) return false;
    if (!focused || !isVisible(focused) || !list.includes(focused)) return focusElement(direction === 'down' ? firstPoster() : bannerPlay() || list[0]);
    const from = getCenter(focused);
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === focused) continue;
      const to = getCenter(el), dx = to.x - from.x, dy = to.y - from.y;
      const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
      if (primary <= 8) continue;
      const cross = (direction === 'left' || direction === 'right') ? Math.abs(dy) : Math.abs(dx);
      const axis = (direction === 'left' || direction === 'right') ? Math.abs(dx) : Math.abs(dy);
      const score = axis + cross * 2.7;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best ? focusElement(best) : false;
  }

  function handleKey(event) {
    const directions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const direction = directions[event.key];
    if (direction && !tvMode) setTVMode(true, true);
    if (!tvMode) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;

    const active = document.activeElement;
    if (isVisible(active) && active !== document.body && active !== document.documentElement) focused = active;

    if (direction) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (event.key === 'ArrowDown' && (!focused || focused.closest?.('#banner') || focused === bannerPlay())) {
        if (focusElement(firstPoster())) return;
      }
      if ((direction === 'left' || direction === 'right') && focused?.matches?.(POSTER_SELECTOR) && moveHorizontal(direction)) return;
      if ((direction === 'up' || direction === 'down') && moveVertical(direction)) return;
      geometricMove(direction);
      return;
    }

    if (event.key === 'Enter' || event.key === 'NumpadEnter' || event.key === ' ') {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      (isVisible(document.activeElement) ? document.activeElement : focused)?.click?.();
    }
  }

  function installToggle() {
    const host = document.querySelector('.cf-install-drawer-section');
    if (!host || document.getElementById('cfTvModeToggle')) return;
    const button = document.createElement('button');
    button.id = 'cfTvModeToggle'; button.type = 'button'; button.className = 'drawer-item cf-tv-mode-toggle';
    button.innerHTML = '<i class="fa-solid fa-tv"></i><span id="cfTvModeText">TV Mode</span>';
    button.addEventListener('click', () => setTVMode(!tvMode));
    host.appendChild(button);
  }

  // True 16:9 cover sizing based on the banner itself, not the phone viewport.
  function sizeTrailer() {
    const banner = document.getElementById('banner');
    const box = document.getElementById('cf-hero-video');
    const frame = box?.querySelector('iframe');
    const mount = box?.firstElementChild;
    if (!banner || !box || (!frame && !mount)) return;
    const r = banner.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ratio = 16 / 9;
    let width = r.width;
    let height = width / ratio;
    if (height < r.height) { height = r.height; width = height * ratio; }
    [mount, frame].filter(Boolean).forEach((el) => {
      el.style.setProperty('width', `${Math.ceil(width)}px`, 'important');
      el.style.setProperty('height', `${Math.ceil(height)}px`, 'important');
      el.style.setProperty('left', '50%', 'important');
      el.style.setProperty('top', '50%', 'important');
      el.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    });
  }

  function watchTrailerLayer() {
    const banner = document.getElementById('banner');
    const box = document.getElementById('cf-hero-video');
    if (!banner || !box) return;
    const observer = new MutationObserver(() => {
      requestAnimationFrame(sizeTrailer);
      if (box.classList.contains('active')) banner.classList.add('cf3047-video-live');
      else banner.classList.remove('cf3047-video-live');
    });
    observer.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(sizeTrailer).observe(banner);
    window.addEventListener('resize', sizeTrailer, { passive: true });
  }

  function init() {
    preparePosters(); installToggle(); watchTrailerLayer();
    const saved = localStorage.getItem(MODE_KEY);
    setTVMode(saved === 'on' || document.documentElement.classList.contains('cf-tv-mode') || document.body.classList.contains('cf-tv-mode'), false);
    // Window capture is deliberately last and exclusive for homepage arrows.
    window.addEventListener('keydown', handleKey, { capture: true });
    document.addEventListener('focusin', (event) => {
      if (tvMode && (event.target.matches?.(POSTER_SELECTOR) || event.target.matches?.(CONTROL_SELECTOR))) focused = event.target;
    }, true);
    new MutationObserver(() => { preparePosters(); installToggle(); requestAnimationFrame(sizeTrailer); })
      .observe(document.body, { childList: true, subtree: true });
    window.CineFlexHomeTV = { enable: () => setTVMode(true), disable: () => setTVMode(false), isEnabled: () => tvMode };
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
