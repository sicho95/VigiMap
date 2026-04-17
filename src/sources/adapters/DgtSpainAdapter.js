import{BaseAdapter}from'./BaseAdapter.js';
export class DgtSpainAdapter extends BaseAdapter{
  constructor(o){super({id:'dgt_spain',name:'DGT España',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://infocar.dgt.es/etraffic/ServicioRest?servicio=getCamaras&datos=true');
      // La réponse peut être un objet {camaras:[…]} ou un tableau direct
      let arr=[];
      if(Array.isArray(j))arr=j;
      else if(Array.isArray(j?.camaras))arr=j.camaras;
      else if(Array.isArray(j?.Camaras))arr=j.Camaras;
      else if(typeof j==='object')arr=Object.values(j).find(v=>Array.isArray(v))||[];
      return arr.slice(0,300).map(c=>this.norm({
        id:'dgt_'+(c.IdDispositivo||c.id||Math.random().toString(36).slice(2)),
        name:c.Nombre||c.nombre||c.name||'DGT',
        lat:+c.Latitud||+c.latitud||+c.lat||0,
        lng:+c.Longitud||+c.longitud||+c.lng||0,
        snapshotUrl:c.UrlImagen||c.urlImagen||c.url||'',
        status:'live',isLive:true,country:'ES'}));
    }catch(e){console.warn('[VigiMap] DGT:',e.message);return[]}
  }
}
