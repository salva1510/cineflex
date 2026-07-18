(() => {
  const API_KEY='742aa17a327005b91fb6602054523286', BASE='https://api.themoviedb.org/3', IMG='https://image.tmdb.org/t/p/w500';
  const q=new URLSearchParams(location.search), id=q.get('id'), type=q.get('type')==='tv'?'tv':'movie';
  const SERVERS=[
    {id:'zxc',name:'zxcstream',label:'Server 1',note:'Primary',movie:id=>`https://zxcstream.xyz/player/movie/${id}?dubLang=tl&dubType=0`,tv:(id,s,e)=>`https://zxcstream.xyz/player/tv/${id}/${s}/${e}?dubLang=tl&dubType=0`},
    {id:'peach',name:'peachify.top',label:'Server 2',note:'Backup 1',movie:id=>`https://peachify.top/embed/movie/${id}`,tv:(id,s,e)=>`https://peachify.top/embed/tv/${id}/${s}/${e}`},
    {id:'oneembed',name:'1embed.cc',label:'Server 3',note:'Backup 2',movie:id=>`https://1embed.cc/embed/movie/${id}`,tv:(id,s,e)=>`https://1embed.cc/embed/tv/${id}/${s}/${e}`},
    {id:'embedsu',name:'embed.su',label:'Server 4',note:'Backup 3',movie:id=>`https://embed.su/embed/movie/${id}`,tv:(id,s,e)=>`https://embed.su/embed/tv/${id}/${s}/${e}`},
    {id:'vidsrc',name:'VidSrc',label:'Server 5',note:'Backup 4',movie:id=>`https://vidsrc.to/embed/movie/${id}`,tv:(id,s,e)=>`https://vidsrc.to/embed/tv/${id}/${s}/${e}`}
  ];
  let season=Number(q.get('season')||1), episode=Number(q.get('episode')||1), isVip=false, adReady=false, adTimer=null;
  let currentServerIndex=Math.max(0,SERVERS.findIndex(x=>x.id===localStorage.getItem('cineflex_preferred_server'))), serverLoadTimer=null;
  const $=id=>document.getElementById(id), frame=$('watchFrame'), frameWrap=document.querySelector('.player-frame-wrap');
  const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)};
  function playerUrl(server=SERVERS[currentServerIndex]){return type==='tv'?server.tv(id,season,episode):server.movie(id)}
  function renderServers(){
    $('serverButtons').innerHTML=SERVERS.map((server,index)=>`<button type="button" class="server-btn ${index===currentServerIndex?'active':''}" data-server="${index}">${server.label}<small>${server.name}</small></button>`).join('');
    document.querySelectorAll('.server-btn').forEach(button=>button.onclick=()=>switchServer(Number(button.dataset.server),true));
    const server=SERVERS[currentServerIndex];$('currentServerLabel').textContent=`${server.label} • ${server.name}`;
  }
  function switchServer(index,userSelected=false){
    currentServerIndex=(index+SERVERS.length)%SERVERS.length;
    localStorage.setItem('cineflex_preferred_server',SERVERS[currentServerIndex].id);
    renderServers();loadPlayer();if(userSelected)toast(`Using ${SERVERS[currentServerIndex].name}`);
  }
  function loadPlayer(){
    clearTimeout(serverLoadTimer);$('serverNotice').hidden=true;frameWrap.classList.add('is-loading');frame.src='about:blank';
    setTimeout(()=>{frame.src=playerUrl()},70);
    serverLoadTimer=setTimeout(()=>{$('serverNotice').hidden=false;frameWrap.classList.remove('is-loading')},9000);
    $('episodeLabel').textContent=type==='tv'?`Season ${season} • Episode ${episode}`:'Movie';
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
      const title=d.title||d.name||q.get('title')||'CineFlex';document.title=`${title} • CineFlex`;$('watchTitle').textContent=title;$('infoTitle').textContent=title;$('overview').textContent=d.overview||'Enjoy this title on CineFlex.';$('typeFact').textContent=type==='tv'?'TV Series':'Movie';
      const bg=d.backdrop_path||q.get('backdrop')||d.poster_path||q.get('poster');if(bg)$('watchBackdrop').style.backgroundImage=`url(https://image.tmdb.org/t/p/original${bg})`;
      $('recommendGrid').innerHTML=(r.results||[]).filter(x=>x.backdrop_path||x.poster_path).slice(0,10).map(x=>`<article class="recommend-card" data-id="${x.id}" data-type="${x.media_type||type}"><img loading="lazy" src="${IMG}${x.backdrop_path||x.poster_path}"><div><h3>${x.title||x.name}</h3><p>${(x.release_date||x.first_air_date||'').slice(0,4)||'Recommended'}</p></div></article>`).join('');
      document.querySelectorAll('.recommend-card').forEach(c=>c.onclick=()=>location.href=`watch.html?id=${c.dataset.id}&type=${c.dataset.type==='tv'?'tv':'movie'}`);
      if(type==='tv'){ $('episodesSection').hidden=false; const sel=$('seasonSelect');sel.innerHTML=(d.seasons||[]).filter(s=>s.season_number>0).map(s=>`<option value="${s.season_number}" ${s.season_number===season?'selected':''}>Season ${s.season_number}</option>`).join('');sel.onchange=()=>{season=Number(sel.value);episode=1;loadEpisodes();loadPlayer()};loadEpisodes(); }
    }catch(e){$('overview').textContent='Unable to load title details right now.'}
  }
  async function loadEpisodes(){try{const d=await fetch(`${BASE}/tv/${id}/season/${season}?api_key=${API_KEY}`).then(x=>x.json());$('episodeGrid').innerHTML=(d.episodes||[]).map(e=>`<article class="episode-card" data-episode="${e.episode_number}"><img loading="lazy" src="${e.still_path?IMG+e.still_path:'icon-512.png'}"><div><h3>Episode ${e.episode_number}${e.name?' • '+e.name:''}</h3><p>${e.runtime?e.runtime+' min':'Play episode'}</p></div></article>`).join('');document.querySelectorAll('.episode-card').forEach(c=>c.onclick=()=>{episode=Number(c.dataset.episode);history.replaceState(null,'',`watch.html?id=${id}&type=tv&season=${season}&episode=${episode}`);loadPlayer();scrollTo({top:0,behavior:'smooth'})})}catch(e){$('episodeGrid').innerHTML='<p>Episodes unavailable.</p>'}}
  $('backBtn').onclick=()=>history.length>1?history.back():location.href='index.html';$('homeBtn').onclick=() => location.href='index.html';$('returnLogin').onclick=()=>location.href='index.html';$('reloadBtn').onclick=()=>{frame.src='';setTimeout(loadPlayer,100);toast('Player reloaded')};$('fullscreenBtn').onclick=()=>{const el=document.querySelector('.player-frame-wrap');(el.requestFullscreen||el.webkitRequestFullscreen)?.call(el)};$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Watch link copied')}catch(e){toast('Copy unavailable')}};
  frame.addEventListener('load',()=>{if(frame.src==='about:blank')return;clearTimeout(serverLoadTimer);frameWrap.classList.remove('is-loading');$('serverNotice').hidden=true});
  $('nextServerBtn').onclick=()=>switchServer(currentServerIndex+1,true);
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
      frame.src = '';
      showAuthGuard(true);
      $('planBadge').textContent = 'LOGIN REQUIRED';
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
