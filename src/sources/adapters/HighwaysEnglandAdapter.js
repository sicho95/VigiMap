import{BaseAdapter}from'./BaseAdapter.js';
export class HighwaysEnglandAdapter extends BaseAdapter{
  constructor(o){super({id:'highways_england',name:'National Highways',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://api.data.gov.uk/v1/datasets/national-highways-cctv/datafiles/latest/download');
      return(j.features||[]).slice(0,300).map(f=>this.norm({
        id:'he_'+(f.id||Math.random().toString(36).slice(2)),
        name:f.properties?.description||'NH',
        lat:+f.geometry?.coordinates?.[1]||0,lng:+f.geometry?.coordinates?.[0]||0,
        status:'live',isLive:true,country:'GB'}));
    }catch(e){console.warn('[VigiMap] HighwaysEngland:',e.message);return[]}}
}