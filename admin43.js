(() => {
  'use strict';
  const OWNER_EMAIL='emviemsalva@gmail.com';
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ts=()=>firebase.firestore.FieldValue.serverTimestamp();
  let me=null, myRole='viewer', selectedUid=null, users=[];

  function toast43(m){const t=$('toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}}
  function dateText(v){try{return (v?.toDate?v.toDate():new Date(v||Date.now())).toLocaleString()}catch{return '—'}}
  function can(...roles){return roles.includes(myRole)||myRole==='super_admin'}
  async function log(action,targetUid='',details={}){try{await db.collection('adminAuditLogs').add({action,targetUid,details,adminUid:me.uid,adminEmail:me.email,role:myRole,createdAt:ts()})}catch(e){console.warn('audit log',e)}}

  function installUI(){
    const nav=document.querySelector('.nav');
    nav.insertAdjacentHTML('beforeend',`<button class="nav-btn" data-page="users"><i class="fa-solid fa-user-shield"></i>User Moderation</button><button class="nav-btn" data-page="roles"><i class="fa-solid fa-key"></i>Admin Roles</button><button class="nav-btn" data-page="audit"><i class="fa-solid fa-clipboard-list"></i>Audit Logs</button>`);
    const main=document.querySelector('main.content');
    main.insertAdjacentHTML('beforeend',`
<section id="users" class="page"><div class="panel"><div class="manager-head"><div><h2>User Moderation</h2><p class="muted">Suspend, mute, warn, or restore CineFlex accounts.</p></div></div><div class="cf43-toolbar"><input id="cf43UserSearch" placeholder="Search email, name, or UID"><select id="cf43StatusFilter"><option value="all">All accounts</option><option value="active">Active</option><option value="muted">Muted</option><option value="suspended">Suspended</option></select><button id="cf43RefreshUsers" class="primary-btn">Refresh</button></div><div id="cf43Users"><div class="cf43-empty">Loading users…</div></div></div></section>
<section id="roles" class="page"><div class="grid-2"><div class="panel"><h2>Assign Admin Role</h2><p class="muted">Only the super admin can change roles.</p><div class="cf43-card"><div class="cf43-form-row"><label>User UID</label><input id="cf43RoleUid" placeholder="Firebase user UID"></div><div class="cf43-form-row"><label>Email</label><input id="cf43RoleEmail" type="email" placeholder="user@example.com"></div><div class="cf43-form-row"><label>Role</label><select id="cf43RoleValue"><option value="moderator">Moderator</option><option value="content_manager">Content Manager</option><option value="support">Support</option><option value="super_admin">Super Admin</option></select></div><button id="cf43SaveRole" class="primary-btn">Save role</button></div></div><div class="panel"><h2>Current Admins</h2><div id="cf43Admins">Loading…</div></div></div></section>
<section id="audit" class="page"><div class="panel"><div class="manager-head"><div><h2>Admin Audit Trail</h2><p class="muted">Recent security and moderation actions.</p></div><button id="cf43RefreshLogs" class="ghost-btn">Refresh</button></div><div id="cf43Logs">Loading…</div></div></section>`);
    document.body.insertAdjacentHTML('beforeend',`<div id="cf43Modal" class="cf43-modal"><div class="cf43-modal-card"><h2 id="cf43ModalTitle">Moderate user</h2><p id="cf43ModalUser" class="muted"></p><div class="cf43-form-row"><label>Action</label><select id="cf43Action"><option value="warn">Warning</option><option value="mute">Mute chat</option><option value="suspend">Suspend account</option><option value="restore">Restore access</option></select></div><div class="cf43-form-row"><label>Duration</label><select id="cf43Duration"><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option><option value="720">30 days</option><option value="0">Permanent</option></select></div><div class="cf43-form-row"><label>Reason</label><textarea id="cf43Reason" rows="4" maxlength="300" placeholder="Reason shown to the user"></textarea></div><div class="actions"><button id="cf43Cancel" class="ghost-btn">Cancel</button><button id="cf43Apply" class="primary-btn">Apply action</button></div></div></div>`);

    document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const labels={users:['User Moderation','Manage account access, warnings, and chat restrictions'],roles:['Admin Roles','Assign secure responsibilities to your team'],audit:['Audit Logs','Review recent administrative actions']};
      if(labels[btn.dataset.page]){document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(btn.dataset.page).classList.add('active');$('pageTitle').textContent=labels[btn.dataset.page][0];$('pageSubtitle').textContent=labels[btn.dataset.page][1];}
    }));
  }

  async function resolveRole(user){
    if(String(user.email||'').toLowerCase()===OWNER_EMAIL)return 'super_admin';
    const d=await db.collection('cineflexAdmins').doc(user.uid).get();return d.exists&&d.data().active!==false?(d.data().role||'viewer'):'viewer';
  }
  async function loadUsers(){
    if(!can('moderator','support'))return $('cf43Users').innerHTML='<div class="cf43-empty">Your role cannot moderate users.</div>';
    const out=new Map();
    for(const col of ['users','userProfiles']){try{const s=await db.collection(col).limit(250).get();s.forEach(d=>out.set(d.id,{uid:d.id,...d.data()}))}catch(e){console.warn(col,e)}}
    try{const m=await db.collection('userModeration').limit(250).get();m.forEach(d=>out.set(d.id,{...(out.get(d.id)||{uid:d.id}),moderation:d.data()}))}catch(e){}
    users=[...out.values()];renderUsers();
  }
  function statusOf(u){const m=u.moderation||{};if(m.suspended===true&&(!m.until||dateVal(m.until)>Date.now()))return 'suspended';if(m.muted===true&&(!m.until||dateVal(m.until)>Date.now()))return 'muted';return 'active'}
  function dateVal(v){try{return (v?.toDate?v.toDate():new Date(v)).getTime()}catch{return 0}}
  function renderUsers(){const q=($('cf43UserSearch').value||'').toLowerCase(),f=$('cf43StatusFilter').value;const list=users.filter(u=>{const s=statusOf(u);return(f==='all'||f===s)&&(`${u.email||''} ${u.displayName||u.name||''} ${u.uid}`).toLowerCase().includes(q)});$('cf43Users').innerHTML=list.length?list.map(u=>{const s=statusOf(u);return `<div class="cf43-user"><img class="cf43-avatar" src="${esc(u.photoURL||u.photo||'icon-192.png')}" alt=""><div class="cf43-meta"><b>${esc(u.displayName||u.name||u.email||'CineFlex User')}</b><small>${esc(u.email||u.uid)}</small><span class="cf43-pill ${s==='suspended'?'banned':''}">${s}</span></div><div class="cf43-actions"><button class="cf43-btn warn" data-mod="${esc(u.uid)}">Moderate</button><button class="cf43-btn" data-copy="${esc(u.uid)}">Copy UID</button></div></div>`}).join(''):'<div class="cf43-empty">No matching users found.</div>';
    document.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>openModeration(b.dataset.mod));document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(b.dataset.copy).then(()=>toast43('UID copied')));
  }
  function openModeration(uid){selectedUid=uid;const u=users.find(x=>x.uid===uid)||{};$('cf43ModalUser').textContent=`${u.email||u.displayName||uid}`;$('cf43Reason').value='';$('cf43Modal').classList.add('open')}
  async function applyModeration(){if(!selectedUid)return;const action=$('cf43Action').value,reason=$('cf43Reason').value.trim()||'CineFlex policy enforcement',hours=Number($('cf43Duration').value);const until=hours?firebase.firestore.Timestamp.fromDate(new Date(Date.now()+hours*3600000)):null;let data={reason,updatedAt:ts(),updatedBy:me.email};if(action==='restore')data={suspended:false,muted:false,reason:'',until:null,updatedAt:ts(),updatedBy:me.email};if(action==='suspend')Object.assign(data,{suspended:true,muted:true,until});if(action==='mute')Object.assign(data,{muted:true,suspended:false,until});if(action==='warn')Object.assign(data,{warning:reason,warningAt:ts()});try{await db.collection('userModeration').doc(selectedUid).set(data,{merge:true});await log('user_'+action,selectedUid,{reason,hours});$('cf43Modal').classList.remove('open');toast43('Moderation action saved');loadUsers();loadLogs()}catch(e){toast43('Action failed: '+e.message)}}

  async function loadAdmins(){if(!can('super_admin'))return $('cf43Admins').innerHTML='<div class="cf43-empty">Super admin access required.</div>';const s=await db.collection('cineflexAdmins').get();$('cf43Admins').innerHTML=s.empty?'<div class="cf43-empty">No delegated admins yet.</div>':s.docs.map(d=>{const a=d.data();return `<div class="activity"><div><b>${esc(a.email||d.id)}</b><br><small>${esc(a.role||'viewer')}</small></div><button class="cf43-btn danger" data-remove-role="${d.id}">Remove</button></div>`}).join('');document.querySelectorAll('[data-remove-role]').forEach(b=>b.onclick=async()=>{await db.collection('cineflexAdmins').doc(b.dataset.removeRole).delete();await log('admin_role_removed',b.dataset.removeRole);loadAdmins()})}
  async function saveRole(){if(!can('super_admin'))return toast43('Super admin access required');const uid=$('cf43RoleUid').value.trim(),email=$('cf43RoleEmail').value.trim().toLowerCase(),role=$('cf43RoleValue').value;if(!uid||!email)return toast43('UID and email are required');await db.collection('cineflexAdmins').doc(uid).set({email,role,active:true,updatedAt:ts(),updatedBy:me.email},{merge:true});await log('admin_role_assigned',uid,{email,role});toast43('Admin role saved');loadAdmins();loadLogs()}
  async function loadLogs(){if(!can('super_admin','moderator','support'))return;let s;try{s=await db.collection('adminAuditLogs').orderBy('createdAt','desc').limit(100).get()}catch{s=await db.collection('adminAuditLogs').limit(100).get()}$('cf43Logs').innerHTML=s.empty?'<div class="cf43-empty">No audit actions recorded yet.</div>':s.docs.map(d=>{const x=d.data();return `<div class="cf43-log"><time>${esc(dateText(x.createdAt))}</time><div><b>${esc((x.action||'action').replaceAll('_',' '))}</b><br><small>${esc(x.adminEmail||x.adminUid||'Admin')}${x.targetUid?' → '+esc(x.targetUid):''}</small></div><span class="cf43-pill">${esc(x.role||'admin')}</span></div>`}).join('')}

  installUI();
  $('cf43UserSearch').addEventListener('input',renderUsers);$('cf43StatusFilter').addEventListener('change',renderUsers);$('cf43RefreshUsers').onclick=loadUsers;$('cf43Cancel').onclick=()=> $('cf43Modal').classList.remove('open');$('cf43Apply').onclick=applyModeration;$('cf43SaveRole').onclick=saveRole;$('cf43RefreshLogs').onclick=loadLogs;
  auth.onAuthStateChanged(async user=>{if(!user)return;me=user;myRole=await resolveRole(user);document.querySelector('.brand small').textContent='ADMIN STUDIO 4.3';await Promise.all([loadUsers(),loadAdmins(),loadLogs()])});
})();
