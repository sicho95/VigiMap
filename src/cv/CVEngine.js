// CVEngine.js — v2.1
// FIX: alias addFaceRef() -> registerFaceDescriptor() (appelé par QueryEditor)
// FIX: analyzeImage() pour photos importées
// FIX: analyzeOnce() avec capture frameB64

const TFJS_CDN    = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';
const COCOSD_CDN  = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
const FACEAPI_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

const MODELS_LOCAL = '/VigiMap/models';
const MODELS_CDN   = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export class CVEngine {
  constructor(onMatch) {
    this.onMatch    = onMatch;
    this._ready     = false;
    this._cocoSsd   = null;
    this._faceReady = false;
    this._players   = new Map(); // camId → { player, queries, interval }
    this._refFaces  = new Map(); // queryId → Float32Array descriptor
    this._init();
  }

  async _init() {
    if (!window.tf)      await _loadScript(TFJS_CDN);
    if (!window.cocoSsd) await _loadScript(COCOSD_CDN);
    if (!window.faceapi) await _loadScript(FACEAPI_CDN);
    await tf.ready();

    try {
      this._cocoSsd = await cocoSsd.load();
      console.log('[CVEngine] COCO-SSD OK');
    } catch (e) { console.warn('[CVEngine] COCO-SSD:', e.message); }

    await this._loadFaceModels();
    this._ready = true;
    console.log('[CVEngine] Prêt. Face-api:', this._faceReady);
  }

  async _loadFaceModels() {
    for (const base of [MODELS_LOCAL, MODELS_CDN]) {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(base),
          faceapi.nets.faceLandmark68Net.loadFromUri(base),
          faceapi.nets.faceRecognitionNet.loadFromUri(base),
        ]);
        this._faceReady = true;
        console.log('[CVEngine] face-api models chargés depuis', base);
        return;
      } catch (e) {
        console.warn('[CVEngine] face-api models depuis', base, ':', e.message);
      }
    }
    console.error('[CVEngine] Impossible de charger les modèles face-api');
  }

  // ── Enregistrer un visage de référence ──────────────────────────────────────
  async registerFaceDescriptor(queryId, imageEl) {
    if (!this._faceReady)
      throw new Error('Modèles face-api non chargés. Vérifiez /models/ ou la connexion CDN.');
    const det = await faceapi
      .detectSingleFace(imageEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!det)
      throw new Error('Aucun visage détecté sur la photo de référence. Photo nette, de face, bien éclairée.');
    this._refFaces.set(queryId, det.descriptor);
    return det;
  }

  // ── ALIAS — QueryEditor appelle cv.addFaceRef(), on redirige ────────────────
  async addFaceRef(queryId, imageEl) {
    return this.registerFaceDescriptor(queryId, imageEl);
  }

  // ── Analyser une image statique (photo importée depuis VideoImporter) ────────
  async analyzeImage(imageEl, queries) {
    if (!this._ready) return null;
    const canvas  = document.createElement('canvas');
    canvas.width  = imageEl.naturalWidth  || imageEl.width  || 640;
    canvas.height = imageEl.naturalHeight || imageEl.height || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

    const results = [];
    for (const q of queries) {
      const r = await this._matchQuery(canvas, ctx, q);
      if (r.matched) results.push({ query: q, result: r });
    }
    if (!results.length) return null;
    const best     = results[0];
    const frameB64 = canvas.toDataURL('image/jpeg', 0.7);
    this.onMatch?.('photo_' + Date.now(), best.query, best.result, frameB64);
    return best.result;
  }

  // ── Analyser une frame depuis un StreamPlayer ────────────────────────────────
  async _analyzeFrame(player, queries) {
    if (!this._ready) return null;
    const video  = player.getVideo();
    const img    = player.getImg();
    const canvas = player.getCanvas();
    const source = video || img;
    if (!source || !canvas) return null;

    canvas.width  = source.videoWidth  || source.naturalWidth  || source.clientWidth  || 640;
    canvas.height = source.videoHeight || source.naturalHeight || source.clientHeight || 480;
    const ctx = canvas.getContext('2d');
    try { ctx.drawImage(source, 0, 0, canvas.width, canvas.height); }
    catch (e) { return null; } // CORS → skip silencieux

    const results = [];
    for (const q of queries) {
      const r = await this._matchQuery(canvas, ctx, q);
      if (r.matched) results.push({ query: q, result: r });
    }
    return results;
  }

  async _matchQuery(canvas, ctx, query) {
    const matched = { matched: false, globalScore: 0, matchDetails: [] };

    // Objets COCO-SSD
    if (query.type === 'object' && this._cocoSsd) {
      const preds = await this._cocoSsd.detect(canvas);
      for (const p of preds) {
        if (!query.objectClasses?.some(c => p.class.toLowerCase().includes(c.toLowerCase()))) continue;
        if (p.score < (query.minConfidence || 0.4)) continue;
        if (query.colorFilter) {
          const roi = ctx.getImageData(p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]);
          if (!_checkColor(roi.data, query.colorFilter, query.colorTolerance || 80)) continue;
        }
        matched.matched = true;
        matched.globalScore = Math.max(matched.globalScore, p.score);
        matched.matchDetails.push({ class: p.class, score: p.score, bbox: p.bbox });
      }
    }

    // Reconnaissance faciale
    if (query.type === 'face' && this._faceReady && this._refFaces.has(query.id)) {
      const refDesc    = this._refFaces.get(query.id);
      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      for (const d of detections) {
        const dist = faceapi.euclideanDistance(refDesc, d.descriptor);
        const sim  = 1 - Math.min(dist, 1);
        if (sim >= (query.minSimilarity || 0.5)) {
          matched.matched = true;
          matched.globalScore = Math.max(matched.globalScore, sim);
          matched.matchDetails.push({ similarity: sim, distance: dist, box: d.detection.box });
          _drawFaceBox(canvas.getContext('2d'), d.detection.box, sim, query.name);
        }
      }
    }

    return matched;
  }

  // ── API publique ─────────────────────────────────────────────────────────────
  async start(player, queries) {
    const id = player.getCamId();
    this.stop(id);
    const interval = setInterval(async () => {
      const results = await this._analyzeFrame(player, queries);
      if (!results) return;
      for (const { query, result } of results) {
        this.onMatch?.(id, query, result, null);
      }
    }, 2000);
    this._players.set(id, { player, queries, interval });
  }

  async analyzeOnce(player, queries) {
    const results = await this._analyzeFrame(player, queries);
    if (!results?.length) return null;
    const best     = results[0];
    const canvas   = player.getCanvas();
    const frameB64 = canvas ? canvas.toDataURL('image/jpeg', 0.7) : null;
    this.onMatch?.(player.getCamId(), best.query, best.result, frameB64);
    return best.result;
  }

  stop(camId)   { const p = this._players.get(camId); if (p) { clearInterval(p.interval); this._players.delete(camId); } }
  stopAll()     { this._players.forEach((_, id) => this.stop(id)); }
  isReady()     { return this._ready; }
  isFaceReady() { return this._faceReady; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res;
    s.onerror = () => rej(new Error('Script load failed: ' + src));
    document.head.appendChild(s);
  });
}

function _checkColor(pixels, targetColor, tolerance) {
  const tc = typeof targetColor === 'string' ? _namedColor(targetColor) : targetColor;
  if (!tc) return true;
  let match = 0, total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3];
    if (a < 10) continue;
    if (Math.sqrt((r-tc.r)**2 + (g-tc.g)**2 + (b-tc.b)**2) < tolerance) match++;
    total++;
  }
  return total > 0 && (match / total) > 0.05;
}

function _namedColor(name) {
  const c = {
    black:{r:0,g:0,b:0}, white:{r:255,g:255,b:255}, red:{r:220,g:30,b:30},
    blue:{r:30,g:80,b:220}, green:{r:30,g:180,b:30}, yellow:{r:240,g:220,b:30},
    orange:{r:240,g:130,b:30}, grey:{r:120,g:120,b:120}, gray:{r:120,g:120,b:120},
    darkgrey:{r:60,g:60,b:60}, silver:{r:180,g:180,b:190},
  };
  return c[name.toLowerCase()] || null;
}

function _drawFaceBox(ctx, box, sim, label) {
  ctx.strokeStyle = `rgba(255,${Math.round(255*(1-sim))},0,0.9)`;
  ctx.lineWidth   = 2;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.fillStyle   = 'rgba(0,0,0,0.6)';
  ctx.fillRect(box.x, box.y - 18, box.width, 18);
  ctx.fillStyle   = '#fff';
  ctx.font        = '11px Inter, sans-serif';
  ctx.fillText(`${label} ${Math.round(sim*100)}%`, box.x + 3, box.y - 4);
}
