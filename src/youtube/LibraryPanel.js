
import { getAllStreams, deleteStream, addStream, streamToCam } from './YouTubeLibrary.js';
import { openAddStreamModal } from './AddStreamModal.js';

export class LibraryPanel {
  constructor(containerId, onPin, onMapUpdate) {
    this.el = document.getElementById(containerId);
    this.onPin = onPin;
    this.onMapUpdate = onMapUpdate;
    this._streams = [];
    this._q = '';
  }

  async refresh() {
    this._streams = await getAllStreams();
    this._renderList();
  }

  filter(q) { this._q = q.toLowerCase(); this._renderList(); }

  _renderList() {
    if (!this.el) return;
    const s = this._streams.filter(x =>
      !this._q ||
      x.name.toLowerCase().includes(this._q) ||
      (x.city||'').toLowerCase().includes(this._q) ||
      (x.country||'').toLowerCase().includes(this._q) ||
      (x.tags||[]).some(t => t.toLowerCase().includes(this._q))
    );

    if (!s.length) {
      this.el.innerHTML = `<p class="player-empty">
        ${this._q ? 'Aucun résultat.' : 'Bibliothèque vide. Cliquez sur ➕ Flux pour ajouter.'}</p>`;
      return;
    }

    this.el.innerHTML = s.map(x => {
      const ytId = x.ytId || '';
      const thumb = x.thumb || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');
      const active = x.enabled !== false;
      return `<div class="lib-card ${active?'':'lib-card--disabled'}" data-id="${x.id}">
        ${thumb ? `<img class="lib-card__thumb" src="${thumb}" loading="lazy" onerror="this.style.display='none'"/>` : '<div class="lib-card__thumb lib-card__thumb--empty">📷</div>'}
        <div class="lib-card__body">
          <div class="lib-card__name" title="${x.name}">${x.name}</div>
          <div class="lib-card__meta">
            ${x.city?'📍 '+x.city:''} ${x.country?`<span class="badge" style="font-size:9px">${x.country}</span>`:''}
            ${x.lat&&x.lng?`<span style="font-size:9px;color:var(--text-3)">${(+x.lat).toFixed(3)},${(+x.lng).toFixed(3)}</span>`:''}
            ${(x.tags||[]).map(t=>`<span class="badge--tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="lib-card__actions">
          <button class="btn btn--primary btn--sm lib-pin"   data-id="${x.id}" title="Regarder">▶</button>
          <button class="btn btn--ghost   btn--sm lib-edit"  data-id="${x.id}" title="Modifier">✏️</button>
          <button class="btn btn--ghost   btn--sm lib-toggle" data-id="${x.id}" title="${active?'Désactiver':'Activer'}">${active?'⏸':'▶️'}</button>
          <button class="btn btn--ghost   btn--sm lib-del"   data-id="${x.id}" title="Supprimer" style="color:var(--danger)">🗑</button>
        </div>
      </div>`;
    }).join('');

    this.el.querySelectorAll('.lib-pin').forEach(b => b.onclick = () => {
      const x = this._streams.find(s => s.id == b.dataset.id);
      if (x) this.onPin?.(streamToCam(x));
    });
    this.el.querySelectorAll('.lib-edit').forEach(b => b.onclick = async () => {
      const x = this._streams.find(s => s.id == b.dataset.id);
      if (!x) return;
      const updated = await openAddStreamModal({ ...streamToCam(x), _dbId: x.id, url: x.url, ytId: x.ytId, thumb: x.thumb, city: x.city });
      if (updated) { await this.refresh(); this.onMapUpdate?.(updated); }
    });
    this.el.querySelectorAll('.lib-toggle').forEach(b => b.onclick = async () => {
      const x = this._streams.find(s => s.id == b.dataset.id);
      if (!x) return;
      const { updateStream } = await import('./YouTubeLibrary.js');
      await updateStream(x.id, { enabled: x.enabled === false });
      await this.refresh();
      const cam = streamToCam({ ...x, enabled: x.enabled === false });
      this.onMapUpdate?.(cam);
    });
    this.el.querySelectorAll('.lib-del').forEach(b => b.onclick = async () => {
      if (!confirm('Supprimer ce flux ?')) return;
      await deleteStream(+b.dataset.id);
      await this.refresh();
      this.onMapUpdate?.(null);
    });
  }

  // ── Export JSON ────────────────────────────────────────────────────────────
  async exportJSON() {
    const all = await getAllStreams();
    const data = JSON.stringify({ version: 1, streams: all }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `vigimap-library-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ── Import JSON ────────────────────────────────────────────────────────────
  async importJSON(file) {
    try {
      const txt = await file.text();
      const obj = JSON.parse(txt);
      const rows = obj.streams || obj;
      if (!Array.isArray(rows)) throw new Error('Format invalide');
      let n = 0;
      for (const r of rows) {
        if (!r.url && !r.ytId) continue;
        await addStream(r); n++;
      }
      await this.refresh();
      return n;
    } catch (e) { throw new Error('Import échoué: ' + e.message); }
  }
}
