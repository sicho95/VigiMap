import { MapView }          from './map/MapView.js';
import { SourceManager }    from './sources/SourceManager.js';
import { CVEngine }         from './cv/CVEngine.js';
import { QueryStore }       from './cv/QueryStore.js';
import { LogStore }         from './logs/LogStore.js';
import { CameraGrid }       from './player/CameraGrid.js';
import { VideoImporter }    from './import/VideoImporter.js';
import { initSettingsPanel } from './settings/SettingsPanel.js';
import { getSetting }       from './settings/SettingsManager.js';

window.addEventListener('DOMContentLoaded', async () => {
  // ── Stores & moteurs ────────────────────────────────────────────────────
  const logStore   = new LogStore();
  const queryStore = new QueryStore();

  const cv = new CVEngine(async (camId, query, result, frameB64) => {
    await logStore.add({ camId, query, result, frameB64, ts: Date.now() });
    ui.refreshLogs?.();
  });

  // ── Carte ────────────────────────────────────────────────────────────────
  const map = new MapView('map', { onClick: cam => grid.pin(cam) });

  // ── Grille de players ────────────────────────────────────────────────────
  const grid = new CameraGrid(
    document.getElementById('grid'),
    cv,
    () => queryStore.getAll()
  );

  // ── Sources ──────────────────────────────────────────────────────────────
  const sources = new SourceManager({
    proxy:   getSetting('proxyUrl') || '',
    apiKeys: getSetting('apiKeys')  || {},
  });

  // ── Import vidéo/photo ───────────────────────────────────────────────────
  const importer = new VideoImporter(
    grid, cv,
    () => queryStore.getAll(),
    async (camId, query, result, frame) => {
      await logStore.add({ camId, query, result, frameB64: frame, ts: Date.now() });
      ui.refreshLogs?.();
    }
  );

  // ── UI bindings ──────────────────────────────────────────────────────────
  const ui = {};
  bindUI(map, sources, grid, cv, queryStore, logStore, importer, ui);
});

function bindUI(map, sources, grid, cv, queryStore, logStore, importer, ui) {

  // ── Chargement des caméras ────────────────────────────────────────────────
  async function loadCams() {
    const bbox = map.getBounds();
    try {
      const cams = await sources.fetchAllCameras(bbox);
      cams.forEach(c => map.addMarker(c));
    } catch (e) {
      console.warn('[app.js]', e);
    }
  }

  map.on('moveend', loadCams);
  map.on('zoomend', loadCams);
  loadCams();

  // ── Bouton Settings ───────────────────────────────────────────────────────
  const btnSettings  = document.getElementById('btn-settings');
  const settingsBody = document.getElementById('settings-body');

  if (btnSettings && settingsBody) {
    btnSettings.addEventListener('click', () => {
      settingsBody.classList.toggle('hidden');
      // ✅ FIX : initSettingsPanel appelé ICI, après que le panneau est visible
      // #settings-inner existe dans le DOM à ce moment précis
      if (!settingsBody.classList.contains('hidden')) {
        initSettingsPanel();
      }
    });
  }

  // ── Bouton fermeture Settings ─────────────────────────────────────────────
  document.getElementById('btn-settings-close')?.addEventListener('click', () => {
    settingsBody?.classList.add('hidden');
  });

  // ── Import fichier ────────────────────────────────────────────────────────
  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-panel')?.classList.toggle('hidden');
  });

  document.getElementById('btn-import-run')?.addEventListener('click', () => {
    importer.run();
    document.getElementById('import-panel')?.classList.add('hidden');
  });

  // ── Panneau CV/Queries ────────────────────────────────────────────────────
  document.getElementById('btn-cv')?.addEventListener('click', () => {
    document.getElementById('cv-panel')?.classList.toggle('hidden');
  });

  document.getElementById('btn-add-query')?.addEventListener('click', () => {
    const name = document.getElementById('query-name')?.value?.trim();
    const type = document.getElementById('query-type')?.value;
    if (!name) return;
    queryStore.add({ name, type, id: 'q_' + Date.now() });
    renderQueries();
  });

  function renderQueries() {
    const list = document.getElementById('query-list');
    if (!list) return;
    const qs = queryStore.getAll();
    list.innerHTML = qs.length
      ? qs.map(q => `
          <div class="query-item" data-id="${q.id}">
            <span>${q.name}</span>
            <span class="badge">${q.type}</span>
            <button class="btn btn--ghost btn--xs" data-del="${q.id}">✕</button>
          </div>`).join('')
      : '<span style="color:var(--color-text-muted);font-size:12px">Aucune requête</span>';
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        queryStore.remove(btn.dataset.del);
        renderQueries();
      });
    });
  }
  renderQueries();

  // ── Logs ──────────────────────────────────────────────────────────────────
  document.getElementById('btn-logs')?.addEventListener('click', () => {
    document.getElementById('logs-panel')?.classList.toggle('hidden');
    refreshLogs();
  });

  async function refreshLogs() {
    const list = document.getElementById('logs-list');
    if (!list) return;
    const logs = await logStore.getAll();
    list.innerHTML = logs.length
      ? [...logs].reverse().slice(0, 50).map(l => `
          <div class="log-item">
            <span class="log-time">${new Date(l.ts).toLocaleTimeString()}</span>
            <span class="log-cam">${l.camId}</span>
            <span class="log-query">${l.query?.name || ''}</span>
            <span class="log-score">${Math.round((l.result?.globalScore || 0) * 100)}%</span>
            ${l.frameB64 ? `<img src="${l.frameB64}" class="log-thumb">` : ''}
          </div>`).join('')
      : '<span style="color:var(--color-text-muted);font-size:12px">Aucun log</span>';
  }

  ui.refreshLogs = refreshLogs;

  document.getElementById('btn-clear-logs')?.addEventListener('click', async () => {
    await logStore.clear();
    refreshLogs();
  });

  // ── CV global start/stop ──────────────────────────────────────────────────
  document.getElementById('btn-cv-start')?.addEventListener('click', () => {
    const qs = queryStore.getAll();
    if (!qs.length) { alert('Créez d\'abord au moins une requête CV.'); return; }
    grid.getAllPlayers().forEach(p => cv.start(p, qs));
  });

  document.getElementById('btn-cv-stop')?.addEventListener('click', () => {
    cv.stopAll();
  });
}
