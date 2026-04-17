export class StreamPlayer{
  constructor(cam){this.cam=cam;this.onClose=null;this._hls=null;this._iv=null;this.el=this._build()}

  _build(){
    const el=document.createElement('div');el.className='stream-player';
    el.innerHTML=`
      <div class="stream-player__header">
        <span class="stream-player__title" title="${this.cam.name}">${this.cam.name}</span>
        <span class="badge badge--${this.cam.status||'unknown'}">${this.cam.status||'?'}</span>
        ${this.cam.sourceId==='local'?'<span class="badge badge--delayed">LOCAL</span>':''}
        ${this.cam.sourceId==='youtube'?'<span class="badge" style="background:rgba(255,0,0,.18);color:#ff4444">YT</span>':''}
        <button class="btn btn--ghost btn--sm" data-close style="margin-left:auto">✕</button>
      </div>
      <div class="stream-player__media" id="sp-media-${this.cam.id}"></div>
      <canvas style="position:absolute;top:30px;left:0;pointer-events:none;width:100%;height:calc(100% - 30px)"
        id="sp-cv-${this.cam.id}"></canvas>`;
    el.querySelector('[data-close]').onclick=()=>{this.destroy();this.onClose?.()};
    return el;
  }

  play(){
    const wrap=this.el.querySelector('.stream-player__media');
    const url=this.cam.streamUrl||this.cam.snapshotUrl;
    if(!url){wrap.innerHTML='<span style="color:var(--text-3);font-size:11px;padding:8px">Aucun flux disponible</span>';return}

    // ── YouTube embed ──────────────────────────────────────────────────────
    const ytId=this._ytId(url);
    if(ytId){
      const ifr=document.createElement('iframe');
      ifr.src=`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=1`;
      Object.assign(ifr.style,{width:'100%',height:'200px',border:'none'});
      ifr.allow='autoplay;encrypted-media';ifr.allowFullscreen=true;
      wrap.appendChild(ifr);return;
    }

    // ── Fichier local / blob ───────────────────────────────────────────────
    if(this.cam.streamType==='local'||url.startsWith('blob:')){
      const v=document.createElement('video');v.controls=true;v.src=url;
      v.style.cssText='width:100%;max-height:200px';wrap.appendChild(v);return;
    }

    // ── HLS m3u8 ──────────────────────────────────────────────────────────
    if(url.includes('.m3u8')||url.includes('/hls/')){
      const v=document.createElement('video');v.style.cssText='width:100%;max-height:200px';
      if(typeof Hls!=='undefined'&&Hls.isSupported()){
        this._hls=new Hls();this._hls.loadSource(url);this._hls.attachMedia(v);
      }else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=url}
      else{wrap.innerHTML='<span style="color:var(--text-3);font-size:11px;padding:8px">HLS non supporté</span>';return}
      v.muted=true;v.play().catch(()=>{});wrap.appendChild(v);return;
    }

    // ── Snapshot image avec refresh ───────────────────────────────────────
    const img=document.createElement('img');
    img.style.cssText='width:100%;max-height:200px;object-fit:cover';
    const ref=+(localStorage.getItem('vigimap_snaprefresh')||'30');
    const load=()=>{img.src=url+(url.includes('?')?'&':'?')+'_t='+Date.now()};
    load();img.onerror=()=>{img.alt='Flux indisponible'};
    this._iv=setInterval(load,ref*1000);
    wrap.appendChild(img);
  }

  // ── Détecte et extrait l'ID YouTube depuis n'importe quelle URL YT ──────
  _ytId(url){
    try{
      const u=new URL(url);
      if(u.hostname.includes('youtube.com'))return u.searchParams.get('v');
      if(u.hostname==='youtu.be')return u.pathname.slice(1);
    }catch(_){}
    const m=url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m?m[1]:null;
  }

  getCanvas(){return this.el.querySelector('canvas')}
  getVideo(){return this.el.querySelector('video')}
  getImg(){return this.el.querySelector('img')}
  getCamId(){return this.cam.id}

  destroy(){this._hls?.destroy();clearInterval(this._iv);this.el.remove()}
}
