import{BaseAdapter}from'./BaseAdapter.js';
export class BastAdapter extends BaseAdapter{
  constructor(o){super({id:'bast',name:'BASt Autobahn DE',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://mobilithek.info/offers/-6901756823478928500');
      return(j.features||[]).slice(0,300).map(f=>this.norm({
        id:'bast_'+f.id,name:f.properties?.bezeichnung||'BASt',
        lat:+f.geometry?.coordinates?.[1]||0,lng:+f.geometry?.coordinates?.[0]||0,
        status:'live',isLive:true,country:'DE'}));
    }catch(e){console.warn('[VigiMap] BASt:',e.message);return[]}}
}