export class VideoImporter{
  constructor(grid,cv,getQ,onMatch){this._g=grid;this._cv=cv;this._gq=getQ;this._om=onMatch}
  run(){
    const vf=[...(document.getElementById('import-video')?.files||[])];
    const pf=[...(document.getElementById('import-photo')?.files||[])];
    if(!vf.length&&!pf.length){alert('Sélectionnez au moins un fichier.');return}
    vf.forEach(f=>this._loadVid(f));
    if(pf.length)this._analyzePhotos(pf);
  }
  _loadVid(file){
    const id='local_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const url=URL.createObjectURL(file);
    const cam={id,name:file.name,sourceId:'local',lat:0,lng:0,streamUrl:url,snapshotUrl:'',
      isLive:false,status:'live',country:'',city:'',tags:['local'],streamType:'local'};
    this._g.pin(cam);
    setTimeout(()=>this._cv?.start(this._g.getPlayer(id),this._gq()),600);
  }
  async _analyzePhotos(files){
    const q=this._gq();
    if(!q.length){alert('Créez d\'abord une requête CV.');return}
    for(const f of files){
      const img=await this._fi2img(f);
      const r=await this._cv?.analyzeImage(img,q);
      if(r)await this._om('photo_'+Date.now(),r.query,r,null);
    }
  }
  _fi2img(f){return new Promise(ok=>{const u=URL.createObjectURL(f);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.src=u})}
}
