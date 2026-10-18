/* Anonymous funnel counts through GoatCounter (https://www.goatcounter.com): no cookies, nothing stored in the
   browser, no personal data. Each page load sends at most four events, each named "<stage>.<tag>", where the tag
   is the same label the chip-in button gives Stripe (ChipIn.refTag, for example "reddit-live-diary"):
     land    the page loaded
     engage  the visitor used a tool (submitted a form) or scrolled at least halfway down
     seen    a chip-in box (not the footer line) was at least half on screen for a second
     chip    a chip-in button was clicked (cross-checks the checkouts Stripe reports)
   Part 1 is pure and unit-tested (test/count.test.mjs); part 2 wires it to the page. Classic script. */
(function (root) {
  'use strict';

  // The GoatCounter site code; empty means counting is off.
  const CODE = 'espresso-run-agent';
  const STAGES = ['land', 'engage', 'seen', 'chip'];

  /* ---------- Part 1: pure ---------- */

  function eventName(stage, tag) {
    return stage + '.' + String(tag || 'direct-index').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 200);
  }

  function countUrl(code, name, title) {
    return 'https://' + code + '.goatcounter.com/count?e=true&p=' + encodeURIComponent(name) +
      '&t=' + encodeURIComponent(title || name) + '&rnd=' + Math.random().toString(36).slice(2, 8);
  }

  // Only count real visits to the live site: not file://, not local copies, not automated browsers.
  function shouldCount(code, loc, nav) {
    if (!code || !loc || loc.protocol !== 'https:') return false;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname)) return false;
    return !(nav && nav.webdriver);
  }

  const api = { CODE: CODE, STAGES: STAGES, eventName: eventName, countUrl: countUrl, shouldCount: shouldCount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Count = api;

  /* ---------- Part 2: page glue ---------- */

  if (typeof document === 'undefined' || !shouldCount(CODE, root.location, root.navigator)) return;

  const tag = root.ChipIn && root.ChipIn.refTag ? root.ChipIn.refTag(location.pathname, location.search) : 'direct-index';
  const sent = {};
  function send(stage) {
    if (sent[stage]) return;
    sent[stage] = true;
    const url = countUrl(CODE, eventName(stage, tag), stage);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
    } catch (e) { /* fall through to the image */ }
    new Image().src = url;
  }

  send('land');

  document.addEventListener('submit', function () { send('engage'); }, true);
  function onScroll() {
    const doc = document.documentElement;
    if ((root.scrollY + root.innerHeight) / Math.max(1, doc.scrollHeight) >= 0.5) {
      send('engage');
      root.removeEventListener('scroll', onScroll);
    }
  }
  root.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="https://buy.stripe.com/"]') : null;
    if (a) send('chip');
  }, true);

  if ('IntersectionObserver' in root) {
    let timer = null;
    const io = new IntersectionObserver(function (entries) {
      const visible = entries.some(function (en) { return en.isIntersecting; });
      if (visible && !timer) timer = setTimeout(function () { send('seen'); io.disconnect(); }, 1000);
      if (!visible && timer) { clearTimeout(timer); timer = null; }
    }, { threshold: 0.5 });
    const watch = function () {
      document.querySelectorAll('[data-chipin]:not([data-chipin="footer"])').forEach(function (el) { io.observe(el); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
    else watch();
  }
})(typeof window !== 'undefined' ? window : globalThis);
