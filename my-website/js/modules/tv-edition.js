/* CineFlex TV Edition v1.0 — D-pad focus, TV detection, safe TV layout */
(() => {
  'use strict';
  const ROOT = document.documentElement;
  const MODE_KEY = 'cineflex_tv_mode';
  const FOCUS_CLASS = 'cf-tv-focus';
  const TV_UA = /(android tv|google tv|smart-tv|smarttv|hbbtv|netcast|web0s|webos|tizen|viera|bravia|aftb|aftm|aftt|aftss|fire tv|roku|crkey|chromecast)/i;
  const focusSelector = [
    'button:not([disabled])','a[href]','[tabindex="0"]','.drawer-item',
    '.card','.dramabox-card','.netflix-item-container','.search-card',
    '.cf-smart-card','.cf-top10-card','.cf51-because-card','.cf-catalog-card',
    '.similar-card','.episode-card','.profile-card'
  ].join(',');

  let enabled = false;
  let current = null;
  let toastTimer = 0;

  function queryOverride() {
    const p = new URLSearchParams(location.search).get('tv');
    if (p === '1') return true;
    if (p === '0') return false;
    return null;
  }
  function shouldEnable() {
    const q = queryOverride();
    if (q !== null) return q;
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === 'on') return true;
    if (saved === 'off') return false;
    return TV_UA.test(navigator.userAgent || '');
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 4 && r.height > 4;
  }
  function candidates() {
    const modal = [...document.querySelectorAll('.modal, .search-overlay, .menu-drawer, [role="dialog"]')]
      .reverse().find(el => visible(el) && (el.classList.contains('open') || getComputedStyle(el).display !== 'none'));
    const scope = modal || document;
    return [...scope.querySelectorAll(focusSelector)].filter(visible);
  }
  function center(el) {
    const r = el.getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.top+r.height/2, w:r.width, h:r.height};
  }
  function setFocus(el, scroll = true) {
    if (!el || !visible(el)) return;
    document.querySelectorAll('.' + FOCUS_CLASS).forEach(n => n.classList.remove(FOCUS_CLASS));
    current = el;
    el.classList.add(FOCUS_CLASS);
    try { el.focus({preventScroll:true}); } catch (_) { try { el.focus(); } catch (_) {} }
    if (scroll) el.scrollIntoView({behavior:'smooth', block:'center', inline:'center'});
  }
  function firstFocus() {
    const els = candidates();
    const preferred = els.find(el => el.id === 'banner-play-btn' || el.classList.contains('play-btn')) || els[0];
    setFocus(preferred, false);
  }
  function move(dir) {
    const els = candidates();
    if (!els.length) return;
    if (!current || !visible(current) || !els.includes(current)) { setFocus(els[0]); return; }
    const a = center(current);
    let best = null, score = Infinity;
    for (const el of els) {
      if (el === current) continue;
      const b = center(el), dx=b.x-a.x, dy=b.y-a.y;
      const primary = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
      if (primary <= 8) continue;
      const cross = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
      const axis = (dir === 'left' || dir === 'right') ? Math.abs(dx) : Math.abs(dy);
      const candidateScore = axis + cross * 2.4 + (cross > Math.max(a.h,b.h)*1.5 ? 900 : 0);
      if (candidateScore < score) { score = candidateScore; best = el; }
    }
    if (best) setFocus(best);
    else {
      const amount = dir === 'up' ? -innerHeight*.72 : dir === 'down' ? innerHeight*.72 : dir === 'left' ? -innerWidth*.65 : innerWidth*.65;
      if (dir === 'up' || dir === 'down') scrollBy({top:amount, behavior:'smooth'});
      else current.closest('.scroller, .genre-container, .cast-scroller')?.scrollBy({left:amount, behavior:'smooth'});
    }
  }
  function closeTopLayer() {
    const clickFirst = selectors => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (visible(el)) { el.click(); return true; }
      }
      return false;
    };
    if (clickFirst(['.close-trailer-btn','.close-modal','#cf-party-close','#cf-progress-close','#cf42Close','.cf-catalog-exit','.close-drawer'])) return;
    if (document.getElementById('menu-drawer')?.classList.contains('open')) { window.closeMenuDrawer?.(); return; }
    if (scrollY > 20) scrollTo({top:0,behavior:'smooth'});
  }
  function activate() {
    if (!current || !visible(current)) return firstFocus();
    current.click();
    setTimeout(() => { const els=candidates(); if (!els.includes(current)) setFocus(els[0], false); }, 180);
  }
  function onKey(e) {
    if (!enabled) return;
    const map = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    if (map[e.key]) { e.preventDefault(); e.stopPropagation(); move(map[e.key]); return; }
    if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.key === ' ') { e.preventDefault(); activate(); return; }
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack' || e.keyCode === 461 || e.keyCode === 10009) {
      e.preventDefault(); closeTopLayer();
    }
  }
  function toast(text) {
    let el = document.querySelector('.cf-tv-toast');
    if (!el) { el=document.createElement('div'); el.className='cf-tv-toast'; document.body.appendChild(el); }
    el.textContent=text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
  }
  function setMode(on, persist = true) {
    enabled = !!on;
    ROOT.classList.toggle('cf-tv-mode', enabled);
    document.body?.classList.toggle('cf-tv-mode', enabled);
    if (persist) localStorage.setItem(MODE_KEY, enabled ? 'on' : 'off');
    if (enabled) setTimeout(firstFocus, 500);
    else { document.querySelectorAll('.'+FOCUS_CLASS).forEach(n=>n.classList.remove(FOCUS_CLASS)); current=null; }
    updateToggle();
    toast(enabled ? 'TV Mode enabled' : 'TV Mode disabled');
  }
  function updateToggle() {
    const text = document.getElementById('cfTvModeText');
    const icon = document.getElementById('cfTvModeIcon');
    if (text) text.textContent = enabled ? 'Exit TV Mode' : 'TV Mode';
    if (icon) icon.className = enabled ? 'fa-solid fa-display' : 'fa-solid fa-tv';
  }
  function installToggle() {
    const personal = document.querySelector('.cf-install-drawer-section');
    if (!personal || document.getElementById('cfTvModeToggle')) return;
    personal.insertAdjacentHTML('beforeend', `<button id="cfTvModeToggle" class="drawer-item cf-tv-mode-toggle" type="button"><i id="cfTvModeIcon" class="fa-solid fa-tv"></i><span id="cfTvModeText">TV Mode</span></button>`);
    document.getElementById('cfTvModeToggle').addEventListener('click', () => setMode(!enabled));
    updateToggle();
  }
  function boot() {
    installToggle();
    setMode(shouldEnable(), false);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', e => { if (enabled && e.target.matches?.(focusSelector)) setFocus(e.target, false); });
    const observer = new MutationObserver(() => { if (enabled && (!current || !visible(current))) setTimeout(firstFocus, 80); });
    observer.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style']});
    window.CineFlexTV = {enable:()=>setMode(true), disable:()=>setMode(false), toggle:()=>setMode(!enabled), isEnabled:()=>enabled};
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
