(() => {
  'use strict';
  const MODE_KEY = 'cineflex_tv_mode';
  const CARD = '.card,.movie-card,.dramabox-card,.netflix-item-container,.search-card,.cf-smart-card,.cf-top10-card,.cf51-because-card,.cf-catalog-card,.similar-card,.modern-grid-item,.cf-premium-card,[data-tv-focusable="poster"]';
  const BUTTON = 'button:not([disabled]),a[href],[tabindex="0"]';
  let enabled = false;
  let current = null;

  const visible = el => {
    if (!el || !el.isConnected) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > .05 && r.width > 8 && r.height > 8;
  };
  const center = el => { const r = el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}; };
  const topLayer = () => [...document.querySelectorAll('.modal,.search-overlay,.menu-drawer,[role="dialog"]')].filter(visible).at(-1) || document;
  const cards = () => [...topLayer().querySelectorAll(CARD)].filter(visible).filter(el => !el.closest('.cf-hero-video'));
  const controls = () => [...topLayer().querySelectorAll(BUTTON)].filter(visible).filter(el => !el.closest('.cf-card-actions'));

  function prepare() {
    document.querySelectorAll(CARD).forEach(el => {
      el.tabIndex = 0;
      el.setAttribute('data-tv-focusable','poster');
      el.querySelectorAll('.cf-card-actions button').forEach(btn => btn.tabIndex = -1);
    });
  }
  function focus(el, scroll=true) {
    if (!visible(el)) return false;
    document.querySelectorAll('.cf3046-home-focus').forEach(x => x.classList.remove('cf3046-home-focus'));
    current = el;
    el.classList.add('cf3046-home-focus');
    try { el.focus({preventScroll:true}); } catch (_) { try { el.focus(); } catch (_) {} }
    if (scroll) el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    return true;
  }
  function activate(force=false) {
    if (enabled && !force) return;
    enabled = true;
    localStorage.setItem(MODE_KEY,'on');
    document.documentElement.classList.add('cf3046-tv','cf304-tv','cf-tv-mode');
    document.body.classList.add('cf3046-tv','cf304-tv','cf-tv-mode');
    prepare();
    const play = document.querySelector('#banner-play-btn,#banner .play-btn');
    focus(visible(play) ? play : cards()[0], false);
  }
  function sortedRows(list) {
    const sorted = [...list].sort((a,b) => center(a).y-center(b).y || center(a).x-center(b).x);
    const rows=[];
    for (const el of sorted) {
      const c=center(el);
      let row=rows.find(r => Math.abs(r.y-c.y) < Math.max(35,c.h*.45));
      if (!row) { row={y:c.y,items:[]}; rows.push(row); }
      row.items.push(el); row.y = row.items.reduce((n,x)=>n+center(x).y,0)/row.items.length;
    }
    rows.sort((a,b)=>a.y-b.y); rows.forEach(r=>r.items.sort((a,b)=>center(a).x-center(b).x));
    return rows;
  }
  function moveCards(dir) {
    prepare();
    const list=cards(); if (!list.length) return false;
    if (!current || !current.matches(CARD) || !visible(current)) {
      if (dir==='down') return focus(list[0]);
      return false;
    }
    const rows=sortedRows(list);
    const ri=rows.findIndex(r=>r.items.includes(current)); if (ri<0) return focus(list[0]);
    const row=rows[ri], ci=row.items.indexOf(current);
    if (dir==='left' || dir==='right') {
      const next=row.items[ci+(dir==='left'?-1:1)];
      if (next) return focus(next);
      current.closest('.scroller,.main-list,.tv-list')?.scrollBy({left:(dir==='left'?-1:1)*innerWidth*.7,behavior:'smooth'});
      return true;
    }
    const targetRow=rows[ri+(dir==='up'?-1:1)];
    if (!targetRow) {
      if (dir==='up') {
        const play=document.querySelector('#banner-play-btn,#banner .play-btn');
        if (visible(play)) return focus(play);
      }
      window.scrollBy({top:(dir==='down'?1:-1)*innerHeight*.7,behavior:'smooth'});
      return true;
    }
    const x=center(current).x;
    return focus(targetRow.items.reduce((best,el)=>Math.abs(center(el).x-x)<Math.abs(center(best).x-x)?el:best,targetRow.items[0]));
  }
  function moveModal(dir) {
    const list=controls(); if (!list.length) return false;
    if (!current || !list.includes(current)) return focus(list[0]);
    const a=center(current); let best=null, score=Infinity;
    for (const el of list) {
      if (el===current) continue;
      const b=center(el), dx=b.x-a.x, dy=b.y-a.y;
      const primary=dir==='left'?-dx:dir==='right'?dx:dir==='up'?-dy:dy;
      if (primary<=5) continue;
      const cross=(dir==='left'||dir==='right')?Math.abs(dy):Math.abs(dx);
      const axis=(dir==='left'||dir==='right')?Math.abs(dx):Math.abs(dy);
      const value=axis+cross*2.6;
      if (value<score) {score=value;best=el;}
    }
    return best ? focus(best) : false;
  }
  function onKey(e) {
    const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    if (map[e.key] && !enabled) activate();
    if (!enabled) return;
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (map[e.key]) {
      e.preventDefault(); e.stopImmediatePropagation();
      current = visible(document.activeElement) && document.activeElement!==document.body ? document.activeElement : current;
      const modal = topLayer() !== document;
      if (!modal && e.key==='ArrowDown' && current?.closest?.('#banner')) { focus(cards()[0]); return; }
      if (!modal && moveCards(map[e.key])) return;
      moveModal(map[e.key]);
      return;
    }
    if (['Enter','NumpadEnter',' '].includes(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation();
      const target = visible(document.activeElement) && document.activeElement!==document.body ? document.activeElement : current;
      target?.click?.();
    }
  }
  function init() {
    enabled = localStorage.getItem(MODE_KEY)==='on' || new URLSearchParams(location.search).get('tv')==='1' || document.body.classList.contains('cf-tv-mode');
    if (enabled) activate(true);
    prepare();
    document.addEventListener('keydown',onKey,true);
    document.addEventListener('focusin',e=>{ if(enabled && (e.target.matches?.(CARD)||e.target.matches?.(BUTTON))) current=e.target; },true);
    new MutationObserver(()=>prepare()).observe(document.body,{childList:true,subtree:true});
  }
  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',init,{once:true}) : init();
})();
