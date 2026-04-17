import{BaseAdapter}from'./BaseAdapter.js';
export class QldTmrAdapter extends BaseAdapter{
  constructor(o){super({id:'qld_tmr',name:'TMR Queensland',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://api.qldtraffic.qld.gov.au/v1/cameras?apikey=anon');
      return(j.features||j||[]).slice(0,200).map(f=>{const p=f.properties||f;const g=f.geometry?.coordinates;
        return this.norm({id:'qld_'+p.camera_id,name:p.name||'TMR QLD',
          lat:g?+g[1]:+p.latitude||0,lng:g?+g[0]:+p.longitude||0,
          snapshotUrl:p.image_url||'',status:'live',isLive:true,country:'AU',city:'Queensland'});
      });
    }catch(e){return[]}}
}