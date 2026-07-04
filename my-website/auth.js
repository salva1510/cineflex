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

async function googleLogin() {

    try {

        await auth.signInWithPopup(googleProvider);

    } catch (e) {

        console.error(e);
        alert(e.message);

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

        closeLoginModal();

        if (typeof loadProfiles === "function") {

            await loadProfiles();

        }

        continuePendingPlayback();

    }

    else {

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

    }

});

console.log("✅ Auth Engine Loaded");
