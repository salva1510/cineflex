/* CINEFLEX MEMBERSHIP FOUNDATION v8.0.5 */
(function(){
  'use strict';
  const PRICE=10, GCASH='09557243662';
  const state={loaded:false,plan:'free',vipExpiryMs:0};
  let unsubscribe=null, expiryTimer=null;
  const $=id=>document.getElementById(id);
  const user=()=>window.auth?.currentUser||window.currentUser||null;
  const toMs=v=>!v?0:(typeof v.toMillis==='function'?v.toMillis():(typeof v.seconds==='number'?v.seconds*1000:(new Date(v).getTime()||0)));
  const isVip=()=>state.plan==='vip'&&state.vipExpiryMs>Date.now();
  const expiryLabel=()=>isVip()?new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'short',day:'numeric'}).format(new Date(state.vipExpiryMs)):'Free plan';

  function ensureModal(){
    if($('cfVipModal')) return;
    document.body.insertAdjacentHTML('beforeend',`<div id="cfVipModal" class="cf-vip-modal" aria-hidden="true">
      <div class="cf-vip-dialog">
        <button class="cf-vip-close" type="button" data-vip-close>×</button>
        <div class="cf-vip-crown">👑</div><p class="cf-vip-kicker">CINEFLEX MEMBERSHIP</p>
        <h2>Upgrade to VIP</h2><div class="cf-vip-price">₱${PRICE}<small>/month</small></div>
        <ul><li>Watch without time limits</li><li>100% ad-free playback</li><li>VIP badge</li><li>Priority membership support</li></ul>
        <div class="cf-gcash-box"><span>Pay via GCash</span><strong>${GCASH}</strong><button id="cfCopyGcash" type="button">Copy number</button></div>
        <label class="cf-vip-label">GCash reference number<input id="cfVipReference" inputmode="numeric" maxlength="20" placeholder="Enter reference number"></label>
        <button id="cfSubmitVip" class="cf-vip-submit" type="button">Submit VIP Request</button>
        <p class="cf-vip-note">After payment, submit your reference number. The admin will verify and activate VIP for 30 days.</p>
      </div></div>`);
    $('cfVipModal').addEventListener('click',e=>{if(e.target.id==='cfVipModal'||e.target.closest('[data-vip-close]')) closeModal();});
    $('cfCopyGcash').onclick=async()=>{try{await navigator.clipboard.writeText(GCASH);window.showToast?.('GCash number copied.');}catch(e){window.showToast?.(GCASH);}};
    $('cfSubmitVip').onclick=submitRequest;
  }
  function openModal(){
    ensureModal();
    if(isVip()){window.showToast?.(`VIP active until ${expiryLabel()}`);return;}
    $('cfVipModal').classList.add('open'); $('cfVipModal').setAttribute('aria-hidden','false');
    setTimeout(()=>$('cfVipReference')?.focus(),80);
  }
  function closeModal(){ $('cfVipModal')?.classList.remove('open'); $('cfVipModal')?.setAttribute('aria-hidden','true'); }
  async function submitRequest(){
    const u=user(); if(!u){ closeModal(); window.requireLogin?.(()=>setTimeout(openModal,250)); if(!window.requireLogin) window.openLoginModal?.(); return; }
    const ref=($('cfVipReference')?.value||'').trim();
    if(ref.length<6){window.showToast?.('Enter a valid GCash reference number.');return;}
    const btn=$('cfSubmitVip'); btn.disabled=true; btn.textContent='Submitting...';
    try{
      await window.db.collection('vipRequests').add({uid:u.uid,email:u.email||'',name:u.displayName||'',gcashReference:ref,amount:PRICE,status:'pending',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      closeModal(); window.showToast?.('VIP request submitted for admin approval.');
    }catch(e){console.error(e);window.showToast?.('Could not submit. Check Firestore rules.');}
    finally{btn.disabled=false;btn.textContent='Submit VIP Request';}
  }
  function render(){
    const vip=isVip(), badge=$('userBadge'), pb=$('cfPremiumBadge');
    if(badge){badge.textContent=vip?'👑 PREMIUM MEMBER':'FREE MEMBER';badge.classList.toggle('cf-vip-badge',vip);}
    if(pb){pb.textContent=vip?'👑 PREMIUM VIP':'UPGRADE TO VIP';pb.classList.toggle('active',vip);}
    if($('cfMembershipPlan')) $('cfMembershipPlan').textContent=vip?'VIP Member':'Free Member';
    if($('cfMembershipDetail')) $('cfMembershipDetail').textContent=vip?`VIP • ad-free • valid until ${expiryLabel()}`:`Optional VIP • ₱${PRICE}/month • ad-free`;
    if($('cfMembershipIcon')) $('cfMembershipIcon').className=vip?'fa-solid fa-crown':'fa-solid fa-gem';
    $('cfMembershipCard')?.classList.toggle('vip',vip);
    document.documentElement.classList.toggle('cf-user-vip',vip);
  }
  function publish(){render();window.dispatchEvent(new CustomEvent('cineflex-membership-change',{detail:{vip:isVip(),plan:isVip()?'vip':'free',vipExpiryMs:state.vipExpiryMs}}));}
  function load(){
    if(typeof unsubscribe==='function')unsubscribe(); unsubscribe=null;
    const u=user(); if(!u||!window.db){state.plan='free';state.vipExpiryMs=0;publish();return;}
    unsubscribe=window.db.collection('users').doc(u.uid).collection('membership').doc('status').onSnapshot(s=>{const d=s.exists?s.data():{};state.plan=String(d.plan||(d.vip?'vip':'free')).toLowerCase()==='vip'?'vip':'free';state.vipExpiryMs=toMs(d.vipExpiry||d.expiresAt||d.vipUntil);if(state.vipExpiryMs<=Date.now())state.plan='free';state.loaded=true;publish();},e=>{console.warn(e);publish();});
  }
  window.CineFlexMembership={isVip,getState:()=>({...state,vip:isVip(),expiryLabel:expiryLabel()}),reload:load,openInfo:openModal};
  window.cfOpenMembershipInfo=openModal;
  window.addEventListener('cineflex-login',()=>setTimeout(load,150)); window.addEventListener('cineflex-logout',load);
  document.addEventListener('DOMContentLoaded',()=>{ensureModal();render();load();expiryTimer=setInterval(render,60000);});
})();
