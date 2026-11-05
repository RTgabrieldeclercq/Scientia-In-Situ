/* ==========================================================================
   Scientia's whiteboard: the notebook's pen (V3.941). board.html runs the
   lab's whiteboard engine unchanged (the website's whiteboard is untouched);
   this file, after it, makes the pen on Scientia's board the pen of
   Scientia's notes — Gabe: "everything else that the notebook pen has …
   needs to become the way the whiteboard functions":
   • the pen in hand is the notebook's (window.parent.INK): its colour and
     width, the highlighter's colour, the eraser, its pressure feel — chosen
     in the notebook's own ink bar at the top of the whiteboard window
     (13zzd), which calls SIS_PEN.sync(). The board's ✎ fan keeps its modes;
     its width, eraser, add-a-colour and undo act on the notebook's pen;
   • the Slim Pen's eraser end erases; ◧ fills the closed stroke tapped in
     (fill strokes just under it, `fillOf`; they go when it goes);
   • two fingers tapped = undo, three = redo (and ↶ ↷, Ctrl+Z / Ctrl+Y), by
     the board's journal (store.js);
   • the palm (13zf PALM): a touch the size of a palm, made while the pen is
     near, or close to another touch never reaches the engine.
   V3.942 — the lasso (13zu): ◌ in the bar, or the Slim Pen's barrel button
   held, whatever tool is on. Loop around ink and cards to select them; drag
   inside to move, a corner to scale; its bar: Copy, Duplicate, ⇋ ⇵, Pen ↔
   Highlighter, ◧ Fill / Unfill, Delete, Done. A colour or width picked in
   the ink bar restyles the selection; a barrel tap on it copies it, a
   barrel tap elsewhere pastes; Ctrl+C / Ctrl+V, Delete, Esc.
   ========================================================================== */
(function () {
'use strict';
const ST = window.SIS_STORE, HOST = ST && ST.host;
if (!ST || ST.view || !HOST || !HOST.pen) return;   // the cell's preview, or opened on its own: nothing to drive
const W = window.parent;
const INK = () => HOST.pen.ink();
const PALM = () => W.SIS_PALM || { GAP: 70, SIZE: 90, QUIET: 600 };
const board = () => { const nb = window.NOTEBOOK_BOARD; return (nb && nb._state && nb._state.inst) || null; };
const REF = 1000;                                  // a notebook width in px = that many thousandths of the board's width
const PEN = 'sis-pen', HL = 'sis-hl', PROBE = 'sis-probe', PROBE_C = '#fffffe';

/* ─── the pen in hand: the notebook's ─── */
const cx = document.createElement('canvas').getContext('2d');
const hex = c => { if (!c || c === 'auto') return '#1d1d1b'; cx.fillStyle = '#000000'; cx.fillStyle = c; const v = String(cx.fillStyle); return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '#1d1d1b'; };
let lastKey = '', lastInst = null, lastLook = null;
function sync() {
  const I = INK(), b = board(); if (!I || !b) return;
  const probe = I.tool === 'fill' || I.tool === 'lasso';   // ◧ and ◌: the engine places the tap or the loop for us
  const pens = [{ id: PEN, kind: 'pen', color: hex(I.COLORS[I.color]), w: (I.WIDTHS[I.width] || 2.4) / REF }, { id: HL, kind: 'hl', color: hex(I.HL[I.hlColor] || I.HL[0]), w: .014 },
    { id: PROBE, kind: 'pen', color: PROBE_C, w: .001 }];
  const key = JSON.stringify(pens); if (key !== lastKey || b !== lastInst) { lastKey = key; lastInst = b; b.setPens(pens); }
  if (I.tool === 'eraser') b.setTool('eraser'); else b.usePen(probe ? PROBE : I.tool === 'hl' ? HL : PEN);
  // V3.942 — a colour or a width picked with a selection on the board restyles it
  const look = { c: pens[0].color, w: pens[0].w, hc: pens[1].color };
  if (SEL && lastLook && (look.c !== lastLook.c || look.w !== lastLook.w || look.hc !== lastLook.hc)) restyle(look, lastLook);
  lastLook = look;
}
const ready = () => { const b = board(); if (b && b !== lastInst) sync(); return b; };   // replay and back-to-live make a new engine
const boot = setInterval(() => { if (board()) { clearInterval(boot); sync(); } }, 120); setTimeout(() => clearInterval(boot), 30000);

/* ─── its pressure feel (13zf INK.curve): each sample's pressure as the engine's pressF reads it, so a stroke has the
       notebook's thinnest–thickest; pressure off = even lines. Live and saved strokes agree. ─── */
const feel = v => { const I = INK(); let m = 1; if (I && I.pressure && v > 0) { const C = I.curve; m = C.min + (C.max - C.min) * I.mapP(v); } return ((m - .4) / 1.2) || .001; };
const setP = (ev, v) => { try { Object.defineProperty(ev, 'pressure', { value: v, configurable: true }); } catch (e) { } };
function feelPen(e) {
  const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  if (list && list.length) { list.forEach(c => setP(c, feel(c.pressure))); try { Object.defineProperty(e, 'getCoalescedEvents', { value: () => list, configurable: true }); } catch (x) { } }
  setP(e, feel(e.pressure));
}

/* ─── undo and redo: the board's journal ─── */
const undo = () => { if (!ST.undo()) HOST.pen.toast('Nothing to undo on this board'); };
const redo = () => { if (!ST.redo()) HOST.pen.toast('Nothing to redo on this board'); };

/* ─── the palm, and two- and three-finger taps (13zm) ─── */
let penAt = -1e9;
const penNear = () => performance.now() - penAt < PALM().QUIET;
const size = e => Math.max(e.width || 0, e.height || 0, 2 * (e.radiusX || 0), 2 * (e.radiusY || 0));
const big = e => size(e) > PALM().SIZE;
const apart = P => P.every((p, i) => P.every((q, j) => j <= i || Math.hypot(p[0] - q[0], p[1] - q[1]) >= PALM().GAP));
const TOUCH = new Map(), PALMS = new Set(), DOWN = new Set();
/** the engine lets go of a touch it had: it turned out to be the palm */
function cancel(id) {
  const t = TOUCH.get(id); TOUCH.delete(id); PALMS.add(id); if (!t) return;
  const ev = new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true, clientX: t.x, clientY: t.y }); ev.__sis = true;
  try { (t.el && t.el.isConnected ? t.el : document.body).dispatchEvent(ev); } catch (x) { }
}
let G = null; const TAP = 650;
const gStart = () => { const now = performance.now(); if (!G || G.done || now - G.t0 > 400) G = { t0: now, ids: new Map(), max: 0, moved: false, done: false, fired: false, live: 0, palm: false, pts: [], tpts: [] }; return G; };
const gReal = g => { const P = g.pts.length >= 2 ? g.pts : g.tpts; return !g.moved && !g.palm && !penNear() && (P.length < 2 || apart(P)); };
const gFire = (g, n) => { if (g.fired) return; g.fired = true; const a = document.activeElement; if (a && a.closest && a.closest('input,textarea,[contenteditable="true"]')) return; if (n === 2) undo(); else redo(); };
const gEnd = () => { const g = G; if (!g || g.done || g.ids.size || g.live) return; g.done = true; if (performance.now() - g.t0 <= TAP && g.max >= 2 && gReal(g)) gFire(g, g.max); };

/* ─── the Slim Pen's eraser end ─── */
const isEraser = e => e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32);
let ER = null;

addEventListener('pointerdown', e => {
  if (e.__sis) return;
  if (e.pointerType !== 'touch' || !DOWN.size) ST.step();   // each stroke its own undo step (a resting hand never joins them)
  DOWN.add(e.pointerId); ready();
  // V3.942 — the lasso: a tap elsewhere lets the selection go; a stroke's samples are kept (its loop, where the board is)
  const onSel = !!(OV && OV.contains(e.target));
  if (SEL && !onSel && !(e.target.closest && e.target.closest('.wb-pills'))) clearSel();
  if (!onSel && e.pointerType !== 'touch') CUR = { id: e.pointerId, pts: [[e.clientX, e.clientY]], lasso: lassoNow() || barrel(e) };
  if (e.pointerType === 'pen') {
    penAt = performance.now(); [...TOUCH.keys()].forEach(cancel); feelPen(e);
    if (isEraser(e)) { const b = board(); if (b && b.getTool() !== 'eraser') { ER = { id: e.pointerId, prev: b.currentPen() }; b.setTool('eraser'); } }
    else if (!onSel && barrel(e)) { const b = board(); if (b) { ONCE = { id: e.pointerId, prev: b.currentPen(), until: performance.now() + 2500 }; b.usePen(PROBE); } }   // the barrel button: a lasso, whatever tool is on
    return;
  }
  if (e.pointerType !== 'touch') return;
  const g = gStart(); g.ids.set(e.pointerId, [e.clientX, e.clientY]); g.max = Math.max(g.max, g.ids.size); g.pts.push([e.clientX, e.clientY]);
  const close = [...TOUCH.values()].some(t => Math.hypot(t.x - e.clientX, t.y - e.clientY) < PALM().GAP);
  if (PALMS.size || big(e) || penNear() || close) {
    g.palm = true; if (close) [...TOUCH.keys()].forEach(cancel);
    PALMS.add(e.pointerId); e.stopImmediatePropagation(); return;
  }
  TOUCH.set(e.pointerId, { x: e.clientX, y: e.clientY, el: e.target });
}, true);
addEventListener('pointermove', e => {
  if (e.__sis) return;
  if (e.pointerType === 'pen') { penAt = performance.now(); if (TOUCH.size) [...TOUCH.keys()].forEach(cancel); feelPen(e); track(e); return; }
  if (e.pointerType !== 'touch') { track(e); return; }
  if (G && G.ids.has(e.pointerId)) { const [x, y] = G.ids.get(e.pointerId); if (Math.hypot(e.clientX - x, e.clientY - y) > 18) G.moved = true; }
  if (PALMS.has(e.pointerId)) { e.stopImmediatePropagation(); return; }
  const t = TOUCH.get(e.pointerId); if (t) { t.x = e.clientX; t.y = e.clientY; }
}, true);
const up = e => {
  if (e.__sis) return;
  DOWN.delete(e.pointerId);
  if (CUR && CUR.id === e.pointerId) { LAST = { pts: CUR.pts, t: performance.now(), lasso: CUR.lasso }; CUR = null; loop(null); }
  const back = p => setTimeout(() => { const b = board(); if (!b || !p) return; if (p.tool === 'pen') b.usePen(p.id); else b.setTool(p.tool); }, 0);
  if (e.pointerType === 'pen') {
    penAt = performance.now(); feelPen(e);
    if (ER && ER.id === e.pointerId) { const p = ER.prev; ER = null; back(p); }
    if (ONCE && ONCE.id === e.pointerId) { const p = ONCE.prev; ONCE.id = null; back(p); }
    return;
  }
  if (e.pointerType !== 'touch') return;
  if (G && G.ids.has(e.pointerId)) { G.ids.delete(e.pointerId); gEnd(); }
  TOUCH.delete(e.pointerId);
  if (PALMS.delete(e.pointerId)) e.stopImmediatePropagation();
};
addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
// the same taps counted by fingers on the glass (some Windows touch drivers report only these fully)
addEventListener('touchstart', e => { const g = gStart(); g.live = e.touches.length; g.max = Math.max(g.max, e.touches.length);
  [...e.changedTouches].forEach(t => { if (big(t)) g.palm = true; g.tpts.push([t.clientX, t.clientY]); }); if (penNear()) g.palm = true; }, { capture: true, passive: true });
const tEnd = e => { if (!G) return; G.live = e.touches.length; gEnd(); };
addEventListener('touchend', tEnd, { capture: true, passive: true }); addEventListener('touchcancel', tEnd, { capture: true, passive: true });
// Windows makes a right-click of a two-finger tap: that is the tap
addEventListener('contextmenu', e => { const g = G; if (!g || performance.now() - g.t0 > 1500 || g.max < 2) return; if (gReal(g)) gFire(g, g.max); e.preventDefault(); e.stopImmediatePropagation(); }, true);
addEventListener('keydown', e => {
  const t = e.target; if (t && t.closest && t.closest('input,textarea,[contenteditable="true"]')) return;
  const k = (e.key || '').toLowerCase(); if (!(e.ctrlKey || e.metaKey) || (k !== 'z' && k !== 'y')) return;
  e.preventDefault(); e.stopImmediatePropagation(); if (k === 'y' || e.shiftKey) redo(); else undo();
}, true);

/* ─── the board's ✎ fan: its modes are the board's; its pen items act on the notebook's pen ─── */
addEventListener('click', e => {
  const it = e.target.closest && e.target.closest('.wb-fan-item,[data-wb-bar-undo]'); if (!it) return;
  const act = it.hasAttribute('data-wb-bar-undo') ? 'undo' : it.dataset.wbAct, b = board(), I = INK();
  const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); if (b && act !== 'undo') b.openPill(null); };
  if (act === 'undo') { stop(); undo(); }
  else if (act === 'width') { stop(); HOST.pen.width(Math.max(0, [...document.querySelectorAll('.wb-fan-item[data-wb-act="width"]')].indexOf(it))); }
  else if (act === 'pen-add') { stop(); const r = it.getBoundingClientRect(); HOST.pen.add(it.dataset.kind === 'hl' ? 'hl' : 'pen', r.left, r.bottom + 6); }
  else if (act === 'eraser') { stop(); HOST.pen.tool(I && I.tool === 'eraser' ? (I.lastDraw === 'hl' ? 'hl' : 'pen') : 'eraser'); }
  else if (act === 'pen-pick') { stop(); HOST.pen.tool(it.dataset.pen === HL ? 'hl' : 'pen'); }
  else if (act === 'hand-pen' || act === 'hand-hl') setTimeout(() => HOST.pen.tool(act === 'hand-hl' ? 'hl' : 'pen'), 0);
}, true);

/* ─── ◧ fill (13zv): the smallest closed stroke around the tap is filled — solid with the pen (it replaces the fill
       there was), a translucent layer with the highlighter (layers deepen) — by fill strokes just under it ─── */
const box = P => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); } return { x0, y0, x1, y1 }; };
/** a stroke that closes on itself (13zv INK.closedLoop; a notebook px = 1/REF; the engine stores fewer points) */
const closedLoop = P => { const n = P.length / 3; if (n < 4) return false; let L = 0; for (let i = 3; i < P.length; i += 3) L += Math.hypot(P[i] - P[i - 3], P[i + 1] - P[i - 2]);
  const b = box(P), diag = Math.hypot(b.x1 - b.x0, b.y1 - b.y0); return diag > 14 / REF && Math.hypot(P[P.length - 3] - P[0], P[P.length - 2] - P[1]) < Math.max(.22 * diag, 12 / REF) && L > 1.6 * diag; };
const inside = (x, y, P) => { let c = false; const n = P.length / 3; for (let i = 0, j = n - 1; i < n; j = i++) { const xi = P[3 * i], yi = P[3 * i + 1], xj = P[3 * j], yj = P[3 * j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi) c = !c; } return c; };
const STEP = 1.2 / REF;   // scan lines a notebook 1.2 px apart, each 2.2 times that wide, so they close up into one area
/** The inside of a closed stroke as zig-zag strokes: each scan line's spans (inset by a line's half width), chained to
    the span of the next line that overlaps them, back and forth. A point just inside each end of a span keeps the
    engine's curve through the corners from swinging out past the shape. */
function scan(P) {
  const b = box(P), n = P.length / 3, chains = []; let open = [];
  const chain = () => { const c = { pts: [], last: null, dir: 1, add(s, y) { const [a, z] = c.dir > 0 ? s : [s[1], s[0]], e = Math.min(STEP, Math.abs(z - a) / 3) * Math.sign(z - a);
    if (e) c.pts.push(a, y, .5, a + e, y, .5, z - e, y, .5, z, y, .5); else c.pts.push(a, y, .5, z, y, .5); c.last = s; c.dir = -c.dir; } }; chains.push(c); return c; };
  for (let y = b.y0 + STEP / 2; y < b.y1; y += STEP) {
    const xs = [];
    for (let i = 0, j = n - 1; i < n; j = i++) { const yi = P[3 * i + 1], yj = P[3 * j + 1]; if ((yi > y) !== (yj > y)) xs.push(P[3 * i] + (y - yi) * (P[3 * j] - P[3 * i]) / (yj - yi)); }
    xs.sort((p, q) => p - q);
    const used = new Set(), next = [];
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let a = xs[k] + STEP, z = xs[k + 1] - STEP; if (z < a) a = z = (xs[k] + xs[k + 1]) / 2;
      const c = open.find(o => !used.has(o) && a <= o.last[1] + STEP && o.last[0] - STEP <= z && o.pts.length < 2600) || chain();
      used.add(c); c.add([a, z], y); next.push(c);
    }
    open = next;
  }
  return chains.map(c => c.pts.map(v => Math.round(v * 1e5) / 1e5));
}
function fillAt(probe) {
  const P = probe.pts || [], pb = box(P), x = P[0], y = P[1], page = probe.pageId;
  if (pb.x1 - pb.x0 > 12 / REF || pb.y1 - pb.y0 > 12 / REF) return;   // a drag, not a tap
  let best = null, area = Infinity;
  ST.list('strokes').forEach(r => { const s = r.data;
    if (s.pageId !== page || s.erasedAt || s.hiddenBy || s.fillOf || s.hl || s.color === PROBE_C || !Array.isArray(s.pts) || !closedLoop(s.pts) || !inside(x, y, s.pts)) return;
    const q = box(s.pts), a = (q.x1 - q.x0) * (q.y1 - q.y0); if (a < area) { area = a; best = r; } });
  if (!best) return HOST.pen.toast('Tap inside a closed shape to fill it');
  ST.write(fillOps(best, HOST.pen.paint()));
}
/** The writes that fill one closed stroke {id, data} with paint f {c, hl}. */
function fillOps(best, f) {
  const page = best.data.pageId, ops = [], mine = ST.list('strokes').filter(r => r.data.fillOf === best.id && !r.data.erasedAt);
  if (!f.hl) mine.forEach(r => ops.push({ op: 'del', path: r.path }));
  else { const layers = mine.filter(r => r.data.hl); if (layers.length >= 8) ops.push({ op: 'del', path: layers[0].path }); }
  const now = Date.now(), seq = (+best.data.seq || now) - .5;
  scan(best.data.pts).forEach((pts, k) => ops.push({ op: 'set', path: ST.root + '/strokes/' + ST.newId(),
    data: Object.assign({ pageId: page, seq: seq - k / 1000, color: hex(f.c), w: STEP * 2.2, pts, done: true, t0: now, t1: now, fillOf: best.id }, f.hl ? { hl: true } : {}) }));
  return ops;
}
ST.skip(c => { const d = c.after || c.before; return !!d && d.color === PROBE_C; });   // the tap's mark is no undo step
ST.onWrite((changes, replay) => {
  if (SEL) SEL.bb = null;   // V3.942 — the selection's box is measured again
  if (replay) return;
  const gone = [], pre = ST.root + '/strokes/';
  changes.forEach(c => {
    if (!c.path.startsWith(pre)) return;
    const a = c.after, b = c.before;
    if (a && a.color === PROBE_C) { if (a.done) Promise.resolve().then(() => { ST.write([{ op: 'del', path: c.path }]); probeDone(a); }); return; }
    if (a && a.done && (!b || !b.done) && !a.fillOf && LAST && performance.now() - LAST.t < 1500 && Array.isArray(a.pts)) learn(LAST.pts, a.pts);   // a stroke drawn here: where the board is on the screen
    if (b && !b.fillOf && (!a || (a.erasedAt && !b.erasedAt))) gone.push([c.path.slice(pre.length), a && a.erasedAt]);
  });
  if (gone.length) Promise.resolve().then(() => {   // a stroke's fill goes with it
    const ops = []; gone.forEach(([id, at]) => ST.list('strokes').forEach(r => { if (r.data.fillOf === id && !r.data.erasedAt) ops.push(at ? { op: 'update', path: r.path, data: { erasedAt: at } } : { op: 'del', path: r.path }); }));
    if (ops.length) ST.write(ops);
  });
});

/* ─── V3.942 · where a board point is on the screen. The engine keeps its view to itself; on its plane a point is
       u = A·(x − left)/scale + originX + kx (v likewise) — the scale and origin from the engine's handle, A and k fixed
       for the board's width, learnt from each stroke drawn here (its samples on the screen against its points). ─── */
const MAP = { A: 0, kx: 0, ky: 0 };
const inkEl = () => document.querySelector('.wb-canvas-ink');
const view = () => { const b = board(), v = (b && b.getView()) || {}, o = (b && b.getOrigin()) || {}; return { s: v.scale || 1, ox: o.x || 0, oy: o.y || 0 }; };
const corners = P => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); return { x0, y0, x1, y1 }; };
function learn(client, pts) {
  const el = inkEl(); if (!el || !client || client.length < 2 || pts.length < 6) return;
  const c = corners(client), p = box(pts), cw = c.x1 - c.x0, ch = c.y1 - c.y0;
  const k = cw > 24 && ch > 24 ? ((p.x1 - p.x0) / cw + (p.y1 - p.y0) / ch) / 2 : cw > 24 ? (p.x1 - p.x0) / cw : ch > 24 ? (p.y1 - p.y0) / ch : 0; if (!(k > 0)) return;
  const R = el.getBoundingClientRect(), V = view(); MAP.A = k * V.s;
  MAP.kx = p.x0 - MAP.A * (c.x0 - R.left) / V.s - V.ox; MAP.ky = p.y0 - MAP.A * (c.y0 - R.top) / V.s - V.oy;
}
const toBoard = (x, y) => { const R = inkEl().getBoundingClientRect(), V = view(); return [MAP.A * (x - R.left) / V.s + V.ox + MAP.kx, MAP.A * (y - R.top) / V.s + V.oy + MAP.ky]; };
const toScreen = (u, v) => { const R = inkEl().getBoundingClientRect(), V = view(); return [R.left + (u - V.ox - MAP.kx) * V.s / MAP.A, R.top + (v - V.oy - MAP.ky) * V.s / MAP.A]; };

/* ─── the lasso ─── */
const barrel = e => e.pointerType === 'pen' && ((e.buttons & 2) === 2 || e.button === 2);
let ONCE = null, CUR = null, LAST = null, SEL = null, OV = null, CLIP = null, LOOP = null;
const lassoNow = () => !!(ONCE && ONCE.until > performance.now()) || (INK() && INK().tool === 'lasso');
/** the loop as it is drawn (on the screen, over the board) */
function loop(pts) {
  if (!pts) { if (LOOP) LOOP.remove(); LOOP = null; return; }
  if (!LOOP) { LOOP = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); LOOP.id = 'sis-loop'; LOOP.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path')); document.body.append(LOOP); }
  LOOP.firstChild.setAttribute('d', 'M' + pts.map(p => p[0] + ',' + p[1]).join('L') + 'Z');
}
function track(e) {
  if (!CUR || CUR.id !== e.pointerId) return;
  const C = e.getCoalescedEvents ? e.getCoalescedEvents() : null; (C && C.length ? C : [e]).forEach(q => CUR.pts.push([q.clientX, q.clientY]));
  if (CUR.lasso) loop(CUR.pts);
}
/** ◧ or ◌ placed its mark: a lasso loop selects; a tap with the lasso pastes; otherwise it is a fill tap */
function probeDone(a) {
  const lasso = LAST && LAST.lasso && performance.now() - LAST.t < 2500;
  if (!lasso) return fillAt(a);
  const P = a.pts || [], pb = box(P);
  if (pb.x1 - pb.x0 < 12 / REF && pb.y1 - pb.y0 < 12 / REF) { if (CLIP) paste(P[0], P[1], a.pageId); return; }
  learn(LAST.pts, P);
  const ids = [], cards = [];
  ST.list('strokes').forEach(r => { const d = r.data; if (d.fillOf || d.erasedAt || d.hiddenBy || d.color === PROBE_C || d.pageId !== a.pageId || !Array.isArray(d.pts)) return;
    const n = d.pts.length / 3; let k = 0; for (let i = 0; i < d.pts.length; i += 3) if (inside(d.pts[i], d.pts[i + 1], P)) k++; if (k >= Math.max(1, n * .6)) ids.push(r.id); });
  ST.list('items').forEach(r => { const d = r.data; if (d.type === 'region' || d.x == null || (d.pageId && d.pageId !== a.pageId)) return; const w = +d.w || .4, hh = +d.h || w / (+d.ar || 1.6); if (inside(+d.x + w / 2, (+d.y || 0) + hh / 2, P)) cards.push(r.id); });
  if (!ids.length && !cards.length) return HOST.pen.toast('Nothing inside the lasso');
  select(ids, cards, a.pageId);
}
const strokesBy = () => new Map(ST.list('strokes').map(r => [r.id, r]));
const itemsBy = () => new Map(ST.list('items').map(r => [r.id, r]));
function select(ids, cards, page) {
  const S = strokesBy(), all = new Set(ids); S.forEach((r, id) => { if (r.data.fillOf && all.has(r.data.fillOf) && !r.data.erasedAt) all.add(id); });   // a shape's fill goes with it
  SEL = { ids: [...all], shapes: ids.slice(), cards: cards.slice(), page, bb: null }; paintSel();
}
function clearSel() { SEL = null; if (OV) { OV.remove(); OV = null; } }
function selBounds() {
  if (!SEL) return null; if (SEL.bb) return SEL.bb;
  const S = strokesBy(), I = itemsBy(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  SEL.ids = SEL.ids.filter(id => S.has(id) && !S.get(id).data.erasedAt); SEL.shapes = SEL.shapes.filter(id => S.has(id)); SEL.cards = SEL.cards.filter(id => I.has(id));
  SEL.ids.forEach(id => { const d = S.get(id).data, b = box(d.pts || []), m = (+d.w || .004) / 2; x0 = Math.min(x0, b.x0 - m); y0 = Math.min(y0, b.y0 - m); x1 = Math.max(x1, b.x1 + m); y1 = Math.max(y1, b.y1 + m); });
  SEL.cards.forEach(id => { const d = I.get(id).data, w = +d.w || .4, hh = +d.h || w / (+d.ar || 1.6); x0 = Math.min(x0, +d.x); y0 = Math.min(y0, +d.y || 0); x1 = Math.max(x1, +d.x + w); y1 = Math.max(y1, (+d.y || 0) + hh); });
  if (!(x1 > x0)) return null; return (SEL.bb = { x0, y0, x1, y1 });
}
const ACTS = [['copy', 'Copy', 'Copy (Ctrl+C) — a barrel tap elsewhere pastes'], ['dup', 'Duplicate', 'A copy beside it'], ['flipx', '⇋', 'Flip left ↔ right'], ['flipy', '⇵', 'Flip up ↕ down'],
  ['kind', 'Pen ↔ Highlighter', 'Pen strokes become highlighter, or back'], ['fill', '◧ Fill', 'Fill the closed strokes with the last pen or highlighter colour'], ['unfill', 'Unfill', 'Take their fills away'], ['del', 'Delete', 'Delete (Del)'], ['done', 'Done', 'Let go (Esc)']];
function paintSel() {
  const bb = selBounds(); if (!SEL || !bb || !MAP.A) { if (!bb && SEL) clearSel(); return; }
  if (!OV) {
    OV = document.createElement('div'); OV.className = 'sis-sel';
    ['nw', 'ne', 'sw', 'se'].forEach(k => { const i = document.createElement('i'); i.className = 'sis-h'; i.dataset.h = k; OV.append(i); });
    const bar = document.createElement('div'); bar.className = 'sis-selbar'; const n = document.createElement('span'); n.className = 'n'; bar.append(n);
    ACTS.forEach(([a, t, title]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.a = a; b.textContent = t; b.title = title; if (a === 'del') b.className = 'danger'; bar.append(b); });
    bar.addEventListener('pointerdown', e => e.stopPropagation()); bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) act(b.dataset.a); });
    OV.append(bar); OV.addEventListener('pointerdown', e => { if (e.target.closest('.sis-selbar')) return; drag(e, (e.target.dataset && e.target.dataset.h) || 'move'); });
    document.body.append(OV); requestAnimationFrame(follow);
  }
  const [x0, y0] = toScreen(bb.x0, bb.y0), [x1, y1] = toScreen(bb.x1, bb.y1);
  Object.assign(OV.style, { left: (x0 - 6) + 'px', top: (y0 - 6) + 'px', width: (x1 - x0 + 12) + 'px', height: (y1 - y0 + 12) + 'px' });
  OV.classList.toggle('up', y1 > innerHeight - 70);
  const k = SEL.shapes.length, c = SEL.cards.length; OV.querySelector('.n').textContent = [k ? k + ' stroke' + (k > 1 ? 's' : '') : '', c ? c + ' card' + (c > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
}
function follow() { if (!OV) return; paintSel(); requestAnimationFrame(follow); }   // the view moves: the box follows
/** the selection's documents as they are now, to transform from */
function snap() { const S = strokesBy(), I = itemsBy(); return { s: SEL.ids.map(id => S.get(id)).filter(Boolean).map(r => ({ path: r.path, data: Object.assign({}, r.data, { pts: (r.data.pts || []).slice() }) })), c: SEL.cards.map(id => I.get(id)).filter(Boolean).map(r => ({ path: r.path, data: r.data })) }; }
/** writes that put the snapshot through T(x, y) → [x, y] (cards keep their size: their centre moves) */
function moved(o, T) {
  const ops = o.s.map(r => { const p = r.data.pts.slice(); for (let i = 0; i + 1 < p.length; i += 3) { const q = T(p[i], p[i + 1]); p[i] = Math.round(q[0] * 1e5) / 1e5; p[i + 1] = Math.round(q[1] * 1e5) / 1e5; } return { op: 'set', path: r.path, data: Object.assign({}, r.data, { pts: p }) }; });
  o.c.forEach(r => { const d = r.data, w = +d.w || .4, hh = +d.h || w / (+d.ar || 1.6), q = T(+d.x + w / 2, (+d.y || 0) + hh / 2); ops.push({ op: 'update', path: r.path, data: { x: Math.round((q[0] - w / 2) * 1e5) / 1e5, y: Math.round((q[1] - hh / 2) * 1e5) / 1e5 } }); });
  return ops;
}
function drag(e, how) {
  e.preventDefault(); e.stopPropagation(); if (!SEL || !MAP.A) return;
  const o = snap(), b0 = selBounds(), p0 = toBoard(e.clientX, e.clientY), cop = barrel(e); let raf = 0, last = null, went = false;
  const anchor = how === 'move' ? null : [how.includes('w') ? b0.x1 : b0.x0, how.includes('n') ? b0.y1 : b0.y0];
  const apply = () => { raf = 0; if (!last) return; const p = toBoard(last.clientX, last.clientY); let T;
    if (!anchor) { const du = p[0] - p0[0], dv = p[1] - p0[1]; T = (x, y) => [x + du, y + dv]; }
    else { const d0 = Math.hypot(p0[0] - anchor[0], p0[1] - anchor[1]) || 1e-6, f = Math.max(.05, Math.hypot(p[0] - anchor[0], p[1] - anchor[1]) / d0); T = (x, y) => [anchor[0] + (x - anchor[0]) * f, anchor[1] + (y - anchor[1]) * f]; }
    ST.write(moved(o, T)); };
  const mv = ev => { if (ev.pointerId !== e.pointerId) return; if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 4) went = true; last = ev; if (went && !raf) raf = requestAnimationFrame(apply); };
  const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
    if (raf) { cancelAnimationFrame(raf); apply(); } if (!went && cop) copy(); };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}
function copy(quiet) { if (!SEL) return; const o = snap(), bb = selBounds(); CLIP = { s: o.s.map(r => ({ id: r.path.slice(r.path.lastIndexOf('/') + 1), data: r.data })), x: bb.x0, y: bb.y0 }; if (!quiet) HOST.pen.toast('Copied — a barrel tap (or Ctrl+V) pastes'); }
/** the copied strokes with their top-left at (u, v); a fill keeps to its shape's copy */
function paste(u, v, page) {
  if (!CLIP || !CLIP.s.length) return; const du = u - CLIP.x, dv = v - CLIP.y, ids = {}, now = Date.now(), ops = [];
  CLIP.s.forEach(r => { ids[r.id] = ST.newId(); });
  CLIP.s.forEach((r, k) => { const d = r.data, p = (d.pts || []).slice(); for (let i = 0; i + 1 < p.length; i += 3) { p[i] = Math.round((p[i] + du) * 1e5) / 1e5; p[i + 1] = Math.round((p[i + 1] + dv) * 1e5) / 1e5; }
    const nd = Object.assign({}, d, { pts: p, pageId: page || d.pageId, seq: d.fillOf ? now + k / 1000 - .5 : now + k / 1000, t0: now, t1: now }); delete nd.erasedAt; if (d.fillOf) nd.fillOf = ids[d.fillOf] || d.fillOf;
    ops.push({ op: 'set', path: ST.root + '/strokes/' + ids[r.id], data: nd }); });
  ST.write(ops); select(CLIP.s.filter(r => !r.data.fillOf).map(r => ids[r.id]), [], page);
}
function act(a) {
  if (!SEL) return; ST.step(); const o = snap(), bb = selBounds(), I = INK();
  if (a === 'done') return clearSel();
  if (a === 'copy') return copy();
  if (a === 'dup') { const keep = CLIP; copy(true); paste(CLIP.x + .02, CLIP.y + .02, SEL.page); CLIP = keep || CLIP; return; }
  if (a === 'flipx') return ST.write(moved(o, (x, y) => [bb.x0 + bb.x1 - x, y]));
  if (a === 'flipy') return ST.write(moved(o, (x, y) => [x, bb.y0 + bb.y1 - y]));
  if (a === 'del') { ST.write(o.s.map(r => ({ op: 'del', path: r.path }))); const b = board(); SEL.cards.forEach(id => { try { b && b.removeItem(id); } catch (e) { } }); return clearSel(); }
  const shapes = o.s.filter(r => !r.data.fillOf);
  if (a === 'kind') { const toPen = shapes.length && shapes.every(r => r.data.hl), pw = (I.WIDTHS[I.width] || 2.4) / REF;
    return ST.write(shapes.map(r => { const d = Object.assign({}, r.data); if (toPen) { delete d.hl; d.w = pw; } else { d.hl = true; d.w = .014; } return { op: 'set', path: r.path, data: d }; })); }
  if (a === 'unfill') return ST.write(o.s.filter(r => r.data.fillOf).map(r => ({ op: 'del', path: r.path })));
  if (a === 'fill') { const f = HOST.pen.paint(), ops = []; let n = 0; shapes.forEach(r => { if (!r.data.hl && closedLoop(r.data.pts || [])) { n++; ops.push(...fillOps({ id: r.path.slice(r.path.lastIndexOf('/') + 1), data: r.data }, f)); } });
    if (!n) return HOST.pen.toast('No closed strokes to fill'); ST.write(ops); const S = strokesBy(); SEL.ids = [...new Set([...SEL.ids, ...[...S.keys()].filter(id => SEL.shapes.includes(S.get(id).data.fillOf))])]; SEL.bb = null; }
}
/** a colour or width from the ink bar, onto the selection: the pen's colour to its pen strokes, the highlighter's to its highlighter strokes */
function restyle(look, was) {
  const o = snap(), ops = []; ST.step();
  o.s.filter(r => !r.data.fillOf).forEach(r => { const d = Object.assign({}, r.data); let ch = false;
    if (d.hl) { if (look.hc !== was.hc) { d.color = look.hc; ch = true; } }
    else { if (look.c !== was.c) { d.color = look.c; ch = true; } if (look.w !== was.w) { d.w = look.w; ch = true; } }
    if (ch) ops.push({ op: 'set', path: r.path, data: d }); });
  if (ops.length) ST.write(ops);
}
addEventListener('keydown', e => {
  const t = e.target; if (t && t.closest && t.closest('input,textarea,[contenteditable="true"]')) return;
  const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (SEL && !mod && (k === 'delete' || k === 'backspace')) { e.preventDefault(); e.stopImmediatePropagation(); act('del'); }
  else if (SEL && k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); clearSel(); }
  else if (SEL && mod && k === 'c') { e.preventDefault(); copy(); }
  else if (mod && k === 'v' && CLIP) { e.preventDefault(); if (!MAP.A || !LAST) return HOST.pen.toast('Tap with the lasso (or the barrel button) where it goes'); const p = LAST.pts[LAST.pts.length - 1], q = toBoard(p[0], p[1]); ST.step(); paste(q[0], q[1], SEL ? SEL.page : 'p1'); }
}, true);

window.SIS_PEN = { sync, undo, redo, lasso: { get sel() { return SEL; }, map: MAP, toBoard, toScreen, act } };
})();
