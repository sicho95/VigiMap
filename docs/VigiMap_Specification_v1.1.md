# 📄 VigiMap — Spécification Fonctionnelle & Technique
## Version 1.1 — Consolidée, détaillée et directement implémentable · 20 avril 2026

---

## 1. Objet du document

Ce document définit la version **de référence exhaustive** de VigiMap après consolidation de la spécification initiale, des corrections techniques déjà apportées, des arbitrages UX responsive, des décisions sur le workflow CV, de la gestion offline et de la stratégie proxy/YouTube.

Cette version 1.1 a pour but de :
- supprimer les ambiguïtés restantes ;
- fixer un comportement attendu unique pour chaque écran et chaque état applicatif ;
- servir de base de développement directe pour les prochaines passes de code ;
- documenter les règles de persistance, de UI/UX, de gestion de flux, de bibliothèque, de logs, de CV et de PWA.

Sauf nouvelle décision explicite, cette v1.1 prévaut sur les versions précédentes.

---

## 2. Vision produit

**VigiMap** est une PWA frontend orientée surveillance visuelle et investigation légère, combinant :
- exploration de caméras publiques géolocalisées sur carte ;
- gestion d'une bibliothèque de flux et médias importés ;
- épinglage de sources d'intérêt ;
- exécution locale de requêtes de computer vision ;
- journalisation persistante des matches et événements de session ;
- exploitation connectée et hors ligne dans une logique de vraie application locale.

Le produit doit être utilisable :
- comme explorateur cartographique de caméras ;
- comme poste de visionnage de flux épinglés ;
- comme outil d'analyse locale sur imports vidéo/photo ;
- comme PWA offline capable de continuer à travailler sans réseau sur des médias déjà disponibles localement.

---

## 3. Contraintes de plateforme

| Domaine | Exigence |
|---|---|
| Hébergement | GitHub Pages uniquement pour l'application principale |
| Backend applicatif | Interdit |
| Composant distant autorisé | Cloudflare Worker personnel uniquement |
| Stack UI | Vanilla JS + Web Components |
| Stockage local | IndexedDB + localStorage |
| Fonctionnement offline | Oui, mode volontaire et exploitable |
| Compatibilité | Mobile, tablette, desktop |
| Langue | Français |
| Carte | Leaflet + OSM |
| Analyse locale | JS/WASM/WebGL/WebGPU selon disponibilité |

Contraintes structurantes supplémentaires :
- toute fonctionnalité critique doit rester compatible avec un contexte statique ;
- l'UI doit fonctionner sans framework lourd ;
- l'application doit pouvoir être installée et relancée comme une vraie PWA ;
- le stockage local ne doit pas dépendre du réseau ;
- le mode offline doit couper les entrées/sorties réseau liées aux flux.

---

## 4. Architecture applicative cible

```text
/index.html
/manifest.json
/sw.js
/cloudflare/worker.js
/src/
  app.js
  core/
    EventBus.js
    AppState.js
    Router.js
  ui/
    Layout.js
    Theme.js
    Toolbar.js
    BottomNav.js
    SplitPanel.js
    OfflineToggle.js
  map/
    MapManager.js
    CameraLayer.js
    LegendControl.js
    PopupManager.js
  sources/
    SourceManager.js
    SourceRegistry.js
    adapters/
  library/
    LibraryManager.js
    LibraryStore.js
    LibraryPanel.js
    ImportController.js
  player/
    PlayerGrid.js
    StreamPlayer.js
    PinnedManager.js
  cv/
    CVEngine.js
    ObjectDetector.js
    FaceRecognizer.js
    OCREngine.js
    QueryMatcher.js
    AnalysisScheduler.js
  queries/
    QueryManager.js
    QueryEditor.js
    QueryRunner.js
  logs/
    LogStore.js
    LogPanel.js
    LogExporter.js
  settings/
    SettingsManager.js
    SettingsPanel.js
  storage/
    DB.js
    LocalCache.js
```

### 4.1 Principes d'architecture

- `app.js` orchestre le bootstrap applicatif.
- `AppState` maintient l'état global normalisé.
- `Layout.js` pilote le responsive réel et les transitions de vues.
- `SourceManager` gère la collecte, l'activation, le rafraîchissement et la normalisation des caméras.
- `LibraryManager` gère les imports, les lots, les vidéos locales et les éléments épinglés côté bibliothèque.
- `CVEngine` orchestre les moteurs de détection et les relie aux requêtes actives.
- `LogStore` centralise la persistance Dexie/IndexedDB.
- `SettingsManager` centralise les préférences, avec miroir localStorage pour les lectures rapides.

---

## 5. Modèle d'état global

L'application doit s'appuyer sur un état global cohérent, sérialisable, partiellement persistant.

### 5.1 Structure d'état recommandée

```javascript
{
  ui: {
    currentView: 'map'|'flows'|'library'|'cv'|'logs'|'import'|'settings',
    isMobile: boolean,
    isTablet: boolean,
    isDesktop: boolean,
    rightPanelWidth: number,
    isMapHidden: boolean,
    activeRightPanelTab: 'flows'|'library'|'cv'|'logs'|'import'|'settings',
    filtersWrap: boolean
  },
  connectivity: {
    mode: 'online'|'offline',
    manuallyForced: boolean,
    lastTransitionAt: string
  },
  map: {
    center: [number, number],
    zoom: number,
    selectedCameraId: string|null,
    filters: {
      sourceId: string|null,
      status: string|null,
      country: string|null
    }
  },
  sources: {
    enabledSourceIds: string[],
    camerasById: Record<string, Camera>,
    lastRefreshAt: string|null
  },
  library: {
    importedVideos: LibraryVideoItem[],
    photoBatches: PhotoBatch[],
    selectedLibraryItemIds: string[],
    pinnedItemIds: string[]
  },
  cv: {
    queries: CVQuery[],
    activeQueryIds: string[],
    isRunning: boolean,
    activeTargets: string[]
  },
  logs: {
    lastViewedAt: string|null,
    retentionMb: number
  },
  settings: {
    proxyUrl: string,
    snapshotRefreshSeconds: number,
    maxPinnedStreams: number,
    defaultConfidence: number
  }
}
```

### 5.2 Règles de persistance

Persisté dans localStorage :
- `ui.rightPanelWidth`
- `ui.isMapHidden`
- `ui.currentView`
- `ui.activeRightPanelTab`
- `connectivity.mode`
- derniers filtres utiles

Persisté dans IndexedDB :
- lots photo
- métadonnées vidéos importées
- requêtes CV
- logs
- paramètres globaux
- état source on/off
- préférences secondaires

---

## 6. Design system et conventions UX

### 6.1 Palette d'état

| État | Couleur | Usage |
|---|---|---|
| Primaire | `#58a6ff` | Accent UI, sélection, CTA secondaire |
| Surface | `#161b22` | Fonds de panneaux |
| Fond app | `#0d1117` | Fond global |
| Live | Vert | Flux temps réel |
| Delayed | Ambre | Différé / image fixe |
| Offline | Rouge | Inaccessible / hors ligne |
| Pinned | Violet | Source épinglée |
| Unknown | Gris | Inconnu / non classé |
| Match | Orange | Match CV récent |

### 6.2 Densité UI

- L'application vise une **densité maîtrisée**, pas une UI aérée grand public.
- Les espaces doivent être optimisés, surtout sur mobile.
- Les contrôles ne doivent pas prendre plusieurs lignes sauf nécessité responsive réelle.
- Les labels longs doivent être évités si un label court clair est possible.

### 6.3 Règles d'interaction

- Une action visible doit toujours faire quelque chose immédiatement compréhensible.
- Un module indisponible en offline ne doit pas apparaître comme actif si son contenu est inutilisable.
- Sur mobile, éviter les overlays multiples et les couches superposées.
- Sur desktop/tablette, le panneau droit est prioritaire comme zone de travail.

---

## 7. Responsive détaillé

## 7.1 Breakpoints officiels

| Breakpoint | Type |
|---|---|
| `< 768px` | Mobile |
| `768px – 1023px` | Tablette |
| `>= 1024px` | Desktop |

## 7.2 Barre haute — structure finale

### Ligne 1
Contenu obligatoire :
- à gauche : `VigiMap v2.0`
- à droite : toggle online/offline puis bouton paramètres

Règles :
- le titre reste toujours visible ;
- le bouton paramètres est aligné verticalement avec le titre ;
- le toggle reste discret ;
- aucun libellé long `En ligne / Hors ligne` n'est affiché en permanence.

### Ligne 2
Contenu obligatoire :
- filtre source
- filtre statut
- filtre pays
- bouton rafraîchir

Règles :
- ligne compacte ;
- wrap autorisé sur 2 lignes si nécessaire ;
- jamais plus de 2 lignes pour cette zone ;
- sur mobile, seuls ces éléments restent dans cette zone secondaire.

## 7.3 Toggle online/offline — design final

Le toggle online/offline est un switch compact avec sémantique visuelle :
- **droite = online** : état vert, globe normal ;
- **gauche = offline** : état rouge, globe barré ou pictogramme équivalent ;
- tooltip : `En ligne` ou `Hors ligne`.

Il doit être utilisable sur toutes les tailles d'écran.

## 7.4 Barre basse mobile — structure finale

Sur mobile, la navigation basse comprend exactement :
- Carte
- Flux
- Biblio
- CV
- Logs
- Import

Chaque onglet affiche :
- une icône ;
- un label court.

`Import` remplace l'ancien accès en haut.

## 7.5 Navigation mobile — comportement final

Sur mobile :
- `Carte` affiche uniquement la carte ;
- `Flux`, `Biblio`, `CV`, `Logs`, `Import` remplacent complètement la carte ;
- aucune carte en arrière-plan ne doit être visible ou active visuellement ;
- l'utilisateur doit pouvoir décider de rester uniquement dans le panneau choisi sans superposition.

## 7.6 Tablette / desktop — split view final

Sur tablette et desktop :
- carte à gauche ;
- panneau droit à droite ;
- largeur initiale panneau : **400 px** ;
- poignée de redimensionnement horizontale ;
- taille minimale : largeur actuellement jugée lisible, autour de 400 px ;
- agrandissement possible vers la gauche ;
- bouton toggle permettant :
  - état A : carte visible + panneau ;
  - état B : carte masquée + panneau élargi.

Le retour à l'état A restaure la dernière largeur utilisateur.

## 7.7 Persistance du layout

À sauvegarder :
- largeur panneau ;
- carte masquée ou visible ;
- dernier onglet actif ;
- état de mode online/offline ;
- dernier sous-onglet du panneau droit si applicable.

---

## 8. Carte et interactions géographiques

## 8.1 Leaflet

La carte repose sur Leaflet avec clustering automatique. Le rendu doit rester fluide même avec un nombre important de marqueurs.

## 8.2 Popup caméra

Au clic sur un pin :
- ouverture d'un popup proche du pin ;
- positionnement standard au-dessus ;
- recentrage automatique de la carte si le popup déborde ou risque de déborder en haut ;
- règle valable sur mobile, tablette et desktop.

## 8.3 Contenu popup

Le popup caméra doit afficher au minimum :
- nom de la caméra ;
- source ;
- statut ;
- résumé lisible ;
- actions : épingler, ouvrir, détails, éventuellement éditer selon droits/fonctions locales.

## 8.4 Légende permanente

Position : bas gauche de la carte.

Format :
- inline horizontal ;
- une ligne si possible ;
- deux lignes maximum sinon ;
- même comportement sur mobile, tablette, desktop.

États obligatoires :
- Live (flux vidéo)
- Différé / Image fixe
- Hors ligne
- Épinglée
- Inconnu

---

## 9. Sources et registre de caméras

## 9.1 Rôle du SourceManager

`SourceManager` doit :
- enregistrer les adaptateurs ;
- exposer la liste active ;
- récupérer les caméras ;
- normaliser les données ;
- ignorer ou désactiver les sources notoirement cassées ;
- maintenir un état cohérent par caméra.

## 9.2 Contrat d'adaptateur

```javascript
interface CameraSourceAdapter {
  id: string;
  name: string;
  enabled: boolean;
  requiresApiKey: boolean;
  refreshIntervalMs: number;
  fetchCameras(bbox?: BoundingBox): Promise<Camera[]>;
  getStreamUrl?(camera: Camera): Promise<StreamInfo>;
}
```

## 9.3 Modèle caméra normalisé

```javascript
interface Camera {
  id: string;
  sourceId: string;
  lat: number;
  lng: number;
  name: string;
  country: string;
  region?: string;
  streamUrl?: string;
  snapshotUrl?: string;
  streamType: 'hls'|'mjpeg'|'snapshot'|'embed'|'file'|'unknown';
  status: 'live'|'delayed'|'offline'|'unknown';
  isLive: boolean;
  lastSeen?: string;
  tags: string[];
}
```

## 9.4 Règles métier sur les états source

- `live` = vrai flux vidéo exploitable ;
- `delayed` = image fixe ou pseudo-flux différé ;
- `offline` = inaccessible ;
- `unknown` = état non déterminé.

### Règle impérative
Une source snapshot-only ne doit jamais être présentée comme `live`.

## 9.5 Correctifs déjà entérinés

### Fintraffic
Si la source est en pratique snapshot-only :
- `status = 'delayed'`
- `streamUrl = ''`
- `isLive = false`

### Sources invalides
Les sources durablement non fonctionnelles peuvent être retirées ou désactivées du registre actif tant qu'elles ne sont pas réparées. Cela inclut les cas de :
- 403 persistant ;
- 404 persistant ;
- 526 ;
- blocage CORS structurel ;
- endpoint supprimé.

---

## 10. Worker Cloudflare et stratégie de flux

## 10.1 Rôle du worker

Le worker doit servir de couche réseau spécialisée pour :
- proxy CORS ;
- adaptation de headers ;
- cache par host ;
- blocage ou redirection appropriée des plateformes streaming ;
- extraction YouTube via route dédiée.

## 10.2 Règles proxy

Le worker peut :
- ajouter des headers spécifiques selon la cible ;
- injecter des clés API nécessaires ;
- mettre en cache des GET ;
- empêcher certaines proxifications incorrectes.

## 10.3 Route `/extract-stream`

La route `/extract-stream?url=` doit renvoyer un objet JSON du type :

```json
{
  "ok": true,
  "originalUrl": "https://...",
  "streamUrl": "https://...",
  "streamType": "hls",
  "audioUrl": null,
  "via": "innertube",
  "cached": false
}
```

## 10.4 Stratégie YouTube validée

Ordre :
1. extraire le `videoId` ;
2. essayer InnerTube TVHTML5 ;
3. fallback Invidious ;
4. renvoyer erreur propre si tout échoue.

## 10.5 Correctif HLS YouTube signé

Les URLs manifest / videoplayback signées YouTube ne doivent pas être fetchées directement côté worker si elles reposent sur l'IP cliente.

Règle obligatoire :
- détecter ces URLs ;
- renvoyer `Response.redirect(targetUrl, 302)` ;
- laisser le navigateur les charger lui-même.

Cette règle fait partie du comportement officiel v1.1.

## 10.6 Cache worker

Règles générales :
- succès `/extract-stream` : cache plus long ;
- échec `/extract-stream` : cache court ;
- snapshots : cache court ;
- APIs trafic stables : cache moyen ;
- données quasi statiques : cache long.

---

## 11. Bibliothèque

## 11.1 Objectif

La bibliothèque devient le centre de gestion des contenus exploitables dans VigiMap. Elle regroupe :
- flux connus / ajoutés ;
- vidéos importées ;
- lots de photos.

## 11.2 Actions principales depuis la bibliothèque

- consulter ;
- rechercher/filtrer ;
- épingler ;
- importer ;
- renommer ;
- supprimer ;
- compléter un lot ;
- préparer les cibles d'analyse.

## 11.3 Vidéos importées

Règles :
- visibles dans la bibliothèque ;
- disponibles au moins pendant la session ;
- épinglables ;
- analysables via le workflow CV ;
- non analysées automatiquement à l'import.

### Modèle recommandé

```javascript
{
  id: 'vid_local_x',
  type: 'video',
  name: 'camera_nuit_01.mp4',
  mimeType: 'video/mp4',
  size: 12345678,
  createdAt: '2026-04-20T16:00:00Z',
  persisted: false,
  pinned: false,
  objectUrl?: 'blob:...'
}
```

## 11.4 Lots de photos

Un lot photo est :
- un groupe nommé par l'utilisateur ;
- alimenté par sélection multiple ;
- possiblement issu de plusieurs dossiers ;
- éditable après création.

### Capacités obligatoires
- créer un lot ;
- nommer le lot ;
- ajouter des fichiers ensuite ;
- supprimer des éléments du lot ;
- renommer le lot ;
- épingler le lot.

### Modèle recommandé

```javascript
{
  id: 'batch_001',
  type: 'photo-batch',
  name: 'Parking nord 18 avril',
  createdAt: '2026-04-20T16:10:00Z',
  pinned: false,
  items: [
    {
      id: 'photo_1',
      fileName: 'IMG_001.jpg',
      mimeType: 'image/jpeg',
      size: 234567,
      previewUrl: 'blob:...'
    }
  ]
}
```

## 11.5 UI bibliothèque

Pour un lot photo :
- afficher le nom du lot ;
- afficher le nombre d'éléments ;
- afficher des vignettes ;
- afficher le nom des fichiers ;
- proposer suppression unitaire par croix rouge ;
- proposer ajout de nouveaux fichiers ;
- proposer renommage du lot ;
- proposer épinglage.

## 11.6 Déplacement de `+ Flux`

Le bouton `+ Flux` n'est plus un élément de navigation globale haute. Son point d'entrée principal devient la bibliothèque.

---

## 12. Épinglage

## 12.1 Sources épinglables

Sont épinglables :
- flux caméra ;
- vidéos importées ;
- lots de photos.

## 12.2 Finalité de l'épinglage

L'épinglage sert à :
- alimenter les vues de travail ;
- définir les cibles actives pour les requêtes CV ;
- distinguer les éléments d'intérêt de la masse globale.

## 12.3 Règle workflow

La sélection des cibles d'analyse se fait **principalement via la bibliothèque** et l'épinglage, pas dans le formulaire de requête lui-même.

---

## 13. Moteur CV

## 13.1 Types de détection validés

- objets ;
- visages ;
- OCR ;
- couleur si moteur déjà présent et maintenu.

## 13.2 Détection d'objets

Moteur : COCO-SSD.

Cas d'usage :
- personne ;
- voiture ;
- camion ;
- bus ;
- moto ;
- animaux ;
- objets courants utiles à la surveillance.

## 13.3 Visages

Le moteur visage existant du repo doit être privilégié s'il est fonctionnel et satisfaisant. Sinon, une implémentation stable équivalente peut être utilisée.

## 13.4 OCR

L'OCR est un **type générique de requête** et ne se limite pas aux plaques.

Le système doit pouvoir :
- détecter automatiquement les zones textuelles ;
- extraire le texte ;
- comparer au texte cible demandé ;
- produire des matches sur des cas comme :
  - plaque d'immatriculation ;
  - nom de ville ;
  - enseigne ;
  - texte administratif ;
  - affichage urbain.

Le moteur privilégié est Tesseract.js local déjà présent dans le repo si exploitable.

## 13.5 Pipeline recommandé

```text
Frame / image
  -> prétraitement léger
  -> détecteur objet (si nécessaire)
  -> détecteur visage (si activé)
  -> OCR auto (si requête OCR active)
  -> matcher
  -> log si match
```

## 13.6 Analyse sur sources

En ligne :
- flux épinglés ;
- vidéos importées ;
- lots de photos si lancés comme cibles.

Hors ligne :
- uniquement vidéos importées ;
- uniquement lots photo importés ;
- jamais flux réseau.

---

## 14. Requêtes CV

## 14.1 Workflow officiel

1. L'utilisateur importe et/ou explore.
2. Il épingle les cibles dans la bibliothèque ou depuis la carte.
3. Il ouvre CV.
4. Il crée/édite les requêtes.
5. Il sélectionne celles à lancer.
6. Il lance l'analyse sur les cibles épinglées.

## 14.2 Modèle de requête recommandé

```javascript
{
  id: 'req_ocr_001',
  name: 'Plaque ou texte rouge',
  type: 'ocr',
  enabled: true,
  confidenceThreshold: 0.7,
  mode: 'partial',
  pattern: 'AB-123-CD',
  captureFrameOnMatch: true,
  scopes: ['pinned']
}
```

## 14.3 Types de requête

### Objet
```javascript
{
  type: 'object',
  objectClass: 'truck',
  confidenceThreshold: 0.8
}
```

### Visage
```javascript
{
  type: 'face',
  referenceId: 'face_ref_01',
  distanceThreshold: 0.45
}
```

### OCR
```javascript
{
  type: 'ocr',
  pattern: 'NICE',
  mode: 'partial',
  caseInsensitive: true,
  confidenceThreshold: 0.65
}
```

### Couleur
```javascript
{
  type: 'color',
  color: 'red',
  tolerance: 30
}
```

## 14.4 Matching OCR

Modes minimum à prévoir :
- exact ;
- partial ;
- case-insensitive ;
- regex si possible.

---

## 15. Logs

## 15.1 Périmètre

Les logs couvrent :
- matches CV ;
- événements offline/online ;
- événements système pertinents si utiles.

## 15.2 Entrée de log type

```javascript
{
  id: 'log_001',
  timestamp: '2026-04-20T16:20:00Z',
  type: 'cv_match',
  sourceType: 'camera'|'video'|'photo-batch',
  sourceId: 'cam_123',
  sourceName: 'Périph Nord',
  queryId: 'req_ocr_001',
  queryName: 'Recherche plaque',
  details: {},
  frameCapture: null
}
```

## 15.3 Logs de transition réseau

À la bascule offline :
```javascript
{
  type: 'offline_enter',
  timestamp: '...'
}
```

Au retour online :
```javascript
{
  type: 'offline_exit',
  timestamp: '...'
}
```

## 15.4 Règles d'exploitation

- les logs persistent en IndexedDB ;
- la taille totale est configurable ;
- la rotation est FIFO ;
- les logs doivent continuer à fonctionner offline ;
- les transitions online/offline doivent être explicitement historisées.

---

## 16. Offline — comportement exhaustif

## 16.1 Nature du mode offline

Le mode offline est un **mode de travail** assumé par l'utilisateur, pas uniquement un état réseau détecté.

## 16.2 Effets obligatoires du passage offline

Quand l'utilisateur passe offline :
- aucune caméra réseau, même épinglée, ne tente de se connecter ;
- aucun polling snapshot distant ne continue ;
- aucune extraction stream réseau ne tourne ;
- seules les sources locales restent exploitables ;
- une ligne de log est créée.

## 16.3 Effets obligatoires du retour online

Quand l'utilisateur repasse online :
- une ligne de log est créée ;
- les flux réseau épinglés peuvent reprendre ;
- les requêtes CV associées aux flux reprennent automatiquement selon leur état précédent.

## 16.4 UI offline

L'UI doit se simplifier et ne montrer que ce qui reste utile localement.

Exemples de sections disponibles offline :
- bibliothèque locale ;
- import ;
- CV sur imports ;
- logs ;
- paramètres.

Les fonctionnalités réseau ne doivent pas être présentées comme prêtes à l'emploi alors qu'elles sont inactives.

---

## 17. Paramètres

Le panneau paramètres doit au minimum couvrir :
- proxy CORS ;
- sources on/off ;
- affichage carte ;
- flux ;
- CV ;
- logs ;
- cache ;
- PWA ;
- mode offline.

## 17.1 Paramètres critiques

```javascript
{
  proxyUrl: 'https://...workers.dev',
  snapshotRefreshSeconds: 30,
  maxPinnedStreams: 10,
  defaultPanelWidth: 400,
  maxLogSizeMb: 100,
  defaultConfidence: 0.7,
  tfBackend: 'webgl'
}
```

---

## 18. PWA, cache et stockage

## 18.1 Service Worker

Le SW doit gérer :
- application shell ;
- assets ;
- modèles CV ;
- tuiles OSM ;
- fonctionnement offline de base.

## 18.2 IndexedDB — schéma recommandé

Stores minimum :
- `settings`
- `queries`
- `logs`
- `photoBatches`
- `libraryVideos`
- `sources`
- `uiState`

## 18.3 localStorage — clés recommandées

- `vigimap.ui.panelWidth`
- `vigimap.ui.isMapHidden`
- `vigimap.ui.currentView`
- `vigimap.connectivity.mode`
- `vigimap.ui.lastRightTab`

---

## 19. Règles de performance

- Ne pas rendre des couches invisibles lourdes sur mobile.
- Suspendre proprement ce qui n'est pas affiché si cela a un coût sensible.
- Lazy-loader les moteurs CV.
- Réduire les recalculs UI inutiles.
- Le mode panneau seul sur desktop/tablette doit éviter le coût carte si la carte est masquée.
- Les imports multiples doivent rester utilisables sans bloquer le thread principal plus que nécessaire.

---

## 20. Roadmap de mise en œuvre validée

## Passe 1 — UI/UX responsive et workflow
- barre haute finale
- barre basse mobile finale
- suppression des doublons haut/bas mobile
- split panel tablette/desktop
- resize panneau droit
- toggle masque carte
- popup pin corrigé
- légende inline horizontale
- déplacement `+ Flux` vers bibliothèque
- ajout `Import` dans navigation mobile

## Passe 2 — Bibliothèque et OCR
- lots photo éditables
- vidéos importées visibles bibliothèque
- épinglage depuis bibliothèque
- workflow complet vers CV
- OCR intégré comme type de requête

## Passe 3 — Offline complet
- toggle online/offline effectif
- UI simplifiée offline
- arrêt propre des flux réseau
- reprise online
- logs de transition
- persistance complète

---

## 21. Décisions entérinées non ambiguës

Les décisions suivantes sont désormais figées :

- en mobile, le haut affiche seulement le titre, le toggle offline/online, paramètres et la ligne filtres ;
- en mobile, les vues fonctionnelles remplacent la carte ;
- la navigation basse mobile contient 6 onglets ;
- `Importer` est un onglet dédié en bas ;
- `+ Flux` vit dans la bibliothèque ;
- le panneau droit est le centre de travail sur tablette/desktop ;
- sa largeur par défaut est 400 px ;
- il peut masquer la carte entièrement ;
- la carte ne prend pas le plein écran comme mode de travail desktop/tablette ;
- le popup pin doit s'ouvrir au-dessus avec recentrage automatique ;
- la légende est horizontale inline ;
- l'OCR est générique texte, pas seulement plaque ;
- en offline, seuls les imports manuels servent de base d'analyse ;
- les transitions online/offline doivent être logguées ;
- le worker doit rediriger les HLS YouTube signés via 302 ;
- une source snapshot-only doit être `delayed`, pas `live`.

---

## 22. Statut du document

Cette version 1.1 constitue la base détaillée et directement exploitable pour poursuivre le développement de VigiMap, la refonte responsive, la modernisation du workflow bibliothèque/CV et l'implémentation du vrai mode offline PWA.
