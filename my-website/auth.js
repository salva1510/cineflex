// ======================================
// CINEFLEX AUTH v5.0
// Stable Version
// ======================================

let pendingPlayback = null;

function isLoggedIn() {
    return auth.currentUser !== null;
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
        btn.dataset.oldText = btn.innerHTML;
        btn.innerHTML = "Signing in...";
    });

    try {
        if (!window.firebase || !window.auth) {
            throw new Error("Firebase hindi pa loaded. I-refresh ang page at subukan ulit.");
        }

        const provider = window.googleProvider || new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        markGoogleLoginPending();

        // IMPORTANT: Mas stable ito sa Android Chrome at normal browser.
        // Redirect lang ang fallback kapag blocked ang popup/WebView.
        try {
            const result = await auth.signInWithPopup(provider);
            clearGoogleLoginPending();
            const user = result && result.user ? result.user : auth.currentUser;
            if (!user) throw new Error("Google login finished pero walang user session.");
            window.currentUser = user;
            localStorage.setItem("cineflex_last_login_email", user.email || "google");
            window.dispatchEvent(new CustomEvent("cineflex-login", { detail: user }));
            if (typeof closeLoginModal === "function") closeLoginModal();
            if (typeof loadProfiles === "function") setTimeout(() => loadProfiles(), 200);
            return user;
        } catch (popupErr) {
            console.warn("Google popup failed:", popupErr);
            const canRedirect = [
                "auth/popup-blocked",
                "auth/popup-closed-by-user",
                "auth/cancelled-popup-request",
                "auth/operation-not-supported-in-this-environment"
            ].includes(popupErr.code) || isMobileDevice();

            if (!canRedirect) throw popupErr;

            // Fallback para sa mobile/PWA/WebView
            sessionStorage.setItem("cineflex_after_google_redirect", location.href);
            await auth.signInWithRedirect(provider);
            return null;
        }

    } catch (e) {
        console.error("Google login error:", e);
        clearGoogleLoginPending();

        let msg = e.message || "Google login failed.";
        if (e.code === "auth/unauthorized-domain") {
            msg = "Hindi authorized ang domain sa Firebase. Idagdag sa Authentication > Settings > Authorized domains: cineflex.online at www.cineflex.online";
        } else if (e.code === "auth/operation-not-allowed") {
            msg = "Hindi pa naka-enable ang Google provider sa Firebase Authentication > Sign-in method.";
        } else if (e.code === "auth/web-storage-unsupported") {
            msg = "Blocked ang browser storage. Buksan sa Chrome normal tab, hindi incognito, at payagan cookies/storage.";
        } else if (e.code === "auth/popup-closed-by-user") {
            msg = "Nasara ang Google login popup. Pindutin ulit ang Login with Google.";
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

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    if (!email || !password) {

        alert("Please enter email and password.");
        return;

    }

    try {

        await auth.signInWithEmailAndPassword(email, password);

    } catch (e) {

        alert(e.message);

    }

}

async function registerAccount() {

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    if (!email || !password) {

        alert("Please enter email and password.");
        return;

    }

    try {

        await auth.createUserWithEmailAndPassword(email, password);

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

        await auth.sendPasswordResetEmail(email);

        alert("Password reset email sent.");

    } catch (e) {

        alert(e.message);

    }

}

async function logout() {

    await auth.signOut();

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

auth.onAuthStateChanged(async (user) => {

    const photo =
        document.getElementById("userPhoto");

    const name =
        document.getElementById("userName");

    const email =
        document.getElementById("userEmail");

    const badge =
        document.getElementById("userBadge");

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (user) {

        clearGoogleLoginPending();

        if (photo) {

            photo.src =
                user.photoURL ||
                "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(user.displayName || user.email);

        }

        if (name)
            name.innerText =
                user.displayName || "User";

        if (email)
            email.innerText =
                user.email;

        if (badge)
            badge.innerText =
                "CINEFLEX MEMBER";

        if (logoutBtn)
            logoutBtn.style.display = "flex";

        const drawerLoginActions = document.getElementById("drawerLoginActions");
        const drawerAccountActions = document.getElementById("drawerAccountActions");
        if (drawerLoginActions) drawerLoginActions.style.display = "none";
        if (drawerAccountActions) drawerAccountActions.style.display = "block";

        closeLoginModal();

        if (typeof loadProfiles === "function") {

            await loadProfiles();

        }

        continuePendingPlayback();

    }

    else {

        const pendingGoogleRedirect = localStorage.getItem("cineflex_google_redirect_pending") === "1";
        const pendingTime = Number(localStorage.getItem("cineflex_google_redirect_time") || 0);
        if (pendingGoogleRedirect && Date.now() - pendingTime < 120000) {
            if (name) name.innerText = "Signing in...";
            if (email) email.innerText = "Google login is loading";
            if (badge) badge.innerText = "PLEASE WAIT";
            return;
        }

        if (photo)
            photo.src =
                "https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff";

        if (name)
            name.innerText = "Guest";

        if (email)
            email.innerText = "Not logged in";

        if (badge)
            badge.innerText = "FREE MEMBER";

        if (logoutBtn)
            logoutBtn.style.display = "none";

        const drawerLoginActions = document.getElementById("drawerLoginActions");
        const drawerAccountActions = document.getElementById("drawerAccountActions");
        if (drawerLoginActions) drawerLoginActions.style.display = "grid";
        if (drawerAccountActions) drawerAccountActions.style.display = "none";

    }

});


window.addEventListener("cineflex-auth-error", function(e) {
    const err = e.detail || {};
    if (err.code === "auth/unauthorized-domain") {
        alert("Firebase Authorized Domain kulang. Idagdag sa Firebase: www.cineflex.online at cineflex.online");
    }
});

console.log("✅ Auth Engine Loaded v17");

window.addEventListener("cineflex-auth-pending", function(){
    const name = document.getElementById("userName");
    const email = document.getElementById("userEmail");
    const badge = document.getElementById("userBadge");
    if (name) name.innerText = "Signing in...";
    if (email) email.innerText = "Google session loading";
    if (badge) badge.innerText = "PLEASE WAIT";
});
