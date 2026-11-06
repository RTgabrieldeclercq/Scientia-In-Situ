/* ==========================================================================
   13zf · Fingers, pen and handwriting (iPad and any touch screen).
   On a note's paper:
     finger  — drag anywhere to pan, two fingers to zoom; tap buttons, tap a
               component to select it, tap its text to type; press and hold a
               component (½ s) to drag it.
     pen     — writes ink straight onto the paper. Strokes written close
               together gather into one ink component (it moves, wires, joins
               regions, takes timers and structure labels like any component).
               On an image panel's images it writes on top of them, and that
               ink is glued to the image (13zzc).
               In a component's text the pen is the iPad's own Scribble.
   The ink bar (top left; ✎ Pen beside Timer) picks the pen, highlighter,
   eraser or lasso, the colour and the width. The lasso selects strokes to
   move, delete, recolour or convert. "Convert to text" reads the handwriting
   on your computer (Settings → Handwriting) and replaces the ink with a text
   component — the ink is kept with it ("Show the handwriting", "Back to ink").
   With a mouse, "Draw with the mouse" in the bar does what the pen does.
   ========================================================================== */
const INK = {
  PAD: 14, NEAR: 44, COLORS: ['auto', '#2557c7', '#c0392b', '#1f8a70', '#d98e04'], WIDTHS: [1.4, 2.4, 4],
  pressure: _ls.get('inkPressure', true), _lastP: 0,
  /** Pressure feel, per device: sens 0 (firm: you must press) … 1 (light: a light touch is already full); widths as × the pen width; fade = how much lighter strokes fade. */
  curve: Object.assign({ sens: .5, min: .15, max: 2.2, fade: .6, emin: 4, emax: 20 }, _ls.get('inkCurve', {})),
  /** Pen mode: the pen writes. On the desktop that is the ink bar being out; the lab's web pills turn it on with the pen hand (INK.mouse) and use the bar for settings only. */
  writing: () => !!(INK.shown || INK.mouse),
  mapP(v) { const g = Math.pow(2, (.5 - INK.curve.sens) * 3.2); return clamp(Math.pow(clamp(v, 0, 1), g), .01, 1); },
  /** The little gauge in the ink bar shows the pen's pressure as you write (so you can see it is felt). */
  meter(v) { INK._lastP = v || 0; $$('.ink-gauge > i').forEach(g => g.style.height = Math.round((v || 0) * 100) + '%'); },
  tool: _ls.get('inkTool', 'pen'), color: _ls.get('inkColor', 0), width: _ls.get('inkWidth', 1), mouse: false, shown: _ls.get('inkBar', false),
  drawing: null, sel: null, _last: null,
  blocks: docId => M.docBlocks(docId).filter(b => b.kind === 'ink' && b.status === 'live'),
  rect: b => ({ x: b.x || 0, y: b.y || 0, w: b.w || 60, h: b.inkH || 60 }),
  r1: v => Math.round(v * 10) / 10,

  /* ---------- drawing a stroke: the whiteboard's way of writing (V3.941) ----------
     A pen stroke is the lab whiteboard's own outline (whiteboard.js V3.727, built into vendor/wb-ink.js as WBINK): a
     Catmull-Rom curve through every sample, its width smoothed along the line, round joins and ends, one filled outline —
     written here as SVG path data by a path recorder. The width follows this pen's pressure feel (13zq). */
  /** Width multiplier of a stroke at pressure p: the pressure feel's thinnest–thickest, or the whiteboard's own curve. */
  wmul(s, p) { p = p == null ? .5 : p; return s.pr ? (s.wr ? s.wr[0] + (s.wr[1] - s.wr[0]) * p : .18 + 1.65 * p) : WBINK.pressF(p); },
  /** A 2D-context stand-in: what the whiteboard's code draws on it comes out as SVG path data (rec.d). */
  pathRec() {
    const r = v => Math.round(v * 10) / 10, at = (x, y) => r(x) + ',' + r(y); let d = '', open = false;
    return { get d() { return d; }, set fillStyle(v) { }, beginPath() { open = false; }, fill() { }, closePath() { d += 'Z'; open = false; },
      moveTo(x, y) { d += 'M' + at(x, y); open = true; }, lineTo(x, y) { d += (open ? 'L' : 'M') + at(x, y); open = true; },
      arc(cx, cy, rad, a0, a1, ccw) {   // a canvas arc: a line to its start, then ≤ 90° SVG arcs
        const T = Math.PI * 2; let sw = ccw ? a0 - a1 : a1 - a0; sw = sw >= T ? T : ((sw % T) + T) % T;
        d += (open ? 'L' : 'M') + at(cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad); open = true;
        const n = Math.max(1, Math.ceil(sw / (Math.PI / 2) - 1e-9)), rr = r(rad);
        for (let i = 1; i <= n && sw > 0; i++) { const a = a0 + (ccw ? -1 : 1) * sw * i / n; d += 'A' + rr + ',' + rr + ' 0 0,' + (ccw ? 0 : 1) + ' ' + at(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } } };
  },
  /** The stroke's centre line, smoothed the whiteboard's way (the highlighter's band, a dashed line). */
  centreLine(s) {
    const pts = s.p; if (pts.length < 3) return 'M' + pts.map(p => p[0] + ',' + p[1]).join('L');
    const f = WBINK.flattenStroke(pts.flatMap(q => [q[0], q[1], .5]), 1, 1, 0, 0), r = v => Math.round(v * 10) / 10;
    return 'M' + f.xs.map((x, i) => r(x) + ',' + r(f.ys[i])).join('L');
  },
  path(s) {
    const pts = s.p; if (!pts || !pts.length) return '';
    if (s.hl) return s.geo ? 'M' + pts.map(p => p[0] + ',' + p[1]).join('L') : INK.centreLine(s);
    if (s.geo) { const br = new Set(s.br || []); return pts.map((p, i) => (i === 0 || br.has(i) ? 'M' : 'L') + p[0] + ',' + p[1]).join('') + (s.closed ? 'Z' : ''); }
    // each sample's width multiplier, carried into the whiteboard's pressF range (0.3–1.8) by one scale for the stroke
    const w = s.w || 2.4, m = pts.map(q => INK.wmul(s, q[2])); let lo = 1e9, hi = .01; m.forEach(v => { if (v < lo) lo = v; if (v > hi) hi = v; }); lo = Math.max(.01, lo);
    const k = s.pr ? Math.sqrt(lo * hi / .54) : 1;
    const flat = pts.flatMap((q, i) => [q[0], q[1], s.pr ? (m[i] / k - .4) / 1.2 : (q[2] == null ? .5 : q[2])]);
    const rec = INK.pathRec(); WBINK.fillStrokeOutline(rec, flat, '', w * k, 1, 0, 0); return rec.d;
  },
  /** "auto" ink (and the old near-black) follows the theme: black on light, white on dark. */
  col: c => !c || c === 'auto' || c === '#1d1d1b' ? 'var(--ink)' : c,
  swatch: c => c === 'auto' ? 'linear-gradient(135deg,#fff 0 50%,#1d1d1b 50% 100%)' : c,
  svgPath(s, i) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', INK.path(s)); if (i != null) p.dataset.i = i;
    const C = INK.col(s.c);
    if (s.geo) { p.setAttribute('class', 'ink-geo'); p.style.stroke = C; p.setAttribute('stroke-width', s.w); p.setAttribute('fill', 'none'); }
    else if (s.hl) { p.setAttribute('class', 'ink-hl'); p.style.stroke = C; p.setAttribute('stroke-width', s.w); p.setAttribute('fill', 'none'); } else { p.style.fill = C; if (s.o != null && s.o < 1) p.style.opacity = s.o; } return p; },
  svg(strokes, w, h) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('class', 'ink-svg');
    strokes.forEach((st, i) => s.appendChild(INK.svgPath(st, i))); return s; },

  /* ---------- the ink component ---------- */
  body(b) { return h('div.ink-body', { style: { width: (b.w || 60) + 'px', height: (b.inkH || 60) + 'px' } }, INK.svg((b.ink && b.ink.strokes) || [], b.w || 60, b.inkH || 60)); },
  /** Re-fit the box to its strokes (it grows, shrinks and moves with them); strokes stay put on the paper. */
  fit(b) {
    const S = (b.ink && b.ink.strokes) || []; if (!S.length) return false;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    S.forEach(s => { const r = (s.w || 2) / 2 + 1; s.p.forEach(p => { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }); });
    const dx = x0 - INK.PAD, dy = y0 - INK.PAD;
    if (dx || dy) S.forEach(s => s.p.forEach(p => { p[0] = INK.r1(p[0] - dx); p[1] = INK.r1(p[1] - dy); }));
    b.x = INK.r1((b.x || 0) + dx); b.y = INK.r1((b.y || 0) + dy); b.w = Math.max(40, Math.ceil(x1 - x0 + INK.PAD * 2)); b.inkH = Math.max(40, Math.ceil(y1 - y0 + INK.PAD * 2)); return true;
  },
  save(pane, b, quiet) {
    b.modified = isoLocal(new Date()); DB.put('blocks', b); const d = M.doc(b.docId); if (d) M.touchDoc(d);
    const el = pane && pane.paper && $(`:scope > .box[data-id="${b.id}"]`, pane.paper.world);
    if (el && !quiet) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; el.style.width = b.w + 'px'; const old = $('.ink-body', el); if (old) old.replaceWith(INK.body(b)); pane.drawWires && pane.drawWires(); if (typeof REGION !== 'undefined') REGION.layout(pane); }
    else if (!el) changed();
  },
  remove(b) { let d = M.doc(b.docId); if (d) { d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== b.id) }); DB.put('documents', d); } DB.where('wires', w => w.from === b.id || w.to === b.id).forEach(w => DB.del('wires', w.id)); DB.del('blocks', b.id); },
  /** Where a new stroke goes: the ink component it starts near, or a new one. */
  target(pane, wp) {
    const near = (b, m) => { const r = INK.rect(b); return wp.x > r.x - m && wp.x < r.x + r.w + m && wp.y > r.y - m && wp.y < r.y + r.h + m; };
    const list = INK.blocks(pane.docId), last = INK._last && list.find(b => b.id === INK._last);
    return (last && near(last, INK.NEAR)) ? last : list.find(b => near(b, INK.NEAR / 2)) || null;
  },
  addStroke(pane, s) {
    const d = M.doc(pane.docId); if (!d) return; DB.beginGroup('ink');
    // written on an image: the ink is glued to it (it moves with it, 13zzc) and gathers only with ink on the same image
    const img = INK.imageAt(pane, s.p[0][0], s.p[0][1]);
    let b = INK.target(pane, { x: s.p[0][0], y: s.p[0][1] }); if (b && ((b.glue && b.glue.to) || null) !== img) b = null;
    if (!b) { _suppress++; b = M.addBlock(d.id, null, { kind: 'ink', label: '', x: s.p[0][0] - INK.PAD, y: s.p[0][1] - INK.PAD, w: 60, inkH: 60, ink: { strokes: [] }, glue: img ? { to: img, dx: 0, dy: 0 } : undefined }); _suppress--; b.body = { text: '', marks: [] }; b._new = true; }
    b.ink = b.ink || { strokes: [] };
    b.ink.strokes.push(Object.assign({}, s, { p: s.p.map(p => [INK.r1(p[0] - b.x), INK.r1(p[1] - b.y), Math.round((p[2] == null ? .5 : p[2]) * 100) / 100]) }));
    INK.fit(b); INK._last = b.id; const isNew = b._new; delete b._new;
    if (isNew) { DB.put('blocks', b); M.touchDoc(d); changed(); } else INK.save(pane, b);
  },

  /* ---------- pen input on a note's paper ---------- */
  interactive: t => t.closest('button,input,textarea,select,a,label,.port,.rz,.ed,[contenteditable="true"],.pop,.ink-bar,.bh,.chips,.wl,.region .rg-tab,.region .rg-port'),
  /** The pen writes on the images of an image panel too (the ink goes on top, glued to it). */
  onImage: (box, t) => box.classList.contains('w-figure') && !!(t.closest && t.closest('.fg-grid')),
  /** The image panel at a point of the paper (the topmost), or null. */
  imageAt(pane, x, y) { const el = $$(':scope > .box.w-figure', pane.paper.world).reverse().find(el => el.offsetWidth && x >= el.offsetLeft && x <= el.offsetLeft + el.offsetWidth && y >= el.offsetTop && y <= el.offsetTop + el.offsetHeight); return el ? el.dataset.id : null; },
  penDown(paper, e) {
    const host = paper.el.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.docId || pane.travel || !M.doc(pane.docId)) return false;
    if (!INK.writing()) return false; // pen mode off: the pen pans the paper and moves components (13zz2)
    if (INK.interactive(e.target)) return false;
    const box = e.target.closest('.box'); if (box && !box.classList.contains('w-ink') && !INK.onImage(box, e.target)) return false;
    const wp = paper.toWorld(e.clientX, e.clientY);
    if (INK.sel && INK.sel.docId === pane.docId && INK.inSel(wp)) return INK.moveSel(pane, paper, e, wp), true;
    if (INK.sel) INK.clearSel();
    if (INK.tool === 'eraser') return INK.erase(pane, paper, e), true;
    INK.stroke(pane, paper, e, INK.tool === 'lasso'); return true;
  },
  live(paper) { let s = $(':scope > svg.ink-live', paper.world); if (!s) { s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ink-live'); paper.world.appendChild(s); } return s; },
  stroke(pane, paper, e, lasso) {
    const hl = INK.tool === 'hl', st = { c: hl ? (INK.HL[INK.hlColor] || INK.HL[0]) : (INK.COLORS[INK.color] || INK.COLORS[0]), w: hl ? 14 : INK.WIDTHS[INK.width] || 2.4, hl: hl || undefined, p: [] };
    const pr = ev => { if (ev.pointerType !== 'pen' || !INK.pressure) return .5; const v = ev.pressure; if (v > 0 && v !== .5) { st.pr = true; st.wr = [INK.curve.min, INK.curve.max]; } const m = v > 0 ? INK.mapP(v) : .5; INK.meter(m); return m; }, svg = INK.live(paper), path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    if (lasso) { path.setAttribute('class', 'ink-lasso'); } svg.appendChild(path);
    const add = ev => { const p = paper.toWorld(ev.clientX, ev.clientY), q = st.p[st.p.length - 1]; if (q && Math.hypot(p.x - q[0], p.y - q[1]) < .6 / paper.view.z) return; st.p.push([INK.r1(p.x), INK.r1(p.y), pr(ev)]); };
    const draw = () => { if (lasso) path.setAttribute('d', 'M' + st.p.map(p => p[0] + ',' + p[1]).join('L') + 'Z'); else { const n = INK.svgPath(st); path.setAttribute('d', n.getAttribute('d')); ['class', 'fill', 'stroke', 'stroke-width', 'style'].forEach(a => n.hasAttribute(a) ? path.setAttribute(a, n.getAttribute(a)) : path.removeAttribute(a)); } };
    add(e); draw(); INK.drawing = e.pointerId; try { paper.el.setPointerCapture(e.pointerId); } catch { }
    // hold the pen still: the stroke becomes the shape it looks like; keep holding and drag to size and turn it
    let still = { x: e.clientX, y: e.clientY }, holdT = null, shaped = null;
    const arm = () => { clearTimeout(holdT); if (lasso || shaped) return; holdT = setTimeout(() => { if (st.p.length < 6) return; const g = SHAPE.guess(st.p); if (!g) return;
      shaped = { g, pen: st.p[st.p.length - 1].slice(0, 2) }; Object.assign(st, { p: g.p.map(q => [INK.r1(q[0]), INK.r1(q[1]), .6]), geo: true, br: g.br, closed: g.closed, shape: g.type }); if (g.closed && hl) st.area = true; draw(); path.classList.add('ink-snap'); setTimeout(() => path.classList.remove('ink-snap'), 260); }, 550); };
    arm();
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault();
      if (shaped) { const w = paper.toWorld(ev.clientX, ev.clientY), P = SHAPE.transform(shaped.g, shaped.pen, [w.x, w.y]); st.p = P.map(q => [INK.r1(q[0]), INK.r1(q[1]), .6]); draw(); return; }
      (ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]).forEach(add); if (!ev.getCoalescedEvents || !ev.getCoalescedEvents().length) add(ev); draw();
      if (Math.hypot(ev.clientX - still.x, ev.clientY - still.y) > 3) { still = { x: ev.clientX, y: ev.clientY }; arm(); } };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; clearTimeout(holdT); paper.el.removeEventListener('pointermove', mv, true); paper.el.removeEventListener('pointerup', up, true); paper.el.removeEventListener('pointercancel', up, true); INK.drawing = null;
      if (lasso) { path.remove(); INK.lassoSelect(pane, st.p); return; }
      if (st.p.length === 1 && hl) { path.remove(); return; }
      if (st.pr && !st.hl && !st.geo) { const m = st.p.reduce((s0, q) => s0 + (q[2] == null ? .5 : q[2]), 0) / st.p.length; st.o = Math.round(clamp(1 - INK.curve.fade * (1 - m) * 1.15, .22, 1) * 100) / 100; }
      INK.addStroke(pane, st); setTimeout(() => path.remove(), 30); };
    paper.el.addEventListener('pointermove', mv, true); paper.el.addEventListener('pointerup', up, true); paper.el.addEventListener('pointercancel', up, true);
  },
  erase(pane, paper, e) {
    DB.beginGroup('erase'); const touched = new Set(); INK.drawing = e.pointerId; try { paper.el.setPointerCapture(e.pointerId); } catch { }
    const at = ev => { const wp = paper.toWorld(ev.clientX, ev.clientY), rad = 9 / paper.view.z;
      for (const b of INK.blocks(pane.docId)) { const r = INK.rect(b); if (wp.x < r.x - rad || wp.x > r.x + r.w + rad || wp.y < r.y - rad || wp.y > r.y + r.h + rad) continue;
        const lx = wp.x - b.x, ly = wp.y - b.y, before = b.ink.strokes.length;
        b.ink.strokes = b.ink.strokes.filter(s => !s.p.some((p, i) => { const q = s.p[i + 1] || p, rr = rad + (s.w || 2) / 2; const vx = q[0] - p[0], vy = q[1] - p[1], L2 = vx * vx + vy * vy || 1, t = clamp(((lx - p[0]) * vx + (ly - p[1]) * vy) / L2, 0, 1); return Math.hypot(lx - p[0] - t * vx, ly - p[1] - t * vy) < rr; }));
        if (b.ink.strokes.length !== before) { touched.add(b.id); if (b.ink.strokes.length) { INK.fit(b); INK.save(pane, b); } else { INK.remove(b); const el = $(`:scope > .box[data-id="${b.id}"]`, paper.world); el && el.remove(); pane.drawWires(); } } } };
    at(e);
    const mv = ev => { if (ev.pointerId === e.pointerId) { ev.preventDefault(); at(ev); } };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; INK.drawing = null; paper.el.removeEventListener('pointermove', mv, true); paper.el.removeEventListener('pointerup', up, true); paper.el.removeEventListener('pointercancel', up, true); if (touched.size) { IX.rebuild(); changed(); } };
    paper.el.addEventListener('pointermove', mv, true); paper.el.addEventListener('pointerup', up, true); paper.el.addEventListener('pointercancel', up, true);
  },

  /* ---------- lasso ---------- */
  inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi) c = !c; } return c; },
  lassoSelect(pane, poly) {
    if (poly.length < 3) return; const items = [];
    INK.blocks(pane.docId).forEach(b => b.ink.strokes.forEach((s, i) => { const inside = s.p.filter(p => INK.inPoly(b.x + p[0], b.y + p[1], poly)).length; if (inside >= Math.max(1, s.p.length * .6)) items.push({ id: b.id, i }); }));
    if (!items.length) return toast('Nothing inside the lasso');
    INK.sel = { docId: pane.docId, items, pane }; INK.paintSel();
  },
  selStrokes() { return (INK.sel ? INK.sel.items : []).map(x => { const b = M.block(x.id); return b && b.ink && b.ink.strokes[x.i] ? { b, s: b.ink.strokes[x.i], i: x.i } : null; }).filter(Boolean); },
  selBox() { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; INK.selStrokes().forEach(({ b, s }) => s.p.forEach(p => { x0 = Math.min(x0, b.x + p[0]); y0 = Math.min(y0, b.y + p[1]); x1 = Math.max(x1, b.x + p[0]); y1 = Math.max(y1, b.y + p[1]); })); return { x: x0 - 8, y: y0 - 8, w: x1 - x0 + 16, h: y1 - y0 + 16 }; },
  inSel(wp) { const r = INK.selBox(); return wp.x >= r.x && wp.x <= r.x + r.w && wp.y >= r.y && wp.y <= r.y + r.h; },
  paintSel() {
    const pane = INK.sel && INK.sel.pane; $$('.ink-svg path.sel').forEach(p => p.classList.remove('sel')); $$('.ink-selbox').forEach(x => x.remove()); if (!pane || !pane.paper) return;
    INK.sel.items.forEach(x => { const p = $(`:scope > .box[data-id="${x.id}"] .ink-svg path[data-i="${x.i}"]`, pane.paper.world); p && p.classList.add('sel'); });
    const r = INK.selBox(), sw = h('div.ink-sw.nopan', INK.COLORS.map((c, k) => h('button', { style: { background: INK.swatch(c) }, title: 'Recolour', on: { click: e => { e.stopPropagation(); INK.recolor(k); } } })));
    pane.paper.world.append(h('div.ink-selbox', { style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' } }),
      h('div.ink-selbar.nopan.ink-selbox', { style: { left: r.x + 'px', top: (r.y + r.h + 8) + 'px' } }, h('span.tiny', plural(INK.sel.items.length, 'stroke')),
        h('button.btn.xs.pri', { on: { click: e => { e.stopPropagation(); INK.convertSel(); } } }, 'Convert to text'), sw,
        h('button.btn.xs.danger', { on: { click: e => { e.stopPropagation(); INK.deleteSel(); } } }, 'Delete'), h('button.btn.xs', { on: { click: e => { e.stopPropagation(); INK.clearSel(); } } }, 'Done')));
  },
  clearSel() { INK.sel = null; $$('.ink-svg path.sel').forEach(p => p.classList.remove('sel')); $$('.ink-selbox').forEach(x => x.remove()); },
  /** Take the selected strokes out of their boxes (boxes left empty go). */
  takeSel() { const got = INK.selStrokes(), by = groupBy(got, x => x.b.id), out = [];
    Object.values(by).forEach(list => { const b = list[0].b, drop = new Set(list.map(x => x.i)); list.forEach(x => out.push({ s: x.s, wx: b.x, wy: b.y })); b.ink.strokes = b.ink.strokes.filter((s, i) => !drop.has(i)); if (b.ink.strokes.length) { INK.fit(b); DB.put('blocks', b); } else INK.remove(b); });
    return out; },
  deleteSel() { DB.beginGroup('ink'); const n = INK.sel.items.length; INK.takeSel(); INK.clearSel(); IX.rebuild(); changed(); toast(plural(n, 'stroke') + ' deleted · Ctrl+Z undoes'); },
  recolor(k) { DB.beginGroup('ink'); INK.selStrokes().forEach(({ s }) => { s.c = INK.COLORS[k]; }); new Set(INK.sel.items.map(x => x.id)).forEach(id => DB.put('blocks', M.block(id))); const keep = INK.sel; changed(); setTimeout(() => { INK.sel = keep; INK.paintSel(); }, 60); },
  moveSel(pane, paper, e, wp0) {
    const paths = INK.sel.items.map(x => $(`:scope > .box[data-id="${x.id}"] .ink-svg path[data-i="${x.i}"]`, paper.world)).filter(Boolean); let d = { x: 0, y: 0 };
    try { paper.el.setPointerCapture(e.pointerId); } catch { } INK.drawing = e.pointerId;
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault(); const p = paper.toWorld(ev.clientX, ev.clientY); d = { x: p.x - wp0.x, y: p.y - wp0.y }; paths.forEach(pt => pt.setAttribute('transform', `translate(${d.x},${d.y})`)); $$('.ink-selbox', paper.world).forEach(x => x.style.transform = `translate(${d.x}px,${d.y}px)`); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; INK.drawing = null; paper.el.removeEventListener('pointermove', mv, true); paper.el.removeEventListener('pointerup', up, true);
      if (Math.hypot(d.x, d.y) < 1) return; DB.beginGroup('ink'); INK.selStrokes().forEach(({ s }) => s.p.forEach(p => { p[0] = INK.r1(p[0] + d.x); p[1] = INK.r1(p[1] + d.y); }));
      const ids = new Set(INK.sel.items.map(x => x.id)); ids.forEach(id => { const b = M.block(id); INK.fit(b); DB.put('blocks', b); }); const keep = INK.sel; changed(); setTimeout(() => { INK.sel = keep; INK.paintSel(); }, 60); };
    paper.el.addEventListener('pointermove', mv, true); paper.el.addEventListener('pointerup', up, true);
  },

  /* ---------- handwriting → text (read on the computer) ---------- */
  /** Strokes → lines (by vertical overlap), each line a white PNG for the reader. */
  lines(strokes) {
    const S = strokes.filter(s => !s.hl && !s.geo && s.p.length).map(s => { const ys = s.p.map(p => p[1]), xs = s.p.map(p => p[0]); return { s, y0: Math.min(...ys), y1: Math.max(...ys), x0: Math.min(...xs), x1: Math.max(...xs) }; }).sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    const L = [];
    S.forEach(x => { const hgt = Math.max(6, x.y1 - x.y0); const ln = L.find(l => { const ov = Math.min(l.y1, x.y1) - Math.max(l.y0, x.y0); return ov > .35 * Math.min(hgt, Math.max(6, l.y1 - l.y0)) || (x.y1 - x.y0 < 8 && x.y0 >= l.y0 - 6 && x.y1 <= l.y1 + 6); });
      if (ln) { ln.items.push(x); ln.y0 = Math.min(ln.y0, x.y0); ln.y1 = Math.max(ln.y1, x.y1); ln.x0 = Math.min(ln.x0, x.x0); ln.x1 = Math.max(ln.x1, x.x1); } else L.push({ items: [x], y0: x.y0, y1: x.y1, x0: x.x0, x1: x.x1 }); });
    return L.sort((a, b) => a.y0 - b.y0);
  },
  png(line) {
    const pad = 12, hgt = Math.max(10, line.y1 - line.y0), k = clamp(72 / hgt, .5, 5), W = Math.min(2400, Math.ceil((line.x1 - line.x0) * k + pad * 2)), H = Math.ceil(hgt * k + pad * 2);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round';
    line.items.forEach(({ s }) => { g.lineWidth = Math.max(2, (s.w || 2.4) * k * .9); g.beginPath(); s.p.forEach((p, i) => { const x = (p[0] - line.x0) * k + pad, y = (p[1] - line.y0) * k + pad; i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (s.p.length === 1) g.lineTo((s.p[0][0] - line.x0) * k + pad + .1, (s.p[0][1] - line.y0) * k + pad); g.stroke(); });
    return c.toDataURL('image/png');
  },
  /** Windows' own handwriting recognizer (on the computer) reads the strokes themselves — cursive included. */
  async read(strokes) {
    const S = strokes.filter(s => !s.hl && !s.geo && s.p && s.p.length).map(s => s.p.map(p => [INK.r1(p[0]), INK.r1(p[1]), p[2] == null ? .5 : p[2]]));
    if (!S.length) { toast('No handwriting to read'); return null; }
    toast('Reading your handwriting…', 1200);
    let j; try { j = await (await fetch('api/ink/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strokes: S }) })).json(); } catch { toast('Can’t reach your computer — try again when it’s back'); return null; }
    if (!j.ok) { INK.notReady({ state: 'error', error: j.error }); return null; }
    const t = (j.lines || []).map(x => x.trim()).filter(Boolean).join('\n'); if (!t) { toast('Nothing could be read in that ink'); return null; } return t;
  },
  notReady(st) {
    modal({ title: 'The handwriting couldn’t be read', body: h('div', h('p.serif', { style: { marginTop: 0 } }, (st && st.error) || 'Windows’ handwriting recognizer isn’t available.'),
      h('p.tiny.muted', 'It runs on the Windows computer that runs the app. Settings → Handwriting shows whether it is ready and which handwriting languages Windows has.')) });
  },
  /** The whole ink component becomes a text component (its ink is kept with it). */
  async convert(b) {
    const text = await INK.read(b.ink.strokes); if (text == null) return;
    const cur = M.block(b.id); if (!cur || cur.kind !== 'ink') return; DB.beginGroup('convert');
    cur.inkConverted = { strokes: cur.ink.strokes, w: cur.w, inkH: cur.inkH, at: isoLocal(new Date()) }; delete cur.ink; cur.kind = 'component';
    cur.w = Math.max(280, Math.min(560, cur.w)); M.saveBlockBody(cur, { text, marks: [] }); IX.rebuild(); changed(); toast('Converted — “Show the handwriting” in its ⋯ menu');
  },
  async convertSel() {
    const sel = INK.sel; if (!sel) return; const got = INK.selStrokes(), strokes = got.map(({ b, s }) => Object.assign({}, s, { p: s.p.map(p => [b.x + p[0], b.y + p[1], p[2]]) }));
    const text = await INK.read(strokes); if (text == null) return;
    const r = INK.selBox(); INK.sel = sel; DB.beginGroup('convert'); INK.takeSel(); INK.clearSel();
    _suppress++; const nb = M.addBlock(sel.docId, null, { x: Math.round(r.x / 14) * 14, y: Math.round(r.y / 14) * 14, w: Math.max(280, Math.min(560, Math.ceil(r.w))) }); _suppress--;
    nb.inkConverted = { strokes: strokes.map(s => Object.assign({}, s, { p: s.p.map(p => [INK.r1(p[0] - r.x), INK.r1(p[1] - r.y), p[2]]) })), w: Math.ceil(r.w), inkH: Math.ceil(r.h), at: isoLocal(new Date()) };
    M.saveBlockBody(nb, { text, marks: [] }); IX.rebuild(); changed(); toast('Converted into a component');
  },
  backToInk(b) { const c = b.inkConverted; if (!c) return; DB.beginGroup('ink'); b.kind = 'ink'; b.ink = { strokes: c.strokes }; b.w = c.w; b.inkH = c.inkH; b.convertedText = b.body.text; delete b.inkConverted; b.body = { text: '', marks: [] }; INK.fit(b); DB.put('blocks', b); IX.rebuild(); changed(); },
  showInk(b, e) { const c = b.inkConverted; if (!c) return; popover(e.clientX, e.clientY + 8, [h('h5', 'The handwriting · converted ' + fmtWhen(c.at)), h('div.ink-peek', INK.svg(c.strokes, c.w, c.inkH))]); },
  label(b, kind) { const text = b.label || 'Handwritten note'; if (b.inkItemId && M.item(b.inkItemId)) M.setItem(M.item(b.inkItemId), { kind, text }); else { const it = M.createItem(kind, text, b, { ink: true }); b.inkItemId = it.id; } DB.put('blocks', b); IX.rebuild(); changed(); },

  /* ---------- the ink bar ---------- */
  setTool(t) { INK.tool = t; _ls.set('inkTool', t); if (t !== 'lasso') INK.clearSel(); INK.paintBars(); },
  paintBars() { App.panes().forEach(p => p.host && INK.bar(p)); },
  bar(pane) {
    const host = pane.host; if (!host) return; let el = $(':scope > .ink-bar', host);
    if (!INK.shown) { el && el.remove(); return; } if (!el) { el = h('div.ink-bar.nopan'); host.append(el); }
    const tb = (t, ic, title) => h('button.ib-t' + (INK.tool === t ? '.on' : ''), { title, on: { click: () => INK.setTool(t) } }, ic);
    const sb = pane.sel && M.block(pane.sel), inkSel = sb && sb.kind === 'ink';
    el.replaceChildren(tb('pen', '✎', 'Pen'), tb('hl', '▍', 'Highlighter'), tb('eraser', '⌫', 'Eraser — touch strokes to remove them'), tb('lasso', '◌', 'Lasso — circle strokes to move, recolour, delete or convert'), h('i.ink-sep'),
      ...INK.COLORS.map((c, k) => h('button.ink-c' + (INK.color === k ? '.on' : ''), { style: { background: INK.swatch(c) }, title: c === 'auto' ? 'Ink — white on the dark theme, black on the light' : 'Colour', on: { click: () => { INK.color = k; _ls.set('inkColor', k); if (INK.tool === 'eraser' || INK.tool === 'lasso') INK.tool = 'pen'; INK.paintBars(); } } })), h('i.ink-sep'),
      ...INK.WIDTHS.map((w, k) => h('button.ink-w' + (INK.width === k ? '.on' : ''), { title: 'Width', on: { click: () => { INK.width = k; _ls.set('inkWidth', k); INK.paintBars(); } } }, h('i', { style: { height: Math.max(2, w * 1.4) + 'px' } }))),
      h('button.ib-t.ink-pr' + (INK.pressure ? '.on' : ''), { title: INK.pressure ? 'Pressure on: pressing harder draws thicker, darker lines (click to turn off)' : 'Pressure off: even lines (click to turn on)', on: { click: () => { INK.pressure = !INK.pressure; _ls.set('inkPressure', INK.pressure); INK.paintBars(); } } }, h('span.ink-gauge', h('i', { style: { height: Math.round((INK._lastP || 0) * 100) + '%' } })), '⇣'),
      INK.pressure ? h('button.ib-t.ink-prset', { title: 'Pressure feel: sensitivity, thinnest and thickest line, fading', on: { click: e => INK.pressureDialog(e) } }, '⚙') : null,
      h('i.ink-sep'), inkSel ? h('button.btn.xs.pri', { on: { click: () => INK.convert(sb) } }, 'Convert to text') : null,
      matchMedia('(pointer: fine)').matches ? h('button.ib-t' + (INK.mouse ? '.on' : ''), { title: 'Draw with the mouse too', on: { click: () => { INK.mouse = !INK.mouse; INK.paintBars(); } } }, '🖱') : null,
      h('button.ib-t', { title: 'Hide the ink bar', on: { click: () => { INK.shown = false; INK.mouse = false; _ls.set('inkBar', false); INK.paintBars(); App.panes().forEach(p => p.ctools && $$('.ct-ink', p.ctools).forEach(b => b.classList.remove('on'))); } } }, '✕'));
  },
};
WIDGETS.ink = { label: 'ink', w: 60, body: (b) => INK.body(b), menu: b => [
  { label: 'Convert to text', sub: 'Read on your computer; the ink becomes a text component', run: () => INK.convert(b) },
  { label: b.inkItemId && M.item(b.inkItemId) ? 'Label: ' + KIND[M.item(b.inkItemId).kind].label : 'Label as…', run: ev => FIG.kindMenu(ev || { clientX: innerWidth / 2, clientY: 200 }, 'This handwriting is…', k => INK.label(M.block(b.id), k), b.inkItemId && (M.item(b.inkItemId) || {}).kind) },
  { label: 'Delete the ink', danger: true, run: () => { DB.beginGroup('ink'); INK.remove(b); changed(); toast('Ink deleted · Ctrl+Z undoes'); } }] };

/* ---------- handwriting reader: Settings → Handwriting ---------- */
const HWUI = {
  st: null,
  async status() { try { HWUI.st = await (await fetch('api/hw/status', { cache: 'no-store' })).json(); } catch { HWUI.st = { state: 'offline' }; } return HWUI.st; },
  settings() {
    const box = h('div.hw'), draw = async () => { const s = await HWUI.status(); if (!box.isConnected) return;
      const local = typeof SYNC === 'undefined' || SYNC.local, lab = { ready: 'Ready', error: 'Not available', unsupported: 'Needs Windows', offline: 'Can’t reach the computer' }[s.state] || s.state;
      const sel = (s.recognizers || []).length > 1 && local ? h('select.inp', { style: { maxWidth: '320px' }, on: { change: async e => { await fetch('api/ink/lang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: e.target.value }) }); toast('Handwriting language: ' + e.target.value); } } },
        s.recognizers.map(n => h('option', { value: n, selected: n === s.lang }, n))) : null;
      box.replaceChildren(h('div.callout', h('b.h', 'Handwriting reader · ' + lab),
          'Ink is read by Windows’ own handwriting recognizer on your computer — the engine of the Windows pen input panel. It reads the strokes themselves, so cursive works, it answers in about a second, and nothing leaves the computer or needs downloading.'),
        s.state === 'ready' ? h('div.row', { style: { gap: '8px', margin: '8px 0', alignItems: 'center' } }, h('span.tiny.muted', 'Recognizer' + ((s.recognizers || []).length > 1 ? 's' : '') + ':'), sel || h('span.tiny', (s.recognizers || []).join(', '))) : null,
        s.error ? h('p.tiny', { style: { color: 'var(--bad)' } }, s.error) : null,
        h('p.tiny.muted', 'More languages, or better accuracy for yours: Windows Settings → Time & language → Language & region → your language → ⋯ Language options → Handwriting (download it).'),
        h('p.tiny.muted', 'On the iPad: the pen writes on a note’s paper (ink gathers into ink components); in a component’s text it is the iPad’s own Scribble. Fingers pan, pinch and tap; press and hold a component to drag it. ⋯ → Convert to text, or lasso some strokes → Convert to text — the computer reads it.')); };
    draw(); return box;
  },
};

/* ---------- V3.941 · the palm ----------
   A hand resting on the glass before or while the pen writes must not pan, zoom, undo or redo. One set of rules for a
   note's paper (below), the two- and three-finger taps (13zm) and the whiteboard (board/pen.js, as window.SIS_PALM):
   • a contact wider or taller than SIZE css px (where the screen reports its size) is a palm;
   • while the pen is near the glass (hovering or writing, and QUIET ms after) touches are no gesture, and a pen coming
     near ends a finger pan or pinch in progress;
   • two or three fingers count only when every pair is at least GAP css px apart — a palm lands as contacts close
     together. #touchlog in the address shows each contact's size and the gaps, to check a new screen. */
const PALM = {
  GAP: 70, SIZE: 90, QUIET: 600, penAt: -1e9,
  size: e => Math.max(e.width || 0, e.height || 0, 2 * (e.radiusX || 0), 2 * (e.radiusY || 0)),
  big: e => PALM.size(e) > PALM.SIZE,
  penNear: () => performance.now() - PALM.penAt < PALM.QUIET,
  /** a touch that is a palm by itself: its size, or the pen near the glass */
  palm: e => PALM.big(e) || PALM.penNear(),
  /** every pair of these [x, y] points at least GAP apart */
  apart: pts => pts.every((p, i) => pts.every((q, j) => j <= i || Math.hypot(p[0] - q[0], p[1] - q[1]) >= PALM.GAP)),
};
window.SIS_PALM = PALM;
['pointerdown', 'pointermove', 'pointerup'].forEach(t => addEventListener(t, e => { if (e.pointerType === 'pen') PALM.penAt = performance.now(); }, { capture: true, passive: true }));

{
  /* fingers and pen on every paper */
  const mp = makePaper; makePaper = function (host, opts) {
    const P = mp(host, opts), el = P.el, T = { touch: new Set(), palm: new Set() };
    // V3.941 — the palm: what the fingers had started stops, and those touches count for nothing until they lift
    T.drop = () => { clearTimeout(T.timer); T.pend = null; if (P.mode && (P.mode.k === 'pinch' || (P.mode.k === 'pan' && T.touch.size))) { P.stop(); P.mode = null; el.classList.remove('panning'); }
      T.touch.forEach(id => { P.ptrs.delete(id); T.palm.add(id); }); T.touch.clear(); };
    el.addEventListener('pointermove', e => { if (e.pointerType === 'pen' && T.touch.size) T.drop(); else if (T.palm.has(e.pointerId)) e.stopPropagation(); }, true);
    const lift = e => { T.touch.delete(e.pointerId); if (T.palm.delete(e.pointerId)) e.stopPropagation(); };
    el.addEventListener('pointerup', lift, true); el.addEventListener('pointercancel', lift, true);
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen' || (e.pointerType === 'mouse' && INK.mouse && e.button === 0)) { if (e.pointerType === 'pen' && T.touch.size) T.drop(); if (INK.penDown(P, e)) { e.preventDefault(); e.stopPropagation(); } return; }
      if (e.pointerType !== 'touch') return;
      if (INK.drawing != null) { e.stopPropagation(); return; } // the palm while the pen writes
      if (T.palm.size || PALM.palm(e)) { T.palm.add(e.pointerId); e.stopPropagation(); return; }   // V3.941 — a palm, or a hand with one already down
      if (e.target.closest('button,input,select,textarea,a,label,.pop,.ink-bar,.ink-selbar,.port,.rz,.embed-rz,.scrolly,.embed')) return;
      const ed = e.target.closest('[contenteditable="true"]'); if (ed && document.activeElement === ed) return; // a focused text: the finger selects and places the caret
      // V3.941 — a second contact close to a finger already down is the same hand: neither is a finger
      if ([...T.touch].some(id => { const q = P.ptrs.get(id); return q && Math.hypot(q.x - e.clientX, q.y - e.clientY) < PALM.GAP; })) { T.drop(); T.palm.add(e.pointerId); e.stopPropagation(); return; }
      e.stopPropagation(); P.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); T.touch.add(e.pointerId);
      if (P.ptrs.size >= 2) { clearTimeout(T.timer); T.pend = null; P.stop(); const [p, q] = [...P.ptrs.values()]; P.mode = { k: 'pinch', d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, z0: P.view.z }; return; }
      const box = e.target.closest('.box'); T.pend = { id: e.pointerId, x: e.clientX, y: e.clientY, e, box, ed };
      clearTimeout(T.timer); T.timer = setTimeout(() => { const pd = T.pend; if (!pd || !pd.box || pd.ed) return; const pane = host._dv; T.pend = null; if (pane && pane.pointer) { pd.box.classList.add('lifted'); pane.pointer(pd.e); const off = () => { pd.box.classList.remove('lifted'); removeEventListener('pointerup', off); }; addEventListener('pointerup', off); } }, 450);
    }, true);
    el.addEventListener('pointermove', e => {
      const pd = T.pend; if (!pd || pd.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - pd.x, e.clientY - pd.y) < 8) return;
      clearTimeout(T.timer); T.pend = null; P.stop(); P.mode = { k: 'pan', x: e.clientX, y: e.clientY, moved: 10, v: [], start: pd.e }; el.classList.add('panning'); try { el.setPointerCapture(e.pointerId); } catch { }
    }, true);
    const tap = e => { const pd = T.pend; if (!pd || pd.id !== e.pointerId) return; clearTimeout(T.timer); T.pend = null; P.ptrs.delete(e.pointerId);
      const pane = host._dv; if (e.type === 'pointerup' && pd.box && pane && pane.select && pd.box.dataset.id && pd.box.dataset.id[0] !== '_') pane.select(pd.box.dataset.id, true); };
    el.addEventListener('pointerup', tap, true); el.addEventListener('pointercancel', tap, true);
    return P;
  };
  // ✎ Pen beside Timer; the ink bar follows the note
  const render = DocView.render; DocView.render = function (docId) { const r = render.call(this, docId);
    if (this.ctools && !$('.ct-ink', this.ctools)) { const b = h('button.ct-ink' + (INK.shown ? '.on' : ''), { title: 'Pen and ink (the iPad pen writes on the paper)', on: { click: () => { INK.shown = !INK.shown; _ls.set('inkBar', INK.shown); if (!INK.shown) INK.mouse = false; b.classList.toggle('on', INK.shown); INK.paintBars(); } } }, h('span', { style: { fontSize: '14px' } }, '✎'), 'Pen'); const t = $('.ct-timer', this.ctools); t ? t.after(b) : this.ctools.prepend(b); }
    requestAnimationFrame(() => { INK.bar(this); if (INK.sel && INK.sel.docId === this.docId) { INK.sel.pane = this; INK.paintSel(); } }); return r; };
  const sel = DocView.select; DocView.select = function (id, quiet) { const r = sel.call(this, id, quiet); if (INK.shown) INK.bar(this); return r; };
  // converted components keep their handwriting
  const bm = DocView.boxMenu; DocView.boxMenu = function (b, e) {
    if (!b || !b.inkConverted) return bm.call(this, b, e);
    const orig = ctxMenu; ctxMenu = (x, y, rows) => orig(x, y, [rows[0], { label: 'Show the handwriting', run: () => INK.showInk(b, e) }, { label: 'Back to ink', sub: 'The text goes; the strokes come back', run: () => INK.backToInk(M.block(b.id)) }, ...rows.slice(1)]);
    try { return bm.call(this, b, e); } finally { ctxMenu = orig; }
  };
  // an ink label counts as the component's structure
  const rebuild = IX.rebuild.bind(IX); IX.rebuild = (...a) => { const r = rebuild(...a);
    DB.where('blocks', b => b.kind === 'ink' && b.inkItemId && b.status !== 'removed').forEach(b => { if (!M.item(b.inkItemId)) return; const cur = IX.blockItems.get(b.id) || []; if (!cur.includes(b.inkItemId)) IX.blockItems.set(b.id, [...cur, b.inkItemId]); });
    return r; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && INK.sel) INK.clearSel(); });
}
