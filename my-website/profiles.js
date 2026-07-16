// =========================================================
// CINEFLEX PROFILES — NETFLIX PROFILE MANAGEMENT v15
// Safe drop-in: works on profiles.html and index.html.
// =========================================================
(function () {
  const MAX_PROFILES = 5;
  const DEFAULT_AVATARS = [
    "https://api.dicebear.com/9.x/adventurer/svg?seed=CineFlexRed&backgroundColor=e50914",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=CineFlexBlue&backgroundColor=1f6feb",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=CineFlexGold&backgroundColor=f2cc60",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=CineFlexPurple&backgroundColor=8957e5",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=CineFlexGreen&backgroundColor=2ea043",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=CineFlexPink&backgroundColor=db61a2",
    "https://api.dicebear.com/9.x/bottts/svg?seed=CineFlexBot&backgroundColor=111111",
    "https://api.dicebear.com/9.x/thumbs/svg?seed=CineFlexKids&backgroundColor=ffd400",
    "https://api.dicebear.com/9.x/fun-emoji/svg?seed=CineFlexHero&backgroundColor=e50914",
    "https://api.dicebear.com/9.x/shapes/svg?seed=CineFlexNeon&backgroundColor=0d1117",
    "https://api.dicebear.com/9.x/pixel-art/svg?seed=CineFlexRetro&backgroundColor=161b22",
    "https://api.dicebear.com/9.x/lorelei/svg?seed=CineFlexStar&backgroundColor=30363d"
  ];

  let state = {
    profiles: [],
    manageMode: false,
    editingId: null,
    selectedAvatar: DEFAULT_AVATARS[0],
    defaultProfileId: localStorage.getItem("cineflex_default_profile") || ""
  };

  const $ = (id) => document.getElementById(id);
  const safeText = (value) => String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const isProfilesPage = () => location.pathname.indexOf("profiles.html") !== -1;

  function toast(message) {
    const old = document.querySelector(".toast-profile");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "toast-profile";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  function ensureModal() {
    if ($("addProfileModal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div id="addProfileModal" class="profile-modal hidden" aria-hidden="true">
        <div class="profile-modal-content">
          <button class="modal-x" onclick="closeAddProfile()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          <div class="modal-kicker">CINEFLEX PROFILE</div>
          <h2 id="profileModalTitle">Add Profile</h2>
          <p class="modal-copy">Gumawa ng profile na parang Netflix: sariling avatar, kids mode, watchlist at continue watching.</p>
          <div class="profile-editor-row">
            <div class="selected-avatar-wrap"><img id="selectedAvatarPreview" class="selected-avatar" alt="Selected avatar"><span id="kidsBadgePreview" class="kids-badge-preview hidden">KIDS</span></div>
            <div class="profile-fields"><input type="text" id="newProfileName" placeholder="Profile name" maxlength="20" autocomplete="off"><label class="kids-option"><input type="checkbox" id="kidsProfile"><span>Kids Profile</span></label><label class="kids-option"><input type="checkbox" id="defaultProfile"><span>Default Profile</span></label></div>
          </div>
          <div class="avatar-title">Choose avatar</div>
          <div id="avatarPicker" class="avatar-picker"></div>
          <div class="modal-buttons"><button class="cf-profile-btn ghost" onclick="closeAddProfile()">Cancel</button><button class="cf-profile-btn" onclick="saveProfile()" id="saveProfileBtn">Create Profile</button></div>
        </div>
      </div>`);
  }

  function ensureSelector() {
    const selector = $("profile-selector");
    const box = selector ? selector.querySelector(".profile-box") : null;
    if (box && !box.querySelector(".profile-brand")) {
      box.insertAdjacentHTML("afterbegin", `<div class="profile-brand">CINEFLEX</div>`);
    }
    if (box && !box.querySelector(".profile-subtitle")) {
      const h1 = box.querySelector("h1");
      h1 && h1.insertAdjacentHTML("afterend", `<p class="profile-subtitle">Piliin ang profile mo o gumawa ng bagong profile.</p>`);
    }
    if (selector && !selector.querySelector(".profile-aurora")) {
      selector.insertAdjacentHTML("afterbegin", `<div class="profile-aurora"></div>`);
    }
    if (box && !box.querySelector(".profile-actions")) {
      const oldButton = Array.from(box.children).find(el => el.tagName === "BUTTON");
      if (oldButton) oldButton.remove();
      box.insertAdjacentHTML("beforeend", `<div class="profile-actions"><button class="cf-profile-btn ghost" onclick="toggleManageProfiles()" id="manageProfilesBtn"><i class="fa-solid fa-pen"></i> Manage Profiles</button><button class="cf-profile-btn" onclick="createProfile()"><i class="fa-solid fa-plus"></i> Add Profile</button></div>`);
    }
  }


  function updateDrawerAccount(user) {
    const loginActions = $("drawerLoginActions");
    const accountActions = $("drawerAccountActions");
    const logoutBtn = $("logoutBtn");
    const photo = $("userPhoto");
    const name = $("userName");
    const email = $("userEmail");
    const badge = $("userBadge");
    const activeProfile = state.profiles.find(p => p.id === localStorage.getItem("cineflex_profile"));

    if (user) {
      if (photo) photo.src = activeProfile?.avatar || user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || user.email || "User") + "&background=e50914&color=fff";
      if (name) name.textContent = activeProfile?.name || user.displayName || "CineFlex User";
      if (email) email.textContent = user.email || "Logged in";
      if (badge) {
        const vip = !!window.CineFlexMembership?.isVip?.();
        badge.textContent = vip ? "👑 PREMIUM MEMBER" : (activeProfile?.kids ? "KIDS PROFILE" : "FREE MEMBER");
        badge.classList.toggle("cf-vip-badge", vip);
        badge.classList.toggle("cf-free-badge", !vip);
      }
      if (loginActions) loginActions.style.display = "none";
      if (accountActions) accountActions.style.display = "block";
      if (logoutBtn) logoutBtn.style.display = "flex";
    } else {
      if (photo) photo.src = "https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff";
      if (name) name.textContent = "Guest";
      if (email) email.textContent = "Not logged in";
      if (badge) badge.textContent = "FREE MEMBER";
      if (loginActions) loginActions.style.display = "grid";
      if (accountActions) accountActions.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  }

  function ensureDrawerProfiles() {
    const drawerLinks = document.querySelector("#menu-drawer .drawer-links");
    if (!drawerLinks || $("drawer-profiles")) return;
    drawerLinks.insertAdjacentHTML("afterbegin", `
      <div class="drawer-section drawer-profile-section">
        <div class="drawer-profile-head">
          <span>Who's Watching?</span>
          <button onclick="toggleManageProfiles()" type="button">Manage</button>
        </div>
        <div id="drawer-profiles" class="drawer-profiles"></div>
        <button class="drawer-add-profile" onclick="createProfile()" type="button"><i class="fa-solid fa-plus"></i> Add Profile</button>
      </div>`);
  }

  function renderDrawerProfiles() {
    ensureDrawerProfiles();
    updateDrawerAccount((window.auth && auth.currentUser) || null);
    const wrap = $("drawer-profiles");
    if (!wrap) return;
    const activeId = localStorage.getItem("cineflex_profile");
    wrap.innerHTML = "";
    state.profiles.forEach(profile => {
      const name = safeText(profile.name || "Profile");
      const avatar = safeText(profile.avatar || DEFAULT_AVATARS[0]);
      const active = profile.id === activeId ? "active" : "";
      wrap.insertAdjacentHTML("beforeend", `
        <button type="button" class="drawer-profile ${active}" onclick="selectProfile('${profile.id}')">
          <img src="${avatar}" alt="${name}">
          <span>${name}</span>
          ${profile.kids ? '<em>KIDS</em>' : ''}
          ${state.manageMode ? `<b title="Edit" onclick="event.stopPropagation(); editProfile('${profile.id}')"><i class="fa-solid fa-pen"></i></b><b title="Delete" class="delete" onclick="event.stopPropagation(); deleteProfile('${profile.id}')"><i class="fa-solid fa-trash"></i></b><b title="Default" class="star ${profile.id === state.defaultProfileId ? 'active' : ''}" onclick="event.stopPropagation(); setDefaultProfile('${profile.id}')"><i class="fa-solid fa-star"></i></b>` : ''}
        </button>`);
    });
    const addBtn = document.querySelector(".drawer-add-profile");
    if (addBtn) addBtn.style.display = state.profiles.length >= MAX_PROFILES ? "none" : "flex";
  }

  function waitForFirebaseUser(timeoutMs = 9000) {
    return new Promise((resolve) => {
      const started = Date.now();
      const getUser = () => (window.auth && window.auth.currentUser) || (typeof auth !== "undefined" && auth.currentUser) || null;
      const existing = getUser();
      if (existing) return resolve(existing);

      let done = false;
      const finish = (user) => {
        if (done) return;
        done = true;
        resolve(user || getUser());
      };

      try {
        const authObj = window.auth || (typeof auth !== "undefined" ? auth : null);
        if (authObj && typeof authObj.onAuthStateChanged === "function") {
          const unsub = authObj.onAuthStateChanged((user) => {
            if (user) {
              try { unsub && unsub(); } catch(e) {}
              finish(user);
            }
          });
        }
      } catch(e) {}

      const timer = setInterval(() => {
        const user = getUser();
        if (user || Date.now() - started > timeoutMs) {
          clearInterval(timer);
          finish(user);
        }
      }, 180);
    });
  }

  async function collectionRef(showMessage = false) {
    const authObj = window.auth || (typeof auth !== "undefined" ? auth : null);
    const dbObj = window.db || (typeof db !== "undefined" ? db : null);
    if (!authObj || !dbObj) {
      if (showMessage) toast("Firebase hindi pa loaded. Refresh muna kung kailangan.");
      return null;
    }
    const user = authObj.currentUser || await waitForFirebaseUser();
    if (!user) {
      if (showMessage) toast("Hindi pa ready ang Google login session. Sandali lang tapos subukan ulit.");
      return null;
    }
    return dbObj.collection("users").doc(user.uid).collection("profiles");
  }

  async function loadProfiles() {
    ensureSelector();
    ensureModal();
    try {
      const ref = await collectionRef(false);
      if (!ref) return;
      const snap = await ref.orderBy("createdAt", "asc").get().catch(() => ref.get());
      state.profiles = [];
      snap.forEach(doc => state.profiles.push({ id: doc.id, ...doc.data() }));
      if (!state.profiles.length) {
        await createDefaultProfile();
        return;
      }
      const firebaseDefault = state.profiles.find(p => p.isDefault)?.id;
      state.defaultProfileId = localStorage.getItem("cineflex_default_profile") || firebaseDefault || state.profiles[0].id;
      localStorage.setItem("cineflex_default_profile", state.defaultProfileId);
      const saved = localStorage.getItem("cineflex_profile");
      renderDrawerProfiles();
      if (!isProfilesPage()) {
        const usableId = (saved && state.profiles.some(p => p.id === saved)) ? saved : (state.defaultProfileId || state.profiles[0].id);
        await selectProfile(usableId, true);
        return;
      }
      renderProfiles();
    } catch (err) {
      console.error("CineFlex profiles load error:", err);
      toast("Hindi ma-load ang profiles. Check Firebase rules.");
    }
  }

  async function createDefaultProfile() {
    const authObj = window.auth || (typeof auth !== "undefined" ? auth : null);
    const user = authObj?.currentUser || await waitForFirebaseUser();
    const ref = await collectionRef(false);
    if (!ref || !user) return;
    const name = (user.displayName || "Main").slice(0, 20);
    await ref.add({
      name,
      avatar: user.photoURL || DEFAULT_AVATARS[0],
      kids: false,
      watchlist: [],
      continueWatching: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true
    });
    await loadProfiles();
  }

  function renderProfiles() {
    renderDrawerProfiles();
    if (!isProfilesPage()) {
      const selectorOnly = $("profile-selector");
      if (selectorOnly) selectorOnly.style.display = "none";
      return;
    }
    const selector = $("profile-selector");
    const container = $("profiles") || $("profiles-list");
    if (!container || !selector) return;
    container.innerHTML = "";
    state.profiles.forEach(profile => {
      const name = safeText(profile.name || "Profile");
      const avatar = safeText(profile.avatar || DEFAULT_AVATARS[0]);
      container.insertAdjacentHTML("beforeend", `
        <div class="profile-card" onclick="selectProfile('${profile.id}')">
          <img class="profile-avatar" src="${avatar}" alt="${name}">
          ${profile.kids ? '<span class="profile-kids-pill">KIDS</span>' : ''}
          ${profile.id === state.defaultProfileId ? '<span class="profile-default-pill"><i class="fa-solid fa-star"></i> DEFAULT</span>' : ''}
          ${state.manageMode ? `<div class="profile-manage-actions"><button class="mini-action" title="Edit" onclick="event.stopPropagation(); editProfile('${profile.id}')"><i class="fa-solid fa-pen"></i><span>Edit</span></button><button class="mini-action danger" title="Delete" onclick="event.stopPropagation(); deleteProfile('${profile.id}')"><i class="fa-solid fa-trash"></i><span>Delete</span></button><button class="mini-action gold" title="Set default" onclick="event.stopPropagation(); setDefaultProfile('${profile.id}')"><i class="fa-solid fa-star"></i><span>Default</span></button></div>` : ''}
          <div class="profile-name">${name}</div>
        </div>`);
    });
    if (state.profiles.length < MAX_PROFILES) {
      container.insertAdjacentHTML("beforeend", `<div class="profile-card" onclick="createProfile()"><div class="profile-avatar add-avatar"><i class="fa-solid fa-plus"></i></div><div class="profile-name">Add Profile</div></div>`);
    }
    selector.style.display = "flex";
  }

  async function selectProfile(id, silent) {
    const previousProfileId = localStorage.getItem("cineflex_profile") || "";
    const isActualSwitch = previousProfileId !== id;

    // Firebase may fire auth callbacks more than once during login/session restore.
    // Do not announce a profile switch when the same profile is already active,
    // otherwise profile-personalization will keep reloading the homepage.
    if (isActualSwitch) {
      window.dispatchEvent(new CustomEvent("cineflex:before-profile-switch", { detail: { from: previousProfileId, to: id } }));
      localStorage.setItem("cineflex_profile", id);
    }

    window.CF_CURRENT_PROFILE = id;
    const selector = $("profile-selector");
    if (selector) selector.style.display = "none";
    renderDrawerProfiles();
    if (typeof window.loadUserData === "function") await window.loadUserData();
    if (typeof window.closeMenuDrawer === "function" && !silent) window.closeMenuDrawer();

    if (isActualSwitch) {
      window.dispatchEvent(new CustomEvent("cineflex:profile-switched", { detail: { from: previousProfileId, to: id } }));
    }

    if (isProfilesPage() && !silent) window.location.href = "index.html";
  }

  function renderAvatarPicker() {
    const picker = $("avatarPicker");
    const preview = $("selectedAvatarPreview");
    if (!picker || !preview) return;
    preview.src = state.selectedAvatar;
    picker.innerHTML = DEFAULT_AVATARS.map(src => `<button type="button" class="avatar-choice ${src === state.selectedAvatar ? 'active' : ''}" onclick="chooseAvatar('${src}')"><img src="${src}" alt="Avatar"></button>`).join("");
  }

  function openEditor(profile) {
    ensureModal();
    state.editingId = profile ? profile.id : null;
    state.selectedAvatar = profile?.avatar || DEFAULT_AVATARS[Math.min(state.profiles.length, DEFAULT_AVATARS.length - 1)];
    $("profileModalTitle").textContent = profile ? "Edit Profile" : "Add Profile";
    $("saveProfileBtn").textContent = profile ? "Save Changes" : "Create Profile";
    $("newProfileName").value = profile?.name || "";
    $("kidsProfile").checked = !!profile?.kids;
    if ($("defaultProfile")) $("defaultProfile").checked = profile ? (profile.id === state.defaultProfileId || !!profile.isDefault) : false;
    $("kidsBadgePreview").classList.toggle("hidden", !$("kidsProfile").checked);
    renderAvatarPicker();
    $("addProfileModal").classList.remove("hidden");
    $("addProfileModal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("newProfileName")?.focus(), 50);
  }

  window.chooseAvatar = function (src) {
    state.selectedAvatar = src;
    renderAvatarPicker();
  };
  window.createProfile = async function () {
    try { window.closeMenuDrawer?.(); } catch(e) {}
    document.body.classList.remove('drawer-open');

    // Firebase Auth can need a moment to restore the mobile/PWA session.
    let activeUser = (window.auth || (typeof auth !== 'undefined' ? auth : null))?.currentUser || null;
    if (!activeUser) activeUser = await waitForFirebaseUser(2200);

    if (!activeUser) {
      const reopen = () => setTimeout(() => window.createProfile(), 250);
      if (typeof window.requireLogin === 'function') window.requireLogin(reopen);
      else if (typeof window.openLoginModal === 'function') window.openLoginModal();
      else toast('Mag-login muna para gumawa ng profile.');
      return;
    }

    if (state.profiles.length >= MAX_PROFILES) return toast("Maximum 5 profiles lang muna.");
    ensureModal();
    openEditor(null);
  };
  window.closeAddProfile = function () {
    const modal = $("addProfileModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
  };
  window.saveProfile = async function () {
    const name = ($("newProfileName")?.value || "").trim().slice(0, 20);
    if (!name) return toast("Lagyan muna ng profile name.");
    const saveBtn = $("saveProfileBtn");
    const originalText = state.editingId ? "Save Changes" : "Create Profile";
    try {
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }
      const ref = await collectionRef(true);
      if (!ref) return;
      const makeDefault = !!$("defaultProfile")?.checked;
      const payload = { name, avatar: state.selectedAvatar, kids: !!$("kidsProfile")?.checked, updatedAt: Date.now(), isDefault: makeDefault };
      if (makeDefault) {
        const snap = await ref.get();
        const jobs = [];
        snap.forEach(doc => jobs.push(ref.doc(doc.id).set({ isDefault: false }, { merge: true })));
        await Promise.all(jobs);
      }
      if (state.editingId) {
        await ref.doc(state.editingId).set(payload, { merge: true });
        if (makeDefault) {
          state.defaultProfileId = state.editingId;
          localStorage.setItem("cineflex_default_profile", state.editingId);
        }
        toast("Profile updated.");
      } else {
        const newDoc = await ref.add({ ...payload, watchlist: [], continueWatching: [], createdAt: Date.now() });
        if (makeDefault || state.profiles.length === 0) {
          state.defaultProfileId = newDoc.id;
          localStorage.setItem("cineflex_default_profile", newDoc.id);
          await ref.doc(newDoc.id).set({ isDefault: true }, { merge: true });
        }
        toast("Profile created.");
      }
      closeAddProfile();
      await loadProfiles();
    } catch (err) {
      console.error("CineFlex save profile error:", err);
      toast("Hindi na-save ang profile. Check Firebase rules o internet.");
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalText; }
    }
  };
  window.editProfile = function (id) {
    const profile = state.profiles.find(p => p.id === id);
    if (profile) openEditor(profile);
  };
  window.deleteProfile = async function (id) {
    const profile = state.profiles.find(p => p.id === id);
    if (!profile) return;
    if (state.profiles.length <= 1) return toast("Hindi puwedeng burahin ang huling profile.");
    const ok = confirm(`Delete profile "${profile.name || 'Profile'}"?

Mawawala ang profile data nito sa account mo.`);
    if (!ok) return;
    const ref = await collectionRef(true);
    if (!ref) return;
    await ref.doc(id).delete();
    if (localStorage.getItem("cineflex_profile") === id) localStorage.removeItem("cineflex_profile");
    if (state.defaultProfileId === id) {
      const nextProfile = state.profiles.find(p => p.id !== id);
      state.defaultProfileId = nextProfile?.id || "";
      if (state.defaultProfileId) {
        localStorage.setItem("cineflex_default_profile", state.defaultProfileId);
        await ref.doc(state.defaultProfileId).set({ isDefault: true }, { merge: true });
      } else {
        localStorage.removeItem("cineflex_default_profile");
      }
    }
    toast("Profile deleted.");
    await loadProfiles();
  };
  window.setDefaultProfile = async function (id) {
    const ref = await collectionRef(true);
    if (!ref) return;
    const snap = await ref.get();
    const jobs = [];
    snap.forEach(doc => jobs.push(ref.doc(doc.id).set({ isDefault: doc.id === id }, { merge: true })));
    await Promise.all(jobs);
    state.defaultProfileId = id;
    localStorage.setItem("cineflex_default_profile", id);
    toast("Default profile set.");
    await loadProfiles();
  };
  window.toggleManageProfiles = function () {
    state.manageMode = !state.manageMode;
    const manageBtn = $("manageProfilesBtn");
    if (manageBtn) manageBtn.innerHTML = state.manageMode ? '<i class="fa-solid fa-check"></i> Done' : '<i class="fa-solid fa-pen"></i> Manage Profiles';
    renderDrawerProfiles();
    renderProfiles();
  };
  window.selectProfile = selectProfile;
  window.loadProfiles = loadProfiles;

  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "kidsProfile") $("kidsBadgePreview")?.classList.toggle("hidden", !e.target.checked);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAddProfile();
    if (e.key === "Enter" && !$("addProfileModal")?.classList.contains("hidden")) saveProfile();
  });
  document.addEventListener("DOMContentLoaded", () => {
    ensureSelector();
    ensureDrawerProfiles();
    ensureModal();
    if (window.auth && auth.onAuthStateChanged) auth.onAuthStateChanged(user => { updateDrawerAccount(user); if (user) loadProfiles(); });
    else loadProfiles();
  });

  // Reliable handler for all static and dynamically rendered Add Profile controls.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.drawer-add-profile, [data-cf-add-profile], .cf-add-profile-trigger');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    window.createProfile();
  }, true);

  window.addEventListener('cineflex-membership-change', () => {
    updateDrawerAccount((window.auth && auth.currentUser) || null);
  });

  console.log("✅ CineFlex Profiles Management v15.2 Loaded");
})();
