export class BaseAdapter {
  constructor({ id='', name='', proxy='', apiKey='' } = {}) {
    this.id = id; this.name = name; this.proxy = proxy; this.apiKey = apiKey;
  }
  async _fetch(url, opts = {}) {
    const target = this.proxy ? `${this.proxy}${encodeURIComponent(url)}` : url;
    let r;
    try { r = await fetch(target, { signal: AbortSignal.timeout?.(12000), ...opts }); }
    catch (e) { throw new Error(`Réseau: ${e.message}`); }
    if (!r.ok) {
      const m = { 401:'Auth requise', 403:'Accès refusé', 404:'Introuvable', 526:'SSL', 504:'Timeout', 500:'Serveur' };
      throw new Error(m[r.status] || `HTTP ${r.status}`);
    }
    const ct = r.headers.get('Content-Type') || '';
    if (ct.includes('json')) return r.json();
    const txt = await r.text();
    try { return JSON.parse(txt); } catch(_) { return txt; }
  }
  norm(c) {
    return {
      id:          c.id || this.id + '_' + Math.random().toString(36).slice(2),
      name:        c.name || 'Caméra',
      lat:         +c.lat || 0,
      lng:         +c.lng || 0,
      snapshotUrl: c.snapshotUrl || '',
      streamUrl:   c.streamUrl   || '',
      isLive:      !!c.isLive,
      status:      c.status || 'unknown',
      country:     c.country || '',
      city:        c.city    || '',
      tags:        c.tags    || [],
      sourceId:    this.id,
      sourceName:  this.name,
    };
  }
  async fetchCameras() { return []; }
}
