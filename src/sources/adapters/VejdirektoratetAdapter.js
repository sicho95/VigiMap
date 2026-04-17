import{BaseAdapter}from'./BaseAdapter.js';
export class VejdirektoratetAdapter extends BaseAdapter{
  constructor(o){super({id:'vejdir_dk',name:'Vejdirektoratet DK',...o})}
  async fetchCameras(){
    try{
      const j=await this._fetch('https://api.vejdirektoratet.dk/v1/camera');
      return(j.cameras||j||[]).slice(0,200).map(c=>this.norm({
        id:'vd_'+c.cameraId,name:c.description||'VD',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.imageUrl||'',status:'live',isLive:true,country:'DK'}));
    }catch(e){return[]}
  }
}
