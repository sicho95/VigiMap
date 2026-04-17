// Construit et gere le panneau de parametres lateral
import { loadSettings, saveSettings, setSetting } from './SettingsManager.js';
import { SOURCE_REGISTRY } from '../sources/SourceManager.js';

// Ouvre le panneau et le rend
export function openSettings() {
  document.getElementById('settings-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.remove('hidden');
  render();
}
// Ferme le panneau
export function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.add('hidden');
}
// Initialise les boutons d'ouverture et de fermeture
export function initSettingsPanel() {
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  document.getElementById('panel-overlay').addEventListener('click', closeSettings);
}

// Genere le contenu HTML complet du panneau
function render() {
  const s = loadSettings();
  document.getElementById('settings-body').innerHTML = [
    secSources(s), secFlux(s), secCV(s), secLogs(s)
  ].join('');
  bind();
}

function secSources(s) {
  const rows = SOURCE_REGISTRY.map(r => `
    <div class="source-item">
      <label class="toggle"><input type="checkbox" data-src="${r.id}" ${s.sources[r.id]!==false?'checked':''}/><span class="toggle__slider"></span></label>
      <span class="source-item__name">${r.name}</span>
      ${r.requiresApiKey?`<input class="input source-item__key" placeholder="Cle API" data-apikey="${r.id}" value="${s.sources[r.id+'_key']||''}"/>`:''}
    </div>`).join('');
  return `<div class="settings-section">
    <div class="settings-section__title">Sources</div>
    <input class="input" id="i-proxy" placeholder="https://worker.workers.dev?url=" value="${s.proxyUrl}" style="margin-bottom:var(--sp-sm)"/>
    <div class="mt-sm">${rows}</div>
  </div>`;
}
function secFlux(s) {
  return `<div class="settings-section">
    <div class="settings-section__title">Flux video</div>
    <div class="settings-row"><label>Max flux epingles</label><input class="input" type="number" min="1" max="20" id="i-max" value="${s.maxPinnedStreams}"/></div>
    <div class="settings-row"><label>Refresh snapshot (ms)</label><input class="input" type="number" min="5000" step="5000" id="i-snap" value="${s.snapshotRefreshMs}"/></div>
    <div class="settings-row"><label>Cameras hors ligne</label><label class="toggle"><input type="checkbox" id="t-offline" ${s.showOffline?'checked':''}/><span class="toggle__slider"></span></label></div>
  </div>`;
}
function secCV(s) {
  const freqs=[['realtime','Temps reel'],['interval_1','1 s'],['interval_2','2 s'],
               ['interval_5','5 s'],['interval_10','10 s'],['on_motion','Mouvement']];
  return `<div class="settings-section">
    <div class="settings-section__title">Computer Vision</div>
    <div class="settings-row"><label>Backend TF.js</label>
      <select class="select-sm" id="s-back">${['webgl','wasm','cpu'].map(v=>`<option value="${v}" ${s.cvBackend===v?'selected':''}>${v.toUpperCase()}</option>`).join('')}</select></div>
    <div class="settings-row"><label>Frequence</label>
      <select class="select-sm" id="s-freq">${freqs.map(([v,l])=>`<option value="${v}" ${s.cvFrequency===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="settings-row"><label>Confiance (%)</label><input class="input" type="number" min="1" max="100" id="i-conf" value="${Math.round(s.cvConfidence*100)}"/></div>
    <div class="settings-row"><label>Capturer frame/match</label><label class="toggle"><input type="checkbox" id="t-cap" ${s.captureFrameOnMatch?'checked':''}/><span class="toggle__slider"></span></label></div>
    <div class="settings-row"><label>Qualite JPEG (%)</label><input class="input" type="number" min="10" max="95" step="5" id="i-jpeg" value="${Math.round(s.jpegQuality*100)}"/></div>
  </div>`;
}
function secLogs(s) {
  return `<div class="settings-section">
    <div class="settings-section__title">Logs</div>
    <div class="settings-row"><label>Limite IndexedDB (Mo)</label><input class="input" type="number" min="10" max="2000" id="i-log" value="${s.logLimitMb}"/></div>
  </div>`;
}

// Attache les evenements sur tous les champs du panneau
function bind() {
  const q = id => document.getElementById(id);
  const sv = (k,v) => setSetting(k,v);
  q('i-proxy')?.addEventListener('change', e => sv('proxyUrl', e.target.value));
  q('i-max')?.addEventListener('change',   e => sv('maxPinnedStreams', +e.target.value));
  q('i-snap')?.addEventListener('change',  e => sv('snapshotRefreshMs', +e.target.value));
  q('t-offline')?.addEventListener('change', e => sv('showOffline', e.target.checked));
  q('s-back')?.addEventListener('change',  e => sv('cvBackend', e.target.value));
  q('s-freq')?.addEventListener('change',  e => sv('cvFrequency', e.target.value));
  q('i-conf')?.addEventListener('change',  e => sv('cvConfidence', +e.target.value/100));
  q('t-cap')?.addEventListener('change',   e => sv('captureFrameOnMatch', e.target.checked));
  q('i-jpeg')?.addEventListener('change',  e => sv('jpegQuality', +e.target.value/100));
  q('i-log')?.addEventListener('change',   e => sv('logLimitMb', +e.target.value));
  document.querySelectorAll('[data-src]').forEach(el => el.addEventListener('change', () => {
    const s=loadSettings(); s.sources[el.dataset.src]=el.checked; saveSettings(s);
  }));
  document.querySelectorAll('[data-apikey]').forEach(el => el.addEventListener('change', () => {
    const s=loadSettings(); s.sources[el.dataset.apikey+'_key']=el.value; saveSettings(s);
  }));
}
