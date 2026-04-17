import{BaseAdapter}from'./BaseAdapter.js';
export class RwsNlAdapter extends BaseAdapter{
  constructor(o){super({id:'rws_nl',name:'RWS Pays-Bas',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api.ndw.nu/v1/trafficspeed/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'rws_'+c.id,name:c.name||'RWS',lat:+c.lat||0,lng:+c.lng||0,status:'unknown',country:'NL'}));
    }catch(e){return[]}
  }
}
