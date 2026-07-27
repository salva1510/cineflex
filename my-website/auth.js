// ======================================
// CINEFLEX AUTH v5.0
// Stable Version
// ======================================

let pendingPlayback = null;

function getCineflexAuth() {
    return window.auth || (window.firebase && firebase.auth ? firebase.auth() : null);
}

function isLoggedIn() {
    const authService = getCineflexAuth();
    return !!(authService && authService.currentUser);
}

function requireLogin(callback) {

    if (isLoggedIn()) {
        callback();
        return;
    }

    pendingPlayback = callback;
    openLoginModal();
}

function continuePendingPlayback() {

    if (pendingPlayback) {
        const fn = pendingPlayback;
        pendingPlayback = null;
        fn();
    }

}

// ======================================
// LOGIN
// ======================================

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
}

function markGoogleLoginPending() {
    localStorage.setItem("cineflex_google_redirect_pending", "1");
    localStorage.setItem("cineflex_google_redirect_time", String(Date.now()));
}

function clearGoogleLoginPending() {
    localStorage.removeItem("cineflex_google_redirect_pending");
    localStorage.removeItem("cineflex_google_redirect_time");
}

async function googleLogin() {
    const buttons = document.querySelectorAll('button[onclick="googleLogin()"], .drawer-auth-btn.google, #drawerGoogleLoginBtn, #googleLoginBtn');
    buttons.forEach(btn => {
        btn.disabled = true;
        if (!btn.dataset.oldText) btn.dataset.oldText = btn.innerHTML;
        btn.innerHTML = "Signing in...";
    });

    try {
        const authService = getCineflexAuth();
        if (!window.firebase || !authService) {
            throw new Error("Firebase Authentication hindi pa loaded. I-refresh ang page at subukan ulit.");
        }

        const provider = window.googleProvider || new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await authService.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        try {
            const result = await authService.signInWithPopup(provider);
            clearGoogleLoginPending();
            const user = result && result.user ? result.user : authService.currentUser;
            if (!user) throw new Error("Google login completed pero walang user session.");
            window.currentUser = user;
            window.dispatchEvent(new CustomEvent("cineflex-login", { detail: user }));
            closeLoginModal();
            return user;
        } catch (popupErr) {
            console.warn("Google popup login failed:", popupErr);
            const redirectCodes = [
                "auth/popup-blocked",
                "auth/cancelled-popup-request",
                "auth/operation-not-supported-in-this-environment"
            ];
            if (!redirectCodes.includes(popupErr.code)) throw popupErr;
            markGoogleLoginPending();
            sessionStorage.setItem("cineflex_after_google_redirect", location.href);
            await authService.signInWithRedirect(provider);
            return null;
        }
    } catch (e) {
        console.error("Google login error:", e);
        clearGoogleLoginPending();
        let msg = e.message || "Google login failed.";
        if (e.code === "auth/unauthorized-domain") {
            msg = "Hindi authorized ang website domain sa Firebase. Idagdag ang cineflex.online at www.cineflex.online sa Firebase Authentication > Settings > Authorized domains.";
        } else if (e.code === "auth/operation-not-allowed") {
            msg = "Hindi naka-enable ang Google provider sa Firebase Authentication > Sign-in method.";
        } else if (e.code === "auth/network-request-failed") {
            msg = "Hindi makakonekta sa Firebase. Suriin ang internet, ad blocker, DNS, o browser privacy settings.";
        } else if (e.code === "auth/popup-closed-by-user") {
            msg = "Nasara ang Google login window bago matapos ang pag-sign in.";
        }
        alert(msg);
        return null;
    } finally {
        buttons.forEach(btn => {
            btn.disabled = false;
            if (btn.dataset.oldText) btn.innerHTML = btn.dataset.oldText;
        });
    }
}

async function emailLogin() {
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    if (!emailInput || !passwordInput) { openLoginModal(); return; }
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

        alert("Please enter email and password.");
        return;

    }

    try {

        const authService = getCineflexAuth();
        if (!authService) throw new Error("Firebase Authentication hindi pa loaded.");
        await authService.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const credential = await authService.signInWithEmailAndPassword(email, password);
        window.currentUser = credential.user;
        window.dispatchEvent(new CustomEvent("cineflex-login", { detail: credential.user }));
        closeLoginModal();

    } catch (e) {

        alert(e.message);

    }

}

async function registerAccount() {
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    if (!emailInput || !passwordInput) { openLoginModal(); return; }
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

        alert("Please enter email and password.");
        return;

    }

    try {

        const authService = getCineflexAuth();
        if (!authService) throw new Error("Firebase Authentication hindi pa loaded.");
        await authService.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const credential = await authService.createUserWithEmailAndPassword(email, password);
        window.currentUser = credential.user;
        window.dispatchEvent(new CustomEvent("cineflex-login", { detail: credential.user }));
        closeLoginModal();

    } catch (e) {

        alert(e.message);

    }

}

async function forgotPassword() {

    const email =
        document.getElementById("login-email").value.trim();

    if (!email) {

        alert("Enter your email first.");
        return;

    }

    try {

        const authService = getCineflexAuth();
        if (!authService) throw new Error("Firebase Authentication hindi pa loaded.");
        await authService.sendPasswordResetEmail(email);

        alert("Password reset email sent.");

    } catch (e) {

        alert(e.message);

    }

}

async function logout() {

    const authService = getCineflexAuth();
    if (authService) await authService.signOut();

}

// ======================================
// LOGIN MODAL
// ======================================

function openLoginModal() {

    let modal = document.getElementById("login-modal");

    if (modal) {

        modal.style.display = "flex";
        return;

    }

    document.body.insertAdjacentHTML("beforeend", `

<div id="login-modal" style="
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:rgba(0,0,0,.92);
display:flex;
justify-content:center;
align-items:center;
z-index:99999;
">

<div style="
width:95%;
max-width:420px;
background:#111;
padding:25px;
border-radius:12px;
box-sizing:border-box;
">

<h2 style="color:white;text-align:center;margin-bottom:20px;">
CINEFLEX LOGIN
</h2>

<input
id="login-email"
type="email"
placeholder="Email"
style="
width:100%;
padding:12px;
margin-bottom:12px;
background:#222;
border:none;
color:white;
border-radius:6px;
">

<input
id="login-password"
type="password"
placeholder="Password"
style="
width:100%;
padding:12px;
margin-bottom:15px;
background:#222;
border:none;
color:white;
border-radius:6px;
">

<button
onclick="emailLogin()"
style="
width:100%;
padding:12px;
background:#e50914;
color:white;
border:none;
border-radius:6px;
margin-bottom:10px;
cursor:pointer;
">
LOGIN
</button>

<button
onclick="googleLogin()"
style="
width:100%;
padding:12px;
background:white;
color:black;
border:none;
border-radius:6px;
margin-bottom:10px;
cursor:pointer;
">
Continue with Google
</button>

<button
onclick="registerAccount()"
style="
width:100%;
padding:12px;
background:#444;
color:white;
border:none;
border-radius:6px;
margin-bottom:10px;
cursor:pointer;
">
Create Account
</button>

<button
onclick="forgotPassword()"
style="
width:100%;
padding:12px;
background:transparent;
border:none;
color:#00bfff;
cursor:pointer;
">
Forgot Password?
</button>

</div>

</div>

`);

}

function closeLoginModal() {

    const modal =
        document.getElementById("login-modal");

    if (modal) {

        modal.style.display = "none";

    }

}

// ======================================
// AUTH STATE
// ======================================

function renderAuthUI(user) {
    const liveUser = (getCineflexAuth() && getCineflexAuth().currentUser) || user || null;
    const photo = document.getElementById("userPhoto");
    const name = document.getElementById("userName");
    const email = document.getElementById("userEmail");
    const badge = document.getElementById("userBadge");
    const logoutBtn = document.getElementById("logoutBtn");
    const drawerLoginActions = document.getElementById("drawerLoginActions");
    const drawerAccountActions = document.getElementById("drawerAccountActions");

    if (liveUser) {
        clearGoogleLoginPending();
        if (photo) photo.src = liveUser.photoURL || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(liveUser.displayName || liveUser.email || "User") + "&background=e50914&color=fff");
        if (name) name.textContent = liveUser.displayName || (liveUser.email ? liveUser.email.split("@")[0] : "CineFlex User");
        if (email) email.textContent = liveUser.email || "Logged in";
        if (badge && !badge.classList.contains("cf-vip-badge")) badge.textContent = "CINEFLEX MEMBER";
        if (logoutBtn) logoutBtn.style.display = "flex";
        if (drawerLoginActions) drawerLoginActions.style.display = "none";
        if (drawerAccountActions) drawerAccountActions.style.display = "block";
        closeLoginModal();
        if (typeof loadProfiles === "function") Promise.resolve(loadProfiles()).catch(console.warn);
        continuePendingPlayback();
        return;
    }

    const pendingGoogleRedirect = localStorage.getItem("cineflex_google_redirect_pending") === "1";
    const pendingTime = Number(localStorage.getItem("cineflex_google_redirect_time") || 0);
    if (!window.cineflexAuthReady || (pendingGoogleRedirect && Date.now() - pendingTime < 180000)) {
        if (name) name.textContent = "Signing in...";
        if (email) email.textContent = "Restoring secure session";
        if (badge) badge.textContent = "PLEASE WAIT";
        return;
    }

    if (photo) photo.src = "https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff";
    if (name) name.textContent = "Guest";
    if (email) email.textContent = "Not logged in";
    if (badge) badge.textContent = "FREE MEMBER";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (drawerLoginActions) drawerLoginActions.style.display = "grid";
    if (drawerAccountActions) drawerAccountActions.style.display = "none";
}

window.renderCineflexAuthUI = renderAuthUI;
window.addEventListener("cineflex-auth-state", event => renderAuthUI(event.detail && event.detail.user));
window.addEventListener("cineflex-login", event => renderAuthUI(event.detail));
window.addEventListener("cineflex-logout", () => renderAuthUI(null));
window.addEventListener("cineflex-auth-pending", () => renderAuthUI(null));

// Handle the case where Firebase restored the session before auth.js loaded.
queueMicrotask(() => renderAuthUI((getCineflexAuth() && getCineflexAuth().currentUser) || null));

window.addEventListener("cineflex-auth-error", function(e) {
    const err = e.detail || {};
    if (err.code === "auth/unauthorized-domain") {
        alert("Firebase Authorized Domain kulang. Idagdag sa Firebase: www.cineflex.online at cineflex.online");
    }
});

console.log("✅ Auth Engine Loaded v20 - Build 250 Event-Driven Session");

window.addEventListener("cineflex-auth-pending", function(){
    const name = document.getElementById("userName");
    const email = document.getElementById("userEmail");
    const badge = document.getElementById("userBadge");
    if (name) name.innerText = "Signing in...";
    if (email) email.innerText = "Google session loading";
    if (badge) badge.innerText = "PLEASE WAIT";
});

window.googleLogin = googleLogin;
window.emailLogin = emailLogin;
window.registerAccount = registerAccount;
window.forgotPassword = forgotPassword;
window.logout = logout;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;


// ======================================
// BUILD 250: DESKTOP SESSION RECONCILIATION
// Re-render from Firebase's canonical currentUser when a background tab returns.
(function installDesktopSessionReconciliation(){
    if (window.__cineflexDesktopAuthSyncInstalled) return;
    window.__cineflexDesktopAuthSyncInstalled = true;
    const reconcile = () => {
        const authObj = getCineflexAuth();
        if (window.renderCineflexAuthUI) window.renderCineflexAuthUI(authObj ? authObj.currentUser : null);
    };
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reconcile(); });
    window.addEventListener("focus", reconcile);
    window.addEventListener("pageshow", reconcile);
})();
