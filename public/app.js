// ------------------------------------------------------------------
// Podcast Ranker — front-end app
//   * Term explorer: loads /terms.json, client-side search + filter + select
//   * Leaderboard: calls /api/rank, renders + sorts the table
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
  sortKey: 'frequency_score',
  sortDir: -1,
};

// ---------- load term data ----------
async function init() {
  try {
    const res = await fetch('/terms.json');
    const data = await res.json();
    state.terms = data.terms;
    state.categories = data.categories;
  } catch (e) {
    $('#term-results').innerHTML = `<p class="empty">Couldn't load the term library.</p>`;
    return;
  }
  $('#stat-terms').textContent = state.terms.length;
  $('#stat-cats').textContent = Object.keys(state.categories).length;
  renderChips();
  renderTerms();
  wireEvents();
}

// ---------- search ----------
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
    const hay = haystack(t);
    return words.every((w) => hay.includes(w));
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

// ---------- render: category chips ----------
function renderChips() {
  const chips = [['all', 'All']].concat(Object.entries(state.categories));
  $('#category-filters').innerHTML = chips
    .map(([key, label]) => `<button class="chip${key === state.category ? ' active' : ''}" data-cat="${key}">${label}</button>`)
    .join('');
}

// ---------- render: term cards ----------
function renderTerms() {
  const list = filteredTerms();
  const wrap = $('#term-results');
  const empty = $('#term-empty');
  if (!list.length) { wrap.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;

  // group by category, preserving category order
  const order = Object.keys(state.categories);
  const groups = new Map(order.map((k) => [k, []]));
  for (const t of list) { if (!groups.has(t.category)) groups.set(t.category, []); groups.get(t.category).push(t); }

  wrap.innerHTML = [...groups.entries()].filter(([, l]) => l.length).map(([cat, items]) => `
    <div class="term-group">
      <h3>${state.categories[cat] || cat}</h3>
      <div class="term-grid">
        ${items.map(termCard).join('')}
      </div>
    </div>`).join('');
}

function termCard(t) {
  const sel = state.selected.has(t.term);
  const star = t.keyword ? '<span class="star" title="Default search keyword">★</span>' : '';
  const aka = t.aka?.length ? `<div class="t-aka">also: ${t.aka.join(', ')}</div>` : '';
  const note = t.note ? `<div class="t-note">${escapeHtml(t.note)}</div>` : '';
  return `<button class="term-card${sel ? ' selected' : ''}" data-term="${escapeAttr(t.term)}">
    <span class="t-add">${sel ? '✓' : '+'}</span>
    <span class="t-name">${escapeHtml(t.term)} ${star}</span>
    ${note}${aka}
  </button>`;
}

// ---------- selection tray ----------
function toggleSelect(term) {
  if (state.selected.has(term)) state.selected.delete(term);
  else state.selected.set(term, state.terms.find((t) => t.term === term));
  renderTray();
  renderTerms();
}
function renderTray() {
  const tray = $('#tray');
  const n = state.selected.size;
  tray.hidden = n === 0;
  $('#tray-count').textContent = n;
  $('#tray-items').innerHTML = [...state.selected.keys()].map((term) =>
    `<span class="tray-tag">${escapeHtml(term)}<button data-remove="${escapeAttr(term)}" title="Remove">×</button></span>`).join('');
}

// ---------- leaderboard ----------
async function runRank(keywords) {
  const status = $('#board-status');
  const wrap = $('#table-wrap');
  const ctx = $('#board-context');
  status.hidden = false; status.classList.remove('error');
  status.innerHTML = `<span class="spinner"></span> Ranking podcasts… this can take 20–40s (searching feeds &amp; scanning episodes).`;
  ctx.textContent = keywords?.length ? `Using ${keywords.length} selected term(s).` : 'Using default AI-in-business keywords.';

  document.getElementById('leaderboard').scrollIntoView({ behavior: 'smooth' });

  try {
    const qs = keywords?.length ? `?keywords=${encodeURIComponent(keywords.join(','))}` : '';
    const res = await fetch(`/api/rank${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    if (!data.results?.length) {
      status.hidden = false;
      status.innerHTML = 'No matching shows found for those terms. Try different or broader terms.';
      wrap.hidden = true;
      return;
    }
    state.board = data.results;
    $('#aud-col').firstChild && ($('#aud-col').textContent = data.audienceLabel || 'Audience');
    sortBoard(state.sortKey, true);
    status.hidden = true;
    wrap.hidden = false;
  } catch (e) {
    status.classList.add('error');
    status.innerHTML = `⚠️ ${escapeHtml(e.message)}.<br><small>The ranker needs Podcast Index API keys configured on the server (PI_KEY / PI_SECRET).</small>`;
    wrap.hidden = true;
  }
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
  $('#board-body').innerHTML = state.board.map((r, i) => `
    <tr>
      <td class="rank-cell">${i + 1}</td>
      <td class="show-cell">${escapeHtml(r.show)}${r.author ? `<small>${escapeHtml(r.author)}</small>` : ''}</td>
      <td class="num">${r.frequency_score}</td>
      <td class="num">${r.matching_eps}</td>
      <td>${r.last_match_date || '—'}</td>
      <td class="num">${r.audience_available ? r.audience_score : `<span class="below" title="${escapeAttr(r.audience_note || '')}">${escapeHtml(r.audience_note || '—')}</span>`}</td>
      <td class="num">${r.blended}</td>
    </tr>`).join('');
  // reflect sort arrow
  $$('.board th[data-sort]').forEach((th) => {
    const base = th.textContent.replace(/[▾▴]/g, '').trim();
    th.textContent = th.dataset.sort === state.sortKey ? `${base} ${state.sortDir < 0 ? '▾' : '▴'}` : base;
  });
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
  $('#clear-tray').addEventListener('click', () => { state.selected.clear(); renderTray(); renderTerms(); });
  $('#run-selected').addEventListener('click', () => runRank([...state.selected.keys()]));
  $('#run-default').addEventListener('click', () => runRank(null));
  $$('.board th[data-sort]').forEach((th) => th.addEventListener('click', () => sortBoard(th.dataset.sort)));
}

// ---------- utils ----------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

init();
