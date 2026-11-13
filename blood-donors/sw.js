/* BDBS offline cache — the app shell works without internet after the first visit.
   index.html is network-first (so updates still reach the phone when online);
   other files are cache-first. */
var CACHE = 'bdbs-v1';
var SHELL = ['index.html', 'logo.png', 'firebase-config.js', 'verify.html', 'privacy-policy.html', 'delete-account.html'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
  self.skipWaiting();
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var isPage = url.pathname.endsWith('index.html') || url.pathname.endsWith('/blood-donors/') || url.pathname.endsWith('/bdbs/');
  if (url.origin === location.origin && isPage) {
    e.respondWith(fetch(e.request).then(function(r){ var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); return r; }).catch(function(){ return caches.match(e.request).then(function(m){ return m || caches.match('index.html'); }); }));
  } else {
    e.respondWith(caches.match(e.request).then(function(m){ return m || fetch(e.request).then(function(r){ var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); return r; }).catch(function(){ return m; }); }));
  }
});
