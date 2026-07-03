
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
// =======================================
// CINEFLEX PROFILE SYSTEM v1.0
// Part 2
// =======================================

// -------------------------------
// Create Profile
// -------------------------------

async function createProfile() {

    if (profiles.length >= 5) {
        alert("Maximum of 5 profiles only.");
        return;
    }

    const name = prompt("Profile Name");

    if (!name) return;

    const profile = {

        id: Date.now().toString(),

        name: name,

        avatar: DEFAULT_AVATARS[
            profiles.length % DEFAULT_AVATARS.length
        ],

        watchlist: [],

        continueWatching: [],

        history: []

    };

    profiles.push(profile);

    await saveProfiles();

    renderProfiles();

}

// -------------------------------
// Select Profile
// -------------------------------

function selectProfile(index){

    activeProfile = profiles[index];

    localStorage.setItem(
        "cineflex_active_profile",
        JSON.stringify(activeProfile)
    );

    watchlist = activeProfile.watchlist || [];

    continueWatching =
        activeProfile.continueWatching || [];

    localStorage.setItem(
        "cineflex_watchlist",
        JSON.stringify(watchlist)
    );

    localStorage.setItem(
        "cineflex_recent",
        JSON.stringify(continueWatching)
    );

    updateContinueUI();

    document
        .getElementById("profile-screen")
        .classList.remove("active");

}

// -------------------------------
// Delete Profile
// -------------------------------

async function deleteProfile(index){

    if(!confirm("Delete this profile?"))
        return;

    profiles.splice(index,1);

    await saveProfiles();

    renderProfiles();

}

// -------------------------------
// Save Active Profile
// -------------------------------

async function saveActiveProfile(){

    if(!activeProfile) return;

    activeProfile.watchlist =
        watchlist;

    activeProfile.continueWatching =
        continueWatching;

    const i = profiles.findIndex(p=>p.id===activeProfile.id);

    if(i>-1){

        profiles[i]=activeProfile;

        await saveProfiles();

    }

}
