import{BaseAdapter}from'./BaseAdapter.js';
export class BuenosAiresAdapter extends BaseAdapter{
  constructor(o){super({id:'buenosaires_ar',name:'BA Cómo Voy AR',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://apitransporte.buenosaires.gob.ar/cameras?client_id=anon&client_secret=anon');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'ar_'+c.id,name:c.nombre||'BA',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.url||'',status:'live',isLive:true,country:'AR',city:'Buenos Aires'}));
    }catch(e){return[]}}
}