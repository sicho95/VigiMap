// VigiMap v2 — app.js (point d'entrée principal)
import { MapManager }       from './map/MapManager.js';
import { PlayerGrid }       from './player/PlayerGrid.js';
import { fetchAllCameras }  from './sources/SourceManager.js';
import { initSettingsPanel } from './settings/SettingsPanel.js';
import { getSetting }       from './settings/SettingsManager.js';
import { LogStore }         from './logs/LogStore.js';
import { LogPanel }         from './logs/LogPanel.js';
import { CVEngine }         from './cv/CVEngine.js';
import { initQueryPanel }   from './queries/QueryEditor.js';
import { getActiveQueries } from './queries/QueryManager.js';

const state = { cameras: new Map(), filters: { source: '', status: '', country: '' } };
let map, grid, logs, logPanel, cv;

// ── Point d'entrée — attend le DOM ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

  // Settings — le DOM est garanti disponible ici
  initSettingsPanel();

  map     = new MapManager('map', onCamClick).init();
  // Force Leaflet à recalculer la taille après que le DOM soit stable
  requestAnimationFrame(() => map.getMap().invalidateSize());"""
  grid    = new PlayerGrid('player-grid');
  logs    = new LogStore();
  await logs.init();
  logPanel = new LogPanel(logs);
  logPanel.bind();
  cv = new CVEngine(onCVMatch);

  initQueryPanel(() => refreshCV(), cv);
  bindUI();
  await loadCams();
  initMobileNav();
  await logPanel.refresh();
});

// ── Chargement cameras ───────────────────────────────────────────────────────
async function loadCams() {
  setLoading(true);
  try {
    const cams = await fetchAllCameras(map.getBbox());
    state.cameras.clear();
    cams.forEach(c => state.cameras.set(c.id, c));
    applyFilters();
    populateFilters();
  } catch (e) {
    console.error('[VigiMap]', e);
  } finally {
    setLoading(false);
  }
}

function applyFilters() {
  const f = state.filters;
  const v = [...state.cameras.values()].filter(c => {
    if (f.source  && c.sourceId !== f.source)  return false;
    if (f.status  && c.status   !== f.status)   return false;
    if (f.country && c.country  !== f.country)  return false;
    if (!getSetting('showOffline') && c.status === 'offline') return false;
    return true;
  });
  map.setCameras(v);
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

// ── CV ───────────────────────────────────────────────────────────────────────
async function refreshCV() {
  const q = getActiveQueries();
  cv.stopAll();
  if (!q.length) return;
  for (const p of grid.all()) await cv.start(p, q);
}

async function onCVMatch(cameraId, query, result, frameB64) {
  const cam = state.cameras.get(cameraId);
  map.updateCameraStatus(cameraId, 'match');
  setTimeout(() => map.updateCameraStatus(cameraId, 'pinned'), 8000);
  grid.highlight(cameraId);
  await logs.add({
    cameraId,
    cameraName:   cam?.name    || cameraId,
    sourceName:   cam?.sourceId || '',
    queryId:      query.id,
    queryName:    query.name,
    matchDetails: result.matchDetails,
    globalScore:  result.globalScore,
    frameCapture: frameB64 || null,
  });
  await logPanel.refresh();
  flash('Match [' + query.name + '] ' + (cam?.name || cameraId) + ' ' + Math.round(result.globalScore * 100) + '%');
}

// ── Popup caméra ─────────────────────────────────────────────────────────────
function onCamClick(cam) {
  const pinned = grid.isPinned(cam.id);
  document.getElementById('camera-popup-inner').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
      '<strong style="font-size:13px">' + cam.name + '</strong>' +
      '<button class="btn btn--ghost btn--sm" data-close>&times;</button>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-2);margin-bottom:8px">' +
      cam.sourceId + ' &middot; ' + (cam.country || '&mdash;') +
      ' &middot; <span class="badge badge--' + cam.status + '">' + cam.status + '</span>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-3);margin-bottom:12px">' +
      cam.lat.toFixed(5) + ', ' + cam.lng.toFixed(5) +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn--primary btn--sm" data-pin>' + (pinned ? 'Dépingler' : 'Épingler') + '</button>' +
      (cam.streamUrl || cam.snapshotUrl ? '<button class="btn btn--ghost btn--sm" data-open>Ouvrir</button>' : '') +
      '<button class="btn btn--ghost btn--sm" data-analyze>Analyser CV</button>' +
    '</div>';

  const inner = document.getElementById('camera-popup-inner');

  inner.querySelector('[data-close]').onclick = closePopup;

  inner.querySelector('[data-pin]').onclick = () => {
    if (pinned) {
      grid.unpin(cam.id);
      map.updateCameraStatus(cam.id, cam.status);
    } else {
      grid.pin(cam);
      map.updateCameraStatus(cam.id, 'pinned');
      refreshCV();
    }
    closePopup();
  };

  inner.querySelector('[data-open]')?.addEventListener('click', () => {
    grid.pin(cam);
    map.updateCameraStatus(cam.id, 'pinned');
    refreshCV();
    closePopup();
  });

  inner.querySelector('[data-analyze]')?.addEventListener('click', async () => {
    closePopup();
    let p = grid.getPlayer(cam.id);
    if (!p) { grid.pin(cam); await new Promise(r => setTimeout(r, 1200)); }
    p = grid.getPlayer(cam.id);
    if (p) {
      const r = await cv.analyzeOnce(p, getActiveQueries() || []);
      if (r) flash('Analyse OK ' + (r.objects?.length || 0) + ' objet(s)');
    }
  });

  document.getElementById('camera-popup').classList.remove('hidden');
}

function closePopup() {
  document.getElementById('camera-popup').classList.add('hidden');
}

// ── Bindings UI ───────────────────────────────────────────────────────────────
function bindUI() {
  const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);

  on('filter-source',  'change', e => { state.filters.source  = e.target.value; applyFilters(); });
  on('filter-status',  'change', e => { state.filters.status  = e.target.value; applyFilters(); });
  on('filter-country', 'change', e => { state.filters.country = e.target.value; applyFilters(); });
  on('btn-refresh', 'click', loadCams);

  on('btn-cv-toggle', 'click', e => {
    const active = e.target.dataset.on === '1';
    e.target.dataset.on  = active ? '0' : '1';
    e.target.textContent = active ? 'CV On' : 'CV Off';
    active ? cv.stopAll() : refreshCV();
  });

  on('btn-sources', 'click', () => document.getElementById('source-panel')?.classList.toggle('hidden'));
  on('btn-queries', 'click', () => document.getElementById('query-panel')?.classList.toggle('hidden'));
  on('btn-logs',    'click', () => document.getElementById('log-panel-side')?.classList.toggle('hidden'));

  map.getMap().on('click', closePopup);
}

// ── Navigation mobile ─────────────────────────────────────────────────────────
function initMobileNav() {
  const btns = document.querySelectorAll('.mobile-nav__btn');
  const tabs  = {
    map:     'map-panel',
    streams: 'side-panel',
    queries: 'query-panel-mobile',
    logs:    'log-panel-mobile',
  };
  btns.forEach(btn => btn.addEventListener('click', () => {
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(tabs).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const target = document.getElementById(tabs[btn.dataset.tab] || 'map-panel');
    if (target) target.style.display = '';
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function flash(msg) {
  let n = document.getElementById('notif-bar');
  if (!n) {
    n = document.createElement('div');
    n.id = 'notif-bar';
    n.className = 'notif-bar';
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.classList.add('show');
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove('show'), 5000);
}

function setLoading(on) {
  const el = document.getElementById('loading-bar');
  if (el) el.style.display = on ? '' : 'none';
}
