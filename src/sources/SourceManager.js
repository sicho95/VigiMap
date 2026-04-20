import { getSetting } from '../settings/SettingsManager.js';

// ── Adapteurs sans clé API, sans proxy ────────────────────────────────────────
import { OsmOverpassAdapter }    from './adapters/OsmOverpassAdapter.js';
import { LtaSingaporeAdapter }   from './adapters/LtaSingaporeAdapter.js';
import { TrafikverketAdapter }   from './adapters/TrafikverketAdapter.js';
import { SvvNorwayAdapter }      from './adapters/SvvNorwayAdapter.js';
import { FintrafficAdapter }     from './adapters/FintrafficAdapter.js';
import { CalgaryAdapter }        from './adapters/CalgaryAdapter.js';
import { CaltransAdapter }       from './adapters/CaltransAdapter.js';
import { GddkiaAdapter }         from './adapters/GddkiaAdapter.js';
import { RsdCzAdapter }          from './adapters/RsdCzAdapter.js';
import { HketoAdapter }          from './adapters/HketoAdapter.js';
import { ItsKoreaAdapter }       from './adapters/ItsKoreaAdapter.js';

// ── Adapteurs nécessitant proxy CORS ──────────────────────────────────────────
import { DgtSpainAdapter }       from './adapters/DgtSpainAdapter.js';
import { AsfinagAdapter }        from './adapters/AsfinagAdapter.js';
import { BastAdapter }           from './adapters/BastAdapter.js';
import { CcissAdapter }          from './adapters/CcissAdapter.js';
import { SytadinAdapter }        from './adapters/SytadinAdapter.js';
import { VerkeerscentrumAdapter } from './adapters/VerkeerscentrumAdapter.js';
import { VicRoadsAdapter }       from './adapters/VicRoadsAdapter.js';
import { QldTmrAdapter }         from './adapters/QldTmrAdapter.js';
import { MrwaAdapter }           from './adapters/MrwaAdapter.js';
import { TmcCataloniaAdapter }   from './adapters/TmcCataloniaAdapter.js';
import { SemoviMxAdapter }       from './adapters/SemoviMxAdapter.js';
import { BuenosAiresAdapter }    from './adapters/BuenosAiresAdapter.js';
import { CgmRioAdapter }         from './adapters/CgmRioAdapter.js';

// ── Adapteurs avec clé API requise ────────────────────────────────────────────
import { WindyAdapter }          from './adapters/WindyAdapter.js';
import { OpenWebcamDbAdapter }   from './adapters/OpenWebcamDbAdapter.js';
import { JarticAdapter }         from './adapters/JarticAdapter.js';
import { Road511Adapter }        from './adapters/Road511Adapter.js';

// ── Adapteurs retirés (endpoints morts au 2026-04) ────────────────────────────
// TflAdapter         → GET /Place?type=JamCam  → 404
// NycDotAdapter      → Socrata n4it-cpsp.json  → 404
// ChicagoDotAdapter  → Socrata 3ifc-h9in.json  → 404
// TorontoAdapter     → CKAN 272fe87c            → 404
// WsdotAdapter       → CameraAPI.ashx           → CORS + 404
// NztaAdapter        → proxy → 530
// NswTrafficAdapter  → proxy → 404
// CetSpBrAdapter     → proxy → 404
// EarthCamAdapter    → proxy → 404
// InsecamAdapter     → proxy → 526
// AstraChAdapter     → ASTRA json              → 404
// HighwaysEnglandAdapter → data.gov.uk download → 530
// ScotTrafficAdapter → trafficscotland.org rss  → 404
// RwsNlAdapter       → opendata.ndw.nu gz       → 404
// NdwAdapter         → data.ndw.nu              → 404
// VejdirektoratetAdapter → vejdirektoratet.dk   → 404
// EpPortugalAdapter  → estradas.pt              → 526
// CnairRoAdapter     → cnair.ro                 → 404
// KozutHuAdapter     → kozut.hu                 → 404 (5 s timeout)
// SanralAdapter      → sanral.co.za             → CORS null
// TdxTaiwanAdapter   → tdx.transportdata.tw     → 404
// OpenTrafficAdapter → jsdelivr stephenhouser   → 404
// CcissAdapter       → proxy                    → laisser off
// RsdCzAdapter       → dopravniinfo.cz          → CORS 301

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE_REGISTRY
// Chaque entrée :
//   id        : identifiant unique (utilisé dans getSetting('sources'))
//   name      : libellé affiché
//   cls       : classe adapter
//   proxy     : nécessite un proxy CORS
//   apiKey    : nom de la clé dans getSetting('apiKeys'), ou false
//   region    : regroupement dans l'UI
//   on        : état par défaut
// ─────────────────────────────────────────────────────────────────────────────
export const SOURCE_REGISTRY = [
  // ── Mondial
  { id: 'osm_overpass',    name: 'OSM Overpass',         cls: OsmOverpassAdapter,    proxy: false, apiKey: false,             region: 'Mondial',      on: true  },
  // ── Asie
  { id: 'lta_sg',          name: 'LTA Singapore',        cls: LtaSingaporeAdapter,   proxy: false, apiKey: false,             region: 'Asie',         on: true  },
  { id: 'hketo_hk',        name: 'Transport HK',         cls: HketoAdapter,          proxy: false, apiKey: false,             region: 'Asie',         on: false },
  { id: 'its_korea',       name: 'ITS Korea',            cls: ItsKoreaAdapter,       proxy: false, apiKey: false,             region: 'Asie',         on: false },
  { id: 'jartic_jp',       name: 'JARTIC (JP)',          cls: JarticAdapter,         proxy: false, apiKey: 'jarticKey',       region: 'Asie',         on: false },
  // ── Australie
  { id: 'vicroads',        name: 'VicRoads (VIC)',       cls: VicRoadsAdapter,       proxy: true,  apiKey: false,             region: 'Australie',    on: false },
  { id: 'qld_tmr',         name: 'TMR Queensland',       cls: QldTmrAdapter,         proxy: true,  apiKey: false,             region: 'Australie',    on: false },
  { id: 'mrwa_wa',         name: 'Main Roads WA',        cls: MrwaAdapter,           proxy: true,  apiKey: false,             region: 'Australie',    on: false },
  // ── France
  { id: 'sytadin',         name: 'Sytadin IDF',          cls: SytadinAdapter,        proxy: true,  apiKey: false,             region: 'France',       on: false },
  // ── Espagne
  { id: 'dgt_spain',       name: 'DGT España',           cls: DgtSpainAdapter,       proxy: true,  apiKey: false,             region: 'Europe',       on: false },
  { id: 'tmc_catalonia',   name: 'SCT Catalunya',        cls: TmcCataloniaAdapter,   proxy: true,  apiKey: false,             region: 'Europe',       on: false },
  // ── Allemagne
  { id: 'bast',            name: 'BASt Autobahn (DE)',   cls: BastAdapter,           proxy: true,  apiKey: false,             region: 'Europe',       on: false },
  // ── Italie
  { id: 'cciss',           name: 'CCISS (IT)',           cls: CcissAdapter,          proxy: true,  apiKey: false,             region: 'Europe',       on: false },
  // ── Autriche
  { id: 'asfinag',         name: 'ASFINAG Autriche',     cls: AsfinagAdapter,        proxy: true,  apiKey: false,             region: 'Europe',       on: false },
  // ── Belgique
  { id: 'verkeerscentrum', name: 'Verkeerscentrum (BE)', cls: VerkeerscentrumAdapter, proxy: true, apiKey: false,             region: 'Europe',       on: false },
  // ── Pologne
  { id: 'gddkia_pl',       name: 'GDDKiA (PL)',         cls: GddkiaAdapter,         proxy: false, apiKey: false,             region: 'Europe',       on: false },
  // ── Scandinavie
  { id: 'trafikverket',    name: 'Trafikverket (SE)',    cls: TrafikverketAdapter,   proxy: false, apiKey: 'trafikverketKey', region: 'Scandinavie',  on: false },
  { id: 'svv_no',          name: 'Statens vegvesen (NO)',cls: SvvNorwayAdapter,      proxy: false, apiKey: false,             region: 'Scandinavie',  on: false },
  { id: 'fintraffic',      name: 'Fintraffic (FI)',      cls: FintrafficAdapter,     proxy: false, apiKey: false,             region: 'Scandinavie',  on: false },
  // ── Canada
  { id: 'calgary',         name: 'Calgary Traffic',      cls: CalgaryAdapter,        proxy: false, apiKey: false,             region: 'Amériques',    on: false },
  { id: 'caltrans',        name: 'Caltrans (CA)',        cls: CaltransAdapter,       proxy: false, apiKey: false,             region: 'Amériques',    on: false },
  // ── US
  { id: 'road511',         name: 'Road511 (US)',         cls: Road511Adapter,        proxy: false, apiKey: 'road511Key',      region: 'Amériques',    on: false },
  // ── Amérique latine
  { id: 'semovi_mx',       name: 'SEMOVI Mexico City',   cls: SemoviMxAdapter,       proxy: true,  apiKey: false,             region: 'Amériques',    on: false },
  { id: 'buenosaires_ar',  name: 'BA Cómo Voy (AR)',    cls: BuenosAiresAdapter,    proxy: true,  apiKey: false,             region: 'Amériques',    on: false },
  { id: 'cgm_rio',         name: 'COR Rio (BR)',         cls: CgmRioAdapter,         proxy: true,  apiKey: false,             region: 'Amériques',    on: false },
  // ── Mondial avec clé
  { id: 'windy',           name: 'Windy Webcams',        cls: WindyAdapter,          proxy: false, apiKey: 'windyKey',        region: 'Mondial',      on: false },
  { id: 'openwebcamdb',    name: 'OpenWebcamDB',         cls: OpenWebcamDbAdapter,   proxy: false, apiKey: 'openwebcamdbKey', region: 'Mondial',      on: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Liste des clés API attendues par les sources
// Utilisé par SettingsPanel pour générer les champs de saisie
// ─────────────────────────────────────────────────────────────────────────────
export const API_KEY_DEFINITIONS = [
  { key: 'windyKey',        label: 'Windy Webcams',         url: 'https://api.windy.com/',                   source: 'windy'        },
  { key: 'openwebcamdbKey', label: 'OpenWebcamDB',          url: 'https://openwebcamdb.com/',                source: 'openwebcamdb' },
  { key: 'jarticKey',       label: 'JARTIC (Japon)',         url: 'https://www.jartic.or.jp/',                source: 'jartic_jp'    },
  { key: 'road511Key',      label: 'Road511 (US)',           url: 'https://511.org/',                         source: 'road511'      },
  { key: 'trafikverketKey', label: 'Trafikverket (Suède)',   url: 'https://api.trafikinfo.trafikverket.se/',  source: 'trafikverket' },
];

// ─────────────────────────────────────────────────────────────────────────────
export async function fetchAllCameras(bbox) {
  const pUrl   = getSetting('proxyUrl') || '';
  const apiKeys = getSetting('apiKeys') || {};
  const ss     = getSetting('sources') || {};

  const runnable = SOURCE_REGISTRY.filter(s => {
    const enabled = ss[s.id] !== undefined ? ss[s.id] : s.on;
    if (!enabled) return false;
    if (s.proxy && !pUrl) {
      console.info(`[VigiMap] "${s.name}" ignorée — proxy requis`);
      return false;
    }
    if (s.apiKey && !apiKeys[s.apiKey]) {
      console.info(`[VigiMap] "${s.name}" ignorée — clé API "${s.apiKey}" manquante`);
      return false;
    }
    return true;
  });

  const results = await Promise.allSettled(
    runnable.map(s =>
      new s.cls({
        proxy:  s.proxy  ? pUrl             : '',
        apiKey: s.apiKey ? apiKeys[s.apiKey] : '',
      }).fetchCameras(bbox)
    )
  );

  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn(`[VigiMap] "${runnable[i]?.name}":`, r.reason?.message || r.reason);
    return [];
  });
}
