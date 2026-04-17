import{BaseAdapter}from'./BaseAdapter.js';
export class CcissAdapter extends BaseAdapter{
  constructor(o){super({id:'cciss',name:'CCISS IT',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.cciss.it/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'it_'+c.id,name:c.name||'CCISS',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'IT'}));
    }catch(e){return[]}}
}