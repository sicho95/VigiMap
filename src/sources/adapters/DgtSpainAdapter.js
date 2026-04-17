import{BaseAdapter}from'./BaseAdapter.js';
export class DgtSpainAdapter extends BaseAdapter{
  constructor(o){super({id:'dgt_spain',name:'DGT España',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://apirest.dgt.es/api/camaras/1.0?lang=es&bbox=-18,26,5,45&maxRecords=200');
      return(j.camaras||j||[]).map(c=>this.norm({
        id:'dgt_'+c.codigoCamara,name:c.descripcion||'DGT',lat:+c.latitud||0,lng:+c.longitud||0,
        snapshotUrl:c.urlImagen||'',status:'live',isLive:true,country:'ES'}));
    }catch(e){return[]}
  }
}
