// Offline support for classroom tablets and spotty connections.
// Pages: network first, so a new version is picked up as soon as possible.
// Files: served from the cache at once and refreshed in the background.
const CACHE = 'corn-wukong-v5';
const APP_SHELL = new URL('./', self.registration.scope).href;

self.addEventListener('install', (event) => {
  // The very first navigation predates this worker. Save the entry page
  // during installation so the next launch can work without a connection.
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.add(new Request(APP_SHELL, { cache: 'reload' })))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('corn-wukong-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE);
          if (response.ok) await cache.put(APP_SHELL, response.clone()).catch(() => undefined);
          else return (await cache.match(APP_SHELL)) ?? response;
          return response;
        })
        .catch(async () => (await (await caches.open(CACHE)).match(APP_SHELL)) ?? Response.error())
    );
    return;
  }

  const cacheReady = caches.open(CACHE);
  const refresh = cacheReady.then(async (cache) => {
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone()).catch(() => undefined);
      return response;
    } catch {
      return (await cache.match(request, { ignoreVary: true })) ?? Response.error();
    }
  });
  // Keep cache writes alive even when a cached response is returned early.
  event.waitUntil(refresh.then(() => undefined));
  // Assets are fixed same-origin files. A module/script request can carry
  // an Origin header that the warm-up fetch did not (Vary: Origin).
  event.respondWith(cacheReady.then(async cache => (await cache.match(request, { ignoreVary: true })) ?? refresh));
});
