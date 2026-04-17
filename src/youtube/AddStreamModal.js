
import { fetchYtMeta }       from './YouTubeMetaFetcher.js';
import { addStream, updateStream, streamToCam, _extractYtId, getAllStreams } from './YouTubeLibrary.js';
import { getSetting } from '../settings/SettingsManager.js';

let _resolve = null;

export function openAddStreamModal(existing = null) {
  return new Promise(resolve => {
    _resolve = resolve;
    const modal = _ensureModal();
    _render(modal, existing);
    modal.classList.remove('hidden');
  });
}

function _ensureModal() {
  let m = document.getElementById('yt-stream-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'yt-stream-modal';
    m.className = 'modal-overlay';
    document.body.appendChild(m);
  }
  return m;
}

function _render(modal, existing) {
  const isEdit = !!existing;
  modal.innerHTML = `
  <div class="modal" style="max-width:490px;width:95vw">
    <div class="modal__header">
      <h3 style="font-size:14px;font-weight:600">${isEdit ? '✏️ Modifier' : '➕ Ajouter'} un flux caméra</h3>
      <button class="btn btn--ghost btn--sm" id="asm-close">✕</button>
    </div>
    <div class="modal__body" style="display:flex;flex-direction:column;gap:12px">

      <div>
        <label class="form-label">URL du flux *</label>
        <div style="display:flex;gap:6px">
          <input class="input" id="asm-url" placeholder="YouTube, .m3u8, MJPEG, snapshot…"
            value="${existing?.url||existing?.streamUrl||''}" style="flex:1;font-size:12px"/>
          <button class="btn btn--ghost btn--sm" id="asm-fetch" title="Récupérer infos + URL stream">🔍</button>
        </div>
        <!-- Badge doublon -->
        <div id="asm-dup" style="display:none;margin-top:5px;padding:6px 8px;background:rgba(210,153,34,.15);
          border-radius:5px;font-size:11px;color:#d4a31a;display:none">
          ⚠️ Ce flux existe déjà : <strong id="asm-dup-name"></strong>
          <button class="btn btn--ghost btn--sm" id="asm-dup-goto" style="font-size:10px;margin-left:4px">Voir</button>
        </div>
        <!-- URL m3u8 extraite -->
        <div id="asm-m3u8-wrap" style="display:none;margin-top:6px;padding:6px 8px;
          background:rgba(63,185,80,.1);border-radius:5px;font-size:11px">
          <span style="color:#3fb950">✅ URL m3u8 extraite :</span>
          <div id="asm-m3u8-url" style="color:var(--text-2);word-break:break-all;margin-top:2px;font-size:10px"></div>
        </div>
        <!-- Miniature -->
        <div id="asm-thumb" style="margin-top:6px;display:none">
          <img id="asm-thumb-img" style="width:100%;max-height:120px;object-fit:cover;
            border-radius:6px;border:1px solid var(--border)"/>
        </div>
      </div>

      <div>
        <label class="form-label">Nom affiché *</label>
        <input class="input" id="asm-name" placeholder="Ex: Times Square Live 24/7"
          value="${existing?.name||''}" style="font-size:12px"/>
        <div id="asm-author" style="font-size:10px;color:var(--text-3);margin-top:3px"></div>
      </div>

      <div>
        <label class="form-label">📍 Localisation</label>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <input class="input" id="asm-city" placeholder="Ville, pays (ex: Tokyo, Japan)"
            value="${existing?.city||''}" style="flex:1;font-size:12px"/>
          <button class="btn btn--ghost btn--sm" id="asm-geocode" title="Géocoder">📍</button>
        </div>
        <div style="display:flex;gap:6px">
          <input class="input" id="asm-lat" type="number" step="any" placeholder="Latitude"
            value="${existing?.lat||''}" style="flex:1;font-size:12px"/>
          <input class="input" id="asm-lng" type="number" step="any" placeholder="Longitude"
            value="${existing?.lng||''}" style="flex:1;font-size:12px"/>
        </div>
        <div id="asm-geo-status" style="font-size:10px;color:var(--text-3);margin-top:3px"></div>
      </div>

      <div>
        <label class="form-label">Tags (virgule)</label>
        <input class="input" id="asm-tags" placeholder="trafic, webcam, nature…"
          value="${(existing?.tags||[]).join(', ')}" style="font-size:12px"/>
      </div>

      <div>
        <label class="form-label">Pays (code 2 lettres)</label>
        <input class="input" id="asm-country" placeholder="FR, US, JP…" maxlength="3"
          value="${existing?.country||''}" style="width:80px;font-size:12px;text-transform:uppercase"/>
      </div>
    </div>

    <div class="modal__footer" style="display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btn--ghost btn--sm" id="asm-cancel">Annuler</button>
      <button class="btn btn--primary btn--sm" id="asm-save">
        💾 ${isEdit ? 'Enregistrer' : 'Ajouter à la bibliothèque'}
      </button>
    </div>
  </div>`;

  const $ = id => document.getElementById(id);
  const close = (val = null) => { modal.classList.add('hidden'); _resolve?.(val); _resolve = null; };

  $('asm-close').onclick  = () => close(null);
  $('asm-cancel').onclick = () => close(null);

  // ── Détection doublon au blur de l'URL ──────────────────────────────────
  let _m3u8Url = '';
  $('asm-url').addEventListener('blur', async () => {
    const url = $('asm-url').value.trim();
    if (!url || isEdit) return;
    const ytId = _extractYtId(url);
    const all  = await getAllStreams();
    const dup  = all.find(s =>
      s.url === url ||
      (ytId && s.ytId === ytId) ||
      s.streamUrl === url
    );
    const dupEl = $('asm-dup');
    if (dup) {
      $('asm-dup-name').textContent = dup.name;
      dupEl.style.display = 'block';
      $('asm-dup-goto').onclick = () => { close(null); /* caller peut scroller */ };
    } else {
      dupEl.style.display = 'none';
    }
  });

  // ── Fetch métadonnées + extraction m3u8 ─────────────────────────────────
  $('asm-fetch').onclick = async () => {
    const url = $('asm-url').value.trim();
    if (!url) return;
    $('asm-fetch').textContent = '⏳';
    $('asm-fetch').disabled = true;
    _m3u8Url = '';
    $('asm-m3u8-wrap').style.display = 'none';

    // 1. Métadonnées YouTube (titre + thumb)
    try {
      const meta = await fetchYtMeta(url);
      if (meta.title && !$('asm-name').value) $('asm-name').value = meta.title;
      if (meta.author) $('asm-author').textContent = '📺 ' + meta.author;
      if (meta.thumb) {
        $('asm-thumb-img').src = meta.thumb;
        $('asm-thumb').style.display = '';
      }
    } catch (_) {}

    // 2. Extraction m3u8 via proxy /extract-stream
    const proxyBase = (getSetting('proxyUrl') || '').replace(/\/\?url=$/, '').replace(/\?url=$/, '');
    if (proxyBase) {
      try {
        const r = await fetch(
          `${proxyBase}/extract-stream?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout?.(20000) }
        );
        if (r.ok) {
          const j = await r.json();
          if (j.ok && j.streamUrl) {
            _m3u8Url = j.streamUrl;
            $('asm-m3u8-url').textContent = j.streamUrl;
            $('asm-m3u8-wrap').style.display = '';
          }
        }
      } catch (e) {
        console.warn('[VigiMap] extract-stream:', e.message);
      }
    }

    $('asm-fetch').textContent = '🔍';
    $('asm-fetch').disabled = false;
  };

  // ── Géocodage Nominatim ──────────────────────────────────────────────────
  $('asm-geocode').onclick = async () => {
    const q = $('asm-city').value.trim();
    if (!q) return;
    $('asm-geocode').textContent = '⏳'; $('asm-geocode').disabled = true;
    $('asm-geo-status').textContent = 'Géocodage…';
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'fr' }, signal: AbortSignal.timeout?.(8000) }
      );
      const j = await r.json();
      if (j[0]) {
        $('asm-lat').value = (+j[0].lat).toFixed(6);
        $('asm-lng').value = (+j[0].lon).toFixed(6);
        const parts = (j[0].display_name || '').split(',');
        const cc = { France:'FR', Germany:'DE', Spain:'ES', Italy:'IT', Japan:'JP',
          'United States':'US', 'United Kingdom':'GB', Australia:'AU', Canada:'CA',
          Brazil:'BR', Singapore:'SG', Netherlands:'NL' };
        const country = parts[parts.length-1]?.trim() || '';
        if (!$('asm-country').value) $('asm-country').value = cc[country] || country.slice(0,2).toUpperCase();
        $('asm-geo-status').textContent = `✅ ${(+j[0].lat).toFixed(4)}, ${(+j[0].lon).toFixed(4)} — ${parts.slice(0,2).join(',')}`;
      } else {
        $('asm-geo-status').textContent = '⚠️ Lieu introuvable';
      }
    } catch (e) { $('asm-geo-status').textContent = '⚠️ ' + e.message; }
    $('asm-geocode').textContent = '📍'; $('asm-geocode').disabled = false;
  };

  // ── Sauvegarder ──────────────────────────────────────────────────────────
  $('asm-save').onclick = async () => {
    const url  = $('asm-url').value.trim();
    const name = $('asm-name').value.trim();
    if (!url)  { _flash('⚠️ URL requise');  return; }
    if (!name) { _flash('⚠️ Nom requis');   return; }

    const ytId = _extractYtId(url);
    const thumb = $('asm-thumb-img')?.src && $('asm-thumb-img').src !== window.location.href
      ? $('asm-thumb-img').src
      : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');

    const entry = {
      url,                          // URL originale (YouTube, etc.)
      m3u8Url: _m3u8Url || '',      // URL m3u8 extraite (pour CV)
      ytId,
      name,
      lat:     +$('asm-lat').value     || 0,
      lng:     +$('asm-lng').value     || 0,
      city:    $('asm-city').value.trim(),
      country: $('asm-country').value.trim().toUpperCase(),
      tags:    $('asm-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      thumb,
      enabled: true,
    };

    let cam;
    if (isEdit && existing._dbId) {
      await updateStream(existing._dbId, entry);
      cam = streamToCam({ ...entry, id: existing._dbId });
    } else {
      const saved = await addStream(entry);
      cam = streamToCam(saved);
    }
    close(cam);
  };
}

function _flash(msg) {
  let n = document.getElementById('notif-bar');
  if (!n) { n = document.createElement('div'); n.id='notif-bar'; n.className='notif-bar'; document.body.appendChild(n); }
  n.textContent = msg; n.classList.add('show');
  clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('show'), 4000);
}
