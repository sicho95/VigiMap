import{BaseAdapter}from'./BaseAdapter.js';
const SVRS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
export class OsmOverpassAdapter extends BaseAdapter{
  constructor(o){super({id:'osm_overpass',name:'OSM Overpass',...o})}
  async fetchCameras(b){
    if(!b)return[];
    const span=Math.abs(b.east-b.west);
    if(span>30){console.info('[VigiMap] Overpass: zoomez davantage (bbox > 30°)');return[]}
    const q=`[out:json][timeout:20];(node["man_made"="surveillance"](${b.south},${b.west},${b.north},${b.east}););out body 200;`;
    for(const url of SVRS){
      try{
        const ac=new AbortController();const t=setTimeout(()=>ac.abort(),15000);
        const r=await fetch(url,{method:'POST',body:'data='+encodeURIComponent(q),signal:ac.signal});
        clearTimeout(t);if(!r.ok)continue;
        const j=await r.json();
        return(j.elements||[]).filter(e=>e.lat&&e.lon).slice(0,300).map(e=>this.norm({
          id:'osm_'+e.id,name:e.tags?.name||'Caméra OSM',lat:+e.lat,lng:+e.lon,
          status:'unknown',country:e.tags?.['addr:country']||'',city:e.tags?.['addr:city']||''}));
      }catch(e){if(e.name==='AbortError')console.warn('[VigiMap] Overpass: timeout');else console.warn('[VigiMap] Overpass:',e.message)}
    }
    return[];
  }
}
