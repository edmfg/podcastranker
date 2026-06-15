// ---------------------------------------------------------------------------
// GET /api/top?limit=10
// The landing leaderboard: the most popular Business & Technology podcasts right
// now, merged from Apple's genre charts (KEYLESS — no credentials). This is the
// AI-in-business "neighborhood." Selecting AI topics switches to /api/rank,
// which adds precise topic relevance from Podcast Index.
// ---------------------------------------------------------------------------
import { loadAppleChart } from '../src/appleCharts.js';

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
    const chart = await loadAppleChart();
    const rows = [...chart.map.values()]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit)
      .map((e) => ({
        show: e.name,
        author: e.artist,
        genre: e.genre,
        link: e.url || null,
        itunesId: e.id || null,
        audience_rank: e.rank,
        audience_score: Math.round(100 * (1 - (e.rank - 1) / Math.max(1, chart.size))),
        audience_available: true,
      }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      source: 'apple-genre-charts',
      genres: ['Technology', 'Business'],
      audienceLabel: 'Apple chart',
      count: rows.length,
      results: rows,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
