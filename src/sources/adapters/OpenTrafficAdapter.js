// Charge le jeu de donnees JSON statique crowdsource OpenTrafficCamMap
import { BaseAdapter } from './BaseAdapter.js';
const URL_ = 'https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/main/data/cameras.json';

export class OpenTrafficAdapter extends BaseAdapter {
  constructor() { super({ id:'opentraffic', name:'OpenTrafficCamMap', refreshIntervalMs:3600000 }); this._cache=null; }

  // Charge les cameras une seule fois en cache puis filtre par bbox
  async fetchCameras(bbox) {
    if (!this._cache) {
      const r = await fetch(this.proxy(URL_));
      const d = await r.json();
      this._cache = (Array.isArray(d)?d:d.cameras||[])
        .map((c,i) => this.makeCamera({
          id: c.id||i, lat: c.lat||c.latitude, lng: c.lng||c.lon||c.longitude,
          name: c.name||c.title||`Traffic #${i}`, country: c.country||'',
          streamUrl: c.url||c.stream_url||null, snapshotUrl: c.snapshot||c.image_url||null,
          streamType: c.type||'snapshot', isLive: !!c.live, tags:['trafic'],
        })).filter(Boolean);
    }
    if (!bbox) return this._cache;
    return this._cache.filter(c =>
      c.lat>=bbox.south&&c.lat<=bbox.north&&c.lng>=bbox.west&&c.lng<=bbox.east);
  }
}
