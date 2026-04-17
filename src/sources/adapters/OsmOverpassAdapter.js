import { BaseAdapter } from './BaseAdapter.js';

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export class OsmOverpassAdapter extends BaseAdapter {
  constructor(o) { super({ id: 'overpass', name: 'OSM Overpass', ...o }); }

  async fetchCameras(b) {
    if (!b) return [];

    // Guard : bbox invalide (longitudes wrappées ou trop grande zone)
    if (b.west >= b.east || b.south >= b.north) return [];
    if (Math.abs(b.east - b.west) > 90 || Math.abs(b.north - b.south) > 60) {
      console.info('[VigiMap] OSM Overpass ignoré — zone trop large (zoomez davantage)');
      return [];
    }

    const q = `[out:json][timeout:20];(node["man_made"="surveillance"](${b.south},${b.west},${b.north},${b.east}););out body 100;`;

    for (const url of OVERPASS_URLS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const resp  = await globalThis.fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(q),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) continue;
        const j = await resp.json();
        return (j.elements || [])
          .filter(e => e.lat && e.lon)
          .map(e => this.normalize({
            id: 'osm_' + e.id,
            name: e.tags?.name || 'Caméra OSM',
            lat: +e.lat, lng: +e.lon,
            snapshotUrl: '', status: 'unknown', isLive: false,
            country: e.tags?.['addr:country'] || '',
          }));
      } catch (err) {
        if (err.name === 'AbortError')
          console.warn('[VigiMap] Overpass timeout sur', url);
        else
          console.warn('[VigiMap] Overpass erreur sur', url, err.message);
      }
    }
    return [];
  }
}
