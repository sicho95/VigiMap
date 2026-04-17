
import { getAllStreams, deleteStream, streamToCam } from './YouTubeLibrary.js';
import { openAddStreamModal } from './AddStreamModal.js';

export class LibraryPanel {
  constructor(containerId, onPin, onEdit) {
    this.container = document.getElementById(containerId);
    this.onPin  = onPin;
    this.onEdit = onEdit;
    this._streams = [];
  }

  async refresh() {
    this._streams = await getAllStreams();
    this._render();
  }

  _render() {
    if (!this.container) return;
    if (!this._streams.length) {
      this.container.innerHTML = `<p class="player-empty">Aucun flux sauvegardé.<br>
        Cliquez sur <strong>➕ Flux</strong> pour en ajouter.</p>`;
      return;
    }

    this.container.innerHTML = this._streams.map(s => {
      const ytId = s.ytId || '';
      const thumb = s.thumb || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');
      const hasCoords = s.lat && s.lng;
      return `<div class="lib-card" data-id="${s.id}">
        ${thumb ? `<img class="lib-card__thumb" src="${thumb}" loading="lazy" onerror="this.style.display='none'"/>` : ''}
        <div class="lib-card__body">
          <div class="lib-card__name" title="${s.name}">${s.name}</div>
          <div class="lib-card__meta">
            ${s.city ? '📍 '+s.city : ''}
            ${s.country ? '<span class="badge" style="font-size:9px">'+s.country+'</span>' : ''}
            ${hasCoords ? `<span style="font-size:9px;color:var(--text-3)">${(+s.lat).toFixed(3)}, ${(+s.lng).toFixed(3)}</span>` : ''}
            ${(s.tags||[]).map(t=>`<span class="badge badge--tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="lib-card__actions">
          <button class="btn btn--primary btn--sm lib-pin" data-id="${s.id}" title="Ouvrir">▶</button>
          <button class="btn btn--ghost btn--sm lib-edit" data-id="${s.id}" title="Modifier">✏️</button>
          <button class="btn btn--ghost btn--sm lib-del" data-id="${s.id}" title="Supprimer" style="color:var(--danger)">🗑</button>
        </div>
      </div>`;
    }).join('');

    this.container.querySelectorAll('.lib-pin').forEach(btn => btn.onclick = () => {
      const s = this._streams.find(x => x.id == btn.dataset.id);
      if (s) this.onPin?.(streamToCam(s));
    });
    this.container.querySelectorAll('.lib-edit').forEach(btn => btn.onclick = async () => {
      const s = this._streams.find(x => x.id == btn.dataset.id);
      if (!s) return;
      const cam = streamToCam(s);
      const updated = await openAddStreamModal({ ...cam, _dbId: s.id, url: s.url, ytId: s.ytId, thumb: s.thumb, city: s.city });
      if (updated) { await this.refresh(); this.onEdit?.(updated); }
    });
    this.container.querySelectorAll('.lib-del').forEach(btn => btn.onclick = async () => {
      if (!confirm('Supprimer ce flux ?')) return;
      await deleteStream(+btn.dataset.id);
      await this.refresh();
    });
  }

  // Filtre texte
  filter(q) {
    const s = q.toLowerCase();
    this.container?.querySelectorAll('.lib-card').forEach(card => {
      const name = card.querySelector('.lib-card__name')?.textContent.toLowerCase() || '';
      const meta = card.querySelector('.lib-card__meta')?.textContent.toLowerCase() || '';
      card.style.display = (!s || name.includes(s) || meta.includes(s)) ? '' : 'none';
    });
  }
}
