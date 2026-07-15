(() => {
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let membersUnsub = null;
let currentRoom = '';
let isReady = false;

function toast(text){
  if (typeof window.showToast === 'function') return window.showToast(text);
  let n = $('.cf-party-toast');
  if(!n){ n=document.createElement('div'); n.className='cf-party-toast'; document.body.appendChild(n); }
  n.textContent=text; n.classList.add('show'); clearTimeout(n._t); n._t=setTimeout(()=>n.classList.remove('show'),2200);
}
function roomCode(){
  const text = ($('#cf-party-code')?.textContent || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(text) ? text : '';
}
function user(){ return window.auth?.currentUser || null; }
function roomRef(id=roomCode()){ return id && window.db ? window.db.collection('watchPartyRooms').doc(id) : null; }
function inviteUrl(id=roomCode()){ return `${location.origin}${location.pathname}?party=${encodeURIComponent(id)}`; }

function installUI(){
  const actions=$('.cf-party-main .cf-party-actions');
  if(!actions || $('#cf-party-share-native')) return false;
  actions.insertAdjacentHTML('beforeend', `
    <button class="cf-party-btn" id="cf-party-share-native"><i class="fa-solid fa-share-nodes"></i> Share Invite</button>
    <button class="cf-party-btn ready" id="cf-party-ready"><i class="fa-solid fa-circle-check"></i> I'm Ready</button>
    <button class="cf-party-btn danger cf-host-only" id="cf-party-end-room"><i class="fa-solid fa-power-off"></i> End Room</button>
  `);
  const grid=$('.cf-party-grid');
  if(grid){
    grid.insertAdjacentHTML('beforebegin', `<section class="cf-party-pro-stats" id="cf-party-pro-stats">
      <div><i class="fa-solid fa-signal"></i><span>Room status</span><strong id="cf-party-health">Waiting</strong></div>
      <div><i class="fa-solid fa-user-check"></i><span>Ready viewers</span><strong id="cf-party-ready-count">0 / 0</strong></div>
      <div><i class="fa-solid fa-keyboard"></i><span>Shortcuts</span><strong>R ready · C copy</strong></div>
    </section>`);
  }
  $('#cf-party-share-native').onclick=shareInvite;
  $('#cf-party-ready').onclick=toggleReady;
  $('#cf-party-end-room').onclick=endRoom;
  return true;
}

async function shareInvite(){
  const id=roomCode(); if(!id) return toast('Create or join a room first.');
  const data={title:'Join my CineFlex Watch Party',text:`Join room ${id} on CineFlex.`,url:inviteUrl(id)};
  try{
    if(navigator.share){ await navigator.share(data); }
    else { await navigator.clipboard.writeText(data.url); toast('Invite link copied.'); }
  }catch(e){ if(e?.name!=='AbortError') toast('Unable to share invite right now.'); }
}
async function toggleReady(){
  const id=roomCode(), u=user(); if(!id||!u) return toast('Join the room and sign in first.');
  isReady=!isReady;
  try{
    await roomRef(id).collection('members').doc(u.uid).set({ready:isReady,lastSeen:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    renderReadyButton();
  }catch(e){ isReady=!isReady; renderReadyButton(); toast('Could not update ready status.'); }
}
function renderReadyButton(){
  const b=$('#cf-party-ready'); if(!b) return;
  b.classList.toggle('active',isReady);
  b.innerHTML=isReady?'<i class="fa-solid fa-circle-check"></i> Ready':'<i class="fa-regular fa-circle-check"></i> I\'m Ready';
}
async function endRoom(){
  const id=roomCode(), u=user(); if(!id||!u) return;
  const snap=await roomRef(id).get().catch(()=>null);
  if(!snap?.exists || snap.data().hostUid!==u.uid) return toast('Only the host can end this room.');
  if(!confirm(`End Watch Party room ${id} for everyone?`)) return;
  try{ await roomRef(id).delete(); toast('Watch Party ended.'); }
  catch(e){ toast('Unable to end the room.'); }
}
function updateHostUI(){
  const id=roomCode(), u=user(); if(!id||!u) return $('.cf-host-only')?.classList.remove('visible');
  roomRef(id).get().then(s=>{
    const host=s.exists && s.data().hostUid===u.uid;
    document.querySelectorAll('.cf-host-only').forEach(el=>el.classList.toggle('visible',host));
    const health=$('#cf-party-health'); if(health) health.textContent=s.exists?(s.data().status==='playing'?'Synchronized':'Room ready'):'Waiting';
  }).catch(()=>{});
}
function subscribeMembers(){
  const id=roomCode(), u=user();
  if(!id || !window.db || id===currentRoom) return;
  if(membersUnsub){membersUnsub(); membersUnsub=null;}
  currentRoom=id;
  membersUnsub=roomRef(id).collection('members').onSnapshot(s=>{
    const members=s.docs.map(d=>({id:d.id,...d.data()}));
    const ready=members.filter(m=>m.ready).length;
    const counter=$('#cf-party-ready-count'); if(counter) counter.textContent=`${ready} / ${members.length}`;
    const mine=members.find(m=>m.id===u?.uid); isReady=!!mine?.ready; renderReadyButton();
    const chips=$('#cf-party-members');
    if(chips) chips.querySelectorAll('.cf-party-member').forEach((chip,idx)=>{
      chip.classList.toggle('is-ready',!!members[idx]?.ready);
      if(members[idx]?.ready && !chip.querySelector('.cf-ready-mark')) chip.insertAdjacentHTML('beforeend','<i class="fa-solid fa-check cf-ready-mark" title="Ready"></i>');
    });
  },()=>{});
}
function refresh(){
  installUI();
  const id=roomCode();
  if(id){ updateHostUI(); subscribeMembers(); }
  else {
    currentRoom=''; isReady=false; renderReadyButton();
    const c=$('#cf-party-ready-count'); if(c)c.textContent='0 / 0';
    const h=$('#cf-party-health'); if(h)h.textContent='Waiting';
    document.querySelectorAll('.cf-host-only').forEach(el=>el.classList.remove('visible'));
  }
}
function keyboard(e){
  if(!$('#cf-party-shell')?.classList.contains('open')) return;
  const tag=e.target?.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
  if(e.key.toLowerCase()==='r'){ e.preventDefault(); toggleReady(); }
  if(e.key.toLowerCase()==='c'){ e.preventDefault(); const id=roomCode(); if(id) navigator.clipboard?.writeText(inviteUrl(id)).then(()=>toast('Invite copied.')); }
}
function enhanceDrawer(){
  document.querySelectorAll('.drawer-item').forEach(el=>{
    if(/Watch Party/i.test(el.textContent) && !el.querySelector('.cf-party-new-badge')){
      el.insertAdjacentHTML('beforeend','<span class="cf-party-new-badge">PRO</span>');
    }
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  enhanceDrawer();
  const observer=new MutationObserver(refresh);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  setInterval(refresh,1400);
  document.addEventListener('keydown',keyboard);
});
window.addEventListener('beforeunload',()=>{ if(membersUnsub) membersUnsub(); });
})();
