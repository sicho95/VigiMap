import{getSetting}from'../settings/SettingsManager.js';
import{OsmOverpassAdapter}from'./adapters/OsmOverpassAdapter.js';
import{OpenTrafficAdapter}from'./adapters/OpenTrafficAdapter.js';
import{InsecamAdapter}from'./adapters/InsecamAdapter.js';
import{WindyAdapter}from'./adapters/WindyAdapter.js';
import{EarthCamAdapter}from'./adapters/EarthCamAdapter.js';
import{LtaSingaporeAdapter}from'./adapters/LtaSingaporeAdapter.js';
import{NswTrafficAdapter}from'./adapters/NswTrafficAdapter.js';
import{NztaAdapter}from'./adapters/NztaAdapter.js';
import{TflAdapter}from'./adapters/TflAdapter.js';
import{TrafikverketAdapter}from'./adapters/TrafikverketAdapter.js';
import{SvvNorwayAdapter}from'./adapters/SvvNorwayAdapter.js';
import{VejdirektoratetAdapter}from'./adapters/VejdirektoratetAdapter.js';
import{FintrafficAdapter}from'./adapters/FintrafficAdapter.js';
import{RwsNlAdapter}from'./adapters/RwsNlAdapter.js';
import{DgtSpainAdapter}from'./adapters/DgtSpainAdapter.js';
import{AstraChAdapter}from'./adapters/AstraChAdapter.js';
import{AsfinagAdapter}from'./adapters/AsfinagAdapter.js';
import{SytadinAdapter}from'./adapters/SytadinAdapter.js';
import{CalgaryAdapter}from'./adapters/CalgaryAdapter.js';
import{NycDotAdapter}from'./adapters/NycDotAdapter.js';
import{CetSpBrAdapter}from'./adapters/CetSpBrAdapter.js';

export const SOURCE_REGISTRY=[
  {id:'osm_overpass', name:'OSM Overpass',         cls:OsmOverpassAdapter,    proxy:false, region:'Mondial',       on:true},
  {id:'opentraffic',  name:'OpenTrafficCamMap',     cls:OpenTrafficAdapter,    proxy:false, region:'Mondial',       on:true},
  {id:'insecam',      name:'Insecam',               cls:InsecamAdapter,        proxy:true,  region:'Mondial',       on:true},
  {id:'windy',        name:'Windy Webcams',         cls:WindyAdapter,          proxy:true,  region:'Mondial',       on:true},
  {id:'earthcam',     name:'EarthCam',              cls:EarthCamAdapter,       proxy:true,  region:'Mondial',       on:false},
  {id:'lta_sg',       name:'LTA Singapore',         cls:LtaSingaporeAdapter,   proxy:false, region:'Asie',          on:true},
  {id:'nsw_traffic',  name:'Live Traffic NSW',      cls:NswTrafficAdapter,     proxy:false, region:'Australie',     on:true},
  {id:'nzta',         name:'NZTA (NZ)',             cls:NztaAdapter,           proxy:false, region:'NZ',            on:true},
  {id:'tfl',          name:'TfL Londres',           cls:TflAdapter,            proxy:false, region:'UK',            on:true},
  {id:'trafikverket', name:'Trafikverket (SE)',      cls:TrafikverketAdapter,   proxy:false, region:'Scandinavie',   on:false},
  {id:'svv_no',       name:'Statens vegvesen (NO)', cls:SvvNorwayAdapter,      proxy:false, region:'Scandinavie',   on:false},
  {id:'vejdir_dk',    name:'Vejdirektoratet (DK)',  cls:VejdirektoratetAdapter,proxy:false, region:'Scandinavie',   on:false},
  {id:'fintraffic',   name:'Fintraffic (FI)',       cls:FintrafficAdapter,     proxy:false, region:'Scandinavie',   on:false},
  {id:'rws_nl',       name:'RWS Pays-Bas',          cls:RwsNlAdapter,          proxy:false, region:'Europe',        on:false},
  {id:'dgt_spain',    name:'DGT España',            cls:DgtSpainAdapter,       proxy:false, region:'Europe',        on:false},
  {id:'astra_ch',     name:'ASTRA Suisse',          cls:AstraChAdapter,        proxy:false, region:'Europe',        on:false},
  {id:'asfinag',      name:'ASFINAG Autriche',      cls:AsfinagAdapter,        proxy:true,  region:'Europe',        on:false},
  {id:'sytadin',      name:'Sytadin IDF (FR)',      cls:SytadinAdapter,        proxy:true,  region:'France',        on:false},
  {id:'calgary',      name:'Calgary Traffic (CA)',  cls:CalgaryAdapter,        proxy:false, region:'Amériques',     on:false},
  {id:'nycdot',       name:'NYC DOT',               cls:NycDotAdapter,         proxy:false, region:'Amériques',     on:false},
  {id:'cetsp_br',     name:'CET São Paulo (BR)',    cls:CetSpBrAdapter,        proxy:false, region:'Amériques',     on:false},
];

export async function fetchAllCameras(bbox){
  const pUrl=getSetting('proxyUrl')||'';
  const ss=getSetting('sources')||{};
  const runnable=SOURCE_REGISTRY.filter(s=>{
    const enabled=ss[s.id]!==undefined?ss[s.id]:s.on;
    if(!enabled)return false;
    if(s.proxy&&!pUrl){console.info(`[VigiMap] "${s.name}" ignorée — proxy requis`);return false}
    return true;
  });
  const res=await Promise.allSettled(runnable.map(s=>new s.cls({proxy:s.proxy?pUrl:''}).fetchCameras(bbox)));
  return res.flatMap((r,i)=>{
    if(r.status==='fulfilled')return r.value;
    console.warn(`[VigiMap] "${runnable[i]?.name}":`,r.reason?.message||r.reason);
    return[];
  });
}
