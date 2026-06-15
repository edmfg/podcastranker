// ---------------------------------------------------------------------------
// Podcast Index API client — topic-frequency source.
// Auth: 3 headers; Authorization = sha1(KEY + SECRET + unixDate). See brief §2.
// ---------------------------------------------------------------------------
import { createHash } from 'node:crypto';
import { fetchJSON } from './util.js';
import { LIMITS } from './config.js';

const BASE = 'https://api.podcastindex.org/api/1.0';

function piAuthHeaders() {
  const key = process.env.PI_KEY;
  const secret = process.env.PI_SECRET;
  if (!key || !secret) throw new Error('Missing PI_KEY / PI_SECRET in .env');

  const date = Math.floor(Date.now() / 1000).toString();
  const authorization = createHash('sha1').update(key + secret + date).digest('hex');
  return {
    'X-Auth-Key': key,
    'X-Auth-Date': date,
    Authorization: authorization,
    'User-Agent': process.env.USER_AGENT || 'podcastranker/0.1',
  };
}

/** Search feeds by term. Returns [{ id, title, author }]. */
export async function searchFeeds(term) {
  const url = `${BASE}/search/byterm?q=${encodeURIComponent(term)}`;
  const data = await fetchJSON(url, {
    headers: piAuthHeaders(),
    retries: LIMITS.maxRetries,
    label: `searchFeeds "${term}"`,
  });
  return (data.feeds || []).map((f) => ({
    id: f.id,
    title: f.title,
    author: f.author || f.ownerName || '',
    link: f.link || '', // show website
    url: f.url || '', // rss feed
    itunesId: f.itunesId || null,
  }));
}

/** Fetch a feed's episodes. Returns [{ title, description, datePublished }]. */
export async function getEpisodes(feedId) {
  const url = `${BASE}/episodes/byfeedid?id=${encodeURIComponent(feedId)}&max=${LIMITS.maxEpisodesPerFeed}`;
  const data = await fetchJSON(url, {
    headers: piAuthHeaders(),
    retries: LIMITS.maxRetries,
    label: `getEpisodes ${feedId}`,
  });
  return (data.items || []).map((e) => ({
    title: e.title || '',
    description: e.description || '',
    datePublished: e.datePublished || 0, // unix seconds
  }));
}
