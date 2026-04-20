import { getSetting, setSetting } from './SettingsManager.js';

// ─────────────────────────────────────────────────────────────────────────────
// initSettingsPanel()
//
// NE PAS appeler au DOMContentLoaded — appeler à l'ouverture du panneau.
// Pattern recommandé dans app.js :
//
//   btnSettings.addEventListener('click', () => {
//     settingsBody.classList.toggle('hidden');
//     if (!settingsBody.classList.contains('hidden')) initSettingsPanel();
//   });
//
// La fonction est idempotente : appeler plusieurs fois ne double pas les listeners.
// ─────────────────────────────────────────────────────────────────────────────
export function initSettingsPanel() {
  const inner = document.getElementById('settings-inner');
  if (!inner) {
    // Ne devrait pas arriver si appelé à l'ouverture du panneau,
    // mais on garde un fallback silencieux
    console.warn('[SettingsPanel] #settings-inner introuvable dans le DOM');
    return;
  }
  // Éviter de re-rendre si déjà initialisé
  if (inner.dataset.ready === '1') return;
  inner.dataset.ready = '1';
  _render(inner);
}

function _render(inner) {
  const g  = k => getSetting(k);
  const ak = getSetting('apiKeys') || {};

  inner.innerHTML = `
    <div class="settings-group">
      <div class="settings-group-title">🌐 Proxy CORS</div>
      <label class="settings-row">
        <span>URL proxy</span>
        <input class="input" data-k="proxyUrl" style="width:200px;font-size:11px"
               value="${g('proxyUrl') || ''}" placeholder="https://…/?url=">
      </label>
      <div class="settings-hint">ex: https://proxy.sicho95.workers.dev/?url=</div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">🔑 Clés API optionnelles</div>
      <label class="settings-row">
        <span>Windy Webcams</span>
        <input class="input" data-k="windyKey" style="width:160px;font-size:11px"
               value="${ak.windyKey || ''}" placeholder="clé Windy">
      </label>
      <label class="settings-row">
        <span>OpenWebcamDB</span>
        <input class="input" data-k="owdbKey" style="width:160px;font-size:11px"
               value="${ak.openwebcamdbKey || ''}" placeholder="Bearer token">
      </label>
      <label class="settings-row">
        <span>NSW Transport (AU)</span>
        <input class="input" data-k="nswKey" style="width:160px;font-size:11px"
               value="${ak.nswKey || ''}" placeholder="clé NSW">
      </label>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">🗺️ Carte</div>
      <label class="settings-row">
        <span>Afficher caméras hors ligne</span>
        <input type="checkbox" data-k="showOffline" ${g('showOffline') !== false ? 'checked' : ''}>
      </label>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">▶️ Flux</div>
      <label class="settings-row">
        <span>Refresh snapshot (s)</span>
        <input class="input" data-k="snapRefresh" type="number" min="5" max="300"
               value="${g('snapshotRefresh') || 30}" style="width:70px">
      </label>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">🤖 Computer Vision</div>
      <label class="settings-row">
        <span>Backend TF.js</span>
        <select class="select-sm" data-k="tfBackend">
          <option value="webgl" ${g('tfBackend') === 'webgl' || !g('tfBackend') ? 'selected' : ''}>WebGL (GPU)</option>
          <option value="wasm"  ${g('tfBackend') === 'wasm'  ? 'selected' : ''}>WASM</option>
          <option value="cpu"   ${g('tfBackend') === 'cpu'   ? 'selected' : ''}>CPU</option>
        </select>
      </label>
      <label class="settings-row">
        <span>Seuil confiance global (%)</span>
        <input class="input" data-k="conf" type="number" min="10" max="100"
               value="${Math.round((g('confidenceThreshold') || 0.7) * 100)}" style="width:70px">
      </label>
      <label class="settings-row">
        <span>Capturer frame sur match</span>
        <input type="checkbox" data-k="captureOnMatch" ${g('captureOnMatch') !== false ? 'checked' : ''}>
      </label>
    </div>

    <div class="settings-footer">
      <button class="btn btn--primary" id="settings-save-btn">💾 Enregistrer</button>
      <span id="settings-saved-msg" style="display:none;color:var(--color-success);font-size:12px;margin-left:8px">
        ✅ Enregistré — rechargement…
      </span>
    </div>
  `;

  document.getElementById('settings-save-btn').addEventListener('click', () => {
    const v  = k => inner.querySelector(`[data-k="${k}"]`)?.value;
    const ck = k => inner.querySelector(`[data-k="${k}"]`)?.checked;

    setSetting('proxyUrl',            (v('proxyUrl') || '').trim());
    setSetting('snapshotRefresh',     +(v('snapRefresh')) || 30);
    setSetting('tfBackend',           v('tfBackend'));
    setSetting('confidenceThreshold', +(v('conf')) / 100);
    setSetting('showOffline',         ck('showOffline'));
    setSetting('captureOnMatch',      ck('captureOnMatch'));

    const ak2 = getSetting('apiKeys') || {};
    const wk  = (v('windyKey') || '').trim();
    const ok  = (v('owdbKey')  || '').trim();
    const nk  = (v('nswKey')   || '').trim();
    if (wk) ak2.windyKey        = wk;
    if (ok) ak2.openwebcamdbKey = ok;
    if (nk) ak2.nswKey           = nk;
    setSetting('apiKeys', ak2);

    document.getElementById('settings-body')?.classList.add('hidden');
    const msg = document.getElementById('settings-saved-msg');
    if (msg) msg.style.display = '';
    setTimeout(() => window.location.reload(), 400);
  });
}
