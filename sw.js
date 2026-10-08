// TripTych Service Worker：同源檔案「網路優先 + 強制重新驗證」，離線時用快取；只攔截自家、gstatic（Firebase SDK）與地圖圖磚
const C="hk-v14";
const PRE=["./","./index.html","./style.css","./app.js","./map.js","./trips.json","./firebase-config.js","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png","./vendor/leaflet/leaflet.js","./vendor/leaflet/leaflet.css"];
const CDN=["https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(async c=>{await Promise.all(PRE.map(u=>c.add(u).catch(()=>{})));await Promise.all(CDN.map(u=>c.add(new Request(u,{mode:"cors"})).catch(()=>{})))}));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>clients.claim())));
const HOSTS=["www.gstatic.com","tile.openstreetmap.org"];
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 if(u.origin===location.origin){e.respondWith(fetch(r.mode==="navigate"?r.url:r,{cache:"no-cache"}).then(res=>{if(res.ok){const x=res.clone();caches.open(C).then(c=>c.put(r,x))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match("./index.html"))));return}
 if(HOSTS.some(h=>u.hostname===h||u.hostname.endsWith("."+h)))e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const x=res.clone();caches.open(C).then(c=>c.put(r,x));return res})))});
