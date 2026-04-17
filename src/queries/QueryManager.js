const K='vigimap_queries';
export function loadQueries(){try{return JSON.parse(localStorage.getItem(K)||'[]');}catch{return[];}}
export function saveQueries(q){localStorage.setItem(K,JSON.stringify(q));}
export function getActiveQueries(){return loadQueries().filter(q=>q.enabled);}
export function createQuery(p={}){const q={id:'req_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name:p.name||'Nouvelle requete',enabled:true,confidenceThreshold:p.confidenceThreshold??0.70,captureFrameOnMatch:p.captureFrameOnMatch??true,criteria:p.criteria||[],cameraScope:'all',createdAt:new Date().toISOString()};const qs=loadQueries();qs.push(q);saveQueries(qs);return q;}
export function updateQuery(id,patch){const qs=loadQueries().map(q=>q.id===id?{...q,...patch}:q);saveQueries(qs);return qs.find(q=>q.id===id)||null;}
export function deleteQuery(id){saveQueries(loadQueries().filter(q=>q.id!==id));}
