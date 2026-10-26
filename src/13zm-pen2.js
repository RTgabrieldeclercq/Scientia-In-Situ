/* ==========================================================================
   13zm · Pen and fingers, round two (Surface Pro + Slim Pen, iPad).
   • While the ink bar is on, the mouse arrow hides when the pen comes near
     the paper; a small dot of the pen's colour and width follows it instead.
   • Two fingers tapped together = undo; three = redo (anywhere in the app).
   • Lasso strokes from two ink components → "Connect…" (pick or type the
     relation) or "Merge" (one ink component; their wires carry over).
   Pressure (the gauge ⇣ in the ink bar) is in 13zf: harder = thicker and darker.
   ========================================================================== */
const PEN2 = {
  dot: null,
  hover(e, paper) {
    if (!INK.shown || INK.tool === 'lasso') return PEN2.off(paper);
    paper.el.classList.add('pen-near'); let d = PEN2.dot; if (!d) { d = PEN2.dot = h('div.pen-dot'); document.body.append(d); }
    const z = paper.view.z, er = INK.tool === 'eraser', w = er ? 18 : INK.tool === 'hl' ? 14 * z : Math.max(3, (INK.WIDTHS[INK.width] || 2.4) * z), c = INK.COLORS[INK.color];
    Object.assign(d.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px', width: w + 'px', height: w + 'px', background: er ? 'transparent' : INK.col(c), border: er ? '1.5px solid var(--ink-3)' : '0', opacity: INK.tool === 'hl' ? .35 : .9 });
  },
  off(paper) { if (paper) paper.el.classList.remove('pen-near'); if (PEN2.dot) PEN2.dot.style.display = 'none'; },
  /** Two or more ink components in the lasso. */
  boxes() { return INK.sel ? [...new Set(INK.sel.items.map(x => x.id))].map(M.block).filter(Boolean) : []; },
  connect() { const [a, b] = PEN2.boxes(), pane = INK.sel && INK.sel.pane; if (!a || !b || !pane) return; const r = INK.selBox(), s = pane.paper.toScreen(r.x + r.w / 2, r.y + r.h); INK.clearSel(); pane.relationPopover(a.id, b.id, s.x - 120, s.y + 40); },
  merge() {
    const list = PEN2.boxes(); if (list.length < 2) return; DB.beginGroup('merge ink'); const [keep, ...rest] = list;
    rest.forEach(b => { (b.ink.strokes || []).forEach(s => keep.ink.strokes.push(Object.assign({}, s, { p: s.p.map(q => [INK.r1(q[0] + b.x - keep.x), INK.r1(q[1] + b.y - keep.y), q[2]]) })));
      DB.where('wires', w => w.from === b.id || w.to === b.id).forEach(w => { const nw = Object.assign({}, w, { from: w.from === b.id ? keep.id : w.from, to: w.to === b.id ? keep.id : w.to }); DB.del('wires', w.id); if (nw.from !== nw.to && !DB.where('wires', x => x.from === nw.from && x.to === nw.to && x.rel === nw.rel).length) DB.put('wires', nw); });
      if (b.inkItemId && !keep.inkItemId) keep.inkItemId = b.inkItemId;
      INK.remove(b); });
    INK.fit(keep); DB.put('blocks', keep); INK.clearSel(); IX.rebuild(); changed(); toast(`Merged ${list.length} ink components into one`);
  },
};
{
  // pen near the paper: no arrow, a dot instead
  const mp = makePaper; makePaper = function (host, opts) { const P = mp(host, opts);
    P.el.addEventListener('pointermove', e => { if (e.pointerType === 'pen') PEN2.hover(e, P); else if (e.pointerType === 'mouse') PEN2.off(P); });
    P.el.addEventListener('pointerleave', e => { if (e.pointerType === 'pen') PEN2.off(P); });
    P.el.addEventListener('pointerout', e => { if (e.pointerType === 'pen' && !P.el.contains(e.relatedTarget)) PEN2.off(P); });
    return P; };
  // the lasso bar: Connect / Merge when it holds two (or more) ink components
  const ps = INK.paintSel; INK.paintSel = function () { ps.call(INK); const n = PEN2.boxes().length, bar = $('.ink-selbar'); if (!bar || n < 2) return;
    const del = $('.btn.danger', bar); const add = [n === 2 ? h('button.btn.xs', { title: 'Connect the two ink components (pick or type the relation)', on: { click: e => { e.stopPropagation(); PEN2.connect(); } } }, 'Connect…') : null, h('button.btn.xs', { title: 'Join them into one ink component', on: { click: e => { e.stopPropagation(); PEN2.merge(); } } }, 'Merge ' + n)].filter(Boolean);
    del ? del.before(...add) : bar.append(...add); };
  // two fingers tapped = undo, three = redo.
  // Windows turns a two-finger tap into a right-click and often cancels the touches instead of lifting them, so the tap is
  // read from pointer events and touch events together, a cancel is not counted as movement, and the right-click that
  // Windows makes from the tap is swallowed and taken as the undo itself. Each tap fires once.
  let G = null; const TAP = 650;
  const start = () => { const now = performance.now(); if (!G || G.done || now - G.t0 > 400) G = { t0: now, ids: new Map(), max: 0, moved: false, done: false, fired: false, live: 0 }; return G; };
  const fire = (g, n) => { if (g.fired) return; g.fired = true; PEN2.tapLog && PEN2.tapLog('fire ' + n);
    const a = document.activeElement; if (a && a.closest && a.closest('input,textarea')) return;
    if (n === 2) App.undo(); else if (n >= 3) App.redo(); };
  const finish = () => { const g = G; if (!g || g.done || g.ids.size || g.live) return; g.done = true; g.tEnd = performance.now();
    if (!g.moved && g.tEnd - g.t0 <= TAP && g.max >= 2) fire(g, g.max); };
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; const g = start(); g.ids.set(e.pointerId, [e.clientX, e.clientY]); g.max = Math.max(g.max, g.ids.size); PEN2.tapLog && PEN2.tapLog('pdown ' + g.ids.size); }, true);
  document.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' || !G || !G.ids.has(e.pointerId)) return; const [x, y] = G.ids.get(e.pointerId); if (Math.hypot(e.clientX - x, e.clientY - y) > 18) G.moved = true; }, true);
  const lift = e => { if (e.pointerType !== 'touch' || !G || !G.ids.has(e.pointerId)) return; G.ids.delete(e.pointerId); PEN2.tapLog && PEN2.tapLog(e.type + ' ' + G.ids.size); finish(); };
  document.addEventListener('pointerup', lift, true); document.addEventListener('pointercancel', lift, true);
  // touch events: the same tap, counted by fingers on the glass (some Windows touch drivers report only these fully)
  document.addEventListener('touchstart', e => { const g = start(); g.live = e.touches.length; g.max = Math.max(g.max, e.touches.length); PEN2.tapLog && PEN2.tapLog('tstart ' + e.touches.length); }, { capture: true, passive: true });
  const tEnd = e => { if (!G) return; G.live = e.touches.length; PEN2.tapLog && PEN2.tapLog(e.type + ' ' + e.touches.length); finish(); };
  document.addEventListener('touchend', tEnd, { capture: true, passive: true }); document.addEventListener('touchcancel', tEnd, { capture: true, passive: true });
  // the right-click Windows makes from a two-finger tap (or a finger press-and-hold) on the canvas: no menu there
  PEN2.touchMenu = e => { const g = G, now = performance.now(); if (!g || now - g.t0 > 1500) return false;
    if (!(e.target.closest && e.target.closest('.paper')) || e.target.closest('input,textarea,[contenteditable="true"]')) return false;
    PEN2.tapLog && PEN2.tapLog('menu max=' + g.max);
    if (g.max >= 2 && !g.moved) fire(g, g.max);
    return g.max >= 2 || INK.shown; };
  document.addEventListener('contextmenu', e => { if (PEN2.touchMenu(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
  // #touchlog in the address shows what the screen reports, for checking taps on a new device
  if (/touchlog/.test(location.hash)) { const box = h('pre.touchlog'); document.body.append(box); const L = []; PEN2.tapLog = m => { L.push(Math.round(performance.now()) % 100000 + ' ' + m); box.textContent = L.slice(-14).join('\n'); }; }
}

/* ---------- the back of the pen: an eraser that takes away only what it passes over ---------- */
const PENERASE = {
  isEraser: e => e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32),
  /** Eraser radius on screen: follows the pen's sensitivity curve between the eraser sizes set in Pressure feel (hovering = smallest). */
  radius: e => { const C = INK.curve, lo = C.emin ?? 4, hi = Math.max(lo, C.emax ?? 20); return e.pressure > 0 ? lo + (hi - lo) * INK.mapP(e.pressure) : lo; },
  mark(e, on) { let m = PENERASE.el; if (!m) { m = PENERASE.el = h('div.pen-eraser'); document.body.append(m); } if (!on) { m.style.display = 'none'; return; }
    const r = PENERASE.radius(e); Object.assign(m.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px', width: 2 * r + 'px', height: 2 * r + 'px' }); },
  /** Resample a polyline so no gap is wider than `step` (pressure interpolated). */
  dense(P, step) { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i]; out.push(a); const b = P[i + 1]; if (!b) break; const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / step);
      for (let k = 1; k <= n; k++) { const t = k / (n + 1); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] == null ? b[2] : a[2] + ((b[2] ?? a[2]) - a[2]) * t]); } } return out; },
  /** Distance from point q to the segment a–b. */
  segD(qx, qy, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((qx - ax) * dx + (qy - ay) * dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(qx - ax - t * dx, qy - ay - t * dy); },
  /** Take the eraser's swept path (a → b, radius r, world coordinates) out of every stroke it touches; the pieces that are
      left stay as strokes of their own. Only the segments near the eraser are subdivided, and only the two new end points of
      each cut are kept, so erasing never bloats a stroke. Returns true when something changed. */
  cut(b, ax, ay, bx, by, r) {
    const out = []; let changed = false; const lax = ax - b.x, lay = ay - b.y, lbx = bx - b.x, lby = by - b.y;
    const ex0 = Math.min(lax, lbx), ex1 = Math.max(lax, lbx), ey0 = Math.min(lay, lby), ey1 = Math.max(lay, lby), D = PENERASE.segD;
    for (const s of b.ink.strokes) {
      const R = r + (s.w || 2.4) / 2;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of s.p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
      if (ex1 < x0 - R || ex0 > x1 + R || ey1 < y0 - R || ey0 > y1 + R) { out.push(s); continue; }
      const subs = []; const br = [0, ...(s.br || []), s.p.length]; for (let i = 0; i < br.length - 1; i++) subs.push(s.p.slice(br[i], br[i + 1]));
      if (s.closed && subs.length === 1) subs[0] = [...subs[0], subs[0][0]];
      let hit = false; const pieces = [], step = Math.max(.8, r / 3), r1 = v => Math.round(v * 10) / 10;
      const inside = q => D(q[0], q[1], lax, lay, lbx, lby) <= R;
      for (const sub of subs) { let cur = [];
        const keep = q => { cur.push(q); }, close = () => { if (cur.length > 1) pieces.push(cur.filter((q, i) => !q.ins || i === 0 || i === cur.length - 1).map(q => [r1(q[0]), r1(q[1]), q[2]])); cur = []; };
        const visit = q => { if (inside(q)) { hit = true; close(); } else keep(q); };
        for (let i = 0; i < sub.length; i++) { const p0 = sub[i], p1 = sub[i + 1]; visit(p0); if (!p1) break;
          // subdivide this segment only when it comes near the eraser path
          const sx0 = Math.min(p0[0], p1[0]) - R, sx1 = Math.max(p0[0], p1[0]) + R, sy0 = Math.min(p0[1], p1[1]) - R, sy1 = Math.max(p0[1], p1[1]) + R;
          if (ex1 < sx0 || ex0 > sx1 || ey1 < sy0 || ey0 > sy1) continue;
          const n = Math.floor(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / step);
          for (let k = 1; k <= n; k++) { const t = k / (n + 1), pa = p0[2], pb = p1[2] ?? pa, q = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, pa == null ? pb : Math.round((pa + (pb - pa) * t) * 100) / 100]; q.ins = true; visit(q); } }
        close(); }
      if (!hit) { out.push(s); continue; }
      changed = true; pieces.forEach(pc => { const n = Object.assign({}, s, { p: pc }); delete n.br; delete n.closed; delete n.shape; delete n.fills; delete n.fill; delete n.area; out.push(n); });
    }
    if (changed) b.ink.strokes = out; return changed;
  },
  run(pane, paper, e) {
    INK.drawing = e.pointerId; try { paper.el.setPointerCapture(e.pointerId); } catch { }
    // Work on copies; the record changes once, at pen-up (one pass = one undo). Samples are queued and handled once per
    // screen frame: the eraser's path since the last frame is cut as one swept stroke, each touched component is repainted
    // once, and connections are redrawn only at pen-up.
    const touched = new Set(), W = new Map(), Q = []; let last = null, raf = 0, lastEv = e;
    const frame = () => { raf = 0; if (!Q.length) return; const dirty = new Set(); const z = paper.view.z;
      for (const q of Q.splice(0)) { const a = last || q; last = q; const r = q.r / z;
        const ex0 = Math.min(a.x, q.x) - r, ex1 = Math.max(a.x, q.x) + r, ey0 = Math.min(a.y, q.y) - r, ey1 = Math.max(a.y, q.y) + r;
        for (const b0 of INK.blocks(pane.docId)) { const b = W.get(b0.id) || b0, R = INK.rect(b); if (ex1 < R.x || ex0 > R.x + R.w || ey1 < R.y || ey0 > R.y + R.h) continue;
          if (!b.ink || !b.ink.strokes.length) continue;
          const wb = W.get(b.id) || JSON.parse(JSON.stringify(b)); if (!PENERASE.cut(wb, a.x, a.y, q.x, q.y, r)) continue; W.set(b.id, wb); touched.add(b.id); dirty.add(b.id); } }
      dirty.forEach(id => { const wb = W.get(id), el = $(`:scope > .box[data-id="${id}"]`, paper.world); if (!el) return;
        if (wb.ink.strokes.length) { INK.fit(wb); el.style.left = wb.x + 'px'; el.style.top = wb.y + 'px'; el.style.width = wb.w + 'px'; const old = $('.ink-body', el); if (old) old.replaceWith(INK.body(wb)); }
        else el.style.display = 'none'; }); };
    const add = ev => { const wp = paper.toWorld(ev.clientX, ev.clientY); Q.push({ x: wp.x, y: wp.y, r: PENERASE.radius(ev) }); };
    PENERASE.mark(e, true); add(e); frame();
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault(); lastEv = ev; PENERASE.mark(ev, true); const C = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null; (C && C.length ? C : [ev]).forEach(add); if (!raf) raf = requestAnimationFrame(frame); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; if (raf) { cancelAnimationFrame(raf); raf = 0; } frame(); INK.drawing = null; PENERASE.mark(ev, false); paper.el.removeEventListener('pointermove', mv, true); paper.el.removeEventListener('pointerup', up, true); paper.el.removeEventListener('pointercancel', up, true);
      if (touched.size) { DB.beginGroup('erase'); touched.forEach(id => { const b = W.get(id); if (!b) return; if (b.ink.strokes.length) { b.modified = isoLocal(new Date()); DB.put('blocks', b); } else INK.remove(M.block(id)); }); const d = M.doc(pane.docId); if (d) M.touchDoc(d); IX.rebuild(); changed(); }
      else pane.drawWires && pane.drawWires(); };
    paper.el.addEventListener('pointermove', mv, true); paper.el.addEventListener('pointerup', up, true); paper.el.addEventListener('pointercancel', up, true);
  },
};
{
  // the back of the pen erases, whatever tool is chosen
  const pd = INK.penDown; INK.penDown = function (paper, e) {
    if (!PENERASE.isEraser(e)) return pd.call(INK, paper, e);
    const host = paper.el.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.docId || pane.travel) return false;
    if (INK.sel) INK.clearSel(); PENERASE.run(pane, paper, e); return true;
  };
  // the eraser mark while the back of the pen hovers
  document.addEventListener('pointermove', e => { if (e.pointerType !== 'pen' || INK.drawing != null) return; const inv = (e.buttons & 32) === 32; if (inv) { PENERASE.mark(e, true); if (PEN2.dot) PEN2.dot.style.display = 'none'; } else if (PENERASE.el && PENERASE.el.style.display === 'block') PENERASE.mark(e, false); }, true);
  // no right-click menu from the pen while writing (press-and-hold, the barrel button, double taps)
  let lastPen = 0;
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'pen') lastPen = Date.now(); }, true);
  const penish = e => INK.shown && (Date.now() - lastPen < 1500 || (e.pointerType === 'pen')) && e.target.closest && e.target.closest('.paper') && !e.target.closest('input,textarea,[contenteditable="true"]');
  document.addEventListener('contextmenu', e => { if (penish(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('dblclick', e => { if (penish(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
  // undo / redo in the ink bar too (Windows keeps three-finger taps for itself unless turned off)
  const bar = INK.bar; INK.bar = function (pane) { bar.call(INK, pane); const el = pane && pane.host && $(':scope > .ink-bar', pane.host); if (!el || $('.ink-ur', el)) return;
    const x = $('.ib-t[title^="Hide"]', el); const ur = [h('button.ib-t.ink-ur', { title: 'Undo (two-finger tap)', on: { click: () => App.undo() } }, '↶'), h('button.ib-t.ink-ur', { title: 'Redo (three-finger tap)', on: { click: () => App.redo() } }, '↷'), h('i.ink-sep')];
    x ? x.before(...ur) : el.append(...ur); };
}
