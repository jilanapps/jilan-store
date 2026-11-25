// Chess with Jilan service worker: play offline after the first open.
const CACHE = 'cwj-1.0.0';
const CORE = ['./', 'index.html', 'style.css?v=1.0.0', 'app.js?v=1.0.0', 'lib/chess.js?v=1.0.0', 'manifest.json', 'icon-192.png',
  'engine/stockfish-18-lite-single.js', 'engine/stockfish-18-lite-single.wasm',
  ...['w', 'b'].flatMap((c) => ['K', 'Q', 'R', 'B', 'N', 'P'].map((p) => 'pieces/' + c + p + '.svg'))];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\.apk$|version\.json$/.test(u.pathname)) return; // always network
  const isPage = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  if (isPage) {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => { if (resp.ok) { const c = resp.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return resp; })));
});
