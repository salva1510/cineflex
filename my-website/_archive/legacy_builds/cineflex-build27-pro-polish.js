/* CineFlex Build 27 - Pro Polish Layer */
(function(){
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function toast(msg, type='info'){
    let host = $('#cf-toast-host');
    if(!host){
      host = document.createElement('div');
      host.id = 'cf-toast-host';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = 'cf-toast ' + type;
    item.innerHTML = `<i class="fa-solid ${type==='success'?'fa-circle-check':type==='error'?'fa-triangle-exclamation':'fa-circle-info'}"></i><span>${msg}</span>`;
    host.appendChild(item);
    setTimeout(()=> item.classList.add('show'), 30);
    setTimeout(()=> { item.classList.remove('show'); setTimeout(()=>item.remove(), 260); }, 3200);
  }
  window.cfToast = window.cfToast || toast;

  function ensureScrollTop(){
    if($('#cf-scroll-top')) return;
    const btn = document.createElement('button');
    btn.id = 'cf-scroll-top';
    btn.type = 'button';
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    btn.setAttribute('aria-label','Back to top');
    btn.onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.body.appendChild(btn);
    window.addEventListener('scroll',()=> btn.classList.toggle('show', window.scrollY > 650), {passive:true});
  }

  function enhanceCards(){
    $$('.movie-card, .top10-card, .search-card').forEach(card => {
      if(card.dataset.cfEnhanced) return;
      card.dataset.cfEnhanced = '1';
      card.setAttribute('tabindex','0');
      card.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); card.click(); }
      });
      const img = $('img', card);
      if(img){
        img.loading = img.loading || 'lazy';
        img.decoding = 'async';
        img.addEventListener('error',()=> card.classList.add('cf-card-image-error'), {once:true});
      }
    });
  }

  function addQuickActions(){
    if($('#cf-floating-actions')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cf-floating-actions';
    wrap.innerHTML = `
      <button type="button" title="Search" aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></button>
      <button type="button" title="Menu" aria-label="Menu"><i class="fa-solid fa-bars-staggered"></i></button>
    `;
    const [searchBtn, menuBtn] = wrap.querySelectorAll('button');
    searchBtn.onclick = () => (window.openSearch ? openSearch() : toast('Search is loading...'));
    menuBtn.onclick = () => (window.openMenuDrawer ? openMenuDrawer() : toast('Menu is loading...'));
    document.body.appendChild(wrap);
  }

  function addKeyboardShortcuts(){
    document.addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA/.test((document.activeElement||{}).tagName);
      if(typing) return;
      if(e.key === '/') { e.preventDefault(); window.openSearch && openSearch(); }
      if(e.key === 'Escape') {
        if(window.closeSearch) closeSearch();
        const modal = $('#movie-modal');
        if(modal && getComputedStyle(modal).display !== 'none'){
          const closeBtn = $('.movie-modal-close, .modal-close, .close-btn, [data-close-modal]');
          if(closeBtn) closeBtn.click();
        }
      }
    });
  }

  function installWatcher(){
    window.addEventListener('online',()=> toast('Back online. CineFlex is ready.', 'success'));
    window.addEventListener('offline',()=> toast('You are offline. Some streams may not load.', 'error'));
  }

  function protectPosterClose(){
    const modal = $('#movie-modal');
    if(!modal || $('#cf-poster-emergency-close')) return;
    const btn = document.createElement('button');
    btn.id = 'cf-poster-emergency-close';
    btn.type = 'button';
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btn.setAttribute('aria-label','Close details');
    btn.onclick = () => {
      if(window.closeModal) return closeModal();
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    };
    modal.appendChild(btn);
  }

  function init(){
    document.body.classList.add('cf-build27-ready');
    ensureScrollTop();
    addQuickActions();
    addKeyboardShortcuts();
    installWatcher();
    protectPosterClose();
    enhanceCards();
    setInterval(enhanceCards, 1800);
    setTimeout(()=> toast('CineFlex Build 27 loaded', 'success'), 600);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
