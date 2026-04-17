import{BaseAdapter}from'./BaseAdapter.js';
export class NztaAdapter extends BaseAdapter{
  constructor(o){super({id:'nzta',name:'NZTA NZ',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api.nzta.govt.nz/cameras/v1/list');
      return(j.cameras||j||[]).map(c=>this.norm({
        id:'nz_'+c.id,name:c.name||'NZTA',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'NZ'}));
    }catch(e){return[]}
  }
}
