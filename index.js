#!/usr/bin/env node
// ---------------------------------------------------------------------------
// podcastranker CLI
//
//   node index.js terms [query]      search the AI-in-business term library
//   node index.js rank [options]     rank podcasts by AI-in-business coverage
//   node index.js help
//
// rank options:
//   --keywords "a,b,c"   override the keyword set (default: terms tagged keyword)
//   --sort freq|audience|blended   default: freq
//   --limit N            final leaderboard size (default: config resultSize)
//   --html               also write leaderboard.html
//   --no-apple           skip the fragile Apple ratings fallback
// ---------------------------------------------------------------------------
import { writeFileSync } from 'node:fs';
import { loadEnv, sleep } from './src/util.js';
import { KEYWORDS, LIMITS, WEIGHTS } from './src/config.js';
import { searchTerms, groupByCategory, CATEGORIES, TERMS } from './src/terms.js';
import { searchFeeds, getEpisodes } from './src/podcastIndex.js';
import { selectAudienceProvider } from './src/audience.js';
import { frequencyScore, audienceScore, attachBlended } from './src/score.js';

// ---- tiny arg parser -------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out.flags[key] = true;
      else { out.flags[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

// ---- bold/dim helpers (no deps) -------------------------------------------
const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
};

// ===========================================================================
// terms — search the AI-in-business term library (offline, no API key needed)
// ===========================================================================
function cmdTerms(args) {
  const query = args._.join(' ');
  const results = searchTerms(query);

  if (results.length === 0) {
    console.log(`No terms match "${query}". Try a broader word, or run with no query to list all.`);
    return;
  }

  const keywordsOnly = !!args.flags.keywords;
  const shown = keywordsOnly ? results.filter((t) => t.keyword) : results;

  console.log(
    query
      ? `\n${c.b(`Terms matching "${query}"`)} ${c.dim(`(${shown.length})`)}`
      : `\n${c.b('AI-in-business term library')} ${c.dim(`(${TERMS.length} terms, ${Object.keys(CATEGORIES).length} categories)`)}`
  );

  for (const [cat, list] of groupByCategory(shown)) {
    console.log(`\n${c.cyan(CATEGORIES[cat] || cat)}`);
    for (const t of list) {
      const star = t.keyword ? c.amber(' ★') : '';
      const aka = t.aka?.length ? c.dim(`  (${t.aka.join(', ')})`) : '';
      const note = t.note ? c.dim(` — ${t.note}`) : '';
      console.log(`  ${c.b(t.term)}${star}${note}${aka}`);
    }
  }
  console.log(`\n${c.amber('★')} ${c.dim('= used as a default podcast search keyword (config.js / KEYWORDS)')}`);
  console.log(c.dim('Tip: `node index.js terms agents` to filter, `--keywords` to show only ★ terms.\n'));
}

// ===========================================================================
// rank — the two-dimensional podcast ranker
// ===========================================================================
async function cmdRank(args) {
  loadEnv();
  // Only Podcast Index is required. Audience is provided keylessly via the Apple
  // Top Chart unless a LISTEN_API_KEY is present (then Listen Notes is used).
  const missing = ['PI_KEY', 'PI_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`\n${c.amber('Missing credentials:')} ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and add your free Podcast Index key:');
    console.error('  Podcast Index  https://api.podcastindex.org/signup');
    console.error('(Listen Notes is optional — without it, a keyless Apple chart proxy is used.)\n');
    process.exitCode = 1;
    return;
  }

  const keywords = args.flags.keywords
    ? String(args.flags.keywords).split(',').map((s) => s.trim()).filter(Boolean)
    : KEYWORDS;
  const sort = args.flags.sort || 'freq';
  const limit = Number(args.flags.limit) || LIMITS.resultSize;
  const provider = selectAudienceProvider({ disabled: !!args.flags['no-audience'] });

  console.log(`\n${c.b('Ranking podcasts on AI-in-business coverage')}`);
  console.log(c.dim(`${keywords.length} keywords · audience=${provider.name} · sort=${sort} · top ${limit}\n`));

  // --- 1. candidate feeds per keyword (dedupe by feedId) -------------------
  const feeds = new Map();
  for (const term of keywords) {
    try {
      const found = await searchFeeds(term);
      for (const f of found) if (!feeds.has(f.id)) feeds.set(f.id, f);
      process.stdout.write(`  searched "${term}" → ${found.length} feeds (total ${feeds.size})\n`);
    } catch (e) {
      console.error(`  ${c.amber('!')} searchFeeds "${term}": ${e.message}`);
    }
    await sleep(LIMITS.requestDelayMs);
  }
  console.log(c.dim(`\n${feeds.size} unique candidate feeds.`));

  // --- 2. episodes → frequency score per feed ------------------------------
  const scored = [];
  let n = 0;
  for (const f of feeds.values()) {
    n++;
    try {
      const eps = await getEpisodes(f.id);
      const stats = frequencyScore(eps, keywords);
      if (stats.matching_eps > 0) scored.push({ feed: f, ...stats });
      if (n % 10 === 0) process.stdout.write(c.dim(`  scored ${n}/${feeds.size} feeds…\n`));
    } catch (e) {
      console.error(`  ${c.amber('!')} getEpisodes ${f.id} (${f.title}): ${e.message}`);
    }
    await sleep(LIMITS.requestDelayMs);
  }
  scored.sort((a, b) => b.frequency_score - a.frequency_score);
  console.log(c.dim(`${scored.length} feeds matched at least one keyword.`));

  // --- 3. enrich shortlist with audience (respect free quota) --------------
  const shortlist = scored.slice(0, LIMITS.shortlistSize);
  const chartSize = await provider.prepare();
  if (provider.name === 'apple-chart') console.log(c.dim(`\nLoaded Apple Top ${chartSize} chart (keyless audience proxy).`));
  console.log(`${c.dim(`Enriching top ${shortlist.length} shows with ${provider.label} data…`)}`);
  const rows = [];
  for (const s of shortlist) {
    let score = null, rank = null;
    try {
      ({ score, rank } = await provider.lookup(s.feed.title));
    } catch (e) {
      console.error(`  ${c.amber('!')} audience "${s.feed.title}": ${e.message}`);
    }
    rows.push({
      show: s.feed.title,
      author: s.feed.author,
      frequency_score: s.frequency_score,
      matching_eps: s.matching_eps,
      total_eps: s.total_eps,
      last_match_date: s.last_match_date,
      audience_source: provider.name,
      audience_score: audienceScore(score),
      audience_rank: rank,
      audience_available: score != null,
      audience_note: score == null ? provider.thresholdNote : null,
    });
    if (provider.networked) await sleep(LIMITS.requestDelayMs);
  }

  // --- 4. blend, sort, trim ------------------------------------------------
  attachBlended(rows);
  const sortKey = { freq: 'frequency_score', audience: 'audience_score', blended: 'blended' }[sort] || 'frequency_score';
  rows.sort((a, b) => b[sortKey] - a[sortKey]);
  const top = rows.slice(0, limit);

  // --- 5. output -----------------------------------------------------------
  printTable(top, provider);

  const payload = {
    generatedAt: new Date().toISOString(),
    keywords,
    weights: WEIGHTS,
    audienceProvider: provider.name,
    audienceLabel: provider.label,
    sortedBy: sortKey,
    count: top.length,
    results: top,
  };
  writeFileSync('results.json', JSON.stringify(payload, null, 2));
  console.log(`\n${c.dim('Wrote results.json')}`);

  if (args.flags.html) {
    const { renderLeaderboard } = await import('./src/leaderboard.js');
    writeFileSync('leaderboard.html', renderLeaderboard(top, payload));
    console.log(c.dim('Wrote leaderboard.html'));
  }
  if (provider.name !== 'none') {
    console.log(
      `\n${c.amber('Note:')} ${provider.label} is a popularity proxy (0–100), not a download count. ` +
      `Shows marked "${provider.thresholdNote}" sit below this proxy's visibility threshold.\n`
    );
  }
}

function printTable(rows, provider) {
  console.log('');
  const audLabel = (provider.label || 'audience').slice(0, 7);
  const header = ['#', 'show', 'freq', 'eps', 'last match', audLabel, 'rank', 'blend'];
  const widths = [3, 38, 6, 4, 11, 7, 6, 5];
  const fmt = (cells) => cells.map((v, i) => String(v).slice(0, widths[i]).padEnd(widths[i])).join('  ');
  console.log(c.b(fmt(header)));
  console.log(c.dim(fmt(widths.map((w) => '─'.repeat(w)))));
  rows.forEach((r, i) => {
    console.log(
      fmt([
        i + 1,
        r.show,
        r.frequency_score,
        r.matching_eps,
        r.last_match_date || '—',
        r.audience_available ? r.audience_score : '—',
        r.audience_rank ?? '—',
        r.blended,
      ])
    );
  });
}

// ===========================================================================
function help() {
  console.log(`
${c.b('podcastranker')} — rank podcasts on AI-in-business coverage, and search AI terms.

${c.b('Commands')}
  ${c.cyan('node index.js terms [query]')}   search the AI-in-business term library (offline)
  ${c.cyan('node index.js rank [options]')}  rank podcasts (needs .env API keys)
  ${c.cyan('node index.js help')}

${c.b('terms')}
  node index.js terms                 list the whole library, grouped
  node index.js terms agents          filter to entries matching "agents"
  node index.js terms ai roi          multi-word AND search
  node index.js terms --keywords      show only the ★ default search keywords

${c.b('rank options')}
  --keywords "a,b,c"   override keyword set (default: ★ terms in the library)
  --sort freq|audience|blended   default: freq
  --limit N            leaderboard size (default ${LIMITS.resultSize})
  --html               also emit leaderboard.html (sortable)
  --no-audience        frequency-only (skip audience proxy entirely)

${c.b('audience source')} (auto-selected)
  Listen Notes if LISTEN_API_KEY is set in .env, otherwise a keyless
  Apple Top Chart proxy. Only Podcast Index credentials are required.
`);
}

// ---- dispatch --------------------------------------------------------------
const [, , cmd, ...rest] = process.argv;
const args = parseArgs(rest);
const run = {
  terms: () => cmdTerms(args),
  rank: () => cmdRank(args),
  help: () => help(),
  undefined: () => help(),
}[cmd] || (() => { console.error(`Unknown command "${cmd}". Try: node index.js help`); process.exitCode = 1; });

await run();
