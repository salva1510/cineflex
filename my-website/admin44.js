(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SERVERS = [
    {name:'Primary · ZXCStream', url:'https://zxcstream.xyz'},
    {name:'Peachify', url:'https://peachify.top'},
    {name:'1Embed', url:'https://1embed.cc'},
    {name:'Embed.su', url:'https://embed.su'},
    {name:'VidSrc', url:'https://vidsrc.to'}
  ];
  const BUILD='300.3';
  const CACHE_PREFIX='cineflex-';
  let serverResults=[];
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function toast(m){const t=$('toast'); if(!t)return; t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
  function install(){
    const nav=document.querySelector('.nav'); if(!nav||$('health'))return;
    nav.insertAdjacentHTML('beforeend',`<button class="nav-btn" data-page="health"><i class="fa-solid fa-heart-pulse"></i>Server Health</button><button class="nav-btn" data-page="system"><i class="fa-solid fa-microchip"></i>System & Cache</button>`);
    document.querySelector('main.content').insertAdjacentHTML('beforeend',`
<section id="health" class="page"><div class="panel"><div class="manager-head"><div><h2>Server Health Monitor</h2><p class="muted">Browser-level reachability check. A reachable domain does not guarantee that every movie source is available.</p></div><button id="cf44RunHealth" class="primary-btn"><i class="fa-solid fa-rotate"></i> Run checks</button></div><div id="cf44HealthSummary" class="cf44-summary"></div><div id="cf44Servers" class="cf44-server-grid"></div></div></section>
<section id="system" class="page"><div class="grid-2"><div class="panel"><h2>Release Diagnostics</h2><div class="activity"><span>Admin Studio</span><span class="badge">2.0 Foundation</span></div><div class="activity"><span>Build</span><span class="badge">${BUILD}</span></div><div class="activity"><span>Browser</span><span id="cf44Browser" class="cf44-value">—</span></div><div class="activity"><span>Network</span><span id="cf44Network" class="badge">—</span></div><div class="activity"><span>Service worker</span><span id="cf44SW" class="badge">Checking</span></div><div class="activity"><span>Active caches</span><span id="cf44CacheCount" class="cf44-value">—</span></div><div class="actions"><button id="cf44RefreshSystem" class="ghost-btn">Refresh diagnostics</button></div></div><div class="panel"><h2>Cache Controls</h2><p class="muted">Use this after deploying a new build when an old page or script remains cached.</p><div id="cf44CacheList" class="cf44-cache-list"></div><div class="cf44-warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Clearing CineFlex caches reloads the Admin Studio and forces fresh assets on the next visit.</span></div><div class="actions"><button id="cf44ClearCaches" class="danger-btn"><i class="fa-solid fa-trash"></i> Clear CineFlex caches</button><button id="cf44UpdateSW" class="primary-btn"><i class="fa-solid fa-arrows-rotate"></i> Check app update</button></div></div></div></section>`);
    document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const labels={health:['Server Health','Check configured player domains and response timing'],system:['System & Cache','Inspect the active release, service worker, and browser caches']};
      if(!labels[btn.dataset.page])return;
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(btn.dataset.page).classList.add('active');$('pageTitle').textContent=labels[btn.dataset.page][0];$('pageSubtitle').textContent=labels[btn.dataset.page][1];
      if(btn.dataset.page==='health'&&!serverResults.length)runHealth(); if(btn.dataset.page==='system')refreshSystem();
    }));
    $('cf44RunHealth').onclick=runHealth;$('cf44RefreshSystem').onclick=refreshSystem;$('cf44ClearCaches').onclick=clearCaches;$('cf44UpdateSW').onclick=updateSW;
    renderServers(); refreshSystem();
  }
  function renderServers(){
    const box=$('cf44Servers'); if(!box)return;
    box.innerHTML=SERVERS.map((s,i)=>{const r=serverResults[i]||{state:'idle',ms:null};const label=r.state==='online'?(r.ms<900?'Fast':'Reachable'):r.state==='checking'?'Checking':r.state==='limited'?'Limited':'Not checked';return `<article class="cf44-server ${r.state}"><div class="cf44-server-icon"><i class="fa-solid ${r.state==='online'?'fa-circle-check':r.state==='checking'?'fa-spinner fa-spin':r.state==='limited'?'fa-triangle-exclamation':'fa-server'}"></i></div><div><b>${esc(s.name)}</b><small>${esc(s.url)}</small></div><span class="cf44-status">${label}${r.ms!=null?' · '+r.ms+' ms':''}</span></article>`}).join('');
    const ok=serverResults.filter(x=>x.state==='online').length, checked=serverResults.filter(x=>x.state!=='idle'&&x.state!=='checking').length;
    $('cf44HealthSummary').innerHTML=checked?`<b>${ok}/${SERVERS.length}</b> domains responded to the browser check. Cross-origin restrictions can mark a working iframe provider as limited.`:'Press Run checks to test configured domains.';
  }
  async function probe(server,index){
    const started=performance.now();
    try{await fetch(server.url+'/?cf_health='+Date.now(),{method:'HEAD',mode:'no-cors',cache:'no-store',signal:AbortSignal.timeout?AbortSignal.timeout(8000):undefined});serverResults[index]={state:'online',ms:Math.round(performance.now()-started)}}catch(e){serverResults[index]={state:'limited',ms:Math.round(performance.now()-started)}}renderServers();
  }
  async function runHealth(){serverResults=SERVERS.map(()=>({state:'checking',ms:null}));renderServers();await Promise.allSettled(SERVERS.map(probe));toast('Server checks completed')}
  async function refreshSystem(){
    if(!$('cf44Browser'))return;
    $('cf44Browser').textContent=(navigator.userAgentData?.brands||[]).map(x=>x.brand+' '+x.version).join(', ')||navigator.userAgent.split(' ').slice(-2).join(' ');
    $('cf44Network').textContent=navigator.onLine?'Online':'Offline';$('cf44Network').className='badge '+(navigator.onLine?'':'cf44-danger');
    let reg=null;try{reg=await navigator.serviceWorker?.getRegistration();$('cf44SW').textContent=reg?(reg.waiting?'Update ready':'Registered'):'Not registered'}catch{$('cf44SW').textContent='Unavailable'}
    let keys=[];try{keys=await caches.keys()}catch{}$('cf44CacheCount').textContent=String(keys.length);$('cf44CacheList').innerHTML=keys.length?keys.map(k=>`<div><i class="fa-solid fa-database"></i><span>${esc(k)}</span></div>`).join(''):'<p class="muted">No browser caches detected.</p>';
  }
  async function clearCaches(){if(!confirm('Clear all CineFlex browser caches and reload Admin Studio?'))return;const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)).map(k=>caches.delete(k)));toast('CineFlex caches cleared');setTimeout(()=>location.reload(),700)}
  async function updateSW(){try{const reg=await navigator.serviceWorker?.getRegistration();if(!reg)throw new Error('No service worker registration');await reg.update();toast(reg.waiting?'Update is ready. Reload the website.':'Update check completed');refreshSystem()}catch(e){toast(e.message)} }
  window.addEventListener('online',refreshSystem);window.addEventListener('offline',refreshSystem);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
