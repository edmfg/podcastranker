// ---------------------------------------------------------------------------
// Apple Podcasts genre charts — KEYLESS audience proxy, focused on the
// business/AI space. We pull Apple's "Top Podcasts" for the Technology and
// Business genres (where AI-in-business shows actually live) and merge them,
// keeping each show's best chart position. A show's presence + position is a
// free, no-signup popularity signal. Shows outside both charts return null.
//
// Honest limit: these are popularity charts, not download/listener counts. The
// genre charts favor larger shows; a niche on-topic show may be "not in chart".
// ---------------------------------------------------------------------------
import { fetchJSON } from './util.js';

const STOREFRONT = 'us';
const DEPTH = 100; // per-genre chart depth (Apple serves up to 100) + scoring base
const GENRES = [
  { id: 1318, name: 'Technology' },
  { id: 1321, name: 'Business' },
];

function norm(s = '') {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function loadGenre(id) {
  const url = `https://itunes.apple.com/${STOREFRONT}/rss/toppodcasts/limit=${DEPTH}/genre=${id}/json`;
  const data = await fetchJSON(url, { retries: 3, label: `apple genre ${id}` });
  let entries = data?.feed?.entry || [];
  if (!Array.isArray(entries)) entries = [entries];
  return entries.map((e, i) => ({
    rank: i + 1,
    name: e?.['im:name']?.label || '',
    artist: e?.['im:artist']?.label || '',
    id: Number(e?.id?.attributes?.['im:id']) || null,
    url: (e?.id?.label || '').replace(/\?uo=\d+$/, ''),
  }));
}

/** Fetch Technology + Business charts once and index by normalized show name. */
export async function loadAppleChart() {
  const lists = await Promise.all(GENRES.map((g) => loadGenre(g.id).catch(() => [])));
  const map = new Map();
  lists.forEach((list, gi) => {
    for (const e of list) {
      const key = norm(e.name);
      if (!key) continue;
      const existing = map.get(key);
      if (!existing || e.rank < existing.rank) {
        map.set(key, { rank: e.rank, id: e.id, name: e.name, artist: e.artist, url: e.url, genre: GENRES[gi].name });
      }
    }
  });
  return { map, size: DEPTH };
}

/**
 * Look up a show in a loaded chart. Returns { score, rank, itunes_id }.
 * score is 0–100 from chart position (rank 1 ≈ 100); null if not found.
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
