
// Stockage persistant des flux YouTube/manuels dans IndexedDB
let _db = null;

function db() {
  if (_db) return _db;
  _db = new Dexie('VigiMapStreams');
  _db.version(1).stores({
    streams: '++id, ytId, name, lat, lng, country, city, tags, addedAt'
  });
  return _db;
}

export async function addStream(entry) {
  const row = {
    ytId:    entry.ytId    || '',
    url:     entry.url     || '',
    name:    entry.name    || 'Flux sans titre',
    lat:     +entry.lat    || 0,
    lng:     +entry.lng    || 0,
    country: entry.country || '',
    city:    entry.city    || '',
    tags:    entry.tags    || [],
    thumb:   entry.thumb   || '',
    addedAt: Date.now(),
  };
  const id = await db().streams.add(row);
  return { ...row, id };
}

export async function updateStream(id, patch) {
  await db().streams.update(id, patch);
}

export async function deleteStream(id) {
  await db().streams.delete(id);
}

export async function getAllStreams() {
  return db().streams.orderBy('addedAt').reverse().toArray();
}

export async function getStreamById(id) {
  return db().streams.get(id);
}

// Convertit une entrée DB en objet "caméra" compatible SourceManager
export function streamToCam(s) {
  const ytId = s.ytId || _extractYtId(s.url || '');
  return {
    id:          'yt_' + (s.id || s.ytId || Date.now()),
    name:        s.name,
    lat:         +s.lat || 0,
    lng:         +s.lng || 0,
    snapshotUrl: s.thumb || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
    streamUrl:   s.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''),
    isLive:      true,
    status:      'live',
    country:     s.country || '',
    city:        s.city    || '',
    tags:        s.tags    || [],
    sourceId:    'youtube',
    sourceName:  'YouTube / Flux',
    _dbId:       s.id,   // pour édition/suppression
  };
}

export function _extractYtId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || '';
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
  } catch (_) {}
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}
