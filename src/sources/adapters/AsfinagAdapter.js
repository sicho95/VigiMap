import{BaseAdapter}from'./BaseAdapter.js';
export class AsfinagAdapter extends BaseAdapter{
  constructor(o){super({id:'asfinag',name:'ASFINAG Autriche',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://verkehr.asfinag.at/map/xml/GetCameras');
      const txt=typeof j==='string'?j:JSON.stringify(j);
      const matches=[...txt.matchAll(/<Camera[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*imageUrl="([^"]*)"/g)];
      return matches.slice(0,200).map(m=>this.norm({
        id:'asf_'+m[1],name:m[2]||'ASFINAG',lat:+m[3]||0,lng:+m[4]||0,
        snapshotUrl:m[5]||'',status:'live',isLive:true,country:'AT'}));
    }catch(e){console.warn('[VigiMap] ASFINAG:',e.message);return[]}
  }
}
