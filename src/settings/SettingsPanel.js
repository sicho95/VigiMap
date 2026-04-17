import{getSetting,setSetting}from'./SettingsManager.js';
import{SOURCE_REGISTRY}from'../sources/SourceManager.js';

export function initSettingsPanel(){
  const inner=document.getElementById('settings-inner');
  if(!inner)return;
  renderSettings(inner);
}

function renderSettings(inner){
  const g  = k => getSetting(k);
  const ak = getSetting('apiKeys') || {};

  const srcRows = SOURCE_REGISTRY.map(s => {
    const on = getSetting('sources')?.[s.id] !== undefined ? getSetting('sources')[s.id] : s.on;
    const needP  = s.proxy   && !g('proxyUrl');
    const needK  = s.apiKey  && !ak[s.apiKey];
    return `<div class="settings-row">
      <label>${s.name}<br>
        <small style="color:var(--text-3)">[${s.region}]${s.proxy?' · proxy':''}</small>
      </label>
      ${needP ? '<span style="font-size:10px;color:var(--warning)">proxy requis</span>' : ''}
      ${needK ? `<span style="font-size:10px;color:var(--warning)">clé "${s.apiKey}" requise</span>` : ''}
      <label class="toggle">
        <input type="checkbox" data-src="${s.id}" ${on ? 'checked' : ''}/>
        <span class="toggle__slider"></span>
      </label>
    </div>`;
  }).join('');

  inner.innerHTML = `
    <div class="settings-section__title">🌐 Proxy CORS</div>
    <div class="settings-row">
      <label>URL proxy<br><small style="color:var(--text-3)">ex: https://corsproxy.io/?url=</small></label>
      <input class="input" id="sp-proxy" style="width:180px;font-size:11px"
        value="${g('proxyUrl')||''}" placeholder="https://…?url="/>
    </div>
    <div class="settings-section__title">🔑 Clés API optionnelles</div>
    <div class="settings-row">
      <label>Windy Webcams<br><small style="color:var(--text-3)">api.windy.com</small></label>
      <input class="input" id="sp-windy-key" style="width:160px;font-size:11px"
        value="${ak.windyKey||''}" placeholder="clé Windy"/>
    </div>
    <div class="settings-row">
      <label>OpenWebcamDB<br><small style="color:var(--text-3)">openwebcamdb.com</small></label>
      <input class="input" id="sp-owdb-key" style="width:160px;font-size:11px"
        value="${ak.openwebcamdbKey||''}" placeholder="clé OWDB"/>
    </div>
    <div class="settings-section__title">📡 Sources (${SOURCE_REGISTRY.length} disponibles)</div>
    ${srcRows}
    <div class="settings-section__title">🗺️ Carte</div>
    <div class="settings-row"><label>Afficher hors ligne</label>
      <label class="toggle"><input type="checkbox" id="sp-offline" ${g('showOffline')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>
    <div class="settings-section__title">▶️ Flux</div>
    <div class="settings-row"><label>Refresh snapshot (s)</label>
      <input class="input" id="sp-snap" type="number" min="5" max="300"
        value="${g('snapshotRefresh')||30}" style="width:60px"/></div>
    <div class="settings-section__title">🤖 Computer Vision</div>
    <div class="settings-row"><label>Backend TF.js</label>
      <select class="select-sm" id="sp-backend">
        <option value="webgl" ${g('tfBackend')==='webgl'?'selected':''}>WebGL (GPU)</option>
        <option value="wasm"  ${g('tfBackend')==='wasm' ?'selected':''}>WASM</option>
        <option value="cpu"   ${g('tfBackend')==='cpu'  ?'selected':''}>CPU</option>
      </select></div>
    <div class="settings-row"><label>Seuil confiance global (%)</label>
      <input class="input" id="sp-conf" type="number" min="10" max="100"
        value="${Math.round((g('confidenceThreshold')||0.7)*100)}" style="width:60px"/></div>
    <div class="settings-row"><label>Capturer frame sur match</label>
      <label class="toggle"><input type="checkbox" id="sp-capture" ${g('captureOnMatch')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>
    <div style="padding:16px 0">
      <button class="btn btn--primary btn--sm" id="sp-save" style="width:100%">
        💾 Enregistrer & recharger
      </button>
    </div>`;

  // ── bind APRÈS rendu du DOM ────────────────────────────────────────────────
  const saveBtn = inner.querySelector('#sp-save');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    setSetting('proxyUrl', inner.querySelector('#sp-proxy')?.value?.trim() || '');
    setSetting('snapshotRefresh', +(inner.querySelector('#sp-snap')?.value) || 30);
    setSetting('tfBackend',       inner.querySelector('#sp-backend')?.value);
    setSetting('confidenceThreshold', +(inner.querySelector('#sp-conf')?.value) / 100);
    setSetting('captureOnMatch',  inner.querySelector('#sp-capture')?.checked);
    setSetting('showOffline',     inner.querySelector('#sp-offline')?.checked);

    const keys = getSetting('apiKeys') || {};
    const wk = inner.querySelector('#sp-windy-key')?.value?.trim();
    const ok = inner.querySelector('#sp-owdb-key')?.value?.trim();
    if (wk) keys.windyKey = wk;
    if (ok) keys.openwebcamdbKey = ok;
    setSetting('apiKeys', keys);

    const ss = getSetting('sources') || {};
    inner.querySelectorAll('[data-src]').forEach(inp => { ss[inp.dataset.src] = inp.checked; });
    setSetting('sources', ss);

    document.getElementById('settings-body')?.classList.add('hidden');
    window.location.reload();
  });
}
