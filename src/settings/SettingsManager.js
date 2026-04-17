// Gere la persistance des parametres dans localStorage
export const DEFAULTS = {
  proxyUrl:'', maxPinnedStreams:10, snapshotRefreshMs:30000,
  logLimitMb:100, captureFrameOnMatch:true, jpegQuality:0.6,
  cvBackend:'webgl', cvFrequency:'interval_2', cvConfidence:0.70,
  showOffline:true, sources:{},
};
const KEY = 'vigimap_settings';

// Charge et fusionne les parametres stockes avec les valeurs par defaut
export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
// Persiste les parametres dans localStorage
export function saveSettings(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
// Met a jour une seule cle et persiste
export function setSetting(k, v) { const s=loadSettings(); s[k]=v; saveSettings(s); }
// Retourne la valeur d'une cle ou sa valeur par defaut
export function getSetting(k) { return loadSettings()[k] ?? DEFAULTS[k]; }
