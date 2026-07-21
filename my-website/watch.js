(() => {
  const API_KEY='742aa17a327005b91fb6602054523286', BASE='https://api.themoviedb.org/3', IMG='https://image.tmdb.org/t/p/w500';
  const q=new URLSearchParams(location.search), id=q.get('id'), type=q.get('type')==='tv'?'tv':'movie';
  const SERVERS=[
    {id:'zxc',name:'zxcstream',label:'Server 1',note:'Primary',movie:id=>`https://zxcstream.xyz/player/movie/${id}`,tv:(id,s,e)=>`https://zxcstream.xyz/player/tv/${id}/${s}/${e}`},
    {id:'peach',name:'peachify.top',label:'Server 2',note:'Backup 1',movie:id=>`https://peachify.top/embed/movie/${id}`,tv:(id,s,e)=>`https://peachify.top/embed/tv/${id}/${s}/${e}`},
    {id:'oneembed',name:'1embed.cc',label:'Server 3',note:'Backup 2',movie:id=>`https://1embed.cc/embed/movie/${id}`,tv:(id,s,e)=>`https://1embed.cc/embed/tv/${id}/${s}/${e}`}
  ];
  let season=Number(q.get('season')||1), episode=Number(q.get('episode')||1), isVip=false, adReady=false, adTimer=null;
  let currentServerIndex=Math.max(0,SERVERS.findIndex(x=>x.id===localStorage.getItem('cineflex_preferred_server'))), serverLoadTimer=null, playerLoadToken=0;
  const serverState=new Map(SERVERS.map(server=>[server.id,'idle']));
  const $=id=>document.getElementById(id), frame=$('watchFrame'), frameWrap=document.querySelector('.player-frame-wrap');
  const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)};
  function playerUrl(server=SERVERS[currentServerIndex]){return type==='tv'?server.tv(id,season,episode):server.movie(id)}
  function renderServers(){
    $('serverButtons').innerHTML=SERVERS.map((server,index)=>{
      const state=serverState.get(server.id)||'idle';
      const statusText={idle:'Ready',loading:'Loading',online:'Loaded',slow:'Slow',offline:'Offline'}[state]||'Ready';
      return `<button type="button" class="server-btn ${index===currentServerIndex?'active':''} state-${state}" data-server="${index}">${server.label}<small>${server.name} • ${statusText}</small></button>`;
    }).join('');
    document.querySelectorAll('.server-btn').forEach(button=>button.onclick=()=>switchServer(Number(button.dataset.server),true));
    const server=SERVERS[currentServerIndex];$('currentServerLabel').textContent=`${server.label} • ${server.name}`;
  }
  function switchServer(index,userSelected=false){
    clearTimeout(serverLoadTimer);
    currentServerIndex=(index+SERVERS.length)%SERVERS.length;
    localStorage.setItem('cineflex_preferred_server',SERVERS[currentServerIndex].id);
    renderServers();loadPlayer();if(userSelected)toast(`Using ${SERVERS[currentServerIndex].name}`);
  }
  function loadPlayer(){
    const token=++playerLoadToken;
    clearTimeout(serverLoadTimer);
    $('serverNotice').hidden=true;
    frameWrap.classList.add('is-loading');
    const server=SERVERS[currentServerIndex];
    serverState.set(server.id,navigator.onLine?'loading':'offline');
    renderServers();
    frame.src='about:blank';
    if(!navigator.onLine){
      frameWrap.classList.remove('is-loading');
      $('serverNoticeText').innerHTML='<i class="fa-solid fa-wifi"></i> Offline ka ngayon. Ire-reload ang player kapag bumalik ang internet.';
      $('serverNotice').hidden=false;
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
    },12000);
    $('episodeLabel').textContent=type==='tv'?`Season ${season} • Episode ${episode}`:'Movie';
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
  function setAdTimer(){clearTimeout(adTimer);adReady=false;if(isVip)return;adTimer=setTimeout(()=>adReady=true,300000)}
  function triggerFreeAd(){if(isVip||!adReady)return;adReady=false;const s=document.createElement('script');s.src='https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js';s.async=true;s.onload=s.onerror=()=>setTimeout(()=>s.remove(),15000);document.body.appendChild(s);setAdTimer()}
  document.addEventListener('pointerdown',e=>{if(e.isTrusted)triggerFreeAd()},{capture:true});
  function setPlan(vip){isVip=vip;const b=$('planBadge');b.textContent=vip?'VIP':'FREE MEMBER';b.classList.toggle('vip',vip);$('accessFact').textContent=vip?'VIP • Ad-free':'Free • Minimal ads';setAdTimer()}
  async function membership(user){try{const d=await db.collection('users').doc(user.uid).collection('membership').doc('status').get();const x=d.exists?d.data():{};const exp=Number(x.expiresAtMs||0);setPlan(x.active!==false&&(x.plan==='vip'||x.vip===true)&&(x.lifetime===true||!exp||exp>Date.now()))}catch(e){setPlan(false)}}
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
  async function loadEpisodes(){try{const d=await fetch(`${BASE}/tv/${id}/season/${season}?api_key=${API_KEY}`).then(x=>x.json());$('episodeGrid').innerHTML=(d.episodes||[]).map(e=>`<article class="episode-card" data-episode="${e.episode_number}"><img loading="lazy" src="${e.still_path?IMG+e.still_path:'icon-512.png'}"><div><h3>Episode ${e.episode_number}${e.name?' • '+e.name:''}</h3><p>${e.runtime?e.runtime+' min':'Play episode'}</p></div></article>`).join('');document.querySelectorAll('.episode-card').forEach(c=>c.onclick=()=>{episode=Number(c.dataset.episode);updateWatchUrl();document.querySelectorAll('.episode-card').forEach(x=>x.classList.toggle('active',x===c));loadPlayer();scrollTo({top:0,behavior:'smooth'})})}catch(e){$('episodeGrid').innerHTML='<p>Episodes unavailable.</p>'}}
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
    renderServers();
    frameWrap.classList.remove('is-loading');
    $('serverNotice').hidden=true;
    saveLastWatch();
  });
  $('nextServerBtn').onclick=()=>switchServer(currentServerIndex+1,true);
  window.addEventListener('offline',()=>{serverState.set(SERVERS[currentServerIndex].id,'offline');renderServers();$('serverNoticeText').innerHTML='<i class="fa-solid fa-wifi"></i> Nawala ang internet connection.';$('serverNotice').hidden=false;frameWrap.classList.remove('is-loading')});
  window.addEventListener('online',()=>{toast('Internet restored');loadPlayer()});
  document.addEventListener('keydown',event=>{
    if(event.target && /input|select|textarea/i.test(event.target.tagName))return;
    const key=event.key.toLowerCase();
    if(key==='f'){event.preventDefault();enterFullscreenLandscape()}
    if(key==='r'){event.preventDefault();loadPlayer();toast('Player reloaded')}
    if(key==='s'){event.preventDefault();switchServer(currentServerIndex+1,true)}
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
