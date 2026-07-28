/* CineFlex Build 305.3 — first-priority TV/keyboard Back controller */
(() => {
  'use strict';
  if (window.__CF_BACK_3053__) return;
  window.__CF_BACK_3053__ = true;

  let locked = false;
  const visible = (el) => {
    if (!el || !el.isConnected || el.hidden) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.pointerEvents === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clickFirst = (selectors) => {
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        if (visible(node) && !node.disabled) {
          node.click();
          return true;
        }
      }
    }
    return false;
  };
  const homePage = () => /(?:^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/');
  const closeLayer = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { exit && exit.call(document); } catch (_) {}
      return true;
    }
    if (clickFirst([
      '#closePlayer','#playerClose','#closeVideo','#closeTrailer','.player-close','.trailer-close','.video-close',
      '#detailsClose','#closeDetails','.details-close','.modal-close',
      '#closeSearch','.search-close','#drawerClose','#menuClose','.drawer-close',
      '#closeProfileModal','#closeAddProfile','[data-close-modal]'
    ])) return true;

    const layer = Array.from(document.querySelectorAll(
      '.modal.active,.modal.show,.modal.open,.modal[style*="display: block"],.drawer.active,.drawer.open,'+
      '.search-overlay.active,.search-overlay.open,.player-modal.active,.trailer-modal:not([hidden]),'+
      '[role="dialog"][aria-hidden="false"]'
    )).find(visible);
    if (!layer) return false;
    layer.classList.remove('active','show','open','is-open');
    layer.hidden = true;
    layer.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open','drawer-open','no-scroll');
    document.documentElement.classList.remove('modal-open','drawer-open','no-scroll');
    document.body.style.removeProperty('overflow');
    return true;
  };
  const goBack = () => {
    if (closeLayer()) return;
    if (!homePage()) {
      if (history.length > 1) history.back();
      else location.replace('index.html?tv=1');
      return;
    }
    if (confirm('Exit CineFlex?')) {
      try { window.close(); } catch (_) {}
    }
  };
  const isEditable = (target) => {
    const tag = target?.tagName || '';
    return /^(INPUT|TEXTAREA|SELECT)$/i.test(tag) || !!target?.isContentEditable;
  };
  const isBack = (e) => e.key === 'Escape' || e.key === 'Esc' || e.key === 'BrowserBack' || e.key === 'GoBack' ||
    e.code === 'Escape' || e.keyCode === 27 || e.which === 27 || e.keyCode === 461 || e.keyCode === 10009 ||
    (e.key === 'Backspace' && !isEditable(e.target));
  const handler = (e) => {
    if (!isBack(e) || locked) return;
    locked = true;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    goBack();
    setTimeout(() => { locked = false; }, 350);
  };

  // Register immediately and on both phases/targets so older TV scripts cannot swallow Back first.
  window.addEventListener('keydown', handler, {capture:true});
  document.addEventListener('keydown', handler, {capture:true});
  window.addEventListener('keyup', handler, {capture:true});
  window.CineFlexBack = { back: goBack, closeOpenLayer: closeLayer };
})();
