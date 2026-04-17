import{BaseAdapter}from'./BaseAdapter.js';
export class NswTrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'nsw_traffic',name:'Live Traffic NSW',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api.transport.nsw.gov.au/v1/live/cameras');
      return(j.features||[]).map(f=>this.norm({
        id:'nsw_'+f.properties?.id,name:f.properties?.title||'NSW Camera',
        lat:+f.geometry?.coordinates?.[1]||0,lng:+f.geometry?.coordinates?.[0]||0,
        snapshotUrl:f.properties?.href||'',status:'live',isLive:true,country:'AU',city:'NSW'}));
    }catch(e){return[]}
  }
}
