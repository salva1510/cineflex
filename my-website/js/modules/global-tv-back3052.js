/* CineFlex Build 305.2 — global TV/keyboard Back behavior */
(() => {
  'use strict';

  const HOME_FILES = new Set(['', '/', '/index.html', 'index.html']);
  let handling = false;

  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const clickVisible = (selectors) => {
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!isVisible(el) || el.disabled) continue;
        el.click();
        return true;
      }
    }
    return false;
  };

  const closeOpenLayer = () => {
    // Native fullscreen is always the first layer to leave.
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (_) {}
        return true;
      }
    }

    // Player/trailer/details/search/menu/profile overlays, in priority order.
    if (clickVisible([
      '#closePlayer', '#playerClose', '#closeVideo', '#closeTrailer',
      '.player-close', '.trailer-close', '.video-close',
      '#detailsClose', '#closeDetails', '.details-close', '.modal-close',
      '#closeSearch', '.search-close',
      '#drawerClose', '#menuClose', '.drawer-close',
      '#closeProfileModal', '#closeAddProfile',
      '[data-close-modal]:not([hidden])'
    ])) return true;

    // Fallback for known active layers that may not expose a close button.
    const activeLayer = [...document.querySelectorAll(
      '.modal.active,.modal.show,.modal.open,.drawer.active,.drawer.open,' +
      '.search-overlay.active,.search-overlay.open,.player-modal.active,' +
      '.trailer-modal:not([hidden]),[role="dialog"][aria-hidden="false"]'
    )].find(isVisible);

    if (activeLayer) {
      activeLayer.classList.remove('active', 'show', 'open', 'is-open');
      activeLayer.setAttribute('aria-hidden', 'true');
      if (activeLayer.matches('.trailer-modal')) activeLayer.hidden = true;
      document.body.classList.remove('modal-open', 'drawer-open', 'no-scroll');
      document.body.style.removeProperty('overflow');
      return true;
    }
    return false;
  };

  const isHome = () => {
    const path = location.pathname.replace(/\\+/g, '/');
    return path.endsWith('/') || path.endsWith('/index.html') || HOME_FILES.has(path);
  };

  const goBack = () => {
    if (closeOpenLayer()) return;

    if (!isHome()) {
      const sameOriginReferrer = (() => {
        try { return document.referrer && new URL(document.referrer).origin === location.origin; }
        catch (_) { return false; }
      })();

      if (history.length > 1 && sameOriginReferrer) history.back();
      else location.href = 'index.html?tv=1';
      return;
    }

    const shouldExit = window.confirm('Exit CineFlex?');
    if (!shouldExit) return;

    // window.close works in several installed/PWA/TV WebView contexts.
    try { window.close(); } catch (_) {}
    setTimeout(() => {
      // Browser tabs usually cannot be closed by script; leave a clear exit screen.
      document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#050506;color:#fff;font-family:Arial;text-align:center;padding:24px"><div><img src="cineflex-header-logo.png" alt="CineFlex" style="max-width:180px"><h2>Ready to exit CineFlex</h2><p style="color:#aaa">Press the TV Home or browser Back button to close the app.</p><button onclick="location.reload()" style="padding:12px 22px;border:0;border-radius:999px;font-weight:800">Return to CineFlex</button></div></main>';
    }, 180);
  };

  const isBackEvent = (event) =>
    event.key === 'Escape' ||
    event.key === 'BrowserBack' ||
    event.key === 'GoBack' ||
    event.keyCode === 461 ||       // LG/webOS and some Android remotes
    event.keyCode === 10009 ||     // Samsung Tizen remote Back
    (event.key === 'Backspace' && !/^(INPUT|TEXTAREA|SELECT)$/i.test(event.target?.tagName || '') && !event.target?.isContentEditable);

  // Window capture runs before the older document-level TV handlers.
  window.addEventListener('keydown', (event) => {
    if (!isBackEvent(event) || handling) return;
    handling = true;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try { goBack(); }
    finally { setTimeout(() => { handling = false; }, 250); }
  }, true);

  window.CineFlexBack = { back: goBack, closeOpenLayer };
})();
