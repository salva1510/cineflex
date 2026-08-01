(function(){
'use strict';
const $=s=>document.querySelector(s);
const DATA_KEYS=['cineflex_watchlist','cineflex_recent','cineflex_music_favorites','cineflex_music_recent','cineflex_radio_favorites','cineflex_radio_recent','cineflex_taste_signals_v2','cineflex_progress_v60'];
const prefKey=id=>`cineflex_profile_prefs:${id||'guest'}`;
const dataKey=id=>`cineflex_profile_data:${id||'guest'}`;
function active(){return localStorage.getItem('cineflex_profile')||'guest';}
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f));}catch(e){return f;}}
function prefs(id=active()){return Object.assign({kids:false,compact:false,autoplay:true,profileData:true},read(prefKey(id),{}));}
function savePrefs(v,id=active()){localStorage.setItem(prefKey(id),JSON.stringify(v));}
function snapshot(id){if(!id||id==='guest')return;const out={};DATA_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)out[k]=v;});localStorage.setItem(dataKey(id),JSON.stringify(out));}
function restore(id){if(!id||id==='guest')return;const out=read(dataKey(id),{});DATA_KEYS.forEach(k=>{if(Object.prototype.hasOwnProperty.call(out,k))localStorage.setItem(k,out[k]);else localStorage.removeItem(k);});}
function ensure(){
 if($('#cfProfileCenter'))return;
 document.body.insertAdjacentHTML('beforeend',`<section id="cfProfileCenter" class="cf-profile-center" aria-hidden="true"><div class="cf-profile-panel"><header><div><p>CINEFLEX PROFILE</p><h2>Personalization</h2><span id="cfProfileActiveLabel">Current profile</span></div><button onclick="cfCloseProfileCenter()"><i class="fa-solid fa-xmark"></i></button></header><div class="cf-profile-options"><label><div><b>Kids-friendly mode</b><small>Hide mature shortcuts and prioritize family content.</small></div><input id="cfPrefKids" type="checkbox"></label><label><div><b>Compact rows</b><small>Show more posters on smaller screens.</small></div><input id="cfPrefCompact" type="checkbox"></label><label><div><b>Autoplay previews</b><small>Allow preview behavior when supported.</small></div><input id="cfPrefAutoplay" type="checkbox"></label><label><div><b>Separate profile activity</b><small>Keep My List, continue watching, music and radio history per profile.</small></div><input id="cfPrefData" type="checkbox"></label></div><div class="cf-profile-actions"><button onclick="cfResetCurrentProfileData()"><i class="fa-solid fa-rotate-left"></i> Reset profile activity</button><button class="primary" onclick="cfSaveProfilePrefs()"><i class="fa-solid fa-check"></i> Save preferences</button></div></div></section>`);
}
function profileName(){const el=document.querySelector('.drawer-profile.active span,.drawer-profile.active strong,#userName');return el&&el.textContent.trim()?el.textContent.trim():'Current profile';}
function apply(){const p=prefs();document.documentElement.classList.toggle('cf-kids-mode',!!p.kids);document.documentElement.classList.toggle('cf-compact-mode',!!p.compact);document.documentElement.dataset.cfAutoplay=p.autoplay?'on':'off';
 document.querySelectorAll('[onclick*="horror"], [onclick*="filipino"], #horror-section, #filipino-section').forEach(el=>{el.classList.toggle('cf-profile-hidden',!!p.kids);});
}
window.cfOpenProfileCenter=function(){ensure();const p=prefs();$('#cfPrefKids').checked=!!p.kids;$('#cfPrefCompact').checked=!!p.compact;$('#cfPrefAutoplay').checked=!!p.autoplay;$('#cfPrefData').checked=p.profileData!==false;$('#cfProfileActiveLabel').textContent=profileName();$('#cfProfileCenter').classList.add('open');$('#cfProfileCenter').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(typeof closeMenuDrawer==='function')closeMenuDrawer();};
window.cfCloseProfileCenter=function(){ensure();$('#cfProfileCenter').classList.remove('open');$('#cfProfileCenter').setAttribute('aria-hidden','true');document.body.style.overflow='';};
window.cfSaveProfilePrefs=function(){ensure();const p={kids:$('#cfPrefKids').checked,compact:$('#cfPrefCompact').checked,autoplay:$('#cfPrefAutoplay').checked,profileData:$('#cfPrefData').checked};savePrefs(p);apply();window.cfCloseProfileCenter();if(typeof showToast==='function')showToast('Profile preferences saved');else alert('Profile preferences saved.');};
window.cfResetCurrentProfileData=function(){if(!confirm('Clear My List, continue watching, music and radio activity for this profile?'))return;DATA_KEYS.forEach(k=>localStorage.removeItem(k));localStorage.removeItem(dataKey(active()));location.reload();};
window.addEventListener('cineflex:before-profile-switch',e=>{const from=e.detail&&e.detail.from;if(prefs(from).profileData!==false)snapshot(from);});
window.addEventListener('cineflex:profile-switched',e=>{const from=e.detail&&e.detail.from;const to=e.detail&&e.detail.to;if(!to||from===to){apply();return;}if(prefs(to).profileData!==false)restore(to);apply();setTimeout(()=>location.reload(),80);});
document.addEventListener('DOMContentLoaded',()=>{ensure();apply();});
})();
