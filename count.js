/* Anonymous funnel counts through GoatCounter (https://www.goatcounter.com): no cookies, nothing stored in the
   browser, no personal data. Each event is named "<stage>.<tag>", where the tag is the same label the chip-in
   button gives Stripe (ChipIn.refTag, for example "reddit-live-diary"), and each is sent at most once per page load:
     land          the page loaded
     engage        the visitor used a tool or scrolled at least halfway down
     tool          the visitor submitted a form (the shot checker, the calculator, ...)
     seen          a chip-in box (not the footer line) was at least half on screen for a second
     chip          a chip-in box's button was clicked (cross-checks the checkouts Stripe reports)
     chipf         the footer line's chip-in button was clicked (no box was seen first, so counted apart)
     v10           the tab stayed visible for 10 seconds (GA4's "engaged" line; reading without touching counts)
     t10 … t120    active time on the page reached 10, 30, 60 or 120 seconds (tab visible, input in the last 5 s;
                   nothing counts before the first input)
     d25 … d100    after a real scroll, the bottom of the screen reached 25, 50, 75 or 100% of the page
     sec-<id>      the section heading <h2 id> came on screen
     go-<page>     a link to another page of this site was clicked
     out-<host>    a link to another site (not Stripe) was clicked
     recipe, fix   the setup page showed a first-shot recipe / a next-shot fix
     pull, share   the setup page shot timer was stopped / a Good recipe was shared (no content sent)
     pick-m-<id>, pick-g-<id>, pick-c-<id>   the setup page's machine / grinder / coffee list was set to that model (a model id from
                   setup-data.js, never anything typed)
     good-<grinder>-<roast>-<setting>   on the setup page, a shot marked "Good": the grinder model id, the roast
                   and the grinder setting, only when the setting is a plain number (Setup.goodEvent)
   Each hit also carries the screen width, so GoatCounter can split any step by phone / tablet / desktop.
   Part 1 is pure and unit-tested (test/count.test.mjs); part 2 wires it to the page. Classic script. */
(function (root) {
  'use strict';

  // The GoatCounter site code; empty means counting is off.
  const CODE = 'espresso-run-agent';
  const STAGES = ['land', 'engage', 'tool', 'seen', 'chip', 'chipf', 'v10'];
  const TIME_MARKS = [10, 30, 60, 120];
  const DEPTH_MARKS = [25, 50, 75, 100];
  const IDLE_MS = 5000;

  /* ---------- Part 1: pure ---------- */

  const clean = (v, n) => String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, n);

  function eventName(stage, tag) {
    return clean(stage, 60) + '.' + (clean(tag, 200) || 'direct-index');
  }

  function countUrl(code, name, title, width) {
    return 'https://' + code + '.goatcounter.com/count?e=true&p=' + encodeURIComponent(name) +
      '&t=' + encodeURIComponent(title || name) + (width > 0 ? '&s=' + Math.round(width) : '') +
      '&rnd=' + Math.random().toString(36).slice(2, 8);
  }

  // Only count real visits to the live site: not file://, not local copies, not automated browsers.
  function shouldCount(code, loc, nav) {
    if (!code || !loc || loc.protocol !== 'https:') return false;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname)) return false;
    return !(nav && nav.webdriver);
  }

  // Share of the page seen so far, in percent: the bottom of the screen over the page height.
  function depthPercent(scrollY, innerHeight, scrollHeight) {
    return Math.max(0, Math.min(100, Math.round(100 * (scrollY + innerHeight) / Math.max(1, scrollHeight))));
  }

  // Depth marks newly passed: depthMarks(80, {25: true}) -> [50, 75].
  function depthMarks(pct, done) {
    return DEPTH_MARKS.filter(function (m) { return pct >= m && !(done && done[m]); });
  }

  // What a link click means, or null when it isn't counted: 'go-<page>' (this site), 'out-<host>' (elsewhere).
  // Stripe links are the chip-in ('chip'), counted separately; in-page anchors and mailto: are ignored.
  function linkStage(href, here) {
    let u;
    try { u = new URL(href, here); } catch (e) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.hostname === 'buy.stripe.com') return 'chip';
    const h = new URL(here);
    if (u.hostname === h.hostname) {
      if (u.pathname === h.pathname) return null;
      const page = u.pathname.replace(/\/$/, '/index').split('/').filter(Boolean).slice(-2).join('_').replace(/\.html$/, '');
      return 'go-' + (clean(page, 40) || 'index');
    }
    return 'out-' + clean(u.hostname.replace(/^www\./, '').replace(/\./g, '_'), 40);
  }

  // Copy utm_* parameters from the current query onto a same-site link that has none of its own.
  function carryUtm(href, search) {
    let u;
    try { u = new URL(href); } catch (e) { return href; }
    const from = new URLSearchParams(search || '');
    if ([...u.searchParams.keys()].some(function (k) { return k.indexOf('utm_') === 0; })) return href;
    let added = false;
    from.forEach(function (v, k) { if (k.indexOf('utm_') === 0) { u.searchParams.set(k, v); added = true; } });
    return added ? u.toString() : href;
  }

  const api = {
    CODE: CODE, STAGES: STAGES, TIME_MARKS: TIME_MARKS, DEPTH_MARKS: DEPTH_MARKS, IDLE_MS: IDLE_MS,
    eventName: eventName, countUrl: countUrl, shouldCount: shouldCount, depthPercent: depthPercent,
    depthMarks: depthMarks, linkStage: linkStage, carryUtm: carryUtm,
    send: function () {}   // replaced by the real sender below when counting is on
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Count = api;

  /* ---------- Part 2: page glue ---------- */

  if (typeof document === 'undefined' || !shouldCount(CODE, root.location, root.navigator)) return;

  const tag = root.ChipIn && root.ChipIn.refTag ? root.ChipIn.refTag(location.pathname, location.search) : 'direct-index';
  const width = root.screen && root.screen.width;
  const sent = {};
  function send(stage) {
    if (sent[stage]) return;
    sent[stage] = true;
    const url = countUrl(CODE, eventName(stage, tag), stage, width);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
    } catch (e) { /* fall through to the image */ }
    new Image().src = url;
  }

  api.send = send;
  send('land');

  // Active time: a one-second tick that counts only while the tab is visible and there was input recently.
  let lastInput = 0;
  let active = 0;
  let visible = 0;
  const touch = function () { lastInput = Date.now(); };
  ['scroll', 'pointerdown', 'pointermove', 'keydown', 'touchstart'].forEach(function (ev) {
    root.addEventListener(ev, touch, { passive: true, capture: true });
  });
  const tick = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    if (++visible >= 10) send('v10');
    if (Date.now() - lastInput > IDLE_MS) return;
    active += 1;
    TIME_MARKS.forEach(function (m) { if (active >= m) send('t' + m); });
    if (active >= TIME_MARKS[TIME_MARKS.length - 1]) clearInterval(tick);
  }, 1000);

  // Scroll depth, only on a real scroll (a page that fits on the first screen records none).
  function onScroll() {
    const pct = depthPercent(root.scrollY, root.innerHeight, document.documentElement.scrollHeight);
    depthMarks(pct, sent.__depth).forEach(function (m) {
      (sent.__depth = sent.__depth || {})[m] = true;
      send('d' + m);
    });
    if (pct >= 50) send('engage');
  }
  root.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('submit', function () { send('tool'); send('engage'); }, true);

  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    let stage = a ? linkStage(a.href, location.href) : null;
    if (!stage) return;
    if (stage === 'chip' && a.closest('[data-chipin="footer"]')) stage = 'chipf';
    send(stage);
    // Keep the ad's utm labels on links within the site, so a visitor who reads another page first and then
    // chips in is still credited to the ad. Nothing is stored; the labels just ride along in the link.
    if (stage.indexOf('go-') === 0) a.href = carryUtm(a.href, location.search);
  }, true);

  function watch() {
    if (!('IntersectionObserver' in root)) return;
    // The chip-in box: half on screen for a second.
    let timer = null;
    const shown = new Set();
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) shown.add(en.target); else shown.delete(en.target); });
      if (shown.size && !timer) timer = setTimeout(function () { send('seen'); io.disconnect(); }, 1000);
      if (!shown.size && timer) { clearTimeout(timer); timer = null; }
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-chipin]:not([data-chipin="footer"])').forEach(function (el) { io.observe(el); });
    // Section headings: any part on screen.
    const heads = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { send('sec-' + clean(en.target.id, 40)); heads.unobserve(en.target); }
      });
    });
    document.querySelectorAll('h2[id]').forEach(function (el) { heads.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})(typeof window !== 'undefined' ? window : globalThis);
