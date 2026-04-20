// VideoImporter.js — import de fichiers vidéo/image locaux pour analyse CV
export class VideoImporter {
  constructor(grid, cv, getQueries, onMatch) {
    this._grid       = grid;
    this._cv         = cv;
    this._getQueries = getQueries;
    this._onMatch    = onMatch;
    this._input      = null;
    this._buildInput();
  }

  _buildInput() {
    this._input = document.createElement('input');
    this._input.type   = 'file';
    this._input.accept = 'video/*,image/*';
    this._input.multiple = true;
    this._input.style.display = 'none';
    document.body.appendChild(this._input);
  }

  run() {
    this._input.value = '';
    this._input.onchange = () => {
      const files = [...this._input.files];
      files.forEach(file => this._importFile(file));
    };
    this._input.click();
  }

  _importFile(file) {
    const blobUrl = URL.createObjectURL(file);
    const camId   = 'local_' + Date.now() + '_' + file.name.replace(/[^a-z0-9]/gi, '_');
    const cam = {
      id:         camId,
      name:       file.name,
      streamUrl:  blobUrl,
      streamType: 'local',
      cvEnabled:  true,
      status:     'online',
      lat: 0, lng: 0,
    };
    this._grid.pin(cam);
  }
}
