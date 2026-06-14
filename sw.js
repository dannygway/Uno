// Service worker — offline play + controlled "tap to update" flow.
const CACHE = 'neon-siege-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  // Pre-cache for offline. Do NOT skipWaiting here — we let the page decide
  // when to activate the new version (via the update banner), so the user is
  // never yanked mid-game.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page posts this when the user taps the update banner.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Network-first for GET requests: online players always get the latest build on
// a normal load; cache is the offline fallback. (The old build was cache-first,
// which is what forced the double-refresh.)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
