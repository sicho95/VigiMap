// Classe de base dont heritent tous les adaptateurs de source de cameras
export class BaseAdapter {
  constructor({ id, name, requiresApiKey=false, refreshIntervalMs=300000 }) {
    this.id = id; this.name = name;
    this.requiresApiKey = requiresApiKey;
    this.refreshIntervalMs = refreshIntervalMs;
  }
  // Retourne les cameras disponibles pour la bbox donnee — a surcharger
  async fetchCameras(bbox) { return []; }
  // Retourne les informations de flux d'une camera — a surcharger si besoin
  async getStreamUrl(cam) { return { url: cam.streamUrl, type: cam.streamType }; }

  // Construit un objet camera normalise a partir de donnees brutes
  makeCamera({ id, lat, lng, name, country='', region='', streamUrl=null,
               snapshotUrl=null, streamType='unknown', isLive=false, lastSeen=null, tags=[] }) {
    const lat_ = parseFloat(lat), lng_ = parseFloat(lng);
    if (isNaN(lat_) || isNaN(lng_)) return null;
    const status = isLive ? 'live' : (snapshotUrl||streamUrl ? 'delayed' : 'offline');
    return { id:`${this.id}_${id}`, sourceId:this.id, lat:lat_, lng:lng_,
             name:name||'Camera', country, region, streamUrl, snapshotUrl,
             streamType, isLive, lastSeen:lastSeen?new Date(lastSeen):null, tags, status };
  }

  // Encapsule une URL dans le proxy CORS si configure
  proxy(url) {
    const p = this._proxyBase();
    return p && url ? p + encodeURIComponent(url) : url;
  }
  _proxyBase() {
    try { return JSON.parse(localStorage.getItem('vigimap_settings')||'{}').proxyUrl||''; }
    catch { return ''; }
  }
}
