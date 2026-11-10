/* ==========================================================================
   14d · The Atlas in 3D (V3.966, Gabe's choice of the three shapes: "Nested,
   in 3D, with terms and papers orbiting the nest they belong to most"):
   the notebook is a sphere; the projects are spheres packed inside it; each
   note is a sphere packed inside its project, holding its components (and
   structures) as dots. A term, a paper or a person orbits the nest it is
   most tied to — the note that holds most of its mentions, else the project,
   else the notebook — on a tilted ring, so the whole notebook is compact
   from afar and a nest opens up when you fly into it.
   Flying: click a nest to fly into it (one level at a time); click the space
   around it to fly back out; the crumbs at the top are the levels. Drag
   orbits the camera, the wheel comes closer, double-click opens. Hover shows
   a thing's threads (what uses a term; a component's terms, papers, wires).
   The bar, the chips, the search, the action chips, /collection and the side
   panel are the Atlas's own (14b); only the stage is new. The 2D map in 14b
   stays as the engine of the note-term maps (14c).
   ========================================================================== */
const NEST = {
  PF: 1700,                         // perspective: pixels from the eye to the screen
  cam: { t: { x: 0, y: 0, z: 0 }, zoom: 1, yaw: -.55, pitch: .42 },
  st: { focus: null, hover: null, drag: null, raf: 0 },
  L: null, V: null, cv: null, c: null, W: 0, H: 0, dpr: 1, crumbsEl: null, nEl: null,
  /* ---------- the nests from the graph ---------- */
  build() {
    const G = ATLAS.G, pal = NEST.pal(), nests = [], byId = new Map();
    const mk = (id, kind, label, r, extra) => { const n = Object.assign({ id, kind, label, r, kids: [], x: 0, y: 0, z: 0, sats: [], v: G.byId.get(id) || null }, extra || {}); byId.set(id, n); nests.push(n); return n; };
    // a project for each doc on the map (the note node, or a component's note), the notebook around them
    const docOf = v => v.kind === 'note' ? v.id : v.kind === 'cmp' ? (M.block(v.id) || {}).docId : v.kind === 'item' ? (M.item(v.id) || {}).originDocId : null;
    const notes = new Map(); G.nodes.forEach(v => { const did = docOf(v); if (!did || !M.doc(did)) return; if (!notes.has(did)) notes.set(did, []); if (v.kind !== 'note') notes.get(did).push(v); });
    const projects = new Map();
    notes.forEach((kids, did) => { const d = M.doc(did), p = d.projectId && M.project(d.projectId), pid = p ? p.id : 'p:none';
      if (!projects.has(pid)) projects.set(pid, { id: pid, name: p ? p.name : 'General', notes: [] });
      const dots = kids.map(v => ({ id: v.id, kind: v.kind, label: v.label, r: v.kind === 'item' ? 4.2 : 6, v, color: v.color || pal[v.kind], x: 0, y: 0, z: 0 }));
      const rr = dots.length ? NEST.pack(dots, 3) + 12 : 20;
      const n = mk(did, 'note', d.title || 'Untitled', Math.max(22, rr), { kids: dots, doc: d, t: d.created, color: p && p.color || null, sel: G.byId.has(did) }); dots.forEach(k => k.nest = n); projects.get(pid).notes.push(n); });
    const pnests = [...projects.values()].map((p, i) => { const r = NEST.pack(p.notes, 14) + 30; const n = mk(p.id, 'project', p.name, r, { kids: p.notes, proj: p, pi: i }); p.notes.forEach(k => k.parent = n); return n; });
    const R = pnests.length ? NEST.pack(pnests, 26) + 40 : 120;
    const root = mk('root', 'root', 'The notebook', R, { kids: pnests }); pnests.forEach(k => k.parent = root);
    // absolute places, outer to inner
    const walk = (n, ox, oy, oz) => { n.ax = ox + n.x; n.ay = oy + n.y; n.az = oz + n.z; (n.kids || []).forEach(k => walk(k, n.ax, n.ay, n.az)); }; walk(root, 0, 0, 0);   // the dots too (no kids of their own)
    // satellites: each term, paper or person orbits the nest it is most tied to
    const sats = G.nodes.filter(v => v.kind === 'term' || v.kind === 'paper' || v.kind === 'person');
    const perNest = new Map(); sats.forEach(v => perNest.set(v.id, new Map()));
    G.edges.forEach(e => { const a = G.byId.get(e.a), b = G.byId.get(e.b); if (!a || !b) return; const s = perNest.has(a.id) ? a : perNest.has(b.id) ? b : null, o = s === a ? b : a; if (!s || !o) return; const did = docOf(o); if (!did || !byId.has(did)) return; const m = perNest.get(s.id); m.set(did, (m.get(did) || 0) + 1); });
    sats.forEach(v => { const m = perNest.get(v.id), total = [...m.values()].reduce((s, n) => s + n, 0); let home = root;
      if (total) { const [did, n] = [...m.entries()].sort((x, y) => y[1] - x[1])[0]; if (n * 2 >= total) home = byId.get(did);
        else { const pm = new Map(); m.forEach((n2, d2) => { const pn = byId.get(d2).parent; pm.set(pn.id, (pm.get(pn.id) || 0) + n2); }); const [pid, pn] = [...pm.entries()].sort((x, y) => y[1] - x[1])[0]; home = pn * 2 >= total ? byId.get(pid) : root; } }
      home.sats.push({ id: v.id, kind: v.kind, label: v.label, v, r: 3.6 + Math.sqrt(v.deg || 1) * .7, color: pal[v.kind], home, uses: m }); });
    nests.forEach(n => NEST.orbit(n));
    NEST.L = { root, nests, byId, sats: nests.flatMap(n => n.sats), dots: nests.flatMap(n => n.kids.filter(k => !k.kids)) };
    NEST.L.satById = new Map(NEST.L.sats.map(s => [s.id, s])); NEST.L.dotById = new Map(NEST.L.dots.map(d => [d.id, d]));
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
  P(x, y, z) { const C = NEST.cam, cy = Math.cos(C.yaw), sy = Math.sin(C.yaw), cp = Math.cos(C.pitch), sp = Math.sin(C.pitch); x -= C.t.x; y -= C.t.y; z -= C.t.z;
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const X = x1 * C.zoom, Y = y2 * C.zoom, Z = Math.min(z2 * C.zoom, NEST.PF * .85), k = NEST.PF / (NEST.PF - Z); return { x: NEST.W / 2 + X * k, y: NEST.H / 2 + Y * k, k, z: Z }; },
  fitZoom(n) { return Math.min(NEST.W, NEST.H) * .4 / Math.max(1, n.r); },
  flyTo(n, ms) { const C = NEST.cam, from = { x: C.t.x, y: C.t.y, z: C.t.z, zoom: C.zoom }, to = { x: n.ax, y: n.ay, z: n.az, zoom: NEST.fitZoom(n) }; NEST.st.focus = n; NEST.crumbs();
    if (!ms || matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(C.t, { x: to.x, y: to.y, z: to.z }); C.zoom = to.zoom; return NEST.draw(); }
    const t0 = performance.now(), my = ++NEST._fly; const step = now => { if (my !== NEST._fly) return; const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3); C.t.x = from.x + (to.x - from.x) * e; C.t.y = from.y + (to.y - from.y) * e; C.t.z = from.z + (to.z - from.z) * e; C.zoom = from.zoom * Math.pow(to.zoom / from.zoom, e); NEST.draw(); if (u < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); },
  _fly: 0,
  /** One level at a time: the nest to fly to for a click on x — its ancestor just inside the focus, or the sibling of the focus it sits in. */
  step(x) { const f = NEST.st.focus, chain = []; for (let n = x; n; n = n.parent) chain.unshift(n); const i = chain.indexOf(f); if (i >= 0) return chain[i + 1] || null; const depth = f === NEST.L.root ? 0 : f.kind === 'project' ? 1 : 2; return chain[depth] || chain[chain.length - 1]; },
  out() { const f = NEST.st.focus; if (f && f.parent) NEST.flyTo(f.parent, 450); },
  /* ---------- drawing ---------- */
  pal() { const dark = NEST.dark(); return dark ? { note: '#7FB3E8', cmp: '#F2CF5B', item: '#F28BB0', term: '#9CD37A', paper: '#F4A261', person: '#B8A3FF' } : { note: '#3F7FD0', cmp: '#C99400', item: '#D64F8E', term: '#4E8F2F', paper: '#D9702E', person: '#7A5AD8' }; },
  dark: () => document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor !== 'rgb(255, 255, 255)' && (() => { const m = /\d+/g.exec(getComputedStyle(document.body).backgroundColor); return m && +m[0] < 128; })(),
  ink: () => NEST.dark() ? '236,230,218' : '36,33,28', paper: () => NEST.dark() ? '28,25,22' : '236,232,223',
  PCOL: ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#eda100', '#e87ba4', '#0d9488', '#93285c'],
  tint(n) { const pal = NEST.pal(); if (n.kind === 'project') return n.proj && n.proj.id !== 'p:none' ? ((M.project(n.proj.id) || {}).color || NEST.PCOL[(n.pi || 0) % NEST.PCOL.length]) : (NEST.dark() ? '#A39B8E' : '#8a8f98'); if (n.kind === 'note') return n.color || (n.parent && NEST.tint(n.parent)) || pal.note; return pal.note; },
  label(t, x, y, o) { const c = NEST.c, size = o.size || 12, max = o.max || 44, txt = t.length > max ? t.slice(0, max - 1) + '…' : t; c.font = (o.weight || 500) + ' ' + size + 'px ' + getComputedStyle(document.body).getPropertyValue('--f-d'); c.textBaseline = 'middle'; c.textAlign = o.align || 'left';
    const w = c.measureText(txt).width, bx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, box = { x: bx - 4, y: y - size * .72, w: w + 8, h: size * 1.44 };
    if (o.avoid) { if (o.avoid.some(b => b.x < box.x + box.w && b.x + b.w > box.x && b.y < box.y + box.h && b.y + b.h > box.y)) return false; o.avoid.push(box); }
    c.fillStyle = 'rgba(' + NEST.paper() + ',' + (o.halo == null ? .82 : o.halo) + ')'; c.beginPath(); c.roundRect(box.x, box.y, box.w, box.h, 5); c.fill(); c.fillStyle = o.color || 'rgba(' + NEST.ink() + ',' + (o.alpha == null ? 1 : o.alpha) + ')'; c.fillText(txt, x, y); return true; },
  size() { const cv = NEST.cv, st = cv && cv.parentNode; if (!st) return; const r = st.getBoundingClientRect(); NEST.W = Math.max(100, Math.round(r.width)); NEST.H = Math.max(100, Math.round(r.height) - 36); NEST.dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(NEST.W * NEST.dpr); cv.height = Math.round(NEST.H * NEST.dpr); cv.style.height = NEST.H + 'px'; },
  /** What a hovered or selected thing is tied to: the dots and satellites to light, and the threads to draw. */
  hot() { const G = ATLAS.G, L = NEST.L, id = NEST.st.hover || ATLAS.st.focus; if (!id || !G) return null; const near = new Set([id]), threads = []; (G.adj.get(id) || []).forEach(o => { near.add(o); threads.push([id, o]); }); return { id, near, threads }; },
  draw() {
    const L = NEST.L, c = NEST.c, G = ATLAS.G; if (!L || !c || !G) return; const W = NEST.W, H = NEST.H, dark = NEST.dark(), ink = NEST.ink(), pal = NEST.pal(), f = NEST.st.focus, lit = ATLAS.lit, hot = NEST.hot(), dim = !!(hot || lit);
    c.setTransform(NEST.dpr, 0, 0, NEST.dpr, 0, 0); c.clearRect(0, 0, W, H);
    const tcut = G.t0 + (G.t1 - G.t0) * ATLAS.st.time, vis = v => !v || !v.t || +new Date(v.t) <= tcut + 1;
    const on = id => !dim || (hot && hot.near.has(id)) || (lit && lit.has(id));
    const pos = o => { const p = NEST.P(o.ax, o.ay, o.az); return p; };
    // everything with a depth, far to near: nests (as discs), dots, satellites
    const items = [];
    L.nests.forEach(n => { if (n === L.root) return; if (!vis(n.v) && n.kind === 'note') return; const p = pos(n), r = n.r * NEST.cam.zoom * p.k; if (r < 1.2 || p.x + r < -20 || p.x - r > W + 20 || p.y + r < -20 || p.y - r > H + 20) { n._p = null; return; } n._p = p; n._r = r; items.push({ z: p.z - n.r * NEST.cam.zoom, kind: 'nest', n, p, r }); });
    L.dots.forEach(d => { const n = d.nest; if (!n._p || n._r < 14 || !vis(d.v)) { d._p = null; return; } const p = pos(d), r = Math.max(1.4, Math.min(9, d.r * NEST.cam.zoom * p.k)); d._p = p; d._r = r; items.push({ z: p.z, kind: 'dot', d, p, r }); });
    L.sats.forEach(s => { const n = s.home; if (n !== L.root && (!n._p || n._r < 6)) { s._p = null; return; } if (!vis(s.v)) { s._p = null; return; } const p = pos(s), r = Math.max(2, Math.min(8, s.r * Math.sqrt(NEST.cam.zoom) * p.k)); if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { s._p = null; return; } s._p = p; s._r = r; items.push({ z: p.z, kind: 'sat', s, p, r }); });
    items.sort((a, b) => a.z - b.z);
    // the rings of the nests that show their satellites
    c.lineWidth = 1; L.nests.forEach(n => { if (!n.ring || !n.sats.length || (n !== L.root && (!n._p || n._r < 6))) return; c.strokeStyle = 'rgba(' + ink + ',' + (n === f ? .16 : .07) + ')'; c.beginPath(); for (let i = 0; i <= 48; i++) { const p = NEST.P.apply(null, Object.values(NEST.onRing(n, i / 48 * Math.PI * 2))); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } c.stroke(); });
    // threads: the hot thing's, and faintly those of the focus's satellites
    const thread = (a, b, col, w, alpha) => { if (!a || !b) return; c.strokeStyle = col; c.lineWidth = w; c.globalAlpha = alpha; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.globalAlpha = 1; };
    const place = id => { const d = L.dotById.get(id); if (d && d._p) return d._p; const s = L.satById.get(id); if (s && s._p) return s._p; const n = L.byId.get(id); if (n && n._p) return n._p; return null; };
    if (f && !hot) f.sats.forEach(s => { if (!s._p) return; s.uses.forEach((cnt, did) => { const n = L.byId.get(did); if (!n) return; n.kids.forEach(d => { if (d._p && (G.adj.get(s.id) || []).includes(d.id)) thread(s._p, d._p, 'rgba(' + ink + ',1)', 1, .1); }); }); });
    if (hot) hot.threads.forEach(([a, b]) => { const e = G.edges.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)); const pa = place(a), pb = place(b); if (!pa || !pb) return; thread(pa, pb, e && e.kind === 'wire' ? 'rgba(224,138,0,1)' : 'rgba(' + ink + ',1)', e && e.kind === 'wire' ? 1.8 : 1.2, .75); });
    if (ATLAS.st.path && ATLAS.st.path.length > 1) for (let i = 1; i < ATLAS.st.path.length; i++) thread(place(ATLAS.st.path[i - 1]), place(ATLAS.st.path[i]), 'rgba(' + ink + ',1)', 2.2, .9);
    // wires inside the focused note
    if (f && f.kind === 'note' && !hot) G.edges.forEach(e => { if (e.kind !== 'wire') return; const a = L.dotById.get(e.a), b = L.dotById.get(e.b); if (a && b && a.nest === f && b.nest === f && a._p && b._p) thread(a._p, b._p, 'rgba(224,138,0,1)', 1.2, .5); });
    // the things, far to near
    items.forEach(it => { const { p, r } = it, fog = Math.max(.35, Math.min(1, .55 + p.k * .45));
      if (it.kind === 'nest') { const n = it.n, col = NEST.tint(n), isF = n === f, inF = f && (n.parent === f || n === f), o = on(n.id) || n.kind === 'project' ? 1 : .35;
        const g = c.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r); g.addColorStop(0, col + (dark ? '30' : '2a')); g.addColorStop(1, col + (dark ? '10' : '0c'));
        c.globalAlpha = o * fog; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.strokeStyle = col + (isF ? 'dd' : hot && hot.id === n.id ? 'bb' : inF ? '77' : '44'); c.lineWidth = isF ? 2 : 1; c.stroke(); c.globalAlpha = 1; }
      else if (it.kind === 'dot') { const d = it.d, o = on(d.id) ? 1 : .22; c.globalAlpha = o * fog; c.fillStyle = d.color; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); if (r > 3) { c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + NEST.paper() + ',.9)'; c.stroke(); } if (d.id === ATLAS.st.focus || d.id === NEST.st.hover) { c.beginPath(); c.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = 'rgba(' + ink + ',.9)'; c.stroke(); } c.globalAlpha = 1; }
      else { const s = it.s, o = on(s.id) ? 1 : .25; c.globalAlpha = o * fog; c.fillStyle = s.color; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + NEST.paper() + ',.9)'; c.stroke(); if (s.id === ATLAS.st.focus || s.id === NEST.st.hover) { c.beginPath(); c.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = 'rgba(' + ink + ',.9)'; c.stroke(); } if (lit && lit.has(s.id)) { c.beginPath(); c.arc(p.x, p.y, r + 5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = pal.cmp; c.stroke(); } c.globalAlpha = 1; } });
    // names: the hot thing, the lit ones, the focus's children, the satellites in view, the dots of the open note
    const avoid = [], named = [], seen = new Set();
    const nameOf = (id, text, p, r, o) => { if (seen.has(id)) return; seen.add(id); named.push({ id, text, p, r, o }); };
    if (hot && !L.byId.get(hot.id)) { const p = place(hot.id), d = L.dotById.get(hot.id), s = L.satById.get(hot.id); if (p && (d || s)) nameOf(hot.id, (d || s).label, p, (d ? d._r : s._r) || 6, { first: 2, weight: 600 }); }
    L.nests.forEach(n => { if (n === L.root || !n._p) return; const child = n.parent === f, grand = n.parent && n.parent.parent === f; if (child || (grand && n._r > 40) || (lit && lit.has(n.id))) nameOf(n.id, n.label, { x: n._p.x, y: n._p.y - n._r + Math.min(16, n._r * .22) }, 0, { align: 'center', weight: 600, size: n.kind === 'project' ? 13 : 12, first: child ? 1 : 0, alpha: on(n.id) ? 1 : .5 }); });
    L.sats.forEach(s => { if (!s._p) return; const near = s.home === f || s.home === L.root && f === L.root || (lit && lit.has(s.id)) || (hot && hot.near.has(s.id)); if (near || s._r >= 5) nameOf(s.id, s.label, s._p, s._r, { size: 11, first: lit && lit.has(s.id) ? 2 : near ? 1 : 0, alpha: on(s.id) ? 1 : .5 }); });
    L.dots.forEach(d => { if (!d._p) return; if (d.nest === f || (lit && lit.has(d.id)) || (hot && hot.near.has(d.id) && d._r > 2)) nameOf(d.id, d.label, d._p, d._r, { size: 11, first: lit && lit.has(d.id) ? 2 : d.nest === f ? 1 : 0, alpha: on(d.id) ? 1 : .45 }); });
    named.sort((a, b) => (b.o.first || 0) - (a.o.first || 0)).slice(0, 160).forEach(({ id, text, p, r, o }) => { const align = o.align || 'left'; NEST.label(text, align === 'center' ? p.x : p.x + r + 5, p.y, { align, size: o.size || 11.5, weight: o.weight || 500, max: 40, alpha: o.alpha, avoid: id === (hot && hot.id) ? null : avoid }); });
    if (NEST.nEl) NEST.nEl.textContent = (f === L.root ? plural(L.root.kids.length, 'project') + ' · ' + plural(L.nests.filter(n => n.kind === 'note').length, 'note') : f.kind === 'project' ? plural(f.kids.length, 'note') + ' in ' + f.label : plural(f.kids.length, 'component') + ' in it') + ' · ' + plural(L.sats.length, 'satellite') + (f.sats.length ? ' · ' + f.sats.length + ' here' : '');
  },
  /** What is under the pointer: a dot of the open note or a satellite first, then the smallest nest around the point (from afar, a click is about nests). */
  hit(px, py) { const L = NEST.L; if (!L) return null; let best = null, bd = 12 * 12;
    L.dots.forEach(d => { if (!d._p || d.nest !== NEST.st.focus) return; const dx = d._p.x - px, dy = d._p.y - py, dd = dx * dx + dy * dy; if (dd < bd + d._r * d._r) { bd = dd; best = { kind: 'dot', o: d }; } });
    L.sats.forEach(s => { if (!s._p) return; const dx = s._p.x - px, dy = s._p.y - py, dd = dx * dx + dy * dy; if (dd < bd + s._r * s._r) { bd = dd; best = { kind: 'sat', o: s }; } });
    if (best) return best; let nest = null; L.nests.forEach(n => { if (n === L.root || !n._p) return; const dd = Math.hypot(n._p.x - px, n._p.y - py); if (dd <= n._r && (!nest || n._r < nest._r)) nest = n; }); return nest ? { kind: 'nest', o: nest } : null; },
  /* ---------- the page ---------- */
  render() {
    const S = ATLAS.st, bar = ATLAS.bar();
    const cv = h('canvas.at-cv.nest-cv'), panel = h('aside.at-panel'), slider = h('input.at-time', { type: 'range', min: 0, max: 1000, value: Math.round(S.time * 1000), title: 'The map growing by date', on: { input: e => { S.time = +e.target.value / 1000; NEST.draw(); } } });
    const crumbs = h('div.nest-crumbs'), tools = h('div.nest-tools', h('button.btn.xs', { type: 'button', title: 'The whole notebook', on: { click: () => NEST.flyTo(NEST.L.root, 500) } }, '⤢'), h('button.btn.xs', { type: 'button', title: 'Closer', on: { click: () => { NEST.cam.zoom *= 1.35; NEST.draw(); } } }, '+'), h('button.btn.xs', { type: 'button', title: 'Further', on: { click: () => { NEST.cam.zoom /= 1.35; NEST.draw(); } } }, '−'));
    const stage = h('div.at-stage.nest', cv, crumbs, tools, h('div.at-foot', h('span.tiny.muted.at-n'), slider, h('span.tiny.muted', 'click a nest: fly in · click outside: fly out · drag: turn · wheel: closer · hover: threads · double-click: open · Esc: out')));
    const view = h('div.atlas.nest', bar, ATLAS.collRow(), h('div.at-main', stage, panel)); ATLAS.view = view; ATLAS.panel = panel; NEST.cv = cv; NEST.c = cv.getContext('2d'); NEST.crumbsEl = crumbs; NEST.nEl = $('.at-n', stage);
    // the 2D engine's handles point at this page too, so what asks ATLAS.cv (a resize, the note-term maps' restore) finds something
    ATLAS.cv = cv; ATLAS.ctx = NEST.c; ATLAS.nEl = NEST.nEl;
    NEST.wire(cv); setTimeout(() => { NEST.size(); NEST.rebuild(true); ATLAS.search(); ATLAS.sayFrom(); }, 0);
    new ResizeObserver(() => { NEST.size(); if (NEST.st.focus) { NEST.cam.zoom = NEST.fitZoom(NEST.st.focus); } NEST.draw(); }).observe(stage);
    App.setTitle('Atlas', [h('span', S.only ? 'a collection' : 'the notebook as nests')]);
    return view;
  },
  rebuild(first) { const old = NEST.L, keep = NEST.st.focus && NEST.st.focus.id; ATLAS.G = ATLAS.graph(); NEST.build(); const L = NEST.L;
    NEST.st.focus = (keep && L.byId.get(keep)) || L.root; if (ATLAS.st.focus && !ATLAS.G.byId.has(ATLAS.st.focus)) ATLAS.st.focus = null;
    NEST.flyTo(NEST.st.focus, first || !old ? 0 : 300); ATLAS.panelDraw(); NEST.crumbs(); },
  crumbs() { const el = NEST.crumbsEl; if (!el) return; el.innerHTML = ''; const chain = []; for (let n = NEST.st.focus; n; n = n.parent) chain.unshift(n);
    chain.forEach((n, i) => { const b = h('button.nest-crumb' + (i === chain.length - 1 ? '.on' : ''), { type: 'button', title: n.label, on: { click: () => { if (i < chain.length - 1) NEST.flyTo(n, 450); } } }, n.label); el.append(b); if (i < chain.length - 1) el.append(h('span.nest-sep', '›')); }); },
  /** The focus for the side panel: a dot, a satellite or a nest with a node of its own; the camera goes to its nest. */
  focusOn(id, fly) { const L = NEST.L, G = ATLAS.G; if (!L || !G) return; const d = L.dotById.get(id), s = L.satById.get(id), n = L.byId.get(id);
    ATLAS.st.focus = G.byId.has(id) ? id : null; ATLAS.st.path = []; ATLAS.panelDraw();
    const to = d ? d.nest : s ? (s.home === L.root ? L.root : s.home) : n && n.v ? n : null; if (fly !== false && to && to !== NEST.st.focus) NEST.flyTo(to, 500); else NEST.draw(); },
  wire(cv) {
    let drag = null, pinch = null; const P = new Map(); const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; const p = pos(e); P.set(e.pointerId, p); cv.setPointerCapture(e.pointerId); if (P.size === 2) { const [a, b] = [...P.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; } drag = { x: p.x, y: p.y, x0: p.x, y0: p.y, moved: false, yaw: NEST.cam.yaw, pitch: NEST.cam.pitch }; });
    cv.addEventListener('pointermove', e => { const p = pos(e); if (P.has(e.pointerId)) P.set(e.pointerId, p);
      if (P.size === 2 && pinch) { const [a, b] = [...P.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); NEST.cam.zoom = Math.max(.02, Math.min(60, NEST.cam.zoom * d / pinch)); pinch = d; NEST.draw(); return; }
      if (drag) { if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > 4) drag.moved = true; if (drag.moved) { NEST.cam.yaw = drag.yaw + (p.x - drag.x0) * .006; NEST.cam.pitch = Math.max(-1.25, Math.min(1.25, drag.pitch + (p.y - drag.y0) * .006)); NEST.draw(); } return; }
      const hv = NEST.hit(p.x, p.y), id = hv ? hv.o.id : null; if (id !== NEST.st.hover) { NEST.st.hover = id; cv.style.cursor = hv ? 'pointer' : 'grab'; NEST.draw(); } });
    const up = e => { const p = pos(e); P.delete(e.pointerId); if (P.size < 2) pinch = null; const d = drag; drag = null; if (!d || d.moved) return;
      const hv = NEST.hit(p.x, p.y), f = NEST.st.focus, L = NEST.L;
      if (!hv) { if (f !== L.root) return NEST.out(); ATLAS.st.focus = null; ATLAS.st.path = []; ATLAS.panelDraw(); return NEST.draw(); }
      if (hv.kind === 'dot' || hv.kind === 'sat') { if (e.shiftKey && ATLAS.st.focus && ATLAS.st.focus !== hv.o.id && ATLAS.G) { ATLAS.st.path = ATLAS.shortest(ATLAS.st.focus, hv.o.id); if (!ATLAS.st.path.length) toast('No path between them'); } return NEST.focusOn(hv.o.id, false); }
      const n = hv.o; if (n === f) { if (n.v) NEST.focusOn(n.id, false); return; } const to = NEST.step(n); if (!to) return; if (to.v) { ATLAS.st.focus = to.id; ATLAS.panelDraw(); } NEST.flyTo(to, 500); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { P.delete(e.pointerId); drag = null; pinch = null; }); cv.addEventListener('pointerleave', () => { if (NEST.st.hover) { NEST.st.hover = null; NEST.draw(); } });
    cv.addEventListener('dblclick', e => { const p = pos(e), hv = NEST.hit(p.x, p.y); if (!hv) return; const v = hv.o.v || (hv.o.doc && ATLAS.G.byId.get(hv.o.id)); if (v) ATLAS.act(v); else if (hv.o.doc) App.go('#/doc/' + hv.o.id); });
    cv.addEventListener('wheel', e => { e.preventDefault(); NEST.cam.zoom = Math.max(.02, Math.min(60, NEST.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); NEST.draw(); }, { passive: false });
  },
};
{
  // the Atlas page is the 3D nests; the 2D engine (tick, draw, fit, hit) stays for the note-term maps (14c)
  const onPage = () => !!(ATLAS.view && ATLAS.view.classList && ATLAS.view.classList.contains('nest') && ATLAS.view.isConnected);
  ATLAS.render = () => NEST.render();
  const rb = ATLAS.rebuild; ATLAS.rebuild = function () { if (onPage()) return NEST.rebuild(); return rb.apply(this, arguments); };
  const se = ATLAS.search; ATLAS.search = function () { if (!onPage()) return se.apply(this, arguments); const G = ATLAS.G, q = ATLAS.st.q.trim().toLowerCase(); if (!G) return; ATLAS.lit = q ? new Set(G.nodes.filter(v => (v.label + ' ' + (v.sub || '')).toLowerCase().includes(q)).map(v => v.id)) : null; NEST.draw(); };
  const fo = ATLAS.focusOn; ATLAS.focusOn = function (id) { if (onPage()) return NEST.focusOn(id, true); return fo.apply(this, arguments); };
  const sz = ATLAS.size; ATLAS.size = function () { if (onPage()) return NEST.size(); return sz.apply(this, arguments); };
  document.addEventListener('keydown', e => { if (e.key !== 'Escape' || !onPage() || $('.ovl') || (e.target.closest && e.target.closest('input,textarea,[contenteditable="true"]'))) return; if (ATLAS.st.focus) { ATLAS.st.focus = null; ATLAS.st.path = []; ATLAS.panelDraw(); NEST.draw(); } else NEST.out(); });
}
