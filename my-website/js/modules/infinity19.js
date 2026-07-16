/* CineFlex Build 19 — Infinity Edition enhancement layer */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let toastTimer;
  function toast(msg){let el=$('.cf19-toast');if(!el){el=document.createElement('div');el.className='cf19-toast';document.body.appendChild(el)}el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
  function baseLayers(){
    if(!$('.cf19-scroll-progress')){const p=document.createElement('div');p.className='cf19-scroll-progress';document.body.appendChild(p)}
    if(!$('.cf19-ambient')){const a=document.createElement('div');a.className='cf19-ambient';document.body.prepend(a)}
    const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;$('.cf19-scroll-progress').style.width=(max>0?scrollY/max*100:0)+'%'};
    addEventListener('scroll',update,{passive:true}); update();
  }
  function heroEnhance(){
    const hero=$('#banner'); if(!hero) return;
    if(!$('.cf19-hero-visual',hero)){const v=document.createElement('div');v.className='cf19-hero-visual';hero.prepend(v)}
    const content=$('.banner-content',hero);
    if(content&&!$('.cf19-hero-meta',content)){
      const meta=document.createElement('div');meta.className='cf19-hero-meta';
      meta.innerHTML='<span class="cf19-match">98% Match</span><span>4K UHD</span><span>Dolby Audio</span><span>Featured</span>';
      content.insertBefore(meta,content.firstChild);
    }
    if(!$('.cf19-hero-pager',hero)){
      const pager=document.createElement('div');pager.className='cf19-hero-pager';
      for(let i=0;i<5;i++){const b=document.createElement('button');b.className='cf19-hero-dot'+(i===0?' active':'');b.type='button';b.setAttribute('aria-label','Featured slide '+(i+1));b.addEventListener('click',()=>{$$('.cf19-hero-dot',pager).forEach(x=>x.classList.remove('active'));b.classList.add('active');const next=hero.querySelector('.banner-next,.next-banner,[data-banner-next]');if(next)next.click();});pager.appendChild(b)}hero.appendChild(pager)
    }
    if(!$('.cf19-scroll-cue',hero)){const cue=document.createElement('div');cue.className='cf19-scroll-cue';cue.setAttribute('aria-hidden','true');hero.appendChild(cue)}
    syncHeroVisual(hero);
    const obs=new MutationObserver(()=>{hero.classList.add('cf19-changing');setTimeout(()=>{syncHeroVisual(hero);hero.classList.remove('cf19-changing');cycleDot()},320)});
    obs.observe(hero,{attributes:true,attributeFilter:['style','class']});
  }
  function syncHeroVisual(hero){const visual=$('.cf19-hero-visual',hero);if(!visual)return;visual.style.backgroundImage=getComputedStyle(hero).backgroundImage;visual.style.backgroundPosition=getComputedStyle(hero).backgroundPosition;visual.style.backgroundSize='cover';deriveAccent(hero)}
  function cycleDot(){const dots=$$('.cf19-hero-dot');if(!dots.length)return;let i=dots.findIndex(x=>x.classList.contains('active'));dots.forEach(x=>x.classList.remove('active'));dots[(i+1)%dots.length].classList.add('active')}
  function deriveAccent(hero){
    const title=($('#banner-title')?.textContent||'').toLowerCase();let rgb='255,36,53',hex='#ff2435';
    if(/anime|dragon|ninja|hero/.test(title)){rgb='151,71,255';hex='#9747ff'}else if(/horror|night|dead|evil/.test(title)){rgb='220,24,42';hex='#dc182a'}else if(/love|heart|romance/.test(title)){rgb='255,83,146';hex='#ff5392'}else if(/space|star|future|alien/.test(title)){rgb='47,155,255';hex='#2f9bff'}else if(/family|kids|baby/.test(title)){rgb='255,176,47';hex='#ffb02f'}
    document.documentElement.style.setProperty('--cf19-accent-rgb',rgb);document.documentElement.style.setProperty('--cf19-accent',hex);document.documentElement.style.setProperty('--cf19-glow','rgba('+rgb+',.22)');
  }
  function cardActions(card){
    if(card.dataset.cf19Ready) return; card.dataset.cf19Ready='1';card.tabIndex=card.tabIndex>=0?card.tabIndex:0;
    const actions=document.createElement('div');actions.className='cf19-card-actions';
    actions.innerHTML='<button class="cf19-card-action" type="button" aria-label="Play"><i class="fa-solid fa-play"></i></button><button class="cf19-card-action" type="button" aria-label="Add to My List"><i class="fa-solid fa-plus"></i></button><button class="cf19-card-action" type="button" aria-label="More information"><i class="fa-solid fa-chevron-down"></i></button>';
    const buttons=$$('button',actions);buttons[0].addEventListener('click',e=>{e.stopPropagation();card.click()});buttons[1].addEventListener('click',e=>{e.stopPropagation();const own=card.querySelector('[data-watchlist],.my-list-btn,.add-list-btn');if(own)own.click();toast('Added to My List')});buttons[2].addEventListener('click',e=>{e.stopPropagation();card.click()});card.appendChild(actions);
    card.addEventListener('focus',()=>card.classList.add('cf19-focus'));card.addEventListener('blur',()=>card.classList.remove('cf19-focus'));
    const img=$('img',card);if(img&&!img.complete){card.classList.add('cf19-skeleton');img.addEventListener('load',()=>card.classList.remove('cf19-skeleton'),{once:true});img.addEventListener('error',()=>card.classList.remove('cf19-skeleton'),{once:true})}
  }
  function enhanceCards(){const sel='.movie-card,.card,.cf-smart-card,.cf-top10-card';$$(sel).forEach(cardActions)}
  function rowControls(){
    $$('main.content > .row,.content .row').forEach(row=>{
      if(row.dataset.cf19Controls)return;const scroller=$('.scroller,.cf-smart-scroller,.cf-top10-scroller',row);if(!scroller)return;row.dataset.cf19Controls='1';
      [['prev','fa-chevron-left',-1],['next','fa-chevron-right',1]].forEach(([name,icon,dir])=>{const b=document.createElement('button');b.type='button';b.className='cf19-row-control cf19-row-'+name;b.innerHTML='<i class="fa-solid '+icon+'"></i>';b.setAttribute('aria-label',name+' titles');b.addEventListener('click',()=>scroller.scrollBy({left:dir*Math.max(320,scroller.clientWidth*.78),behavior:'smooth'}));row.appendChild(b)})
    })
  }
  function keyboardNav(){
    let used=false;addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){used=true;document.body.classList.add('cf19-tv-mode')}if(!used)return;const active=document.activeElement;const card=active?.closest?.('.movie-card,.card,.cf-smart-card,.cf-top10-card');if(!card)return;const row=card.parentElement;const cards=$$('.movie-card,.card,.cf-smart-card,.cf-top10-card',row);let i=cards.indexOf(card);if(e.key==='ArrowRight'&&cards[i+1]){e.preventDefault();cards[i+1].focus();cards[i+1].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}if(e.key==='ArrowLeft'&&cards[i-1]){e.preventDefault();cards[i-1].focus();cards[i-1].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}if(e.key==='Enter'){e.preventDefault();card.click()}})
    addEventListener('pointerdown',()=>document.body.classList.remove('cf19-tv-mode'),{passive:true});
  }
  function observeDynamic(){let queued=false;const mo=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceCards();rowControls()})});mo.observe(document.body,{childList:true,subtree:true})}
  function init(){document.documentElement.classList.add('cf-infinity19');baseLayers();heroEnhance();enhanceCards();rowControls();keyboardNav();observeDynamic()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  addEventListener('load',()=>setTimeout(()=>{heroEnhance();enhanceCards();rowControls()},700));
})();
