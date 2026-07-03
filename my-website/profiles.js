
// =======================================
// CINEFLEX PROFILE SYSTEM v1.0
// Part 1
// =======================================

let profiles = [];
let activeProfile = null;

const DEFAULT_AVATARS = [
    "https://ui-avatars.com/api/?name=M&background=e50914&color=fff",
    "https://ui-avatars.com/api/?name=A&background=2196F3&color=fff",
    "https://ui-avatars.com/api/?name=K&background=4CAF50&color=fff",
    "https://ui-avatars.com/api/?name=G&background=FF9800&color=fff",
    "https://ui-avatars.com/api/?name=P&background=9C27B0&color=fff"
];

// -------------------------------
// Load Profiles
// -------------------------------

async function loadProfiles(){

    if(!auth.currentUser) return;

    const doc = await db
    .collection("users")
    .doc(auth.currentUser.uid)
    .get();

    if(doc.exists){

        profiles = doc.data().profiles || [];

    }

    showProfileScreen();

}

// -------------------------------
// Save Profiles
// -------------------------------

async function saveProfiles(){

    if(!auth.currentUser) return;

    await db
    .collection("users")
    .doc(auth.currentUser.uid)
    .set({

        profiles: profiles

    },{merge:true});

}

// -------------------------------
// Create Profile Screen
// -------------------------------

function showProfileScreen(){

    let screen=document.getElementById("profile-screen");

    if(!screen){

        screen=document.createElement("div");

        screen.id="profile-screen";

        document.body.appendChild(screen);

    }

    screen.classList.add("active");

    renderProfiles();

}

// -------------------------------
// Render Profiles
// -------------------------------

function renderProfiles(){

    const screen=document.getElementById("profile-screen");

    screen.innerHTML=`

<h1 id="profile-title">
Who's Watching?
</h1>

<div id="profile-list"></div>

`;

    const list=document.getElementById("profile-list");

    profiles.forEach((profile,index)=>{

        list.innerHTML+=`

<div class="profile-card"
onclick="selectProfile(${index})">

<div class="profile-avatar">

<img src="${profile.avatar}">

</div>

<div class="profile-name">

${profile.name}

</div>

</div>

`;

    });

    if(profiles.length<5){

        list.innerHTML+=`

<div class="profile-card"

onclick="createProfile()">

<div class="profile-avatar add-profile">

+

</div>

<div class="profile-name">

Add Profile

</div>

</div>

`;

    }

}
