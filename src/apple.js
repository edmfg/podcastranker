// ---------------------------------------------------------------------------
// Apple / iTunes ratings fallback — BEST EFFORT ONLY.
// Used only when Listen Notes listen_score is null. The endpoint is undocumented
// and may break; everything here degrades gracefully to null. See brief §2.
// ---------------------------------------------------------------------------
import { fetchJSON } from './util.js';

/**
 * Look up an iTunes podcast by id. Returns a rough audience proxy normalized to
 * 0–100, or null on any failure. The public lookup endpoint does NOT reliably
 * expose a ratings count, so this is intentionally conservative.
 */
export async function getAppleRatings(itunesId) {
  if (!itunesId) return null;
  try {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(itunesId)}`;
    const data = await fetchJSON(url, { retries: 1, label: `apple ${itunesId}` });
    const r = (data.results || [])[0];
    if (!r) return null;

    // Best-effort: trackCount is a weak popularity hint (episode catalog size).
    // Real ratings counts aren't in this endpoint, so we cap the influence low.
    const count = Number(r.trackCount) || 0;
    if (!count) return null;
    return Math.min(100, Math.round((Math.log10(count + 1) / 4) * 100)); // ~0..100
  } catch {
    return null; // fragile path — never throw
  }
}
