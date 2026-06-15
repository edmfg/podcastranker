// ---------------------------------------------------------------------------
// Emit a static, client-sortable leaderboard.html (Tailwind CDN). No build step.
// ---------------------------------------------------------------------------
import { BELOW_THRESHOLD_LABEL } from './config.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderLeaderboard(rows, meta = {}) {
  const generated = meta.generatedAt || '';
  const keywords = (meta.keywords || []).map(esc).join(', ');

  const tbody = rows
    .map((r, i) => {
      const ls = r.listen_score == null
        ? `<span class="text-amber-600" title="Listen Score only exists for the top ~10% of shows">${BELOW_THRESHOLD_LABEL}</span>`
        : esc(r.listen_score);
      return `<tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-3 py-2 tabular-nums text-slate-400">${i + 1}</td>
        <td class="px-3 py-2 font-medium">${esc(r.show)}${r.author ? `<div class="text-xs text-slate-400">${esc(r.author)}</div>` : ''}</td>
        <td class="px-3 py-2 tabular-nums" data-sort="${r.frequency_score}">${esc(r.frequency_score)}</td>
        <td class="px-3 py-2 tabular-nums text-slate-500">${esc(r.matching_eps)}</td>
        <td class="px-3 py-2 text-slate-500">${esc(r.last_match_date || '—')}</td>
        <td class="px-3 py-2 tabular-nums" data-sort="${r.listen_score ?? -1}">${ls}</td>
        <td class="px-3 py-2 tabular-nums text-slate-500">${esc(r.global_rank ?? '—')}</td>
        <td class="px-3 py-2 tabular-nums" data-sort="${r.blended}">${esc(r.blended)}</td>
      </tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI-in-Business Podcast Leaderboard</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans">
<div class="max-w-6xl mx-auto px-4 py-10">
  <h1 class="text-2xl font-bold">AI-in-Business Podcast Leaderboard</h1>
  <p class="text-sm text-slate-500 mt-1">Topic frequency (Podcast Index) × audience proxy (Listen Notes). Click a column header to sort.</p>
  <p class="text-xs text-slate-400 mt-2">Generated ${esc(generated)} · Keywords: ${keywords}</p>
  <p class="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
    <strong>Listen Score</strong> is a modeled popularity proxy (0–100, like Nielsen ratings) — <em>not</em> a download or listener count. It exists only for roughly the top 10% of shows; others show "${BELOW_THRESHOLD_LABEL}".
  </p>

  <table class="w-full mt-6 text-sm bg-white rounded-lg shadow-sm overflow-hidden">
    <thead class="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
      <tr>
        <th class="px-3 py-2">#</th>
        <th class="px-3 py-2 cursor-pointer" data-col="1" data-type="text">Show</th>
        <th class="px-3 py-2 cursor-pointer" data-col="2" data-type="num">Freq score ▾</th>
        <th class="px-3 py-2 cursor-pointer" data-col="3" data-type="num">Matching eps</th>
        <th class="px-3 py-2 cursor-pointer" data-col="4" data-type="text">Last match</th>
        <th class="px-3 py-2 cursor-pointer" data-col="5" data-type="num">Listen score</th>
        <th class="px-3 py-2 cursor-pointer" data-col="6" data-type="num">Global rank</th>
        <th class="px-3 py-2 cursor-pointer" data-col="7" data-type="num">Blended</th>
      </tr>
    </thead>
    <tbody id="tbody">
${tbody}
    </tbody>
  </table>
</div>

<script>
  const tbody = document.getElementById('tbody');
  const getVal = (tr, col, type) => {
    const cell = tr.children[col];
    if (type === 'num') {
      const v = cell.querySelector('[data-sort]')?.getAttribute('data-sort') ?? cell.dataset.sort ?? cell.textContent;
      return parseFloat(v) || 0;
    }
    return cell.textContent.trim().toLowerCase();
  };
  document.querySelectorAll('th[data-col]').forEach((th) => {
    let dir = -1;
    th.addEventListener('click', () => {
      const col = +th.dataset.col, type = th.dataset.type;
      dir = -dir;
      const rows = [...tbody.querySelectorAll('tr')];
      rows.sort((a, b) => {
        const va = getVal(a, col, type), vb = getVal(b, col, type);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
      rows.forEach((r, i) => { r.children[0].textContent = i + 1; tbody.appendChild(r); });
    });
  });
</script>
</body>
</html>`;
}
