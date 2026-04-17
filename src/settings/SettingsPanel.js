import{getSetting,setSetting}from'./SettingsManager.js';
import{SOURCE_REGISTRY}from'../sources/SourceManager.js';
export function initSettingsPanel(){
  const inner=document.getElementById('settings-inner');if(!inner)return;
  renderSettings(inner);
}
function renderSettings(inner){
  const g=k=>getSetting(k);
  const srcRows=SOURCE_REGISTRY.map(s=>{
    const on=getSetting('sources')?.[s.id]!==undefined?getSetting('sources')[s.id]:s.on;
    return`<div class="settings-row">
      <label>${s.name}<br><small style="color:var(--text-3)">[${s.region}]${s.proxy?' · proxy requis':''}</small></label>
      <label class="toggle"><input type="checkbox" data-src="${s.id}" ${on?'checked':''}/>
        <span class="toggle__slider"></span></label></div>`;
  }).join('');
  inner.innerHTML=`
    <div class="settings-section__title">🌐 Proxy CORS</div>
    <div class="settings-row">
      <label>URL proxy<br><small style="color:var(--text-3)">ex: https://corsproxy.io/?</small></label>
      <input class="input" id="sp-proxy" style="width:160px;font-size:11px" value="${g('proxyUrl')||''}" placeholder="https://…?url="/>
    </div>
    <div class="settings-section__title">📡 Sources (${SOURCE_REGISTRY.length} disponibles)</div>
    ${srcRows}
    <div class="settings-section__title">🗺️ Carte</div>
    <div class="settings-row"><label>Afficher hors ligne</label>
      <label class="toggle"><input type="checkbox" id="sp-offline" ${g('showOffline')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>
    <div class="settings-section__title">▶️ Flux</div>
    <div class="settings-row"><label>Refresh snapshot (s)</label>
      <input class="input" id="sp-snap" type="number" min="5" max="300" value="${g('snapshotRefresh')||30}" style="width:60px"/></div>
    <div class="settings-section__title">🤖 Computer Vision</div>
    <div class="settings-row"><label>Backend TF.js</label>
      <select class="select-sm" id="sp-backend">
        <option value="webgl" ${g('tfBackend')==='webgl'?'selected':''}>WebGL (GPU)</option>
        <option value="wasm"  ${g('tfBackend')==='wasm'?'selected':''}>WASM</option>
        <option value="cpu"   ${g('tfBackend')==='cpu'?'selected':''}>CPU</option>
      </select></div>
    <div class="settings-row"><label>Seuil confiance global (%)</label>
      <input class="input" id="sp-conf" type="number" min="10" max="100" value="${Math.round((g('confidenceThreshold')||0.7)*100)}" style="width:60px"/></div>
    <div class="settings-row"><label>Capturer frame sur match</label>
      <label class="toggle"><input type="checkbox" id="sp-capture" ${g('captureOnMatch')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>
    <div style="padding:16px 0">
      <button class="btn btn--primary btn--sm" id="sp-save" style="width:100%">💾 Enregistrer & recharger</button>
    </div>`;
  document.getElementById('sp-save')?.addEventListener('click',()=>{
    setSetting('proxyUrl',document.getElementById('sp-proxy')?.value?.trim()||'');
    setSetting('showOffline',document.getElementById('sp-offline')?.checked);
    setSetting('snapshotRefresh',+document.getElementById('sp-snap')?.value||30);
    setSetting('tfBackend',document.getElementById('sp-backend')?.value);
    setSetting('confidenceThreshold',+document.getElementById('sp-conf')?.value/100);
    setSetting('captureOnMatch',document.getElementById('sp-capture')?.checked);
    const ss=getSetting('sources')||{};
    document.querySelectorAll('[data-src]').forEach(inp=>{ss[inp.dataset.src]=inp.checked});
    setSetting('sources',ss);
    document.getElementById('settings-body')?.classList.add('hidden');
    window.location.reload();
  });
}
