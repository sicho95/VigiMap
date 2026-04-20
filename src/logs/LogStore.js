const DB_NAME = 'VigiMapLogs', DB_VER = 1, STORE = 'logs';

export class LogStore {
  constructor() { this.db = null; }

  async init() {
    return new Promise((resolve) => {
      const probe = indexedDB.open(DB_NAME);
      probe.onsuccess = (e) => {
        const existing = e.target.result;
        const curVer   = existing.version;
        existing.close();
        const needUpgrade = !existing.objectStoreNames.contains(STORE);
        this._openDB(needUpgrade ? curVer + 1 : curVer, resolve);
      };
      probe.onerror = () => this._openDB(DB_VER, resolve);
    });
  }

  _openDB(ver, resolve) {
    const req = indexedDB.open(DB_NAME, ver);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
    req.onerror   = (e) => { console.warn('[VigiMap] IndexedDB indisponible:', e.target.error?.message); resolve(); };
    req.onblocked = ()  => { console.warn('[VigiMap] IndexedDB bloquée'); resolve(); };
  }

  async add(entry) {
    if (!this.db) return;
    return new Promise((ok) => {
      try {
        const tx = this.db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).add({ ...entry, ts: Date.now() });
        tx.oncomplete = ok;
        tx.onerror    = (e) => { console.warn('[VigiMap] Log add error:', e.target.error); ok(); };
      } catch (e) { console.warn('[VigiMap] Log tx error:', e.message); ok(); }
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
      } catch (e) { ok([]); }
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
      } catch (e) { ok(); }
    });
  }

  async exportJson() {
    const d = await this.getAll();
    const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(b),
      download: 'vigimap-logs.json'
    });
    a.click();
  }

  async exportHtml() {
    const logs = await this.getAll();
    const now  = new Date().toLocaleString('fr-FR');

    const rows = logs.map(l => {
      const sc  = l.globalScore || 0;
      const pct = Math.round(sc * 100);
      const t   = new Date(l.ts).toLocaleString('fr-FR');
      const cls = sc >= 0.8 ? 'high' : sc >= 0.6 ? 'mid' : 'low';

      const details = (l.matchDetails || []).map(d => {
        if (d.class)      return `${d.class} (${Math.round(d.score * 100)}%)`;
        if (d.similarity) return `Similarité ${Math.round(d.similarity * 100)}%`;
        return '';
      }).filter(Boolean).join(', ');

      const img = l.frameCapture
        ? `<img src="${l.frameCapture}" class="frame" alt="frame capturée">`
        : `<div class="no-frame">Pas de capture</div>`;

      return `
        <tr class="entry ${cls}">
          <td class="td-img">${img}</td>
          <td>${t}</td>
          <td><strong>${l.queryName || '—'}</strong></td>
          <td>${l.cameraName || l.cameraId || '—'}</td>
          <td>${l.sourceName || '—'}</td>
          <td class="score ${cls}">${pct}%</td>
          <td class="details">${details || '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>VigiMap — Rapport de logs</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; background: #fff; }

    header { padding: 16px 20px 10px; border-bottom: 2px solid #1a1a2e; display: flex; justify-content: space-between; align-items: flex-end; }
    header h1 { font-size: 18px; font-weight: 700; color: #1a1a2e; }
    header .meta { font-size: 10px; color: #666; text-align: right; }

    table { width: 100%; border-collapse: collapse; }
    thead th { background: #1a1a2e; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; position: sticky; top: 0; }
    tbody tr { border-bottom: 1px solid #eee; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    td { padding: 6px 8px; vertical-align: middle; }

    .td-img { width: 120px; padding: 4px; }
    .frame { width: 112px; height: 70px; object-fit: cover; border-radius: 4px; display: block; border: 1px solid #ddd; }
    .no-frame { width: 112px; height: 70px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 9px; }

    .score { font-weight: 700; font-size: 13px; text-align: center; }
    .score.high { color: #1a7f37; }
    .score.mid  { color: #9a6700; }
    .score.low  { color: #cf222e; }
    .entry.high { border-left: 3px solid #1a7f37; }
    .entry.mid  { border-left: 3px solid #9a6700; }
    .entry.low  { border-left: 3px solid #cf222e; }
    .details { font-size: 10px; color: #555; max-width: 180px; }
    .summary { padding: 8px 20px; background: #f0f4ff; border-bottom: 1px solid #dde; font-size: 11px; color: #444; }

    @media print {
      body { font-size: 9px; }
      header { padding: 8px 10px; }
      header h1 { font-size: 14px; }
      table { page-break-inside: auto; }
      tbody tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      .frame { width: 80px; height: 50px; }
      .no-frame { width: 80px; height: 50px; }
      .td-img { width: 86px; }
    }
    @page { margin: 1cm; size: A4 landscape; }
  </style>
</head>
<body>
  <header>
    <div><h1>🗺️ VigiMap — Rapport de détection</h1></div>
    <div class="meta">
      Généré le ${now}<br>
      ${logs.length} entrée${logs.length > 1 ? 's' : ''}
    </div>
  </header>
  <div class="summary">
    Résumé : ${logs.filter(l => (l.globalScore || 0) >= 0.8).length} haute confiance ·
    ${logs.filter(l => (l.globalScore || 0) >= 0.6 && (l.globalScore || 0) < 0.8).length} moyenne ·
    ${logs.filter(l => (l.globalScore || 0) < 0.6).length} faible
  </div>
  <table>
    <thead>
      <tr>
        <th>Frame capturée</th><th>Horodatage</th><th>Requête</th>
        <th>Caméra</th><th>Source</th><th>Score</th><th>Détails</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Aucun log</td></tr>'}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }

} // ← UNE SEULE accolade fermante ici
