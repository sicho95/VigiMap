import{BaseAdapter}from'./BaseAdapter.js';
export class ItsKoreaAdapter extends BaseAdapter{
  constructor(o){super({id:'its_korea',name:'ITS Korea',...o})}
  async fetchCameras(){
    try{const j=await this._fetch('https://openapi.its.go.kr:9443/cctvInfo?apiKey=free&type=its&cctvType=1&minX=124&maxX=132&minY=33&maxY=39&getType=json');
      return(j.response?.data||[]).slice(0,300).map(c=>this.norm({
        id:'kr_'+c.cctvname,name:c.cctvname||'Korea ITS',lat:+c.coordy||0,lng:+c.coordx||0,
        snapshotUrl:c.cctvurl||'',status:'live',isLive:true,country:'KR'}));
    }catch(e){return[]}}
}