import{BaseAdapter}from'./BaseAdapter.js';
export class DgtSpainAdapter extends BaseAdapter{
  constructor(o){super({id:'dgt_spain',name:'DGT España',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://infocar.dgt.es/etraffic/ServicioRest?servicio=getCamaras&datos=true');
      const arr=j.carretera||j.cameras||j||[];
      return arr.slice(0,300).map(c=>this.norm({
        id:'dgt_'+(c.IdDispositivo||c.id),name:c.Nombre||c.name||'DGT',
        lat:+c.Latitud||+c.lat||0,lng:+c.Longitud||+c.lng||0,
        snapshotUrl:c.UrlImagen||c.url||'',status:'live',isLive:true,country:'ES'}));
    }catch(e){console.warn('[VigiMap] DGT:',e.message);return[]}
  }
}
