const CACHE_NAME = 'billiards-trainer-4-12-practice-tools-v77';
const CACHE_PREFIX = 'billiards-trainer-4-12-';
const APP_SHELL = [
  './index.html',
  './trainer-practice-tools.js?v=1',
  './guide/audio-startup.js?v=native-warmup-v22',
  './guide/practice-layouts.js?v=walkthrough-v11',
  './guide/practice-layouts.json?v=walkthrough-v11',
  './guide/guide.js?v=completion-tour-v25',
  './guide/guide.css?v=guide-attention-v14',
  './guide/pool-guide.css?v=fit5',
  './guide/recorded-audio.js?v=presets-recovery-v13',
  './guide/recorded-audio.json?v=presets-recovery-v13',
  './guide/get-started-tour.js?v=completion-tour-v25',
  './guide/get-started-tour.css?v=completion-tour-v25',
  './guide/get-started-tour.json?v=completion-tour-v25',
  './guide/pool-integration.js?v=completion-tour-v25',
  './guide/pool-audio-map.json?v=completion-tour-v25',
  './guide/analyze-integration.js?v=completion-tour-v25',
  './guide/analyze-welcome.js?v=analyze-welcome-v16',
  './guide/analyze-walkthrough.js?v=presets-recovery-v13',
  './manifest.webmanifest',
  './phone-play.css?v=8',
  './phone-play.js?v=8',
  './photo-calibration.js?v=walkthrough-v11',
  './photo-table-spots.js?v=3',
  './photo-cloth-filter.js?v=2',
  './photo-calibration.css?v=focused-start-v17',
  './photo-ball-crops.js?v=1',
  './trainer-layout-files.js?v=2',
  './trainer-saved-files.js?v=1'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
      .then(async () => {
        const cache=await caches.open(CACHE_NAME);
        const response=await fetch('./guide/audio-assets.json');
        if(!response.ok)throw Error('Audio asset list unavailable');
        const assets=await response.json();const layouts=await fetch('./guide/practice-layouts.json?v=walkthrough-v11').then(r=>r.json());assets.push(...Object.values(layouts.layouts).map(x=>x.url));const tour=await fetch('./guide/get-started-tour.json?v=completion-tour-v25').then(r=>r.json());for(const step of tour.steps){assets.push(step.layout);if(step.recordingStatus==='recorded')assets.push(step.audio);}if(tour.transition?.recordingStatus==='recorded')assets.push(tour.transition.audio);const uniqueAssets=[...new Set(assets)];let next=0;
        await Promise.all(Array.from({length:6},async()=>{while(next<uniqueAssets.length){const asset=uniqueAssets[next++];await cache.add(asset);}}));
      })
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

  const isInstallerAsset = /\/install\//i.test(url.pathname) &&
    (/\.(?:html|css|js|webmanifest)$/i.test(url.pathname) || event.request.mode === 'navigate');

  // Always prefer the network for HTML and installer UI assets so a normal
  // mobile reload picks up the newest installer without a hard-refresh keyboard shortcut.
  if (event.request.mode === 'navigate' || /\/index\.html$/i.test(url.pathname) || isInstallerAsset || /\/(?:phone-play\.(?:css|js)|photo-[^/]+\.(?:css|js)|guide\/guide\.(?:css|js))$/i.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Other assets/models can load from cache immediately and refresh in the background.
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
