// ---------------------------------------------------------------------------
// GET /api/host?itunesId=12345
// Detect a show's hosting / ad-serving (DAI) platform + analytics prefixes by
// fingerprinting a few recent episodes' audio (enclosure) URLs. Used to lazily
// enrich the landing board (whose rows come from Apple, not Podcast Index).
// Degrades gracefully (always 200) so the UI never breaks on missing data.
// ---------------------------------------------------------------------------
import { getEpisodesByItunesId } from '../src/podcastIndex.js';
import { detectFromUrls } from '../src/hosting.js';

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  const empty = { host: { server: null, prefixes: [] } };
  try {
    if (!process.env.PI_KEY || !process.env.PI_SECRET) return res.status(200).json(empty);
    const url = new URL(req.url, 'http://localhost');
    const itunesId = url.searchParams.get('itunesId');
    if (!itunesId) return res.status(200).json(empty);

    const eps = await getEpisodesByItunesId(itunesId, 3);
    const enclosures = eps.map((e) => e.enclosureUrl).filter(Boolean);
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    res.status(200).json({ host: detectFromUrls(enclosures) });
  } catch {
    res.status(200).json(empty);
  }
}
