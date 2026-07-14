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
    nav.insertAdjacentHTML('beforeend',`<button class="nav-btn" data-page="users"><i class="fa-solid fa-user-shield"></i>User Moderation</button><button class="nav-btn" data-page="watchtime"><i class="fa-solid fa-clock"></i>Watch Time</button><button class="nav-btn" data-page="vip"><i class="fa-solid fa-crown"></i>VIP Manager</button><button class="nav-btn" data-page="roles"><i class="fa-solid fa-key"></i>Admin Roles</button><button class="nav-btn" data-page="audit"><i class="fa-solid fa-clipboard-list"></i>Audit Logs</button>`);
    const main=document.querySelector('main.content');
    main.insertAdjacentHTML('beforeend',`
<section id="users" class="page"><div class="panel"><div class="manager-head"><div><h2>User Moderation</h2><p class="muted">Suspend, mute, warn, or restore CineFlex accounts.</p></div></div><div class="cf43-toolbar"><input id="cf43UserSearch" placeholder="Search email, name, or UID"><select id="cf43StatusFilter"><option value="all">All accounts</option><option value="active">Active</option><option value="muted">Muted</option><option value="suspended">Suspended</option></select><button id="cf43RefreshUsers" class="primary-btn">Refresh</button></div><div id="cf43Users"><div class="cf43-empty">Loading users…</div></div></div></section>
<section id="watchtime" class="page"><div class="grid-2"><div class="panel"><h2>Custom Watch Time</h2><p class="muted">Add, replace, or reset a user's watch-time balance.</p><div class="cf43-card"><div class="cf43-form-row"><label>User UID</label><input id="cf43TimeUid" placeholder="Paste Firebase UID or choose a user below"></div><div class="cf43-form-row"><label>Hours</label><input id="cf43TimeHours" type="number" min="0" max="10000" step="1" value="0"></div><div class="cf43-form-row"><label>Minutes</label><input id="cf43TimeMinutes" type="number" min="0" max="59" step="1" value="30"></div><div class="cf43-time-actions"><button id="cf43AddTime" class="primary-btn"><i class="fa-solid fa-plus"></i> Add Time</button><button id="cf43SetTime" class="ghost-btn"><i class="fa-solid fa-pen"></i> Set Exact Time</button><button id="cf43ResetTime" class="cf43-btn danger"><i class="fa-solid fa-rotate-left"></i> Reset to 0</button></div><div id="cf43TimeResult" class="cf43-time-result">Enter a UID to view its current balance.</div></div></div><div class="panel"><div class="manager-head"><div><h2>Select User</h2><p class="muted">Search by email, name, or UID.</p></div><button id="cf43RefreshTimeUsers" class="ghost-btn">Refresh</button></div><input id="cf43TimeSearch" class="cf43-time-search" placeholder="Search user..."><div id="cf43TimeUsers"><div class="cf43-empty">Loading users…</div></div></div></div></section>
<section id="vip" class="page"><div class="grid-2"><div class="panel"><h2>VIP Manager</h2><p class="muted">Upgrade, extend, or remove VIP access instantly.</p><div class="cf43-card"><div class="cf43-form-row"><label>User UID</label><input id="cf43VipUid" placeholder="Paste Firebase UID or choose a user below"></div><div class="cf43-form-row"><label>VIP duration</label><select id="cf43VipDuration"><option value="30">30 Days</option><option value="90">90 Days</option><option value="365">1 Year</option><option value="lifetime">Lifetime</option></select></div><div class="cf43-vip-actions"><button id="cf43UpgradeVip" class="primary-btn"><i class="fa-solid fa-crown"></i> Upgrade / Extend VIP</button><button id="cf43RemoveVip" class="cf43-btn danger"><i class="fa-solid fa-user-minus"></i> Remove VIP</button></div><div id="cf43VipResult" class="cf43-time-result">Select a user to view membership status.</div></div></div><div class="panel"><div class="manager-head"><div><h2>Select User</h2><p class="muted">Search by email, name, or UID.</p></div><button id="cf43RefreshVipUsers" class="ghost-btn">Refresh</button></div><input id="cf43VipSearch" class="cf43-time-search" placeholder="Search user..."><div id="cf43VipUsers"><div class="cf43-empty">Loading users…</div></div></div></div><div class="panel cf43-vip-requests-panel"><div class="manager-head"><div><h2>Pending VIP Requests</h2><p class="muted">Approve or reject membership requests.</p></div><button id="cf43RefreshVipRequests" class="ghost-btn">Refresh</button></div><div id="cf43VipRequests"><div class="cf43-empty">Loading requests…</div></div></div></section>
<section id="roles" class="page"><div class="grid-2"><div class="panel"><h2>Assign Admin Role</h2><p class="muted">Only the super admin can change roles.</p><div class="cf43-card"><div class="cf43-form-row"><label>User UID</label><input id="cf43RoleUid" placeholder="Firebase user UID"></div><div class="cf43-form-row"><label>Email</label><input id="cf43RoleEmail" type="email" placeholder="user@example.com"></div><div class="cf43-form-row"><label>Role</label><select id="cf43RoleValue"><option value="moderator">Moderator</option><option value="content_manager">Content Manager</option><option value="support">Support</option><option value="super_admin">Super Admin</option></select></div><button id="cf43SaveRole" class="primary-btn">Save role</button></div></div><div class="panel"><h2>Current Admins</h2><div id="cf43Admins">Loading…</div></div></div></section>
<section id="audit" class="page"><div class="panel"><div class="manager-head"><div><h2>Admin Audit Trail</h2><p class="muted">Recent security and moderation actions.</p></div><button id="cf43RefreshLogs" class="ghost-btn">Refresh</button></div><div id="cf43Logs">Loading…</div></div></section>`);
    document.body.insertAdjacentHTML('beforeend',`<div id="cf43Modal" class="cf43-modal"><div class="cf43-modal-card"><h2 id="cf43ModalTitle">Moderate user</h2><p id="cf43ModalUser" class="muted"></p><div class="cf43-form-row"><label>Action</label><select id="cf43Action"><option value="warn">Warning</option><option value="mute">Mute chat</option><option value="suspend">Suspend account</option><option value="restore">Restore access</option></select></div><div class="cf43-form-row"><label>Duration</label><select id="cf43Duration"><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option><option value="720">30 days</option><option value="0">Permanent</option></select></div><div class="cf43-form-row"><label>Reason</label><textarea id="cf43Reason" rows="4" maxlength="300" placeholder="Reason shown to the user"></textarea></div><div class="actions"><button id="cf43Cancel" class="ghost-btn">Cancel</button><button id="cf43Apply" class="primary-btn">Apply action</button></div></div></div>`);

    document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const labels={users:['User Moderation','Manage account access, warnings, and chat restrictions'],watchtime:['Watch Time','Customize each user’s viewing balance'],vip:['VIP Manager','Upgrade, extend, or remove VIP access'],roles:['Admin Roles','Assign secure responsibilities to your team'],audit:['Audit Logs','Review recent administrative actions']};
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
    users=[...out.values()];renderUsers();renderTimeUsers();renderVipUsers();
  }
  function statusOf(u){const m=u.moderation||{};if(m.suspended===true&&(!m.until||dateVal(m.until)>Date.now()))return 'suspended';if(m.muted===true&&(!m.until||dateVal(m.until)>Date.now()))return 'muted';return 'active'}
  function dateVal(v){try{return (v?.toDate?v.toDate():new Date(v)).getTime()}catch{return 0}}
  function renderUsers(){const q=($('cf43UserSearch').value||'').toLowerCase(),f=$('cf43StatusFilter').value;const list=users.filter(u=>{const s=statusOf(u);return(f==='all'||f===s)&&(`${u.email||''} ${u.displayName||u.name||''} ${u.uid}`).toLowerCase().includes(q)});$('cf43Users').innerHTML=list.length?list.map(u=>{const s=statusOf(u);return `<div class="cf43-user"><img class="cf43-avatar" src="${esc(u.photoURL||u.photo||'icon-192.png')}" alt=""><div class="cf43-meta"><b>${esc(u.displayName||u.name||u.email||'CineFlex User')}</b><small>${esc(u.email||u.uid)}</small><span class="cf43-pill ${s==='suspended'?'banned':''}">${s}</span></div><div class="cf43-actions"><button class="cf43-btn warn" data-mod="${esc(u.uid)}">Moderate</button><button class="cf43-btn" data-copy="${esc(u.uid)}">Copy UID</button></div></div>`}).join(''):'<div class="cf43-empty">No matching users found.</div>';
    document.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>openModeration(b.dataset.mod));document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(b.dataset.copy).then(()=>toast43('UID copied')));
  }
  function openModeration(uid){selectedUid=uid;const u=users.find(x=>x.uid===uid)||{};$('cf43ModalUser').textContent=`${u.email||u.displayName||uid}`;$('cf43Reason').value='';$('cf43Modal').classList.add('open')}
  async function applyModeration(){if(!selectedUid)return;const action=$('cf43Action').value,reason=$('cf43Reason').value.trim()||'CineFlex policy enforcement',hours=Number($('cf43Duration').value);const until=hours?firebase.firestore.Timestamp.fromDate(new Date(Date.now()+hours*3600000)):null;let data={reason,updatedAt:ts(),updatedBy:me.email};if(action==='restore')data={suspended:false,muted:false,reason:'',until:null,updatedAt:ts(),updatedBy:me.email};if(action==='suspend')Object.assign(data,{suspended:true,muted:true,until});if(action==='mute')Object.assign(data,{muted:true,suspended:false,until});if(action==='warn')Object.assign(data,{warning:reason,warningAt:ts()});try{await db.collection('userModeration').doc(selectedUid).set(data,{merge:true});await log('user_'+action,selectedUid,{reason,hours});$('cf43Modal').classList.remove('open');toast43('Moderation action saved');loadUsers();loadLogs()}catch(e){toast43('Action failed: '+e.message)}}


  function fmtTime(total){
    total=Math.max(0,Math.floor(Number(total)||0));
    const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;
    return `${h}h ${m}m ${sec}s`;
  }
  function selectedTimeSeconds(){
    const h=Math.max(0,Number($('cf43TimeHours').value)||0);
    const m=Math.max(0,Math.min(59,Number($('cf43TimeMinutes').value)||0));
    return Math.floor(h*3600+m*60);
  }
  function renderTimeUsers(){
    const q=($('cf43TimeSearch').value||'').toLowerCase();
    const list=users.filter(u=>(`${u.email||''} ${u.displayName||u.name||''} ${u.uid}`).toLowerCase().includes(q)).slice(0,100);
    $('cf43TimeUsers').innerHTML=list.length?list.map(u=>`<button class="cf43-time-user" data-time-user="${esc(u.uid)}"><img src="${esc(u.photoURL||u.photo||'icon-192.png')}" alt=""><span><b>${esc(u.displayName||u.name||u.email||'CineFlex User')}</b><small>${esc(u.email||u.uid)}</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join(''):'<div class="cf43-empty">No matching users found.</div>';
    document.querySelectorAll('[data-time-user]').forEach(b=>b.onclick=()=>selectTimeUser(b.dataset.timeUser));
  }
  async function selectTimeUser(uid){
    $('cf43TimeUid').value=uid;
    const u=users.find(x=>x.uid===uid)||{};
    $('cf43TimeResult').innerHTML=`<b>${esc(u.email||u.displayName||uid)}</b><br>Loading current balance…`;
    await loadTimeBalance();
  }
  async function loadTimeBalance(){
    const uid=$('cf43TimeUid').value.trim();
    if(!uid)return $('cf43TimeResult').textContent='Enter a valid UID.';
    try{
      const snap=await db.collection('users').doc(uid).collection('watchTime').doc('balance').get();
      const value=snap.exists?Math.max(0,Number(snap.data().remainingSeconds)||0):0;
      const u=users.find(x=>x.uid===uid)||{};
      $('cf43TimeResult').innerHTML=`<b>${esc(u.email||u.displayName||uid)}</b><br>Current balance: <strong>${fmtTime(value)}</strong> (${value.toLocaleString()} seconds)`;
    }catch(e){$('cf43TimeResult').textContent='Unable to read balance: '+e.message}
  }
  async function changeWatchTime(mode){
    if(!can('super_admin'))return toast43('Super admin access required');
    const uid=$('cf43TimeUid').value.trim();
    if(!uid)return toast43('Enter or select a user UID');
    const amount=mode==='reset'?0:selectedTimeSeconds();
    if(mode!=='reset'&&amount<=0)return toast43('Enter hours or minutes greater than 0');
    const ref=db.collection('users').doc(uid).collection('watchTime').doc('balance');
    try{
      let before=0,after=0;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        before=snap.exists?Math.max(0,Number(snap.data().remainingSeconds)||0):0;
        after=mode==='add'?before+amount:amount;
        tx.set(ref,{remainingSeconds:after,adminAdjusted:true,adminAction:mode,adminDeltaSeconds:mode==='add'?amount:after-before,updatedAt:ts(),updatedBy:me.email,updatedByUid:me.uid},{merge:true});
      });
      await log('watch_time_'+mode,uid,{beforeSeconds:before,afterSeconds:after,amountSeconds:amount});
      toast43(mode==='add'?'Watch time added':mode==='set'?'Exact watch time saved':'Watch time reset');
      await loadTimeBalance();
      loadLogs();
    }catch(e){toast43('Watch-time update failed: '+e.message)}
  }

  function renderVipUsers(){
    const box=$('cf43VipUsers'); if(!box)return;
    const q=($('cf43VipSearch').value||'').toLowerCase();
    const list=users.filter(u=>(`${u.email||''} ${u.displayName||u.name||''} ${u.uid}`).toLowerCase().includes(q));
    box.innerHTML=list.length?list.map(u=>`<button class="cf43-time-user" data-vip-uid="${esc(u.uid)}"><img src="${esc(u.photoURL||u.photo||'icon-192.png')}" alt=""><span><b>${esc(u.displayName||u.name||u.email||'CineFlex User')}</b><small>${esc(u.email||u.uid)}</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join(''):'<div class="cf43-empty">No matching users found.</div>';
    document.querySelectorAll('[data-vip-uid]').forEach(b=>b.onclick=()=>{$('cf43VipUid').value=b.dataset.vipUid;loadVipStatus()});
  }
  function vipExpiryText(data){if(!data||data.active!==true)return 'FREE';if(data.lifetime===true)return 'VIP · Lifetime';const ms=Number(data.expiresAtMs)||dateVal(data.expiresAt);if(ms&&ms<=Date.now())return 'EXPIRED';return ms?'VIP until '+new Date(ms).toLocaleString():'VIP';}
  async function loadVipStatus(){
    const uid=$('cf43VipUid').value.trim(); if(!uid)return $('cf43VipResult').textContent='Select a user to view membership status.';
    try{const snap=await db.collection('users').doc(uid).collection('membership').doc('current').get();const data=snap.exists?snap.data():{};const u=users.find(x=>x.uid===uid)||{};$('cf43VipResult').innerHTML=`<b>${esc(u.email||u.displayName||uid)}</b><br>Current plan: <strong>${esc(vipExpiryText(data))}</strong>`;}catch(e){$('cf43VipResult').textContent='Unable to read VIP status: '+e.message}
  }
  async function setVip(active){
    if(!can('super_admin'))return toast43('Super admin access required');
    const uid=$('cf43VipUid').value.trim(); if(!uid)return toast43('Enter or select a user UID');
    const ref=db.collection('users').doc(uid).collection('membership').doc('current');
    try{
      if(active){const choice=$('cf43VipDuration').value;const lifetime=choice==='lifetime';const expiresAtMs=lifetime?4102444800000:Date.now()+Number(choice)*86400000;await ref.set({active:true,plan:'vip',lifetime,expiresAtMs,updatedAt:ts(),updatedBy:me.email,updatedByUid:me.uid},{merge:true});await log('vip_upgraded',uid,{duration:choice,expiresAtMs,lifetime});toast43('VIP access activated');}
      else{await ref.set({active:false,plan:'free',lifetime:false,expiresAtMs:0,updatedAt:ts(),updatedBy:me.email,updatedByUid:me.uid},{merge:true});await log('vip_removed',uid);toast43('VIP access removed');}
      await loadVipStatus();loadVipRequests();loadLogs();
    }catch(e){toast43('VIP update failed: '+e.message)}
  }
  async function loadVipRequests(){
    const box=$('cf43VipRequests');if(!box||!can('super_admin'))return;
    try{let snap;try{snap=await db.collection('vipRequests').where('status','==','pending').limit(100).get()}catch(e){snap=await db.collection('vipRequests').limit(100).get()}
      const docs=snap.docs.filter(d=>{const x=d.data();return !x.status||x.status==='pending'});
      box.innerHTML=docs.length?docs.map(d=>{const x=d.data();return `<div class="cf43-vip-request"><div><b>${esc(x.email||x.displayName||x.uid||'CineFlex User')}</b><small>${esc(x.uid||'No UID')}</small></div><div class="cf43-actions"><button class="cf43-btn" data-vip-approve="${d.id}" data-uid="${esc(x.uid||'')}">Approve</button><button class="cf43-btn danger" data-vip-reject="${d.id}" data-uid="${esc(x.uid||'')}">Reject</button></div></div>`}).join(''):'<div class="cf43-empty">No pending VIP requests.</div>';
      document.querySelectorAll('[data-vip-approve]').forEach(b=>b.onclick=async()=>{if(!b.dataset.uid)return toast43('Request has no user UID');$('cf43VipUid').value=b.dataset.uid;await setVip(true);await db.collection('vipRequests').doc(b.dataset.vipApprove).set({status:'approved',reviewedAt:ts(),reviewedBy:me.email},{merge:true});await log('vip_request_approved',b.dataset.uid,{requestId:b.dataset.vipApprove});loadVipRequests()});
      document.querySelectorAll('[data-vip-reject]').forEach(b=>b.onclick=async()=>{await db.collection('vipRequests').doc(b.dataset.vipReject).set({status:'rejected',reviewedAt:ts(),reviewedBy:me.email},{merge:true});await log('vip_request_rejected',b.dataset.uid,{requestId:b.dataset.vipReject});toast43('VIP request rejected');loadVipRequests()});
    }catch(e){box.innerHTML='<div class="cf43-empty">Unable to load VIP requests: '+esc(e.message)+'</div>'}
  }

  async function loadAdmins(){if(!can('super_admin'))return $('cf43Admins').innerHTML='<div class="cf43-empty">Super admin access required.</div>';const s=await db.collection('cineflexAdmins').get();$('cf43Admins').innerHTML=s.empty?'<div class="cf43-empty">No delegated admins yet.</div>':s.docs.map(d=>{const a=d.data();return `<div class="activity"><div><b>${esc(a.email||d.id)}</b><br><small>${esc(a.role||'viewer')}</small></div><button class="cf43-btn danger" data-remove-role="${d.id}">Remove</button></div>`}).join('');document.querySelectorAll('[data-remove-role]').forEach(b=>b.onclick=async()=>{await db.collection('cineflexAdmins').doc(b.dataset.removeRole).delete();await log('admin_role_removed',b.dataset.removeRole);loadAdmins()})}
  async function saveRole(){if(!can('super_admin'))return toast43('Super admin access required');const uid=$('cf43RoleUid').value.trim(),email=$('cf43RoleEmail').value.trim().toLowerCase(),role=$('cf43RoleValue').value;if(!uid||!email)return toast43('UID and email are required');await db.collection('cineflexAdmins').doc(uid).set({email,role,active:true,updatedAt:ts(),updatedBy:me.email},{merge:true});await log('admin_role_assigned',uid,{email,role});toast43('Admin role saved');loadAdmins();loadLogs()}
  async function loadLogs(){if(!can('super_admin','moderator','support'))return;let s;try{s=await db.collection('adminAuditLogs').orderBy('createdAt','desc').limit(100).get()}catch{s=await db.collection('adminAuditLogs').limit(100).get()}$('cf43Logs').innerHTML=s.empty?'<div class="cf43-empty">No audit actions recorded yet.</div>':s.docs.map(d=>{const x=d.data();return `<div class="cf43-log"><time>${esc(dateText(x.createdAt))}</time><div><b>${esc((x.action||'action').replaceAll('_',' '))}</b><br><small>${esc(x.adminEmail||x.adminUid||'Admin')}${x.targetUid?' → '+esc(x.targetUid):''}</small></div><span class="cf43-pill">${esc(x.role||'admin')}</span></div>`}).join('')}

  installUI();
  $('cf43UserSearch').addEventListener('input',renderUsers);$('cf43TimeSearch').addEventListener('input',renderTimeUsers);$('cf43VipSearch').addEventListener('input',renderVipUsers);$('cf43VipUid').addEventListener('change',loadVipStatus);$('cf43RefreshVipUsers').onclick=loadUsers;$('cf43UpgradeVip').onclick=()=>setVip(true);$('cf43RemoveVip').onclick=()=>setVip(false);$('cf43RefreshVipRequests').onclick=loadVipRequests;$('cf43TimeUid').addEventListener('change',loadTimeBalance);$('cf43RefreshTimeUsers').onclick=loadUsers;$('cf43AddTime').onclick=()=>changeWatchTime('add');$('cf43SetTime').onclick=()=>changeWatchTime('set');$('cf43ResetTime').onclick=()=>changeWatchTime('reset');$('cf43StatusFilter').addEventListener('change',renderUsers);$('cf43RefreshUsers').onclick=loadUsers;$('cf43Cancel').onclick=()=> $('cf43Modal').classList.remove('open');$('cf43Apply').onclick=applyModeration;$('cf43SaveRole').onclick=saveRole;$('cf43RefreshLogs').onclick=loadLogs;
  auth.onAuthStateChanged(async user=>{if(!user)return;me=user;myRole=await resolveRole(user);document.querySelector('.brand small').textContent='ADMIN STUDIO 4.3';await Promise.all([loadUsers(),loadAdmins(),loadLogs(),loadVipRequests()])});
})();
