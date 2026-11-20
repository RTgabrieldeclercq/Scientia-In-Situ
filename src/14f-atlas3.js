/* ==========================================================================
   14f · The Atlas on three axes (V4.0 — Gabe: "I want the Atlas to keep
   its 3D nature with a set of three axes defined by how they categorize or
   sort what you see. For example, one of the axes could be timeline (oldest
   notes start at the origin and continues growing). The Atlas dots
   representing structures and more should now copy the bubble feature from
   the terms page.")
   A room in 3D. Each of its three axes sorts the dots by one thing you pick:
   Time (oldest at the origin, newer outward), Kind, Project, Note, Note
   type, Term, People, Status (open / resolved), Connections. Picking one an
   axis already shows swaps the two; presets set all three (Story over time
   is where it starts, then the axes you used last). A number axis keeps its
   values true; dots that share a cell spread along the category axes only.
   The floor and the two walls furthest from you carry the grid; the axes run
   along the edges you can see, the time axis growing to the slider's day.
   Every dot is a small glass bead tinted by its kind; it opens into the term
   page's bubble (14e BUBBLE: the component and every neighbour, its images,
   the glass) when you point at it, tap it, pin it (Shift+click) or come
   close enough (at most a few at once, nearest first). A click ports in —
   you visit the note, at the component, lit — and the small glass bubble on
   the note (or Esc, or Alt+←) brings you back here as you left it. Threads
   go from what is open by hand to what it connects to, dashed lines down to
   the floor and across to the walls, and a barrier resolved or a takeaway
   reached is the arc of the term page, with its days and the term that
   joined them.
   Gabe's notes on it (14 Nov): "I want ports to be only on click. I also
   want the hovering to show the bubble to be delayed by one second … Scrolling
   away makes the axes more compact (a year's worth of time is displayed as
   days on zoom in, and months zooming out). I want arrows to show bridges and
   connections … threads that pulse in the direction of the origin to the note
   they are bridging to, with the pulsing color denoting what component kind or
   structure it is. Hovering on a thread with a one second delay as well shows
   the bridge along with components near it from origin to components near it
   for the destination. The popup shows all notes that it bridges to or from."
   So: only a click ports in (no ring). A bead opens after the pointer rests
   on it a moment (a ring closes in round it meanwhile), and coming close opens
   bubbles only once the room has been still as long — turning and zooming
   never pop them open. The wheel comes closer where the pointer is; with Time
   on an axis the room stops growing at 1.6× and coming closer spreads time
   instead (down to about nine days across the axis), anchored on the dot
   nearest the pointer, and Shift+wheel moves that window through time. The
   axes tighten as you go further: days, then weeks, months, quarters, years,
   long names shortened. Bridges (from the
   component to where its copy sits in the other note, on the three axes) and
   connections (wires, links) are threads with an arrow, a light running along
   each from where it starts, in the colour of its kind. Resting on a thread
   opens it: the two ends as bubbles with what is near them, the pulse between,
   why it was bridged, and every note the component is bridged to or from.
   The dots are the structures and components; notes, terms, papers and
   people are one click away in the bar's chips. Everything 14b gives stays:
   ATLAS.graph is the data, the lenses, the action chips (when the Atlas was
   opened from a note, a click does what they say), Ctrl+K and /find (the
   words lit), /collection (its types become the Kind bands), and the side
   panel (14b's panelDraw, grown into the axes, the kinds, the dot under the
   pointer and its connections). Lit reviews are left out, as on the term
   page. 14d's nests still draw the note-term maps (14c); the Atlas page is
   this room. Settings → Features → Atlas holds its settings and preview.
   ========================================================================== */
const ATLAS3 = (() => {
  const L3 = [12, 8, 10], DCAM = 34;
  const XK = { component: 'Component', panel: 'Image panel', page: 'Page or PDF', data: 'Table or plot', note: 'Note', term: 'Term', paper: 'Paper', person: 'Person' };
  const isC = k => /^c\d+$/.test(k);
  const kl = k => isC(k) ? ((ATLAS.item((ATLAS.st.only || [])[+k.slice(1)]) || {}).label || 'A type') : (typeof KIND !== 'undefined' && KIND[k] ? KIND[k].label : XK[k] || k);
  const kcol = k => isC(k) ? ATLAS.ccol(+k.slice(1)) : (typeof KIND !== 'undefined' && KIND[k] ? `var(--k-${k})` : `var(--a3-${k})`);
  const SKINDS = () => [...KINDS, ...(typeof RETIRED_KINDS !== 'undefined' ? RETIRED_KINDS : [])].map(k => k.id);
  const KORDER = () => [...(ATLAS.st.only || []).map((x, i) => 'c' + i), ...SKINDS(), 'component', 'panel', 'page', 'data', 'note', 'term', 'paper', 'person'];
  const LIFE = new Set(['barrier', 'question', 'investigate']);
  const statusOf = it => { const s = IX.status(it); if (s === 'open') return 'open'; if (['resolved', 'closed', 'answered', 'done', 'investigated'].includes(s)) return 'resolved'; return LIFE.has(it.kind) ? 'open' : 'none'; };
  const bkind = b => b.kind === 'figure' ? 'panel' : (b.kind === 'pdf' || b.kind === 'html' || b.web) ? 'page' : (b.kind === 'table' || b.kind === 'plot') ? 'data' : 'component';
  const ms = x => { const t = +new Date(x || 0); return isFinite(t) && t > 0 ? t : 0; };
  const mode = a => { const m = new Map(); a.forEach(v => { if (v != null && v !== '_') m.set(v, (m.get(v) || 0) + 1); }); let best = '_', n = 0; m.forEach((c, v) => { if (c > n) { n = c; best = v; } }); return best; };
  const hashf = s => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; };
  const DEF = { start: 'last', ax0: 'time', ax1: 'kind', ax2: 'project', cap: 0, near: 5, hoverMs: 1000, float: true, amount: 3, bridges: true, wires: true, pulses: true, pulseSpeed: 2, ticks: true, room: true, labels: 'few' };
  const opt = k => { const v = typeof FEAT !== 'undefined' ? FEAT.tune('atlas', k) : undefined; return v === undefined || v === null ? DEF[k] : v; };
  const still = () => !opt('float') || RM();
  const hoverMs = () => clamp(+opt('hoverMs'), 0, 3000), pulsesOn = () => opt('pulses') !== false && !RM(), tight = () => opt('ticks') !== false, ZT = 1.6, ZMAX = 5, SPAN_MIN = 9 * 864e5;

  /* ---------- the axes: what each can sort by ---------- */
  let META = { projects: [], notes: [], terms: [], people: [], ntypes: [] };
  const DIMS = {
    time: { label: 'Time', num: true, desc: 'oldest at the origin, newer outward', v: d => d.t },
    kind: { label: 'Kind', desc: 'each kind of structure, then components, notes, terms, papers, people', v: d => d.kind, order: KORDER, name: kl },
    project: { label: 'Project', desc: 'a band per project', v: d => d.proj, order: () => META.projects, name: p => p === '_' ? 'No project' : (M.project(p) || {}).name || 'A project' },
    note: { label: 'Note', desc: 'a band per note, by project, oldest first', v: d => d.note || '_', order: () => META.notes, name: n => n === '_' ? 'No note' : snippet((M.doc(n) || {}).title || 'Untitled', 40) },
    ntype: { label: 'Note type', desc: 'Protocol, Run, Note, Analysis…', v: d => d.ntype || '_', order: () => META.ntypes, name: t => t === '_' ? 'None' : prof(t).label },
    term: { label: 'Term', desc: 'the first term it uses, the most used terms first', v: d => d.term || '_', order: () => META.terms, name: t => t === '_' ? 'no term' : (M.term(t) || {}).label || 'a term' },
    people: { label: 'People', desc: 'who is named in it (@name or a person’s term)', v: d => d.who || '_', order: () => META.people, name: p => p === '_' ? 'no one named' : p },
    status: { label: 'Status', desc: 'barriers, questions and what needs investigating, open or resolved; the rest have none', v: d => d.status || 'none', order: () => ['open', 'resolved', 'none'], name: s => ({ open: 'Open', resolved: 'Resolved', none: 'No status' })[s] },
    links: { label: 'Connections', num: true, desc: 'how many threads it has, fewest at the origin', v: d => d.deg },
  };
  const PRESETS = [['story', 'Story over time', ['time', 'kind', 'project']], ['loops', 'Open loops', ['time', 'status', 'kind']], ['who', 'Who did what', ['time', 'people', 'ntype']], ['terms', 'Terms across notes', ['term', 'note', 'kind']], ['busy', 'Most connected', ['links', 'kind', 'project']]];
  const okAxes = a => Array.isArray(a) && a.length === 3 && a.every(x => DIMS[x]) && new Set(a).size === 3;
  function startAxes() {
    const s = opt('start'), p = PRESETS.find(x => x[0] === s);
    if (p) return p[2].slice();
    if (s === 'mine') { const a = [opt('ax0'), opt('ax1'), opt('ax2')]; if (okAxes(a)) return a; }
    const last = settings().atlasAxes; return okAxes(last) ? last.slice() : PRESETS[0][2].slice();
  }

  /* ---------- state ---------- */
  const st = { axes: null, skOff: new Set(), hover: null, hoverAt: 0, sel: null, pins: new Set(), pendingFly: null, th: null, tp: null };
  const CAM0 = { t: [L3[0] / 2, L3[1] / 2 - .4, L3[2] / 2], yaw: .62, pitch: .38, zoom: 1 };
  const cam = JSON.parse(JSON.stringify(CAM0));
  let DOTS = [], BY = new Map(), ADJ = new Map(), ARCS = [], VIS = new Set(), AX = [], T0 = 0, T1 = 1, SHOWN = [], THREADS = [], ITEMS = new Map(), AUTO = new Set();
  let hoverT = 0, restT = 0, thT = 0, camSig = '', camAt = 0, lastPX = -1, lastPY = -1, TW = null, sizeWant = null, LABPREV = new Set(), navAt = 0, roomAt = null;   // TW: the time window shown, when coming closer has spread time
  /** A real move of the pointer (the browser also sends moves when the page changes under a resting pointer: same place, no movement). */
  const moved = e => { if (e._a3mv === undefined) { e._a3mv = e.clientX !== lastPX || e.clientY !== lastPY; lastPX = e.clientX; lastPY = e.clientY; } return e._a3mv; };
  let R = null, raf = 0, last = 0, W = 0, H = 0, dpr = 1, unit = 1, animT0 = -1e9, fly = null, drag = null, pinch = null, BS = null, justDragged = 0, COL = null, arcKey = '', playT = 0;
  const ptrs = new Map();
  const cutT = () => T0 + (ATLAS.st.time == null ? 1 : ATLAS.st.time) * (T1 - T0);
  const lit = () => ATLAS.lit;

  /* ---------- colours (resolved through a probe, so color-mix and the dark theme work on the canvas) ---------- */
  const parse = s => { let m = String(s).match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number); m = String(s).match(/color\(srgb ([^)]+)\)/); if (m) return m[1].split(/[\s/]+/).filter(Boolean).slice(0, 3).map(v => Math.round(+v * 255)); return [128, 128, 128]; };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function colorAt(el, v) { el.style.color = ''; el.style.color = v; return parse(getComputedStyle(el).color); }
  function colors() { if (!R) return; COL = { ink: colorAt(R.probe, 'var(--ink)'), br: colorAt(R.probe, 'var(--bridge, #1f9d55)'), ax: [0, 1, 2].map(a => colorAt(R.probe, `var(--a3-ax${a})`)), k: {}, c: {} }; THREADS.forEach(T => { T._cid = null; }); }
  /** A thread's colour (its arrow and its light): what it carries — the bridged structure's kind when words were bridged, else the component's kind; a connection, its origin's first structure. */
  function tcolOf(T) { const O = BY.get(T.a) || T.A, key = T.ck ? 'k' + T.ck : 'o' + (O && O.id);
    if (T._cid !== key) { T._cid = key; T._c = T.ck && typeof KIND !== 'undefined' && KIND[T.ck] ? kc(T.ck) : O && O.type === 'cmp' && O.v && O.v.color ? (COL.c[O.v.color] || (COL.c[O.v.color] = colorAt(R.probe, O.v.color))) : kc((O || T.A).kind); }
    return T._c; }
  const kc = k => COL.k[k] || (COL.k[k] = colorAt(R.probe, kcol(k)));

  /* ---------- the dots: the notebook through ATLAS.graph (every kind, so threads and degrees are whole), lit reviews left out ---------- */
  function data() {
    const S = ATLAS.st, k0 = S.kinds; S.kinds = { note: 1, cmp: 1, item: 1, term: 1, paper: 1, person: 1 };
    let G; try { G = ATLAS.graph(); } finally { S.kinds = k0; }
    const litOut = !(typeof TERMLIT !== 'undefined' && TERMLIT.counted()), isLit = id => { const d = id && M.doc(id); return !!(litOut && d && typeof TERMLIT !== 'undefined' && TERMLIT.is(d)); };
    const docOf = v => v.kind === 'note' ? v.id : v.kind === 'cmp' ? (M.block(v.id) || {}).docId : v.kind === 'item' ? (M.item(v.id) || {}).originDocId : null;
    const drop = new Set(G.nodes.filter(v => isLit(docOf(v))).map(v => v.id));
    const adj = new Map(); G.nodes.forEach(v => { if (!drop.has(v.id)) adj.set(v.id, []); });
    const edges = G.edges.filter(e => adj.has(e.a) && adj.has(e.b)); edges.forEach(e => { adj.get(e.a).push({ o: e.b, e, out: true }); adj.get(e.b).push({ o: e.a, e, out: false }); });
    G.nodes.forEach(v => { if (adj.has(v.id) && ['term', 'paper', 'person'].includes(v.kind) && !adj.get(v.id).length) { drop.add(v.id); adj.delete(v.id); } });
    const tcount = new Map(); IX.termOcc.forEach((occ, t) => tcount.set(t, occ.filter(o => !isLit(o.docId)).length));
    const firstTerm = bid => { const s = IX.blockTerms.get(bid); if (!s || !s.size) return '_'; return [...s].filter(t => { const x = M.term(t); return x && x.kind !== 'person'; }).sort((a, b) => (tcount.get(b) || 0) - (tcount.get(a) || 0))[0] || '_'; };
    const whoOf = b => { if (!b) return '_'; const m = ((b.body && b.body.marks) || []).find(x => x.type === 'person' && x.name); if (m) return m.name; const s = IX.blockTerms.get(b.id), pt = s && [...s].map(M.term).find(t => t && t.kind === 'person'); return pt ? pt.label : '_'; };
    const old = BY, dots = [], by = new Map();
    const add = (v, o) => { const p = old.get(v.id), d = Object.assign(p && p.type === v.kind ? p : { phase: hashf(v.id) * 6.2832, k: 0, p: null }, { id: v.id, type: v.kind, v, label: v.label }, o);
      if (!(p && p.type === v.kind && p._sig === d.sig)) { if (d.el) { d.el.remove(); } d.el = null; d.ob = null; d.cap = null; d.k = 0; }
      d._sig = d.sig; dots.push(d); by.set(d.id, d); return d; };
    const only = S.only && S.only.length ? S.only.map(ATLAS.item).filter(Boolean) : null;
    G.nodes.forEach(v => { if (drop.has(v.id)) return;
      if (v.kind === 'note') { const doc = M.doc(v.id); if (!doc) return; add(v, { kind: 'note', docId: v.id, t: ms(doc.created), proj: doc.projectId || '_', note: v.id, ntype: doc.type, status: 'none', rw: .44, sig: 'n' + (doc.updated || doc.title) }); }
      else if (v.kind === 'cmp') { const b = M.block(v.id); if (!b) return; const doc = M.doc(b.docId), i = only ? only.findIndex(x => x.test(b)) : -1;
        add(v, { kind: i >= 0 ? 'c' + i : bkind(b), blockId: b.id, docId: b.docId, t: ms(M.blockTime(b)) || ms(b.created), proj: (doc && doc.projectId) || '_', note: b.docId, ntype: doc && doc.type, term: firstTerm(b.id), who: whoOf(b), status: 'none', rw: .26, img: b.kind === 'figure', sig: 'b' + (b.updated || '') + (b.body && b.body.text || '').length }); }
      else if (v.kind === 'item') { const it = M.item(v.id); if (!it) return; const b = M.block(it.originBlockId), doc = M.doc(it.originDocId);
        add(v, { kind: it.kind, blockId: it.originBlockId, docId: it.originDocId, t: ms(it.created) || (b ? ms(M.blockTime(b)) : 0), proj: (doc && doc.projectId) || '_', note: it.originDocId, ntype: doc && doc.type, term: firstTerm(it.originBlockId), who: whoOf(b), status: statusOf(it), rw: .3, raw: it.text || '', sig: 'i' + it.kind + (it.text || '').length + (it.status || '') }); }
      else { const nb = (adj.get(v.id) || []).map(x => G.byId.get(x.o)).filter(o => o && o.kind === 'cmp').map(o => M.block(o.id)).filter(Boolean);
        const home = mode(nb.map(b => b.docId)), hd = M.doc(home);
        add(v, { kind: v.kind, t: ms(v.t) || Math.min(...nb.map(b => ms(M.blockTime(b))).filter(Boolean), Date.now()), proj: (hd && hd.projectId) || '_', note: home, ntype: hd && hd.type, term: v.kind === 'term' ? v.id : mode(nb.map(b => firstTerm(b.id))), who: v.kind === 'person' ? v.label : mode(nb.map(whoOf)), status: 'none', rw: v.kind === 'note' ? .44 : .32, nb: nb.map(b => b.id), sig: v.kind + nb.length }); } });
    // a bridge's copy is a dot in its note (with the bridges' green band): the far end of its thread
    if (typeof BRIDGE !== 'undefined') DB.where('blocks', b => BRIDGE.is(b) && b.status === 'live').forEach(b => { const o = M.block(b.refBlockId), dd = M.doc(b.docId);
      if (!o || !dd || dd.deleted || o.docId === b.docId || isLit(b.docId) || isLit(o.docId) || drop.has(o.id) || !G.byId.has(o.id)) return;
      add({ id: b.id, kind: 'cmp', label: M.blockName(o) + ' — ' + snippet(b.refSpan ? b.refSpan.exact : (o.body && o.body.text) || '', 40), sub: dd.title || '' },
        { kind: bkind(o), blockId: b.id, docId: b.docId, t: ms(b.created) || ms(M.blockTime(b)), proj: dd.projectId || '_', note: b.docId, ntype: dd.type, term: firstTerm(o.id), who: whoOf(o), status: 'none', rw: .26, img: o.kind === 'figure', bridgeOf: o.id, sig: 'r' + (b.updated || '') + (b.why || '').length + (b.refSpan ? b.refSpan.exact.length : 0) }); });
    // a note's term and people: what its components use most
    const byNote = new Map(); dots.forEach(d => { if (d.type === 'cmp') { if (!byNote.has(d.note)) byNote.set(d.note, []); byNote.get(d.note).push(d); } });
    dots.forEach(d => { if (d.type !== 'note') return; const cs = byNote.get(d.id) || []; d.term = mode(cs.map(c => c.term)); d.who = mode(cs.map(c => c.who)); if (!d.t && cs.length) d.t = Math.min(...cs.map(c => c.t)); });
    dots.forEach(d => { d.deg = (adj.get(d.id) || []).length; d.text = ((d.label || '') + ' ' + (d.v.sub || '') + ' ' + (d.raw || '')).toLowerCase(); d.alt = null; });
    // the arcs (the term page's): barrier → resolution, observation → takeaway; drawn between the structures when they are dots, else their components
    const itemIn = (bid, kind) => { const ids = (IX.blockItems.get(bid) || []).concat((IX.origin.get(bid) || []).map(i => i.id)); const it = ids.map(M.item).find(x => x && x.kind === kind && x.originBlockId === bid); return it && by.has(it.id) ? it.id : by.has(bid) ? bid : null; };
    ARCS = (typeof TARC !== 'undefined' ? TARC.all() : []).map(a => ({ a: itemIn(a.from, TARC.K[a.k][0]), b: itemIn(a.to, TARC.K[a.k][1]), k: a.k, days: a.days, from: a.from, to: a.to })).filter(x => x.a && x.b && x.a !== x.b);
    ARCS.forEach(x => { const e = Object.assign({ arc: true, rel: x.k === 'br' ? 'resolved by' : 'led to' }, x); adj.get(x.a) && adj.get(x.a).push({ o: x.b, e, out: true }); adj.get(x.b) && adj.get(x.b).push({ o: x.a, e, out: false }); });
    // threads: a bridge runs from its component to where its copy sits in the other note; a connection (a wire, a link) from one component to the other
    const TH = [], seenT = new Set(), sMarks = bid => { const b = M.block(bid); return ((b && b.body && b.body.marks) || []).filter(x => x.type === 'struct' && M.item(x.ref)); };
    const firstKind = bid => { const m = sMarks(bid)[0]; if (m) return M.item(m.ref).kind; const it = (IX.blockItems.get(bid) || []).map(M.item).find(Boolean); return it ? it.kind : null; };
    const spanKind = (bid, sp) => { if (!sp) return null; const m = sMarks(bid).find(x => x.to > sp.from && x.from < sp.to); return m ? M.item(m.ref).kind : null; };
    if (typeof BRIDGE !== 'undefined') DB.where('blocks', b => BRIDGE.is(b) && b.status === 'live').forEach(b => { const o = M.block(b.refBlockId), dd = M.doc(b.docId);
      if (!o || !dd || dd.deleted || o.docId === b.docId || isLit(b.docId) || isLit(o.docId) || !adj.has(o.id)) return;
      TH.push({ k: 'bridge', id: 'br:' + b.id, a: o.id, docA: o.docId, docB: b.docId, br: b.id, why: String(b.why || '').trim(), t: ms(b.created) || ms(M.blockTime(b)), ph: hashf(b.id) * 1.6, ck: spanKind(o.id, b.refSpan) }); });
    edges.forEach(e => { if (!(e.kind === 'wire' || (e.kind === 'link' && e.rel === 'links to'))) return; const key = e.a + '>' + e.b; if (seenT.has(key)) return; seenT.add(key);
      const A0 = by.get(e.a); TH.push({ k: 'wire', id: 'w:' + key, a: e.a, b: e.b, rel: e.rel, ph: hashf(key) * 1.6, ck: A0 && A0.type === 'item' ? A0.kind : firstKind(e.a) }); });
    const oldT = new Map(THREADS.map(T => [T.id, T])); TH.forEach(T => { const o = oldT.get(T.id); if (o) { T.pB = o.pB; } });
    THREADS = TH; ITEMS = new Map(); dots.forEach(d => { if (d.type === 'item' && d.blockId) { if (!ITEMS.has(d.blockId)) ITEMS.set(d.blockId, []); ITEMS.get(d.blockId).push(d); } });
    if (st.tp && !TH.some(T => T.id === st.tp.id)) closeTP(); else if (st.tp) st.tp = TH.find(T => T.id === st.tp.id); st.th = null;
    // what each axis lists, in order
    const projs = DB.all('projects').map(p => p.id); META = {
      projects: [...projs, '_'],
      notes: [...new Set(dots.map(d => d.note || '_'))].sort((a, b) => { const A = M.doc(a), B = M.doc(b); return (projs.indexOf((A || {}).projectId) - projs.indexOf((B || {}).projectId)) || (ms((A || {}).created) - ms((B || {}).created)); }),
      terms: [...[...new Set(dots.map(d => d.term).filter(t => t && t !== '_'))].sort((a, b) => (tcount.get(b) || 0) - (tcount.get(a) || 0)), '_'],
      people: (() => { const c = new Map(); dots.forEach(d => { if (d.who && d.who !== '_') c.set(d.who, (c.get(d.who) || 0) + 1); }); return [...[...c.keys()].sort((a, b) => c.get(b) - c.get(a)), '_']; })(),
      ntypes: [...new Set(dots.map(d => d.ntype || '_'))].sort((a, b) => a === '_' ? 1 : b === '_' ? -1 : prof(a).label.localeCompare(prof(b).label)),
    };
    old.forEach((d, id) => { if (!by.has(id) && d.el) d.el.remove(); });
    DOTS = dots; BY = by; ADJ = adj; ATLAS.G = { nodes: G.nodes.filter(v => !drop.has(v.id)), edges, byId: G.byId, adj: G.adj, t0: G.t0, t1: G.t1 };
    const ts = DOTS.map(d => d.t).filter(Boolean); T0 = ts.length ? Math.min(...ts) : Date.now() - 864e5; T1 = ts.length ? Math.max(...ts) : Date.now(); if (T1 <= T0) T1 = T0 + 864e5;
    if (st.hover && !BY.has(st.hover.id)) st.hover = null; if (st.sel && !BY.has(st.sel.id)) st.sel = null; [...st.pins].forEach(id => { if (!BY.has(id)) st.pins.delete(id); });
    if (st.hover) st.hover = BY.get(st.hover.id); if (st.sel) st.sel = BY.get(st.sel.id);
  }

  /* ---------- the layout: each visible dot's place on the three axes (categories spread where they share a cell) ---------- */
  const fmtT = v => fmtDay(v);
  const DAY = 864e5, UMS = { day: DAY, week: 7 * DAY, month: 30.44 * DAY, quarter: 91.31 * DAY, year: 365.25 * DAY }, UNITS = Object.keys(UMS);
  const isoWeek = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / DAY - 3 + (w1.getDay() + 6) % 7) / 7); };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /** What a tick of each unit needs on screen, in px: [short label, long label] ("13" / "12 Aug", "Feb" / "Jan 2026", "Q3" / "Q1 2026"). */
  const NEED = { day: [20, 46], week: [40, 40], month: [30, 66], quarter: [26, 58], year: [40, 40] };
  /** The long label: the first tick, and where the larger unit turns (the 1st of a month, January, the first quarter). */
  const tlong = (u, t, i) => { if (!i) return true; const d = new Date(t); return u === 'day' ? d.getDate() === 1 : u === 'month' ? d.getMonth() === 0 : u === 'quarter' ? d.getMonth() < 3 : false; };
  const tfmt = (u, t, long) => { const d = new Date(t); return u === 'day' ? (long ? d.getDate() + ' ' + MON[d.getMonth()] : String(d.getDate())) : u === 'week' ? 'wk ' + isoWeek(t) : u === 'month' ? MON[d.getMonth()] + (long ? ' ' + d.getFullYear() : '') : u === 'quarter' ? 'Q' + (Math.floor(d.getMonth() / 3) + 1) + (long ? ' ' + d.getFullYear() : '') : String(d.getFullYear()); };
  /** The ticks of one unit (day, week from Monday, month, quarter, year) across [mn, mx]. */
  function unitTicks(u, mn, mx) { const out = [], d = new Date(mn); d.setHours(12, 0, 0, 0);
    if (u === 'week') { while (d.getDay() !== 1) d.setDate(d.getDate() - 1); } else if (u !== 'day') { d.setDate(1); if (u === 'quarter') d.setMonth(d.getMonth() - d.getMonth() % 3); if (u === 'year') d.setMonth(0); }
    for (let n = 0; +d <= mx + DAY / 2 && n < 1200; n++) { if (+d >= mn - DAY / 2) out.push(+d); if (u === 'day') d.setDate(d.getDate() + 1); else if (u === 'week') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + (u === 'month' ? 1 : u === 'quarter' ? 3 : 12)); }
    return out.length ? out : [mn]; }
  /** The unit from the span alone: before the room knows its size, and with "the axes tighten" off. */
  const spanUnit = (mn, mx) => { const days = (mx - mn) / DAY; return days > 500 ? 'month' : days > 45 ? 'week' : 'day'; };
  function niceTicks(mn, mx, n) { const span = mx - mn || 1, raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 5, 10].map(m => m * p).find(s => s >= raw) || p * 10, out = []; for (let v = Math.ceil(mn / step) * step; v <= mx + 1e-9; v += step) out.push(Math.round(v * 100) / 100); return out; }
  /** A number axis's ticks: a unit for time (A.unit), a count for the rest (A.nt). */
  function mkTicks(A, k) { if (A.dim === 'time') { A.unit = k; A.ticks = unitTicks(k, A.mn, A.mx).map((v, i) => { const lg = tlong(k, v, i); return { u: A.uv(v), v, long: lg, text: tfmt(k, v, lg) }; }); } else { A.nt = k; A.ticks = niceTicks(A.mn, A.mx, k).map(v => ({ u: A.uv(v), v, text: String(v) })); } A.grid = A.ticks.map(t => t.u).filter(u => u >= 0 && u <= 1); }
  function axisInfo(dim, vis, a) {
    const D = DIMS[dim];
    if (D.num) { const vals = vis.map(D.v), fmn = vals.length ? Math.min(...vals) : 0, fmx = vals.length ? Math.max(...vals) : 1; let mn = fmn, mx = fmx;
      if (dim === 'time' && TW) { const sp = Math.min(TW[1] - TW[0], fmx - fmn); if (sp >= fmx - fmn - 1) TW = null; else { mn = clamp(TW[0], fmn, fmx - sp); mx = mn + sp; TW = [mn, mx]; } }
      const A = { dim, a, num: true, mn, mx, full: [fmn, fmx], lim: 0, range: dim === 'time' ? (vals.length ? fmtT(fmn) + ' → ' + fmtT(fmx) : '') : fmn + ' → ' + fmx + ' threads' };
      A.uv = v => .03 + .94 * (v - A.mn) / ((A.mx - A.mn) || 1); A.u = d => A.uv(D.v(d));
      mkTicks(A, dim === 'time' ? spanUnit(mn, mx) : 5); return A; }
    const present = new Set(vis.map(D.v)), order = D.order().filter(x => present.has(x)); [...present].forEach(x => { if (!order.includes(x)) order.push(x); });
    const n = Math.max(1, order.length), at = new Map(order.map((c, i) => [c, i])), idx = d => at.get(D.v(d)) || 0;
    return { dim, a, num: false, cats: order, idx, u: d => (idx(d) + .5) / n, ticks: order.map((c, i) => ({ u: (i + .5) / n, v: c, text: D.name(c) })), grid: order.slice(1).map((c, i) => (i + 1) / n), lim: .36 / n, range: plural(n, 'band') };
  }
  const visible = d => ATLAS.st.kinds[d.type] && (d.type !== 'item' || !st.skOff.has(d.kind));
  function layout(anim) {
    if (!st.axes.includes('time')) TW = null;
    const vis = DOTS.filter(visible);
    VIS = new Set(vis.map(d => d.id));
    AX = st.axes.map((dim, a) => axisInfo(dim, vis, a));
    vis.forEach(d => { d.u = AX.map(A => A.u(d)); });
    const cats = [0, 1, 2].filter(a => !AX[a].num), groups = new Map();
    vis.forEach(d => { const key = AX.map((A, a) => A.num ? Math.round(d.u[a] * 40) : A.idx(d)).join('|'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(d); });
    groups.forEach(G => { G.sort((x, y) => x.t - y.t || (x.id < y.id ? -1 : 1)); const n = G.length;
      G.forEach((d, k) => { const off = [0, 0, 0];
        if (n > 1) { const f = (k + .5) / n;
          if (cats.length === 1) off[cats[0]] = (k / (n - 1) * 2 - 1) * AX[cats[0]].lim;
          else if (cats.length === 2) { const r = Math.sqrt(f), th = k * 2.39996; off[cats[0]] = r * Math.cos(th) * AX[cats[0]].lim; off[cats[1]] = r * Math.sin(th) * AX[cats[1]].lim; }
          else if (cats.length === 3) { const y = 1 - f * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = k * 2.39996, s = Math.cbrt(f); off[0] = rr * Math.cos(th) * s * AX[0].lim; off[1] = y * s * AX[1].lim; off[2] = rr * Math.sin(th) * s * AX[2].lim; }
          else [0, 1, 2].forEach(a => { off[a] = (hashf(d.id + a) - .5) * .05; }); }
        const p = [0, 1, 2].map(a => (d.u[a] + off[a]) * L3[a]); d.p0 = d.p ? d.p.slice() : p.slice(); d.p1 = p; if (!d.p) d.p = p.slice(); }); });
    // a bridge's far end: where its copy sits on the three axes (in its note, at its time, its origin's kind), else the middle of that note's dots
    const byNoteV = new Map(); vis.forEach(d => { if (!d.note) return; if (!byNoteV.has(d.note)) byNoteV.set(d.note, []); byNoteV.get(d.note).push(d); });
    THREADS.forEach(T => { if (T.k !== 'bridge') return; const o = BY.get(T.a), dd = M.doc(T.docB); T.pB0 = T.pB ? T.pB.slice() : null; T.pB1 = null; if (!o || !dd) return;
      const ph = { t: T.t || o.t, kind: o.kind, proj: dd.projectId || '_', note: T.docB, ntype: dd.type, term: o.term, who: o.who, status: 'none', deg: 0 };
      const u = AX.map(A => A.num ? clamp(A.dim === 'time' ? A.uv(ph.t) : A.uv(0), 0, 1) : (A.cats.includes(DIMS[A.dim].v(ph)) ? A.u(ph) : null));
      if (u.every(x => x != null)) T.pB1 = u.map((x, a) => x * L3[a]);
      else { const ns = byNoteV.get(T.docB); if (ns && ns.length) T.pB1 = [0, 1, 2].map(a => ns.reduce((sum, d) => sum + d.p1[a], 0) / ns.length); }
      if (!T.pB0) T.pB0 = T.pB1; T.pB = T.pB1; });
    animT0 = anim && !RM() ? performance.now() : -1e9;
    labelsBuild(); syncAxes(); side(); kick();
    if (st.pendingFly) { const d = BY.get(st.pendingFly); st.pendingFly = null; if (d && VIS.has(d.id)) flyTo(d); }
  }
  function labelsBuild() {
    if (!R) return; R.lab.replaceChildren();
    AX.forEach((A, a) => { axisLabels(A);
      A.title = h('span.a3-tt', { style: { '--ac': `var(--a3-ax${a})` } }, h('i', 'XYZ'[a]), DIMS[A.dim].label + (A.dim === 'time' ? ' → newer' : A.num ? ' → more' : '')); R.lab.append(A.title); A.title._w = A.title.offsetWidth; });
  }
  function axisLabels(A) { if (!R) return; (A.labs || []).forEach(el => el.remove()); A.lmode = null;
    A.labs = A.ticks.map(t => { const el = h('span.a3-tk', { title: t.text }, A.num ? t.text : snippet(t.text, 18)); R.lab.append(el); return el; }); A.labs.forEach(el => { el._w = el.offsetWidth; }); }
  /** The axes tighten as you go further: each frame, from how long each axis is on screen — time in days, weeks, months, quarters or years; numbers thinned; long names shortened. */
  function adapt() {
    const ap = EDGE();
    AX.forEach(A => { const a = A.a, po = P(...ap(a, 0)), pe = P(...ap(a, 1)), L = Math.hypot(pe[0] - po[0], pe[1] - po[1]) || 1, horiz = Math.abs((pe[0] - po[0]) / L) > .55; A.L = L;
      if (A.dim === 'time') { let u = spanUnit(A.mn, A.mx);
        if (tight()) { const pxms = L * .94 / Math.max(1, A.mx - A.mn), cur = A.unit;   // the finest unit whose (short) labels fit
          u = UNITS.find(un => (A.mx - A.mn) / UMS[un] < 600 && pxms * UMS[un] >= (horiz ? NEED[un][0] : 16) * (cur && UNITS.indexOf(un) < UNITS.indexOf(cur) ? 1.15 : 1)) || 'year'; }
        if (u !== A.unit) { mkTicks(A, u); axisLabels(A); } }
      else if (A.num) { const n = tight() ? clamp(Math.floor(L / (horiz ? 70 : 34)), 2, 12) : 5; if (n !== A.nt) { mkTicks(A, n); axisLabels(A); } }
      else { const sp = L / Math.max(1, A.cats.length), m = !tight() ? 'mid' : horiz ? (sp >= 150 ? 'full' : sp >= 80 ? 'mid' : 'short') : (sp >= 34 ? 'full' : sp >= 20 ? 'mid' : 'short');
        if (m !== A.lmode) { A.lmode = m; A.labs.forEach((el, i) => { const t = A.ticks[i].text; el.textContent = m === 'full' ? snippet(t, 30) : m === 'mid' ? snippet(t, 14) : snippet(t, 7); el._w = el.offsetWidth; }); } } });
  }

  /* ---------- a crowded room: beads as sprites on the canvas, found by where they are ---------- */
  const CROWD = 250, SPR = {};
  function sprite(k) {
    if (SPR[k]) return SPR[k]; const n = 64, cv = document.createElement('canvas'); cv.width = cv.height = n; const x = cv.getContext('2d'), col = kc(k), ink = COL.ink, m = n / 2;
    const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(.56, 'rgba(255,255,255,.08)'); g.addColorStop(.84, 'rgba(255,255,255,.24)'); g.addColorStop(.95, 'rgba(255,255,255,.46)'); g.addColorStop(.99, 'rgba(255,255,255,.78)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(m, m, m - 1, 0, 6.2832); x.fill();
    x.fillStyle = rgba(col, .3); x.beginPath(); x.arc(m, m * 1.12, m * .5, 0, 6.2832); x.fill(); x.fillStyle = rgb(col); x.beginPath(); x.arc(m, m * 1.12, m * .26, 0, 6.2832); x.fill();
    x.strokeStyle = rgba(ink, .24); x.lineWidth = 1.2; x.beginPath(); x.arc(m, m, m - 1.5, 0, 6.2832); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(m * .64, m * .5, m * .3, m * .17, -.66, 0, 6.2832); x.fill();
    return (SPR[k] = cv);
  }
  function pick(x, y) { let best = null, bd = Infinity; for (const d of SHOWN) { const r = d.rs + 3, dx = x - d.sx, dy = y - d.sy; if (dx * dx + dy * dy <= r * r && d.dep < bd) { bd = d.dep; best = d; } } return best; }
  const crowded = () => !!R && R.stage.classList.contains('crowd');
  const rectOf = d => ({ getBoundingClientRect: () => { const r = R.stage.getBoundingClientRect(); return { left: r.left + d.sx - d.rs, top: r.top + d.sy - d.rs, width: 2 * d.rs, height: 2 * d.rs }; } });

  /* ---------- the camera ---------- */
  function basis() { BS = { cy: Math.cos(cam.yaw), sy: Math.sin(cam.yaw), cp: Math.cos(cam.pitch), sp: Math.sin(cam.pitch) }; }
  function P(x, y, z) { x -= cam.t[0]; y -= cam.t[1]; z -= cam.t[2];
    const x1 = x * BS.cy - z * BS.sy, z1 = x * BS.sy + z * BS.cy, y2 = y * BS.cp + z1 * BS.sp, z2 = -y * BS.sp + z1 * BS.cp, d = DCAM + z2, f = DCAM / Math.max(4, d), s = unit * f;
    return [W / 2 + x1 * s, H / 2 - y2 * s, d, f]; }
  /** The room's size. A new size is taken only once it has held for 160 ms: whatever changes around the room (the side panel as a dot is read, a scrollbar coming and going)
      can never rock it frame by frame — the shaking Gabe saw was the room resizing with the panel, the dots moving off the pointer and back. */
  function size() { const r = R.stage.getBoundingClientRect(), w = Math.round(r.width), hh = Math.round(r.height), now = performance.now(); dpr = Math.min(2, devicePixelRatio || 1);
    if (w !== W || hh !== H) {
      if (!W || !H || !w || !hh) take(w, hh);
      else if (sizeWant && sizeWant[0] === w && sizeWant[1] === hh) { if (now - sizeWant[2] >= 160) take(w, hh); else setTimeout(kick, 180); }
      else { sizeWant = [w, hh, now]; setTimeout(kick, 180); } }
    else sizeWant = null;
    unit = Math.min(W, H) / (W < 600 ? 20 : 16.5) * cam.zoom; }
  function take(w, hh) { W = w; H = hh; sizeWant = null; R.cv.width = Math.max(1, W * dpr); R.cv.height = Math.max(1, H * dpr); }
  /** Where axis a's point u is drawn: X along the front edge of the floor, Z along its other front edge, the vertical one up the corner furthest left on screen. */
  function EDGE() { const [Lx, , Lz] = L3, zN = P(Lx / 2, 0, 0)[2] < P(Lx / 2, 0, Lz)[2] ? 0 : Lz, xN = P(0, 0, Lz / 2)[2] < P(Lx, 0, Lz / 2)[2] ? 0 : Lx;
    const yc = [[0, 0], [Lx, 0], [0, Lz], [Lx, Lz]].map(([x, z]) => ({ x, z, s: P(x, 0, z)[0] })).sort((a, b) => a.s - b.s)[0];
    return (a, u) => a === 0 ? [u * Lx, 0, zN] : a === 1 ? [yc.x, u * L3[1], yc.z] : [xN, 0, u * Lz]; }

  /* ---------- each frame (only while something moves) ---------- */
  const ease = t => 1 - Math.pow(1 - t, 3);
  const alText = d => d.alt || (d.alt = d.type === 'item' ? kl(d.kind) + ' · ' + snippet(d.raw, 24) : snippet(d.label, 28));
  function frame(now) {
    raf = 0; if (!R || !R.stage.isConnected || document.hidden) return;
    const dt = Math.min(80, now - (last || now)); last = now;
    size(); if (!W || !H) return; if (!COL) colors();
    if (fly) { const t = clamp((now - fly.t0) / 650, 0, 1), e = ease(t); cam.t = fly.from.t.map((v, i) => v + (fly.to.t[i] - v) * e); cam.zoom = fly.from.zoom + (fly.to.zoom - fly.from.zoom) * e; if (fly.to.yaw != null) { cam.yaw = fly.from.yaw + (fly.to.yaw - fly.from.yaw) * e; cam.pitch = fly.from.pitch + (fly.to.pitch - fly.from.pitch) * e; } if (t >= 1) fly = null; unit = Math.min(W, H) / (W < 600 ? 20 : 16.5) * cam.zoom; }
    basis();
    const la = clamp((now - animT0) / 750, 0, 1), le = ease(la), ct = cutT(), floatOn = !still();
    const shown = [];
    for (const d of DOTS) {
      const on = VIS.has(d.id) && d.t <= ct && (!TW || (d.t >= TW[0] - 1 && d.t <= TW[1] + 1));
      if (!on) { if (d.el && !d.el.hidden) d.el.hidden = true; if (st.hover === d) st.hover = null; continue; }
      if (la < 1) d.p = d.p0.map((v, i) => v + (d.p1[i] - v) * le); else d.p = d.p1;
      const q = P(d.p[0], d.p[1], d.p[2]); d.sx = q[0]; d.sy = q[1]; d.dep = q[2]; d.rr = d.rw * unit * q[3]; d.rs = clamp(d.rr, 4.5, 26); shown.push(d);
    }
    SHOWN = shown; const shownIds = new Set(shown.map(d => d.id));
    // the camera moving (turning, coming closer, flying) or the dots gliding to new axes: nothing opens by itself until the room has been still a moment
    const hd = hoverMs(), sig = cam.t.map(v => v.toFixed(3)).join() + '|' + cam.yaw.toFixed(4) + '|' + cam.pitch.toFixed(4) + '|' + cam.zoom.toFixed(4) + '|' + W + 'x' + H;
    if (sig !== camSig || la < 1) { camSig = sig; camAt = now; clearTimeout(restT); restT = setTimeout(kick, hd + 40); }
    // which open: the one you point at (once the pointer has rested on it a moment) or tapped, the pinned, then the nearest that came close (at most `cap` of them)
    const hovOpen = !!st.hover && (hd <= 0 || now - st.hoverAt >= hd || st.hover.k > .5), waiting = !!st.hover && !hovOpen;
    const want = new Set(); if (st.hover && hovOpen) want.add(st.hover.id); if (st.sel && VIS.has(st.sel.id)) want.add(st.sel.id); st.pins.forEach(id => { if (VIS.has(id)) want.add(id); });
    const OPEN_R = clamp(Math.min(W, H) * (+opt('near') || 5) / 100, 12, 44), cap = clamp(+opt('cap'), 0, 8);
    // one bubble per component: a component and its structures never stack the same bubble
    const usedB = new Set([...want].map(id => (BY.get(id) || {}).blockId).filter(Boolean));
    const auto = now - camAt < hd ? new Set([...AUTO].filter(id => shownIds.has(id) && !want.has(id)))
      : (() => { const out = new Set(), lim = Math.max(0, cap - st.pins.size); for (const d of shown.filter(d => d.rr >= OPEN_R && !want.has(d.id)).sort((a, b) => b.rr - a.rr)) { if (out.size >= lim) break; if (d.blockId && usedB.has(d.blockId)) continue; out.add(d.id); if (d.blockId) usedB.add(d.blockId); } return out; })();
    AUTO = auto;
    let dmin = Infinity, dmax = -Infinity; shown.forEach(d => { dmin = Math.min(dmin, d.dep); dmax = Math.max(dmax, d.dep); });
    const L = lit(), focus = [...want].map(id => BY.get(id)).filter(Boolean), near = new Set(); focus.forEach(F => (ADJ.get(F.id) || []).forEach(x => near.add(x.o)));
    // labels beside beads: what the bubble under the pointer connects to first, then the largest beads; none over another label or an open bubble
    const maxLab = ATLAS.st.only ? 24 : ({ none: 0, few: 8, many: 20 })[opt('labels')] ?? 8;
    const cand = [], labelled = new Set(), boxes = [], circles = shown.filter(d => d.k > .3 && d.ks).map(d => [d.sx, d.sy, d.D * d.ks / 2 + 6]);
    if (maxLab) { LABPREV.forEach(id => { const o = BY.get(id); if (o && shownIds.has(o.id)) cand.push(o); });
      if (st.hover && st.hover.sx != null) [...near].map(id => BY.get(id)).filter(o => o && o.sx != null && VIS.has(o.id) && o.t <= ct).slice(0, 4).forEach(o => cand.push(o));
      shown.filter(d => d.rs >= 11).sort((a, b) => b.rs - a.rs).forEach(d => cand.push(d));
      for (const d of cand) { if (labelled.size >= maxLab) break; if (labelled.has(d.id) || want.has(d.id) || auto.has(d.id)) continue;
        const w = Math.min(32, alText(d).length) * 6.3 + 12, x0 = d.sx + d.rs + 4, y0 = d.sy - 9, x1 = x0 + w, y1 = d.sy + 9;
        if (x1 > W - 4 || boxes.some(b => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) || circles.some(([cx, cy, r]) => Math.hypot(Math.max(x0, Math.min(cx, x1)) - cx, Math.max(y0, Math.min(cy, y1)) - cy) < r)) continue;
        boxes.push([x0, y0, x1, y1]); labelled.add(d.id); } }
    LABPREV = labelled;
    const crowd = shown.length > CROWD, amt = +opt('amount') || 3, beadsFloat = floatOn && !crowd;
    let settling = false, anyOpen = false;
    for (const d of shown) {
      const open = want.has(d.id) || auto.has(d.id), tk = open ? 1 : 0; d.k += (tk - d.k) * Math.min(1, dt / 110); if (Math.abs(tk - d.k) < .004) d.k = tk; else settling = true;
      if (d.k > 0) anyOpen = true;
      const fog = dmax > dmin ? 1 - .45 * (d.dep - dmin) / (dmax - dmin) : 1, dim = L ? (L.has(d.id) ? 1 : .16) : 1; d._fog = fog; d._dim = dim;
      // a crowded room draws its beads on the canvas: an element only for what is open, opening or labelled
      if (crowd && d.k <= 0 && !labelled.has(d.id)) { if (d.el && !d.el.hidden) d.el.hidden = true; continue; }
      if (!d.el) mountDot(d); if (d.el.hidden) d.el.hidden = false;
      const reading = st.hover === d || st.sel === d, ta = floatOn && !reading && (beadsFloat || d.k > 0) ? (.4 + .25 * d.k) * amt : 0; d.fa = d.fa == null || !floatOn ? ta : d.fa + (ta - d.fa) * Math.min(1, dt / 160); if (Math.abs(ta - d.fa) < .05) d.fa = ta; else settling = true;
      const amp = d.fa, fx = amp > .01 ? Math.cos(now * .00085 + d.phase * 1.7) * amp * .5 : 0, fy = amp > .01 ? Math.sin(now * .0012 + d.phase) * amp : 0;
      // only what changed is written (hundreds of dots turn at once)
      const tf = `translate(${(d.sx + fx).toFixed(1)}px,${(d.sy + fy).toFixed(1)}px)`; if (d._tf !== tf) { d._tf = tf; d.el.style.transform = tf; }
      const z = String(Math.round(2000 - d.dep * 20) + (d.k > .05 ? 2000 : 0) + (st.hover === d ? 2000 : 0)); if (d._z !== z) { d._z = z; d.el.style.zIndex = z; }
      const bs = `scale(${(2 * d.rs / 24).toFixed(2)})`; if (d._bs !== bs) { d._bs = bs; d.bd.style.transform = bs; }
      const bo = ((1 - d.k) * fog * dim).toFixed(2); if (d._bo !== bo) { d._bo = bo; d.bd.style.opacity = bo; }
      const pe = d.k > .6; if (d._pe !== pe) { d._pe = pe; d.bd.style.pointerEvents = pe ? 'none' : ''; }
      const isLit = near.has(d.id) && !open, isPin = st.pins.has(d.id), isHov = st.hover === d && d.k > .9;
      if (d._lit !== isLit) { d._lit = isLit; d.el.classList.toggle('lit', isLit); } if (d._pin !== isPin) { d._pin = isPin; d.el.classList.toggle('pin', isPin); } if (d._hov !== isHov) { d._hov = isHov; d.el.classList.toggle('hov', isHov); }
      const isWait = waiting && st.hover === d; if (d._wait !== isWait) { d._wait = isWait; d.el.classList.toggle('wait', isWait); if (isWait) d.el.style.setProperty('--hd', hd + 'ms'); } if (isWait) d.el.style.setProperty('--rs', d.rs.toFixed(1) + 'px');
      if (d.k > .002) {
        if (!d.ob) { const b = bubbleOf(d); d.D = b.el._g.D; d.ob = h('div.a3-ob', b.el); d.cap = h('div.a3-cap', h('b', b.cap[0]), h('span', b.cap[1])); d.el.append(d.ob, d.cap); }
        const full = Math.min(1, Math.min(W, H) * .8 / d.D), kt = st.hover === d || st.sel === d ? full : st.pins.has(d.id) ? full * .78 : clamp(d.rs / (OPEN_R * 1.55), .5, .85) * full;
        const ks = (2 * d.rs / d.D) + (kt - 2 * d.rs / d.D) * ease(d.k); d.ks = ks;
        d.ob.hidden = false; d.ob.style.transform = `scale(${ks.toFixed(4)})`; d.ob.style.opacity = (clamp(d.k * 1.6, 0, 1) * Math.max(dim, .35)).toFixed(3);
        d.cap.hidden = d.k < .6; if (!d.cap.hidden) { d.cap.style.transform = `translate(-50%,${(d.D * ks / 2 + 6).toFixed(1)}px)`; d.cap.style.opacity = clamp((d.k - .6) * 2.5, 0, 1).toFixed(2); }
      } else if (d.ob && !d.ob.hidden) { d.ob.hidden = true; d.cap.hidden = true; }
      const lab = labelled.has(d.id) && d.k < .3; if (d.al.hidden === lab) d.al.hidden = !lab; if (lab) { d.al.style.transform = `translate(${(d.rs + 5).toFixed(1)}px,-50%)`; d.al.style.opacity = (fog * dim).toFixed(2); }
    }
    if (R.stage.classList.contains('crowd') !== crowd) R.stage.classList.toggle('crowd', crowd);
    resolveThreads(shownIds, ct, le, la);
    adapt();
    draw(shown, focus, crowd, near, now, waiting ? clamp((now - st.hoverAt) / Math.max(1, hd), 0, 1) : -1);
    labelsPlace(ct);
    const pulsing = pulsesOn() && THREADS.some(T => T.on);
    if ((floatOn && (beadsFloat || anyOpen)) || settling || la < 1 || fly || (drag && drag.moved) || pinch || pulsing || (waiting && crowd)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && R && R.stage.isConnected) raf = requestAnimationFrame(frame); };
  /** Each thread's two ends on screen this frame (a bridge's origin is its component's dot, else a structure's dot from it; its far end the note's dot, else where the copy sits). */
  function resolveThreads(ids, ct, le, la) {
    const showB = opt('bridges') !== false, showW = opt('wires') !== false, isOn = d => !!d && ids.has(d.id);
    for (const T of THREADS) { T.on = false;
      if (T.k === 'bridge') { if (!showB || (T.t && T.t > ct)) continue; let A = BY.get(T.a); if (!isOn(A)) A = (ITEMS.get(T.a) || []).find(isOn); if (!A) continue;
        const cp = BY.get(T.br), nd = BY.get(T.docB); T.A = A;
        if (isOn(cp)) { T.B = cp; T.sb = [cp.sx, cp.sy]; }
        else if (isOn(nd)) { T.B = nd; T.sb = [nd.sx, nd.sy]; }
        else { const p = T.pB1 && (la < 1 && T.pB0 ? T.pB0.map((v, i) => v + (T.pB1[i] - v) * le) : T.pB1); if (!p) continue; const q = P(p[0], p[1], p[2]); T.B = null; T.sb = [q[0], q[1]]; } }
      else { if (!showW) continue; const A = BY.get(T.a), B = BY.get(T.b); if (!isOn(A) || !isOn(B)) continue; T.A = A; T.B = B; T.sb = [B.sx, B.sy]; }
      T.sa = [T.A.sx, T.A.sy]; const [ax, ay] = T.sa, [bx, by] = T.sb, len = Math.hypot(bx - ax, by - ay); if (len < 6) continue;
      const bend = Math.min(48, len * .18) * (T.k === 'bridge' ? 1 : .6); T.sc = [(ax + bx) / 2 - (by - ay) / len * bend, (ay + by) / 2 + (bx - ax) / len * bend]; T.len = len;
      const rim = d => d ? (d.k > .05 && d.ks && d.D ? Math.max(d.rs, d.D * d.ks / 2 * Math.min(1, d.k * 1.5)) : d.rs) : 5;
      T.t0 = Math.min(.45, (rim(T.A) + 2) / len); T.t1 = Math.max(.55, 1 - (rim(T.B) + 3) / len); T.on = true; }
  }
  const qpt = (T, t) => { const u = 1 - t; return [u * u * T.sa[0] + 2 * u * t * T.sc[0] + t * t * T.sb[0], u * u * T.sa[1] + 2 * u * t * T.sc[1] + t * t * T.sb[1]]; };
  /** The thread under (x, y) on screen, within tol px of its curve. */
  function threadAt(x, y, tol) {
    let best = null, bd = tol;
    for (const T of THREADS) { if (!T.on) continue; let p = qpt(T, T.t0);
      for (let i = 1; i <= 16; i++) { const q = qpt(T, T.t0 + (T.t1 - T.t0) * i / 16), vx = q[0] - p[0], vy = q[1] - p[1], l2 = vx * vx + vy * vy || 1, f = clamp(((x - p[0]) * vx + (y - p[1]) * vy) / l2, 0, 1), dd = Math.hypot(x - p[0] - f * vx, y - p[1] - f * vy); if (dd < bd) { bd = dd; best = T; } p = q; } }
    return best;
  }
  function mountDot(d) {
    const cls = d.img ? '.img' : d.type === 'note' ? '.note' : d.type === 'term' ? '.term' : d.type === 'paper' ? '.paper' : d.type === 'person' ? '.person' : '';
    let im = null; if (d.img) { const sp = BUBBLE.spec(d.blockId); im = sp && sp.imgs[0] ? sp.imgs[0].src : null; }
    d.bd = h('div.a3-bd' + (im ? cls : cls === '.img' ? '' : cls), { style: im ? { '--im': `url("${im}")` } : null, title: alText(d) });
    d.al = h('div.a3-al', { hidden: true }, alText(d));
    d.el = h('div.a3-dot' + (d.bridgeOf ? '.brc' : ''), { 'data-id': d.id, style: { '--kc': kcol(d.kind) } }, d.bd, d.al); R.dots.append(d.el);
  }

  /* ---------- a dot's bubble (14e): the component and its neighbours; a note, a term, a paper, a person with what they hold ---------- */
  const card = (id, head, label, body, len) => ({ id, head, label, body: h('div.bb-t', body), imgs: [], len: len || 20, open: false });
  const blocksOf = ids => ids.map(id => BUBBLE.spec(id)).filter(Boolean).map(spec => ({ spec, rel: '' }));
  function bubbleOf(d) {
    let centre = null, around = [], region = null, cap = [d.label || '', ''];
    const doc = d.docId && M.doc(d.docId);
    if (d.blockId) {
      centre = BUBBLE.spec(d.blockId) || card(d.id, kl(d.kind), '', d.label, 20);
      const nb = typeof TB !== 'undefined' ? TB.nb(d.blockId) : [];
      around = nb.map(n => ({ spec: BUBBLE.spec(n.id), rel: n.rel })).filter(a => a.spec);
      const rg = typeof REGION !== 'undefined' && REGION.of(d.blockId);
      if (rg) region = { name: rg.r.name, ids: nb.filter(n => { const x = REGION.of(n.id); return x && x.r.id === rg.r.id; }).map(n => n.id) };
      cap = [(doc && doc.title) || 'Untitled', kl(d.kind) + ' · ' + fmtDay(d.t) + (rg ? ' · region ' + rg.r.name : '') + (d.status === 'open' ? ' · open' : '')];
    } else if (d.type === 'note') {
      const bs = DB.where('blocks', b => b.docId === d.id && b.status === 'live' && b.kind !== 'ink' && b.kind !== 'ref').sort((a, b) => ms(M.blockTime(a)) - ms(M.blockTime(b)));
      centre = card(d.id, prof((doc || {}).type).label, '', (doc && doc.title) || 'Untitled', 24); around = blocksOf(bs.slice(0, 5).map(b => b.id));
      cap = [(doc && doc.title) || 'Untitled', prof((doc || {}).type).label.toLowerCase() + ' · ' + plural(bs.length, 'component')];
    } else if (d.type === 'term') {
      const occ = typeof TERMLIT !== 'undefined' ? TERMLIT.occ(d.id) : (IX.termOcc.get(d.id) || []), ids = [...new Set(occ.map(o => o.blockId))];
      centre = card(d.id, 'Term', '', [h('span.term-demo', d.label)], 14); around = blocksOf(ids.slice(0, 4));
      cap = [d.label, plural(occ.length, 'use')];
    } else {
      const ids = (d.nb || []).slice(0, 4), r = d.type === 'paper' && M.lib(d.id);
      centre = card(d.id, d.type === 'paper' ? 'Paper' : 'Person', '', d.type === 'paper' ? ((r && (r.title || r.url)) || d.label) : '@' + d.label, 40); around = blocksOf(ids);
      cap = [d.label, d.type === 'paper' ? 'cited in ' + plural((d.nb || []).length, 'component') : plural((d.nb || []).length, 'component')];
    }
    const arcNear = {}; ARCS.forEach(a => { if (d.blockId && a.from === d.blockId && around.some(x => x.spec.id === a.to)) arcNear[a.to] = TARC.K[a.k][1]; if (d.blockId && a.to === d.blockId && around.some(x => x.spec.id === a.from)) arcNear[a.from] = TARC.K[a.k][1]; });
    const el = BUBBLE.el({ key: 'a3' + d.id, centre, around, S: 1, region, arcNear, flat: false, ring: { on: false }, label: 'Port into ' + cap[0], onPort: (glass, e) => port(d, glass, e) });
    if (d.type === 'item') el.querySelectorAll(`.bb-c.c [data-item="${d.id}"]`).forEach(n => n.classList.add('a3-on'));
    return { el, cap };
  }

  /* ---------- the canvas: floor and walls (the far sides), the grid, the axes, shadows, threads, the arc, the reading lines ---------- */
  function draw(shown, focus, crowd, near, now, waitP) {
    const c = R.c2, [Lx, Ly, Lz] = L3, ink = COL.ink; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const xw = P(0, Ly / 2, Lz / 2)[2] > P(Lx, Ly / 2, Lz / 2)[2] ? 0 : Lx, zw = P(Lx / 2, Ly / 2, 0)[2] > P(Lx / 2, Ly / 2, Lz)[2] ? 0 : Lz;
    const poly = (pts, fill, stroke) => { c.beginPath(); pts.forEach((p, i) => { const q = P(...p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.stroke(); } };
    const seg = (a, b) => { const p = P(...a), q = P(...b); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); };
    c.lineWidth = 1;
    poly([[0, 0, 0], [Lx, 0, 0], [Lx, 0, Lz], [0, 0, Lz]], rgba(ink, .045), rgba(ink, .14));
    const walls = opt('room') !== false;
    if (walls) { poly([[0, 0, zw], [Lx, 0, zw], [Lx, Ly, zw], [0, Ly, zw]], rgba(ink, .03), rgba(ink, .1)); poly([[xw, 0, 0], [xw, 0, Lz], [xw, Ly, Lz], [xw, Ly, 0]], rgba(ink, .03), rgba(ink, .1)); }
    c.beginPath(); c.strokeStyle = rgba(ink, .085);
    AX[0].grid.forEach(u => { const x = u * Lx; seg([x, 0, 0], [x, 0, Lz]); if (walls) seg([x, 0, zw], [x, Ly, zw]); });
    if (walls) AX[1].grid.forEach(u => { const y = u * Ly; seg([0, y, zw], [Lx, y, zw]); seg([xw, y, 0], [xw, y, Lz]); });
    AX[2].grid.forEach(u => { const z = u * Lz; seg([0, 0, z], [Lx, 0, z]); if (walls) seg([xw, 0, z], [xw, Ly, z]); });
    c.stroke();
    const ct = cutT(), ap = EDGE();
    AX.forEach((A, a) => { const f = A.dim === 'time' ? clamp(A.uv(ct) + .03, 0, 1) : 1; const o = P(...ap(a, 0)), q = P(...ap(a, f)), col = rgb(COL.ax[a]);
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(q[0], q[1]); c.stroke();
      const ang = Math.atan2(q[1] - o[1], q[0] - o[0]); c.fillStyle = col; c.beginPath(); c.moveTo(q[0] + Math.cos(ang) * 9, q[1] + Math.sin(ang) * 9); c.lineTo(q[0] + Math.cos(ang + 2.6) * 7, q[1] + Math.sin(ang + 2.6) * 7); c.lineTo(q[0] + Math.cos(ang - 2.6) * 7, q[1] + Math.sin(ang - 2.6) * 7); c.closePath(); c.fill();
      c.lineWidth = 1.2; c.beginPath(); A.ticks.forEach(t => { if (A.dim === 'time' && t.v > ct) return; const p = P(...ap(a, t.u)); c.moveTo(p[0] - Math.sin(ang) * 4, p[1] + Math.cos(ang) * 4); c.lineTo(p[0] + Math.sin(ang) * 4, p[1] - Math.cos(ang) * 4); }); c.stroke(); });
    const o = P(0, 0, 0); c.fillStyle = rgba(ink, .55); c.beginPath(); c.arc(o[0], o[1], 3, 0, 6.2832); c.fill();
    (shown.length > 250 ? shown.filter(d => d.k > 0 || d === st.hover || st.pins.has(d.id)) : shown).forEach(d => { const s = P(d.p[0], 0, d.p[2]), r = Math.max(3, d.rw * unit * s[3] * (1 + d.k * 1.6)), lift = d.p[1] / L3[1]; c.fillStyle = rgba(ink, (.13 - lift * .07) * (1 - .4 * d.k)); c.beginPath(); c.ellipse(s[0], s[1], r, r * (.25 + .3 * BS.sp), 0, 0, 6.2832); c.fill(); });
    // the threads: bridges dashed in the bridges' green, connections in ink, an arrow at the far end, a light running from where each starts in the colour of what it carries
    { const thr = THREADS.filter(T => T.on), F0 = new Set(focus.map(F => F.id)), anyF = F0.size > 0 || !!st.th || !!st.tp, pul = pulsesOn(), cyc = 4200 / clamp(+opt('pulseSpeed') || 2, 1, 5), brc = COL.br;
      let nDraw = 0, nP = 0;
      for (const T of thr) {
        const touch = (T.A && F0.has(T.A.id)) || (T.B && F0.has(T.B.id)) || st.th === T || st.tp === T; if (!touch && ++nDraw > 600) continue;
        const al = anyF ? (touch ? 1 : .2) : .62, hot = st.th === T || st.tp === T, br = T.k === 'bridge', base = br ? brc : ink, col = tcolOf(T);
        c.lineWidth = hot ? 2.6 : br ? 1.5 : 1.2; c.strokeStyle = rgba(base, Math.min(1, (br ? .55 : .32) * al * (hot ? 1.6 : 1))); if (br) c.setLineDash([5, 4]);
        c.beginPath(); for (let i = 0; i <= 16; i++) { const p = qpt(T, T.t0 + (T.t1 - T.t0) * i / 16); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.setLineDash([]);
        const e = qpt(T, T.t1), e0 = qpt(T, T.t1 - .03), an = Math.atan2(e[1] - e0[1], e[0] - e0[0]), ah = hot ? 10 : 7.5;
        c.fillStyle = rgba(col, Math.min(1, .9 * Math.max(al, .3) * (hot ? 1.2 : 1))); c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[0] - Math.cos(an - .42) * ah, e[1] - Math.sin(an - .42) * ah); c.lineTo(e[0] - Math.cos(an + .42) * ah, e[1] - Math.sin(an + .42) * ah); c.closePath(); c.fill();
        if (br && !T.B) { c.strokeStyle = rgba(brc, .75 * al); c.lineWidth = 1.4; c.beginPath(); c.arc(T.sb[0], T.sb[1], 4.5, 0, 6.2832); c.stroke(); }
        if (pul && (touch || nP < 160)) { nP++; const s0 = ((now / cyc) + T.ph) % 1.6; if (s0 <= 1) for (let j = 0; j < 6; j++) { const tt = s0 - j * .028; if (tt < 0) break; const p = qpt(T, T.t0 + (T.t1 - T.t0) * tt); c.fillStyle = rgba(col, (1 - j / 6) * .95 * Math.max(al, .35)); c.beginPath(); c.arc(p[0], p[1], Math.max(.8, (hot ? 3.4 : 2.7) - j * .32), 0, 6.2832); c.fill(); } }
        else if (!pul) { const p = qpt(T, T.t0 + (T.t1 - T.t0) * .08); c.fillStyle = rgba(col, .9 * Math.max(al, .35)); c.beginPath(); c.arc(p[0], p[1], 2.6, 0, 6.2832); c.fill(); }
      }
      if (R.stage.dataset.threads !== String(thr.length)) R.stage.dataset.threads = thr.length; }
    if (crowd) { const order = shown.slice().sort((a, b) => b.dep - a.dep), teal = colorAt(R.probe, 'var(--teal)');
      for (const d of order) { if (d.k > .6) continue; const a = (1 - d.k) * d._fog * d._dim; if (a < .02) continue; const r = d.rs; c.globalAlpha = a; c.drawImage(sprite(d.kind), d.sx - r, d.sy - r, 2 * r, 2 * r); if (d.bridgeOf) { c.strokeStyle = rgba(COL.br, .9); c.lineWidth = 2; c.beginPath(); c.arc(d.sx, d.sy, r + 1.5, 0, 6.2832); c.stroke(); }
        if (near && near.has(d.id)) { c.globalAlpha = 1; c.strokeStyle = rgba(teal, .7); c.lineWidth = 2.5; c.beginPath(); c.arc(d.sx, d.sy, r + 1.5, 0, 6.2832); c.stroke(); } }
      c.globalAlpha = 1; }
    if (waitP >= 0 && st.hover && (!st.hover.el || st.hover.el.hidden)) { const d = st.hover, r = d.rs * (1.7 - .7 * waitP) + 3; c.strokeStyle = rgba(kc(d.kind), .25 + .65 * waitP); c.lineWidth = 1.6; c.beginPath(); c.arc(d.sx, d.sy, r, 0, 6.2832); c.stroke(); }
    let arcShown = null; const ON = id => VIS.has(id) && BY.get(id) && BY.get(id).sx != null && BY.get(id).t <= ct;
    const asThread = e => (e.kind === 'wire' && opt('wires') !== false) || (e.kind === 'link' && e.rel === 'links to' && opt('wires') !== false);
    focus.forEach(F => { if (F.sx == null || !VIS.has(F.id)) return; (ADJ.get(F.id) || []).forEach(x => { const O = BY.get(x.o); if (!O || !ON(O.id) || (!x.e.arc && asThread(x.e))) return;
      if (x.e.arc) { const A = BY.get(x.e.a), B = BY.get(x.e.b); if (!A || !B || !ON(A.id) || !ON(B.id)) return; const col = TARC.K[x.e.k], g = c.createLinearGradient(A.sx, A.sy, B.sx, B.sy); g.addColorStop(0, rgb(kc(col[0]))); g.addColorStop(1, rgb(kc(col[1])));
        const len = Math.hypot(B.sx - A.sx, B.sy - A.sy) || 1, bend = Math.min(60, len * .22), cx = (A.sx + B.sx) / 2 - (B.sy - A.sy) / len * bend, cy = (A.sy + B.sy) / 2 + (B.sx - A.sx) / len * bend;
        c.strokeStyle = g; c.lineWidth = 2.6; c.beginPath(); c.moveTo(A.sx, A.sy); c.quadraticCurveTo(cx, cy, B.sx, B.sy); c.stroke();
        const ta = Math.atan2(B.sy - cy, B.sx - cx), bx = B.sx - Math.cos(ta) * (B.rs + 2), by = B.sy - Math.sin(ta) * (B.rs + 2); c.fillStyle = rgb(kc(col[1])); c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - Math.cos(ta - .45) * 11, by - Math.sin(ta - .45) * 11); c.lineTo(bx - Math.cos(ta + .45) * 11, by - Math.sin(ta + .45) * 11); c.closePath(); c.fill();
        if (!arcShown) arcShown = { x: x.e, lx: cx + (cx - (A.sx + B.sx) / 2) * .35, ly: cy + (cy - (A.sy + B.sy) / 2) * .35 }; return; }
      c.strokeStyle = rgba(ink, F === st.hover ? .42 : .26); c.lineWidth = 1.2; c.beginPath(); c.moveTo(F.sx, F.sy); c.lineTo(O.sx, O.sy); c.stroke();
      if (F === st.hover && x.e.rel && x.e.rel !== 'in') { c.fillStyle = rgba(ink, .6); c.font = '10px ' + (getComputedStyle(R.stage).getPropertyValue('--f-m') || 'monospace'); c.fillText(x.e.rel, (F.sx + O.sx) / 2 + 4, (F.sy + O.sy) / 2 - 4); } }); });
    const R0 = st.hover || st.sel;
    if (R0 && R0.p && VIS.has(R0.id)) { const [x, y, z] = R0.p; c.setLineDash([4, 4]); c.strokeStyle = rgba(ink, .45); c.lineWidth = 1; c.beginPath(); seg([x, y, z], [x, 0, z]); if (walls) { seg([x, y, z], [x, y, zw]); seg([x, y, z], [xw, y, z]); } c.stroke(); c.setLineDash([]);
      (walls ? [[x, 0, z], [x, y, zw], [xw, y, z]] : [[x, 0, z]]).forEach(p => { const q = P(...p); c.fillStyle = rgba(ink, .5); c.beginPath(); c.arc(q[0], q[1], 2.4, 0, 6.2832); c.fill(); }); }
    const al = R.arcl;
    if (arcShown) { const x = arcShown.x, key = x.a + '>' + x.b;
      if (arcKey !== key) { arcKey = key; const via = TARC.through(x, []), [ka, kb, verb] = TARC.K[x.k];
        al.replaceChildren(h('span.l1', TARC.dot(x.k), KIND[ka].label + ' ' + verb), h('span', 'in ' + plural(x.days, 'day'), via.length ? [' · through ', h('span.term-demo', M.term(via[0]).label)] : null)); }
      al.hidden = false; const aw = al.offsetWidth / 2 + 6, ah = al.offsetHeight / 2 + 4; let lx = arcShown.lx, ly = arcShown.ly;
      shown.filter(d => d.k > .3 && d.ks).forEach(d => { const r = d.D * d.ks / 2 + ah, dx = lx - d.sx, dy = ly - d.sy, dist = Math.hypot(dx, dy) || 1; if (dist < r) { lx = d.sx + dx / dist * r; ly = d.sy + dy / dist * r; } });
      al.style.transform = `translate(${clamp(lx, aw, W - aw).toFixed(1)}px,${clamp(ly, ah, H - ah).toFixed(1)}px) translate(-50%,-50%)`; } else if (!al.hidden) { al.hidden = true; arcKey = ''; }
  }
  function labelsPlace(ct) {
    const pc = P(L3[0] / 2, L3[1] / 2, L3[2] / 2), ap = EDGE();
    AX.forEach((A, a) => { if (!A.labs) return; const po = P(...ap(a, 0)), pe = P(...ap(a, 1)), vx = pe[0] - po[0], vy = pe[1] - po[1], len = Math.hypot(vx, vy) || 1; let nx = -vy / len, ny = vx / len;
      if (nx * (pc[0] - po[0]) + ny * (pc[1] - po[1]) > 0) { nx = -nx; ny = -ny; }
      let pts = A.ticks.map(t => P(...ap(a, t.u))), horiz = Math.abs(vx / len) > .55, rul = false;
      // close up, the edge an axis runs along can be off screen: its ticks then follow you, as a ruler along the room's side, read through the point you look at
      const vin = pts.filter(p => p[0] > 8 && p[0] < W - 8 && p[1] > 8 && p[1] < H - 8).length;   // with room either side, so the ruler never flips on and off at its edge
      if (A._rul ? cam.zoom > 1.5 && vin < 3 : cam.zoom > 1.6 && vin < 2) {
        const fl = u => a === 0 ? [u * L3[0], cam.t[1], cam.t[2]] : a === 1 ? [cam.t[0], u * L3[1], cam.t[2]] : [cam.t[0], cam.t[1], u * L3[2]];
        const f0 = P(...fl(0)), f1 = P(...fl(1)), fh = Math.abs(f1[0] - f0[0]) >= Math.abs(f1[1] - f0[1]), band = fh ? (a === 2 ? 52 : 28) : (a === 2 ? W - 64 : 52);
        pts = A.ticks.map(t => { const q = P(...fl(t.u)); return fh ? [q[0], H - band] : [band, q[1]]; }); nx = 0; ny = 0; horiz = fh; rul = true; }
      if (A._rul !== rul) { A._rul = rul; A.labs.forEach(el => el.classList.toggle('rul', rul)); }
      const items = A.ticks.map((t, i) => { const el = A.labs[i]; if (!el) return null; const x = pts[i][0] + nx * 16, y = pts[i][1] + ny * 16, hw = (el._w || 40) / 2 + 4;
        return { el, x, y, hw, v: t.v, long: !!t.long, ok: x > -hw && x < W + hw && y > -8 && y < H + 8 && t.u >= -.001 && t.u <= 1.001 && !(A.dim === 'time' && t.v > ct) }; }).filter(Boolean);
      // time: the first tick in view always says its month / year in full ("21 Nov", "Jan 2026", "Q1 2026"), whatever has scrolled out before it
      if (A.dim === 'time') { const fo = items.find(o => o.ok); items.forEach(o => { const lg = o.long || o === fo; if (o.el._lg !== lg) { o.el._lg = lg; o.el.textContent = tfmt(A.unit, o.v, lg); o.el._w = o.el.offsetWidth; o.hw = o.el._w / 2 + 4; } o.long = lg; }); }
      const kept = [], touch = (p, q) => horiz ? Math.abs(p.x - q.x) < p.hw + q.hw + 4 : Math.abs(p.y - q.y) < 16;
      [...items.filter(o => o.ok && o.long), ...items.filter(o => o.ok && !o.long)].forEach(o => { if (!kept.some(k => touch(k, o))) kept.push(o); });
      const keep = new Set(kept); items.forEach(o => { const sh = keep.has(o); if (o.el.hidden === sh) o.el.hidden = !sh; if (sh) o.el.style.transform = `translate(${clamp(o.x, o.hw, W - o.hw).toFixed(1)}px,${o.y.toFixed(1)}px) translate(-50%,-50%)`; });
      const f = A.dim === 'time' ? clamp(A.uv(ct) + .03, 0, 1) : 1, tw = (A.title._w || 80) / 2 + 4; let tx, ty;
      if (a === 1) { tx = po[0] + vx * f + vx / len * 22; ty = po[1] + vy * f + vy / len * 22; } else { tx = po[0] + vx * f * .5 + nx * 56; ty = po[1] + vy * f * .5 + ny * 56; }
      A.title.style.transform = `translate(${clamp(tx, tw, W - tw).toFixed(1)}px,${clamp(ty, 12, H - 12).toFixed(1)}px) translate(-50%,-50%)`; });
  }

  /* ---------- pointing, tapping, turning, coming closer ---------- */
  const timeAx = () => AX.find(x => x.dim === 'time');
  /** The camera closer or further, toward a point on screen (what is under the pointer stays under it); returns the part of f it could not take. */
  function camZoom(f, sx, sy, zmax) { const z0 = cam.zoom, z1 = clamp(z0 * f, .5, zmax); if (z1 === z0) return f;
    if (sx != null && BS && unit > 0) { const x1 = (sx - W / 2) / unit, y2 = -(sy - H / 2) / unit, y = y2 * BS.cp, z1w = y2 * BS.sp, x = x1 * BS.cy + z1w * BS.sy, z = -x1 * BS.sy + z1w * BS.cy, k = 1 - z0 / z1;
      cam.t = [clamp(cam.t[0] + x * k, -1, L3[0] + 1), clamp(cam.t[1] + y * k, -1, L3[1] + 1), clamp(cam.t[2] + z * k, -1, L3[2] + 1)]; }
    cam.zoom = z1; return f / (z1 / z0); }
  /** The time window shown on the time axis (null: all of it). The dots keep their places on the other axes; what falls outside is hidden. */
  function setWindow(w) {
    const A = timeAx(); if (!A) { TW = null; return; } const [f0, f1] = A.full;
    if (!w || w[1] - w[0] >= f1 - f0 - 1) { TW = null; A.mn = f0; A.mx = f1; } else { const sp = Math.max(SPAN_MIN, w[1] - w[0]); A.mn = clamp(w[0], f0, Math.max(f0, f1 - sp)); A.mx = A.mn + sp; TW = [A.mn, A.mx]; }
    const ia = A.a; VIS.forEach(id => { const d = BY.get(id); if (!d || !d.u || !d.p1) return; d.u[ia] = A.uv(d.t); const v = d.u[ia] * L3[ia]; d.p1[ia] = v; if (d.p) d.p[ia] = v; if (d.p0) d.p0[ia] = v; });
    THREADS.forEach(T => { if (T.k !== 'bridge' || !T.pB1) return; const o = BY.get(T.a), v = clamp(A.uv(T.t || (o && o.t) || A.mn), 0, 1) * L3[ia]; T.pB1[ia] = v; if (T.pB0) T.pB0[ia] = v; });
    mkTicks(A, A.unit || spanUnit(A.mn, A.mx)); axisLabels(A); side(); kick();
  }
  /** Coming closer past the room's 1.6×: time spreads, the dot nearest the pointer keeping its place; returns what is left when it is all shown again. */
  function spread(f, sx, sy) {
    const A = timeAx(); if (!A) return f; const [f0, f1] = A.full, cur = TW || [f0, f1], sp = cur[1] - cur[0], want = sp / f;
    let anchor = (cur[0] + cur[1]) / 2;
    if (sx != null) { let best = null, bd = Infinity; for (const d of SHOWN) { const q = (d.sx - sx) ** 2 + (d.sy - sy) ** 2; if (q < bd) { bd = q; best = d; } } if (best) anchor = clamp(best.t, cur[0], cur[1]); }
    const fr = (anchor - cur[0]) / (sp || 1), nsp = clamp(want, SPAN_MIN, f1 - f0); setWindow([anchor - fr * nsp, anchor - fr * nsp + nsp]);
    return want > f1 - f0 ? (f1 - f0) / want : 1;
  }
  /** Closer or further. With Time on an axis the room grows to 1.6×, then time spreads (down to about nine days across); further back, time gathers first. */
  const zoomBy = (f, sx, sy) => { fly = null;
    if (!timeAx()) camZoom(f, sx, sy, ZMAX);
    else if (f > 1) { const left = camZoom(f, sx, sy, ZT); if (left > 1.0001) spread(left, sx, sy); }
    else { const left = TW ? spread(f, sx, sy) : f; if (left < .9999) camZoom(left, sx, sy, ZT); }
    kick(); };
  /** Shift+wheel: the time window slides through time. */
  const panTime = dlt => { if (!TW) return false; const sp = TW[1] - TW[0], dt = dlt * sp * .0012; setWindow([TW[0] + dt, TW[1] + dt]); return true; };
  function flyTo(d) { if (TW && (d.t < TW[0] || d.t > TW[1])) { const sp = TW[1] - TW[0]; setWindow([d.t - sp / 2, d.t + sp / 2]); }
    fly = { t0: performance.now(), from: { t: cam.t.slice(), zoom: cam.zoom }, to: { t: (d.p1 || d.p).slice(), zoom: Math.max(cam.zoom, timeAx() ? ZT : 2.3) } }; st.sel = d; ATLAS.st.focus = d.id; selRender(); kick(); }
  function resetView() { if (TW) setWindow(null); fly = { t0: performance.now(), from: { t: cam.t.slice(), zoom: cam.zoom, yaw: cam.yaw, pitch: cam.pitch }, to: { t: CAM0.t.slice(), zoom: CAM0.zoom, yaw: CAM0.yaw, pitch: CAM0.pitch } }; kick(); }
  const stopDwells = () => { navAt = Date.now(); BUBBLE._scrollAt = navAt; R && R.dots.querySelectorAll('.bb.dwell').forEach(x => x._stopDwell && x._stopDwell()); };
  /** Shift+drag (or two fingers): the room slides with the pointer — the point you look at moves across, in the plane of the screen. */
  function panBy(dx, dy) { if (!BS || !(unit > 0) || (!dx && !dy)) return; fly = null;
    const x1 = -dx / unit, y2 = dy / unit, y = y2 * BS.cp, z1 = y2 * BS.sp, x = x1 * BS.cy + z1 * BS.sy, z = -x1 * BS.sy + z1 * BS.cy;
    cam.t = [clamp(cam.t[0] + x, -L3[0] * .5, L3[0] * 1.5), clamp(cam.t[1] + y, -L3[1] * .5, L3[1] * 1.5), clamp(cam.t[2] + z, -L3[2] * .5, L3[2] * 1.5)]; kick(); }
  /** The scale a dot's bubble opens to when you rest on it. */
  const openKs = d => Math.min(1, Math.min(W, H) * .8 / (d.D || 1));
  /** The dot the pointer is on, from where the dots are. The one already pointed at keeps the pointer while it stays within the size its bubble opens to (not the size it has
      this frame), with room to spare: a bubble opening, floating or closing under a resting pointer never flips it. Then an open bubble under the pointer, the front-most; then a bead. */
  // a bead is taken within rs + 3 (pick) and let go only beyond rs + 8; an open bubble within the size it opens to, + 10
  function pointAt(x, y) {
    const c = st.hover;
    if (c && c.sx != null && SHOWN.includes(c)) { const rr = c.k > .02 && c.D ? Math.max(c.rs + 8, c.D * openKs(c) / 2) + 10 : c.rs + 8; if ((x - c.sx) ** 2 + (y - c.sy) ** 2 <= rr * rr) return c; }
    let best = null, bz = -Infinity;
    for (const d of SHOWN) if (d !== c && d.k > .5 && d.ks && d.D) { const rr = d.D * d.ks / 2; if ((x - d.sx) ** 2 + (y - d.sy) ** 2 <= rr * rr) { const z = +(d._z || 0); if (z > bz) { bz = z; best = d; } } }
    return best || pick(x, y);
  }
  /** The dot under the pointer: its bubble opens only once the pointer has rested on it a moment (a ring closes in meanwhile). */
  function setHover(d) { if (st.hover === d) return; st.hover = d; st.hoverAt = performance.now(); if (d && R) { const r = R.stage.getBoundingClientRect(); roomAt = [r.left, r.top]; } clearTimeout(hoverT); if (d) hoverT = setTimeout(kick, hoverMs() + 30); selRender(); kick(); }
  /** The thread under the pointer: lit at once, its popup after the same moment. */
  function setThread(T) { if (st.th === T) return; st.th = T; clearTimeout(thT); if (R) R.stage.classList.toggle('onth', !!T); if (T && T !== st.tp) thT = setTimeout(() => { if (st.th === T) openTP(T); }, hoverMs()); kick(); }
  function wire(stage) {
    stage.addEventListener('pointerdown', e => { lastPX = e.clientX; lastPY = e.clientY; if (BUBBLE._porting || e.target.closest('.a3-tools,.bb-bead,.a3-tp')) return; if (st.tp) closeTP(); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, target: e.target.closest('.a3-dot'), glass: !!e.target.closest('.bb-g'), type: e.pointerType };
      else { if (drag) drag.moved = true; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; } });
    stage.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()], nd = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, r = stage.getBoundingClientRect(), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        panBy(mx - pinch.mx, my - pinch.my); pinch.mx = mx; pinch.my = my; zoomBy(nd / pinch.d, mx - r.left, my - r.top); pinch.d = nd; stopDwells(); return; }
      if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5) { drag.moved = true; stopDwells(); try { stage.setPointerCapture(e.pointerId); } catch (x) { } stage.classList.add('dragging'); fly = null; }
      if (drag.moved) { navAt = BUBBLE._scrollAt = Date.now(); const pan = e.shiftKey; if (stage.classList.contains('panning') !== pan) stage.classList.toggle('panning', pan);
        if (pan) panBy(e.clientX - drag.lx, e.clientY - drag.ly); else { cam.yaw += (e.clientX - drag.lx) * .008; cam.pitch = clamp(cam.pitch + (e.clientY - drag.ly) * .006, .06, 1.25); }
        drag.lx = e.clientX; drag.ly = e.clientY; kick(); } });
    const up = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size) return;
      const d0 = drag; drag = null; stage.classList.remove('dragging', 'panning'); if (!d0) return; if (d0.moved) { justDragged = Date.now(); kick(); return; } if (e.type === 'pointercancel') return;
      if (d0.target) { const d = BY.get(d0.target.dataset.id); if (!d) return;
        if (e.shiftKey) { st.pins.has(d.id) ? st.pins.delete(d.id) : st.pins.add(d.id); selRender(); kick(); return; }
        if (d0.glass) return;   // the open bubble's own click ports in (14e)
        if (d0.type === 'mouse' || d.k > .5) port(d, d.bd, e); else { st.sel = d; ATLAS.st.focus = d.id; selRender(); kick(); } }
      else { const r = stage.getBoundingClientRect(), d = crowded() ? pick(e.clientX - r.left, e.clientY - r.top) : null;
        if (!d) { const T = threadAt(e.clientX - r.left, e.clientY - r.top, d0.type === 'mouse' ? 8 : 16); if (T) { openTP(T); return; } }
        if (d) { if (e.shiftKey) { st.pins.has(d.id) ? st.pins.delete(d.id) : st.pins.add(d.id); selRender(); kick(); return; } if (d0.type === 'mouse' || d.k > .5) port(d, rectOf(d), e); else { st.sel = d; ATLAS.st.focus = d.id; selRender(); kick(); } return; }
        st.sel = null; ATLAS.st.focus = null; selRender(); kick(); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    // Shift+click pins (and a click right after turning the room does nothing): stopped before the bubble's own click
    stage.addEventListener('click', e => { if (!e.target.closest('.a3-dot')) return; if (e.shiftKey || Date.now() - justDragged < 300) { e.stopPropagation(); e.preventDefault(); } }, true);
    // a dot is pointed at only when the pointer really moves (a bead drawn under a resting pointer, or a page scrolled under it, opens nothing), and which dot it is
    // comes from where the dots are (pointAt), not from the element under the pointer: an opening, floating or closing bubble never takes the pointer away from itself
    stage.addEventListener('pointermove', e => { if (!moved(e) || (drag && drag.moved) || pinch) return; const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      // the thread's popup: inside it nothing changes; moving well away closes it
      if (st.tp && !R.tp.hidden) { const b = R.tp.getBoundingClientRect(), off = Math.max(b.left - e.clientX, e.clientX - b.right, b.top - e.clientY, e.clientY - b.bottom); if (off <= 4) return; if (off > 70 && st.th !== st.tp && !(threadAt(x, y, 10) === st.tp)) closeTP(); }
      if (e.target.closest('.a3-tools,.a3-tp') || Date.now() - navAt < 350) return;
      const d = pointAt(x, y); stage.classList.toggle('over', !!d); if (d !== st.hover) setHover(d);
      const tol = e.pointerType === 'mouse' ? 7 : 14; setThread(d ? null : st.th && st.th.on && threadAt(x, y, tol * 2) === st.th ? st.th : threadAt(x, y, tol)); });
    stage.addEventListener('pointerleave', () => { if (st.hover) setHover(null); setThread(null); if (st.tp) closeTP(); });
    stage.addEventListener('wheel', e => { if (e.target.closest('.a3-tp')) return; e.preventDefault(); stopDwells(); if (e.shiftKey) { panTime(e.deltaY || e.deltaX); return; } const r = stage.getBoundingClientRect(); zoomBy(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    stage.addEventListener('keydown', e => { const k = e.key; if (e.shiftKey && /^Arrow/.test(k)) { panBy(k === 'ArrowLeft' ? 40 : k === 'ArrowRight' ? -40 : 0, k === 'ArrowUp' ? 40 : k === 'ArrowDown' ? -40 : 0); e.preventDefault(); return; } if (k === 'ArrowLeft' || k === 'ArrowRight') { cam.yaw += (k === 'ArrowLeft' ? -.08 : .08); e.preventDefault(); kick(); } else if (k === 'ArrowUp' || k === 'ArrowDown') { cam.pitch = clamp(cam.pitch + (k === 'ArrowUp' ? -.06 : .06), .06, 1.25); e.preventDefault(); kick(); } else if (k === '+' || k === '=') zoomBy(1.2); else if (k === '-') zoomBy(1 / 1.2); else if (k === '0') resetView(); });
    new ResizeObserver(() => kick()).observe(stage);
    // a scroll (the page's, the side panel's, a late one from before) counts only if it moved the room: then what was under the pointer has slid away, and the rest is cancelled
    addEventListener('scroll', () => { if (!R || !stage.isConnected) return; const r = stage.getBoundingClientRect();
      if (roomAt && (Math.abs(r.left - roomAt[0]) > 1.5 || Math.abs(r.top - roomAt[1]) > 1.5)) { navAt = Date.now(); roomAt = [r.left, r.top]; if (st.hover) setHover(null); } }, { capture: true, passive: true });
  }
  function room() {
    if (R) return R;
    const stage = h('div.a3-room', { tabindex: '0', 'aria-label': 'The Atlas: drag to turn, Shift+drag to move it, the wheel or a pinch to come closer, arrow keys turn it (Shift: move), 0 sets it back' });
    const cv = h('canvas.a3-cv'), lab = h('div.a3-lab'), dots = h('div.a3-dots'), arcl = h('div.a3-arcl', { hidden: true }), probe = h('i.a3-probe'), tp = h('div.a3-tp', { hidden: true, role: 'dialog', 'aria-label': 'A thread: its two ends' });
    const tools = h('div.a3-tools', h('button', { type: 'button', title: 'Closer (+)', on: { click: () => zoomBy(1.25) } }, '+'), h('button', { type: 'button', title: 'Further (−)', on: { click: () => zoomBy(1 / 1.25) } }, '−'), h('button', { type: 'button', title: 'As it was (0)', on: { click: resetView } }, '⟲'));
    dots.append(arcl); stage.append(cv, lab, dots, tp, tools, h('div.a3-hint', 'drag: turn · Shift+drag: move · wheel: closer, then time spreads · Shift+wheel: through time · rest on a dot or thread: it opens · click: port in'), probe);
    R = { stage, cv, c2: cv.getContext('2d'), lab, dots, arcl, probe, tp }; wire(stage);
    const recolor = () => { COL = null; Object.keys(SPR).forEach(k => delete SPR[k]); DOTS.forEach(d => { if (d.el) d.el.style.setProperty('--kc', kcol(d.kind)); }); kick(); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    return R;
  }

  /* ---------- port in: visit the note (the back bubble brings you here as you left it) ---------- */
  function port(d, glass, e) {
    if (BUBBLE._porting || Date.now() - justDragged < 300) return;
    const v = ATLAS.G && ATLAS.G.byId.get(d.id), S = ATLAS.st;
    if (S.action !== 'open' && S.from && v) return ATLAS.act(v);
    if (e && e.altKey && d.blockId) { const lastDoc = BUBBLE.lastDoc, b = M.block(d.blockId); if (lastDoc && b && lastDoc !== b.docId && M.doc(lastDoc) && typeof SplitView !== 'undefined') { PANES[1] && (PANES[1].pendingFocus = { reveal: d.blockId }); return App.go(SplitView.route([lastDoc, b.docId], d.blockId)); } }
    BUBBLE.back.arm({ hash: '#/atlas', label: 'Atlas', text: 'Back to the Atlas · Esc' });
    const go = () => d.blockId ? App.openComponent(d.blockId) : d.type === 'note' ? App.go('#/doc/' + d.id) : v && v.go ? v.go() : null;
    BUBBLE.port(glass || d.bd, go);
  }

  function portTo(blockId, glass, e) {
    const b = blockId && M.block(blockId); if (!b || BUBBLE._porting) return;
    if (e && e.altKey) { const lastDoc = BUBBLE.lastDoc; if (lastDoc && lastDoc !== b.docId && M.doc(lastDoc) && typeof SplitView !== 'undefined') { PANES[1] && (PANES[1].pendingFocus = { reveal: blockId }); return App.go(SplitView.route([lastDoc, b.docId], blockId)); } }
    BUBBLE.back.arm({ hash: '#/atlas', label: 'Atlas', text: 'Back to the Atlas · Esc' }); st.tp = null;
    BUBBLE.port(glass, () => App.openComponent(blockId));
  }

  /* ---------- a thread's popup: its two ends as bubbles with what is near them, the pulse between, why, every note it bridges to or from ---------- */
  /** One end, large: its component and the components near it, drawn to the column's width (`fit`), with as many neighbours as still let the cards read at about
      normal size (≥ 1.2× the bubble's own, ≈ 11.5 px text); the rest are counted. */
  function endOf(blockId, head, sub, key) {
    const spec = blockId && BUBBLE.spec(blockId), box = h('div.a3-tps', { 'data-end': key }, h('b', head), h('span', sub)); box.fit = () => {};
    if (!spec) return box;
    const nb = typeof TB !== 'undefined' ? TB.nb(blockId) : [], all = nb.map(n => ({ spec: BUBBLE.spec(n.id), rel: n.rel })).filter(a => a.spec);
    box.fit = colw => {
      let n = Math.min(6, all.length); for (; n > 0; n--) if (colw / BUBBLE.geometry(spec, all.slice(0, n), 1).D >= 1.2) break;
      const el = BUBBLE.el({ key: 'a3tp' + key + blockId, centre: spec, around: all.slice(0, n), S: 1, flat: false, ring: { on: false }, label: 'Port into ' + head, onPort: (g, e) => portTo(blockId, g, e) });
      const D = el._g.D, k = clamp(colw / D, .55, 1.9); box._k = k; box._D = D * k;
      box.replaceChildren(h('div.a3-tpb', { style: { width: (D * k).toFixed(1) + 'px', height: (D * k).toFixed(1) + 'px' } }, h('div.a3-tpo', { style: { transform: `scale(${k.toFixed(3)})` } }, el)),
        h('b', head), h('span', sub), all.length > n ? h('em.a3-tpm', '+ ' + plural(all.length - n, 'more component') + ' near it in the note') : null); };
    return box;
  }
  function openTP(T) {
    if (!R || !T || !T.on) return; clearTimeout(thT); st.tp = T;
    const A = T.A, aid = A.blockId || null, col = rgb(tcolOf(T)), ttl = d => snippet((d && d.title) || 'Untitled', 40), br = T.k === 'bridge';
    const docA = M.doc(br ? T.docA : (A.docId || A.id)), B = T.B, bid = br ? T.br : (B && B.blockId) || null, docB = M.doc(br ? T.docB : B && (B.docId || B.id));
    const what = X => X.type === 'item' ? kl(X.kind) + ': ' + snippet(X.raw, 40) : X.blockId ? M.blockName(M.block(X.blockId) || {}) : snippet(X.label, 40);
    const list = [];
    if (br) { const o = M.block(T.a); if (o) { list.push({ dir: 'from', doc: M.doc(o.docId), id: o.id, sub: M.blockName(o) }); BRIDGE.out(T.a).forEach(x => list.push({ dir: 'to', doc: M.doc(x.docId), id: x.id, sub: x.why ? '“' + snippet(x.why, 60) + '”' : 'bridged' })); } }
    else [A, B].forEach(X => { const o = X && X.blockId && M.block(X.blockId); if (!o) return; list.push({ dir: X === A ? 'from' : 'to', doc: M.doc(o.docId), id: o.id, sub: M.blockName(o) }); if (typeof BRIDGE !== 'undefined') BRIDGE.out(o.id).forEach(x => list.push({ dir: 'to', doc: M.doc(x.docId), id: x.id, sub: 'bridged · ' + M.blockName(o) })); });
    const endA = endOf(aid, ttl(docA), what(A), 'a'), endB = endOf(bid, ttl(docB), br ? 'where it shows · ' + fmtDay(T.t) : B ? what(B) : '', 'b');
    const arrow = h('div.a3-tpa', { style: { '--pc': col }, 'aria-hidden': 'true' }, BUBBLE.svg('svg', { viewBox: '0 0 56 24' }, '<path class="ln" d="M3 12 H44"/><path class="hd" d="M42 5 L54 12 L42 19 Z"/>'));
    R.tp.replaceChildren(...[
      h('div.a3-tph', h('span.a3-tpk', { style: { '--pc': col } }, h('i'), br ? 'Bridge' : 'Connection' + (T.rel ? ' · ' + T.rel : '')), h('span.a3-tpw', ttl(docA) + (docB && docB !== docA ? ' → ' + ttl(docB) : '')), h('button.a3-tpx', { type: 'button', title: 'Close (Esc)', 'aria-label': 'Close', on: { click: () => closeTP() } }, '×')),
      br && T.why ? h('div.a3-tpy', '“' + T.why + '”') : null,
      h('div.a3-tpr', endA, arrow, endB),
      list.length ? h('div.a3-tpl', h('h4', br ? 'It is bridged from and to' : 'Its notes, and where it is bridged'), list.filter(x => x.doc).map(x => h('button', { type: 'button', 'data-to': x.id, title: 'Port into ' + ttl(x.doc), on: { click: e => portTo(x.id, e.currentTarget, e) } }, h('em', x.dir === 'from' ? '← from' : '→ to'), h('b', ttl(x.doc)), h('span', x.sub)))) : null].filter(Boolean));
    // big, over most of the room (the whole width on a phone, the ends one above the other); each end drawn to its column's width
    const narrow = W < 600; R.tp.classList.toggle('still', !pulsesOn()); R.tp.classList.toggle('narrow', narrow); R.tp.hidden = false; R.tp.scrollTop = 0;
    const row = R.tp.querySelector('.a3-tpr'), rw = row ? row.clientWidth : W * .8, colw = narrow ? Math.min(rw, Math.max(220, H * .62)) : Math.max(160, (rw - 80 - 12) / 2);
    endA.fit(colw * .97); endB.fit(colw * .97);
    kick();
  }
  function closeTP() { st.tp = null; if (R && R.tp) { R.tp.hidden = true; R.tp.replaceChildren(); } kick(); }

  /* ---------- the bar's second row: the axes, the presets ---------- */
  let AXROW = null;
  function saveAxes() { saveSettings({ atlasAxes: st.axes.slice() }); }
  function setAxis(a, dim) { const b = st.axes.indexOf(dim); if (b >= 0 && b !== a) st.axes[b] = st.axes[a]; st.axes[a] = dim; saveAxes(); layout(true); }
  function axesRow() {
    const sel = a => h('label.a3-axp', { style: { '--ac': `var(--a3-ax${a})` } }, h('b', 'XYZ'[a]), h('select.inp', { 'aria-label': 'XYZ'[a] + ' axis', 'data-a': a, on: { change: e => setAxis(a, e.target.value) } }, Object.entries(DIMS).map(([k, D]) => h('option', { value: k, selected: st.axes[a] === k }, D.label))));
    const pre = h('div.a3-pre', PRESETS.map(([id, label, axes]) => h('button.at-chip.act', { type: 'button', 'data-p': id, title: axes.map((x, i) => 'XYZ'[i] + ' ' + DIMS[x].label).join(' · '), on: { click: () => { st.axes = axes.slice(); saveAxes(); layout(true); } } }, label)));
    AXROW = h('div.a3-axes', h('span.a3-axl', 'Axes'), sel(0), sel(1), sel(2), h('span.a3-axl.p', 'Presets'), pre); syncAxes(); return AXROW;
  }
  function syncAxes() { if (!AXROW) return; AXROW.querySelectorAll('select[data-a]').forEach(s => { s.value = st.axes[+s.dataset.a]; }); AXROW.querySelectorAll('[data-p]').forEach(b => { const p = PRESETS.find(x => x[0] === b.dataset.p), on = p[2].join() === st.axes.join(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }

  /* ---------- the foot: the notebook growing ---------- */
  let FOOT = null;
  function foot() {
    const S = ATLAS.st, out = h('output.a3-out'), sl = h('input.a3-time', { type: 'range', min: 0, max: 1000, value: Math.round((S.time == null ? 1 : S.time) * 1000), 'aria-label': 'Up to which day', on: { input: e => { S.time = +e.target.value / 1000; sayT(); kick(); } } });
    const play = h('button.a3-play', { type: 'button', title: 'Replay the notebook growing', on: { click: () => { if (playT) { cancelAnimationFrame(playT); playT = 0; play.textContent = '▶'; return; } const t0 = performance.now(), from = S.time >= .999 ? 0 : S.time; play.textContent = '❚❚';
      const step = now => { const f = Math.min(1, from + (now - t0) / 7000); S.time = f; sl.value = Math.round(f * 1000); sayT(); kick(); if (f < 1 && sl.isConnected) playT = requestAnimationFrame(step); else { playT = 0; play.textContent = '▶'; } }; playT = requestAnimationFrame(step); } } }, '▶');
    FOOT = { out, sl }; return h('div.a3-foot', play, sl, out);
  }
  function sayT() { if (!FOOT) return; const ct = cutT(), n = DOTS.filter(d => VIS.has(d.id) && d.t <= ct).length; FOOT.out.textContent = 'up to ' + fmtDay(ct) + ' · ' + plural(n, 'dot'); }

  /* ---------- the side panel (14b's panelDraw, grown): the axes read out, the kinds, the dot under the pointer ---------- */
  const TYPES = [['item', 'Structures'], ['cmp', 'Components'], ['note', 'Notes'], ['term', 'Terms'], ['paper', 'Papers'], ['person', 'People']];
  function side() {
    const P0 = ATLAS.panel; if (!P0 || !P0.isConnected) return;
    const S = ATLAS.st, skc = new Map(); DOTS.forEach(d => { if (d.type === 'item') skc.set(d.kind, (skc.get(d.kind) || 0) + 1); });
    const L = lit(), hidden = L ? DOTS.filter(d => L.has(d.id) && !VIS.has(d.id)) : [], hidT = [...new Set(hidden.map(d => d.type))];
    P0.replaceChildren(...[
      h('div.a3-sec', h('div.a3-sh', h('h3', 'The axes'), h('span', plural(VIS.size, 'dot'))),
        ...AX.map((A, a) => h('div.a3-axr', { style: { '--ac': `var(--a3-ax${a})` } }, h('i', 'XYZ'[a]), h('b', DIMS[A.dim].label), h('span', DIMS[A.dim].desc + (A.dim === 'time' && TW ? ' · showing ' + fmtT(TW[0]) + ' → ' + fmtT(TW[1]) + ' (Shift+wheel moves it)' : '') + (A.range ? ' · ' + A.range : ''))))),
      THREADS.length ? h('div.a3-sec', h('div.a3-sh', h('h3', 'Threads'), h('span', 'click to hide or show')), h('div.a3-chs', [['bridges', 'Bridges', 'bridge', 'var(--bridge)'], ['wires', 'Connections', 'wire', 'var(--ink-2)']].map(([k, l, kk, col]) => { const on = opt(k) !== false, n = THREADS.filter(T => T.k === kk).length;
        return h('button.a3-kc.a3-thc' + (on ? '' : '.off'), { type: 'button', 'data-th': k, 'aria-pressed': String(on), style: { '--kc': col }, on: { click: () => { FEAT.setTune('atlas', k, !on); side(); kick(); } } }, l, h('em', String(n))); }))) : null,
      S.kinds.item && skc.size ? h('div.a3-sec', h('div.a3-sh', h('h3', 'Structures'), h('span', 'click to hide or show')),
        h('div.a3-chs', SKINDS().filter(k => skc.has(k)).map(k => h('button.a3-kc' + (st.skOff.has(k) ? '.off' : ''), { type: 'button', 'aria-pressed': String(!st.skOff.has(k)), style: { '--kc': kcol(k) }, on: { click: () => { st.skOff.has(k) ? st.skOff.delete(k) : st.skOff.add(k); layout(true); } } }, kl(k), h('em', String(skc.get(k))))))) : null,
      hidden.length ? h('div.a3-sec.a3-hid', h('span', plural(hidden.length, 'match', 'matches') + ' among the hidden ' + hidT.map(t => TYPES.find(x => x[0] === t)[1].toLowerCase()).join(', ')), h('button.btn.xs', { type: 'button', on: { click: () => { hidT.forEach(t => { S.kinds[t] = 1; }); App.refresh(); } } }, 'Show them')) : null,
      h('div.a3-sec', { id: 'a3-sel' }),
      h('div.a3-key', h('div', h('span.k-bead'), 'a dot far off, tinted by its kind'), h('div', h('span.k-bub'), 'open: the component and its neighbours'), h('div', h('span.k-th'), 'a thread: a connection, or a bridge (dashed) to where it shows; a light runs from where it starts, in its kind’s colour'), h('div', h('span.k-sp'), 'down to the floor, across to the walls'), h('div', h('span.k-arc'), 'a barrier resolved, a takeaway reached'))].filter(Boolean));
    selRender(); sayT();
  }
  function selRender() {
    const box = document.getElementById('a3-sel'); if (!box) return; const d = st.hover || st.sel || (st.pins.size ? BY.get([...st.pins].pop()) : null), S = ATLAS.st;
    if (!d || !VIS.has(d.id)) { box.replaceChildren(h('div.a3-sh', h('h3', 'Point at a dot')), h('p.a3-sp', 'Rest on it a moment and it opens into its bubble; its place on each axis and its connections show here. Rest on a thread to see both its ends. A click visits it in its note' + (S.from && S.action !== 'open' ? ', or does what the chip above says for “' + snippet((M.doc(S.from.docId) || {}).title || 'the note', 30) + '”' : '') + '.')); return; }
    const cons = (ADJ.get(d.id) || []).filter(x => BY.get(x.o)).slice(0, 14), v = ATLAS.G && ATLAS.G.byId.get(d.id);
    const title = d.type === 'item' ? h('div.a3-tt2', h('span.st.st-' + d.kind, d.raw)) : h('div.a3-tt2', d.label);
    const val = (A) => A.num ? (A.dim === 'time' ? fmtDayLong(d.t) : String(d.deg)) : DIMS[A.dim].name(DIMS[A.dim].v(d));
    box.replaceChildren(h('div.a3-sh', h('h3', st.pins.has(d.id) ? 'Pinned' : st.hover === d ? 'Under your pointer' : 'Picked'), h('span', st.pins.size ? st.pins.size + ' pinned' : '')),
      h('div.a3-selc', { style: { '--kc': kcol(d.kind) } }, h('span.k', kl(d.kind) + (d.status && d.status !== 'none' ? ' · ' + d.status : '')), title, h('span.sub', d.docId ? ((M.doc(d.docId) || {}).title || '') : (d.v.sub || '')),
        h('div.a3-coords', AX.map((A, a) => h('div', { style: { '--ac': `var(--a3-ax${a})` } }, h('i', 'XYZ'[a]), h('span', DIMS[A.dim].label), h('b', val(A))))),
        cons.length ? h('div.a3-cons', cons.map(x => { const O = BY.get(x.o); return h('button', { type: 'button', style: { '--kc': kcol(O.kind) }, title: 'Fly there', on: { click: () => ATLAS.focusOn(O.id) } }, h('em', x.e.rel || (x.out ? '→' : '←')), h('span', O.type === 'item' ? kl(O.kind) + ': ' + snippet(O.raw, 40) : snippet(O.label, 46))); })) : null,
        h('div.a3-acts', S.from && S.action !== 'open' && v ? h('button.btn.xs.pri', { type: 'button', on: { click: () => ATLAS.act(v) } }, ({ refnote: 'Reference the note', refcmp: 'Reference the component', pull: 'Pull in', connect: 'Connect' })[S.action] || 'Do it') : null,
          h('button.btn.xs' + (S.from && S.action !== 'open' ? '' : '.pri'), { type: 'button', on: { click: () => port(d, d.ob && !d.ob.hidden ? d.ob : d.el && !d.el.hidden ? d.bd : rectOf(d), null) } }, 'Port in ↘'),
          h('button.btn.xs', { type: 'button', on: { click: () => { st.pins.has(d.id) ? st.pins.delete(d.id) : st.pins.add(d.id); selRender(); kick(); } } }, st.pins.has(d.id) ? 'Unpin' : 'Pin open'))));
  }

  /* ---------- the page ---------- */
  function rebuild(first) { if (!R || !R.stage.isConnected) return; COL = null; Object.keys(SPR).forEach(k => delete SPR[k]); data(); layout(!first); }
  function render() {
    const S = ATLAS.st; if (!st.axes) st.axes = startAxes(); st.tp = null; st.th = null; st.hover = null; st.sel = null;   // back from a note: what was pointed at before is not pointed at now
    const panel = h('aside.at-panel.a3-side'), r = room(); r.tp.hidden = true; r.tp.replaceChildren();
    const view = h('div.atlas.a3', ATLAS.bar(), ATLAS.collRow(), axesRow(), h('div.at-main', h('div.at-stage.a3-wrap', r.stage, foot()), panel));
    ATLAS.view = view; ATLAS.panel = panel;
    setTimeout(() => { rebuild(true); ATLAS.search(); ATLAS.sayFrom(); }, 0);
    App.setTitle('Atlas', [h('span', S.only ? 'a collection' : 'the notebook on three axes')]);
    return view;
  }
  function search() { const q = (ATLAS.st.q || '').trim().toLowerCase(); ATLAS.lit = q ? new Set(DOTS.filter(d => d.text.includes(q)).map(d => d.id)) : null; side(); kick(); }
  function focusOn(id) { const d = BY.get(id); if (!d) return; if (!VIS.has(id)) { ATLAS.st.kinds[d.type] = 1; st.skOff.delete(d.kind); st.pendingFly = id; if (App.route && App.route.name === 'atlas') App.refresh(); return; } flyTo(d); }
  const onPage = () => !!(R && R.stage.isConnected);

  /* ---------- the settings preview (Settings → Features → Atlas): a small room turning, one bubble open ---------- */
  function preview() {
    const wrap = h('div.pv-a3'), cv = h('canvas', { width: 300, height: 156 }), axes = startAxes(), still0 = still(), amt = +opt('amount') || 3, walls = opt('room') !== false, labs = opt('labels'), pul = pulsesOn(), cyc = 4200 / clamp(+opt('pulseSpeed') || 2, 1, 5), hd = hoverMs();
    const PT = [[0, 5, 'b'], [3, 9, 'b'], [7, 12, 'w'], [11, 2, 'w'], [14, 6, 'w']].filter(x => x[2] === 'b' ? opt('bridges') !== false : opt('wires') !== false);
    const sp = (id, head, label, kids, len) => ({ id, head, label, body: h('div.bb-t', kids), imgs: [], len, open: false });
    const bub = BUBBLE.el({ key: 'pv-a3', centre: sp('pva1', 'Block', 'Day 2', [h('span.st.st-barrier', 'Bead drift smears the maps.')], 28), around: [{ spec: sp('pva2', 'Block', 'Drift fix', [h('span.st.st-resolution', 'Fiducial beads fix it.')], 22), rel: 'resolved by' }], S: .3, flat: false, ring: { on: false }, onPort: () => { } });
    bub.style.left = '71%'; bub.style.top = '44%';
    wrap.append(cv, bub, h('div.pv-a3-ax', axes.map((x, i) => h('span', { style: { '--ac': `var(--a3-ax${i})` } }, h('b', 'XYZ'[i]), DIMS[x].label))),
      h('div.pv-a3-say', 'a click ports in · opens after ' + (hd ? (hd / 1000).toFixed(1) + ' s' : 'no wait') + ' · ' + (PT.length ? (pul ? 'pulsing threads' : 'threads with arrows') : 'no threads') + (+opt('cap') ? ' · up to ' + opt('cap') + ' open as you come close' : ' · a bubble opens only when you ask') + (still0 ? ' · still' : ' · floating ' + amt + ' px') + (tight() ? ' · axes tighten far off' : '')));
    const pd = Array.from({ length: 16 }, (_, i) => ({ p: [hashf('x' + i) * 10, hashf('y' + i) * 6, hashf('z' + i) * 8], k: KINDS[i % KINDS.length].id, ph: hashf('p' + i) * 6.28 }));
    const c = cv.getContext('2d'); let t0 = 0, cols = null;
    const drawP = now => {
      if (!cv.isConnected) { if (!t0 || now - t0 < 4000) { if (!t0) t0 = now; requestAnimationFrame(drawP); } return; }
      if (!cols) { cols = { ink: colorAt(cv, 'var(--ink)'), ax: [0, 1, 2].map(a => colorAt(cv, `var(--a3-ax${a})`)), k: {} }; pd.forEach(d => { cols.k[d.k] = cols.k[d.k] || colorAt(cv, `var(--k-${d.k})`); }); }
      const W2 = cv.width, H2 = cv.height, yaw = .6 + (still0 ? 0 : now * .00018), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(.4), spn = Math.sin(.4), ink = cols.ink;
      const Q = (x, y, z) => { x -= 5; y -= 3; z -= 4; const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y2 = y * cp + z1 * spn, z2 = -y * spn + z1 * cp, f = 20 / (20 + z2), s = 13 * f; return [W2 * .42 + x1 * s, H2 / 2 - y2 * s + 12, z2, f]; };
      c.clearRect(0, 0, W2, H2); const poly = (pts, fill) => { c.beginPath(); pts.forEach((p, i) => { const q = Q(...p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = rgba(ink, .16); c.lineWidth = 1; c.stroke(); };
      poly([[0, 0, 0], [10, 0, 0], [10, 0, 8], [0, 0, 8]], rgba(ink, .05));
      if (walls) { poly([[0, 0, 0], [10, 0, 0], [10, 6, 0], [0, 6, 0]], rgba(ink, .03)); poly([[0, 0, 0], [0, 0, 8], [0, 6, 8], [0, 6, 0]], rgba(ink, .03)); }
      [[10, 0, 0], [0, 6, 0], [0, 0, 8]].forEach((e, i) => { const o = Q(0, 0, 0), q = Q(...e); c.strokeStyle = rgb(cols.ax[i]); c.lineWidth = 2.5; c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(q[0], q[1]); c.stroke(); });
      // the threads: an arrow at the far end, a light running from where each starts, in its kind's colour
      const qs = pd.map(d => Q(...d.p)), brc = cols.br || (cols.br = colorAt(cv, 'var(--bridge, #1f9d55)'));
      PT.forEach(([i, j, k], n) => { const a = qs[i], b = qs[j], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, cx = (a[0] + b[0]) / 2 - (b[1] - a[1]) / len * 12, cy = (a[1] + b[1]) / 2 + (b[0] - a[0]) / len * 12, base = k === 'b' ? brc : ink;
        const qp = t => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]; };
        c.strokeStyle = rgba(base, k === 'b' ? .6 : .35); c.lineWidth = 1.2; if (k === 'b') c.setLineDash([4, 3]); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(cx, cy, b[0], b[1]); c.stroke(); c.setLineDash([]);
        const e = qp(.9), e0 = qp(.86), an = Math.atan2(e[1] - e0[1], e[0] - e0[0]); c.fillStyle = rgba(base, .75); c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[0] - Math.cos(an - .45) * 6, e[1] - Math.sin(an - .45) * 6); c.lineTo(e[0] - Math.cos(an + .45) * 6, e[1] - Math.sin(an + .45) * 6); c.closePath(); c.fill();
        const pc = cols.k[pd[i].k]; if (pul) { const s0 = ((now / cyc) + n * .31) % 1.6; if (s0 <= .9) for (let m = 0; m < 5; m++) { const tt = s0 - m * .03; if (tt < 0) break; const p = qp(tt); c.fillStyle = rgba(pc, 1 - m / 5); c.beginPath(); c.arc(p[0], p[1], 2.4 - m * .35, 0, 6.2832); c.fill(); } }
        else { const p = qp(.08); c.fillStyle = rgba(pc, .9); c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 6.2832); c.fill(); } });
      pd.map(d => ({ d, q: Q(...d.p) })).sort((a, b) => b.q[2] - a.q[2]).forEach(({ d, q }, i) => { const r = 7 * q[3], bob = still0 ? 0 : Math.sin(now * .0012 + d.ph) * amt * .5; const k = cols.k[d.k];
        c.fillStyle = rgba(k, .9); c.beginPath(); c.arc(q[0], q[1] + bob, r * .45, 0, 6.2832); c.fill(); c.strokeStyle = rgba(ink, .32); c.lineWidth = 1; c.beginPath(); c.arc(q[0], q[1] + bob, r, 0, 6.2832); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(q[0] - r * .35, q[1] + bob - r * .45, r * .3, r * .16, -.66, 0, 6.2832); c.fill();
        if (labs !== 'none' && i >= (labs === 'many' ? 6 : 12)) { c.fillStyle = rgba(ink, .55); c.font = '8px monospace'; c.fillText(KIND[d.k].label.toLowerCase(), q[0] + r + 3, q[1] + bob + 3); } });
      if (!still0 || pul) requestAnimationFrame(drawP); };
    requestAnimationFrame(drawP);
    return wrap;
  }

  return { pick, st, cam, DIMS, PRESETS, render, rebuild, search, focusOn, onPage, layout, setAxis, port, kick, side, preview, startAxes, resetView, dots: () => DOTS, by: id => BY.get(id), vis: () => VIS, ax: () => AX, shown: () => SHOWN, arcs: () => ARCS, opt,
    threads: () => THREADS, threadAt, openTP, closeTP, zoomBy, qpt, tcolOf, auto: () => AUTO, tw: () => TW ? TW.slice() : null, setWindow, panBy, pointAt, size: () => [W, H] };
})();
{
  // the Atlas page is the room (14b keeps the graph, the bar, the actions; 14d's nests still draw the note-term maps)
  if (Object.values(ATLAS.st.kinds).every(Boolean)) ATLAS.st.kinds = { note: 0, cmp: 1, item: 1, term: 0, paper: 0, person: 0 };   // structures and components; the rest one click away
  Object.assign(ATLAS, {
    render: () => ATLAS3.render(),
    rebuild: first => ATLAS3.rebuild(first),
    search: () => ATLAS3.search(),
    focusOn: id => ATLAS3.focusOn(id),
    panelDraw: () => { if (ATLAS3.onPage()) ATLAS3.side(); },
    draw: () => ATLAS3.kick(),
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !ATLAS3.onPage() || $('.ovl') || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
    const S = ATLAS3.st; if (S.tp) { ATLAS3.closeTP(); return; } if (S.sel || S.pins.size) { S.sel = null; S.pins.clear(); ATLAS.st.focus = null; ATLAS3.side(); ATLAS3.kick(); }
  });
}
