import{getSetting}from'../settings/SettingsManager.js';

// ── Adapteurs sans clé API, sans proxy ────────────────────────────────────────
import{OsmOverpassAdapter}       from'./adapters/OsmOverpassAdapter.js';
import{LtaSingaporeAdapter}      from'./adapters/LtaSingaporeAdapter.js';
import{TflAdapter}               from'./adapters/TflAdapter.js';
import{TrafikverketAdapter}      from'./adapters/TrafikverketAdapter.js';
import{SvvNorwayAdapter}         from'./adapters/SvvNorwayAdapter.js';
import{VejdirektoratetAdapter}   from'./adapters/VejdirektoratetAdapter.js';
import{FintrafficAdapter}        from'./adapters/FintrafficAdapter.js';
import{CalgaryAdapter}           from'./adapters/CalgaryAdapter.js';
import{NycDotAdapter}            from'./adapters/NycDotAdapter.js';
import{ChicagoDotAdapter}        from'./adapters/ChicagoDotAdapter.js';
import{Road511Adapter}           from'./adapters/Road511Adapter.js';
import{WsdotAdapter}             from'./adapters/WsdotAdapter.js';
import{CaltransAdapter}          from'./adapters/CaltransAdapter.js';
import{TorontoAdapter}           from'./adapters/TorontoAdapter.js';
import{NztaAdapter}              from'./adapters/NztaAdapter.js';
import{NswTrafficAdapter}        from'./adapters/NswTrafficAdapter.js';
import{CetSpBrAdapter}           from'./adapters/CetSpBrAdapter.js';
import{CgmRioAdapter}            from'./adapters/CgmRioAdapter.js';
import{ItsKoreaAdapter}          from'./adapters/ItsKoreaAdapter.js';
import{JarticAdapter}            from'./adapters/JarticAdapter.js';
import{GddkiaAdapter}            from'./adapters/GddkiaAdapter.js';
import{RsdCzAdapter}             from'./adapters/RsdCzAdapter.js';
import{SanralAdapter}            from'./adapters/SanralAdapter.js';
import{HketoAdapter}             from'./adapters/HketoAdapter.js';
import{TdxTaiwanAdapter}         from'./adapters/TdxTaiwanAdapter.js';
import{OpenTrafficAdapter}       from'./adapters/OpenTrafficAdapter.js';

// ── Adapteurs nécessitant proxy CORS ──────────────────────────────────────────
import{InsecamAdapter}           from'./adapters/InsecamAdapter.js';
import{EarthCamAdapter}          from'./adapters/EarthCamAdapter.js';
import{DgtSpainAdapter}          from'./adapters/DgtSpainAdapter.js';
import{AstraChAdapter}           from'./adapters/AstraChAdapter.js';
import{AsfinagAdapter}           from'./adapters/AsfinagAdapter.js';
import{SytadinAdapter}           from'./adapters/SytadinAdapter.js';
import{BastAdapter}              from'./adapters/BastAdapter.js';
import{CcissAdapter}             from'./adapters/CcissAdapter.js';
import{RwsNlAdapter}             from'./adapters/RwsNlAdapter.js';
import{NdwAdapter}               from'./adapters/NdwAdapter.js';
import{VerkeerscentrumAdapter}   from'./adapters/VerkeerscentrumAdapter.js';
import{HighwaysEnglandAdapter}   from'./adapters/HighwaysEnglandAdapter.js';
import{ScotTrafficAdapter}       from'./adapters/ScotTrafficAdapter.js';
import{VicRoadsAdapter}          from'./adapters/VicRoadsAdapter.js';
import{QldTmrAdapter}            from'./adapters/QldTmrAdapter.js';
import{MrwaAdapter}              from'./adapters/MrwaAdapter.js';
import{SemoviMxAdapter}          from'./adapters/SemoviMxAdapter.js';
import{BuenosAiresAdapter}       from'./adapters/BuenosAiresAdapter.js';
import{EpPortugalAdapter}        from'./adapters/EpPortugalAdapter.js';
import{CnairRoAdapter}           from'./adapters/CnairRoAdapter.js';
import{KozutHuAdapter}           from'./adapters/KozutHuAdapter.js';
import{TmcCataloniaAdapter}      from'./adapters/TmcCataloniaAdapter.js';

// ── Adapteurs avec clé API requise ────────────────────────────────────────────
import{WindyAdapter}             from'./adapters/WindyAdapter.js';
import{OpenWebcamDbAdapter}      from'./adapters/OpenWebcamDbAdapter.js';

export const SOURCE_REGISTRY = [
  // ── Mondial ────────────────────────────────────────────────────────────────
  {id:'osm_overpass',    name:'OSM Overpass',          cls:OsmOverpassAdapter,      proxy:false, apiKey:false, region:'Mondial',       on:true},
  {id:'opentraffic',     name:'OpenTrafficCamMap',      cls:OpenTrafficAdapter,      proxy:false, apiKey:false, region:'Mondial',       on:true},
  {id:'insecam',         name:'Insecam',                cls:InsecamAdapter,          proxy:true,  apiKey:false, region:'Mondial',       on:true},
  {id:'earthcam',        name:'EarthCam',               cls:EarthCamAdapter,         proxy:true,  apiKey:false, region:'Mondial',       on:false},
  {id:'windy',           name:'Windy Webcams',          cls:WindyAdapter,            proxy:false, apiKey:'windyKey', region:'Mondial',  on:false},
  {id:'openwebcamdb',    name:'OpenWebcamDB',           cls:OpenWebcamDbAdapter,     proxy:false, apiKey:'openwebcamdbKey', region:'Mondial', on:false},
  // ── Singapour ──────────────────────────────────────────────────────────────
  {id:'lta_sg',          name:'LTA Singapore',          cls:LtaSingaporeAdapter,     proxy:false, apiKey:false, region:'Asie',          on:true},
  {id:'hketo_hk',        name:'Transport HK',           cls:HketoAdapter,            proxy:false, apiKey:false, region:'Asie',          on:false},
  {id:'tdx_tw',          name:'TDX Taiwan',             cls:TdxTaiwanAdapter,        proxy:false, apiKey:false, region:'Asie',          on:false},
  {id:'its_korea',       name:'ITS Korea',              cls:ItsKoreaAdapter,         proxy:false, apiKey:false, region:'Asie',          on:false},
  {id:'jartic_jp',       name:'JARTIC (JP)',            cls:JarticAdapter,           proxy:false, apiKey:false, region:'Asie',          on:false},
  // ── Australie / NZ ─────────────────────────────────────────────────────────
  {id:'nsw_traffic',     name:'Live Traffic NSW',       cls:NswTrafficAdapter,       proxy:true,  apiKey:false, region:'Australie',     on:true},
  {id:'vicroads',        name:'VicRoads (VIC)',         cls:VicRoadsAdapter,         proxy:true,  apiKey:false, region:'Australie',     on:false},
  {id:'qld_tmr',         name:'TMR Queensland',         cls:QldTmrAdapter,           proxy:true,  apiKey:false, region:'Australie',     on:false},
  {id:'mrwa_wa',         name:'Main Roads WA',          cls:MrwaAdapter,             proxy:true,  apiKey:false, region:'Australie',     on:false},
  {id:'nzta',            name:'NZTA (NZ)',              cls:NztaAdapter,             proxy:true,  apiKey:false, region:'NZ',            on:true},
  // ── UK ─────────────────────────────────────────────────────────────────────
  {id:'tfl',             name:'TfL Londres',            cls:TflAdapter,              proxy:false, apiKey:false, region:'UK',            on:true},
  {id:'highways_england',name:'National Highways',      cls:HighwaysEnglandAdapter,  proxy:true,  apiKey:false, region:'UK',            on:false},
  {id:'scot_traffic',    name:'Traffic Scotland',       cls:ScotTrafficAdapter,      proxy:true,  apiKey:false, region:'UK',            on:false},
  // ── France ─────────────────────────────────────────────────────────────────
  {id:'sytadin',         name:'Sytadin IDF',            cls:SytadinAdapter,          proxy:true,  apiKey:false, region:'France',        on:false},
  // ── Allemagne ──────────────────────────────────────────────────────────────
  {id:'bast',            name:'BASt Autobahn (DE)',     cls:BastAdapter,             proxy:true,  apiKey:false, region:'Europe',        on:false},
  // ── Espagne ────────────────────────────────────────────────────────────────
  {id:'dgt_spain',       name:'DGT España',             cls:DgtSpainAdapter,         proxy:true,  apiKey:false, region:'Europe',        on:false},
  {id:'tmc_catalonia',   name:'SCT Catalunya',          cls:TmcCataloniaAdapter,     proxy:true,  apiKey:false, region:'Europe',        on:false},
  // ── Italie ─────────────────────────────────────────────────────────────────
  {id:'cciss',           name:'CCISS (IT)',             cls:CcissAdapter,            proxy:true,  apiKey:false, region:'Europe',        on:false},
  // ── Benelux ────────────────────────────────────────────────────────────────
  {id:'rws_nl',          name:'RWS Pays-Bas',           cls:RwsNlAdapter,            proxy:true,  apiKey:false, region:'Europe',        on:false},
  {id:'ndw',             name:'NDW (NL)',               cls:NdwAdapter,              proxy:true,  apiKey:false, region:'Europe',        on:false},
  {id:'verkeerscentrum', name:'Verkeerscentrum (BE)',   cls:VerkeerscentrumAdapter,  proxy:true,  apiKey:false, region:'Europe',        on:false},
  // ── Suisse / Autriche ──────────────────────────────────────────────────────
  {id:'astra_ch',        name:'ASTRA Suisse',           cls:AstraChAdapter,          proxy:true,  apiKey:false, region:'Europe',        on:false},
  {id:'asfinag',         name:'ASFINAG Autriche',       cls:AsfinagAdapter,          proxy:true,  apiKey:false, region:'Europe',        on:false},
  // ── Scandinavie ────────────────────────────────────────────────────────────
  {id:'trafikverket',    name:'Trafikverket (SE)',       cls:TrafikverketAdapter,     proxy:false, apiKey:false, region:'Scandinavie',   on:false},
  {id:'svv_no',          name:'Statens vegvesen (NO)',  cls:SvvNorwayAdapter,        proxy:false, apiKey:false, region:'Scandinavie',   on:false},
  {id:'vejdir_dk',       name:'Vejdirektoratet (DK)',   cls:VejdirektoratetAdapter,  proxy:false, apiKey:false, region:'Scandinavie',   on:false},
  {id:'fintraffic',      name:'Fintraffic (FI)',        cls:FintrafficAdapter,       proxy:false, apiKey:false, region:'Scandinavie',   on:false},
  // ── Europe Est/Sud ─────────────────────────────────────────────────────────
  {id:'ep_portugal',     name:'EP Portugal',            cls:EpPortugalAdapter,       proxy:true,  apiKey:false, region:'Europe',        on:false},
  {id:'gddkia_pl',       name:'GDDKiA (PL)',            cls:GddkiaAdapter,           proxy:false, apiKey:false, region:'Europe',        on:false},
  {id:'rsd_cz',          name:'ŘSD ČR (CZ)',            cls:RsdCzAdapter,            proxy:false, apiKey:false, region:'Europe',        on:false},
  {id:'cnair_ro',        name:'CNAIR (RO)',             cls:CnairRoAdapter,          proxy:true,  apiKey:false, region:'Europe',        on:false},
  {id:'kozut_hu',        name:'Közút (HU)',             cls:KozutHuAdapter,          proxy:true,  apiKey:false, region:'Europe',        on:false},
  // ── US/Canada ──────────────────────────────────────────────────────────────
  {id:'road511',         name:'Road511 (US+CA)',        cls:Road511Adapter,          proxy:true, apiKey:false, region:'Amériques',     on:true},
  {id:'nycdot',          name:'NYC DOT',                cls:NycDotAdapter,           proxy:false, apiKey:false, region:'Amériques',     on:true},
  {id:'chicagodot',      name:'Chicago DOT',            cls:ChicagoDotAdapter,       proxy:false, apiKey:false, region:'Amériques',     on:false},
  {id:'caltrans',        name:'Caltrans (CA)',          cls:CaltransAdapter,         proxy:false, apiKey:false, region:'Amériques',     on:false},
  {id:'wsdot',           name:'WSDOT (WA)',             cls:WsdotAdapter,            proxy:false, apiKey:false, region:'Amériques',     on:false},
  {id:'calgary',         name:'Calgary Traffic',        cls:CalgaryAdapter,          proxy:false, apiKey:false, region:'Amériques',     on:false},
  {id:'toronto',         name:'Toronto Traffic',        cls:TorontoAdapter,          proxy:false, apiKey:false, region:'Amériques',     on:false},
  // ── Amérique latine ────────────────────────────────────────────────────────
  {id:'cetsp_br',        name:'CET São Paulo',          cls:CetSpBrAdapter,          proxy:true,  apiKey:false, region:'Amériques',     on:false},
  {id:'cgm_rio',         name:'COR Rio (BR)',           cls:CgmRioAdapter,           proxy:true,  apiKey:false, region:'Amériques',     on:false},
  {id:'semovi_mx',       name:'SEMOVI Mexico City',     cls:SemoviMxAdapter,         proxy:true,  apiKey:false, region:'Amériques',     on:false},
  {id:'buenosaires_ar',  name:'BA Cómo Voy (AR)',       cls:BuenosAiresAdapter,      proxy:true,  apiKey:false, region:'Amériques',     on:false},
  // ── Afrique ────────────────────────────────────────────────────────────────
  {id:'sanral_za',       name:'SANRAL (ZA)',            cls:SanralAdapter,           proxy:false, apiKey:false, region:'Afrique',       on:false},
];

export async function fetchAllCameras(bbox){
  const pUrl = (getSetting('proxyUrl') || '').trim();
  const apiKeys= getSetting('apiKeys') || {};
  const ss    = getSetting('sources')  || {};
  const runnable = SOURCE_REGISTRY.filter(s => {
    const enabled = ss[s.id] !== undefined ? ss[s.id] : s.on;
    if (!enabled) return false;
    if (s.proxy && !pUrl) { console.info(`[VigiMap] "${s.name}" ignorée — proxy requis`); return false; }
    if (s.apiKey && !apiKeys[s.apiKey]) { console.info(`[VigiMap] "${s.name}" ignorée — clé API "${s.apiKey}" manquante`); return false; }
    return true;
  });
  const results = await Promise.allSettled(
    runnable.map(s => new s.cls({ proxy: s.proxy ? pUrl : '', apiKey: s.apiKey ? apiKeys[s.apiKey] : '' }).fetchCameras(bbox))
  );
  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn(`[VigiMap] "${runnable[i]?.name}":`, r.reason?.message || r.reason);
    return [];
  });
}
