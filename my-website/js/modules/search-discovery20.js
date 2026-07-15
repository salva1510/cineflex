(function(){
'use strict';
const RECENT_KEY='cineflex_search_recent_v20';
let mode='all',timer=null,controller=null,lastQuery='';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const titleOf=x=>x.title||x.name||x.original_title||x.original_name||'Untitled';
const posterOf=x=>x.poster_path?(typeof IMG_URL!=='undefined'?IMG_URL:'https://image.tmdb.org/t/p/w500')+x.poster_path:(x.poster||x.image||'');
function recent(){return read(RECENT_KEY).filter(Boolean).slice(0,8)}
function saveRecent(q){q=q.trim();if(q.length<2)return;localStorage.setItem(RECENT_KEY,JSON.stringify([q,...recent().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,8)));}
function ensure(){
 const overlay=$('#search-overlay'),input=$('#searchInput'),results=$('#search-results');
 if(!overlay||!input||!results||$('#cfSearchDiscovery'))return;
 overlay.classList.add('cf-search-v20');
 input.removeAttribute('oninput');
 input.placeholder='Search movies, series, My List, music, radio…';
 input.insertAdjacentHTML('afterend','<button id="cfSearchVoice" class="cf-search-voice" type="button" aria-label="Voice search"><i class="fa-solid fa-microphone"></i></button>');
 results.insertAdjacentHTML('beforebegin',`<section id="cfSearchDiscovery" class="cf-search-discovery">
   <div id="cfSearchTabs" class="cf-search-tabs" role="tablist">
    <button data-mode="all" class="active">All</button><button data-mode="movie">Movies</button><button data-mode="tv">Series</button><button data-mode="saved">My Activity</button>
   </div>
   <div id="cfSearchMeta" class="cf-search-meta"></div>
 </section>`);
 $('#cfSearchTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-mode]');if(!b)return;mode=b.dataset.mode;document.querySelectorAll('#cfSearchTabs button').forEach(x=>x.classList.toggle('active',x===b));run(input.value.trim(),true);});
 input.addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>run(e.target.value.trim()),260)});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){saveRecent(input.value);run(input.value.trim(),true)}});
 $('#cfSearchVoice').addEventListener('click',voiceSearch);
 renderLanding();
}
function voiceSearch(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast('Voice search is not supported on this device.');return;}
 const r=new SR();r.lang='en-PH';r.interimResults=false;r.maxAlternatives=1;
 const btn=$('#cfSearchVoice');btn.classList.add('listening');
 r.onresult=e=>{const q=e.results[0][0].transcript;$('#searchInput').value=q;saveRecent(q);run(q,true)};
 r.onerror=()=>toast('I could not hear that. Please try again.');
 r.onend=()=>btn.classList.remove('listening');r.start();
}
function toast(msg){if(typeof showToast==='function')showToast(msg);else console.info(msg)}
function renderLanding(){
 const meta=$('#cfSearchMeta'),grid=$('#search-results');if(!meta||!grid)return;
 const r=recent();
 meta.innerHTML=`<div class="cf-search-welcome"><div><span>CINEFLEX DISCOVERY</span><h2>What do you want to watch or listen to?</h2></div></div>
 <div class="cf-search-recent"><div class="cf-search-label"><b>Recent searches</b>${r.length?'<button onclick="cfClearRecentSearches()">Clear</button>':''}</div><div class="cf-search-chips">${r.length?r.map(q=>`<button onclick="cfUseSearch('${esc(q).replace(/'/g,"\\'")}')"><i class="fa-solid fa-clock-rotate-left"></i>${esc(q)}</button>`).join(''):'<span>No recent searches yet.</span>'}</div></div>`;
 grid.className='search-results-grid cf-discovery-grid';
 grid.innerHTML=`
 <button class="cf-discovery-card live" onclick="closeSearch();cfOpenLiveTV()"><i class="fa-solid fa-tower-broadcast"></i><b>Live TV</b><span>Philippine channels</span></button>
 <button class="cf-discovery-card music" onclick="closeSearch();cfOpenMusic()"><i class="fa-solid fa-music"></i><b>Music</b><span>Playlists and moods</span></button>
 <button class="cf-discovery-card radio" onclick="closeSearch();cfOpenRadio()"><i class="fa-solid fa-radio"></i><b>Radio</b><span>PH stations</span></button>
 <button class="cf-discovery-card saved" onclick="cfSetSearchMode('saved')"><i class="fa-solid fa-bookmark"></i><b>My Activity</b><span>List and history</span></button>`;
}
function localSaved(q){
 const keys=['cineflex_watchlist','cineflex_recent'];let out=[];
 keys.forEach(k=>read(k).forEach(x=>{if(x&&typeof x==='object')out.push({...x,_source:k==='cineflex_watchlist'?'My List':'Continue Watching'})}));
 const seen=new Set();return out.filter(x=>{const id=`${x.media_type||''}:${x.id}`;if(seen.has(id))return false;seen.add(id);return !q||titleOf(x).toLowerCase().includes(q.toLowerCase())});
}
function card(x){
 const data=JSON.stringify(x).replace(/'/g,'&apos;');const img=posterOf(x);
 return `<article class="search-card cf-search-card" tabindex="0" onclick='showDetails(${data});closeSearch()'>
  <div class="cf-search-poster">${img?`<img src="${esc(img)}" loading="lazy" decoding="async" alt="${esc(titleOf(x))}">`:'<div class="cf-no-poster"><i class="fa-solid fa-film"></i></div>'}<span>${esc(x._source||((x.media_type==='tv'||x.first_air_date)?'Series':'Movie'))}</span></div>
  <p>${esc(titleOf(x))}</p><small>${esc((x.release_date||x.first_air_date||'').slice(0,4))}</small>
 </article>`;
}
async function run(q,immediate=false){
 ensure();lastQuery=q;const meta=$('#cfSearchMeta'),grid=$('#search-results');if(!meta||!grid)return;
 if(!q){renderLanding();return;}
 meta.innerHTML=`<div class="cf-search-status"><b>Results for “${esc(q)}”</b><span id="cfSearchCount">Searching…</span></div>`;
 grid.className='search-results-grid';grid.innerHTML='<div class="cf-search-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Searching CineFlex…</div>';
 const saved=localSaved(q);
 if(mode==='saved'){renderResults(saved,q,'saved');return;}
 if(controller)controller.abort();controller=new AbortController();
 try{
  const type=mode==='movie'?'movie':mode==='tv'?'tv':'multi';
  const url=`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(q)}&include_adult=false`;
  const res=await fetch(url,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Search failed');return r.json()});
  if(q!==lastQuery)return;
  let remote=(res.results||[]).filter(x=>x.poster_path&&(x.media_type!=='person'));
  if(mode==='all')remote=[...saved,...remote];
  const unique=[],ids=new Set();for(const x of remote){const id=`${x.media_type||x._source||''}:${x.id}`;if(ids.has(id))continue;ids.add(id);unique.push(x)}
  saveRecent(q);renderResults(unique.slice(0,40),q,mode);
 }catch(e){if(e.name==='AbortError')return;grid.innerHTML='<div class="cf-search-empty"><i class="fa-solid fa-wifi"></i><b>Search unavailable</b><span>Check your connection and try again.</span></div>';$('#cfSearchCount').textContent='Offline';}
}
function renderResults(items,q,currentMode){
 const grid=$('#search-results'),count=$('#cfSearchCount');if(count)count.textContent=`${items.length} result${items.length===1?'':'s'}`;
 grid.className='search-results-grid';grid.innerHTML=items.length?items.map(card).join(''):`<div class="cf-search-empty"><i class="fa-solid fa-magnifying-glass"></i><b>No matches found</b><span>Try another title, actor, genre, or mood.</span></div>`;
}
window.cfUseSearch=q=>{ensure();$('#searchInput').value=q;run(q,true)};
window.cfClearRecentSearches=()=>{localStorage.removeItem(RECENT_KEY);renderLanding()};
window.cfSetSearchMode=v=>{mode=v;ensure();document.querySelectorAll('#cfSearchTabs button').forEach(x=>x.classList.toggle('active',x.dataset.mode===v));run($('#searchInput').value.trim(),true)};
const oldOpen=window.openSearch;window.openSearch=function(){if(typeof oldOpen==='function')oldOpen();ensure();setTimeout(()=>{const input=$('#searchInput');if(input)input.focus();if(!input.value.trim())renderLanding()},0)};
const oldClose=window.closeSearch;window.closeSearch=function(){if(controller)controller.abort();if(typeof oldClose==='function')oldClose();};
window.processSearch=function(q){clearTimeout(timer);timer=setTimeout(()=>run(String(q||'').trim()),260)};
document.addEventListener('DOMContentLoaded',ensure);
})();
