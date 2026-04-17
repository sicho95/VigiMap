import{SOURCE_REGISTRY}from'./SourceManager.js';
import{getSetting,setSetting}from'../settings/SettingsManager.js';

export function initSourcePanel(containerId, onToggle){
  const el=document.getElementById(containerId);
  if(!el)return;
  _render(el,onToggle);
}

function _render(el, onToggle){
  const settings=getSetting('sources')||{};
  const proxy=getSetting('proxyUrl')||'';
  const ak=getSetting('apiKeys')||{};

  // Listes dynamiques pour les filtres
  const regions=[...new Set(SOURCE_REGISTRY.map(s=>s.region))].sort();

  el.innerHTML=`
    <div class="source-filters">
      <input class="input" id="sp-search" placeholder="🔍 Rechercher…" style="font-size:12px"/>
      <select class="select-sm" id="sp-filter-region">
        <option value="">Toutes régions</option>
        ${regions.map(r=>`<option value="${r}">${r}</option>`).join('')}
      </select>
      <select class="select-sm" id="sp-filter-state">
        <option value="">Tous états</option>
        <option value="on">✅ Actives</option>
        <option value="off">⭕ Inactives</option>
        <option value="proxy">🔒 Besoin proxy</option>
        <option value="key">🔑 Besoin clé API</option>
        <option value="ready">🟢 Prêtes</option>
      </select>
      <div style="display:flex;gap:6px;padding:4px 0">
        <button class="btn btn--ghost btn--sm" id="sp-all-on" style="flex:1">✅ Tout activer</button>
        <button class="btn btn--ghost btn--sm" id="sp-all-off" style="flex:1">⭕ Tout désactiver</button>
      </div>
    </div>
    <div id="sp-count" style="font-size:10px;color:var(--text-3);padding:4px 10px"></div>
    <div id="sp-list"></div>`;

  function isReady(s){
    if(s.proxy&&!proxy)return false;
    if(s.apiKey&&!ak[s.apiKey])return false;
    return true;
  }
  function isOn(s){
    return settings[s.id]!==undefined?settings[s.id]:s.on;
  }

  function renderList(){
    const q=(document.getElementById('sp-search')?.value||'').toLowerCase();
    const reg=document.getElementById('sp-filter-region')?.value||'';
    const state=document.getElementById('sp-filter-state')?.value||'';
    const list=document.getElementById('sp-list');
    const count=document.getElementById('sp-count');
    if(!list)return;

    const filtered=SOURCE_REGISTRY.filter(s=>{
      if(q&&!s.name.toLowerCase().includes(q)&&!s.id.includes(q)&&!s.region.toLowerCase().includes(q))return false;
      if(reg&&s.region!==reg)return false;
      const on=isOn(s);const ready=isReady(s);
      if(state==='on'&&!on)return false;
      if(state==='off'&&on)return false;
      if(state==='proxy'&&!s.proxy)return false;
      if(state==='key'&&!s.apiKey)return false;
      if(state==='ready'&&!ready)return false;
      return true;
    });

    count.textContent=`${filtered.length} / ${SOURCE_REGISTRY.length} sources`;

    list.innerHTML=filtered.map(s=>{
      const on=isOn(s);const ready=isReady(s);
      const badges=[];
      if(s.proxy){badges.push(proxy
        ?'<span class="src-badge src-badge--ok">proxy ✓</span>'
        :'<span class="src-badge src-badge--warn">proxy requis</span>')}
      if(s.apiKey){badges.push(ak[s.apiKey]
        ?'<span class="src-badge src-badge--ok">clé ✓</span>'
        :`<span class="src-badge src-badge--warn">clé ${s.apiKey}</span>`)}
      if(!ready&&on){badges.push('<span class="src-badge src-badge--off">inactif</span>')}

      return`<div class="source-item ${!ready?'source-item--dim':''}" data-id="${s.id}">
        <div class="source-item__info">
          <span class="source-item__name">${s.name}</span>
          <div class="source-item__tags">
            <span class="src-badge src-badge--region">${s.region}</span>
            ${badges.join('')}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" data-src="${s.id}" ${on?'checked':''}/>
          <span class="toggle__slider"></span>
        </label>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-src]').forEach(inp=>inp.addEventListener('change',()=>{
      const ss=getSetting('sources')||{};
      ss[inp.dataset.src]=inp.checked;
      setSetting('sources',ss);
      onToggle?.();
    }));
  }

  renderList();

  document.getElementById('sp-search')?.addEventListener('input',renderList);
  document.getElementById('sp-filter-region')?.addEventListener('change',renderList);
  document.getElementById('sp-filter-state')?.addEventListener('change',renderList);

  document.getElementById('sp-all-on')?.addEventListener('click',()=>{
    const ss=getSetting('sources')||{};
    SOURCE_REGISTRY.forEach(s=>{ss[s.id]=true});
    setSetting('sources',ss);renderList();onToggle?.();
  });
  document.getElementById('sp-all-off')?.addEventListener('click',()=>{
    const ss=getSetting('sources')||{};
    SOURCE_REGISTRY.forEach(s=>{ss[s.id]=false});
    setSetting('sources',ss);renderList();onToggle?.();
  });
}
