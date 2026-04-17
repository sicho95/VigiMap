import{BaseAdapter}from'./BaseAdapter.js';
export class SvvNorwayAdapter extends BaseAdapter{
  constructor(o){super({id:'svv_no',name:'Statens vegvesen NO',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://vegvesen.no/ws/no/vegvesen/veg/trafikkbilde/oversikt?inkluderSlettet=false');
      return(j.webkameraOversikt||[]).slice(0,300).map(c=>this.norm({
        id:'svv_'+c.id,name:c.navn||'SVV',
        lat:+c.posisjon?.latitude||0,lng:+c.posisjon?.longitude||0,
        snapshotUrl:c.urlMedium||'',status:'live',isLive:true,country:'NO'}));
    }catch(e){return[]}}
}