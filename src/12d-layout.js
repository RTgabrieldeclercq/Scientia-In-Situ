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
   V4.69 (Gabe, 20 Nov 2026: "Tidy layout should be reversible to user manual
   layout state, and upgrade tidy layout in general to be various styles: flow
   of information top down or horizontally, etc..."):
   - Reversible: before a tidy the note keeps where everything stood
     (d.layout.tidy = { style, at, from, to, ... }, on the note's record, so it
     syncs); "Undo tidy · back to your layout" restores it any time later, not
     only through Ctrl+Z. Tidying again, with another style, still goes back
     to the layout you made yourself: the first state is kept while nothing
     was moved since the last tidy; a component you moved afterwards makes the
     layout as it is the new one to go back to.
   - Styles, chosen when tidying, remembered per note (d.layout.tidyStyle),
     with a default in Settings → Tidy layout:
       Packed       by links, everything in the smallest near-square area (the
                    tidy so far)
       Top down     information flows down: each group a stack of rows, groups
                    side by side; the unconnected ones in a grid after them
       Left to right information flows across: each group a row of columns,
                    groups one under the other
       By kind      a column for each kind (claim, question, result…), oldest
                    on top
       Grid         reading order (oldest first) in even rows and columns
   LAYOUT.arrange(style, nodes, regionPieces, aspect) is the placing alone, so
   Settings' preview draws the same layout on a sample.
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
  pack(nodes, edgesOf, dir = 'down') {
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
    if (dir === 'across') {   // V4.69 — the layers are columns: left to right, each stacked down, the arrows run across
      const labW = i => LAYOUT.GAPX + Math.max(0, ...E.filter(e => !e.back && layer[e.from] === i).map(e => String((REL[e.rel] || { label: e.rel }).label || '').length * LAYOUT.LABEL));
      const colW = rows.map(r => Math.max(...r.map(n => n.w))), colH = rows.map(r => r.reduce((t, n, i) => t + n.h + (i ? LAYOUT.GAPY : 0), 0)), H = Math.max(...colH);
      let x = 0; rows.forEach((r, i) => { let y = Math.round((H - colH[i]) / 2); r.forEach((n, j) => { if (j) y += LAYOUT.GAPY; n.px = x; n.py = y; y += n.h; }); x += colW[i] + (i < rows.length - 1 ? labW(i) : 0); });
      return { w: x, h: H };
    }
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
  /* ---------- V4.69 — the styles ---------- */
  STYLES: [
    { id: 'packed', label: 'Packed', sub: 'By links, everything in the smallest near-square area', ic: '<rect x="2" y="2" width="6" height="5"/><rect x="10" y="2" width="6" height="8"/><rect x="2" y="9" width="6" height="7"/><rect x="10" y="12" width="6" height="4"/>' },
    { id: 'down', label: 'Top down', sub: 'Information flows down: each group a stack of rows, side by side', ic: '<rect x="6" y="1.5" width="6" height="3.5"/><rect x="2" y="7.5" width="6" height="3.5"/><rect x="10" y="7.5" width="6" height="3.5"/><rect x="6" y="13.5" width="6" height="3"/><path d="M9 5v2.5M9 11v2.5"/>' },
    { id: 'across', label: 'Left to right', sub: 'Information flows across: each group a row of columns, one under the other', ic: '<rect x="1.5" y="6" width="3.5" height="6"/><rect x="7.5" y="2" width="3.5" height="6"/><rect x="7.5" y="10" width="3.5" height="6"/><rect x="13.5" y="6" width="3" height="6"/><path d="M5 9h2.5M11 9h2.5"/>' },
    { id: 'kind', label: 'By kind', sub: 'A column for each kind — claims, questions, results… — oldest on top', ic: '<rect x="2" y="2" width="4" height="4"/><rect x="2" y="8" width="4" height="4"/><rect x="7" y="2" width="4" height="4"/><rect x="12" y="2" width="4" height="4"/><rect x="12" y="8" width="4" height="4"/><rect x="12" y="14" width="4" height="3"/>' },
    { id: 'grid', label: 'Grid', sub: 'Reading order, oldest first, in even rows and columns', ic: '<rect x="2" y="2" width="5" height="5"/><rect x="11" y="2" width="5" height="5"/><rect x="2" y="11" width="5" height="5"/><rect x="11" y="11" width="5" height="5"/>' },
  ],
  icon: id => '<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + ((LAYOUT.STYLES.find(x => x.id === id) || {}).ic || '') + '</svg>',
  /** The default style (Settings → Tidy layout). */
  defaultStyle() { let s = 'packed'; try { s = FEAT.tune('tidy', 'style') || 'packed'; } catch (e) { } return LAYOUT.STYLES.some(x => x.id === s) ? s : 'packed'; },
  /** The style a note tidies with: the one asked for, else the one it remembers, else the default. */
  styleOf(d, want) { const ok = id => LAYOUT.STYLES.some(x => x.id === id) ? id : null; let mem = true; try { mem = FEAT.tune('tidy', 'remember') !== false; } catch (e) { } return ok(want) || (mem && ok(d && d.layout && d.layout.tidyStyle)) || LAYOUT.defaultStyle(); },
  /** A sample note laid out in a style, drawn small (Settings → Tidy layout's preview): the same LAYOUT.arrange the notes use. */
  sample(style) {
    const mk = (id, k, n) => ({ id, b: { created: String(n).padStart(3, '0'), ckind: k }, w: 392, h: 120, dx: 0, out: [], in: [], und: [] }), N = [['a', 'question'], ['b', 'claim'], ['c', 'claim'], ['d', 'result'], ['e', 'question'], ['f', 'result'], ['g', 'claim'], ['h', 'result']].map(([id, k], i) => mk(id, k, i)), by = Object.fromEntries(N.map(n => [n.id, n]));
    const E = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['e', 'f']]; E.forEach(([x, y]) => { by[x].out.push({ to: y, rel: 'supports' }); by[y].in.push({ from: x, rel: 'supports' }); });
    const A = LAYOUT.arrange(style, N, [], 1.5), PAD = 24, W = A.w + 2 * PAD, H = A.h + 2 * PAD, col = { question: 'var(--k-question,#C4561F)', claim: 'var(--k-claim,#1E5E8C)', result: 'var(--k-result,#2E7D4F)' };
    const svg = SV('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: 170, preserveAspectRatio: 'xMidYMid meet', class: 'pv-tdy', 'aria-hidden': 'true' });
    const ctr = id => ({ x: PAD + A.at[id].x + 196, y: PAD + A.at[id].y + 60 });
    svg.append(SV('defs', {}, SV('marker', { id: 'tdyah', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, SV('path', { d: 'M0 0L10 5L0 10z', fill: 'var(--ink-3)' }))));
    E.forEach(([x, y]) => { const p = ctr(x), q = ctr(y), dx = q.x - p.x, dy = q.y - p.y, vert = Math.abs(dy) - 120 >= Math.abs(dx) - 392, sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;   // from the edge that faces the other box to its facing edge
      svg.append(SV('line', vert ? { x1: p.x, y1: p.y + sy * 60, x2: q.x, y2: q.y - sy * 60, class: 'tdy-ar', 'marker-end': 'url(#tdyah)' } : { x1: p.x + sx * 196, y1: p.y, x2: q.x - sx * 196, y2: q.y, class: 'tdy-ar', 'marker-end': 'url(#tdyah)' })); });
    N.forEach(n => { const p = A.at[n.id], k = n.b.ckind; svg.append(SV('rect', { x: PAD + p.x, y: PAD + p.y, width: n.w, height: n.h, rx: 14, class: 'tdy-bx' }), SV('rect', { x: PAD + p.x + 22, y: PAD + p.y + 26, width: 110, height: 16, rx: 8, fill: col[k], opacity: .85 }), SV('rect', { x: PAD + p.x + 22, y: PAD + p.y + 60, width: 300, height: 12, rx: 6, class: 'tdy-ln' }), SV('rect', { x: PAD + p.x + 22, y: PAD + p.y + 84, width: 210, height: 12, rx: 6, class: 'tdy-ln' })); });
    return svg;
  },
  kindOf(b) { let k = null; try { k = (typeof IX !== 'undefined' && b.id && IX.kindsOf(b)[0]) || null; } catch (e) { } return k || b.ckind || b.kindLabel || b.kind || 'block'; },
  /** The connected groups of free nodes (a node with no link is a group of one). */
  groups(rest, byId) {
    const comp = {}; let k = 0;
    rest.forEach(n => { if (comp[n.id] != null) return; const q = [n]; comp[n.id] = k; while (q.length) { const x = q.pop(); [...x.out.map(e => e.to), ...x.in.map(e => e.from), ...x.und].forEach(id => { if (comp[id] == null && byId[id]) { comp[id] = k; q.push(byId[id]); } }); } k++; });
    const groups = []; rest.forEach(n => { (groups[comp[n.id]] = groups[comp[n.id]] || []).push(n); }); return groups.filter(Boolean);
  },
  edges: g => by => g.flatMap(n => n.out.filter(e => by[e.to]).map(e => ({ from: n.id, to: e.to, rel: e.rel }))),
  byCreated: (a, b) => String(a.b.created || '').localeCompare(String(b.b.created || '')) || String(a.id).localeCompare(String(b.id)),
  /** A set of nodes as columns (n.px, n.py); `cols` = [[node…], …] — returns its size. */
  columns(cols) { const cw = cols.map(c => Math.max(...c.map(n => n.w))); let x = 0, H = 0; cols.forEach((c, i) => { let y = 0; c.forEach((n, j) => { if (j) y += LAYOUT.GAPY; n.px = x; n.py = y; y += n.h; }); H = Math.max(H, y); x += cw[i] + LAYOUT.GAPX; }); return { w: Math.max(0, x - LAYOUT.GAPX), h: H }; },
  /** Even rows and columns in the given order; `cols` columns wide. */
  grid(nodes, cols) { const cw = []; nodes.forEach((n, i) => { cw[i % cols] = Math.max(cw[i % cols] || 0, n.w); }); const rh = []; nodes.forEach((n, i) => { const r = Math.floor(i / cols); rh[r] = Math.max(rh[r] || 0, n.h); });
    const xs = cw.reduce((a, w, i) => (a.push(i ? a[i - 1] + cw[i - 1] + LAYOUT.GAPX : 0), a), []), ys = rh.reduce((a, hh, i) => (a.push(i ? a[i - 1] + rh[i - 1] + LAYOUT.GAPY : 0), a), []);
    nodes.forEach((n, i) => { n.px = xs[i % cols]; n.py = ys[Math.floor(i / cols)]; }); return { w: xs[xs.length - 1] + cw[cw.length - 1], h: ys[ys.length - 1] + rh[rh.length - 1] }; },
  /** Pieces in shelves, in order: along x (wrapping at `limit` wide) or along y (wrapping at `limit` tall); sets p.gx, p.gy; returns the box. */
  shelves(pieces, limit, axis) {
    let a = 0, b = 0, run = 0, bw = 0, bh = 0;   // a: position along the shelf, b: where the shelf starts across, run: the shelf's thickness
    pieces.forEach(p => { const len = axis === 'x' ? p.w : p.h, thick = axis === 'x' ? p.h : p.w; if (a > 0 && a + len > limit) { a = 0; b += run + (axis === 'x' ? LAYOUT.PGY : LAYOUT.PGX); run = 0; }
      if (axis === 'x') { p.gx = a; p.gy = b; } else { p.gx = b; p.gy = a; } a += len + (axis === 'x' ? LAYOUT.PGX : LAYOUT.PGY); run = Math.max(run, thick); bw = Math.max(bw, p.gx + p.w); bh = Math.max(bh, p.gy + p.h); });
    return { w: bw, h: bh };
  },
  /** Place `rest` (free nodes: .id .b .w .h .out .in .und) in a style, after the region pieces; returns { w, h, at: id → {x, y}, groups, singles }. Pure: nothing is written. */
  arrange(style, rest, regionPieces = [], aspect = LAYOUT.ASPECT) {
    const byId = Object.fromEntries(rest.map(n => [n.id, n])), pieces = regionPieces.slice(); let groups = 0, singles = 0, box;
    const total = ps => ps.reduce((t, p) => t + (p.w + LAYOUT.PGX) * (p.h + LAYOUT.PGY), 0);
    if (style === 'kind' || style === 'grid') {
      const sorted = rest.slice().sort(LAYOUT.byCreated);
      if (sorted.length) {
        if (style === 'kind') { const order = []; sorted.forEach(n => { const k = LAYOUT.kindOf(n.b); if (!order.includes(k)) order.push(k); }); const cols = order.map(k => sorted.filter(n => LAYOUT.kindOf(n.b) === k)), sz = LAYOUT.columns(cols); pieces.push({ nodes: sorted, w: sz.w, h: sz.h, pad: 0, padTop: 0 }); groups = cols.length; }
        else { const c = Math.max(1, Math.ceil(Math.sqrt(sorted.length * aspect * 0.8))), sz = LAYOUT.grid(sorted, c); pieces.push({ nodes: sorted, w: sz.w, h: sz.h, pad: 0, padTop: 0 }); groups = 1; }
      }
      const widest = Math.max(1, ...pieces.map(p => p.w)); box = LAYOUT.shelves(pieces, Math.max(widest, Math.round(Math.sqrt(total(pieces) * aspect) * 1.3)), 'x');
    } else {
      const dir = style === 'across' ? 'across' : 'down', G = LAYOUT.groups(rest, byId), loose = [];
      G.forEach(g => { if (g.length === 1) { singles++; loose.push(g[0]); return; } groups++; const sz = LAYOUT.pack(g, LAYOUT.edges(g), dir); pieces.push({ nodes: g, w: sz.w, h: sz.h, pad: 0, padTop: 0 }); });
      if (style === 'packed') loose.forEach(n => { n.px = 0; n.py = 0; pieces.push({ nodes: [n], w: n.w, h: n.h, pad: 0, padTop: 0 }); });
      else if (loose.length) { loose.sort(LAYOUT.byCreated); const c = Math.max(1, Math.ceil(Math.sqrt(loose.length * aspect * 0.8))), sz = LAYOUT.grid(loose, loose.length === 1 ? 1 : c); pieces.push({ nodes: loose, w: sz.w, h: sz.h, pad: 0, padTop: 0 }); }
      if (style === 'packed') box = LAYOUT.square(pieces, aspect);
      else { const reg = pieces.filter(p => p.region), grp = pieces.filter(p => !p.region && p.nodes.length > 1 && !(loose.length > 1 && p.nodes === loose)).sort((a, b) => b.nodes.length - a.nodes.length), lo = pieces.filter(p => !reg.includes(p) && !grp.includes(p)), order = [...reg, ...grp, ...lo];
        pieces.length = 0; pieces.push(...order);
        const widest = Math.max(1, ...pieces.map(p => p.w)), tallest = Math.max(1, ...pieces.map(p => p.h)), area = total(pieces);
        box = style === 'across' ? LAYOUT.shelves(pieces, Math.max(tallest, Math.round(Math.sqrt(area / aspect) * 1.25)), 'y') : LAYOUT.shelves(pieces, Math.max(widest, Math.round(Math.sqrt(area * aspect) * 1.25)), 'x'); }
    }
    const at = {}; pieces.forEach(p => p.nodes.forEach(n => { at[n.id] = { x: p.gx + p.pad + n.px, y: p.gy + p.padTop + n.py }; }));
    return { w: box ? box.w : 0, h: box ? box.h : 0, at, pieces, groups, singles };
  },
  /* ---------- V4.69 — the way back ---------- */
  /** Where everything stands now (components that have a place, the head and synthesis boxes, folded regions). */
  snap(d) {
    const pos = {}; M.liveBlocks(d.id).filter(b => b.kind !== 'ink' && b.x != null).forEach(b => { pos[b.id] = [b.x, b.y]; });
    const rat = {}; REGION.list(d).forEach(r => { rat[r.id] = r.at ? { x: r.at.x, y: r.at.y } : null; });
    const L = d.layout || {}, t = L.tidy;
    // nothing moved since the last tidy? then the way back stays the layout from before that one (not this one, which is the tidy's own work)
    const untouched = !!(t && t.to && t.from && Object.keys(t.to).every(id => { const b = M.block(id); return !b || b.status !== 'live' || (Math.abs((b.x || 0) - t.to[id][0]) < 1 && Math.abs((b.y || 0) - t.to[id][1]) < 1); }));
    return { pos, rat, head: L.head ? { x: L.head.x, y: L.head.y } : null, synth: L.synth ? { x: L.synth.x, y: L.synth.y } : null, keepFrom: untouched ? t.from : null };
  },
  /** Keep the way back after a tidy (call with the snapshot taken before): the first state is kept while nothing moved since the last tidy. */
  keep(d, before, style) {
    const now = LAYOUT.snap(d), from = before.keepFrom || { pos: before.pos, rat: before.rat, head: before.head, synth: before.synth };
    d.layout = Object.assign({}, d.layout, { tidyStyle: style, tidy: { style, at: isoLocal(new Date()), from, to: now.pos } });
    DB.put('documents', d);
  },
  /** "Undo tidy · back to your layout": the manual positions are restored (a component made since stays where it is). */
  untidy(pane) {
    const d = M.doc(pane.docId), t = d && d.layout && d.layout.tidy; if (!d || !t || pane.travel) return toast('Nothing tidied here to undo');
    DB.beginGroup('untidy'); let n = 0;
    Object.keys(t.from.pos).forEach(id => { const b = M.block(id); if (!b || b.status !== 'live' || b.docId !== d.id) return; b.x = t.from.pos[id][0]; b.y = t.from.pos[id][1]; DB.put('blocks', b); n++; });
    d.regions = REGION.list(d).map(r => (r.id in (t.from.rat || {})) ? Object.assign({}, r, { at: t.from.rat[r.id] }) : r);
    const L = Object.assign({}, d.layout); L.head = t.from.head || L.head; L.synth = t.from.synth !== undefined ? t.from.synth : L.synth; delete L.tidy; d.layout = L;
    REGION.tidy(d); DB.put('documents', d);
    const host = pane.paper && pane.paper.world; if (host) { host.classList.add('tidying'); setTimeout(() => host.classList.remove('tidying'), 320); }
    changed(); setTimeout(() => pane.paper.fit(pane.bbox()), 90); toast('Back to your layout · ' + plural(n, 'component') + ' where you had put them');
  },
  /** The rows the note's menus show for Tidy: the tidy (opens the styles), Flow in order, Undo tidy. */
  menuRows(pane, d) {
    const on = !(typeof FEAT !== 'undefined' && !FEAT.on('tidy')), ordered = prof(d.type).ordered, st = LAYOUT.STYLES.find(x => x.id === LAYOUT.styleOf(d)), t = d.layout && d.layout.tidy;
    return [{ label: 'Tidy layout', sub: !on || ordered ? 'Re-flow the boxes in order' : 'Style: ' + st.label + ' — click to choose another', run: e => on && !ordered ? LAYOUT.menu(pane, e) : pane.tidy() },
      on && t ? { label: 'Undo tidy · back to your layout', sub: 'The positions you had before the ' + (LAYOUT.STYLES.find(x => x.id === t.style) || { label: 'last' }).label.toLowerCase() + ' tidy, ' + fmtWhen(t.at), run: () => LAYOUT.untidy(pane) } : null];
  },
  /** The styles to choose from, where the pointer is. */
  menu(pane, e) {
    const d = M.doc(pane.docId); if (!d) return; const cur = LAYOUT.styleOf(d), t = d.layout && d.layout.tidy;
    ctxMenu((e && e.clientX || innerWidth / 2) - 20, (e && e.clientY || 120) + 8, [{ head: 'Tidy layout — how the information flows' },
      ...LAYOUT.STYLES.map(s => ({ label: h('span.tdy-l', h('i.tdy-i', { html: LAYOUT.icon(s.id) }), (s.id === cur ? '✓ ' : '') + s.label), sub: s.sub, run: () => pane.tidy(s.id) })),
      'sep', { label: 'Flow in order', sub: 'The old tidy: the boxes in order, two columns', run: () => pane.tidyFlow() },
      t ? { label: 'Undo tidy · back to your layout', sub: 'Your positions from before the tidy, ' + fmtWhen(t.at), run: () => LAYOUT.untidy(pane) } : null]);
  },
  tidy(pane, want) {
    const d = M.doc(pane.docId); if (!d || pane.travel) return; const on = !(typeof FEAT !== 'undefined' && !FEAT.on('tidy'));
    const before = on ? LAYOUT.snap(d) : null;
    if (prof(d.type).ordered) { if (on) DB.beginGroup('tidy'); LAYOUT.flow(pane); if (on) LAYOUT.keep(d, before, 'flow'); return; }
    const style = on ? LAYOUT.styleOf(d, want) : 'packed';
    const G = LAYOUT.graph(pane, d), N = Object.values(G.node); if (!N.length) return;
    const head = pane.rectOf('_head'), top = head ? head.y + head.h + LAYOUT.GAPY : 0, left = head ? head.x : 0;
    // pieces: each unfolded region's members as one piece (laid out as the style says), then the free components in the style
    const used = new Set(), regionPieces = [], dir = style === 'across' ? 'across' : 'down';
    G.regions.filter(r => !r.collapsed).forEach(r => { const mem = REGION.blocksOf(r, d).map(id => G.node[id]).filter(n => n && !used.has(n.id)); if (!mem.length) return; mem.forEach(n => used.add(n.id));
      const sz = LAYOUT.pack(mem, LAYOUT.edges(mem), dir); regionPieces.push({ nodes: mem, w: sz.w + 2 * REGION.PAD, h: sz.h + 2 * REGION.PAD + 34, pad: REGION.PAD, padTop: REGION.PAD + 34, region: r }); });
    const rest = N.filter(n => !used.has(n.id));
    // the window's own shape (square to 1.6 : 1) is what the packing fits, so Fit gives the highest zoom here
    const pr = pane.paper.rect(), A = LAYOUT.arrange(style, rest, regionPieces, clamp(pr.width / Math.max(1, pr.height), 1, 1.6));
    // apply: one undo step, animated
    const snap = v => Math.round(v / 14) * 14; DB.beginGroup('tidy');
    const put = (n, x, y) => { const b = M.block(n.id); if (!b) return; b.x = snap(left + x + (n.dx || 0)); b.y = snap(top + y); DB.put('blocks', b); };
    A.pieces.forEach(p => p.nodes.forEach(n => put(n, A.at[n.id].x, A.at[n.id].y)));
    G.regions.filter(r => r.collapsed).forEach(r => { r.at = { x: snap(left), y: snap(top + A.h + LAYOUT.PGY) }; });
    const host = pane.paper && pane.paper.world; if (host) { host.classList.add('tidying'); setTimeout(() => host.classList.remove('tidying'), 320); }
    REGION.tidy(d); d.layout.head = { x: 0, y: 0 }; d.layout.synth = null; DB.put('documents', d);
    if (on) LAYOUT.keep(d, before, style);
    changed();
    setTimeout(() => pane.paper.fit(pane.bbox()), 90);
    const nm = (LAYOUT.STYLES.find(x => x.id === style) || {}).label;
    toast('Tidied · ' + (on ? nm + ' · ' : '') + plural(A.groups + (style === 'kind' ? 0 : regionPieces.length), style === 'kind' ? 'kind' : 'group') + (A.singles && style !== 'kind' ? ' · ' + plural(A.singles, 'single component') : '') + ' · ' + Math.round(A.w) + ' × ' + Math.round(A.h) + (on ? ' · Undo tidy: the note’s ⋯ menu' : ' · Ctrl+Z undoes'), on ? 4200 : 2400);
  },
};
{
  // Tidy is by links; the old re-flow stays as "Flow in order". The note's menus (13-docpanels) show the rows from LAYOUT.menuRows.
  const flow = DocView.tidy; LAYOUT.flow = pane => flow.call(pane); DocView.tidy = function (style) { return LAYOUT.tidy(this, style); }; DocView.tidyFlow = function () { const d = M.doc(this.docId), on = !(typeof FEAT !== 'undefined' && !FEAT.on('tidy')), before = on && d ? LAYOUT.snap(d) : null; if (on && d) DB.beginGroup('tidy'); flow.call(this); if (on && d) LAYOUT.keep(d, before, 'flow'); };
}
