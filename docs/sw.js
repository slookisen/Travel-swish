const CACHE_NAME = 'travel-swipe-shell-v1';

self.addEventListener('install', event => {
  const base = new URL(self.registration.scope).pathname;
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([base, `${base}manifest.webmanifest`])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('/version.json')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(new URL(self.registration.scope).pathname)),
    );
    return;
  }

  if (url.pathname.includes('/assets/') || url.pathname.endsWith('/app-icon.svg')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })),
    );
  }
});
