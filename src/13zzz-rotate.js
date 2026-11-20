/* ==========================================================================
   13zzz · Rotate (V4.21). Gabe: "Add a Rotate button to the Zoom pill,
   flipping the entire app by 90 degrees clockwise."
   - Each Rotate turns the whole app 90° clockwise more; the fourth puts it
     upright again. Kept on this device (_ls 'rotate').
   - The page is turned with a transform on <body> (32-rotate.css): the app
     is laid out in the turned frame (width and height swapped at 90° and
     270°), so it simply is upright in it.
   - The app's own coordinate math works in that frame because, while
     turned, the browser's coordinates are given in it: a pointer's
     clientX / clientY / pageX / x / y and its movement (MouseEvent,
     PointerEvent, Touch — events the browser made; one a script made is
     already in the frame), getBoundingClientRect / getClientRects (Element,
     Range), elementFromPoint(s) and caretRangeFromPoint /
     caretPositionFromPoint, innerWidth / innerHeight and the root's
     clientWidth / clientHeight; the edge pan's push from the computer's
     mouse counter (HANDS.feed). Upright, every one of them is the browser's
     own, untouched.
   - CSS sizes in vw / vh (popover and dialog caps) would still measure the
     screen: a sheet of the same rules with vw and vh swapped applies at 90°
     and 270° (#rot-units, built from the page's own sheets).
   - The way out is never lost: Esc three times, /rotate reset, ?rotate=0, or
     Settings → Rotate the app → Upright (or the switch off).
   - What it can't turn: the browser's own popups (a <select>'s list, a
     title tooltip, a drag's ghost image) stay upright on the screen; mouse
     wheels scroll along the app's axes, as the turned lists do.
   ========================================================================== */
const ROTATE = {
  KEY: 'rotate', r: 0, _esc: [],
  on: () => typeof FEAT === 'undefined' || FEAT.on('rotate'),
  /** The turn kept on this device: 0 · 90 · 180 · 270. */
  stored() { let v = 0; try { v = +_ls.get(ROTATE.KEY, 0) || 0; } catch (e) { } return [0, 90, 180, 270].includes(v) ? v : 0; },
  q: () => ROTATE.r === 90 || ROTATE.r === 270,
  name: v => v === 0 ? 'Upright' : v === 90 ? 'Turned 90° clockwise' : v === 180 ? 'Upside down (180°)' : 'Turned 270° clockwise',
  /** Keep a turn (a multiple of 90°) and show it. */
  set(v, quiet) {
    v = (((Math.round((+v || 0) / 90) * 90) % 360) + 360) % 360;
    try { _ls.set(ROTATE.KEY, v); } catch (e) { }
    ROTATE.sync();
    if (!quiet && typeof toast === 'function') toast(ROTATE.name(v) + (v ? ' — Rotate again turns it further; Esc three times puts it upright' : ''), 2400);
    return v;
  },
  turn(quiet) { return ROTATE.set(ROTATE.stored() + 90, quiet); },
  /** Show what is kept — upright while the feature is off. */
  sync() { const want = ROTATE.on() ? ROTATE.stored() : 0; if (want !== ROTATE.r) ROTATE.show(want); },
  show(v) {
    const root = document.documentElement; ROTATE.r = v;
    root.classList.toggle('rot', !!v); ['90', '180', '270'].forEach(k => root.classList.toggle('rot-' + k, String(v) === k)); root.classList.toggle('rot-q', ROTATE.q());
    if (ROTATE.q()) ROTATE.units();
    try { dispatchEvent(new Event('resize')); } catch (e) { }   // the app lays itself out in the turned frame
    try { const L = window.SIS_LAB || window.SIS_PILLS; if (L && L.paintPills) L.paintPills(); } catch (e) { }
  },
  /* ---------- the frame and the screen ---------- */
  nat: { W: null, H: null },
  sw: () => ROTATE.nat.W ? ROTATE.nat.W() : window.innerWidth, sh: () => ROTATE.nat.H ? ROTATE.nat.H() : window.innerHeight,
  /** A screen point (the browser's) → the turned frame's. */
  toFrame(X, Y) { const W = ROTATE.sw(), H = ROTATE.sh();
    switch (ROTATE.r) { case 90: return { x: Y, y: W - X }; case 180: return { x: W - X, y: H - Y }; case 270: return { x: H - Y, y: X }; default: return { x: X, y: Y }; } },
  /** A frame point → the screen's. */
  toScreen(x, y) { const W = ROTATE.sw(), H = ROTATE.sh();
    switch (ROTATE.r) { case 90: return { x: W - y, y: x }; case 180: return { x: W - x, y: H - y }; case 270: return { x: y, y: H - x }; default: return { x, y }; } },
  /** A rectangle on the screen → the frame's (a quarter turn keeps a box a box). */
  rect(n) { const W = ROTATE.sw(), H = ROTATE.sh(), L = n.left, T = n.top, R = n.right, B = n.bottom;
    switch (ROTATE.r) { case 90: return new DOMRect(T, W - R, B - T, R - L); case 180: return new DOMRect(W - R, H - B, R - L, B - T); case 270: return new DOMRect(H - B, L, B - T, R - L); default: return n; } },
  vec(dx, dy) { switch (ROTATE.r) { case 90: return { x: dy, y: -dx }; case 180: return { x: -dx, y: -dy }; case 270: return { x: -dy, y: dx }; default: return { x: dx, y: dy }; } },
  /** The page's rules sized in vw / vh, again with the two swapped, for a quarter turn (built afresh each time: sheets added since count). */
  units() {
    const out = [], swap = v => v.replace(/(\d*\.?\d+)([dsl]?)v([wh])\b/g, (m, n, k, a) => n + k + 'v' + (a === 'w' ? 'h' : 'w'));
    const split = t => { const parts = []; let d = 0, q = '', cur = ''; for (const ch of t) { if (q) { if (ch === q) q = ''; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ',' && !d) { parts.push(cur); cur = ''; continue; } cur += ch; } parts.push(cur); return parts.map(s => s.trim()).filter(Boolean); };
    const decls = t => { const o = []; let d = 0, q = '', cur = ''; for (const ch of t) { if (q) { if (ch === q) q = ''; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ';' && !d) { o.push(cur); cur = ''; continue; } cur += ch; } o.push(cur); return o.map(s => s.trim()).filter(s => /\dv[wh]\b/.test(s) && !/url\(/.test(s)); };
    const sel = s => /^html\b/.test(s) ? s.replace(/^html/, 'html:where(.rot-q)') : /^:root\b/.test(s) ? s.replace(/^:root/, ':root:where(.rot-q)') : ':where(.rot-q) ' + s;
    const walk = rules => { const acc = []; for (const r of rules) {
      if (r.type === 1) { if (/html\.rot/.test(r.selectorText)) continue;   // the turn's own rules (32-rotate.css) measure the screen on purpose
        const ds = /\dv[wh]\b/.test(r.style.cssText) ? decls(r.style.cssText) : []; if (ds.length) acc.push(split(r.selectorText).map(sel).join(',') + '{' + ds.map(swap).join(';') + '}'); }
      else if ((r.type === 4 || r.type === 12) && r.cssRules) { const inner = walk(r.cssRules); if (inner.length) acc.push((r.type === 4 ? '@media ' + r.conditionText : '@supports ' + r.conditionText) + '{' + inner.join('') + '}'); } }
      return acc; };
    for (const sh of document.styleSheets) { if (sh.ownerNode && sh.ownerNode.id === 'rot-units') continue; let rules; try { rules = sh.cssRules; } catch (e) { continue; } if (rules) out.push(...walk(rules)); }
    let st = document.getElementById('rot-units'); if (!st) { st = document.createElement('style'); st.id = 'rot-units'; document.head.append(st); }
    st.textContent = '/* V4.21 (13zzz ROTATE.units): the page\'s vw / vh sizes, swapped for a quarter turn */\n' + out.join('\n');
    return out.length;
  },
};
/* ---------- while turned, the browser's coordinates are the frame's (upright: its own, untouched) ---------- */
(function () {
  const desc = (o, k) => { for (let p = o; p; p = Object.getPrototypeOf(p)) { const d = Object.getOwnPropertyDescriptor(p, k); if (d) return d; } return null; };
  const W = desc(window, 'innerWidth'), H = desc(window, 'innerHeight');
  if (W && W.get && H && H.get) {
    ROTATE.nat.W = () => W.get.call(window); ROTATE.nat.H = () => H.get.call(window);
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, enumerable: true, get() { return ROTATE.q() ? ROTATE.nat.H() : ROTATE.nat.W(); } });
      Object.defineProperty(window, 'innerHeight', { configurable: true, enumerable: true, get() { return ROTATE.q() ? ROTATE.nat.W() : ROTATE.nat.H(); } });
    } catch (e) { console.warn('[rotate] innerWidth', e); }
  }
  const real = ev => !(ev instanceof Event) || ev.isTrusted;   // a script's own event is already in the frame; a Touch comes from the browser
  const pair = (proto, kx, ky, map) => {
    const dx = proto && desc(proto, kx), dy = proto && desc(proto, ky); if (!dx || !dy || !dx.get || !dy.get) return;
    Object.defineProperty(proto, kx, { configurable: true, enumerable: true, get() { const X = dx.get.call(this); return ROTATE.r && real(this) ? map(X, dy.get.call(this)).x : X; } });
    Object.defineProperty(proto, ky, { configurable: true, enumerable: true, get() { const Y = dy.get.call(this); return ROTATE.r && real(this) ? map(dx.get.call(this), Y).y : Y; } });
  };
  const pt = (X, Y) => ROTATE.toFrame(X, Y), mv = (a, b) => ROTATE.vec(a, b);
  try {
    pair(MouseEvent.prototype, 'clientX', 'clientY', pt); pair(MouseEvent.prototype, 'pageX', 'pageY', pt); pair(MouseEvent.prototype, 'x', 'y', pt);
    pair(MouseEvent.prototype, 'movementX', 'movementY', mv);
    if (typeof Touch !== 'undefined') { pair(Touch.prototype, 'clientX', 'clientY', pt); pair(Touch.prototype, 'pageX', 'pageY', pt); }
  } catch (e) { console.warn('[rotate] events', e); }
  const inBody = n => { const b = document.body; return !!b && !!n && (n === b || b.contains(n)); };
  const list = rs => { const o = [...rs].map(r => ROTATE.rect(r)); o.item = i => o[i] || null; return o; };
  const frameBox = () => new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  const eb = Element.prototype.getBoundingClientRect, ec = Element.prototype.getClientRects, rb = Range.prototype.getBoundingClientRect, rc = Range.prototype.getClientRects;
  Element.prototype.getBoundingClientRect = function () { const r = eb.call(this); if (!ROTATE.r) return r; if (this === document.documentElement) return frameBox(); return inBody(this) ? ROTATE.rect(r) : r; };
  Element.prototype.getClientRects = function () { const r = ec.call(this); return ROTATE.r && inBody(this) ? list(r) : r; };
  Range.prototype.getBoundingClientRect = function () { const r = rb.call(this); return ROTATE.r && inBody(this.commonAncestorContainer) ? ROTATE.rect(r) : r; };
  Range.prototype.getClientRects = function () { const r = rc.call(this); return ROTATE.r && inBody(this.commonAncestorContainer) ? list(r) : r; };
  ['elementFromPoint', 'elementsFromPoint', 'caretRangeFromPoint', 'caretPositionFromPoint'].forEach(k => {
    const f = Document.prototype[k]; if (typeof f !== 'function') return;
    Document.prototype[k] = function (x, y, ...rest) { if (!ROTATE.r || this !== document) return f.call(this, x, y, ...rest); const p = ROTATE.toScreen(x, y); return f.call(this, p.x, p.y, ...rest); };
  });
  const cw = desc(Element.prototype, 'clientWidth'), ch = desc(Element.prototype, 'clientHeight'), root = document.documentElement;
  if (cw && ch) try {
    Object.defineProperty(root, 'clientWidth', { configurable: true, get() { return (ROTATE.q() ? ch : cw).get.call(this); } });
    Object.defineProperty(root, 'clientHeight', { configurable: true, get() { return (ROTATE.q() ? cw : ch).get.call(this); } });
  } catch (e) { }
})();
{
  // the way out: Esc three times within a second and a half puts the app upright
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !ROTATE.r) return; const t = Date.now(); ROTATE._esc = ROTATE._esc.filter(x => t - x < 1500).concat(t);
    if (ROTATE._esc.length >= 3) { ROTATE._esc = []; ROTATE.set(0); }
  }, true);
  // Settings → the switch: FEAT.apply puts the page's classes right; the turn follows
  if (typeof FEAT !== 'undefined') { const fa = FEAT.apply; FEAT.apply = function () { const r = fa.apply(this, arguments); try { ROTATE.sync(); } catch (e) { } return r; }; }
  if (/[?&]rotate=0\b/.test(location.search)) { try { _ls.set(ROTATE.KEY, 0); } catch (e) { } }
  // the edge pan's push past the screen's edge comes from the computer's own mouse counter (13zzh, api/edge-push): turned too
  if (typeof HANDS !== 'undefined' && HANDS.feed) { const fd = HANDS.feed; HANDS.feed = function (j) { if (j && j.ok && ROTATE.r) { const v = ROTATE.vec(+j.x || 0, +j.y || 0); j = Object.assign({}, j, { x: v.x, y: v.y }); } return fd.call(this, j); }; }
  // /rotate: a quarter turn more; /rotate reset (or 90 · 180 · 270)
  if (typeof CMD !== 'undefined' && CMD.add) CMD.add({ slash: 'rotate', label: 'Turn the whole app 90° clockwise', group: 'View', alias: ['turn'],
    sub: 'Again for 180° and 270°; /rotate reset puts it upright (so do Esc three times)',
    args: [{ name: 'how', kind: 'choice', optional: true, choices: ['reset', '90', '180', '270'] }],
    run: A => { if (!ROTATE.on()) throw new Error('Rotate is off in Settings'); const v = !A.how ? ROTATE.turn(true) : ROTATE.set(A.how === 'reset' ? 0 : +A.how, true); return ROTATE.name(v); } });
  if (document.body) ROTATE.sync(); else document.addEventListener('DOMContentLoaded', () => ROTATE.sync());
}
