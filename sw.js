const CACHE='starledger-web-v066-cloud-sync-response-diagnostics';
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './recognizer.js?v=ocr1',
  './app.js?v=clouddiag2',
  './ui-runtime.js?v=midterm3',
  './backup-zip.js?v=zip1',
  './books-stats.js?v=midterm2',
  './ui-foundation.css?v=modern10',
  './mobile-compat.css?v=css3'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
