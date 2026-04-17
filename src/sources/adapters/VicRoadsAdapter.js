import{BaseAdapter}from'./BaseAdapter.js';
export class VicRoadsAdapter extends BaseAdapter{
  constructor(o){super({id:'vicroads',name:'VicRoads VIC',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://traffic.vicroads.vic.gov.au/tmc_api/getCameraDetails?format=json');
      return(j.cameraList||j||[]).slice(0,200).map(c=>this.norm({
        id:'vic_'+c.cameraId,name:c.cameraDescription||'VicRoads',
        lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'AU',city:'Victoria'}));
    }catch(e){return[]}}
}