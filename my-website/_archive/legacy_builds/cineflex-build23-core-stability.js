/* =========================================================
   CINEFLEX BUILD 23 - CORE STABILITY LAYER
   Purpose: stabilize auth UI, drawer, profiles and player UI
   ========================================================= */
(function(){
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  let manageMode = false;
  let booted = false;

  function waitForFirebase(cb){
    if (window.auth && window.db) return cb();
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.auth && window.db) { clearInterval(t); cb(); }
      if (tries > 80) clearInterval(t);
    }, 100);
  }

  function toast(msg){
    let el = $('#cf-stability-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cf-stability-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function safeUser(){ return (window.auth && window.auth.currentUser) || window.currentUser || null; }

  function defaultAvatar(name){
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'Profile') + '&background=e50914&color=fff&bold=true';
  }

  function getLocalProfiles(){
    try { return Array.isArray(window.profiles) ? window.profiles : (typeof profiles !== 'undefined' ? profiles : []); }
    catch(e){ return []; }
  }

  function setLocalProfiles(list){
    try { window.profiles = list; } catch(e){}
    try { profiles = list; } catch(e){}
  }

  async function fetchProfiles(){
    const user = safeUser();
    if (!user || !window.db) return [];
    const snap = await window.db.collection('users').doc(user.uid).collection('profiles').orderBy('createdAt', 'asc').get()
      .catch(async () => await window.db.collection('users').doc(user.uid).collection('profiles').get());
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    setLocalProfiles(list);
    return list;
  }

  async function ensureDefaultProfile(){
    const user = safeUser();
    if (!user || !window.db) return [];
    let list = await fetchProfiles();
    if (list.length) return list;
    const name = user.displayName || 'Main Profile';
    const ref = await window.db.collection('users').doc(user.uid).collection('profiles').add({
      name,
      avatar: user.photoURL || defaultAvatar(name),
      kids: false,
      isDefault: true,
      watchlist: [],
      continueWatching: [],
      history: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    list = [{ id: ref.id, name, avatar: user.photoURL || defaultAvatar(name), kids:false, isDefault:true }];
    setLocalProfiles(list);
    localStorage.setItem('cineflex_profile', ref.id);
    return list;
  }

  async function selectProfileStable(id){
    const list = getLocalProfiles();
    const profile = list.find(p => p.id === id);
    if (!profile) return;
    try { currentProfile = id; } catch(e){}
    window.currentProfile = id;
    localStorage.setItem('cineflex_profile', id);
    const selector = $('#profile-selector');
    if (selector) selector.style.display = 'none';
    renderDrawerProfiles(list);
    if (typeof window.loadUserData === 'function') await window.loadUserData();
    toast('Profile switched to ' + (profile.name || 'Profile'));
  }

  function renderDrawerProfiles(list){
    const wrap = $('#drawer-profiles');
    if (!wrap) return;
    const active = localStorage.getItem('cineflex_profile');
    if (!safeUser()) {
      wrap.innerHTML = '<div class="cf-drawer-note">Login muna para magamit ang profiles.</div>';
      return;
    }
    if (!list || !list.length) {
      wrap.innerHTML = '<div class="cf-drawer-note">No profiles yet.</div>';
      return;
    }
    wrap.innerHTML = list.map(p => `
      <div class="drawer-profile ${p.id === active ? 'active' : ''}" data-profile-id="${p.id}">
        <img src="${p.avatar || defaultAvatar(p.name)}" alt="${p.name || 'Profile'}">
        <span>${p.name || 'Profile'}</span>
        ${p.isDefault ? '<em>DEFAULT</em>' : ''}
        ${manageMode ? `<div class="cf-profile-tools">
          <button type="button" class="cf-edit-profile" data-edit-id="${p.id}" aria-label="Edit profile">✎</button>
          <button type="button" class="cf-delete-profile" data-delete-id="${p.id}" aria-label="Delete profile">🗑</button>
        </div>` : ''}
      </div>
    `).join('');
  }

  async function bootProfiles(){
    if (!safeUser()) { renderDrawerProfiles([]); return; }
    const list = await ensureDefaultProfile();
    const saved = localStorage.getItem('cineflex_profile');
    const chosen = list.find(p => p.id === saved) || list.find(p => p.isDefault) || list[0];
    if (chosen) {
      try { currentProfile = chosen.id; } catch(e){}
      window.currentProfile = chosen.id;
      localStorage.setItem('cineflex_profile', chosen.id);
    }
    renderDrawerProfiles(list);
    if (typeof window.loadUserData === 'function') window.loadUserData().catch(console.warn);
  }

  async function addProfileStable(){
    const user = safeUser();
    if (!user) { if (typeof window.openLoginModal === 'function') window.openLoginModal(); else toast('Mag-login muna.'); return; }
    const list = await fetchProfiles();
    if (list.length >= 5) { toast('Maximum 5 profiles lang.'); return; }
    const name = prompt('Profile name');
    if (!name || !name.trim()) return;
    const profileName = name.trim().slice(0, 24);
    const avatar = defaultAvatar(profileName);
    await window.db.collection('users').doc(user.uid).collection('profiles').add({
      name: profileName,
      avatar,
      kids: false,
      isDefault: list.length === 0,
      watchlist: [],
      continueWatching: [],
      history: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast('Profile created');
    await bootProfiles();
  }

  async function editProfileStable(id){
    const user = safeUser();
    if (!user || !id) return;
    const list = await fetchProfiles();
    const p = list.find(x => x.id === id);
    if (!p) return;
    const name = prompt('Edit profile name', p.name || 'Profile');
    if (!name || !name.trim()) return;
    const profileName = name.trim().slice(0,24);
    await window.db.collection('users').doc(user.uid).collection('profiles').doc(id).set({
      name: profileName,
      avatar: p.avatar || defaultAvatar(profileName),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
    toast('Profile updated');
    await bootProfiles();
  }

  async function deleteProfileStable(id){
    const user = safeUser();
    if (!user || !id) return;
    const list = await fetchProfiles();
    const p = list.find(x => x.id === id);
    if (!p) return;
    if (list.length <= 1) { toast('Hindi puwedeng i-delete ang last profile.'); return; }
    if (!confirm(`Delete profile "${p.name || 'Profile'}"?`)) return;
    await window.db.collection('users').doc(user.uid).collection('profiles').doc(id).delete();
    if (localStorage.getItem('cineflex_profile') === id) {
      const next = list.find(x => x.id !== id);
      if (next) localStorage.setItem('cineflex_profile', next.id);
    }
    toast('Profile deleted');
    await bootProfiles();
  }

  function updateAccountUI(user){
    const photo = $('#userPhoto');
    const name = $('#userName');
    const email = $('#userEmail');
    const badge = $('#userBadge');
    const loginActions = $('#drawerLoginActions');
    const accountActions = $('#drawerAccountActions');
    const profileSection = $('.drawer-profile-section');
    if (user) {
      if (photo) photo.src = user.photoURL || defaultAvatar(user.displayName || user.email || 'User');
      if (name) name.textContent = user.displayName || 'CineFlex User';
      if (email) email.textContent = user.email || 'Google account';
      if (badge) badge.textContent = 'CINEFLEX MEMBER';
      if (loginActions) loginActions.style.display = 'none';
      if (accountActions) accountActions.style.display = 'block';
      if (profileSection) profileSection.style.display = 'block';
    } else {
      if (photo) photo.src = defaultAvatar('Guest');
      if (name) name.textContent = 'Guest';
      if (email) email.textContent = 'Not logged in';
      if (badge) badge.textContent = 'FREE MEMBER';
      if (loginActions) loginActions.style.display = 'grid';
      if (accountActions) accountActions.style.display = 'none';
      if (profileSection) profileSection.style.display = 'block';
      renderDrawerProfiles([]);
    }
  }

  function openMenuDrawerStable(){
    const drawer = $('#menu-drawer');
    const backdrop = $('#drawer-backdrop');
    if (!drawer) return;
    const active = drawer.classList.contains('active');
    drawer.classList.toggle('active', !active);
    drawer.classList.toggle('open', !active);
    if (backdrop) backdrop.classList.toggle('active', !active);
    document.body.classList.toggle('drawer-open', !active);
    if (!active) renderDrawerProfiles(getLocalProfiles());
  }

  function closeMenuDrawerStable(){
    const drawer = $('#menu-drawer');
    const backdrop = $('#drawer-backdrop');
    if (drawer) { drawer.classList.remove('active'); drawer.classList.remove('open'); }
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('drawer-open');
  }

  function patchPlayerUI(){
    const modal = $('#details-modal');
    const banner = $('#modal-banner');
    const player = $('#modal-player-container');
    if (banner && !$('.cf-poster-close', banner)) {
      const btn = document.createElement('button');
      btn.className = 'cf-poster-close';
      btn.type = 'button';
      btn.innerHTML = '✕';
      btn.setAttribute('aria-label', 'Close details');
      btn.addEventListener('click', window.closeModal || closeModalStable);
      banner.appendChild(btn);
    }
    if (player && !$('.cf-player-close', player)) {
      const btn = document.createElement('button');
      btn.className = 'cf-player-close';
      btn.type = 'button';
      btn.innerHTML = '✕';
      btn.setAttribute('aria-label', 'Close player');
      btn.addEventListener('click', () => {
        const iframe = $('#modal-video-iframe');
        if (iframe) iframe.src = '';
        player.style.display = 'none';
        document.body.classList.remove('cf-player-playing');
      });
      player.appendChild(btn);
    }
    if (player && !$('.cf-player-loader', player)) {
      const loader = document.createElement('div');
      loader.className = 'cf-player-loader';
      loader.innerHTML = '<strong>CINEFLEX</strong><span>Loading Stream</span>';
      player.appendChild(loader);
    }
  }

  function closeModalStable(){
    const modal = $('#details-modal');
    const iframe = $('#modal-video-iframe');
    const player = $('#modal-player-container');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = '';
    if (player) player.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.body.classList.remove('cf-player-playing');
  }

  function patchPlayerLoading(){
    document.addEventListener('click', (e) => {
      if (e.target.closest('.play-btn-large, .episode-item')) {
        document.body.classList.add('cf-player-playing');
        setTimeout(() => document.body.classList.add('cf-player-loaded'), 4200);
      }
    }, true);
    const iframe = $('#modal-video-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        document.body.classList.add('cf-player-playing');
        setTimeout(() => document.body.classList.add('cf-player-loaded'), 900);
      });
    }
    document.addEventListener('fullscreenchange', () => {
      document.body.classList.toggle('cf-is-fullscreen', !!document.fullscreenElement);
    });
    document.addEventListener('webkitfullscreenchange', () => {
      document.body.classList.toggle('cf-is-fullscreen', !!document.webkitFullscreenElement);
    });
  }

  function patchGlobalFunctions(){
    window.openMenuDrawer = openMenuDrawerStable;
    window.closeMenuDrawer = closeMenuDrawerStable;
    window.createProfile = addProfileStable;
    window.selectProfile = selectProfileStable;
    window.toggleManageProfiles = function(){
      manageMode = !manageMode;
      renderDrawerProfiles(getLocalProfiles());
      toast(manageMode ? 'Manage Profiles enabled' : 'Manage Profiles disabled');
    };
    window.closeModal = closeModalStable;
    window.loadProfiles = bootProfiles;
  }

  function bindEvents(){
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.drawer-profile');
      const del = e.target.closest('[data-delete-id]');
      const edit = e.target.closest('[data-edit-id]');
      if (del) { e.preventDefault(); e.stopPropagation(); deleteProfileStable(del.dataset.deleteId); return; }
      if (edit) { e.preventDefault(); e.stopPropagation(); editProfileStable(edit.dataset.editId); return; }
      if (card && card.dataset.profileId && !manageMode) selectProfileStable(card.dataset.profileId);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenuDrawerStable();
        closeModalStable();
      }
    });

    window.addEventListener('cineflex-login', (e) => {
      updateAccountUI(e.detail || safeUser());
      bootProfiles().catch(console.warn);
    });
    window.addEventListener('cineflex-logout', () => {
      updateAccountUI(null);
      localStorage.removeItem('cineflex_profile');
    });
  }

  function boot(){
    if (booted) return;
    booted = true;
    patchGlobalFunctions();
    patchPlayerUI();
    patchPlayerLoading();
    bindEvents();
    waitForFirebase(() => {
      updateAccountUI(safeUser());
      if (window.auth && window.auth.onAuthStateChanged) {
        window.auth.onAuthStateChanged(user => {
          updateAccountUI(user);
          if (user) bootProfiles().catch(console.warn);
        });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
