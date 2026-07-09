// ======================================
// CINEFLEX AUTH v7.0 - POLISHED FLOW
// Login, Register, Google Mobile Redirect, Logout, UI Sync
// ======================================

let pendingPlayback = null;
let authBusy = false;

function isLoggedIn() {
    return !!(typeof auth !== "undefined" && auth.currentUser);
}

function requireLogin(callback) {
    if (isLoggedIn()) {
        if (typeof callback === "function") callback();
        return;
    }

    pendingPlayback = callback;
    openLoginModal();
}

function continuePendingPlayback() {
    if (pendingPlayback && isLoggedIn()) {
        const fn = pendingPlayback;
        pendingPlayback = null;
        if (typeof fn === "function") fn();
    }
}

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
}

function showAuthMessage(message, type = "error") {
    const box = document.getElementById("authMessage");
    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;
    box.className = "auth-message " + type;
}

function setAuthLoading(isLoading) {
    authBusy = isLoading;
    document.querySelectorAll("#login-modal button").forEach(btn => {
        btn.disabled = isLoading;
        btn.style.opacity = isLoading ? ".65" : "1";
        btn.style.pointerEvents = isLoading ? "none" : "auto";
    });
}

function friendlyAuthError(error) {
    const code = error && error.code ? error.code : "";

    if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Mali ang email o password. Pakisubukan ulit.";
    if (code.includes("user-not-found")) return "Walang account na nakita sa email na ito.";
    if (code.includes("email-already-in-use")) return "May account na gamit na ang email na ito.";
    if (code.includes("weak-password")) return "Mahina ang password. Gumamit ng at least 6 characters.";
    if (code.includes("popup-closed-by-user")) return "Nasara ang Google login bago matapos.";
    if (code.includes("cancelled-popup-request")) return "May naunang Google popup. Subukan ulit pagkatapos ng ilang segundo.";
    if (code.includes("unauthorized-domain")) return "Hindi pa authorized ang domain sa Firebase Authentication.";
    if (code.includes("network-request-failed")) return "May problema sa internet connection. Pakisubukan ulit.";

    return (error && error.message) ? error.message : "May error sa login. Pakisubukan ulit.";
}

// ======================================
// LOGIN ACTIONS
// ======================================

async function googleLogin() {
    if (authBusy) return;

    try {
        setAuthLoading(true);
        showAuthMessage("Binubuksan ang Google login...", "info");

        if (isMobileDevice()) {
            await auth.signInWithRedirect(googleProvider);
            return;
        }

        await auth.signInWithPopup(googleProvider);
    } catch (error) {
        console.error("Google login error:", error);
        showAuthMessage(friendlyAuthError(error));
    } finally {
        setAuthLoading(false);
    }
}

async function emailLogin() {
    if (authBusy) return;

    const emailInput = document.getElementById("login-email");
    const passInput = document.getElementById("login-password");
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passInput ? passInput.value : "";

    if (!email || !password) {
        showAuthMessage("Ilagay muna ang email at password.");
        return;
    }

    try {
        setAuthLoading(true);
        showAuthMessage("Logging in...", "info");
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Email login error:", error);
        showAuthMessage(friendlyAuthError(error));
    } finally {
        setAuthLoading(false);
    }
}

async function registerAccount() {
    if (authBusy) return;

    const emailInput = document.getElementById("login-email");
    const passInput = document.getElementById("login-password");
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passInput ? passInput.value : "";

    if (!email || !password) {
        showAuthMessage("Ilagay muna ang email at password para makagawa ng account.");
        return;
    }

    try {
        setAuthLoading(true);
        showAuthMessage("Creating account...", "info");
        const result = await auth.createUserWithEmailAndPassword(email, password);

        if (result.user && !result.user.displayName) {
            const name = email.split("@")[0];
            await result.user.updateProfile({ displayName: name });
        }
    } catch (error) {
        console.error("Register error:", error);
        showAuthMessage(friendlyAuthError(error));
    } finally {
        setAuthLoading(false);
    }
}

async function forgotPassword() {
    const emailInput = document.getElementById("login-email");
    const email = emailInput ? emailInput.value.trim() : "";

    if (!email) {
        showAuthMessage("Ilagay muna ang email para sa password reset.");
        return;
    }

    try {
        setAuthLoading(true);
        await auth.sendPasswordResetEmail(email);
        showAuthMessage("Password reset email sent. Tingnan ang inbox/spam folder.", "success");
    } catch (error) {
        console.error("Forgot password error:", error);
        showAuthMessage(friendlyAuthError(error));
    } finally {
        setAuthLoading(false);
    }
}

async function logout() {
    try {
        localStorage.removeItem("cineflex_profile");
        localStorage.removeItem("cineflex_profile_name");
        localStorage.removeItem("cineflex_profile_avatar");

        if (typeof closeMenuDrawer === "function") closeMenuDrawer();
        if (typeof hideProfileSelector === "function") hideProfileSelector();

        await auth.signOut();
        // Login modal should open only when user plays video or taps Login.
    } catch (error) {
        console.error("Logout error:", error);
        alert("Hindi natuloy ang logout. Pakisubukan ulit.");
    }
}

// ======================================
// LOGIN MODAL
// ======================================

function openLoginModal() {
    let modal = document.getElementById("login-modal");

    if (!modal) {
        document.body.insertAdjacentHTML("beforeend", `
<div id="login-modal" class="auth-modal">
    <div class="auth-card">
        <button class="auth-close" onclick="closeLoginModal()" aria-label="Close login">&times;</button>

        <div class="auth-brand">
            <div class="auth-logo">C</div>
            <div>
                <h2>CINEFLEX</h2>
                <p>Login to continue watching</p>
            </div>
        </div>

        <div id="authMessage" class="auth-message info">Welcome back. Login or create your account.</div>

        <label class="auth-label" for="login-email">Email</label>
        <input id="login-email" class="auth-input" type="email" placeholder="you@email.com" autocomplete="email">

        <label class="auth-label" for="login-password">Password</label>
        <input id="login-password" class="auth-input" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter') emailLogin()">

        <button class="auth-primary" onclick="emailLogin()"><i class="fa-solid fa-right-to-bracket"></i> Login</button>
        <button class="auth-google" onclick="googleLogin()"><i class="fa-brands fa-google"></i> Continue with Google</button>

        <div class="auth-row">
            <button onclick="registerAccount()">Create Account</button>
            <button onclick="forgotPassword()">Forgot Password?</button>
        </div>
    </div>
</div>`);
        modal = document.getElementById("login-modal");
    }

    modal.style.display = "flex";
    document.body.classList.add("auth-open");
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    if (modal) modal.style.display = "none";
    document.body.classList.remove("auth-open");
}

// ======================================
// AUTH UI SYNC
// ======================================

function updateAccountUI(user, profile = null) {
    const photo = document.getElementById("userPhoto");
    const name = document.getElementById("userName");
    const email = document.getElementById("userEmail");
    const badge = document.getElementById("userBadge");
    const logoutBtn = document.getElementById("logoutBtn");
    const switchBtn = document.getElementById("switchProfileBtn");
    const loginBtn = document.getElementById("loginBtn");

    if (user) {
        const displayName = profile?.name || user.displayName || (user.email ? user.email.split("@")[0] : "Member");
        const displayPhoto = profile?.avatar || user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName) + "&background=e50914&color=fff";

        if (photo) photo.src = displayPhoto;
        if (name) name.innerText = displayName;
        if (email) email.innerText = user.email || "Google Account";
        if (badge) badge.innerText = profile ? "ACTIVE PROFILE" : "CINEFLEX MEMBER";
        if (logoutBtn) logoutBtn.style.display = "flex";
        if (switchBtn) switchBtn.style.display = "flex";
        if (loginBtn) loginBtn.style.display = "none";
    } else {
        if (photo) photo.src = "https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff";
        if (name) name.innerText = "Guest";
        if (email) email.innerText = "Not logged in";
        if (badge) badge.innerText = "FREE MEMBER";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (switchBtn) switchBtn.style.display = "none";
        if (loginBtn) loginBtn.style.display = "flex";
    }
}

async function handleRedirectLoginResult() {
    if (typeof auth === "undefined" || !auth.getRedirectResult) return;

    try {
        const result = await auth.getRedirectResult();
        if (result && result.user) {
            console.log("✅ Google redirect login complete:", result.user.email);
        }
    } catch (error) {
        console.error("Redirect login error:", error);
        openLoginModal();
        showAuthMessage(friendlyAuthError(error));
    }
}

if (typeof auth !== "undefined") {
    handleRedirectLoginResult();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            closeLoginModal();
            updateAccountUI(user);

            if (typeof loadProfiles === "function") {
                await loadProfiles({ forceSelector: false });
            }

            continuePendingPlayback();
        } else {
            updateAccountUI(null);
            if (typeof resetProfiles === "function") resetProfiles();
        }
    });
}

console.log("✅ CineFlex Auth v7 Loaded");
