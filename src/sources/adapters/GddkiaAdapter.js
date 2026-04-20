import { BaseAdapter } from './BaseAdapter.js';

export class GddkiaAdapter extends BaseAdapter {
  constructor(o) {
    super({ id: 'gddkia_pl', name: 'GDDKiA Pologne', ...o });
  }

  async fetchCameras(bbox) {
    // GDDKiA n'a pas de headers CORS — proxy obligatoire
    if (!this._proxy) {
      console.debug('[VigiMap] GDDKiA: proxy requis (CORS) — source ignorée');
      return [];
    }
    try {
      const url  = 'https://api.gddkia.gov.pl/cameras/list?format=json';
      const data = await this._fetch(url);
      if (!data?.cameras) return [];
      return data.cameras
        .filter(c => {
          const la = +c.latitude || 0, ln = +c.longitude || 0;
          return !bbox || (la >= bbox.south && la <= bbox.north && ln >= bbox.west && ln <= bbox.east);
        })
        .slice(0, 300)
        .map(c => this.norm({
          id:          'gddkia_' + (c.id || Math.random().toString(36).slice(2)),
          name:        c.name || c.localisation || 'GDDKiA',
          lat:         +c.latitude  || 0,
          lng:         +c.longitude || 0,
          snapshotUrl: c.imageUrl   || c.image_url || '',
          status:      'live',
          isLive:      true,
          country:     'PL',
        }));
    } catch (e) {
      console.debug('[VigiMap] GDDKiA:', e.message);
      return [];
    }
  }
}
