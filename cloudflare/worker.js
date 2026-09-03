// ============================================================
// PROXY UNIVERSEL SICHO95 v3.4
// Basé sur v3.3.
// Ajout v3.4 :
//   - mode=browser / mode=asset pour DlStream ;
//   - préserver les en-têtes et bodies utiles aux applications web ;
//   - désactiver le cache CF des appels de navigation interactifs ;
//   - ne plus appliquer STREAMING_BLOCK aux pages/assets chargés par DlStream.
// Les routes historiques VigiMap et /extract-stream restent inchangées.
// ============================================================

// ─────────────────────────────────────────────────────────────
// 🔑 CLÉS API SÉCURISÉES
// ─────────────────────────────────────────────────────────────
const KEYS = {
  'ORS':   'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZkYjlmZGViYzY5ODRiMThiZTM0NTlkYTBmMWMzMTc3IiwiaCI6Im11cm11cjY0In0=',
  'LUFOP': '8e9d1f05266f9388bc74b585ac8db602'
};

// ─────────────────────────────────────────────────────────────
// ⏱ TTL CACHE PAR SOURCE (secondes)
// ─────────────────────────────────────────────────────────────
function getCacheTtl(hostname) {
  if (hostname.includes('insecam.org'))                        return 30;
  if (hostname.includes('511') || hostname.includes('cotrip')) return 60;
  if (hostname.includes('windy.com'))                          return 300;
  if (hostname.includes('overpass-api.de'))                    return 3600;
  if (hostname.includes('lta.gov.sg'))                         return 60;
  return 600; // défaut 10 min
}

// ─────────────────────────────────────────────────────────────
// 🔍 FIX v3.3 — Détection URL HLS signée YouTube
// Ces URLs ont l'IP du client encodée dans la signature HMAC
// (/ip/xxx/sig/xxx). Le Worker NE PEUT PAS les fetcher à sa place
// sous peine de recevoir un 400 de YouTube (IP CF ≠ IP cliente).
// Solution : retourner Response.redirect(302) → hls.js charge
// directement depuis le browser, la signature reste valide.
// ─────────────────────────────────────────────────────────────
function isSignedYouTubeHls(urlObj) {
  const h = urlObj.hostname;
  const p = urlObj.pathname;
  const isYtHost  = h.includes('youtube.com') || h.includes('googlevideo.com');
  const isHlsPath = p.includes('/api/manifest/hls_playlist')
                 || p.includes('/api/manifest/hls_variant')
                 || p.includes('/api/manifest/')
                 || p.includes('/videoplayback');
  return isYtHost && isHlsPath;
}

// ─────────────────────────────────────────────────────────────
// 🎬 EXTRACTION STREAM YOUTUBE — HYBRIDE B+C
// ─────────────────────────────────────────────────────────────

// Extrait le videoId depuis toutes les formes d'URL YouTube
function extractYouTubeVideoId(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.searchParams.has('v'))          return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    const m = u.pathname.match(/\/(live|embed|shorts)\/([^/?]+)/);
    if (m) return m[2];
  } catch (_) {}
  return null;
}

// ── B : InnerTube TVHTML5 direct ────────────────────────────
// Client TV non-signé — fonctionne si l'IP CF n'est pas bloquée ce jour.
// Retourne null silencieusement si YouTube impose le bot-check.
async function tryInnerTube(videoId) {
  try {
    const resp = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type':             'application/json',
          'X-YouTube-Client-Name':    '7',
          'X-YouTube-Client-Version': '7.20250101.08.00',
          // User-Agent cohérent avec clientName TVHTML5
          'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1',
          'Origin':  'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName:    'TVHTML5',
              clientVersion: '7.20250101.08.00',
              hl: 'en',
              gl: 'US',
            }
          }
        }),
      }
    );

    if (!resp.ok) return null;
    const j = await resp.json();

    // Bot-check actif → on abandonne proprement
    const status = j?.playabilityStatus?.status;
    if (status && status !== 'OK' && status !== 'LIVE_STREAM_OFFLINE') return null;

    // Manifest HLS (live + certaines VOD TVHTML5)
    if (j?.streamingData?.hlsManifestUrl) {
      return { type: 'hls', url: j.streamingData.hlsManifestUrl, source: 'innertube' };
    }

    // Formats progressifs mp4 avec URL directe googlevideo.com
    // itag 22 = 720p muxé | itag 18 = 360p muxé
    const formats = [
      ...(j?.streamingData?.formats         || []),
      ...(j?.streamingData?.adaptiveFormats || []),
    ];
    const best = formats.find(f => f.itag === 22 && f.url)
              || formats.find(f => f.itag === 18 && f.url)
              || formats.find(f => f.url);

    if (best?.url) return { type: 'progressive', url: best.url, source: 'innertube' };

  } catch (_) {}
  return null;
}

// ── C : Fallback Invidious (proxy via instance VPS) ─────────
// SANS ?local=true → URLs /videoplayback gérées par l'instance Invidious.
// L'instance a une IP VPS/résidentielle non bloquée par YouTube.
// Le player joue directement l'URL https://instance/videoplayback?...
//
// Instances actives avec API publique (vérifié avril 2026)
const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://inv.thepixora.com',
  'https://invidious.nerdvpn.de',
  'https://inv.nadeko.net',
];

async function tryInvidious(videoId) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Compatible; VigiMap/2.0)',
          'Accept':     'application/json',
        },
      });

      if (!r.ok) continue;
      const j = await r.json();
      if (!j || j.error) continue;

      if (j?.hlsUrl) return { type: 'hls', url: j.hlsUrl, source: base };

      const muxed    = (j?.formatStreams   || []).filter(f => f.url);
      const adaptive = (j?.adaptiveFormats || []).filter(f => f.url && f.type?.includes('video'));

      const best = muxed.find(f => f.resolution === '720p')
                || muxed.find(f => f.resolution === '360p')
                || muxed[0]
                || adaptive[0];

      if (best?.url) return { type: 'progressive', url: best.url, source: base };

    } catch (_) {
      // Instance inaccessible ou timeout → essayer la suivante
    }
  }
  return null;
}

async function extractStreamUrl(originalUrl) {
  let hostname;
  try { hostname = new URL(originalUrl).hostname; } catch (_) {
    return { ok: false, error: 'URL invalide' };
  }

  if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
    return { ok: false, error: `Plateforme non supportée: ${hostname}. Seuls YouTube/youtu.be sont gérés.` };
  }

  const videoId = extractYouTubeVideoId(originalUrl);
  if (!videoId) return { ok: false, error: "Impossible d'extraire le videoId depuis l'URL YouTube" };

  const resultB = await tryInnerTube(videoId);
  if (resultB) return { ok: true, streamUrl: resultB.url, streamType: resultB.type, audioUrl: null, via: 'innertube' };

  const resultC = await tryInvidious(videoId);
  if (resultC) return { ok: true, streamUrl: resultC.url, streamType: resultC.type, audioUrl: null, via: resultC.source };

  return {
    ok: false,
    error: 'InnerTube bloqué (IP datacenter CF) + toutes les instances Invidious ont échoué. Solution définitive : déployer sur Railway.',
  };
}

async function handleExtractStream(request, url, waitUntil) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders() });
  }

  const rawUrl = url.searchParams.get('url');
  if (!rawUrl) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing url parameter' }), {
      status: 400,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const originalUrl = decodeURIComponent(rawUrl);

  const cacheKey = new Request(
    `https://vigimap-stream-cache.internal/${btoa(unescape(encodeURIComponent(originalUrl))).slice(0, 64)}`,
    { method: 'GET' }
  );
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    const body = await cached.json();
    return new Response(JSON.stringify({ ...body, cached: true }), {
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const result  = await extractStreamUrl(originalUrl);
  const payload = { ok: result.ok, originalUrl, ...result, cached: false };

  const resp = new Response(JSON.stringify(payload), {
    headers: {
      ...getCorsHeaders(),
      'Content-Type':  'application/json',
      'Cache-Control': result.ok ? 'public, max-age=18000' : 'public, max-age=60',
    },
  });

  if (result.ok) waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}

// Services à ne pas utiliser comme proxy média direct hors mode navigateur DlStream.
const STREAMING_BLOCK = [
  'youtube.com', 'youtu.be', 'ytimg.com',
  'twitch.tv', 'twitchsvc.net',
  'dailymotion.com',
  'vimeo.com',
  'facebook.com', 'fb.watch',
  'instagram.com',
  'tiktok.com',
  'netflix.com',
  'bilibili.com',
  'kick.com',
];

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const waitUntil = p => event.waitUntil(p);
  const request   = event.request;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders() });
  }

  const url = new URL(request.url);

  if (url.pathname === '/extract-stream' || url.pathname.endsWith('/extract-stream')) {
    return handleExtractStream(request, url, waitUntil);
  }

  let targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing URL parameter' }), {
      status: 400,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  let targetUrlObj;
  try {
    targetUrl    = decodeURIComponent(targetUrl);
    targetUrlObj = new URL(targetUrl);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'URL invalide: ' + targetUrl }), {
      status: 400,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const mode = String(url.searchParams.get('mode') || '').toLowerCase();
  const browserMode = mode === 'browser' || mode === 'asset';

  if (isSignedYouTubeHls(targetUrlObj)) {
    return Response.redirect(targetUrl, 302);
  }

  // Conserver le blocage historique pour les usages API/média directs,
  // mais autoriser une page ou un asset demandé explicitement par DlStream.
  if (!browserMode && STREAMING_BLOCK.some(h => targetUrlObj.hostname.includes(h))) {
    return new Response(JSON.stringify({
      error:   'streaming_url_blocked',
      message: 'Cette URL est un service de streaming. Utilisez /extract-stream?url=... pour extraire le flux (hybride InnerTube + Invidious).',
      hint:    `${url.origin}/extract-stream?url=${encodeURIComponent(targetUrl)}`,
    }), {
      status: 400,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const hostname = targetUrlObj.hostname;

  if (hostname.includes('lufop.net')) {
    targetUrlObj.searchParams.set('key', KEYS.LUFOP);
  }

  const finalUrl = targetUrlObj.toString();
  const cacheKey = new Request(finalUrl, request);
  const cache    = caches.default;

  // Une application web interactive ne doit jamais recevoir une ancienne réponse API du cache CF.
  if (!browserMode && request.method === 'GET') {
    let response = await cache.match(cacheKey);
    if (response) {
      response = new Response(response.body, response);
      response.headers.set('X-Proxy-Cache', 'HIT');
      injectCors(response.headers);
      return response;
    }
  }

  const proxyHeaders = new Headers();

  if (browserMode) {
    // Reproduire les informations utiles d'une vraie navigation sans recopier les en-têtes hop-by-hop.
    for (const name of ['Accept', 'Accept-Language', 'Content-Type', 'Range', 'If-None-Match', 'If-Modified-Since']) {
      const value = request.headers.get(name);
      if (value) proxyHeaders.set(name, value);
    }

    const userAgent = request.headers.get('User-Agent');
    proxyHeaders.set('User-Agent', userAgent || 'Mozilla/5.0 AppleWebKit/605.1.15 Safari/605.1.15');

    // Le code de la plateforme s'exécute derrière un reverse proxy : présenter l'origine cible à l'amont.
    proxyHeaders.set('Origin', targetUrlObj.origin);
    proxyHeaders.set('Referer', `${targetUrlObj.origin}/`);

  } else if (hostname.includes('leboncoin.fr') || hostname.includes('bienici.com')) {
    proxyHeaders.set('User-Agent',                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    proxyHeaders.set('Accept',                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8');
    proxyHeaders.set('Accept-Language',           'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
    proxyHeaders.set('Accept-Encoding',           'gzip, deflate, br');
    proxyHeaders.set('Referer',                   'https://www.google.com/');
    proxyHeaders.set('Sec-Fetch-Dest',            'document');
    proxyHeaders.set('Sec-Fetch-Mode',            'navigate');
    proxyHeaders.set('Sec-Fetch-Site',            'cross-site');
    proxyHeaders.set('Sec-Ch-Ua',                 '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"');
    proxyHeaders.set('Sec-Ch-Ua-Mobile',          '?0');
    proxyHeaders.set('Sec-Ch-Ua-Platform',        '"macOS"');
    proxyHeaders.set('Upgrade-Insecure-Requests', '1');
    proxyHeaders.set('Dnt',                       '1');

  } else if (hostname.includes('models.inference.ai.azure.com')) {
    const clientAuth = request.headers.get('Authorization');
    if (clientAuth) proxyHeaders.set('Authorization', clientAuth);
    proxyHeaders.set('Content-Type', 'application/json');
    proxyHeaders.set('Accept',       'application/json');

  } else if (hostname.includes('openrouteservice.org')) {
    proxyHeaders.set('Authorization', KEYS.ORS);
    proxyHeaders.set('Accept',        'application/json, application/geo+json, application/gpx+xml, img/png;q=0.1');
    proxyHeaders.set('Content-Type',  'application/json');

  } else if (hostname.includes('insecam.org')) {
    proxyHeaders.set('User-Agent',     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    proxyHeaders.set('Referer',        'https://www.insecam.org/');
    proxyHeaders.set('Accept',         'text/html,application/xhtml+xml,*/*;q=0.8');
    proxyHeaders.set('Accept-Language','en-US,en;q=0.9');

  } else if (hostname.includes('511') || hostname.includes('road511') || hostname.includes('cotrip') || hostname.includes('cwwp2')) {
    proxyHeaders.set('User-Agent',      'Mozilla/5.0 (Compatible; VigiMap/2.0)');
    proxyHeaders.set('Accept',          'application/json, application/xml, */*');
    proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9');

  } else if (hostname.includes('windy.com') || hostname.includes('api.windy.com')) {
    proxyHeaders.set('User-Agent',   'Mozilla/5.0 (Compatible; VigiMap/2.0)');
    proxyHeaders.set('Accept',       'application/json');
    proxyHeaders.set('Content-Type', 'application/json');

  } else if (hostname.includes('overpass-api.de') || hostname.includes('overpass.kumi.systems')) {
    proxyHeaders.set('User-Agent', 'VigiMap/2.0 (https://github.com/sicho95/VigiMap)');
    proxyHeaders.set('Accept',     'application/json');

  } else if (hostname.includes('traffic.data.gov.sg') || hostname.includes('lta.gov.sg')) {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Compatible; VigiMap/2.0)');
    proxyHeaders.set('Accept',     'application/json');

  } else if (hostname.includes('opentraffic') || hostname.includes('streetwatch')) {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Compatible; VigiMap/2.0)');
    proxyHeaders.set('Accept',     'application/json, text/plain, */*');

  } else {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Compatible; SichoProxy/6.0)');
    proxyHeaders.set('Accept',     '*/*');
  }

  try {
    const fetchOptions = {
      method:   request.method,
      headers:  proxyHeaders,
      redirect: 'follow',
    };

    // Préserver les octets du body et tous les verbes susceptibles d'en porter un.
    if (!['GET', 'HEAD'].includes(request.method)) {
      const body = await request.arrayBuffer();
      if (body.byteLength) fetchOptions.body = body;
    }

    const response = await fetch(finalUrl, fetchOptions);
    const buffer   = await response.arrayBuffer();

    const responseHeaders = new Headers(getCorsHeaders());

    let contentType = response.headers.get('Content-Type') || 'application/json';
    if (!contentType.includes('charset') && (contentType.includes('json') || contentType.includes('text'))) {
      contentType += '; charset=utf-8';
    }

    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', browserMode ? 'no-store' : `public, max-age=${getCacheTtl(hostname)}`);
    responseHeaders.set('X-Proxy-Cache', browserMode ? 'BYPASS' : 'MISS');
    responseHeaders.set('X-DlStream-Target', finalUrl);

    for (const name of ['ETag', 'Last-Modified', 'Accept-Ranges', 'Content-Range']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    const proxyResponse = new Response(buffer, {
      status:     response.status,
      statusText: response.statusText,
      headers:    responseHeaders,
    });

    if (!browserMode && response.ok && request.method === 'GET') {
      event.waitUntil(cache.put(cacheKey, proxyResponse.clone()));
    }

    return proxyResponse;

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, target: finalUrl }), {
      status: 500,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, If-None-Match, If-Modified-Since',
    'Access-Control-Expose-Headers':'Content-Type, ETag, Last-Modified, Accept-Ranges, Content-Range, X-Proxy-Cache, X-DlStream-Target',
    'Access-Control-Max-Age':       '86400',
  };
}

function injectCors(headers) {
  headers.set('Access-Control-Allow-Origin',  '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, If-None-Match, If-Modified-Since');
  headers.set('Access-Control-Expose-Headers','Content-Type, ETag, Last-Modified, Accept-Ranges, Content-Range, X-Proxy-Cache, X-DlStream-Target');
}