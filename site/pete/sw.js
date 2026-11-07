// vault-it.co/pete as a home-screen app (owner, 7 Nov 2026). Published as /pete-sw.js so it can look after /pete itself.
// The card registers it only when opened from the home screen, so people who just scan the card get nothing stored.
// It keeps the card, its pictures, the contact file and its fonts on the phone so the card opens with no signal.
// The house film is left to the network (videos ask for byte ranges); offline the still picture shows instead. Nothing is sent anywhere.
const CACHE = 'pete-card-v1';
// '/' on vault-it.co, '/landing/' on preview builds: the folder this helper is served from
const BASE = new URL('./', self.location).pathname;
const SHELL = ['pete', 'pete/house-corner.jpg', 'pete/ptlive.png', 'pete/pete-thickett-vault-it.vcf', 'pete/manifest.webmanifest', 'pete/icon-192.png', 'pete/icon-512.png', 'pitch/logo-mid.png'].map((p) => BASE + p);
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('pete-card-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// keep a fresh copy when the network answers; fall back to the kept copy when it does not
function fresh(req, key) {
  return caches.open(CACHE).then((c) => fetch(req).then((res) => { if (res.ok) c.put(key, res.clone()); return res; })
    .catch(() => c.match(key).then((hit) => hit || Response.error())));
}
// answer from the kept copy at once, refresh it in the background
function kept(req) {
  return caches.open(CACHE).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
    return hit || net;
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === BASE + 'pete') return e.respondWith(fresh(req, BASE + 'pete'));
    if (url.pathname.endsWith('.mp4')) return;
    if (SHELL.includes(url.pathname)) return e.respondWith(kept(req));
    return;
  }
  if (FONTS.test(url.origin)) e.respondWith(kept(req));
});
