// ---------------------------------------------------------------------------
// Listen Notes API client — audience proxy.
// Auth: single header  X-ListenAPI-Key.  Free quota is small — only enrich the
// shortlist (see brief §2 guardrails).
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
 * { listen_score, global_rank, itunes_id, matched_title } — fields are null if
 * unavailable (listen_score is null for shows below the top ~10%).
 */
export async function getAudience(showTitle) {
  const url = `${BASE}/search?q=${encodeURIComponent(showTitle)}&type=podcast&only_in=title&page_size=5`;
  const data = await fetchJSON(url, {
    headers: lnHeaders(),
    retries: LIMITS.maxRetries,
    label: `getAudience "${showTitle}"`,
  });

  const results = data.results || [];
  if (results.length === 0) {
    return { listen_score: null, global_rank: null, itunes_id: null, matched_title: null };
  }

  // Prefer an exact-ish title match, else take the top result.
  const target = norm(showTitle);
  const best =
    results.find((r) => norm(r.title_original) === target) ||
    results.find((r) => norm(r.title_original).includes(target) || target.includes(norm(r.title_original))) ||
    results[0];

  const ls = best.listen_score;
  return {
    listen_score: typeof ls === 'number' && ls > 0 ? ls : null,
    global_rank: best.listennotes_url ? best.global_rank ?? null : best.global_rank ?? null,
    itunes_id: best.itunes_id ?? null,
    matched_title: best.title_original || null,
  };
}
