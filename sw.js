// Vault-It service worker: the app shell opens offline; everything else is live.
// Network first for the pages (an update is never stuck behind an old cache), cache fallback when offline.
// Nothing from another origin is cached: Supabase, the three.js CDN and the price feeds are always live.
var VERSION = '__SW_VERSION__';   // tools/build_site.js writes the commit here, so every release is a new cache
var CACHE = 'vault-it-' + VERSION;
var SHELL = ['./', './index.html', './recover.html', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;   // always live: the app uses it to spot a new release
  var page = req.mode === 'navigate' || /\/(index|recover)\.html$/.test(url.pathname);
  if (page) {
    var key = /recover\.html$/.test(url.pathname) ? './recover.html' : './index.html';
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () { return caches.match(key).then(function (r) { return r || caches.match('./index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
