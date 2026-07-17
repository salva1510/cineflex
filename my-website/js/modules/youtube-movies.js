(function(){
  'use strict';

  const CFG = window.CINEFLEX_YOUTUBE || {};
  const CACHE_KEY = 'cineflex_youtube_movies_cache_v1';
  const FAVORITES_KEY = 'cineflex_youtube_movie_favorites_v1';
  const FULL_MOVIE_RE = /\b(full\s*movie|full\s*film|pelikulang\s*buo|movie\s*hd|complete\s*movie|entire\s*movie)\b/i;
  const EXCLUDE_RE = /\b(trailer|teaser|clip|highlights?|shorts?|behind\s+the\s+scenes|music\s+video|interview|presscon|reaction)\b/i;
  let allMovies = [];
  let visibleMovies = [];
  let activeGenre = 'All';
  let activeSort = 'Newest';
  let query = '';
  let activeVideoId = '';

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const apiReady = () => Boolean(CFG.apiKey && CFG.apiKey !== 'YOUR_RESTRICTED_YOUTUBE_API_KEY');
  const favorites = () => { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch (_) { return []; } };
  const isFavorite = id => favorites().includes(id);
  const saveFavorites = list => localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));

  function parseDuration(value){
    const m = String(value || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
  }

  function classify(title, description){
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    if(/horror|aswang|multo|engkanto|takot|shake rattle|patayin|halimaw/.test(text)) return 'Horror';
    if(/comedy|nakakatawa|komedya|laugh|funny|andrew e|janno gibbs|bayani agbayani|vic sotto/.test(text)) return 'Comedy';
    if(/romance|love|pag-ibig|mahal|puso|forever|boyfriend|girlfriend|wedding|bride/.test(text)) return 'Romance';
    if(/action|baril|bala|pulis|sundalo|war|laban|delubyo|probinsyano|bad boy|robin padilla|bong revilla|fpj/.test(text)) return 'Action';
    return 'Drama';
  }

  function formatViews(value){
    const n = Number(value || 0);
    if(n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M views`;
    if(n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K views`;
    return `${n} views`;
  }

  function isNew(publishedAt){
    const age = Date.now() - new Date(publishedAt).getTime();
    return Number.isFinite(age) && age >= 0 && age <= 14 * 86400000;
  }

  async function api(path, params){
    const qs = new URLSearchParams({...params, key: CFG.apiKey});
    const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
    if(!response.ok){
      let detail = '';
      try { detail = (await response.json())?.error?.message || ''; } catch (_) {}
      throw new Error(detail || `YouTube API error ${response.status}`);
    }
    return response.json();
  }

  async function getUploadsPlaylist(channelId){
    const data = await api('channels', {part:'contentDetails', id:channelId});
    return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || '';
  }

  async function getPlaylistItems(playlistId, maxCount){
    let pageToken = '';
    const items = [];
    while(items.length < maxCount){
      const params = {part:'snippet,contentDetails', playlistId, maxResults:'50'};
      if(pageToken) params.pageToken = pageToken;
      const data = await api('playlistItems', params);
      items.push(...(data.items || []));
      pageToken = data.nextPageToken || '';
      if(!pageToken) break;
    }
    return items.slice(0, maxCount);
  }

  async function getVideoDetails(ids){
    const output = [];
    for(let i = 0; i < ids.length; i += 50){
      const data = await api('videos', {
        part:'snippet,contentDetails,status,statistics',
        id:ids.slice(i, i + 50).join(',')
      });
      output.push(...(data.items || []));
    }
    return output;
  }

  async function searchMovieVideos(queryText, maxPages){
    let pageToken = '';
    const ids = [];
    for(let page = 0; page < Math.max(1, Number(maxPages || 1)); page++){
      const params = {part:'snippet', type:'video', videoEmbeddable:'true', videoDuration:'long', maxResults:'50', q:queryText, safeSearch:'moderate'};
      if(pageToken) params.pageToken = pageToken;
      const data = await api('search', params);
      ids.push(...(data.items || []).map(item => item.id?.videoId).filter(Boolean));
      pageToken = data.nextPageToken || '';
      if(!pageToken) break;
    }
    return ids;
  }

  async function loadFromApi(){
    const channels = Array.isArray(CFG.channels) ? CFG.channels : [];
    const collectedIds = [];
    for(const channel of channels){
      const playlistId = await getUploadsPlaylist(channel.id);
      if(!playlistId) continue;
      const playlistItems = await getPlaylistItems(playlistId, Number(CFG.maxVideosPerChannel || 300));
      collectedIds.push(...playlistItems.map(x => x.contentDetails?.videoId).filter(Boolean));
    }
    const queries = Array.isArray(CFG.searchQueries) ? CFG.searchQueries : [];
    for(const q of queries){
      try { collectedIds.push(...await searchMovieVideos(q, CFG.maxSearchPagesPerQuery || 1)); } catch(err) { console.warn('Movie search skipped:', q, err); }
    }
    const ids = [...new Set(collectedIds)];
    const details = await getVideoDetails(ids);
    const collected = [];
    details.forEach(video => {
      const title = video.snippet?.title || 'Untitled movie';
      const description = video.snippet?.description || '';
      const seconds = parseDuration(video.contentDetails?.duration);
      const playable = video.status?.embeddable === true && video.status?.privacyStatus === 'public';
      const looksFull = FULL_MOVIE_RE.test(title) || FULL_MOVIE_RE.test(description) || seconds >= 5400;
      if(!playable || seconds < 3600 || EXCLUDE_RE.test(title) || !looksFull) return;
      collected.push({
        id: video.id,
        title,
        description,
        publishedAt: video.snippet?.publishedAt || '',
        thumbnail: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || '',
        channelTitle: video.snippet?.channelTitle || 'YouTube',
        durationSeconds: seconds,
        views: Number(video.statistics?.viewCount || 0),
        genre: classify(title, description)
      });
    });
    const unique = [...new Map(collected.map(movie => [movie.id, movie])).values()];
    localStorage.setItem(CACHE_KEY, JSON.stringify({savedAt:Date.now(), movies:unique}));
    return unique;
  }

  function getCached(){
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      const ttl = Number(CFG.cacheHours || 6) * 3600000;
      if(cache?.savedAt && Array.isArray(cache.movies) && Date.now() - cache.savedAt < ttl) return cache.movies;
    } catch (_) {}
    return null;
  }

  function shellMarkup(){
    return `<section id="cfYouTubeMovies" class="cf-yt-shell" aria-hidden="true">
      <header class="cf-yt-head">
        <div class="cf-yt-brand"><i class="fa-brands fa-youtube"></i><div><h2>YouTube Movies</h2><small>Available public and embeddable full-movie uploads</small></div></div>
        <button type="button" onclick="cfCloseYouTubeMovies()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <main class="cf-yt-wrap">
        <section class="cf-yt-hero">
          <div><span class="cf-yt-official"><i class="fa-solid fa-circle-check"></i> OFFICIAL SOURCES</span><h1>YouTube Movies Hub</h1><p>Browse available public, embeddable full movies from YouTube. Results refresh automatically and may change based on uploader availability.</p></div>
          <button type="button" onclick="cfRefreshYouTubeMovies(true)"><i class="fa-solid fa-rotate"></i> Refresh Catalog</button>
        </section>
        <section id="cfYtTrending" class="cf-yt-trending" hidden><div class="cf-yt-section-title"><h3><i class="fa-solid fa-fire"></i> Trending Movies</h3><span>Based on available YouTube view counts</span></div><div id="cfYtTrendingRow" class="cf-yt-trending-row"></div></section>
        <div class="cf-yt-tools">
          <label class="cf-yt-search"><i class="fa-solid fa-magnifying-glass"></i><input id="cfYtSearch" type="search" placeholder="Search YouTube movies..." oninput="cfSearchYouTubeMovies(this.value)"></label>
          <select id="cfYtSort" onchange="cfSortYouTubeMovies(this.value)"><option>Newest</option><option>Most Viewed</option><option>Title A–Z</option></select>
        </div>
        <div id="cfYtGenres" class="cf-yt-genres">${['All','Action','Comedy','Romance','Horror','Drama','Favorites'].map(g => `<button class="${g==='All'?'active':''}" onclick="cfFilterYouTubeMovies('${g}',this)">${g==='Favorites'?'<i class="fa-solid fa-star"></i> ':''}${g}</button>`).join('')}</div>
        <div class="cf-yt-section-title"><h3 id="cfYtTitle">All Available Full Movies</h3><span id="cfYtCount">Loading…</span></div>
        <div id="cfYtStatus" class="cf-yt-status"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading YouTube movie catalog…</p></div>
        <div id="cfYtGrid" class="cf-yt-grid"></div>
      </main>
    </section>
    <div id="cfYtPlayer" class="cf-yt-player" aria-hidden="true"><div class="cf-yt-player-card">
      <div class="cf-yt-player-top"><div><span>YOUTUBE MOVIE</span><h3 id="cfYtPlayerTitle">Movie</h3></div><div><button id="cfYtPlayerFav" onclick="cfToggleYouTubeFavorite(activeVideoId)" aria-label="Favorite"><i class="fa-regular fa-star"></i></button><button onclick="cfYouTubeFullscreen()" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button><button onclick="cfCloseYouTubePlayer()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div></div>
      <div id="cfYtScreen" class="cf-yt-screen"><iframe id="cfYtIframe" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
      <div class="cf-yt-player-foot"><button onclick="cfYouTubePrevious()"><i class="fa-solid fa-backward-step"></i> Previous</button><a id="cfYtOfficial" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-youtube"></i> Open on YouTube</a><button onclick="cfYouTubeNext()">Next <i class="fa-solid fa-forward-step"></i></button></div>
    </div></div>`;
  }

  function card(movie, compact){
    return `<article class="cf-yt-card ${compact?'compact':''}">
      <button class="cf-yt-poster" type="button" onclick="cfPlayYouTubeMovie('${movie.id}')"><img src="${esc(movie.thumbnail)}" alt="" loading="lazy"><span class="cf-yt-play"><i class="fa-solid fa-play"></i></span>${isNew(movie.publishedAt)?'<b class="cf-yt-new">NEW ON YOUTUBE</b>':''}<em>${esc(movie.genre)}</em></button>
      <div class="cf-yt-card-body"><h4 title="${esc(movie.title)}">${esc(movie.title)}</h4><p>${esc(movie.channelTitle)} • ${formatViews(movie.views)}</p></div>
      <button class="cf-yt-fav ${isFavorite(movie.id)?'active':''}" onclick="cfToggleYouTubeFavorite('${movie.id}')" aria-label="Favorite"><i class="${isFavorite(movie.id)?'fa-solid':'fa-regular'} fa-star"></i></button>
    </article>`;
  }

  function applyFilters(){
    visibleMovies = allMovies.filter(movie => {
      const genreOk = activeGenre === 'All' || (activeGenre === 'Favorites' ? isFavorite(movie.id) : movie.genre === activeGenre);
      const searchOk = !query || `${movie.title} ${movie.description}`.toLowerCase().includes(query);
      return genreOk && searchOk;
    });
    if(activeSort === 'Most Viewed') visibleMovies.sort((a,b) => b.views - a.views);
    else if(activeSort === 'Title A–Z') visibleMovies.sort((a,b) => a.title.localeCompare(b.title));
    else visibleMovies.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    render();
  }

  function render(){
    const grid = document.getElementById('cfYtGrid');
    const status = document.getElementById('cfYtStatus');
    const count = document.getElementById('cfYtCount');
    const title = document.getElementById('cfYtTitle');
    if(count) count.textContent = `${visibleMovies.length} movie${visibleMovies.length === 1 ? '' : 's'}`;
    if(title) title.textContent = activeGenre === 'All' ? 'All Available Full Movies' : `${activeGenre} Movies`;
    if(status) status.hidden = true;
    if(grid) grid.innerHTML = visibleMovies.length ? visibleMovies.map(movie => card(movie, false)).join('') : '<div class="cf-yt-empty"><i class="fa-solid fa-film"></i><h3>No movies found</h3><p>Try another genre or search term.</p></div>';
    const trending = [...allMovies].sort((a,b) => b.views - a.views).slice(0,10);
    const section = document.getElementById('cfYtTrending');
    const row = document.getElementById('cfYtTrendingRow');
    if(section) section.hidden = !trending.length;
    if(row) row.innerHTML = trending.map(movie => card(movie, true)).join('');
  }

  function showError(error){
    const status = document.getElementById('cfYtStatus');
    const grid = document.getElementById('cfYtGrid');
    if(grid) grid.innerHTML = '';
    if(!status) return;
    status.hidden = false;
    const setup = !apiReady();
    status.innerHTML = `<i class="fa-solid ${setup?'fa-key':'fa-triangle-exclamation'}"></i><h3>${setup?'YouTube API key is not configured':'Catalog could not load'}</h3><p>${setup?'Open <code>js/modules/youtube-movies-config.js</code> and replace the placeholder with your NEW restricted API key.':esc(error?.message || 'Please try again.')}</p>${setup?'<small>Never reuse the key previously shared in chat.</small>':'<button onclick="cfRefreshYouTubeMovies(true)">Try Again</button>'}`;
    const count = document.getElementById('cfYtCount');
    if(count) count.textContent = 'Setup required';
  }

  async function refresh(force){
    const status = document.getElementById('cfYtStatus');
    if(status){status.hidden=false;status.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i><p>Loading YouTube movie catalog…</p>';}
    try {
      if(!apiReady()) throw new Error('API key missing');
      const cached = force ? null : getCached();
      allMovies = cached || await loadFromApi();
      applyFilters();
    } catch(error){ showError(error); }
  }

  function init(){
    if(document.getElementById('cfYouTubeMovies')) return;
    document.body.insertAdjacentHTML('beforeend', shellMarkup());
  }

  window.cfOpenYouTubeMovies = function(){
    init();
    const shell = document.getElementById('cfYouTubeMovies');
    shell.classList.add('active'); shell.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if(typeof closeMenuDrawer === 'function') closeMenuDrawer();
    if(!allMovies.length) refresh(false);
  };
  window.cfCloseYouTubeMovies = function(){ const shell=document.getElementById('cfYouTubeMovies'); if(shell){shell.classList.remove('active');shell.setAttribute('aria-hidden','true');} document.body.style.overflow=''; cfCloseYouTubePlayer(); };
  window.cfRefreshYouTubeMovies = refresh;
  window.cfFilterYouTubeMovies = function(genre, button){activeGenre=genre;document.querySelectorAll('#cfYtGenres button').forEach(x=>x.classList.remove('active'));button?.classList.add('active');applyFilters();};
  window.cfSearchYouTubeMovies = function(value){query=String(value||'').trim().toLowerCase();applyFilters();};
  window.cfSortYouTubeMovies = function(value){activeSort=value;applyFilters();};
  window.cfToggleYouTubeFavorite = function(id){let list=favorites();list=list.includes(id)?list.filter(x=>x!==id):[...list,id];saveFavorites(list);applyFilters();updatePlayerFav();};
  window.cfPlayYouTubeMovie = function(id){
    const movie=allMovies.find(x=>x.id===id); if(!movie)return;
    activeVideoId=id; window.activeVideoId=id;
    document.getElementById('cfYtPlayerTitle').textContent=movie.title;
    document.getElementById('cfYtIframe').src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    document.getElementById('cfYtOfficial').href=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    const player=document.getElementById('cfYtPlayer');player.classList.add('active');player.setAttribute('aria-hidden','false');updatePlayerFav();
  };
  window.cfCloseYouTubePlayer = function(){const player=document.getElementById('cfYtPlayer');if(player){player.classList.remove('active');player.setAttribute('aria-hidden','true');}const frame=document.getElementById('cfYtIframe');if(frame)frame.src='';};
  window.cfYouTubeFullscreen = function(){const screen=document.getElementById('cfYtScreen');if(screen?.requestFullscreen)screen.requestFullscreen().catch(()=>{});else if(screen?.webkitRequestFullscreen)screen.webkitRequestFullscreen();try{screen.orientation?.lock?.('landscape');}catch(_){}};
  window.cfYouTubePrevious = function(){const index=visibleMovies.findIndex(x=>x.id===activeVideoId);if(index>=0&&visibleMovies.length)cfPlayYouTubeMovie(visibleMovies[(index-1+visibleMovies.length)%visibleMovies.length].id);};
  window.cfYouTubeNext = function(){const index=visibleMovies.findIndex(x=>x.id===activeVideoId);if(index>=0&&visibleMovies.length)cfPlayYouTubeMovie(visibleMovies[(index+1)%visibleMovies.length].id);};
  function updatePlayerFav(){const button=document.getElementById('cfYtPlayerFav');if(!button||!activeVideoId)return;const yes=isFavorite(activeVideoId);button.classList.toggle('active',yes);button.innerHTML=`<i class="${yes?'fa-solid':'fa-regular'} fa-star"></i>`;}

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
