const CACHE='starledger-web-v092-app-icons';
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './history-predictor.js?v=hist1',
  './recognizer.js?v=ocr3',
  './app.js?v=app-icons3',
  './ui-runtime.js?v=account-filter2',
  './backup-zip.js?v=zip1',
  './books-stats.js?v=midterm2',
  './ui-foundation.css?v=app-icons3',
  './mobile-compat.css?v=css5',
  './assets/account-icons/abc.png',
  './assets/account-icons/alipay.svg',
  './assets/account-icons/apple.svg',
  './assets/account-icons/applepay.svg',
  './assets/account-icons/bjb.png',
  './assets/account-icons/boc.png',
  './assets/account-icons/bocom.png',
  './assets/account-icons/ccb.png',
  './assets/account-icons/ceb.png',
  './assets/account-icons/cgb.png',
  './assets/account-icons/douyin.svg',
  './assets/account-icons/cib.png',
  './assets/account-icons/citic.png',
  './assets/account-icons/cmb.png',
  './assets/account-icons/cmbc.png',
  './assets/account-icons/digitalcny.svg',
  './assets/account-icons/hxb.png',
  './assets/account-icons/icbc.png',
  './assets/account-icons/jsb.png',
  './assets/account-icons/meituan.svg',
  './assets/account-icons/nbb.png',
  './assets/account-icons/njb.png',
  './assets/account-icons/pab.png',
  './assets/account-icons/paypal.svg',
  './assets/account-icons/pinduoduo.svg',
  './assets/account-icons/psbc.png',
  './assets/account-icons/shb.png',
  './assets/account-icons/spdb.png',
  './assets/account-icons/unionpay.svg',
  './assets/account-icons/webank.png',
  './assets/account-icons/wechat.svg'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  // Never cache cross-origin Worker status or backup ZIP responses.
  if(new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
