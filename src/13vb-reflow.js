/* ==========================================================================
   13vb · Folding moves the neighbours (V3.948, Gabe's SiS Shaping, Phase C).
   When a component folds to its title (▾) or a region folds to its header,
   what is below it (and overlaps it sideways) comes up by the height that
   went, and what is to its right (overlapping it up and down) comes left by
   the width that went. Each moved box remembers what pulled it and by how
   much (b.shift, kept with the note), so unfolding pushes it back by the
   same amount — unless it was moved meanwhile, in which case it is left
   where it was put. Several folds stack. Ink never moves; a read-only note
   does not reflow. The move is one undo step with the fold, animated.
   ========================================================================== */
const REFLOW = {
  pending: null,
  /** Before a fold or unfold: the source's rect as it stands (and, for a region, the members it hides). */
  mark(pane, id, rect, skip) { if (!pane || !rect || pane.travel) { REFLOW.pending = null; return; } REFLOW.pending = { pane, id, docId: pane.docId, r0: rect, skip: skip || new Set() }; setTimeout(() => REFLOW.apply(0), 60); },
  /** After the re-render (waited for): the source's new size; what is below and to the right follows, or comes back. */
  apply(n) {
    const P = REFLOW.pending; if (!P) return; const pane = P.pane, d = M.doc(P.docId); if (!d || !pane.paper || pane.docId !== P.docId) { REFLOW.pending = null; return; }
    const r1 = pane.rectOf(P.id); if (!r1) { if (n < 12) return setTimeout(() => REFLOW.apply(n + 1), 60); REFLOW.pending = null; return; }
    const dh = P.r0.h - r1.h, dw = P.r0.w - r1.w;
    if (Math.abs(dh) < 2 && Math.abs(dw) < 2) { if (n < 12) return setTimeout(() => REFLOW.apply(n + 1), 60); REFLOW.pending = null; return; }
    REFLOW.pending = null;
    const src = { x: P.r0.x, y: P.r0.y, w: Math.max(P.r0.w, r1.w), h: Math.max(P.r0.h, r1.h) }, bottom = src.y + Math.min(P.r0.h, r1.h), rightEdge = src.x + Math.min(P.r0.w, r1.w);
    const live = M.liveBlocks(d.id).filter(b => b.id !== P.id && b.kind !== 'ink' && b.x != null && !P.skip.has(b.id) && !REGION.hider(d, b.id));
    const overX = b => b.x < src.x + src.w && b.x + (b.w || 392) > src.x, overY = b => { const h = pane.boxH(b.id); return b.y < src.y + src.h && b.y + h > src.y; };
    let moved = 0; DB.beginGroup('fold');
    live.forEach(b => {
      const below = b.y >= bottom - 8 && overX(b), right = !below && b.x >= rightEdge - 8 && overY(b), S = Array.isArray(b.shift) ? b.shift : [], mine = S.filter(s => s.by === P.id);
      let dx = 0, dy = 0;
      if (mine.length) {   // this source pulled it before: back by as much, unless it was moved since
        const last = mine[mine.length - 1]; if (last.at && (last.at.x !== b.x || last.at.y !== b.y)) { b.shift = S.filter(s => s.by !== P.id); if (!b.shift.length) delete b.shift; DB.put('blocks', b); return; }
        if (dh < 0 || dw < 0) { dx = -last.dx; dy = -last.dy; b.shift = S.filter(s => s !== last); if (!b.shift.length) delete b.shift; }
        else { if (below && dh > 0) dy = -dh; if (right && dw > 0) dx = -dw; if (!dx && !dy) return; b.shift = [...S, { by: P.id, dx, dy, at: { x: b.x + dx, y: b.y + dy } }]; }
      } else if (dh > 0 || dw > 0) {   // folding: what is below comes up, what is to the right comes left
        if (below && dh > 0) dy = -dh; if (right && dw > 0) dx = -dw; if (!dx && !dy) return;
        b.shift = [...S, { by: P.id, dx, dy, at: { x: b.x + dx, y: b.y + dy } }];
      } else {   // growing, and nothing of this source's to give back: what is in the way is pushed out of it
        if (below && dh < 0) dy = -dh; if (right && dw < 0) dx = -dw; if (!dx && !dy) return;
      }
      b.x += dx; b.y += dy; DB.put('blocks', b); moved++;
    });
    if (!moved) return;
    const w = pane.paper.world; w.classList.add('tidying'); setTimeout(() => w.classList.remove('tidying'), 320); changed();
  },
};
{
  // ▾ on a component: measure it before the fold, apply after the redraw
  document.addEventListener('click', e => { const f = e.target.closest && e.target.closest('.cfold'); if (!f || f.disabled) return; const box = f.closest('.box[data-id]'); if (!box) return; const pane = DV(box); if (!pane || !pane.paper) return; REFLOW.mark(pane, box.dataset.id, pane.rectOf(box.dataset.id)); }, true);
  // a region's fold
  const rf = REGION.fold; REGION.fold = function (pane, d, r) { try { if (pane && pane.paper) REFLOW.mark(pane, r.id, pane.rectOf(r.id) || REGION.rect(pane, r), new Set(REGION.blocksOf(r, M.doc(d.id) || d))); } catch (e) { REFLOW.pending = null; } return rf.apply(this, arguments); };
}
