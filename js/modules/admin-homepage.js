(() => {
  'use strict';
  const CONFIG_PATH = ['cineflexConfig','homepage'];
  const TMDB_BASE = 'https://api.themoviedb.org/3';
  const apiKey = typeof API_KEY !== 'undefined' ? API_KEY : '742aa17a327005b91fb6602054523286';

  function closeable(el, key){
    const btn=document.createElement('button');btn.type='button';btn.innerHTML='&times;';btn.setAttribute('aria-label','Close');btn.onclick=()=>{el.remove();sessionStorage.setItem(key,'1')};el.appendChild(btn);
  }
  function renderAnnouncement(c){
    document.getElementById('cf-admin-announcement')?.remove();
    if(!c.announcementEnabled || !c.announcementText || sessionStorage.getItem('cf_announcement_closed')==='1') return;
    const box=document.createElement('div');box.id='cf-admin-announcement';box.className=c.announcementType||'info';
    const content=c.announcementLink?document.createElement('a'):document.createElement('div');content.textContent=c.announcementText;
    if(c.announcementLink){content.href=c.announcementLink;content.target='_blank';content.rel='noopener noreferrer'}box.appendChild(content);closeable(box,'cf_announcement_closed');
    const banner=document.getElementById('banner');(banner?.parentNode||document.body).insertBefore(box,banner||document.body.firstChild);
  }
  function renderMaintenance(c){
    document.querySelector('.cf-maintenance-notice')?.remove();
    if(!c.maintenanceEnabled || !c.maintenanceMessage || sessionStorage.getItem('cf_maintenance_closed')==='1') return;
    const box=document.createElement('div');box.className='cf-maintenance-notice';box.textContent='⚠️ '+c.maintenanceMessage;closeable(box,'cf_maintenance_closed');document.body.appendChild(box);
  }
  function applyText(c){
    const eyebrow=document.getElementById('cf-hero-eyebrow');
    if(eyebrow && c.featuredBadge) eyebrow.innerHTML='<span class="live-dot"></span><span>'+String(c.featuredBadge).replace(/[<>]/g,'')+'</span>';
    if(c.homepageHeadline){document.documentElement.style.setProperty('--cf-admin-headline','"'+String(c.homepageHeadline).replace(/["\\]/g,'')+'"')}
  }
  async function applyFeatured(c){
    if(!c.featuredId || !['movie','tv'].includes(c.featuredType)) return;
    try{
      const res=await fetch(`${TMDB_BASE}/${c.featuredType}/${encodeURIComponent(c.featuredId)}?api_key=${apiKey}`);
      if(!res.ok) throw new Error('TMDB '+res.status);
      const item=await res.json();item.media_type=c.featuredType;
      let tries=0;const push=()=>{tries++;if(typeof window.setBanner==='function'){window.setBanner(item);applyText(c)}else if(tries<18)setTimeout(push,250)};push();
    }catch(e){console.warn('CineFlex featured override failed:',e)}
  }
  function applyConfig(c){renderAnnouncement(c||{});renderMaintenance(c||{});applyText(c||{});applyFeatured(c||{});window.dispatchEvent(new CustomEvent('cineflex-admin-config',{detail:c||{}}))}
  function connect(){
    if(!window.db){setTimeout(connect,300);return}
    db.collection(CONFIG_PATH[0]).doc(CONFIG_PATH[1]).onSnapshot(doc=>{if(doc.exists)applyConfig(doc.data())},err=>console.warn('Homepage config unavailable:',err.message||err));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect);else connect();
})();
