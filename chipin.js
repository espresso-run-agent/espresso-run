/* Shared "chip in" component: the cup, the goal, the supporter count and the one button.
   Part 1 is pure (no DOM; unit-tested with node, see test/chipin.test.mjs): renderChipIn(progress, opts) returns an
   HTML string. Part 2 mounts it into every [data-chipin] element on the page, first with the built-in defaults
   (so it is right on file:// and with no network) and then with progress.json when it can be fetched.
   Only totals and counts are ever shown, never an individual payment. Classic script, works from file://. */
(function (root) {
  'use strict';

  const STRIPE_URL = 'https://buy.stripe.com/fZuaEYclzgD0gyQaTFc7u01';
  const SUGGESTED = 5;
  // Keep DEFAULTS in step with progress.json (a test checks this).
  const DEFAULTS = { raised: 0, supporters: 0, goal: 12 };
  const END = { label: 'Oct 29', date: '2026-10-29' };
  const HONESTY = 'Pay what you want, $1 minimum. Not a charity; not tax-deductible; you get thanks, nothing more.';

  // Cup geometry (viewBox 0 0 120 100). The coffee fills the inside, y from CUP_TOP down to CUP_BOTTOM.
  const CUP_TOP = 26;
  const CUP_BOTTOM = 82;
  const CUP_PATH = 'M18 26 H86 V52 A30 30 0 0 1 56 82 H48 A30 30 0 0 1 18 52 Z';

  /* ---------- Part 1: pure ---------- */

  // Numbers, and numeric strings such as "5" (a hand-edited progress.json), are accepted; everything else is NaN.
  const num = (v) => {
    const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
    return isFinite(n) ? n : NaN;
  };

  // Keep only the fields we use, with sane fallbacks. Anything else in the data (for example per-payment
  // amounts, should it ever appear) is dropped here, so it cannot reach the page.
  function normalize(p) {
    const src = p && typeof p === 'object' ? p : {};
    const raised = num(src.raised);
    const supporters = num(src.supporters);
    const goal = num(src.goal);
    return {
      raised: raised >= 0 ? raised : DEFAULTS.raised,
      supporters: supporters >= 0 ? Math.floor(supporters) : DEFAULTS.supporters,
      goal: goal > 0 ? goal : DEFAULTS.goal
    };
  }

  function money(n) {
    return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
  }

  // 0..100, whole percent, clamped.
  function percent(p) {
    const n = normalize(p);
    return Math.max(0, Math.min(100, Math.round((n.raised / n.goal) * 100)));
  }

  // 'open' | 'funded' | 'ended'. `now` is optional (a Date); without it the end date is not checked.
  function stateOf(p, now) {
    const n = normalize(p);
    if (now instanceof Date && !isNaN(now)) {
      const day = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      if (day > END.date) return 'ended';
    }
    return n.raised >= n.goal ? 'funded' : 'open';
  }

  function supportersText(count) {
    return count + (count === 1 ? ' supporter' : ' supporters');
  }

  function headline(p, now) {
    const n = normalize(p);
    const st = stateOf(p, now);
    if (st === 'ended') return 'This experiment has ended. Thank you' + (n.supporters ? ' to ' + supportersText(n.supporters) : '') + '.';
    if (st === 'funded') return 'The cup is covered. Thank you.';
    return n.supporters === 0
      ? 'No one has chipped in yet. Be the first supporter.'
      : supportersText(n.supporters) + ' so far. Help finish the cup.';
  }

  // "$0 of $12 · ends Oct 29", with "· N supporters" in the middle once there are any.
  function progressLine(p, now) {
    const n = normalize(p);
    const parts = [money(n.raised) + ' of ' + money(n.goal)];
    if (n.supporters > 0) parts.push(supportersText(n.supporters));
    parts.push((stateOf(p, now) === 'ended' ? 'ended ' : 'ends ') + END.label);
    return parts.join(' · ');
  }

  // "$5 covers about 40% of it." rounded to the nearest 5%.
  function coverLine(p) {
    const n = normalize(p);
    const pct = Math.max(1, Math.round(((SUGGESTED / n.goal) * 100) / 5) * 5);
    return money(SUGGESTED) + ' covers about ' + Math.min(100, pct) + '% of it.';
  }

  function cupLabel(p) {
    const n = normalize(p);
    return 'Espresso cup filled to ' + percent(p) + ' percent: ' + money(n.raised) + ' of ' + money(n.goal) + ' raised.';
  }

  // Our own drawing. The "coffee" rises with progress; at 0% the cup is empty with a dashed line at the rim.
  function cupSvg(p, idPrefix) {
    const pct = percent(p);
    const id = (idPrefix || 'chipin') + '-clip';
    const h = Math.round(((CUP_BOTTOM - CUP_TOP) * pct) / 100 * 100) / 100;
    const y = Math.round((CUP_BOTTOM - h) * 100) / 100;
    return '<svg class="chipin-cup" viewBox="0 0 120 100" role="img" aria-label="' + cupLabel(p) + '" data-pct="' + pct + '">' +
      '<defs><clipPath id="' + id + '"><path d="' + CUP_PATH + '"/></clipPath></defs>' +
      '<path class="chipin-handle" d="M86 36 H96 A12 12 0 0 1 96 60 H84" fill="none" stroke-width="5" stroke-linecap="round"/>' +
      '<rect class="chipin-inside" x="10" y="' + CUP_TOP + '" width="90" height="' + (CUP_BOTTOM - CUP_TOP) + '" clip-path="url(#' + id + ')"/>' +
      '<rect class="chipin-coffee" x="10" y="' + y + '" width="90" height="' + h + '" clip-path="url(#' + id + ')"/>' +
      '<path class="chipin-rim" d="' + CUP_PATH + '" fill="none" stroke-width="5" stroke-linejoin="round"/>' +
      '<line class="chipin-full" x1="22" x2="82" y1="' + (CUP_TOP + 5) + '" y2="' + (CUP_TOP + 5) + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      '<path class="chipin-saucer" d="M28 91 H76" stroke-width="5" stroke-linecap="round"/>' +
      '</svg>';
  }

  const BUYS = 'A white porcelain espresso cup from Target ($5), plus about $6 shipping and tax, shipped to John. Total about $12.';

  // The payment link, optionally tagged with where the click came from (see refTag). Stripe keeps the tag on the
  // checkout session, so a payment can be tied to an ad and a page. Nothing is stored in the visitor's browser.
  function payUrl(ref) {
    return ref ? STRIPE_URL + '?client_reference_id=' + ref : STRIPE_URL;
  }

  // "<source>-<ad>-<page>" from a URL's path and query, e.g. "reddit-problem-index" or "direct-agent-rules".
  // Only letters, digits, "_" and "-" survive (Stripe's rule for client_reference_id); at most 200 characters.
  function refTag(pathname, search) {
    const clean = (v) => String(v || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40);
    const q = {};
    String(search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      const i = kv.indexOf('=');
      if (i > 0) { try { q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { /* malformed: ignore */ } }
    });
    const file = String(pathname || '').split('/').pop().replace(/\.html$/, '');
    const parts = [clean(q.utm_source) || 'direct', clean(q.utm_content || q.utm_campaign), file.replace(/[^A-Za-z0-9_-]/g, '') || 'index'];
    return parts.filter(Boolean).join('-').slice(0, 200);
  }

  function button(label, ref) {
    return '<a class="btn" href="' + payUrl(ref) + '" rel="noopener">' + label + '</a>';
  }

  // variant: 'hero' (home page), 'payoff' (after a tool has just helped), 'button' (a button-sized ask inside a card),
  // 'footer' (the one-line ask in every page footer); anything else behaves like 'hero'.
  // Once the experiment is funded or ended, 'button' and 'footer' drop the link and say so.
  function renderChipIn(progress, opts) {
    const o = opts || {};
    const variant = ['payoff', 'button', 'footer'].indexOf(o.variant) >= 0 ? o.variant : 'hero';
    const prefix = o.idPrefix || 'chipin';
    const st = stateOf(progress, o.now);
    const open = st === 'open';
    const status = headline(progress, o.now);
    const ref = o.ref;

    if (variant === 'footer') {
      return open
        ? '<a class="btn small" href="' + payUrl(ref) + '" rel="noopener">Chip in</a> &nbsp;' + HONESTY
        : status;
    }
    if (variant === 'button') {
      return open
        ? '<div class="btn-row">' + button('Help finish the cup: chip in $5 (or any amount)', ref) + '</div><p class="fine">' + HONESTY + '</p>'
        : '<p class="chipin-status">' + status + '</p>';
    }
    const meter = '<p class="chipin-meter"><strong>' + progressLine(progress, o.now) + '</strong></p>';
    const fine = '<p class="fine chipin-fine">' + HONESTY + '</p>';

    if (variant === 'payoff') {
      return '<aside class="chipin chipin-payoff" aria-labelledby="' + prefix + '-t">' +
        '<div class="chipin-cupwrap">' + cupSvg(progress, prefix) + '</div>' +
        '<div class="chipin-body">' +
        (open
          ? '<p class="chipin-lead" id="' + prefix + '-t"><strong>Did that help?</strong> It’s free and stays free. If you’d like to say thanks, $5 helps an AI agent buy John one espresso cup.</p>'
          : '<p class="chipin-lead" id="' + prefix + '-t"><strong>Did that help?</strong> It’s free and stays free.</p>') +
        '<p class="chipin-status">' + status + '</p>' +
        meter +
        (open
          ? '<div class="btn-row">' + button('Chip in $5 (or any amount)', ref) + ' <a class="btn secondary" href="index.html">What is this?</a></div>' + fine
          : '<div class="btn-row"><a class="btn secondary" href="index.html">What is this?</a></div>') +
        '</div></aside>';
    }

    return '<section class="chipin chipin-hero" aria-labelledby="' + prefix + '-t">' +
      '<div class="chipin-cupwrap">' + cupSvg(progress, prefix) + '</div>' +
      '<div class="chipin-body">' +
      '<h2 class="chipin-title" id="' + prefix + '-t">' + status + '</h2>' +
      '<p class="chipin-buys">' + BUYS + '</p>' +
      meter +
      (open
        ? '<p class="chipin-cover">' + coverLine(progress) + '</p>' +
          '<div class="btn-row">' + button('Help finish the cup: chip in $5 (or any amount)', ref) + '</div>' + fine
        : '') +
      '</div></section>';
  }

  const api = {
    STRIPE_URL: STRIPE_URL, SUGGESTED: SUGGESTED, DEFAULTS: DEFAULTS, END: END, HONESTY: HONESTY, BUYS: BUYS,
    normalize: normalize, money: money, percent: percent, stateOf: stateOf, supportersText: supportersText,
    headline: headline, progressLine: progressLine, coverLine: coverLine, cupLabel: cupLabel, cupSvg: cupSvg,
    renderChipIn: renderChipIn, payUrl: payUrl, refTag: refTag
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChipIn = api;

  /* ---------- Part 2: page glue ---------- */

  if (typeof document === 'undefined') return;

  // Render every [data-chipin] slot. The value is the variant ("hero", "payoff", "button" or "footer").
  // A footer slot keeps its own non-button link (for example "The story") after the rendered text.
  function mountAll(progress) {
    const slots = document.querySelectorAll('[data-chipin]');
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const variant = slot.getAttribute('data-chipin');
      if (variant === 'footer' && slot.__chipinExtra === undefined) {
        const link = slot.querySelector('a:not(.btn)');
        slot.__chipinExtra = link ? ' ' + link.outerHTML : '';
      }
      slot.innerHTML = renderChipIn(progress, { variant: variant, idPrefix: 'chipin' + i, now: new Date(), ref: refTag(location.pathname, location.search) }) +
        (variant === 'footer' ? slot.__chipinExtra : '');
    }
  }

  // progress.json, fetched at most once per page; resolves to null when it cannot be read (file://, offline).
  let loading = null;
  function loadProgress() {
    if (!loading) {
      loading = location.protocol === 'file:' || typeof fetch !== 'function'
        ? Promise.resolve(null)
        : fetch('progress.json', { cache: 'no-cache' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
    }
    return loading;
  }
  api.loadProgress = loadProgress;

  function init() {
    mountAll(DEFAULTS);
    loadProgress().then(function (p) { if (p) mountAll(p); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
