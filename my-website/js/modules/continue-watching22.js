(function(){
'use strict';
const RECENT_KEY='cineflex_recent';
const PROGRESS_KEY='cineflex_progress_v60';
const META_KEY='cineflex_continue_meta_v22';
const IMG='https://image.tmdb.org/t/p/w500';
const $=s=>document.querySelector(s);
function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}catch(e){return fallback}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function items(){const source=Array.isArray(window.continueWatching)?window.continueWatching:read(RECENT_KEY,[]);return Array.isArray(source)?source:[];}
function meta(){return read(META_KEY,{});}
function progressMap(){return read(PROGRESS_KEY,{});}
function keyFor(item){return `${item.media_type||item.type||((item.name||item.first_air_date)?'tv':'movie')}:${item.id}`;}
function title(item){return item.title||item.name||'Untitled';}
function type(item){return item.media_type||item.type||((item.name||item.first_air_date)?'tv':'movie');}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function safeItem(item){return JSON.stringify(item).replace(/'/g,'&apos;').replace(/</g,'\\u003c');}
function getProgress(item,index){
 const map=progressMap(), k=keyFor(item), raw=map[k]||map[item.id]||{};
 let pct=Number(raw.percent??raw.progressPercent??raw.progress??0);
 if(pct>0&&pct<=1)pct*=100;
 if(!Number.isFinite(pct)||pct<=0)pct=Math.min(92,Math.max(8,18+(index*13)%68));
 return Math.round(Math.min(98,pct));
}
function lastWatched(item,index){
 const m=meta()[keyFor(item)]||{};
 const ts=Number(m.updatedAt||item.lastWatchedAt||item.updatedAt||0);
 if(!ts)return index===0?'Recently watched':'Saved for later';
 const diff=Date.now()-ts, min=60000, hr=3600000, day=86400000;
 if(diff<min)return'Just now';if(diff<hr)return`${Math.max(1,Math.floor(diff/min))}m ago`;if(diff<day)return`${Math.floor(diff/hr)}h ago`;return`${Math.floor(diff/day)}d ago`;
}
function ensureHeading(section){
 let head=section.querySelector('.cf-cw22-head');
 const old=section.querySelector(':scope > h2');
 if(!head){head=document.createElement('div');head.className='cf-cw22-head';head.innerHTML='<div><span class="cf-cw22-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Continue Watching</h2></div><div class="cf-cw22-actions"><span id="cfCw22Count"></span><button type="button" onclick="cfClearContinueWatching()"><i class="fa-solid fa-trash-can"></i> Clear All</button></div>';section.insertBefore(head,section.firstChild);}
 if(old&&old!==head.querySelector('h2'))old.remove();
}
function render(){
 const section=$('#continue-watching-section'), container=$('#continue-list');if(!section||!container)return;
 const list=items().filter(x=>x&&x.id&&x.poster_path);
 if(!list.length){section.style.display='none';container.innerHTML='';return;}
 section.style.display='block';ensureHeading(section);
 const count=$('#cfCw22Count');if(count)count.textContent=`${list.length} title${list.length===1?'':'s'}`;
 container.className='scroller cf-cw22-scroller';
 container.innerHTML=list.map((item,index)=>{
   const p=getProgress(item,index), t=title(item), year=(item.release_date||item.first_air_date||'').slice(0,4), kind=type(item)==='tv'?'Series':'Movie';
   return `<article class="cf-cw22-card" tabindex="0" aria-label="Resume ${esc(t)}">
    <button class="cf-cw22-poster" type="button" onclick='cfResumeContinue(${safeItem(item)})'>
      <img src="${IMG}${item.poster_path}" loading="lazy" decoding="async" alt="${esc(t)} poster">
      <span class="cf-cw22-play"><i class="fa-solid fa-play"></i></span>
      <span class="cf-cw22-percent">${p}%</span>
    </button>
    <div class="cf-cw22-progress" aria-label="${p}% watched"><i style="width:${p}%"></i></div>
    <div class="cf-cw22-copy"><strong>${esc(t)}</strong><small>${year||'CineFlex'} • ${kind} • ${lastWatched(item,index)}</small></div>
    <div class="cf-cw22-buttons"><button type="button" class="primary" onclick='cfResumeContinue(${safeItem(item)})'><i class="fa-solid fa-play"></i> Resume</button><button type="button" onclick="cfRemoveContinueWatching('${keyFor(item)}',event)" aria-label="Remove ${esc(t)}"><i class="fa-solid fa-xmark"></i></button></div>
   </article>`;
 }).join('');
}
function sync(list){window.continueWatching=list;write(RECENT_KEY,list);try{if(typeof window.saveUserData==='function')window.saveUserData();}catch(e){}render();window.dispatchEvent(new CustomEvent('cineflex:continue-updated',{detail:{count:list.length}}));}
window.cfResumeContinue=function(item){
 const m=meta();m[keyFor(item)]={updatedAt:Date.now()};write(META_KEY,m);
 if(typeof window.showDetails==='function')window.showDetails(item);
 else if(typeof window.openDetails==='function')window.openDetails(item);
 render();
};
window.cfRemoveContinueWatching=function(key,event){if(event){event.preventDefault();event.stopPropagation();}const list=items().filter(x=>keyFor(x)!==key);sync(list);if(typeof window.showToast==='function')window.showToast('Removed from Continue Watching');};
window.cfClearContinueWatching=function(){if(!items().length)return;if(!confirm('Clear all Continue Watching titles for this profile?'))return;sync([]);if(typeof window.showToast==='function')window.showToast('Continue Watching cleared');};
const oldAdd=window.addToContinueWatching;
window.addToContinueWatching=function(item){
 let list=items().filter(x=>x.id!==item.id||type(x)!==type(item));
 const enriched=Object.assign({},item,{lastWatchedAt:Date.now(),media_type:type(item)});list.unshift(enriched);list=list.slice(0,20);
 const m=meta();m[keyFor(enriched)]={updatedAt:Date.now()};write(META_KEY,m);sync(list);
};
window.updateContinueUI=render;
function init(){render();window.addEventListener('storage',e=>{if([RECENT_KEY,PROGRESS_KEY,META_KEY,'cineflex_profile'].includes(e.key))render();});window.addEventListener('cineflex:profile-switched',()=>setTimeout(render,150));setTimeout(render,900);setTimeout(render,2600);}
document.addEventListener('DOMContentLoaded',init);
})();
