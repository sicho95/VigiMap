export class StreamPlayer{
  constructor(cam){this.cam=cam;this.onClose=null;this._hls=null;this._iv=null;this.el=this._build()}
  _build(){
    const el=document.createElement('div');el.className='stream-player';
    el.innerHTML=`<div class="stream-player__header">
      <span class="stream-player__title">${this.cam.name}</span>
      <span class="badge badge--${this.cam.status||'unknown'}">${this.cam.status||'?'}</span>
      ${this.cam.sourceId==='local'?'<span class="badge badge--delayed">LOCAL</span>':''}
      <button class="btn btn--ghost btn--sm" data-close style="margin-left:auto">✕</button>
    </div>
    <div class="stream-player__media" id="sp-media-${this.cam.id}"></div>
    <canvas style="position:absolute;top:30px;left:0;pointer-events:none;width:100%;height:calc(100% - 30px)" id="sp-cv-${this.cam.id}"></canvas>`;
    el.querySelector('[data-close]').onclick=()=>{this.destroy();this.onClose?.()};
    return el;
  }
  play(){
    const wrap=this.el.querySelector('.stream-player__media');
    const url=this.cam.streamUrl||this.cam.snapshotUrl;
    if(!url){wrap.innerHTML='<span style="color:var(--text-3);font-size:11px;padding:8px">Aucun flux</span>';return}
    if(this.cam.streamType==='local'||url.startsWith('blob:')){
      const v=document.createElement('video');v.controls=true;v.src=url;
      v.style.cssText='width:100%;max-height:200px';wrap.appendChild(v);
    }else if(url.includes('.m3u8')||url.includes('hls')){
      const v=document.createElement('video');v.style.cssText='width:100%;max-height:200px';
      if(typeof Hls!=='undefined'&&Hls.isSupported()){this._hls=new Hls();this._hls.loadSource(url);this._hls.attachMedia(v)}
      else if(v.canPlayType('application/vnd.apple.mpegurl'))v.src=url;
      v.play().catch(()=>{});wrap.appendChild(v);
    }else{
      const img=document.createElement('img');img.style.cssText='width:100%;max-height:200px;object-fit:cover';
      const load=()=>{img.src=url+'?t='+Date.now()};load();
      img.onerror=()=>{img.alt='Flux indisponible'};
      const ref=Number(localStorage.getItem('vigimap_snaprefresh'))||30;
      this._iv=setInterval(load,ref*1000);
      wrap.appendChild(img);
    }
  }
  getCanvas(){return this.el.querySelector('canvas')}
  getVideo(){return this.el.querySelector('video')}
  getImg(){return this.el.querySelector('img')}
  getCamId(){return this.cam.id}
  destroy(){this._hls?.destroy();clearInterval(this._iv);this.el.remove()}
}
