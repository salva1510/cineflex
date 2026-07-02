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
    
    loadUserData();

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
window.addEventListener("load", () => {
    openLoginModal();
});
auth.onAuthStateChanged((user) => {

    const info = document.getElementById("accountInfo");
    const logoutBtn = document.getElementById("logoutBtn");

    if (user) {

        if(info){
            info.innerHTML =
            `<i class="fa-solid fa-user"></i> ${user.displayName || user.email}`;
        }

        if(logoutBtn){
            logoutBtn.style.display = "flex";
        }

    } else {

        if(info){
            info.innerHTML =
            `<i class="fa-solid fa-user"></i> Guest`;
        }

        if(logoutBtn){
            logoutBtn.style.display = "none";
        }

    }

});
auth.onAuthStateChanged((user)=>{

    const photo=document.getElementById("userPhoto");
    const name=document.getElementById("userName");
    const email=document.getElementById("userEmail");
    const badge=document.getElementById("userBadge");
    const logout=document.getElementById("logoutBtn");

    if(user){

        if(photo){
            photo.src=user.photoURL ||
            "https://ui-avatars.com/api/?name="+encodeURIComponent(user.displayName||user.email);
        }

        if(name){
            name.innerText=user.displayName || "User";
        }

        if(email){
            email.innerText=user.email;
        }

        if(badge){
            badge.innerText="CINEFLEX MEMBER";
        }

        if(logout){
            logout.style.display="flex";
        }

    }else{

        if(photo){
            photo.src="https://ui-avatars.com/api/?name=Guest&background=e50914&color=fff";
        }

        if(name){
            name.innerText="Guest";
        }

        if(email){
            email.innerText="Not logged in";
        }

        if(badge){
            badge.innerText="FREE MEMBER";
        }

        if(logout){
            logout.style.display="none";
        }

    }

});
window.addEventListener("cineflex-login", (e)=>{

    const user = e.detail;

    const info = document.getElementById("accountInfo");
    const logout = document.getElementById("logoutBtn");

    if(info){

        info.innerHTML = `
        <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email)}"
        style="
        width:55px;
        height:55px;
        border-radius:50%;
        margin-right:12px;
        ">

        <div>

        <b>${user.displayName || "Cineflex User"}</b><br>

        <small>${user.email}</small><br>

        <span style="color:#2ecc71">
        ● Logged In
        </span>

        </div>
        `;

    }

    if(logout){

        logout.style.display="flex";

    }

});

window.addEventListener("cineflex-logout", ()=>{

    const info=document.getElementById("accountInfo");

    const logout=document.getElementById("logoutBtn");

    if(info){

        info.innerHTML=`
        <i class="fa-solid fa-user"></i>

        Guest
        `;

    }

    if(logout){

        logout.style.display="none";

    }

});
