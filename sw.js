// Service Worker deaktiviert - kein Caching
self.addEventListener('install', e=>{
  self.skipWaiting();
});