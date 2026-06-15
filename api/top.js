// ---------------------------------------------------------------------------
// GET /api/top?limit=10
// The "overall" leaderboard shown on landing: the most popular podcasts right
// now, straight from the KEYLESS Apple Top Chart. No credentials required, so
// this always works. Selecting AI phrases switches to /api/rank, which adds the
// topic-relevance dimension.
// ---------------------------------------------------------------------------
import { loadAppleChart } from '../src/appleCharts.js';

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
    const chart = await loadAppleChart(100);
    const rows = [...chart.map.values()]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit)
      .map((e) => ({
        show: e.name,
        author: e.artist,
        audience_rank: e.rank,
        audience_score: Math.round(100 * (1 - (e.rank - 1) / Math.max(1, chart.size))),
        audience_available: true,
      }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      source: 'apple-top-chart',
      audienceLabel: 'Apple chart',
      count: rows.length,
      results: rows,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
