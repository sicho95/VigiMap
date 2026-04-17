const DB_NAME='VigiMapLogs', DB_VER=1, STORE='logs';

export class LogStore {
  constructor() { this.db = null; }

  async init() {
    return new Promise((resolve) => {
      // On ouvre sans version fixe d'abord pour détecter la version existante
      const probe = indexedDB.open(DB_NAME);
      probe.onsuccess = (e) => {
        const existing = e.target.result;
        const curVer   = existing.version;
        existing.close();
        // Ouvre avec la version courante ou supérieure si store manquant
        const needUpgrade = !existing.objectStoreNames.contains(STORE);
        const targetVer   = needUpgrade ? curVer + 1 : curVer;
        this._openDB(targetVer, resolve);
      };
      probe.onerror = () => this._openDB(DB_VER, resolve);
    });
  }

  _openDB(ver, resolve) {
    const req = indexedDB.open(DB_NAME, ver);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
    req.onerror   = (e) => {
      console.warn('[VigiMap] IndexedDB indisponible, logs désactivés:', e.target.error?.message);
      resolve(); // on ne rejette pas — l'app continue sans logs persistants
    };
    req.onblocked = () => {
      console.warn('[VigiMap] IndexedDB bloquée — fermez les autres onglets VigiMap');
      resolve();
    };
  }

  async add(entry) {
    if (!this.db) return;
    return new Promise((ok, err) => {
      try {
        const tx = this.db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).add({ ...entry, ts: Date.now() });
        tx.oncomplete = ok;
        tx.onerror    = (e) => { console.warn('[VigiMap] Log add error:', e.target.error); ok(); };
      } catch(e) { console.warn('[VigiMap] Log tx error:', e.message); ok(); }
    });
  }

  async getAll() {
    if (!this.db) return [];
    return new Promise((ok) => {
      try {
        const tx = this.db.transaction(STORE, 'readonly');
        const r  = tx.objectStore(STORE).getAll();
        r.onsuccess = () => ok((r.result || []).reverse());
        r.onerror   = () => ok([]);
      } catch(e) { ok([]); }
    });
  }

  async clear() {
    if (!this.db) return;
    return new Promise((ok) => {
      try {
        const tx = this.db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = ok;
        tx.onerror    = ok;
      } catch(e) { ok(); }
    });
  }

  async exportJson() {
    const d = await this.getAll();
    const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(b), download: 'vigimap-logs.json'
    });
    a.click();
  }
}
