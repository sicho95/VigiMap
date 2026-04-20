import { CameraLayer } from './CameraLayer.js';

const SC = {
  live:    '#3fb950',
  delayed: '#d29922',
  offline: '#f85149',
  pinned:  '#a371f7',
  selected:'#58a6ff',
  match:   '#f0883e',
  unknown: '#484f58',
};

function mkIcon(s) {
  const c = SC[s] || SC.unknown;
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="24" viewBox="0 0 18 24">
      <path fill="${c}" d="M9 0C4 0 0 4 0 9c0 6.6 9 15 9 15s9-8.4 9-15C18 4 14 0 9 0z"/>
      <circle fill="rgba(0,0,0,.25)" cx="9" cy="9" r="3"/>
    </svg>`,
    className: '',
    iconSize:  [18, 24],
    iconAnchor:[9, 24],
  });
}

function normLng(l) {
  while (l >  180) l -= 360;
  while (l < -180) l += 360;
  return l;
}

export class MapManager {
  constructor(id, onClick) {
    this._id      = id;
    this._onClick = onClick;
    this._map     = null;
    this._cluster = null;
    this._layer   = null;
  }

  init() {
    this._map = L.map(this._id, { center: [20, 0], zoom: 3 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this._map);

    this._cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      showCoverageOnHover: false,
      iconCreateFunction: cl => L.divIcon({
        html: `<div class="cl-icon">${cl.getChildCount()}</div>`,
        className: 'cl-wrap',
        iconSize: [36, 36],
      }),
    });

    this._map.addLayer(this._cluster);
    this._layer = new CameraLayer(this._cluster, mkIcon, this._onClick);
    this._injectStyles();
    this._addLegend();
    return this;
  }

  setCameras(c)              { this._layer.setCameras(c); }
  updateCameraStatus(id, s)  { this._layer.updateStatus(id, s); }
  getMap()                   { return this._map; }

  getBbox() {
    const b  = this._map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const ct = b.getCenter();
    return {
      south:     Math.max(-90,   sw.lat),
      north:     Math.min(90,    ne.lat),
      west:      Math.max(-180, Math.min(180, normLng(sw.lng))),
      east:      Math.max(-180, Math.min(180, normLng(ne.lng))),
      centerLat: ct.lat,
      centerLng: normLng(ct.lng),
      radiusKm:  this._map.distance(ct, sw) / 1000,
    };
  }

  // ── Légende Leaflet (bas-gauche) ──────────────────────────────────────────
  _addLegend() {
    const Legend = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd() {
        const div = L.DomUtil.create('div', 'map-legend-ctrl');
        div.innerHTML = [
          ['#3fb950', 'Live (flux vidéo)'],
          ['#d29922', 'Différé / Image fixe'],
          ['#f85149', 'Hors ligne'],
          ['#a371f7', 'Épinglée'],
          ['#f0883e', 'Match CV'],
          ['#484f58', 'Inconnu'],
        ].map(([c, l]) =>
          `<span><span class="ldot" style="background:${c}"></span>${l}</span>`
        ).join('');
        return div;
      },
    });
    new Legend().addTo(this._map);
  }

  _injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      .cl-wrap { display:flex; align-items:center; justify-content:center }
      .cl-icon  { width:36px; height:36px; border-radius:50%;
                  background:rgba(88,166,255,.18); border:2px solid #58a6ff;
                  color:#58a6ff; font-size:12px; font-weight:600;
                  display:flex; align-items:center; justify-content:center }
      .map-legend-ctrl { background:rgba(22,27,34,.88); border:1px solid #30363d;
                         border-radius:6px; padding:6px 10px; font-size:11px;
                         color:#8b949e; display:flex; flex-direction:column;
                         gap:4px; backdrop-filter:blur(4px) }
      .ldot { width:10px; height:10px; border-radius:50%;
              display:inline-block; vertical-align:middle; margin-right:5px }
    `;
    document.head.appendChild(s);
  }
}
