# podcastranker

Find the podcasts that talk about **AI in business** the most — ranked on two
separate dimensions:

| Dimension | Question | Source |
|-----------|----------|--------|
| **Topic frequency** | How *much* does this show cover AI-in-business? | [Podcast Index API](https://podcastindex.org) (episode metadata) |
| **Audience proxy** | How *big* is this show? | [Listen Notes](https://www.listennotes.com) `listen_score` (0–100) + global rank |

Plus a searchable, prepopulated **library of AI-in-business terms** — the popular
phrases and vocabulary people use when discussing how AI affects business. The
library doubles as the keyword set the ranker searches for.

Totally free stack, runs locally. No framework, no dependencies.

> ⚠️ **Honest limit:** true download/listener counts are private — no free API
> exposes them. Listen Score is a *modeled popularity proxy* (like Nielsen
> ratings), only populated for roughly the top 10% of shows. Below that it's
> `null` ("below top-10%"). Never report it as a download number.

---

## Quick start

```bash
# 1. (No keys needed) explore the AI-in-business term library:
node index.js terms
node index.js terms agents
node index.js terms "ai roi"

# 2. To rank podcasts, add free API keys:
cp .env.example .env        # then fill in PI_KEY, PI_SECRET, LISTEN_API_KEY
node index.js rank
node index.js rank --sort blended --html
```

Requires **Node 18+** (uses built-in `fetch` and `crypto`).

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
| `--no-apple` | off | skip the fragile Apple ratings fallback |

Output: a console table, `results.json`, and optionally `leaderboard.html`.

## How it works (Approach B from the brief)

1. For each keyword → Podcast Index `search/byterm` → candidate feeds (deduped).
2. For each feed → `episodes/byfeedid` → tally keyword hits in title+description
   → **frequency_score** (`matches + 0.5·recent90d + density`).
3. Take the top ~40 by frequency → enrich each with Listen Notes audience data
   (only the shortlist, to respect the free quota).
4. Compute a blended rank, sort, keep the top 25.

Frequency and audience stay in **separate columns**; `blended` is provided so you
can eyeball the niche-but-on-topic vs huge-but-occasional tradeoff.

## Get free API keys
- **Podcast Index** — https://api.podcastindex.org/signup → `PI_KEY` + `PI_SECRET`
- **Listen Notes** — https://www.listennotes.com/api/ → `LISTEN_API_KEY`

Store them in `.env` (gitignored — never commit).

## Files
```
index.js            CLI: `terms` and `rank` commands
src/terms.js        the AI-in-business term library + search
src/config.js       keywords, weights, limits
src/podcastIndex.js Podcast Index client (sha1 auth)
src/listenNotes.js  Listen Notes client (audience)
src/apple.js        Apple ratings fallback (best-effort)
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
