import{BaseAdapter}from'./BaseAdapter.js';
export class OpenWebcamDbAdapter extends BaseAdapter{
  constructor(o){super({id:'openwebcamdb',name:'OpenWebcamDB',...o})}
  async fetchCameras(b){
    if(!this.apiKey)return[];
    const bbox=b?`&lat_min=${b.south}&lat_max=${b.north}&lon_min=${b.west}&lon_max=${b.east}`:'';
    try{
      const j=await this._fetch(
        `https://openwebcamdb.com/api/v1/cameras?limit=200${bbox}`,
        {headers:{Authorization:`Bearer ${this.apiKey}`,'Accept':'application/json'}}
      );
      return(j.cameras||j.data||j||[]).map(c=>this.norm({
        id:'owdb_'+c.id,name:c.name||c.title||'OpenWebcamDB',
        lat:+c.latitude||+c.lat||0,lng:+c.longitude||+c.lon||0,
        snapshotUrl:c.snapshot_url||c.snapshot||'',
        streamUrl:c.stream_url||c.stream||'',
        status:'live',isLive:true,country:c.country||''}));
    }catch(e){console.warn('[VigiMap] OpenWebcamDB:',e.message);return[]}
  }
}
