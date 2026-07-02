const CACHE_NAME = "cineflex-v4";

// Siguraduhing tugma ito sa eksaktong pangalan ng mga file mo
const urlsToCache = [
  "/",
  "/index.html",
  "/home.css", // Binago mula sa styles.css
  "/home.js"   // Binago mula sa script.js
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
