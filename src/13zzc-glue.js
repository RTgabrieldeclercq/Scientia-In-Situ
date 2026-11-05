/* ==========================================================================
   13zzc · Ink on images. The pen writes on an image panel's images as on
   the paper (13zf); that ink is drawn on top of the image and glued to it —
   ink.glue = {to: the image panel, dx, dy}, its offset from the panel. Drag
   the panel (by itself, with its region, or into another note) and the ink
   goes with it. Drag the ink by itself and it is glued to the image it
   lands on, or comes loose. Only the strokes take the pointer, so the image
   under the ink can still be clicked.
   ========================================================================== */
const GLUE = {
  img: b => b && b.glue && M.block(b.glue.to),
  /** Glued ink takes its place from its image; returns the inks that moved. */
  follow(docId) {
    const out = [];
    INK.blocks(docId).forEach(b => { const im = GLUE.img(b); if (!im || im.status === 'removed' || im.docId !== b.docId || im.x == null) return;
      const x = INK.r1(im.x + (b.glue.dx || 0)), y = INK.r1((im.y || 0) + (b.glue.dy || 0)); if (x !== b.x || y !== b.y) { b.x = x; b.y = y; out.push(b); } });
    return out;
  },
  /** The ink's offset from its image, after it changed shape or place. */
  offset(b) { const im = GLUE.img(b); if (im && im.x != null) b.glue = Object.assign({}, b.glue, { dx: INK.r1(b.x - im.x), dy: INK.r1(b.y - (im.y || 0)) }); },
  /** After the ink itself was dragged: glued to the image under its middle, or loose. */
  reglue(pane, b) {
    const R = pane.rectOf(b.id) || INK.rect(b), img = INK.imageAt(pane, R.x + R.w / 2, R.y + R.h / 2), was = b.glue && b.glue.to;
    if (img) { b.glue = { to: img }; GLUE.offset(b); } else delete b.glue;
    DB.put('blocks', b); if (was !== img) changed(); else pane.drawWires();
  },
  /** Positions that only follow an image are saved quietly (undoing the image's move brings the ink back with it). */
  dirty: new Set(),
  flush: debounce(() => { DB.quiet = true; try { GLUE.dirty.forEach(id => { const b = M.block(id); b && DB.put('blocks', b); }); } finally { DB.quiet = false; } GLUE.dirty.clear(); }, 600),
};
{
  // the ink keeps its offset when its strokes change (written, erased, lassoed: the box re-fits)
  const fit = INK.fit; INK.fit = function (b) { const r = fit.call(INK, b); if (r && b.glue) GLUE.offset(b); return r; };
  // a note is drawn with its glued ink where the image is now…
  const fill = DocView.fill; DocView.fill = function (d) {
    const moved = GLUE.follow(d.id); if (moved.length) { DB.quiet = true; try { moved.forEach(b => DB.put('blocks', b)); } finally { DB.quiet = false; } }
    return fill.call(this, d); };
  // …and the ink follows the image while it is dragged (every drag redraws the connections)
  const dw = DocView.drawWires; DocView.drawWires = function (...a) {
    if (this.paper && this.docId) { const w = this.paper.world;
      GLUE.follow(this.docId).forEach(b => { const el = $(`:scope > .box[data-id="${b.id}"]`, w); if (el) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; } GLUE.dirty.add(b.id); });
      if (GLUE.dirty.size) GLUE.flush(); }
    return dw.apply(this, a); };
  // glued ink is drawn over its image; only its strokes take the pointer
  const bx = DocView.box; DocView.box = function (b) { const el = bx.apply(this, arguments); if (el && b && b.kind === 'ink' && b.glue) el.classList.add('on-img'); return el; };
  // the ink dragged by itself: glued to the image it lands on
  const ptr = DocView.pointer; DocView.pointer = function (e) {
    const box = e.target.closest && e.target.closest('.box.w-ink'), b = box && M.block(box.dataset.id), x0 = b && b.x, y0 = b && b.y, r = ptr.call(this, e);
    if (b && e.button === 0) { const pane = this, up = () => { removeEventListener('pointerup', up); setTimeout(() => { const cur = M.block(b.id); if (cur && cur.status === 'live' && (cur.x !== x0 || cur.y !== y0)) GLUE.reglue(pane, cur); }, 0); }; addEventListener('pointerup', up); }
    return r; };
  // an image panel moved to another note takes the ink on it along
  const ex = MOVE.expand; MOVE.expand = function (ids) { const set = new Set(ex.call(MOVE, ids)); DB.where('blocks', b => b.kind === 'ink' && b.status === 'live' && b.glue && set.has(b.glue.to)).forEach(b => set.add(b.id)); return [...set]; };
  // a stroke written on an image doesn't also click it (crop it, pick a file)
  const pd = INK.penDown; INK.penDown = function (paper, e) {
    const r = pd.call(INK, paper, e);
    if (r && e.target.closest && e.target.closest('.box.w-figure')) { const stop = ev => { ev.preventDefault(); ev.stopPropagation(); };
      const end = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true); document.addEventListener('click', stop, true); setTimeout(() => document.removeEventListener('click', stop, true), 400); };
      addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true); }
    return r; };
}
