(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const REF = () => db.collection('cineflexConfig').doc('plugins');
  const defaults = { ads:true, recommendations:true, youtubeMovies:true, youtubeMusic:true };
  const controls = {
    ads: $('pluginAds'), recommendations: $('pluginRecommendations'),
    youtubeMovies: $('pluginYoutubeMovies'), youtubeMusic: $('pluginYoutubeMusic')
  };
  const statuses = {
    ads: $('pluginAdsStatus'), recommendations: $('pluginRecommendationsStatus'),
    youtubeMovies: $('pluginYoutubeMoviesStatus'), youtubeMusic: $('pluginYoutubeMusicStatus')
  };
  function toast(message){ const el=$('toast'); if(!el)return; el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }
  function apply(data={}){
    const source = data.plugins && typeof data.plugins === 'object' ? data.plugins : data;
    Object.keys(defaults).forEach(name => {
      const enabled = source[name] !== false;
      controls[name].checked = enabled;
      statuses[name].textContent = enabled ? 'Enabled site-wide' : 'Disabled site-wide';
    });
  }
  function collect(){ const out={}; Object.keys(controls).forEach(name=>out[name]=!!controls[name].checked); return out; }
  async function load(){
    $('reloadPluginSettings').disabled=true;
    try { const doc=await REF().get(); apply(doc.exists ? doc.data() : defaults); }
    catch(e){ console.error(e); apply(defaults); toast('Could not load plugin settings'); }
    finally { $('reloadPluginSettings').disabled=false; }
  }
  async function publish(){
    const btn=$('publishPluginSettings'); btn.disabled=true;
    try {
      const plugins=collect();
      await REF().set({plugins,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:(auth.currentUser&&(auth.currentUser.email||auth.currentUser.uid))||'admin'},{merge:true});
      apply(plugins); toast('Plugin settings published site-wide');
    } catch(e){ console.error(e); toast('Publish failed: '+e.message); }
    finally { btn.disabled=false; }
  }
  $('reloadPluginSettings')?.addEventListener('click',load);
  $('publishPluginSettings')?.addEventListener('click',publish);
  Object.keys(controls).forEach(name=>controls[name]?.addEventListener('change',()=>{statuses[name].textContent=controls[name].checked?'Ready to enable':'Ready to disable';}));
  auth.onAuthStateChanged(user=>{ if(user) load(); });
})();
