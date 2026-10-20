/* numbers.html: the public funnel, drawn from numbers.json (written by tools/funnel/numbers.py from the hourly
   snapshots). Part 1 is pure and unit-tested (test/numbers.test.mjs); part 2 draws the page. Classic script. */
(function (root) {
  'use strict';

  /* ---------- Part 1: pure ---------- */

  // The steps from an ad being shown to a payment, each with its share of the step before it.
  function funnel(p) {
    const steps = [
      ['Saw an ad', p.impressions],
      ['Clicked it', p.clicks],
      ['Landed on the site', p.landed],
      ['Stayed and read or used a tool', p.engaged],
      ['Saw a chip-in box', p.seen_ask],
      ['Opened the checkout', p.checkouts_opened],
      ['Paid', p.payments]
    ];
    return steps.map(function (s, i) {
      const prev = i ? steps[i - 1][1] : null;
      return { label: s[0], n: s[1] === null || s[1] === undefined ? null : s[1],
        // Over 100% means the step isn't a subset of the one before (a visitor who opens two pages lands twice): no share.
        share: i && prev && s[1] !== null && s[1] <= prev ? s[1] / prev : null };
    });
  }

  // Shares under 1% keep one significant decimal place so 0.6% doesn't read as 1%.
  function pct(x) {
    if (x === null || x === undefined || !isFinite(x)) return '';
    const v = x * 100;
    return (v >= 10 ? Math.round(v) : v >= 1 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100) + '%';
  }

  const money = (x) => '$' + (Math.round((x || 0) * 100) / 100).toFixed(2);

  // Spend and revenue over time, one point per snapshot: [{t (ms), spend, revenue}].
  function moneySeries(series) {
    return series.map(function (p) {
      return { t: Date.parse(p.ts), spend: p.spend_usd || 0, revenue: p.revenue_usd || 0 };
    }).filter(function (p) { return isFinite(p.t); });
  }

  const api = { funnel: funnel, pct: pct, money: money, moneySeries: moneySeries };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Numbers = api;

  /* ---------- Part 2: the page ---------- */

  if (typeof document === 'undefined' || !document.getElementById('funnel')) return;
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function drawFunnel(steps) {
    const box = $('funnel');
    box.replaceChildren();
    const max = steps[0].n || 1;
    steps.forEach(function (s) {
      const row = el('div', undefined, 'fn-row');
      row.appendChild(el('span', s.label, 'fn-label'));
      const bar = el('span', undefined, 'fn-bar');
      const fill = el('span');
      // Log scale: impressions are thousands of times the clicks, so a linear bar would hide every later step.
      fill.style.width = s.n ? Math.max(2, 100 * Math.log10(1 + s.n) / Math.log10(1 + max)) + '%' : '0';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('b', s.n === null ? '…' : Math.round(s.n).toLocaleString('en-US'), 'fn-n'));
      row.appendChild(el('span', s.share === null ? '' : pct(s.share) + ' of the step before', 'fn-share'));
      box.appendChild(row);
    });
  }

  function drawMoney(pts, budget) {
    const W = 320, H = 150, L = 34, R = 8, T = 12, B = 124;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const top = Math.max(budget, 1);
    const x = (t) => L + (t1 > t0 ? (t - t0) / (t1 - t0) : 0) * (W - L - R);
    const y = (v) => B - (v / top) * (B - T);
    const last = pts[pts.length - 1];
    const s = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'viz-svg', role: 'img',
      'aria-label': 'Ad spend ' + money(last.spend) + ' of a ' + money(budget) + ' budget; revenue ' + money(last.revenue) });
    [0, budget / 2, budget].forEach(function (v) {
      sv('line', { x1: L, y1: y(v), x2: W - R, y2: y(v), class: 'v-grid' }, s);
      sv('text', { x: L - 4, y: y(v) + 3, class: 'v-small', 'text-anchor': 'end' }, s, '$' + Math.round(v));
    });
    sv('polyline', { points: pts.map(function (p) { return x(p.t) + ',' + y(p.spend); }).join(' '), class: 'v-path' }, s);
    sv('polyline', { points: pts.map(function (p) { return x(p.t) + ',' + y(p.revenue); }).join(' '), class: 'v-path v-good' }, s);
    sv('text', { x: x(last.t) - 2, y: y(last.spend) - 6, class: 'v-label', 'text-anchor': 'end' }, s, 'spent ' + money(last.spend));
    sv('text', { x: x(last.t) - 2, y: y(last.revenue) - 6, class: 'v-label', 'text-anchor': 'end' }, s, 'earned ' + money(last.revenue));
    const d = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    sv('text', { x: L, y: H - 8, class: 'v-small' }, s, d(t0));
    sv('text', { x: W - R, y: H - 8, class: 'v-small', 'text-anchor': 'end' }, s, d(t1));
    $('money').replaceChildren(s);
  }

  function drawAds(ads) {
    const tb = $('ads-body');
    tb.replaceChildren();
    ads.filter(function (a) { return a.name !== 'unattributed'; }).forEach(function (a) {
      const tr = el('tr');
      [[a.name, 'Ad'], [Math.round(a.impressions || 0).toLocaleString('en-US'), 'Shown'], [String(Math.round(a.clicks || 0)), 'Clicks'],
        [a.impressions ? pct(a.clicks / a.impressions) : '', 'Click rate'], [money(a.spend_usd), 'Spent'],
        [a.landed === null ? '' : String(Math.round(a.landed)), 'Landed'], [String(Math.round(a.payments || 0)), 'Paid']]
        .forEach(function (c) { const td = el('td', c[0]); td.setAttribute('data-label', c[1]); tr.appendChild(td); });
      tb.appendChild(tr);
    });
  }

  fetch('numbers.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    const last = d.series[d.series.length - 1];
    drawFunnel(funnel(last));
    drawMoney(moneySeries(d.series), d.budget_usd);
    drawAds(d.ads);
    $('n-updated').textContent = new Date(d.updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    $('n-spent').textContent = money(last.spend_usd);
    $('n-earned').textContent = money(last.revenue_usd);
  }).catch(function () {
    $('funnel').textContent = 'The numbers didn\'t load. Try reloading the page.';
  });
})(typeof window !== 'undefined' ? window : globalThis);
