/* ==========================================================================
   12d · Tidy, by links (V3.948, Gabe's SiS Shaping, Phase C).
   Tidy lays a note out around its connections: components that are wired
   together form a group; in a group the origin (the earliest among those
   with the most outgoing relations) sits at the top, and each component
   goes one row below the one it follows from (the longest path from the
   origin), rows ordered so the wires cross as little as they can
   (barycenter sweeps); neighbours in a row sit far enough apart to read
   the arrow and its label. A region is laid out as a group of its own and
   placed as one piece; a component with no connections is a piece of its
   own. V3.956 — every piece, groups and single components alike, is packed
   into the smallest near-square area (a little wider than tall, like a
   window: the width that gives Fit the highest zoom is tried for), with
   room between pieces to read and to move about. The move is one undo
   step, animated. Ordered notes (protocols) keep their order; "Flow in
   order" is the old tidy.
   ========================================================================== */
const LAYOUT = {
  GAPX: 56, GAPY: 42, LABEL: 7, ROWLAB: 24, PAD: 28, PGX: 70, PGY: 56, ASPECT: 1.3,
  /** The connected groups of a note's live components (ink floats; a folded region is one piece), with their wires. */
  graph(pane, d) {
    const live = M.liveBlocks(d.id).filter(b => b.kind !== 'ink' && b.x != null), regions = REGION.list(d);
    const inRegion = {}; regions.forEach(r => REGION.blocksOf(r, d).forEach(id => { if (!inRegion[id]) inRegion[id] = r.id; }));
    const ids = new Set(live.map(b => b.id)), W = DB.where('wires', w => ids.has(w.from) && ids.has(w.to) && w.from !== w.to);
    const node = {}; live.forEach(b => { const r = pane.rectOf(b.id); node[b.id] = { id: b.id, b, w: (r && r.w) || b.w || 392, h: (r && r.h) || pane.boxH(b.id), dx: 0, out: [], in: [], und: [], region: inRegion[b.id] || null };
      if (typeof STORY !== 'undefined' && STORY.isRoot(b)) { node[b.id].dx = STORY.W + STORY.GAP; node[b.id].w += node[b.id].dx; } });   // V3.955 — the arc beside a story's first beat takes its room
    W.forEach(w => { const rel = REL[w.rel] || {}; const dir = w.directed != null ? !!w.directed : rel.dir !== false; if (dir) { node[w.from].out.push({ to: w.to, rel: w.rel }); node[w.to].in.push({ from: w.from, rel: w.rel }); } else { node[w.from].und.push(w.to); node[w.to].und.push(w.from); } });
    return { node, regions, live };
  },
  /** Layer, order and place one set of nodes; returns {w, h} and sets n.px, n.py relative to the group's top left. */
  pack(nodes, edgesOf) {
    const byId = Object.fromEntries(nodes.map(n => [n.id, n])), E = edgesOf(byId);   // E: [{from, to, rel}] directed within these nodes
    // longest path from the sources (back edges of a cycle are dropped: the later one loses)
    const outs = {}; nodes.forEach(n => { outs[n.id] = []; }); E.forEach(e => outs[e.from].push(e));
    const ind = {}; nodes.forEach(n => { ind[n.id] = 0; }); E.forEach(e => { ind[e.to]++; });
    const order = [], seen = new Set(), stack = []; const visit = id => { if (seen.has(id)) return; seen.add(id); stack.push(id); outs[id].forEach(e => { if (stack.includes(e.to)) { e.back = true; return; } visit(e.to); }); stack.pop(); order.push(id); };
    const origin = nodes.slice().sort((a, b) => outs[b.id].length - outs[a.id].length || String(a.b.created || '').localeCompare(String(b.b.created || '')))[0];
    visit(origin.id); nodes.forEach(n => visit(n.id));
    const layer = {}; nodes.forEach(n => { layer[n.id] = 0; }); order.reverse().forEach(id => outs[id].forEach(e => { if (!e.back) layer[e.to] = Math.max(layer[e.to], layer[id] + 1); }));
    const rows = []; nodes.forEach(n => { (rows[layer[n.id]] = rows[layer[n.id]] || []).push(n); });
    // crossings: barycenter sweeps, down then up, twice
    const pos = {}; rows.forEach(r => r.forEach((n, i) => { pos[n.id] = i; }));
    const bary = (n, up) => { const L = up ? E.filter(e => e.from === n.id && !e.back).map(e => e.to) : E.filter(e => e.to === n.id && !e.back).map(e => e.from); return L.length ? L.reduce((s, id) => s + pos[id], 0) / L.length : pos[n.id]; };
    for (let k = 0; k < 4; k++) { const up = k % 2 === 1; const idx = up ? [...rows.keys()].reverse() : [...rows.keys()]; idx.forEach(i => { rows[i].sort((a, b) => bary(a, up) - bary(b, up) || pos[a.id] - pos[b.id]); rows[i].forEach((n, j) => { pos[n.id] = j; }); }); }
    // places: each row centred on the widest; neighbours apart by the arrow and its label
    const gapBetween = (a, b) => { const labs = E.filter(e => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)).map(e => (REL[e.rel] || { label: e.rel }).label || ''); return LAYOUT.GAPX + Math.max(0, ...labs.map(l => String(l).length * LAYOUT.LABEL)); };
    const rowW = rows.map(r => r.reduce((s, n, i) => s + n.w + (i ? gapBetween(r[i - 1], n) : 0), 0)), W = Math.max(...rowW);
    let y = 0; rows.forEach((r, i) => { const rh = Math.max(...r.map(n => n.h)); let x = Math.round((W - rowW[i]) / 2); r.forEach((n, j) => { if (j) x += gapBetween(r[j - 1], n); n.px = x; n.py = y; x += n.w; }); y += rh + LAYOUT.GAPY + (i < rows.length - 1 ? LAYOUT.ROWLAB : 0); });
    return { w: W, h: y - LAYOUT.GAPY };
  },
  /** V3.956 — pieces packed into a width: tallest first, each where it sits lowest along the skyline (and leftmost
      there), so a short piece goes under a shorter neighbour rather than on a new row; PGX / PGY between pieces.
      Sets p.gx, p.gy; returns the box. */
  skyline(pieces, W) {
    pieces.sort((a, b) => b.h - a.h || b.w - a.w); let sky = [{ x: 0, w: W, y: 0 }]; let bw = 0, bh = 0;
    pieces.forEach(p => {
      let best = null;
      for (let i = 0; i < sky.length; i++) { const x = sky[i].x; if (x + p.w > W + 1) continue; let y = 0, left = p.w; for (let j = i; left > 0 && j < sky.length; j++) { y = Math.max(y, sky[j].y); left -= sky[j].w; } if (!best || y < best.y || (y === best.y && x < best.x)) best = { x, y }; }
      if (!best) best = { x: 0, y: Math.max(...sky.map(s => s.y)) };
      p.gx = best.x; p.gy = best.y; bw = Math.max(bw, p.gx + p.w); bh = Math.max(bh, p.gy + p.h);
      const x0 = best.x, x1 = Math.min(W, best.x + p.w + LAYOUT.PGX), ny = best.y + p.h + LAYOUT.PGY, out = [];
      sky.forEach(s => { const s0 = s.x, s1 = s.x + s.w; if (s1 <= x0 || s0 >= x1) return out.push(s); if (s0 < x0) out.push({ x: s0, w: x0 - s0, y: s.y }); if (s1 > x1) out.push({ x: x1, w: s1 - x1, y: s.y }); });
      out.push({ x: x0, w: x1 - x0, y: ny }); out.sort((a, b) => a.x - b.x);
      sky = out.reduce((m, s) => { const l = m[m.length - 1]; if (l && l.y === s.y && l.x + l.w === s.x) l.w += s.w; else m.push(Object.assign({}, s)); return m; }, []);
    });
    return { w: bw, h: bh };
  },
  /** V3.956 — the smallest near-square area: of several widths around the square root of the pieces' area, the one
      whose box fits a window (ASPECT wide to 1 tall) at the highest zoom — never narrower than the widest piece. */
  square(pieces, aspect = LAYOUT.ASPECT) {
    const area = pieces.reduce((s, p) => s + (p.w + LAYOUT.PGX) * (p.h + LAYOUT.PGY), 0), widest = Math.max(...pieces.map(p => p.w)), base = Math.max(widest, Math.sqrt(area * aspect));
    let best = null;
    [.7, .8, .9, 1, 1.1, 1.25, 1.4, 1.6].forEach(k => { const W = Math.max(widest, Math.round(base * k)), r = LAYOUT.skyline(pieces, W), cost = Math.max(r.w, r.h * aspect) + (r.w * r.h) / 2e5;
      if (!best || cost < best.cost - 1e-6) best = { W, cost, w: r.w, h: r.h, at: pieces.map(p => [p.gx, p.gy]) }; });
    pieces.forEach((p, i) => { p.gx = best.at[i][0]; p.gy = best.at[i][1]; }); return best;
  },
  tidy(pane) {
    const d = M.doc(pane.docId); if (!d || pane.travel) return; if (prof(d.type).ordered) return LAYOUT.flow(pane);
    const G = LAYOUT.graph(pane, d), N = Object.values(G.node); if (!N.length) return;
    const head = pane.rectOf('_head'), top = head ? head.y + head.h + LAYOUT.GAPY : 0, left = head ? head.x : 0;
    // pieces: each unfolded region's members as one piece, then the connected groups of the rest, each single component one of its own
    const used = new Set(), pieces = [];
    G.regions.filter(r => !r.collapsed).forEach(r => { const mem = REGION.blocksOf(r, d).map(id => G.node[id]).filter(n => n && !used.has(n.id)); if (!mem.length) return; mem.forEach(n => used.add(n.id));
      const sz = LAYOUT.pack(mem, by => mem.flatMap(n => n.out.filter(e => by[e.to]).map(e => ({ from: n.id, to: e.to, rel: e.rel })))); pieces.push({ nodes: mem, w: sz.w + 2 * REGION.PAD, h: sz.h + 2 * REGION.PAD + 34, pad: REGION.PAD, padTop: REGION.PAD + 34, region: r }); });
    const rest = N.filter(n => !used.has(n.id)), comp = {}; let k = 0;
    rest.forEach(n => { if (comp[n.id] != null) return; const q = [n]; comp[n.id] = k; while (q.length) { const x = q.pop(); [...x.out.map(e => e.to), ...x.in.map(e => e.from), ...x.und].forEach(id => { if (comp[id] == null && G.node[id] && !used.has(id)) { comp[id] = k; q.push(G.node[id]); } }); } k++; });
    const groups = []; rest.forEach(n => { (groups[comp[n.id]] = groups[comp[n.id]] || []).push(n); });
    let singles = 0; groups.forEach(g => { if (g.length === 1) { const n = g[0]; n.px = 0; n.py = 0; singles++; pieces.push({ nodes: g, w: n.w, h: n.h, pad: 0, padTop: 0 }); return; }
      const sz = LAYOUT.pack(g, by => g.flatMap(n => n.out.filter(e => by[e.to]).map(e => ({ from: n.id, to: e.to, rel: e.rel })))); pieces.push({ nodes: g, w: sz.w, h: sz.h, pad: 0, padTop: 0 }); });
    // the window's own shape (square to 1.6 : 1) is what the packing fits, so Fit gives the highest zoom here
    const pr = pane.paper.rect(), packed = LAYOUT.square(pieces, clamp(pr.width / Math.max(1, pr.height), 1, 1.6));
    // apply: one undo step, animated
    const snap = v => Math.round(v / 14) * 14; DB.beginGroup('tidy');
    const put = (n, x, y) => { const b = M.block(n.id); if (!b) return; b.x = snap(left + x + (n.dx || 0)); b.y = snap(top + y); DB.put('blocks', b); };
    pieces.forEach(p => p.nodes.forEach(n => put(n, p.gx + p.pad + n.px, p.gy + p.padTop + n.py)));
    G.regions.filter(r => r.collapsed).forEach(r => { r.at = { x: snap(left), y: snap(top + packed.h + LAYOUT.PGY) }; });
    const host = pane.paper && pane.paper.world; if (host) { host.classList.add('tidying'); setTimeout(() => host.classList.remove('tidying'), 320); }
    REGION.tidy(d); d.layout.head = { x: 0, y: 0 }; d.layout.synth = null; DB.put('documents', d); changed();
    setTimeout(() => pane.paper.fit(pane.bbox()), 90);
    toast('Tidied · ' + plural(pieces.length - singles, 'group') + (singles ? ' · ' + plural(singles, 'single component') : '') + ' · packed into ' + Math.round(packed.w) + ' × ' + Math.round(packed.h) + ' · Ctrl+Z undoes');
  },
};
{
  // Tidy is by links; the old re-flow stays as "Flow in order"
  const flow = DocView.tidy; LAYOUT.flow = pane => flow.call(pane); DocView.tidy = function () { return LAYOUT.tidy(this); }; DocView.tidyFlow = function () { return flow.call(this); };
  const dm = DocView.docMenu; if (dm) DocView.docMenu = function (d, e) { const cm = ctxMenu; let done = false; const self = this; window.ctxMenu = function (x, y, items) { if (!done) { done = true; const i = items.findIndex(it => it && it.label === 'Tidy layout'); if (i >= 0) { items[i] = { label: 'Tidy layout', sub: 'By links: chains from their origin, no crossings where there need be none, everything packed into the smallest near-square area', run: () => self.tidy() }; items.splice(i + 1, 0, { label: 'Flow in order', sub: 'The old tidy: the boxes in order, two columns', run: () => self.tidyFlow() }); } } return cm.apply(this, arguments); }; try { return dm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
}
