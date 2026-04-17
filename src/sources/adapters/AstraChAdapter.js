import{BaseAdapter}from'./BaseAdapter.js';
// Source JSON statique publiée par ASTRA / swisstopo (pas d'auth)
const URL_='https://data.geo.admin.ch/ch.astra.webkameras/ch.astra.webkameras_de.json';
export class AstraChAdapter extends BaseAdapter{
  constructor(o){super({id:'astra_ch',name:'ASTRA Suisse',...o})}
  async fetchCameras(){
    try{
      const r=await fetch(URL_,{signal:AbortSignal.timeout?.(12000)});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      return(j.features||[]).slice(0,300).map(f=>this.norm({
        id:'ch_'+(f.id||Math.random().toString(36).slice(2)),
        name:f.properties?.title||f.properties?.name||'ASTRA',
        lat:+f.geometry?.coordinates?.[1]||0,
        lng:+f.geometry?.coordinates?.[0]||0,
        snapshotUrl:f.properties?.imageUrl||f.properties?.url||'',
        status:'live',isLive:true,country:'CH'}));
    }catch(e){console.warn('[VigiMap] ASTRA CH:',e.message);return[]}
  }
}
