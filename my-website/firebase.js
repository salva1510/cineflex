// ================================
// CINEFLEX FIREBASE ENGINE v2.0
// ================================

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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

// Persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
auth.getRedirectResult()

.then((result) => {

    if (result.user) {
        console.log("Google Redirect Login Success");
    }

})

.catch((error) => {

    console.error(error);

});

// Current User
let currentUser = null;

// Listen Login State
auth.onAuthStateChanged(async (user) => {

    currentUser = user;

    if (user) {

        console.log("✅ Logged In:", user.displayName);

        await loadProfiles();

        window.dispatchEvent(
            new CustomEvent("cineflex-login", {
                detail: user
            })
        );

    } else {

        currentProfile = null;

        window.dispatchEvent(
            new CustomEvent("cineflex-logout")
        );

    }

});
