const KEY='vigimap_queries';
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return[]}}
function save(qs){localStorage.setItem(KEY,JSON.stringify(qs))}
export function loadQueries(){return load()}
export function getActiveQueries(){return load().filter(q=>q.enabled!==false)}
export function createQuery(d){const qs=load();qs.push({id:'q_'+Date.now(),enabled:true,...d});save(qs)}
export function updateQuery(id,patch){save(load().map(q=>q.id===id?{...q,...patch}:q))}
export function deleteQuery(id){save(load().filter(q=>q.id!==id))}
