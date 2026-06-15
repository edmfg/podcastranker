# podcastranker

Find the podcasts that talk about **AI in business** the most — ranked on two
separate dimensions:

| Dimension | Question | Source |
|-----------|----------|--------|
| **Topic frequency** | How *much* does this show cover AI-in-business? | [Podcast Index API](https://podcastindex.org) (episode metadata) — **needs a free key** |
| **Audience proxy** | How *big* is this show? | **Apple Top Chart rank** (keyless, default) — or [Listen Notes](https://www.listennotes.com) `listen_score` if you have a key |

Plus a searchable, prepopulated **library of AI-in-business terms** — the popular
phrases and vocabulary people use when discussing how AI affects business. The
library doubles as the keyword set the ranker searches for.

Totally free stack, runs locally. No framework, no dependencies. The **only**
credential you need is a free Podcast Index key; audience data works with no key.

> ⚠️ **Honest limit:** true download/listener counts are private — no free API
> exposes them. Both audience proxies are *modeled popularity signals*, not
> download numbers:
> - **Apple Top Chart** (default, keyless): a show's position in Apple's current
>   top-100 podcasts. Shows outside the chart are flagged "not in Apple Top chart"
>   — expected for niche-but-on-topic shows, not a bug. It's the overall chart, so
>   it favors big general shows.
> - **Listen Score** (optional, needs key): 0–100, like Nielsen ratings; only
>   populated for ~top 10% of shows, else "below top ~10%".
>
> Never report either as a download count.

---

## Quick start

```bash
# 1. (No keys needed) explore the AI-in-business term library:
node index.js terms
node index.js terms agents
node index.js terms "ai roi"

# 2. To rank podcasts, add your free Podcast Index key:
cp .env.example .env        # then fill in PI_KEY + PI_SECRET (Listen Notes optional)
node index.js rank
node index.js rank --sort blended --html
```

Requires **Node 18+** (uses built-in `fetch` and `crypto`).

## Web app (Vercel)

There's also a deployed website (`public/` + `api/`):
- **Term explorer** — searchable, filterable AI-in-business term library, fully
  client-side (`public/` static, data from `public/terms.json`).
- **Leaderboard** — live ranking via the serverless `api/rank.js` (bounded so it
  fits the function time limit), using `PI_KEY` / `PI_SECRET` (and optional
  `LISTEN_API_KEY`) set as Vercel environment variables.

`vercel.json` serves `public/` as the static root, runs `scripts/build-terms.mjs`
at build time to regenerate `public/terms.json` from `src/terms.js`, and gives
`api/rank.js` a 60s budget. Deploys on push to `main`.

## Commands

```
node index.js terms [query]    search the AI-in-business term library (offline)
node index.js rank [options]   rank podcasts by AI-in-business coverage
node index.js help
```

### `terms`
- No query → lists the whole library, grouped by category.
- `terms agents` → filters to matching entries (term, synonyms, notes).
- `terms ai roi` → multi-word AND search.
- `--keywords` → show only the ★ terms that feed the ranker.

Edit `src/terms.js` to add phrases. Tag an entry `keyword: true` to make it a
default podcast search keyword.

### `rank`
| Flag | Default | Meaning |
|------|---------|---------|
| `--keywords "a,b,c"` | ★ terms in the library | override the search keyword set |
| `--sort freq\|audience\|blended` | `freq` | leaderboard sort |
| `--limit N` | 25 | leaderboard size |
| `--html` | off | also write `leaderboard.html` (sortable) |
| `--no-audience` | off | frequency-only ranking (skip the audience proxy) |

**Audience source is auto-selected:** Listen Notes if `LISTEN_API_KEY` is set in
`.env`, otherwise the keyless Apple Top Chart proxy. The table/JSON label the
active source.

Output: a console table, `results.json`, and optionally `leaderboard.html`.

## How it works (Approach B from the brief)

1. For each keyword → Podcast Index `search/byterm` → candidate feeds (deduped).
2. For each feed → `episodes/byfeedid` → tally keyword hits in title+description
   → **frequency_score** (`matches + 0.5·recent90d + density`).
3. Take the top ~40 by frequency → enrich each with audience data (Apple chart
   rank by default, or Listen Notes if a key is set — only the shortlist, to
   respect Listen Notes' free quota).
4. Compute a blended rank, sort, keep the top 25.

Frequency and audience stay in **separate columns**; `blended` is provided so you
can eyeball the niche-but-on-topic vs huge-but-occasional tradeoff.

## Get free API keys
- **Podcast Index** (required) — https://api.podcastindex.org/signup → `PI_KEY` +
  `PI_SECRET`. The secret is shown **only once**, when you create the key. If you
  lost it, delete the key and create a new one (a read-only key is fine).
- **Listen Notes** (optional) — https://www.listennotes.com/api/ → `LISTEN_API_KEY`.
  Skip it and the keyless Apple chart proxy is used automatically.

Store them in `.env` (gitignored — never commit).

## Files
```
index.js            CLI: `terms` and `rank` commands
src/terms.js        the AI-in-business term library + search
src/config.js       keywords, weights, limits
src/podcastIndex.js Podcast Index client (sha1 auth)
src/audience.js     audience-provider selector (Apple chart | Listen Notes | none)
src/appleCharts.js  keyless Apple Top Chart proxy (default)
src/listenNotes.js  Listen Notes client (optional audience)
src/score.js        frequency / audience / blended scoring
src/leaderboard.js  static sortable HTML output
src/util.js         .env loader + retrying fetch
```

## Upgrade path
- **Transcripts (Whisper):** episodes include MP3 URLs — transcribe locally and
  match full transcripts to catch shows that discuss AI-in-business without
  saying so in titles/descriptions.
- **Semantic search:** swap `results.json` for Supabase + pgvector.
- **Real audience numbers:** only paid (Rephonic/Podtrac) — out of scope.
