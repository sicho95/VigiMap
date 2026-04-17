import{BaseAdapter}from'./BaseAdapter.js';
export class InsecamAdapter extends BaseAdapter{
  constructor(o){super({id:'insecam',name:'Insecam',...o})}
  async fetchCameras(){
    const out=[];
    for(let p=1;p<=3;p++){
      try{
        const j=await this._fetch(`https://www.insecam.org/en/jsoncameras/?page=${p}`);
        const d=typeof j==='string'?JSON.parse(j):j;
        for(const c of(d.cameras||[])){
          out.push(this.norm({id:'ins_'+c.ip.replace(/\./g,'_')+'_'+c.port,
            name:`${c.city||''} ${c.country||''}`.trim()||'Insecam',
            lat:+c.latitude||0,lng:+c.longitude||0,
            snapshotUrl:`http://${c.ip}:${c.port}${c.image}`,
            streamUrl:`http://${c.ip}:${c.port}`,
            status:'unknown',country:c.country||'',city:c.city||''}));
        }
      }catch(e){break}
    }
    return out;
  }
}
