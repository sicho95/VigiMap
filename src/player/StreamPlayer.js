// Gere un lecteur de flux individuel dans la grille
import { getSetting } from '../settings/SettingsManager.js';

// Associe chaque type de flux a sa fonction de rendu
const RENDERERS = { hls:renderHls, mjpeg:renderMjpeg, snapshot:renderSnapshot, embed:renderEmbed };

export class StreamPlayer {
  constructor(camera, onClose, onUnpin) {
    this._cam=camera; this._onClose=onClose; this._onUnpin=onUnpin;
    this._el=null; this._media=null; this._overlay=null;
    this._timer=null; this._hls=null;
  }

  // Construit et retourne le DOM du player
  render() {
    this._el=document.createElement('div');
    this._el.className='stream-player'; this._el.dataset.id=this._cam.id;
    this._el.innerHTML=`
      <div class="stream-player__header">
        <span class="stream-player__name" title="${this._cam.name}">${this._cam.name}</span>
        <span class="badge badge--${this._cam.status}">${this._statusLabel()}</span>
        <div class="stream-player__actions">
          <button title="Plein ecran" data-a="fs">&#9974;</button>
          <button title="Depingler"   data-a="unpin">&#128204;</button>
          <button title="Fermer"      data-a="close">&#10005;</button>
        </div>
      </div>
      <div class="stream-player__media" id="med_${this._cam.id}"></div>
      <div class="stream-player__ts"    id="ts_${this._cam.id}"></div>
    `;
    this._el.addEventListener('click', e => {
      const a=e.target.dataset.a;
      if (a==='close') this._onClose(this._cam.id);
      if (a==='unpin') this._onUnpin(this._cam.id);
      if (a==='fs')    this._fs();
    });
    this._load();
    return this._el;
  }

  // Charge le rendu media selon le type de flux detecte
  _load() {
    const wrap = this._el.querySelector(`#med_${this._cam.id}`);
    const fn   = RENDERERS[this._cam.streamType]||renderSnapshot;
    const {media,overlay} = fn(this._cam, this);
    if (media)   { wrap.appendChild(media); this._media=media; }
    if (overlay) { wrap.appendChild(overlay); this._overlay=overlay; }
    this._tick();
  }

  // Retourne la frame courante encodee en JPEG base64
  captureFrame() {
    if (!this._media) return null;
    const q=getSetting('jpegQuality');
    const w=this._media.videoWidth||this._media.naturalWidth||320;
    const h=this._media.videoHeight||this._media.naturalHeight||240;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d').drawImage(this._media,0,0,w,h);
    return c.toDataURL('image/jpeg',q);
  }

  // Retourne l'element media pour le pipeline CV
  getMedia()   { return this._media; }
  // Retourne le canvas d'overlay pour les bounding boxes
  getOverlay() { return this._overlay; }

  // Met a jour l'affichage du timestamp du flux
  _tick() {
    const el=this._el?.querySelector(`#ts_${this._cam.id}`); if (!el) return;
    if (this._cam.isLive) { el.textContent='● Live'; return; }
    if (this._cam.lastSeen) {
      const ago=Math.round((Date.now()-new Date(this._cam.lastSeen))/60000);
      el.textContent=`Snapshot · il y a ${ago} min · ${new Date(this._cam.lastSeen).toLocaleTimeString('fr-FR')}`;
    } else { el.textContent='Image differee'; }
  }

  // Bascule le player en plein ecran natif
  _fs() { document.fullscreenElement ? document.exitFullscreen() : this._el.requestFullscreen?.(); }

  // Retourne le libelle de statut affiche dans le badge
  _statusLabel() { return {live:'Live',delayed:'Differe',offline:'Hors ligne',match:'Match'}[this._cam.status]||'—'; }

  // Libere toutes les ressources du player
  destroy() { clearInterval(this._timer); this._hls?.destroy(); this._el?.remove(); }
}

// ── Fonctions de rendu ─────────────────────────────────────────────────────────

// Cree le canvas d'overlay transparent pour les dessins CV
function mkOverlay() {
  const c=document.createElement('canvas'); c.className='stream-player__overlay'; return c;
}

// Construit l'URL en l'encapsulant dans le proxy si configure
function px(url) {
  try { const p=JSON.parse(localStorage.getItem('vigimap_settings')||'{}').proxyUrl||''; return p?p+encodeURIComponent(url):url; }
  catch { return url; }
}

// Initialise un lecteur HLS via hls.js ou la lecture native Safari
function renderHls(cam, player) {
  const v=document.createElement('video'); v.autoplay=true; v.muted=true; v.controls=false;
  const url=px(cam.streamUrl);
  if (window.Hls?.isSupported()) {
    const h=new window.Hls(); h.loadSource(url); h.attachMedia(v); player._hls=h;
  } else if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src=url; }
  return {media:v, overlay:mkOverlay()};
}

// Affiche un flux MJPEG dans une balise img
function renderMjpeg(cam) {
  const img=document.createElement('img'); img.alt=cam.name; img.src=px(cam.streamUrl);
  img.onerror=()=>{ img.src='assets/no-signal.svg'; };
  return {media:img, overlay:mkOverlay()};
}

// Rafraichit periodiquement une image snapshot JPEG
function renderSnapshot(cam, player) {
  const img=document.createElement('img'); img.alt=cam.name;
  const url=cam.snapshotUrl||cam.streamUrl;
  const refresh=()=>{
    img.src=px(url)+(url?.includes('?')?'&':'?')+'_t='+Date.now();
    player._tick?.();
  };
  refresh();
  player._timer=setInterval(refresh, getSetting('snapshotRefreshMs'));
  img.onerror=()=>{ img.src='assets/no-signal.svg'; };
  return {media:img, overlay:mkOverlay()};
}

// Integre un flux externe dans une iframe (YouTube Live, etc.)
function renderEmbed(cam) {
  const f=document.createElement('iframe'); f.src=cam.streamUrl; f.allow='autoplay;fullscreen';
  f.style.cssText='width:100%;height:100%;border:0;';
  return {media:f, overlay:null};
}
