import { BaseAdapter } from './BaseAdapter.js';

export class FintrafficAdapter extends BaseAdapter {
  constructor(o) {
    super({ id: 'fintraffic', name: 'Fintraffic (FI)', ...o });
  }

  async fetchCameras() {
    try {
      const j = await this._fetch(
        'https://tie.digitraffic.fi/api/weathercam/v1/stations?publishable=true'
      );
      return (j.features || []).slice(0, 200).flatMap(f => {
        const snapshotUrl = f.properties?.presets?.[0]?.imageUrl || '';
        if (!snapshotUrl) return [];          // pas d'image → on ignore
        const coords = f.geometry?.coordinates;
        const lat = coords ? +coords[1] : 0;
        const lng = coords ? +coords[0] : 0;
        if (!lat && !lng) return [];
        return [this.norm({
          id:          'fi_' + f.id,
          name:        f.properties?.name || 'Fintraffic',
          lat, lng,
          snapshotUrl,
          streamUrl:   '',          // snapshot uniquement, pas de flux vidéo
          status:      'delayed',   // image fixe ≠ live stream
          isLive:      false,
          country:     'FI',
        })];
      });
    } catch (e) {
      return [];
    }
  }
}
