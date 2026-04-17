// Gere la grille des flux epingles — ajout, suppression et mise en page dynamique
import { StreamPlayer } from './StreamPlayer.js';
import { getSetting }   from '../settings/SettingsManager.js';

// Nombre de colonnes selon le nombre total de flux
const COLS = { 1:1,2:2,3:2,4:2,5:3,6:3,7:3,8:3,9:3,10:4 };

export class PlayerGrid {
  constructor(containerId) {
    this._el = document.getElementById(containerId);
    this._players = new Map(); // cameraId → StreamPlayer
  }

  // Epingle un nouveau flux si la limite n'est pas atteinte
  pin(cam) {
    if (this._players.has(cam.id)||this._players.size>=getSetting('maxPinnedStreams')) return;
    this._players.set(cam.id, new StreamPlayer(cam, id=>this.unpin(id), id=>this.unpin(id)));
    this._sync();
  }

  // Depingle un flux et libere ses ressources
  unpin(id) { this._players.get(id)?.destroy(); this._players.delete(id); this._sync(); }

  // Retourne vrai si la camera est deja epinglee
  isPinned(id) { return this._players.has(id); }

  // Retourne le player d'une camera pour l'acces au pipeline CV
  getPlayer(id) { return this._players.get(id); }

  // Retourne tous les players actifs
  all() { return [...this._players.values()]; }

  // Souligne en orange un player lors d'un match CV
  highlight(id) {
    const el=this._players.get(id)?.getMedia()?.closest('.stream-player');
    if (!el) return;
    el.classList.add('match-on');
    setTimeout(()=>el.classList.remove('match-on'),5000);
  }

  // Reconstruit le DOM de la grille avec le bon nombre de colonnes
  _sync() {
    const n = this._players.size;
    const layoutSel = document.getElementById('grid-layout')?.value||'auto';
    const cols = layoutSel==='auto' ? (COLS[n]||4) : parseInt(layoutSel);
    this._el.style.gridTemplateColumns=`repeat(${cols},1fr)`;
    this._el.innerHTML='';
    if (!n) { this._el.innerHTML='<p class="player-empty">Cliquez sur une camera sur la carte pour l\'epingler</p>'; }
    else { for (const p of this._players.values()) this._el.appendChild(p.render()); }
    const cnt=document.getElementById('pinned-count'); if (cnt) cnt.textContent=n;
  }
}
