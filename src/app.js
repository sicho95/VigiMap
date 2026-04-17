// Point d'entree principal de VigiMap — orchestre carte, sources, grille et logs
import { MapManager }        from './map/MapManager.js';
import { PlayerGrid }        from './player/PlayerGrid.js';
import { fetchAllCameras }   from './sources/SourceManager.js';
import { initSettingsPanel } from './settings/SettingsPanel.js';
import { getSetting }        from './settings/SettingsManager.js';
import { LogStore }          from './logs/LogStore.js';

// ── Etat global ───────────────────────────────────────────────────────────────
const state = {
  cameras: new Map(),          // cameraId → Camera
  filters: { source:'', status:'', country:'' },
};
let map, grid, logs;

// ── Demarrage ─────────────────────────────────────────────────────────────────

// Lance l'application apres le chargement complet du DOM
document.addEventListener('DOMContentLoaded', async () => {
  'serviceWorker' in navigator && navigator.serviceWorker.register('sw.js');
  initSettingsPanel();
  map  = new MapManager('map', onCameraClick).init();
  grid = new PlayerGrid('player-grid');
  logs = new LogStore(); await logs.init();
  bindUI();
  await loadCameras();
  initMobileNav();
  refreshLogUI();
});

// ── Cameras ───────────────────────────────────────────────────────────────────

// Charge les cameras de toutes les sources actives et met a jour la carte
async function loadCameras() {
  const cams = await fetchAllCameras(map.getBbox());
  state.cameras.clear();
  cams.forEach(c => state.cameras.set(c.id, c));
  applyFilters();
  populateFilters();
}

// Applique les filtres actifs et passe les cameras visibles au MapManager
function applyFilters() {
  const f = state.filters;
  const vis = [...state.cameras.values()].filter(c => {
    if (f.source  && c.sourceId !== f.source)  return false;
    if (f.status  && c.status   !== f.status)  return false;
    if (f.country && c.country  !== f.country) return false;
    if (!getSetting('showOffline') && c.status==='offline') return false;
    return true;
  });
  map.setCameras(vis);
}

// Alimente les selects source et pays selon les donnees chargees
function populateFilters() {
  const uniq = key => [...new Set([...state.cameras.values()].map(c=>c[key]).filter(Boolean))].sort();
  fill('filter-source',  uniq('sourceId'));
  fill('filter-country', uniq('country'));
}

// Remplace les options d'un select en conservant la premiere option vide
function fill(id, vals) {
  const el=document.getElementById(id); if (!el) return;
  const first=el.options[0]; el.innerHTML=''; el.appendChild(first);
  vals.forEach(v=>{ const o=document.createElement('option'); o.value=o.textContent=v; el.appendChild(o); });
}

// ── Popup camera ──────────────────────────────────────────────────────────────

// Affiche la popup d'information et d'action pour la camera cliquee
function onCameraClick(cam) {
  const pinned=grid.isPinned(cam.id);
  document.getElementById('camera-popup-inner').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <strong style="font-size:13px">${cam.name}</strong>
      <button class="btn btn--ghost btn--sm" data-close>&#10005;</button>
    </div>
    <div style="font-size:11px;color:var(--text-2);margin-bottom:8px">
      &#128225; ${cam.sourceId} &nbsp;·&nbsp; ${cam.country||'—'} &nbsp;·&nbsp;
      <span class="badge badge--${cam.status}">${cam.status}</span>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">${cam.lat.toFixed(5)}, ${cam.lng.toFixed(5)}</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn--primary btn--sm" data-pin>${pinned?'Depingler':'&#128204; Epingler'}</button>
      ${cam.streamUrl||cam.snapshotUrl?'<button class="btn btn--ghost btn--sm" data-open>&#9654; Ouvrir</button>':''}
    </div>
  `;
  const inner=document.getElementById('camera-popup-inner');
  inner.querySelector('[data-close]').onclick=closePopup;
  inner.querySelector('[data-pin]').onclick=()=>{ pinned?grid.unpin(cam.id):grid.pin(cam); map.updateCameraStatus(cam.id,pinned?cam.status:'pinned'); closePopup(); };
  inner.querySelector('[data-open]')?.addEventListener('click',()=>{ grid.pin(cam); map.updateCameraStatus(cam.id,'pinned'); closePopup(); });
  document.getElementById('camera-popup').classList.remove('hidden');
}

// Masque la popup de camera
function closePopup() { document.getElementById('camera-popup').classList.add('hidden'); }

// ── Logs ──────────────────────────────────────────────────────────────────────

// Met a jour le panneau des logs avec les 50 derniers enregistrements
async function refreshLogUI() {
  const entries = await logs.getRecent(50);
  document.getElementById('log-list').innerHTML = entries.map(e=>`
    <div class="log-entry">
      <span class="log-entry__time">${new Date(e.timestamp).toLocaleTimeString('fr-FR')}</span>
      <span class="log-entry__q">${e.queryName||'—'}</span>
      <span class="log-entry__cam">${e.cameraName||e.cameraId}</span>
      <span class="log-entry__score">${Math.round((e.globalScore||0)*100)}%</span>
    </div>`).join('');
  const total=await logs.count(), bytes=await logs.size();
  const cnt=document.getElementById('log-count'); if(cnt) cnt.textContent=total;
  const sz=document.getElementById('log-size');  if(sz)  sz.textContent=`${(bytes/1048576).toFixed(1)} Mo / ${getSetting('logLimitMb')} Mo`;
}

// ── Binding UI ────────────────────────────────────────────────────────────────

// Attache les gestionnaires d'evenements sur tous les controles de l'interface
function bindUI() {
  const on=(id,ev,fn)=>document.getElementById(id)?.addEventListener(ev,fn);
  on('filter-source',  'change', e=>{ state.filters.source=e.target.value; applyFilters(); });
  on('filter-status',  'change', e=>{ state.filters.status=e.target.value; applyFilters(); });
  on('filter-country', 'change', e=>{ state.filters.country=e.target.value; applyFilters(); });
  on('btn-refresh',    'click',  loadCameras);
  on('btn-export-logs','click', async()=>{ const d=await logs.exportAll(); dlJSON(d,`vigimap_logs_${yyyymmdd()}.json`); });
  on('btn-clear-logs', 'click', async()=>{ if(confirm('Vider tous les logs ?')){ await logs.clear(); refreshLogUI(); } });
  on('log-toggle',     'click',  ()=>{ const l=document.getElementById('log-list'); l.style.display=l.style.display==='none'?'':'none'; });
  on('grid-layout',    'change', ()=>grid._sync?.());
  document.addEventListener('vigimap:ctx', e=>onCameraClick(e.detail.cam));
  map.getMap().on('click', closePopup);
}

// ── Navigation mobile ─────────────────────────────────────────────────────────

// Active la navigation par onglets sur mobile
function initMobileNav() {
  const btns=document.querySelectorAll('.mobile-nav__btn');
  const m=document.getElementById('map-panel'), s=document.getElementById('side-panel');
  btns.forEach(btn=>btn.addEventListener('click',()=>{
    btns.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    const t=btn.dataset.tab;
    m.style.display=t==='map'?'':'none';
    s.style.display=['streams','logs'].includes(t)?'flex':'none';
  }));
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

// Telecharge un tableau d'objets sous forme de fichier JSON
function dlJSON(data, name) {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=name; a.click();
}
// Retourne la date courante au format YYYYMMDD
function yyyymmdd() { return new Date().toISOString().slice(0,10).replace(/-/g,''); }
