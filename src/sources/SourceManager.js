import{getSetting}from'../settings/SettingsManager.js';
import{InsecamAdapter}from'./adapters/InsecamAdapter.js';
import{LtaSingaporeAdapter}from'./adapters/LtaSingaporeAdapter.js';
import{OpenTrafficAdapter}from'./adapters/OpenTrafficAdapter.js';
import{OsmOverpassAdapter}from'./adapters/OsmOverpassAdapter.js';
import{Road511Adapter}from'./adapters/Road511Adapter.js';
import{WindyAdapter}from'./adapters/WindyAdapter.js';
import{EarthCamAdapter}from'./adapters/EarthCamAdapter.js';
import{CamViewerAdapter}from'./adapters/CamViewerAdapter.js';
export const SOURCE_REGISTRY=[{id:'insecam',name:'Insecam',cls:InsecamAdapter,requiresProxy:true},{id:'lta',name:'LTA Singapore',cls:LtaSingaporeAdapter,requiresProxy:false},{id:'opentraffic',name:'OpenTraffic',cls:OpenTrafficAdapter,requiresProxy:false},{id:'overpass',name:'OSM Overpass',cls:OsmOverpassAdapter,requiresProxy:false},{id:'road511',name:'Road 511',cls:Road511Adapter,requiresProxy:true},{id:'windy',name:'Windy Webcams',cls:WindyAdapter,requiresProxy:false},{id:'earthcam',name:'EarthCam',cls:EarthCamAdapter,requiresProxy:true},{id:'camviewer',name:'CamViewer',cls:CamViewerAdapter,requiresProxy:true}];
export async function fetchAllCameras(bbox){const proxy=getSetting('proxyUrl'),settings=getSetting('sources')||{};const adapters=SOURCE_REGISTRY.filter(s=>settings[s.id]!==false).map(s=>new s.cls({proxy:s.requiresProxy&&proxy?proxy:''}));const r=await Promise.allSettled(adapters.map((a,i)=>a.fetchCameras(bbox)));return r.flatMap((x,i)=>x.status==='fulfilled'?x.value:(console.warn('[src]',SOURCE_REGISTRY[i]?.id,x.reason),[]));}  
