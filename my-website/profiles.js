// ======================================
// CINEFLEX PROFILE ENGINE v5.0
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

        // gumawa ng default profile kung wala pa
        if (profiles.length === 0) {

            await createDefaultProfile();
            return;

        }

        const saved =
            localStorage.getItem("cineflex_profile");

        if (
            saved &&
            profiles.find(p => p.id === saved)
        ) {

            await selectProfile(saved);

        } else {

            showProfileSelector();

        }

    } catch (e) {

        console.error(e);

    }

}

// ======================================
// DEFAULT PROFILE
// ======================================

async function createDefaultProfile() {

    const name =
        auth.currentUser.displayName ||
        "Profile";

    await db
        .collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .add({

            name,

            avatar:
                auth.currentUser.photoURL ||
                "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(name)

        });

    loadProfiles();

}

// ======================================
// SHOW PROFILE SCREEN
// ======================================

function showProfileSelector() {

    const modal =
        document.getElementById("profile-selector");

    const list =
        document.getElementById("profiles");

    if (!modal || !list) return;

    list.innerHTML = "";

    profiles.forEach(profile => {

        list.innerHTML += `

<div class="profile-card"
onclick="selectProfile('${profile.id}')">

<img
src="${profile.avatar}"
class="profile-avatar">

<div class="profile-name">
${profile.name}
</div>

</div>

`;

    });

    modal.style.display = "flex";

}

// ======================================
// SELECT PROFILE
// ======================================

async function selectProfile(id) {

    currentProfile = id;

    localStorage.setItem(
        "cineflex_profile",
        id
    );

    document.getElementById(
        "profile-selector"
    ).style.display = "none";

    if (typeof loadUserData === "function") {

        await loadUserData();

    }

    console.log(
        "Current Profile:",
        currentProfile
    );

}

// ======================================
// ADD PROFILE
// ======================================

async function createProfile() {

    const name =
        prompt("Profile name");

    if (!name) return;

    await db
        .collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .add({

            name,

            avatar:
                "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(name)

        });

    loadProfiles();

}

// ======================================
// DELETE PROFILE
// ======================================

async function deleteProfile(id) {

    if (!confirm("Delete profile?"))
        return;

    await db
        .collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(id)
        .delete();

    if (currentProfile === id) {

        currentProfile = null;

        localStorage.removeItem(
            "cineflex_profile"
        );

    }

    loadProfiles();

}

// ======================================
// RENAME PROFILE
// ======================================

async function renameProfile(id) {

    const p =
        profiles.find(x => x.id === id);

    if (!p) return;

    const newName =
        prompt(
            "New profile name",
            p.name
        );

    if (!newName) return;

    await db
        .collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(id)
        .update({

            name: newName

        });

    loadProfiles();

}

console.log("✅ Profile Engine Loaded");
