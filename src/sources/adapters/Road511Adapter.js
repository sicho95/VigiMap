import{BaseAdapter}from'./BaseAdapter.js';
// 511 feeds varient par état — on interroge le feed national agrégé
export class Road511Adapter extends BaseAdapter{
  constructor(o){super({id:'road511',name:'Road511 US+CA',...o})}
  async fetchCameras(b){
    try{
      const j=await this._fetch('https://511.org/open-data/traffic/cameras.json');
      const arr=Array.isArray(j)?j:(j.events||j.cameras||[]);
      return arr.filter(c=>{
        const la=+c.Latitude||+c.latitude||0,ln=+c.Longitude||+c.longitude||0;
        return!b||(la>=b.south&&la<=b.north&&ln>=b.west&&ln<=b.east);
      }).slice(0,300).map(c=>this.norm({
        id:'r511_'+(c.ID||c.id||Math.random().toString(36).slice(2)),
        name:c.Name||c.name||'Road511',
        lat:+c.Latitude||+c.latitude||0,lng:+c.Longitude||+c.longitude||0,
        snapshotUrl:c.ImageUrl||c.imageUrl||'',status:'live',isLive:true,country:'US'}));
    }catch(e){console.warn('[VigiMap] Road511:',e.message);return[]}}
}