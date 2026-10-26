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
   ========================================================================== */
const WIRECOL = { follows: '#6b7c93', leads: '#2f7fbf', causes: '#c2571a', resolves: '#2e9e6b', supports: '#16928e', contradicts: '#d23c4a', comments: '#8a63c9', needs: '#b07d06', related: '#8a8f98' };
const wireColor = rel => { if (WIRECOL[rel]) return WIRECOL[rel]; if (rel && String(rel).startsWith('c:')) { let hsh = 0; for (const ch of rel) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${hsh % 360} 50% 46%)`; } return '#b03a7a'; };
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
  layout(list, R) {
    const ends = new Map(); // key box|cell|side → [{w, end, other}]
    const key = (id, cell, side) => id + '|' + (cell || '') + '|' + side;
    list.forEach(w => { const [sa, sb] = WIRES.sides(w.A, w.B, R, [w.x.from, w.x.to]); w.sa = sa; w.sb = sb;
      const ka = key(w.x.from, w.x.fromCell, sa), kb = key(w.x.to, w.x.toCell, sb);
      (ends.get(ka) || ends.set(ka, []).get(ka)).push({ w, end: 'a', o: w.B, side: sa, R: w.A });
      (ends.get(kb) || ends.set(kb, []).get(kb)).push({ w, end: 'b', o: w.A, side: sb, R: w.B }); });
    for (const L of ends.values()) {
      const side = L[0].side, vert = side === 'l' || side === 'r', R0 = L[0].R;
      L.sort((u, v) => vert ? (u.o.y + u.o.h / 2) - (v.o.y + v.o.h / 2) || (u.o.x - v.o.x) : (u.o.x + u.o.w / 2) - (v.o.x + v.o.w / 2) || (u.o.y - v.o.y));
      const n = L.length;
      L.forEach((e, i) => { let f;
        if (vert) f = n === 1 ? (R0.h <= 140 ? .5 : 28 / R0.h) : R0.h <= 140 ? (i + 1) / (n + 1) : (18 + i * Math.min(24, (R0.h - 36) / (n - 1))) / R0.h;
        else { const span = Math.min(R0.w * .8, 40 + n * 28); f = n === 1 ? .5 : ((R0.w - span) / 2 + span * (i + .5) / n) / R0.w; }
        e.w[e.end === 'a' ? 'fa' : 'fb'] = clamp(f, .04, .96); e.w[e.end === 'a' ? 'ia' : 'ib'] = i; e.w[e.end === 'a' ? 'na' : 'nb'] = n; });
    }
    list.forEach(w => WIRES.curve(w, R));
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
    const crossed = R.filter(r => r.id !== w.x.from && r.id !== w.x.to && WIRES.hits(pts, r));
    if (crossed.length && !bowK) { const keep = { p1, p2, c1, c2, crossed, pts }; WIRES.curve(w, R, 1); if (w.crossed.length > crossed.length) Object.assign(w, keep); else w.lifted = true; return; }
    Object.assign(w, { p1, p2, c1, c2, crossed, pts }); if (bowK) w.lifted = true;
  },
  d: w => `M${w.p1.x.toFixed(1)},${w.p1.y.toFixed(1)} C${w.c1.x.toFixed(1)},${w.c1.y.toFixed(1)} ${w.c2.x.toFixed(1)},${w.c2.y.toFixed(1)} ${w.p2.x.toFixed(1)},${w.p2.y.toFixed(1)}`,
  /** Label spot on the curve that doesn't sit on another label (or squarely on a component). */
  labelAt(w, placed, R, text) {
    const lw = 7 * text.length + 18, lh = 18;
    const free = p => !placed.some(q => Math.abs(q.x - p.x) < (q.w + lw) / 2 + 3 && Math.abs(q.y - p.y) < (lh + q.h) / 2 + 2);
    const off = p => !R.some(r => r.id !== w.x.from && r.id !== w.x.to && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
    const T = [.5, .42, .58, .34, .66, .27, .73, .2, .8];
    let best = null; for (const t of T) { const p = WIRES.bez(w.p1, w.c1, w.c2, w.p2, t); if (free(p) && off(p)) { best = p; break; } if (!best && free(p)) best = Object.assign({ over: true }, p); }
    best = best || WIRES.bez(w.p1, w.c1, w.c2, w.p2, .5); placed.push({ x: best.x, y: best.y, w: lw, h: lh }); return best;
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
/* a provisional wire (while dragging): the same look */
DocView.geom = function (a, b) {
  const w = { x: { from: a.id || '_a', to: b.id || '_b' }, A: a, B: b }; const [sa, sb] = WIRES.sides(a, b); Object.assign(w, { sa, sb, fa: .5, fb: .5 });
  if ((sa === 'r' || sa === 'l') && a.h > 140) w.fa = Math.min(.5, 28 / a.h); if ((sb === 'r' || sb === 'l') && b.h > 140) w.fb = Math.min(.5, 28 / b.h);
  WIRES.curve(w, []); const m = WIRES.bez(w.p1, w.c1, w.c2, w.p2, .5); return { d: WIRES.d(w), mx: m.x, my: m.y };
};
DocView.drawWires = function (temp) {
  if (!this.paper) return; const w = this.paper.world; if (!Object.prototype.hasOwnProperty.call(this, 'uid')) this.uid = uid('p');
  $$(':scope > .wl', w).forEach(x => x.remove());
  if (!$(':scope > .obsbox.drag', w)) PROTO.layoutObs(this);
  if (!this.svgOver || !this.svgOver.isConnected || this.svgOver.parentNode !== w) { this.svgOver = SV('svg', { class: 'wires wires-over' }); w.append(this.svgOver); }
  else if (this.svgOver !== w.lastElementChild) w.append(this.svgOver);
  const ws = DB.all('wires').filter(x => { const a = M.block(x.from), b = M.block(x.to); return a && b && a.docId === this.docId && b.docId === this.docId && $(`.box[data-id="${x.from}"]`, w) && $(`.box[data-id="${x.to}"]`, w); });
  const R = $$(':scope > .box.cmp', w).map(el => ({ id: el.dataset.id, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
  const list = []; for (const x of ws) { const A = this.partRect(x.from, x.fromCell), B = this.partRect(x.to, x.toCell); if (!A || !B) continue; list.push({ x, A, B }); }
  WIRES.layout(list, R);
  const cols = [...new Set(list.map(l => wireColor(l.x.rel)))], mid = c => 'wa' + cols.indexOf(c);
  let defs = '<defs>' + cols.map(c => `<marker id="${mid(c)}-${this.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('') +
    '<marker id="wa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mag)"/></marker></defs>';
  let html = defs, over = `<defs><filter id="wlift-${this.uid}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="2.4" flood-color="#000" flood-opacity=".28"/></filter>` + cols.map(c => `<marker id="${mid(c)}o-${this.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('') + '</defs>';
  const labels = [], placed = [], clips = [];
  list.forEach((L, k) => { const x = L.x, c = wireColor(x.rel), d = WIRES.d(L), sel = this.selWire === x.id, dir = x.directed;
    html += `<path class="w${dir ? '' : ' und'}${sel ? ' sel' : ''}${L.lifted ? ' arch' : ''}" data-w="${x.id}" style="stroke:${c}" d="${d}" ${dir ? `marker-end="url(#${mid(c)}-${this.uid})"` : ''}/><circle class="wend" data-w="${x.id}" cx="${L.p1.x.toFixed(1)}" cy="${L.p1.y.toFixed(1)}" r="2.6" fill="${c}"/>`;
    if (L.crossed.length) { const cid = `wc-${this.uid}-${k}`; clips.push(`<clipPath id="${cid}">${L.crossed.map(r => `<rect x="${r.x - 1}" y="${r.y - 1}" width="${r.w + 2}" height="${r.h + 2}" rx="7"/>`).join('')}</clipPath>`);
      over += `<g clip-path="url(#${cid})"><path class="w lift${dir ? '' : ' und'}${sel ? ' sel' : ''}" data-w="${x.id}" style="stroke:${c}" filter="url(#wlift-${this.uid})" d="${d}"/></g>`; }
    const lab = (REL[x.rel] || { label: x.rel }).label, p = WIRES.labelAt(L, placed, R, String(lab || ''));
    labels.push(h('button.wl.nopan' + (sel ? '.sel' : '') + (p.over ? '.lift' : ''), { 'data-w': x.id, style: { left: p.x + 'px', top: p.y + 'px', '--wc': c }, title: `${M.blockName(M.block(x.from))}${x.fromCell ? ' (one image)' : ''} ${(REL[x.rel] || REL.related).verb} ${M.blockName(M.block(x.to))}${x.toCell ? ' (one image)' : ''}`, on: { click: e => this.wireMenu(x, e) } }, lab)); });
  over = over.replace('</defs>', clips.join('') + '</defs>');
  html += PROTO.obsWires(this);
  if (temp) html += `<path class="w tmp" d="${temp}"/>`;
  this.svg.innerHTML = html; this.svgOver.innerHTML = over; w.append(...labels);
};
