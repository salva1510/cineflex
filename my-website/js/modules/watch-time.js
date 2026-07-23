/* CINEFLEX WATCH TIME + MEMBERSHIP FOUNDATION v8.0.7 */
(function(){
  'use strict';

  const INITIAL_SECONDS = 3 * 60 * 60;
  const REWARD_SECONDS = 3 * 60 * 60;
  const SUPPORT_WAIT_SECONDS = 5;
  const SYNC_EVERY = 15;
  const CLAIM_COOLDOWN_MS = 10 * 1000;

  const $ = id => document.getElementById(id);
  let seconds = 0;
  let tick = null;
  let syncCounter = 0;
  let loaded = false;
  let userRef = null;
  let claimRunning = false;
  let claimTimer = null;
  let lastClaimAt = 0;
  let sponsorWindow = null;
  let vipActive = false;

  function openSponsorWindow(){
    try {
      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sponsorWindow = window.open(
        `cineflex-support.html?claim=${encodeURIComponent(token)}`,
        `cineflexSponsor_${token}`,
        'popup=yes,width=520,height=760,scrollbars=yes,resizable=yes'
      );
      return !!sponsorWindow;
    } catch (error) {
      console.warn('Sponsor page could not be opened:', error);
      sponsorWindow = null;
      return false;
    }
  }

  function closeSponsorWindow(){
    try {
      if(sponsorWindow && !sponsorWindow.closed) sponsorWindow.close();
    } catch (_) {}
    sponsorWindow = null;
  }

  function user(){ return window.auth?.currentUser || window.currentUser || null; }
  function isVip(){ return vipActive || !!window.CineFlexMembership?.isVip?.(); }

  function playerActive(){
    const box = $('modal-player-container');
    const frame = $('modal-video-iframe');
    const modal = $('details-modal');
    return !!(
      user() && box && frame && modal &&
      box.style.display !== 'none' &&
      frame.src && frame.src !== 'about:blank' &&
      modal.style.display !== 'none' &&
      !document.hidden
    );
  }

  function fmt(value){
    const valueSafe = Math.max(0, Math.floor(value || 0));
    const hours = Math.floor(valueSafe / 3600);
    const minutes = Math.floor((valueSafe % 3600) / 60);
    const secs = valueSafe % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
      : `${minutes}:${String(secs).padStart(2,'0')}`;
  }

  function requestAddTime(){
    if(isVip()){
      window.showToast?.('VIP members already have unlimited watch time.');
      return;
    }
    if(!user()){
      if(typeof window.requireLogin === 'function') window.requireLogin(() => open(false));
      else window.openLoginModal?.();
      return;
    }
    open(false);
  }

  window.cfOpenAddTime = requestAddTime;

  function build(){
    const topAddTime = $('cfTopAddTime');
    if(topAddTime && !topAddTime.dataset.cfBound){
      topAddTime.dataset.cfBound = '1';
      topAddTime.addEventListener('click', requestAddTime);
    }

    const playerBox = $('modal-player-container');
    if(playerBox && !$('cfWatchTimeChip')){
      playerBox.style.position = playerBox.style.position || 'relative';
      playerBox.insertAdjacentHTML('beforeend', `
        <div id="cfWatchTimeChip" class="cf-watchtime-chip">
          <i class="fa-regular fa-clock"></i>
          <span><b id="cfWatchTimeText">3:00:00</b> left</span>
          <button type="button" id="cfAddTimeMini">+ Time</button>
        </div>`);
      $('cfAddTimeMini').onclick = () => {
        if(isVip()) return window.showToast?.('VIP members have unlimited watch time.');
        if(!user()) return window.requireLogin?.(() => open(false));
        open(seconds <= 0);
      };
    }

    if(!$('cfWatchTimeModal')){
      document.body.insertAdjacentHTML('beforeend', `
        <div id="cfWatchTimeModal" class="cf-time-modal" role="dialog" aria-modal="true" aria-labelledby="cfTimeTitle">
          <div class="cf-time-card">
            <div class="cf-time-icon"><i class="fa-solid fa-hourglass-half"></i></div>
            <h2 id="cfTimeTitle">Add Watch Time</h2>
            <p id="cfTimeMessage">Support CineFlex to add another 3 hours.</p>
            <div class="cf-time-balance">Current balance<strong id="cfTimeBalance">3:00:00</strong></div>

            <div id="cfSponsorProgress" class="cf-sponsor-progress" hidden>
              <div class="cf-sponsor-ring"><strong id="cfSponsorSeconds">20</strong><span>sec</span></div>
              <p>Keep this page open while your watch time is prepared.</p>
              <div class="cf-sponsor-track"><span id="cfSponsorBar"></span></div>
            </div>

            <div class="cf-time-actions">
              <button id="cfWatchAdBtn" class="cf-time-primary" type="button">
                <i class="fa-solid fa-heart"></i> Support CineFlex • +3 Hours
              </button>
              <button id="cfTimeClose" class="cf-time-secondary" type="button">Maybe Later</button>
            </div>
            <p id="cfTimeStatus" class="cf-time-status"></p>
            <small class="cf-time-note">No advertising is used here. Keep CineFlex open until the short countdown finishes.</small>
          </div>
        </div>`);
    }

    $('cfWatchAdBtn').onclick = beginSupportFlow;
    $('cfTimeClose').onclick = () => {
      if(claimRunning) return;
      if(seconds > 0) close();
    };
    render();
  }

  function open(expired){
    build();
    $('cfWatchTimeModal').classList.add('open');
    $('cfTimeTitle').textContent = expired ? 'Your watch time has ended' : 'Add Watch Time';
    $('cfTimeMessage').textContent = expired
      ? 'Support CineFlex to continue from the same movie.'
      : `Stack another 3 hours. Current balance: ${fmt(seconds)}.`;
    $('cfTimeClose').style.display = expired ? 'none' : '';
    if(!claimRunning) resetSponsorUI();
    setStatus('');
  }

  function close(){
    if(claimRunning) return;
    $('cfWatchTimeModal')?.classList.remove('open');
  }

  function setStatus(text){
    if($('cfTimeStatus')) $('cfTimeStatus').textContent = text || '';
  }

  function resetSponsorUI(){
    const progress = $('cfSponsorProgress');
    const button = $('cfWatchAdBtn');
    if(progress) progress.hidden = true;
    if(button){
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-heart"></i> Support CineFlex • +3 Hours';
    }
    if($('cfSponsorSeconds')) $('cfSponsorSeconds').textContent = String(SUPPORT_WAIT_SECONDS);
    if($('cfSponsorBar')) $('cfSponsorBar').style.width = '0%';
  }

  function render(){
    const vip = isVip();
    const text = vip ? '∞ Unlimited' : fmt(seconds);
    if($('cfWatchTimeText')) $('cfWatchTimeText').textContent = text;
    if($('cfTimeBalance')) $('cfTimeBalance').textContent = text;
    const topAddTime = $('cfTopAddTime');
    if(topAddTime){
      topAddTime.hidden = false;
      topAddTime.classList.toggle('vip', vip);
      topAddTime.classList.toggle('low', !vip && seconds > 0 && seconds <= 120);
      topAddTime.classList.toggle('empty', !vip && seconds <= 0);
      topAddTime.title = vip ? 'Unlimited VIP watch time' : `Add 3 hours • Current: ${fmt(seconds)}`;
      const balance = $('cfTopAddTimeBalance');
      if(balance) balance.textContent = vip ? 'VIP ∞' : `+3h • ${fmt(seconds)}`;
    }

    const chip = $('cfWatchTimeChip');
    if(chip){
      chip.classList.toggle('vip', vip);
      chip.classList.toggle('low', !vip && seconds > 0 && seconds <= 120);
      chip.classList.toggle('empty', !vip && seconds <= 0);
      const suffix = chip.querySelector('span');
      if(suffix) suffix.innerHTML = vip
        ? '<b id="cfWatchTimeText">∞ Unlimited</b>'
        : `<b id="cfWatchTimeText">${fmt(seconds)}</b> left`;
    }

    const mini = $('cfAddTimeMini');
    if(mini){
      mini.hidden = vip;
      mini.textContent = '+ Time';
    }
  }

  async function loadBalance(){
    build();
    const activeUser = user();
    if(!activeUser){ loaded = false; seconds = 0; render(); return; }

    userRef = window.db.collection('users').doc(activeUser.uid).collection('watchTime').doc('balance');
    try{
      const snap = await userRef.get();
      if(!snap.exists){
        seconds = INITIAL_SECONDS;
        await userRef.set({
          remainingSeconds: seconds,
          initialGrantClaimed: true,
          watchTimeProvider: 'cineflex-local',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });
      } else {
        seconds = Math.max(0, Number(snap.data().remainingSeconds || 0));
      }
      loaded = true;
      render();
      if(seconds <= 0 && playerActive() && !isVip()) stopPlaybackAndOpen();
    } catch(error){
      console.warn('Watch time cloud load failed:', error);
      seconds = Math.max(0, Number(localStorage.getItem('cineflex_watch_seconds') || INITIAL_SECONDS));
      loaded = true;
      render();
    }
  }

  async function saveBalance(extraData = {}){
    if(!loaded) return;
    localStorage.setItem('cineflex_watch_seconds', String(seconds));
    if(!userRef) return;
    try{
      await userRef.set({
        remainingSeconds: Math.max(0, seconds),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...extraData
      }, { merge:true });
    } catch(error){
      console.warn('Watch time sync failed:', error);
    }
  }

  function stopPlaybackAndOpen(){
    if(isVip()) return;
    const frame = $('modal-video-iframe');
    if(frame && frame.src && frame.src !== 'about:blank'){
      frame.dataset.cfHeldSrc = frame.src;
      frame.src = 'about:blank';
    }
    // No advertising provider is initialized when watch time reaches 0:00.
    open(true);
  }

  function resumePlayback(){
    const frame = $('modal-video-iframe');
    if(frame?.dataset.cfHeldSrc){
      frame.src = frame.dataset.cfHeldSrc;
      delete frame.dataset.cfHeldSrc;
    }
  }

  function run(){
    clearInterval(tick);
    tick = setInterval(() => {
      if(!loaded || !playerActive() || isVip()) return;
      if(seconds <= 0){ stopPlaybackAndOpen(); return; }
      seconds--;
      syncCounter++;
      render();
      if(seconds <= 0){
        saveBalance();
        stopPlaybackAndOpen();
      } else if(syncCounter >= SYNC_EVERY){
        syncCounter = 0;
        saveBalance();
      }
    }, 1000);
  }

  async function grantSupportTime(){
    seconds += REWARD_SECONDS;
    render();
    await saveBalance({
      lastSupportClaimAt: firebase.firestore.FieldValue.serverTimestamp(),
      supportClaims: firebase.firestore.FieldValue.increment(1),
      lastSupportRewardSeconds: REWARD_SECONDS
    });
    setStatus('Thank you! 3 hours have been added.');
    closeSponsorWindow();
    resumePlayback();
    window.showToast?.('3 hours added to your watch time.');
    claimRunning = false;
    clearInterval(claimTimer);
    claimTimer = null;
    setTimeout(() => {
      resetSponsorUI();
      $('cfWatchTimeModal')?.classList.remove('open');
    }, 1100);
  }

  async function beginSupportFlow(){
    if(claimRunning) return;
    if(isVip()){
      setStatus('VIP members already have unlimited watch time.');
      return;
    }

    const now = Date.now();
    if(now - lastClaimAt < CLAIM_COOLDOWN_MS){
      setStatus('Please wait a moment before trying again.');
      return;
    }

    lastClaimAt = now;
    claimRunning = true;
    const button = $('cfWatchAdBtn');
    const closeButton = $('cfTimeClose');
    const progress = $('cfSponsorProgress');
    const secondsLabel = $('cfSponsorSeconds');
    const bar = $('cfSponsorBar');

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing watch time';
    closeButton.style.display = 'none';
    progress.hidden = false;
    setStatus('Keep CineFlex open while your watch time is prepared.');

    let remaining = SUPPORT_WAIT_SECONDS;
    secondsLabel.textContent = String(remaining);
    bar.style.width = '0%';

    claimTimer = setInterval(() => {
      if(document.hidden) return;
      remaining--;
      secondsLabel.textContent = String(Math.max(0, remaining));
      bar.style.width = `${Math.min(100, ((SUPPORT_WAIT_SECONDS - remaining) / SUPPORT_WAIT_SECONDS) * 100)}%`;
      if(remaining <= 0) grantSupportTime();
    }, 1000);
  }

  window.cfOpenWatchTime = () => {
    if(isVip()) return window.showToast?.('VIP members have unlimited watch time.');
    if(!user()) return window.requireLogin?.(() => open(false));
    open(seconds <= 0);
  };
  window.addEventListener('cineflex-membership-change', event => {
    vipActive = !!event.detail?.vip;
    render();
    if(vipActive){
      claimRunning = false;
      clearInterval(claimTimer);
      closeSponsorWindow();
      $('cfWatchTimeModal')?.classList.remove('open');
      resumePlayback();
    } else if(loaded && seconds <= 0 && playerActive()){
      stopPlaybackAndOpen();
    }
  });
  window.addEventListener('cineflex-login', loadBalance);
  window.addEventListener('cineflex-logout', () => {
    loaded = false;
    seconds = 0;
    claimRunning = false;
    clearInterval(claimTimer);
    closeSponsorWindow();
    render();
  });
  window.addEventListener('beforeunload', saveBalance);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) saveBalance();
  });
  document.addEventListener('DOMContentLoaded', () => {
    build();
    run();
    if(user()) loadBalance();
  });


  // Safely restore controls only when another module has actually replaced them.
  // Do not call build() for every DOM mutation: render() also updates the DOM and
  // would otherwise create an endless observer loop that freezes the splash screen.
  let uiRepairQueued = false;
  function controlsNeedRepair(){
    const playerBox = $('modal-player-container');
    return !!(
      !$('cfWatchTimeModal') ||
      !$('cfTopAddTime') ||
      (playerBox && !$('cfWatchTimeChip'))
    );
  }

  const uiObserver = new MutationObserver(() => {
    if(uiRepairQueued || !controlsNeedRepair()) return;
    uiRepairQueued = true;
    setTimeout(() => {
      uiRepairQueued = false;
      if(document.body && controlsNeedRepair()) build();
    }, 120);
  });

  document.addEventListener('DOMContentLoaded', () => {
    build();
    uiObserver.observe(document.body, { childList:true, subtree:true });
  });
})();
