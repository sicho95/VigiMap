import{BaseAdapter}from'./BaseAdapter.js';
export class CgmRioAdapter extends BaseAdapter{
  constructor(o){super({id:'cgm_rio',name:'COR Rio BR',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('http://dadosabertos.rio.rj.gov.br/apiTransporte/apresentacao/rest/index.cfm/cameras');
      return(j.DATA||j||[]).slice(0,200).map(c=>this.norm({
        id:'rio_'+c[0],name:c[2]||'COR Rio',lat:+c[4]||0,lng:+c[3]||0,
        snapshotUrl:c[5]||'',status:'live',isLive:true,country:'BR',city:'Rio de Janeiro'}));
    }catch(e){return[]}}
}