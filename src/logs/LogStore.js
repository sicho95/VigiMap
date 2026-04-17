// Stocke les logs de detection dans IndexedDB via Dexie.js (charge depuis CDN)
const DEXIE = 'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js';

export class LogStore {
  constructor() { this._db=null; }

  // Initialise la base Dexie en chargeant la librairie si necessaire
  async init() {
    if (!window.Dexie) await load(DEXIE);
    this._db = new window.Dexie('VigiMapLogs');
    this._db.version(1).stores({ logs:'++id,timestamp,cameraId,queryId,globalScore' });
    await this._db.open();
  }

  // Insere une entree de log apres verification de la limite de taille
  async add(entry) {
    if (!this._db) return;
    await this._trim();
    return this._db.logs.add({...entry, timestamp:entry.timestamp||new Date().toISOString()});
  }

  // Retourne les N derniers logs par ordre decroissant
  async getRecent(n=50) { return this._db?.logs.orderBy('timestamp').reverse().limit(n).toArray()||[]; }

  // Retourne le nombre total d'entrees
  async count() { return this._db?.logs.count()||0; }

  // Exporte toutes les entrees en JSON
  async exportAll() { return this._db?.logs.orderBy('timestamp').toArray()||[]; }

  // Vide toutes les entrees du store
  async clear() { return this._db?.logs.clear(); }

  // Estime la taille occupee en octets
  async size() { return new Blob([JSON.stringify(await this.exportAll())]).size; }

  // Supprime les 100 entrees les plus anciennes si la limite est atteinte a 90%
  async _trim() {
    const { getSetting } = await import('../settings/SettingsManager.js');
    const limit=getSetting('logLimitMb')*1048576;
    if (await this.size() > limit*0.9) {
      const keys=await this._db.logs.orderBy('timestamp').limit(100).primaryKeys();
      await this._db.logs.bulkDelete(keys);
    }
  }
}

// Charge un script externe de maniere asynchrone
function load(src) {
  return new Promise((ok,ko)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=ko; document.head.appendChild(s); });
}
