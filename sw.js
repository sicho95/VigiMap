const C='vigimap-v2';
const PRE=['/','/index.html','/manifest.json','/vendor/leaflet.css','/vendor/leaflet.js','/vendor/MarkerCluster.css','/vendor/MarkerCluster.Default.css','/vendor/leaflet.markercluster.js','/vendor/hls.min.js','/vendor/dexie.min.js','/src/ui/theme.css','/src/ui/layout.css','/src/ui/components.css','/src/app.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
