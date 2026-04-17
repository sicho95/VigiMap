import{BaseAdapter}from'./BaseAdapter.js';
export class GddkiaAdapter extends BaseAdapter{
  constructor(o){super({id:'gddkia_pl',name:'GDDKiA PL',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://api.gddkia.gov.pl/cameras/list?format=json');
      return(j.cameras||j||[]).slice(0,300).map(c=>this.norm({
        id:'pl_'+c.id,name:c.name||'GDDKiA',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'PL'}));
    }catch(e){return[]}}
}