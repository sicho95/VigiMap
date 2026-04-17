import{BaseAdapter}from'./BaseAdapter.js';
export class TdxTaiwanAdapter extends BaseAdapter{
  constructor(o){super({id:'tdx_tw',name:'TDX Taiwan',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/CCTV?%24top=200&%24format=JSON');
      return(j||[]).map(c=>this.norm({id:'tw_'+c.CCTVID,name:c.CCTVName||'Taiwan',
        lat:+c.PositionLat||0,lng:+c.PositionLon||0,
        snapshotUrl:c.VideoStreamURL||'',status:'live',isLive:true,country:'TW'}));
    }catch(e){return[]}}
}