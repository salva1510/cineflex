/* CineFlex Build 14.0 — Performance & Premium Polish */
(function(){
  'use strict';
  const IMG_SELECTOR = 'img:not([data-cf14-ignore])';
  const ROW_SELECTORS = ['.movie-row','.content-row','.card-row','.horizontal-scroll'];
  let imageObserver = null;
  let toastTimer = 0;

  function setupImage(img){
    if(!img || img.dataset.cf14Ready === '1') return;
    img.dataset.cf14Ready = '1';
    img.loading = img.loading || 'lazy';
    img.decoding = 'async';
    img.fetchPriority = img.closest('.hero,.banner,.hero-banner') ? 'high' : 'low';
    img.classList.add('cf14-lazy');
    const done = () => { img.classList.remove('cf14-lazy'); img.classList.add('cf14-loaded'); };
    const failed = () => { img.classList.remove('cf14-lazy'); img.classList.add('cf14-error'); };
    if(img.complete){
      if(img.naturalWidth) { if(img.decode) img.decode().catch(()=>{}).finally(done); else done(); }
      else failed();
    } else {
      img.addEventListener('load', () => { if(img.decode) img.decode().catch(()=>{}).finally(done); else done(); }, {once:true});
      img.addEventListener('error', failed, {once:true});
    }
    if(imageObserver) imageObserver.observe(img);
  }

  function initImages(root){
    (root || document).querySelectorAll?.(IMG_SELECTOR).forEach(setupImage);
  }

  function setupObserver(){
    if(!('IntersectionObserver' in window)) return;
    imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        const img = entry.target;
        const deferred = img.dataset.src || img.dataset.lazySrc;
        if(deferred && !img.src){ img.src = deferred; }
        imageObserver.unobserve(img);
      });
    },{rootMargin:'500px 0px',threshold:.01});
  }

  function addSkeleton(row){
    if(!row || row.dataset.cf14Skeleton === '1' || row.children.length) return;
    row.dataset.cf14Skeleton = '1';
    const skeleton = document.createElement('div');
    skeleton.className = 'cf14-skeleton-row';
    skeleton.setAttribute('aria-hidden','true');
    skeleton.innerHTML = '<i class="cf14-skeleton-card"></i>'.repeat(7);
    row.appendChild(skeleton);
    setTimeout(() => { if(skeleton.isConnected && row.children.length === 1) skeleton.remove(); }, 8000);
  }

  function scanRows(root){
    ROW_SELECTORS.forEach(selector => (root || document).querySelectorAll?.(selector).forEach(row => {
      if(!row.children.length) addSkeleton(row);
      else row.querySelector('.cf14-skeleton-row')?.remove();
    }));
  }

  function initMutationWatch(){
    const observer = new MutationObserver(records => {
      for(const record of records){
        record.addedNodes.forEach(node => {
          if(node.nodeType !== 1) return;
          if(node.matches?.('img')) setupImage(node);
          initImages(node);
          if(node.matches?.(ROW_SELECTORS.join(','))) scanRows(node.parentElement || document);
          node.querySelectorAll?.(ROW_SELECTORS.join(',')).forEach(row => {
            row.querySelector('.cf14-skeleton-row')?.remove();
          });
        });
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function networkToast(message, offline){
    let el = document.getElementById('cf14-network-toast');
    if(!el){ el=document.createElement('div'); el.id='cf14-network-toast'; document.body.appendChild(el); }
    el.textContent=message; el.classList.toggle('offline',!!offline); el.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
  }

  function initNetworkStatus(){
    window.addEventListener('offline',()=>networkToast('Offline mode — saved content may still work.',true));
    window.addEventListener('online',()=>networkToast('Back online',false));
  }

  function registerIdleWork(){
    const run = () => {
      // Warm only same-origin UI modules; media/posters remain demand-loaded.
      ['css/modules/activity-center13.css','js/modules/activity-center13.js','js/modules/music-hub.js'].forEach(url => {
        if(document.querySelector(`link[data-cf14-prefetch="${url}"]`)) return;
        const link=document.createElement('link'); link.rel='prefetch'; link.href=url; link.as=url.endsWith('.css')?'style':'script'; link.dataset.cf14Prefetch=url; document.head.appendChild(link);
      });
    };
    if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:2500}); else setTimeout(run,1500);
  }

  function boot(){
    setupObserver();
    initImages(document);
    scanRows(document);
    initMutationWatch();
    initNetworkStatus();
    registerIdleWork();
    requestAnimationFrame(()=>document.body.classList.add('cf14-ready'));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
