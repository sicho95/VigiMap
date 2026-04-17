import{MapManager}from'./map/MapManager.js';
import{PlayerGrid}from'./player/PlayerGrid.js';
import{VideoImporter}from'./player/VideoImporter.js';
import{fetchAllCameras}from'./sources/SourceManager.js';
import{initSourcePanel}from'./sources/SourcePanel.js';
import{initSettingsPanel}from'./settings/SettingsPanel.js';
import{getSetting,setSetting}from'./settings/SettingsManager.js';
import{LogStore}from'./logs/LogStore.js';
import{LogPanel}from'./logs/LogPanel.js';
import{CVEngine}from'./cv/CVEngine.js';
import{initQueryPanel}from'./queries/QueryEditor.js';
import{getActiveQueries}from'./queries/QueryManager.js';
import{LibraryPanel}from'./youtube/LibraryPanel.js';
import{openAddStreamModal}from'./youtube/AddStreamModal.js';
import{getAllStreams,streamToCam}from'./youtube/YouTubeLibrary.js';

const state={cameras:new Map(),filters:{source:'',status:'',country:''}};
let map,grid,logs,logPanel,cv,importer,libPanel;

document.addEventListener('DOMContentLoaded',async()=>{
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

  // Settings panel — tolérant si #settings-inner pas encore dans DOM
  initSettingsPanel();

  map=new MapManager('map',onCamClick).init();
  requestAnimationFrame(()=>map.getMap().invalidateSize());
  grid=new PlayerGrid('player-grid');
  logs=new LogStore();await logs.init();
  logPanel=new LogPanel(logs,'log-list','log-size-info');
  logPanel.bind('btn-export-logs','btn-clear-logs');
  cv=new CVEngine(onCVMatch);
  importer=new VideoImporter(grid,cv,getActiveQueries,onCVMatch);
  initQueryPanel(()=>refreshCV(),cv);

  // ── Source panel ──────────────────────────────────────────────────────────
  initSourcePanel('source-list',()=>loadCams());

  // ── Bibliothèque ──────────────────────────────────────────────────────────
  libPanel=new LibraryPanel('lib-list',
    cam=>pinCam(cam),
    async()=>{await loadLibraryCamsOnMap();applyFilters()}
  );
  await libPanel.refresh();
  await loadLibraryCamsOnMap();

  bindUI();
  await loadCams();
  initMobileNav();
  await logPanel.refresh();
});

async function loadLibraryCamsOnMap(){
  const streams=await getAllStreams();
  streams.forEach(s=>{
    if(s.enabled===false)return;
    const cam=streamToCam(s);
    if(cam.lat||cam.lng)state.cameras.set(cam.id,cam);
  });
}

async function loadCams(){
  setLoading(true);
  try{
    const cams=await fetchAllCameras(map.getBbox());
    const keep=[...state.cameras.values()].filter(c=>c.sourceId==='youtube'||c.sourceId==='manual');
    state.cameras.clear();
    keep.forEach(c=>state.cameras.set(c.id,c));
    cams.forEach(c=>state.cameras.set(c.id,c));
    applyFilters();populateFilters();
  }catch(e){console.error('[VigiMap]',e)}
  finally{setLoading(false)}
}

function applyFilters(){
  const f=state.filters;
  const v=[...state.cameras.values()].filter(c=>{
    if(f.source&&c.sourceId!==f.source)return false;
    if(f.status&&c.status!==f.status)return false;
    if(f.country&&c.country!==f.country)return false;
    if(!getSetting('showOffline')&&c.status==='offline')return false;
    return true;
  });
  map.setCameras(v.filter(c=>c.lat||c.lng));
}

function populateFilters(){
  const u=k=>[...new Set([...state.cameras.values()].map(c=>c[k]).filter(Boolean))].sort();
  fillSel('filter-source',u('sourceId'));fillSel('filter-country',u('country'));
}
function fillSel(id,vals){
  const el=document.getElementById(id);if(!el)return;
  const first=el.options[0];el.innerHTML='';el.appendChild(first);
  vals.forEach(v=>{const o=document.createElement('option');o.value=o.textContent=v;el.appendChild(o)});
}

async function refreshCV(){
  const q=getActiveQueries();cv.stopAll();
  if(!q.length)return;
  for(const p of grid.all())await cv.start(p,q);
}

async function onCVMatch(cameraId,query,result,frameB64){
  const cam=state.cameras.get(cameraId)||{name:cameraId,sourceId:''};
  map.updateCameraStatus(cameraId,'match');
  setTimeout(()=>map.updateCameraStatus(cameraId,cam.status||'unknown'),8000);
  grid.highlight(cameraId);
  await logs.add({cameraId,cameraName:cam.name,sourceName:cam.sourceId,
    queryId:query.id,queryName:query.name,matchDetails:result.matchDetails,
    globalScore:result.globalScore,frameCapture:frameB64||null});
  await logPanel.refresh();
  flash(`🎯 Match [${query.name}] ${cam.name} — ${Math.round(result.globalScore*100)}%`);
}

function onCamClick(cam){
  const pinned=grid.isPinned(cam.id);
  const isYt=cam.sourceId==='youtube'||cam.sourceId==='manual';
  document.getElementById('camera-popup-inner').innerHTML=
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <strong style="font-size:13px">${cam.name}</strong>
      <button class="btn btn--ghost btn--sm" data-close>✕</button>
    </div>
    ${cam.snapshotUrl&&isYt?`<img src="${cam.snapshotUrl}" style="width:100%;max-height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px" loading="lazy" onerror="this.style.display='none'"/>`:''
    }
    <div style="font-size:11px;color:var(--text-2);margin-bottom:6px">
      ${cam.sourceName||cam.sourceId} · ${cam.country||'—'} · <span class="badge badge--${cam.status||'unknown'}">${cam.status||'?'}</span>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">
      ${cam.lat?cam.lat.toFixed(5):'?'}, ${cam.lng?cam.lng.toFixed(5):'?'}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn--primary btn--sm" data-pin>${pinned?'Dépingler':'▶ Regarder'}</button>
      ${isYt?'<button class="btn btn--ghost btn--sm" data-edit>✏️ Modifier</button>':''}
      <button class="btn btn--ghost btn--sm" data-analyze>🤖 CV</button>
    </div>`;
  const inner=document.getElementById('camera-popup-inner');
  inner.querySelector('[data-close]').onclick=closePopup;
  inner.querySelector('[data-pin]').onclick=()=>{pinned?grid.unpin(cam.id):pinCam(cam);closePopup()};
  inner.querySelector('[data-edit]')?.addEventListener('click',async()=>{
    closePopup();
    const updated=await openAddStreamModal({...cam,_dbId:cam._dbId,url:cam.streamUrl,ytId:cam.ytId});
    if(updated){state.cameras.set(updated.id,updated);applyFilters();await libPanel.refresh();}
  });
  inner.querySelector('[data-analyze]')?.addEventListener('click',async()=>{
    closePopup();let p=grid.getPlayer(cam.id);
    if(!p){pinCam(cam);await new Promise(r=>setTimeout(r,1200));p=grid.getPlayer(cam.id)}
    if(p){const r=await cv.analyzeOnce(p,getActiveQueries()||[]);if(r)flash(`Analyse OK — ${Math.round(r.globalScore*100)}%`)}
  });
  document.getElementById('camera-popup').classList.remove('hidden');
}

function pinCam(cam){grid.pin(cam);map.updateCameraStatus(cam.id,'pinned');refreshCV()}
function closePopup(){document.getElementById('camera-popup').classList.add('hidden')}

function bindUI(){
  const on=(id,ev,fn)=>document.getElementById(id)?.addEventListener(ev,fn);
  on('filter-source','change', e=>{state.filters.source=e.target.value;applyFilters()});
  on('filter-status','change', e=>{state.filters.status=e.target.value;applyFilters()});
  on('filter-country','change',e=>{state.filters.country=e.target.value;applyFilters()});
  on('btn-refresh','click',loadCams);
  on('btn-cv-toggle','click',e=>{
    const a=e.target.dataset.on==='1';e.target.dataset.on=a?'0':'1';
    e.target.textContent=a?'CV On':'CV Off';a?cv.stopAll():refreshCV();
  });
  on('btn-sources','click',()=>toggleSide('source-panel'));
  on('btn-sources-close','click',()=>toggleSide('source-panel',false));
  on('btn-queries','click',()=>toggleSide('query-panel'));
  on('btn-logs','click',()=>{toggleSide('log-panel-side');logPanel.refresh()});
  on('btn-import','click',()=>toggleSide('import-panel'));
  on('btn-import-close','click',()=>toggleSide('import-panel',false));
  on('btn-import-run','click',()=>importer.run());
  on('btn-library','click',()=>{toggleSide('library-panel');libPanel.refresh()});
  on('btn-library-close','click',()=>toggleSide('library-panel',false));
  // Bouton ➕ dans navbar ET dans le panneau biblio
  const addStream=async()=>{
    const cam=await openAddStreamModal();
    if(!cam)return;
    if(cam.lat||cam.lng){state.cameras.set(cam.id,cam);applyFilters()}
    await libPanel.refresh();flash(`✅ "${cam.name}" sauvegardé`);
  };
  on('btn-add-stream','click',addStream);
  on('btn-add-stream-lib','click',addStream);
  on('lib-search-input','input',e=>libPanel.filter(e.target.value));
  // Export/Import bibliothèque
  on('btn-lib-export','click',()=>libPanel.exportJSON());
  on('btn-lib-import','click',()=>document.getElementById('lib-import-file')?.click());
  document.getElementById('lib-import-file')?.addEventListener('change',async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{const n=await libPanel.importJSON(f);flash(`✅ ${n} flux importés`)}
    catch(err){flash(`⚠️ ${err.message}`)}
    e.target.value='';
  });
  on('btn-settings','click',()=>document.getElementById('settings-body')?.classList.toggle('hidden'));
  on('btn-settings-close','click',()=>document.getElementById('settings-body')?.classList.add('hidden'));
  map.getMap().on('click',closePopup);
}

function toggleSide(id,force){
  const el=document.getElementById(id);if(!el)return;
  if(force===true){el.classList.remove('hidden');return}
  if(force===false){el.classList.add('hidden');return}
  el.classList.toggle('hidden');
}

function initMobileNav(){
  document.querySelectorAll('.mobile-nav__btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.mobile-nav__btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const t=btn.dataset.tab;
    document.getElementById('map-panel').style.display=t==='map'?'':'none';
    const sp=document.getElementById('side-panel');if(sp)sp.style.display=t!=='map'?'flex':'none';
    if(t==='library'){toggleSide('library-panel',true);libPanel.refresh()}
    if(t==='queries')toggleSide('query-panel',true);
    if(t==='logs'){toggleSide('log-panel-side',true);logPanel.refresh()}
  }));
}

function flash(msg){
  let n=document.getElementById('notif-bar');
  if(!n){n=document.createElement('div');n.id='notif-bar';n.className='notif-bar';document.body.appendChild(n)}
  n.textContent=msg;n.classList.add('show');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('show'),5000);
}
function setLoading(on){const el=document.getElementById('loading-bar');if(el)el.style.display=on?'':'none'}
