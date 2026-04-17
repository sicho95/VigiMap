export class CVEngine{
  constructor(onMatch){this._om=onMatch;this._active=new Map();this._tf=null;this._model=null;this._faceApi=null;this._faceRefs=new Map()}
  async _loadTF(){
    if(this._tf)return;
    try{this._tf=window.tf;this._model=await window.cocoSsd?.load?.()}
    catch(e){console.warn('[CV] TF/COCO non disponible:',e.message)}
  }
  async start(player,queries){
    if(!player||!queries?.length)return;
    const id=player.getCamId();if(this._active.has(id))return;
    await this._loadTF();
    const iv=setInterval(async()=>{
      const qs=queries.filter(q=>q.enabled!==false);
      if(!qs.length){clearInterval(iv);this._active.delete(id);return}
      await this._runFrame(player,qs);
    },4000);
    this._active.set(id,iv);
  }
  stopAll(){for(const iv of this._active.values())clearInterval(iv);this._active.clear()}
  stop(id){const iv=this._active.get(id);if(iv){clearInterval(iv);this._active.delete(id)}}
  async _runFrame(player,queries){
    const vid=player.getVideo();const img=player.getImg();
    const source=vid||img;if(!source)return;
    const canvas=player.getCanvas();
    if(canvas){canvas.width=source.videoWidth||source.naturalWidth||320;canvas.height=source.videoHeight||source.naturalHeight||240}
    for(const q of queries){
      const r=await this._evalQuery(source,canvas,q);
      if(r&&r.globalScore>=(q.confidenceThreshold||0.7)){
        let frame=null;
        if(q.captureFrameOnMatch!==false&&canvas){try{frame=canvas.toDataURL('image/jpeg',0.7)}catch(_){}}
        await this._om?.(player.getCamId(),q,r,frame);
      }
    }
  }
  async _evalQuery(source,canvas,q){
    if(!q.criteria?.length)return null;
    let scores=[];
    for(const c of q.criteria){
      const s=await this._evalCriterion(source,canvas,c);
      if(s===null)return null;
      scores.push(s);
    }
    const global=scores.reduce((a,b)=>a+b,0)/scores.length;
    return{globalScore:global,matchDetails:scores.map((s,i)=>({criterion:q.criteria[i],score:s}))};
  }
  async _evalCriterion(source,canvas,c){
    if(c.type==='object')return this._detectObject(source,c);
    if(c.type==='face')return this._detectFace(source,canvas,c);
    return 0.5;
  }
  async _detectObject(source,c){
    if(!this._model)return 0.5;
    try{
      const preds=await this._model.detect(source);
      const found=preds.filter(p=>p.class===c.value&&p.score>=(c.confidence||0.5));
      return found.length?Math.max(...found.map(p=>p.score)):0;
    }catch(e){return 0}
  }
  async _detectFace(source,canvas,c){
    if(!window.faceapi)return 0.5;
    try{
      const det=await window.faceapi.detectAllFaces(source).withFaceLandmarks().withFaceDescriptors();
      if(!det.length)return 0;
      if(!c.refId)return det.length>0?0.9:0;
      const ref=this._faceRefs.get(c.refId);if(!ref)return 0.5;
      const dist=Math.min(...det.map(d=>window.faceapi.euclideanDistance(d.descriptor,ref)));
      return Math.max(0,1-(dist/(c.distance||0.6)));
    }catch(e){return 0}
  }
  async addFaceRef(id,img){
    if(!window.faceapi)return false;
    try{
      const det=await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if(!det)return false;
      this._faceRefs.set(id,det.descriptor);return true;
    }catch(e){return false}
  }
  async analyzeOnce(player,queries){
    await this._loadTF();
    const vid=player?.getVideo();const img=player?.getImg();
    const src=vid||img;if(!src)return null;
    const canvas=player.getCanvas();
    if(!queries?.length)return{objects:[],globalScore:0};
    for(const q of queries){const r=await this._evalQuery(src,canvas,q);if(r)return r}
    return null;
  }
  async analyzeImage(img,queries){
    await this._loadTF();
    for(const q of queries){const r=await this._evalQuery(img,null,q);if(r&&r.globalScore>=(q.confidenceThreshold||0.7))return{...r,query:q}}
    return null;
  }
}
