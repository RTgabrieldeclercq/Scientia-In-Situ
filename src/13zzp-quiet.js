/* ==========================================================================
   13zzp · Quiet (V3.965): the app knows when nobody is at it — no touch, key
   or wheel for three minutes, or the tab hidden — and says so on
   <body class="quiet"> and through QUIET.is(). What only moves for the eye
   (the pulsing dots) pauses then, the computer's sync tells the lab bridge
   the person is away, and the periodic sweeps elsewhere wait for something
   to have changed (DB.rev). The first touch wakes everything at once, so
   nothing visible is slower while someone is there.
   ========================================================================== */
const QUIET = {
  AFTER: 3 * 60 * 1000, at: Date.now(), on: false, _t: 0,
  is: () => QUIET.on,
  touch() { const now = Date.now(); if (now - QUIET.at < 1000 && !QUIET.on) return; QUIET.at = now; if (QUIET.on) QUIET.set(false); QUIET.arm(); },
  arm() { clearTimeout(QUIET._t); QUIET._t = setTimeout(() => { if (Date.now() - QUIET.at >= QUIET.AFTER) QUIET.set(true); else QUIET.arm(); }, QUIET.AFTER - (Date.now() - QUIET.at) + 50); },
  set(on) { on = !!on; if (on === QUIET.on) return; QUIET.on = on; document.body.classList.toggle('quiet', on); document.dispatchEvent(new CustomEvent(on ? 'sis-quiet' : 'sis-awake')); },
  init() {
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, QUIET.touch, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) QUIET.set(true); else QUIET.touch(); });
    QUIET.arm();
  },
};
if (document.body) QUIET.init(); else addEventListener('DOMContentLoaded', () => QUIET.init());
