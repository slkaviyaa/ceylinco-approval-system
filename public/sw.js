const CACHE_NAME = 'ceylinco-pwa-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Never intercept non-GET requests or API requests or cross-origin requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      try {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const dashboardCache = await caches.match('/dashboard');
        if (dashboardCache) return dashboardCache;
      } catch (e) {
        // ignore cache error
      }
      return new Response('Network error occurred', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});