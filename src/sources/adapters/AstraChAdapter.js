import{BaseAdapter}from'./BaseAdapter.js';
export class AstraChAdapter extends BaseAdapter{
  constructor(o){super({id:'astra_ch',name:'ASTRA Suisse',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://data.geo.admin.ch/ch.astra.webkameras/map/data.json');
      const items=j?.features||j||[];
      return items.slice(0,200).map(f=>this.norm({
        id:'ch_'+(f.id||Math.random().toString(36).slice(2)),
        name:f.properties?.title||'ASTRA',
        lat:+f.geometry?.coordinates?.[1]||0,lng:+f.geometry?.coordinates?.[0]||0,
        snapshotUrl:f.properties?.imageUrl||'',status:'live',isLive:true,country:'CH'}));
    }catch(e){return[]}
  }
}
