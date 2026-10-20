/* Where real home baristas sit: per-person medians from public Visualizer.coffee shots (built by
   tools/visualizer/stats.py --site; totals only, nobody's shots). Classic script. */
(function (root) {
  'use strict';
  const REAL = {"source":"Visualizer.coffee public shots","pulled":"2026-10-19","people":294,"shots":1857,"roasts":{"medium":{"people":65,"median":2.15,"iqr":[2.01,2.4]},"light":{"people":54,"median":2.44,"iqr":[2.22,2.56]},"dark":{"people":24,"median":2.03,"iqr":[1.97,2.14]}},"grinders":{"niche-zero":{"people":35,"median":11.0,"iqr":[9.0,16.0]}}};
  if (typeof module !== 'undefined' && module.exports) module.exports = REAL;
  root.SetupReal = REAL;
})(typeof window !== 'undefined' ? window : globalThis);
