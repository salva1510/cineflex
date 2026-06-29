const CACHE_NAME = 'cineflex-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/home.css',
  '/home.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// I-install ang Service Worker at i-cache ang mga basic UI assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching basic shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// I-activate at linisin ang mga lumang cache kung may bago
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first o Cache-fallback fetch strategy para gumana pa rin ang interface
self.addEventListener('fetch', (event) => {
  // Huwag i-intercept ang mga API requests o video streaming sources para hindi bumagal
  if (event.request.url.includes('api.themoviedb.org') || event.request.url.includes('zxcstream.xyz')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
