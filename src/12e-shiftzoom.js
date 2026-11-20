/* ==========================================================================
   12e · Shift+click a component: the canvas zooms onto it (V4.89 — Gabe,
   20 Nov: "In RTgabrieldeclercq repo, have the Shift+click on a component to
   zoom on it.")
   The lab's canvas pills (lab-mode §11, vendor/lab-pills.js in a build
   without the lab layer) already fit a component on a Shift-click — with the
   move hand and a mouse only. Here the app does it itself, so it holds in
   every build: any hand, the mouse or the pen, unless you are typing in that
   component (then Shift+click extends the selection, as in any text).
   - A click, not a drag: Shift+drag still moves a component a grid cell at a
     time. Decided on release (within 6 px and half a second).
   - Where the pills' own Shift-click moved the view first, it stays theirs.
   - How far: fit it to the screen (the default), or 100% / 50% centred on it.
   Settings → Canvas & notes → Shift+click zooms (shiftzoom, 20a).
   SHZOOM: on() · fit(pane, id)
   ========================================================================== */
const SHZOOM = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('shiftzoom'),
  fit(pane, id) {
    const P = pane && pane.paper, r = P && pane.rectOf(id); if (!r) return false;
    const R = P.rect(), pad = R.width < 640 ? 12 : 48, top = 56, bot = 48, h = Math.min(r.h, 1600), how = (typeof FEAT !== 'undefined' && FEAT.tune('shiftzoom', 'how')) || 'fit';
    const z = clamp(how === 'fit' ? Math.min((R.width - 2 * pad) / r.w, (R.height - top - bot) / h, 2) : (+how || 100) / 100, P.o.minZ, P.o.maxZ);
    P.animateView({ z, x: R.width / 2 - (r.x + r.w / 2) * z, y: top + (R.height - top - bot) / 2 - (r.y + h / 2) * z });
    pane.select && pane.select(id); return true;
  },
};
{
  let cand = null;
  document.addEventListener('pointerdown', e => {
    cand = null; if (!SHZOOM.on() || !e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.button > 0 || !e.target || !e.target.closest) return;
    const box = e.target.closest('.box[data-id]'); if (!box || e.target.closest('button, input, select, textarea, a, .bh .cfold, .rg-tab, .dt, .code-foot')) return;
    const ed = e.target.closest('[contenteditable="true"]'), act = document.activeElement; if (ed && act && (ed === act || ed.contains(act))) return;   // typing in it: Shift+click extends the selection
    const pane = (typeof App !== 'undefined' && App.panes ? App.panes() : [DocView]).find(p => p && p.paper && p.paper.world && p.paper.world.contains(box)); if (!pane) return;
    const v = pane.paper.view; cand = { id: box.dataset.id, pane, x: e.clientX, y: e.clientY, t: Date.now(), v: { x: v.x, y: v.y, z: v.z } };
    if (ed) e.preventDefault();   // no caret in a box you are not typing in: the click decides
  }, true);
  addEventListener('pointerup', e => {
    const c = cand; cand = null; if (!c || Math.hypot(e.clientX - c.x, e.clientY - c.y) > 6 || Date.now() - c.t > 500) return;
    setTimeout(() => { const v = c.pane.paper && c.pane.paper.view; if (!v) return; if (Math.abs(v.z - c.v.z) > 1e-3 || Math.abs(v.x - c.v.x) > 1 || Math.abs(v.y - c.v.y) > 1) return;   // the pills' own Shift-click took it
      SHZOOM.fit(c.pane, c.id); }, 60);
  }, true);
}
