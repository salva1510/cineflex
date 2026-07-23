(() => {
  'use strict';
  const ADMIN_EMAILS = ['emviemsalva@gmail.com'];
  const ADMIN_UIDS = ['6t6m25YN7AM2d8iIecT6kUTC1me2'];
  const CONFIG_REF = () => db.collection('cineflexConfig').doc('homepage');
  const $ = (id) => document.getElementById(id);
  let currentConfig = {};
  let unsubscribeRooms = null;

  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
  function safeDate(value){try{return value&&value.toDate?value.toDate():new Date(value||Date.now())}catch{return new Date()}}
  function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function normalizedEmail(user){
    return String(user && user.email || '').trim().toLowerCase();
  }

  async function resolveAdminAccess(user){
    if(!user) return {allowed:false, role:'viewer'};

    const email = normalizedEmail(user);
    if(ADMIN_UIDS.includes(user.uid) || ADMIN_EMAILS.includes(email)) {
      return {allowed:true, role:'super_admin'};
    }

    try {
      const roleDoc = await db.collection('cineflexAdmins').doc(user.uid).get();
      if(roleDoc.exists){
        const data = roleDoc.data() || {};
        const validRoles = ['super_admin','moderator','content_manager','support'];
        if(data.active !== false && validRoles.includes(data.role)){
          return {allowed:true, role:data.role};
        }
      }
    } catch(error){
      console.warn('Admin role lookup failed:', error);
    }

    return {allowed:false, role:'viewer'};
  }

  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(btn.dataset.page).classList.add('active');
    const labels={dashboard:['Dashboard','Live overview of your CineFlex platform'],homepage:['Homepage Editor','Publish announcements and featured content without editing code'],rooms:['Live Rooms','Monitor active Watch Party rooms'],requests:['Requests','Review content requests from viewers'],reports:['Link Reports','Resolve broken player and episode reports'],notifications:['Notifications','Publish real-time updates to CineFlex users'],importer:['TMDB Import','Fetch and save content metadata quickly'],analytics:['Analytics','Platform request and report insights'],settings:['Settings','Control platform-wide notices']};
    $('pageTitle').textContent=labels[btn.dataset.page][0];$('pageSubtitle').textContent=labels[btn.dataset.page][1];
  }));

  async function countCollection(name){try{const snap=await db.collection(name).get();return snap.size}catch(e){console.warn(name,e);return 0}}
  async function countProfiles(){try{const snap=await db.collectionGroup('profiles').get();return snap.size}catch(e){console.warn('profiles count',e);return 0}}

  function renderRooms(snapshot){
    let viewers=0; const rooms=[]; snapshot.forEach(doc=>{const d={id:doc.id,...doc.data()};viewers+=Number(d.memberCount||d.viewerCount||0);rooms.push(d)});
    $('activeRooms').textContent=rooms.length;$('liveViewers').textContent=viewers;
    const html=rooms.length?rooms.slice(0,8).map(r=>`<div class="activity"><div><b>${escapeHtml(r.title||r.mediaTitle||'Untitled room')}</b><br><small>${escapeHtml(r.hostName||'Host')} · ${escapeHtml(r.privacy||'private')}</small></div><span class="badge">${Number(r.memberCount||r.viewerCount||0)} live</span></div>`).join(''):'<p>No active rooms right now.</p>';
    $('recentRooms').innerHTML=html;$('roomManager').innerHTML=html;
  }

  async function loadDashboard(){
    $('firebaseStatus').textContent='Connected';
    const [users,profiles]=await Promise.all([countCollection('users'),countProfiles()]);
    $('totalUsers').textContent=users;$('totalProfiles').textContent=profiles;
    unsubscribeRooms=db.collection('watchPartyRooms').orderBy('updatedAt','desc').limit(30).onSnapshot(renderRooms,()=>{
      db.collection('watchPartyRooms').limit(30).onSnapshot(renderRooms,err=>{$('recentRooms').textContent='Could not load rooms.';console.error(err)});
    });
  }

  function applyForm(c={}){
    $('announcementEnabled').checked=!!c.announcementEnabled;$('announcementText').value=c.announcementText||'';$('announcementType').value=c.announcementType||'info';$('announcementLink').value=c.announcementLink||'';
    $('featuredType').value=c.featuredType||'auto';$('featuredId').value=c.featuredId||'';$('featuredBadge').value=c.featuredBadge||'CINEFLEX FEATURED';$('homepageHeadline').value=c.homepageHeadline||'Stream beyond limits';$('announcementExpires').value=c.announcementExpires||'';$('showTop10').checked=c.showTop10!==false;$('showVivamax').checked=c.showVivamax!==false;$('showKdrama').checked=c.showKdrama!==false;$('top10Label').value=c.top10Label||'Top 10 Today';$('vivamaxLabel').value=c.vivamaxLabel||'Vivamax';$('kdramaLabel').value=c.kdramaLabel||'Korean Dramas';
    $('maintenanceEnabled').checked=!!c.maintenanceEnabled;$('maintenanceMessage').value=c.maintenanceMessage||'';updatePreview();
  }
  function getForm(){return {announcementEnabled:$('announcementEnabled').checked,announcementText:$('announcementText').value.trim(),announcementType:$('announcementType').value,announcementLink:$('announcementLink').value.trim(),featuredType:$('featuredType').value,featuredId:$('featuredId').value.trim(),featuredBadge:$('featuredBadge').value.trim(),homepageHeadline:$('homepageHeadline').value.trim(),announcementExpires:$('announcementExpires').value,showTop10:$('showTop10').checked,showVivamax:$('showVivamax').checked,showKdrama:$('showKdrama').checked,top10Label:$('top10Label').value.trim()||'Top 10 Today',vivamaxLabel:$('vivamaxLabel').value.trim()||'Vivamax',kdramaLabel:$('kdramaLabel').value.trim()||'Korean Dramas',maintenanceEnabled:$('maintenanceEnabled').checked,maintenanceMessage:$('maintenanceMessage').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:(auth.currentUser.email || auth.currentUser.uid)}}
  function updatePreview(){const txt=$('announcementText').value.trim()||'Announcement preview';$('previewAnnouncement').textContent=txt;$('previewAnnouncement').style.display=$('announcementEnabled').checked?'block':'none';$('previewBadge').textContent=$('featuredBadge').value.trim()||'CINEFLEX FEATURED';$('previewHeadline').textContent=$('homepageHeadline').value.trim()||'Stream beyond limits'}
  document.querySelectorAll('#homepage input,#homepage textarea,#homepage select').forEach(el=>el.addEventListener('input',updatePreview));

  async function loadConfig(){try{const doc=await CONFIG_REF().get();currentConfig=doc.exists?doc.data():{};applyForm(currentConfig);$('configStatus').textContent=doc.exists?'Published':'Using defaults'}catch(e){console.error(e);$('configStatus').textContent='Error'}}
  async function saveConfig(){try{$('saveConfig').disabled=true;await CONFIG_REF().set(getForm(),{merge:true});currentConfig=getForm();toast('Homepage changes published');$('configStatus').textContent='Published'}catch(e){console.error(e);toast('Publish failed: '+e.message)}finally{$('saveConfig').disabled=false}}
  $('saveConfig').addEventListener('click',saveConfig);$('resetConfig').addEventListener('click',()=>applyForm(currentConfig));$('saveSettings').addEventListener('click',saveConfig);

  auth.onAuthStateChanged(async user=>{
    if(!user){
      $('lockMessage').textContent='Please log in to your CineFlex admin account first.';
      $('backHome').hidden=false;
      return;
    }

    // Refresh the account so email and provider data are current in installed PWAs.
    try { await user.reload(); user = auth.currentUser || user; } catch(error) { console.warn('User reload failed:', error); }

    const access = await resolveAdminAccess(user);
    if(!access.allowed){
      const email = normalizedEmail(user) || 'no email detected';
      $('lockMessage').textContent=`Signed in as ${email}. This account is not authorized for Admin Studio.`;
      $('backHome').hidden=false;
      return;
    }

    window.CINEFLEX_ADMIN_ROLE = access.role;
    $('adminPhoto').src=user.photoURL||'icon-192.png';
    $('adminName').textContent=user.displayName||user.email||'Admin';
    $('adminLock').remove();
    await Promise.all([loadDashboard(),loadConfig()]);
  });
  window.addEventListener('beforeunload',()=>unsubscribeRooms&&unsubscribeRooms());
})();
