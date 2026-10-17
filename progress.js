/* Fills the progress section (index and diary) from progress.json when served over http(s).
   The HTML already contains the initial values, so this is a progressive enhancement;
   it is skipped on file:// where browsers block fetch(). Elements that a page lacks are skipped.
   chipin.js (loaded first) fetches progress.json once and owns the number handling (ChipIn.normalize), so the
   figures here and the cup always agree. Counts and totals only, never individual payments. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || location.protocol === 'file:') return;
  var ChipIn = window.ChipIn;
  if (!ChipIn || typeof ChipIn.loadProgress !== 'function') return;

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  ChipIn.loadProgress()
    .then(function (p) {
      if (!p) return;
      var n = ChipIn.normalize(p);
      setText('raised', ChipIn.money(n.raised));

      var goalEl = document.getElementById('goal');
      if (p.goal !== null && Number(p.goal) > 0) {
        if (goalEl) goalEl.textContent = 'Goal: ' + ChipIn.money(n.goal);
        var pct = ChipIn.percent(p);
        var bar = document.getElementById('bar');
        if (bar) {
          bar.hidden = false;
          bar.setAttribute('aria-valuenow', String(pct));
          document.getElementById('bar-fill').style.width = pct + '%';
        }
      } else if (goalEl && typeof p.goal_label === 'string') {
        goalEl.textContent = 'Goal: ' + p.goal_label;
      }

      setText('supporters', n.supporters === 0 ? 'No supporters yet' : ChipIn.supportersText(n.supporters));

      if (typeof p.updated === 'string') {
        var d = new Date(p.updated + 'T12:00:00');
        setText('updated', isNaN(d)
          ? p.updated
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
      }
      if (typeof p.note === 'string') setText('note', p.note);
    })
    .catch(function () { /* keep the static values already in the page */ });
})();
