import{BaseAdapter}from'./BaseAdapter.js';
export class CetSpBrAdapter extends BaseAdapter{
  constructor(o){super({id:'cetsp_br',name:'CET São Paulo',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://cetsp.com.br/consultas/video-monitoramento/api/cameras');
      return(Array.isArray(j)?j:[]).slice(0,200).map(c=>this.norm({
        id:'cet_'+c.cod,name:c.logradouro||'CET SP',lat:+c.latitude||0,lng:+c.longitude||0,
        snapshotUrl:c.url||'',status:'live',isLive:true,country:'BR',city:'São Paulo'}));
    }catch(e){return[]}}
}