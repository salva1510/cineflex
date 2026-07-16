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
let filter='all',current=null,query='',queue=[],queueIndex=-1,shuffle=false,repeat=false;
const $=s=>document.querySelector(s);
const favKey='cineflex_music_favorites',recentKey='cineflex_music_recent';
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const item=id=>ITEMS.find(x=>x.id===id);
function ensure(){
 if($('#cfMusicOverlay'))return;
 document.body.insertAdjacentHTML('beforeend',`<section id="cfMusicOverlay" class="cf-music-overlay" aria-hidden="true"><div class="cf-music-shell">
 <div class="cf-music-top"><div><p class="cf-music-kicker">CINEFLEX MUSIC</p><h1 class="cf-music-title">Music for every mood</h1></div><button class="cf-music-close" onclick="cfCloseMusic()"><i class="fa-solid fa-xmark"></i></button></div>
 <div class="cf-music-hero"><h2>Listen without leaving CineFlex</h2><p>Curated OPM, study, chill and sleep music from official or creator-hosted sources.</p><button class="cf-open-radio" onclick="cfCloseMusic();cfOpenRadio()"><i class="fa-solid fa-radio"></i> Open Philippine Radio</button><div class="cf-music-search"><i class="fa-solid fa-magnifying-glass"></i><input id="cfMusicSearch" type="search" placeholder="Search music, artist or mood" autocomplete="off"></div></div>
 <div class="cf-music-toolbar"><div class="cf-music-filters" id="cfMusicFilters"></div><button class="cf-queue-open" onclick="cfToggleQueue(true)"><i class="fa-solid fa-list"></i> Queue <span id="cfQueueCount">0</span></button></div>
 <div class="cf-music-grid" id="cfMusicGrid"></div></div></section>
 <aside id="cfMusicQueue" class="cf-music-queue"><div class="cf-queue-head"><div><b>Up Next</b><span id="cfQueueNow">Nothing playing</span></div><button onclick="cfToggleQueue(false)"><i class="fa-solid fa-xmark"></i></button></div><div id="cfQueueList" class="cf-queue-list"></div><button class="cf-queue-clear" onclick="cfClearQueue()">Clear queue</button></aside>
 <div id="cfMusicPlayer" class="cf-music-player"><div class="cf-player-top"><button onclick="cfMinimizeMusic()"><i class="fa-solid fa-chevron-down"></i> Minimize</button><div class="cf-player-actions"><button id="cfShuffleBtn" onclick="cfToggleShuffle()" title="Shuffle"><i class="fa-solid fa-shuffle"></i></button><button id="cfRepeatBtn" onclick="cfToggleRepeat()" title="Repeat"><i class="fa-solid fa-repeat"></i></button><button onclick="cfToggleQueue(true)" title="Queue"><i class="fa-solid fa-list"></i></button><button onclick="cfStopMusic()"><i class="fa-solid fa-xmark"></i></button></div></div><iframe id="cfMusicFrame" class="cf-music-frame" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><div class="cf-player-bottom"><button onclick="cfPrevMusic()"><i class="fa-solid fa-backward-step"></i></button><div><b id="cfPlayerTitle">Music</b><span id="cfPlayerArtist">CineFlex</span></div><button onclick="cfNextMusic()"><i class="fa-solid fa-forward-step"></i></button></div></div>
 <div id="cfMusicMini" class="cf-music-mini"><div class="cf-music-mini-art" id="cfMiniArt">🎵</div><div class="cf-music-mini-info" onclick="cfRestoreMusic()"><b id="cfMiniTitle">Music</b><span id="cfMiniArtist">CineFlex</span></div><button onclick="cfPrevMusic()"><i class="fa-solid fa-backward-step"></i></button><button onclick="cfRestoreMusic()"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button><button onclick="cfNextMusic()"><i class="fa-solid fa-forward-step"></i></button><button class="cf-mini-close" onclick="cfStopMusic()"><i class="fa-solid fa-xmark"></i></button></div>`);
 const search=$('#cfMusicSearch');
 search.addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});
 renderFilters();render();renderQueue();
}
function renderFilters(){const f=[['all','All'],['opm','OPM'],['chill','Chill'],['sleep','Sleep'],['instrumental','Instrumental'],['favorites','Favorites'],['recent','Recently Played']];$('#cfMusicFilters').innerHTML=f.map(x=>`<button class="cf-music-filter ${filter===x[0]?'active':''}" onclick="cfMusicFilter('${x[0]}')">${x[1]}</button>`).join('');}
function baseList(){if(filter==='favorites'){const ids=get(favKey);return ITEMS.filter(x=>ids.includes(x.id));}if(filter==='recent'){return get(recentKey).map(item).filter(Boolean);}return filter==='all'?ITEMS:ITEMS.filter(x=>x.cat===filter);}
function list(){return baseList().filter(x=>!query||`${x.title} ${x.artist} ${x.cat}`.toLowerCase().includes(query));}
function render(){const favs=get(favKey),target=$('#cfMusicGrid');if(!target)return;target.innerHTML=list().map(x=>`<article class="cf-music-card" onclick="cfPlayMusic('${x.id}')">${x.live?'<span class="cf-music-live">LIVE</span>':''}<button class="cf-music-heart ${favs.includes(x.id)?'active':''}" onclick="event.stopPropagation();cfToggleMusicFavorite('${x.id}')"><i class="fa-${favs.includes(x.id)?'solid':'regular'} fa-heart"></i></button><button class="cf-music-addq" title="Add to queue" onclick="event.stopPropagation();cfAddQueue('${x.id}')"><i class="fa-solid fa-plus"></i></button><div class="cf-music-cover"><span>${x.icon}</span></div><h3>${x.title}</h3><p>${x.artist}</p></article>`).join('')||'<div class="cf-music-empty"><i class="fa-solid fa-music"></i><p>No music found.</p></div>';}
function updateMeta(x){['cfMiniTitle','cfPlayerTitle'].forEach(id=>{const n=$('#'+id);if(n)n.textContent=x.title;});['cfMiniArtist','cfPlayerArtist'].forEach(id=>{const n=$('#'+id);if(n)n.textContent=x.artist;});$('#cfMiniArt').textContent=x.icon;$('#cfQueueNow').textContent=`Playing: ${x.title}`;}
function play(id,keepQueue){ensure();const x=item(id);if(!x)return;if(x.external){window.open(x.external,'_blank','noopener');return;}if(!keepQueue){queue=[id,...ITEMS.filter(v=>v.id!==id&&!v.external).map(v=>v.id)];queueIndex=0;}current=x;let r=get(recentKey).filter(v=>v!==id);set(recentKey,[id,...r].slice(0,20));const src=x.playlist?`https://www.youtube-nocookie.com/embed/videoseries?list=${x.playlist}&autoplay=1&rel=0`:`https://www.youtube-nocookie.com/embed/${x.video}?autoplay=1&rel=0`;$('#cfMusicFrame').src=src;$('#cfMusicPlayer').classList.add('is-open');$('#cfMusicMini').classList.remove('show');updateMeta(x);renderQueue();render();}
function nextIndex(step){if(!queue.length)return -1;if(repeat&&current)return queueIndex;if(shuffle&&queue.length>1){let n=queueIndex;while(n===queueIndex)n=Math.floor(Math.random()*queue.length);return n;}return (queueIndex+step+queue.length)%queue.length;}
function renderQueue(){if(!$('#cfQueueList'))return;$('#cfQueueCount').textContent=queue.length;$('#cfQueueList').innerHTML=queue.map((id,i)=>{const x=item(id);if(!x)return'';return `<button class="cf-queue-item ${i===queueIndex?'active':''}" onclick="cfPlayQueueIndex(${i})"><span>${x.icon}</span><div><b>${x.title}</b><small>${x.artist}</small></div><i class="fa-solid fa-play"></i></button>`;}).join('')||'<p class="cf-queue-empty">Your queue is empty.</p>';}
window.cfOpenMusic=function(){ensure();$('#cfMusicOverlay').classList.add('is-open');$('#cfMusicOverlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';};
window.cfCloseMusic=function(){ensure();$('#cfMusicOverlay').classList.remove('is-open');$('#cfMusicOverlay').setAttribute('aria-hidden','true');document.body.style.overflow='';};
window.cfMusicFilter=function(v){filter=v;renderFilters();render();};
window.cfToggleMusicFavorite=function(id){let a=get(favKey);a=a.includes(id)?a.filter(x=>x!==id):[id,...a];set(favKey,a);render();};
window.cfPlayMusic=id=>play(id,false);
window.cfAddQueue=function(id){ensure();if(!queue.includes(id))queue.push(id);if(queueIndex<0&&current){queue.unshift(current.id);queueIndex=0;}renderQueue();};
window.cfPlayQueueIndex=function(i){if(!queue[i])return;queueIndex=i;play(queue[i],true);};
window.cfNextMusic=function(){ensure();const i=nextIndex(1);if(i<0)return;queueIndex=i;play(queue[i],true);};
window.cfPrevMusic=function(){ensure();const i=nextIndex(-1);if(i<0)return;queueIndex=i;play(queue[i],true);};
window.cfToggleShuffle=function(){shuffle=!shuffle;$('#cfShuffleBtn').classList.toggle('active',shuffle);};
window.cfToggleRepeat=function(){repeat=!repeat;$('#cfRepeatBtn').classList.toggle('active',repeat);};
window.cfToggleQueue=function(open){ensure();$('#cfMusicQueue').classList.toggle('is-open',!!open);};
window.cfClearQueue=function(){queue=current?[current.id]:[];queueIndex=current?0:-1;renderQueue();};
window.cfMinimizeMusic=function(){ensure();$('#cfMusicPlayer').classList.remove('is-open');if(current)$('#cfMusicMini').classList.add('show');};
window.cfRestoreMusic=function(){ensure();if(current){$('#cfMusicPlayer').classList.add('is-open');$('#cfMusicMini').classList.remove('show');}};
window.cfStopMusic=function(){ensure();$('#cfMusicFrame').src='';$('#cfMusicPlayer').classList.remove('is-open');$('#cfMusicMini').classList.remove('show');$('#cfMusicQueue').classList.remove('is-open');current=null;queue=[];queueIndex=-1;renderQueue();};
document.addEventListener('DOMContentLoaded',ensure);
})();
