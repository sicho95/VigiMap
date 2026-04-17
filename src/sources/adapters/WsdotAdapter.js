import{BaseAdapter}from'./BaseAdapter.js';
export class WsdotAdapter extends BaseAdapter{
  constructor(o){super({id:'wsdot',name:'WSDOT WA',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.wsdot.wa.gov/traffic/api/HighwayCameras/CameraAPI.ashx?AccessCode=null&dataFormat=json');
      return(j||[]).slice(0,300).map(c=>this.norm({
        id:'wa_'+c.CameraID,name:c.DisplayName||'WSDOT',
        lat:+c.Latitude||0,lng:+c.Longitude||0,
        snapshotUrl:c.ImageURL||'',status:c.IsActive?'live':'offline',isLive:!!c.IsActive,country:'US',city:'Washington'}));
    }catch(e){return[]}}
}