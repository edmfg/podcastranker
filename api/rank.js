// ---------------------------------------------------------------------------
// GET /api/rank?keywords=a,b,c&limit=15
// Ranks BIG podcasts (the shows in Apple's Technology/Business charts) by how
// much they actually discuss the selected AI topics. Starts from the chart (the
// big universe) and scores each show's recent episodes for keyword relevance —
// so results are always large, on-topic shows. Also detects each show's ad
// host/DAI from its episode audio URLs. Requires PI_KEY + PI_SECRET.
// ---------------------------------------------------------------------------
import { getEpisodesByItunesId } from '../src/podcastIndex.js';
import { loadAppleChart } from '../src/appleCharts.js';
import { frequencyScore, attachBlended } from '../src/score.js';
import { defaultKeywords } from '../src/terms.js';
import { showLink } from '../src/util.js';
import { detectFromUrls } from '../src/hosting.js';

export const config = { maxDuration: 60 };

const MAX_KEYWORDS = 8;
const MAX_SHOWS = 60; // how many top chart shows to scan (bounds the request)
const EPISODES_PER_SHOW = 120; // recent episodes scanned per show
const BATCH = 8;
const CHART_BASE = 100; // chart depth used for the 0–100 audience score

export default async function handler(req, res) {
  if (!process.env.PI_KEY || !process.env.PI_SECRET) {
    return res.status(500).json({ error: 'Server is missing Podcast Index credentials' });
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const kwParam = url.searchParams.get('keywords');
    let keywords = kwParam
      ? kwParam.split(',').map((s) => s.trim()).filter(Boolean)
      : defaultKeywords();
    keywords = keywords.slice(0, MAX_KEYWORDS);
    const limit = Math.min(25, Math.max(5, Number(url.searchParams.get('limit')) || 15));
    const debug = url.searchParams.get('debug') === '1';

    // 1. the big universe: Apple Technology + Business chart shows
    const chart = await loadAppleChart();
    const entries = [...chart.map.values()]
      .filter((e) => e.id) // need an iTunes id to look up episodes
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_SHOWS);

    // 2. for each big show, scan recent episodes and score topic relevance
    const scored = [];
    let scanErrors = 0;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (e) => {
        try {
          const eps = await getEpisodesByItunesId(e.id, EPISODES_PER_SHOW);
          if (!eps.length) return null;
          const stats = frequencyScore(eps, keywords);
          if (stats.matching_eps <= 0) return null;
          const enclosures = eps.map((x) => x.enclosureUrl).filter(Boolean).slice(0, 3);
          return { entry: e, ...stats, enclosures };
        } catch { scanErrors++; return null; }
      }));
      scored.push(...results.filter(Boolean));
    }

    // 3. build rows: relevance + audience (chart rank) + ad host
    let rows = scored.map((s) => ({
      show: s.entry.name,
      author: s.entry.artist,
      genre: s.entry.genre,
      link: s.entry.url || showLink({ itunesId: s.entry.id }),
      itunesId: s.entry.id,
      host: detectFromUrls(s.enclosures),
      frequency_score: s.frequency_score,
      matching_eps: s.matching_eps,
      last_match_date: s.last_match_date,
      audience_score: Math.round(100 * (1 - (s.entry.rank - 1) / CHART_BASE)),
      audience_rank: s.entry.rank,
      audience_available: true,
      audience_note: null,
    }));

    // 4. blend, sort by relevance, trim
    attachBlended(rows);
    rows.sort((a, b) => b.frequency_score - a.frequency_score);
    rows = rows.slice(0, limit);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      keywords,
      audienceProvider: 'apple-chart',
      audienceLabel: 'Apple chart',
      bigOnly: true,
      count: rows.length,
      results: rows,
      ...(debug ? { debug: { showsScanned: entries.length, showsMatched: scored.length, scanErrors } } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
