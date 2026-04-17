import{BaseAdapter}from'./BaseAdapter.js';
export class TrafikverketAdapter extends BaseAdapter{
  constructor(o){super({id:'trafikverket',name:'Trafikverket SE',...o})}
  async fetchCameras(){
    try{
      const body='<REQUEST><LOGIN authenticationkey=""/><QUERY objecttype="Camera" limit="500"><INCLUDE>Name,Id,Geometry.WGS84,PhotoUrl</INCLUDE></QUERY></REQUEST>';
      const r=await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json',
        {method:'POST',headers:{'Content-Type':'text/xml'},body,signal:AbortSignal.timeout?.(12000)});
      const j=await r.json();
      return(j.RESPONSE?.RESULT?.[0]?.Camera||[]).map(c=>{
        const m=c['Geometry.WGS84']?.match(/POINT\s*\(([^ ]+)\s+([^ )]+)/);
        return this.norm({id:'tv_'+c.Id,name:c.Name||'Trafikverket',
          lat:m?+m[2]:0,lng:m?+m[1]:0,snapshotUrl:c.PhotoUrl||'',
          status:'live',isLive:true,country:'SE'});
      });
    }catch(e){console.warn('[VigiMap] Trafikverket:',e.message);return[]}}
}