// Interroge OpenStreetMap Overpass pour les noeuds tagges surveillance dans la zone visible
import { BaseAdapter } from './BaseAdapter.js';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

export class OsmOverpassAdapter extends BaseAdapter {
  constructor() { super({ id:'osm_overpass', name:'OSM Surveillance', refreshIntervalMs:1800000 }); }

  // Recupere les cameras OSM dans la bbox courante (limite 500 resultats)
  async fetchCameras(bbox) {
    if (!bbox) return [];
    const q = `[out:json][timeout:15];node["man_made"="surveillance"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});out body 500;`;
    try {
      const d = await (await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q)})).json();
      return (d.elements||[]).map(el => this.makeCamera({
        id:el.id, lat:el.lat, lng:el.lon,
        name:el.tags?.name||el.tags?.description||`OSM #${el.id}`,
        streamType:'unknown', isLive:false, tags:['surveillance','osm'],
      })).filter(Boolean);
    } catch { return []; }
  }
}
