self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("cineflex-cache").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/css/home.css",
        "/js/home.js",
        "/manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
// sw.js
const CACHE_NAME = "cineflex-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/home.css",
  "/js/home.js",
  "/manifest.json",
  "/icons/icon-192.png",
  // Add other static assets
];

// Install event: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch event: Network-and-cache for videos, cache-or-network for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache video embeds (e.g., vidsrc.cc, vsrc.su, etc.)
  if (
    url.hostname.includes("vidsrc.cc") ||
    url.hostname.includes("vsrc.su") ||
    url.hostname.includes("player.videasy.net")
  ) {
    event.respondWith(
      caches.open("cineflex-videos").then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse; // Serve cached video
          }
          // Not cached? Fetch from network and cache it
          return fetch(event.request).then((networkResponse) => {
            // Only cache successful responses (status 200)
            if (networkResponse && networkResponse.status === 200) {
              // Clone because response streams can't be reused
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  } 
  // For static assets: cache-or-network
  else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request).then((networkResponse) => {
            // Cache new static assets
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
            return networkResponse;
          })
        );
      })
    );
  }
});

// Optional: Clean old caches
self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_NAME, "cineflex-videos"];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!allowedCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

