// ---------------------------------------------------------------------------
// GET /api/rank?keywords=a,b,c&limit=15&all=1
// Bounded, on-demand version of the CLI ranker so it fits a serverless request.
// Ranks BIG shows (present in Apple's Technology/Business charts) by how much
// they discuss the selected AI topics, and detects each show's ad host/DAI.
// Pass &all=1 to include small-audience shows too. Requires PI_KEY + PI_SECRET.
// ---------------------------------------------------------------------------
import { searchFeeds, getEpisodes } from '../src/podcastIndex.js';
import { selectAudienceProvider } from '../src/audience.js';
import { frequencyScore, audienceScore, attachBlended } from '../src/score.js';
import { defaultKeywords } from '../src/terms.js';
import { showLink } from '../src/util.js';
import { detectFromUrls } from '../src/hosting.js';

export const config = { maxDuration: 60 };

// Keep the request bounded so it never blows the function time limit.
const MAX_KEYWORDS = 6;
const FEEDS_PER_KEYWORD = 14;
const MAX_FEEDS = 48;
const EPISODE_BATCH = 8;
const EPISODES_PER_FEED = 300; // enough for frequency; lighter payload than 1000

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
    const bigOnly = url.searchParams.get('all') !== '1'; // default: big shows only
    const debug = url.searchParams.get('debug') === '1';

    // 1. candidate feeds per keyword (parallel), dedupe by feedId
    const outcomes = await Promise.all(
      keywords.map((t) => searchFeeds(t).then((list) => ({ list })).catch((e) => ({ err: String(e?.message || e) })))
    );
    const searchErrors = outcomes.filter((o) => o.err).map((o) => o.err);
    const lists = outcomes.filter((o) => o.list).map((o) => o.list);
    if (!lists.length && searchErrors.length) {
      return res.status(502).json({ error: `Podcast Index request failed: ${searchErrors[0]}` });
    }
    const feeds = new Map();
    lists.forEach((list) => {
      for (const f of list.slice(0, FEEDS_PER_KEYWORD)) {
        if (feeds.size < MAX_FEEDS && !feeds.has(f.id)) feeds.set(f.id, f);
      }
    });

    // 2. episodes -> frequency score + sample enclosure URLs (batched parallel)
    const feedArr = [...feeds.values()];
    const scored = [];
    for (let i = 0; i < feedArr.length; i += EPISODE_BATCH) {
      const batch = feedArr.slice(i, i + EPISODE_BATCH);
      const results = await Promise.all(batch.map(async (f) => {
        try {
          const eps = await getEpisodes(f.id, EPISODES_PER_FEED);
          const stats = frequencyScore(eps, keywords);
          if (stats.matching_eps <= 0) return null;
          const enclosures = eps.map((e) => e.enclosureUrl).filter(Boolean).slice(0, 3);
          return { feed: f, ...stats, enclosures };
        } catch { return null; }
      }));
      scored.push(...results.filter(Boolean));
    }

    // 3. enrich EVERY candidate with audience (in-memory chart lookup is free)
    //    + detect ad host/DAI from sampled enclosure URLs (local, no network).
    const provider = selectAudienceProvider({});
    await provider.prepare();
    let rows = await Promise.all(scored.map(async (s) => {
      let score = null, rank = null;
      try { ({ score, rank } = await provider.lookup(s.feed.title)); } catch {}
      return {
        show: s.feed.title,
        author: s.feed.author,
        link: showLink(s.feed),
        itunesId: s.feed.itunesId || null,
        host: detectFromUrls(s.enclosures),
        frequency_score: s.frequency_score,
        matching_eps: s.matching_eps,
        last_match_date: s.last_match_date,
        audience_score: audienceScore(score),
        audience_rank: rank,
        audience_available: score != null,
        audience_note: score == null ? provider.thresholdNote : null,
      };
    }));

    // 4. "big podcasts only" — drop small-audience shows unless ?all=1
    const matchedTotal = rows.length;
    if (bigOnly) rows = rows.filter((r) => r.audience_available);

    // 5. blend, sort (relevance first), trim
    attachBlended(rows);
    rows.sort((a, b) => b.frequency_score - a.frequency_score);
    rows = rows.slice(0, limit);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      keywords,
      audienceProvider: provider.name,
      audienceLabel: provider.label,
      bigOnly,
      count: rows.length,
      results: rows,
      ...(debug ? { debug: { feedsFound: feeds.size, feedsMatched: matchedTotal, afterBigFilter: rows.length, searchErrors } } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
