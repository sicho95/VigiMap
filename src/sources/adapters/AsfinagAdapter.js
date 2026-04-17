import{BaseAdapter}from'./BaseAdapter.js';
export class AsfinagAdapter extends BaseAdapter{
  constructor(o){super({id:'asfinag',name:'ASFINAG Autriche',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://verkehr.asfinag.at/api/v1/cameras');
      return(j.cameras||j||[]).slice(0,200).map(c=>this.norm({
        id:'asf_'+c.id,name:c.title||'ASFINAG',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'AT'}));
    }catch(e){return[]}
  }
}
