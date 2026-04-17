// Gere le cycle de vie des marqueurs Leaflet associes aux cameras
export class CameraLayer {
  constructor(cluster, makeIcon, onClick) {
    this._cluster = cluster;
    this._makeIcon = makeIcon;
    this._onClick  = onClick;
    this._markers  = new Map(); // cameraId → L.Marker
    this._cameras  = new Map(); // cameraId → Camera
  }

  // Synchronise les marqueurs avec le nouveau tableau de cameras
  setCameras(cameras) {
    const next = new Map(cameras.map(c=>[c.id,c]));
    // Supprime les marqueurs qui ne sont plus dans la liste
    for (const [id, marker] of this._markers) {
      if (!next.has(id)) { this._cluster.removeLayer(marker); this._markers.delete(id); this._cameras.delete(id); }
    }
    // Ajoute ou met a jour chaque marqueur
    for (const [id, cam] of next) {
      if (this._markers.has(id)) {
        this._markers.get(id).setIcon(this._makeIcon(cam.status));
      } else {
        const m = L.marker([cam.lat,cam.lng],{icon:this._makeIcon(cam.status)});
        m.bindTooltip(cam.name,{direction:'top',offset:[0,-24]});
        m.on('click',()=>this._onClick(cam));
        m.on('contextmenu', e => {
          L.DomEvent.stopPropagation(e);
          document.dispatchEvent(new CustomEvent('vigimap:ctx',{detail:{cam,latlng:e.latlng}}));
        });
        this._cluster.addLayer(m);
        this._markers.set(id,m); this._cameras.set(id,cam);
      }
    }
  }

  // Met a jour l'icone d'un marqueur selon son nouveau statut
  updateStatus(cameraId, status) {
    const m=this._markers.get(cameraId), c=this._cameras.get(cameraId);
    if (!m||!c) return;
    c.status=status; m.setIcon(this._makeIcon(status));
  }
}
