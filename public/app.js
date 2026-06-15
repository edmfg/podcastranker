// ------------------------------------------------------------------
// Podcast Ranker — front-end app
//   * Landing: auto-loads the overall top podcasts (/api/top, keyless)
//   * Refine:  selecting AI topics re-ranks via /api/rank (relevance+audience)
//   * Explore: client-side search/filter of the term library (/terms.json)
// ------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  terms: [],
  categories: {},
  query: '',
  category: 'all',
  selected: new Map(), // term -> entry
  board: [],
  mode: 'general', // 'general' | 'refined'
  audienceLabel: 'Apple chart',
  sortKey: 'audience_score',
  sortDir: -1,
  refineTimer: null,
};

// ---------- column definitions per mode ----------
const COLUMNS = {
  general: () => [
    { h: '#', cls: 'rank-cell', val: (r, i) => i + 1 },
    { h: 'Show', cls: 'show-cell', html: showCell },
    { h: 'Genre', val: (r) => r.genre || '—' },
    { h: 'Ad host', cls: 'hostcol', html: hostCell },
    { h: 'Popularity', cls: 'num', sort: 'audience_score', val: (r) => r.audience_score },
    { h: 'Chart rank', cls: 'num', sort: 'audience_rank', val: (r) => r.audience_rank ?? '—' },
  ],
  refined: () => [
    { h: '#', cls: 'rank-cell', val: (r, i) => i + 1 },
    { h: 'Show', cls: 'show-cell', html: showCell },
    { h: 'Ad host', cls: 'hostcol', html: hostCell },
    { h: 'Relevance', cls: 'num', sort: 'frequency_score', val: (r) => r.frequency_score },
    { h: 'Matching eps', cls: 'num', sort: 'matching_eps', val: (r) => r.matching_eps },
    { h: state.audienceLabel, cls: 'num', sort: 'audience_score', html: audienceCell },
    { h: 'Blended', cls: 'num', sort: 'blended', val: (r) => r.blended },
  ],
};

// ---------- init ----------
async function init() {
  try {
    const res = await fetch('/terms.json');
    const data = await res.json();
    state.terms = data.terms;
    state.categories = data.categories;
  } catch {
    $('#term-results').innerHTML = `<p class="empty">Couldn't load the term library.</p>`;
  }
  $('#stat-terms').textContent = state.terms.length || '—';
  $('#stat-cats').textContent = Object.keys(state.categories).length || '—';
  renderChips();
  renderTerms();
  wireEvents();
  loadGeneral(); // auto-show the overall top podcasts on landing
}

// ================= LEADERBOARD =================

async function loadGeneral() {
  state.mode = 'general';
  state.audienceLabel = 'Apple chart';
  state.sortKey = 'audience_score';
  state.sortDir = -1;
  $('#board-title').textContent = 'Top business & tech podcasts right now';
  $('#show-overall').hidden = true;
  $('#board-context').textContent = 'Loading the most popular Business & Technology podcasts…';

  const status = $('#board-status');
  const wrap = $('#table-wrap');
  status.hidden = false; status.classList.remove('error');
  status.innerHTML = `<span class="spinner"></span> Loading the overall top podcasts…`;

  try {
    const res = await fetch('/api/top?limit=10');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    state.board = data.results || [];
    $('#board-context').textContent = 'Showing the most popular Business & Technology podcasts. Select AI topics below to re-rank by how much each show covers them.';
    sortBoard(state.sortKey, true);
    status.hidden = true; wrap.hidden = false;
    enrichHosts();
  } catch (e) {
    showBoardError(e.message);
  }
}

async function runRank(keywords) {
  if (!keywords?.length) return loadGeneral();
  state.mode = 'refined';
  state.sortKey = 'frequency_score';
  state.sortDir = -1;
  $('#board-title').textContent = 'Top podcasts by your topics';
  $('#show-overall').hidden = false;

  const status = $('#board-status');
  const wrap = $('#table-wrap');
  status.hidden = false; status.classList.remove('error');
  status.innerHTML = `<span class="spinner"></span> Re-ranking by ${keywords.length} topic(s)… this can take 20–40s (scanning episodes).`;
  $('#board-context').textContent = `Big shows only · ranking by: ${keywords.join(', ')}`;
  document.getElementById('leaderboard').scrollIntoView({ behavior: 'smooth' });

  try {
    const qs = `?keywords=${encodeURIComponent(keywords.join(','))}`;
    const res = await fetch(`/api/rank${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    state.audienceLabel = data.audienceLabel || 'Audience';
    if (!data.results?.length) {
      wrap.hidden = true;
      status.hidden = false;
      status.innerHTML = `No big (charting) podcasts matched those topics in episode metadata. Try broader topics, or <a href="#" id="back-link">go back to the top shows</a>.`;
      $('#back-link')?.addEventListener('click', (ev) => { ev.preventDefault(); state.selected.clear(); renderTray(); renderTerms(); loadGeneral(); });
      return;
    }
    state.board = data.results;
    sortBoard(state.sortKey, true);
    status.hidden = true; wrap.hidden = false;
  } catch (e) {
    showBoardError(e.message, true);
  }
}

function showBoardError(msg, refining) {
  const status = $('#board-status');
  $('#table-wrap').hidden = true;
  status.hidden = false; status.classList.add('error');
  const hint = refining
    ? '<br><small>The relevance ranking needs Podcast Index API keys configured on the server (PI_KEY / PI_SECRET).</small>'
    : '';
  status.innerHTML = `⚠️ ${escapeHtml(msg)}${hint}`;
}

function sortBoard(key, keepDir = false) {
  if (!keepDir) {
    if (state.sortKey === key) state.sortDir *= -1;
    else { state.sortKey = key; state.sortDir = -1; }
  } else state.sortKey = key;
  const dir = state.sortDir;
  state.board.sort((a, b) => ((a[key] ?? -1) - (b[key] ?? -1)) * dir);
  renderBoard();
}

function renderBoard() {
  const cols = COLUMNS[state.mode]();
  $('#board-head').innerHTML = `<tr>${cols.map((c) => {
    const arrow = c.sort === state.sortKey ? ` ${state.sortDir < 0 ? '▾' : '▴'}` : '';
    const attrs = c.sort ? ` data-sort="${c.sort}"` : '';
    return `<th class="${c.cls || ''}"${attrs}>${escapeHtml(c.h)}${arrow}</th>`;
  }).join('')}</tr>`;

  $('#board-body').innerHTML = state.board.map((r, i) =>
    `<tr>${cols.map((c) => {
      const content = c.html ? c.html(r, i) : escapeHtml(c.val(r, i));
      return `<td class="${c.cls || ''}">${content}</td>`;
    }).join('')}</tr>`).join('');

  $$('#board-head th[data-sort]').forEach((th) =>
    th.addEventListener('click', () => sortBoard(th.dataset.sort)));
}

function showCell(r) {
  const name = escapeHtml(r.show);
  const linked = r.link
    ? `<a class="show-link" href="${escapeAttr(r.link)}" target="_blank" rel="noopener">${name} <span class="ext">↗</span></a>`
    : name;
  return `${linked}${r.author ? `<small>${escapeHtml(r.author)}</small>` : ''}`;
}
function audienceCell(r) {
  return r.audience_available
    ? escapeHtml(r.audience_score)
    : `<span class="below" title="${escapeAttr(r.audience_note || '')}">${escapeHtml(r.audience_note || '—')}</span>`;
}
function hostCell(r) {
  if (r.host === undefined) return r.itunesId ? '<span class="host-loading">…</span>' : '<span class="host-unknown">—</span>';
  const h = r.host || {};
  const main = h.server ? `<span class="host-badge" title="Hosting / ad-insertion platform">${escapeHtml(h.server)}</span>` : '';
  const pre = (h.prefixes || []).map((p) => `<span class="host-prefix" title="Analytics / attribution">${escapeHtml(p)}</span>`).join('');
  return main + pre || '<span class="host-unknown" title="Self-hosted or unrecognized">—</span>';
}

// Lazily detect ad host/DAI for rows that don't already carry it (landing rows).
async function enrichHosts() {
  const pending = state.board.filter((r) => r.host === undefined && r.itunesId);
  if (!pending.length) return;
  await Promise.all(pending.map(async (r) => {
    try {
      const res = await fetch(`/api/host?itunesId=${encodeURIComponent(r.itunesId)}`);
      const d = await res.json();
      r.host = d.host || { server: null, prefixes: [] };
    } catch {
      r.host = { server: null, prefixes: [] };
    }
  }));
  renderBoard();
}

// ================= TERM EXPLORER =================

function haystack(t) {
  return [t.term, t.category, state.categories[t.category] || '', t.note || '', ...(t.aka || [])]
    .join('  ').toLowerCase();
}
function filteredTerms() {
  const q = state.query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  let list = state.terms.filter((t) => {
    if (state.category !== 'all' && t.category !== state.category) return false;
    if (!words.length) return true;
    return words.every((w) => haystack(t).includes(w));
  });
  if (q) {
    list = list.map((t) => {
      const term = t.term.toLowerCase();
      let score = 1;
      if (term.includes(q)) score = 2;
      if (term.startsWith(q)) score = 3;
      if (term === q) score = 4;
      return { t, score };
    }).sort((a, b) => b.score - a.score || a.t.term.localeCompare(b.t.term)).map((s) => s.t);
  }
  return list;
}

function renderChips() {
  const chips = [['all', 'All']].concat(Object.entries(state.categories));
  $('#category-filters').innerHTML = chips
    .map(([key, label]) => `<button class="chip${key === state.category ? ' active' : ''}" data-cat="${key}">${escapeHtml(label)}</button>`)
    .join('');
}

function renderTerms() {
  const list = filteredTerms();
  const wrap = $('#term-results');
  const empty = $('#term-empty');
  if (!list.length) { wrap.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;

  const order = Object.keys(state.categories);
  const groups = new Map(order.map((k) => [k, []]));
  for (const t of list) { if (!groups.has(t.category)) groups.set(t.category, []); groups.get(t.category).push(t); }

  wrap.innerHTML = [...groups.entries()].filter(([, l]) => l.length).map(([cat, items]) => `
    <div class="term-group">
      <h3>${escapeHtml(state.categories[cat] || cat)}</h3>
      <div class="term-grid">${items.map(termCard).join('')}</div>
    </div>`).join('');
}

function termCard(t) {
  const sel = state.selected.has(t.term);
  const star = t.keyword ? '<span class="star" title="Default ranking topic">★</span>' : '';
  const aka = t.aka?.length ? `<div class="t-aka">also: ${escapeHtml(t.aka.join(', '))}</div>` : '';
  const note = t.note ? `<div class="t-note">${escapeHtml(t.note)}</div>` : '';
  return `<button class="term-card${sel ? ' selected' : ''}" data-term="${escapeAttr(t.term)}">
    <span class="t-add">${sel ? '✓' : '+'}</span>
    <span class="t-name">${escapeHtml(t.term)} ${star}</span>
    ${note}${aka}
  </button>`;
}

function toggleSelect(term) {
  if (state.selected.has(term)) state.selected.delete(term);
  else state.selected.set(term, state.terms.find((t) => t.term === term));
  renderTray();
  renderTerms();
  scheduleRefine();
}
function renderTray() {
  const n = state.selected.size;
  $('#tray').hidden = n === 0;
  $('#tray-count').textContent = n;
  $('#tray-items').innerHTML = [...state.selected.keys()].map((term) =>
    `<span class="tray-tag">${escapeHtml(term)}<button data-remove="${escapeAttr(term)}" title="Remove">×</button></span>`).join('');
}

// debounced auto re-rank as the selection changes
function scheduleRefine() {
  clearTimeout(state.refineTimer);
  const keys = [...state.selected.keys()];
  state.refineTimer = setTimeout(() => {
    if (keys.length) runRank(keys);
    else loadGeneral();
  }, 900);
}

// ---------- events ----------
function wireEvents() {
  const search = $('#term-search');
  search.addEventListener('input', () => {
    state.query = search.value;
    $('#clear-search').hidden = !search.value;
    renderTerms();
  });
  $('#clear-search').addEventListener('click', () => {
    search.value = ''; state.query = ''; $('#clear-search').hidden = true; renderTerms(); search.focus();
  });
  $('#category-filters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    state.category = chip.dataset.cat; renderChips(); renderTerms();
  });
  $('#term-results').addEventListener('click', (e) => {
    const card = e.target.closest('.term-card'); if (!card) return;
    toggleSelect(card.dataset.term);
  });
  $('#tray-items').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]'); if (!btn) return;
    toggleSelect(btn.dataset.remove);
  });
  $('#clear-tray').addEventListener('click', () => { clearTimeout(state.refineTimer); state.selected.clear(); renderTray(); renderTerms(); loadGeneral(); });
  $('#run-selected').addEventListener('click', () => { clearTimeout(state.refineTimer); runRank([...state.selected.keys()]); });
  $('#show-overall').addEventListener('click', () => { clearTimeout(state.refineTimer); state.selected.clear(); renderTray(); renderTerms(); loadGeneral(); });
}

// ---------- utils ----------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

init();
