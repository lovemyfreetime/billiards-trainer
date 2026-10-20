const CACHE_NAME = 'billiards-trainer-4-12-offline-610a4f21319785af';
const CACHE_PREFIX = 'billiards-trainer-4-12-';
const APP_SHELL = [
  './play-narration-data.js?v=3',
  './play-announcements-data.js?v=1',
  './play-announcements.js?v=1',
  './play-recorded-audio.js?v=1',

  './play-narration.js?v=1',
  './play-input.js?v=1',
  './play-training.js?v=1',
  './play-controls.js?v=chase-gameplay-v1',
  './play-calibration.js',
  './play-calibration.html',
  './app-display.js?v=1',
  './app-display.css?v=1',
  './local-session.js?v=chase-gameplay-v1',
  './local-session.css?v=local-table-v1',
  './welcome.html',
  './play.html',
  './tournament.html',
  './tournament-engine.js?v=1',
  './tournament-ui.js?v=1',
  './tournament.css?v=return-cyan-v2',
  './icons/play-experience-v1.webp',
  './icons/trainer-original-execute-v2.svg',
  './experience-menu.js?v=home-badge-v13',
  './experience-menu.css?v=home-badge-v8',
  './play-viewport.js?v=android-play-v1',
  './play-catalog.js?v=copy-v2',
  './play-engine.js?v=copy-v3',
  './play-presentation.js?v=play-room-v1',
  './play-mode.js?v=chase-gameplay-v1',
  './play-mode.css?v=narration-popups-v2',

  './trainer-action-history.js?v=2',
  './trainer-table-exchange.js?v=1',
  './icons/zen-reference-table-v1.webp',
  './zen-mode.js?v=home-badge-v59',
  './beta-ui.js?v=offline-startup-v158',
  './index.html',
  './trainer-practice-tools.js?v=3',
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
  './phone-play.css?v=11',
  './phone-play.js?v=12',
  './photo-calibration.js?v=walkthrough-v11',
  './photo-table-spots.js?v=3',
  './photo-cloth-filter.js?v=2',
  './photo-calibration.css?v=focused-start-v17',
  './photo-ball-crops.js?v=1',
  './trainer-layout-files.js?v=2',
  './trainer-saved-files.js?v=1'
];

// Cache complete, hash-verified releases. Unchanged files are copied from the
// previous cache rather than downloading every narration clip after each update.
async function timedFetch(request, timeout=3000) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try {return await fetch(request,{cache:'no-store',signal:controller.signal});}
  finally {clearTimeout(timer);}
}
async function sha256(response){const bytes=await response.clone().arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
async function verifiedResponse(response,hash){
  const headers=new Headers(response.headers);for(const name of ['content-encoding','content-length','transfer-encoding'])headers.delete(name);
  headers.set('X-Billiards-SHA256',hash);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const response=await timedFetch('./offline-assets.json',12000);if(!response.ok)throw Error('Offline content manifest unavailable');
    const manifest=await response.json(),cache=await caches.open(CACHE_NAME),previous=[];
    for(const name of await caches.keys())if(name!==CACHE_NAME&&name.startsWith(CACHE_PREFIX))previous.push(await caches.open(name));
    const entries=Object.entries(manifest.files);let next=0;
    await Promise.all(Array.from({length:4},async()=>{while(next<entries.length){
      const [path,hash]=entries[next++],url='./'+path;let content;
      const existing=await cache.match(url);if(existing?.headers.get('X-Billiards-SHA256')===hash)continue;
      for(const old of previous){const candidate=await old.match(url,{ignoreSearch:true});if(candidate&&candidate.ok&&(candidate.headers.get('X-Billiards-SHA256')===hash||await sha256(candidate)===hash)){content=candidate;break;}}
      if(!content){content=await timedFetch(url,12000);if(!content.ok||await sha256(content)!==hash)throw Error('Offline content incomplete: '+path);}
      await cache.put(url,await verifiedResponse(content,hash));
    }}));
    // This marker is written only after every required file has been verified.
    await cache.put('./offline-assets.json',new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  // Keep one prior release for already-open pages using older versioned assets.
  const keys=(await caches.keys()).filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME);
  for(const key of keys.slice(0,-1))await caches.delete(key);
  await self.clients.claim();
})());});
function navigationShell(url){
  const path=new URL(url).pathname;
  // Directory links must retain their own cached index, including installer pages.
  if(path.includes('/install/')&&path.endsWith('/'))return './'+path.slice(path.indexOf('/install/')+1)+'index.html';
  if(path.endsWith('/welcome.html'))return './welcome.html';
  if(path.endsWith('/tournament.html'))return './tournament.html';
  if(path.endsWith('/play-calibration.html'))return './play-calibration.html';
  if(path.endsWith('/play.html'))return './play.html';
  return './index.html';
}
async function cachedResponse(request){
  const cache=await caches.open(CACHE_NAME);
  return (await cache.match(request))||(await cache.match(request,{ignoreSearch:true}))||
    (request.mode==='navigate'?await cache.match(navigationShell(request.url)):null);
}
async function respond(request){
  // A dead connection can still report online. Cached app content must never
  // wait for DNS, TLS or an internet timeout, including during page navigation.
  const cached=await cachedResponse(request);if(cached)return cached;
  // An older complete release is a useful fallback during a partial install.
  const prior=await caches.match(request)||(request.mode==='navigate'?await caches.match(navigationShell(request.url)):null);if(prior)return prior;
  try {return await timedFetch(request);}catch{return Response.error();}
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(respond(event.request));
});
