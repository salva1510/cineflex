/* CINEFLEX MEMBERSHIP FOUNDATION v8.0.4 */
(function(){
  'use strict';

  const state = {
    loaded: false,
    plan: 'free',
    vipExpiryMs: 0,
    source: 'default'
  };
  let statusRef = null;
  let unsubscribe = null;
  let expiryTimer = null;

  const $ = id => document.getElementById(id);
  const currentUser = () => window.auth?.currentUser || window.currentUser || null;

  function toMillis(value){
    if(!value) return 0;
    if(typeof value.toMillis === 'function') return value.toMillis();
    if(typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function isVip(){
    return state.plan === 'vip' && state.vipExpiryMs > Date.now();
  }

  function expiryLabel(){
    if(!isVip()) return 'Free plan';
    return new Intl.DateTimeFormat('en-PH', {
      year:'numeric', month:'short', day:'numeric'
    }).format(new Date(state.vipExpiryMs));
  }

  function render(){
    const vip = isVip();
    const badge = $('userBadge');
    if(badge){
      badge.textContent = vip ? '👑 VIP MEMBER' : 'FREE MEMBER';
      badge.classList.toggle('cf-vip-badge', vip);
      badge.classList.toggle('cf-free-badge', !vip);
    }

    const premiumBadge = $('cfPremiumBadge');
    if(premiumBadge){
      premiumBadge.textContent = vip ? '👑 PREMIUM VIP' : 'UPGRADE TO VIP';
      premiumBadge.classList.toggle('active', vip);
      premiumBadge.setAttribute('aria-label', vip ? `Premium VIP valid until ${expiryLabel()}` : 'View VIP membership');
    }

    const plan = $('cfMembershipPlan');
    const detail = $('cfMembershipDetail');
    const icon = $('cfMembershipIcon');
    const card = $('cfMembershipCard');
    if(plan) plan.textContent = vip ? 'VIP Member' : 'Free Member';
    if(detail) detail.textContent = vip ? `Unlimited • valid until ${expiryLabel()}` : '15-minute watch balance';
    if(icon) icon.className = vip ? 'fa-solid fa-crown' : 'fa-solid fa-user';
    if(card) card.classList.toggle('vip', vip);

    document.documentElement.classList.toggle('cf-user-vip', vip);
  }

  function publish(){
    render();
    window.dispatchEvent(new CustomEvent('cineflex-membership-change', {
      detail: {
        loaded: state.loaded,
        plan: isVip() ? 'vip' : 'free',
        vip: isVip(),
        vipExpiryMs: state.vipExpiryMs,
        expiryLabel: expiryLabel()
      }
    }));
  }

  function applyData(data, source='firestore'){
    const rawPlan = String(data?.plan || (data?.vip === true ? 'vip' : 'free')).toLowerCase();
    state.plan = rawPlan === 'vip' ? 'vip' : 'free';
    state.vipExpiryMs = toMillis(data?.vipExpiry || data?.expiresAt || data?.vipUntil);
    state.loaded = true;
    state.source = source;
    if(state.plan === 'vip' && state.vipExpiryMs <= Date.now()) state.plan = 'free';
    publish();
  }

  function clearSubscription(){
    if(typeof unsubscribe === 'function') unsubscribe();
    unsubscribe = null;
    statusRef = null;
  }

  function load(){
    clearSubscription();
    const user = currentUser();
    if(!user || !window.db){
      state.loaded = false;
      state.plan = 'free';
      state.vipExpiryMs = 0;
      publish();
      return;
    }

    statusRef = window.db.collection('users').doc(user.uid).collection('membership').doc('status');
    unsubscribe = statusRef.onSnapshot(
      snap => applyData(snap.exists ? snap.data() : {}, snap.exists ? 'firestore' : 'default'),
      error => {
        console.warn('Membership status could not be loaded:', error);
        applyData({}, 'fallback');
      }
    );
  }

  function openInfo(){
    const vip = isVip();
    const message = vip
      ? `VIP Member • Unlimited watch time • Valid until ${expiryLabel()} • One pop ad may appear when starting a movie.`
      : 'Free Member • 15-minute watch balance • Use Add Time to stack more minutes through the sponsor page.';
    window.showToast?.(message);
  }

  window.CineFlexMembership = {
    isVip,
    getState: () => ({...state, vip:isVip(), expiryLabel:expiryLabel()}),
    reload: load,
    openInfo
  };

  window.cfOpenMembershipInfo = openInfo;
  window.addEventListener('cineflex-login', () => { setTimeout(load, 100); setTimeout(render, 500); });
  window.addEventListener('cineflex-profile-change', () => setTimeout(render, 50));
  window.addEventListener('cineflex-logout', load);
  document.addEventListener('DOMContentLoaded', () => {
    render();
    load();
    clearInterval(expiryTimer);
    expiryTimer = setInterval(() => {
      if(state.plan === 'vip' && !isVip()){
        state.plan = 'free';
        publish();
      } else render();
    }, 60000);
  });
})();
