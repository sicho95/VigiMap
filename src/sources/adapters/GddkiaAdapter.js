const GDDKIA_URL = 'https://api.gddkia.gov.pl/cameras/list?format=json';

export class GddkiaAdapter {
  constructor(proxyUrl = '') { this._proxy = proxyUrl; }

  async fetch(bbox) {
    if (!this._proxy) {
      console.debug('[VigiMap] Pologne GDDKIA: proxy requis (CORS) — source désactivée');
      return [];
    }
    try {
      const url = `${this._proxy}/?url=${encodeURIComponent(GDDKIA_URL)}`;
      const res  = await fetch(url);
      const data = await res.json();
      return this._parse(data, bbox);
    } catch (e) {
      console.debug('[VigiMap] GDDKIA:', e.message);
      return [];
    }
  }

  _parse(data, bbox) { /* ... parsing existant ... */ return []; }
}
