// ---------------------------------------------------------------------------
// Listen Notes API client — OPTIONAL audience proxy (needs LISTEN_API_KEY).
// Auth: single header  X-ListenAPI-Key.  Free quota is small — only enrich the
// shortlist (see brief §2 guardrails). If you don't have a key, the ranker
// falls back to the keyless Apple chart proxy (see src/appleCharts.js).
// ---------------------------------------------------------------------------
import { fetchJSON } from './util.js';
import { LIMITS } from './config.js';

const BASE = 'https://listen-api.listennotes.com/api/v2';

function lnHeaders() {
  const key = process.env.LISTEN_API_KEY;
  if (!key) throw new Error('Missing LISTEN_API_KEY in .env');
  return { 'X-ListenAPI-Key': key };
}

/** Strip HTML/markup and normalize for loose title comparison. */
function norm(s = '') {
  return s.replace(/<[^>]*>/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Look up a show by title; return audience signals for the best match.
 * { score, rank, itunes_id } — score is the Listen Score (0–100) or null when
 * the show sits below Listen Notes' top-~10% threshold.
 */
export async function getListenNotesAudience(showTitle) {
  const url = `${BASE}/search?q=${encodeURIComponent(showTitle)}&type=podcast&only_in=title&page_size=5`;
  const data = await fetchJSON(url, {
    headers: lnHeaders(),
    retries: LIMITS.maxRetries,
    label: `listennotes "${showTitle}"`,
  });

  const results = data.results || [];
  if (results.length === 0) return { score: null, rank: null, itunes_id: null };

  const target = norm(showTitle);
  const best =
    results.find((r) => norm(r.title_original) === target) ||
    results.find((r) => norm(r.title_original).includes(target) || target.includes(norm(r.title_original))) ||
    results[0];

  const ls = best.listen_score;
  return {
    score: typeof ls === 'number' && ls > 0 ? ls : null,
    rank: best.global_rank ?? null,
    itunes_id: best.itunes_id ?? null,
  };
}
