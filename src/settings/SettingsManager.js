const KEY='vigimap_settings';let _c=null;
function load(){if(!_c){try{_c=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){_c={}}}return _c}
export function getSetting(k){return load()[k]}
export function setSetting(k,v){const s=load();s[k]=v;_c=s;localStorage.setItem(KEY,JSON.stringify(s))}
export function getAllSettings(){return load()}
