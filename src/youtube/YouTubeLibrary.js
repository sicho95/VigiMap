
let _db = null;

function db() {
  if (_db) return _db;
  _db = new Dexie('VigiMapStreams');
  _db.version(2).stores({
    streams: '++id, ytId, url, m3u8Url, name, lat, lng, country, city, tags, addedAt, enabled'
  });
  return _db;
}

export async function addStream(entry) {
  const row = {
    ytId:    entry.ytId    || '',
    url:     entry.url     || '',
    m3u8Url: entry.m3u8Url || '',   // URL m3u8 extraite pour CV
    name:    entry.name    || 'Flux sans titre',
    lat:     +entry.lat    || 0,
    lng:     +entry.lng    || 0,
    country: entry.country || '',
    city:    entry.city    || '',
    tags:    entry.tags    || [],
    thumb:   entry.thumb   || '',
    enabled: entry.enabled !== false,
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

// Convertit en objet caméra compatible VigiMap
// Si m3u8Url dispo → streamUrl = m3u8 (CV peut lire les pixels)
// Sinon → streamUrl = url YouTube (embed iframe, CV aveugle)
export function streamToCam(s) {
  const ytId = s.ytId || _extractYtId(s.url || '');
  const hasM3u8 = !!s.m3u8Url;
  return {
    id:          'yt_' + (s.id || s.ytId || Date.now()),
    name:        s.name,
    lat:         +s.lat || 0,
    lng:         +s.lng || 0,
    snapshotUrl: s.thumb || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
    // m3u8 en priorité pour permettre accès pixels (CV)
    streamUrl:   s.m3u8Url || s.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''),
    originalUrl: s.url || '',
    isLive:      true,
    status:      'live',
    cvEnabled:   hasM3u8,   // CV possible seulement si m3u8 dispo
    country:     s.country || '',
    city:        s.city    || '',
    tags:        s.tags    || [],
    sourceId:    'youtube',
    sourceName:  hasM3u8 ? 'YouTube (HLS)' : 'YouTube (embed)',
    _dbId:       s.id,
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
