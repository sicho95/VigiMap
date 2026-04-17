import{BaseAdapter}from'./BaseAdapter.js';
export class CaltransAdapter extends BaseAdapter{
  constructor(o){super({id:'caltrans',name:'Caltrans CA',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json');
      return(j.data?.items||j||[]).slice(0,200).map(c=>this.norm({
        id:'ca_'+c.id,name:c.location||'Caltrans',
        lat:+c.location?.latitude||0,lng:+c.location?.longitude||0,
        snapshotUrl:c.imageData?.url||'',status:'live',isLive:true,country:'US',city:'California'}));
    }catch(e){return[]}}
}