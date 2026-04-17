import{loadQueries,createQuery,updateQuery,deleteQuery}from'./QueryManager.js';
const COCO={person:'Personne',car:'Voiture',truck:'Camion',motorcycle:'Moto',bus:'Bus',bicycle:'Vélo',
  dog:'Chien',cat:'Chat',bird:'Oiseau',train:'Train',boat:'Bateau',airplane:'Avion',
  backpack:'Sac à dos',suitcase:'Valise',umbrella:'Parapluie','cell phone':'Téléphone',
  laptop:'Ordinateur',bottle:'Bouteille',chair:'Chaise',couch:'Canapé',horse:'Cheval'};
const COLORS=['rouge','orange','jaune','vert','cyan','bleu','violet','rose','blanc','gris','noir'];
let _upd=null,_cv=null;
export function initQueryPanel(onUpdate,cvEngine){_upd=onUpdate;_cv=cvEngine;
  document.getElementById('btn-add-query')?.addEventListener('click',()=>openEditor(null));
  renderQueryList();
}
export function renderQueryList(){
  const el=document.getElementById('query-list');if(!el)return;
  const qs=loadQueries();
  el.innerHTML=qs.length?qs.map(qrow).join(''):'<p style="color:var(--text-3);font-size:12px;padding:12px">Aucune requête</p>';
  el.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{deleteQuery(b.dataset.del);renderQueryList();_upd?.()}));
  el.querySelectorAll('[data-tog]').forEach(inp=>inp.addEventListener('change',()=>{updateQuery(inp.dataset.tog,{enabled:inp.checked});_upd?.()}));
}
function qrow(q){const nb=q.criteria?.length||0;
  return`<div class="query-row">
    <label class="toggle"><input type="checkbox" data-tog="${q.id}" ${q.enabled!==false?'checked':''}/>
      <span class="toggle__slider"></span></label>
    <span class="query-row__name">${q.name}</span>
    <span class="query-row__criteria">${nb} critère${nb>1?'s':''}</span>
    <button class="btn btn--ghost btn--sm" data-edit="${q.id}">✏️</button>
    <button class="btn btn--ghost btn--sm" data-del="${q.id}" style="color:var(--danger)">✕</button>
  </div>`}
function cRow(c){
  const cocoOpts=Object.keys(COCO).map(k=>`<option value="${k}" ${c.value===k?'selected':''}>${COCO[k]||k}</option>`).join('');
  const colOpts=COLORS.map(cl=>`<option value="${cl}" ${c.value===cl?'selected':''}>${cl}</option>`).join('');
  const tip=m=>`<span class="info-tip" title="${m}">ⓘ</span>`;
  let inner='';
  if(c.type==='object')inner=`<select class="select-sm" name="value" style="flex:1">${cocoOpts}</select>
    <label style="font-size:11px;color:var(--text-2)">Min${tip('Confiance min')}</label>
    <input class="input" name="confidence" type="number" min="10" max="100" value="${Math.round((c.confidence||0.5)*100)}" style="width:54px"/>%`;
  else if(c.type==='color')inner=`<select class="select-sm" name="value">${colOpts}</select>
    <label style="font-size:11px;color:var(--text-2)">Tolérance${tip('0%=exacte')}</label>
    <input class="input" name="tolerance" type="number" min="0" max="60" value="${c.tolerance??30}" style="width:54px"/>%`;
  else if(c.type==='face')inner=`${c.refId?`<span style="font-size:11px;color:var(--success)">✓ ${c.refId}</span>`:''}<input type="file" class="input" name="refImg" accept="image/*" style="font-size:11px;flex:1"/>
    <label style="font-size:11px;color:var(--text-2)">Dist max${tip('0.4=strict,0.6=normal')}</label>
    <input class="input" name="distance" type="number" min="0.1" max="1" step="0.05" value="${c.distance??0.6}" style="width:54px"/>`;
  else if(c.type==='plate')inner=`<input class="input" name="value" placeholder="AA-123-BB" value="${c.value||''}" style="flex:1"/>
    <select class="select-sm" name="mode">
      <option value="exact" ${c.mode==='exact'?'selected':''}>Exact</option>
      <option value="partial" ${c.mode==='partial'?'selected':''}>Partiel</option>
      <option value="regex" ${c.mode==='regex'?'selected':''}>Regex</option>
    </select>`;
  const lbl={object:'🔍 Objet',color:'🎨 Couleur',face:'👤 Visage',plate:'🚘 Immatriculation'}[c.type]||c.type;
  return`<div class="criterion-row" data-type="${c.type}">
    <span class="criterion-type">${lbl}</span>
    <div style="display:flex;align-items:center;gap:6px;flex:1;flex-wrap:wrap">${inner}</div>
    <button class="btn btn--ghost btn--sm" data-rm style="color:var(--danger)">✕</button>
  </div>`}
export function openEditor(qid){
  const q=qid?loadQueries().find(r=>r.id===qid):null;
  const modal=document.getElementById('query-modal');if(!modal)return;
  modal.innerHTML=`<div class="modal">
    <div class="modal__header"><h3>${q?'Modifier':'Nouvelle'} requête</h3>
      <button class="btn btn--ghost btn--sm" id="qe-x">✕</button></div>
    <div class="modal__body">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="font-size:12px;color:var(--text-2)">Nom</label>
        <input class="input" id="qe-name" value="${q?.name||''}" placeholder="Ex: Camionnette rouge"/>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:12px;color:var(--text-2)">Confiance globale min</label>
          <input class="input" type="number" min="10" max="100" id="qe-conf" value="${Math.round((q?.confidenceThreshold||0.7)*100)}" style="width:60px"/>%
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2)">
          <input type="checkbox" id="qe-cap" ${q?.captureFrameOnMatch!==false?'checked':''}/>Capturer frame sur match</label>
        <div style="border-top:1px solid var(--border);padding-top:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:600">Critères</span>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="btn btn--ghost btn--sm" data-add="object">+ Objet</button>
              <button class="btn btn--ghost btn--sm" data-add="color">+ Couleur</button>
              <button class="btn btn--ghost btn--sm" data-add="face">+ Visage</button>
              <button class="btn btn--ghost btn--sm" data-add="plate">+ Immatriculation</button>
            </div>
          </div>
          <div id="qe-crit">${(q?.criteria||[]).map(cRow).join('')}</div>
        </div>
      </div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost btn--sm" id="qe-cancel">Annuler</button>
      <button class="btn btn--primary btn--sm" id="qe-save">Enregistrer</button>
    </div></div>`;
  modal.classList.remove('hidden');
  const close=()=>modal.classList.add('hidden');
  document.getElementById('qe-x')?.addEventListener('click',close);
  document.getElementById('qe-cancel')?.addEventListener('click',close);
  document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{
    const d=document.createElement('div');d.innerHTML=cRow({type:b.dataset.add,value:'',mode:'exact',confidence:0.5,tolerance:30,distance:0.6});
    document.getElementById('qe-crit').appendChild(d.firstElementChild);_bindRm();
  }));
  _bindRm();
  document.getElementById('qe-save')?.addEventListener('click',async()=>{
    const name=document.getElementById('qe-name')?.value?.trim()||'Requête';
    const conf=+document.getElementById('qe-conf')?.value/100;
    const cap=document.getElementById('qe-cap')?.checked??true;
    const criteria=[];
    for(const row of document.querySelectorAll('.criterion-row')){
      const type=row.dataset.type;const c={type};
      row.querySelectorAll('[name]').forEach(el=>{c[el.name]=el.type==='number'?+el.value:el.value});
      if(type==='object')c.confidence=c.confidence/100;
      if(type==='face'){
        const fi=row.querySelector('[name="refImg"]');
        if(fi?.files?.[0]){c.refId='face_'+Date.now();const img=await _fi2img(fi.files[0]);const ok=await _cv?.addFaceRef(c.refId,img);if(!ok){alert('Aucun visage détecté.');return}}
        else c.refId=q?.criteria?.find(cr=>cr.type==='face')?.refId||null;
      }
      criteria.push(c);
    }
    if(q)updateQuery(q.id,{name,confidenceThreshold:conf,captureFrameOnMatch:cap,criteria});
    else createQuery({name,confidenceThreshold:conf,captureFrameOnMatch:cap,criteria});
    close();renderQueryList();_upd?.();
  });
}
function _bindRm(){document.querySelectorAll('[data-rm]').forEach(b=>{b.onclick=()=>b.closest('.criterion-row').remove()})}
function _fi2img(f){return new Promise(ok=>{const u=URL.createObjectURL(f);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.src=u})}
