// Renders the platform-rules table on agent-rules.html from the JSON embedded in the page
// (#rules-data). The same pure functions build the static <noscript> table and the summary
// line at build time (tools/rules/embed.mjs), so the two cannot drift apart.
(function (root) {
  'use strict';

  const VERDICTS = [
    { id: 'yes', label: 'Yes', mark: '✓' },
    { id: 'yes-with-conditions', label: 'Yes, with conditions', mark: '◐' },
    { id: 'no', label: 'No', mark: '✕' },
    { id: 'unclear', label: 'Unclear', mark: '?' }
  ];
  const CATEGORIES = ['social', 'forum', 'community', 'directory/list', 'hosting', 'publishing', 'other'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Only https links become hrefs; anything else (javascript:, data:, http:, relative) turns into '#'.
  function safeUrl(u) {
    return /^https:\/\/\S/i.test(String(u)) ? String(u) : '#';   // esc() still runs on the result
  }

  function verdictById(id) {
    return VERDICTS.find((v) => v.id === id) || VERDICTS[3];
  }

  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return String(iso);
    return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }

  function counts(rows) {
    const c = { total: rows.length, yes: 0, 'yes-with-conditions': 0, no: 0, unclear: 0 };
    rows.forEach((r) => { if (r.verdict in c) c[r.verdict] += 1; });
    return c;
  }

  // "Of 45 platforms, 1 allows it, 16 with conditions, 20 say no, 8 unclear."
  function summaryText(rows) {
    const c = counts(rows);
    return 'Of ' + c.total + ' platforms, ' + c.yes + (c.yes === 1 ? ' allows' : ' allow') + ' it, ' +
      c['yes-with-conditions'] + ' with conditions, ' + c.no + ' say no, ' + c.unclear + ' unclear.';
  }

  function filterRows(rows, f) {
    const verdict = (f && f.verdict) || 'all';
    const category = (f && f.category) || 'all';
    return rows.filter((r) => (verdict === 'all' || r.verdict === verdict) && (category === 'all' || r.category === category));
  }

  function sortRows(rows, dir) {
    const out = rows.slice().sort((a, b) => a.platform.toLowerCase().localeCompare(b.platform.toLowerCase(), 'en'));
    return dir === 'desc' ? out.reverse() : out;
  }

  function rowHtml(r) {
    const v = verdictById(r.verdict);
    const quote = r.rule_quote
      ? '<span class="rq">“' + esc(r.rule_quote) + '”</span>'
      : '<span class="rq none">No exact quote on file.</span>';
    const note = r.note ? '<div class="fine rules-note">' + esc(r.note) + '</div>' : '';
    return '<tr>' +
      '<td data-label="Platform"><a href="' + esc(safeUrl(r.url)) + '" rel="noopener">' + esc(r.platform) + '</a></td>' +
      '<td data-label="Category">' + esc(r.category) + '</td>' +
      '<td data-label="Verdict"><span class="badge badge-' + esc(r.verdict) + '"><span aria-hidden="true">' + v.mark + '</span> ' + esc(v.label) + '</span></td>' +
      '<td data-label="Conditions">' + esc(r.conditions) + note + '</td>' +
      '<td data-label="Rule quote">' + quote + ' <a class="rules-source" href="' + esc(safeUrl(r.source_url)) + '" rel="noopener">source</a></td>' +
      '<td data-label="Checked"><time datetime="' + esc(r.checked) + '">' + esc(formatDate(r.checked)) + '</time></td>' +
      '</tr>';
  }

  function tableHtml(rows) {
    const head = '<thead><tr><th scope="col">Platform</th><th scope="col">Category</th><th scope="col">Verdict</th>' +
      '<th scope="col">Conditions</th><th scope="col">Rule quote and source</th><th scope="col">Checked</th></tr></thead>';
    const body = rows.length
      ? rows.map(rowHtml).join('')
      : '<tr><td colspan="6">No platform matches both filters.</td></tr>';
    return '<div class="table-scroll"><table class="ref rules"><caption>Each verdict answers: may an AI-operated account post its own project here? ' +
      'Quotes are excerpts from the platform’s own page; [...] joins separate excerpts.</caption>' +
      head + '<tbody>' + body + '</tbody></table></div>';
  }

  function button(kind, value, label, pressed) {
    return '<button type="button" class="chip-btn" data-kind="' + kind + '" data-value="' + esc(value) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '">' + esc(label) + '</button>';
  }

  function controlsHtml(rows) {
    const c = counts(rows);
    const vb = [button('verdict', 'all', 'All (' + c.total + ')', true)].concat(
      VERDICTS.map((v) => button('verdict', v.id, v.label + ' (' + c[v.id] + ')', false)));
    const present = CATEGORIES.filter((k) => rows.some((r) => r.category === k));
    const cb = [button('category', 'all', 'All', true)].concat(
      present.map((k) => button('category', k, k + ' (' + rows.filter((r) => r.category === k).length + ')', false)));
    return '<div class="rules-filter" role="group" aria-label="Filter by verdict"><span class="rules-filter-label">Verdict</span>' + vb.join('') + '</div>' +
      '<div class="rules-filter" role="group" aria-label="Filter by category"><span class="rules-filter-label">Category</span>' + cb.join('') + '</div>' +
      '<div class="rules-filter" role="group" aria-label="Sort"><span class="rules-filter-label">Sort</span>' +
      '<button type="button" class="chip-btn" data-kind="sort" data-value="asc" aria-pressed="false">Platform: A to Z</button></div>';
  }

  function statusText(shown, total) {
    return 'Showing ' + shown + ' of ' + total + ' platforms.';
  }

  const api = {
    VERDICTS: VERDICTS, CATEGORIES: CATEGORIES,
    esc: esc, safeUrl: safeUrl, formatDate: formatDate, counts: counts, summaryText: summaryText,
    filterRows: filterRows, sortRows: sortRows, rowHtml: rowHtml, tableHtml: tableHtml,
    controlsHtml: controlsHtml, statusText: statusText
  };

  /* ---------- UI ---------- */

  function init(doc) {
    const dataEl = doc.getElementById('rules-data');
    const app = doc.getElementById('rules-app');
    if (!dataEl || !app) return null;
    const rows = JSON.parse(dataEl.textContent);
    const controls = doc.getElementById('rules-controls');
    const table = doc.getElementById('rules-table');
    const status = doc.getElementById('rules-status');
    const summary = doc.getElementById('rules-summary');
    const state = { verdict: 'all', category: 'all', dir: 'asc' };

    function draw() {
      const view = sortRows(filterRows(rows, state), state.dir);
      table.innerHTML = tableHtml(view);
      status.textContent = statusText(view.length, rows.length);
      controls.querySelectorAll('button').forEach((b) => {
        const kind = b.getAttribute('data-kind');
        const value = b.getAttribute('data-value');
        if (kind === 'sort') {
          b.setAttribute('aria-pressed', state.dir === 'desc' ? 'true' : 'false');
          b.textContent = state.dir === 'desc' ? 'Platform: Z to A' : 'Platform: A to Z';
        } else {
          b.setAttribute('aria-pressed', state[kind] === value ? 'true' : 'false');
        }
      });
    }

    function onClick(e) {
      const b = e.target && e.target.closest ? e.target.closest('button[data-kind]') : null;
      if (!b) return;
      const kind = b.getAttribute('data-kind');
      const value = b.getAttribute('data-value');
      if (kind === 'sort') state.dir = state.dir === 'asc' ? 'desc' : 'asc';
      else state[kind] = value;
      draw();
    }

    summary.textContent = summaryText(rows);
    controls.innerHTML = controlsHtml(rows);
    controls.addEventListener('click', onClick);
    app.hidden = false;
    draw();
    return { state: state, rows: rows, click: onClick };
  }

  api.init = init;

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AgentRules = api;

  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);
})(typeof window !== 'undefined' ? window : globalThis);
