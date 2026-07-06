// Open Line service worker — app-shell offline cache.
// Stale-while-revalidate so the shell loads offline after first visit, while
// data files quietly refresh in the background. Per-instance scope (./).
const CACHE = 'openline-v1';
const SHELL = ['./', './index.html', './config.json', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Manual refresh appends ?t=… — let those bypass the cache entirely.
  const url = new URL(req.url);
  if (url.searchParams.has('t')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      if (req.mode === 'navigate') {
        return (await network) || cached || cache.match('./index.html');
      }
      return cached || (await network) || Response.error();
    })(),
  );
});
