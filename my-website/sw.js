const CACHE_NAME = "cineflex-cache-v1";
const OFFLINE_URL = "/offline.html";

// List of core assets to cache (paths match how files are referenced from index.html)
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/home.css",
  "/home.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  OFFLINE_URL,
];

// 1️⃣ Install—cache core files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2️⃣ Activate—clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 3️⃣ Fetch requests—network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || caches.match(OFFLINE_URL)
        )
      )
  );
});
