(() => {
  const cfg = window.CINEFLEX_KDRAMA_CONFIG || {};
  const els = {
    grid: document.getElementById('grid'), stats: document.getElementById('stats'), notice: document.getElementById('notice'),
    search: document.getElementById('searchInput'), sort: document.getElementById('sortSelect'), refresh: document.getElementById('refreshBtn'),
    more: document.getElementById('loadMoreBtn'), modal: document.getElementById('playerModal'), iframe: document.getElementById('ytPlayer'),
    title: document.getElementById('playerTitle'), close: document.getElementById('closePlayer'), youtube: document.getElementById('youtubeLink'),
    prev: document.getElementById('prevBtn'), next: document.getElementById('nextBtn')
  };
  let all = [], visible = [], currentIndex = -1, queryPages = {}, loading = false;
  const CACHE_KEY = 'cineflex_kdrama_youtube_v1';

  const api = async (path, params) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    Object.entries({...params, key: cfg.apiKey}).forEach(([k,v]) => v !== '' && v != null && url.searchParams.set(k,v));
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || 'YouTube API request failed');
    return data;
  };
  const isoSeconds = s => { const m=s.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1]||0)*86400+(+m[2]||0)*3600+(+m[3]||0)*60+(+m[4]||0) : 0; };
  const fmtDuration = sec => `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
  const fmtViews = n => Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(+n||0);
  const clean = s => (s||'').replace(/<[^>]*>/g,'');
  const allowed = item => !cfg.allowedChannelIds?.length || cfg.allowedChannelIds.includes(item.snippet.channelId);

  async function searchPage(query, pageToken='') {
    const search = await api('search', {part:'snippet', type:'video', q:query, maxResults:'50', order:'date', pageToken, videoEmbeddable:'true', safeSearch:'moderate', relevanceLanguage:'tl', regionCode:'PH'});
    const ids = search.items.map(x=>x.id.videoId).filter(Boolean);
    if (!ids.length) return {items:[], nextPageToken:''};
    const details = await api('videos', {part:'snippet,contentDetails,status,statistics', id:ids.join(',')});
    const minSec = (+cfg.minMinutes||18)*60;
    const items = details.items.filter(v => v.status?.embeddable && v.status?.privacyStatus === 'public' && isoSeconds(v.contentDetails.duration) >= minSec && allowed(v)).map(v=>({
      id:v.id,title:clean(v.snippet.title),channel:clean(v.snippet.channelTitle),channelId:v.snippet.channelId,published:v.snippet.publishedAt,
      thumb:v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,seconds:isoSeconds(v.contentDetails.duration),views:+(v.statistics?.viewCount||0)
    }));
    return {items,nextPageToken:search.nextPageToken||''};
  }

  async function initialLoad(force=false) {
    if (loading) return; loading=true; showSkeletons();
    try {
      if (!cfg.apiKey || cfg.apiKey.includes('YOUR_RESTRICTED')) throw new Error('Ilagay muna ang bagong restricted YouTube API key sa youtube-kdrama-config.js.');
      if (!force) {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
        if (cached && Date.now()-cached.savedAt < (+cfg.cacheHours||6)*3600000) { all=cached.items||[]; queryPages=cached.queryPages||{}; apply(); loading=false; return; }
      }
      all=[]; queryPages={};
      for (const q of cfg.queries||[]) {
        const result=await searchPage(q);
        all.push(...result.items); queryPages[q]={token:result.nextPageToken,page:1};
      }
      dedupe(); save(); apply();
    } catch(e) { showError(e.message); } finally { loading=false; }
  }

  async function loadMore() {
    if (loading) return; loading=true; els.more.disabled=true; els.more.textContent='Loading…';
    try {
      for (const q of cfg.queries||[]) {
        const state=queryPages[q]||{};
        if (state.token && state.page < (+cfg.maxSearchPagesPerQuery||3)) {
          const result=await searchPage(q,state.token); all.push(...result.items); queryPages[q]={token:result.nextPageToken,page:state.page+1};
        }
      }
      dedupe(); save(); apply();
    } catch(e){showError(e.message)} finally {loading=false;els.more.disabled=false;els.more.textContent='Load more results';}
  }

  function dedupe(){ const map=new Map(); all.forEach(v=>map.set(v.id,v)); all=[...map.values()]; }
  function save(){ localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),items:all,queryPages})); }
  function showSkeletons(){ els.grid.innerHTML=Array(10).fill('<div class="skeleton"></div>').join(''); els.stats.textContent='Hinahanap ang available Tagalog-dubbed K-dramas…'; }
  function showError(msg){ els.grid.innerHTML=''; els.notice.hidden=false; els.notice.textContent=msg; els.stats.textContent='Hindi na-load ang catalog.'; }
  function apply(){
    const term=els.search.value.trim().toLowerCase(); visible=all.filter(v=>!term || `${v.title} ${v.channel}`.toLowerCase().includes(term));
    const sort=els.sort.value; visible.sort((a,b)=>sort==='views'?b.views-a.views:sort==='longest'?b.seconds-a.seconds:sort==='title'?a.title.localeCompare(b.title):new Date(b.published)-new Date(a.published));
    render();
  }
  function render(){
    els.notice.hidden=true; els.stats.textContent=`${visible.length} available at embeddable videos`;
    els.grid.innerHTML=visible.map((v,i)=>`<article class="card" data-i="${i}"><div class="thumb"><img loading="lazy" src="${v.thumb}" alt=""><span class="duration">${fmtDuration(v.seconds)}</span><span class="play"><i class="fa-solid fa-play"></i></span></div><div class="meta"><h3>${escapeHtml(v.title)}</h3><p>${escapeHtml(v.channel)} • ${fmtViews(v.views)} views</p></div></article>`).join('') || '<p>Walang tumugmang video.</p>';
    els.grid.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>play(+c.dataset.i)));
    els.more.hidden=!Object.values(queryPages).some(x=>x.token && x.page < (+cfg.maxSearchPagesPerQuery||3));
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  let playerHistoryActive = false;
  async function enterLandscapePlayer(){
    els.modal.classList.add('landscape-active');
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (els.modal.requestFullscreen) await els.modal.requestFullscreen({navigationUI:'hide'});
        else if (els.modal.webkitRequestFullscreen) els.modal.webkitRequestFullscreen();
      }
    } catch (_) {}
    try { await screen.orientation?.lock?.('landscape'); } catch (_) {}
  }
  function play(i){
    if(!visible[i])return;
    currentIndex=i;
    const v=visible[i];
    els.title.textContent=v.title;
    els.iframe.src=`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=0`;
    els.youtube.href=`https://www.youtube.com/watch?v=${v.id}`;
    els.modal.hidden=false;
    document.body.style.overflow='hidden';
    if(!playerHistoryActive){ history.pushState({cineflexPlayer:true},'',location.href); playerHistoryActive=true; }
    enterLandscapePlayer();
  }
  async function close(fromPopState=false){
    els.modal.hidden=true;
    els.modal.classList.remove('landscape-active');
    els.iframe.src='';
    document.body.style.overflow='';
    try { screen.orientation?.unlock?.(); } catch (_) {}
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
    if(playerHistoryActive){
      playerHistoryActive=false;
      if(!fromPopState) history.back();
    }
  }
  els.search.addEventListener('input',apply); els.sort.addEventListener('change',apply); els.refresh.addEventListener('click',()=>{localStorage.removeItem(CACHE_KEY);initialLoad(true)}); els.more.addEventListener('click',loadMore); els.close.addEventListener('click',close); els.modal.addEventListener('click',e=>{if(e.target===els.modal)close()}); window.addEventListener('popstate',()=>{if(!els.modal.hidden){playerHistoryActive=false;close(true);}}); els.prev.addEventListener('click',()=>play((currentIndex-1+visible.length)%visible.length)); els.next.addEventListener('click',()=>play((currentIndex+1)%visible.length));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  initialLoad();
})();
