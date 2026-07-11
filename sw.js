// Kein Caching - immer frisch vom Server
self.addEventListener('install', e=>{
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  // IMMER frisch vom Server laden - nie aus Cache
  e.respondWith(fetch(e.request));
});