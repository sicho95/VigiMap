import{BaseAdapter}from'./BaseAdapter.js';
export class NztaAdapter extends BaseAdapter{
  constructor(o){super({id:'nzta',name:'NZTA NZ',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api.nzta.govt.nz/traffic-monitoring/v1/cameras?limit=500');
      return(j.cameras||j||[]).map(c=>this.norm({
        id:'nz_'+c.id,name:c.name||'NZTA',
        lat:+c.position?.lat||+c.latitude||0,lng:+c.position?.lng||+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'NZ'}));
    }catch(e){console.warn('[VigiMap] NZTA:',e.message);return[]}
  }
}
