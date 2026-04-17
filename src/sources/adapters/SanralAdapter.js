import{BaseAdapter}from'./BaseAdapter.js';
export class SanralAdapter extends BaseAdapter{
  constructor(o){super({id:'sanral_za',name:'SANRAL ZA',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://cameras.sanral.co.za/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'za_'+c.id,name:c.name||'SANRAL',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'ZA'}));
    }catch(e){return[]}}
}