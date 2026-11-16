/* ==========================================================================
   14d · Nests in 3D (V3.966, Gabe's choice of the three shapes: "Nested,
   in 3D, with terms and papers orbiting the nest they belong to most"):
   an outer sphere; groups packed inside it (the projects); each note a
   sphere packed inside its group, holding its components (and structures)
   as dots. A term, a paper or a person orbits the nest it is most tied to
   — the note that holds most of its mentions, else the group, else the
   outer sphere — on a tilted ring, so the whole map is compact from afar
   and a nest opens up when you fly into it.
   Flying: click a nest to fly into it (one level at a time); click the
   space around it to fly back out; the crumbs at the top are the levels.
   Drag orbits the camera, the wheel comes closer, double-click opens.
   Hover shows a thing's threads (what uses a term; a component's terms,
   papers, wires).
   V3.969 (Gabe: "The Atlas reshaping should apply to terms and temporary
   terms"): a map is made anywhere with NEST.make, each with its own
   camera, pick and side panel. The Atlas page is one (the notebook, its
   projects; the bar, chips, search, action chips, /collection and the side
   panel are 14b's). A term's lens (16) and a term in a note (14c) are
   others: there the outer sphere is the term itself, the groups are the
   themes (the projects, for the whole notebook), and the connections
   between the components in view are drawn.
   ========================================================================== */
const NEST = {
  PF: 1700,                         // perspective: pixels from the eye to the screen
  /** A map. o (all optional):
   *   center     the id of the node the map is about (a term): the outer sphere is it, so it is neither a dot nor a satellite
   *   rootLabel  the outer sphere's name ('The notebook'); group(doc) → { id, name, color, none }: the level between it and the
   *              notes (GROUP.project by default); groupWord: what a group is called at the foot ('project')
   *   sel        what is picked, { focus, path, time } (the Atlas page passes ATLAS.st); lit(): the words lit (a Set or null)
   *   links      every connection between the dots in view is drawn (the term maps), not only those inside the open note
   *   pick(I, id)     a dot, a satellite or a note was picked (null: nothing); default: focusOn
   *   panel(I)        the side panel again;  open(I, hit) a double-click;  moved(I, nest) the camera went to another nest
   *   say(I)          the count at the foot */
  make(o) { o = o || {}; return { o, sel: o.sel || { focus: null, path: [], time: 1 }, cam: NEST.cam0(), nest: null, hover: null, lit: null, L: null, G: null, host: null, cv: null, c: null, W: 0, H: 0, dpr: 1, inset: 0, crumbsEl: null, nEl: null, fly: 0 }; },
  cam0: () => ({ t: { x: 0, y: 0, z: 0 }, zoom: 1, yaw: -.55, pitch: .42 }),
  GROUP: {
    project: d => { const p = d.projectId && M.project(d.projectId); return p ? { id: p.id, name: p.name, color: p.color || null } : { id: 'p:none', name: 'General', none: true }; },
    theme: d => { const t = d.themeId && M.theme(d.themeId); return t ? { id: t.id, name: t.name, color: t.color || null } : { id: 'pw:' + (d.projectId || 'none'), name: d.projectId ? 'Project-wide' : 'General', none: true }; },
  },
  /** An ATLAS-shaped graph from nodes and edges ({ a, b, kind, rel, … }); edges to a missing node are left out. */
  graph(nodes, edges) {
    const byId = new Map(nodes.map(v => [v.id, v])), E = edges.filter(e => byId.has(e.a) && byId.has(e.b));
    nodes.forEach(v => { v.deg = 0; }); E.forEach(e => { byId.get(e.a).deg++; byId.get(e.b).deg++; });
    const adj = new Map(nodes.map(v => [v.id, []])); E.forEach(e => { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); });
    return { nodes, edges: E, byId, adj, t0: 0, t1: 0 };
  },
  /** The shortest chain of edges between two nodes (ids), or []. */
  path(G, a, b) { const prev = new Map([[a, null]]), q = [a]; while (q.length) { const x = q.shift(); if (x === b) break; (G.adj.get(x) || []).forEach(y => { if (!prev.has(y)) { prev.set(y, x); q.push(y); } }); } if (!prev.has(b)) return []; const out = []; for (let x = b; x != null; x = prev.get(x)) out.unshift(x); return out; },
  /* ---------- the nests from the graph ---------- */
  build(I) {
    const G = I.G, o = I.o, C = o.center, group = o.group || NEST.GROUP.project, pal = NEST.pal(), nests = [], byId = new Map();
    const mk = (id, kind, label, r, extra) => { const n = Object.assign({ id, kind, label, r, kids: [], x: 0, y: 0, z: 0, sats: [], v: G.byId.get(id) || null }, extra || {}); byId.set(id, n); nests.push(n); return n; };
    // a group for each note on the map (the note node, or a component's note), the outer sphere around them
    const docOf = v => v.kind === 'note' ? v.id : v.doc || (v.kind === 'cmp' ? (M.block(v.id) || {}).docId : v.kind === 'item' ? (M.item(v.id) || {}).originDocId : null);
    const notes = new Map(); G.nodes.forEach(v => { if (v.id === C) return; const did = docOf(v); if (!did || !M.doc(did)) return; if (!notes.has(did)) notes.set(did, []); if (v.kind !== 'note') notes.get(did).push(v); });
    const groups = new Map();
    notes.forEach((kids, did) => { const d = M.doc(did), g = group(d); if (!groups.has(g.id)) groups.set(g.id, Object.assign({ notes: [] }, g));
      const dots = kids.map(v => ({ id: v.id, kind: v.kind, label: v.label, r: v.kind === 'item' ? 4.2 : v.via ? 4.4 : 6, v, color: v.color || pal[v.kind], x: 0, y: 0, z: 0 }));
      const rr = dots.length ? NEST.pack(dots, 3) + 12 : 20;
      const n = mk(did, 'note', d.title || 'Untitled', Math.max(22, rr), { kids: dots, doc: d, t: d.created }); dots.forEach(k => k.nest = n); groups.get(g.id).notes.push(n); });
    const gnests = [...groups.values()].map((g, i) => { const r = NEST.pack(g.notes, 14) + 30; const n = mk(g.id, 'project', g.name, r, { kids: g.notes, proj: g, pi: i }); g.notes.forEach(k => k.parent = n); return n; });
    const R = gnests.length ? NEST.pack(gnests, 26) + 40 : 120;
    const root = mk('root', 'root', o.rootLabel || 'The notebook', R, { kids: gnests, center: !!C }); root.v = null; gnests.forEach(k => k.parent = root);
    // absolute places, outer to inner
    const walk = (n, ox, oy, oz) => { n.ax = ox + n.x; n.ay = oy + n.y; n.az = oz + n.z; (n.kids || []).forEach(k => walk(k, n.ax, n.ay, n.az)); }; walk(root, 0, 0, 0);   // the dots too (no kids of their own)
    // satellites: each term, paper or person orbits the nest it is most tied to
    const sats = G.nodes.filter(v => v.id !== C && (v.kind === 'term' || v.kind === 'paper' || v.kind === 'person'));
    const perNest = new Map(); sats.forEach(v => perNest.set(v.id, new Map()));
    G.edges.forEach(e => { const a = G.byId.get(e.a), b = G.byId.get(e.b); if (!a || !b) return; const s = perNest.has(a.id) ? a : perNest.has(b.id) ? b : null, x = s === a ? b : a; if (!s || !x) return; const did = docOf(x); if (!did || !byId.has(did)) return; const m = perNest.get(s.id); m.set(did, (m.get(did) || 0) + 1); });
    sats.forEach(v => { const m = perNest.get(v.id), total = [...m.values()].reduce((s, n) => s + n, 0); let home = root;
      if (total) { const [did, n] = [...m.entries()].sort((x, y) => y[1] - x[1])[0]; if (n * 2 >= total) home = byId.get(did);
        else { const pm = new Map(); m.forEach((n2, d2) => { const pn = byId.get(d2).parent; pm.set(pn.id, (pm.get(pn.id) || 0) + n2); }); const [pid, pn] = [...pm.entries()].sort((x, y) => y[1] - x[1])[0]; home = pn * 2 >= total ? byId.get(pid) : root; } }
      home.sats.push({ id: v.id, kind: v.kind, label: v.label, v, r: 3.6 + Math.sqrt(v.deg || 1) * .7, color: pal[v.kind], home, uses: m }); });
    nests.forEach(n => NEST.orbit(n));
    I.L = { root, nests, byId, sats: nests.flatMap(n => n.sats), dots: nests.flatMap(n => n.kids.filter(k => !k.kids)) };
    I.L.satById = new Map(I.L.sats.map(s => [s.id, s])); I.L.dotById = new Map(I.L.dots.map(d => [d.id, d]));
  },
  /** Greedy packing in three dimensions: the biggest first, each as near the middle as the others allow. Returns the radius that holds them. */
  pack(kids, gap) {
    const placed = [], dirs = NEST.DIRS; kids.sort((a, b) => b.r - a.r).forEach(k => { if (!placed.length) { k.x = k.y = k.z = 0; placed.push(k); return; } let best = null, bd = Infinity;
      placed.forEach(p => { for (const d of dirs) { const dist = p.r + k.r + gap, x = p.x + d[0] * dist, y = p.y + d[1] * dist, z = p.z + d[2] * dist; if (placed.some(q => Math.hypot(q.x - x, q.y - y, q.z - z) < q.r + k.r + gap - .5)) continue; const dd = x * x + y * y + z * z; if (dd < bd) { bd = dd; best = [x, y, z]; } } });
      if (!best) best = [(placed.length + 1) * (k.r * 2 + gap), 0, 0]; k.x = best[0]; k.y = best[1]; k.z = best[2]; placed.push(k); });
    const cx = placed.reduce((s, p) => s + p.x, 0) / placed.length, cy = placed.reduce((s, p) => s + p.y, 0) / placed.length, cz = placed.reduce((s, p) => s + p.z, 0) / placed.length;
    placed.forEach(p => { p.x -= cx; p.y -= cy; p.z -= cz; }); return Math.max(...placed.map(p => Math.hypot(p.x, p.y, p.z) + p.r), 1);
  },
  DIRS: (() => { const out = [], n = 34, g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), a = g * i; out.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return out; })(),
  /** A nest's satellites on a tilted ring just outside it, each at its own angle; the ring's tilt comes from the nest's id, so they differ. */
  orbit(n) { const S = n.sats; if (!S.length) return; let h = 0; for (const ch of n.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const tilt = .35 + (h % 100) / 100 * .5, spin = (h % 360) / 360 * Math.PI * 2, R = n.r + 14 + Math.min(40, S.length * 1.2);
    n.ring = { R, tilt, spin }; S.sort((a, b) => a.label.localeCompare(b.label)).forEach((s, i) => { const a = i / S.length * Math.PI * 2 + spin * .3; const p = NEST.onRing(n, a); s.ax = p.x; s.ay = p.y; s.az = p.z; s.a = a; }); },
  onRing(n, a) { const { R, tilt, spin } = n.ring, x = Math.cos(a) * R, z = Math.sin(a) * R; const y = z * Math.sin(tilt), z2 = z * Math.cos(tilt); const xr = x * Math.cos(spin) - z2 * Math.sin(spin), zr = x * Math.sin(spin) + z2 * Math.cos(spin); return { x: n.ax + xr, y: n.ay + y, z: n.az + zr }; },
  /* ---------- the camera ---------- */
  /** World → screen: rotated about the target by yaw and pitch, then perspective. k is the size factor at that depth. */
  P(I, x, y, z) { const C = I.cam, cy = Math.cos(C.yaw), sy = Math.sin(C.yaw), cp = Math.cos(C.pitch), sp = Math.sin(C.pitch); x -= C.t.x; y -= C.t.y; z -= C.t.z;
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const X = x1 * C.zoom, Y = y2 * C.zoom, Z = Math.min(z2 * C.zoom, NEST.PF * .85), k = NEST.PF / (NEST.PF - Z); return { x: I.W / 2 + X * k, y: I.H / 2 + Y * k, k, z: Z }; },
  fitZoom: (I, n) => Math.min(I.W, I.H) * .4 / Math.max(1, n.r),
  flyTo(I, n, ms) { const C = I.cam, from = { x: C.t.x, y: C.t.y, z: C.t.z, zoom: C.zoom }, to = { x: n.ax, y: n.ay, z: n.az, zoom: NEST.fitZoom(I, n) }, was = I.nest; I.nest = n; NEST.crumbs(I);
    if (was !== n && I.o.moved) I.o.moved(I, n);
    if (!ms || matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(C.t, { x: to.x, y: to.y, z: to.z }); C.zoom = to.zoom; return NEST.draw(I); }
    const t0 = performance.now(), my = ++I.fly; const step = now => { if (my !== I.fly || !I.cv || !I.cv.isConnected) return; const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3); C.t.x = from.x + (to.x - from.x) * e; C.t.y = from.y + (to.y - from.y) * e; C.t.z = from.z + (to.z - from.z) * e; C.zoom = from.zoom * Math.pow(to.zoom / from.zoom, e); NEST.draw(I); if (u < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); },
  /** One level at a time: the nest to fly to for a click on x — its ancestor just inside the focus, or the sibling of the focus it sits in. */
  step(I, x) { const f = I.nest, chain = []; for (let n = x; n; n = n.parent) chain.unshift(n); const i = chain.indexOf(f); if (i >= 0) return chain[i + 1] || null; const depth = f === I.L.root ? 0 : f.kind === 'project' ? 1 : 2; return chain[depth] || chain[chain.length - 1]; },
  out(I) { const f = I.nest; if (f && f.parent) NEST.flyTo(I, f.parent, 450); },
  /** Where a map opens: the nest asked for (kept from before), else in from the outer sphere while there is only one way in. */
  start(I, id) { const L = I.L; let n = id && L.byId.get(id); if (n) return n; n = L.root; while (n.kind !== 'note' && n.kids.length === 1) n = n.kids[0]; return n; },
  /** I.G on the map: the nests built, the camera where it was (keep: a nest id) or where the map opens. */
  show(I, keep, ms) { NEST.build(I); if (I.sel.focus && !I.G.byId.has(I.sel.focus)) I.sel.focus = null; NEST.flyTo(I, NEST.start(I, keep), ms || 0); },
  /* ---------- drawing ---------- */
  pal() { const dark = NEST.dark(); return dark ? { note: '#7FB3E8', cmp: '#F2CF5B', item: '#F28BB0', term: '#9CD37A', paper: '#F4A261', person: '#B8A3FF' } : { note: '#3F7FD0', cmp: '#C99400', item: '#D64F8E', term: '#4E8F2F', paper: '#D9702E', person: '#7A5AD8' }; },
  dark: () => document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor !== 'rgb(255, 255, 255)' && (() => { const m = /\d+/g.exec(getComputedStyle(document.body).backgroundColor); return m && +m[0] < 128; })(),
  ink: () => NEST.dark() ? '236,230,218' : '36,33,28', paper: () => NEST.dark() ? '28,25,22' : '236,232,223',
  PCOL: ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#eda100', '#e87ba4', '#0d9488', '#93285c'],
  tint(n) { const pal = NEST.pal(); if (n.kind === 'project') return n.proj.color || (n.proj.none ? (NEST.dark() ? '#A39B8E' : '#8a8f98') : NEST.PCOL[(n.pi || 0) % NEST.PCOL.length]); if (n.kind === 'note') return (n.parent && NEST.tint(n.parent)) || pal.note; if (n.kind === 'root') return pal.term; return pal.note; },
  label(c, t, x, y, o) { const size = o.size || 12, max = o.max || 44, txt = t.length > max ? t.slice(0, max - 1) + '…' : t; c.font = (o.weight || 500) + ' ' + size + 'px ' + getComputedStyle(document.body).getPropertyValue('--f-d'); c.textBaseline = 'middle'; c.textAlign = o.align || 'left';
    const w = c.measureText(txt).width, bx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, box = { x: bx - 4, y: y - size * .72, w: w + 8, h: size * 1.44 };
    if (o.avoid) { if (o.avoid.some(b => b.x < box.x + box.w && b.x + b.w > box.x && b.y < box.y + box.h && b.y + b.h > box.y)) return false; o.avoid.push(box); }
    c.fillStyle = 'rgba(' + NEST.paper() + ',' + (o.halo == null ? .82 : o.halo) + ')'; c.beginPath(); c.roundRect(box.x, box.y, box.w, box.h, 5); c.fill(); c.fillStyle = o.color || 'rgba(' + NEST.ink() + ',' + (o.alpha == null ? 1 : o.alpha) + ')'; c.fillText(txt, x, y); return true; },
  size(I) { const cv = I.cv, host = I.host; if (!cv || !host) return; const r = host.getBoundingClientRect(); I.W = Math.max(100, Math.round(r.width)); I.H = Math.max(100, Math.round(r.height) - I.inset); I.dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(I.W * I.dpr); cv.height = Math.round(I.H * I.dpr); cv.style.height = I.H + 'px'; },
  /** What a hovered or picked thing is tied to: the dots and satellites to light, and the threads to draw (none to the map's centre: everything is). */
  hot(I) { const G = I.G, id = I.hover || I.sel.focus; if (!id || !G) return null; const near = new Set([id]), threads = []; (G.adj.get(id) || []).forEach(x => { if (x === I.o.center) return; near.add(x); threads.push([id, x]); }); return { id, near, threads }; },
  draw(I) {
    const L = I.L, c = I.c, G = I.G; if (!L || !c || !G || !I.cv.isConnected) return; const W = I.W, H = I.H, dark = NEST.dark(), ink = NEST.ink(), pal = NEST.pal(), f = I.nest, S = I.sel, lit = I.o.lit ? I.o.lit() : I.lit, hot = NEST.hot(I), dim = !!(hot || lit), zoom = I.cam.zoom;
    c.setTransform(I.dpr, 0, 0, I.dpr, 0, 0); c.clearRect(0, 0, W, H);
    const tcut = G.t1 ? G.t0 + (G.t1 - G.t0) * (S.time == null ? 1 : S.time) : Infinity, vis = v => !v || !v.t || +new Date(v.t) <= tcut + 1;
    const on = id => !dim || (hot && hot.near.has(id)) || (lit && lit.has(id));
    const pos = o => NEST.P(I, o.ax, o.ay, o.az);
    // everything with a depth, far to near: nests (as discs), dots, satellites; a term map's outer sphere is the term
    const items = [];
    L.nests.forEach(n => { if (n === L.root && !n.center) return; if (!vis(n.v) && n.kind === 'note') return; const p = pos(n), r = n.r * zoom * p.k; if (r < 1.2 || r > 2.2 * Math.hypot(W, H) || p.x + r < -20 || p.x - r > W + 20 || p.y + r < -20 || p.y - r > H + 20) { n._p = null; return; } n._p = p; n._r = r; items.push({ z: p.z - n.r * zoom, kind: 'nest', n, p, r }); });
    L.dots.forEach(d => { const n = d.nest; if (!n._p || n._r < 14 || !vis(d.v)) { d._p = null; return; } const p = pos(d), r = Math.max(1.4, Math.min(9, d.r * zoom * p.k)); d._p = p; d._r = r; items.push({ z: p.z, kind: 'dot', d, p, r }); });
    L.sats.forEach(s => { const n = s.home; if (n !== L.root && (!n._p || n._r < 6)) { s._p = null; return; } if (!vis(s.v)) { s._p = null; return; } const p = pos(s), r = Math.max(2, Math.min(8, s.r * Math.sqrt(zoom) * p.k)); if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { s._p = null; return; } s._p = p; s._r = r; items.push({ z: p.z, kind: 'sat', s, p, r }); });
    items.sort((a, b) => a.z - b.z);
    // the rings of the nests that show their satellites
    c.lineWidth = 1; L.nests.forEach(n => { if (!n.ring || !n.sats.length || (n !== L.root && (!n._p || n._r < 6))) return; c.strokeStyle = 'rgba(' + ink + ',' + (n === f ? .16 : .07) + ')'; c.beginPath(); for (let i = 0; i <= 48; i++) { const q = NEST.onRing(n, i / 48 * Math.PI * 2), p = NEST.P(I, q.x, q.y, q.z); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } c.stroke(); });
    // threads: the hot thing's, and faintly those of the focus's satellites; a connection's own ink and dash when it has them
    const thread = (a, b, col, w, alpha, e, rb) => { if (!a || !b) return; c.strokeStyle = col; c.lineWidth = w; c.globalAlpha = alpha; c.setLineDash(e && e.dash || []); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.setLineDash([]);
      if (e && e.dir) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, tx = b.x - ux * ((rb || 4) + 2), ty = b.y - uy * ((rb || 4) + 2), s = 4 + w; c.fillStyle = col; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - ux * s * 1.6 - uy * s * .8, ty - uy * s * 1.6 + ux * s * .8); c.lineTo(tx - ux * s * 1.6 + uy * s * .8, ty - uy * s * 1.6 - ux * s * .8); c.closePath(); c.fill(); }
      c.globalAlpha = 1; };
    const WIRE = 'rgba(224,138,0,1)', wcol = e => e && e.col || WIRE;
    const place = id => { const d = L.dotById.get(id); if (d && d._p) return d._p; const s = L.satById.get(id); if (s && s._p) return s._p; const n = L.byId.get(id); if (n && n._p) return n._p; return null; };
    const rOf = id => { const d = L.dotById.get(id); if (d && d._p) return d._r; const s = L.satById.get(id); return s && s._p ? s._r : 4; };
    if (f && !hot) f.sats.forEach(s => { if (!s._p) return; s.uses.forEach((cnt, did) => { const n = L.byId.get(did); if (!n) return; n.kids.forEach(d => { if (d._p && (G.adj.get(s.id) || []).includes(d.id)) thread(s._p, d._p, 'rgba(' + ink + ',1)', 1, .1); }); }); });
    if (hot) hot.threads.forEach(([a, b]) => { const e = G.edges.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)); const pa = place(a), pb = place(b); if (!pa || !pb) return; const w = e && e.kind === 'wire', fw = e && e.a === a; thread(fw || !e ? pa : pb, fw || !e ? pb : pa, w ? wcol(e) : 'rgba(' + ink + ',1)', w ? 1.8 : 1.2, .75, w ? e : null, rOf(fw || !e ? b : a)); });
    if (S.path && S.path.length > 1) for (let i = 1; i < S.path.length; i++) thread(place(S.path[i - 1]), place(S.path[i]), 'rgba(' + ink + ',1)', 2.2, .9);
    // wires inside the focused note; a term map draws every connection whose two ends are in view
    if (!hot) G.edges.forEach(e => { if (e.kind !== 'wire') return; const a = L.dotById.get(e.a), b = L.dotById.get(e.b); if (!a || !b || !a._p || !b._p) return; const inF = f && f.kind === 'note' && a.nest === f && b.nest === f;
      if (inF || I.o.links) thread(a._p, b._p, wcol(e), 1.2, inF ? .6 : .38, e, b._r); });
    // the things, far to near
    items.forEach(it => { const { p, r } = it, fog = Math.max(.35, Math.min(1, .55 + p.k * .45));
      if (it.kind === 'nest') { const n = it.n, col = NEST.tint(n), isF = n === f, inF = f && (n.parent === f || n === f), o = on(n.id) || n.kind === 'project' || n.kind === 'root' ? 1 : .35;
        const g = c.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r); g.addColorStop(0, col + (n.kind === 'root' ? (dark ? '1c' : '16') : dark ? '30' : '2a')); g.addColorStop(1, col + (n.kind === 'root' ? '06' : dark ? '10' : '0c'));
        c.globalAlpha = o * (n.kind === 'root' ? 1 : fog); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.strokeStyle = col + (isF ? 'dd' : hot && hot.id === n.id ? 'bb' : inF ? '77' : '44'); c.lineWidth = isF ? 2 : 1; c.stroke(); c.globalAlpha = 1; }
      else if (it.kind === 'dot') { const d = it.d, o = on(d.id) ? 1 : .22; c.globalAlpha = o * fog * (d.v && d.v.via ? .7 : 1); c.fillStyle = d.color; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); if (r > 3) { c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + NEST.paper() + ',.9)'; c.stroke(); } if (d.id === S.focus || d.id === I.hover) { c.beginPath(); c.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = 'rgba(' + ink + ',.9)'; c.stroke(); } if (lit && lit.has(d.id)) { c.beginPath(); c.arc(p.x, p.y, r + 5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = pal.cmp; c.stroke(); } c.globalAlpha = 1; }
      else { const s = it.s, o = on(s.id) ? 1 : .25; c.globalAlpha = o * fog; c.fillStyle = s.color; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + NEST.paper() + ',.9)'; c.stroke(); if (s.id === S.focus || s.id === I.hover) { c.beginPath(); c.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = 'rgba(' + ink + ',.9)'; c.stroke(); } if (lit && lit.has(s.id)) { c.beginPath(); c.arc(p.x, p.y, r + 5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = pal.cmp; c.stroke(); } c.globalAlpha = 1; } });
    // names: the hot thing, the lit ones, the focus's children, the satellites in view, the dots of the open note
    const avoid = [], named = [], seen = new Set();
    const nameOf = (id, text, p, r, o) => { if (seen.has(id)) return; seen.add(id); named.push({ id, text, p, r, o }); };
    if (hot && !L.byId.get(hot.id)) { const p = place(hot.id), d = L.dotById.get(hot.id), s = L.satById.get(hot.id); if (p && (d || s)) nameOf(hot.id, (d || s).label, p, (d ? d._r : s._r) || 6, { first: 2, weight: 600 }); }
    if (L.root.center && L.root._p && f === L.root) nameOf('root', L.root.label, { x: L.root._p.x, y: L.root._p.y - L.root._r + 14 }, 0, { align: 'center', weight: 600, size: 14, first: 3, color: pal.term });
    L.nests.forEach(n => { if (n === L.root || !n._p) return; const child = n.parent === f, grand = n.parent && n.parent.parent === f; if (child || (grand && n._r > 40) || (lit && lit.has(n.id))) nameOf(n.id, n.label, { x: n._p.x, y: n._p.y - n._r + Math.min(16, n._r * .22) }, 0, { align: 'center', weight: 600, size: n.kind === 'project' ? 13 : 12, first: child ? 1 : 0, alpha: on(n.id) ? 1 : .5 }); });
    L.sats.forEach(s => { if (!s._p) return; const near = s.home === f || s.home === L.root && f === L.root || (lit && lit.has(s.id)) || (hot && hot.near.has(s.id)); if (near || s._r >= 5) nameOf(s.id, s.label, s._p, s._r, { size: 11, first: lit && lit.has(s.id) ? 2 : near ? 1 : 0, alpha: on(s.id) ? 1 : .5 }); });
    L.dots.forEach(d => { if (!d._p) return; if (d.nest === f || (lit && lit.has(d.id)) || (hot && hot.near.has(d.id) && d._r > 2)) nameOf(d.id, d.label, d._p, d._r, { size: 11, first: lit && lit.has(d.id) ? 2 : d.nest === f ? 1 : 0, alpha: on(d.id) ? 1 : .45 }); });
    named.sort((a, b) => (b.o.first || 0) - (a.o.first || 0)).slice(0, 160).forEach(({ id, text, p, r, o }) => { const align = o.align || 'left'; NEST.label(c, text, align === 'center' ? p.x : p.x + r + 5, p.y, { align, size: o.size || 11.5, weight: o.weight || 500, max: 40, alpha: o.alpha, color: o.color, avoid: id === (hot && hot.id) ? null : avoid }); });
    if (I.nEl) I.nEl.textContent = (I.o.say || NEST.say)(I);
  },
  say(I) { const L = I.L, f = I.nest, w = I.o.groupWord || 'project'; return (f === L.root ? plural(L.root.kids.length, w) + ' · ' + plural(L.nests.filter(n => n.kind === 'note').length, 'note') : f.kind === 'project' ? plural(f.kids.length, 'note') + ' in ' + f.label : plural(f.kids.length, 'component') + ' in it') + ' · ' + plural(L.sats.length, 'satellite') + (f.sats.length ? ' · ' + f.sats.length + ' here' : ''); },
  /** What is under the pointer: a dot of the open note or a satellite first, then the smallest nest around the point (from afar, a click is about nests).
   *  A satellite answers only when it orbits the open nest, one just inside it, or one around it (V3.969: a small map put a note's
   *  satellites over its project's middle, and a click meant for the project picked the term). */
  hit(I, px, py) { const L = I.L; if (!L) return null; let best = null, bd = 12 * 12; const f = I.nest, near = n => { if (n === f || n.parent === f) return true; for (let x = f; x; x = x.parent) if (x === n) return true; return false; };
    L.dots.forEach(d => { if (!d._p || d.nest !== I.nest) return; const dx = d._p.x - px, dy = d._p.y - py, dd = dx * dx + dy * dy; if (dd < bd + d._r * d._r) { bd = dd; best = { kind: 'dot', o: d }; } });
    L.sats.forEach(s => { if (!s._p || !near(s.home)) return; const dx = s._p.x - px, dy = s._p.y - py, dd = dx * dx + dy * dy; if (dd < bd + s._r * s._r) { bd = dd; best = { kind: 'sat', o: s }; } });
    if (best) return best; let nest = null; L.nests.forEach(n => { if (n === L.root || !n._p) return; const dd = Math.hypot(n._p.x - px, n._p.y - py); if (dd <= n._r && (!nest || n._r < nest._r)) nest = n; }); return nest ? { kind: 'nest', o: nest } : null; },
  crumbs(I) { const el = I.crumbsEl; if (!el) return; el.innerHTML = ''; const chain = []; for (let n = I.nest; n; n = n.parent) chain.unshift(n);
    chain.forEach((n, i) => { const b = h('button.nest-crumb' + (i === chain.length - 1 ? '.on' : ''), { type: 'button', title: n.label, on: { click: () => { if (i < chain.length - 1) NEST.flyTo(I, n, 450); } } }, n.label); el.append(b); if (i < chain.length - 1) el.append(h('span.nest-sep', '›')); }); },
  /** Pick a node (a dot, a satellite, a nest with a node of its own): the side panel says what it is; the camera goes to its nest. */
  focusOn(I, id, fly) { const L = I.L, G = I.G; if (!L || !G) return; const d = L.dotById.get(id), s = L.satById.get(id), n = L.byId.get(id);
    I.sel.focus = G.byId.has(id) ? id : null; I.sel.path = []; I.o.panel && I.o.panel(I);
    const to = d ? d.nest : s ? s.home : n && n.v ? n : null; if (fly !== false && to && to !== I.nest) NEST.flyTo(I, to, 500); else NEST.draw(I); },
  /** The canvas, the crumbs and the ⤢ + − tools into host, wired; inset: the part of the host's height that is not the map (a foot). */
  mount(I, host, inset) {
    const cv = h('canvas.nest-cv'), crumbs = h('div.nest-crumbs'), tools = h('div.nest-tools', h('button.btn.xs', { type: 'button', title: I.o.center ? 'All of it' : 'The whole notebook', on: { click: () => I.L && NEST.flyTo(I, I.L.root, 500) } }, '⤢'), h('button.btn.xs', { type: 'button', title: 'Closer', on: { click: () => { I.cam.zoom *= 1.35; NEST.draw(I); } } }, '+'), h('button.btn.xs', { type: 'button', title: 'Further', on: { click: () => { I.cam.zoom /= 1.35; NEST.draw(I); } } }, '−'));
    host.classList.add('nest-host'); host.prepend(cv, crumbs, tools); Object.assign(I, { host, cv, c: cv.getContext('2d'), crumbsEl: crumbs, inset: inset || 0 });
    NEST.wire(I); new ResizeObserver(() => { if (!cv.isConnected) return; NEST.size(I); if (I.nest) I.cam.zoom = NEST.fitZoom(I, I.nest); NEST.draw(I); }).observe(host);
    return cv;
  },
  wire(I) {
    const cv = I.cv, o = I.o; let drag = null, pinch = null; const P = new Map(); const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const pick = id => o.pick ? o.pick(I, id) : NEST.focusOn(I, id, false);
    cv.addEventListener('pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; e.stopPropagation(); const p = pos(e); P.set(e.pointerId, p); cv.setPointerCapture(e.pointerId); if (P.size === 2) { const [a, b] = [...P.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; } drag = { x0: p.x, y0: p.y, moved: false, yaw: I.cam.yaw, pitch: I.cam.pitch }; });
    cv.addEventListener('pointermove', e => { const p = pos(e); if (P.has(e.pointerId)) P.set(e.pointerId, p);
      if (P.size === 2 && pinch) { const [a, b] = [...P.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); I.cam.zoom = Math.max(.02, Math.min(60, I.cam.zoom * d / pinch)); pinch = d; NEST.draw(I); return; }
      if (drag) { if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > 4) drag.moved = true; if (drag.moved) { I.cam.yaw = drag.yaw + (p.x - drag.x0) * .006; I.cam.pitch = Math.max(-1.25, Math.min(1.25, drag.pitch + (p.y - drag.y0) * .006)); NEST.draw(I); } return; }
      const hv = NEST.hit(I, p.x, p.y), id = hv ? hv.o.id : null; if (id !== I.hover) { I.hover = id; cv.style.cursor = hv ? 'pointer' : 'grab'; NEST.draw(I); } });
    const up = e => { const p = pos(e); P.delete(e.pointerId); if (P.size < 2) pinch = null; const d = drag; drag = null; if (!d || d.moved) return; e.stopPropagation();
      const hv = NEST.hit(I, p.x, p.y), f = I.nest, L = I.L; if (!L) return;
      // the second click of a double-click does nothing of its own: the camera may already be flying, so what is under the pointer
      // now is not what was clicked; the double-click acts on what the first click hit
      const now = performance.now(), prev = I.lastUp, second = !!prev && now - prev.t < 450 && Math.hypot(p.x - prev.x, p.y - prev.y) < 10;
      I.lastUp = { t: now, x: p.x, y: p.y, hv: second ? prev.hv : hv }; if (second) return;
      if (!hv) { if (f !== L.root) return NEST.out(I); return pick(null); }
      if (hv.kind === 'dot' || hv.kind === 'sat') { if (e.shiftKey && I.sel.focus && I.sel.focus !== hv.o.id && I.G) { I.sel.path = NEST.path(I.G, I.sel.focus, hv.o.id); if (!I.sel.path.length) toast('No path between them'); const keep = I.sel.path; pick(hv.o.id); I.sel.path = keep; return NEST.draw(I); } return pick(hv.o.id); }
      const n = hv.o; if (n === f) { if (n.v) pick(n.id); return; } const to = NEST.step(I, n); if (!to) return; if (to.v) pick(to.id); NEST.flyTo(I, to, 500); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { P.delete(e.pointerId); drag = null; pinch = null; }); cv.addEventListener('pointerleave', () => { if (I.hover) { I.hover = null; NEST.draw(I); } });
    cv.addEventListener('dblclick', e => { e.stopPropagation(); const p = pos(e), last = I.lastUp, hv = last && performance.now() - last.t < 600 ? last.hv : NEST.hit(I, p.x, p.y); if (hv && o.open) o.open(I, hv); });
    cv.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); I.cam.zoom = Math.max(.02, Math.min(60, I.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); NEST.draw(I); }, { passive: false });
  },
  /* ---------- the Atlas page ---------- */
  page: null,   // its map: kept from one visit to the next, so the Atlas opens where it was left
  render() {
    const S = ATLAS.st, bar = ATLAS.bar();
    const I = NEST.page || (NEST.page = NEST.make({ sel: ATLAS.st, lit: () => ATLAS.lit, panel: () => ATLAS.panelDraw(),
      open: (I, hv) => { const v = hv.o.v || (hv.o.doc && ATLAS.G.byId.get(hv.o.id)); if (v) ATLAS.act(v); else if (hv.o.doc) App.go('#/doc/' + hv.o.id); } }));
    const panel = h('aside.at-panel'), slider = h('input.at-time', { type: 'range', min: 0, max: 1000, value: Math.round(S.time * 1000), title: 'The map growing by date', on: { input: e => { S.time = +e.target.value / 1000; NEST.draw(I); } } });
    const stage = h('div.at-stage.nest', h('div.at-foot', h('span.tiny.muted.at-n'), slider, h('span.tiny.muted', 'click a nest: fly in · click outside: fly out · drag: turn · wheel: closer · hover: threads · double-click: open · Esc: out')));
    NEST.mount(I, stage, 36); I.nEl = $('.at-n', stage);
    const view = h('div.atlas.nest', bar, ATLAS.collRow(), h('div.at-main', stage, panel)); ATLAS.view = view; ATLAS.panel = panel;
    setTimeout(() => { NEST.size(I); ATLAS.rebuild(true); ATLAS.search(); ATLAS.sayFrom(); }, 0);
    App.setTitle('Atlas', [h('span', S.only ? 'a collection' : 'the notebook as nests')]);
    return view;
  },
  rebuild(first) { const I = NEST.page; if (!I || !I.cv) return; const old = I.L, keep = I.nest && I.nest.id; I.G = ATLAS.G = ATLAS.graph(); if (ATLAS.st.focus && !I.G.byId.has(ATLAS.st.focus)) ATLAS.st.focus = null;
    NEST.show(I, keep, first || !old ? 0 : 300); ATLAS.panelDraw(); },
};
{
  // the Atlas page is the nests (14b keeps the graph, the bar, the side panel and the actions)
  const onPage = () => !!(NEST.page && ATLAS.view && ATLAS.view.classList && ATLAS.view.classList.contains('nest') && ATLAS.view.isConnected);
  Object.assign(ATLAS, {
    render: () => NEST.render(),
    rebuild: first => NEST.rebuild(first),
    search() { const G = ATLAS.G, q = ATLAS.st.q.trim().toLowerCase(); if (!G) return; ATLAS.lit = q ? new Set(G.nodes.filter(v => (v.label + ' ' + (v.sub || '')).toLowerCase().includes(q)).map(v => v.id)) : null; if (onPage()) NEST.draw(NEST.page); },
    focusOn: id => { if (onPage()) NEST.focusOn(NEST.page, id, true); },
  });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape' || !onPage() || $('.ovl') || (e.target.closest && e.target.closest('input,textarea,[contenteditable="true"]'))) return; const I = NEST.page; if (ATLAS.st.focus) { ATLAS.st.focus = null; ATLAS.st.path = []; ATLAS.panelDraw(); NEST.draw(I); } else NEST.out(I); });
}
