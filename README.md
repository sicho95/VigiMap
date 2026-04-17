# VigiMap v1.0

> Carte mondiale de cameras publiques — 100% frontend, deployable sur GitHub Pages.

## Demarrage rapide

### GitHub Pages
1. Pousser ce depot sur GitHub
2. `Settings > Pages > Branch: main > / (root)`
3. Ouvrir `https://VOUS.github.io/vigimap`

### Local
```bash
npx serve .
# ou
python3 -m http.server 8080
```

## Configuration

1. Cliquer sur **⚙️ Parametres**
2. Coller l URL du proxy CORS Cloudflare Worker dans **Proxy CORS**
3. Activer les sources souhaitees et renseigner les cles API eventuelles

## Proxy CORS (obligatoire pour Insecam et Road511)

Creer un Worker sur [workers.cloudflare.com](https://workers.cloudflare.com) :

```javascript
export default {
  async fetch(request) {
    const url    = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing url', { status: 400 });
    const res = await fetch(decodeURIComponent(target), { headers:{'User-Agent':'VigiMap/1.0'} });
    const r   = new Response(res.body, res);
    r.headers.set('Access-Control-Allow-Origin', '*');
    return r;
  }
};
```

## Sources integrees

| Source | Type | Cle API |
|---|---|---|
| OpenTrafficCamMap | JSON statique | Non |
| Windy Webcams | API REST | **Oui** |
| Insecam | Scraping HTML | Non (proxy requis) |
| LTA Singapore | API ouverte | Non |
| Road511 US/CA | GeoJSON | Non (proxy requis) |
| OSM Overpass | API ouverte | Non |

## Roadmap

| Version | Contenu |
|---|---|
| **v1.0** | Carte + 6 sources + UI (CE LIVRABLE) |
| v1.1 | HLS/MJPEG + queries CV textuelles |
| v2.0 | COCO-SSD + face-api + OCR Tesseract |
| v3.0 | Sources supplementaires + export XLSX |
