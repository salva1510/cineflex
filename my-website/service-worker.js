const CACHE_NAME = "cineflex-build-6.1.5-native-fullscreen-fix";

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
  "/css/modules/watch-party.css",
  "/js/modules/watch-party.js",
  "/css/modules/content-center.css",
  "/js/modules/content-center.js",
  "/admin43.css",
  "/js/modules/moderation-guard.js",
  "/css/modules/ai-assistant.css",
  "/js/modules/ai-assistant.js",
  "/js/modules/personalized.js",
  "/js/modules/personal-home51.js",
  "/css/modules/community53.css",
  "/js/modules/community53.js",
  "/js/core/api-client61.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
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
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => cached))
  );
});

// Hero Engine 2.0 assets are cached on first request.
