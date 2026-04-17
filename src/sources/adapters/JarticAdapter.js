import{BaseAdapter}from'./BaseAdapter.js';
export class JarticAdapter extends BaseAdapter{
  constructor(o){super({id:'jartic_jp',name:'JARTIC JP',...o})}
  async fetchCameras(){
    // JARTIC nécessite une inscription, stub minimal
    console.info('[VigiMap] JARTIC: clé API requise — https://www.jartic.or.jp/');return[];
  }
}