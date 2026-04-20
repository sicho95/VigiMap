import { BaseAdapter } from './BaseAdapter.js';

export class Road511Adapter extends BaseAdapter {
  constructor(o) {
    super({ id: 'road511', name: 'Road511 US+CA', ...o });
  }

  async fetchCameras(bbox) {
    if (!this.proxy) {
      console.debug('[VigiMap] Road511: proxy requis — source ignorée');
      return [];
    }
    try {
      const j   = await this._fetch('https://api.511.org/traffic/cameras?format=json&api_key=31e45d4c-6694-4ed5-a0d3-c2c3f85e35d0');
      const arr = Array.isArray(j) ? j : (j.events || j.cameras || []);
      if (!arr.length) return [];
      return arr
        .filter(c => {
          const la = +c.Latitude || +c.latitude || 0;
          const ln = +c.Longitude || +c.longitude || 0;
          return !bbox || (la >= bbox.south && la <= bbox.north && ln >= bbox.west && ln <= bbox.east);
        })
        .slice(0, 300)
        .map(c => this.norm({
          id:          'r511_' + (c.ID || c.id || Math.random().toString(36).slice(2)),
          name:        c.Name || c.name || 'Road511',
          lat:         +c.Latitude  || +c.latitude  || 0,
          lng:         +c.Longitude || +c.longitude || 0,
          snapshotUrl: c.ImageUrl   || c.imageUrl   || '',
          status:      'live',
          isLive:      true,
          country:     'US',
        }));
    } catch (e) {
      console.debug('[VigiMap] Road511:', e.message);
      return [];
    }
  }
}
