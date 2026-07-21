const CACHE_NAME = "cineflex-v242-desktop-auth-sync";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/home.css",
  "/home.js",
  "/auth.js",
  "/firebase.js",
  "/profiles.css",
  "/profiles.js",
  "/css/core/identity.css",
  "/js/core/foundation.js",
  "/css/modules/content-center.css",
  "/js/modules/content-center.js",
  "/admin43.css",
  "/js/modules/moderation-guard.js",
  "/css/modules/membership.css",
  "/css/modules/mobile-layout-fix-v91.css",
  "/js/modules/membership.js",
  "/css/modules/activity-center13.css",
  "/js/modules/activity-center13.js",
  "/css/modules/performance14.css",
  "/js/modules/performance14.js",
  "/css/modules/smart-tv15.css",
  "/js/modules/smart-tv15.js",
  "/css/modules/profile-personalization16.css",
  "/js/modules/profile-personalization16.js",
  "/cineflex-support.html",
  "/js/modules/personalized.js",
  "/js/modules/personal-home51.js",
  "/css/modules/community53.css",
  "/js/modules/community53.js",
  "/css/modules/player60.css",
  "/js/modules/player60.js",
  "/js/core/api-client61.js",
  "/css/modules/architecture61.css",
  "/js/modules/stream-engine61.js",
  "/js/modules/player-fullscreen-fix611.js",
  "/manifest.json",
  "/icon-192.png",
  "/css/modules/clean-header-final.css",
  "/css/modules/youtube-movies.css",
  "/js/modules/youtube-movies.js",
  "/css/modules/music-hub.css",
  "/js/modules/music-hub.js",
  "/icon-512.png",
  "/details.html",
  "/details.css",
  "/details.js",
  "/watch.html",
  "/watch.css",
  "/watch.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const freshUI = url.origin === self.location.origin && (
    event.request.mode === "navigate" || /\.(?:js|css|html)$/.test(url.pathname)
  );

  if (freshUI) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }))
  );
});

// Hero Engine 2.0 assets are cached on first request.
