import { MapManager }        from './map/MapManager.js';
import { PlayerGrid }        from './player/PlayerGrid.js';
import { VideoImporter }     from './player/VideoImporter.js';
import { fetchAllCameras }   from './sources/SourceManager.js';
import { initSourcePanel }   from './sources/SourcePanel.js';
import { initSettingsPanel } from './settings/SettingsPanel.js';
import { getSetting }        from './settings/SettingsManager.js';
import { LogStore }          from './logs/LogStore.js';
import { LogPanel }          from './logs/LogPanel.js';
import { CVEngine }          from './cv/CVEngine.js';
import { initQueryPanel }    from './queries/QueryEditor.js';
import { getActiveQueries }  from './queries/QueryManager.js';
import { LibraryPanel }      from './youtube/LibraryPanel.js';
import { openAddStreamModal } from './youtube/AddStreamModal.js';
import { getAllStreams, streamToCam } from './youtube/YouTubeLibrary.js';

// ─── État global ────────────────────────────────────────────────────────────
const state = {
  cameras: new Map(),
  filters: { source: '', status: '', country: '' },
};

let map, grid, logs, logPanel, cv, importer, libPanel;

// ─── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('sw.js').catch(() => {});

  // Settings panel — appelé ici, tolère #settings-inner absent du DOM
  // SettingsPanel.js gère l'état "pas encore rendu" avec dataset.ready
  initSettingsPanel();

  map = new MapManager('map', onCamClick).init();
  requestAnimationFrame(() => map.getMap().invalidateSize());

  grid = new PlayerGrid('player-grid');

  logs = new LogStore();
  await logs.init();

  logPanel = new LogPanel(logs, 'log-list', 'log-size-info');
  logPanel.bind('btn-export-logs', 'btn-clear-logs');

  cv = new CVEngine(onCVMatch);
  importer = new VideoImporter(grid, cv, getActiveQueries, onCVMatch);

  initQueryPanel(() => refreshCV(), cv);
  initSourcePanel('source-list', () => loadCams());

  libPanel = new LibraryPanel(
    'lib-list',
    cam => pinCam(cam),
    async () => { await loadLibraryCamsOnMap(); applyFilters(); }
  );
  await libPanel.refresh();
  await loadLibraryCamsOnMap();

  bindUI();
  await loadCams();
  initMobileNav();
  await logPanel.refresh();
});

// ─── Caméras bibliothèque YouTube sur la carte ────────────────────────────────
async function loadLibraryCamsOnMap() {
  const streams = await getAllStreams();
  streams.forEach(s => {
    if (s.enabled === false) return;
    const cam = streamToCam(s);
    if (cam.lat || cam.lng) state.cameras.set(cam.id, cam);
  });
}

// ─── Chargement sources réseau ────────────────────────────────────────────────
async function loadCams() {
  setLoading(true);
  try {
    const cams = await fetchAllCameras(map.getBbox());
    // Garder les caméras YouTube/manuelles entre les refreshs
    const keep = [...state.cameras.values()].filter(
      c => c.sourceId === 'youtube' || c.sourceId === 'manual'
    );
    state.cameras.clear();
    keep.forEach(c => state.cameras.set(c.id, c));
    cams.forEach(c => state.cameras.set(c.id, c));
    applyFilters();
    populateFilters();
  } catch (e) {
    console.error('[VigiMap]', e);
  } finally {
    setLoading(false);
  }
}

// ─── Filtres ──────────────────────────────────────────────────────────────────
function applyFilters() {
  const f = state.filters;
  const visible = [...state.cameras.values()].filter(c => {
    if (f.source  && c.sourceId !== f.source)  return false;
    if (f.status  && c.status   !== f.status)  return false;
    if (f.country && c.country  !== f.country) return false;
    if (!getSetting('showOffline') && c.status === 'offline') return false;
    return true;
  });
  map.setCameras(visible.filter(c => c.lat || c.lng));
}

function populateFilters() {
  const u = k => [...new Set([...state.cameras.values()].map(c => c[k]).filter(Boolean))].sort();
  fillSel('filter-source',  u('sourceId'));
  fillSel('filter-country', u('country'));
}

function fillSel(id, vals) {
  const el = document.getElementById(id);
  if (!el) return;
  const first = el.options[0];
  el.innerHTML = '';
  el.appendChild(first);
  vals.forEach(v => {
    const o = document.createElement('option');
    o.value = o.textContent = v;
    el.appendChild(o);
  });
}

// ─── CV ───────────────────────────────────────────────────────────────────────
async function refreshCV() {
  const q = getActiveQueries();
  cv.stopAll();
  if (!q.length) return;
  for (const p of grid.all()) await cv.start(p, q);
}

async function onCVMatch(cameraId, query, result, frameB64) {
  const cam = state.cameras.get(cameraId) || { name: cameraId, sourceId: '' };
  map.updateCameraStatus(cameraId, 'match');
  setTimeout(() => map.updateCameraStatus(cameraId, cam.status || 'unknown'), 8000);
  grid.highlight(cameraId);
  await logs.add({
    cameraId,
    cameraName:   cam.name,
    sourceName:   cam.sourceId,
    queryId:      query.id,
    queryName:    query.name,
    matchDetails: result.matchDetails,
    globalScore:  result.globalScore,
    frameCapture: frameB64 || null,
  });
  await logPanel.refresh();
  flash(`🎯 Match [${query.name}] ${cam.name} — ${Math.round(result.globalScore * 100)}%`);
}

// ─── Click sur marqueur carte ─────────────────────────────────────────────────
function onCamClick(cam) {
  const pinned = grid.isPinned(cam.id);
  const isYt   = cam.sourceId === 'youtube' || cam.sourceId === 'manual';
  const popup  = document.getElementById('camera-popup-inner');
  if (!popup) return;
  popup.innerHTML = `
    <div class="popup-header">
      <strong>${cam.name}</strong>
      <span class="badge badge--${cam.status || 'unknown'}">${cam.status || '?'}</span>
    </div>
    <div class="popup-meta">
      <span>${cam.sourceId || ''}</span>
      ${cam.country ? `<span>${cam.country}</span>` : ''}
    </div>
    <div class="popup-actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn--primary btn--sm" id="popup-pin">
        ${pinned ? '📌 Épinglé' : '📌 Épingler'}
      </button>
      ${isYt ? `<button class="btn btn--ghost btn--sm" id="popup-edit">✏️ Éditer</button>` : ''}
    </div>`;

  document.getElementById('popup-pin')?.addEventListener('click', () => {
    pinCam(cam);
    document.getElementById('camera-popup')?.classList.add('hidden');
  });
  document.getElementById('popup-edit')?.addEventListener('click', () => {
    openAddStreamModal(cam, async () => { await libPanel.refresh(); await loadLibraryCamsOnMap(); applyFilters(); });
  });

  document.getElementById('camera-popup')?.classList.remove('hidden');
}

function pinCam(cam) {
  grid.pin(cam);
}

// ─── Bindings UI généraux ─────────────────────────────────────────────────────
function bindUI() {
  // Fermer popup carte
  document.getElementById('btn-close-popup')?.addEventListener('click', () => {
    document.getElementById('camera-popup')?.classList.add('hidden');
  });

  // Filtres
  document.getElementById('filter-source')?.addEventListener('change', e => {
    state.filters.source = e.target.value; applyFilters();
  });
  document.getElementById('filter-status')?.addEventListener('change', e => {
    state.filters.status = e.target.value; applyFilters();
  });
  document.getElementById('filter-country')?.addEventListener('change', e => {
    state.filters.country = e.target.value; applyFilters();
  });

  // Refresh caméras
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadCams());

  // Ajouter un flux YouTube/manuel
  document.getElementById('btn-add-stream')?.addEventListener('click', () => {
    openAddStreamModal(null, async () => { await libPanel.refresh(); await loadLibraryCamsOnMap(); applyFilters(); });
  });

  // Import fichier local
  document.getElementById('btn-import')?.addEventListener('click', () => {
    importer.run();
  });

  // Settings
  const btnSettings  = document.getElementById('btn-settings');
  const settingsBody = document.getElementById('settings-body');
  btnSettings?.addEventListener('click', () => {
    settingsBody?.classList.toggle('hidden');
    if (!settingsBody?.classList.contains('hidden')) initSettingsPanel();
  });
  document.getElementById('btn-settings-close')?.addEventListener('click', () => {
    settingsBody?.classList.add('hidden');
  });

  // Logs
  document.getElementById('btn-logs')?.addEventListener('click', () => {
    document.getElementById('logs-panel')?.classList.toggle('hidden');
    logPanel.refresh();
  });
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────
function initMobileNav() {
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(target)?.classList.remove('hidden');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setLoading(on) {
  document.getElementById('loading-indicator')?.classList.toggle('hidden', !on);
}

function flash(msg) {
  const el = document.getElementById('flash-msg');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 5000);
}
