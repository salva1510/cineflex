(function(){
  const configs={
    'all-movies':{title:'All Movies',path:'/discover/movie',params:'sort_by=popularity.desc'},
    popular:{title:'Popular Movies',path:'/movie/popular'},
    'top-rated':{title:'Top Rated Movies',path:'/movie/top_rated'},
    'in-theaters':{title:'Now Playing In Theaters',path:'/movie/now_playing'},
    'coming-soon':{title:'Coming Soon',path:'/movie/upcoming'},
    'all-shows':{title:'All TV Shows',path:'/discover/tv',params:'sort_by=popularity.desc'},
    anime:{title:'Anime',path:'/discover/tv',params:'with_genres=16&with_original_language=ja&sort_by=popularity.desc',type:'tv'},
    action:{title:'Action & Adventure',path:'/discover/movie',params:'with_genres=28,12&sort_by=popularity.desc'},
    animation:{title:'Animation',path:'/discover/movie',params:'with_genres=16&sort_by=popularity.desc'},
    comedy:{title:'Comedy',path:'/discover/movie',params:'with_genres=35&sort_by=popularity.desc'},
    horror:{title:'Horror',path:'/discover/movie',params:'with_genres=27&sort_by=popularity.desc'},
    romance:{title:'Romance',path:'/discover/movie',params:'with_genres=10749&sort_by=popularity.desc'},
    scifi:{title:'Sci-Fi & Fantasy',path:'/discover/movie',params:'with_genres=878,14&sort_by=popularity.desc'},
    thriller:{title:'Thriller',path:'/discover/movie',params:'with_genres=53&sort_by=popularity.desc'},
    family:{title:'Family',path:'/discover/movie',params:'with_genres=10751&sort_by=popularity.desc'}
  };
  let active='all-movies',page=1,totalPages=1,loading=false;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function apiUrl(cfg,p){const q=new URLSearchParams({api_key:API_KEY,page:String(p),language:'en-US'});(cfg.params||'').split('&').filter(Boolean).forEach(pair=>{const [k,v]=pair.split('=');q.set(k,v)});return `${BASE_URL}${cfg.path}?${q}`}
  function normalize(item,cfg){if(!item.media_type)item.media_type=cfg.type||((item.first_air_date||item.name)?'tv':'movie');return item}
  function card(item){const title=item.title||item.name||'Untitled';const date=item.release_date||item.first_air_date||'';const year=date?date.slice(0,4):'—';const rating=Number(item.vote_average||0).toFixed(1);const data=encodeURIComponent(JSON.stringify(item));return `<article class="cf-catalog-card" tabindex="0" data-item="${data}"><div class="cf-catalog-poster"><img loading="lazy" src="${item.poster_path?IMG_URL+item.poster_path:'https://via.placeholder.com/500x750/151918/ffffff?text=CineFlex'}" alt="${esc(title)} poster"><button class="cf-catalog-play" type="button" aria-label="Open ${esc(title)}"><i class="fa-solid fa-play"></i></button></div><div class="cf-catalog-info"><div class="cf-catalog-name">${esc(title)}</div><div class="cf-catalog-meta">${esc(year)} · <span class="cf-catalog-rating">★ ${rating}</span></div></div></article>`}
  async function load(reset){if(loading)return;const cfg=configs[active]||configs['all-movies'];if(reset){page=1;$('cf-catalog-grid').innerHTML='';$('cf-catalog-status').textContent=`Loading ${cfg.title.toLowerCase()}...`}else if(page>=totalPages)return;loading=true;$('cf-catalog-more').classList.remove('show');try{const next=reset?1:page+1;const res=await fetch(apiUrl(cfg,next)).then(r=>{if(!r.ok)throw Error('API error');return r.json()});page=next;totalPages=Math.min(res.total_pages||1,500);const items=(res.results||[]).filter(x=>x.poster_path).map(x=>normalize(x,cfg));$('cf-catalog-grid').insertAdjacentHTML('beforeend',items.map(card).join(''));$('cf-catalog-status').textContent=items.length?'':'No titles found.';$('cf-catalog-more').classList.toggle('show',page<totalPages)}catch(e){console.error('Catalog:',e);$('cf-catalog-status').textContent='Unable to load titles. Please try again.';$('cf-catalog-more').classList.add('show')}finally{loading=false}}
  function select(key){if(!configs[key])key='all-movies';active=key;document.querySelectorAll('.cf-catalog-filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===key));$('cf-catalog-title').textContent=configs[key].title;cfToggleCatalogSidebar(false);load(true)}
  window.cfOpenCatalog=function(key='all-movies'){const el=$('cf-catalog');if(!el)return;el.classList.add('active');el.setAttribute('aria-hidden','false');document.body.classList.add('cf-catalog-open');select(key)};
  window.cfCloseCatalog=function(){const el=$('cf-catalog');if(!el)return;el.classList.remove('active','sidebar-open');el.setAttribute('aria-hidden','true');document.body.classList.remove('cf-catalog-open')};
  window.cfToggleCatalogSidebar=function(show){$('cf-catalog')?.classList.toggle('sidebar-open',!!show)};
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.cf-catalog-filter').forEach(b=>b.addEventListener('click',()=>select(b.dataset.filter)));
    $('cf-catalog-more')?.addEventListener('click',()=>load(false));
    $('cf-catalog-grid')?.addEventListener('click',e=>{const c=e.target.closest('.cf-catalog-card');if(!c)return;try{const item=JSON.parse(decodeURIComponent(c.dataset.item));showDetails(item)}catch(err){console.error(err)}});
    $('cf-catalog-grid')?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.cf-catalog-card'))e.target.closest('.cf-catalog-card').click()});
    $('cf-catalog-main')?.addEventListener('scroll',e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-500&&page<totalPages)load(false)});
  });
})();
