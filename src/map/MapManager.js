import { CameraLayer } from './CameraLayer.js';

const STATUS_CLR = {
  live:'#3fb950', delayed:'#d29922', offline:'#f85149',
  pinned:'#a371f7', selected:'#58a6ff', match:'#f0883e',
};

function makeIcon(status) {
  const c = STATUS_CLR[status] || STATUS_CLR.offline;
  return L.divIcon({
    html: `<svg width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="${c}"/>
      <circle cx="9" cy="9" r="3.5" fill="#0d1117"/>
    </svg>`,
    className: '', iconSize: [18, 24], iconAnchor: [9, 24], popupAnchor: [0, -24],
  });
}

// Normalise une longitude dans [-180, 180]
function normLng(lng) {
  while (lng > 180)  lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}

export class MapManager {
  constructor(containerId, onCameraClick) {
    this._containerId   = containerId;
    this._onCameraClick = onCameraClick;
    this._map           = null;
    this._cluster       = null;
    this._layer         = null;
  }

  init() {
    this._map = L.map(this._containerId, { center: [20, 0], zoom: 3 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this._map);

    this._cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      showCoverageOnHover: false,
      iconCreateFunction: cl => L.divIcon({
        html: `<div class="cl-icon">${cl.getChildCount()}</div>`,
        className: 'cl-wrap', iconSize: [36, 36],
      }),
    });
    this._map.addLayer(this._cluster);
    this._layer = new CameraLayer(this._cluster, makeIcon, this._onCameraClick);
    this._injectCSS();
    return this;
  }

  setCameras(cameras)            { this._layer.setCameras(cameras); }
  updateCameraStatus(id, status) { this._layer.updateStatus(id, status); }
  getMap()                       { return this._map; }

  getBbox() {
    const b  = this._map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const ct = b.getCenter();

    // Normaliser les longitudes — Leaflet peut retourner des valeurs > 180 en wrap
    const west  = Math.max(-180, Math.min(180, normLng(sw.lng)));
    const east  = Math.max(-180, Math.min(180, normLng(ne.lng)));
    const south = Math.max(-90,  Math.min(90,  sw.lat));
    const north = Math.max(-90,  Math.min(90,  ne.lat));

    return {
      south, west, north, east,
      centerLat: ct.lat,
      centerLng: normLng(ct.lng),
      radiusKm: this._map.distance(ct, sw) / 1000,
    };
  }

  _injectCSS() {
    const s = document.createElement('style');
    s.textContent = `.cl-wrap{display:flex;align-items:center;justify-content:center;}
.cl-icon{width:36px;height:36px;border-radius:50%;background:rgba(88,166,255,.18);
border:2px solid #58a6ff;color:#58a6ff;font-size:12px;font-weight:600;
display:flex;align-items:center;justify-content:center;}`;
    document.head.appendChild(s);
  }
}
