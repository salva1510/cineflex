/* =========================================================
   CINEFLEX BUILD 28 — CINEFLEX IDENTITY UI
   Non-destructive enhancements layered on top of Build 27.
   ========================================================= */
(function(){
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  function safeToast(message){
    if(typeof window.cfToast === 'function') return window.cfToast(message);
    const t=document.createElement('div');
    t.className='cf-toast'; t.textContent=message;
    t.style.cssText='position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:9999;color:#fff;padding:12px 16px;border-radius:16px;font-weight:800;';
    document.body.appendChild(t); setTimeout(()=>t.remove(),2600);
  }

  function addSplash(){
    if(sessionStorage.getItem('cineflex_identity_splash_seen') || $('.cx-splash')) return;
    const splash=document.createElement('div');
    splash.className='cx-splash';
    splash.innerHTML='<div class="cx-splash-ring"></div><div><div class="cx-splash-logo">CINEFLEX</div><small>ORIGINAL STREAMING EXPERIENCE</small></div>';
    document.body.appendChild(splash);
    sessionStorage.setItem('cineflex_identity_splash_seen','1');
    setTimeout(()=>splash.classList.add('hide'),1200);
    setTimeout(()=>splash.remove(),1900);
  }

  function addTopNav(){
    if($('.cx-app-nav')) return;
    const nav=document.createElement('div');
    nav.className='cx-app-nav';
    const items=[
      ['Home',()=>window.scrollTo({top:0,behavior:'smooth'})],
      ['Movies',()=>scrollToAny(['trending-section','netflix-section','marvel-section'])],
      ['Shows',()=>scrollToAny(['kdrama-section','shortdrama-section'])],
      ['Anime',()=>scrollToAny(['anime-section'])],
      ['Kids',()=>scrollToAny(['kids-section','cocomelon-section'])],
      ['Library',()=>{ if(typeof window.viewWatchlist==='function') window.viewWatchlist(); else safeToast('My List is opening soon.'); }]
    ];
    items.forEach(([label,action],idx)=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=label; if(idx===0)b.classList.add('active');
      b.addEventListener('click',()=>{ $$('.cx-app-nav button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); action(); });
      nav.appendChild(b);
    });
    document.body.appendChild(nav);
  }
  function scrollToAny(ids){
    for(const id of ids){ const el=document.getElementById(id); if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); return; } }
    safeToast('Section is still loading.');
  }

  function addOrbitStatus(){
    if($('.cx-orbit-status')) return;
    const s=document.createElement('div'); s.className='cx-orbit-status';
    s.innerHTML='<i class="fa-solid fa-satellite-dish"></i><span>CineFlex OS Active</span>';
    document.body.appendChild(s);
  }

  function upgradeDrawer(){
    const drawer=$('#menu-drawer .drawer-links') || $('#menu-drawer');
    if(!drawer || $('.cx-identity-card', drawer)) return;
    const card=document.createElement('div');
    card.className='cx-identity-card';
    card.innerHTML='<h4>CineFlex Identity</h4><p>Original neon motion UI is active. Use quick nav, premium cards, and app-style transitions.</p><button type="button" id="cxRunIdentityCheck"><i class="fa-solid fa-wand-magic-sparkles"></i> Run UI Check</button>';
    drawer.insertBefore(card, drawer.firstChild);
    $('#cxRunIdentityCheck')?.addEventListener('click',()=>{
      const checks=[!!$('.modal-close, .details-close, #modal-close, .close-modal'), !!$('#menu-drawer'), !!$('#banner'), !!$('.bottom-nav')].filter(Boolean).length;
      safeToast('CineFlex UI check: '+checks+'/4 core surfaces detected.');
    });
  }

  function enhanceCardsAccessibility(){
    $$('.movie-card,.top10-card,.resume-card,.mylist-pick-card,.because-card').forEach(card=>{
      if(!card.hasAttribute('tabindex')) card.setAttribute('tabindex','0');
      card.addEventListener('keydown',e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); card.click(); } });
    });
  }

  function bottomNavActiveState(){
    $$('.bottom-nav .nav-item').forEach(item=>{
      item.addEventListener('click',()=>{ $$('.bottom-nav .nav-item').forEach(i=>i.classList.remove('active')); item.classList.add('active'); });
    });
  }

  function addMotionObserver(){
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce || !('IntersectionObserver' in window)) return;
    const style=document.createElement('style');
    style.textContent='.cx-reveal{opacity:0;transform:translateY(18px);transition:opacity .55s ease,transform .55s ease}.cx-reveal.cx-in{opacity:1;transform:none}';
    document.head.appendChild(style);
    const io=new IntersectionObserver(entries=>entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('cx-in'); io.unobserve(en.target); } }),{threshold:.12});
    setTimeout(()=>{
      $$('section,.section,.movie-row,.content-row').forEach(el=>{ el.classList.add('cx-reveal'); io.observe(el); });
    },700);
  }

  function installSafeguards(){
    // Keep poster close visible after dynamic modal renders.
    setInterval(()=>{
      const modal=$('#movieModal, #detailsModal, .movie-modal, .modal');
      if(!modal) return;
      const visible=getComputedStyle(modal).display !== 'none' && !modal.hidden;
      if(!visible) return;
      const close=modal.querySelector('.modal-close,.details-close,#modalClose,.close-modal,.close-btn');
      if(close){ close.style.zIndex='99999'; close.style.opacity='1'; close.style.visibility='visible'; }
    },1600);
  }

  ready(()=>{
    addSplash(); addTopNav(); addOrbitStatus(); upgradeDrawer(); bottomNavActiveState(); addMotionObserver(); installSafeguards();
    setTimeout(enhanceCardsAccessibility, 1200);
    setInterval(enhanceCardsAccessibility, 5000);
    console.log('CineFlex Build 28 Identity UI loaded');
  });
})();
