// ---------------------------------------------------------------------------
// Zero-dependency helpers: .env loader, sleep, retrying fetch.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Minimal .env parser. Loads ROOT/.env into process.env (does not overwrite). */
export function loadEnv() {
  let raw;
  try {
    raw = readFileSync(join(ROOT, '.env'), 'utf8');
  } catch {
    return; // no .env — caller validates required keys
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Best public link for a Podcast Index feed: Apple page › website › RSS. */
export function showLink(feed = {}) {
  if (feed.itunesId) return `https://podcasts.apple.com/podcast/id${feed.itunesId}`;
  if (feed.link) return feed.link;
  return feed.url || null;
}

/**
 * fetch with retry + exponential backoff. Retries on network errors, 429, and
 * 5xx. Honors Retry-After when present. Throws after `retries` attempts.
 */
export async function fetchJSON(url, { headers = {}, retries = 4, label = '' } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(15000, 500 * 2 ** attempt);
        if (attempt < retries) {
          await sleep(waitMs);
          attempt++;
          continue;
        }
        throw new Error(`${res.status} ${res.statusText}${label ? ` (${label})` : ''}`);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status} ${res.statusText}${label ? ` (${label})` : ''} ${body.slice(0, 200)}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      // network-level error: back off and retry
      if (attempt < retries) {
        await sleep(Math.min(15000, 500 * 2 ** attempt));
        attempt++;
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}
