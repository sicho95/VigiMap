import{BaseAdapter}from'./BaseAdapter.js';
export class CnairRoAdapter extends BaseAdapter{
  constructor(o){super({id:'cnair_ro',name:'CNAIR RO',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.cnair.ro/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'ro_'+c.id,name:c.name||'CNAIR',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'RO'}));
    }catch(e){return[]}}
}