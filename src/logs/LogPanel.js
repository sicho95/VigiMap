export class LogPanel {
  constructor(store, listId, infoId) {
    this._s  = store;
    this._li = listId;
    this._ii = infoId;
  }

  bind(exportBtnId, clearBtnId) {
    document.getElementById(exportBtnId)?.addEventListener('click', () => this._s.exportJson());
    document.getElementById(clearBtnId)?.addEventListener('click', async () => {
      await this._s.clear(); this.refresh();
    });
    // ✅ Bouton rapport HTML (ajoute btn-export-report dans ton HTML si voulu)
    document.getElementById('btn-export-report')?.addEventListener('click', () => this._s.exportHtml());
  }

  async refresh() {
    const el   = document.getElementById(this._li);
    const info = document.getElementById(this._ii);
    if (!el) return;

    const logs = await this._s.getAll();
    if (!logs.length) {
      el.innerHTML = `<p style="color:var(--text-3);font-size:12px;padding:8px">Aucun log</p>`;
      if (info) info.textContent = '';
      return;
    }

    el.innerHTML = logs.slice(0, 200).map(l => {
      const sc  = l.globalScore || 0;
      const cls = sc >= 0.8 ? 'high' : sc >= 0.6 ? 'mid' : '';
      const t   = new Date(l.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
      const thumb = l.frameCapture
        ? `<img src="${l.frameCapture}" style="width:48px;height:30px;object-fit:cover;border-radius:3px;margin-right:6px;vertical-align:middle;border:1px solid #333">`
        : '';
      return `<div class="log-entry log-entry--${cls || 'low'}">
        ${thumb}
        <span class="log-time">${t}</span>
        <span class="log-query">${l.queryName || '—'}</span>
        <span class="log-cam">${l.cameraName || l.cameraId || '—'}</span>
        <span class="log-score ${cls}">${Math.round(sc * 100)}%</span>
      </div>`;
    }).join('');

    if (info) info.textContent = `${logs.length} entrée${logs.length > 1 ? 's' : ''}`;
  }
}
