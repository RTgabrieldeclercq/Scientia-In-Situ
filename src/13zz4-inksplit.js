/* ==========================================================================
   13zz4 · Ink components stay small enough to sync. The lab's cloud (and
   Firestore under it) keeps each record as one entry of at most 1 MB, and
   an ink component is one record: a page of handwriting can pass that.
   • When a stroke would go into an ink component already over ~400 KB, it
     starts a new ink component instead (beside it, same note).
   • On launch, an ink component over the limit is split into neighbouring
     ink components of under ~380 KB each, in the order the strokes were
     written; every stroke stays exactly where it is on the paper. The first
     part keeps the component's id, label, connections and region.
   ========================================================================== */
const INKSPLIT = {
  MAX: 400 * 1024, PART: 380 * 1024,
  size: b => JSON.stringify((b && b.ink) || {}).length,
  /** split one ink component; returns how many components it became */
  split(b0) {
    const b = M.block(b0.id); if (!b || b.kind !== 'ink' || !b.ink || INKSPLIT.size(b) <= INKSPLIT.MAX) return 1;
    const parts = [[]]; let cur = 0;
    for (const s of b.ink.strokes) { const n = JSON.stringify(s).length + 1; if (cur + n > INKSPLIT.PART && parts[parts.length - 1].length) { parts.push([]); cur = 0; } parts[parts.length - 1].push(s); cur += n; }
    if (parts.length < 2) return 1;
    const abs = s => Object.assign({}, s, { p: s.p.map(p => [p[0] + b.x, p[1] + b.y, p[2]]) });
    const d = M.doc(b.docId); if (!d) return 1;
    _suppress++;
    try {
      let after = b.id;
      parts.slice(1).forEach(strokes => {
        const nb = M.addBlock(d.id, after, { kind: 'ink', label: '', x: 0, y: 0, w: 60, inkH: 60, ink: { strokes: strokes.map(abs) } });
        nb.body = { text: '', marks: [] }; INK.fit(nb); nb.modified = isoLocal(new Date()); DB.put('blocks', nb); after = nb.id; });
      const keep = Object.assign({}, b, { ink: Object.assign({}, b.ink, { strokes: parts[0] }) }); INK.fit(keep); keep.modified = isoLocal(new Date()); DB.put('blocks', keep);
      M.touchDoc(M.doc(d.id));
    } finally { _suppress--; }
    return parts.length;
  },
  /** every ink component over the limit (launch) */
  sweep() {
    const big = DB.where('blocks', b => b.kind === 'ink' && b.status !== 'removed' && b.ink && b.ink.strokes && b.ink.strokes.length > 1 && INKSPLIT.size(b) > INKSPLIT.MAX); if (!big.length) return 0;
    DB.beginGroup('split ink'); const at = DB.undoStack.length; let n = 0; big.forEach(b => { n += INKSPLIT.split(b) - 1; });
    // adding a component starts a new undo step: fold the whole split into one (Ctrl+Z puts it back as it was)
    const steps = DB.undoStack.splice(at); if (steps.length) DB.undoStack.push({ group: steps[steps.length - 1].group, label: 'split ink', entries: steps.flatMap(g => g.entries) });
    IX.rebuild(); changed();
    toast(`${plural(big.length, 'large ink component')} split into ${big.length + n} so ${big.length === 1 ? 'it syncs' : 'they sync'} (each record stays under the cloud’s 1 MB) — nothing moved on the paper`, 6000);
    return n;
  },
};
{
  // a full ink component takes no more strokes: the next one starts a new component
  const tg = INK.target; INK.target = function (pane, wp) { const b = tg.call(INK, pane, wp); return b && INKSPLIT.size(b) > INKSPLIT.MAX ? null : b; };
  const go = () => { if (!window.__ready) return setTimeout(go, 500); if (window.SIS_EXPORT) return; setTimeout(() => { try { INKSPLIT.sweep(); } catch (e) { console.warn('[inksplit]', e); } }, 1500); };
  setTimeout(go, 500);
}
