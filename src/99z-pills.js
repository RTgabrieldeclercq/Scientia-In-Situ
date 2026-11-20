/* ==========================================================================
   99z · The pills where the lab layer isn't (V4.20). Gabe, asked about Rotate
   in the Zoom pill: "Edit it, and make sure pills go in the repo as well."
   The lab's canvas pills (✎ the hand, ＋ the Quick cast, ✦ tools, ⊕ zoom)
   are lab-mode.js's section 11; the lab's builds run lab-mode.js itself. A
   build without it (Gabe's own repo, a plain build.py) runs the SAME code:
   scripts/scientia_build.py cuts the section out unchanged into
   vendor/lab-pills.js (LABPILLS.start), and this starts it, once, after the
   app's modules — where lab-mode.js would run — with a LAB of its own (the
   lab's flags off; never window.SIS_LAB, which the app reads as "the lab
   layer is here"). Its styles go into #lab-mode-css, as in the lab.
   Settings → Pen & touch → Pills: off hides them and gives the bottom bar
   and the top-right row back (31-pills.css, body.f-off-pills).
   ========================================================================== */
const PILLS = {
  LAB: null,
  /** The lab's builds carry lab-mode.js, which runs its own section 11. */
  lab: () => window.SIS_TARGET === 'web',
  on: () => typeof FEAT === 'undefined' || FEAT.on('pills'),
  /** The LAB the section reads and writes: the lab's simple notebook off; everything else it sets on it itself. */
  start() {
    if (PILLS.LAB || PILLS.lab() || typeof LABPILLS === 'undefined' || (typeof VIEWER !== 'undefined' && VIEWER)) return null;
    if (!document.getElementById('lab-mode-css')) document.head.append(h('style', { id: 'lab-mode-css' }));
    const LAB = { version: 'app', simple: false, simpleIns: ['component', 'figure', 'pdf', 'html', 'website'] };
    try { LABPILLS.start(LAB); } catch (e) { console.warn('[pills]', e); return null; }
    PILLS.LAB = LAB; window.SIS_PILLS = LAB;
    if (LAB.pills && typeof PILL_DOCK_MS !== 'undefined') LAB.pills.dockMs = PILL_DOCK_MS;   // the app's 3 s (99-boot), as in the lab's builds
    return LAB;
  },
  /** The switch: off puts the zoom hand down (its tap would still zoom), so the canvas is the app's own again. */
  changed(v) {
    const L = PILLS.LAB || window.SIS_LAB;
    try { if (!v && L && L.handNow && L.handNow() === 'zoom') L.setHand('move'); if (L && L.paintPills) L.paintPills(); } catch (e) { }
  },
};
PILLS.start();
