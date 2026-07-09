// ======================================
// CINEFLEX PROFILE SYSTEM v7.0 - POLISHED
// Netflix-style profile selection with Firestore sync
// ======================================

var currentProfile = window.currentProfile || null;
var profiles = window.profiles || [];
var profilesLoadedForUser = null;
window.currentProfile = currentProfile;
window.profiles = profiles;

function resetProfiles() {
    currentProfile = null;
    profiles = [];
    window.currentProfile = null;
    window.profiles = profiles;
    profilesLoadedForUser = null;
    localStorage.removeItem("cineflex_profile");
    localStorage.removeItem("cineflex_profile_name");
    localStorage.removeItem("cineflex_profile_avatar");
    hideProfileSelector();
}

function showProfileSelector() {
    const selector = document.getElementById("profile-selector");
    if (selector) {
        selector.style.display = "flex";
        selector.classList.remove("hidden");
    }
}

function hideProfileSelector() {
    const selector = document.getElementById("profile-selector");
    if (selector) {
        selector.style.display = "none";
        selector.classList.add("hidden");
    }
}

function profileAvatar(name, seed = "") {
    return "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || "CineFlex") + "&background=e50914&color=fff&bold=true&size=256" + (seed ? "&length=1" : "");
}

function getSavedProfileId() {
    return localStorage.getItem("cineflex_profile");
}

function saveProfileLocal(profile) {
    if (!profile) return;
    localStorage.setItem("cineflex_profile", profile.id);
    localStorage.setItem("cineflex_profile_name", profile.name || "Profile");
    localStorage.setItem("cineflex_profile_avatar", profile.avatar || profileAvatar(profile.name));
}

async function ensureDefaultProfile() {
    if (typeof auth === "undefined" || !auth.currentUser) return null;

    const user = auth.currentUser;
    const defaultName = user.displayName || (user.email ? user.email.split("@")[0] : "Main");

    const ref = await db.collection("users")
        .doc(user.uid)
        .collection("profiles")
        .add({
            name: defaultName,
            avatar: user.photoURL || profileAvatar(defaultName),
            kids: false,
            watchlist: [],
            continueWatching: [],
            favorites: [],
            history: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    return ref.id;
}

async function loadProfiles(options = {}) {
    const forceSelector = !!options.forceSelector;

    if (typeof auth === "undefined" || !auth.currentUser) {
        resetProfiles();
        return;
    }

    try {
        const uid = auth.currentUser.uid;
        const snap = await db.collection("users")
            .doc(uid)
            .collection("profiles")
            .orderBy("createdAt", "asc")
            .get();

        profiles = [];
        window.profiles = profiles;
        snap.forEach(doc => profiles.push({ id: doc.id, ...doc.data() }));

        if (profiles.length === 0) {
            await ensureDefaultProfile();
            return loadProfiles({ forceSelector: true });
        }

        profilesLoadedForUser = uid;
        renderProfiles();

        const saved = getSavedProfileId();
        const savedProfile = profiles.find(p => p.id === saved);

        if (savedProfile && !forceSelector) {
            await selectProfile(savedProfile.id, { silent: true });
            return;
        }

        showProfileSelector();
    } catch (error) {
        console.error("Load profiles error:", error);
        showProfileSelector();
        const container = document.getElementById("profiles");
        if (container) {
            container.innerHTML = `<div class="profile-error">Hindi ma-load ang profiles. Check internet/Firebase rules.</div>`;
        }
    }
}

function renderProfiles() {
    const container = document.getElementById("profiles");
    if (!container) return;

    container.innerHTML = "";

    profiles.forEach(profile => {
        const safeName = (profile.name || "Profile").replace(/[<>&"']/g, "");
        const avatar = profile.avatar || profileAvatar(safeName);
        const kidsBadge = profile.kids ? `<span class="profile-chip">Kids</span>` : "";

        container.insertAdjacentHTML("beforeend", `
            <div class="profile-card" data-profile-id="${profile.id}">
                <button class="profile-main" onclick="selectProfile('${profile.id}')" aria-label="Use ${safeName}">
                    <img class="profile-avatar" src="${avatar}" alt="${safeName}" onerror="this.src='${profileAvatar(safeName)}'">
                    <span class="profile-name">${safeName}</span>
                    ${kidsBadge}
                </button>
                <div class="profile-actions">
                    <button onclick="renameProfile('${profile.id}')" title="Rename"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteProfile('${profile.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`);
    });

    if (profiles.length < 5) {
        container.insertAdjacentHTML("beforeend", `
            <div class="profile-card add-card">
                <button class="profile-main" onclick="openAddProfile()" aria-label="Add Profile">
                    <span class="profile-avatar add-avatar"><i class="fa-solid fa-plus"></i></span>
                    <span class="profile-name">Add Profile</span>
                </button>
            </div>`);
    }
}

async function selectProfile(id, options = {}) {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    currentProfile = id;
    window.currentProfile = id;
    window.currentProfileData = profile;
    saveProfileLocal(profile);
    hideProfileSelector();

    if (typeof updateAccountUI === "function") {
        updateAccountUI(auth.currentUser, profile);
    }

    if (typeof loadUserData === "function") {
        await loadUserData();
    }

    window.dispatchEvent(new CustomEvent("cineflex-profile-selected", { detail: profile }));

    if (!options.silent) {
        console.log("✅ Selected Profile:", profile.name);
    }
}

function switchProfile() {
    if (typeof auth === "undefined" || !auth.currentUser) {
        if (typeof openLoginModal === "function") openLoginModal();
        return;
    }

    localStorage.removeItem("cineflex_profile");
    currentProfile = null;
    window.currentProfile = null;
    renderProfiles();
    showProfileSelector();
    if (typeof closeMenuDrawer === "function") closeMenuDrawer();
}

function openAddProfile() {
    if (typeof auth === "undefined" || !auth.currentUser) {
        if (typeof openLoginModal === "function") openLoginModal();
        return;
    }

    const modal = document.getElementById("addProfileModal");
    if (modal) modal.classList.remove("hidden");

    const input = document.getElementById("newProfileName");
    if (input) setTimeout(() => input.focus(), 50);
}

function createProfile() {
    openAddProfile();
}

function closeAddProfile() {
    const modal = document.getElementById("addProfileModal");
    if (modal) modal.classList.add("hidden");
}

async function saveProfile() {
    if (typeof auth === "undefined" || !auth.currentUser) return;

    const input = document.getElementById("newProfileName");
    const kidsInput = document.getElementById("kidsProfile");
    const name = input ? input.value.trim() : "";
    const kids = kidsInput ? kidsInput.checked : false;

    if (!name) {
        alert("Lagyan muna ng profile name.");
        return;
    }

    if (profiles.length >= 5) {
        alert("Maximum 5 profiles lang muna.");
        return;
    }

    try {
        const ref = await db.collection("users")
            .doc(auth.currentUser.uid)
            .collection("profiles")
            .add({
                name,
                avatar: profileAvatar(name),
                kids,
                watchlist: [],
                continueWatching: [],
                favorites: [],
                history: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        closeAddProfile();
        if (input) input.value = "";
        if (kidsInput) kidsInput.checked = false;

        await loadProfiles({ forceSelector: true });
        await selectProfile(ref.id);
    } catch (error) {
        console.error("Save profile error:", error);
        alert("Hindi na-save ang profile. Pakisubukan ulit.");
    }
}

async function deleteProfile(id) {
    if (typeof auth === "undefined" || !auth.currentUser) return;

    if (profiles.length <= 1) {
        alert("Kailangan may at least 1 profile.");
        return;
    }

    const profile = profiles.find(p => p.id === id);
    const name = profile ? profile.name : "this profile";

    if (!confirm(`Delete profile "${name}"?`)) return;

    try {
        await db.collection("users")
            .doc(auth.currentUser.uid)
            .collection("profiles")
            .doc(id)
            .delete();

        if (currentProfile === id || getSavedProfileId() === id) {
            localStorage.removeItem("cineflex_profile");
            localStorage.removeItem("cineflex_profile_name");
            localStorage.removeItem("cineflex_profile_avatar");
            currentProfile = null;
        }

        await loadProfiles({ forceSelector: true });
    } catch (error) {
        console.error("Delete profile error:", error);
        alert("Hindi na-delete ang profile. Pakisubukan ulit.");
    }
}

async function renameProfile(id) {
    if (typeof auth === "undefined" || !auth.currentUser) return;

    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    const newName = prompt("Rename profile:", profile.name || "Profile");
    if (!newName || !newName.trim()) return;

    try {
        const cleanName = newName.trim().slice(0, 20);
        await db.collection("users")
            .doc(auth.currentUser.uid)
            .collection("profiles")
            .doc(id)
            .update({
                name: cleanName,
                avatar: profileAvatar(cleanName),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        await loadProfiles({ forceSelector: true });
    } catch (error) {
        console.error("Rename profile error:", error);
        alert("Hindi na-rename ang profile. Pakisubukan ulit.");
    }
}

window.addEventListener("cineflex-login", () => { if (typeof auth !== "undefined" && auth.currentUser) loadProfiles(); });
window.addEventListener("cineflex-logout", resetProfiles);

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("newProfileName");
    if (input) {
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") saveProfile();
        });
    }

    if (window.auth && auth.currentUser) {
        loadProfiles();
    }
});

console.log("✅ CineFlex Profiles v7 Loaded");
