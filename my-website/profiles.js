// ================================
// CINEFLEX PROFILE SYSTEM v1.0
// ================================

let activeProfile = null;
let profiles = [];

async function loadProfiles() {

    if (!auth.currentUser) return;

    const doc = await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .get();

    profiles = [];

    doc.forEach(d => {

        profiles.push({
            id: d.id,
            ...d.data()
        });

    });

    if (profiles.length === 0) {

        await createDefaultProfile();

    }

    showProfileSelector();

}

async function createDefaultProfile() {

    const ref = db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("profiles")
        .doc();

    await ref.set({

        name: auth.currentUser.displayName || "My Profile",

        avatar: auth.currentUser.photoURL ||

        "https://ui-avatars.com/api/?name=C",

        kids:false,

        created:Date.now()

    });

    loadProfiles();

}

function showProfileSelector(){

    let html=`

<div id="profile-screen">

<div class="profile-box">

<h2>Who's Watching?</h2>

<div class="profile-list">

`;

profiles.forEach(profile=>{

html+=`

<div class="profile-card"

onclick="selectProfile('${profile.id}')">

<img src="${profile.avatar}">

<p>${profile.name}</p>

</div>

`;

});

html+=`

<div class="profile-card"

onclick="createNewProfile()">

<div class="plus">+</div>

<p>Add Profile</p>

</div>

</div>

</div>

</div>

`;

const old=document.getElementById("profile-screen");

if(old) old.remove();

document.body.insertAdjacentHTML("beforeend",html);

}

async function selectProfile(id){

activeProfile=id;

localStorage.setItem("cineflex_profile",id);

document.getElementById("profile-screen").remove();

loadProfileData();

}

async function createNewProfile(){

const name=prompt("Profile name");

if(!name) return;

await db.collection("users")

.doc(auth.currentUser.uid)

.collection("profiles")

.add({

name,

avatar:"https://ui-avatars.com/api/?name="+encodeURIComponent(name),

kids:false,

created:Date.now()

});

loadProfiles();

}

async function loadProfileData(){

if(!activeProfile) return;

const doc=await db.collection("users")

.doc(auth.currentUser.uid)

.collection("profiles")

.doc(activeProfile)

.get();

if(!doc.exists) return;

console.log("Current profile:",doc.data().name);

}
