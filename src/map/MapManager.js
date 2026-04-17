// Initialise et orchestre la carte Leaflet avec clustering des marqueurs
import { CameraLayer } from './CameraLayer.js';

// Couleur CSS associee a chaque statut de camera
const STATUS_CLR = {
  live:'#3fb950', delayed:'#d29922', offline:'#f85149', pinned:'#a371f7',
  selected:'#58a6ff', match:'#f0883e',
};

// Fabrique une icone SVG broche pour un statut donne
function makeIcon(status) {
  const c = STATUS_CLR[status]||STATUS_CLR.offline;
  return L.divIcon({
    html:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="18" height="24">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20S24 21 24 12C24 5.4 18.6 0 12 0z" fill="${c}" fill-opacity=".9"/>
      <circle cx="12" cy="12" r="5" fill="#fff" fill-opacity=".9"/>
    </svg>`,
    className:'', iconSize:[18,24], iconAnchor:[9,24], popupAnchor:[0,-24],
  });
}

export class MapManager {
  constructor(containerId, onCameraClick) {
    this._containerId=containerId; this._onCameraClick=onCameraClick;
    this._map=null; this._cluster=null; this._layer=null;
  }

  // Cree la carte, les tuiles OSM et le groupe de clustering
  init() {
    this._map = L.map(this._containerId, { center:[20,0], zoom:3 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>', maxZoom:19,
    }).addTo(this._map);
    this._cluster = L.markerClusterGroup({
      maxClusterRadius:40, showCoverageOnHover:false,
      iconCreateFunction: cl => L.divIcon({
        html:`<div class="cl-icon">${cl.getChildCount()}</div>`,
        className:'cl-wrap', iconSize:[36,36],
      }),
    });
    this._map.addLayer(this._cluster);
    this._layer = new CameraLayer(this._cluster, makeIcon, this._onCameraClick);
    this._injectCSS();
    return this;
  }

  // Remplace l'ensemble des cameras affichees sur la carte
  setCameras(cameras) { this._layer.setCameras(cameras); }
  // Met a jour l'icone d'une camera par son id
  updateCameraStatus(id, status) { this._layer.updateStatus(id, status); }
  // Retourne l'instance de carte Leaflet
  getMap() { return this._map; }

  // Calcule et retourne la bounding box visible avec centre et rayon en km
  getBbox() {
    const b=this._map.getBounds(), sw=b.getSouthWest(), ne=b.getNorthEast(), ct=b.getCenter();
    return { south:sw.lat,west:sw.lng,north:ne.lat,east:ne.lng,
             centerLat:ct.lat, centerLng:ct.lng, radiusKm:this._map.distance(ct,sw)/1000 };
  }

  // Injecte les styles des clusters dans le document
  _injectCSS() {
    const s = document.createElement('style');
    s.textContent = `.cl-wrap{display:flex;align-items:center;justify-content:center;}
      .cl-icon{width:36px;height:36px;border-radius:50%;background:rgba(88,166,255,.18);
        border:2px solid #58a6ff;color:#58a6ff;font-size:12px;font-weight:600;
        display:flex;align-items:center;justify-content:center;}`;
    document.head.appendChild(s);
  }
}
