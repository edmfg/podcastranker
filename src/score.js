// ---------------------------------------------------------------------------
// Scoring — keep frequency and audience SEPARATE, plus an optional blend.
// ---------------------------------------------------------------------------
import { WEIGHTS } from './config.js';

/** Build a single regex that matches any keyword as a loose phrase. */
function buildMatcher(keywords) {
  const parts = keywords.map((k) =>
    k.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  );
  return new RegExp(`\\b(?:${parts.join('|')})`, 'i');
}

/**
 * Compute frequency stats for one feed's episodes against the keyword set.
 * Returns { frequency_score, matching_eps, total_eps, last_match_date }.
 */
export function frequencyScore(episodes, keywords) {
  const matcher = buildMatcher(keywords);
  const nowSec = Math.floor(Date.now() / 1000);
  const windowSec = WEIGHTS.recencyWindowDays * 86400;

  let matching = 0;
  let recent = 0;
  let lastMatch = 0;

  for (const ep of episodes) {
    const text = `${ep.title} ${ep.description}`;
    if (!matcher.test(text)) continue;
    matching++;
    if (ep.datePublished && nowSec - ep.datePublished <= windowSec) recent++;
    if (ep.datePublished > lastMatch) lastMatch = ep.datePublished;
  }

  const total = episodes.length || 1;
  const density = WEIGHTS.densityWeight * (matching / total);
  const frequency_score = matching + WEIGHTS.recencyBonus * recent + density;

  return {
    frequency_score: round(frequency_score),
    matching_eps: matching,
    total_eps: episodes.length,
    last_match_date: lastMatch ? new Date(lastMatch * 1000).toISOString().slice(0, 10) : null,
  };
}

/** audience_score: the provider's 0–100 score, or 0 when below its threshold. */
export function audienceScore(score) {
  return typeof score === 'number' ? score : 0;
}

/**
 * Blend across the full result set (frequency is normalized to the max present).
 * blended = norm(freq)*0.6 + (audience/100)*0.4
 */
export function attachBlended(rows) {
  const maxFreq = Math.max(1, ...rows.map((r) => r.frequency_score));
  for (const r of rows) {
    const nf = r.frequency_score / maxFreq;
    r.blended = round(nf * WEIGHTS.blendFrequency + (r.audience_score / 100) * WEIGHTS.blendAudience);
  }
  return rows;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
