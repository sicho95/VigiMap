import{BaseAdapter}from'./BaseAdapter.js';
export class NycDotAdapter extends BaseAdapter{
  constructor(o){super({id:'nycdot',name:'NYC DOT',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://data.cityofnewyork.us/resource/ecxy-mmf9.json?$limit=300');
      return(j||[]).map(c=>this.norm({
        id:'nyc_'+c.cameraid,name:c.name||'NYC DOT',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.url||'',status:'live',isLive:true,country:'US',city:'New York'}));
    }catch(e){return[]}
  }
}
