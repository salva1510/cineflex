(() => {
  const API_KEY='742aa17a327005b91fb6602054523286', BASE='https://api.themoviedb.org/3', IMG='https://image.tmdb.org/t/p/w500', PEACH='https://peachify.top';
  const q=new URLSearchParams(location.search), id=q.get('id'), type=q.get('type')==='tv'?'tv':'movie';
  let season=Number(q.get('season')||1), episode=Number(q.get('episode')||1), isVip=false, adReady=false, adTimer=null;
  const $=id=>document.getElementById(id), frame=$('watchFrame');
  const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)};
  function playerUrl(){return type==='tv'?`${PEACH}/embed/tv/${id}/${season}/${episode}`:`${PEACH}/embed/movie/${id}`}
  function loadPlayer(){frame.src=playerUrl();$('episodeLabel').textContent=type==='tv'?`Season ${season} • Episode ${episode}`:'Movie'}
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
  auth.onAuthStateChanged(user=>{if(!user){frame.src='';$('authGuard').hidden=false;return}$('authGuard').hidden=true;membership(user);loadPlayer()});
  loadData();
})();
