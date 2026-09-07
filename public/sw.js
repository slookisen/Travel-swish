const CACHE_NAME = 'travel-swipe-v0.7.0';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './privacy.html',
  './support.html',
  './legal.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const shell = await cache.match('./');
    const html = await shell.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']*assets\/[^"']+)["']/g)]
      .map((match) => new URL(match[1], self.registration.scope))
      .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname))
      .map((url) => url.href);
    // Keep the previous worker until the HTML and its hashed JS/CSS are ready.
    await cache.addAll([...new Set(assets)]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('travel-swipe-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname) || url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return await cache.match(request) || await cache.match('./') || Response.error();
        }),
    );
    return;
  }

  const refresh = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  });
  event.waitUntil(refresh.then(() => undefined, () => undefined));
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => await cache.match(request) || refresh));
});
