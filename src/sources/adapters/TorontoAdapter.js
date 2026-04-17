import{BaseAdapter}from'./BaseAdapter.js';
export class TorontoAdapter extends BaseAdapter{
  constructor(o){super({id:'toronto',name:'Toronto Traffic',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=272fe87c-63b2-469c-ba3b-bc4fcb8bdf8b&limit=300');
      return(j.result?.records||[]).map(c=>this.norm({
        id:'tor_'+c._id,name:c.Main||'Toronto',lat:+c.Latitude||0,lng:+c.Longitude||0,
        snapshotUrl:c.source_jpeg_url||'',status:'live',isLive:true,country:'CA',city:'Toronto'}));
    }catch(e){return[]}}
}