// Recupere les cameras de trafic Road511 couvrant 50 etats US et 13 provinces canadiennes
import { BaseAdapter } from './BaseAdapter.js';
const API = 'https://511.org/api/v2/get/cameras';

export class Road511Adapter extends BaseAdapter {
  constructor() { super({ id:'road511', name:'Road511 US/CA', refreshIntervalMs:300000 }); }

  // Interroge l'API Road511 avec un filtre de bbox optionnel
  async fetchCameras(bbox) {
    try {
      const qs = bbox ? `?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&limit=200` : '?limit=100';
      const d  = await (await fetch(this.proxy(API+qs))).json();
      return (d.features||d||[]).map((f,i) => {
        const p=f.properties||f, g=f.geometry?.coordinates;
        return this.makeCamera({
          id:p.Id||p.id||i, lat:g?.[1]||p.Latitude, lng:g?.[0]||p.Longitude,
          name:p.Name||p.name||`Road511 #${i}`, country:'US',
          snapshotUrl:p.ImageUrl||null, streamUrl:p.VideoUrl||null,
          streamType:p.VideoUrl?'hls':'snapshot', isLive:!!p.VideoUrl, tags:['trafic','usa'],
        });
      }).filter(Boolean);
    } catch { return []; }
  }
}
