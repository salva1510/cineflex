(() => {
  const API_KEY='742aa17a327005b91fb6602054523286', BASE='https://api.themoviedb.org/3', IMG='https://image.tmdb.org/t/p/w500';
  const q=new URLSearchParams(location.search), id=q.get('id'), type=q.get('type')==='tv'?'tv':'movie';
  const SERVERS=[
    {id:'zxc',name:'zxcstream',label:'Server 1',note:'Primary',movie:id=>`https://zxcstream.xyz/player/movie/${id}`,tv:(id,s,e)=>`https://zxcstream.xyz/player/tv/${id}/${s}/${e}`},
    {id:'peach',name:'peachify.top',label:'Server 2',note:'Backup 1',movie:id=>`https://peachify.top/embed/movie/${id}`,tv:(id,s,e)=>`https://peachify.top/embed/tv/${id}/${s}/${e}`},
    {id:'oneembed',name:'1embed.cc',label:'Server 3',note:'Backup 2',movie:id=>`https://1embed.cc/embed/movie/${id}`,tv:(id,s,e)=>`https://1embed.cc/embed/tv/${id}/${s}/${e}`}
  ];
  let season=Number(q.get('season')||1), episode=Number(q.get('episode')||1), isVip=false, membershipResolved=false, adReady=false, adTimer=null, totalEpisodes=0;
  let currentServerIndex=Math.max(0,SERVERS.findIndex(x=>x.id===localStorage.getItem('cineflex_preferred_server'))), serverLoadTimer=null, playerLoadToken=0, serverStartedAt=0, fallbackAttempts=0, toolbarHideTimer=null;
  const serverState=new Map(SERVERS.map(server=>[server.id,'idle']));
  const serverLatency=new Map();
  const $=id=>document.getElementById(id), frame=$('watchFrame'), frameWrap=document.querySelector('.player-frame-wrap');
  const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)};
  const statusPanel=$('playerV4Status');
  function setPlayerStatus(mode,title,text){if(!statusPanel)return;statusPanel.classList.toggle('is-hidden',mode==='ready');statusPanel.classList.toggle('is-error',mode==='error');$('playerV4StatusTitle').textContent=title;$('playerV4StatusText').textContent=text;}
  function updateHealth(state,latency){const dot=$('playerHealthDot');dot.className='player-health-dot '+(state||'');$('playerHealthLabel').textContent=state==='online'?'Server connected':state==='slow'?'Server is slow':state==='offline'?'Server unavailable':'Preparing player';$('playerLatencyLabel').textContent=Number.isFinite(latency)?`Response time: ${latency} ms`:'Response time: —';}
  function showToolbar(){frameWrap.classList.add('user-active');clearTimeout(toolbarHideTimer);toolbarHideTimer=setTimeout(()=>frameWrap.classList.remove('user-active'),3200);}
  function playerUrl(server=SERVERS[currentServerIndex]){return type==='tv'?server.tv(id,season,episode):server.movie(id)}
  function renderServers(){
    $('serverButtons').innerHTML=SERVERS.map((server,index)=>{
      const state=serverState.get(server.id)||'idle';
      const latency=serverLatency.get(server.id);
      const statusText={idle:'Ready',loading:'Loading',online:latency?`${latency} ms`:'Loaded',slow:'Slow',offline:'Offline'}[state]||'Ready';
      return `<button type="button" class="server-btn ${index===currentServerIndex?'active':''} state-${state}" data-server="${index}">${server.label}<small>${server.name} • ${statusText}</small></button>`;
    }).join('');
    document.querySelectorAll('.server-btn').forEach(button=>button.onclick=()=>switchServer(Number(button.dataset.server),true));
    const server=SERVERS[currentServerIndex];$('currentServerLabel').textContent=`${server.label} • ${server.name}`;
  }
  function switchServer(index,userSelected=false){
    clearTimeout(serverLoadTimer);
    if(userSelected)fallbackAttempts=0;
    currentServerIndex=(index+SERVERS.length)%SERVERS.length;
    localStorage.setItem('cineflex_preferred_server',SERVERS[currentServerIndex].id);
    renderServers();loadPlayer();if(userSelected)toast(`Using ${SERVERS[currentServerIndex].name}`);
  }
  function loadPlayer(){
    const token=++playerLoadToken;
    serverStartedAt=performance.now();
    clearTimeout(serverLoadTimer);
    $('serverNotice').hidden=true;
    frameWrap.classList.add('is-loading');
    setPlayerStatus('loading','Connecting to streaming server…',`Opening ${SERVERS[currentServerIndex].name}.`);
    updateHealth('loading');
    const server=SERVERS[currentServerIndex];
    serverState.set(server.id,navigator.onLine?'loading':'offline');
    renderServers();
    frame.src='about:blank';
    if(!navigator.onLine){
      frameWrap.classList.remove('is-loading');
      $('serverNoticeText').innerHTML='<i class="fa-solid fa-wifi"></i> Offline ka ngayon. Ire-reload ang player kapag bumalik ang internet.';
      $('serverNotice').hidden=false;
      setPlayerStatus('error','No internet connection','Reconnect to the internet and CineFlex will retry automatically.');
      updateHealth('offline');
      return;
    }
    setTimeout(()=>{if(token===playerLoadToken)frame.src=playerUrl()},90);
    serverLoadTimer=setTimeout(()=>{
      if(token!==playerLoadToken)return;
      serverState.set(server.id,'slow');
      renderServers();
      $('serverNoticeText').innerHTML='<i class="fa-solid fa-circle-exclamation"></i> Matagal mag-load ang server na ito.';
      $('serverNotice').hidden=false;
      frameWrap.classList.remove('is-loading');
      updateHealth('slow');
      if(fallbackAttempts<SERVERS.length-1){fallbackAttempts++;setPlayerStatus('loading','Trying another server…',`${server.name} did not respond quickly. Switching automatically.`);setTimeout(()=>switchServer(currentServerIndex+1,false),900)}else{setPlayerStatus('error','All servers are responding slowly','Retry the current server or choose another server manually.');}
    },12000);
    $('episodeLabel').textContent=type==='tv'?`Season ${season} • Episode ${episode}`:'Movie';
    updateEpisodeNavigation();
    saveLastWatch();
  }

  function saveLastWatch(){
    try{
      const item={id:String(id||''),type,season,episode,server:SERVERS[currentServerIndex].id,title:$('watchTitle').textContent||q.get('title')||'CineFlex',updatedAt:Date.now()};
      localStorage.setItem('cineflex_last_watch',JSON.stringify(item));
    }catch(e){}
  }
  function updateWatchUrl(){
    const next=new URL(location.href);
    next.searchParams.set('id',id);
    next.searchParams.set('type',type);
    if(type==='tv'){
      next.searchParams.set('season',season);
      next.searchParams.set('episode',episode);
    }
    history.replaceState(null,'',next.pathname+next.search);
  }

  function updateEpisodeNavigation(){
    const nav=$('episodeNav');
    if(!nav)return;
    const isSeries=type==='tv';
    nav.hidden=!isSeries;
    if(!isSeries)return;
    $('episodeNavStatus').textContent=`Season ${season} • Episode ${episode}${totalEpisodes?` of ${totalEpisodes}`:''}`;
    $('prevEpisodeBtn').disabled=episode<=1;
    $('nextEpisodeActionBtn').disabled=Boolean(totalEpisodes)&&episode>=totalEpisodes;
  }
  function selectEpisode(nextEpisode,{showAd=true}={}){
    if(type!=='tv')return;
    const target=Math.max(1,Number(nextEpisode)||1);
    if(totalEpisodes&&target>totalEpisodes){toast('No more episodes in this season');return;}
    episode=target;
    updateWatchUrl();
    document.querySelectorAll('.episode-card').forEach(card=>card.classList.toggle('active',Number(card.dataset.episode)===episode));
    updateEpisodeNavigation();
    const ad=showAd?triggerFreeAd():false;
    setTimeout(()=>{loadPlayer();scrollTo({top:0,behavior:'smooth'})},ad?350:0);
  }

  function setAdTimer(){clearTimeout(adTimer);adReady=!isVip}
  function triggerFreeAd(){
    return window.CineFlexPlayAds?.trigger('episode-click') || false;
  }
  function setPlan(vip){membershipResolved=true;isVip=vip;const b=$('planBadge');b.textContent=vip?'VIP • AD-FREE':'FREE MEMBER';b.classList.toggle('vip',vip);$('accessFact').textContent=vip?'VIP • 100% ad-free':'Free • Sponsored playback';setAdTimer()}
  async function membership(user){try{const d=await db.collection('users').doc(user.uid).collection('membership').doc('status').get();const x=d.exists?d.data():{};const exp=Number(x.expiresAtMs||0);setPlan(x.active!==false&&(x.plan==='vip'||x.vip===true)&&(x.lifetime===true||!exp||exp>Date.now()))}catch(e){membershipResolved=false;console.warn('VIP status unavailable; episode ad skipped.',e)}}
  async function loadData(){
    if(!id){location.href='index.html';return}
    try{
      const [d,r]=await Promise.all([fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}`).then(x=>x.json()),fetch(`${BASE}/${type}/${id}/recommendations?api_key=${API_KEY}`).then(x=>x.json())]);
      const title=d.title||d.name||q.get('title')||'CineFlex';saveLastWatch();document.title=`${title} • CineFlex`;$('watchTitle').textContent=title;$('infoTitle').textContent=title;$('overview').textContent=d.overview||'Enjoy this title on CineFlex.';$('typeFact').textContent=type==='tv'?'TV Series':'Movie';
      const bg=d.backdrop_path||q.get('backdrop')||d.poster_path||q.get('poster');if(bg)$('watchBackdrop').style.backgroundImage=`url(https://image.tmdb.org/t/p/original${bg})`;
      $('recommendGrid').innerHTML=(r.results||[]).filter(x=>x.backdrop_path||x.poster_path).slice(0,10).map(x=>`<article class="recommend-card" data-id="${x.id}" data-type="${x.media_type||type}"><img loading="lazy" src="${IMG}${x.backdrop_path||x.poster_path}"><div><h3>${x.title||x.name}</h3><p>${(x.release_date||x.first_air_date||'').slice(0,4)||'Recommended'}</p></div></article>`).join('');
      document.querySelectorAll('.recommend-card').forEach(c=>c.onclick=()=>location.href=`watch.html?id=${c.dataset.id}&type=${c.dataset.type==='tv'?'tv':'movie'}`);
      if(type==='tv'){ $('episodesSection').hidden=false; const sel=$('seasonSelect');sel.innerHTML=(d.seasons||[]).filter(s=>s.season_number>0).map(s=>`<option value="${s.season_number}" ${s.season_number===season?'selected':''}>Season ${s.season_number}</option>`).join('');sel.onchange=()=>{season=Number(sel.value);episode=1;updateWatchUrl();loadEpisodes();loadPlayer()};loadEpisodes(); }
    }catch(e){$('overview').textContent='Unable to load title details right now.'}
  }
  async function loadEpisodes(){try{const d=await fetch(`${BASE}/tv/${id}/season/${season}?api_key=${API_KEY}`).then(x=>x.json());const episodes=d.episodes||[];totalEpisodes=episodes.length;$('episodeGrid').innerHTML=episodes.map(e=>`<article class="episode-card ${Number(e.episode_number)===episode?'active':''}" tabindex="0" role="button" data-episode="${e.episode_number}"><img loading="lazy" src="${e.still_path?IMG+e.still_path:'icon-512.png'}"><div><h3>Episode ${e.episode_number}${e.name?' • '+e.name:''}</h3><p>${e.runtime?e.runtime+' min':'Play episode'}</p></div></article>`).join('');document.querySelectorAll('.episode-card').forEach(c=>{const open=()=>selectEpisode(Number(c.dataset.episode));c.onclick=open;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});updateEpisodeNavigation()}catch(e){totalEpisodes=0;updateEpisodeNavigation();$('episodeGrid').innerHTML='<p>Episodes unavailable.</p>'}}
  async function lockLandscape(){
    if(screen.orientation && typeof screen.orientation.lock==='function'){
      try{await screen.orientation.lock('landscape')}catch(e){}
    }
  }
  async function enterFullscreenLandscape(){
    const el=frameWrap;
    if(!el)return;
    frameWrap.classList.add('landscape-mode');
    try{
      if(el.requestFullscreen) await el.requestFullscreen({navigationUI:'hide'});
      else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if(frame.webkitEnterFullscreen) frame.webkitEnterFullscreen();
      await lockLandscape();
      setTimeout(lockLandscape,250);
      toast('Fullscreen landscape enabled');
    }catch(err){
      frameWrap.classList.remove('landscape-mode');
      console.log('Fullscreen/landscape error:',err);
      toast('Rotate the device to landscape');
    }
  }
  function unlockOrientationAfterFullscreen(){
    if(!document.fullscreenElement && !document.webkitFullscreenElement){
      frameWrap.classList.remove('landscape-mode');
      if(screen.orientation && typeof screen.orientation.unlock==='function'){
        try{screen.orientation.unlock()}catch(e){}
      }
    }else{
      setTimeout(lockLandscape,100);
    }
  }
  document.addEventListener('fullscreenchange',unlockOrientationAfterFullscreen);
  document.addEventListener('webkitfullscreenchange',unlockOrientationAfterFullscreen);
  window.addEventListener('orientationchange',()=>{
    if(document.fullscreenElement||document.webkitFullscreenElement)setTimeout(lockLandscape,150);
  });

  $('backBtn').onclick=()=>history.length>1?history.back():location.href='index.html';$('homeBtn').onclick=() => location.href='index.html';$('returnLogin').onclick=()=>location.href='index.html';$('reloadBtn').onclick=()=>{frame.src='';setTimeout(loadPlayer,100);toast('Player reloaded')};$('fullscreenBtn').onclick=enterFullscreenLandscape;$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Watch link copied')}catch(e){toast('Copy unavailable')}};
  $('openDirectBtn').onclick=()=>{const url=playerUrl();const win=window.open(url,'_blank','noopener,noreferrer');if(!win)toast('Allow pop-ups to open the player directly');else toast('Player opened in a new tab')};
  frame.addEventListener('load',()=>{
    if(frame.src==='about:blank')return;
    clearTimeout(serverLoadTimer);
    const server=SERVERS[currentServerIndex];
    serverState.set(server.id,'online');
    const latency=Math.max(1,Math.round(performance.now()-serverStartedAt));serverLatency.set(server.id,latency);fallbackAttempts=0;
    renderServers();
    frameWrap.classList.remove('is-loading');
    $('serverNotice').hidden=true;
    setPlayerStatus('ready','','');updateHealth('online',serverLatency.get(server.id));showToolbar();
    saveLastWatch();
  });
  $('nextServerBtn').onclick=()=>switchServer(currentServerIndex+1,true);
  $('retryServerBtn').onclick=()=>{fallbackAttempts=0;loadPlayer()};
  $('fallbackServerBtn').onclick=()=>switchServer(currentServerIndex+1,true);
  $('toolbarRetryBtn').onclick=()=>{fallbackAttempts=0;loadPlayer();toast('Retrying server')};
  $('toolbarServerBtn').onclick=()=>switchServer(currentServerIndex+1,true);
  $('toolbarFullscreenBtn').onclick=enterFullscreenLandscape;
  ['mousemove','touchstart','pointerdown'].forEach(name=>frameWrap.addEventListener(name,showToolbar,{passive:true}));
  $('prevEpisodeBtn').onclick=()=>selectEpisode(episode-1,{showAd:false});
  $('nextEpisodeActionBtn').onclick=()=>selectEpisode(episode+1,{showAd:false});
  window.addEventListener('offline',()=>{serverState.set(SERVERS[currentServerIndex].id,'offline');renderServers();$('serverNoticeText').innerHTML='<i class="fa-solid fa-wifi"></i> Nawala ang internet connection.';$('serverNotice').hidden=false;frameWrap.classList.remove('is-loading');setPlayerStatus('error','No internet connection','Reconnect and CineFlex will reload the player.');updateHealth('offline')});
  window.addEventListener('online',()=>{toast('Internet restored');loadPlayer()});
  document.addEventListener('keydown',event=>{
    if(event.target && /input|select|textarea/i.test(event.target.tagName))return;
    const key=event.key.toLowerCase();
    if(key==='f'){event.preventDefault();enterFullscreenLandscape()}
    if(key==='r'){event.preventDefault();loadPlayer();toast('Player reloaded')}
    if(key==='s'){event.preventDefault();switchServer(currentServerIndex+1,true)}
    if(key==='n'&&type==='tv'){event.preventDefault();selectEpisode(episode+1,{showAd:false})}
    if(key==='p'&&type==='tv'){event.preventDefault();selectEpisode(episode-1,{showAd:false})}
  });
  renderServers();
  let authResolved = false;
  const guard = $('authGuard');

  function showAuthGuard(show) {
    guard.hidden = !show;
    guard.setAttribute('aria-hidden', show ? 'false' : 'true');
    guard.style.display = show ? 'grid' : 'none';
  }

  showAuthGuard(false);

  const authFallback = setTimeout(() => {
    if (authResolved) return;
    const user = auth.currentUser || window.currentUser;
    if (user) {
      authResolved = true;
      showAuthGuard(false);
      membership(user);
      loadPlayer();
    }
  }, 1800);

  auth.onAuthStateChanged(user => {
    authResolved = true;
    clearTimeout(authFallback);

    if (!user) {
      showAuthGuard(false);
      membershipResolved = true;
      isVip = false;
      $('planBadge').textContent = 'GUEST • PROGRESS NOT SAVED';
      loadPlayer();
      toast('Guest mode: mag-login para ma-save ang progress at history');
      return;
    }

    showAuthGuard(false);
    membership(user);
    loadPlayer();
  });

  window.addEventListener('cineflex-login', event => {
    const user = event.detail || auth.currentUser || window.currentUser;
    if (!user) return;
    authResolved = true;
    showAuthGuard(false);
    membership(user);
    loadPlayer();
  });

  loadData();
})();
