(function(){
'use strict';
const CFG=window.CINEFLEX_YOUTUBE||{};
const API='https://www.googleapis.com/youtube/v3';
const GENRES={
 trending:{label:'Trending',q:'official music video',order:'viewCount'},
 opm:{label:'OPM',q:'OPM official music video Philippines',order:'relevance'},
 pop:{label:'Pop',q:'pop official music video',order:'viewCount'},
 rock:{label:'Rock',q:'rock official music video',order:'viewCount'},
 hiphop:{label:'Hip-Hop',q:'hip hop official music video',order:'viewCount'},
 rnb:{label:'R&B',q:'R&B official music video',order:'viewCount'},
 kpop:{label:'K-Pop',q:'K-pop official music video',order:'viewCount'},
 worship:{label:'Worship',q:'Christian worship official music',order:'viewCount'},
 reggae:{label:'Reggae',q:'reggae official music video',order:'viewCount'},
 edm:{label:'EDM',q:'EDM official music video',order:'viewCount'},
 acoustic:{label:'Acoustic',q:'acoustic official music',order:'relevance'},
 chill:{label:'Chill',q:'chill music official',order:'relevance'},
 jazz:{label:'Jazz',q:'jazz music official',order:'relevance'},
 classical:{label:'Classical',q:'classical music official',order:'relevance'}
};
let genre='trending',items=[],nextToken='',loading=false,current=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>{n=Number(n||0);return n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n)};
const cacheKey=(g,q)=>`cf_ytmusic_${g}_${(q||'').toLowerCase().replace(/\W+/g,'_').slice(0,45)}`;
function ensure(){
 if($('#cfYTMusicOverlay'))return;
 document.body.insertAdjacentHTML('beforeend',`<section id="cfYTMusicOverlay" class="cf-ytm-overlay" aria-hidden="true">
 <div class="cf-ytm-shell">
  <header class="cf-ytm-head"><div><p>Powered by YouTube</p><h1>YouTube Music</h1></div><button onclick="cfCloseMusic()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></header>
  <div class="cf-ytm-hero"><div><h2>Hanapin at pakinggan ang music mo</h2><p>Official at public YouTube music videos, nakaayos ayon sa genre.</p></div>
   <form id="cfYTMusicSearch"><i class="fa-solid fa-magnifying-glass"></i><input id="cfYTMusicQuery" placeholder="Search song, artist, album..." autocomplete="off"><button>Search</button></form>
  </div>
  <div id="cfYTMusicGenres" class="cf-ytm-genres"></div>
  <div class="cf-ytm-meta"><b id="cfYTMusicTitle">Trending Music</b><span id="cfYTMusicCount"></span></div>
  <div id="cfYTMusicGrid" class="cf-ytm-grid"></div>
  <button id="cfYTMusicMore" class="cf-ytm-more" onclick="cfYTMusicLoadMore()">Load more</button>
 </div></section>
 <section id="cfYTMusicPlayer" class="cf-ytm-player" aria-hidden="true">
  <button class="cf-ytm-back" onclick="cfYTMusicBack()"><i class="fa-solid fa-arrow-left"></i> Back to Music</button>
  <div class="cf-ytm-video"><iframe id="cfYTMusicFrame" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
  <div class="cf-ytm-now"><div><b id="cfYTMusicNowTitle"></b><span id="cfYTMusicNowArtist"></span></div><a id="cfYTMusicYouTube" target="_blank" rel="noopener"><i class="fa-brands fa-youtube"></i> Open on YouTube</a></div>
 </section>`);
 $('#cfYTMusicSearch').addEventListener('submit',e=>{e.preventDefault();load(true,$('#cfYTMusicQuery').value.trim());});
 renderGenres();
}
function renderGenres(){const box=$('#cfYTMusicGenres');if(!box)return;box.innerHTML=Object.entries(GENRES).map(([k,v])=>`<button class="${k===genre?'active':''}" onclick="cfYTMusicGenre('${k}')">${esc(v.label)}</button>`).join('');}
async function api(path,params){if(!CFG.apiKey||CFG.apiKey.includes('YOUR_'))throw new Error('YouTube API key is not configured.');const u=new URL(API+path);Object.entries({...params,key:CFG.apiKey}).forEach(([k,v])=>v!==''&&v!=null&&u.searchParams.set(k,v));const r=await fetch(u);const d=await r.json();if(!r.ok)throw new Error(d.error?.message||'YouTube request failed');return d;}
function getCache(k){try{const x=JSON.parse(localStorage.getItem(k));if(x&&Date.now()-x.time<6*3600000)return x.data}catch(e){}return null}
function setCache(k,data){try{localStorage.setItem(k,JSON.stringify({time:Date.now(),data}))}catch(e){}}
async function fetchMusic(reset,custom){const g=GENRES[genre];const q=custom||g.q;const key=cacheKey(genre,q);if(reset&&!custom){const c=getCache(key);if(c)return c}
 const search=await api('/search',{part:'snippet',type:'video',videoCategoryId:'10',maxResults:'25',q,order:custom?'relevance':g.order,regionCode:'PH',safeSearch:'moderate',pageToken:reset?'':nextToken});
 const ids=(search.items||[]).map(x=>x.id.videoId).filter(Boolean);if(!ids.length)return {items:[],nextPageToken:''};
 const details=await api('/videos',{part:'snippet,status,contentDetails,statistics',id:ids.join(',')});
 const map=new Map((details.items||[]).map(x=>[x.id,x]));
 const clean=ids.map(id=>map.get(id)).filter(v=>v&&v.status?.embeddable&&v.status?.privacyStatus==='public').map(v=>({id:v.id,title:v.snippet.title,channel:v.snippet.channelTitle,thumb:v.snippet.thumbnails?.high?.url||v.snippet.thumbnails?.medium?.url,views:v.statistics?.viewCount||0,published:v.snippet.publishedAt}));
 const out={items:clean,nextPageToken:search.nextPageToken||''};if(reset&&!custom)setCache(key,out);return out;
}
async function load(reset=true,custom=''){
 if(loading)return;loading=true;ensure();
 const grid=$('#cfYTMusicGrid'),more=$('#cfYTMusicMore');if(reset){items=[];nextToken='';grid.innerHTML='<div class="cf-ytm-loading"><i class="fa-solid fa-compact-disc fa-spin"></i><p>Loading YouTube music...</p></div>';}more.style.display='none';
 try{const d=await fetchMusic(reset,custom);items=reset?d.items:items.concat(d.items);nextToken=d.nextPageToken;render(custom);}
 catch(e){grid.innerHTML=`<div class="cf-ytm-error"><i class="fa-solid fa-triangle-exclamation"></i><h3>Hindi ma-load ang YouTube Music</h3><p>${esc(e.message)}</p></div>`;}
 finally{loading=false;}
}
function render(custom=''){$('#cfYTMusicTitle').textContent=custom?`Search: ${custom}`:`${GENRES[genre].label} Music`;$('#cfYTMusicCount').textContent=`${items.length} results`;$('#cfYTMusicGrid').innerHTML=items.length?items.map(v=>`<article class="cf-ytm-card" onclick="cfYTMusicPlay('${v.id}')"><div class="cf-ytm-thumb"><img src="${esc(v.thumb)}" loading="lazy" alt=""><span><i class="fa-solid fa-play"></i></span></div><h3>${esc(v.title)}</h3><p>${esc(v.channel)}</p><small>${fmt(v.views)} views</small></article>`).join(''):'<div class="cf-ytm-error"><h3>Walang music na nakita</h3><p>Subukan ang ibang artist, title, o genre.</p></div>';$('#cfYTMusicMore').style.display=nextToken?'block':'none';}
function open(){ensure();$('#cfYTMusicOverlay').classList.add('is-open');$('#cfYTMusicOverlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(!items.length)load(true);}
function close(){ensure();$('#cfYTMusicOverlay').classList.remove('is-open');$('#cfYTMusicOverlay').setAttribute('aria-hidden','true');document.body.style.overflow='';}
function play(id){const v=items.find(x=>x.id===id);if(!v)return;current=v;$('#cfYTMusicFrame').src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;$('#cfYTMusicNowTitle').textContent=v.title;$('#cfYTMusicNowArtist').textContent=v.channel;$('#cfYTMusicYouTube').href=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;$('#cfYTMusicPlayer').classList.add('is-open');$('#cfYTMusicPlayer').setAttribute('aria-hidden','false');history.pushState({cfYTMusicPlayer:true},'');}
function back(fromPop){ensure();$('#cfYTMusicFrame').src='';$('#cfYTMusicPlayer').classList.remove('is-open');$('#cfYTMusicPlayer').setAttribute('aria-hidden','true');current=null;if(!fromPop&&history.state?.cfYTMusicPlayer)history.back();}
window.cfOpenMusic=window.cfOpenMusicHub=function(){try{closeMenuDrawer()}catch(e){}open();};
window.cfCloseMusic=close;
window.cfYTMusicGenre=function(g){if(!GENRES[g])return;genre=g;$('#cfYTMusicQuery').value='';renderGenres();load(true);};
window.cfYTMusicLoadMore=function(){load(false,$('#cfYTMusicQuery').value.trim());};
window.cfYTMusicPlay=play;
window.cfYTMusicBack=()=>back(false);
window.addEventListener('popstate',()=>{if($('#cfYTMusicPlayer')?.classList.contains('is-open'))back(true);});
document.addEventListener('DOMContentLoaded',ensure);
})();
