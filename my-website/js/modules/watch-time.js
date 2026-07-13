/* CINEFLEX WATCH TIME + ISOLATED MONETAG SPONSOR FLOW v7.2.2 */
(function(){
  'use strict';

  const INITIAL_SECONDS = 15 * 60;
  const REWARD_SECONDS = 15 * 60;
  const SUPPORT_WAIT_SECONDS = 20;
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
    return `${Math.floor(valueSafe / 60)}:${String(valueSafe % 60).padStart(2,'0')}`;
  }

  function build(){
    const actions = document.querySelector('.modal-actions-wrapper');
    if(actions && !$('cfAddTimeAction')){
      actions.insertAdjacentHTML('beforeend', `
        <button id="cfAddTimeAction" class="action-btn-large cf-add-time-action" type="button">
          <i class="fa-solid fa-clock"></i>
          <span>Add Time</span>
          <b id="cfAddTimeActionBalance">15:00</b>
        </button>`);
      $('cfAddTimeAction').onclick = () => {
        if(seconds > 0){
          window.showToast?.(`You still have ${fmt(seconds)} free watch time.`);
          return;
        }
        if(!user()){
          if(typeof window.requireLogin === 'function'){
            window.requireLogin(() => open(true));
          } else {
            window.openLoginModal?.();
          }
          return;
        }
        open(true);
      };
    }

    const playerBox = $('modal-player-container');
    if(playerBox && !$('cfWatchTimeChip')){
      playerBox.style.position = playerBox.style.position || 'relative';
      playerBox.insertAdjacentHTML('beforeend', `
        <div id="cfWatchTimeChip" class="cf-watchtime-chip">
          <i class="fa-regular fa-clock"></i>
          <span><b id="cfWatchTimeText">15:00</b> left</span>
          <button type="button" id="cfAddTimeMini">+ Time</button>
        </div>`);
      $('cfAddTimeMini').onclick = () => {
        if(seconds <= 0) open(true);
        else window.showToast?.(`You still have ${fmt(seconds)} free watch time.`);
      };
    }

    if(!$('cfWatchTimeModal')){
      document.body.insertAdjacentHTML('beforeend', `
        <div id="cfWatchTimeModal" class="cf-time-modal" role="dialog" aria-modal="true" aria-labelledby="cfTimeTitle">
          <div class="cf-time-card">
            <div class="cf-time-icon"><i class="fa-solid fa-hourglass-half"></i></div>
            <h2 id="cfTimeTitle">Add Watch Time</h2>
            <p id="cfTimeMessage">Support CineFlex to add another 15 minutes.</p>
            <div class="cf-time-balance">Current balance<strong id="cfTimeBalance">15:00</strong></div>

            <div id="cfSponsorProgress" class="cf-sponsor-progress" hidden>
              <div class="cf-sponsor-ring"><strong id="cfSponsorSeconds">20</strong><span>sec</span></div>
              <p>Keep this page open while your watch time is prepared.</p>
              <div class="cf-sponsor-track"><span id="cfSponsorBar"></span></div>
            </div>

            <div class="cf-time-actions">
              <button id="cfWatchAdBtn" class="cf-time-primary" type="button">
                <i class="fa-solid fa-heart"></i> Support CineFlex • +15 Minutes
              </button>
              <button id="cfTimeClose" class="cf-time-secondary" type="button">Maybe Later</button>
            </div>
            <p id="cfTimeStatus" class="cf-time-status"></p>
            <small class="cf-time-note">A sponsor experience may open after you tap Support. Keep CineFlex open until the countdown finishes. This is not a verified rewarded-video ad.</small>
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
      : 'Support CineFlex to add another 15 minutes.';
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
      button.innerHTML = '<i class="fa-solid fa-heart"></i> Support CineFlex • +15 Minutes';
    }
    if($('cfSponsorSeconds')) $('cfSponsorSeconds').textContent = String(SUPPORT_WAIT_SECONDS);
    if($('cfSponsorBar')) $('cfSponsorBar').style.width = '0%';
  }

  function render(){
    const text = fmt(seconds);
    if($('cfWatchTimeText')) $('cfWatchTimeText').textContent = text;
    if($('cfTimeBalance')) $('cfTimeBalance').textContent = text;
    if($('cfAddTimeActionBalance')) $('cfAddTimeActionBalance').textContent = text;
    const action = $('cfAddTimeAction');
    if(action){
      action.classList.toggle('low', seconds > 0 && seconds <= 120);
      action.classList.toggle('empty', seconds <= 0);
      action.hidden = seconds > 0;
      action.title = seconds <= 0 ? 'Add 15 minutes' : `Free watch time: ${text}`;
    }
    const chip = $('cfWatchTimeChip');
    if(chip){
      chip.classList.toggle('low', seconds > 0 && seconds <= 120);
      chip.classList.toggle('empty', seconds <= 0);
    }
    const mini = $('cfAddTimeMini');
    if(mini) mini.hidden = seconds > 0;
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
          monetizationProvider: 'monetag',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });
      } else {
        seconds = Math.max(0, Number(snap.data().remainingSeconds || 0));
      }
      loaded = true;
      render();
      if(seconds <= 0 && playerActive()) stopPlaybackAndOpen();
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
    const frame = $('modal-video-iframe');
    if(frame && frame.src && frame.src !== 'about:blank'){
      frame.dataset.cfHeldSrc = frame.src;
      frame.src = 'about:blank';
    }
    // Do not initialize Monetag merely because time reached 0:00.
    // It is loaded only after the user explicitly taps Support CineFlex.
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
      if(!loaded || !playerActive()) return;
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
    setStatus('Thank you! 15 minutes have been added.');
    closeSponsorWindow();
    resumePlayback();
    window.showToast?.('15 minutes added to your watch time.');
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
    if(seconds > 0){
      setStatus(`You still have ${fmt(seconds)} free watch time. Ads unlock at 0:00.`);
      return;
    }

    const now = Date.now();
    if(now - lastClaimAt < CLAIM_COOLDOWN_MS){
      setStatus('Please wait a moment before trying again.');
      return;
    }

    lastClaimAt = now;
    const sponsorOpened = openSponsorWindow();
    if(!sponsorOpened){
      setStatus('Your browser blocked the sponsor page. Allow pop-ups for CineFlex, then try again.');
      return;
    }
    claimRunning = true;
    const button = $('cfWatchAdBtn');
    const closeButton = $('cfTimeClose');
    const progress = $('cfSponsorProgress');
    const secondsLabel = $('cfSponsorSeconds');
    const bar = $('cfSponsorBar');

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sponsor experience started';
    closeButton.style.display = 'none';
    progress.hidden = false;
    setStatus('The sponsor page opened in a separate tab. Return to CineFlex and keep this page active.');

    let remaining = SUPPORT_WAIT_SECONDS;
    secondsLabel.textContent = String(remaining);
    bar.style.width = '0%';

    // Monetag runs only inside the isolated sponsor page, never in the main CineFlex page.
    window.dispatchEvent(new CustomEvent('cineflex-support-start', { detail:{ provider:'monetag-isolated' } }));

    claimTimer = setInterval(() => {
      if(document.hidden) return;
      remaining--;
      secondsLabel.textContent = String(Math.max(0, remaining));
      bar.style.width = `${Math.min(100, ((SUPPORT_WAIT_SECONDS - remaining) / SUPPORT_WAIT_SECONDS) * 100)}%`;
      if(remaining <= 0) grantSupportTime();
    }, 1000);
  }

  window.cfOpenWatchTime = () => {
    if(seconds <= 0) open(true);
    else window.showToast?.(`You still have ${fmt(seconds)} free watch time.`);
  };
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
})();
