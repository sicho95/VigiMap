import{BaseAdapter}from'./BaseAdapter.js';
export class LtaSingaporeAdapter extends BaseAdapter{
  constructor(o){super({id:'lta_sg',name:'LTA Singapore',...o})}
  async fetchCameras(){
    try{
      // API data.gov.sg — publique, pas de CORS, pas de clé
      const r=await fetch('https://api.data.gov.sg/v1/transport/traffic-images',
        {signal:AbortSignal.timeout?.(10000)});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      const cams=j.value?.items?.[0]?.cameras||[];
      if(!cams.length)console.warn('[VigiMap] LTA: 0 caméras reçues');
      return cams.map(c=>this.norm({
        id:'lta_'+c.camera_id,
        name:'LTA #'+c.camera_id,
        lat:+c.location.latitude,
        lng:+c.location.longitude,
        snapshotUrl:c.image,
        status:'live',isLive:true,country:'SG',city:'Singapore'}));
    }catch(e){console.warn('[VigiMap] LTA Singapore:',e.message);return[]}
  }
}
