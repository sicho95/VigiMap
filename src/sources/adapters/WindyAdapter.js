// Interroge l'API Windy Webcams pour les cameras dans la zone courante
import { BaseAdapter } from './BaseAdapter.js';
const API = 'https://api.windy.com/webcams/api/v3/webcams';

export class WindyAdapter extends BaseAdapter {
  constructor() { super({ id:'windy', name:'Windy Webcams', requiresApiKey:true, refreshIntervalMs:300000 }); }

  // Recupere les webcams Windy autour du centre de la bbox
  async fetchCameras(bbox) {
    const key = this._key(); if (!key) return [];
    const q = bbox ? `?nearby=${bbox.centerLat},${bbox.centerLng},${Math.round(bbox.radiusKm||50)}&limit=100` : '?limit=50';
    const r = await fetch(`${API}${q}&include=location,urls`, { headers:{'x-windy-api-key':key} });
    const d = await r.json();
    return (d.webcams||[]).map(w => this.makeCamera({
      id: w.webcamId, lat: w.location?.latitude, lng: w.location?.longitude,
      name: w.title, country: w.location?.country||'', region: w.location?.region||'',
      snapshotUrl: w.urls?.current?.preview||null, streamUrl: w.urls?.current?.stream||null,
      streamType: w.urls?.current?.stream?'hls':'snapshot', isLive: !!w.urls?.current?.stream,
      tags:['webcam','meteo'],
    })).filter(Boolean);
  }
  _key() {
    try { return JSON.parse(localStorage.getItem('vigimap_settings')||'{}').sources?.windy_key||''; }
    catch { return ''; }
  }
}
