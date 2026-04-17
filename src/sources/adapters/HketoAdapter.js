import{BaseAdapter}from'./BaseAdapter.js';
export class HketoAdapter extends BaseAdapter{
  constructor(o){super({id:'hketo_hk',name:'Transport HK',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://resource.data.one.gov.hk/td/traffic-snapshot-images/TIS_TrafficCam.xml');
      const txt=typeof j==='string'?j:'';
      const ms=[...txt.matchAll(/<Camera[^>]*>\s*<CameraNo>([^<]*)<\/CameraNo>\s*<Description>([^<]*)<\/Description>\s*<Latitude>([^<]*)<\/Latitude>\s*<Longitude>([^<]*)<\/Longitude>\s*<ImagePath>([^<]*)<\/ImagePath>/gs)];
      return ms.slice(0,200).map(m=>this.norm({id:'hk_'+m[1],name:m[2]||'HK',lat:+m[3],lng:+m[4],snapshotUrl:m[5],status:'live',isLive:true,country:'HK'}));
    }catch(e){return[]}}
}