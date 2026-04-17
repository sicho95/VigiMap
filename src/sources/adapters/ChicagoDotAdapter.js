import{BaseAdapter}from'./BaseAdapter.js';
export class ChicagoDotAdapter extends BaseAdapter{
  constructor(o){super({id:'chicagodot',name:'Chicago DOT',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://data.cityofchicago.org/resource/3ifc-h9in.json?$limit=300');
      return(j||[]).map(c=>this.norm({
        id:'chi_'+c.camera_id,name:c.name||c.location_name||'Chicago',
        lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:'https://www.chicago.gov/dam/city/depts/cdot/cameras/'+c.camera_id+'.jpg',
        status:'live',isLive:true,country:'US',city:'Chicago'}));
    }catch(e){return[]}}
}