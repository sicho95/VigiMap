import{BaseAdapter}from'./BaseAdapter.js';
export class TmcCataloniaAdapter extends BaseAdapter{
  constructor(o){super({id:'tmc_catalonia',name:'SCT Catalunya',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://api.transit.land/api/v2/rest/camera?apikey=mapzen-XXXXXX');
      return(j||[]).map(c=>this.norm({id:'cat_'+c.id,name:c.name||'SCT',lat:+c.lat||0,lng:+c.lng||0,status:'live',isLive:true,country:'ES',city:'Catalonia'}));
    }catch(e){return[]}}
}