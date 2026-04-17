import{BaseAdapter}from'./BaseAdapter.js';
export class NswTrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'nsw_traffic',name:'Live Traffic NSW',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://livetraffic.com/traffic/cameras/region/syd');
      const arr=j.features||j.Cameras||j||[];
      return arr.map(f=>{
        const p=f.properties||f;const g=f.geometry?.coordinates;
        const rawId=p.id||p.cameraId||Math.random().toString(36).slice(2);
        return this.norm({id:'nsw_'+rawId,name:p.title||p.name||'NSW',
          lat:g?+g[1]:+p.lat||0,lng:g?+g[0]:+p.lng||0,
          snapshotUrl:p.href||p.imageUrl||'',status:'live',isLive:true,country:'AU',city:'NSW'});
      });
    }catch(e){console.warn('[VigiMap] NSW:',e.message);return[]}
  }
}
