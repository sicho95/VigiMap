import{BaseAdapter}from'./BaseAdapter.js';
export class NycDotAdapter extends BaseAdapter{
  constructor(o){super({id:'nycdot',name:'NYC DOT',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://data.cityofnewyork.us/resource/n4it-cpsp.json?$limit=500');
      return(j||[]).map(c=>this.norm({
        id:'nyc_'+(c.cameraid||c.id),name:c.name||'NYC DOT',
        lat:+c.latitude||+(c.location?.coordinates?.[1])||0,
        lng:+c.longitude||+(c.location?.coordinates?.[0])||0,
        snapshotUrl:c.url||'',status:'live',isLive:true,country:'US',city:'New York'}));
    }catch(e){return[]}}
}