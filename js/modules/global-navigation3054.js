/* CineFlex Build 305.4 — one PC + Smart TV navigation controller */
(() => {
  'use strict';
  if (window.__CF_NAV_3054__) return;
  window.__CF_NAV_3054__ = true;

  const FOCUS_SELECTOR = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])', '.card', '.movie-card',
    '.cf-premium-card', '.netflix-item-container', '.episode-card',
    '.server-tab', '.profile-card', '#loadMore', '.load'
  ].join(',');

  const isEditable = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/i.test(el.tagName || ''));
  const visible = el => {
    if (!el || !el.isConnected || el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    const s=getComputedStyle(el), r=el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && r.width > 2 && r.height > 2;
  };
  const focusables = () => [...document.querySelectorAll(FOCUS_SELECTOR)].filter(visible);

  function enhance(root=document) {
    root.querySelectorAll?.('.card,.movie-card,.cf-premium-card,.netflix-item-container,.episode-card,.profile-card,#loadMore,.load')
      .forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex=0; });
  }

  function setFocus(el, smooth=true) {
    if (!visible(el)) return false;
    document.querySelectorAll('.cf-tv-focus').forEach(x=>x.classList.remove('cf-tv-focus'));
    el.classList.add('cf-tv-focus');
    try { el.focus({preventScroll:true}); } catch (_) { el.focus(); }
    try { el.scrollIntoView({block:'center', inline:'center', behavior:smooth?'smooth':'auto'}); } catch (_) {}
    return true;
  }

  function move(direction) {
    const list=focusables();
    if (!list.length) return;
    let current=document.activeElement;
    if (!visible(current) || !list.includes(current)) return setFocus(list[0]);
    const a=current.getBoundingClientRect();
    const ax=a.left+a.width/2, ay=a.top+a.height/2;
    let best=null, score=Infinity;
    for (const el of list) {
      if (el===current) continue;
      const b=el.getBoundingClientRect(), bx=b.left+b.width/2, by=b.top+b.height/2;
      const dx=bx-ax, dy=by-ay;
      if (direction==='left' && dx>=-4) continue;
      if (direction==='right' && dx<=4) continue;
      if (direction==='up' && dy>=-4) continue;
      if (direction==='down' && dy<=4) continue;
      const primary=(direction==='left'||direction==='right')?Math.abs(dx):Math.abs(dy);
      const cross=(direction==='left'||direction==='right')?Math.abs(dy):Math.abs(dx);
      const overlap=(direction==='left'||direction==='right')
        ? Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))
        : Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left));
      const s=primary + cross*2.35 - overlap*.35;
      if (s<score) { score=s; best=el; }
    }
    if (best) setFocus(best);
  }

  function clickFocused() {
    const el=document.activeElement;
    if (!visible(el) || el===document.body) return;
    if (el.tagName==='INPUT' || el.tagName==='TEXTAREA') return;
    el.click?.();
  }

  function closeVisible(selectors) {
    for (const selector of selectors) {
      const el=document.querySelector(selector);
      if (!visible(el)) continue;
      const close=el.querySelector('[data-close],.close,.close-btn,.modal-close,.player-close,.back-btn,[aria-label*="close" i]');
      if (close && visible(close)) close.click();
      else { el.classList.remove('active','open','show','visible'); el.hidden=true; }
      return true;
    }
    return false;
  }

  function goBack() {
    if (document.fullscreenElement) { document.exitFullscreen?.(); return true; }
    if (closeVisible(['#videoPlayerModal','.video-modal','.player-modal','#movieModal','.details-modal','#searchOverlay','.search-overlay','#menuDrawer','.menu-drawer','.drawer.active','.modal.active'])) return true;
    const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if (path==='index.html' || path==='') {
      const focused=document.activeElement;
      if (focused && focused!==document.body) { focused.blur(); window.scrollTo({top:0,behavior:'smooth'}); return true; }
      return false;
    }
    if (history.length>1 && document.referrer && new URL(document.referrer).origin===location.origin) history.back();
    else location.href='index.html';
    return true;
  }

  function isBackKey(e) {
    return e.key==='Escape' || e.key==='Esc' || e.code==='Escape' || e.keyCode===27 || e.which===27 ||
      e.key==='BrowserBack' || e.key==='GoBack' || e.keyCode===461 || e.keyCode===10009 ||
      (e.key==='Backspace' && !isEditable(e.target));
  }

  function onKey(e) {
    const arrows={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    if (arrows[e.key]) {
      if (isEditable(e.target)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      document.body.classList.add('cf-tv-mode');
      move(arrows[e.key]); return;
    }
    if ((e.key==='Enter'||e.key==='NumpadEnter'||e.key===' ') && !isEditable(e.target)) {
      e.preventDefault(); e.stopImmediatePropagation(); clickFocused(); return;
    }
    if (isBackKey(e)) {
      e.preventDefault(); e.stopImmediatePropagation(); goBack();
    }
  }

  enhance();
  addEventListener('keydown', onKey, true);
  document.addEventListener('focusin', e => {
    if (visible(e.target) && e.target.matches?.(FOCUS_SELECTOR)) {
      document.querySelectorAll('.cf-tv-focus').forEach(x=>x.classList.remove('cf-tv-focus'));
      e.target.classList.add('cf-tv-focus');
    }
  }, true);
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>n.nodeType===1&&enhance(n))))
    .observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',()=>{ enhance(); setTimeout(()=>{ if (document.body.classList.contains('cf-tv-mode')) setFocus(focusables()[0],false); },150); });
  window.CineFlexNavigation={move,back:goBack,focusFirst:()=>setFocus(focusables()[0])};
})();
