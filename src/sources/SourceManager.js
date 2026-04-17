import { getSetting } from '../settings/SettingsManager.js';
import { InsecamAdapter }      from './adapters/InsecamAdapter.js';
import { LtaSingaporeAdapter } from './adapters/LtaSingaporeAdapter.js';
import { OpenTrafficAdapter }  from './adapters/OpenTrafficAdapter.js';
import { OsmOverpassAdapter }  from './adapters/OsmOverpassAdapter.js';
import { Road511Adapter }      from './adapters/Road511Adapter.js';
import { WindyAdapter }        from './adapters/WindyAdapter.js';
import { EarthCamAdapter }     from './adapters/EarthCamAdapter.js';
import { CamViewerAdapter }    from './adapters/CamViewerAdapter.js';

export const SOURCE_REGISTRY = [
  { id: 'lta',         name: 'LTA Singapore', cls: LtaSingaporeAdapter, requiresProxy: false },
  { id: 'overpass',    name: 'OSM Overpass',  cls: OsmOverpassAdapter,  requiresProxy: false },
  { id: 'opentraffic', name: 'OpenTraffic',   cls: OpenTrafficAdapter,  requiresProxy: false },
  { id: 'insecam',     name: 'Insecam',        cls: InsecamAdapter,      requiresProxy: true  },
  { id: 'road511',     name: 'Road 511',       cls: Road511Adapter,      requiresProxy: true  },
  { id: 'windy',       name: 'Windy Webcams',  cls: WindyAdapter,        requiresProxy: true  },
  { id: 'earthcam',    name: 'EarthCam',       cls: EarthCamAdapter,     requiresProxy: true  },
  { id: 'camviewer',   name: 'CamViewer',      cls: CamViewerAdapter,    requiresProxy: true  },
];

export async function fetchAllCameras(bbox) {
  const proxy    = getSetting('proxyUrl') || '';
  const settings = getSetting('sources') || {};

  const enabled = SOURCE_REGISTRY.filter(s => settings[s.id] !== false);

  // Sources nécessitant un proxy sont silencieusement ignorées si aucun proxy configuré
  const runnable = enabled.filter(s => {
    if (s.requiresProxy && !proxy) {
      console.info(`[VigiMap] Source "${s.name}" ignorée — proxy CORS requis (configurez-en un dans les paramètres)`);
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
    console.warn(`[VigiMap] Erreur source "${runnable[i]?.name}":`, r.reason?.message || r.reason);
    return [];
  });
}
