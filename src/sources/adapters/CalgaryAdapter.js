import{BaseAdapter}from'./BaseAdapter.js';
export class CalgaryAdapter extends BaseAdapter{
  constructor(o){super({id:'calgary',name:'Calgary Traffic',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://data.calgary.ca/resource/k7p9-kppz.json?$limit=200');
      return(j||[]).map(c=>this.norm({
        id:'cal_'+c.camera_id,name:c.name||'Calgary',
        lat:+c.point?.coordinates?.[1]||0,lng:+c.point?.coordinates?.[0]||0,
        snapshotUrl:c.url||'',status:'live',isLive:true,country:'CA',city:'Calgary'}));
    }catch(e){return[]}
  }
}
