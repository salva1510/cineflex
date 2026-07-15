/* CineFlex Desktop Row Scroll Restore v1.0 */
(()=>{
  const SELECTOR='.row > .scroller, .row > .cf-smart-scroller, .row > .cf-top10-scroller';
  const desktop=()=>matchMedia('(min-width:900px)').matches;
  const amount=scroller=>Math.max(420,Math.round(scroller.clientWidth*.78));

  function update(shell,scroller){
    const prev=shell.querySelector('.cf-row-scroll-btn.prev');
    const next=shell.querySelector('.cf-row-scroll-btn.next');
    if(!prev||!next)return;
    const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
    prev.disabled=scroller.scrollLeft<=3;
    next.disabled=scroller.scrollLeft>=max-3 || max<8;
  }

  function enhance(scroller){
    if(!scroller||scroller.dataset.cfDesktopScroll==='1')return;
    scroller.dataset.cfDesktopScroll='1';
    const parent=scroller.parentElement;
    if(!parent)return;
    const shell=document.createElement('div');
    shell.className='row-scroll-shell';
    parent.insertBefore(shell,scroller);
    shell.appendChild(scroller);

    const prev=document.createElement('button');
    prev.type='button'; prev.className='cf-row-scroll-btn prev';
    prev.setAttribute('aria-label','Scroll left');
    prev.innerHTML='<i class="fa-solid fa-chevron-left"></i>';
    const next=document.createElement('button');
    next.type='button'; next.className='cf-row-scroll-btn next';
    next.setAttribute('aria-label','Scroll right');
    next.innerHTML='<i class="fa-solid fa-chevron-right"></i>';
    shell.append(prev,next);

    prev.addEventListener('click',()=>scroller.scrollBy({left:-amount(scroller),behavior:'smooth'}));
    next.addEventListener('click',()=>scroller.scrollBy({left:amount(scroller),behavior:'smooth'}));
    scroller.addEventListener('scroll',()=>requestAnimationFrame(()=>update(shell,scroller)),{passive:true});
    scroller.addEventListener('wheel',e=>{
      if(!desktop()||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
      if(scroller.scrollWidth<=scroller.clientWidth+4)return;
      e.preventDefault();
      scroller.scrollLeft+=e.deltaY;
    },{passive:false});
    new ResizeObserver(()=>update(shell,scroller)).observe(scroller);
    new MutationObserver(()=>update(shell,scroller)).observe(scroller,{childList:true,subtree:false});
    setTimeout(()=>update(shell,scroller),80);
  }

  function init(){document.querySelectorAll(SELECTOR).forEach(enhance)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('resize',init,{passive:true});
})();
