// Service Worker VigiMap — gere le cache des ressources et des tuiles de carte
const V_APP   = 'vigimap-app-v1.0';
const V_TILES = 'vigimap-tiles-v1';
const APP_SHELL = [
  './', 'index.html', 'manifest.json',
  'src/app.js',
  'src/map/MapManager.js', 'src/map/CameraLayer.js',
  'src/sources/SourceManager.js',
  'src/sources/adapters/BaseAdapter.js',
  'src/sources/adapters/OpenTrafficAdapter.js',
  'src/sources/adapters/WindyAdapter.js',
  'src/sources/adapters/InsecamAdapter.js',
  'src/sources/adapters/LtaSingaporeAdapter.js',
  'src/sources/adapters/Road511Adapter.js',
  'src/sources/adapters/OsmOverpassAdapter.js',
  'src/player/PlayerGrid.js', 'src/player/StreamPlayer.js',
  'src/settings/SettingsManager.js', 'src/settings/SettingsPanel.js',
  'src/logs/LogStore.js',
  'src/ui/theme.css', 'src/ui/layout.css', 'src/ui/components.css',
  'assets/icon.svg', 'assets/no-signal.svg',
];

// Installe le worker et met en cache le shell applicatif
self.addEventListener('install', e =>
  e.waitUntil(caches.open(V_APP).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()))
);

// Active le worker et purge les anciens caches obsoletes
self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V_APP && k !== V_TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

// Intercepte chaque requete et applique la strategie de cache appropriee
self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (u.includes('tile.openstreetmap.org')) { e.respondWith(tileFirst(e.request)); return; }
  if (APP_SHELL.some(a => u.endsWith(a)))   { e.respondWith(cacheFirst(e.request, V_APP)); return; }
  e.respondWith(fetch(e.request).catch(() => caches.match('index.html')));
});

// Retourne la ressource depuis le cache ou le reseau en mettant le cache a jour
async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  (await caches.open(name)).put(req, res.clone());
  return res;
}

// Retourne la tuile depuis le cache si elle a moins de 7 jours sinon la recharge
async function tileFirst(req) {
  const cache  = await caches.open(V_TILES);
  const cached = await cache.match(req);
  if (cached) {
    const age = Date.now() - new Date(cached.headers.get('sw-at') || 0);
    if (age < 604800000) return cached;
  }
  const res  = await fetch(req);
  const hdrs = new Headers(res.headers);
  hdrs.set('sw-at', new Date().toISOString());
  const copy = new Response(await res.blob(), { status: res.status, headers: hdrs });
  cache.put(req, copy.clone());
  return copy;
}