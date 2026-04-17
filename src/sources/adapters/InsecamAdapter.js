// Accede aux cameras IP publiques Insecam via le proxy CORS
import { BaseAdapter } from './BaseAdapter.js';
const COUNTRIES_URL = 'https://www.insecam.org/en/jsoncountries/';

export class InsecamAdapter extends BaseAdapter {
  constructor() { super({ id:'insecam', name:'Insecam', refreshIntervalMs:600000 }); }

  // Recupere les cameras des 5 pays les plus representes sur Insecam
  async fetchCameras() {
    if (!this._proxyBase()) return [];
    try {
      const cr = await fetch(this.proxy(COUNTRIES_URL));
      const cd = await cr.json();
      const top = Object.entries(cd.country||{}).sort((a,b)=>b[1].count-a[1].count).slice(0,5).map(([c])=>c);
      const all = [];
      for (const cc of top) {
        const html = await (await fetch(this.proxy(`https://www.insecam.org/en/bycountry/${cc}/?page=1`))).text();
        all.push(...this._parse(html, cc));
      }
      return all;
    } catch { return []; }
  }

  // Extrait les donnees de cameras depuis le HTML d'une page Insecam
  _parse(html, country) {
    const ids  = [...html.matchAll(/href="\/en\/view\/(\d+)/g)].map(m=>m[1]);
    const lats = [...html.matchAll(/data-lat="([\d.-]+)"/g)].map(m=>m[1]);
    const lngs = [...html.matchAll(/data-lng="([\d.-]+)"/g)].map(m=>m[1]);
    return ids.map((id,i) => this.makeCamera({
      id, lat:lats[i], lng:lngs[i], name:`Insecam #${id}`, country,
      snapshotUrl:`http://www.insecam.org/preview/${id}/`, streamType:'mjpeg', isLive:true, tags:['ip-public'],
    })).filter(Boolean);
  }
}
