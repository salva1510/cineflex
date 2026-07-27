/* CineFlex Build 18 — Ultra Pro enhancement layer */
(function(){
  'use strict';
  function createDiscovery(){
    if(document.querySelector('.cf-ultra-discovery')) return;
    const hero=document.getElementById('banner'), content=document.querySelector('main.content');
    if(!hero||!content) return;
    const bar=document.createElement('nav');
    bar.className='cf-ultra-discovery'; bar.setAttribute('aria-label','Quick discovery');
    const chips=[
      ['fa-house','For You','for-you-section'],['fa-fire-flame-curved','Trending','trending-section'],
      ['fa-ranking-star','Top 10','top10-section'],['fa-ghost','Horror','horror-section'],
      ['fa-dragon','Anime','anime-section'],['fa-tv','Live TV','cf-live-tv-section'],
      ['fa-music','Music','cf-music-hub']
    ];
    chips.forEach((item,i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='cf-ultra-chip'+(i===0?' active':'');
      b.innerHTML='<i class="fa-solid '+item[0]+'"></i>'+item[1];
      b.addEventListener('click',()=>{
        bar.querySelectorAll('.cf-ultra-chip').forEach(x=>x.classList.remove('active')); b.classList.add('active');
        const target=document.getElementById(item[2]);
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
        else if(item[1]==='Live TV' && typeof window.cfOpenLiveTV==='function') window.cfOpenLiveTV();
        else if(item[1]==='Music' && typeof window.cfOpenMusicHub==='function') window.cfOpenMusicHub();
      }); bar.appendChild(b);
    });
    const status=document.createElement('div'); status.className='cf-ultra-status';
    status.innerHTML='<span class="cf-live-dot"></span><span><b>CineFlex</b> is live</span>';
    bar.appendChild(status); content.parentNode.insertBefore(bar,content);
  }
  function installReveal(){
    const els=document.querySelectorAll('main.content > .row');
    els.forEach(el=>el.classList.add('cf-reveal'));
    if(!('IntersectionObserver' in window)){els.forEach(el=>el.classList.add('cf-visible'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('cf-visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -40px'});
    els.forEach(el=>io.observe(el));
  }
  function enrichHero(){
    const hero=document.getElementById('banner'); if(!hero) return;
    hero.setAttribute('aria-label','Featured title');
    const play=hero.querySelector('.play-btn'); if(play && !play.querySelector('.cf-btn-label')) play.innerHTML='<i class="fa-solid fa-play"></i><span class="cf-btn-label">Watch Now</span>';
  }
  function init(){createDiscovery();installReveal();enrichHero();document.documentElement.classList.add('cf-ultra-pro18')}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',()=>setTimeout(()=>{createDiscovery();enrichHero()},500));
})();
