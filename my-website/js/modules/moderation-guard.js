(() => {
  'use strict';
  if(typeof auth==='undefined'||typeof db==='undefined')return;
  let unsub=null;
  const now=()=>Date.now();
  const expiry=v=>{try{return (v?.toDate?v.toDate():new Date(v)).getTime()}catch{return 0}};
  function removeGate(){document.getElementById('cf43SuspendedGate')?.remove()}
  function showGate(data){removeGate();const permanent=!data.until;const end=permanent?'Until restored by an administrator':new Date(expiry(data.until)).toLocaleString();const el=document.createElement('div');el.id='cf43SuspendedGate';el.className='cf43-suspended';el.innerHTML=`<div class="box"><i class="fa-solid fa-user-lock"></i><h1>Account temporarily unavailable</h1><p>${String(data.reason||'Your account has been restricted by CineFlex moderation.').replace(/[<>]/g,'')}</p><p><b>${end}</b></p><button id="cf43Logout" class="primary-btn">Sign out</button></div>`;document.body.appendChild(el);el.querySelector('#cf43Logout').onclick=()=>auth.signOut().then(()=>location.reload())}
  auth.onAuthStateChanged(user=>{if(unsub){unsub();unsub=null}removeGate();if(!user)return;unsub=db.collection('userModeration').doc(user.uid).onSnapshot(doc=>{if(!doc.exists)return removeGate();const d=doc.data();const active=d.suspended===true&&(!d.until||expiry(d.until)>now());if(active)showGate(d);else removeGate()},()=>{})});
  window.CineFlexModeration={async canChat(){const u=auth.currentUser;if(!u)return false;const d=await db.collection('userModeration').doc(u.uid).get();if(!d.exists)return true;const x=d.data();return !(x.muted===true&&(!x.until||expiry(x.until)>now()))}};
})();
