import { loadQueries, createQuery, updateQuery, deleteQuery } from './QueryManager.js';

const COCO = {
  person:'Personne', car:'Voiture', truck:'Camion', motorcycle:'Moto',
  bus:'Bus', bicycle:'Vélo', dog:'Chien', cat:'Chat', bird:'Oiseau',
  train:'Train', boat:'Bateau', airplane:'Avion', backpack:'Sac à dos',
  suitcase:'Valise', umbrella:'Parapluie', 'cell phone':'Téléphone',
  laptop:'Ordinateur', bottle:'Bouteille', chair:'Chaise',
  couch:'Canapé', horse:'Cheval',
};

const COLORS = ['rouge','orange','jaune','vert','cyan','bleu','violet','rose','blanc','gris','noir'];

let _upd = null, _cv = null;

export function initQueryPanel(onUpdate, cvEngine) {
  _upd = onUpdate;
  _cv  = cvEngine;
  document.getElementById('btn-add-query')?.addEventListener('click', () => openEditor(null));
  renderQueryList();
}

export function renderQueryList() {
  const el = document.getElementById('query-list');
  if (!el) return;
  const qs = loadQueries();
  el.innerHTML = qs.length
    ? qs.map(qrow).join('')
    : `<p style="color:var(--text-3);font-size:12px;padding:8px">Aucune requête</p>`;
  el.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openEditor(b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => { deleteQuery(b.dataset.del); renderQueryList(); _upd?.(); }));
  el.querySelectorAll('[data-tog]').forEach(inp =>
    inp.addEventListener('change', () => { updateQuery(inp.dataset.tog, { enabled: inp.checked }); _upd?.(); }));
}

function qrow(q) {
  const nb = q.criteria?.length || 0;
  return `
    <div class="query-row" data-id="${q.id}">
      <label class="query-row__toggle">
        <input type="checkbox" data-tog="${q.id}" ${q.enabled !== false ? 'checked' : ''}>
      </label>
      <div class="query-row__info">
        <strong>${q.name}</strong>
        <span style="color:var(--text-3);font-size:11px">${nb} critère${nb>1?'s':''} · ${q.type}</span>
      </div>
      <div class="query-row__actions">
        <button class="btn btn--ghost btn--sm" data-edit="${q.id}">✏️</button>
        <button class="btn btn--ghost btn--sm" data-del="${q.id}">🗑</button>
      </div>
    </div>`;
}

async function openEditor(queryId) {
  const existing = queryId ? loadQueries().find(q => q.id === queryId) : null;
  const q = existing || {
    id:       'q_' + Date.now(),
    name:     '',
    type:     'object',
    enabled:  true,
    criteria: [],
  };

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px;width:95%">
      <div class="modal__header">
        <strong>${existing ? 'Modifier' : 'Nouvelle'} requête CV</strong>
        <button class="btn btn--ghost btn--sm" data-close>✕</button>
      </div>
      <div class="modal__body" style="display:flex;flex-direction:column;gap:12px">

        <label style="font-size:12px;font-weight:600">Nom de la requête
          <input id="qe-name" class="input" value="${q.name}" placeholder="Ex: Voiture rouge" style="margin-top:4px">
        </label>

        <label style="font-size:12px;font-weight:600">Type de détection
          <select id="qe-type" class="input" style="margin-top:4px">
            <option value="object" ${q.type==='object'?'selected':''}>🎯 Objet (COCO-SSD)</option>
            <option value="face"   ${q.type==='face'  ?'selected':''}>👤 Visage (face-api)</option>
          </select>
        </label>

        <!-- Panneau objet -->
        <div id="qe-object-panel">
          <label style="font-size:12px;font-weight:600">Classes d'objets</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px" id="qe-classes">
            ${Object.entries(COCO).map(([k,v]) => `
              <label style="font-size:11px;display:flex;align-items:center;gap:3px;cursor:pointer">
                <input type="checkbox" value="${k}" ${q.objectClasses?.includes(k)?'checked':''}>
                ${v}
              </label>`).join('')}
          </div>
          <label style="font-size:12px;font-weight:600;margin-top:10px;display:block">Couleur (optionnel)
            <select id="qe-color" class="input" style="margin-top:4px">
              <option value="">— aucune —</option>
              ${COLORS.map(c => `<option value="${c}" ${q.colorFilter===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </label>
          <label style="font-size:12px;font-weight:600;margin-top:10px;display:block">Confiance min (${Math.round((q.minConfidence||0.4)*100)}%)
            <input type="range" id="qe-conf" min="10" max="95" value="${Math.round((q.minConfidence||0.4)*100)}"
              style="width:100%;margin-top:4px"
              oninput="this.previousElementSibling.textContent='Confiance min ('+this.value+'%)'">
          </label>
        </div>

        <!-- Panneau face -->
        <div id="qe-face-panel" style="display:none">
          <label style="font-size:12px;font-weight:600">Photo de référence
            <input type="file" id="qe-face-file" accept="image/*" style="margin-top:4px;display:block">
          </label>
          <div id="qe-face-preview" style="margin-top:8px"></div>
          <label style="font-size:12px;font-weight:600;margin-top:10px;display:block">Similarité min (${Math.round((q.minSimilarity||0.5)*100)}%)
            <input type="range" id="qe-sim" min="20" max="95" value="${Math.round((q.minSimilarity||0.5)*100)}"
              style="width:100%;margin-top:4px"
              oninput="this.previousElementSibling.textContent='Similarité min ('+this.value+'%)'">
          </label>
          <p id="qe-face-status" style="font-size:11px;color:var(--text-3);margin-top:6px">
            ${q.type==='face' && _cv?.isFaceReady() ? '✅ Face-api prêt' : _cv?.isFaceReady() ? '✅ Face-api prêt' : '⏳ Chargement modèles…'}
          </p>
        </div>

      </div>
      <div class="modal__footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button class="btn btn--ghost" data-close>Annuler</button>
        <button class="btn btn--primary" id="qe-save">💾 Enregistrer</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Toggle panneau object/face
  const typeEl = modal.querySelector('#qe-type');
  const objPanel  = modal.querySelector('#qe-object-panel');
  const facePanel = modal.querySelector('#qe-face-panel');
  const togglePanels = () => {
    const isFace = typeEl.value === 'face';
    objPanel.style.display  = isFace ? 'none'  : 'block';
    facePanel.style.display = isFace ? 'block' : 'none';
  };
  typeEl.addEventListener('change', togglePanels);
  togglePanels();

  // Fermeture
  modal.querySelectorAll('[data-close]').forEach(b =>
    b.addEventListener('click', () => modal.remove()));

  // Preview photo de référence + enregistrement descriptor
  let _faceImg = null;
  modal.querySelector('#qe-face-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = modal.querySelector('#qe-face-preview');
    const status  = modal.querySelector('#qe-face-status');

    // Charger l'image
    const dataUrl = await new Promise(ok => {
      const reader = new FileReader();
      reader.onload = ev => ok(ev.target.result);
      reader.readAsDataURL(file);
    });

    _faceImg = await new Promise(ok => {
      const img = new Image();
      img.onload = () => ok(img);
      img.src = dataUrl;
    });

    preview.innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:120px;border-radius:6px;margin-top:4px">`;

    // Enregistrer le descriptor face-api
    // ✅ FIX: appel à addFaceRef() qui est l'alias de registerFaceDescriptor()
    if (_cv && typeEl.value === 'face') {
      status.textContent = '⏳ Analyse du visage…';
      try {
        await _cv.addFaceRef(q.id, _faceImg);
        status.textContent = '✅ Visage enregistré avec succès';
        status.style.color = '#3fb950';
      } catch (err) {
        status.textContent = '❌ ' + err.message;
        status.style.color = '#f85149';
      }
    }
  });

  // Sauvegarde
  modal.querySelector('#qe-save').addEventListener('click', async () => {
    const name = modal.querySelector('#qe-name').value.trim();
    if (!name) { alert('Donnez un nom à la requête.'); return; }

    const type = typeEl.value;
    const data = { ...q, name, type, enabled: q.enabled !== false };

    if (type === 'object') {
      data.objectClasses = [...modal.querySelectorAll('#qe-classes input:checked')].map(i => i.value);
      data.colorFilter   = modal.querySelector('#qe-color').value || null;
      data.minConfidence = parseInt(modal.querySelector('#qe-conf').value, 10) / 100;
      if (!data.objectClasses.length) { alert('Sélectionnez au moins une classe d\'objet.'); return; }
    }

    if (type === 'face') {
      data.minSimilarity = parseInt(modal.querySelector('#qe-sim').value, 10) / 100;
      // Si une nouvelle photo a été chargée, le descriptor est déjà dans CVEngine
      // Si c'est une requête existante sans nouvelle photo → descriptor déjà en mémoire
      if (_faceImg && _cv) {
        try {
          await _cv.addFaceRef(data.id, _faceImg);
        } catch (err) {
          alert('Erreur enregistrement visage : ' + err.message);
          return;
        }
      }
    }

    if (existing) updateQuery(q.id, data);
    else          createQuery(data);

    modal.remove();
    renderQueryList();
    _upd?.();
  });
}
