import{BaseAdapter}from'./BaseAdapter.js';
export class LtaSingaporeAdapter extends BaseAdapter{
  constructor(o){super({id:'lta_sg',name:'LTA Singapore',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://api.data.gov.sg/v1/transport/traffic-images');
      return(j.value?.items?.[0]?.cameras||[]).map(c=>this.norm({
        id:'lta_'+c.camera_id,name:'LTA '+c.camera_id,
        lat:+c.location.latitude,lng:+c.location.longitude,
        snapshotUrl:c.image,status:'live',isLive:true,country:'SG',city:'Singapore'}));
    }catch(e){return[]}}
}