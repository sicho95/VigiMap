import{BaseAdapter}from'./BaseAdapter.js';
export class AstraChAdapter extends BaseAdapter{
  constructor(o){super({id:'astra_ch',name:'ASTRA Suisse',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api3.geo.admin.ch/rest/services/all/MapServer/find?layer=ch.astra.webkameras&searchField=id&searchText=*&returnGeometry=true&sr=4326');
      return(j.results||[]).slice(0,200).map(f=>this.norm({
        id:'ch_'+f.id,name:f.attributes?.title||'ASTRA',
        lat:+f.geometry?.y||0,lng:+f.geometry?.x||0,
        snapshotUrl:f.attributes?.imageUrl||f.attributes?.bildUrl||'',
        status:'live',isLive:true,country:'CH'}));
    }catch(e){console.warn('[VigiMap] ASTRA CH:',e.message);return[]}
  }
}
