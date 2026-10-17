/* "Check your shot" box for the sour and bitter guides.
   Glue only: the advice itself comes from analyze() in dial-in.js, which must be loaded first.
   The taste is fixed per page (data-taste on the form). Classic script, works from file://. */
(function (root) {
  'use strict';

  const round1 = (n) => Math.round(n * 10) / 10;

  // Run analyze() for a fixed taste. `raw` holds the three input values as typed.
  function check(api, taste, raw) {
    return api.analyze({ dose: raw.dose, yield: raw.yield, time: raw.time, taste: taste });
  }

  function el(doc, tag, text, cls) {
    const n = doc.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  // Link to the full helper with the numbers prefilled (dial-in.js reads ?dose=&yield=&time=).
  function logHref(r) {
    return 'dial-in.html?dose=' + encodeURIComponent(r.dose) + '&yield=' + encodeURIComponent(r.yield) + '&time=' + encodeURIComponent(r.time);
  }

  function render(doc, out, r) {
    out.replaceChildren();
    out.hidden = false;
    // The thank-you ask (chipin.js) appears only after advice has been shown.
    const ask = doc.getElementById ? doc.getElementById('chipin-payoff') : null;
    if (ask) ask.hidden = !r.ok;
    if (!r.ok) {
      out.appendChild(el(doc, 'p', r.error, 'error'));
      return;
    }
    const stats = el(doc, 'div', undefined, 'stats');
    const stat = (label, value, status) => {
      const d = el(doc, 'div', undefined, 'stat');
      d.appendChild(el(doc, 'b', value, status ? 'status-' + status : ''));
      d.appendChild(el(doc, 'span', label));
      stats.appendChild(d);
    };
    stat('Ratio', r.ratioLabel, r.ratioStatus === 'ok' ? 'ok' : 'warn');
    stat('Time', round1(r.time) + ' s', r.timeStatus === 'ok' ? 'ok' : 'warn');
    stat('Grind', r.grind === 'keep' ? 'keep' : 'go ' + r.grind);
    if (r.suggestedYield !== null) stat('Try yield', r.suggestedYield + ' g');
    out.appendChild(stats);
    out.appendChild(el(doc, 'h3', r.headline));
    const ol = el(doc, 'ol');
    r.steps.forEach((s) => ol.appendChild(el(doc, 'li', s)));
    out.appendChild(ol);
    const fine = el(doc, 'ul', undefined, 'plain fine');
    r.notes.forEach((s) => fine.appendChild(el(doc, 'li', s)));
    out.appendChild(fine);
    const p = el(doc, 'p', undefined, 'fine');
    const a = el(doc, 'a', 'Log this shot in the dial-in helper');
    a.setAttribute('href', logHref(r));
    p.appendChild(a);
    out.appendChild(p);
  }

  // Read the form, check the shot, show the result.
  function run(doc, form, out, api) {
    const v = (name) => form.elements[name].value;
    render(doc, out, check(api, form.dataset.taste, { dose: v('dose'), yield: v('yield'), time: v('time') }));
  }

  function init() {
    const form = document.getElementById('check-form');
    const out = document.getElementById('check-result');
    if (!form || !out || !root.DialIn) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      run(document, form, out, root.DialIn);
    });
  }

  const api = { check: check, render: render, run: run, logHref: logHref };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TasteCheck = api;

  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
