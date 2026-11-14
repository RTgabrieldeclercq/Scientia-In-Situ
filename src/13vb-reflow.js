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
   • V3.996 (Gabe: "regions, when expanded, push other regions to the side.
     Also, collapsing anything gravity pulls back any previously displaced
     by the same amount from the expansion of it"): what an unfold (or a box
     growing, 12 settle) pushes out of the way is recorded too ({ push: true,
     h }), and folding gives it back by exactly as much — not by the height
     that went. An unfolding region moves the other regions out of its way to
     the side, each whole (all it holds, a folded one by its title): right of
     its middle to the right, left of it to the left, and what those push in
     turn. Settings → Features → Regions (the push) and Writing in components
     (gravity: off, a fold gives nothing back).
   ========================================================================== */
const REFLOW = {
  pending: null,
  /** V3.996: the other regions an unfolded region rid (now at rect E) would cover go to the side, each whole — what lies right of its middle to the right,
      left of it to the left — and what those push in turn. Each moved component (and a folded region's title) remembers it ({ by, dx, at, push }), so the
      fold gives it back. The ids moved are added to `done` (the loop below leaves them). Returns how many regions moved. */
  aside(pane, d, rid, E, done) {
    const r = REGION.list(d).find(x => x.id === rid); if (!r || !E) return 0; const G = 28;
    const inR = new Set(REGION.blocksOf(r, d)), sub = new Set(REGION.subRegions(d, r).map(x => x.id)), around = new Set(REGION.ancestors(d, rid).map(x => x.id));
    // the regions that move: the outermost round something, that is neither round r nor in it
    const tops = REGION.list(d).filter(k => k.id !== rid && !sub.has(k.id) && !around.has(k.id) && REGION.ancestors(d, k.id).every(a => around.has(a.id)));
    const L = tops.map(k => ({ k, r: REGION.rect(pane, k) })).filter(u => u.r && !REGION.blocksOf(u.k, d).some(id => inR.has(id)));
    const hit = (a, w) => a.x < w.x + w.w + G && a.x + a.w + G > w.x && a.y < w.y + w.h && a.y + a.h > w.y, mid = E.x + E.w / 2, moves = [];
    [1, -1].forEach(side => { const walls = [E];
      L.filter(u => (u.r.x + u.r.w / 2 >= mid) === (side > 0)).sort((a, b) => side > 0 ? a.r.x - b.r.x : (b.r.x + b.r.w) - (a.r.x + a.r.w)).forEach(u => {
        let dx = 0; walls.forEach(w => { if (!hit(u.r, w)) return; const need = side > 0 ? w.x + w.w + G - u.r.x : w.x - G - (u.r.x + u.r.w); if (side > 0 ? need > dx : need < dx) dx = need; });
        dx = side > 0 ? Math.ceil(dx / 14) * 14 : Math.floor(dx / 14) * 14; if (!dx) return; u.r = Object.assign({}, u.r, { x: u.r.x + dx }); walls.push(u.r); moves.push({ u, dx }); }); });
    moves.forEach(({ u, dx }) => {
      REGION.blocksOf(u.k, d).forEach(id => { const b = M.block(id); if (!b || b.x == null) return; const S = Array.isArray(b.shift) ? b.shift : [];
        b.x += dx; b.shift = [...S, { by: rid, dx, dy: 0, at: { x: b.x, y: b.y }, push: true, h: E.h, whole: true }]; DB.put('blocks', b); done.add(id); });
      [u.k, ...REGION.subRegions(d, u.k)].forEach(q => { const k = REGION.list(d).find(x => x.id === q.id); if (k && k.at) { k.at = { x: k.at.x + dx, y: k.at.y }; k.shift = [...(Array.isArray(k.shift) ? k.shift : []), { by: rid, dx, at: { x: k.at.x }, push: true }]; } }); });
    if (moves.length) REGION.save(d); return moves.length;
  },
  /** Before a fold or unfold: the source's rect as it stands (and, for a region, the members it hides). */
  mark(pane, id, rect, skip) { if (!pane || !rect || pane.travel) { REFLOW.pending = null; return; } REFLOW.pending = { pane, id, docId: pane.docId, r0: rect, skip: skip || new Set() }; setTimeout(() => REFLOW.apply(0), 60); },
  /** After the re-render (waited for): the source's new size; what is below and to the right follows, or comes back. */
  apply(n) {
    const P = REFLOW.pending; if (!P) return; const pane = P.pane, d = M.doc(P.docId); if (!d || !pane.paper || pane.docId !== P.docId) { REFLOW.pending = null; return; }
    const settle = () => requestAnimationFrame(() => { try { pane.settle(); } catch (e) { } });   // V3.996: the note settles after (it waited for this)
    const r1 = pane.rectOf(P.id); if (!r1) { if (n < 12) return setTimeout(() => REFLOW.apply(n + 1), 60); REFLOW.pending = null; return settle(); }
    const dh = P.r0.h - r1.h, dw = P.r0.w - r1.w;
    if (Math.abs(dh) < 2 && Math.abs(dw) < 2) { if (n < 12) return setTimeout(() => REFLOW.apply(n + 1), 60); REFLOW.pending = null; return settle(); }
    REFLOW.pending = null;
    const src = { x: P.r0.x, y: P.r0.y, w: Math.max(P.r0.w, r1.w), h: Math.max(P.r0.h, r1.h) }, bottom = src.y + Math.min(P.r0.h, r1.h), rightEdge = src.x + Math.min(P.r0.w, r1.w);
    const live = M.liveBlocks(d.id).filter(b => b.id !== P.id && b.kind !== 'ink' && b.x != null && !P.skip.has(b.id) && !REGION.hider(d, b.id));
    const overX = b => b.x < src.x + src.w && b.x + (b.w || 392) > src.x, overY = b => { const h = pane.boxH(b.id); return b.y < src.y + src.h && b.y + h > src.y; };
    let moved = 0; DB.beginGroup('fold');
    const growing = dh < 0 || dw < 0, grav = typeof FEAT === 'undefined' || FEAT.tune('writing', 'gravity') !== false, done = new Set();
    // V3.996: an unfolding region moves the other regions out of its way, each whole, to the side
    if (growing && REGION.isRg(P.id) && !(typeof FEAT !== 'undefined' && FEAT.tune('regions', 'push') === false)) moved += REFLOW.aside(pane, d, P.id, r1, done);
    // V3.996: a folding region gives back what its unfolding moved aside (a folded region moved with it: by its title)
    if (!growing) REGION.list(d).forEach(k => { const S = Array.isArray(k.shift) ? k.shift : [], e = S.filter(x => x.by === P.id && x.push).pop(); if (!e) return; k.shift = S.filter(x => x !== e); if (!k.shift.length) delete k.shift;
      if (grav && k.at && k.at.x === e.at.x) { k.at = { x: k.at.x - e.dx, y: k.at.y };
        if (k.collapsed || REGION.hider(d, k.id)) REGION.blocksOf(k, d).forEach(id => { const b = M.block(id); if (!b || b.x == null) return; const S2 = Array.isArray(b.shift) ? b.shift : [], e2 = S2.filter(x => x.by === P.id && x.push).pop();   // hidden: the loop below can't see them
          if (e2) { b.shift = S2.filter(x => x !== e2); if (!b.shift.length) delete b.shift; } if (!e2 || (e2.at && e2.at.x === b.x)) b.x -= e.dx; DB.put('blocks', b); });
        moved++; } REGION.save(d); });
    live.forEach(b => { if (done.has(b.id)) return;
      const below = b.y >= bottom - 8 && overX(b), right = !below && b.x >= rightEdge - 8 && overY(b), S = Array.isArray(b.shift) ? b.shift : [], mine = S.filter(s => s.by === P.id);
      let dx = 0, dy = 0;
      if (mine.length) {
        const last = mine[mine.length - 1]; if (last.at && (last.at.x !== b.x || last.at.y !== b.y)) { b.shift = S.filter(s => s.by !== P.id); if (!b.shift.length) delete b.shift; DB.put('blocks', b); return; }   // moved since: left where it was put
        if (last.push ? !growing : growing) {   // given back by as much: a pull when it unfolds again (V3.948); a push when it folds (V3.996, gravity)
          b.shift = S.filter(s => s !== last); if (!b.shift.length) delete b.shift;
          if (last.push && !grav) { DB.put('blocks', b); return; }
          dx = -last.dx; dy = -last.dy;
        } else if (!growing) { if (below && dh > 0) dy = -dh; if (right && dw > 0) dx = -dw; if (!dx && !dy) return; b.shift = [...S, { by: P.id, dx, dy, at: { x: b.x + dx, y: b.y + dy } }]; }
        else { if (below && dh < 0) dy = -dh; if (right && dw < 0) dx = -dw; if (!dx && !dy) return; last.dx += dx; last.dy += dy; last.at = { x: b.x + dx, y: b.y + dy }; last.h = r1.h; }   // pushed again
      } else if (!growing) {   // folding: what is below comes up, what is to the right comes left
        if (below && dh > 0) dy = -dh; if (right && dw > 0) dx = -dw; if (!dx && !dy) return;
        b.shift = [...S, { by: P.id, dx, dy, at: { x: b.x + dx, y: b.y + dy } }];
      } else {   // growing, and nothing of this source's to give back: what is in the way is pushed out of it — V3.996: and remembered, so the fold gives it back
        if (below && dh < 0) dy = -dh; if (right && dw < 0) dx = -dw; if (!dx && !dy) return;
        b.shift = [...S, { by: P.id, dx, dy, at: { x: b.x + dx, y: b.y + dy }, push: true, h: r1.h }];
      }
      b.x += dx; b.y += dy; DB.put('blocks', b); moved++;
    });
    if (!moved) return settle();
    const w = pane.paper.world; w.classList.add('tidying'); setTimeout(() => w.classList.remove('tidying'), 320); changed();
  },
};
{
  // ▾ on a component: measure it before the fold, apply after the redraw
  document.addEventListener('click', e => { const f = e.target.closest && e.target.closest('.cfold'); if (!f || f.disabled) return; const box = f.closest('.box[data-id]'); if (!box) return; const pane = DV(box); if (!pane || !pane.paper) return; REFLOW.mark(pane, box.dataset.id, pane.rectOf(box.dataset.id)); }, true);
  // a region's fold
  const rf = REGION.fold; REGION.fold = function (pane, d, r) { try { if (pane && pane.paper) REFLOW.mark(pane, r.id, pane.rectOf(r.id) || REGION.rect(pane, r), new Set(REGION.blocksOf(r, M.doc(d.id) || d))); } catch (e) { REFLOW.pending = null; } return rf.apply(this, arguments); };
}
