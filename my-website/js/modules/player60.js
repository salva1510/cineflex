// CineFlex Build 6.0 — Player, Presence & Cross-device Progress
(() => {
  'use strict';
  const state = { startedAt: 0, timer: null, heartbeat: null, unsubscribe: null, key: '', savedSeconds: 0 };
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const typeOf = () => (window.currentTVState?.type === 'tv' ? 'tv' : 'movie');
  const mediaKey = () => {
    if (!window.currentItem?.id) return '';
    const tv = typeOf() === 'tv';
    return tv ? `tv_${window.currentItem.id}_s${window.currentTVState?.season || 1}_e${window.currentTVState?.currentEpNum || 1}` : `movie_${window.currentItem.id}`;
  };
  const title = () => window.currentItem?.title || window.currentItem?.name || 'Now Playing';
  const uid = () => window.auth?.currentUser?.uid || '';
  const elapsed = () => state.savedSeconds + (state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0);
  function deviceLabel(){ const ua=navigator.userAgent; if(/Android/i.test(ua))return'Android'; if(/iPhone|iPad/i.test(ua))return'iOS'; if(/Windows/i.test(ua))return'Windows'; if(/Mac/i.test(ua))return'Mac'; return'Mobile/Web'; }
  function setStatus(text){ const el=$('cf60-player-status'); if(el) el.textContent=text; }
  function renderClock(){ const el=$('cf60-watch-clock'); if(!el)return; const s=elapsed(), m=Math.floor(s/60), sec=s%60; el.textContent=`${m}:${String(sec).padStart(2,'0')} watched`; }
  function localProgress(){ try{return JSON.parse(localStorage.getItem('cineflex_progress_v60')||'{}')}catch{return{}} }
  function saveLocal(payload){ const all=localProgress(); all[payload.key]=payload; localStorage.setItem('cineflex_progress_v60',JSON.stringify(all)); }
  function payload(){ return { key:state.key, mediaId:window.currentItem?.id, mediaType:typeOf(), title:title(), poster_path:window.currentItem?.poster_path||'', backdrop_path:window.currentItem?.backdrop_path||'', season:window.currentTVState?.season||null, episode:window.currentTVState?.currentEpNum||null, watchedSeconds:elapsed(), device:deviceLabel(), updatedAtMs:Date.now() }; }
  async function saveProgress(){ if(!state.key)return; const data=payload(); saveLocal(data); try{ if(uid()&&window.db){ await window.db.collection('users').doc(uid()).collection('watchProgress').doc(state.key).set({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }}catch(e){console.warn('Progress sync:',e.message);} updateResumeNote(data); }
  function updateResumeNote(data){ const el=$('cf60-resume-note'); if(!el)return; const mins=Math.floor((data?.watchedSeconds||0)/60); el.innerHTML=mins>0?`<i class="fa-solid fa-clock-rotate-left"></i> Watched about <b>${mins} min</b> on ${esc(data.device||'this device')}.`:'Progress will sync while you watch.'; }
  async function loadProgress(){ state.key=mediaKey(); state.savedSeconds=localProgress()[state.key]?.watchedSeconds||0; let best=localProgress()[state.key]||null; try{ if(uid()&&window.db){ const doc=await window.db.collection('users').doc(uid()).collection('watchProgress').doc(state.key).get(); if(doc.exists && (!best || (doc.data().updatedAtMs||0)>(best.updatedAtMs||0))) best=doc.data(); }}catch(e){} state.savedSeconds=best?.watchedSeconds||0; updateResumeNote(best); renderClock(); }
  async function heartbeat(){ if(!state.key||!window.db)return; const session=uid()||sessionStorage.getItem('cf60_guest')||crypto.randomUUID(); sessionStorage.setItem('cf60_guest',session); try{ await window.db.collection('livePresence').doc(session).set({uid:uid()||null,mediaKey:state.key,mediaId:window.currentItem?.id,title:title(),season:window.currentTVState?.season||null,episode:window.currentTVState?.currentEpNum||null,lastSeen:firebase.firestore.FieldValue.serverTimestamp(),lastSeenMs:Date.now()},{merge:true}); }catch(e){} }
  function watchPresence(){ if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null;} const el=$('cf60-live-count'); if(!el||!window.db||!state.key)return; const cutoff=Date.now()-90000; state.unsubscribe=window.db.collection('livePresence').where('mediaKey','==',state.key).onSnapshot(s=>{let n=0;s.forEach(d=>{if((d.data().lastSeenMs||0)>=cutoff)n++;});el.textContent=`${Math.max(n,1)} watching now`;},()=>{el.textContent='Live viewers';}); }
  async function startSession(){ stopSession(false); state.startedAt=Date.now(); await loadProgress(); setStatus('Playing'); renderClock(); state.timer=setInterval(()=>{renderClock(); if(elapsed()%30===0)saveProgress();},1000); await heartbeat(); state.heartbeat=setInterval(heartbeat,30000); watchPresence(); document.body.classList.add('cf60-playing'); }
  function stopSession(save=true){ if(save)saveProgress(); clearInterval(state.timer);clearInterval(state.heartbeat);state.timer=null;state.heartbeat=null;state.savedSeconds=elapsed();state.startedAt=0;if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null;} document.body.classList.remove('cf60-playing'); }
  function nextEpisode(){ if(typeOf()!=='tv')return; const next=(window.currentTVState?.currentEpNum||1)+1; if(typeof window.playSpecificEpisode==='function') window.playSpecificEpisode(next,null); }
  function fullscreen(){ const box=$('modal-player-container'); if(!box)return; if(document.fullscreenElement)document.exitFullscreen?.();else box.requestFullscreen?.(); }
  function inject(){ const box=$('modal-player-container'); if(!box||$('cf60-player-shell'))return; const shell=document.createElement('div');shell.id='cf60-player-shell';shell.className='cf60-player-shell';shell.innerHTML=`<div class="cf60-topbar"><span class="cf60-live"><i class="fa-solid fa-circle"></i> <b id="cf60-live-count">Live viewers</b></span><span id="cf60-player-status">Ready</span></div><div class="cf60-bottombar"><span id="cf60-watch-clock">0:00 watched</span><div><button type="button" onclick="cf60NextEpisode()"><i class="fa-solid fa-forward-step"></i><span>Next Episode</span></button><button type="button" onclick="cf60Fullscreen()"><i class="fa-solid fa-expand"></i><span>Fullscreen</span></button><button type="button" onclick="closeModal()"><i class="fa-solid fa-xmark"></i><span>Close</span></button></div></div>`;box.appendChild(shell);
    const note=document.createElement('div');note.id='cf60-resume-note';note.className='cf60-resume-note';box.insertAdjacentElement('afterend',note);
  }
  function hook(){ inject(); const frame=$('modal-video-iframe'); frame?.addEventListener('load',()=>{ if(frame.src&&frame.src!=='about:blank')startSession(); }); const originalClose=window.closeModal; if(typeof originalClose==='function')window.closeModal=function(...a){stopSession(true);return originalClose.apply(this,a)}; const originalUpdate=window.updateVideoSource;if(typeof originalUpdate==='function')window.updateVideoSource=function(...a){stopSession(true);const r=originalUpdate.apply(this,a);setStatus('Loading stream…');return r}; document.addEventListener('visibilitychange',()=>{if(document.hidden)saveProgress();}); window.addEventListener('beforeunload',()=>saveProgress()); }
  window.cf60NextEpisode=nextEpisode;window.cf60Fullscreen=fullscreen;window.cf60SaveProgress=saveProgress;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();
