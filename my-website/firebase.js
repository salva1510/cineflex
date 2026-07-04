//
// ======================================
// CINEFLEX FIREBASE CORE v5.0
// ======================================
// FIXED: auth + db + safety + null guards
//

// Firebase init (expected already loaded in HTML)
const firebaseConfig = {
    // ❗ PALITAN MO ITO SA CONFIG MO
};

// Initialize Firebase safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ======================================
// GLOBAL SAFE STORAGE
// ======================================

window.auth = auth;
window.db = db;
window.googleProvider = googleProvider;

// ======================================
// SAFE USER DATA STORAGE
// ======================================

window.userDataCache = {
    watchlist: [],
    continueWatching: []
};

// ======================================
// SAFE FIRESTORE HELPERS
// ======================================

function getUserRef() {
    if (!auth.currentUser) return null;
    return db.collection("users").doc(auth.currentUser.uid);
}

// ======================================
// SAFE LOAD USER DATA
// ======================================

async function loadUserData() {

    const userRef = getUserRef();
    if (!userRef) return;

    try {

        const doc = await userRef
            .collection("profiles")
            .doc(window.currentProfile || "default")
            .get();

        if (!doc.exists) {

            window.userDataCache.watchlist = [];
            window.userDataCache.continueWatching = [];

            localStorage.setItem("cineflex_watchlist", "[]");
            localStorage.setItem("cineflex_recent", "[]");

            if (typeof updateContinueUI === "function") {
                updateContinueUI();
            }

            return;
        }

        const data = doc.data();

        window.userDataCache.watchlist = data.watchlist || [];
        window.userDataCache.continueWatching = data.continueWatching || [];

        localStorage.setItem("cineflex_watchlist", JSON.stringify(window.userDataCache.watchlist));
        localStorage.setItem("cineflex_recent", JSON.stringify(window.userDataCache.continueWatching));

        if (typeof updateContinueUI === "function") {
            updateContinueUI();
        }

    } catch (err) {
        console.error("loadUserData error:", err);
    }
}

// ======================================
// SAFE SAVE USER DATA
// ======================================

async function saveUserData() {

    const userRef = getUserRef();
    if (!userRef) return;

    try {

        await userRef
            .collection("profiles")
            .doc(window.currentProfile || "default")
            .set({
                watchlist: JSON.parse(localStorage.getItem("cineflex_watchlist") || "[]"),
                continueWatching: JSON.parse(localStorage.getItem("cineflex_recent") || "[]")
            }, { merge: true });

    } catch (err) {
        console.error("saveUserData error:", err);
    }
}

// ======================================
// SYNC HELPERS
// ======================================

function syncLocalToCloud() {
    saveUserData();
}

function syncCloudToLocal() {
    loadUserData();
}

// Auto sync every 20 seconds
setInterval(() => {
    if (auth.currentUser && window.currentProfile) {
        saveUserData();
    }
}, 20000);

console.log("🔥 Cineflex Firebase Core v5 loaded");
