// ---------------------------------------------------------------------------
// GET /api/rank?keywords=a,b,c&limit=15
// Bounded, on-demand version of the CLI ranker so it fits a serverless request.
// Reuses the same src/ modules. Audience = keyless Apple chart unless
// LISTEN_API_KEY is set on the server. Requires PI_KEY + PI_SECRET env vars.
// ---------------------------------------------------------------------------
import { searchFeeds, getEpisodes } from '../src/podcastIndex.js';
import { selectAudienceProvider } from '../src/audience.js';
import { frequencyScore, audienceScore, attachBlended } from '../src/score.js';
import { defaultKeywords } from '../src/terms.js';

export const config = { maxDuration: 60 };

// Keep the request bounded so it never blows the function time limit.
const MAX_KEYWORDS = 6;
const FEEDS_PER_KEYWORD = 8;
const MAX_FEEDS = 28;
const EPISODE_BATCH = 6;

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

    // 1. candidate feeds per keyword (parallel), dedupe by feedId
    const found = await Promise.all(keywords.map((t) => searchFeeds(t).catch(() => [])));
    const feeds = new Map();
    found.forEach((list) => {
      for (const f of list.slice(0, FEEDS_PER_KEYWORD)) {
        if (feeds.size < MAX_FEEDS && !feeds.has(f.id)) feeds.set(f.id, f);
      }
    });

    // 2. episodes -> frequency score (batched parallel)
    const feedArr = [...feeds.values()];
    const scored = [];
    for (let i = 0; i < feedArr.length; i += EPISODE_BATCH) {
      const batch = feedArr.slice(i, i + EPISODE_BATCH);
      const results = await Promise.all(batch.map(async (f) => {
        try {
          const eps = await getEpisodes(f.id);
          const stats = frequencyScore(eps, keywords);
          return stats.matching_eps > 0 ? { feed: f, ...stats } : null;
        } catch { return null; }
      }));
      scored.push(...results.filter(Boolean));
    }
    scored.sort((a, b) => b.frequency_score - a.frequency_score);

    // 3. audience enrichment on the shortlist
    const provider = selectAudienceProvider({});
    await provider.prepare();
    const shortlist = scored.slice(0, limit);
    const rows = [];
    for (const s of shortlist) {
      let score = null, rank = null;
      try { ({ score, rank } = await provider.lookup(s.feed.title)); } catch {}
      rows.push({
        show: s.feed.title,
        author: s.feed.author,
        frequency_score: s.frequency_score,
        matching_eps: s.matching_eps,
        last_match_date: s.last_match_date,
        audience_score: audienceScore(score),
        audience_rank: rank,
        audience_available: score != null,
        audience_note: score == null ? provider.thresholdNote : null,
      });
    }
    attachBlended(rows);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      keywords,
      audienceProvider: provider.name,
      audienceLabel: provider.label,
      count: rows.length,
      results: rows,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
