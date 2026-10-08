const C="hk-v13";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./style.css","./app.js","./map.js","./trips.json","./hokkaido.html","./hokkaido-map.jpg","./firebase-config.js","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png"])));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))});
