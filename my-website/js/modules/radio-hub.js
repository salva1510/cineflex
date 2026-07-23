(function(){
'use strict';
const STATIONS=[
 {id:'wish',name:'Wish 107.5',tag:'All hits • OPM',cat:'music',icon:'🎙️',channel:'UCdfq8-581QVUtVsa8ChVnDQ',official:'https://www.wish1075.com/',direct:true},
 {id:'dzrh',name:'DZRH News',tag:'News • Public service',cat:'news',icon:'📰',channel:'UCcTiBX8js_djhSSlmJRI99A',official:'https://www.dzrh.com.ph/',direct:true},
 {id:'easy',name:'96.3 Easy Rock',tag:'Soft rock • Easy listening',cat:'music',icon:'🎸',official:'https://www.easyrock.com.ph/watch'},
 {id:'love',name:'90.7 Love Radio',tag:'OPM • Pop • Entertainment',cat:'music',icon:'❤️',official:'https://www.loveradio.com.ph/watch'},
 {id:'wrock',name:'96.3 WRocK Cebu',tag:'Lite rock • Contemporary',cat:'music',icon:'🌊',official:'https://963wrock.com/'}
];
let filter='all',current=null,query='',sleepHandle=null,sleepEnds=0,isMuted=false,lastVolume=80;
const $=s=>document.querySelector(s);
const favKey='cineflex_radio_favorites',recentKey='cineflex_radio_recent',volumeKey='cineflex_radio_volume';
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const station=id=>STATIONS.find(x=>x.id===id);
function safeVolume(){const v=Number(localStorage.getItem(volumeKey));return Number.isFinite(v)&&v>=0&&v<=100?v:80;}
function ensure(){
 if($('#cfRadioOverlay'))return;
 lastVolume=safeVolume();
 document.body.insertAdjacentHTML('beforeend',`<section id="cfRadioOverlay" class="cf-radio-overlay" aria-hidden="true"><div class="cf-radio-shell">
 <header class="cf-radio-top"><div><p>CINEFLEX RADIO</p><h1>Philippine Radio Hub</h1></div><button onclick="cfCloseRadio()" aria-label="Close Radio"><i class="fa-solid fa-xmark"></i></button></header>
 <div class="cf-radio-hero"><div><span class="cf-radio-live-dot"></span> ONLINE RADIO</div><h2>Music, news and talk—inside CineFlex</h2><p>Search stations, save favorites, and use the sleep timer while listening.</p></div>
 <label class="cf-radio-search"><i class="fa-solid fa-magnifying-glass"></i><input id="cfRadioSearch" type="search" placeholder="Search station, music, news…" oninput="cfRadioSearch(this.value)"><button type="button" onclick="cfRadioClearSearch()" aria-label="Clear search"><i class="fa-solid fa-xmark"></i></button></label>
 <div id="cfRadioFilters" class="cf-radio-filters"></div><div id="cfRadioGrid" class="cf-radio-grid"></div></div></section>
 <section id="cfRadioPlayer" class="cf-radio-player" aria-hidden="true"><div class="cf-radio-player-head"><button onclick="cfMinimizeRadio()"><i class="fa-solid fa-chevron-down"></i> Minimize</button><div><button onclick="cfOpenRadioOfficial()" title="Official player"><i class="fa-solid fa-arrow-up-right-from-square"></i></button><button onclick="cfStopRadio()"><i class="fa-solid fa-xmark"></i></button></div></div><iframe id="cfRadioFrame" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><div class="cf-radio-now"><span id="cfRadioIcon">📻</span><div class="cf-radio-meta"><b id="cfRadioName">CineFlex Radio</b><small id="cfRadioTag">Select a station</small><span id="cfRadioSleepStatus"></span></div><div class="cf-radio-controls"><button id="cfRadioMuteBtn" onclick="cfToggleRadioMute()" title="Mute"><i class="fa-solid fa-volume-high"></i></button><input id="cfRadioVolume" type="range" min="0" max="100" value="80" oninput="cfSetRadioVolume(this.value)" aria-label="Volume"><button onclick="cfShowSleepMenu()" title="Sleep timer"><i class="fa-regular fa-clock"></i></button></div><span class="cf-radio-onair">ON AIR</span></div><div id="cfRadioSleepMenu" class="cf-radio-sleep-menu"><b>Sleep timer</b><button onclick="cfSetRadioSleep(15)">15 min</button><button onclick="cfSetRadioSleep(30)">30 min</button><button onclick="cfSetRadioSleep(60)">1 hour</button><button onclick="cfSetRadioSleep(0)">Off</button></div></section>
 <div id="cfRadioMini" class="cf-radio-mini"><span id="cfRadioMiniIcon">📻</span><div onclick="cfRestoreRadio()"><b id="cfRadioMiniName">Radio</b><small id="cfRadioMiniTag">CineFlex</small><em id="cfRadioMiniSleep"></em></div><button onclick="cfToggleRadioMute()" id="cfRadioMiniMute" title="Mute"><i class="fa-solid fa-volume-high"></i></button><button onclick="cfRestoreRadio()"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button><button onclick="cfStopRadio()"><i class="fa-solid fa-xmark"></i></button></div>`);
 $('#cfRadioVolume').value=lastVolume;
 renderFilters();render();updateMuteIcons();
}
function ytCommand(func,args=[]){const f=$('#cfRadioFrame');if(!f||!f.contentWindow)return;f.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*');}
function renderFilters(){const f=[['all','All'],['music','Music'],['news','News'],['favorites','Favorites'],['recent','Recently Played']];$('#cfRadioFilters').innerHTML=f.map(x=>`<button class="${filter===x[0]?'active':''}" onclick="cfRadioFilter('${x[0]}')">${x[1]}</button>`).join('');}
function baseList(){if(filter==='favorites'){const ids=get(favKey);return STATIONS.filter(x=>ids.includes(x.id));}if(filter==='recent')return get(recentKey).map(station).filter(Boolean);return filter==='all'?STATIONS:STATIONS.filter(x=>x.cat===filter);}
function list(){const q=query.trim().toLowerCase();return q?baseList().filter(x=>`${x.name} ${x.tag} ${x.cat}`.toLowerCase().includes(q)):baseList();}
function render(){const favs=get(favKey),grid=$('#cfRadioGrid');if(!grid)return;grid.innerHTML=list().map(x=>`<article class="cf-radio-card" onclick="cfPlayRadio('${x.id}')"><button class="cf-radio-heart ${favs.includes(x.id)?'active':''}" onclick="event.stopPropagation();cfToggleRadioFavorite('${x.id}')"><i class="fa-${favs.includes(x.id)?'solid':'regular'} fa-heart"></i></button><div class="cf-radio-logo">${x.icon}</div><div class="cf-radio-card-body"><span>${x.direct?'DIRECT LIVE':'OFFICIAL PLAYER'}</span><h3>${x.name}</h3><p>${x.tag}</p></div><i class="fa-solid fa-circle-play"></i></article>`).join('')||`<div class="cf-radio-empty">${query?'No matching radio station found.':'No saved radio stations yet.'}</div>`;}
function setMeta(x){$('#cfRadioIcon').textContent=x.icon;$('#cfRadioName').textContent=x.name;$('#cfRadioTag').textContent=x.tag;$('#cfRadioMiniIcon').textContent=x.icon;$('#cfRadioMiniName').textContent=x.name;$('#cfRadioMiniTag').textContent=x.tag;if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:x.name,artist:x.tag,album:'CineFlex Radio'});navigator.mediaSession.setActionHandler('stop',()=>window.cfStopRadio());}}
function updateMuteIcons(){const cls=isMuted||lastVolume===0?'fa-volume-xmark':lastVolume<50?'fa-volume-low':'fa-volume-high';['#cfRadioMuteBtn','#cfRadioMiniMute'].forEach(s=>{const i=$(s+' i');if(i)i.className='fa-solid '+cls;});}
function updateSleepLabel(){const status=$('#cfRadioSleepStatus'),mini=$('#cfRadioMiniSleep');if(!status||!mini)return;if(!sleepEnds){status.textContent='';mini.textContent='';return;}const mins=Math.max(0,Math.ceil((sleepEnds-Date.now())/60000));status.textContent=`Sleep timer: ${mins} min`;mini.textContent=`⏱ ${mins} min`;}
window.cfOpenRadio=function(){ensure();if(typeof closeMenuDrawer==='function')closeMenuDrawer();$('#cfRadioOverlay').classList.add('is-open');$('#cfRadioOverlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';};
window.cfCloseRadio=function(){ensure();$('#cfRadioOverlay').classList.remove('is-open');$('#cfRadioOverlay').setAttribute('aria-hidden','true');document.body.style.overflow='';};
window.cfRadioFilter=function(v){filter=v;renderFilters();render();};
window.cfRadioSearch=function(v){query=v||'';render();};
window.cfRadioClearSearch=function(){query='';const el=$('#cfRadioSearch');if(el)el.value='';render();};
window.cfToggleRadioFavorite=function(id){let a=get(favKey);a=a.includes(id)?a.filter(x=>x!==id):[id,...a];set(favKey,a);render();};
window.cfPlayRadio=function(id){ensure();const x=station(id);if(!x)return;current=x;let r=get(recentKey).filter(v=>v!==id);set(recentKey,[id,...r].slice(0,20));setMeta(x);if(typeof window.cfStopMusic==='function')window.cfStopMusic();if(x.direct){$('#cfRadioFrame').src=`https://www.youtube-nocookie.com/embed/live_stream?channel=${x.channel}&autoplay=1&rel=0&enablejsapi=1&playsinline=1`;$('#cfRadioPlayer').classList.add('is-open');$('#cfRadioPlayer').setAttribute('aria-hidden','false');$('#cfRadioMini').classList.remove('show');setTimeout(()=>{ytCommand('setVolume',[lastVolume]);if(isMuted)ytCommand('mute');},1500);}else{window.open(x.official,'_blank','noopener');}render();};
window.cfSetRadioVolume=function(value){ensure();lastVolume=Math.max(0,Math.min(100,Number(value)||0));localStorage.setItem(volumeKey,String(lastVolume));isMuted=lastVolume===0;ytCommand('setVolume',[lastVolume]);if(lastVolume>0)ytCommand('unMute');updateMuteIcons();};
window.cfToggleRadioMute=function(){ensure();isMuted=!isMuted;ytCommand(isMuted?'mute':'unMute');updateMuteIcons();};
window.cfShowSleepMenu=function(){ensure();$('#cfRadioSleepMenu').classList.toggle('show');};
window.cfSetRadioSleep=function(minutes){ensure();if(sleepHandle)clearInterval(sleepHandle);sleepHandle=null;sleepEnds=minutes?Date.now()+minutes*60000:0;$('#cfRadioSleepMenu').classList.remove('show');updateSleepLabel();if(minutes){sleepHandle=setInterval(()=>{updateSleepLabel();if(Date.now()>=sleepEnds){window.cfStopRadio();}},30000);}};
window.cfOpenRadioOfficial=function(){if(current&&current.official)window.open(current.official,'_blank','noopener');};
window.cfMinimizeRadio=function(){ensure();$('#cfRadioPlayer').classList.remove('is-open');if(current)$('#cfRadioMini').classList.add('show');};
window.cfRestoreRadio=function(){ensure();if(current){$('#cfRadioPlayer').classList.add('is-open');$('#cfRadioMini').classList.remove('show');}};
window.cfStopRadio=function(){ensure();$('#cfRadioFrame').src='';$('#cfRadioPlayer').classList.remove('is-open');$('#cfRadioMini').classList.remove('show');current=null;if(sleepHandle)clearInterval(sleepHandle);sleepHandle=null;sleepEnds=0;updateSleepLabel();};
document.addEventListener('click',e=>{const m=$('#cfRadioSleepMenu');if(m&&m.classList.contains('show')&&!m.contains(e.target)&&!e.target.closest('[onclick="cfShowSleepMenu()"]'))m.classList.remove('show');});
document.addEventListener('DOMContentLoaded',ensure);
})();
