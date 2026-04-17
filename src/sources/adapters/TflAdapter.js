import{BaseAdapter}from'./BaseAdapter.js';
export class TflAdapter extends BaseAdapter{
  constructor(o){super({id:'tfl',name:'TfL Londres',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api.tfl.gov.uk/Place?type=JamCam&returnLines=false');
      return(j||[]).slice(0,200).map(c=>this.norm({
        id:'tfl_'+c.id,name:c.commonName||'TfL',lat:+c.lat||0,lng:+c.lon||0,
        snapshotUrl:(c.additionalProperties?.find(p=>p.key==='imageUrl')?.value)||'',
        status:'live',isLive:true,country:'GB',city:'London'}));
    }catch(e){return[]}
  }
}
