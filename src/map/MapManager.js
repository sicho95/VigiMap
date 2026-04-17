import{CameraLayer}from'./CameraLayer.js';
const SC={live:'#3fb950',delayed:'#d29922',offline:'#f85149',pinned:'#a371f7',selected:'#58a6ff',match:'#f0883e',unknown:'#484f58'};
function mkIcon(s){const c=SC[s]||SC.unknown;return L.divIcon({html:`<svg width="18" height="24" viewBox="0 0 18 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15C18 4.03 13.97 0 9 0z" fill="${c}"/><circle cx="9" cy="9" r="3.5" fill="#0d1117"/></svg>`,className:'',iconSize:[18,24],iconAnchor:[9,24]})}
function normLng(l){while(l>180)l-=360;while(l<-180)l+=360;return l}
export class MapManager{
  constructor(id,onClick){this._id=id;this._onClick=onClick;this._map=null;this._cluster=null;this._layer=null}
  init(){
    this._map=L.map(this._id,{center:[20,0],zoom:3});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(this._map);
    this._cluster=L.markerClusterGroup({maxClusterRadius:40,showCoverageOnHover:false,
      iconCreateFunction:cl=>L.divIcon({html:`<div class="cl-icon">${cl.getChildCount()}</div>`,className:'cl-wrap',iconSize:[36,36]})});
    this._map.addLayer(this._cluster);
    this._layer=new CameraLayer(this._cluster,mkIcon,this._onClick);
    const s=document.createElement('style');
    s.textContent='.cl-wrap{display:flex;align-items:center;justify-content:center}.cl-icon{width:36px;height:36px;border-radius:50%;background:rgba(88,166,255,.18);border:2px solid #58a6ff;color:#58a6ff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center}';
    document.head.appendChild(s);
    return this;
  }
  setCameras(c){this._layer.setCameras(c)}
  updateCameraStatus(id,s){this._layer.updateStatus(id,s)}
  getMap(){return this._map}
  getBbox(){
    const b=this._map.getBounds(),sw=b.getSouthWest(),ne=b.getNorthEast(),ct=b.getCenter();
    return{south:Math.max(-90,sw.lat),north:Math.min(90,ne.lat),
      west:Math.max(-180,Math.min(180,normLng(sw.lng))),
      east:Math.max(-180,Math.min(180,normLng(ne.lng))),
      centerLat:ct.lat,centerLng:normLng(ct.lng),
      radiusKm:this._map.distance(ct,sw)/1000};
  }
}
