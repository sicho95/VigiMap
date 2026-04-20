import { MapManager }         from './map/MapManager.js';
import { PlayerGrid }         from './player/PlayerGrid.js';
import { VideoImporter }      from './player/VideoImporter.js';
import { fetchAllCameras, SOURCE_REGISTRY } from './sources/SourceManager.js';
import { initSourcePanel }    from './sources/SourcePanel.js';
import { initSettingsPanel }  from './settings/SettingsPanel.js';
import { getSetting, setSetting } from './settings/SettingsManager.js';
import { LogStore }           from './logs/LogStore.js';
import { LogPanel }           from './logs/LogPanel.js';
import { CVEngine }           from './cv/CVEngine.js';
import { initQueryPanel }     from './queries/QueryEditor.js';
import { getActiveQueries }   from './queries/QueryManager.js';
import { LibraryPanel }       from './youtube/LibraryPanel.js';
import { openAddStreamModal }  from './youtube/AddStreamModal.js';
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
  initSettingsPanel();
  await loadCams();
  initMobileNav();
  await logPanel.refresh();
});

// ─── Garde clé API sur activation source ──────────────────────────────────────
function onSourceToggle(sourceId, newState) {
  if (!newState) return;
  const entry = SOURCE_REGISTRY.find(s => s.id === sourceId);
  if (!entry || !entry.apiKey) return;
  const apiKeys = getSetting('apiKeys') || {};
  if (!apiKeys[entry.apiKey]) {
    const ss = getSetting('sources') || {};
    ss[sourceId] = false;
    setSetting('sources', ss);
    const toggle = document.querySelector(`[data-source-id="${sourceId}"] .source-toggle`);
    if (toggle) toggle.checked = false;
    flash(
      `🔑 "${entry.name}" nécessite la clé API "${entry.apiKey}". Configurez-la dans ⚙️ Paramètres.`,
      8000, 'error'
    );
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
      ${cam.country ? '<span>' + cam.country + '</span>' : ''}
      ${cam.city    ? '<span>' + cam.city + '</span>' : ''}
    </div>
    ${cam.streamUrl ? '<div class="popup-url"><a href="' + cam.streamUrl + '" target="_blank" rel="noopener noreferrer">🔗 Flux</a></div>' : ''}
    <div class="popup-actions">
      <button class="btn btn--primary btn--sm" id="popup-pin">
        ${pinned ? '📌 Épinglé' : '📌 Épingler'}
      </button>
      ${isYt ? '<button class="btn btn--ghost btn--sm" id="popup-edit">✏️ Éditer</button>' : ''}
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
// Tous les IDs correspondent exactement à ceux du index.html en production :
//   btn-sources      → source-panel
//   btn-queries      → query-panel
//   btn-library      → library-panel
//   btn-logs         → log-panel-side
//   btn-import       → import-panel
//   btn-add-stream   → openAddStreamModal
//   btn-cv-toggle    → toggle CV on/off
//   btn-settings     → settings-body
function bindUI() {
  // ── Popup fermeture ──
  document.getElementById('btn-close-popup')?.addEventListener('click', () => {
    document.getElementById('camera-popup')?.classList.add('hidden');
  });

  // ── Filtres ──
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

  // ── Refresh ──
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadCams());

  // ── Panneau Sources ──
  document.getElementById('btn-sources')?.addEventListener('click', () => {
    togglePanel('source-panel');
  });
  document.getElementById('btn-sources-close')?.addEventListener('click', () => {
    hidePanel('source-panel');
  });

  // ── Panneau Requêtes CV ──
  document.getElementById('btn-queries')?.addEventListener('click', () => {
    togglePanel('query-panel');
  });

  // ── Panneau Bibliothèque ──
  document.getElementById('btn-library')?.addEventListener('click', () => {
    togglePanel('library-panel');
    libPanel.refresh();
  });
  document.getElementById('btn-library-close')?.addEventListener('click', () => {
    hidePanel('library-panel');
  });

  // ── Bouton ➕ dans la bibliothèque ──
  document.getElementById('btn-add-stream-lib')?.addEventListener('click', () => {
    openAddStreamModal(null, async () => {
      await libPanel.refresh();
      await loadLibraryCamsOnMap();
      applyFilters();
    });
  });

  // ── Bouton ➕ Flux dans la barre ──
  document.getElementById('btn-add-stream')?.addEventListener('click', () => {
    openAddStreamModal(null, async () => {
      await libPanel.refresh();
      await loadLibraryCamsOnMap();
      applyFilters();
    });
  });

  // ── Panneau Logs ──
  document.getElementById('btn-logs')?.addEventListener('click', () => {
    togglePanel('log-panel-side');
    logPanel.refresh();
  });

  // ── Panneau Import ──
  document.getElementById('btn-import')?.addEventListener('click', () => {
    togglePanel('import-panel');
  });
  document.getElementById('btn-import-close')?.addEventListener('click', () => {
    hidePanel('import-panel');
  });
  document.getElementById('btn-import-run')?.addEventListener('click', () => {
    importer.run();
    hidePanel('import-panel');
  });

  // ── Toggle CV on/off ──
  const btnCvToggle = document.getElementById('btn-cv-toggle');
  btnCvToggle?.addEventListener('click', () => {
    const isOn = btnCvToggle.dataset.on === '1';
    if (isOn) {
      cv.stopAll();
      btnCvToggle.dataset.on = '0';
      btnCvToggle.textContent = 'CV On';
      btnCvToggle.classList.remove('btn--active');
    } else {
      refreshCV();
      btnCvToggle.dataset.on = '1';
      btnCvToggle.textContent = 'CV Off';
      btnCvToggle.classList.add('btn--active');
    }
  });

  // ── Paramètres ──
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    const body = document.getElementById('settings-body');
    if (!body) return;
    const wasHidden = body.classList.toggle('hidden');
    if (!wasHidden) initSettingsPanel();
  });
  document.getElementById('btn-settings-close')?.addEventListener('click', () => {
    document.getElementById('settings-body')?.classList.add('hidden');
  });

  // ── Rechargement après sauvegarde des paramètres ──
  document.addEventListener('vigimap:settings-saved', () => loadCams());
}

// ─── Helpers panneaux ─────────────────────────────────────────────────────────
function togglePanel(id) {
  document.getElementById(id)?.classList.toggle('hidden');
}
function hidePanel(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// ─── Navigation mobile ────────────────────────────────────────────────────────
function initMobileNav() {
  const PANELS = {
    map:      'map-panel',
    streams:  'streams-panel',
    library:  'library-panel',
    queries:  'query-panel',
    logs:     'log-panel-side',
  };

  const tabs = document.querySelectorAll('.mobile-nav__btn[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      // Masquer tous les panneaux latéraux connus
      Object.values(PANELS).forEach(pid => {
        document.getElementById(pid)?.classList.add('hidden');
      });
      // Afficher le panneau cible
      const panelId = PANELS[target];
      if (panelId) document.getElementById(panelId)?.classList.remove('hidden');

      // Actualisation si besoin
      if (target === 'library') libPanel?.refresh();
      if (target === 'logs')    logPanel?.refresh();

      // Styles actifs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// ─── Loader ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  const bar = document.getElementById('loading-bar');
  if (!bar) return;
  bar.style.display = on ? 'block' : 'none';
}

// ─── Flash notification ───────────────────────────────────────────────────────
function flash(msg, duration = 5000, type = 'info') {
  let el = document.getElementById('flash-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash-msg';
    el.style.cssText = [
      'position:fixed', 'bottom:72px', 'left:50%', 'transform:translateX(-50%)',
      'max-width:90vw', 'padding:8px 16px', 'border-radius:8px',
      'font-size:13px', 'z-index:9999', 'pointer-events:none',
      'transition:opacity .3s',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background  = type === 'error' ? '#c0392b' : '#2d2d2d';
  el.style.color       = '#fff';
  el.style.opacity     = '1';
  el.style.display     = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, duration);
}
