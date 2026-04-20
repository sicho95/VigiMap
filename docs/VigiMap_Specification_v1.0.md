# 📄 VigiMap — Spécification Fonctionnelle & Technique
## Version 1.0 — Consolidée et exhaustive · 20 avril 2026

---

## 1. Vue d'ensemble du projet

**VigiMap** est une application web progressive (PWA) 100% frontend, hébergeable sur GitHub Pages, permettant de visualiser des flux vidéo de caméras publiques géolocalisées sur une carte interactive, d'épingler certains flux ou médias importés, puis d'y appliquer des analyses de computer vision directement dans le navigateur. L'application doit fonctionner en mode connecté et en mode hors ligne partiel, avec persistance locale des paramètres, sources, lots importés, requêtes et logs.

L'application ne repose sur **aucun backend applicatif classique**. Le seul composant serveur autorisé est un **Cloudflare Worker personnel** utilisé comme proxy CORS intelligent et extracteur de flux pour certaines sources vidéo externes, notamment YouTube. Toute la logique métier, l'UI, la CV, les logs, les imports, la persistance et le mode offline sont gérés côté navigateur.

Cette version de la spécification remplace et complète la v0.1 initiale. Elle intègre les décisions UX, responsive, workflow, offline, bibliothèque, OCR et correctifs techniques déjà validés.

---

## 2. Contraintes techniques globales

| Contrainte | Valeur |
|---|---|
| Hébergement | GitHub Pages (statique uniquement) |
| Backend autorisé | Cloudflare Worker personnel (proxy CORS + extraction stream) |
| Runtime | 100% navigateur (JS/WASM/WebGL/WebGPU selon support) |
| PWA | Oui — installable + mode offline partiel réel |
| Langue UI | Français |
| Responsive | Mobile, tablette, desktop |
| Framework UI | Vanilla JS + Web Components |
| Carte | Leaflet.js + tuiles OpenStreetMap |
| CV — Visages | face-api.js / moteur déjà présent dans le repo si fonctionnel |
| CV — Objets | TensorFlow.js + COCO-SSD |
| CV — OCR | Tesseract.js local si possible, fallback web seulement si nécessaire |
| Stockage principal | IndexedDB |
| Stockage rapide UI | localStorage |
| Logs | IndexedDB avec rotation configurable |
| UX | Dark mode natif, interface dense mais lisible |

---

## 3. Architecture générale

```text
/index.html
/manifest.json
/sw.js
/src/
  app.js
  map/
    MapManager.js
    CameraLayer.js
  sources/
    SourceManager.js
    adapters/
  player/
    PlayerGrid.js
    StreamPlayer.js
    VideoImporter.js
  cv/
    CVEngine.js
    FaceRecognizer.js
    ObjectDetector.js
    OCREngine.js
    ColorAnalyzer.js
    QueryMatcher.js
  queries/
    QueryManager.js
    QueryEditor.js
  logs/
    LogStore.js
    LogPanel.js
  settings/
    SettingsManager.js
    SettingsPanel.js
  library/
    LibraryManager.js
    LibraryPanel.js
  ui/
    Layout.js
    Theme.js
    OfflineToggle.js
/models/
/assets/
/docs/
```

### 3.1 Principes d'architecture

- Toute fonctionnalité doit rester compatible avec une exécution statique depuis GitHub Pages.
- Les dépendances doivent être limitées au strict nécessaire.
- Les composants UI doivent être découplés : carte, panneau droit, bibliothèque, CV, logs, paramètres.
- Les données persistantes doivent être sauvegardées en priorité dans IndexedDB.
- Les préférences UI à lecture fréquente doivent aussi être dupliquées dans localStorage pour accélérer le démarrage.
- Le mode hors ligne doit être traité comme un vrai état applicatif, pas comme un simple indicateur visuel.

---

## 4. Design system & UX

### 4.1 Charte visuelle

- Thème sombre principal : fond `#0d1117`, surfaces `#161b22`, accent `#58a6ff`
- Couleurs d'état : live vert, différé ambre, offline rouge, épinglé violet, inconnu gris, match orange
- Typographie : Inter pour l'interface, JetBrains Mono pour les logs et métriques
- Icônes : Lucide Icons ou SVG maison léger
- Animations : CSS simples 150–200 ms max, jamais bloquantes

### 4.2 Principes UX structurants

- L'espace vertical doit être optimisé au maximum sur mobile.
- Sur mobile, on n'empile pas carte + panneau + vue secondaire : une vue remplace l'autre.
- Sur tablette et desktop, la carte et le panneau droit coexistent par défaut.
- Le panneau droit est l'espace principal de travail (flux épinglés, bibliothèque, CV, logs, import).
- La carte est un espace d'exploration, pas l'espace principal d'analyse.
- Les états online/offline doivent avoir un impact réel sur les fonctions disponibles.

---

## 5. Layout responsive consolidé

## 5.1 Règles de breakpoint

| Breakpoint | Cible | Comportement |
|---|---|---|
| `< 768px` | Mobile | Vue mono-zone, navigation basse, carte et panneau exclusifs |
| `768px – 1023px` | Tablette | Carte + panneau droit visibles, largeur panneau par défaut 400 px |
| `>= 1024px` | Desktop | Carte + panneau droit visibles, largeur panneau redimensionnable |

## 5.2 Barre supérieure — toutes tailles

La barre supérieure comprend **deux lignes maximum**.

### Ligne 1
- À gauche : logo/titre `VigiMap v2.0`
- À droite : toggle online/offline discret + bouton paramètres
- Le bouton paramètres doit être verticalement aligné avec le titre
- Le toggle online/offline doit rester compact sur toutes les tailles d'écran

### Ligne 2
- Filtres de carte uniquement :
  - `Toutes sources`
  - `Tous statuts`
  - `Tous pays`
  - `Rafraîchir`
- Si la largeur ne permet pas de tenir sur une ligne, les filtres passent automatiquement sur 2 lignes
- Les marges verticales doivent être réduites pour maximiser la hauteur disponible pour le contenu

### Éléments explicitement absents de la barre du haut
- `Importer` ne doit plus être présent en haut
- `+ Flux` ne doit plus être présent en haut
- Les boutons déjà accessibles par la navigation basse mobile ne doivent pas être dupliqués en haut sur mobile

## 5.3 Barre basse mobile

Sur mobile uniquement, la navigation principale est une barre basse avec **6 onglets** :

1. Carte
2. Flux
3. Biblio
4. CV
5. Logs
6. Import

Chaque onglet doit afficher :
- une icône
- un libellé court sous l'icône

Le libellé doit rester lisible sur petit écran.

## 5.4 Comportement mobile

Sur mobile :
- la carte et le panneau fonctionnel ne doivent jamais être visibles simultanément
- un clic sur `Flux`, `Biblio`, `CV`, `Logs` ou `Import` remplace intégralement la carte par la vue demandée
- un clic sur `Carte` réaffiche la carte
- il ne doit pas y avoir de carte en arrière-plan derrière les panneaux fonctionnels
- cela évite la surcharge visuelle et la charge inutile de rendu

## 5.5 Comportement tablette et desktop

Sur tablette et desktop :
- la carte reste visible à gauche
- le panneau droit est visible à droite au chargement
- sa largeur par défaut est **400 px**
- le panneau droit est redimensionnable horizontalement vers la gauche
- un bouton toggle permet de masquer complètement la carte et de passer le panneau en mode large/plein espace
- un second clic sur ce toggle restaure la carte et la dernière largeur choisie par l'utilisateur

Le système ne doit **jamais** proposer un mode "carte seule plein écran" comme comportement principal sur tablette/desktop. Le mode extensible concerne le **panneau droit**, pas la carte.

## 5.6 Persistance UI

Les préférences suivantes doivent être sauvegardées :
- largeur du panneau droit
- état carte visible / carte masquée
- dernier onglet ouvert
- état online/offline manuel
- préférences de filtres si pertinent

Stockage :
- lecture rapide : localStorage
- persistance complète : IndexedDB

---

## 6. Carte interactive

### 6.1 Moteur cartographique

- Leaflet.js v1.9+
- Tuiles OpenStreetMap avec cache local via Service Worker
- Clustering automatique via `Leaflet.markercluster`

### 6.2 États de marqueurs

| État | Couleur | Signification |
|---|---|---|
| `live` | Vert | Flux vidéo temps réel exploitable |
| `delayed` | Ambre | Flux différé ou image fixe rafraîchie |
| `offline` | Rouge | Source inaccessible |
| `selected` | Bleu | Sélection courante / focus UI |
| `pinned` | Violet | Source épinglée |
| `match` | Orange | Match CV récent |
| `unknown` | Gris | État inconnu ou non classé |

### 6.3 Popup marqueur

Le popup affiché au clic sur un pin doit :
- apparaître **au-dessus du pin** par défaut
- suivre un comportement standard type Leaflet
- recadrer/recentrer automatiquement la carte si le popup risque de sortir de l'écran ou du conteneur, y compris sur desktop et tablette
- rester visible sans déborder hors de la zone utile

Le comportement "popup collé tout en bas de l'écran" est explicitement interdit.

### 6.4 Légende de carte

La légende de carte doit être affichée en **bas à gauche** de la carte, en surimpression permanente.

Contraintes de mise en page :
- affichage **horizontal inline**
- sur une ligne si la largeur le permet
- sur deux lignes maximum si nécessaire
- valable sur mobile, tablette et desktop
- ne doit plus être affichée en colonne verticale

Libellés minimum :
- Live (flux vidéo)
- Différé / Image fixe
- Hors ligne
- Épinglée
- Inconnu

---

## 7. Sources de caméras

### 7.1 Architecture d'adaptateurs

Chaque source implémente une interface compatible avec `SourceManager`.

```javascript
interface CameraSourceAdapter {
  id: string;
  name: string;
  enabled: boolean;
  requiresApiKey: boolean;
  refreshIntervalMs: number;
  async fetchCameras(bbox?: BoundingBox): Promise<Camera[]>;
  async getStreamUrl(camera: Camera): Promise<StreamInfo>;
}
```

### 7.2 Modèle caméra

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
  streamType: 'rtsp'|'hls'|'mjpeg'|'webrtc'|'snapshot'|'embed'|'unknown';
  isLive: boolean;
  status?: 'live'|'delayed'|'offline'|'unknown';
  lastSeen?: Date;
  tags: string[];
}
```

### 7.3 Règles validées de correction source

Les décisions suivantes font partie de la spécification fonctionnelle :

- Une source à snapshots fixes ne doit pas être marquée `live`
- Si une source ne fournit qu'une image ou un rafraîchissement différé, son état doit être `delayed`
- `streamUrl` doit être vide si aucun vrai flux vidéo n'existe
- `isLive` doit être `false` si la source n'est pas réellement temps réel
- Les sources durablement mortes, CORS-bloquées ou retournant 403/404/526 peuvent être désactivées ou retirées du registre actif tant qu'elles ne sont pas réparées

### 7.4 Cas particulier validé — Fintraffic

Fintraffic doit être traité comme source **différée** si elle ne fournit pas de vrai flux vidéo direct :
- `status = 'delayed'`
- `streamUrl = ''`
- `isLive = false`

---

## 8. Gestion des flux vidéo et proxy

### 8.1 Types de flux supportés

| Type | Lecture | Via proxy |
|---|---|---|
| HLS / m3u8 | `<video>` + hls.js | Oui si nécessaire |
| MJPEG | `<img>` ou flux fetch | Oui |
| Snapshot | `<img>` + refresh | Oui |
| Fichier vidéo local | objectURL | Non |
| Photo locale | objectURL / canvas | Non |
| Embed | iframe si indispensable | Limité |

### 8.2 Cloudflare Worker — rôle attendu

Le worker personnel doit gérer :
- proxy CORS multi-source
- injection de headers adaptés selon la source
- cache intelligent par hostname
- blocage des plateformes de streaming qui ne doivent pas être proxifiées naïvement
- route dédiée `/extract-stream?url=` pour l'extraction de flux YouTube

### 8.3 Stratégie YouTube validée

Pour YouTube, la stratégie validée est :
- extraction du `videoId`
- tentative **InnerTube TVHTML5** en premier
- fallback **Invidious** ensuite
- retour d'un `streamUrl` exploitable si possible

### 8.4 Correctif impératif — HLS signé YouTube

Les URLs HLS signées YouTube ne doivent **jamais** être fetchées directement par le Worker quand elles embarquent une signature dépendante de l'IP cliente.

Comportement obligatoire :
- détecter les URLs de type manifest / videoplayback signées YouTube
- retourner un **redirect 302** direct vers l'URL cible
- laisser le navigateur / hls.js charger directement la ressource

Raison : si le Worker fetchait lui-même ces URLs, YouTube verrait l'IP Cloudflare au lieu de l'IP cliente, ce qui invaliderait la signature et provoquerait un échec.

### 8.5 Cache proxy

- cache court pour snapshots et endpoints volatils
- cache moyen pour certaines APIs trafic
- cache long pour données relativement stables
- cache spécifique `/extract-stream` : succès plus long, échec très court

---

## 9. Bibliothèque média

## 9.1 Rôle de la bibliothèque

La bibliothèque centralise :
- les flux disponibles côté application
- les vidéos importées localement
- les lots de photos importées

C'est depuis la bibliothèque que l'utilisateur :
- consulte les contenus disponibles
- épingle des flux ou médias
- organise ses imports
- prépare les éléments qui serviront ensuite à l'analyse CV

Le bouton `+ Flux` doit être déplacé dans la bibliothèque, y compris sur desktop.

## 9.2 Import vidéo

- import multiple autorisé
- une vidéo importée doit apparaître immédiatement dans la bibliothèque
- elle est conservée au moins le temps de la session
- elle peut ensuite être épinglée depuis la bibliothèque
- une vidéo importée n'est pas analysée automatiquement au moment de l'import

## 9.3 Import photos par lots

Un lot correspond à :
- une sélection multiple de fichiers
- éventuellement issue de plusieurs dossiers
- associée à un **nom de lot** saisi par l'utilisateur

Chaque lot doit être :
- visible dans la bibliothèque
- modifiable après import
- renommable
- enrichissable par ajout de nouveaux fichiers
- nettoyable par suppression d'éléments individuels

## 9.4 Représentation UI d'un lot

Pour chaque lot, la bibliothèque doit afficher :
- nom du lot
- nombre d'éléments
- vignettes image si possible
- nom de chaque fichier
- action suppression par élément via croix rouge
- action ajout de fichiers au lot
- action renommage du lot
- action épinglage du lot

---

## 10. Workflow d'analyse CV

## 10.1 Principe général

Le workflow correct est :

1. L'utilisateur consulte la carte ou la bibliothèque
2. Il épingle des flux, vidéos importées ou lots de photos
3. Il ouvre l'onglet CV
4. Il crée ou sélectionne une ou plusieurs requêtes
5. Il lance l'analyse sur les sources épinglées

L'analyse ne doit pas être pilotée directement depuis l'import lui-même.

## 10.2 Types de requêtes supportés

Les types de requêtes validés sont :
- objet
- visage
- OCR
- couleur si déjà présent dans le moteur

### Objet
- détection basée sur COCO-SSD
- ex : personne, voiture, camion, bus, chien, etc.

### Visage
- reconnaissance faciale via moteur déjà présent dans le repo si fonctionnel
- sinon fallback face-api.js ou équivalent validé

### OCR
- OCR générique, pas limité aux plaques
- doit détecter automatiquement le texte visible dans les images/frames
- doit permettre de chercher :
  - plaques d'immatriculation
  - panneaux de ville
  - enseignes
  - textes divers

Une plaque d'immatriculation n'est qu'un **cas particulier** d'une requête OCR.

## 10.3 Moteur OCR

Le moteur privilégié est **Tesseract.js** présent dans le repo si exploitable.
À défaut, un fallback distant peut exister, mais le mode nominal doit rester compatible avec le fonctionnement PWA offline.

## 10.4 Matching OCR

Pour une requête OCR :
- le moteur détecte automatiquement les textes
- extrait les chaînes candidates
- compare ces chaînes à la valeur ou au motif demandé
- produit un match si la confiance et la correspondance satisfont le seuil requis

Le système doit permettre au minimum :
- matching exact
- matching partiel
- matching insensible à la casse
- matching par motif/regex si implémenté

---

## 11. Logs

### 11.1 Rôle des logs

Les logs enregistrent :
- les matches CV
- les événements de cycle applicatif utiles
- les changements d'état online/offline

### 11.2 Événements online/offline obligatoires

Lors du passage hors ligne, une entrée de log doit être ajoutée avec date/heure.
Lors du retour en ligne, une entrée de log doit être ajoutée avec date/heure.

Exemples de type d'événement :
- `offline_enter`
- `offline_exit`

### 11.3 Continuité des traitements

En mode online :
- les flux réseau peuvent continuer à être analysés selon la config
- les imports locaux peuvent aussi être exploités

En mode offline :
- aucune entrée ni sortie réseau n'est autorisée pour les flux caméra
- les analyses CV continuent uniquement sur les médias importés manuellement
- les logs continuent d'être produits localement

Au retour online :
- les flux reviennent automatiquement
- les requêtes CV associées aux flux reprennent automatiquement
- les logs doivent garder la trace de cette transition

---

## 12. Mode hors ligne

## 12.1 Philosophie

Le mode hors ligne n'est pas un simple état de connectivité détecté automatiquement. C'est aussi un **mode d'exploitation volontaire** de la PWA.

Quand l'utilisateur bascule hors ligne :
- l'application doit arrêter toute tentative réseau non indispensable
- les flux caméra, même épinglés, ne doivent plus tenter de se connecter
- l'interface doit se simplifier pour n'afficher que ce qui reste réellement faisable localement

## 12.2 UI offline

Le toggle online/offline est un switch discret :
- position droite = online, vert, icône globe normal
- position gauche = offline, rouge, icône globe barré ou équivalent
- info-bulle : `En ligne` / `Hors ligne`

Quand l'application est en mode offline :
- l'UI doit privilégier une vue simplifiée
- seuls les modules faisables localement doivent rester proposés
- typiquement : Bibliothèque locale, Import, CV sur médias importés, Logs, Paramètres
- les fonctions nécessitant les flux réseau ne doivent pas être proposées comme si elles restaient actives

## 12.3 Comportement des flux en offline

- Les caméras réseau, même épinglées, sont arrêtées
- Aucun polling de snapshot ne continue
- Aucun stream distant ne tente de redémarrer en tâche de fond
- Les buffers légers de flux ne sont pas considérés comme des sources persistantes d'analyse offline

## 12.4 Source des analyses offline

En offline, les requêtes CV tournent **uniquement** sur les imports manuels :
- vidéos importées
- lots de photos importés

Les flux réseau ne sont pas une source offline valide.

---

## 13. Panneau de paramètres

Le panneau de paramètres doit inclure au minimum :
- gestion des sources on/off
- configuration du proxy CORS
- paramètres carte
- paramètres flux
- paramètres CV
- paramètres logs
- paramètres PWA / offline
- gestion du cache

Il doit aussi exposer :
- état des modèles locaux disponibles
- état du cache
- installation PWA

---

## 14. PWA & stockage

## 14.1 Service Worker

Le Service Worker doit gérer :
- cache des assets applicatifs
- cache des modèles CV
- cache des tuiles OSM
- stratégie compatible offline

## 14.2 IndexedDB

IndexedDB doit stocker au minimum :
- logs
- paramètres persistants
- sources activées/désactivées
- requêtes CV
- lots importés
- métadonnées de vidéos importées
- état de bibliothèque si persistant

## 14.3 localStorage

localStorage sert aux lectures rapides au démarrage :
- largeur panneau droit
- état toggle carte/panneau
- dernier onglet
- mode online/offline choisi

---

## 15. Exigences de performance

- le layout mobile ne doit jamais cumuler des vues invisibles coûteuses inutilement
- le mode panneau seul sur desktop/tablette doit alléger le rendu carte si la carte est masquée
- les imports doivent rester manipulables même en grand nombre raisonnable
- la CV doit être lazy-loadée au premier usage
- le cache et la persistance ne doivent pas bloquer l'UI

---

## 16. Règles d'implémentation prioritaires

Ordre de réalisation validé :

### Passe 1
- refonte responsive complète
- navigation mobile correcte
- suppression des doublons top/bottom mobile
- panneau droit desktop/tablette redimensionnable
- toggle de masquage carte
- popup pin correctement positionné avec recentrage
- légende inline horizontale
- déplacement de `+ Flux` vers Bibliothèque
- ajout d'`Import` dans la navigation mobile

### Passe 2
- lots de photos éditables
- vidéos importées visibles en bibliothèque
- workflow d'épinglage bibliothèque → CV
- ajout de l'OCR dans les requêtes CV
- exploitation du moteur OCR local du repo si possible

### Passe 3
- mode offline complet
- bascule UI online/offline
- arrêt et reprise propre des flux
- logs de transition
- persistance approfondie PWA

---

## 17. Décisions techniques déjà entérinées

Les points suivants sont considérés comme validés et ne doivent plus être remis en question sans nouvelle décision explicite :

- Mobile : seuls les filtres restent en haut sous le titre
- Mobile : paramètres en haut à droite sur la ligne du titre
- Mobile : navigation basse à 6 onglets
- Mobile : vue carte et vue panneau sont exclusives
- Desktop/tablette : panneau droit visible par défaut à 400 px
- Desktop/tablette : le panneau peut masquer la carte mais pas l'inverse
- Popup pin : toujours au-dessus du pin avec recentrage automatique si nécessaire
- Légende : inline horizontale bas-gauche, 1 à 2 lignes
- Bibliothèque : point d'entrée unique pour épingler flux, vidéos importées, lots de photos
- OCR : générique texte, pas limité aux plaques
- Offline : analyses limitées aux imports manuels
- Worker : redirect 302 obligatoire pour HLS YouTube signé
- Fintraffic : traité comme `delayed` si pas de vrai live

---

## 18. Statut du document

Ce document est la nouvelle base de référence fonctionnelle et technique pour VigiMap. Il doit remplacer la version 0.1 initiale lors des prochaines itérations de code, de refonte UI, d'implémentation CV et d'évolution PWA.
