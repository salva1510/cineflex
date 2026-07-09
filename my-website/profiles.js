// =========================================================
// CINEFLEX PROFILES — NETFLIX CREATE PROFILE PREMIUM v10
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
    selectedAvatar: DEFAULT_AVATARS[0]
  };

  const $ = (id) => document.getElementById(id);
  const safeText = (value) => String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

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
            <div class="profile-fields"><input type="text" id="newProfileName" placeholder="Profile name" maxlength="20" autocomplete="off"><label class="kids-option"><input type="checkbox" id="kidsProfile"><span>Kids Profile</span></label></div>
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
      box.insertAdjacentHTML("beforeend", `<div class="profile-actions"><button class="cf-profile-btn ghost" onclick="toggleManageProfiles()"><i class="fa-solid fa-pen"></i> Manage Profiles</button><button class="cf-profile-btn" onclick="createProfile()"><i class="fa-solid fa-plus"></i> Add Profile</button></div>`);
    }
  }

  async function collectionRef() {
    if (!window.auth || !window.db || !auth.currentUser) return null;
    return db.collection("users").doc(auth.currentUser.uid).collection("profiles");
  }

  async function loadProfiles() {
    ensureSelector();
    ensureModal();
    if (!window.auth || !window.db || !auth.currentUser) return;
    try {
      const ref = await collectionRef();
      const snap = await ref.orderBy("createdAt", "asc").get().catch(() => ref.get());
      state.profiles = [];
      snap.forEach(doc => state.profiles.push({ id: doc.id, ...doc.data() }));
      if (!state.profiles.length) {
        await createDefaultProfile();
        return;
      }
      const saved = localStorage.getItem("cineflex_profile");
      if (saved && state.profiles.some(p => p.id === saved) && location.pathname.indexOf("profiles.html") === -1) {
        await selectProfile(saved, true);
      } else {
        renderProfiles();
      }
    } catch (err) {
      console.error("CineFlex profiles load error:", err);
      toast("Hindi ma-load ang profiles. Check Firebase rules.");
    }
  }

  async function createDefaultProfile() {
    const ref = await collectionRef();
    if (!ref) return;
    const name = (auth.currentUser.displayName || "Main").slice(0, 20);
    await ref.add({
      name,
      avatar: auth.currentUser.photoURL || DEFAULT_AVATARS[0],
      kids: false,
      watchlist: [],
      continueWatching: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await loadProfiles();
  }

  function renderProfiles() {
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
          ${state.manageMode ? `<div class="profile-manage-actions"><button class="mini-action" onclick="event.stopPropagation(); editProfile('${profile.id}')"><i class="fa-solid fa-pen"></i></button><button class="mini-action" onclick="event.stopPropagation(); deleteProfile('${profile.id}')"><i class="fa-solid fa-trash"></i></button></div>` : ''}
          <div class="profile-name">${name}</div>
        </div>`);
    });
    if (state.profiles.length < MAX_PROFILES) {
      container.insertAdjacentHTML("beforeend", `<div class="profile-card" onclick="createProfile()"><div class="profile-avatar add-avatar"><i class="fa-solid fa-plus"></i></div><div class="profile-name">Add Profile</div></div>`);
    }
    selector.style.display = "flex";
  }

  async function selectProfile(id, silent) {
    localStorage.setItem("cineflex_profile", id);
    window.CF_CURRENT_PROFILE = id;
    const selector = $("profile-selector");
    if (selector) selector.style.display = "none";
    if (typeof window.loadUserData === "function") await window.loadUserData();
    if (location.pathname.indexOf("profiles.html") !== -1 && !silent) window.location.href = "index.html";
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
  window.createProfile = function () {
    if (state.profiles.length >= MAX_PROFILES) return toast("Maximum 5 profiles lang muna.");
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
    const ref = await collectionRef();
    if (!ref) return toast("Login muna bago gumawa ng profile.");
    const payload = { name, avatar: state.selectedAvatar, kids: !!$("kidsProfile")?.checked, updatedAt: Date.now() };
    if (state.editingId) {
      await ref.doc(state.editingId).set(payload, { merge: true });
      toast("Profile updated.");
    } else {
      await ref.add({ ...payload, watchlist: [], continueWatching: [], createdAt: Date.now() });
      toast("Profile created.");
    }
    closeAddProfile();
    await loadProfiles();
  };
  window.editProfile = function (id) {
    const profile = state.profiles.find(p => p.id === id);
    if (profile) openEditor(profile);
  };
  window.deleteProfile = async function (id) {
    if (state.profiles.length <= 1) return toast("Kailangan may kahit isang profile.");
    if (!confirm("Delete this profile?")) return;
    const ref = await collectionRef();
    await ref.doc(id).delete();
    if (localStorage.getItem("cineflex_profile") === id) localStorage.removeItem("cineflex_profile");
    toast("Profile deleted.");
    await loadProfiles();
  };
  window.toggleManageProfiles = function () {
    state.manageMode = !state.manageMode;
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
    ensureModal();
    if (window.auth && auth.onAuthStateChanged) auth.onAuthStateChanged(user => user && loadProfiles());
    else loadProfiles();
  });

  console.log("✅ CineFlex Profiles Premium v10 Loaded");
})();
