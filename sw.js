const CACHE_NAME = 'kalender-cache-v4'; // Neuer Cache nach Datum-Vorbelegung Fix
const FILES = ['index.html','styles.css','app.js','manifest.json'];
self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)));
});
self.addEventListener('fetch', e=>{
  // App.js nie aus dem Cache laden - immer frisch vom Server
  if (e.request.url.includes('app.js')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});