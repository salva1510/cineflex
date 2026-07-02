// ======================================
// CINEFLEX AUTH v2.0 (FULLY FIXED & CLEANED)
// ======================================

let pendingPlayback = null;
let googleLoginInProgress = false;
let emailLoginInProgress = false;
let registerInProgress = false;

if (typeof auth === "undefined") {
    console.error("Firebase Auth is not initialized.");
}

// --- AUTH UTILITIES ---

function isLoggedIn() {
    return !!(auth && auth.currentUser);
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
        const play = pendingPlayback;
        pendingPlayback = null;
        play();
    }
}

// --- FIREBASE AUTH ACTIONS ---

function googleLogin() {
    if (googleLoginInProgress) return;
    if (isLoggedIn()) return;

    googleLoginInProgress = true;
    closeLoginModal();

    auth.signInWithPopup(googleProvider)
    .then(() => {
        console.log("Google Login Success");
    })
    .catch(err => {
        if (
            err.code !== "auth/cancelled-popup-request" &&
            err.code !== "auth/popup-closed-by-user"
        ) {
            alert(err.message);
        }
    })
    .finally(() => {
        googleLoginInProgress = false;
    });
}

function emailLogin() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    if (emailLoginInProgress) return;
    emailLoginInProgress = true;

    auth.signInWithEmailAndPassword(email, password)
    .then(() => {
        closeLoginModal();
    })
    .catch(err => alert(err.message))
    .finally(() => {
        emailLoginInProgress = false;
    });
}

function registerAccount() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }
    if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
}

    if (registerInProgress) return;
    registerInProgress = true;

    auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
        closeLoginModal();
    })
    .catch(err => alert(err.message))
    .finally(() => {
        registerInProgress = false;
    });
}

function forgotPassword() {
    const email = document.getElementById("login-email").value.trim();
    if (!email) {
        alert("Please enter your email address first.");
        return;
    }

    auth.sendPasswordResetEmail(email)
    .then(() => {
        alert("Password reset email has been sent.");
    })
    .catch(err => alert(err.message));
}

async function logout() {
    pendingPlayback = null;
    try {
        await auth.signOut();
        closeLoginModal();
        console.log("Logged out");
    } catch (err) {
        alert(err.message);
    }
}

// --- CENTRAL STATE MANAGEMENT ---

if (typeof auth !== "undefined" && auth) {
    auth.onAuthStateChanged((user) => {
        const info = document.getElementById("accountInfo");
        const logoutBtn = document.getElementById("logoutBtn");
        const photo = document.getElementById("userPhoto");
        const name = document.getElementById("userName");
        const email = document.getElementById("userEmail");
        const badge = document.getElementById("userBadge");

        if (user) {
            console.log("Logged in:", user.email);
            
            if (typeof loadUserData === "function") {
                Promise.resolve(loadUserData()).catch(console.error);
            }
            continuePendingPlayback();

            if (info) {
                const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`;
                info.innerHTML = `
                    <img src="${avatarUrl}" style="width:55px; height:55px; border-radius:50%; margin-right:12px;">
                    <div>
                        <b>${user.displayName || "Cineflex User"}</b><br>
                        <small>${user.email}</small><br>
                        <span style="color:#2ecc71">● Logged In</span>
                    </div>
                `;
            }

            if (photo) photo.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`;
            if (name) name.innerText = user.displayName || "User";
            if (email) email.innerText = user.email;
            if (badge) badge.innerText = "CINEFLEX MEMBER";
            if (logoutBtn) logoutBtn.style.display = "flex";

        } else {
            console.log("Logged out");

            if (info) {
                info.innerHTML = `<i class="fa-solid fa-user"></i> Guest`;
            }

            if (photo) {
                photo.src = "https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff";
            }

            if (name) {
                name.innerText = "Guest";
            }

            if (email) {
                email.innerText = "Not logged in";
            }

            if (badge) {
                badge.innerText = "FREE MEMBER";
            }

            if (logoutBtn) {
                logoutBtn.style.display = "none";
            }

            if (pendingPlayback) {
                openLoginModal();
            }
        }
    });
}

// --- MODAL UI HANDLERS ---

function openLoginModal() {
    let modal = document.getElementById("login-modal");

    if (modal) {
        modal.style.display = "flex";
        return;
    }

    document.body.insertAdjacentHTML("beforeend", `
        <div id="login-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.92); display:flex; justify-content:center; align-items:center; z-index:99999;">
            <div style="width:95%; max-width:420px; background:#111; padding:25px; border-radius:12px; box-sizing:border-box;">
                <h2 style="margin:0 0 20px; text-align:center; color:white;">CINEFLEX LOGIN</h2>
                
                <input id="login-email" type="email" placeholder="Email" style="width:100%; padding:12px; margin-bottom:12px; background:#222; border:none; color:white; border-radius:6px;">
                <input id="login-password" type="password" placeholder="Password" style="width:100%; padding:12px; margin-bottom:18px; background:#222; border:none; color:white; border-radius:6px;">
                
                <button onclick="emailLogin()" style="width:100%; padding:12px; background:#e50914; color:white; border:none; border-radius:6px; font-weight:bold; margin-bottom:10px; cursor:pointer;">LOGIN</button>
                <button onclick="googleLogin()" style="width:100%; padding:12px; background:white; color:black; border:none; border-radius:6px; font-weight:bold; margin-bottom:10px; cursor:pointer;">Continue with Google</button>
                <button onclick="registerAccount()" style="width:100%; padding:12px; background:#444; color:white; border:none; border-radius:6px; margin-bottom:10px; cursor:pointer;">Create Account</button>
                <button onclick="forgotPassword()" style="width:100%; padding:12px; background:transparent; color:#00bfff; border:none; cursor:pointer;">Forgot Password?</button>
            </div>
        </div>
    `);
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    if (modal) {
        modal.remove();
    }
}
