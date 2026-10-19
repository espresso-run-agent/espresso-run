/* "Your setup" tool: a first-shot recipe and next-shot fixes in the visitor's own machine and grinder terms.
   Part 1 is pure (no DOM; unit-tested with node, see test/setup.test.mjs). It needs SetupData (setup-data.js)
   and DialIn (dial-in.js), which the page loads first. The taste logic stays in DialIn.analyze; this file only
   adds what depends on the equipment: the basket's dose, the roast's ratio and temperature, the grinder's own
   numbers, and the machine's own controls.
   Part 2 is the page glue. The setup lives in the URL hash (#m=…&g=…&r=…), so nothing is stored.
   Classic script, works from file://. */
(function (root) {
  'use strict';

  const D = root.SetupData || (typeof require === 'function' ? require('./setup-data.js') : null);
  const DI = root.DialIn || (typeof require === 'function' ? require('./dial-in.js') : null);

  /* Starting ratio by roast (Hoffmann, Hedrick, Perger: light runs longer, dark shorter; see notes/setup-research.md). */
  const ROASTS = {
    light: { label: 'Light', ratio: 2.5, why: 'Light roasts are harder to extract: a longer ratio and hotter water.' },
    medium: { label: 'Medium', ratio: 2, why: 'Medium roasts: the classic 1:2.' },
    dark: { label: 'Dark', ratio: 1.8, why: 'Dark roasts extract easily: a shorter ratio and cooler water keep bitterness down.' }
  };
  const TASTES = ['sour', 'balanced', 'bitter', 'weak', 'harsh', 'sourbitter'];

  const byId = (list, id) => (list || []).find((x) => x.id === id) || null;
  const machine = (id) => byId(D.MACHINES, id);
  const grinder = (id) => byId(D.GRINDERS, id);
  const r2 = (n) => Math.round(n * 100) / 100;
  const isNum = (v) => typeof v === 'number' && isFinite(v);

  // Is the basket the visitor should use pressurised (double-wall)?
  function pressurised(m, g) {
    if (!m) return false;
    if (m.baskets === 'pressurised') return true;
    if (m.baskets === 'both') return !g || g.espresso !== 'yes';
    return false;
  }

  // Where to start on this grinder for this roast: light two nudges finer, dark two coarser (our inference from
  // the makers' "lighter roast: finer" advice), kept inside the published espresso range.
  function startSetting(g, roast) {
    if (!g || !isNum(g.start)) return g ? g.start : null;
    const shift = roast === 'light' ? -2 : roast === 'dark' ? 2 : 0;
    let s = g.start + shift * g.nudge;
    if (g.range) s = Math.min(Math.max(s, g.range[0]), g.range[1]);
    return r2(s);
  }

  // Warnings about the combination, most important first. Each: {level: 'stop'|'note', text}.
  function warnings(m, g) {
    const w = [];
    if (!m || !g || m.auto) return w;
    const unpress = m.baskets === 'unpressurised';
    if (g.espresso === 'no') {
      w.push({ level: 'stop', text: g.name + ' can\'t grind fine enough for espresso. ' + (unpress
        ? 'Your machine\'s baskets are unpressurised, so shots will run fast and sour whatever you do. Use pre-ground espresso coffee with a pressurised basket for now, or an espresso grinder.'
        : 'Use the pressurised (double-wall) basket, or pre-ground coffee sold for espresso.') });
    } else if (g.espresso === 'limited' && unpress) {
      w.push({ level: 'stop', text: (g.kind === 'none' ? 'Pre-ground coffee is usually too coarse' : g.name + ' is too coarse-stepped') +
        ' for an unpressurised basket: expect fast, sour shots. A pressurised basket for your machine, or an espresso grinder, fixes it.' });
    }
    if (m.baskets === 'both' && g.espresso === 'yes') {
      w.push({ level: 'note', text: 'Use the single-wall (unpressurised) basket: with a real espresso grinder it gives you control over the shot. Keep the double-wall one for pre-ground coffee.' });
    }
    if (m.baskets === 'both' && g.espresso !== 'yes') {
      w.push({ level: 'note', text: 'Use the double-wall (pressurised) basket with this ' + (g.kind === 'none' ? 'coffee.' : 'grinder.') });
    }
    if (m.baskets === 'pressurised' && g.espresso === 'yes') {
      w.push({ level: 'note', text: 'Your grinder is better than your basket. Stock baskets on this machine are pressurised, so grind changes do little; a ' + (m.basket ? m.basket + ' mm ' : '') + 'single-wall basket is the upgrade that unlocks it.' });
    }
    if (m.builtIn && g.id !== m.builtIn && byId(D.GRINDERS, m.builtIn)) {
      w.push({ level: 'note', text: 'Using a separate grinder instead of the built-in one: fine. Dose by weight, since the Grind Amount dial no longer applies.' });
    }
    return w;
  }

  // The temperature line for this roast, in the machine's own terms.
  function tempLine(m, roast) {
    const t = m.temp || {};
    if ((t.kind === 'pid' || t.kind === 'steps') && t.set) return 'Set ' + t.set[roast] + '. ' + t.how;
    return t.how || '';
  }

  /* The first-shot recipe. Returns {ok, machine, grinder, roast, dose, yield, ratio, ratioLabel, pressurised,
     start, steps[], warnings[], temp, sources[]} or {ok:false, error}. */
  function recipe(mid, gid, roast) {
    const m = machine(mid);
    const g = grinder(gid);
    if (!m) return { ok: false, error: 'Pick your machine.' };
    if (!g) return { ok: false, error: 'Pick your grinder.' };
    roast = ROASTS[roast] ? roast : 'medium';
    const R = ROASTS[roast];
    const sources = [].concat(m.src || [], g.src || []);
    if (m.auto) {
      return {
        ok: true, auto: true, machine: m, grinder: g, roast: roast, dose: null, yield: null, ratio: null,
        ratioLabel: '', pressurised: false, start: null, warnings: [], temp: tempLine(m, roast),
        steps: [tempLine(m, roast), m.stop].concat(m.notes || []).filter(Boolean), sources: sources
      };
    }
    const press = pressurised(m, g);
    const ratio = press ? 2 : R.ratio;
    const dose = m.dose;
    const yld = Math.round(dose * ratio);
    const start = g.kind === 'none' ? null : startSetting(g, roast);
    const steps = [];
    steps.push('Weigh ' + dose + ' g of coffee (' + m.doseNote + ').');
    if (g.kind !== 'none') {
      if (g.zero) steps.push(g.zero);
      if (start !== null && start !== undefined) {
        steps.push('Grind at ' + g.unit + ' ' + start + (g.range ? ' (this grinder\'s espresso range is about ' + g.range[0] + ' to ' + g.range[1] + ')' : '') +
          (roast !== 'medium' && isNum(g.start) && start !== g.start ? ', a little ' + (roast === 'light' ? 'finer' : 'coarser') + ' than the medium-roast start of ' + g.start : '') + '.');
      } else if (g.espresso === 'yes') {
        steps.push('Start a little coarser than where the burrs touch, and dial in from there.');
      }
    }
    if (m.temp && m.temp.kind !== 'fixed') steps.push(tempLine(m, roast));
    if (m.preinfusion) steps.push(m.preinfusion);
    steps.push('Stop the shot at ' + yld + ' g in the cup (1:' + ratio + '). ' + m.stop);
    if (m.flowStart) steps.push('Check: the first drips should appear after about ' + m.flowStart[0] + ' to ' + m.flowStart[1] + ' s. Much sooner means grind finer; much later, coarser.');
    steps.push('Taste it, then tell this page how it tasted below.');
    return {
      ok: true, auto: false, machine: m, grinder: g, roast: roast, dose: dose, yield: yld, ratio: ratio,
      ratioLabel: '1:' + ratio, pressurised: press, start: start, warnings: warnings(m, g),
      temp: tempLine(m, roast), steps: steps, notes: [R.why].concat(m.notes || [], g.tips || []), sources: sources
    };
  }

  // One grind move on this grinder, from a setting, in its own words: "a lower number: from 15 to 14".
  function grindMove(g, dir, setting) {
    if (!g || g.kind === 'none') return null;
    const n = typeof setting === 'string' ? parseFloat(setting) : setting;
    const word = dir === 'finer' ? g.finer : (g.finer || '').replace(/lower/g, 'higher').replace(/fewer/g, 'more').replace(/clockwise/g, 'anticlockwise').replace(/up one letter/g, 'down one letter').replace(/toward A/g, 'toward I');
    const out = { dir: dir, how: word, from: null, to: null, atLimit: false, text: '' };
    const step = g.nudge || 1;
    if (isNum(n) && g.kind !== 'none') {
      let to = r2(dir === 'finer' ? n - step : n + step);
      if (g.range && dir === 'finer' && n <= g.range[0]) out.atLimit = true;
      if (g.range && dir === 'coarser' && n >= g.range[1]) out.atLimit = true;
      if (to < 0) to = 0;
      out.from = r2(n); out.to = to;
      out.text = 'Grind ' + dir + ': ' + word + ', from ' + out.from + ' to ' + to + '.';
      if (g.kind === 'stepless') out.text += ' On a stepless dial that is a small move; half of it is fine too.';
    } else {
      out.text = 'Grind one small step ' + dir + ': ' + word + '.';
    }
    if (out.atLimit && dir === 'finer') {
      const tip = (g.tips || []).find((t) => /burr|shim/i.test(t));
      out.text += ' You are already at the fine end of the usual range. ' + (tip || 'Check the grinder\'s zero, and the beans\' freshness.');
    }
    return out;
  }

  // Machine-specific temperature advice for a taste, or null.
  function tempFix(m, taste) {
    const t = m.temp || {};
    const up = taste === 'sour';
    if (taste !== 'sour' && taste !== 'bitter' && taste !== 'harsh') return null;
    const dir = up ? 'hotter' : 'cooler';
    if (t.kind === 'fixed') return 'Temperature: this machine sets it for you, so the ratio and grind are your levers.';
    if (t.kind === 'pid') return 'Only if the grind and yield changes don\'t fix it, go 1 to 2 °C ' + dir + '. ' + t.how;
    if (t.kind === 'steps') return 'Only if the grind and yield changes don\'t fix it, one setting ' + dir + '. ' + t.how;
    if (t.kind === 'surf') return 'Only after the grind and yield: ' + (up ? 'brew sooner after the ready light, with a shorter flush' : 'flush a little longer before the shot') + '. ' + t.how;
    if (t.kind === 'kettle') return up ? 'Only after the grind and yield: preheat longer and use water straight off the boil.' : 'Only after the grind and yield: let the water sit 30 s off the boil.';
    return null;
  }

  /* Next-shot fix. shot = {dose, yield, time, taste, setting}. Taste 'sourbitter' (both at once) means uneven
     extraction (Rao, Hedrick): puck prep first, then a slightly coarser grind with a longer ratio. */
  function fix(mid, gid, roast, shot) {
    const m = machine(mid);
    const g = grinder(gid);
    if (!m || !g) return { ok: false, error: 'Pick your machine and grinder first.' };
    shot = shot || {};
    const taste = String(shot.taste || '').toLowerCase();
    if (TASTES.indexOf(taste) === -1) return { ok: false, error: 'Pick how the shot tasted.' };
    const mixed = taste === 'sourbitter';
    const a = DI.analyze({ dose: shot.dose, yield: shot.yield, time: shot.time, taste: mixed ? 'bitter' : taste });
    if (!a.ok) return a;
    const press = pressurised(m, g);
    const steps = [];
    let headline = a.headline;
    let grind = a.grind;
    let base = a.steps.filter((s) => !/If your machine lets you/.test(s) && !/brew temperature/.test(s));

    if (mixed) {
      headline = 'Sour and bitter at once: uneven extraction.';
      grind = 'coarser';
      const longer = Math.round(a.dose * Math.min(a.ratio + 0.3, 3) * 10) / 10;
      base = [
        'Some of the coffee is over-extracted and some under: water is finding channels. ' + 'Spread the grounds evenly, break up clumps with a needle (WDT), and tamp level.',
        'Then grind a touch coarser and let the shot run a little longer, to about ' + longer + ' g. A finer grind usually makes channeling worse, not better.'
      ];
    }
    if (press && grind !== 'keep') {
      steps.push('Your basket is pressurised, so the grind has only a small effect. Change the yield or dose first; if you change the grind, make it a bigger move than usual.');
    }
    let move = null;
    if (grind !== 'keep' && g.kind !== 'none') {
      move = grindMove(g, grind, shot.setting);
      // Replace DialIn's generic "Grind one small step finer/coarser." with the move on their dial.
      const re = /^Grind one small step (finer|coarser)\./;
      let replaced = false;
      base = base.map((s) => {
        if (!replaced && re.test(s)) { replaced = true; return s.replace(re, move.text); }
        return s;
      });
      if (!replaced) base.push(move.text);
    } else if (grind !== 'keep' && g.kind === 'none') {
      base = base.map((s) => s.replace(/^Grind one small step (finer|coarser)\./, grind === 'finer' ? 'You can\'t grind finer with pre-ground coffee: add 1 g to the dose instead.' : 'You can\'t grind coarser with pre-ground coffee: take 1 g off the dose instead.'));
    }
    const t = tempFix(m, mixed ? 'bitter' : taste);
    const all = steps.concat(base);
    if (t && taste !== 'balanced') all.push(t);
    return {
      ok: true, headline: headline, grind: grind, move: move, pressurised: press, steps: all,
      ratioLabel: a.ratioLabel, timeStatus: a.timeStatus, ratioStatus: a.ratioStatus,
      suggestedYield: mixed ? Math.round(a.dose * Math.min(a.ratio + 0.3, 3) * 10) / 10 : a.suggestedYield,
      nextSetting: move && move.to !== null ? move.to : null, time: a.time, dose: a.dose, yield: a.yield
    };
  }

  // URL hash <-> setup. Only known ids are accepted.
  function parseHash(hash) {
    const p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const m = machine(p.get('m'));
    const g = grinder(p.get('g'));
    const r = ROASTS[p.get('r')] ? p.get('r') : 'medium';
    return { m: m ? m.id : '', g: g ? g.id : '', r: r };
  }
  function toHash(s) {
    const p = new URLSearchParams();
    if (s.m) p.set('m', s.m);
    if (s.g) p.set('g', s.g);
    if (s.r && s.r !== 'medium') p.set('r', s.r);
    const q = p.toString();
    return q ? '#' + q : '';
  }

  // A source string to {href, secondary}.
  function source(s) {
    const sec = s.indexOf('sec:') === 0;
    return { href: sec ? s.slice(4) : s, secondary: sec };
  }

  const api = {
    ROASTS: ROASTS, TASTES: TASTES, recipe: recipe, fix: fix, grindMove: grindMove, warnings: warnings,
    pressurised: pressurised, startSetting: startSetting, parseHash: parseHash, toHash: toHash, source: source
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Setup = api;

  /* ---------- Part 2: page glue ---------- */

  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const form = $('setup-form');
  if (!form) return;
  const count = (stage) => { if (root.Count && root.Count.send) root.Count.send(stage); };

  function el(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function fill(select, list, placeholder) {
    select.appendChild(new Option(placeholder, ''));
    list.forEach((x) => select.appendChild(new Option(x.name, x.id)));
  }
  fill($('machine'), D.MACHINES, 'Choose your machine…');
  fill($('grinder'), D.GRINDERS, 'Choose your grinder…');

  function state() {
    const r = form.querySelector('input[name="roast"]:checked');
    return { m: $('machine').value, g: $('grinder').value, r: r ? r.value : 'medium' };
  }
  function setState(s) {
    $('machine').value = s.m; $('grinder').value = s.g;
    const r = form.querySelector('input[name="roast"][value="' + s.r + '"]');
    if (r) r.checked = true;
  }

  function sourcesList(srcs) {
    const ul = el('ul', undefined, 'plain fine sources');
    srcs.forEach((s) => {
      const x = source(s);
      const li = el('li');
      const a = el('a', x.href.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]);
      a.href = x.href; a.rel = 'noopener';
      li.appendChild(a);
      if (x.secondary) li.appendChild(document.createTextNode(' (secondary source)'));
      ul.appendChild(li);
    });
    return ul;
  }

  let current = null;
  function render() {
    const s = state();
    const out = $('recipe');
    if (s.m && !s.g) {
      const m = machine(s.m);
      if (m && m.builtIn && !$('grinder').dataset.touched) { $('grinder').value = m.builtIn; s.g = m.builtIn; }
    }
    if (!s.m || !s.g) { out.hidden = true; $('shot-form').hidden = true; return; }
    const r = recipe(s.m, s.g, s.r);
    current = r;
    out.replaceChildren();
    out.hidden = false;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + toHash(s));
    count('recipe');
    out.appendChild(el('h2', 'Your first shot', ''));
    out.querySelector('h2').id = 'recipe-h';
    if (!r.auto) {
      const stats = el('div', undefined, 'stats');
      const stat = (label, value) => { const d = el('div', undefined, 'stat'); d.appendChild(el('b', String(value))); d.appendChild(el('span', label)); stats.appendChild(d); };
      stat('Dose', r.dose + ' g');
      stat('Yield', r.yield + ' g');
      stat('Ratio', r.ratioLabel);
      if (r.start !== null && r.start !== undefined) stat(r.grinder.unit.replace(/^\w/, (c) => c.toUpperCase()), r.start);
      out.appendChild(stats);
    }
    r.warnings.forEach((w) => out.appendChild(el('p', w.text, w.level === 'stop' ? 'warn-box' : 'note-box')));
    const ol = el('ol');
    r.steps.forEach((t) => ol.appendChild(el('li', t)));
    out.appendChild(ol);
    if (r.notes && r.notes.length) {
      const ul = el('ul', undefined, 'plain fine');
      r.notes.forEach((t) => ul.appendChild(el('li', t)));
      out.appendChild(ul);
    }
    const det = el('details');
    det.appendChild(el('summary', 'Where these numbers come from'));
    det.appendChild(el('p', 'The dose, controls and settings come from the makers\' manuals where they publish them; "secondary" marks a retailer or review used where they don\'t. Grinders vary from unit to unit, so treat the grind number as a starting point.', 'fine'));
    det.appendChild(sourcesList(r.sources));
    out.appendChild(det);
    const link = el('p', undefined, 'fine');
    link.appendChild(document.createTextNode('Bookmark this page to keep your setup: it is saved in the link, not in your browser.'));
    out.appendChild(link);

    const card = $('shot-form');
    card.hidden = !!r.auto;
    if (!r.auto) {
      $('s-dose').value = r.dose; $('s-yield').value = r.yield;
      const sg = $('s-setting');
      sg.closest('div').hidden = r.grinder.kind === 'none';
      if (r.start !== null && r.start !== undefined && !sg.dataset.touched) sg.value = r.start;
      $('s-setting-label').textContent = 'Grinder ' + (r.grinder.unit || 'setting');
    }
  }

  function renderFix(e) {
    if (e) e.preventDefault();
    const s = state();
    const t = form.ownerDocument.querySelector('input[name="s-taste"]:checked');
    const f = fix(s.m, s.g, s.r, { dose: $('s-dose').value, yield: $('s-yield').value, time: $('s-time').value, taste: t ? t.value : '', setting: $('s-setting').value });
    const out = $('fix');
    out.replaceChildren();
    out.hidden = false;
    const ask = $('chipin-payoff');
    if (ask) ask.hidden = !f.ok;
    if (!f.ok) { out.appendChild(el('p', f.error, 'error')); return; }
    count('fix');
    out.appendChild(el('h3', f.headline));
    const ol = el('ol');
    f.steps.forEach((x) => ol.appendChild(el('li', x)));
    out.appendChild(ol);
    if (f.nextSetting !== null) {
      const b = el('button', 'Pulled it? Set ' + current.grinder.unit + ' to ' + f.nextSetting + ' and check the next shot', 'btn secondary');
      b.type = 'button';
      b.addEventListener('click', () => { $('s-setting').value = f.nextSetting; $('s-time').value = ''; out.hidden = true; $('s-time').focus(); });
      out.appendChild(b);
    }
  }

  ['machine', 'grinder'].forEach((id) => $(id).addEventListener('change', () => {
    $(id).dataset.touched = '1';
    const v = $(id).value;
    if (v) count('pick-' + id[0] + '-' + v);
    render();
  }));
  form.querySelectorAll('input[name="roast"]').forEach((r) => r.addEventListener('change', render));
  $('s-setting').addEventListener('input', () => { $('s-setting').dataset.touched = '1'; });
  $('shot-form').addEventListener('submit', renderFix);
  form.addEventListener('submit', (e) => { e.preventDefault(); render(); });

  const initial = parseHash(location.hash);
  if (initial.m || initial.g) {
    if (initial.g) $('grinder').dataset.touched = '1';
    setState(initial);
    render();
  }
})(typeof window !== 'undefined' ? window : globalThis);
