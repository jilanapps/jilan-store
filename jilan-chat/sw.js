// Jilan Chat app-shell service worker (v4.13).
// NETWORK-FIRST: when online every request goes to the network (with
// revalidation, so never a stale file); the cache is used ONLY when the
// network fails (offline cold start). Bump VERSION to drop old caches.
// Never touches Firestore/Firebase traffic (cross-origin) or APK files.
var VERSION = "jc-shell-v4.13.2";
var SHELL = [
  "./", "index.html", "style.css", "polish.css", "icon-192.png",
  "firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js", "firebase-storage-compat.js",
  "firebase-config.js", "auth.js", "app.js", "camera.js", "calls.js", "calllog.js", "status.js", "groups.js",
  "block.js", "requests.js", "nearby.js", "fcm.js", "menu.js", "extras.js", "features.js", "screenshare.js",
  "features2.js", "features3.js", "features4.js", "features5.js", "qrcode-gen.js", "profile.js", "emoji.js",
  "status2.js", "v413.js"
];
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // Best effort: a missing file must never block the worker.
    return Promise.all(SHELL.map(function (u) {
      return fetch(u, { cache: "no-cache" }).then(function (r) { if (r && r.ok) return c.put(u, r); }).catch(function () {});
    }));
  }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("jc-shell-") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Firebase, Google: untouched
  var scope = new URL(self.registration.scope);
  if (url.pathname.indexOf(scope.pathname) !== 0) return;
  if (/\.apk$|version\.json$|\/sw\.js$/.test(url.pathname)) return; // updates always live
  if (req.headers.get("range")) return;
  e.respondWith(
    // (a navigate Request cannot be re-used with an init object)
    (req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" })).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("index.html");
        return Response.error();
      });
    })
  );
});
