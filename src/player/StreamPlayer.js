// ============================================================
// StreamPlayer.js — v2.2
// Corrections :
//   - Bloc 'local' : <video> natif, pas de setInterval → stop erreurs blob Firefox
//   - Bloc HLS : détection élargie + fallback sur streamType:'hls'
//     → gère les URLs Invidious /api/manifest/hls_variant/...index.m3u8
//   - hls.js chargé dynamiquement si pas encore global (CDN fallback)
//   - destroy() révoque le blob URL des fichiers locaux
// ============================================================

const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';

function loadHls() {
  if (typeof Hls !== 'undefined') return Promise.resolve(Hls);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = HLS_CDN; s.onload = () => resolve(Hls); s.onerror = reject;
    document.head.appendChild(s);
  });
}

function isHlsUrl(url, streamType) {
  if (streamType === 'hls') return true;
  const u = url.toLowerCase();
  return u.includes('.m3u8') || u.includes('hls_variant') ||
         u.includes('hls_playlist') || u.includes('manifest') ||
         u.includes('googlevideo')  || u.includes('videoplayback');
}

export class StreamPlayer {
  constructor(cam) {
    this.cam     = cam;
    this.onClose = null;
    this._hls    = null;
    this._iv     = null;
    this.el      = this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.className = 'stream-player';

    // ✅ FIX : streamType==='local' est toujours CV-capable (vidéo dans le DOM)
    // cvEnabled peut être explicitement false pour forcer iframe
    const isCvCapable = this.cam.streamType === 'local' || this.cam.cvEnabled === true;
    const cvLabel = isCvCapable
      ? `<span class="badge" style="background:rgba(63,185,80,.2);color:#3fb950;font-size:9px">CV ✓</span>`
      : `<span class="badge" style="background:rgba(248,81,73,.1);color:#f85149;font-size:9px">CV iframe</span>`;

    el.innerHTML = `
      <div class="stream-player__header">
        <span class="stream-player__title" title="${this.cam.name}">${this.cam.name}</span>
        <span class="badge badge--${this.cam.status || 'unknown'}">${this.cam.status || ''}</span>
        ${cvLabel}
        <button class="btn btn--ghost btn--sm" data-close style="margin-left:auto">✕</button>
      </div>
      <div class="stream-player__media" id="sp-media-${this.cam.id}"></div>
      <canvas style="position:absolute;top:30px;left:0;pointer-events:none;width:100%;height:calc(100% - 30px)"
              id="sp-cv-${this.cam.id}"></canvas>`;
    el.querySelector('[data-close]').onclick = () => { this.destroy(); this.onClose?.(); };
    return el;
  }

  play() {
    const wrap = this.el.querySelector('.stream-player__media');
    const url  = this.cam.streamUrl || this.cam.snapshotUrl;
    if (!url) {
      wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">Aucun flux</span>`;
      return;
    }

    // ── Fichier local (blob URL)
    if (this.cam.streamType === 'local') {
      const v = document.createElement('video');
      v.style.cssText = 'width:100%;max-height:200px;background:#000';
      v.muted    = true;
      v.controls = true;
      // ✅ FIX loop : PAS de loop par défaut sur les fichiers importés
      // VideoImporter.js gère lui-même play/pause autour de l'analyse
      v.loop = false;
      v.src  = url;
      v.play().catch(() => {});
      wrap.appendChild(v);
      return;
    }

    // ── HLS / m3u8
    if (isHlsUrl(url, this.cam.streamType)) {
      const safeUrl = url.replace(/^http:\/\//i, 'https://');

      const proxyBase = (() => {
        try {
          return (JSON.parse(localStorage.getItem('vigimap_settings') || '{}')).proxyUrl || '';
        } catch (_) { return ''; }
      })().trim().replace(/\/$/, '');

      wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">⏳ Chargement flux…</span>`;

      loadHls().then(HlsClass => {
        wrap.innerHTML = '';
        const v = document.createElement('video');
        v.style.cssText = 'width:100%;max-height:200px;background:#000';
        v.muted = true; v.controls = true;

        if (HlsClass.isSupported()) {
          const hlsConfig = {
            enableWorker: true, lowLatencyMode: true,
            manifestLoadingTimeOut: 15000,
            levelLoadingTimeOut:    15000,
            fragLoadingTimeOut:     20000,
          };
          if (proxyBase) {
            hlsConfig.xhrSetup = (xhr, reqUrl) => {
              if (!reqUrl.includes(proxyBase))
                xhr.open('GET', `${proxyBase}/?url=${encodeURIComponent(reqUrl)}`, true);
            };
          }
          this._hls = new HlsClass(hlsConfig);
          this._hls.loadSource(safeUrl);
          this._hls.attachMedia(v);
          this._hls.on(HlsClass.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
          this._hls.on(HlsClass.Events.ERROR, (_, data) => {
            if (data.fatal) {
              console.warn('[StreamPlayer] HLS fatal error:', data.type, data.details);
              wrap.innerHTML = `<span style="color:#f85149;font-size:11px;padding:8px">❌ Erreur flux — ${data.details}</span>`;
            }
          });
          wrap.appendChild(v);
        } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
          v.src = safeUrl; v.play().catch(() => {});
          wrap.appendChild(v);
        } else {
          wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">HLS non supporté</span>`;
        }
      }).catch(() => {
        wrap.innerHTML = `<span style="color:#f85149;font-size:11px;padding:8px">❌ Impossible de charger hls.js</span>`;
      });
      return;
    }

    // ── YouTube embed (iframe — pas de CV possible)
    const ytId = this._ytId(url);
    if (ytId) {
      const ifr = document.createElement('iframe');
      ifr.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=1`;
      Object.assign(ifr.style, { width: '100%', height: '200px', border: 'none' });
      ifr.allow = 'autoplay; encrypted-media';
      ifr.allowFullscreen = true;
      wrap.appendChild(ifr);
      return;
    }

    // ── Snapshot image avec refresh (MJPEG / Insecam)
    const img = document.createElement('img');
    img.style.cssText = 'width:100%;max-height:200px;object-fit:cover';
    const ref  = parseInt(localStorage.getItem('vigimap_snap_refresh') || '30', 10);
    const load = () => { img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(); };
    load();
    img.onerror = () => { img.alt = 'Flux indisponible'; };
    this._iv    = setInterval(load, ref * 1000);
    wrap.appendChild(img);
  }

  _ytId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    } catch (_) {}
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  getCanvas()  { return this.el.querySelector('canvas'); }
  getVideo()   { return this.el.querySelector('video'); }
  getImg()     { return this.el.querySelector('img'); }
  getCamId()   { return this.cam.id; }
  isCvReady()  { return !!(this.el.querySelector('video') || this.el.querySelector('img')); }

  destroy() {
    this._hls?.destroy();
    clearInterval(this._iv);
    if (this.cam.streamType === 'local' && this.cam.streamUrl?.startsWith('blob:'))
      URL.revokeObjectURL(this.cam.streamUrl);
    this.el.remove();
  }
}
