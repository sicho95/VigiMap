import { BaseAdapter } from './BaseAdapter.js';

export class LtaSingaporeAdapter extends BaseAdapter {
  constructor(o) {
    super({ id: 'lta_sg', name: 'LTA Singapore', ...o });
  }

  async fetchCameras(bbox) {
    try {
      const r = await fetch('https://api.data.gov.sg/v1/transport/traffic-images', {
        signal: AbortSignal.timeout?.(10000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j    = await r.json();
      const cams = j.value?.items?.[0]?.cameras || [];
      if (!cams.length) console.debug('[VigiMap] LTA: 0 caméras reçues (hors zone ou API vide)');
      return cams
        .filter(c => {
          const la = +c.location.latitude, ln = +c.location.longitude;
          return !bbox || (la >= bbox.south && la <= bbox.north && ln >= bbox.west && ln <= bbox.east);
        })
        .map(c => this.norm({
          id:          'lta_' + c.camera_id,
          name:        'LTA #' + c.camera_id,
          lat:         +c.location.latitude,
          lng:         +c.location.longitude,
          snapshotUrl: c.image,
          status:      'live',
          isLive:      true,
          country:     'SG',
          city:        'Singapore',
        }));
    } catch (e) {
      console.warn('[VigiMap] LTA Singapore:', e.message);
      return [];
    }
  }
}
