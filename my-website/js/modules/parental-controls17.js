(function(){
'use strict';
const $=s=>document.querySelector(s);
const active=()=>localStorage.getItem('cineflex_profile')||'guest';
const prefKey=id=>`cineflex_profile_prefs:${id||'guest'}`;
const pinKey=id=>`cineflex_parent_pin:${id||'guest'}`;
const unlockedKey=id=>`cineflex_parent_unlocked:${id||'guest'}`;
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f));}catch(e){return f;}}
function prefs(){return Object.assign({kids:false},read(prefKey(active()),{}));}
function savePrefs(v){localStorage.setItem(prefKey(active()),JSON.stringify(v));}
async function digest(value){
  const text=String(value||'');
  if(window.crypto&&crypto.subtle){
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`cineflex:${active()}:${text}`));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  return btoa(unescape(encodeURIComponent(`cineflex:${active()}:${text}`)));
}
function hasPin(){return !!localStorage.getItem(pinKey(active()));}
function isUnlocked(){return sessionStorage.getItem(unlockedKey(active()))==='1';}
function lock(){sessionStorage.removeItem(unlockedKey(active()));}
function toast(msg){if(typeof showToast==='function')showToast(msg);else alert(msg);}
function ensure(){
 if($('#cfParentalCenter'))return;
 document.body.insertAdjacentHTML('beforeend',`<section id="cfParentalCenter" class="cf-parental-center" aria-hidden="true"><div class="cf-parental-panel"><header><div><p>CINEFLEX FAMILY</p><h2>Parental Controls</h2><span id="cfParentProfile">Current profile</span></div><button type="button" onclick="cfCloseParentalControls()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></header><div class="cf-parental-hero"><i class="fa-solid fa-shield-heart"></i><div><b>Protected Kids Mode</b><small>Use a 4-digit PIN before changing kids settings or opening restricted content.</small></div></div><label class="cf-parent-switch"><div><b>Kids Mode</b><small>Hide mature shortcuts and block adult or horror titles.</small></div><input id="cfParentKids" type="checkbox"></label><div class="cf-pin-grid"><label><span>${hasPin()?'New PIN (optional)':'Create PIN'}</span><input id="cfParentPin" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="4 digits" type="password"></label><label><span>Confirm PIN</span><input id="cfParentPinConfirm" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="4 digits" type="password"></label></div><p class="cf-parent-note"><i class="fa-solid fa-circle-info"></i> The PIN is stored as a one-way hash on this device.</p><div class="cf-parent-actions"><button type="button" onclick="cfLockParentalNow()"><i class="fa-solid fa-lock"></i> Lock now</button><button class="primary" type="button" onclick="cfSaveParentalControls()"><i class="fa-solid fa-check"></i> Save controls</button></div></div></section>`);
 document.body.insertAdjacentHTML('beforeend',`<section id="cfPinGate" class="cf-pin-gate" aria-hidden="true"><form id="cfPinForm" class="cf-pin-card"><i class="fa-solid fa-lock"></i><h3>Parent PIN required</h3><p id="cfPinMessage">Enter the 4-digit PIN to continue.</p><input id="cfPinInput" inputmode="numeric" maxlength="4" pattern="[0-9]*" type="password" autocomplete="one-time-code" placeholder="••••"><div><button type="button" onclick="cfCancelPinGate()">Cancel</button><button class="primary" type="submit">Unlock</button></div></form></section>`);
 $('#cfPinForm').addEventListener('submit',verifyGate);
}
let pendingAction=null;
async function requestPin(message,action){
 ensure();
 if(!hasPin()||isUnlocked()){action();return;}
 pendingAction=action;
 $('#cfPinMessage').textContent=message||'Enter the 4-digit PIN to continue.';
 $('#cfPinInput').value='';
 $('#cfPinGate').classList.add('open');
 $('#cfPinGate').setAttribute('aria-hidden','false');
 setTimeout(()=>$('#cfPinInput').focus(),50);
}
async function verifyGate(e){
 e.preventDefault();
 const value=$('#cfPinInput').value.trim();
 if(!/^\d{4}$/.test(value)){toast('Enter a valid 4-digit PIN.');return;}
 const ok=(await digest(value))===localStorage.getItem(pinKey(active()));
 if(!ok){$('#cfPinForm').classList.add('shake');setTimeout(()=>$('#cfPinForm').classList.remove('shake'),350);toast('Incorrect parent PIN.');return;}
 sessionStorage.setItem(unlockedKey(active()),'1');
 $('#cfPinGate').classList.remove('open');
 $('#cfPinGate').setAttribute('aria-hidden','true');
 const action=pendingAction;pendingAction=null;if(action)action();
}
window.cfCancelPinGate=function(){ensure();pendingAction=null;$('#cfPinGate').classList.remove('open');$('#cfPinGate').setAttribute('aria-hidden','true');};
window.cfOpenParentalControls=function(){ensure();requestPin('Enter the parent PIN to change parental controls.',()=>{
 const p=prefs();$('#cfParentKids').checked=!!p.kids;$('#cfParentPin').value='';$('#cfParentPinConfirm').value='';$('#cfParentProfile').textContent=(document.querySelector('#userName')?.textContent||'Current profile').trim();$('#cfParentalCenter').classList.add('open');$('#cfParentalCenter').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(typeof closeMenuDrawer==='function')closeMenuDrawer();
 });};
window.cfCloseParentalControls=function(){ensure();$('#cfParentalCenter').classList.remove('open');$('#cfParentalCenter').setAttribute('aria-hidden','true');document.body.style.overflow='';};
window.cfSaveParentalControls=async function(){
 ensure();const pin=$('#cfParentPin').value.trim(),confirmPin=$('#cfParentPinConfirm').value.trim();
 if(pin||confirmPin){if(!/^\d{4}$/.test(pin)){toast('PIN must be exactly 4 digits.');return;}if(pin!==confirmPin){toast('PIN confirmation does not match.');return;}localStorage.setItem(pinKey(active()),await digest(pin));}
 const p=read(prefKey(active()),{});p.kids=$('#cfParentKids').checked;savePrefs(p);lock();window.cfCloseParentalControls();toast('Parental controls saved.');setTimeout(()=>location.reload(),250);
};
window.cfLockParentalNow=function(){lock();toast('Parental controls locked.');};
function restrictedItem(item){
 if(!prefs().kids||!item)return false;
 const genres=item.genre_ids||[];
 const title=String(item.title||item.name||'').toLowerCase();
 return item.adult===true||genres.includes(27)||/\b(horror|slasher|erotic|sexy|vivamax)\b/.test(title);
}
function blocked(){toast('This title is blocked by Kids Mode.');}
function wrapGuards(){
 if(typeof window.showDetails==='function'&&!window.showDetails.__cfParentWrapped){const original=window.showDetails;const wrapped=function(item){if(restrictedItem(item)){blocked();return;}return original.apply(this,arguments);};wrapped.__cfParentWrapped=true;window.showDetails=wrapped;}
 if(typeof window.cfOpenCatalog==='function'&&!window.cfOpenCatalog.__cfParentWrapped){const original=window.cfOpenCatalog;const wrapped=function(type){if(prefs().kids&&['horror','filipino'].includes(String(type))){blocked();return;}return original.apply(this,arguments);};wrapped.__cfParentWrapped=true;window.cfOpenCatalog=wrapped;}
 if(typeof window.cfOpenProfileCenter==='function'&&!window.cfOpenProfileCenter.__cfParentWrapped){const original=window.cfOpenProfileCenter;const wrapped=function(){if(prefs().kids&&hasPin()&&!isUnlocked()){requestPin('Enter the parent PIN to open profile preferences.',()=>original.apply(window,arguments));return;}return original.apply(this,arguments);};wrapped.__cfParentWrapped=true;window.cfOpenProfileCenter=wrapped;}
}
function addDrawer(){
 const personal=document.querySelector('.drawer-section .drawer-item[onclick*="cfOpenProfileCenter"]')?.parentElement;
 if(personal&&!$('#cfParentalDrawerItem'))personal.insertAdjacentHTML('beforeend','<div id="cfParentalDrawerItem" class="drawer-item" onclick="cfOpenParentalControls()"><i class="fa-solid fa-shield-heart"></i> Parental Controls <span style="margin-left:auto;color:#facc15;font-size:.68rem;font-weight:900">PIN</span></div>');
}
function applyKidsBrand(){document.documentElement.classList.toggle('cf-parent-kids-active',!!prefs().kids);}
document.addEventListener('DOMContentLoaded',()=>{ensure();addDrawer();applyKidsBrand();setTimeout(wrapGuards,100);setTimeout(wrapGuards,1000);});
window.addEventListener('cineflex:profile-switched',()=>{lock();setTimeout(()=>{applyKidsBrand();wrapGuards();},100);});
})();
