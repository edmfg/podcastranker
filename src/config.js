// ---------------------------------------------------------------------------
// Tunable config — keywords, weights, limits. Edit freely.
// ---------------------------------------------------------------------------
import { defaultKeywords } from './terms.js';

// Which AI-in-business phrases to search Podcast Index for.
// Defaults to every term tagged { keyword: true } in src/terms.js.
// Override at runtime with:  node index.js rank --keywords "enterprise ai,ai roi"
export const KEYWORDS = defaultKeywords();

// Scoring weights (see brief §2 "Scoring").
export const WEIGHTS = {
  recencyBonus: 0.5, // per matching episode in the last N days
  recencyWindowDays: 90,
  densityWeight: 10, // multiplies (matching_episodes / total_episodes)
  blendFrequency: 0.6, // blended = freq*0.6 + audience*0.4
  blendAudience: 0.4,
};

// Pipeline limits — respect free quotas.
export const LIMITS = {
  maxEpisodesPerFeed: 1000, // Podcast Index cap per feed fetch
  shortlistSize: 40, // top-N by frequency to enrich with audience data
  resultSize: 25, // final leaderboard length
  requestDelayMs: 250, // polite gap between API calls
  maxRetries: 4, // retry-with-backoff on errors / 429s
  appleChartSize: 100, // top shows for the keyless Apple proxy (Apple feed max is 100)
};

// A null audience score means "below this proxy's visibility threshold", not
// zero audience. The exact wording is provided per-provider (see src/audience.js).
export const BELOW_THRESHOLD_LABEL = 'below threshold';
