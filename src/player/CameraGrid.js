// CameraGrid.js — alias vers PlayerGrid pour compatibilité app.js
import { PlayerGrid } from './PlayerGrid.js';

export class CameraGrid extends PlayerGrid {
  constructor(el, cv, getQueries) {
    super(el instanceof Element ? el.id || '' : el);
    this._cv          = cv;
    this._getQueries  = getQueries;
  }

  // Surcharge pin() pour passer l'élément directement si besoin
  pin(cam) {
    super.pin(cam);
  }

  getAllPlayers() {
    return this.all();
  }
}
