(function(){
  'use strict';
  var FOCUS='cf-tv-focus';
  var lastFocus=null;
  var enabled=false;
  var KEY={LEFT:[37,21],UP:[38,19],RIGHT:[39,22],DOWN:[40,20],ENTER:[13,23,66],BACK:[8,27,461,10009]};
  function keyIn(code,list){return list.indexOf(code)>-1}
  function isTV(){
    var ua=navigator.userAgent||'';
    var forced=localStorage.getItem('cineflex_tv_mode');
    if(forced==='on')return true;if(forced==='off')return false;
    return /Android TV|GoogleTV|SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|AFTB|AFTM|AFTS|HbbTV|Viera|Hisense|VIDAA|Roku|CrKey/i.test(ua)||
      (matchMedia('(min-width: 1100px)').matches&&matchMedia('(hover: none)').matches);
  }
  function visible(el){
    if(!el||el.disabled||el.getAttribute('aria-hidden')==='true'||el.closest('[hidden]'))return false;
    var s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||1)>.05&&r.width>4&&r.height>4;
  }
  function selector(){return 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[role="button"],[tabindex]:not([tabindex="-1"]),.card,.cf-premium-card,.netflix-item-container,.episode-card,.recommend-card,.drawer-item,.cf-catalog-filter'}
  function scope(){
    var candidates=['#cf312NextOverlay:not([hidden])','.modal.active','.modal.show','.menu-drawer.active','#search-overlay.active','#cf-catalog[aria-hidden="false"]','#authGuard:not([hidden])'];
    for(var i=0;i<candidates.length;i++){var x=document.querySelector(candidates[i]);if(x&&visible(x))return x}
    return document;
  }
  function items(){
    var root=scope(), nodes=[].slice.call(root.querySelectorAll(selector()));
    return nodes.filter(function(el,i){return visible(el)&&nodes.indexOf(el)===i});
  }
  function center(el){var r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,r:r}}
  function focus(el,scroll){
    if(!el||!visible(el))return false;
    document.querySelectorAll('.'+FOCUS).forEach(function(x){x.classList.remove(FOCUS)});
    el.classList.add(FOCUS);lastFocus=el;
    try{el.focus({preventScroll:true})}catch(e){try{el.focus()}catch(_){}}
    if(scroll!==false){try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'})}catch(e){el.scrollIntoView()}}
    return true;
  }
  function first(){
    var list=items();
    var preferred=list.find(function(el){return el.matches('.primary,.active,[aria-current="page"],#banner button,.hero-content button,#playBtn,#fullscreenBtn')});
    focus(preferred||list[0]);
  }
  function move(dir){
    var list=items();if(!list.length)return;
    var cur=(lastFocus&&visible(lastFocus))?lastFocus:(visible(document.activeElement)?document.activeElement:null);
    if(!cur||list.indexOf(cur)<0){first();return}
    var a=center(cur),best=null,bestScore=Infinity;
    list.forEach(function(el){
      if(el===cur)return;var b=center(el),dx=b.x-a.x,dy=b.y-a.y,primary,secondary;
      if(dir==='left'&&dx>=-8)return;if(dir==='right'&&dx<=8)return;if(dir==='up'&&dy>=-8)return;if(dir==='down'&&dy<=8)return;
      if(dir==='left'||dir==='right'){primary=Math.abs(dx);secondary=Math.abs(dy)}else{primary=Math.abs(dy);secondary=Math.abs(dx)}
      var overlap=(dir==='left'||dir==='right')?Math.max(0,Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)):Math.max(0,Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left));
      var score=primary+(secondary*2.45)-(overlap*1.15);
      if(score<bestScore){bestScore=score;best=el}
    });
    if(best)focus(best);else{
      var scroller=cur.closest('.scroller,.movie-row,.server-buttons,.episode-grid,.recommend-grid');
      if(scroller){var amount=(dir==='left'?-1:dir==='right'?1:0)*Math.max(350,scroller.clientWidth*.72);if(amount)scroller.scrollBy({left:amount,behavior:'smooth'})}
    }
  }
  function activate(){
    var el=(lastFocus&&visible(lastFocus))?lastFocus:document.activeElement;
    if(!el)return;
    if(el.tagName==='SELECT'){try{el.click()}catch(e){};return}
    try{el.click()}catch(e){var ev=document.createEvent('MouseEvents');ev.initEvent('click',true,true);el.dispatchEvent(ev)}
  }
  function closeTop(){
    var next=document.querySelector('#cf312NextOverlay:not([hidden])');if(next){var c=document.getElementById('cf312CancelNext');if(c)c.click();return true}
    var drawer=document.querySelector('.menu-drawer.active');if(drawer){var d=drawer.querySelector('.close-drawer,[aria-label*="Close"]');if(d)d.click();else if(window.closeMenuDrawer)window.closeMenuDrawer();return true}
    var modal=document.querySelector('.modal.active,.modal.show');if(modal){var m=modal.querySelector('.close,[aria-label*="Close"],.modal-close');if(m)m.click();else if(window.closeModal)window.closeModal();return true}
    var catalog=document.querySelector('#cf-catalog[aria-hidden="false"]');if(catalog&&window.cfCloseCatalog){window.cfCloseCatalog();return true}
    return false;
  }
  function onKey(e){
    if(!enabled)return;var code=e.keyCode||e.which,key=e.key||'';
    var editable=e.target&&/INPUT|TEXTAREA/.test(e.target.tagName);
    if(editable&&!keyIn(code,KEY.BACK))return;
    if(keyIn(code,KEY.LEFT)||key==='ArrowLeft'){e.preventDefault();move('left')}
    else if(keyIn(code,KEY.RIGHT)||key==='ArrowRight'){e.preventDefault();move('right')}
    else if(keyIn(code,KEY.UP)||key==='ArrowUp'){e.preventDefault();move('up')}
    else if(keyIn(code,KEY.DOWN)||key==='ArrowDown'){e.preventDefault();move('down')}
    else if(keyIn(code,KEY.ENTER)||key==='Enter'||key===' '){e.preventDefault();activate()}
    else if(keyIn(code,KEY.BACK)||key==='Escape'||key==='BrowserBack'){e.preventDefault();if(!closeTop()){if(location.pathname.endsWith('/index.html')||location.pathname==='/'||location.pathname===''){}else if(history.length>1)history.back();else location.href='index.html'}}
    else if((key==='t'||key==='T')&&!editable){toggle()}
  }
  function help(){
    if(document.querySelector('.cf-tv-help'))return;var el=document.createElement('div');el.className='cf-tv-help';el.innerHTML='<kbd>◀ ▲ ▼ ▶</kbd> Navigate &nbsp; <kbd>OK</kbd> Select &nbsp; <kbd>Back</kbd> Return';document.body.appendChild(el)
  }
  function set(on,persist){
    enabled=!!on;document.body.classList.toggle('cf-tv-ui',enabled);document.documentElement.classList.toggle('cf-tv-ui',enabled);
    if(persist)localStorage.setItem('cineflex_tv_mode',enabled?'on':'off');
    if(enabled){help();setTimeout(first,450)}else{document.querySelectorAll('.'+FOCUS).forEach(function(x){x.classList.remove(FOCUS)})}
    window.dispatchEvent(new CustomEvent('cineflex:tv-mode',{detail:{enabled:enabled}}));
  }
  function toggle(){set(!enabled,true)}
  function init(){
    set(isTV(),false);document.addEventListener('keydown',onKey,true);
    document.addEventListener('focusin',function(e){if(enabled&&visible(e.target)){document.querySelectorAll('.'+FOCUS).forEach(function(x){if(x!==e.target)x.classList.remove(FOCUS)});e.target.classList.add(FOCUS);lastFocus=e.target}},true);
    var observer=new MutationObserver(function(){if(enabled&&(!lastFocus||!visible(lastFocus)))setTimeout(first,80)});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','aria-hidden']});
    window.CineFlexTV={enable:function(){set(true,true)},disable:function(){set(false,true)},toggle:toggle,focusFirst:first,isEnabled:function(){return enabled}};
    document.addEventListener('click',function(e){var tv=e.target.closest&&e.target.closest('.tv-mode,.cf-tv-mode-toggle,[data-tv-mode]');if(tv){e.preventDefault();toggle()}},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
