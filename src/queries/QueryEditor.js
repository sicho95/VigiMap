import { loadQueries, createQuery, updateQuery, deleteQuery } from './QueryManager.js';
import { COCO_CLASSES } from '../cv/ObjectDetector.js';

// Labels français pour les classes COCO
const COCO_FR = {
  'person':'Personne','car':'Voiture','truck':'Camion','motorcycle':'Moto',
  'bus':'Bus','bicycle':'Vélo','dog':'Chien','cat':'Chat','horse':'Cheval',
  'bird':'Oiseau','train':'Train','boat':'Bateau','airplane':'Avion',
  'backpack':'Sac à dos','suitcase':'Valise','umbrella':'Parapluie',
  'handbag':'Sac à main','bottle':'Bouteille','chair':'Chaise','couch':'Canapé',
  'potted plant':'Plante','bed':'Lit','dining table':'Table','tv':'Télévision',
  'laptop':'Ordinateur portable','mouse':'Souris','keyboard':'Clavier',
  'cell phone':'Téléphone','book':'Livre','clock':'Horloge',
};

const COLORS = ['rouge','orange','jaune','vert','cyan','bleu','violet','rose','blanc','gris','noir'];

// Tooltip helper
const tip = (msg) => `<span class="info-tip" title="${msg}">ⓘ</span>`;

let _upd = null, _cv = null;

export function initQueryPanel(onUpdate, cvEngine) {
  _upd = onUpdate;
  _cv  = cvEngine;
  document.getElementById('btn-add-query')?.addEventListener('click', () => openEditor(null));
  document.getElementById('btn-add-query-mobile')?.addEventListener('click', () => openEditor(null));
  renderQueryList();
}

export function renderQueryList() {
  ['query-list', 'query-list-mobile'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const qs = loadQueries();
    el.innerHTML = qs.length
      ? qs.map(qrow).join('')
      : '<p style="color:var(--text-3);font-size:12px;padding:12px">Aucune requête</p>';
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEditor(b.dataset.edit)));
    el.querySelectorAll('[data-del]').forEach(b  => b.addEventListener('click', () => { deleteQuery(b.dataset.del); renderQueryList(); _upd?.(); }));
    el.querySelectorAll('[data-tog]').forEach(inp => inp.addEventListener('change', () => { updateQuery(inp.dataset.tog, { enabled: inp.checked }); _upd?.(); }));
  });
}

function qrow(q) {
  const nb = q.criteria?.length || 0;
  return `<div class="query-row">
    <label class="toggle" style="margin-right:6px">
      <input type="checkbox" data-tog="${q.id}" ${q.enabled ? 'checked' : ''}/>
      <span class="toggle__slider"></span>
    </label>
    <span class="query-row__name">${q.name}</span>
    <span class="query-row__criteria">${nb} critère${nb > 1 ? 's' : ''}</span>
    <button class="btn btn--ghost btn--sm" data-edit="${q.id}">✏️</button>
    <button class="btn btn--ghost btn--sm" data-del="${q.id}" style="color:var(--danger)">✕</button>
  </div>`;
}

function criterionRow(c, coco, cols) {
  let inner = '';
  if (c.type === 'object') {
    inner = `<select class="select-sm" name="value" style="flex:1">${coco}</select>
      <label style="font-size:11px;color:var(--text-2)">Seuil&nbsp;min
        ${tip('Pourcentage de confiance minimum pour valider la détection de cet objet')}
      </label>
      <input class="input" name="confidence" type="number" min="10" max="100"
        value="${Math.round((c.confidence || 0.5) * 100)}" style="width:62px"/>
      <span style="font-size:11px;color:var(--text-2)">%</span>`;
  } else if (c.type === 'color') {
    inner = `<select class="select-sm" name="value">${cols}</select>
      <label style="font-size:11px;color:var(--text-2)">Tolérance
        ${tip('Tolérance de teinte en % — 0 = couleur exacte, 30 = large gamme acceptée')}
      </label>
      <input class="input" name="tolerance" type="number" min="0" max="60"
        value="${c.tolerance ?? 30}" style="width:62px"/>
      <span style="font-size:11px;color:var(--text-2)">%</span>`;
  } else if (c.type === 'face') {
    inner = `<span style="font-size:11px;color:var(--text-2)">Référence :</span>
      ${c.refId ? `<span style="font-size:11px;color:var(--success)">${c.refId}</span>` : ''}
      <input type="file" class="input" name="refImg" accept="image/*" style="font-size:11px;flex:1"/>
      <label style="font-size:11px;color:var(--text-2)">Distance max
        ${tip('Score de similarité faciale — 0.4 = très strict, 0.6 = normal, 0.8 = permissif')}
      </label>
      <input class="input" name="distance" type="number" min="0.1" max="1" step="0.05"
        value="${c.distance ?? 0.6}" style="width:62px"/>`;
  } else if (c.type === 'plate') {
    inner = `<input class="input" name="value" placeholder="AA-123-BB"
        value="${c.value || ''}" style="flex:1"/>
      <select class="select-sm" name="mode">
        <option value="exact"   ${c.mode === 'exact'   ? 'selected' : ''}>Exact</option>
        <option value="partial" ${c.mode === 'partial' ? 'selected' : ''}>Partiel</option>
        <option value="regex"   ${c.mode === 'regex'   ? 'selected' : ''}>Regex</option>
      </select>`;
  }
  const typeLabel = {
    object: '🔍 Objet', color: '🎨 Couleur', face: '👤 Visage', plate: '🚘 Immatriculation'
  }[c.type] || c.type;

  return `<div class="criterion-row" data-type="${c.type}">
    <span class="criterion-type">${typeLabel}</span>
    <div style="display:flex;align-items:center;gap:6px;flex:1;flex-wrap:wrap">${inner}</div>
    <button class="btn btn--ghost btn--sm" data-rm style="color:var(--danger);flex-shrink:0">✕</button>
  </div>`;
}

export function openEditor(qid) {
  const q     = qid ? loadQueries().find(r => r.id === qid) : null;
  const modal = document.getElementById('query-modal');
  if (!modal) return;

  const coco = COCO_CLASSES.map(cl =>
    `<option value="${cl}" ${q?.criteria?.some(c => c.value === cl) ? 'selected' : ''}>${COCO_FR[cl] || cl}</option>`
  ).join('');
  const cols = COLORS.map(cl =>
    `<option value="${cl}">${cl.charAt(0).toUpperCase() + cl.slice(1)}</option>`
  ).join('');

  modal.innerHTML = `<div class="modal">
    <div class="modal__header">
      <h3>${q ? 'Modifier' : 'Nouvelle'} requête</h3>
      <button class="btn btn--ghost btn--sm" id="qe-x">✕</button>
    </div>
    <div class="modal__body">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="font-size:12px;color:var(--text-2)">Nom de la requête</label>
        <input class="input" id="qe-name" value="${q?.name || ''}" placeholder="Ex : Camionnette rouge"/>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <label style="font-size:12px;color:var(--text-2)">
            Confiance globale min ${tip('Score moyen minimum sur tous les critères pour déclencher un match — ex : 70 = 70% de certitude')}
          </label>
          <input class="input" type="number" min="10" max="100" id="qe-conf"
            value="${Math.round((q?.confidenceThreshold || 0.7) * 100)}" style="width:68px"/>
          <span style="font-size:12px;color:var(--text-2)">%</span>
        </div>

        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2)">
          <input type="checkbox" id="qe-cap" ${q?.captureFrameOnMatch !== false ? 'checked' : ''}/>
          Capturer la frame en cas de match
        </label>

        <div style="border-top:1px solid var(--border);padding-top:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:600">Critères <span style="color:var(--text-3)">(tous requis)</span></span>
            <div style="display:flex;gap:6px">
              <button class="btn btn--ghost btn--sm" data-add="object">+ Objet</button>
              <button class="btn btn--ghost btn--sm" data-add="color">+ Couleur</button>
              <button class="btn btn--ghost btn--sm" data-add="face">+ Visage</button>
              <button class="btn btn--ghost btn--sm" data-add="plate">+ Immatriculation</button>
            </div>
          </div>
          <div id="qe-crit">
            ${(q?.criteria || []).map(c => criterionRow(c, coco, cols)).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost btn--sm" id="qe-cancel">Annuler</button>
      <button class="btn btn--primary btn--sm" id="qe-save">Enregistrer</button>
    </div>
  </div>`;

  modal.classList.remove('hidden');
  _bind(q, coco, cols);
}

function _bind(existing, coco, cols) {
  const $ = id => document.getElementById(id);
  const close = () => document.getElementById('query-modal').classList.add('hidden');

  $('qe-x')?.addEventListener('click', close);
  $('qe-cancel')?.addEventListener('click', close);

  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    const d = document.createElement('div');
    d.innerHTML = criterionRow({ type: b.dataset.add, value: '', mode: 'exact', confidence: 0.5, tolerance: 30, distance: 0.6 }, coco, cols);
    document.getElementById('qe-crit').appendChild(d.firstElementChild);
    _bindRemove();
  }));

  _bindRemove();

  $('qe-save')?.addEventListener('click', async () => {
    const name  = $('qe-name')?.value?.trim() || 'Requête';
    const conf  = +($('qe-conf')?.value || 70) / 100;
    const cap   = $('qe-cap')?.checked ?? true;
    const criteria = [];

    for (const row of document.querySelectorAll('.criterion-row')) {
      const type = row.dataset.type;
      const c = { type };
      row.querySelectorAll('[name]').forEach(el => {
        c[el.name] = el.type === 'number' ? +el.value : el.value;
      });
      // Normaliser confidence/distance en 0-1
      if (type === 'object') c.confidence = c.confidence / 100;
      if (type === 'color')  c.tolerance  = c.tolerance;   // déjà en %
      if (type === 'face') {
        const fi = row.querySelector('[name="refImg"]');
        if (fi?.files?.[0]) {
          c.refId = 'face_' + Date.now();
          const img = await fi2img(fi.files[0]);
          const ok  = await _cv?.addFaceRef(c.refId, img);
          if (!ok) { alert('Aucun visage détecté dans l'image.'); return; }
        } else {
          c.refId = existing?.criteria?.find(cr => cr.type === 'face')?.refId || null;
        }
      }
      criteria.push(c);
    }

    if (existing) updateQuery(existing.id, { name, confidenceThreshold: conf, captureFrameOnMatch: cap, criteria });
    else          createQuery({ name, confidenceThreshold: conf, captureFrameOnMatch: cap, criteria });

    close();
    renderQueryList();
    _upd?.();
  });
}

function _bindRemove() {
  document.querySelectorAll('[data-rm]').forEach(b => {
    b.onclick = () => b.closest('.criterion-row').remove();
  });
}

function fi2img(file) {
  return new Promise(ok => {
    const u = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); ok(img); };
    img.src = u;
  });
}
