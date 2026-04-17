export class LogPanel{
  constructor(store,listId,infoId){this._s=store;this._li=listId;this._ii=infoId}
  bind(exportBtnId,clearBtnId){
    document.getElementById(exportBtnId)?.addEventListener('click',()=>this._s.exportJson());
    document.getElementById(clearBtnId)?.addEventListener('click',async()=>{await this._s.clear();this.refresh()});
  }
  async refresh(){
    const el=document.getElementById(this._li);const info=document.getElementById(this._ii);
    if(!el)return;
    const logs=await this._s.getAll();
    if(!logs.length){el.innerHTML='<p style="color:var(--text-3);font-size:12px;padding:12px">Aucun log</p>';if(info)info.textContent='';return}
    el.innerHTML=logs.slice(0,200).map(l=>{
      const sc=l.globalScore||0;const cls=sc>=0.8?'high':sc>=0.6?'mid':'';
      const t=new Date(l.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      return`<div class="log-entry">
        <span class="log-entry__time">${t}</span>
        <span class="log-entry__q">${l.queryName||'—'}</span>
        <span class="log-entry__cam">${l.cameraName||l.cameraId||'—'}</span>
        <span class="log-entry__score ${cls}">${Math.round(sc*100)}%</span>
      </div>`;
    }).join('');
    if(info)info.textContent=`${logs.length} entrée${logs.length>1?'s':''}`;
  }
}
