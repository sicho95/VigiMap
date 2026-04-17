import{BaseAdapter}from'./BaseAdapter.js';
export class ScotTrafficAdapter extends BaseAdapter{
  constructor(o){super({id:'scot_traffic',name:'Traffic Scotland',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://trafficscotland.org/rss/feeds/variablespeedlimits.aspx');
      // XML — parse minimal
      const txt=typeof j==='string'?j:'';
      const ms=[...txt.matchAll(/<title>([^<]+)<\/title>[\s\S]*?<geo:lat>([^<]+)<\/geo:lat>[\s\S]*?<geo:long>([^<]+)<\/geo:long>/g)];
      return ms.slice(0,150).map((m,i)=>this.norm({
        id:'scot_'+i,name:m[1],lat:+m[2],lng:+m[3],status:'live',isLive:true,country:'GB',city:'Scotland'}));
    }catch(e){return[]}}
}