/* CINEFLEX 30-DAY LOGIN REWARD v310.0 */
(() => {
  'use strict';
  const DAYS = 30;
  const DAY_MS = 86400000;
  const $ = id => document.getElementById(id);
  let stop = null;
  let current = null;
  let busy = false;

  function user(){ return window.auth?.currentUser || window.currentUser || null; }
  function toast(message){ window.showToast?.(message); }
  function dateLabel(value){
    const ms = value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : 0);
    return ms ? new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric'}).format(new Date(ms)) : '';
  }

  function insert(){
    if ($('cf-login-reward')) return;
    const host = $('cf-comeback-hub');
    if (!host) return;
    host.querySelector('.cf-comeback-top')?.insertAdjacentHTML('afterend', `
      <section class="cf-login-reward" id="cf-login-reward" aria-live="polite">
        <div class="cf-login-reward-icon"><i class="fa-solid fa-crown"></i></div>
        <div class="cf-login-reward-copy">
          <span>30-DAY LOGIN CHALLENGE</span>
          <strong id="cf-login-reward-title">Sign in daily. Unlock 1 month VIP free.</strong>
          <p id="cf-login-reward-text">Your streak is saved securely to your CineFlex account.</p>
          <div class="cf-login-reward-track"><i id="cf-login-reward-fill"></i></div>
          <small id="cf-login-reward-meta">0 of 30 days completed</small>
        </div>
        <button id="cf-login-reward-action" type="button">Sign in</button>
      </section>`);
    $('cf-login-reward-action').onclick = action;
  }

  function render(data){
    insert();
    current = data || null;
    const u = user();
    const streak = Math.max(0, Math.min(DAYS, Number(data?.streak || 0)));
    const claimed = data?.membershipApplied === true;
    const title = $('cf-login-reward-title');
    const text = $('cf-login-reward-text');
    const meta = $('cf-login-reward-meta');
    const fill = $('cf-login-reward-fill');
    const actionBtn = $('cf-login-reward-action');
    if (!title || !actionBtn) return;
    fill.style.width = `${(streak / DAYS) * 100}%`;
    meta.textContent = `${streak} of ${DAYS} days completed`;
    if (!u){
      title.textContent = 'Sign in daily. Unlock 1 month VIP free.';
      text.textContent = 'Only signed-in daily visits count toward the reward.';
      actionBtn.textContent = 'Sign in'; actionBtn.disabled = false;
    } else if (claimed){
      title.textContent = '30-day VIP reward unlocked!';
      text.textContent = data?.claimedAt ? `Reward activated ${dateLabel(data.claimedAt)}.` : 'Your free VIP month is active.';
      actionBtn.textContent = 'VIP Active'; actionBtn.disabled = true;
    } else if (streak >= DAYS){
      title.textContent = 'You completed the 30-day challenge!';
      text.textContent = 'Activate your free 30-day VIP reward now.';
      actionBtn.textContent = 'Claim Free VIP'; actionBtn.disabled = false;
    } else {
      title.textContent = `${DAYS - streak} day${DAYS-streak===1?'':'s'} until your free VIP month`;
      text.textContent = data?.checkedToday ? 'Today is counted. Come back tomorrow to keep the streak.' : 'Open CineFlex while signed in today to continue your streak.';
      actionBtn.textContent = data?.checkedToday ? `Day ${streak} Done` : 'Check In';
      actionBtn.disabled = !!data?.checkedToday;
    }
  }

  async function action(){
    const u = user();
    if (!u){ window.requireLogin?.(()=>setTimeout(start,300)); if (!window.requireLogin) window.openLoginModal?.(); return; }
    if (Number(current?.streak || 0) >= DAYS && !current?.membershipApplied) return claim();
    return checkIn();
  }

  async function checkIn(){
    if (busy || !user() || !window.db || !window.firebase) return;
    busy = true;
    const btn = $('cf-login-reward-action'); if(btn){btn.disabled=true;btn.textContent='Checking in…';}
    try{
      const u = user();
      const ref = window.db.collection('users').doc(u.uid).collection('dailyReward').doc('status');
      await window.db.runTransaction(async tx => {
        const snap = await tx.get(ref); const now = Date.now();
        if (!snap.exists){
          tx.set(ref,{streak:1,best:1,lastCheckIn:firebase.firestore.FieldValue.serverTimestamp(),claimed:false,membershipApplied:false,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
          return;
        }
        const d=snap.data(); const last=d.lastCheckIn?.toMillis?.() || 0; const gap=now-last;
        if (gap < 20*60*60*1000) return;
        const next = gap <= 48*60*60*1000 ? Number(d.streak||0)+1 : 1;
        tx.update(ref,{streak:Math.min(DAYS,next),best:Math.max(Number(d.best||0),Math.min(DAYS,next)),lastCheckIn:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      toast('Daily login counted. Keep your streak alive!');
    } catch(e){ console.error(e); toast('Daily check-in could not be saved. Update Firestore rules first.'); }
    finally{ busy=false; }
  }

  async function claim(){
    if (busy || !user() || !window.db || !window.firebase) return;
    busy=true; const btn=$('cf-login-reward-action'); if(btn){btn.disabled=true;btn.textContent='Activating…';}
    try{
      const u=user();
      const rewardRef=window.db.collection('users').doc(u.uid).collection('dailyReward').doc('status');
      const memberRef=window.db.collection('users').doc(u.uid).collection('membership').doc('status');
      await window.db.runTransaction(async tx=>{
        const [rewardSnap,memberSnap]=await Promise.all([tx.get(rewardRef),tx.get(memberRef)]);
        const r=rewardSnap.data()||{};
        if(Number(r.streak||0)<DAYS) throw new Error('Challenge is not complete.');
        if(r.membershipApplied===true) return;
        const old=memberSnap.exists?(memberSnap.data().vipExpiry?.toMillis?.()||memberSnap.data().expiresAt?.toMillis?.()||0):0;
        const expiry=Math.max(Date.now(),old)+30*DAY_MS;
        tx.update(rewardRef,{claimed:true,membershipApplied:true,claimedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
        tx.set(memberRef,{plan:'vip',vip:true,active:true,vipExpiry:firebase.firestore.Timestamp.fromMillis(expiry),expiresAt:firebase.firestore.Timestamp.fromMillis(expiry),source:'30-day-login-reward',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      });
      window.CineFlexMembership?.reload?.();
      toast('Congratulations! Your free 30-day VIP is now active.');
    }catch(e){console.error(e);toast(e.message||'VIP reward could not be activated.');}
    finally{busy=false;}
  }

  function start(){
    insert(); if(typeof stop==='function')stop(); stop=null;
    const u=user();
    if(!u||!window.db){render(null);return;}
    const ref=window.db.collection('users').doc(u.uid).collection('dailyReward').doc('status');
    stop=ref.onSnapshot(s=>{
      const d=s.exists?s.data():{};
      const last=d.lastCheckIn?.toMillis?.()||0;
      d.checkedToday=last>0 && Date.now()-last<20*60*60*1000;
      render(d);
      if(!s.exists || !d.checkedToday) checkIn();
    },e=>{console.warn(e);render(null);});
  }

  window.addEventListener('cineflex-login',()=>setTimeout(start,350));
  window.addEventListener('cineflex-logout',start);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(start,500)):setTimeout(start,500);
})();
