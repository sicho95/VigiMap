export class CameraLayer{
  constructor(cluster,makeIcon,onClick){
    this._cluster=cluster;this._makeIcon=makeIcon;this._onClick=onClick;
    this._markers=new Map();
  }
  setCameras(cams){
    this._cluster.clearLayers();this._markers.clear();
    const ms=[];
    for(const c of cams){
      if(!c.lat||!c.lng)continue;
      const m=L.marker([c.lat,c.lng],{icon:this._makeIcon(c.status)});
      m.on('click',()=>this._onClick(c));
      this._markers.set(c.id,m);ms.push(m);
    }
    if(ms.length)this._cluster.addLayers(ms);
  }
  updateStatus(id,status){const m=this._markers.get(id);if(m)m.setIcon(this._makeIcon(status))}
}
