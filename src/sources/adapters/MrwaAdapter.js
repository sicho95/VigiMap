import{BaseAdapter}from'./BaseAdapter.js';
export class MrwaAdapter extends BaseAdapter{
  constructor(o){super({id:'mrwa_wa',name:'Main Roads WA',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.mainroads.wa.gov.au/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'wa_'+c.id,name:c.name||'MRWA',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'AU',city:'Western Australia'}));
    }catch(e){return[]}}
}