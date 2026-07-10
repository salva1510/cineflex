/* CineFlex Movie Cards 2.0 — Sprint 3 */
(function(){
  'use strict';
  const items=new Map();
  const keyFor=item=>`${item.media_type || (item.first_air_date?'tv':'movie')}-${item.id}`;
  function register(item){const key=keyFor(item);items.set(key,item);return key}
  function get(key){return items.get(key)}
  function open(key){const item=get(key);if(item&&typeof window.showDetails==='function')window.showDetails(item)}
  function play(key){const item=get(key);if(!item)return;window.currentItem=item;if(typeof window.showDetails==='function')window.showDetails(item);setTimeout(()=>{if(typeof window.startPlayback==='function')window.startPlayback()},80)}
  function currentList(){try{return Array.isArray(window.watchlist)?window.watchlist:JSON.parse(localStorage.getItem('cineflex_watchlist')||'[]')}catch{return []}}
  function toggleList(key,button){const item=get(key);if(!item)return;let list=currentList();const idx=list.findIndex(x=>String(x.id)===String(item.id));if(idx>=0)list.splice(idx,1);else list.unshift(item);window.watchlist=list;localStorage.setItem('cineflex_watchlist',JSON.stringify(list));syncButtons();if(typeof window.showToast==='function')window.showToast(idx>=0?'Removed from My List':'Added to My List')}
  function syncButtons(){const list=currentList();document.querySelectorAll('[data-cf-card-key]').forEach(card=>{const item=get(card.dataset.cfCardKey);const on=item&&list.some(x=>String(x.id)===String(item.id));const btn=card.querySelector('.cf-card-actions button:nth-child(2)');if(btn){btn.classList.toggle('cf-in-list',!!on);btn.innerHTML=`<i class="fa-solid fa-${on?'check':'plus'}"></i>`}})}
  function enhance(root=document){root.querySelectorAll('.cf-media-card img').forEach(img=>{const done=()=>img.classList.add('cf-loaded');if(img.complete)done();else{img.addEventListener('load',done,{once:true});img.addEventListener('error',()=>{img.classList.add('cf-loaded');img.closest('.cf-card-media')?.classList.add('cf-image-error')},{once:true})}});syncButtons();hydrateProgress(root)}
  function hydrateProgress(root=document){let recent=[];try{recent=JSON.parse(localStorage.getItem('cineflex_recent')||'[]')}catch{}root.querySelectorAll('[data-cf-card-key]').forEach(card=>{const item=get(card.dataset.cfCardKey);const saved=item&&recent.find(x=>String(x.id)===String(item.id));const value=Math.max(0,Math.min(100,Number(saved?.progressPercent||saved?.progress||0)));const bar=card.querySelector('.cf-card-progress');if(bar&&value>1){bar.hidden=false;bar.style.setProperty('--cf-progress',`${value}%`)}})}
  let pressTimer=null;
  document.addEventListener('pointerdown',e=>{const card=e.target.closest('.cf-media-card');if(!card||e.target.closest('button'))return;pressTimer=setTimeout(()=>{document.querySelectorAll('.cf-media-card.cf-peek-open').forEach(x=>x!==card&&x.classList.remove('cf-peek-open'));card.classList.add('cf-peek-open');navigator.vibrate?.(18)},420)});
  ['pointerup','pointercancel','pointermove'].forEach(type=>document.addEventListener(type,()=>{clearTimeout(pressTimer);pressTimer=null},{passive:true}));
  document.addEventListener('click',e=>{if(!e.target.closest('.cf-media-card'))document.querySelectorAll('.cf-peek-open').forEach(x=>x.classList.remove('cf-peek-open'))});
  document.addEventListener('keydown',e=>{const card=e.target.closest?.('.cf-media-card');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(card.dataset.cfCardKey)}});
  const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)enhance(n.matches?.('.cf-media-card')?n.parentElement:n)});
  window.CFCardUI={register,open,play,toggleList,syncButtons,enhance};
  document.addEventListener('DOMContentLoaded',()=>{enhance();observer.observe(document.body,{childList:true,subtree:true})});
})();
