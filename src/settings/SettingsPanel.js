import{getSetting,setSetting}from'./SettingsManager.js';
import{SOURCE_REGISTRY}from'../sources/SourceManager.js';

export function initSettingsPanel(){
  // #settings-inner peut être absent si le panel n'est pas encore dans le DOM
  const inner=document.getElementById('settings-inner');
  if(!inner){console.warn('[VigiMap] settings-inner introuvable');return;}
  _render(inner);
}

function _render(inner){
  const g=k=>getSetting(k);
  const ak=getSetting('apiKeys')||{};
  const srcRows=SOURCE_REGISTRY.map(s=>{
    const on=(getSetting('sources')||{})[s.id]!==undefined?(getSetting('sources')||{})[s.id]:s.on;
    const badges=[
      s.proxy&&!g('proxyUrl')?'<span style="font-size:10px;color:var(--warning)">proxy</span>':'',
      s.apiKey&&!ak[s.apiKey]?`<span style="font-size:10px;color:var(--warning)">clé ${s.apiKey}</span>`:'',
    ].join('');
    return`<div class="settings-row">
      <label>${s.name} ${badges}<br><small style="color:var(--text-3)">[${s.region}]</small></label>
      <label class="toggle"><input type="checkbox" data-src="${s.id}" ${on?'checked':''}/>
        <span class="toggle__slider"></span></label></div>`;
  }).join('');

  inner.innerHTML=`
    <div class="settings-section__title">🌐 Proxy CORS</div>
    <div class="settings-row">
      <label>URL proxy<br><small style="color:var(--text-3)">ex: https://mon-proxy.workers.dev/?url=</small></label>
      <input class="input" data-id="proxy" style="width:180px;font-size:11px" value="${g('proxyUrl')||''}" placeholder="https://…?url="/>
    </div>
    <div class="settings-section__title">🔑 Clés API</div>
    <div class="settings-row"><label>Windy Webcams</label>
      <input class="input" data-id="windyKey" style="width:150px;font-size:11px" value="${ak.windyKey||''}" placeholder="clé Windy"/></div>
    <div class="settings-row"><label>OpenWebcamDB<br><small style="color:var(--text-3)">Header: Authorization Bearer</small></label>
      <input class="input" data-id="owdbKey" style="width:150px;font-size:11px" value="${ak.openwebcamdbKey||''}" placeholder="Bearer …"/></div>
    <div class="settings-row"><label>NSW Transport API Key</label>
      <input class="input" data-id="nswKey" style="width:150px;font-size:11px" value="${ak.nswKey||''}" placeholder="clé NSW"/></div>
    <div class="settings-section__title">📡 Sources (${SOURCE_REGISTRY.length})</div>
    ${srcRows}
    <div class="settings-section__title">🗺️ Carte</div>
    <div class="settings-row"><label>Afficher hors ligne</label>
      <label class="toggle"><input type="checkbox" data-id="showOffline" ${g('showOffline')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>
    <div class="settings-section__title">▶️ Flux</div>
    <div class="settings-row"><label>Refresh snapshot (s)</label>
      <input class="input" data-id="snapRefresh" type="number" min="5" max="300" value="${g('snapshotRefresh')||30}" style="width:60px"/></div>
    <div class="settings-section__title">🤖 CV</div>
    <div class="settings-row"><label>Backend TF.js</label>
      <select class="select-sm" data-id="tfBackend">
        <option value="webgl" ${g('tfBackend')==='webgl'?'selected':''}>WebGL</option>
        <option value="wasm"  ${g('tfBackend')==='wasm' ?'selected':''}>WASM</option>
        <option value="cpu"   ${g('tfBackend')==='cpu'  ?'selected':''}>CPU</option>
      </select></div>
    <div class="settings-row"><label>Seuil confiance (%)</label>
      <input class="input" data-id="conf" type="number" min="10" max="100" value="${Math.round((g('confidenceThreshold')||0.7)*100)}" style="width:60px"/></div>
    <div style="padding:16px 0">
      <button class="btn btn--primary btn--sm" data-id="save" style="width:100%">💾 Enregistrer & recharger</button>
    </div>`;

  // ── bind sur inner (jamais sur document) ──────────────────────────────────
  inner.querySelector('[data-id="save"]').addEventListener('click',()=>{
    const v=k=>inner.querySelector(`[data-id="${k}"]`)?.value;
    const chk=k=>inner.querySelector(`[data-id="${k}"]`)?.checked;
    setSetting('proxyUrl',      v('proxy')?.trim()||'');
    setSetting('snapshotRefresh',+(v('snapRefresh'))||30);
    setSetting('tfBackend',     v('tfBackend'));
    setSetting('confidenceThreshold',+(v('conf'))/100);
    setSetting('showOffline',   chk('showOffline'));
    const ak2=getSetting('apiKeys')||{};
    const wk=v('windyKey')?.trim();const ok=v('owdbKey')?.trim();const nk=v('nswKey')?.trim();
    if(wk)ak2.windyKey=wk;if(ok)ak2.openwebcamdbKey=ok;if(nk)ak2.nswKey=nk;
    setSetting('apiKeys',ak2);
    const ss=getSetting('sources')||{};
    inner.querySelectorAll('[data-src]').forEach(i=>{ss[i.dataset.src]=i.checked});
    setSetting('sources',ss);
    document.getElementById('settings-body')?.classList.add('hidden');
    window.location.reload();
  });
}
