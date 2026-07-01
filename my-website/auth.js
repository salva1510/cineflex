// ======================================
// CINEFLEX AUTH v2.0
// Part 1
// ======================================

let pendingPlayback = null;

function isLoggedIn() {
    return auth.currentUser != null;
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

window.addEventListener("cineflex-login", () => {

    closeLoginModal();

    continuePendingPlayback();

});

function googleLogin() {

    auth.signInWithPopup(googleProvider)

    .then(() => {

        console.log("Google Login Success");

    })

    .catch(err => {

        alert(err.message);

    });

}

function emailLogin() {

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    auth.signInWithEmailAndPassword(email,password)

    .catch(err=>{

        alert(err.message);

    });

}

function registerAccount(){

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    auth.createUserWithEmailAndPassword(email,password)

    .catch(err=>{

        alert(err.message);

    });

}
// ======================================
// CINEFLEX AUTH v2.0
// Part 2
// ======================================

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

    .catch(err => {

        alert(err.message);

    });

}

function logout() {

    auth.signOut();

}

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

<h2 style="
margin:0 0 20px;
text-align:center;
color:white;
">

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
margin-bottom:18px;
background:#222;
border:none;
color:white;
border-radius:6px;
">

<button onclick="emailLogin()" style="
width:100%;
padding:12px;
background:#e50914;
color:white;
border:none;
border-radius:6px;
font-weight:bold;
margin-bottom:10px;
cursor:pointer;
">

LOGIN

</button>

<button onclick="googleLogin()" style="
width:100%;
padding:12px;
background:white;
color:black;
border:none;
border-radius:6px;
font-weight:bold;
margin-bottom:10px;
cursor:pointer;
">

Continue with Google

</button>

<button onclick="registerAccount()" style="
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

<button onclick="forgotPassword()" style="
width:100%;
padding:12px;
background:transparent;
color:#00bfff;
border:none;
cursor:pointer;
">

Forgot Password?

</button>

</div>

</div>

`);

}

function closeLoginModal() {

    const modal = document.getElementById("login-modal");

    if (modal) {

        modal.style.display = "none";

    }

}

auth.onAuthStateChanged((user)=>{

    if(user){

        console.log("Logged in:",user.email);

    }else{

        console.log("Logged out");

    }

});
