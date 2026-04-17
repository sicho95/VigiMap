
import { _extractYtId } from './YouTubeLibrary.js';

export async function fetchYtMeta(url) {
  const ytId = _extractYtId(url);
  const result = { title: '', thumb: '', ytId, isYt: !!ytId };
  if (!ytId) return result;

  // Miniature haute résolution (pas de CORS)
  result.thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

  // Titre via oEmbed YouTube (pas de clé requise, CORS OK)
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
      { signal: AbortSignal.timeout?.(6000) }
    );
    if (r.ok) {
      const j = await r.json();
      result.title    = j.title    || '';
      result.author   = j.author_name || '';
      result.thumb    = j.thumbnail_url || result.thumb;
    }
  } catch (_) {}

  return result;
}
