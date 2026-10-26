/* ==========================================================================
   13zh · Shapes from a held pen. Draw, then hold the pen still (~½ s): the
   stroke becomes the shape it looks like — a straight line, an arrow,
   x/y axes (an L with arrowheads), a rectangle or square, a circle or
   ellipse, a triangle or polygon. Keep holding and drag: away from the
   shape grows it, towards it shrinks it, and going round turns it (a line
   pivots on its start).
   ========================================================================== */
const SHAPE = {
  len: P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; },
  /** Ramer–Douglas–Peucker. */
  rdp(P, eps) { if (P.length < 3) return P.slice(); const [a, b] = [P[0], P[P.length - 1]]; let dm = 0, k = 0;
    for (let i = 1; i < P.length - 1; i++) { const d = SHAPE.segDist(P[i], a, b); if (d > dm) { dm = d; k = i; } }
    if (dm <= eps) return [a, b]; const L = SHAPE.rdp(P.slice(0, k + 1), eps), R = SHAPE.rdp(P.slice(k), eps); return [...L.slice(0, -1), ...R]; },
  segDist(p, a, b) { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy; if (!L2) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2, 0, 1); return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); },
  angle: (a, b, c) => { const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.acos(clamp((u[0] * v[0] + u[1] * v[1]) / ((Math.hypot(...u) * Math.hypot(...v)) || 1), -1, 1)) * 180 / Math.PI; },
  /** Snap a direction to horizontal / vertical when it is within 12°. */
  snapDir(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.atan2(dy, dx), L = Math.hypot(dx, dy), s = Math.PI / 2, near = Math.round(ang / s) * s;
    return Math.abs(ang - near) < 12 * Math.PI / 180 ? [a[0] + Math.cos(near) * L, a[1] + Math.sin(near) * L] : b; },
  head(tip, from, size) { const dx = tip[0] - from[0], dy = tip[1] - from[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = size || clamp(L * .14, 8, 26);
    return [[tip[0] - ux * hs - uy * hs * .55, tip[1] - uy * hs + ux * hs * .55], tip, [tip[0] - ux * hs + uy * hs * .55, tip[1] - uy * hs - ux * hs * .55]]; },
  /** Polylines → one point list with break indices. */
  pack(lines, type, closed, pivot) { const p = [], br = []; lines.forEach((l, i) => { if (i) br.push(p.length); p.push(...l.map(q => [q[0], q[1]])); }); return { type, p, br, closed: !!closed, pivot }; },
  guess(raw) {
    const P = raw.map(q => [q[0], q[1]]), L = SHAPE.len(P); if (L < 12) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const diag = Math.hypot(x1 - x0, y1 - y0) || 1, a = P[0], z = P[P.length - 1], gap = Math.hypot(z[0] - a[0], z[1] - a[1]);
    const closed = gap < Math.max(.22 * diag, 10) && L > 1.6 * diag;
    if (!closed) {
      if (gap / L > .9) { const e = SHAPE.snapDir(a, z); return SHAPE.pack([[a, e]], 'line', false, a); }
      const S = SHAPE.rdp(P, .08 * diag);
      // an arrow: a long shaft, then a short hook at its tip
      if (S.length >= 3) { const shaft = Math.hypot(S[1][0] - S[0][0], S[1][1] - S[0][1]), rest = L - shaft, tip = S[1];
        if (shaft > .6 * L && rest < .45 * shaft && S.slice(2).every(q => Math.hypot(q[0] - tip[0], q[1] - tip[1]) < .45 * shaft)) {
          const e = SHAPE.snapDir(S[0], tip); return SHAPE.pack([[S[0], e], SHAPE.head(e, S[0])], 'arrow', false, S[0]); } }
      // axes: an L with a right-ish corner → two arrows from the corner
      if (S.length === 3) { const ang = SHAPE.angle(S[0], S[1], S[2]), l1 = Math.hypot(S[0][0] - S[1][0], S[0][1] - S[1][1]), l2 = Math.hypot(S[2][0] - S[1][0], S[2][1] - S[1][1]);
        if (ang > 60 && ang < 120 && Math.min(l1, l2) > .25 * Math.max(l1, l2)) { const o = S[1], A = SHAPE.snapDir(o, S[0]), B = SHAPE.snapDir(o, S[2]);
          return SHAPE.pack([[A, o, B], SHAPE.head(A, o), SHAPE.head(B, o)], 'axes', false, o); } }
      return null;
    }
    // closed: an ellipse if the points sit on one, else the polygon its corners make
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max(1, (x1 - x0) / 2), ry = Math.max(1, (y1 - y0) / 2);
    const rs = P.map(([x, y]) => Math.hypot((x - cx) / rx, (y - cy) / ry)), mean = rs.reduce((s, v) => s + v, 0) / rs.length, sd = Math.sqrt(rs.reduce((s, v) => s + (v - mean) ** 2, 0) / rs.length);
    let S = SHAPE.rdp([...P, P[0]], .09 * diag); if (S.length > 2 && Math.hypot(S[0][0] - S[S.length - 1][0], S[0][1] - S[S.length - 1][1]) < .15 * diag) S = S.slice(0, -1);
    // merge corners that are close together
    S = S.filter((q, i) => { const n = S[(i + 1) % S.length]; return Math.hypot(q[0] - n[0], q[1] - n[1]) > .12 * diag; });
    const k = S.length;
    const polyRes = k >= 3 && k <= 6 ? P.reduce((s, q) => s + Math.min(...S.map((v, i) => SHAPE.segDist(q, v, S[(i + 1) % k]))), 0) / P.length / (diag / 2) : 1;
    if ((sd < .1 && !(polyRes < sd * .8)) || k > 6 || k < 3) { const circ = Math.abs(rx - ry) < .12 * Math.max(rx, ry), RX = circ ? (rx + ry) / 2 : rx, RY = circ ? (rx + ry) / 2 : ry;
      const pts = Array.from({ length: 73 }, (_, i) => { const t = i / 72 * Math.PI * 2; return [cx + RX * Math.cos(t), cy + RY * Math.sin(t)]; });
      return SHAPE.pack([pts], circ ? 'circle' : 'ellipse', true, [cx, cy]); }
    if (k === 4) { const angs = S.map((q, i) => SHAPE.angle(S[(i + 3) % 4], q, S[(i + 1) % 4]));
      if (angs.every(v => v > 65 && v < 115)) { // a rectangle, along its first side
        const ang = Math.atan2(S[1][1] - S[0][1], S[1][0] - S[0][0]), sn = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2), th = Math.abs(ang - sn) < 12 * Math.PI / 180 ? sn : ang, c = Math.cos(th), s = Math.sin(th);
        const loc = S.map(([x, y]) => [(x - cx) * c + (y - cy) * s, -(x - cx) * s + (y - cy) * c]); let w = (Math.max(...loc.map(q => q[0])) - Math.min(...loc.map(q => q[0]))) / 2, hh = (Math.max(...loc.map(q => q[1])) - Math.min(...loc.map(q => q[1]))) / 2;
        const sq = Math.abs(w - hh) < .12 * Math.max(w, hh); if (sq) w = hh = (w + hh) / 2;
        const box = [[-w, -hh], [w, -hh], [w, hh], [-w, hh]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
        return SHAPE.pack([box], sq ? 'square' : 'rectangle', true, [cx, cy]); } }
    if (k >= 3) { const m = [S.reduce((s, q) => s + q[0], 0) / k, S.reduce((s, q) => s + q[1], 0) / k]; return SHAPE.pack([S], k === 3 ? 'triangle' : 'polygon', true, m); }
    return null;
  },
  /** Grow / shrink and turn around the pivot, following the pen from where the shape appeared. */
  transform(g, pen0, pen) {
    const o = g.pivot, v0 = [pen0[0] - o[0], pen0[1] - o[1]], v1 = [pen[0] - o[0], pen[1] - o[1]], L0 = Math.hypot(...v0);
    if (L0 < 4) { const d = [pen[0] - pen0[0], pen[1] - pen0[1]]; return g.p.map(q => [q[0] + d[0], q[1] + d[1]]); }
    const k = clamp(Math.hypot(...v1) / L0, .05, 40), th = Math.atan2(v1[1], v1[0]) - Math.atan2(v0[1], v0[0]), c = Math.cos(th) * k, s = Math.sin(th) * k;
    return g.p.map(q => { const x = q[0] - o[0], y = q[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; });
  },
};
