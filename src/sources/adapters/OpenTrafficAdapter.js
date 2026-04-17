import{BaseAdapter}from'./BaseAdapter.js';
// Miroirs successifs — si le premier est 404 on tente le suivant
const URLS=[
  'https://cdn.jsdelivr.net/gh/stephenhouser/open-traffic-cam-map@master/cameras.json',
  'https://raw.githubusercontent.com/nickaigi/open-traffic-cameras/master/cameras.json',
];
let _cache=null;
export class OpenTrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'opentraffic',name:'OpenTrafficCamMap',...o})}
  async fetchCameras(b){
    if(!_cache){
      for(const u of URLS){
        try{const r=await fetch(u,{signal:AbortSignal.timeout?.(10000)});if(!r.ok)continue;
          const txt=await r.text();_cache=JSON.parse(txt.trim());break;}
        catch(_){}
      }
    }
    if(!_cache)return[];
    const arr=Array.isArray(_cache)?_cache:(_cache.cameras||Object.values(_cache));
    return arr.filter(c=>{
      const la=+c.lat||+c.latitude||0,ln=+c.lon||+c.longitude||0;
      return!b||(la>=b.south&&la<=b.north&&ln>=b.west&&ln<=b.east);
    }).slice(0,400).map(c=>this.norm({
      id:'ot_'+(c.id||Math.random().toString(36).slice(2)),
      name:c.name||c.title||'Camera',
      lat:+c.lat||+c.latitude||0,lng:+c.lon||+c.longitude||0,
      snapshotUrl:c.url||c.snapshotUrl||c.image||'',
      status:'unknown',country:c.country||c.region||'',city:c.city||''}));
  }
}
