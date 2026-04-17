import{BaseAdapter}from'./BaseAdapter.js';
export class NdwAdapter extends BaseAdapter{
  constructor(o){super({id:'ndw',name:'NDW NL',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://data.ndw.nu/api/rest/static-road-data/traffic-signs/v3/current-state?rvv-codes=C17');
      // NDW ne fournit pas directement de caméras, retour vide pour l'instant
      return[];
    }catch(e){return[]}}
}