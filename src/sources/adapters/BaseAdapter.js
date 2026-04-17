export class BaseAdapter {
  constructor({ id, name, proxy = '' } = {}) {
    this.id    = id;
    this.name  = name;
    this.proxy = proxy;
  }

  async fetch(url, opts = {}) {
    const target = this.proxy ? this.proxy + encodeURIComponent(url) : url;
    let resp;
    try {
      resp = await globalThis.fetch(target, opts);
    } catch (e) {
      throw new Error(`Réseau: ${e.message}`);
    }
    if (!resp.ok) {
      // Erreurs "attendues" → message court
      const label = { 401: 'Auth requise', 403: 'Accès refusé', 404: 'Introuvable',
        526: 'Cert SSL invalide (proxy)', 504: 'Timeout serveur', 500: 'Erreur serveur' };
      throw new Error(label[resp.status] || `HTTP ${resp.status}`);
    }
    const ct = resp.headers.get('Content-Type') || '';
    return ct.includes('json') ? resp.json() : resp.text();
  }

  normalize(c) {
    return {
      id:          c.id          || this.id + '_' + Math.random().toString(36).slice(2),
      name:        c.name        || 'Caméra',
      lat:         +c.lat        || 0,
      lng:         +c.lng        || 0,
      snapshotUrl: c.snapshotUrl || '',
      streamUrl:   c.streamUrl   || '',
      isLive:      c.isLive      || false,
      status:      c.status      || 'unknown',
      country:     c.country     || '',
      city:        c.city        || '',
      sourceId:    this.id,
      sourceName:  this.name,
    };
  }

  async fetchCameras() { return []; }
}
