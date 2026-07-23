const CACHE_NAME = "cineflex-v300-recommendations-5";
const PAGE_CACHE = "cineflex-pages-v300-cms-4";
const MEDIA_CACHE = "cineflex-media-v300-cms-4";

// Keep install light. Optional hubs and large modules are cached only after use.
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/home.css",
  "/home.js",
  "/auth.css",
  "/auth.js",
  "/firebase.js",
  "/profiles.css",
  "/profiles.js",
  "/js/modules/account-experience2503.js",
  "/js/core/build-info300.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/cineflex-header-logo.png",
  "/details.html",
  "/details.css",
  "/details.js",
  "/watch.html",
  "/watch.css",
  "/watch.js"
];

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CORE_ASSETS.map(url => cache.add(new Request(url, { cache: "reload" }))))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  const allowed = new Set([CACHE_NAME, PAGE_CACHE, MEDIA_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !allowed.has(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await caches.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never intercept Firebase, TMDB API calls, players, ads, or other dynamic third-party requests.
  if (!sameOrigin) {
    if (url.hostname === "image.tmdb.org") event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === "navigate" || /\.(?:html|js|css)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (/\.(?:png|jpe?g|webp|svg|gif|ico|mp3|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
