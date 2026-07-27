(function () {
  'use strict';

  const FALLBACK_ROTATE_MS = 10000;
  const TRAILER_DELAY_MS = 900;
  let rotateTimer = null;
  let trailerTimer = null;
  let trailerToken = 0;
  let youtubeReadyPromise = null;
  let player = null;
  let paused = false;
  let trailerPlaying = false;

  const $ = id => document.getElementById(id);
  const items = () => Array.isArray(window.trendingItems) ? window.trendingItems : [];
  const current = () => items()[Number(window.currentBannerIndex || 0)] || null;
  const typeOf = item => item && (item.media_type === 'tv' || item.first_air_date || (!item.title && item.name)) ? 'tv' : 'movie';

  function clearTimers() {
    clearTimeout(rotateTimer);
    clearTimeout(trailerTimer);
    rotateTimer = null;
    trailerTimer = null;
  }

  function destroyPlayer() {
    trailerPlaying = false;
    try { player?.destroy?.(); } catch (_) {}
    player = null;
    const box = $('cf-hero-video');
    box?.classList.remove('active');
    $('banner')?.classList.remove('cf-trailer-playing');
    if (box) box.replaceChildren();
  }

  function loadYouTubeAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (youtubeReadyPromise) return youtubeReadyPromise;
    youtubeReadyPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { previous?.(); } catch (_) {}
        resolve(window.YT);
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = reject;
        document.head.appendChild(script);
      }
      setTimeout(() => window.YT?.Player ? resolve(window.YT) : reject(new Error('YouTube API timeout')), 9000);
    });
    return youtubeReadyPromise;
  }

  function scheduleFallback(ms = FALLBACK_ROTATE_MS) {
    clearTimeout(rotateTimer);
    rotateTimer = setTimeout(() => {
      if (!paused && !document.hidden && !trailerPlaying) rotate(1);
      else scheduleFallback(1500);
    }, ms);
    restartProgress(ms);
  }

  function restartProgress(ms) {
    const bar = $('cf-hero-progress-bar');
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = `cfHeroSprintProgress ${ms}ms linear forwards`;
  }

  function rotate(direction) {
    const list = items();
    if (list.length < 2 || typeof window.setBanner !== 'function') return;
    destroyPlayer();
    clearTimers();
    window.currentBannerIndex = (Number(window.currentBannerIndex || 0) + direction + list.length) % list.length;
    const banner = $('banner');
    banner?.classList.add('cf-hero-changing');
    setTimeout(() => {
      window.setBanner(list[window.currentBannerIndex]);
      banner?.classList.remove('cf-hero-changing');
    }, 160);
  }

  async function findTrailer(item, token) {
    const apiBase = window.BASE_URL || 'https://api.themoviedb.org/3';
    const apiKey = window.API_KEY || '742aa17a327005b91fb6602054523286';
    const response = await fetch(`${apiBase}/${typeOf(item)}/${item.id}/videos?api_key=${apiKey}&language=en-US`);
    if (!response.ok || token !== trailerToken) return null;
    const data = await response.json();
    const videos = Array.isArray(data.results) ? data.results : [];
    return videos.find(v => v.site === 'YouTube' && v.official && v.type === 'Trailer')
      || videos.find(v => v.site === 'YouTube' && /official trailer/i.test(v.name || ''))
      || videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      || videos.find(v => v.site === 'YouTube' && /trailer|teaser/i.test(v.type || ''))
      || null;
  }

  async function startTrailer(item) {
    const box = $('cf-hero-video');
    if (!box || !item?.id || matchMedia('(max-width:760px)').matches) {
      scheduleFallback();
      return;
    }
    const token = ++trailerToken;
    destroyPlayer();
    clearTimers();
    trailerTimer = setTimeout(async () => {
      try {
        const trailer = await findTrailer(item, token);
        if (!trailer?.key || token !== trailerToken) {
          scheduleFallback();
          return;
        }
        await loadYouTubeAPI();
        if (token !== trailerToken) return;
        const mount = document.createElement('div');
        mount.id = `cf-hero-player-${token}`;
        box.replaceChildren(mount);
        player = new YT.Player(mount.id, {
          videoId: trailer.key,
          playerVars: {
            autoplay: 1, mute: 1, controls: 0, disablekb: 1, playsinline: 1,
            modestbranding: 1, rel: 0, iv_load_policy: 3, origin: location.origin
          },
          events: {
            onReady(event) {
              if (token !== trailerToken) return;
              try { event.target.mute(); event.target.playVideo(); } catch (_) {}
            },
            onStateChange(event) {
              if (token !== trailerToken) return;
              if (event.data === YT.PlayerState.PLAYING) {
                trailerPlaying = true;
                box.classList.add('active');
                $('banner')?.classList.add('cf-trailer-playing');
                clearTimeout(rotateTimer);
                const duration = Math.max(1, Number(event.target.getDuration?.() || 0));
                restartProgress(duration * 1000);
              } else if (event.data === YT.PlayerState.ENDED) {
                trailerPlaying = false;
                rotate(1);
              }
            },
            onError() {
              if (token !== trailerToken) return;
              destroyPlayer();
              scheduleFallback();
            }
          }
        });
        // Safety fallback if playback is blocked by the browser.
        rotateTimer = setTimeout(() => {
          if (!trailerPlaying && token === trailerToken) {
            destroyPlayer();
            scheduleFallback(500);
          }
        }, 7000);
      } catch (error) {
        console.warn('Hero trailer unavailable:', error);
        if (token === trailerToken) scheduleFallback();
      }
    }, TRAILER_DELAY_MS);
  }

  function apply(item) {
    if (!item) return;
    updateDots();
    startTrailer(item);
  }

  function updateDots() {
    const holder = $('cf-hero-dots');
    const list = items();
    if (!holder || !list.length) return;
    holder.innerHTML = '';
    list.slice(0, 8).forEach((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === Number(window.currentBannerIndex || 0) ? 'active' : '';
      button.setAttribute('aria-label', `Show featured title ${index + 1}`);
      button.onclick = () => {
        destroyPlayer(); clearTimers();
        window.currentBannerIndex = index;
        window.setBanner(list[index]);
      };
      holder.appendChild(button);
    });
  }

  function patchSetBanner() {
    if (typeof window.setBanner !== 'function' || window.setBanner.__cf3045) return;
    const original = window.setBanner;
    window.setBanner = function (item) {
      const result = original.apply(this, arguments);
      apply(item);
      return result;
    };
    window.setBanner.__cf3045 = true;
  }

  function init() {
    patchSetBanner();
    const banner = $('banner');
    banner?.addEventListener('mouseenter', () => { paused = true; });
    banner?.addEventListener('mouseleave', () => { paused = false; });
    banner?.addEventListener('focusin', () => { paused = true; });
    banner?.addEventListener('focusout', () => { paused = false; });
    $('cf-hero-prev')?.addEventListener('click', () => rotate(-1));
    $('cf-hero-next')?.addEventListener('click', () => rotate(1));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearTimers();
      else if (current()) startTrailer(current());
    });
    const wait = setInterval(() => {
      patchSetBanner();
      const item = current();
      if (item) { clearInterval(wait); apply(item); }
    }, 250);
    setTimeout(() => clearInterval(wait), 15000);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
