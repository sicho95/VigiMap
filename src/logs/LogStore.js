const DB_NAME='VigiMapLogs',DB_VER=2,STORE='logs';
export class LogStore{
  constructor(){this.db=null}
  async init(){
    return new Promise((ok,err)=>{
      const r=indexedDB.open(DB_NAME,DB_VER);
      r.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};
      r.onsuccess=e=>{this.db=e.target.result;ok()};
      r.onerror=e=>err(e);
    });
  }
  async add(entry){
    if(!this.db)return;
    return new Promise((ok,err)=>{
      const tx=this.db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).add({...entry,ts:Date.now()});
      tx.oncomplete=ok;tx.onerror=err;
    });
  }
  async getAll(){
    if(!this.db)return[];
    return new Promise(ok=>{
      const tx=this.db.transaction(STORE,'readonly');
      const r=tx.objectStore(STORE).getAll();
      r.onsuccess=()=>ok(r.result.reverse());
    });
  }
  async clear(){
    if(!this.db)return;
    return new Promise(ok=>{
      const tx=this.db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).clear();tx.oncomplete=ok;
    });
  }
  async exportJson(){const d=await this.getAll();const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(b),download:'vigimap-logs.json'});a.click()}
}
