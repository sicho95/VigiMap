import { StreamPlayer } from './StreamPlayer.js';

const COLS = { 1:1, 2:2, 3:2, 4:2, 5:3, 6:3, 7:3, 8:4, 9:3, 10:4 };

export class PlayerGrid {
  constructor(id) {
    this._el = document.getElementById(id);
    this._p  = new Map();
  }

  pin(cam) {
    if (this._p.has(cam.id)) return;
    const p = new StreamPlayer(cam);
    this._p.set(cam.id, p);
    this._el?.querySelector('.player-empty')?.remove();
    this._el?.appendChild(p.el);
    p.onClose = () => {
      this._p.delete(cam.id);
      this._rl();
      if (!this._p.size && this._el) {
        const m = document.createElement('p');
        m.className   = 'player-empty';
        m.textContent = 'Épinglez une caméra depuis la carte';
        this._el.appendChild(m);
      }
    };
    this._rl();
    p.play();
  }

  unpin(id)       { const p = this._p.get(id); if (!p) return; p.destroy(); this._p.delete(id); this._rl(); }
  isPinned(id)    { return this._p.has(id); }
  getPlayer(id)   { return this._p.get(id) || null; }
  all()           { return [...this._p.values()]; }

  highlight(id) {
    const p = this._p.get(id);
    if (!p) return;
    p.el.style.boxShadow = '0 0 0 2px var(--clr-match)';
    setTimeout(() => p.el.style.boxShadow = '', 6000);
  }

  _rl() {
    const n = this._p.size;
    if (!this._el || !n) return;
    const c = COLS[Math.min(n, 10)] || 4;
    this._el.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
  }
}
