// Recupere les images trafic en temps quasi-reel depuis l'API ouverte LTA Singapore
import { BaseAdapter } from './BaseAdapter.js';
const API = 'https://api.data.gov.sg/v1/transport/traffic-images';

export class LtaSingaporeAdapter extends BaseAdapter {
  constructor() { super({ id:'lta_sg', name:'LTA Singapore', refreshIntervalMs:60000 }); }

  // Charge les ~900 cameras de trafic de Singapour
  async fetchCameras() {
    const d = await (await fetch(API)).json();
    return (d.items?.[0]?.cameras||[]).map(c => this.makeCamera({
      id: c.camera_id, lat: c.location.latitude, lng: c.location.longitude,
      name:`Singapore Trafic #${c.camera_id}`, country:'SG',
      snapshotUrl: c.image, streamType:'snapshot', isLive:false, lastSeen:c.timestamp,
      tags:['trafic','singapour'],
    })).filter(Boolean);
  }
}
