// ---------------------------------------------------------------------------
// Apple Podcasts "Top Shows" chart — KEYLESS audience proxy.
// Apple's public marketing-tools RSS feed lists the current top podcasts by
// storefront. A show's presence + position in the chart is a free, no-signup
// audience signal. Shows not in the chart return null (below threshold), the
// same way Listen Notes returns null below its top-~10% line.
//
// Honest limit: this is the OVERALL top chart, so it favors big general shows.
// It is a popularity proxy, not a download/listener count. Niche-but-on-topic
// AI shows will often be "not in chart" — that's expected, not a bug.
// ---------------------------------------------------------------------------
import { fetchJSON } from './util.js';

const STOREFRONT = 'us';

function norm(s = '') {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Fetch the top-N chart once and index it by normalized show name. */
export async function loadAppleChart(limit = 100) {
  // Apple's marketing-tools feed only serves limits up to 100.
  const n = Math.max(10, Math.min(100, Number(limit) || 100));
  const url = `https://rss.marketingtools.apple.com/api/v2/${STOREFRONT}/podcasts/top/${n}/podcasts.json`;
  const data = await fetchJSON(url, { retries: 3, label: 'apple top chart' });
  const results = data?.feed?.results || [];
  const map = new Map();
  results.forEach((e, i) => {
    map.set(norm(e.name), { rank: i + 1, id: Number(e.id) || null, name: e.name, artist: e.artistName });
  });
  return { map, size: results.length };
}

/**
 * Look up a show in a loaded chart. Returns { score, rank, itunes_id }.
 * score is 0–100 derived from chart position (rank 1 ≈ 100); null if not found.
 */
export function lookupAppleChart(showTitle, chart) {
  const key = norm(showTitle);
  let hit = chart.map.get(key);
  if (!hit) {
    for (const [k, v] of chart.map) {
      if (k && (k.includes(key) || key.includes(k))) { hit = v; break; }
    }
  }
  if (!hit) return { score: null, rank: null, itunes_id: null };
  const score = Math.round(100 * (1 - (hit.rank - 1) / Math.max(1, chart.size)));
  return { score, rank: hit.rank, itunes_id: hit.id };
}
