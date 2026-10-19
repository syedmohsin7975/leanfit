/* LeanFit service worker: app shell is network-first (so updates arrive), media and fonts are cache-first (offline). */
const SHELL = 'leanfit-shell-v1', MEDIA = 'leanfit-media';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('leanfit-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate' || (url.origin === location.origin && FILES.some(f => url.pathname.endsWith(f.replace('./', '/'))))) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy));
      return res;
    }).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })));
    return;
  }

  if (/static\.exercisedb\.dev|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(MEDIA).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      c.put(req, res.clone());
      return res;
    }))));
  }
});
