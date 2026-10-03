const CACHE_NAME = 'billiards-trainer-4-12-ai-camera-v2';
const HOTFIX = './app-hotfix-20261003.js';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  HOTFIX
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function isTrainerRoot(url){
  const scopePath = new URL(self.registration.scope).pathname;
  return url.origin === self.location.origin && (url.pathname === scopePath || url.pathname === scopePath + 'index.html');
}

async function injectHotfix(response){
  if(!response || !response.ok) return response;
  const text = await response.text();
  if(text.includes('app-hotfix-20261003.js')) return new Response(text,{status:response.status,statusText:response.statusText,headers:response.headers});
  const patched = text.replace('</body>', '<script src="./app-hotfix-20261003.js"></script></body>');
  const headers = new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.delete('content-length');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  if(event.request.mode === 'navigate' && isTrainerRoot(url)){
    event.respondWith((async()=>{
      try {
        const network = await fetch(event.request,{cache:'no-store'});
        const patched = await injectHotfix(network);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html',patched.clone());
        return patched;
      } catch(e){
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
    if(response && response.status===200){
      const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});
