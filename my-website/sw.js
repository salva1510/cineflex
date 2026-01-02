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

