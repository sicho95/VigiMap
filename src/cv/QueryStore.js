// QueryStore.js — stockage en mémoire des requêtes CV
export class QueryStore {
  constructor() { this._queries = []; }
  add(q)    { this._queries.push(q); }
  remove(id){ this._queries = this._queries.filter(q => q.id !== id); }
  getAll()  { return [...this._queries]; }
  clear()   { this._queries = []; }
}
