import { BaseAdapter } from './BaseAdapter.js';

const NSW_URL = 'https://opendata.transport.nsw.gov.au/data/dataset/b0212311-b0da-4363-8dc3-825fe10941b2/resource/cc776d1a-d96c-4ae4-a465-c380a53717c9/download/livetrafficcamera.json';

export class NswTrafficAdapter extends BaseAdapter {
  constructor(o) {
    super({ id: 'nsw_traffic', name: 'Live Traffic NSW', ...o });
  }

  async fetchCameras(bbox) {
    if (!this.proxy) {
      console.debug('[VigiMap] NSW: proxy requis (CORS) — source ignorée');
      return [];
    }
    try {
      const data = await this._fetch(NSW_URL);
      if (!Array.isArray(data)) return [];
      return data
        .filter(c => {
          const la = +c.Lat || +c.lat || 0;
          const ln = +c.Lng || +c.lng || +c.Long || +c.long || 0;
          return !bbox || (la >= bbox.south && la <= bbox.north && ln >= bbox.west && ln <= bbox.east);
        })
        .slice(0, 500)
        .map(c => this.norm({
          id:          'nsw_' + (c.Id || c.id || Math.random().toString(36).slice(2)),
          name:        c.Title || c.title || c.Direction || 'NSW Traffic',
          lat:         +c.Lat  || +c.lat  || 0,
          lng:         +c.Lng  || +c.lng  || +c.Long || +c.long || 0,
          snapshotUrl: c.ImageUrl || c.imageUrl || c.Href || '',
          streamUrl:   '',
          status:      'live',
          isLive:      true,
          country:     'AU',
          city:        c.Suburb || c.suburb || '',
        }));
    } catch (e) {
      console.debug('[VigiMap] NSW:', e.message);
      return [];
    }
  }
}
