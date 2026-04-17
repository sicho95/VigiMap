import{BaseAdapter}from'./BaseAdapter.js';
export class TflAdapter extends BaseAdapter{
  constructor(o){super({id:'tfl',name:'TfL Londres',...o})}
  async fetchCameras(){
    try{
      // Endpoint 2024 correct
      const j=await this._fetch('https://api.tfl.gov.uk/Place?type=JamCam');
      const arr=Array.isArray(j)?j:(j.Place||j.places||[]);
      return arr.slice(0,500).map(c=>{
        const imgProp=c.additionalProperties?.find(p=>p.key==='imageUrl')||
                      c.additionalProperties?.find(p=>p.key==='Camera_imageUrl');
        return this.norm({id:'tfl_'+c.id,name:c.commonName||'TfL',
          lat:+c.lat||0,lng:+c.lon||0,
          snapshotUrl:imgProp?.value||'',
          status:'live',isLive:true,country:'GB',city:'London'});
      });
    }catch(e){console.warn('[VigiMap] TfL:',e.message);return[]}
  }
}
