import{MapManager}from'./map/MapManager.js';
import{PlayerGrid}from'./player/PlayerGrid.js';
import{VideoImporter}from'./player/VideoImporter.js';
import{fetchAllCameras,SOURCE_REGISTRY}from'./sources/SourceManager.js';
import{initSettingsPanel}from'./settings/SettingsPanel.js';
import{getSetting,setSetting}from'./settings/SettingsManager.js';
import{LogStore}from'./logs/LogStore.js';
import{LogPanel}from'./logs/LogPanel.js';
import{CVEngine}from'./cv/CVEngine.js';
import{initQueryPanel,renderQueryList}from'./queries/QueryEditor.js';
import{getActiveQueries}from'./queries/QueryManager.js';

const state={cameras:new Map(),filters:{source:'',status:'',country:''}};
let map,grid,logs,logPanel,cv,importer;

document.addEventListener('DOMContentLoaded',async()=>{
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
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
  renderSourcePanel();
  bindUI();
  await loadCams();
  initMobileNav();
  await logPanel.refresh();
});

async function loadCams(){
  setLoading(true);
  try{
    const cams=await fetchAllCameras(map.getBbox());
    state.cameras.clear();cams.forEach(c=>state.cameras.set(c.id,c));
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
  map.setCameras(v);
}

function populateFilters(){
  const u=k=>[...new Set([...state.cameras.values()].map(c=>c[k]).filter(Boolean))].sort();
  fillSel('filter-source',u('sourceId'));
  fillSel('filter-country',u('country'));
}

function fillSel(id,vals){
  const el=document.getElementById(id);if(!el)return;
  const first=el.options[0];el.innerHTML='';el.appendChild(first);
  vals.forEach(v=>{const o=document.createElement('option');o.value=o.textContent=v;el.appendChild(o)});
}

function renderSourcePanel(){
  const list=document.getElementById('source-list');if(!list)return;
  const settings=getSetting('sources')||{};
  list.innerHTML=SOURCE_REGISTRY.map(s=>{
    const on=settings[s.id]!==undefined?settings[s.id]:s.on;
    const needP=s.proxy&&!getSetting('proxyUrl');
    return`<div class="source-item">
      <label class="toggle"><input type="checkbox" data-src="${s.id}" ${on?'checked':''}/>
        <span class="toggle__slider"></span></label>
      <span class="source-item__name">${s.name}</span>
      <span class="source-item__tag">${s.region}</span>
      ${needP?'<span class="source-item__tag" style="color:var(--warning)">proxy requis</span>':''}
    </div>`;
  }).join('');
  list.querySelectorAll('[data-src]').forEach(inp=>inp.addEventListener('change',()=>{
    const ss=getSetting('sources')||{};ss[inp.dataset.src]=inp.checked;
    setSetting('sources',ss);loadCams();
  }));
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
  document.getElementById('camera-popup-inner').innerHTML=
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <strong style="font-size:13px">${cam.name}</strong>
      <button class="btn btn--ghost btn--sm" data-close>✕</button>
    </div>
    <div style="font-size:11px;color:var(--text-2);margin-bottom:6px">
      ${cam.sourceId} · ${cam.country||'—'} · <span class="badge badge--${cam.status||'unknown'}">${cam.status||'?'}</span>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">${cam.lat.toFixed(5)}, ${cam.lng.toFixed(5)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn--primary btn--sm" data-pin>${pinned?'Dépingler':'Épingler'}</button>
      ${cam.streamUrl||cam.snapshotUrl?'<button class="btn btn--ghost btn--sm" data-open>Ouvrir flux</button>':''}
      <button class="btn btn--ghost btn--sm" data-analyze>Analyser CV</button>
    </div>`;
  const inner=document.getElementById('camera-popup-inner');
  inner.querySelector('[data-close]').onclick=closePopup;
  inner.querySelector('[data-pin]').onclick=()=>{
    if(pinned){grid.unpin(cam.id);map.updateCameraStatus(cam.id,cam.status)}
    else{grid.pin(cam);map.updateCameraStatus(cam.id,'pinned');refreshCV()}
    closePopup();
  };
  inner.querySelector('[data-open]')?.addEventListener('click',()=>{grid.pin(cam);map.updateCameraStatus(cam.id,'pinned');refreshCV();closePopup()});
  inner.querySelector('[data-analyze]')?.addEventListener('click',async()=>{
    closePopup();let p=grid.getPlayer(cam.id);
    if(!p){grid.pin(cam);await new Promise(r=>setTimeout(r,1200));p=grid.getPlayer(cam.id)}
    if(p){const r=await cv.analyzeOnce(p,getActiveQueries()||[]);if(r)flash(`Analyse OK — score: ${Math.round(r.globalScore*100)}%`)}
  });
  document.getElementById('camera-popup').classList.remove('hidden');
}

function closePopup(){document.getElementById('camera-popup').classList.add('hidden')}

function bindUI(){
  const on=(id,ev,fn)=>document.getElementById(id)?.addEventListener(ev,fn);
  on('filter-source','change',e=>{state.filters.source=e.target.value;applyFilters()});
  on('filter-status','change',e=>{state.filters.status=e.target.value;applyFilters()});
  on('filter-country','change',e=>{state.filters.country=e.target.value;applyFilters()});
  on('btn-refresh','click',loadCams);
  on('btn-cv-toggle','click',e=>{
    const active=e.target.dataset.on==='1';
    e.target.dataset.on=active?'0':'1';
    e.target.textContent=active?'CV On':'CV Off';
    active?cv.stopAll():refreshCV();
  });
  // Sources → sidebar DROITE
  on('btn-sources','click',()=>{toggleSide('source-panel');renderSourcePanel()});
  on('btn-sources-close','click',()=>toggleSide('source-panel',false));
  on('btn-queries','click',()=>toggleSide('query-panel'));
  on('btn-logs','click',()=>{toggleSide('log-panel-side');logPanel.refresh()});
  on('btn-import','click',()=>toggleSide('import-panel'));
  on('btn-import-close','click',()=>toggleSide('import-panel',false));
  on('btn-import-run','click',()=>importer.run());
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
    if(t==='queries')toggleSide('query-panel',true);
    if(t==='logs'){toggleSide('log-panel-side',true);logPanel.refresh()}
    if(t==='streams')toggleSide('streams-panel',true);
  }));
}

function flash(msg){
  let n=document.getElementById('notif-bar');
  if(!n){n=document.createElement('div');n.id='notif-bar';n.className='notif-bar';document.body.appendChild(n)}
  n.textContent=msg;n.classList.add('show');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('show'),5000);
}

function setLoading(on){const el=document.getElementById('loading-bar');if(el)el.style.display=on?'':'none'}
