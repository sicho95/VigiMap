const K='vigimap_settings';
const D={proxyUrl:'',showOffline:true,maxPinnedStreams:10,snapshotRefreshMs:30000,logLimitMb:100,captureFrameOnMatch:true,jpegQuality:0.6,cvBackend:'webgl',cvFrequency:'interval_2',cvConfidence:0.50,sources:{}};
export function loadSettings(){try{return{...D,...JSON.parse(localStorage.getItem(K)||'{}')};}catch{return{...D};}}
export function getSetting(k){return loadSettings()[k];}
export function setSetting(k,v){const s=loadSettings();s[k]=v;localStorage.setItem(K,JSON.stringify(s));}
export function saveSettings(p){localStorage.setItem(K,JSON.stringify({...loadSettings(),...p}));}
