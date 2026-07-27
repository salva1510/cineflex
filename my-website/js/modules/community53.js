// CineFlex Build 5.3 Community — expressive reactions, achievements and live activity
(function(){
  'use strict';
  const TYPES={heart:{emoji:'❤️',label:'Love'},haha:{emoji:'😂',label:'Haha'},wow:{emoji:'😮',label:'Wow'},sad:{emoji:'😢',label:'Sad'},fire:{emoji:'🔥',label:'Fire'}};
  let activeKey=null, reactionUnsub=null, activityUnsub=null, myReaction=null;
  const hasDb=()=>typeof db!=='undefined'&&db&&typeof db.collection==='function';
  const user=()=>{try{return typeof auth!=='undefined'&&auth?auth.currentUser:null}catch(_){return null}};
  const keyFor=item=>{if(!item)return null;const tv=item.media_type==='tv'||item.first_air_date||item.name;return `${tv?'tv':'movie'}_${item.id}`};
  const titleFor=item=>(item&&(item.title||item.name))||'Untitled';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const relative=ms=>{const d=Math.max(1,Math.floor((Date.now()-Number(ms||Date.now()))/1000));if(d<60)return 'just now';if(d<3600)return `${Math.floor(d/60)}m ago`;if(d<86400)return `${Math.floor(d/3600)}h ago`;return `${Math.floor(d/86400)}d ago`};

  function renderStats(data={}){
    Object.keys(TYPES).forEach(type=>{const el=document.querySelector(`[data-cf-reaction="${type}"]`);if(!el)return;el.classList.toggle('active',myReaction===type);const count=el.querySelector('em');if(count)count.textContent=Number(data[type]||0).toLocaleString()});
    const note=document.getElementById('cf-community-login-note');if(note)note.style.display=user()?'none':'block';
  }
  async function loadMyReaction(key){myReaction=null;if(!user()||!hasDb())return;try{const s=await db.collection('cineflex_reactions').doc(key).collection('users').doc(user().uid).get();if(s.exists)myReaction=s.data().type||null}catch(e){console.warn('Community reaction user read:',e.message||e)}}
  async function loadReactions(){
    if(!window.currentItem)return;activeKey=keyFor(window.currentItem);if(reactionUnsub)reactionUnsub();await loadMyReaction(activeKey);renderStats({});
    if(!hasDb())return;
    reactionUnsub=db.collection('cineflex_reactions').doc(activeKey).onSnapshot(s=>{if(activeKey)renderStats(s.exists?s.data():{})},e=>console.warn('Community reactions:',e.message||e));
  }
  async function addActivity(action,detail){
    if(!hasDb()||!user())return;try{await db.collection('cineflex_activity').add({uid:user().uid,displayName:user().displayName||'CineFlex User',photoURL:user().photoURL||'',action,detail,title:titleFor(window.currentItem),titleKey:activeKey,createdAtMs:Date.now(),createdAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(e){console.warn('Community activity write:',e.message||e)}
  }
  window.cfCommunityReact=async function(type){
    if(!TYPES[type]||!window.currentItem)return;if(!user()){if(typeof openLoginModal==='function')openLoginModal();return}if(!hasDb()){alert('Firebase Firestore is not ready.');return}
    const key=keyFor(window.currentItem),prev=myReaction,next=prev===type?null:type;myReaction=next;renderStats({});
    try{const batch=db.batch(),ref=db.collection('cineflex_reactions').doc(key),uRef=ref.collection('users').doc(user().uid),delta={titleKey:key,tmdbId:window.currentItem.id,title:titleFor(window.currentItem),updatedAtMs:Date.now()};if(prev)delta[prev]=firebase.firestore.FieldValue.increment(-1);if(next)delta[next]=firebase.firestore.FieldValue.increment(1);batch.set(ref,delta,{merge:true});batch.set(uRef,{uid:user().uid,type:next,displayName:user().displayName||'',photoURL:user().photoURL||'',updatedAtMs:Date.now()},{merge:true});await batch.commit();if(next)addActivity('reacted',`${TYPES[next].emoji} ${TYPES[next].label}`);awardLocal('reactionCount',1)}catch(e){myReaction=prev;renderStats({});console.warn('Community reaction save:',e.message||e);alert('Hindi na-save ang reaction. I-check ang Firestore rules.')}
  };

  function progress(){try{return JSON.parse(localStorage.getItem('cineflex_community_progress')||'{}')}catch(_){return {}}}
  function awardLocal(k,n){const p=progress();p[k]=Number(p[k]||0)+n;localStorage.setItem('cineflex_community_progress',JSON.stringify(p));renderAchievements()}
  function renderAchievements(){
    const row=document.getElementById('cf-achievement-row');if(!row)return;const p=progress();let recent=0,list=0;try{recent=JSON.parse(localStorage.getItem('cineflex_recent')||'[]').length}catch(_){}try{list=JSON.parse(localStorage.getItem('cineflex_watchlist')||'[]').length}catch(_){}
    const badges=[['🎬','Movie Explorer','Open 5 titles',recent>=5],['🍿','Watchlist Builder','Save 5 favorites',list>=5],['❤️','Community Fan','Send 3 reactions',Number(p.reactionCount||0)>=3],['💬','Conversation Starter','Post a comment',Number(p.commentCount||0)>=1],['🔥','CineFlex Regular','Open 15 titles',recent>=15]];
    row.innerHTML=badges.map(b=>`<div class="cf-achievement ${b[3]?'':'locked'}"><span class="cf-achievement-icon">${b[0]}</span><strong>${esc(b[1])}</strong><small>${b[3]?'Unlocked':esc(b[2])}</small></div>`).join('');
  }
  function renderActivity(docs){const list=document.getElementById('cf-activity-list');if(!list)return;if(!docs.length){list.innerHTML='<div class="cf-community-empty">Wala pang recent community activity.</div>';return}list.innerHTML=docs.map(d=>{const x=d.data();return `<div class="cf-activity-item"><img class="cf-activity-avatar" src="${esc(x.photoURL||'icon-192.png')}" alt=""><div class="cf-activity-copy"><p><strong>${esc(x.displayName||'CineFlex User')}</strong> ${esc(x.action||'interacted')} with <strong>${esc(x.title||'a title')}</strong> ${esc(x.detail||'')}</p><small>${relative(x.createdAtMs)}</small></div></div>`}).join('')}
  function loadActivity(){if(activityUnsub)activityUnsub();if(!hasDb()){renderActivity([]);return}try{activityUnsub=db.collection('cineflex_activity').orderBy('createdAtMs','desc').limit(8).onSnapshot(s=>renderActivity(s.docs),e=>{console.warn('Community activity:',e.message||e);renderActivity([])})}catch(_){renderActivity([])}}
  function patch(){if(typeof window.showDetails==='function'&&!window.showDetails.__cfCommunity53){const old=window.showDetails;const fn=async function(){const r=await old.apply(this,arguments);setTimeout(()=>{loadReactions();renderAchievements()},350);return r};fn.__cfCommunity53=true;window.showDetails=fn}if(typeof window.closeModal==='function'&&!window.closeModal.__cfCommunity53){const old=window.closeModal;const fn=function(){if(reactionUnsub)reactionUnsub();reactionUnsub=null;activeKey=null;return old.apply(this,arguments)};fn.__cfCommunity53=true;window.closeModal=fn}}
  window.addEventListener('cineflex-login',()=>setTimeout(()=>{loadReactions();loadActivity()},350));window.addEventListener('load',()=>{patch();renderAchievements();loadActivity();setTimeout(patch,1400)});if(document.readyState!=='loading'){patch();renderAchievements();loadActivity()}
  document.addEventListener('click',e=>{if(e.target.closest('#cf-comment-send'))awardLocal('commentCount',1)});
})();
