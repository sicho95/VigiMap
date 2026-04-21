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
import { openAddStreamModal } from './youtube/AddStreamModal.js';
import { getAllStreams, streamToCam } from './youtube/YouTubeLibrary.js';

const UI_KEYS = {
  panelWidth:     'vigimap.ui.panelWidth',
  mapHidden:      'vigimap.ui.isMapHidden',
  currentView:    'vigimap.ui.currentView',
  connectivity:   'vigimap.connectivity.mode',
  desktopPanelTab:'vigimap.ui.desktopPanelTab',
};

const MOBILE_BREAKPOINT    = 768;
const DESKTOP_PANEL_DEFAULT = 400;
const DESKTOP_PANEL_MIN     = 400;

const state = {
  cameras: new Map(),
  filters: { source: '', status: '', country: '' },
  ui: {
    currentView:     localStorage.getItem(UI_KEYS.currentView)     || 'map',
    desktopPanelTab: localStorage.getItem(UI_KEYS.desktopPanelTab) || 'streams',
    panelWidth:      parseInt(localStorage.getItem(UI_KEYS.panelWidth) || DESKTOP_PANEL_DEFAULT, 10),
    isMapHidden:     localStorage.getItem(UI_KEYS.mapHidden) === '1',
    connectivity:    localStorage.getItem(UI_KEYS.connectivity)    || 'online',
  },
};

let map, grid, logs, logPanel, cv, importer, libPanel;

const MOBILE_PANEL_MAP = {
  streams: 'streams-panel',
  library: 'library-panel',
  queries: 'query-panel',
  logs:    'log-panel-side',
  import:  'import-panel',
};

const DESKTOP_PANEL_MAP = { ...MOBILE_PANEL_MAP };

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  map = new MapManager('map', onCamClick).init();
  requestAnimationFrame(() => map.getMap().invalidateSize());
  grid     = new PlayerGrid('player-grid');
  logs     = new LogStore();
  await logs.init();
  logPanel = new LogPanel(logs, 'log-list', 'log-size-info');
  logPanel.bind('btn-export-logs', 'btn-clear-logs');
  cv       = new CVEngine(onCVMatch);
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
  applyDesktopPanelWidth();
  applyMapVisibility();
  updateConnectivityUI();
  await loadCams();
  initMobileNav();
  initDesktopToolbarNav();
  await logPanel.refresh();
  syncResponsiveState();
  window.addEventListener('resize', onWindowResize);
});

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
    flash(`🔑 "${entry.name}" nécessite la clé API "${entry.apiKey}". Configurez-la dans ⚙️ Paramètres.`, 8000, 'error');
  }
}

async function loadLibraryCamsOnMap() {
  const streams = await getAllStreams();
  streams.forEach(s => {
    if (s.enabled === false) return;
    const cam = streamToCam(s);
    if (cam.lat || cam.lng) state.cameras.set(cam.id, cam);
  });
}

async function loadCams() {
  if (state.ui.connectivity === 'offline') { applyFilters(); return; }
  setLoading(true);
  try {
    const cams = await fetchAllCameras(map.getBbox());
    const keep = [...state.cameras.values()].filter(c => c.sourceId === 'youtube' || c.sourceId === 'manual');
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

function applyFilters() {
  const f = state.filters;
  const visible = [...state.cameras.values()].filter(c => {
    if (state.ui.connectivity === 'offline' && c.sourceId !== 'youtube' && c.sourceId !== 'manual') return false;
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

function onCamClick(cam) {
  const pinned = grid.isPinned(cam.id);
  const isYt   = cam.sourceId === 'youtube' || cam.sourceId === 'manual';
  const popup  = document.getElementById('camera-popup-inner');
  if (!popup) return;
  ensurePopupVisibility(cam);
  popup.innerHTML = `
    <div class="popup-header">
      <strong>${cam.name}</strong>
      <span class="badge badge--${cam.status || 'unknown'}">${cam.status || '?'}</span>
    </div>
    <div class="popup-meta">
      <span>${cam.sourceId || ''}</span>
      ${cam.country ? '<span>' + cam.country + '</span>' : ''}
      ${cam.city    ? '<span>' + cam.city    + '</span>' : ''}
    </div>
    ${cam.streamUrl ? '<div class="popup-url"><a href="' + cam.streamUrl + '" target="_blank" rel="noopener noreferrer">🔗 Flux</a></div>' : ''}
    <div class="popup-actions">
      <button class="btn btn--primary btn--sm" id="popup-pin">${pinned ? '📌 Épinglé' : '📌 Épingler'}</button>
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

function ensurePopupVisibility(cam) {
  if (!map?.getMap || !cam?.lat || !cam?.lng) return;
  const leafletMap = map.getMap();
  const point = leafletMap.latLngToContainerPoint([cam.lat, cam.lng]);
  if (point.y < 180) {
    const targetPoint  = L.point(point.x, point.y - 160);
    const targetLatLng = leafletMap.containerPointToLatLng(targetPoint);
    leafletMap.panTo(targetLatLng, { animate: true });
  }
}

function pinCam(cam) { grid.pin(cam); }

function bindUI() {
  document.getElementById('filter-source')?.addEventListener('change',  e => { state.filters.source  = e.target.value; applyFilters(); });
  document.getElementById('filter-status')?.addEventListener('change',  e => { state.filters.status  = e.target.value; applyFilters(); });
  document.getElementById('filter-country')?.addEventListener('change', e => { state.filters.country = e.target.value; applyFilters(); });
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadCams());
  document.getElementById('btn-sources-close')?.addEventListener('click',  () => hidePanel('source-panel'));
  document.getElementById('btn-library-close')?.addEventListener('click',  () => hidePanel('library-panel'));
  document.getElementById('btn-add-stream-lib')?.addEventListener('click', () => {
    openAddStreamModal(null, async () => { await libPanel.refresh(); await loadLibraryCamsOnMap(); applyFilters(); });
  });
  document.getElementById('btn-import-close')?.addEventListener('click', () => hidePanel('import-panel'));
  document.getElementById('btn-import-run')?.addEventListener('click',   () => { importer.run(); hidePanel('import-panel'); });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    const body = document.getElementById('settings-body');
    if (!body) return;
    const wasHidden = body.classList.toggle('hidden');
    if (!wasHidden) initSettingsPanel();
  });
  document.getElementById('btn-settings-close')?.addEventListener('click', () =>
    document.getElementById('settings-body')?.classList.add('hidden')
  );

  document.getElementById('btn-connectivity')?.addEventListener('click', async () => {
    state.ui.connectivity = state.ui.connectivity === 'online' ? 'offline' : 'online';
    localStorage.setItem(UI_KEYS.connectivity, state.ui.connectivity);
    setSetting('uiConnectivityMode', state.ui.connectivity);
    updateConnectivityUI();
    if (state.ui.connectivity === 'offline') {
      await logs.add({ type: 'offline_enter', timestamp: new Date().toISOString() });
      cv.stopAll();
    } else {
      await logs.add({ type: 'offline_exit', timestamp: new Date().toISOString() });
      await loadCams();
      refreshCV();
    }
    await logPanel.refresh();
    applyFilters();
    updateMobileTabAvailability();
  });

  document.getElementById('btn-side-panel-toggle')?.addEventListener('click', () => {
    state.ui.isMapHidden = !state.ui.isMapHidden;
    persistMapVisibility();
    applyMapVisibility();
  });

  initResizeHandle();
  document.addEventListener('vigimap:settings-saved', () => loadCams());
}

function initDesktopToolbarNav() {
  document.querySelectorAll('.toolbar-nav-btn[data-panel-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.ui.desktopPanelTab = btn.dataset.panelTab;
      localStorage.setItem(UI_KEYS.desktopPanelTab, state.ui.desktopPanelTab);
      applyDesktopPanelTab();
    });
  });
  applyDesktopPanelTab();
}

function applyDesktopPanelTab() {
  if (window.innerWidth < MOBILE_BREAKPOINT) return;
  Object.entries(DESKTOP_PANEL_MAP).forEach(([tab, panelId]) => {
    const isActive = tab === state.ui.desktopPanelTab;
    document.getElementById(panelId)?.classList.toggle('hidden', !isActive);
    document.querySelector(`.toolbar-nav-btn[data-panel-tab="${tab}"]`)?.classList.toggle('toolbar-nav-btn--active', isActive);
  });
  if (state.ui.desktopPanelTab === 'library') libPanel?.refresh();
  if (state.ui.desktopPanelTab === 'logs')    logPanel?.refresh();
}

function hidePanel(id) { document.getElementById(id)?.classList.add('hidden'); }

function initMobileNav() {
  const tabs = document.querySelectorAll('.mobile-nav__btn[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (tab.classList.contains('is-disabled')) return;
      state.ui.currentView = target;
      localStorage.setItem(UI_KEYS.currentView, target);
      updateMobileView(target);
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
  updateMobileTabAvailability();
}

function updateMobileView(target) {
  const sidePanel = document.getElementById('side-panel');
  if (window.innerWidth >= MOBILE_BREAKPOINT) return;
  Object.values(MOBILE_PANEL_MAP).forEach(panelId => {
    document.getElementById(panelId)?.classList.remove('mobile-active');
    document.getElementById(panelId)?.classList.add('hidden');
  });
  if (target === 'map') {
    sidePanel?.classList.remove('mobile-visible');
    requestAnimationFrame(() => map?.getMap()?.invalidateSize());
    return;
  }
  const targetPanel = MOBILE_PANEL_MAP[target];
  if (!targetPanel) return;
  sidePanel?.classList.add('mobile-visible');
  const el = document.getElementById(targetPanel);
  el?.classList.remove('hidden');
  el?.classList.add('mobile-active');
  if (target === 'library') libPanel?.refresh();
  if (target === 'logs')    logPanel?.refresh();
}

function updateMobileTabAvailability() {
  const isOffline = state.ui.connectivity === 'offline';
  document.querySelectorAll('.mobile-nav__btn[data-tab]').forEach(btn => {
    const tab          = btn.dataset.tab;
    const shouldDisable = isOffline && (tab === 'map' || tab === 'streams' || tab === 'library');
    btn.classList.toggle('is-disabled', shouldDisable);
    if (shouldDisable && btn.classList.contains('active')) {
      state.ui.currentView = 'import';
      localStorage.setItem(UI_KEYS.currentView, 'import');
    }
  });
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    updateMobileView(state.ui.currentView);
    const active =
      document.querySelector(`.mobile-nav__btn[data-tab="${state.ui.currentView}"]`) ||
      document.querySelector('.mobile-nav__btn[data-tab="map"]');
    document.querySelectorAll('.mobile-nav__btn').forEach(t => t.classList.remove('active'));
    active?.classList.add('active');
  }
}

function syncResponsiveState() {
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    document.getElementById('desktop-toolbar-nav')?.setAttribute('hidden', 'hidden');
    updateMobileTabAvailability();
    updateMobileView(state.ui.currentView);
  } else {
    document.getElementById('desktop-toolbar-nav')?.removeAttribute('hidden');
    document.getElementById('side-panel')?.classList.remove('mobile-visible');
    Object.values(MOBILE_PANEL_MAP).forEach(panelId =>
      document.getElementById(panelId)?.classList.remove('mobile-active')
    );
    applyDesktopPanelTab();
    requestAnimationFrame(() => map?.getMap()?.invalidateSize());
  }
}

function onWindowResize() {
  if (window.innerWidth >= MOBILE_BREAKPOINT && state.ui.panelWidth < DESKTOP_PANEL_MIN) {
    state.ui.panelWidth = DESKTOP_PANEL_DEFAULT;
    persistPanelWidth();
  }
  applyDesktopPanelWidth();
  applyMapVisibility();
  syncResponsiveState();
}

function initResizeHandle() {
  const handle = document.getElementById('side-panel-resize-handle');
  const panel  = document.getElementById('side-panel');
  if (!handle || !panel) return;
  const start = clientX => {
    if (window.innerWidth < MOBILE_BREAKPOINT || state.ui.isMapHidden) return;
    const startWidth = panel.getBoundingClientRect().width;
    const onMove = moveX => {
      const next = Math.max(DESKTOP_PANEL_MIN, Math.round(startWidth - (moveX - clientX)));
      state.ui.panelWidth = next;
      applyDesktopPanelWidth();
    };
    const moveMouse = e => onMove(e.clientX);
    const moveTouch = e => onMove(e.touches[0].clientX);
    const stop = () => {
      window.removeEventListener('mousemove', moveMouse);
      window.removeEventListener('mouseup',   stop);
      window.removeEventListener('touchmove', moveTouch);
      window.removeEventListener('touchend',  stop);
      persistPanelWidth();
    };
    window.addEventListener('mousemove', moveMouse);
    window.addEventListener('mouseup',   stop);
    window.addEventListener('touchmove', moveTouch, { passive: true });
    window.addEventListener('touchend',  stop);
  };
  handle.addEventListener('mousedown',  e => { e.preventDefault(); start(e.clientX); });
  handle.addEventListener('touchstart', e => start(e.touches[0].clientX), { passive: true });
}

function applyDesktopPanelWidth() {
  if (window.innerWidth < MOBILE_BREAKPOINT || state.ui.isMapHidden) return;
  const width = Math.max(DESKTOP_PANEL_MIN, state.ui.panelWidth || DESKTOP_PANEL_DEFAULT);
  const panel     = document.getElementById('side-panel');
  const appLayout = document.getElementById('app-layout');
  panel?.style.setProperty('width',     `${width}px`);
  panel?.style.setProperty('min-width', `${width}px`);
  if (appLayout) appLayout.style.gridTemplateColumns = `minmax(0, 1fr) ${width}px`;
}

function applyMapVisibility() {
  const appLayout = document.getElementById('app-layout');
  const btn       = document.getElementById('btn-side-panel-toggle');
  const sidePanel = document.getElementById('side-panel');
  if (!appLayout || !btn || !sidePanel || window.innerWidth < MOBILE_BREAKPOINT) return;
  appLayout.classList.toggle('is-map-hidden', state.ui.isMapHidden);
  if (state.ui.isMapHidden) {
    appLayout.style.gridTemplateColumns = '0 minmax(0, 1fr)';
    sidePanel.style.width    = '100%';
    sidePanel.style.minWidth = '0';
    btn.textContent = '›';
  } else {
    btn.textContent = '‹';
    applyDesktopPanelWidth();
    requestAnimationFrame(() => map?.getMap()?.invalidateSize());
  }
}

function persistPanelWidth() {
  localStorage.setItem(UI_KEYS.panelWidth, String(state.ui.panelWidth));
  setSetting('uiPanelWidth', state.ui.panelWidth);
}

function persistMapVisibility() {
  localStorage.setItem(UI_KEYS.mapHidden, state.ui.isMapHidden ? '1' : '0');
  setSetting('uiMapHidden', state.ui.isMapHidden);
}

function updateConnectivityUI() {
  const btn = document.getElementById('btn-connectivity');
  if (!btn) return;
  const online = state.ui.connectivity === 'online';
  btn.classList.toggle('is-online', online);
  btn.title = online ? 'En ligne' : 'Hors ligne';
  btn.setAttribute('aria-pressed', online ? 'false' : 'true');
}

function setLoading(on) {
  const bar = document.getElementById('loading-bar');
  if (!bar) return;
  bar.style.display = on ? 'block' : 'none';
}

function flash(msg, duration = 5000, type = 'info') {
  let el = document.getElementById('flash-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash-msg';
    el.style.cssText = [
      'position:fixed', 'bottom:72px', 'left:50%', 'transform:translateX(-50%)',
      'max-width:90vw', 'padding:8px 16px', 'border-radius:8px', 'font-size:13px',
      'z-index:9999', 'pointer-events:none', 'transition:opacity .3s',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent       = msg;
  el.style.background  = type === 'error' ? '#c0392b' : '#2d2d2d';
  el.style.color       = '#fff';
  el.style.opacity     = '1';
  el.style.display     = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, duration);
}
