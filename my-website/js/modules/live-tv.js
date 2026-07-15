(function(){
  'use strict';

  const STORAGE_KEY='cineflex_live_tv_favorites_v1';
  const CHANNELS=[
    {id:'ptv',name:'PTV Philippines',short:'PTV',category:'News',type:'Government / News',official:'https://www.youtube.com/@ptvph/streams',embed:'https://www.youtube.com/embed/919y7TykVSI?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'untv',name:'UNTV News and Rescue',short:'UNTV',category:'News',type:'News / Public Service',official:'https://www.youtube.com/@UNTVNewsandRescue/streams',embed:'https://www.youtube.com/embed/ZYkKqMtj1j8?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'net25',name:'NET25',short:'NET25',category:'Entertainment',type:'News / Entertainment',official:'https://www.youtube.com/@NET25TV/streams',embed:'https://www.youtube.com/embed/KceiqFBQniQ?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'kapamilya',name:'Kapamilya Online Live',short:'KOL',category:'Entertainment',type:'Entertainment',official:'https://www.youtube.com/@abscbnentertainment/streams',embed:'https://www.youtube.com/embed/msN5sDbJSAA?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'gmanews',name:'GMA Integrated News',short:'GMA',category:'News',type:'News / Special Coverage',official:'https://www.youtube.com/@gmanews/streams',embed:'https://www.youtube.com/embed/MsKTo8lbQKo?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'news5',name:'News5Everywhere',short:'NEWS5',category:'News',type:'News / Public Affairs',official:'https://www.youtube.com/@News5Everywhere/streams',embed:'https://www.youtube.com/embed/0dXpRXHNHJ4?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'senate',name:'Senate of the Philippines',short:'SENATE',category:'Government',type:'Government',official:'https://www.youtube.com/@SenatePhilippines/streams',embed:'https://www.youtube.com/embed/Wd1coDCNakU?autoplay=1&rel=0&modestbranding=1&playsinline=1'},
    {id:'house',name:'House of Representatives',short:'HOUSE',category:'Government',type:'Government',official:'https://www.youtube.com/@HouseofRepsPH/streams',embed:''}
  ];

  let activeFilter='All';
  let activeChannelId=null;

  function favorites(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch(_){return [];}
  }
  function isFavorite(id){return favorites().includes(id);}
  function saveFavorites(list){localStorage.setItem(STORAGE_KEY,JSON.stringify(list));}
  function filteredChannels(){
    if(activeFilter==='Favorites') return CHANNELS.filter(c=>isFavorite(c.id));
    if(activeFilter==='All') return CHANNELS;
    return CHANNELS.filter(c=>c.category===activeFilter);
  }
  function esc(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}

  function cardsMarkup(){
    const list=filteredChannels();
    if(!list.length) return '<div class="cf-live-empty"><i class="fa-regular fa-star"></i><h3>No favorite channels yet</h3><p>Tap the star on a channel to save it here.</p></div>';
    return list.map(c=>`<article class="cf-live-card-wrap">
      <button class="cf-live-card" type="button" onclick="cfPlayLiveChannel('${c.id}')">
        <span class="cf-live-badge">LIVE</span><span class="cf-live-logo">${esc(c.short)}</span>
        <h4>${esc(c.name)}</h4><p>${esc(c.type)}</p><span class="cf-live-watch"><i class="fa-solid fa-play"></i> Watch</span>
      </button>
      <button class="cf-live-favorite ${isFavorite(c.id)?'active':''}" type="button" aria-label="Favorite ${esc(c.name)}" onclick="event.stopPropagation();cfToggleLiveFavorite('${c.id}')"><i class="${isFavorite(c.id)?'fa-solid':'fa-regular'} fa-star"></i></button>
    </article>`).join('');
  }

  function markup(){return `<section id="cfLiveTvShell" class="cf-live-tv-shell" aria-hidden="true">
    <header class="cf-live-tv-head"><div class="cf-live-tv-brand"><i class="fa-solid fa-tower-broadcast"></i><div><h2>CineFlex Live TV</h2><small>Philippine official channel sources</small></div></div><button class="cf-live-tv-close" type="button" onclick="cfCloseLiveTV()"><i class="fa-solid fa-xmark"></i></button></header>
    <main class="cf-live-tv-wrap"><div class="cf-live-tv-hero"><div class="cf-live-tv-feature"><span class="cf-on-air"><i></i> ON AIR</span><h1>Philippine Live TV</h1><p>Watch available official broadcasts and quickly switch between PH news, entertainment, and government channels.</p><button type="button" onclick="cfPlayLiveChannel('ptv')"><i class="fa-solid fa-play"></i> Start Watching</button></div><div class="cf-live-tv-stats"><strong>${CHANNELS.length}</strong><span>official channel shortcuts</span><small>Availability depends on broadcaster schedule.</small></div></div>
    <div class="cf-live-filter" id="cfLiveFilters">${['All','News','Entertainment','Government','Favorites'].map(x=>`<button class="${x==='All'?'active':''}" onclick="cfFilterLiveTV('${x}',this)">${x==='Favorites'?'<i class="fa-solid fa-star"></i> ':''}${x}</button>`).join('')}</div>
    <div class="cf-live-tv-title"><h3 id="cfLiveSectionTitle">All PH Channels</h3><span>Tap ★ to save favorites</span></div><div id="cfLiveTvGrid" class="cf-live-tv-grid">${cardsMarkup()}</div></main></section>

    <div id="cfLivePlayer" class="cf-live-player" aria-hidden="true"><div class="cf-live-player-card">
      <div class="cf-live-player-top"><div><span class="cf-player-live">LIVE</span><h3 id="cfLivePlayerTitle">Live channel</h3></div><div class="cf-live-player-tools"><button onclick="cfToggleCurrentFavorite()" id="cfLivePlayerFav" aria-label="Favorite"><i class="fa-regular fa-star"></i></button><button onclick="cfLiveFullscreen()" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button><button onclick="cfCloseLivePlayer()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div></div>
      <div id="cfLiveScreen" class="cf-live-screen"><iframe id="cfLiveIframe" title="CineFlex Live TV player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen hidden></iframe><div id="cfLiveFallback" class="cf-live-fallback"><i class="fa-solid fa-satellite-dish"></i><h3 id="cfLivePlayerName"></h3><p>The official embedded broadcast is unavailable or not scheduled right now. Use the broadcaster page only as a backup.</p><a id="cfLiveOfficialLink" class="cf-live-primary" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Watch Official Live</a></div></div>
      <div class="cf-live-channel-controls"><button onclick="cfLivePrevious()"><i class="fa-solid fa-backward-step"></i><span>Previous</span></button><div id="cfLiveNowPlaying">Official PH channel</div><button onclick="cfLiveNext()"><span>Next</span><i class="fa-solid fa-forward-step"></i></button></div>
      <div class="cf-live-note"><i class="fa-solid fa-shield-halved"></i> Direct playback uses official broadcaster embeds. Live availability and embed permission remain controlled by each broadcaster.</div>
    </div></div>`;}

  function init(){if(document.getElementById('cfLiveTvShell'))return;document.body.insertAdjacentHTML('beforeend',markup());}
  function render(){const grid=document.getElementById('cfLiveTvGrid');if(grid)grid.innerHTML=cardsMarkup();const title=document.getElementById('cfLiveSectionTitle');if(title)title.textContent=activeFilter==='All'?'All PH Channels':activeFilter+' Channels';}
  function updatePlayerFavorite(){const b=document.getElementById('cfLivePlayerFav');if(!b||!activeChannelId)return;const yes=isFavorite(activeChannelId);b.classList.toggle('active',yes);b.innerHTML=`<i class="${yes?'fa-solid':'fa-regular'} fa-star"></i>`;}

  window.cfOpenLiveTV=function(){init();const e=document.getElementById('cfLiveTvShell');e.classList.add('active');e.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(typeof closeMenuDrawer==='function')closeMenuDrawer();};
  window.cfCloseLiveTV=function(){const e=document.getElementById('cfLiveTvShell');if(e){e.classList.remove('active');e.setAttribute('aria-hidden','true');}document.body.style.overflow='';cfCloseLivePlayer();};
  window.cfFilterLiveTV=function(filter,button){activeFilter=filter;document.querySelectorAll('#cfLiveFilters button').forEach(b=>b.classList.remove('active'));if(button)button.classList.add('active');render();};
  window.cfToggleLiveFavorite=function(id){let list=favorites();list=list.includes(id)?list.filter(x=>x!==id):[...list,id];saveFavorites(list);render();updatePlayerFavorite();};
  window.cfToggleCurrentFavorite=function(){if(activeChannelId)cfToggleLiveFavorite(activeChannelId);};
  window.cfPlayLiveChannel=async function(id){
    const c=CHANNELS.find(x=>x.id===id);if(!c)return;activeChannelId=id;
    document.getElementById('cfLivePlayerTitle').textContent=c.name;document.getElementById('cfLivePlayerName').textContent=c.name;document.getElementById('cfLiveNowPlaying').textContent=c.name+' • '+c.type;document.getElementById('cfLiveOfficialLink').href=c.official;
    const frame=document.getElementById('cfLiveIframe'),fallback=document.getElementById('cfLiveFallback');
    if(c.embed){frame.src=c.embed;frame.hidden=false;fallback.hidden=true;}else{frame.src='about:blank';frame.hidden=true;fallback.hidden=false;}
    updatePlayerFavorite();const p=document.getElementById('cfLivePlayer');p.classList.add('active');p.setAttribute('aria-hidden','false');
    // Build 9.5: channel taps open the TV screen directly in fullscreen landscape.
    const screenEl=document.getElementById('cfLiveScreen');
    try{
      if(!document.fullscreenElement){
        if(screenEl.requestFullscreen) await screenEl.requestFullscreen({navigationUI:'hide'});
        else if(screenEl.webkitRequestFullscreen) screenEl.webkitRequestFullscreen();
      }
      if(window.screen&&screen.orientation&&screen.orientation.lock){
        await screen.orientation.lock('landscape');
      }
    }catch(err){
      console.info('Live TV fullscreen/orientation is restricted by this browser:',err);
    }
  };
  window.cfCloseLivePlayer=async function(){const p=document.getElementById('cfLivePlayer');if(p){p.classList.remove('active');p.setAttribute('aria-hidden','true');}const f=document.getElementById('cfLiveIframe');if(f)f.src='about:blank';try{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}catch(_){}};
  function adjacent(step){let i=CHANNELS.findIndex(c=>c.id===activeChannelId);if(i<0)i=0;i=(i+step+CHANNELS.length)%CHANNELS.length;cfPlayLiveChannel(CHANNELS[i].id);}
  window.cfLivePrevious=function(){adjacent(-1);};window.cfLiveNext=function(){adjacent(1);};
  window.cfLiveFullscreen=async function(){const el=document.getElementById('cfLiveScreen');if(!el)return;try{if(document.fullscreenElement){if(document.exitFullscreen)await document.exitFullscreen();if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}else{if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}}catch(err){console.info('Fullscreen is restricted by this browser:',err);}};
  document.addEventListener('keydown',e=>{const p=document.getElementById('cfLivePlayer');if(e.key==='Escape'){if(p&&p.classList.contains('active'))cfCloseLivePlayer();else cfCloseLiveTV();}if(p&&p.classList.contains('active')&&e.key==='ArrowRight')cfLiveNext();if(p&&p.classList.contains('active')&&e.key==='ArrowLeft')cfLivePrevious();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
