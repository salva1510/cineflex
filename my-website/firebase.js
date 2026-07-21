// ===========================================
// CINEFLEX FIREBASE ENGINE v7
// ===========================================

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDdLmGBrgmr8y26GblAhvdcV60eUfPgILk",
    authDomain: "cineflex-login-b8380.firebaseapp.com",
    projectId: "cineflex-login-b8380",
    storageBucket: "cineflex-login-b8380.firebasestorage.app",
    messagingSenderId: "453926417888",
    appId: "1:453926417888:web:4c13aefa06f5aed559e785",
    measurementId: "G-95K8CPHPFM"
};

// Prevent duplicate initialization
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// Expose services so every CineFlex script uses the same Firebase session
window.auth = auth;
window.db = db;
window.googleProvider = null;
window.cineflexAuthReady = false;

// Google Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
window.googleProvider = googleProvider;
auth.useDeviceLanguage();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

// Persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
.catch(console.error);

// Current User
let currentUser = null;

// ===========================================
// AUTH STATE + GOOGLE REDIRECT HANDLER v7
// ===========================================

window.cineflexAuthReady = false;
window.cineflexRedirectChecked = false;
window.currentUser = auth.currentUser || null;

function hasPendingGoogleRedirect() {
    const pending = localStorage.getItem("cineflex_google_redirect_pending") === "1";
    const pendingTime = Number(localStorage.getItem("cineflex_google_redirect_time") || 0);
    return pending && Date.now() - pendingTime < 180000;
}

function clearPendingGoogleRedirect() {
    localStorage.removeItem("cineflex_google_redirect_pending");
    localStorage.removeItem("cineflex_google_redirect_time");
}

async function bootCineFlexAuth() {
    window.cineflexAuthReady = false;
    window.cineflexRedirectChecked = false;

    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (e) {
        console.warn("Firebase persistence warning:", e);
    }

    try {
        const result = await auth.getRedirectResult();
        window.cineflexRedirectChecked = true;
        if (result && result.user) {
            clearPendingGoogleRedirect();
            window.currentUser = result.user;
            localStorage.setItem("cineflex_last_login_email", result.user.email || "google");
            console.log("✅ Google Redirect Login:", result.user.email);
            window.dispatchEvent(new CustomEvent("cineflex-login", { detail: result.user }));
        }
    } catch (e) {
        window.cineflexRedirectChecked = true;
        clearPendingGoogleRedirect();
        console.error("Google redirect result error:", e);
        window.dispatchEvent(new CustomEvent("cineflex-auth-error", { detail: e }));
    }

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        window.currentUser = user;
        window.cineflexAuthReady = true;

        if (user) {
            clearPendingGoogleRedirect();
            localStorage.setItem("cineflex_last_login_email", user.email || "google");
            console.log("✅ Logged In:", user.email);
            window.dispatchEvent(new CustomEvent("cineflex-login", { detail: user }));
            return;
        }

        // Huwag muna gawing Guest habang kababalik lang galing Google redirect.
        if (!window.cineflexRedirectChecked || hasPendingGoogleRedirect()) {
            console.log("⏳ Waiting for Google redirect/session restore...");
            window.dispatchEvent(new Event("cineflex-auth-pending"));
            return;
        }

        console.log("❌ Logged Out");
        localStorage.removeItem("cineflex_profile");
        window.dispatchEvent(new Event("cineflex-logout"));
    });
}

bootCineFlexAuth();

// ===========================================
// USER DATA
// ===========================================

async function saveCloudData(profileId, data) {

    if (!auth.currentUser) return;

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(profileId)
        .set(data, {
            merge: true
        });

}

async function loadCloudData(profileId) {

    if (!auth.currentUser) return null;

    const doc = await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(profileId)
        .get();

    if (!doc.exists) return null;

    return doc.data();

}

// ===========================================
// PROFILES
// ===========================================

async function getProfiles() {

    if (!auth.currentUser) return [];

    const snap = await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .get();

    let list = [];

    snap.forEach(doc => {

        list.push({

            id: doc.id,

            ...doc.data()

        });

    });

    return list;

}

async function createProfile(name, avatar) {

    if (!auth.currentUser) return;

    const ref = db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc();

    await ref.set({

        name,

        avatar,

        watchlist: [],

        continueWatching: [],

        favorites: [],

        history: [],

        createdAt: firebase.firestore.FieldValue.serverTimestamp()

    });

    return ref.id;

}

async function deleteProfile(profileId) {

    if (!auth.currentUser) return;

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc(profileId)
        .delete();

}

// ===========================================
// LOGOUT
// ===========================================

async function logout() {

    localStorage.removeItem("cineflex_profile");

    await auth.signOut();

}

// ===========================================
// READY
// ===========================================

console.log("==================================");
console.log(" Cineflex Firebase Engine v6");
console.log(" Firebase Connected");
console.log(" Cloud Sync Ready");
console.log(" Google Login Ready");
console.log("==================================");
