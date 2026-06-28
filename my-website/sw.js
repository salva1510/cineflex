// Isang simpleng Service Worker para pumasa sa PWA installation requirements ng mga browser
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pinapadaan lang nito ang mga requests nang direkta sa internet nang walang binabago
  e.respondWith(fetch(e.request));
});
