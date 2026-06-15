// ---------------------------------------------------------------------------
// Audience layer — picks a free audience-proxy provider and exposes a uniform
// interface so the ranker doesn't care which one is in use.
//
//   provider.lookup(title) -> { score: 0..100 | null, rank: number | null, itunes_id }
//
// Selection:
//   * LISTEN_API_KEY present  -> Listen Notes (Listen Score)        [networked per show]
//   * otherwise (default)     -> Apple Top Chart rank (keyless)     [one fetch, local lookups]
//   * --no-audience           -> none (frequency-only ranking)
// ---------------------------------------------------------------------------
import { LIMITS } from './config.js';
import { getListenNotesAudience } from './listenNotes.js';
import { loadAppleChart, lookupAppleChart } from './appleCharts.js';

export function selectAudienceProvider({ disabled = false } = {}) {
  if (disabled) {
    return {
      name: 'none',
      label: 'audience',
      thresholdNote: 'audience disabled',
      networked: false,
      async prepare() { return null; },
      async lookup() { return { score: null, rank: null, itunes_id: null }; },
    };
  }

  if (process.env.LISTEN_API_KEY) {
    return {
      name: 'listennotes',
      label: 'Listen Score',
      thresholdNote: 'below top ~10%',
      networked: true, // one API call per show -> respect quota, enrich shortlist only
      async prepare() { return null; },
      async lookup(title) { return getListenNotesAudience(title); },
    };
  }

  // Default: keyless Apple Top Chart.
  let chart = null;
  return {
    name: 'apple-chart',
    label: 'Apple chart',
    thresholdNote: 'not in Apple Top chart',
    networked: false, // single chart fetch in prepare(); per-show lookups are local
    async prepare() {
      chart = await loadAppleChart(LIMITS.appleChartSize);
      return chart.size;
    },
    async lookup(title) {
      if (!chart) chart = await loadAppleChart(LIMITS.appleChartSize);
      return lookupAppleChart(title, chart);
    },
  };
}
