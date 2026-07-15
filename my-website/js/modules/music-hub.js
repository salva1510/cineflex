(function(){
'use strict';
const ITEMS=[
{id:'opm26',title:'Pinoy OPM Hits 2026',artist:'Official music-video playlist',cat:'opm',playlist:'PLMmqTuUsDkRLPIsLKF0xIFX4JY457GRx8',icon:'🇵🇭'},
{id:'lofi',title:'Lofi Study Radio',artist:'Lofi Girl',cat:'chill',video:'X4VbdwhkE10',icon:'📚',live:true},
{id:'sleep',title:'Lofi Sleep Radio',artist:'Lofi Girl',cat:'sleep',video:'JD-kMIpDfnY',icon:'🌙',live:true},
{id:'asian',title:'Asian Lofi Radio',artist:'Lofi Girl',cat:'chill',video:'1Tl2FtV06qo',icon:'⛩️',live:true},
{id:'opmchill',title:'OPM Chill Vibes',artist:'Filipino playlist',cat:'opm',video:'BAXlAjUNNrg',icon:'🎸'},
{id:'audiofree',title:'Creator Music Library',artist:'Royalty-free music channel',cat:'instrumental',external:'https://www.youtube.com/c/audiolibrary-channel',icon:'🎹'}
];
let filter='all'; let current=null;
const $=s=>document.querySelector(s);
const favKey='cineflex_music_favorites',recentKey='cineflex_music_recent';
const get=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function ensure(){if($('#cfMusicOverlay'))return;document.body.insertAdjacentHTML('beforeend',`<section id="cfMusicOverlay" class="cf-music-overlay" aria-hidden="true"><div class="cf-music-shell"><div class="cf-music-top"><div><p style="margin:0;color:#4ade80;font-weight:800">CINEFLEX MUSIC</p><h1 class="cf-music-title">Music for every mood</h1></div><button class="cf-music-close" onclick="cfCloseMusic()"><i class="fa-solid fa-xmark"></i></button></div><div class="cf-music-hero"><h2>Listen without leaving CineFlex</h2><p>Curated OPM, study, chill and sleep music from official or creator-hosted sources. Music continues in the mini player while you browse.</p></div><div class="cf-music-filters" id="cfMusicFilters"></div><div class="cf-music-grid" id="cfMusicGrid"></div></div></section><div id="cfMusicPlayer" class="cf-music-player"><button class="cf-music-player-min" onclick="cfMinimizeMusic()"><i class="fa-solid fa-chevron-down"></i> Minimize</button><button class="cf-music-player-close" onclick="cfStopMusic()"><i class="fa-solid fa-xmark"></i></button><iframe id="cfMusicFrame" class="cf-music-frame" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div><div id="cfMusicMini" class="cf-music-mini"><div class="cf-music-mini-art" id="cfMiniArt">🎵</div><div class="cf-music-mini-info" onclick="cfRestoreMusic()"><b id="cfMiniTitle">Music</b><span id="cfMiniArtist">CineFlex</span></div><button onclick="cfRestoreMusic()"><i class="fa-solid fa-play"></i></button><button class="cf-mini-close" onclick="cfStopMusic()"><i class="fa-solid fa-xmark"></i></button></div>`);renderFilters();render();}
function renderFilters(){const f=[['all','All'],['opm','OPM'],['chill','Chill'],['sleep','Sleep'],['instrumental','Instrumental'],['favorites','Favorites'],['recent','Recently Played']];$('#cfMusicFilters').innerHTML=f.map(x=>`<button class="cf-music-filter ${filter===x[0]?'active':''}" onclick="cfMusicFilter('${x[0]}')">${x[1]}</button>`).join('');}
function list(){if(filter==='favorites'){const ids=get(favKey);return ITEMS.filter(x=>ids.includes(x.id))}if(filter==='recent'){const ids=get(recentKey);return ids.map(id=>ITEMS.find(x=>x.id===id)).filter(Boolean)}return filter==='all'?ITEMS:ITEMS.filter(x=>x.cat===filter)}
function render(){const favs=get(favKey);$('#cfMusicGrid').innerHTML=list().map(x=>`<article class="cf-music-card" onclick="cfPlayMusic('${x.id}')">${x.live?'<span class="cf-music-live">LIVE</span>':''}<button class="cf-music-heart ${favs.includes(x.id)?'active':''}" onclick="event.stopPropagation();cfToggleMusicFavorite('${x.id}')"><i class="fa-${favs.includes(x.id)?'solid':'regular'} fa-heart"></i></button><div class="cf-music-cover"><span>${x.icon}</span></div><h3>${x.title}</h3><p>${x.artist}</p></article>`).join('')||'<p style="color:#aaa">No items here yet.</p>';}
window.cfOpenMusic=function(){ensure();$('#cfMusicOverlay').classList.add('is-open');$('#cfMusicOverlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden'};
window.cfCloseMusic=function(){ensure();$('#cfMusicOverlay').classList.remove('is-open');$('#cfMusicOverlay').setAttribute('aria-hidden','true');document.body.style.overflow=''};
window.cfMusicFilter=function(v){filter=v;renderFilters();render()};
window.cfToggleMusicFavorite=function(id){let a=get(favKey);a=a.includes(id)?a.filter(x=>x!==id):[id,...a];set(favKey,a);render()};
window.cfPlayMusic=function(id){ensure();const x=ITEMS.find(i=>i.id===id);if(!x)return;if(x.external){window.open(x.external,'_blank','noopener');return}current=x;let r=get(recentKey).filter(v=>v!==id);set(recentKey,[id,...r].slice(0,12));const src=x.playlist?`https://www.youtube-nocookie.com/embed/videoseries?list=${x.playlist}&autoplay=1&rel=0`:`https://www.youtube-nocookie.com/embed/${x.video}?autoplay=1&rel=0`;$('#cfMusicFrame').src=src;$('#cfMusicPlayer').classList.add('is-open');$('#cfMusicMini').classList.remove('show');$('#cfMiniTitle').textContent=x.title;$('#cfMiniArtist').textContent=x.artist;$('#cfMiniArt').textContent=x.icon;};
window.cfMinimizeMusic=function(){ensure();$('#cfMusicPlayer').classList.remove('is-open');if(current)$('#cfMusicMini').classList.add('show')};
window.cfRestoreMusic=function(){ensure();if(current){$('#cfMusicPlayer').classList.add('is-open');$('#cfMusicMini').classList.remove('show')}};
window.cfStopMusic=function(){ensure();$('#cfMusicFrame').src='';$('#cfMusicPlayer').classList.remove('is-open');$('#cfMusicMini').classList.remove('show');current=null};
document.addEventListener('DOMContentLoaded',ensure);
})();
