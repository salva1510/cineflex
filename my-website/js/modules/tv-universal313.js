(function(){
'use strict';
var FOCUS='cf-tv-focus',lastFocus=null,enabled=false,backArmed=false;
var KEYS={left:[37,21],up:[38,19],right:[39,22],down:[40,20],enter:[13,23,66],back:[8,27,461,10009,4]};
function codeIn(code,list){return list.indexOf(code)>-1}
function isTV(){
  var saved=localStorage.getItem('cineflex_tv_mode');
  if(saved==='on')return true;if(saved==='off')return false;
  var ua=navigator.userAgent||'';
  return /Android TV|GoogleTV|SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|AFTB|AFTM|AFTS|HbbTV|Viera|Hisense|VIDAA|Roku|CrKey/i.test(ua)||(matchMedia('(min-width:1000px)').matches&&matchMedia('(pointer:coarse)').matches);
}
function visible(el){
  if(!el||el.disabled||el.getAttribute('aria-hidden')==='true'||el.closest('[hidden]'))return false;
  var s=getComputedStyle(el),r=el.getBoundingClientRect();
  return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||1)>.05&&r.width>5&&r.height>5;
}
function selector(){return 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[role="button"],[tabindex]:not([tabindex="-1"]),.card,.cf-premium-card,.netflix-item-container,.episode-item,.rec-item,.episode-card,.recommend-card,.drawer-item,.cf-catalog-filter,.load-more,[class*="load-more"]'}
function activeScope(){
  var all=[
    document.querySelector('#cf312NextOverlay:not([hidden])'),
    document.querySelector('.menu-drawer.active'),
    document.querySelector('#search-overlay'),
    document.querySelector('#cf-catalog[aria-hidden="false"]'),
    document.querySelector('#details-modal'),
    document.querySelector('.profiles-modal.active,.profiles-modal.show'),
    document.querySelector('#profile-selector')
  ];
  for(var i=0;i<all.length;i++)if(all[i]&&visible(all[i]))return all[i];
  return document;
}
function items(){
  var root=activeScope(),nodes=[].slice.call(root.querySelectorAll(selector()));
  return nodes.filter(function(el,i){return visible(el)&&nodes.indexOf(el)===i&&!el.closest('[aria-hidden="true"]')});
}
function center(el){var r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,r:r}}
function setFocus(el,scroll){
  if(!visible(el))return false;
  document.querySelectorAll('.'+FOCUS).forEach(function(x){if(x!==el)x.classList.remove(FOCUS)});
  el.classList.add(FOCUS);lastFocus=el;
  try{el.focus({preventScroll:true})}catch(_){try{el.focus()}catch(__){}}
  if(scroll!==false){try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'})}catch(_){el.scrollIntoView()}}
  return true;
}
function first(){
  var list=items();if(!list.length)return;
  var preferred=list.find(function(el){return el.matches('#banner button,.hero-content button,.play-btn-large,.nav-item.active,.drawer-item.active,[aria-current="page"]')});
  setFocus(preferred||list[0]);
}
function sameRowScore(a,b,dir){
  var dx=b.x-a.x,dy=b.y-a.y,primary,secondary;
  if(dir==='left'&&dx>=-7||dir==='right'&&dx<=7||dir==='up'&&dy>=-7||dir==='down'&&dy<=7)return Infinity;
  if(dir==='left'||dir==='right'){primary=Math.abs(dx);secondary=Math.abs(dy)}else{primary=Math.abs(dy);secondary=Math.abs(dx)}
  var overlap=(dir==='left'||dir==='right')?Math.max(0,Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)):Math.max(0,Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left));
  return primary+secondary*2.8-overlap*1.3;
}
function move(dir){
  var list=items();if(!list.length)return;
  var cur=visible(document.activeElement)?document.activeElement:lastFocus;
  if(!cur||list.indexOf(cur)<0){first();return}
  var a=center(cur),best=null,bestScore=Infinity;
  list.forEach(function(el){if(el===cur)return;var score=sameRowScore(a,center(el),dir);if(score<bestScore){bestScore=score;best=el}});
  if(best){setFocus(best);return}
  var row=cur.closest('.scroller,.movie-row,[class*="scroller"],.server-buttons,.episode-list-container,.mini-recommendation-list');
  if(row&&(dir==='left'||dir==='right'))row.scrollBy({left:(dir==='left'?-1:1)*Math.max(420,row.clientWidth*.78),behavior:'smooth'});
}
function activate(){var el=visible(document.activeElement)?document.activeElement:lastFocus;if(!el)return;try{el.click()}catch(_){}}
function closeTop(){
  var next=document.querySelector('#cf312NextOverlay:not([hidden])');if(next){document.getElementById('cf312CancelNext')?.click();return true}
  var drawer=document.querySelector('.menu-drawer.active');if(drawer){window.closeMenuDrawer?.();return true}
  var search=document.getElementById('search-overlay');if(search&&visible(search)){window.closeSearch?.();return true}
  var catalog=document.querySelector('#cf-catalog[aria-hidden="false"]');if(catalog){window.cfCloseCatalog?.();return true}
  var modal=document.getElementById('details-modal');if(modal&&visible(modal)){window.closeModal?.();return true}
  return false;
}
function back(){
  if(closeTop()){setTimeout(first,120);return}
  var file=location.pathname.split('/').pop();
  if(file&&file!=='index.html'){history.length>1?history.back():location.assign('index.html');return}
  if(!backArmed){backArmed=true;window.cfToast?.('Press Back again to exit');setTimeout(function(){backArmed=false},1800)}
}
function onKey(e){
  if(!enabled)return;
  var key=e.key||'',code=e.keyCode||e.which,target=e.target,editing=target&&/INPUT|TEXTAREA/.test(target.tagName);
  if(editing&&!codeIn(code,KEYS.back)&&key!=='Escape')return;
  var dir=codeIn(code,KEYS.left)||key==='ArrowLeft'?'left':codeIn(code,KEYS.right)||key==='ArrowRight'?'right':codeIn(code,KEYS.up)||key==='ArrowUp'?'up':codeIn(code,KEYS.down)||key==='ArrowDown'?'down':'';
  if(dir){e.preventDefault();e.stopImmediatePropagation();move(dir);return}
  if(codeIn(code,KEYS.enter)||key==='Enter'||key===' '){e.preventDefault();e.stopImmediatePropagation();activate();return}
  if(codeIn(code,KEYS.back)||key==='Escape'||key==='BrowserBack'||key==='GoBack'){e.preventDefault();e.stopImmediatePropagation();back()}
}
function help(){if(document.querySelector('.cf-tv-help'))return;var el=document.createElement('div');el.className='cf-tv-help';el.innerHTML='<kbd>◀ ▲ ▼ ▶</kbd> Navigate &nbsp; <kbd>OK</kbd> Select &nbsp; <kbd>Back</kbd> Return';document.body.appendChild(el)}
function set(on,persist){
  enabled=!!on;document.documentElement.classList.toggle('cf-tv-ui',enabled);document.body.classList.toggle('cf-tv-ui',enabled);
  if(persist)localStorage.setItem('cineflex_tv_mode',enabled?'on':'off');
  if(enabled){help();setTimeout(first,420)}else document.querySelectorAll('.'+FOCUS).forEach(function(x){x.classList.remove(FOCUS)});
  window.dispatchEvent(new CustomEvent('cineflex:tv-mode',{detail:{enabled:enabled}}));
}
function init(){
  set(isTV(),false);
  window.addEventListener('keydown',onKey,true);
  document.addEventListener('focusin',function(e){if(enabled&&visible(e.target)){document.querySelectorAll('.'+FOCUS).forEach(function(x){if(x!==e.target)x.classList.remove(FOCUS)});e.target.classList.add(FOCUS);lastFocus=e.target}},true);
  new MutationObserver(function(){if(enabled&&(!lastFocus||!visible(lastFocus)))setTimeout(first,100)}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style','aria-hidden']});
  document.addEventListener('click',function(e){var t=e.target.closest?.('.tv-mode,.cf-tv-mode-toggle,[data-tv-mode]');if(t){e.preventDefault();set(!enabled,true)}},true);
  window.CineFlexTV={enable:function(){set(true,true)},disable:function(){set(false,true)},toggle:function(){set(!enabled,true)},focusFirst:first,isEnabled:function(){return enabled}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
