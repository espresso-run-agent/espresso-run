/* Espresso ratio calculator.
   Part 1: pure logic (no DOM; unit-tested with node, see test/calculator.test.mjs).
   Part 2: the page UI, which only runs when a DOM is present.
   Classic script (no modules) so it works from file://. No network use. */
(function (root) {
  'use strict';

  /* ---------- Part 1: logic ---------- */

  const FIELDS = ['dose', 'yield', 'ratio'];

  // Sanity limits for typed values. Computed values are not limited, only flagged.
  const LIMITS = {
    dose: { min: 1, max: 100, label: 'Dose', unit: 'g' },
    yield: { min: 1, max: 1000, label: 'Yield', unit: 'g' },
    ratio: { min: 0.5, max: 20, label: 'Ratio', unit: '' }
  };
  const BEAN_LIMITS = {
    bag: { min: 10, max: 5000, label: 'Bag size', unit: 'g' },
    dose: LIMITS.dose,
    price: { min: 0.01, max: 100000, label: 'Bag price', unit: '' }
  };

  /* The same ranges as the cheat sheet (ratios.html), which is the source of truth.
     range: the ratio range its dose-to-yield table column uses (x in 1:x).
     band:  the wider band used to name a ratio (the dial-in helper treats 1:1.7 to 1:2.4 as normal).
     typical: where the preset button sets the ratio. time: seconds from pump start. */
  const PRESETS = [
    { id: 'ristretto', label: 'Ristretto', range: [1, 1.5], band: [1, 1.5], typical: 1.25, ratioText: '1:1 to 1:1.5', time: '15 to 25 s' },
    { id: 'normale', label: 'Normale', range: [2, 2], band: [1.7, 2.4], typical: 2, ratioText: '1:2', time: '25 to 30 s' },
    { id: 'lungo', label: 'Lungo', range: [2.5, 4], band: [2.5, 4], typical: 3, ratioText: '1:2.5 to 1:4', time: '35 to 50 s' }
  ];

  const roundTo = (n, dp) => {
    const f = Math.pow(10, dp);
    return Math.round((n + Number.EPSILON) * f) / f;
  };
  const round1 = (n) => roundTo(n, 1);
  const round2 = (n) => roundTo(n, 2);
  const fmt = (n) => String(n);   // values are already rounded; String drops trailing zeros

  // Strict number reading. Blank is not the same as invalid.
  // Accepts a decimal comma ("18,5"). Rejects "12abc", "1e3x", NaN, Infinity.
  function readNumber(v) {
    if (v === null || v === undefined) return { state: 'blank' };
    if (typeof v === 'number') return isFinite(v) ? { state: 'ok', n: v } : { state: 'invalid' };
    if (typeof v !== 'string') return { state: 'invalid' };
    const t = v.trim().replace(',', '.');
    if (t === '') return { state: 'blank' };
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return { state: 'invalid' };
    const n = Number(t);
    return isFinite(n) ? { state: 'ok', n: n } : { state: 'invalid' };
  }

  function limitMessage(lim) {
    return lim.label + ' should be a number between ' + lim.min + ' and ' + lim.max + (lim.unit ? ' ' + lim.unit : '') +
      (lim.label === 'Ratio' ? ' (the x in 1:x).' : '.');
  }

  // Read one field against its limits: {state:'blank'} | {state:'invalid', error} | {state:'ok', n}
  function readField(v, lim) {
    const r = readNumber(v);
    if (r.state === 'ok' && (r.n < lim.min || r.n > lim.max)) return { state: 'invalid', error: limitMessage(lim) };
    if (r.state === 'invalid' && !r.error) r.error = limitMessage(lim);
    return r;
  }

  const fmtGrams = (n) => fmt(n) + ' g';

  // Name a ratio (x in 1:x). Boundaries are inclusive and use the displayed (2-decimal) ratio.
  function classify(ratio) {
    const r = round2(ratio);
    const by = (id) => PRESETS.find((p) => p.id === id);
    const rist = by('ristretto'), norm = by('normale'), lung = by('lungo');
    if (r < rist.band[0]) return { id: 'below-ristretto', label: 'Shorter than ristretto', text: 'Shorter than the usual ristretto range (below 1:1).' };
    if (r <= rist.band[1]) return { id: 'ristretto', label: 'Ristretto', text: 'In the ristretto range (about 1:1 to 1:1.5).' };
    if (r < norm.band[0]) return { id: 'between-ristretto-normale', label: 'Between ristretto and normale', text: 'Between ristretto and normale (about 1:1.5 to 1:1.7).' };
    if (r <= norm.band[1]) return { id: 'normale', label: 'Normale', text: 'In the normale band (about 1:1.7 to 1:2.4, centred on 1:2).' };
    if (r < lung.band[0]) return { id: 'between-normale-lungo', label: 'Between normale and lungo', text: 'Between normale and lungo (about 1:2.4 to 1:2.5).' };
    if (r <= lung.band[1]) return { id: 'lungo', label: 'Lungo', text: 'In the lungo range (about 1:2.5 to 1:4).' };
    return { id: 'above-lungo', label: 'Longer than lungo', text: 'Longer than the usual lungo range (above 1:4).' };
  }

  // Solve for one of dose / yield / ratio from the other two.
  // values: {dose, yield, ratio} as numbers or strings. target: which field to compute;
  // omitted = the single blank field. The target's own value is ignored.
  function solve(values, target) {
    values = values || {};
    const parsed = {};
    FIELDS.forEach((f) => { parsed[f] = readField(values[f], LIMITS[f]); });

    const tgt = FIELDS.indexOf(target) === -1 ? null : target;
    const inputs = FIELDS.filter((f) => f !== tgt);

    for (const f of inputs) {
      if (parsed[f].state === 'invalid') return { ok: false, status: 'invalid', field: f, error: parsed[f].error };
    }
    let t = tgt;
    if (t === null) {
      const blanks = FIELDS.filter((f) => parsed[f].state === 'blank');
      if (blanks.length === 0) return { ok: false, status: 'full', error: 'All three are filled in. Clear one to calculate it, or change one to recalculate.' };
      if (blanks.length > 1) return { ok: false, status: 'incomplete', error: 'Enter any two of dose, yield and ratio and the third is worked out for you.' };
      t = blanks[0];
    }
    const need = FIELDS.filter((f) => f !== t);
    if (need.some((f) => parsed[f].state === 'blank')) {
      return { ok: false, status: 'incomplete', error: 'Enter any two of dose, yield and ratio and the third is worked out for you.' };
    }

    const d = parsed.dose.n, y = parsed.yield.n, r = parsed.ratio.n;
    const out = { dose: d, yield: y, ratio: r };
    if (t === 'yield') out.yield = round1(d * r);
    else if (t === 'dose') out.dose = round1(y / r);
    else out.ratio = round2(y / d);

    const res = {
      ok: true, status: 'ok', target: t,
      dose: out.dose, yield: out.yield, ratio: out.ratio,
      ratioLabel: '1:' + fmt(round2(out.ratio)),
      style: classify(out.ratio)
    };
    const lim = LIMITS[t];
    if (out[t] < lim.min || out[t] > lim.max) {
      res.warning = lim.label + ' of ' + fmt(out[t]) + (lim.unit ? ' ' + lim.unit : '') + ' is outside the range normally used for espresso (' + lim.min + ' to ' + lim.max + (lim.unit ? ' ' + lim.unit : '') + '). Check the numbers you entered.';
    }
    return res;
  }

  /* Which field is calculated? `order` lists the fields the user has typed in, most recent first.
     The two most recent are inputs; the remaining field is calculated. */
  function touch(order, field) {
    return [field].concat((order || []).filter((f) => f !== field && FIELDS.indexOf(f) !== -1)).slice(0, 3);
  }
  function targetFor(order) {
    const o = (order || []).filter((f) => FIELDS.indexOf(f) !== -1);
    if (o.length < 2) return null;
    return FIELDS.find((f) => o.slice(0, 2).indexOf(f) === -1) || null;
  }
  // After a preset button sets the ratio, keep whichever of dose / yield the user typed last
  // (dose if neither) and calculate the other.
  function presetOrder(order) {
    const base = (order || []).find((f) => f === 'dose' || f === 'yield') || 'dose';
    return ['ratio', base];
  }

  // Yield range (g) for a dose and preset, matching the dose-to-yield table on ratios.html.
  function yieldRange(dose, preset) {
    const lo = round1(dose * preset.range[0]);
    const hi = round1(dose * preset.range[1]);
    return { min: lo, max: hi, text: lo === hi ? fmtGrams(lo) : fmt(lo) + ' to ' + fmtGrams(hi) };
  }

  function presetById(id) {
    return PRESETS.find((p) => p.id === id) || null;
  }

  // "At 18 g: ristretto 18 to 27 g, normale 36 g, lungo 45 to 72 g." or null for a bad dose.
  function atAGlance(dose) {
    const r = readField(dose, LIMITS.dose);
    if (r.state !== 'ok') return null;
    const parts = PRESETS.map((p) => p.label.toLowerCase() + ' ' + yieldRange(r.n, p).text);
    return 'At ' + fmtGrams(r.n) + ': ' + parts.join(', ') + '.';
  }

  // Plain-language result line for a solve() result.
  function summary(res) {
    if (!res || !res.ok) return res && res.error ? res.error : '';
    const D = fmtGrams(res.dose), Y = fmtGrams(res.yield), R = res.ratioLabel;
    let line;
    if (res.target === 'yield') line = 'With ' + D + ' of coffee at ' + R + ', stop the shot at about ' + Y + '.';
    else if (res.target === 'dose') line = 'To get ' + Y + ' out at ' + R + ', use about ' + D + ' of coffee.';
    else line = D + ' in and ' + Y + ' out is a ' + R + ' ratio.';
    return line + ' ' + res.style.text;
  }

  // Beans: shots per bag and cost per shot. Currency-neutral. Ignores wasted dial-in shots.
  function beans(input) {
    input = input || {};
    const bag = readField(input.bag, BEAN_LIMITS.bag);
    const dose = readField(input.dose, BEAN_LIMITS.dose);
    const price = readField(input.price, BEAN_LIMITS.price);
    if (bag.state === 'blank' || dose.state === 'blank') {
      return { ok: false, status: 'incomplete', error: 'Enter a bag size and a dose to see shots per bag.' };
    }
    if (bag.state === 'invalid') return { ok: false, status: 'invalid', field: 'bag', error: bag.error };
    if (dose.state === 'invalid') return { ok: false, status: 'invalid', field: 'dose', error: dose.error };
    if (price.state === 'invalid') {
      return { ok: false, status: 'invalid', field: 'price', error: 'Bag price should be a number above 0 (any currency), or leave it blank.' };
    }
    if (dose.n > bag.n) return { ok: false, status: 'invalid', field: 'dose', error: 'The dose is bigger than the bag. Check the bag size and the dose.' };

    const exact = bag.n / dose.n;
    const shots = Math.floor(exact + 1e-9);
    const leftover = Math.max(0, round1(bag.n - shots * dose.n));
    const res = {
      ok: true, status: 'ok',
      bag: bag.n, dose: dose.n,
      shots: shots, exactShots: round1(exact), leftover: leftover,
      costPerShot: null, price: null
    };
    if (price.state === 'ok') {
      res.price = price.n;
      res.costPerShot = round2(price.n * dose.n / bag.n);
    }
    return res;
  }

  function beansSummary(res) {
    if (!res || !res.ok) return res && res.error ? res.error : '';
    let s = fmtGrams(res.bag) + ' bag at ' + fmtGrams(res.dose) + ' per shot: ' + res.shots + (res.shots === 1 ? ' shot' : ' shots') +
      ' (' + fmt(res.exactShots) + ' exactly), about ' + fmtGrams(res.leftover) + ' left over.';
    if (res.costPerShot !== null) {
      s += ' Cost per shot: ' + res.costPerShot.toFixed(2) + ' (in the same currency as the price you entered).';
    } else {
      s += ' Add a bag price to see the cost per shot.';
    }
    return s;
  }

  const api = {
    FIELDS: FIELDS, LIMITS: LIMITS, BEAN_LIMITS: BEAN_LIMITS, PRESETS: PRESETS,
    readNumber: readNumber, classify: classify, solve: solve,
    touch: touch, targetFor: targetFor, presetOrder: presetOrder,
    yieldRange: yieldRange, presetById: presetById, atAGlance: atAGlance, summary: summary,
    beans: beans, beansSummary: beansSummary
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EspressoCalc = api;

  /* ---------- Part 2: UI ---------- */

  if (typeof document === 'undefined') return;

  function init() {
    const form = document.getElementById('ratio-form');
    if (!form) return;
    const el = (id) => document.getElementById(id);
    const inputs = { dose: el('dose'), yield: el('yield'), ratio: el('ratio') };
    const states = { dose: el('dose-state'), yield: el('yield-state'), ratio: el('ratio-state') };
    const out = el('calc-out');
    const warn = el('calc-warn');
    const glance = el('calc-glance');
    const presetNote = el('preset-note');
    const dialLink = el('dialin-link');

    // Fields the user has typed in, most recent first. Dose and ratio start filled in.
    let order = ['ratio', 'dose'];
    let presetId = null;

    const values = () => ({ dose: inputs.dose.value, yield: inputs.yield.value, ratio: inputs.ratio.value });

    function recompute() {
      const target = targetFor(order);
      const res = solve(values(), target);
      FIELDS.forEach((f) => {
        const calc = res.ok && f === res.target;
        inputs[f].classList.toggle('calculated', calc);
        states[f].textContent = calc ? 'calculated' : '';
      });
      if (res.ok) {
        inputs[res.target].value = String(res[res.target]);
        out.textContent = summary(res);
        out.classList.remove('error');
        warn.textContent = res.warning || '';
        glance.textContent = atAGlance(res.dose) || '';
        const p = presetId ? presetById(presetId) : null;
        presetNote.textContent = p ? p.label + ': roughly ' + p.time + ' from pump start. These are starting points, not rules.' : '';
        dialLink.href = 'dial-in.html?dose=' + encodeURIComponent(res.dose) + '&yield=' + encodeURIComponent(res.yield);
        dialLink.hidden = false;
      } else {
        if (target) inputs[target].value = '';
        out.textContent = res.error;
        out.classList.toggle('error', res.status === 'invalid');
        warn.textContent = '';
        glance.textContent = '';
        presetNote.textContent = '';
        dialLink.hidden = true;
      }
      document.querySelectorAll('[data-preset]').forEach((b) => {
        const p = presetById(b.getAttribute('data-preset'));
        const on = !!res.ok && classify(res.ratio).id === p.id;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    FIELDS.forEach((f) => {
      inputs[f].addEventListener('input', function () {
        order = touch(order, f);
        presetId = null;
        recompute();
      });
    });

    document.querySelectorAll('[data-preset]').forEach((b) => {
      b.addEventListener('click', function () {
        const p = presetById(b.getAttribute('data-preset'));
        if (!p) return;
        inputs.ratio.value = String(p.typical);
        order = presetOrder(order);
        presetId = p.id;
        recompute();
      });
    });

    form.addEventListener('submit', (ev) => ev.preventDefault());
    recompute();

    // Beans
    const bform = el('beans-form');
    if (bform) {
      const bi = { bag: el('bag'), dose: el('bean-dose'), price: el('price') };
      const bout = el('beans-out');
      const bupdate = function () {
        const res = beans({ bag: bi.bag.value, dose: bi.dose.value, price: bi.price.value });
        bout.textContent = beansSummary(res);
        bout.classList.toggle('error', !res.ok && res.status === 'invalid');
      };
      Object.keys(bi).forEach((k) => bi[k].addEventListener('input', bupdate));
      bform.addEventListener('submit', (ev) => ev.preventDefault());
      bupdate();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
