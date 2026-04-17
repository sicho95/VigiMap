// ============================================================
// StreamPlayer.js — v2.1
// Corrections :
//   - Bloc 'local' : <video> natif, pas de setInterval → stop erreurs blob Firefox
//   - Bloc HLS : détection élargie + fallback sur streamType:'hls'
//     → gère les URLs Invidious /api/manifest/hls_variant/...index.m3u8
//   - hls.js chargé dynamiquement si pas encore global (CDN fallback)
//   - destroy() révoque le blob URL des fichiers locaux
// ============================================================

// URL CDN hls.js — utilisée si Hls n'est pas déjà global (chargé via <script> dans index.html)
const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';

// Charge hls.js dynamiquement si besoin, retourne la classe Hls
function loadHls() {
  if (typeof Hls !== 'undefined') return Promise.resolve(Hls);
  return new Promise((resolve, reject) => {
    const s  = document.createElement('script');
    s.src    = HLS_CDN;
    s.onload = () => resolve(Hls);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Détecte si une URL est un flux HLS (m3u8)
// Gère : .m3u8, hls_variant, manifest, /videoplayback (Invidious), googlevideo
function isHlsUrl(url, streamType) {
  if (streamType === 'hls') return true; // flag explicite du proxy
  const u = url.toLowerCase();
  return (
    u.includes('.m3u8')       ||  // extension standard
    u.includes('hls_variant') ||  // Invidious manifest
    u.includes('hls_playlist')||  // variante Invidious
    u.includes('manifest')    ||  // générique
    u.includes('googlevideo') ||  // YouTube direct
    u.includes('videoplayback')   // Invidious /videoplayback proxié
  );
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
    const el     = document.createElement('div');
    el.className = 'stream-player';

    const cvLabel = this.cam.cvEnabled
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
              id="sp-cv-${this.cam.id}"></canvas>
    `;

    el.querySelector('[data-close]').onclick = () => {
      this.destroy();
      this.onClose?.();
    };

    return el;
  }

  play() {
    const wrap = this.el.querySelector('.stream-player__media');
    const url  = this.cam.streamUrl || this.cam.snapshotUrl;

    if (!url) {
      wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">Aucun flux</span>`;
      return;
    }

    // ── 🎬 FICHIER LOCAL (import vidéo depuis disque) ──────────────
    // blob URL dans le même document → Firefox OK sur <video> natif.
    // Pas de setInterval → zéro erreur "blob cross-context" en boucle.
    if (this.cam.streamType === 'local') {
      const v         = document.createElement('video');
      v.style.cssText = 'width:100%;max-height:200px;background:#000';
      v.muted         = true;
      v.controls      = true;
      v.loop          = true;
      v.src           = url;
      v.play().catch(() => {});
      wrap.appendChild(v);
      return;
    }

    // ── 📡 HLS / m3u8 (YouTube live via Invidious, RTSP-HLS, etc.) ─
    // Détection large : streamType:'hls' OU patterns dans l'URL
    if (isHlsUrl(url, this.cam.streamType)) {
      const v         = document.createElement('video');
      v.style.cssText = 'width:100%;max-height:200px;background:#000';
      v.muted         = true;
      v.controls      = true;

      // Indicateur de chargement le temps que hls.js se charge
      wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">⏳ Chargement flux…</span>`;

      loadHls().then(HlsClass => {
        wrap.innerHTML = ''; // enlever le spinner

        if (HlsClass.isSupported()) {
          // hls.js (Chrome, Firefox, Edge…)
          this._hls = new HlsClass({
            enableWorker:   true,
            lowLatencyMode: true,
            // Timeout plus long pour les flux Invidious (VPS parfois lents)
            manifestLoadingTimeOut:  15000,
            levelLoadingTimeOut:     15000,
            fragLoadingTimeOut:      20000,
          });
          this._hls.loadSource(url);
          this._hls.attachMedia(v);
          this._hls.on(HlsClass.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
          this._hls.on(HlsClass.Events.ERROR, (_, data) => {
            if (data.fatal) {
              console.warn('[StreamPlayer] HLS fatal error:', data.type, data.details);
              wrap.innerHTML = `<span style="color:#f85149;font-size:11px;padding:8px">❌ Erreur flux HLS — ${data.details}</span>`;
            }
          });
          wrap.appendChild(v);

        } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari — HLS natif
          v.src = url;
          v.play().catch(() => {});
          wrap.appendChild(v);

        } else {
          wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">HLS non supporté par ce navigateur</span>`;
        }
      }).catch(() => {
        wrap.innerHTML = `<span style="color:#f85149;font-size:11px;padding:8px">❌ Impossible de charger hls.js</span>`;
      });

      return;
    }

    // ── 🎥 YouTube EMBED (iframe — CV aveugle mais affichage OK) ───
    // Utilisé quand streamUrl est une URL youtube.com directe (bibliothèque)
    const ytId = this._ytId(url);
    if (ytId) {
      const ifr           = document.createElement('iframe');
      ifr.src             = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=1`;
      Object.assign(ifr.style, { width: '100%', height: '200px', border: 'none' });
      ifr.allow           = 'autoplay; encrypted-media';
      ifr.allowFullscreen = true;
      wrap.appendChild(ifr);
      return;
    }

    // ── 📷 SNAPSHOT IMAGE avec refresh (MJPEG / Insecam / webcam IP) ─
    // setInterval uniquement ici — pas sur les vidéos locales ni HLS
    const img         = document.createElement('img');
    img.style.cssText = 'width:100%;max-height:200px;object-fit:cover';
    const ref         = parseInt(localStorage.getItem('vigimap_snap_refresh') || '30', 10);
    const load        = () => {
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    };
    load();
    img.onerror   = () => { img.alt = 'Flux indisponible'; };
    this._iv      = setInterval(load, ref * 1000);
    wrap.appendChild(img);
  }

  // Extrait le videoId YouTube depuis toutes les formes d'URL
  _ytId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname === 'youtu.be')          return u.pathname.slice(1).split('?')[0];
    } catch (_) {}
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  getCanvas()  { return this.el.querySelector('canvas'); }
  getVideo()   { return this.el.querySelector('video');  }
  getImg()     { return this.el.querySelector('img');    }
  getCamId()   { return this.cam.id; }

  // CV prêt si un <video> ou <img> est monté (pas iframe, pas canvas seul)
  isCvReady()  { return !!(this.el.querySelector('video') || this.el.querySelector('img')); }

  destroy() {
    this._hls?.destroy();
    clearInterval(this._iv);
    // Libérer la mémoire du blob URL pour les fichiers locaux
    if (this.cam.streamType === 'local' && this.cam.streamUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.cam.streamUrl);
    }
    this.el.remove();
  }
}
