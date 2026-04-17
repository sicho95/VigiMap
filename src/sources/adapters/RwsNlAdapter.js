import{BaseAdapter}from'./BaseAdapter.js';
export class RwsNlAdapter extends BaseAdapter{
  constructor(o){super({id:'rws_nl',name:'RWS Pays-Bas',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://opendata.ndw.nu/cameras.json.gz');
      return(j||[]).slice(0,300).map(c=>this.norm({
        id:'rws_'+c.id,name:c.name||'RWS',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'NL'}));
    }catch(e){return[]}}
}