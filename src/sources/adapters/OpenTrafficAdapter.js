import{BaseAdapter}from'./BaseAdapter.js';
const URL_='https://raw.githubusercontent.com/stephenhouser/open-traffic-cam-map/master/cameras.json';
let _cache=null;
export class OpenTrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'opentraffic',name:'OpenTrafficCamMap',...o})}
  async fetchCameras(b){
    try{
      if(!_cache){const r=await fetch(URL_);_cache=await r.json()}
      const arr=Array.isArray(_cache)?_cache:(_cache.cameras||[]);
      return arr.filter(c=>{
        const la=+c.lat||+c.latitude||0,ln=+c.lon||+c.longitude||0;
        return!b||(la>=b.south&&la<=b.north&&ln>=b.west&&ln<=b.east);
      }).slice(0,300).map(c=>this.norm({
        id:'ot_'+(c.id||Math.random().toString(36).slice(2)),
        name:c.name||c.title||'Camera',
        lat:+c.lat||+c.latitude||0,lng:+c.lon||+c.longitude||0,
        snapshotUrl:c.url||c.snapshotUrl||'',status:'unknown',country:c.country||c.region||'',
      }));
    }catch(e){console.warn('[VigiMap] OpenTraffic:',e.message);return[]}
  }
}
