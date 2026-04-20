import { MapManager }        from './map/MapManager.js';
import { PlayerGrid }        from './player/PlayerGrid.js';
import { VideoImporter }     from './player/VideoImporter.js';
import { fetchAllCameras, SOURCE_REGISTRY } from './sources/SourceManager.js';
import { initSourcePanel }   from './sources/SourcePanel.js';
import { initSettingsPanel } from './settings/SettingsPanel.js';
import { getSetting, setSetting } from './settings/SettingsManager.js';
import { LogStore }          from './logs/LogStore.js';
import { LogPanel }          from './logs/LogPanel.js';
import { CVEngine }          from './cv/CVEngine.js';
import { initQueryPanel }    from './queries/QueryEditor.js';
import { getActiveQueries }  from './queries/QueryManager.js';
import { LibraryPanel }      from './youtube/LibraryPanel.js';
import { openAddStreamModal } from './youtube/AddStreamModal.js';
import { getAllStreams, streamToCam } from './youtube/YouTubeLibrary.js';

// ─── État global ───────────────────────────────────────────────────────────────
const state = {
  cameras: new Map(),
  filters: { source: '', status: '', country: '' },
};

let map, grid, logs, logPanel, cv, importer, libPanel;

// ─── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

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
  initSourcePanel('source-list', () => loadCams(), onSourceToggle);

  libPanel = new LibraryPanel(
    'lib-list',
    cam => pinCam(cam),
    async () => { await loadLibraryCamsOnMap(); applyFilters(); }
  );

  await libPanel.refresh();
  await loadLibraryCamsOnMap();

  bindUI();
  initSettingsPanel();  // appelé après bindUI pour que #settings-inner soit dans le DOM
  await loadCams();
  initMobileNav();
  await logPanel.refresh();
});

// ─── Callback toggle source depuis SourcePanel ─────────────────────────────────
// Appelé quand l'utilisateur active une source.
// Vérifie si elle nécessite une clé API — si manquante, annule + flash erreur.
function onSourceToggle(sourceId, newState) {
  if (!newState) return; // désactivation toujours OK

  const entry = SOURCE_REGISTRY.find(s => s.id === sourceId);
  if (!entry || !entry.apiKey) return; // pas de clé requise

  const apiKeys = getSetting('apiKeys') || {};
  if (!apiKeys[entry.apiKey]) {
    // Annuler l'activation
    const ss = getSetting('sources') || {};
    ss[sourceId] = false;
    setSetting('sources', ss);
    // Ré-afficher le toggle en off
    const toggle = document.querySelector(`[data-source-id="${sourceId}"] .source-toggle`);
    if (toggle) toggle.checked = false;

    flash(
      `🔑 La source "${entry.name}" nécessite une clé API ("${entry.apiKey}").\n` +
      `Renseignez-la dans Paramètres > Clés API, puis réactivez la source.`,
      8000,
      'error'
    );
    return;
  }
}

// ─── Bibliothèque YouTube sur la carte ────────────────────────────────────────
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
  const u = k =>
    [...new Set([...state.cameras.values()].map(c => c[k]).filter(Boolean))].sort();
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
      ${cam.city    ? `<span>${cam.city}</span>`    : ''}
    </div>
    ${cam.streamUrl ? `<div class="popup-url"><a href="${cam.streamUrl}" target="_blank" rel="noopener noreferrer">🔗 Flux</a></div>` : ''}
    <div class="popup-actions">
      <button class="btn btn--primary btn--sm" id="popup-pin">
        ${pinned ? '📌 Épinglé' : '📌 Épingler'}
      </button>
      ${isYt ? `<button class="btn btn--ghost btn--sm" id="popup-edit">✏️ Éditer</button>` : ''}
    </div>
  `;

  document.getElementById('popup-pin')?.addEventListener('click', () => {
    pinCam(cam);
    document.getElementById('camera-popup')?.classList.add('hidden');
  });

  document.getElementById('popup-edit')?.addEventListener('click', () => {
    openAddStreamModal(cam, async () => {
      await libPanel.refresh();
      await loadLibraryCamsOnMap();
      applyFilters();
    });
  });

  document.getElementById('camera-popup')?.classList.remove('hidden');
}

// ─── Pin caméra ───────────────────────────────────────────────────────────────
function pinCam(cam) {
  grid.pin(cam);
}

// ─── Bindings UI ──────────────────────────────────────────────────────────────
function bindUI() {
  // Popup fermeture
  document.getElementById('btn-close-popup')?.addEventListener('click', () => {
    document.getElementById('camera-popup')?.classList.add('hidden');
  });

  // Filtres
  document.getElementById('filter-source')?.addEventListener('change', e => {
    state.filters.source = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-status')?.addEventListener('change', e => {
    state.filters.status = e.target.value;
    applyFilters();
  });
  document.getElementById('filter-country')?.addEventListener('change', e => {
    state.filters.country = e.target.value;
    applyFilters();
  });

  // Refresh
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadCams());

  // Ajout stream
  document.getElementById('btn-add-stream')?.addEventListener('click', () => {
    openAddStreamModal(null, async () => {
      await libPanel.refresh();
      await loadLibraryCamsOnMap();
      applyFilters();
    });
  });

  // Import fichier
  document.getElementById('btn-import')?.addEventListener('click', () => {
    importer.run();
  });

  // Panneau settings — toggle
  const btnSettings  = document.getElementById('btn-settings');
  const settingsBody = document.getElementById('settings-body');
  btnSettings?.addEventListener('click', () => {
    const hidden = settingsBody?.classList.toggle('hidden');
    if (!hidden) initSettingsPanel();
  });
  document.getElementById('btn-settings-close')?.addEventListener('click', () => {
    settingsBody?.classList.add('hidden');
  });

  // Panneau logs
  document.getElementById('btn-logs')?.addEventListener('click', () => {
    document.getElementById('logs-panel')?.classList.toggle('hidden');
    logPanel.refresh();
  });
  document.getElementById('btn-logs-close')?.addEventListener('click', () => {
    document.getElementById('logs-panel')?.classList.add('hidden');
  });

  // Panneau bibliothèque
  document.getElementById('btn-lib')?.addEventListener('click', () => {
    document.getElementById('lib-panel')?.classList.toggle('hidden');
    libPanel.refresh();
  });
  document.getElementById('btn-lib-close')?.addEventListener('click', () => {
    document.getElementById('lib-panel')?.classList.add('hidden');
  });

  // Panneau sources
  document.getElementById('btn-sources')?.addEventListener('click', () => {
    document.getElementById('sources-panel')?.classList.toggle('hidden');
  });
  document.getElementById('btn-sources-close')?.addEventListener('click', () => {
    document.getElementById('sources-panel')?.classList.add('hidden');
  });

  // Panneau CV / queries
  document.getElementById('btn-cv')?.addEventListener('click', () => {
    document.getElementById('cv-panel')?.classList.toggle('hidden');
  });
  document.getElementById('btn-cv-close')?.addEventListener('click', () => {
    document.getElementById('cv-panel')?.classList.add('hidden');
  });

  // Fermeture popup sur clic fond carte
  document.getElementById('map')?.addEventListener('click', e => {
    if (e.target.id === 'map') {
      document.getElementById('camera-popup')?.classList.add('hidden');
    }
  });
}

// ─── Navigation mobile (tabs) ─────────────────────────────────────────────────
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

// ─── Loader ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  document.getElementById('loading-indicator')?.classList.toggle('hidden', !on);
}

// ─── Flash notification ───────────────────────────────────────────────────────
// type: 'info' (défaut) | 'error'
function flash(msg, duration = 5000, type = 'info') {
  const el = document.getElementById('flash-msg');
  if (!el) return;
  el.textContent = msg;
  el.className = `flash flash--${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), duration);
}
