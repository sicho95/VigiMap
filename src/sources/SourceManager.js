// Aggrege toutes les sources et expose les fonctions de chargement de cameras
import { OpenTrafficAdapter }  from './adapters/OpenTrafficAdapter.js';
import { WindyAdapter }        from './adapters/WindyAdapter.js';
import { InsecamAdapter }      from './adapters/InsecamAdapter.js';
import { LtaSingaporeAdapter } from './adapters/LtaSingaporeAdapter.js';
import { Road511Adapter }      from './adapters/Road511Adapter.js';
import { OsmOverpassAdapter }  from './adapters/OsmOverpassAdapter.js';
import { loadSettings }        from '../settings/SettingsManager.js';

// Registre ordonne de toutes les sources disponibles
export const SOURCE_REGISTRY = [
  new OpenTrafficAdapter(),
  new WindyAdapter(),
  new InsecamAdapter(),
  new LtaSingaporeAdapter(),
  new Road511Adapter(),
  new OsmOverpassAdapter(),
];

// Charge en parallele les cameras de toutes les sources actives
export async function fetchAllCameras(bbox) {
  const { sources } = loadSettings();
  const active = SOURCE_REGISTRY.filter(s => sources[s.id] !== false);
  const results = await Promise.allSettled(
    active.map(s => s.fetchCameras(bbox).catch(err => { console.warn(`[VigiMap] ${s.id}:`, err); return []; }))
  );
  return results.flatMap(r => r.status==='fulfilled' ? r.value : []);
}

// Retourne l'URL de flux via l'adaptateur correspondant a la source de la camera
export async function resolveStreamUrl(camera) {
  const a = SOURCE_REGISTRY.find(s => s.id===camera.sourceId);
  return a ? a.getStreamUrl(camera) : null;
}
