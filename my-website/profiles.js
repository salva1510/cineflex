// ======================================
// CINEFLEX PROFILE SYSTEM v6 (NETFLIX UPGRADE)
// ======================================

let currentProfile = null;
let profiles = [];

// ======================================
// LOAD PROFILES
// ======================================

async function loadProfiles() {
    if (!auth.currentUser) return;

    try {
        const snap = await db
            .collection("users")
            .doc(auth.currentUser.uid)
            .collection("profiles")
            .get();

        profiles = [];

        snap.forEach(doc => {
            profiles.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // create default if empty
        if (profiles.length === 0) {
            await createProfileAuto();
            return;
        }

        const saved = localStorage.getItem("cineflex_profile");

        if (saved && profiles.find(p => p.id === saved)) {
            await selectProfile(saved);
        } else {
            renderProfiles();
        }

    } catch (err) {
        console.error("Load profiles error:", err);
    }
}

// ======================================
// CREATE DEFAULT PROFILE
// ======================================

async function createProfileAuto() {
    const name =
        auth.currentUser.displayName || "Profile";

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .add({
            name,
            avatar: auth.currentUser.photoURL ||
                "https://ui-avatars.com/api/?name=" + encodeURIComponent(name),
            kids: false,
            createdAt: Date.now()
        });

    loadProfiles();
}

// ======================================
// RENDER PROFILES (NETFLIX STYLE)
// ======================================

function renderProfiles() {
    const container = document.getElementById("profiles");
    container.innerHTML = "";

    profiles.forEach(p => {
        container.innerHTML += `
        <div class="profile-card" onclick="selectProfile('${p.id}')">
            <img class="profile-avatar" src="${p.avatar}">
            <div class="profile-name">${p.name}</div>
        </div>`;
    });

    // ADD PROFILE CARD
    container.innerHTML += `
    <div class="profile-card" onclick="createProfile()">
        <div class="profile-avatar" style="
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:40px;
            background:#333;
        ">+</div>
        <div class="profile-name">Add Profile</div>
    </div>`;
}

// ======================================
// SELECT PROFILE
// ======================================

async function selectProfile(id) {
    currentProfile = id;
    localStorage.setItem("cineflex_profile", id);

    document.getElementById("profile-selector").style.display = "none";

    if (typeof loadUserData === "function") {
        await loadUserData();
    }

    console.log("Selected Profile:", currentProfile);
}

// ======================================
// CREATE PROFILE (MODERN)
// ======================================

async function createProfile() {
    const name = prompt("Enter profile name:");
    if (!name) return;

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .add({
            name,
            avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(name),
            kids: false,
            createdAt: Date.now()
        });

    loadProfiles();
}

// ======================================
// DELETE PROFILE
// ======================================

async function deleteProfile(id) {
    if (!confirm("Delete this profile?")) return;

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(id)
        .delete();

    if (currentProfile === id) {
        currentProfile = null;
        localStorage.removeItem("cineflex_profile");
    }

    loadProfiles();
}

// ======================================
// RENAME PROFILE
// ======================================

async function renameProfile(id) {
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    const newName = prompt("Rename profile:", p.name);
    if (!newName) return;

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(id)
        .update({
            name: newName
        });

    loadProfiles();
}

// ======================================
// INIT
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    loadProfiles();
});

console.log("✅ CineFlex Profiles v6 Loaded");
