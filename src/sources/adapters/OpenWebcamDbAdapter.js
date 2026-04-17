import{BaseAdapter}from'./BaseAdapter.js';
export class OpenWebcamDbAdapter extends BaseAdapter{
  constructor(o){super({id:'openwebcamdb',name:'OpenWebcamDB',...o})}
  async fetchCameras(b){
    if(!this.apiKey)return[];
    try{const bbox=b?`&lat1=${b.south}&lat2=${b.north}&lon1=${b.west}&lon2=${b.east}`:'';
      const j=await this._fetch(`https://openwebcamdb.com/api/cameras?key=${this.apiKey}&limit=200${bbox}`);
      return(j.cameras||j||[]).map(c=>this.norm({
        id:'owdb_'+c.id,name:c.name||'OpenWebcamDB',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.snapshot||'',streamUrl:c.stream||'',
        status:'live',isLive:true,country:c.country||''}));
    }catch(e){return[]}}
}