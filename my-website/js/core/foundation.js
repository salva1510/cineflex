(function(){
  'use strict';
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  function addFoundationDom(){
    const banner = document.getElementById('banner');
    if(banner && !document.getElementById('cf-hero-progress')){
      const progress = document.createElement('div');
      progress.id = 'cf-hero-progress';
      progress.className = 'cf-hero-progress';
      progress.innerHTML = '<span></span>';
      banner.appendChild(progress);
    }
    if(banner && !document.getElementById('cf-hero-video')){
      const vid = document.createElement('div');
      vid.id = 'cf-hero-video';
      vid.className = 'cf-hero-video';
      banner.insertBefore(vid, banner.firstChild);
    }
    // Build 9.5: keep the featured banner clean; no metric badges are injected.
  }
  function addCommunityFeed(){
    const sec = document.getElementById('cf-community-section');
    if(!sec || document.getElementById('cf-feed-list')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="cf-community-head" style="margin-top:24px;">
        <h2><i class="fa-solid fa-comments" style="color:#8f5cff"></i> Community Feed</h2>
        <small style="color:#9fb0c4;">live activity layer for comments, ratings, and plays</small>
      </div>
      <div id="cf-feed-list" class="cf-feed-list">
        <div class="cf-feed-item"><span class="cf-feed-icon"><i class="fa-solid fa-user-group"></i></span><div><strong>Welcome to CineFlex Community</strong><small>Online viewers, comments, ratings, and trending are now part of the layout.</small></div></div>
        <div class="cf-feed-item"><span class="cf-feed-icon"><i class="fa-solid fa-star"></i></span><div><strong>Ratings are live</strong><small>Users can rate titles and guests can view the score.</small></div></div>
        <div class="cf-feed-item"><span class="cf-feed-icon"><i class="fa-solid fa-message"></i></span><div><strong>Comments ready</strong><small>Every title can have its own discussion thread.</small></div></div>
      </div>`;
    sec.appendChild(wrap);
  }
  function setupNavScroll(){
    const nav = document.querySelector('.navbar');
    if(!nav) return;
    const apply = () => nav.classList.toggle('scrolled', window.scrollY > 24);
    apply(); window.addEventListener('scroll', apply, {passive:true});
  }
  ready(()=>{ addFoundationDom(); setupNavScroll(); setTimeout(addCommunityFeed, 900); setTimeout(addCommunityFeed, 2200); });
  window.CineFlexFoundation = { refresh(){ addFoundationDom(); addCommunityFeed(); } };
})();
