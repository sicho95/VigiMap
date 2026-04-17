import{BaseAdapter}from'./BaseAdapter.js';
export class WindyAdapter extends BaseAdapter{
  constructor(o){super({id:'windy',name:'Windy Webcams',...o})}
  async fetchCameras(b){
    if(!b)return[];
    const url=`https://api.windy.com/webcams/api/v3/webcams?lang=en&limit=100&offset=0`
      +`&bbox=${b.south},${b.west},${b.north},${b.east}&include=location,images,urls`;
    try{
      const j=await this._fetch(url);
      const d=typeof j==='string'?JSON.parse(j):j;
      return(d.webcams||[]).map(c=>this.norm({
        id:'windy_'+c.webcamId,name:c.title||'Windy',
        lat:+c.location?.latitude||0,lng:+c.location?.longitude||0,
        snapshotUrl:c.images?.current?.preview||'',
        status:'live',isLive:true,country:c.location?.country||'',city:c.location?.city||''}));
    }catch(e){return[]}
  }
}
