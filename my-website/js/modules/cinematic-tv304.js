(() => {
'use strict';
const $=id=>document.getElementById(id);
let tvEnabled=false,currentFocus=null;
const MODE_KEY='cineflex_tv_mode';
const TV_UA=/(android tv|google tv|smart-tv|smarttv|hbbtv|netcast|web0s|webos|tizen|viera|bravia|aftb|aftm|aftt|fire tv|roku|crkey|chromecast)/i;
const focusSelector='button:not([disabled]),a[href],[tabindex="0"],.drawer-item,.play-btn-large,.card,.movie-card,.dramabox-card,.netflix-item-container,.search-card,.cf-smart-card,.cf-top10-card,.cf51-because-card,.cf-catalog-card,.similar-card,.episode-card,.profile-card,.server-btn,.modern-grid-item';
const cardSelector='.card,.movie-card,.dramabox-card,.netflix-item-container,.search-card,.cf-smart-card,.cf-top10-card,.cf51-because-card,.cf-catalog-card,.similar-card,.modern-grid-item';
function visible(e){if(!e||!e.isConnected)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>.05&&r.width>5&&r.height>5}
function scope(){const layers=[...document.querySelectorAll('.modal,.search-overlay,.menu-drawer,[role="dialog"]')].filter(visible);return layers.at(-1)||document}
function candidates(){return [...scope().querySelectorAll(focusSelector)].filter(visible)}
function cards(){return [...scope().querySelectorAll(cardSelector)].filter(visible)}
function center(e){const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,h:r.height,w:r.width}}
function setFocus(e,scroll=true){if(!e||!visible(e))return;document.querySelectorAll('.cf304-focus,.cf304-focus-card').forEach(x=>x.classList.remove('cf304-focus','cf304-focus-card'));currentFocus=e;e.classList.add('cf304-focus');if(e.matches(cardSelector))e.classList.add('cf304-focus-card');if(!e.hasAttribute('tabindex')&&!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName))e.tabIndex=0;try{e.focus({preventScroll:true})}catch{try{e.focus()}catch{}}if(scroll)e.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}
function prepareCards(){document.querySelectorAll(cardSelector).forEach(e=>{if(!e.hasAttribute('tabindex'))e.tabIndex=0;e.setAttribute('data-tv-focusable','poster')})}
function firstCard(){prepareCards();return cards().sort((a,b)=>{const A=center(a),B=center(b);return A.y-B.y||A.x-B.x})[0]||null}
function firstFocus(){prepareCards();const all=candidates();setFocus(all.find(e=>e.id==='banner-play-btn'||e.classList.contains('play-btn'))||firstCard()||all[0],false)}
function rowCardsFor(el){const holder=el?.closest('.scroller,.main-list,.tv-list,.similar-grid,.search-results,.modern-grid');return holder?[...holder.querySelectorAll(cardSelector)].filter(visible):[]}
function horizontal(dir){if(!currentFocus)return false;const row=rowCardsFor(currentFocus);if(!row.length)return false;const ordered=row.sort((a,b)=>center(a).x-center(b).x),i=ordered.indexOf(currentFocus),next=ordered[i+(dir==='left'?-1:1)];if(next){setFocus(next);return true}currentFocus.closest('.scroller')?.scrollBy({left:(dir==='left'?-1:1)*innerWidth*.72,behavior:'smooth'});return true}
function vertical(dir){prepareCards();const list=cards();if(!list.length)return false;if(!currentFocus||!currentFocus.matches(cardSelector)){if(dir==='down'){setFocus(firstCard());return true}return false}const a=center(currentFocus),wanted=list.filter(e=>e!==currentFocus&&((dir==='down'&&center(e).y>a.y+Math.min(30,a.h*.35))||(dir==='up'&&center(e).y<a.y-Math.min(30,a.h*.35))));if(!wanted.length){if(dir==='up'){const play=document.getElementById('banner-play-btn')||document.querySelector('#banner .play-btn');if(visible(play)){setFocus(play);return true}}scrollBy({top:(dir==='down'?1:-1)*innerHeight*.72,behavior:'smooth'});return true}wanted.sort((x,y)=>{const X=center(x),Y=center(y);const sx=Math.abs(X.x-a.x)*2.7+Math.abs(X.y-a.y),sy=Math.abs(Y.x-a.x)*2.7+Math.abs(Y.y-a.y);return sx-sy});setFocus(wanted[0]);return true}
function move(dir){prepareCards();if((dir==='left'||dir==='right')&&currentFocus?.matches(cardSelector)&&horizontal(dir))return;if((dir==='up'||dir==='down')&&vertical(dir))return;const all=candidates();if(!all.length)return;if(!currentFocus||!all.includes(currentFocus)||!visible(currentFocus)){firstFocus();return}const a=center(currentFocus);let best=null,score=Infinity;for(const e of all){if(e===currentFocus)continue;const b=center(e),dx=b.x-a.x,dy=b.y-a.y;const primary=dir==='left'?-dx:dir==='right'?dx:dir==='up'?-dy:dy;if(primary<=6)continue;const cross=(dir==='left'||dir==='right')?Math.abs(dy):Math.abs(dx);const axis=(dir==='left'||dir==='right')?Math.abs(dx):Math.abs(dy);const value=axis+cross*2.5;if(value<score){score=value;best=e}}if(best)setFocus(best)}
function closeLayer(){for(const s of ['.close-trailer-btn','.close-modal','#cfLiveClose','#cfMusicClose','#cfRadioClose','#cfActivityClose','.close-drawer','.cf-catalog-mobile-close']){const e=document.querySelector(s);if(visible(e)){e.click();return}}if(document.fullscreenElement){document.exitFullscreen?.();return}if(scrollY>10)scrollTo({top:0,behavior:'smooth'})}
function updateToggle(){const text=$('cfTvModeText'),icon=$('cfTvModeIcon');if(text)text.textContent=tvEnabled?'Exit TV Mode':'TV Mode';if(icon)icon.className=tvEnabled?'fa-solid fa-display':'fa-solid fa-tv'}
function installToggle(){const host=document.querySelector('.cf-install-drawer-section');if(!host||$('cfTvModeToggle'))return;host.insertAdjacentHTML('beforeend','<button id="cfTvModeToggle" class="drawer-item cf-tv-mode-toggle" type="button"><i id="cfTvModeIcon" class="fa-solid fa-tv"></i><span id="cfTvModeText">TV Mode</span></button>');$('cfTvModeToggle').addEventListener('click',()=>setTV(!tvEnabled));updateToggle()}
function setTV(on,persist=true){tvEnabled=!!on;document.documentElement.classList.toggle('cf304-tv',tvEnabled);document.body.classList.toggle('cf304-tv',tvEnabled);document.documentElement.classList.toggle('cf-tv-mode',tvEnabled);document.body.classList.toggle('cf-tv-mode',tvEnabled);if(persist)localStorage.setItem(MODE_KEY,tvEnabled?'on':'off');updateToggle();if(tvEnabled)setTimeout(firstFocus,180);else{document.querySelectorAll('.cf304-focus').forEach(x=>x.classList.remove('cf304-focus'));currentFocus=null}}
function key(e){const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[e.key]&&!tvEnabled){setTV(true,true)}if(!tvEnabled)return;const tag=(e.target.tagName||'').toLowerCase();if(['input','textarea','select'].includes(tag))return;if(map[e.key]){e.preventDefault();e.stopImmediatePropagation();move(map[e.key]);return}if(['Enter','NumpadEnter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();(currentFocus||document.activeElement)?.click?.();return}if(['Escape','Backspace','BrowserBack'].includes(e.key)||e.keyCode===461||e.keyCode===10009){e.preventDefault();e.stopImmediatePropagation();closeLayer()}}
function cleanHero(){const b=$('banner');if(!b)return;b.classList.add('cf304-cinematic','cf304-minimal');b.querySelectorAll('#cf304-kicker,#cf304-meta,#cf304-desc,#cf304-mylist,#cf304-trailer-toggle,.cf304-video,.cf-hero-status').forEach(e=>e.remove());const buttons=b.querySelector('.banner-buttons');if(buttons)[...buttons.children].forEach((e,i)=>{if(i>0)e.remove()});const play=b.querySelector('.play-btn');if(play&&!play.id)play.id='banner-play-btn'}

function focusModalPlay(){
  if(!tvEnabled)return;
  const modal=document.getElementById('details-modal');
  if(!visible(modal))return;
  const play=modal.querySelector('.play-btn-large,#movie-play-action button');
  if(visible(play))setTimeout(()=>setFocus(play,false),90);
}
function patchDetailsFocus(){
  if(typeof window.showDetails==='function'&&!window.showDetails.__cf304focus){
    const old=window.showDetails;
    window.showDetails=function(){const out=old.apply(this,arguments);setTimeout(focusModalPlay,140);return out};
    window.showDetails.__cf304focus=true;
  }
}

function patchHero(){cleanHero();if(typeof window.setBanner==='function'&&!window.setBanner.__cf304minimal){const old=window.setBanner;window.setBanner=function(){const out=old.apply(this,arguments);setTimeout(cleanHero,0);return out};window.setBanner.__cf304minimal=true}}
function init(){cleanHero();patchHero();patchDetailsFocus();installToggle();prepareCards();const q=new URLSearchParams(location.search).get('tv'),saved=localStorage.getItem(MODE_KEY);setTV(q==='1'||(q!=='0'&&(saved==='on'||(saved!=='off'&&TV_UA.test(navigator.userAgent||'')))),false);document.addEventListener('keydown',key,true);document.addEventListener('focusin',e=>{if(tvEnabled&&e.target.matches?.(focusSelector))setFocus(e.target,false)});new MutationObserver(()=>{installToggle();patchHero();patchDetailsFocus();prepareCards();focusModalPlay();if(tvEnabled&&(!currentFocus||!visible(currentFocus)))setTimeout(firstFocus,80)}).observe(document.body,{childList:true,subtree:true});window.CineFlexTV={enable:()=>setTV(true),disable:()=>setTV(false),toggle:()=>setTV(!tvEnabled),isEnabled:()=>tvEnabled}}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
