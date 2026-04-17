import{BaseAdapter}from'./BaseAdapter.js';
export class KozutHuAdapter extends BaseAdapter{
  constructor(o){super({id:'kozut_hu',name:'Közút HU',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://www.kozut.hu/api/cameras');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'hu_'+c.id,name:c.name||'Közút',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'HU'}));
    }catch(e){return[]}}
}