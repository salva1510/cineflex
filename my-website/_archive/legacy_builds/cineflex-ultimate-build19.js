/* =========================================================
   CINEFLEX ULTIMATE STABLE BUILD 19
   Login + Profiles + Drawer + Embed Netflix Player Shell
   ========================================================= */
(function () {
  'use strict';

  const AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=CineFlexRed',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=MovieFan',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Kids',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'
  ];

  const state = {
    profiles: [],
    currentProfileId: localStorage.getItem('cineflex_profile') || null,
    manageMode: false,
    authReady: false,
    busy: false
  };

  function $(id) { return document.getElementById(id); }
  function user() { return (window.auth && window.auth.currentUser) || window.currentUser || null; }
  function profileCol() {
    const u = user();
    if (!u || !window.db) return null;
    return window.db.collection('users').doc(u.uid).collection('profiles');
  }
  function safeName(value) {
    return String(value || '').replace(/[<>&"']/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[s]));
  }
  function toast(message) {
    if (typeof showToast === 'function') return showToast(message);
    console.log('[CineFlex]', message);
  }

  function ensurePlayerCloseButton() {
    const player = $('modal-player-container');
    if (!player) return;
    player.style.position = 'relative';
    let btn = $('cf-player-close-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'cf-player-close-btn';
      btn.type = 'button';
      btn.className = 'cf-player-close-btn';
      btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      btn.setAttribute('aria-label', 'Close video');
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const iframe = $('modal-video-iframe');
        if (iframe) iframe.src = '';
        player.style.display = 'none';
      };
      player.prepend(btn);
    }
  }

  function patchModalClose() {
    const oldClose = window.closeModal;
    window.closeModal = function () {
      const iframe = $('modal-video-iframe');
      const player = $('modal-player-container');
      const modal = $('details-modal');
      if (iframe) iframe.src = '';
      if (player) player.style.display = 'none';
      if (modal) modal.style.display = 'none';
      document.body.style.overflow = 'auto';
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
      if (typeof oldClose === 'function') {
        try { oldClose(); } catch(e) {}
      }
    };
  }

  function setDrawerLoggedOut() {
    const name = $('userName'), email = $('userEmail'), photo = $('userPhoto'), badge = $('userBadge');
    if (name) name.textContent = 'Guest';
    if (email) email.textContent = window.cineflexAuthReady ? 'Not logged in' : 'Checking login...';
    if (photo) photo.src = 'https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff';
    if (badge) badge.textContent = window.cineflexAuthReady ? 'FREE MEMBER' : 'LOADING';
    const loginActions = $('drawerLoginActions');
    const accountActions = $('drawerAccountActions');
    if (loginActions) loginActions.style.display = 'grid';
    if (accountActions) accountActions.style.display = 'none';
    renderDrawerProfiles([]);
  }

  function setDrawerLoggedIn(u) {
    const active = state.profiles.find(p => p.id === state.currentProfileId) || state.profiles[0];
    const displayName = active?.name || u.displayName || 'CineFlex User';
    const name = $('userName'), email = $('userEmail'), photo = $('userPhoto'), badge = $('userBadge');
    if (name) name.textContent = displayName;
    if (email) email.textContent = u.email || 'Google Account';
    if (photo) photo.src = active?.avatar || u.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=e50914&color=fff';
    if (badge) badge.textContent = active?.isKids ? 'KIDS PROFILE' : 'PREMIUM MEMBER';
    const loginActions = $('drawerLoginActions');
    const accountActions = $('drawerAccountActions');
    if (loginActions) loginActions.style.display = 'none';
    if (accountActions) accountActions.style.display = 'block';
  }

  function updateDrawerAccount() {
    const u = user();
    if (!u) return setDrawerLoggedOut();
    setDrawerLoggedIn(u);
    renderDrawerProfiles(state.profiles);
  }

  function renderDrawerProfiles(list) {
    const box = $('drawer-profiles');
    if (!box) return;
    if (!user()) {
      box.innerHTML = '<div class="cf-profile-hint">Login muna para gumawa ng profiles.</div>';
      return;
    }
    if (!list || !list.length) {
      box.innerHTML = '<div class="cf-profile-hint">Wala pang profile. Gumawa ng una.</div>';
      return;
    }
    box.innerHTML = list.map(p => {
      const active = p.id === state.currentProfileId ? ' active' : '';
      const del = state.manageMode && list.length > 1
        ? `<button class="cf-mini-delete" data-delete-profile="${p.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>` : '';
      const edit = state.manageMode
        ? `<button class="cf-mini-edit" data-edit-profile="${p.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>` : '';
      return `<div class="cf-drawer-profile${active}" data-select-profile="${p.id}">
        <img src="${safeName(p.avatar || AVATARS[0])}" alt="">
        <div><strong>${safeName(p.name || 'Profile')}</strong><span>${p.isDefault ? 'Default' : (p.isKids ? 'Kids' : 'Profile')}</span></div>
        <div class="cf-profile-actions">${edit}${del}</div>
      </div>`;
    }).join('');
  }

  async function loadProfilesUltimate() {
    const col = profileCol();
    if (!col) { state.profiles = []; updateDrawerAccount(); return []; }
    const snap = await col.orderBy('createdAt', 'asc').get().catch(async () => col.get());
    state.profiles = [];
    snap.forEach(doc => state.profiles.push({ id: doc.id, ...doc.data() }));
    if (!state.profiles.length) {
      await createDefaultProfileUltimate();
      return loadProfilesUltimate();
    }
    let saved = localStorage.getItem('cineflex_profile');
    const def = state.profiles.find(p => p.isDefault) || state.profiles[0];
    if (!saved || !state.profiles.some(p => p.id === saved)) saved = def.id;
    await selectProfileUltimate(saved, false);
    renderBigProfileSelector();
    updateDrawerAccount();
    return state.profiles;
  }

  async function createDefaultProfileUltimate() {
    const u = user();
    const col = profileCol();
    if (!u || !col) return;
    await col.add({
      name: u.displayName || 'Mark',
      avatar: u.photoURL || AVATARS[1],
      isKids: false,
      isDefault: true,
      watchlist: [],
      continueWatching: [],
      history: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function selectProfileUltimate(id, hideSelector = true) {
    state.currentProfileId = id;
    window.currentProfile = id;
    localStorage.setItem('cineflex_profile', id);
    if (hideSelector) {
      const selector = $('profile-selector');
      const profilesModal = $('profiles-modal');
      if (selector) selector.style.display = 'none';
      if (profilesModal) profilesModal.style.display = 'none';
    }
    if (typeof loadUserData === 'function') {
      try { await loadUserData(); } catch (e) { console.warn('loadUserData warning:', e); }
    }
    updateDrawerAccount();
  }

  function renderBigProfileSelector() {
    const selector = $('profile-selector');
    const container = $('profiles');
    if (!selector || !container || !state.profiles.length) return;
    container.innerHTML = state.profiles.map(p => `
      <div class="profile-card ${state.manageMode ? 'manage' : ''}" data-select-profile="${p.id}">
        <div class="cf-profile-image-wrap">
          <img src="${safeName(p.avatar || AVATARS[0])}">
          ${state.manageMode ? '<span class="cf-edit-badge"><i class="fa-solid fa-pen"></i></span>' : ''}
        </div>
        <span>${safeName(p.name || 'Profile')}</span>
        ${state.manageMode ? `<div class="cf-big-profile-actions">
          <button data-edit-profile="${p.id}">Edit</button>
          ${state.profiles.length > 1 ? `<button class="danger" data-delete-profile="${p.id}">Delete</button>` : ''}
        </div>` : ''}
      </div>`).join('');
  }

  async function createProfileUltimate() {
    if (state.busy) return;
    if (!user()) {
      if (typeof openLoginModal === 'function') openLoginModal();
      else alert('Mag-login muna para gumawa ng profile.');
      return;
    }
    if (state.profiles.length >= 5) return alert('Maximum 5 profiles lang muna.');
    const name = prompt('Profile name');
    if (!name || !name.trim()) return;
    const avatar = AVATARS[state.profiles.length % AVATARS.length];
    const kids = confirm('Kids profile ba ito? OK = Kids, Cancel = Normal');
    const col = profileCol();
    if (!col) return;
    state.busy = true;
    try {
      const ref = await col.add({
        name: name.trim(), avatar, isKids: kids, isDefault: state.profiles.length === 0,
        watchlist: [], continueWatching: [], history: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await loadProfilesUltimate();
      await selectProfileUltimate(ref.id, true);
      toast('Profile created.');
    } catch (e) {
      console.error(e); alert(e.message || 'Hindi nagawa ang profile.');
    } finally { state.busy = false; }
  }

  async function editProfileUltimate(id) {
    const p = state.profiles.find(x => x.id === id);
    if (!p) return;
    const name = prompt('Edit profile name', p.name || 'Profile');
    if (!name || !name.trim()) return;
    const setDefault = confirm('Gawing default profile? OK = Yes, Cancel = No');
    const col = profileCol();
    if (!col) return;
    state.busy = true;
    try {
      if (setDefault) {
        await Promise.all(state.profiles.map(x => col.doc(x.id).set({ isDefault: x.id === id }, { merge: true })));
      }
      await col.doc(id).set({ name: name.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await loadProfilesUltimate();
      toast('Profile updated.');
    } catch (e) { console.error(e); alert(e.message || 'Hindi na-edit ang profile.'); }
    finally { state.busy = false; }
  }

  async function deleteProfileUltimate(id) {
    if (state.profiles.length <= 1) return alert('Hindi puwedeng i-delete ang huling profile.');
    const p = state.profiles.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete profile "${p.name || 'Profile'}"?`)) return;
    const col = profileCol();
    if (!col) return;
    state.busy = true;
    try {
      await col.doc(id).delete();
      if (state.currentProfileId === id) localStorage.removeItem('cineflex_profile');
      await loadProfilesUltimate();
      toast('Profile deleted.');
    } catch (e) { console.error(e); alert(e.message || 'Hindi na-delete ang profile.'); }
    finally { state.busy = false; }
  }

  function showProfileSelectorUltimate() {
    renderBigProfileSelector();
    const selector = $('profile-selector');
    if (selector) selector.style.display = 'flex';
  }

  function toggleManageProfilesUltimate() {
    if (!user()) {
      if (typeof openLoginModal === 'function') openLoginModal();
      return;
    }
    state.manageMode = !state.manageMode;
    document.body.classList.toggle('cf-manage-profiles', state.manageMode);
    renderDrawerProfiles(state.profiles);
    renderBigProfileSelector();
    const selector = $('profile-selector');
    if (selector) selector.style.display = 'flex';
  }

  async function googleLoginUltimate() {
    if (!window.firebase || !window.auth) return alert('Firebase hindi pa loaded. Refresh muna.');
    const provider = window.googleProvider || new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    localStorage.setItem('cineflex_google_redirect_pending', '1');
    localStorage.setItem('cineflex_google_redirect_time', String(Date.now()));
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      if (isMobile) {
        await auth.signInWithRedirect(provider);
        return;
      }
      const result = await auth.signInWithPopup(provider);
      localStorage.removeItem('cineflex_google_redirect_pending');
      window.currentUser = result.user;
      if (typeof closeLoginModal === 'function') closeLoginModal();
      await loadProfilesUltimate();
    } catch (e) {
      console.error('Google login ultimate error:', e);
      localStorage.removeItem('cineflex_google_redirect_pending');
      let msg = e.message || 'Google login failed.';
      if (e.code === 'auth/unauthorized-domain') msg = 'Firebase Authorized domains kulang: idagdag cineflex.online at www.cineflex.online.';
      if (e.code === 'auth/operation-not-allowed') msg = 'Enable Google provider sa Firebase Authentication > Sign-in method.';
      alert(msg);
    }
  }

  function bindClicks() {
    document.addEventListener('click', function (e) {
      const del = e.target.closest('[data-delete-profile]');
      if (del) { e.preventDefault(); e.stopPropagation(); return deleteProfileUltimate(del.dataset.deleteProfile); }
      const edit = e.target.closest('[data-edit-profile]');
      if (edit) { e.preventDefault(); e.stopPropagation(); return editProfileUltimate(edit.dataset.editProfile); }
      const sel = e.target.closest('[data-select-profile]');
      if (sel && !state.manageMode) { e.preventDefault(); return selectProfileUltimate(sel.dataset.selectProfile, true); }
    });
  }

  function patchDrawerToggle() {
    window.openMenuDrawer = function () {
      const drawer = $('menu-drawer'), backdrop = $('drawer-backdrop');
      if (!drawer) return;
      const open = !drawer.classList.contains('active');
      drawer.classList.toggle('active', open);
      if (backdrop) backdrop.classList.toggle('active', open);
      document.body.classList.toggle('drawer-open', open);
      updateDrawerAccount();
    };
    window.closeMenuDrawer = function () {
      const drawer = $('menu-drawer'), backdrop = $('drawer-backdrop');
      if (drawer) drawer.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
      document.body.classList.remove('drawer-open');
    };
  }

  function expose() {
    window.loadProfiles = loadProfilesUltimate;
    window.showProfileSelector = showProfileSelectorUltimate;
    window.selectProfile = selectProfileUltimate;
    window.createProfile = createProfileUltimate;
    window.toggleManageProfiles = toggleManageProfilesUltimate;
    window.deleteCineFlexProfile = deleteProfileUltimate;
    window.googleLogin = googleLoginUltimate;
    window.CineFlexUltimate = { loadProfiles: loadProfilesUltimate, state };
  }

  function initAuthListeners() {
    if (!window.auth) return;
    auth.onAuthStateChanged(async function (u) {
      window.currentUser = u;
      state.authReady = true;
      if (u) {
        localStorage.removeItem('cineflex_google_redirect_pending');
        await loadProfilesUltimate();
        updateDrawerAccount();
        if (typeof continuePendingPlayback === 'function') continuePendingPlayback();
      } else {
        state.profiles = [];
        state.currentProfileId = null;
        localStorage.removeItem('cineflex_profile');
        updateDrawerAccount();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensurePlayerCloseButton();
    patchModalClose();
    patchDrawerToggle();
    expose();
    bindClicks();
    initAuthListeners();
    updateDrawerAccount();
  });
})();
