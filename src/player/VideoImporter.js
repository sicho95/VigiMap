export class VideoImporter {
  constructor(grid, cv, getQ, onMatch) {
    this._g  = grid;
    this._cv = cv;
    this._gq = getQ;
    this._om = onMatch;
  }

  run() {
    const vf = [...(document.getElementById('import-video')?.files || [])];
    const pf = [...(document.getElementById('import-photo')?.files || [])];
    if (!vf.length && !pf.length) { alert('Sélectionnez au moins un fichier.'); return; }
    vf.forEach(f => this._loadVid(f));
    if (pf.length) this._analyzePhotos(pf);
  }

  _loadVid(file) {
    const id  = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    // blob URL pour la vidéo — Firefox l'accepte sur un <video> dans le même document.
    // StreamPlayer détecte streamType:'local' et monte un <video> natif (pas de setInterval img).
    const url = URL.createObjectURL(file);

    const cam = {
      id,
      name:        file.name,
      sourceId:    'local',
      lat:         0,
      lng:         0,
      streamUrl:   url,
      snapshotUrl: '',
      isLive:      false,
      status:      'live',
      country:     '',
      city:        '',
      tags:        ['local'],
      streamType:  'local',  // ← flag lu par StreamPlayer pour monter <video> natif
    };

    this._g.pin(cam);

    // 1000ms : laisser le temps au DOM de monter le player avant de démarrer CV
    setTimeout(() => {
      const player = this._g.getPlayer(id);
      if (player) this._cv?.start(player, this._gq());
    }, 1000);
  }

  async _analyzePhotos(files) {
    const q = this._gq();
    if (!q.length) { alert('Créez d\'abord une requête CV.'); return; }

    for (const f of files) {
      const img = await this._fi2img(f);
      const r   = await this._cv?.analyzeImage(img, q);
      if (r) await this._om('photo_' + Date.now(), r.query, r, null);
    }
  }

  // Conversion via FileReader (DataURL) — pas de blob URL → zéro erreur Firefox cross-context
  _fi2img(f) {
    return new Promise(ok => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.src = e.target.result; // data:image/jpeg;base64,...
      };
      reader.readAsDataURL(f);
    });
  }
}
