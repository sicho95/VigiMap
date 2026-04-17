export class StreamPlayer {
  constructor(cam) {
    this.cam     = cam;
    this.onClose = null;
    this._hls    = null;
    this._iv     = null;
    this.el      = this._build();
  }

  _build() {
    const el      = document.createElement('div');
    el.className  = 'stream-player';
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
      <canvas style="position:absolute;top:30px;left:0;pointer-events:none;width:100%;height:calc(100% - 30px)" id="sp-cv-${this.cam.id}"></canvas>
    `;

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

    // ── 🎬 FICHIER LOCAL (import vidéo depuis disque) ──────────
    // blob URL créé dans le même document → Firefox l'accepte sur <video>.
    // On NE fait PAS de setInterval ici, donc zéro erreur blob en boucle.
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

    // ── HLS / m3u8 (live stream, YouTube HLS via Invidious…) ───
    if (url.includes('.m3u8') || url.includes('hls') || url.includes('googlevideo') || url.includes('manifest')) {
      const v         = document.createElement('video');
      v.style.cssText = 'width:100%;max-height:200px;background:#000';
      v.muted         = true;
      v.controls      = true;

      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        this._hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        this._hls.loadSource(url);
        this._hls.attachMedia(v);
        this._hls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
      } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari — HLS natif
        v.src = url;
        v.play().catch(() => {});
      } else {
        wrap.innerHTML = `<span style="color:var(--text-3);font-size:11px;padding:8px">HLS non supporté</span>`;
        return;
      }
      wrap.appendChild(v);
      return;
    }

    // ── YouTube embed (iframe — CV aveugle mais affichage OK) ───
    const ytId = this._ytId(url);
    if (ytId) {
      const ifr          = document.createElement('iframe');
      ifr.src            = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=1`;
      Object.assign(ifr.style, { width: '100%', height: '200px', border: 'none' });
      ifr.allow          = 'autoplay; encrypted-media';
      ifr.allowFullscreen = true;
      wrap.appendChild(ifr);
      return;
    }

    // ── Snapshot image avec refresh (MJPEG / Insecam / webcam IP) ──
    // setInterval uniquement ici, pas sur les vidéos locales
    const img       = document.createElement('img');
    img.style.cssText = 'width:100%;max-height:200px;object-fit:cover';
    const ref       = parseInt(localStorage.getItem('vigimap_snap_refresh') || '30', 10);
    const load      = () => { img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(); };
    load();
    img.onerror     = () => { img.alt = 'Flux indisponible'; };
    this._iv        = setInterval(load, ref * 1000);
    wrap.appendChild(img);
  }

  _ytId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname === 'youtu.be')          return u.pathname.slice(1);
    } catch (_) {
      const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      return m ? m[1] : null;
    }
    return null;
  }

  getCanvas()  { return this.el.querySelector('canvas'); }
  getVideo()   { return this.el.querySelector('video');  }
  getImg()     { return this.el.querySelector('img');    }
  getCamId()   { return this.cam.id; }
  isCvReady()  { return !!(this.el.querySelector('video') || this.el.querySelector('img')); }

  destroy() {
    this._hls?.destroy();
    clearInterval(this._iv);
    // Révoquer le blob URL si c'était un fichier local (libère la mémoire)
    if (this.cam.streamType === 'local' && this.cam.streamUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.cam.streamUrl);
    }
    this.el.remove();
  }
}
