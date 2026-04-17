import { getSetting }           from '../settings/SettingsManager.js';
import { InsecamAdapter }       from './adapters/InsecamAdapter.js';
import { LtaSingaporeAdapter }  from './adapters/LtaSingaporeAdapter.js';
import { OsmOverpassAdapter }   from './adapters/OsmOverpassAdapter.js';
import { WindyAdapter }         from './adapters/WindyAdapter.js';
import { EarthCamAdapter }      from './adapters/EarthCamAdapter.js';
import { CamViewerAdapter }     from './adapters/CamViewerAdapter.js';

// OpenTraffic (Mapillary) = token requis → désactivé
// Road511 = clé API requise → désactivé
export const SOURCE_REGISTRY = [
  { id: 'lta',       name: 'LTA Singapore', cls: LtaSingaporeAdapter, requiresProxy: false, enabledByDefault: true },
  { id: 'overpass',  name: 'OSM Overpass',  cls: OsmOverpassAdapter,  requiresProxy: false, enabledByDefault: true },
  { id: 'insecam',   name: 'Insecam',        cls: InsecamAdapter,      requiresProxy: true,  enabledByDefault: true },
  { id: 'windy',     name: 'Windy Webcams',  cls: WindyAdapter,        requiresProxy: true,  enabledByDefault: true },
  { id: 'earthcam',  name: 'EarthCam',       cls: EarthCamAdapter,     requiresProxy: true,  enabledByDefault: true },
  { id: 'camviewer', name: 'CamViewer',      cls: CamViewerAdapter,    requiresProxy: true,  enabledByDefault: true },
];

export async function fetchAllCameras(bbox) {
  const proxy    = getSetting('proxyUrl') || '';
  const settings = getSetting('sources')  || {};

  const runnable = SOURCE_REGISTRY.filter(s => {
    if (settings[s.id] === false) return false;
    if (s.requiresProxy && !proxy) {
      console.info(`[VigiMap] Source "${s.name}" ignorée — proxy CORS requis (paramètres ⚙)`);
      return false;
    }
    return true;
  });

  const results = await Promise.allSettled(
    runnable.map(s => {
      const adapter = new s.cls({ proxy: s.requiresProxy ? proxy : '' });
      return adapter.fetchCameras(bbox);
    })
  );

  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const name = runnable[i]?.name;
    const msg  = r.reason?.message || String(r.reason);
    if (!/[45]\d\d/.test(msg))
      console.warn(`[VigiMap] Erreur source "${name}":`, msg);
    return [];
  });
}
