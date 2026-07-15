(() => {
  'use strict';
  const PROGRESS_KEY='cineflex_progress_v2';
  const SIGNAL_KEY='cineflex_taste_signals_v2';
  let activeSession=null, tick=null;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const mediaType=i=>i?.media_type||(i?.first_air_date||i?.name?'tv':'movie');
  const title=i=>i?.title||i?.name||'Untitled';
  const backdrop=i=>i?.backdrop_path||i?.poster_path;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const progressMap=()=>read(PROGRESS_KEY,{});
  const itemKey=i=>`${mediaType(i)}_${i.id}`;
  function toast(msg){let e=document.querySelector('.cf-personal-toast');if(!e){e=document.createElement('div');e.className='cf-personal-toast';document.body.appendChild(e)}e.textContent=msg;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)}
  function saveSignal(item,kind='view'){
    if(!item?.id)return; const data=read(SIGNAL_KEY,{items:[],genres:{}});
    data.items=data.items.filter(x=>!(x.id===item.id&&mediaType(x)===mediaType(item)));
    data.items.unshift({...item,media_type:mediaType(item),_signal:kind,_seenAt:Date.now()});data.items=data.items.slice(0,30);
    (item.genre_ids||item.genres?.map(g=>g.id)||[]).forEach(g=>data.genres[g]=(data.genres[g]||0)+(kind==='play'?3:1));write(SIGNAL_KEY,data);
  }
  function calcProgress(item){const p=progressMap()[itemKey(item)]||{};return Math.max(0,Math.min(96,Number(p.percent)||0))}
  function saveProgress(item,extraSeconds=0){if(!item?.id)return;const map=progressMap(),k=itemKey(item),old=map[k]||{};const runtimeSec=Math.max(1200,Number(item.runtime||item.episode_run_time?.[0]||old.runtimeMinutes||100)*60);const elapsed=Math.max(Number(old.elapsed)||0,Number(old.elapsed||0)+extraSeconds);map[k]={elapsed,runtimeMinutes:Math.round(runtimeSec/60),percent:Math.min(96,Math.round(elapsed/runtimeSec*100)),updatedAt:Date.now(),item:{...item,media_type:mediaType(item)}};write(PROGRESS_KEY,map)}
  function startSession(item){stopSession();activeSession=item;saveSignal(item,'play');saveProgress(item,12);tick=setInterval(()=>{if(activeSession&&document.getElementById('details-modal')?.style.display!=='none')saveProgress(activeSession,15)},15000)}
  function stopSession(){if(tick)clearInterval(tick);tick=null;activeSession=null;renderContinue()}
  function smartCard(item,reason,withProgress=false){const pct=calcProgress(item),match=Math.min(99,Math.max(72,Math.round((item.vote_average||7)*9+Math.random()*8)));const data=encodeURIComponent(JSON.stringify(item));return `<article class="cf-smart-card" data-item="${data}" tabindex="0"><img loading="lazy" src="${IMG_URL}${backdrop(item)}" alt="${esc(title(item))}"><span class="cf-reason">${esc(reason)}</span><button class="cf-smart-play" type="button" aria-label="Play ${esc(title(item))}"><i class="fa-solid fa-play"></i></button><div class="cf-smart-info"><strong>${esc(title(item))}</strong><div class="cf-smart-meta"><span class="cf-match">${match}% Match</span><span>★ ${Number(item.vote_average||0).toFixed(1)}</span></div>${withProgress?`<div class="cf-progress-track"><div class="cf-progress-fill" style="width:${Math.max(5,pct)}%"></div></div><div class="cf-resume-row"><span>${pct}% watched</span><span>Resume</span></div>`:''}</div></article>`}
  function bindCards(root){root?.querySelectorAll('.cf-smart-card').forEach(card=>{const open=()=>{try{const i=JSON.parse(decodeURIComponent(card.dataset.item));saveSignal(i,'open');showDetails(i)}catch(e){console.error(e)}};card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter')open()})})}
  function renderContinue(){const sec=document.getElementById('continue-watching-section'),row=document.getElementById('continue-list');if(!sec||!row)return;const stored=Object.values(progressMap()).sort((a,b)=>b.updatedAt-a.updatedAt).map(x=>x.item).filter(Boolean);const merged=[...stored,...(window.continueWatching||[])].filter((v,i,a)=>v?.id&&backdrop(v)&&a.findIndex(x=>x.id===v.id&&mediaType(x)===mediaType(v))===i).slice(0,12);if(!merged.length){sec.style.display='none';return}sec.style.display='block';sec.classList.add('cf-personal-row');sec.querySelector('h2').innerHTML='<span class="cf-personal-kicker">Jump Back In</span>Continue Watching 2.0';row.className='cf-smart-scroller';row.innerHTML=merged.map(i=>smartCard(i,'Continue',true)).join('');bindCards(row)}
  async function recommendations(){const row=document.getElementById('for-you-list');if(!row)return;const signals=read(SIGNAL_KEY,{items:[],genres:{}});const history=[...(window.continueWatching||[]),...(window.watchlist||[]),...signals.items];const seed=history.find(i=>i?.id);if(!seed){row.innerHTML='<div class="cf-empty-personal">Manood o mag-add sa My List para matutunan ng CineFlex ang taste mo. Habang ginagamit mo ang site, mas magiging personal ang row na ito.</div>';return}try{const type=mediaType(seed);const r=await fetch(`${BASE_URL}/${type}/${seed.id}/recommendations?api_key=${API_KEY}&language=en-US&page=1`).then(x=>x.json());const items=(r.results||[]).filter(i=>backdrop(i)).slice(0,14);row.innerHTML=items.map(i=>smartCard(i,`Because of ${title(seed).slice(0,22)}`)).join('');bindCards(row);renderDaily(items[0]||seed)}catch(e){console.warn('Personalized recommendations unavailable',e);row.innerHTML='<div class="cf-empty-personal">Hindi ma-load ang recommendations ngayon. Naka-save pa rin ang viewing taste mo sa device.</div>'}}
  function renderDaily(){ /* Build 10: Daily Pick block removed for a cleaner hero area. */ }
  function installHooks(){
    const oldAdd=window.addToContinueWatching;if(typeof oldAdd==='function')window.addToContinueWatching=function(item){const out=oldAdd.apply(this,arguments);saveSignal(item,'play');saveProgress(item,15);setTimeout(renderContinue,80);return out};
    const oldShow=window.showDetails;if(typeof oldShow==='function')window.showDetails=async function(item){saveSignal(item,'open');const out=await oldShow.apply(this,arguments);return out};
    document.addEventListener('click',e=>{const b=e.target.closest('[onclick*="playMovie"],[onclick*="playEpisode"],.play-btn');if(b&&window.currentItem)setTimeout(()=>startSession(window.currentItem),250)});
    const oldClose=window.closeModal;if(typeof oldClose==='function')window.closeModal=function(){stopSession();return oldClose.apply(this,arguments)};
    window.addEventListener('beforeunload',()=>{if(activeSession)saveProgress(activeSession,5)});
  }
  document.addEventListener('DOMContentLoaded',()=>{installHooks();setTimeout(()=>{renderContinue();recommendations()},1400)});
  window.cfRefreshPersonalized=()=>{renderContinue();recommendations();toast('Personalized home refreshed')};
})();
