import{getSetting,setSetting}from'./SettingsManager.js';

export function initSettingsPanel(){
  // Attendre que le DOM soit stable avant de chercher #settings-inner
  _tryInit(0);
}

function _tryInit(attempt){
  const inner=document.getElementById('settings-inner');
  if(!inner){
    if(attempt<10)requestAnimationFrame(()=>_tryInit(attempt+1));
    else console.warn('[VigiMap] settings-inner introuvable après 10 tentatives');
    return;
  }
  _render(inner);
}

function _render(inner){
  const g=k=>getSetting(k);
  const ak=getSetting('apiKeys')||{};

  inner.innerHTML=`
    <div class="settings-section__title">🌐 Proxy CORS</div>
    <div class="settings-row">
      <label>URL proxy<br><small style="color:var(--text-3)">ex: https://proxy.workers.dev/?url=</small></label>
      <input class="input" data-k="proxyUrl" style="width:180px;font-size:11px"
        value="${g('proxyUrl')||''}" placeholder="https://…?url="/>
    </div>

    <div class="settings-section__title">🔑 Clés API optionnelles</div>
    <div class="settings-row"><label>Windy Webcams</label>
      <input class="input" data-k="windyKey" style="width:150px;font-size:11px"
        value="${ak.windyKey||''}" placeholder="clé Windy"/></div>
    <div class="settings-row"><label>OpenWebcamDB</label>
      <input class="input" data-k="owdbKey" style="width:150px;font-size:11px"
        value="${ak.openwebcamdbKey||''}" placeholder="Bearer token"/></div>
    <div class="settings-row"><label>NSW Transport (AU)</label>
      <input class="input" data-k="nswKey" style="width:150px;font-size:11px"
        value="${ak.nswKey||''}" placeholder="clé NSW"/></div>

    <div class="settings-section__title">🗺️ Carte</div>
    <div class="settings-row"><label>Afficher caméras hors ligne</label>
      <label class="toggle"><input type="checkbox" data-k="showOffline" ${g('showOffline')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>

    <div class="settings-section__title">▶️ Flux</div>
    <div class="settings-row"><label>Refresh snapshot (s)</label>
      <input class="input" data-k="snapRefresh" type="number" min="5" max="300"
        value="${g('snapshotRefresh')||30}" style="width:60px"/></div>

    <div class="settings-section__title">🤖 Computer Vision</div>
    <div class="settings-row"><label>Backend TF.js</label>
      <select class="select-sm" data-k="tfBackend">
        <option value="webgl" ${g('tfBackend')==='webgl'?'selected':''}>WebGL (GPU)</option>
        <option value="wasm"  ${g('tfBackend')==='wasm' ?'selected':''}>WASM</option>
        <option value="cpu"   ${g('tfBackend')==='cpu'  ?'selected':''}>CPU</option>
      </select></div>
    <div class="settings-row"><label>Seuil confiance global (%)</label>
      <input class="input" data-k="conf" type="number" min="10" max="100"
        value="${Math.round((g('confidenceThreshold')||0.7)*100)}" style="width:60px"/></div>
    <div class="settings-row"><label>Capturer frame sur match</label>
      <label class="toggle"><input type="checkbox" data-k="captureOnMatch" ${g('captureOnMatch')!==false?'checked':''}/>
        <span class="toggle__slider"></span></label></div>

    <div style="padding:16px 0 8px">
      <button class="btn btn--primary btn--sm" data-k="save" style="width:100%">
        💾 Enregistrer
      </button>
    </div>
    <div id="settings-saved-msg" style="display:none;text-align:center;font-size:11px;color:var(--success);padding-bottom:8px">
      ✅ Paramètres enregistrés — rechargement…
    </div>`;

  // Bind sur inner — jamais sur document
  inner.querySelector('[data-k="save"]').addEventListener('click',()=>{
    const v =k=>inner.querySelector(`[data-k="${k}"]`)?.value;
    const ck=k=>inner.querySelector(`[data-k="${k}"]`)?.checked;

    setSetting('proxyUrl',         (v('proxyUrl')||'').trim());
    setSetting('snapshotRefresh',  +(v('snapRefresh'))||30);
    setSetting('tfBackend',        v('tfBackend'));
    setSetting('confidenceThreshold', +(v('conf'))/100);
    setSetting('showOffline',      ck('showOffline'));
    setSetting('captureOnMatch',   ck('captureOnMatch'));

    const ak2=getSetting('apiKeys')||{};
    const wk=(v('windyKey')||'').trim();
    const ok=(v('owdbKey')||'').trim();
    const nk=(v('nswKey')||'').trim();
    if(wk)ak2.windyKey=wk;
    if(ok)ak2.openwebcamdbKey=ok;
    if(nk)ak2.nswKey=nk;
    setSetting('apiKeys',ak2);

    // Fermer le panneau settings AVANT le reload pour éviter le re-trigger
    document.getElementById('settings-body')?.classList.add('hidden');
    const msg=document.getElementById('settings-saved-msg');
    if(msg)msg.style.display='';
    // Délai explicite pour que le DOM soit settled
    setTimeout(()=>window.location.reload(),400);
  });
}
