import{BaseAdapter}from'./BaseAdapter.js';
import{getSetting}from'../../settings/SettingsManager.js';
const NSW_URL='https://opendata.transport.nsw.gov.au/data/dataset/b0212311-b0da-4363-8dc3-825fe10941b2/resource/cc776d1a-d96c-4ae4-a465-c380a53717c9/download/livetrafficcamera.json';
export class NswTrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'nsw_traffic',name:'Live Traffic NSW',...o})}
  async fetchCameras(){
    try{
      const ak=(getSetting('apiKeys')||{}).nswKey||'';
      // L'URL open data est publique — pas de clé requise
      const r=await fetch(NSW_URL,{signal:AbortSignal.timeout?.(12000)});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      return(j.features||[]).map(f=>{
        const p=f.properties||{};const g=f.geometry?.coordinates;
        return this.norm({id:'nsw_'+(p.id||p.cameraId||Math.random().toString(36).slice(2)),
          name:p.title||p.name||'NSW',
          lat:g?+g[1]:0,lng:g?+g[0]:0,
          snapshotUrl:p.href||p.imageUrl||'',
          status:'live',isLive:true,country:'AU',city:'NSW'});
      });
    }catch(e){console.warn('[VigiMap] NSW:',e.message);return[]}
  }
}
