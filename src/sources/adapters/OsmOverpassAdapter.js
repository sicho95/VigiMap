import{BaseAdapter}from'./BaseAdapter.js';
const SVRS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
export class OsmOverpassAdapter extends BaseAdapter{
  constructor(o){super({id:'osm_overpass',name:'OSM Overpass',...o})}
  async fetchCameras(b){
    if(!b||b.west>=b.east||b.south>=b.north)return[];
    if(Math.abs(b.east-b.west)>80){console.info('[VigiMap] Overpass: zoomez davantage');return[]}
    const q=`[out:json][timeout:18];(node["man_made"="surveillance"](${b.south},${b.west},${b.north},${b.east}););out body 150;`;
    for(const url of SVRS){
      try{
        const ac=new AbortController();const t=setTimeout(()=>ac.abort(),10000);
        const r=await fetch(url,{method:'POST',body:'data='+encodeURIComponent(q),signal:ac.signal});
        clearTimeout(t);if(!r.ok)continue;
        const j=await r.json();
        return(j.elements||[]).filter(e=>e.lat&&e.lon).slice(0,250).map(e=>this.norm({
          id:'osm_'+e.id,name:e.tags?.name||'Caméra OSM',lat:+e.lat,lng:+e.lon,
          status:'unknown',country:e.tags?.['addr:country']||''}));
      }catch(e){console.warn('[VigiMap] Overpass:',e.name==='AbortError'?'timeout':e.message)}
    }
    return[];
  }
}
