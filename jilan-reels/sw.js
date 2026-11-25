/* Jilan Reels — sw.js (v1.5.1)
 * Makes the 2nd and later opens fast:
 *  - app files (js/css/png, Firebase SDK) come from the phone's cache;
 *  - the page itself (index.html) and version.json always try the network
 *    first (short wait), so new versions still arrive;
 *  - videos (Cloudinary), Firestore and Google sign-in are never touched.
 * A new version = new CACHE name; old caches are deleted on activate.
 */
var PFX = /preview/.test(self.registration ? self.registration.scope : '') ? 'jrp-shell-' : 'jr-shell-';
var CACHE = PFX + '1.5.1';
var SHELL = [
  './', 'index.html', 'style.css?v=1.5.1', 'v15.css?v=1.5.1', 'v15.js?v=1.5.1',
  'firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js', 'firebase-config.js',
  'lib.js?v=1.5.1', 'i18n.js?v=1.5.1', 'auth.js?v=1.5.1', 'api.js?v=1.5.1', 'media.js?v=1.5.1',
  'social.js?v=1.5.1', 'app.js?v=1.5.1', 'fx.js?v=1.5.1', 'studio.js?v=1.5.1', 'admin.js?v=1.5.1',
  'icon-192.png', 'manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // one by one so a single missing file never blocks the install
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PFX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req, waitMs) {
  return caches.open(CACHE).then(function (c) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) c.put(req, res.clone());
      return res;
    });
    var timer = new Promise(function (ok) { setTimeout(ok, waitMs); }).then(function () {
      return c.match(req, { ignoreSearch: req.mode === 'navigate' });
    });
    // whichever answers first with a real response; network errors fall back to cache
    return Promise.race([net.catch(function () { return null; }), timer]).then(function (r) {
      if (r) return r;
      return net.catch(function () { return c.match(req, { ignoreSearch: req.mode === 'navigate' }); }).then(function (r2) {
        return r2 || c.match('index.html');
      });
    });
  });
}

function cacheFirst(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                 // Cloudinary, Firestore, Google: untouched
  var path = url.pathname;
  var scope = new URL(self.registration.scope).pathname;
  if (path.indexOf(scope) !== 0) return;
  var rel = path.slice(scope.length);
  if (req.mode === 'navigate' || rel === '' || rel === 'index.html') { e.respondWith(networkFirst(req, 2500)); return; }
  if (rel === 'version.json' || /\.apk$/.test(rel) || /\.html$/.test(rel) || rel.indexOf('clips/') === 0 || rel.indexOf('test/') === 0) return; // always live
  if (/\.(js|css|png|jpg|svg|webp|json|wasm|tflite|binarypb|data)$/.test(rel)) { e.respondWith(cacheFirst(req)); return; }
});
