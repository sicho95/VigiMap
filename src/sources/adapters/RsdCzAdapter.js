import{BaseAdapter}from'./BaseAdapter.js';
export class RsdCzAdapter extends BaseAdapter{
  constructor(o){super({id:'rsd_cz',name:'ŘSD CZ',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.dopravniinfo.cz/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'cz_'+c.id,name:c.name||'RSD',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'CZ'}));
    }catch(e){return[]}}
}