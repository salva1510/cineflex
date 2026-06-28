// Simpleng Service Worker para sa PWA caching requirement
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pass-through para sa network requests
  e.respondWith(fetch(e.request));
});
