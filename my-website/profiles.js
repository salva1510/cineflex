// ================================
// CINEFLEX PROFILES ENGINE
// v1.0
// ================================

let profiles = [];
let activeProfile = null;

async function loadProfiles() {

    if (!auth.currentUser) return;

    const ref = db.collection("users")
        .doc(auth.currentUser.uid);

    const doc = await ref.get();

    if (!doc.exists) {

        profiles = [{
            id: "default",
            name: "Main",
            avatar: "👤",
            kids: false
        }];

        activeProfile = profiles[0];

        await ref.set({
            profiles: profiles,
            activeProfile: "default"
        }, { merge:true });

    } else {

        const data = doc.data();

        profiles = data.profiles || [{
            id:"default",
            name:"Main",
            avatar:"👤",
            kids:false
        }];

        const activeId = data.activeProfile || "default";

        activeProfile =
            profiles.find(p=>p.id===activeId) ||
            profiles[0];

    }

    renderProfiles();

}

function renderProfiles(){

    const container=document.getElementById("profiles-list");

    if(!container) return;

    container.innerHTML="";

    profiles.forEach(profile=>{

        container.innerHTML+=`

        <div class="profile-card"
             onclick="selectProfile('${profile.id}')">

            <div class="profile-avatar">

                ${profile.avatar}

            </div>

            <div class="profile-name">

                ${profile.name}

            </div>

        </div>

        `;

    });

}

async function selectProfile(id){

    activeProfile=
        profiles.find(p=>p.id===id);

    await db.collection("users")
        .doc(auth.currentUser.uid)
        .set({

            activeProfile:id

        },{merge:true});

    closeProfiles();

    loadUserData();

}

function openProfiles(){

    document
        .getElementById("profiles-modal")
        .style.display="flex";

}

function closeProfiles(){

    document
        .getElementById("profiles-modal")
        .style.display="none";

}
