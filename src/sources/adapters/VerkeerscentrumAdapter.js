import{BaseAdapter}from'./BaseAdapter.js';
export class VerkeerscentrumAdapter extends BaseAdapter{
  constructor(o){super({id:'verkeerscentrum',name:'Verkeerscentrum BE',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://miv.opendata.belfla.be/miv/verkeerscentrum/publishedData/cctv.json');
      return(j.cctvList||j||[]).slice(0,200).map(c=>this.norm({
        id:'be_'+c.id,name:c.description||'Verkeerscentrum',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'BE'}));
    }catch(e){return[]}}
}