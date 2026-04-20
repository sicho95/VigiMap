const NSW_URL = 'https://opendata.transport.nsw.gov.au/data/dataset/b0212311-b0da-4363-8dc3-825fe10941b2/resource/cc776d1a-d96c-4ae4-a465-c380a53717c9/download/livetrafficcamera.json';

export class NswTrafficAdapter {
  constructor(proxyUrl = '') { this._proxy = proxyUrl; }

  async fetch(bbox) {
    // NSW n'a pas de CORS — nécessite un proxy
    if (!this._proxy) {
      console.debug('[VigiMap] NSW: proxy requis (CORS) — source désactivée');
      return [];
    }
    try {
      const url = `${this._proxy}/?url=${encodeURIComponent(NSW_URL)}`;
      const res  = await fetch(url);
      const data = await res.json();
      return this._parse(data, bbox);
    } catch (e) {
      console.debug('[VigiMap] NSW:', e.message);
      return [];
    }
  }

  _parse(data, bbox) { /* ... ton parsing existant ... */ return []; }
}
