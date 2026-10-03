const CACHE_NAME = 'billiards-trainer-4-12-ai-camera-v5';
const CACHE_PREFIX = 'billiards-trainer-4-12-';
const APP_SHELL = [
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key.startsWith(CACHE_PREFIX))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
      // Keep a reliable offline fallback for app navigations.
      if (request.mode === 'navigate') {
        cache.put('./index.html', response.clone()).catch(() => {});
      }
    }
    return response;
  } catch (err) {
    return (await caches.match(request)) ||
           (request.mode === 'navigate' ? await caches.match('./index.html') : null) ||
           Response.error();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never let a previously cached HTML page hide a newly uploaded GitHub index.html.
  if (event.request.mode === 'navigate' || /\/index\.html$/i.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Assets/models can load from cache immediately and refresh in the background.
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      const refresh = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => null);
      return cached || (await refresh) || Response.error();
    })
  );
});
