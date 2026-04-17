import{BaseAdapter}from'./BaseAdapter.js';
export class SemoviMxAdapter extends BaseAdapter{
  constructor(o){super({id:'semovi_mx',name:'SEMOVI Mexico City',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://datos.cdmx.gob.mx/api/3/action/datastore_search?resource_id=cameras-semovi&limit=300');
      return(j.result?.records||[]).map(c=>this.norm({
        id:'mx_'+c._id,name:c.nombre||'SEMOVI',lat:+c.latitud||0,lng:+c.longitud||0,
        snapshotUrl:c.url_imagen||'',status:'live',isLive:true,country:'MX',city:'Mexico City'}));
    }catch(e){return[]}}
}