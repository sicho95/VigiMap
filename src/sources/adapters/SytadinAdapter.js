import{BaseAdapter}from'./BaseAdapter.js';
// Sytadin n'a pas d'API JSON publique stable — scraping fragile
export class SytadinAdapter extends BaseAdapter{
  constructor(o){super({id:'sytadin',name:'Sytadin IDF',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://www.sytadin.fr/opencms/export/sites/sytadin/opendatafiles/cameras.json');
      return(Array.isArray(j)?j:[]).map(c=>this.norm({
        id:'syt_'+c.id,name:c.nom||'Sytadin',lat:+c.lat||0,lng:+c.lng||0,
        snapshotUrl:c.url||'',status:'live',isLive:true,country:'FR',city:'Île-de-France'}));
    }catch(e){console.warn('[VigiMap] Sytadin (désactivée - URL instable):',e.message);return[]}
  }
}
