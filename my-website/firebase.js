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

// Initialize Firebase (Isang beses lang dapat tinatawag)
const app = firebase.initializeApp(firebaseConfig);

// Services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: "select_account"
});

// Ligtas na i-set ang Local Persistence upang manatiling nakalogin ang user kahit i-refresh ang browser
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
      console.log("🔒 Auth Persistence set to LOCAL successfully");
  })
  .catch((error) => {
      console.error("⚠️ Auth Persistence Error:", error.message);
  });

// Current User State Holder
let currentUser = null;

// Listen Login State
auth.onAuthStateChanged((user) => {
    currentUser = user;

    if (user) {
        console.log("✅ Logged In:", user.displayName || user.email);
        
        window.dispatchEvent(
            new CustomEvent("cineflex-login", {
                detail: user
            })
        );
    } else {
        console.log("❌ Logged Out");
        
        window.dispatchEvent(
            new CustomEvent("cineflex-logout")
        );
    }
});
