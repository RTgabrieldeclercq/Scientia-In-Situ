/* ==========================================================================
   13zp · Linking by hand, between notes and images.
   • Pen: a line with a circle at each end connects the two ink components
     nearest the circles (the stroke goes; you pick the connection).
   • From a component's link circle (pen or mouse), cross into another
     note's pane: drop on a component there to connect them, or on its
     paper to pick one of that note's components.
   • Every image in an image panel has its own link circle: that image alone
     is connected.
   • Pen: press and hold a highlight, drag it into another pane — it is
     embedded there (live). Dropped on a component, it is also connected.
     Dragging a component into another pane embeds it the same way.
   ========================================================================== */
const GEST = {
  len(P, a = 0, z = P.length - 1) { let s = 0; for (let i = a + 1; i <= z; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return s; },
  /** A loop over P[a..z]: round enough and of a sensible size → {cx, cy, r} */
  loop(P, a, z) {
    if (z - a < 6) return null; const Q = P.slice(a, z + 1); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ar = 0, cx = 0, cy = 0;
    Q.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); cx += x; cy += y; });
    for (let i = 0; i < Q.length; i++) { const [xa, ya] = Q[i], [xb, yb] = Q[(i + 1) % Q.length]; ar += xa * yb - xb * ya; } ar = Math.abs(ar) / 2;
    const w = x1 - x0, hh = y1 - y0; if (Math.min(w, hh) < 7 || Math.max(w, hh) > 160 || Math.min(w, hh) / Math.max(w, hh) < .4) return null;
    if (ar < .45 * w * hh) return null;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: (w + hh) / 4 };
  },
  cross(p, q, r, s) { const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]); if (!d) return false; const u = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d, v = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d; return u > 0 && u < 1 && v > 0 && v < 1; },
  /** The circle the stroke ends with: {cx, cy, r, at} (at = where the loop starts) */
  endLoop(P) { const n = P.length; if (n < 10) return null;
    for (let a = n - 8; a >= Math.floor(n * .35); a--) { // the stroke ends back where the loop began
      if (Math.hypot(P[n - 1][0] - P[a][0], P[n - 1][1] - P[a][1]) < Math.max(9, GEST.len(P, a, n - 1) * .12)) { const L = GEST.loop(P, a, n - 1); if (L) return Object.assign(L, { at: a }); } }
    for (let b = n - 2; b > n * .4; b--) for (let a = Math.max(Math.floor(n * .35), 0); a < b - 4; a++) if (GEST.cross(P[a], P[a + 1], P[b], P[b + 1])) { const L = GEST.loop(P, a + 1, b); if (L) return Object.assign(L, { at: a }); }
    return null; },
  startLoop(P) { const R = P.slice().reverse(), L = GEST.endLoop(R); return L ? Object.assign(L, { at: P.length - 1 - L.at }) : null; },
  /** circle — line — circle */
  dumbbell(P) { if (P.length < 24) return null; const s = GEST.startLoop(P), e = GEST.endLoop(P); if (!s || !e || s.at >= e.at) return null;
    if (Math.hypot(e.cx - s.cx, e.cy - s.cy) < 60 || GEST.len(P, s.at, e.at) < 40) return null; return { s, e }; },
};

/** The image panel behind a box: itself, or the panel an embedded copy shows. */
const FIGOF = b => b && b.fig ? b : (b && b.kind === 'ref' && !b.refItemId && M.block(b.refBlockId) && M.block(b.refBlockId).fig ? M.block(b.refBlockId) : null);
const LINKS = {
  part: null,     // an end that is one image: { box, cell, other, otherCell, t }
  paneAt(x, y, skip) { for (const el of document.elementsFromPoint(x, y)) { if (skip && skip.contains(el)) continue; const host = el.closest('.canvas-host'); if (host && host._dv) return { pane: host._dv, el }; } return null; },
  boxAt(x, y, skip) { for (const el of document.elementsFromPoint(x, y)) { if (skip && (skip === el || skip.contains(el))) continue; const b = el.closest('.box.cmp'); if (b) return { box: b, cell: el.closest('.fg-cell') }; if (el.closest('.canvas-host')) return null; } return null; },
  /** A region's title (or a folded region) under a screen point: its id (13v — a region connects like a component). */
  regionAt(x, y) { for (const el of document.elementsFromPoint(x, y)) { const t = el.closest('.rg-tab, .region.folded'); if (t) return t.closest('.region').dataset.rg; if (el.closest('.box.cmp, .canvas-host')) return null; } return null; },
  cellMedia(boxEl, cellEl) { if (!cellEl) return null; const b = FIGOF(M.block(boxEl.dataset.id)), i = +cellEl.dataset.i; const c = b && b.fig && (b.fig.cells || [])[i]; return c && c.media || null; },
  /** The ink component nearest a point (world), within reach; skip = ids to leave out. */
  nearestInk(pane, x, y, reach = 170, skip = []) { let best = null, bd = 1e9;
    INK.blocks(pane.docId).filter(b => !skip.includes(b.id)).forEach(b => { const r = pane.rectOf(b.id) || INK.rect(b), dx = Math.max(r.x - x, 0, x - r.x - r.w), dy = Math.max(r.y - y, 0, y - r.y - r.h), d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = b; } });
    if (best && bd <= reach) return best;
    // no ink close by: a component the circle is drawn on
    const hit = $$(':scope > .box.cmp', pane.paper.world).find(el => !skip.includes(el.dataset.id) && x > el.offsetLeft - 20 && x < el.offsetLeft + el.offsetWidth + 20 && y > el.offsetTop - 20 && y < el.offsetTop + el.offsetHeight + 20);
    return hit ? M.block(hit.dataset.id) : null; },
  connect(pane, from, to, x, y, part) { LINKS.part = part ? Object.assign({ t: Date.now() }, part) : null; pane.relationPopover(from, to, x, y); },
  /** Pick a component of one particular note ("Connect to a component in another note", that note only). */
  pickIn(from, docId, part) {
    const d = M.doc(docId); if (!d) return;
    const m = modal({ title: 'Connect to a component in “' + snippet(d.title, 40) + '”', wide: true, actions: [{ label: 'All notes…', run: () => DocView.crossWire(from) }, { label: 'Cancel' }], body: optionPicker({ placeholder: 'Search its components…',
      items: q => M.liveBlocks(docId).filter(b => b.id !== from && (b.kind === 'component' || b.kind === 'ink' || b.kind === 'ref' || WIDGETS[b.kind]) && (!q || (M.blockName(b) + ' ' + (b.body ? b.body.text : '')).toLowerCase().includes(q))),
      render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body ? b.body.text : '', 80))),
      onPick: b => { m.close(); LINKS.connect(DocView, from, b.id, innerWidth / 2 - 150, 160, part); } }) });
  },

  /** Drag a connection from a component's link circle, or from one image's circle. */
  drag(pane, fromId, fromCell, e) {
    const P = pane.paper, A = () => Object.assign(pane.partRect(fromId, fromCell) || { x: 0, y: 0, w: 1, h: 1 }, { id: fromId }); document.body.classList.add('wiring');
    const ownHost = P.el.closest('.canvas-host');
    const mv = ev => { const p = P.toWorld(ev.clientX, ev.clientY);
      const at = LINKS.paneAt(ev.clientX, ev.clientY), elsewhere = at && at.pane !== pane;
      $$('.box.target').forEach(x => x.classList.remove('target')); $$('.canvas-host.droptarget').forEach(x => x.classList.remove('droptarget'));
      const over = LINKS.boxAt(ev.clientX, ev.clientY);
      if (elsewhere) { P.stopEdgePan(); at.el.closest('.canvas-host').classList.add('droptarget'); if (over) over.box.classList.add('target'); pane.drawWires(pane.geom(A(), { x: p.x - 1, y: p.y - 1, w: 2, h: 2 }).d); return; }
      const rg = !over && !fromCell && LINKS.regionAt(ev.clientX, ev.clientY), rr = rg && rg !== fromId && pane.rectOf(rg);
      if (over && over.box.dataset.id !== fromId && ownHost.contains(over.box)) { over.box.classList.add('target'); const oc = LINKS.cellMedia(over.box, over.cell); pane.drawWires(pane.geom(A(), Object.assign(pane.partRect(over.box.dataset.id, oc), { id: over.box.dataset.id })).d); }
      else if (rr) pane.drawWires(pane.geom(A(), Object.assign(rr, { id: rg })).d);
      else pane.drawWires(pane.geom(A(), { x: p.x - 1, y: p.y - 1, w: 2, h: 2 }).d);
      P.edgePan(ev); };
    const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); P.stopEdgePan(); document.body.classList.remove('wiring');
      $$('.box.target').forEach(x => x.classList.remove('target')); $$('.canvas-host.droptarget').forEach(x => x.classList.remove('droptarget')); pane.drawWires();
      const over = LINKS.boxAt(ev.clientX, ev.clientY), at = LINKS.paneAt(ev.clientX, ev.clientY), other = at && at.pane !== pane ? at.pane : null;
      const part = fromCell ? { box: fromId, cell: fromCell } : null;
      if (over && over.box.dataset.id !== fromId) { const to = over.box.dataset.id, oc = LINKS.cellMedia(over.box, over.cell);
        const pair = [M.block(fromId), M.block(to)].map(x => x && x.kind).sort().join('+');
        if (!other && !fromCell && pair === 'calc+eq') { const c = [M.block(fromId), M.block(to)].find(x => x.kind === 'calc'); EQ.widen(c); M.wire(fromId, to, 'related', false); CALC._focus = c.id; toast('Wired — the calculator now solves the equation'); return; }
        return LINKS.connect(pane, fromId, to, ev.clientX, ev.clientY + 12, (part || oc) ? Object.assign(part || {}, oc ? { other: to, otherCell: oc } : {}) : null); }
      if (other && other.docId && other.docId !== pane.docId) return LINKS.pickIn(fromId, other.docId, part); // crossed into another note: pick one of its components
      if (fromCell) return toast('Drop it on a component to connect this image');
      // on a region's title: the region (a timer's wire tags it instead, 13za)
      const rg = LINKS.regionAt(ev.clientX, ev.clientY), fb = M.block(fromId);
      if (rg && rg !== fromId && !(fb && fb.kind === 'timer')) return LINKS.connect(pane, fromId, rg, ev.clientX, ev.clientY + 12);
      CHAINDROP.open(pane, fromId, ev); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },
};

{
  /* the end that is one image: the wire made by the connection picker gets it */
  const wire = M.wire.bind(M); M.wire = function (from, to, ...rest) { const w = wire(from, to, ...rest); const P = LINKS.part;
    if (w && P && Date.now() - P.t < 120000) { const set = (id, cell) => { if (!cell) return; if (w.from === id) w.fromCell = cell; else if (w.to === id) w.toCell = cell; };
      if ([w.from, w.to].includes(P.box || P.other)) { set(P.box, P.cell); set(P.other, P.otherCell); DB.put('wires', w); } LINKS.part = null; changed(); }
    return w; };
  /* the link circle: the new drag (cross-pane, end circle) */
  DocView.wireDrag = function (fromId, e) { return LINKS.drag(this, fromId, null, e); };
  const ptr = DocView.pointer; DocView.pointer = function (e) {
    const fp = e.target.closest && e.target.closest('.fg-port'); if (fp && e.button === 0 && !this.travel) { e.preventDefault(); e.stopPropagation(); const box = fp.closest('.box'), cell = fp.closest('.fg-cell');
      if (cell && cell.draggable) { cell.draggable = false; addEventListener('pointerup', () => setTimeout(() => { cell.draggable = true; }, 0), { once: true }); }
      return LINKS.drag(this, box.dataset.id, fp.dataset.media, e); }
    return ptr.call(this, e); };
  /* one link circle per image (the panel lays its images out after it is shown, and again on resize) */
  LINKS.ports = boxEl => { const b = FIGOF(M.block(boxEl.dataset.id)); if (!b || !b.fig) return; $$('.fg-cell', boxEl).forEach(c => { const m = LINKS.cellMedia(boxEl, c); const cur = $(':scope > .fg-port', c);
    if (!m) { cur && cur.remove(); return; } if (cur && cur.dataset.media === m) return; cur && cur.remove(); c.append(h('span.port.fg-port', { 'data-media': m, title: 'Drag to connect this image' })); }); };
  const bx = DocView.box; DocView.box = function (b, d, ro) { const el = bx.apply(this, arguments); if (el && b && FIGOF(b) && !this.travel) { const o = new MutationObserver(() => { o.disconnect(); LINKS.ports(el); o.observe(el, { childList: true, subtree: true }); }); o.observe(el, { childList: true, subtree: true }); requestAnimationFrame(() => LINKS.ports(el)); } return el; };
  /* a pane being dragged across doesn't scroll away under another pane */
  const mp = makePaper; makePaper = function (host, opts) { const P = mp(host, opts), ep = P.edgePan.bind(P);
    P.edgePan = function (e, f) { const at = LINKS.paneAt(e.clientX, e.clientY); if (at && at.el.closest('.canvas-host') !== P.el.closest('.canvas-host')) { P.stopEdgePan(); return; } return ep(e, f); }; return P; };

  /* pen: circle — line — circle between two ink components */
  const add = INK.addStroke.bind(INK); INK.addStroke = function (pane, s) {
    if (!s.hl && !s.geo && s.p && s.p.length >= 24) { const g = GEST.dumbbell(s.p);
      if (g) { const a = LINKS.nearestInk(pane, g.s.cx, g.s.cy), b = a && LINKS.nearestInk(pane, g.e.cx, g.e.cy, 170, [a.id]);
        if (a && b) { const sc = pane.paper.toScreen(g.e.cx, g.e.cy); LINKS.connect(pane, a.id, b.id, sc.x, sc.y + 14); return; } } }
    return add(pane, s); };

  /* pen: press and hold a highlight, drag it into another note; drag a component across too */
  let H = null;
  const ghost = txt => h('div.linkghost', snippet(txt, 60));
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'pen' || e.button !== 0) return; const st = e.target.closest && e.target.closest('.st[data-item]'); if (!st) return;
    const host = st.closest('.canvas-host'); if (!host || !host._dv) return;
    H = { id: e.pointerId, x: e.clientX, y: e.clientY, item: st.dataset.item, pane: host._dv, on: false };
    H.timer = setTimeout(() => { if (!H) return; H.on = true; getSelection().removeAllRanges(); const it = M.item(H.item); H.g = ghost(it ? it.text : st.textContent); document.body.append(H.g); H.g.style.left = H.x + 'px'; H.g.style.top = H.y + 'px'; document.body.classList.add('linkdrag'); st.classList.add('lifting'); H.st = st; }, 450);
  }, true);
  document.addEventListener('pointermove', e => { if (!H || e.pointerId !== H.id) return;
    if (!H.on) { if (Math.hypot(e.clientX - H.x, e.clientY - H.y) > 8) { clearTimeout(H.timer); H = null; } return; }
    e.preventDefault(); H.g.style.left = e.clientX + 'px'; H.g.style.top = e.clientY + 'px';
    $$('.canvas-host.droptarget,.box.target').forEach(x => x.classList.remove('droptarget', 'target')); const at = LINKS.paneAt(e.clientX, e.clientY, H.g);
    if (at && at.pane !== H.pane && at.pane.docId !== H.pane.docId) { at.el.closest('.canvas-host').classList.add('droptarget'); const ov = LINKS.boxAt(e.clientX, e.clientY, H.g); ov && ov.box.classList.add('target'); } }, true);
  document.addEventListener('selectstart', e => { if (H && H.on) e.preventDefault(); }, true);
  const endH = e => { if (!H || e.pointerId !== H.id) return; clearTimeout(H.timer); const h0 = H; H = null; if (!h0.on) return;
    e.preventDefault(); e.stopPropagation(); h0.g.remove(); h0.st && h0.st.classList.remove('lifting'); document.body.classList.remove('linkdrag'); $$('.canvas-host.droptarget,.box.target').forEach(x => x.classList.remove('droptarget', 'target'));
    if (e.type === 'pointercancel') return;
    const at = LINKS.paneAt(e.clientX, e.clientY); if (!at || at.pane === h0.pane || at.pane.docId === h0.pane.docId) return toast('Drop it in another note’s pane to bring it there');
    LINKS.embedAt(at.pane, { itemId: h0.item }, e); };
  document.addEventListener('pointerup', endH, true); document.addEventListener('pointercancel', endH, true);

  /* a component dragged across into another pane: embedded there, its own place unchanged */
  let D = null;
  document.addEventListener('pointerdown', e => { const box = e.target.closest && e.target.closest('.box.cmp'); const host = box && box.closest('.canvas-host');
    D = box && host && host._dv && App.route.name === 'split' ? { id: box.dataset.id, pane: host._dv, b: M.block(box.dataset.id) } : null; if (D && D.b) { D.x = D.b.x; D.y = D.b.y; } }, true);
  window.addEventListener('pointerup', e => { const d0 = D; D = null; if (!d0 || !d0.b || e.altKey) return; /* Alt: moved instead (13zb) */ const el = $(`.box.dragging[data-id="${d0.id}"]`); if (!el) return;
    const at = LINKS.paneAt(e.clientX, e.clientY, el); if (!at || at.pane === d0.pane || at.pane.docId === d0.pane.docId) return;
    const b = M.block(d0.id); if (b) { b.x = d0.x; b.y = d0.y; } // it stays where it was in its own note
    const src = b && b.kind === 'ref' ? { itemId: b.refItemId, blockId: b.refBlockId } : { blockId: d0.id };
    setTimeout(() => { if (b && (b.kind === 'component' || b.kind === 'ref')) LINKS.embedAt(at.pane, src, e, d0.id);
      else { const ov = LINKS.boxAt(e.clientX, e.clientY); if (ov) LINKS.connect(at.pane, d0.id, ov.box.dataset.id, e.clientX, e.clientY + 12); else LINKS.pickIn(d0.id, at.pane.docId); } }, 30); }, true);

  /** Embed (live) into the pane's note at the drop point; dropped on a component → also connect them. */
  LINKS.embedAt = function (pane, src, e, origin) {
    const ov = LINKS.boxAt(e.clientX, e.clientY), w = pane.paper.toWorld(e.clientX, e.clientY);
    let x = Math.round(w.x / 14) * 14, y = Math.round(w.y / 14) * 14;
    if (ov) { const r = pane.rectOf(ov.box.dataset.id); if (r) { x = Math.round((r.x + r.w + 56) / 14) * 14; y = Math.round(r.y / 14) * 14; } }
    DB.beginGroup(); const nb = M.pullInto(pane.docId, null, Object.assign({ x, y }, src)); changed();
    toast('Embedded in “' + snippet((M.doc(pane.docId) || {}).title || '', 30) + '” — it follows the original');
    if (ov) setTimeout(() => LINKS.connect(pane, nb.id, ov.box.dataset.id, e.clientX, e.clientY + 12), 120);
    return nb;
  };
}
