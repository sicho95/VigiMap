import{BaseAdapter}from'./BaseAdapter.js';
export class EarthCamAdapter extends BaseAdapter{
  constructor(o){super({id:'earthcam',name:'EarthCam',...o})}
  async fetchCameras(b){
    if(!b)return[];
    const url=`https://www.earthcam.com/cams/includes/search.php?lat1=${b.south}&lat2=${b.north}&lng1=${b.west}&lng2=${b.east}&limit=80`;
    try{
      const j=await this._fetch(url);const d=typeof j==='string'?JSON.parse(j):j;
      return(d.results||d||[]).map(c=>this.norm({
        id:'ec_'+(c.cam_code||Math.random().toString(36).slice(2)),name:c.title||c.location||'EarthCam',
        lat:+c.lat||0,lng:+c.lng||0,snapshotUrl:c.image_url||'',
        status:'live',isLive:true,country:c.country||'',city:c.city||''}));
    }catch(e){return[]}
  }
}
