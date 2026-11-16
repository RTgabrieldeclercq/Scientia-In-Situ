/* ==========================================================================
   12b · Connections, untangled. Each relation type has its own colour.
   Every end gets its own spot along a side of the component, spread out and
   ordered by where the other end is, so wires neither stack nor cross at
   the ends. Curves leave the side square-on and flow. A wire that has to
   pass a component arches over it (screen-up over a row, sideways over a
   column; longer spans arch wider, so they nest) and where it crosses a
   component it is drawn above it, faint, with a soft shadow beneath — as
   if lifted — so what it covers stays readable. An end can be one image of
   an image panel (wire.fromCell / wire.toCell = that image's media id).
   V3.982 — routed (Gabe: "Component links should be the lowest path of
   resistance in terms of distance and navigating around void spaces in the
   note canvas, while making it readable and easy to follow."). A wire is the
   SHORTEST way from a side of one component to a side of the other that keeps
   clear of every other component: through the empty paper, bending only at
   the corners of what is in its way (A* over those corners), leaving and
   arriving square-on, with a cost for each bend and for leaving a side
   askew, so it is short and plain. Corners are rounded. The ends on one side
   are spread along it in the order their paths head off; wires rounding the
   same corner are drawn a little apart. A route is remembered until
   something near it moves (ROUTE.cache). Only a wire that can't get through
   (boxed in) is still the curve, drawn lifted over what it crosses.
   ========================================================================== */
const WIRECOL = { follows: '#6b7c93', leads: '#2f7fbf', causes: '#c2571a', resolves: '#2e9e6b', supports: '#16928e', contradicts: '#d23c4a', comments: '#8a63c9', needs: '#b07d06', related: '#8a8f98' };
const wireColor = rel => { if (WIRECOL[rel]) return WIRECOL[rel]; if (rel && String(rel).startsWith('c:')) { let hsh = 0; for (const ch of rel) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${hsh % 360} 50% 46%)`; } return '#b03a7a'; };
const ROUTE = {
  M: 16,        // clearance round every component (and the length of the square-on stub at each end)
  BEND: 14,     // a bend costs as much as this many pixels of wire
  DEV: 40,      // leaving (or arriving at) a side askew costs up to this much
  RAD: 22,      // rounded corners
  GAP: 9,       // wires rounding the same corner, this far apart
  BUDGET: 24,   // ms of routing per drawing; the rest is done just after (ROUTE.late)
  cache: new Map(), last: new Map(), late: false,
  rk: r => Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.w) + ',' + Math.round(r.h),
  /** The spot on a side a single end takes: the middle, or near the top of a tall component's side (its title). */
  mid: (R, s) => (s === 'r' || s === 'l') && R.h > 140 ? 28 / R.h : .5,
  inside: (x, y, r) => x > r.x0 + .5 && x < r.x1 - .5 && y > r.y0 + .5 && y < r.y1 - .5,
  /** Does the segment a→b cut into the rectangle r (shrunk by e)? Liang–Barsky. Running along an edge does not. */
  cuts(ax, ay, bx, by, r, e = .5) {
    const x0 = r.x0 + e, y0 = r.y0 + e, x1 = r.x1 - e, y1 = r.y1 - e; if (x1 <= x0 || y1 <= y0) return false;
    if (Math.max(ax, bx) <= x0 || Math.min(ax, bx) >= x1 || Math.max(ay, by) <= y0 || Math.min(ay, by) >= y1) return false;
    const dx = bx - ax, dy = by - ay, P = [-dx, dx, -dy, dy], Q = [ax - x0, x1 - ax, ay - y0, y1 - ay]; let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) { if (P[i] === 0) { if (Q[i] <= 0) return false; continue; } const t = Q[i] / P[i]; if (P[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    return t1 - t0 > 1e-6;
  },
  crosses: (P, r) => { const R = { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h }; for (let i = 1; i < P.length; i++) if (ROUTE.cuts(P[i - 1].x, P[i - 1].y, P[i].x, P[i].y, R, 3)) return true; return false; },
  /** The way from rect A to rect B round the rects O: { pts, sa, sb, fa, fb } or null. fx { sa, sb, fa, fb } fixes the sides and spots. */
  route(A, B, O, fx) {
    const M = ROUTE.M, inf = r => ({ x0: r.x - M, y0: r.y - M, x1: r.x + r.w + M, y1: r.y + r.h + M });
    const I = O.map(inf); I.push(inf(A), inf(B));
    const end = (R, s, f) => { const p = WIRES.at(R, s, f), n = WIRES.N[s], q = { x: p.x + n[0] * M, y: p.y + n[1] * M }; return { s, f, p, q, n, skip: I.filter(r => ROUTE.inside(q.x, q.y, r)) }; };
    const SIDES = ['r', 'l', 'b', 't'], S = (fx ? [fx.sa] : SIDES).map(s => end(A, s, fx ? fx.fa : ROUTE.mid(A, s))), T = (fx ? [fx.sb] : SIDES).map(s => end(B, s, fx ? fx.fb : ROUTE.mid(B, s)));
    // the corners of what is in the way (outside everything else), then the stubs at B
    const N = [];
    I.forEach((r, k) => { for (const [x, y, sx, sy] of [[r.x0, r.y0, -1, -1], [r.x1, r.y0, 1, -1], [r.x0, r.y1, -1, 1], [r.x1, r.y1, 1, 1]]) if (!I.some((u, j) => j !== k && ROUTE.inside(x, y, u))) N.push({ x, y, sx, sy }); });
    const nT = N.length; T.forEach(t => N.push({ x: t.q.x, y: t.q.y })); const V = N.length;
    const g = new Float64Array(V).fill(Infinity), from = new Int32Array(V).fill(-1), src = new Int8Array(V).fill(-1), done = new Uint8Array(V), heap = [];
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c) { const q = (c - 1) >> 1; if (heap[q][0] <= heap[c][0]) break; [heap[q], heap[c]] = [heap[c], heap[q]]; c = q; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hd = (x, y) => { let m = Infinity; for (const t of T) m = Math.min(m, Math.hypot(t.q.x - x, t.q.y - y)); return m; };
    const dev = (nx, ny, dx, dy) => { const L = Math.hypot(dx, dy); return L ? ROUTE.DEV * (1 - (nx * dx + ny * dy) / L) / 2 : 0; };
    const into = (k, dx, dy) => k >= nT ? dev(-T[k - nT].n[0], -T[k - nT].n[1], dx, dy) : ROUTE.BEND;
    const vis = (ax, ay, bx, by, s1, s2) => { for (const r of I) { if ((s1 && s1.includes(r)) || (s2 && s2.includes(r))) continue; if (ROUTE.cuts(ax, ay, bx, by, r)) return false; } return true; };
    S.forEach((s, si) => { for (let k = 0; k < V; k++) { const v = N[k], dx = v.x - s.q.x, dy = v.y - s.q.y, c = Math.hypot(dx, dy) + dev(s.n[0], s.n[1], dx, dy) + into(k, dx, dy); if (c >= g[k]) continue;
      if (!vis(s.q.x, s.q.y, v.x, v.y, s.skip, k >= nT ? T[k - nT].skip : null)) continue; g[k] = c; from[k] = -1; src[k] = si; push(c + (k >= nT ? 0 : hd(v.x, v.y)), k); } });
    while (heap.length) {
      const i = pop()[1]; if (done[i]) continue; done[i] = 1;
      if (i >= nT) { const t = T[i - nT], s = S[src[i]], mid = []; for (let j = from[i]; j >= 0; j = from[j]) mid.push({ x: N[j].x, y: N[j].y, sx: N[j].sx, sy: N[j].sy }); mid.reverse();
        return { sa: s.s, sb: t.s, fa: s.f, fb: t.f, pts: [s.p, s.q, ...mid, t.q, t.p] }; }
      const u = N[i];
      for (let k = 0; k < V; k++) { if (done[k]) continue; const v = N[k], dx = v.x - u.x, dy = v.y - u.y, c = g[i] + Math.hypot(dx, dy) + into(k, dx, dy); if (c >= g[k]) continue;
        if (!vis(u.x, u.y, v.x, v.y, null, k >= nT ? T[k - nT].skip : null)) continue; g[k] = c; from[k] = i; src[k] = src[i]; push(c + (k >= nT ? 0 : hd(v.x, v.y)), k); }
    }
    return null;
  },
  /** A wire's route, remembered: what is near it (a window round its ends) is part of the key, so it is routed again only when that changes. */
  plan(w, R, fx, t0) {
    const a = WIRES.fa(w), b = WIRES.fb(w), A = w.A, B = w.B, d = Math.hypot(A.x + A.w / 2 - B.x - B.w / 2, A.y + A.h / 2 - B.y - B.h / 2), pad = 140 + d * .3;
    const X0 = Math.min(A.x, B.x) - pad, Y0 = Math.min(A.y, B.y) - pad, X1 = Math.max(A.x + A.w, B.x + B.w) + pad, Y1 = Math.max(A.y + A.h, B.y + B.h) + pad;
    const holds = (r, E) => r.x <= E.x && r.y <= E.y && r.x + r.w >= E.x + E.w && r.y + r.h >= E.y + E.h;
    const all = R.filter(r => r.id !== a && r.id !== b && !holds(r, A) && !holds(r, B)), win = all.filter(r => r.x < X1 && r.x + r.w > X0 && r.y < Y1 && r.y + r.h > Y0);
    const fk = fx ? fx.sa + fx.sb + fx.fa.toFixed(3) + ',' + fx.fb.toFixed(3) : '', ka = ROUTE.rk(A), kb = ROUTE.rk(B), key = ka + '|' + kb + '|' + fk + '|' + win.map(ROUTE.rk).join(';'), id = ((w.x && w.x.id) || '') + '|' + fk;
    if (ROUTE.cache.has(key)) return ROUTE.cache.get(key);
    if (performance.now() - t0 > ROUTE.BUDGET) { const L = ROUTE.last.get(id); ROUTE.late = true; return L && L.ka === ka && L.kb === kb ? L.r : 'late'; }   // the last route while its ends stay put; routed again just after
    let r = ROUTE.route(A, B, win, fx); if (!r && win.length < all.length) r = ROUTE.route(A, B, all, fx);
    if (ROUTE.cache.size > 4000) ROUTE.cache.clear(); ROUTE.cache.set(key, r); if (r) { if (ROUTE.last.size > 4000) ROUTE.last.clear(); ROUTE.last.set(id, { ka, kb, r }); }
    return r;
  },
  /** The wire drawn: straight runs, rounded corners. */
  d(P) {
    const f = v => v.toFixed(1); let s = 'M' + f(P[0].x) + ',' + f(P[0].y);
    for (let i = 1; i < P.length - 1; i++) { const a = P[i - 1], b = P[i], c = P[i + 1], l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y); if (l1 < .5 || l2 < .5) continue;
      const r = Math.min(ROUTE.RAD, l1 / 2, l2 / 2); s += ' L' + f(b.x - (b.x - a.x) / l1 * r) + ',' + f(b.y - (b.y - a.y) / l1 * r) + ' Q' + f(b.x) + ',' + f(b.y) + ' ' + f(b.x + (c.x - b.x) / l2 * r) + ',' + f(b.y + (c.y - b.y) / l2 * r); }
    const z = P[P.length - 1]; return s + ' L' + f(z.x) + ',' + f(z.y);
  },
  /** The point t (0–1) of the way along. */
  at(P, t) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); let k = L * t;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); if (k <= l && l > 0) return { x: P[i - 1].x + (P[i].x - P[i - 1].x) * k / l, y: P[i - 1].y + (P[i].y - P[i - 1].y) * k / l }; k -= l; }
    return { x: P[P.length - 1].x, y: P[P.length - 1].y }; },
};
const WIRES = {
  bez: (p1, c1, c2, p2, t) => { const m = 1 - t; return { x: m ** 3 * p1.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t ** 3 * p2.x, y: m ** 3 * p1.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t ** 3 * p2.y }; },
  N: { r: [1, 0], l: [-1, 0], b: [0, 1], t: [0, -1] },
  /** Which sides the two ends leave from. */
  sides(A, B, R = [], ids = []) {
    const gx = B.x > A.x + A.w ? B.x - (A.x + A.w) : A.x > B.x + B.w ? A.x - (B.x + B.w) : -1, gy = B.y > A.y + A.h ? B.y - (A.y + A.h) : A.y > B.y + B.h ? A.y - (B.y + B.h) : -1;
    const others = R.filter(r => !ids.includes(r.id));
    if (gx >= 12 && (gy < 0 || gx >= gy * .8)) { // side by side: something in the corridor between them → arch over the top
      const x0 = Math.min(A.x + A.w, B.x + B.w), x1 = Math.max(A.x, B.x), cy0 = Math.min(A.y + A.h / 2, B.y + B.h / 2) - 10, cy1 = Math.max(A.y + A.h / 2, B.y + B.h / 2) + 10;
      if (others.some(r => r.x < x1 && r.x + r.w > x0 && r.y < cy1 && r.y + r.h > cy0)) return ['t', 't'];
      return B.x > A.x ? ['r', 'l'] : ['l', 'r']; }
    if (gy >= 12) { // one above the other: something in the column between them → loop out to the side
      const y0 = Math.min(A.y + A.h, B.y + B.h), y1 = Math.max(A.y, B.y), cx0 = Math.max(A.x, B.x) + 8, cx1 = Math.min(A.x + A.w, B.x + B.w) - 8;
      if (others.some(r => r.y < y1 && r.y + r.h > y0 && r.x < Math.max(cx1, cx0 + 1) && r.x + r.w > Math.min(cx0, cx1))) return ['r', 'r'];
      return B.y > A.y ? ['b', 't'] : ['t', 'b']; }
    return ['r', 'r'];
  },
  /** The spot on a side: frac 0..1 along it. */
  at(R, side, f) { return side === 'r' ? { x: R.x + R.w, y: R.y + R.h * f } : side === 'l' ? { x: R.x, y: R.y + R.h * f } : side === 'b' ? { x: R.x + R.w * f, y: R.y + R.h } : { x: R.x + R.w * f, y: R.y }; },
  hits(pts, R, inset = 3) { return pts.some(p => p.x > R.x + inset && p.x < R.x + R.w - inset && p.y > R.y + inset && p.y < R.y + R.h - inset); },
  /** Lay out all the wires of a pane: [{x, A, B, sa, sb, p1, p2, c1, c2, crossed[]}] */
  /** The ends a wire is drawn between: its own, or (w.f / w.t) the folded region that hides one (13v). */
  fa: w => w.f || w.x.from, fb: w => w.t || w.x.to,
  layout(list, R) {
    const t0 = performance.now(), mid = ROUTE.mid; ROUTE.late = false;
    // 1 · each wire's shortest way round, from the middle of whichever sides suit it (a wire whose end moved first)
    const moved = w => { const L = ROUTE.last.get(((w.x && w.x.id) || '') + '|'); return L && L.ka === ROUTE.rk(w.A) && L.kb === ROUTE.rk(w.B) ? 1 : 0; };
    list.slice().sort((u, v) => moved(u) - moved(v)).forEach(w => { const r = ROUTE.plan(w, R, null, t0); w.route = r && r !== 'late' ? r : null;
      if (w.route) { w.sa = r.sa; w.sb = r.sb; } else { const [sa, sb] = WIRES.sides(w.A, w.B, R, [WIRES.fa(w), WIRES.fb(w)]); w.sa = sa; w.sb = sb; } });
    // 2 · the ends on one side spread along it, in the order their paths head off, so they don't cross at the component
    const ends = new Map(), key = (id, cell, side) => id + '|' + (cell || '') + '|' + side;
    const toward = (w, end) => { const P = w.route && w.route.pts; if (P && P.length > 3) return end === 'a' ? P[2] : P[P.length - 3]; const o = end === 'a' ? w.B : w.A; return { x: o.x + o.w / 2, y: o.y + o.h / 2 }; };
    list.forEach(w => { const ka = key(WIRES.fa(w), w.f ? null : w.x.fromCell, w.sa), kb = key(WIRES.fb(w), w.t ? null : w.x.toCell, w.sb);
      (ends.get(ka) || ends.set(ka, []).get(ka)).push({ w, end: 'a', o: toward(w, 'a'), side: w.sa, R: w.A });
      (ends.get(kb) || ends.set(kb, []).get(kb)).push({ w, end: 'b', o: toward(w, 'b'), side: w.sb, R: w.B }); });
    for (const L of ends.values()) {
      const side = L[0].side, vert = side === 'l' || side === 'r', R0 = L[0].R, n = L.length;
      L.sort((u, v) => vert ? u.o.y - v.o.y || u.o.x - v.o.x : u.o.x - v.o.x || u.o.y - v.o.y);
      L.forEach((e, i) => { let f;
        if (vert) f = n === 1 ? mid(R0, side) : R0.h <= 140 ? (i + 1) / (n + 1) : (18 + i * Math.min(24, (R0.h - 36) / (n - 1))) / R0.h;
        else { const span = Math.min(R0.w * .8, 40 + n * 28); f = n === 1 ? .5 : ((R0.w - span) / 2 + span * (i + .5) / n) / R0.w; }
        e.w[e.end === 'a' ? 'fa' : 'fb'] = clamp(f, .04, .96); e.w[e.end === 'a' ? 'ia' : 'ib'] = i; e.w[e.end === 'a' ? 'na' : 'nb'] = n; });
    }
    // 3 · routed again from its own spot where a side is shared
    list.forEach(w => { if (!w.route || (Math.abs(w.fa - w.route.fa) < 1e-3 && Math.abs(w.fb - w.route.fb) < 1e-3)) return;
      const r = ROUTE.plan(w, R, { sa: w.sa, sb: w.sb, fa: w.fa, fb: w.fb }, t0); if (r && r !== 'late') w.route = r; });
    // 4 · its points: the ends at their spots (when the route above isn't in yet), and apart from other wires at a shared corner
    const used = new Map();
    list.forEach(w => { if (!w.route) return; const P = w.route.pts.map(p => Object.assign({}, p)), last = P.length - 1;
      if (Math.abs(w.fa - w.route.fa) > 1e-3) { const p = WIRES.at(w.A, w.sa, w.fa), n = WIRES.N[w.sa]; P[0] = p; P[1] = { x: p.x + n[0] * ROUTE.M, y: p.y + n[1] * ROUTE.M }; }
      if (Math.abs(w.fb - w.route.fb) > 1e-3) { const p = WIRES.at(w.B, w.sb, w.fb), n = WIRES.N[w.sb]; P[last] = p; P[last - 1] = { x: p.x + n[0] * ROUTE.M, y: p.y + n[1] * ROUTE.M }; }
      for (let i = 2; i < last - 1; i++) { const p = P[i]; if (!p.sx) continue; const k = Math.round(p.x) + ',' + Math.round(p.y), m = used.get(k) || 0; used.set(k, m + 1); if (m) { p.x += p.sx * ROUTE.GAP * m; p.y += p.sy * ROUTE.GAP * m; } }
      w.poly = P; });
    // 5 · drawn; whatever a route still crosses (boxed in) is drawn lifted over it; no route at all: the curve
    list.forEach(w => { if (w.poly) { const a = WIRES.fa(w), b = WIRES.fb(w); w.p1 = w.poly[0]; w.p2 = w.poly[w.poly.length - 1]; w.dd = ROUTE.d(w.poly); w.crossed = R.filter(r => r.id !== a && r.id !== b && ROUTE.crosses(w.poly, r)); w.lifted = false; }
      else { w.dd = null; WIRES.curve(w, R); } });
    return list;
  },
  curve(w, R, bowK = 0) {
    const p1 = WIRES.at(w.A, w.sa, w.fa), p2 = WIRES.at(w.B, w.sb, w.fb), n1 = WIRES.N[w.sa], n2 = WIRES.N[w.sb], dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    // a loop out to one side (same side at both ends): longer spans loop wider, so loops nest instead of crossing
    let off = w.sa === w.sb ? 34 + Math.abs(w.sa === 'r' || w.sa === 'l' ? p2.y - p1.y : p2.x - p1.x) * .2 : clamp(dist * .42, 34, 240);
    if (w.sa === w.sb) { const far = w.sa === 'r' ? Math.max(w.A.x + w.A.w, w.B.x + w.B.w) - (p1.x + p2.x) / 2 : w.sa === 'l' ? (p1.x + p2.x) / 2 - Math.min(w.A.x, w.B.x) : w.sa === 't' ? (p1.y + p2.y) / 2 - Math.min(w.A.y, w.B.y) : Math.max(w.A.y + w.A.h, w.B.y + w.B.h) - (p1.y + p2.y) / 2; off += Math.max(0, far); }
    off += ((w.ia || 0) + (w.ib || 0)) * 3;
    let c1 = { x: p1.x + n1[0] * off, y: p1.y + n1[1] * off }, c2 = { x: p2.x + n2[0] * off, y: p2.y + n2[1] * off };
    if (bowK) { // arch over what is in the way: a column → sideways (right), a row → up
      const vertical = w.sa === 'b' || w.sa === 't', bow = (22 + .2 * dist) * bowK;
      if (vertical) { c1.x += bow; c2.x += bow; } else { c1.y -= bow; c2.y -= bow; }
    }
    const pts = []; for (let i = 1; i < 24; i++) pts.push(WIRES.bez(p1, c1, c2, p2, i / 24));
    const crossed = R.filter(r => r.id !== WIRES.fa(w) && r.id !== WIRES.fb(w) && WIRES.hits(pts, r));
    if (crossed.length && !bowK) { const keep = { p1, p2, c1, c2, crossed, pts }; WIRES.curve(w, R, 1); if (w.crossed.length > crossed.length) Object.assign(w, keep); else w.lifted = true; return; }
    Object.assign(w, { p1, p2, c1, c2, crossed, pts }); if (bowK) w.lifted = true;
  },
  /** The point t of the way along a wire: its route, or its curve. */
  pt: (w, t) => w.poly ? ROUTE.at(w.poly, t) : WIRES.bez(w.p1, w.c1, w.c2, w.p2, t),
  d: w => w.dd || `M${w.p1.x.toFixed(1)},${w.p1.y.toFixed(1)} C${w.c1.x.toFixed(1)},${w.c1.y.toFixed(1)} ${w.c2.x.toFixed(1)},${w.c2.y.toFixed(1)} ${w.p2.x.toFixed(1)},${w.p2.y.toFixed(1)}`,
  /** Label spot on the curve that doesn't sit on another label (or squarely on a component). */
  labelAt(w, placed, R, text) {
    const lw = 7 * text.length + 18, lh = 18;
    const free = p => !placed.some(q => Math.abs(q.x - p.x) < (q.w + lw) / 2 + 3 && Math.abs(q.y - p.y) < (lh + q.h) / 2 + 2);
    const off = p => !R.some(r => r.id !== WIRES.fa(w) && r.id !== WIRES.fb(w) && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
    const T = [.5, .42, .58, .34, .66, .27, .73, .2, .8];
    let best = null; for (const t of T) { const p = WIRES.pt(w, t); if (free(p) && off(p)) { best = p; break; } if (!best && free(p)) best = Object.assign({ over: true }, p); }
    best = best || WIRES.pt(w, .5); placed.push({ x: best.x, y: best.y, w: lw, h: lh }); return best;
  },
};

/* the rectangle of a wire's end: the component, or one image in its panel */
DocView.partRect = function (id, cell) {
  const R = this.rectOf(id); if (!R || !cell) return R;
  const b = typeof FIGOF === 'function' ? FIGOF(M.block(id)) : M.block(id), box = $(`.box[data-id="${id}"]`, this.paper.world); if (!b || !b.fig || !box) return R;
  const i = (b.fig.cells || []).findIndex(c => c && c.media === cell); const el = i >= 0 && $(`.fg-cell[data-i="${i}"]`, box); if (!el || !el.offsetWidth) return R;
  const z = this.paper.view.z || 1, wr = this.paper.world.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: (r.left - wr.left) / z, y: (r.top - wr.top) / z, w: r.width / z, h: r.height / z };
};
/* V3.982 — what wires go round: every box on the paper (the note's head and its Synthesis too), not ink glued on an image */
DocView.obstacles = function () { return $$(':scope > .box', this.paper.world).filter(el => el.offsetWidth && !el.classList.contains('on-img')).map(el => ({ id: el.dataset.id, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })); };
/* a provisional wire (while dragging, a timer's tag to a region): routed the same way */
DocView.geom = function (a, b) {
  try { if (this && this.paper && this.paper.world) { const r = ROUTE.plan({ x: { id: '', from: a.id || '_a', to: b.id || '_b' }, A: a, B: b }, DocView.obstacles.call(this), null, performance.now());
    if (r && r !== 'late') { const m = ROUTE.at(r.pts, .5); return { d: ROUTE.d(r.pts), mx: m.x, my: m.y }; } } } catch (e) { console.warn('[route]', e); }
  const w = { x: { from: a.id || '_a', to: b.id || '_b' }, A: a, B: b }; const [sa, sb] = WIRES.sides(a, b); Object.assign(w, { sa, sb, fa: .5, fb: .5 });
  if ((sa === 'r' || sa === 'l') && a.h > 140) w.fa = Math.min(.5, 28 / a.h); if ((sb === 'r' || sb === 'l') && b.h > 140) w.fb = Math.min(.5, 28 / b.h);
  WIRES.curve(w, []); const m = WIRES.bez(w.p1, w.c1, w.c2, w.p2, .5); return { d: WIRES.d(w), mx: m.x, my: m.y };
};
DocView.drawWires = function (temp) {
  if (!this.paper) return; const w = this.paper.world; if (!Object.prototype.hasOwnProperty.call(this, 'uid')) this.uid = uid('p');
  $$(':scope > .wl', w).forEach(x => x.remove());
  // V3.982 — drawn again, the wires take their look at once: a wire dimmed after it is drawn (a paper's wires to the quotes of the pages it
  // isn't showing, 13zza) faded in from full strength each time, so a lit review flickered on every click, edit or drag. The fade stays
  // for a real change (a paper scrolled to another page): pw-now comes off two frames later, once the look is drawn.
  w.classList.add('pw-now'); const tok = this._pwTok = (this._pwTok || 0) + 1; requestAnimationFrame(() => requestAnimationFrame(() => { if (this._pwTok === tok) w.classList.remove('pw-now'); }));
  if (!$(':scope > .obsbox.drag', w)) PROTO.layoutObs(this);
  if (!this.svgOver || !this.svgOver.isConnected || this.svgOver.parentNode !== w) { this.svgOver = SV('svg', { class: 'wires wires-over' }); w.append(this.svgOver); }
  else if (this.svgOver !== w.lastElementChild) w.append(this.svgOver);
  // an end is a component or a region (13v); one inside a folded region is drawn to that region
  const ws = DB.all('wires').filter(x => { const a = M.end(x.from), b = M.end(x.to); return a && b && a.docId === this.docId && b.docId === this.docId; });
  const R = DocView.obstacles.call(this);
  const list = []; for (const x of ws) { const f = REGION.shown(this, x.from), t = REGION.shown(this, x.to); if (f === t) continue;
    const A = this.partRect(f, f === x.from ? x.fromCell : null), B = this.partRect(t, t === x.to ? x.toCell : null); if (!A || !B) continue;
    list.push({ x, A, B, f: f === x.from ? null : f, t: t === x.to ? null : t }); }
  WIRES.layout(list, R);
  if (ROUTE.late) { clearTimeout(this._wLate); this._wLate = setTimeout(() => { if (this.paper) this.drawWires(); }, 60); }   // the routes not done in this drawing's time
  const cols = [...new Set(list.map(l => wireColor(l.x.rel)))], mid = c => 'wa' + cols.indexOf(c);
  let defs = '<defs>' + cols.map(c => `<marker id="${mid(c)}-${this.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('') +
    '<marker id="wa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mag)"/></marker></defs>';
  let html = defs, over = `<defs><filter id="wlift-${this.uid}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="2.4" flood-color="#000" flood-opacity=".28"/></filter>` + cols.map(c => `<marker id="${mid(c)}o-${this.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('') + '</defs>';
  const labels = [], placed = [], clips = [];
  list.forEach((L, k) => { const x = L.x, c = wireColor(x.rel), d = WIRES.d(L), sel = this.selWire === x.id, dir = x.directed;
    html += `<path class="w${dir ? '' : ' und'}${sel ? ' sel' : ''}${L.lifted ? ' arch' : ''}" data-w="${x.id}" style="stroke:${c}" d="${d}" ${dir ? `marker-end="url(#${mid(c)}-${this.uid})"` : ''}/><circle class="wend" data-w="${x.id}" cx="${L.p1.x.toFixed(1)}" cy="${L.p1.y.toFixed(1)}" r="2.6" fill="${c}"/>`;
    if (L.crossed.length) { const cid = `wc-${this.uid}-${k}`; clips.push(`<clipPath id="${cid}">${L.crossed.map(r => `<rect x="${r.x - 1}" y="${r.y - 1}" width="${r.w + 2}" height="${r.h + 2}" rx="7"/>`).join('')}</clipPath>`);
      over += `<g clip-path="url(#${cid})"><path class="w lift${dir ? '' : ' und'}${sel ? ' sel' : ''}" data-w="${x.id}" style="stroke:${c}" filter="url(#wlift-${this.uid})" d="${d}"/></g>`; }
    const lab = (REL[x.rel] || { label: x.rel }).label; if (lab === '') return;   // V3.955 — a bare arrow (the story's `next`) has no label
    const p = WIRES.labelAt(L, placed, R, String(lab || ''));
    labels.push(h('button.wl.nopan' + (sel ? '.sel' : '') + (p.over ? '.lift' : ''), { 'data-w': x.id, style: { left: p.x + 'px', top: p.y + 'px', '--wc': c }, title: `${M.endName(x.from)}${x.fromCell ? ' (one image)' : ''} ${(REL[x.rel] || REL.related).verb} ${M.endName(x.to)}${x.toCell ? ' (one image)' : ''}`, on: { click: e => this.wireMenu(x, e) } }, lab)); });
  over = over.replace('</defs>', clips.join('') + '</defs>');
  html += PROTO.obsWires(this);
  if (temp) html += `<path class="w tmp" d="${temp}"/>`;
  this.svg.innerHTML = html; this.svgOver.innerHTML = over; w.append(...labels);
};
