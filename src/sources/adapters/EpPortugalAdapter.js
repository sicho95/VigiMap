import{BaseAdapter}from'./BaseAdapter.js';
export class EpPortugalAdapter extends BaseAdapter{
  constructor(o){super({id:'ep_portugal',name:'EP Portugal',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.estradas.pt/services/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'pt_'+c.id,name:c.name||'EP',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'PT'}));
    }catch(e){return[]}}
}