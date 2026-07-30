(() => {
  'use strict';
  const API_KEY = window.API_KEY || '742aa17a327005b91fb6602054523286';
  const BASE_URL = window.BASE_URL || 'https://api.themoviedb.org/3';
  async function loadViuHome(){
    const list = document.getElementById('filipino-list');
    const heading = document.getElementById('vivamax-heading');
    if(heading) heading.textContent = 'VIU Dramas';
    if(!list || typeof window.displayCards !== 'function') return;
    try{
      const providers = await fetch(`${BASE_URL}/watch/providers/tv?api_key=${API_KEY}&watch_region=PH`).then(r=>r.json());
      const viu = (providers.results||[]).find(p=>/\bviu\b/i.test(p.provider_name||''));
      let url;
      if(viu){
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&watch_region=PH&with_watch_providers=${viu.provider_id}&sort_by=popularity.desc&include_null_first_air_dates=false`;
      } else {
        url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18&sort_by=popularity.desc`;
      }
      const data = await fetch(url).then(r=>r.json());
      window.displayCards((data.results||[]).map(x=>({...x,media_type:'tv'})), 'filipino-list');
    }catch(e){ console.warn('VIU home section fallback', e); }
  }
  window.addEventListener('load', () => setTimeout(loadViuHome, 900));
})();
