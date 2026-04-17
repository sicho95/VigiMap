import{BaseAdapter}from'./BaseAdapter.js';
export class FintrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'fintraffic',name:'Fintraffic FI',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://tie.digitraffic.fi/api/weathercam/v1/stations?publishable=true');
      return(j.features||[]).slice(0,200).map(f=>this.norm({
        id:'fi_'+f.id,name:f.properties?.name||'Fintraffic',
        lat:+f.geometry?.coordinates?.[1]||0,lng:+f.geometry?.coordinates?.[0]||0,
        snapshotUrl:f.properties?.presets?.[0]?.imageUrl||'',
        status:'live',isLive:true,country:'FI'}));
    }catch(e){return[]}}
}