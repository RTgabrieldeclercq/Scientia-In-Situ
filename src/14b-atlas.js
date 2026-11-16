/* ==========================================================================
   14b · The Atlas (V3.952, Gabe's SiS Shaping, Phase G): the notebook as
   one map — notes, components (with their kinds), structures, terms,
   people and papers as nodes; wires (with their relation), structures in a
   component, wires onto a structure, terms in the text, citations, note
   cards and pull-ins, @names, and which note a component is in, as edges.
   A lens chooses what is on it: a project, the whole notebook, or a set of
   notes you pick (kept in settings().lenses); chips show or hide each kind.
   Drawn as nests in 3D by 14d (V3.966; until then a force layout drawn
   here, which V3.969 took out once the term maps moved to the nests too):
   hover lifts a node and its threads; click focuses it (its edges in the
   side panel, the rest fades); double-click opens it; Shift+click a second
   node draws the shortest path; the slider at the bottom replays the map
   growing by date. Search lives here: Ctrl+K and /find open the Atlas with
   the words lit (Ctrl+Shift+K, or the Quick chip, is the list as before),
   and the action chips say what a pick does for the note you came from:
   Open · Reference the note · Reference the component · Pull in · Connect.
   V3.961 — /collection html image pdf: the Atlas with just the components
   of those types (COLL, the widgets the build carries, the component
   kinds), each type a colour, every one labelled when there are few; a row
   above the map shows the types with their counts, takes one out or adds
   one, and "Show everything" leaves it. The notes that hold them come back
   with the Notes chip.
   ========================================================================== */
const ATLAS = {
  KINDC: { note: '#7FB3E8', cmp: '#F6D55C', item: '#F28BB0', term: '#90BE6D', paper: '#F4A261', person: '#A78BFA' },
  KINDL: { note: 'Notes', cmp: 'Components', item: 'Structures', term: 'Terms', paper: 'Papers', person: 'People' },
  st: { lens: 'all', kinds: { note: 1, cmp: 1, item: 1, term: 1, paper: 1, person: 1 }, q: '', action: 'open', from: null, focus: null, hover: null, path: [], time: 1, days: false, only: null, kinds0: null },
  G: null, view: null, panel: null, lit: null,
  on: () => !((settings().labs || {}).atlas === false),
  lenses: () => settings().lenses || [],
  /* ---------- the graph ---------- */
  graph() {
    const S = ATLAS.st, lens = S.lens, docsAll = DB.where('documents', d => !d.deleted && !d.archived);
    const docs = docsAll.filter(d => (S.days || (d.type !== 'day' && d.type !== 'review')) && (lens === 'all' || (lens.startsWith('set:') ? (ATLAS.lenses().find(l => l.id === lens.slice(4)) || { docs: [] }).docs.includes(d.id) : d.projectId === lens)));
    const docIds = new Set(docs.map(d => d.id)), N = new Map(), E = [], add = (id, kind, label, extra) => { if (!N.has(id)) N.set(id, Object.assign({ id, kind, label: String(label || '').slice(0, 80), deg: 0 }, extra || {})); return N.get(id); };
    const only = S.only && S.only.length ? S.only.map(ATLAS.item).filter(Boolean) : null, which = b => only.findIndex(x => x.test(b));   // V3.961: a collection
    const edge = (a, b, rel, kind) => { if (!a || !b || a === b || !N.has(a) || !N.has(b)) return; E.push({ a, b, rel: rel || '', kind: kind || 'wire' }); N.get(a).deg++; N.get(b).deg++; };
    const blocks = DB.where('blocks', b => b.status === 'live' && docIds.has(b.docId) && (only ? which(b) >= 0 : (b.kind === 'component' || (typeof WIDGETS !== 'undefined' && WIDGETS[b.kind]) || b.kind === 'ref' || b.kind === 'noteref')));
    const held = only ? new Set(blocks.map(b => b.docId)) : null;
    docs.forEach(d => { if (!held || held.has(d.id)) add(d.id, 'note', d.title || 'Untitled', { t: d.created, go: () => App.go('#/doc/' + d.id), sub: M.docPath(d) }); });
    blocks.forEach(b => { if (!only && (b.kind === 'ref' || b.kind === 'noteref')) return; const K = typeof CKINDS !== 'undefined' && CKINDS.of(b), i = only ? which(b) : -1;
      add(b.id, 'cmp', M.blockName(b) + (b.body && b.body.text ? ' — ' + snippet(b.body.text, 40) : ''), { t: b.created, ck: i >= 0 ? only[i].label : K && K.label, color: i >= 0 ? ATLAS.ccol(i) : K && K.color, go: () => App.openBlock(b.id), sub: (M.doc(b.docId) || {}).title }); });
    const items = DB.where('items', it => docIds.has(it.originDocId) && !it.correctedBy); items.forEach(it => add(it.id, 'item', (KIND[it.kind] ? KIND[it.kind].label : it.kind) + ': ' + snippet(it.text, 50), { t: it.created, sk: it.kind, go: () => App.openBlock(it.originBlockId) }));
    const people = new Map(); DB.all('terms').forEach(t => { if (t.kind === 'person') people.set(t.label.toLowerCase(), t.id); });
    blocks.forEach(b => {
      edge(b.id, b.docId, 'in', 'in');
      (IX.blockItems.get(b.id) || []).forEach(iid => edge(b.id, iid, 'has', 'has'));
      (b.body && b.body.marks || []).forEach(m => {
        if (m.type === 'cite' && M.lib(m.ref)) { const r = M.lib(m.ref); add(r.id, 'paper', r.title || r.url || 'Paper', { t: r.added, go: () => App.go('#/read/' + r.id) }); edge(b.id, r.id, 'cites', 'cite'); }
        if (m.type === 'term' && M.term(m.ref)) { const t = M.term(m.ref); add(t.id, t.kind === 'person' ? 'person' : 'term', t.label, { t: t.created, go: () => App.go('#/lens/' + t.id) }); edge(b.id, t.id, 'mentions', 'term'); }
        if (m.type === 'link' && m.ref) { if (N.has(m.ref)) edge(b.id, m.ref, 'links to', 'link'); }
        if (m.type === 'person' && m.name) { const pid = people.get(m.name.toLowerCase()) || 'person:' + m.name.toLowerCase(); add(pid, 'person', m.name, { t: b.created, go: () => App.openBlock(b.id) }); edge(b.id, pid, 'names', 'term'); }
      });
      if (b.kind === 'noteref' && b.refDocId && N.has(b.refDocId)) edge(b.docId, b.refDocId, 'note card', 'link');
      if (b.kind === 'ref' && b.refBlockId && N.has(b.refBlockId)) edge(b.docId, b.refBlockId, 'pulled in', 'link');
      if (b.kind === 'rmpaper' && b.paperId && M.lib(b.paperId)) { const r = M.lib(b.paperId); add(r.id, 'paper', r.title || 'Paper', { t: r.added, go: () => App.go('#/read/' + r.id) }); edge(b.id, r.id, 'paper', 'cite'); }
    });
    DB.all('wires').forEach(w => { if (!N.has(w.from)) return; const to = w.toItem && N.has(w.toItem) ? w.toItem : w.to; if (N.has(to)) edge(w.from, to, (REL[w.rel] || { label: w.rel }).label, 'wire'); });
    const S2 = ATLAS.st.kinds, nodes = [...N.values()].filter(n => S2[n.kind]), keep = new Set(nodes.map(n => n.id)), edges = E.filter(e => keep.has(e.a) && keep.has(e.b));
    nodes.forEach(n => { n.deg = 0; }); edges.forEach(e => { N.get(e.a).deg++; N.get(e.b).deg++; });
    const adj = new Map(); nodes.forEach(n => adj.set(n.id, [])); edges.forEach(e => { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); });
    const ts = nodes.map(n => +new Date(n.t || 0)).filter(x => x > 0); return { nodes, edges, byId: N, adj, t0: ts.length ? Math.min(...ts) : 0, t1: ts.length ? Math.max(...ts) : 0 };
  },
  /* ---------- the view ---------- */
  /** The bar over the map: the lens, + Lens, the kind chips, the search, Quick, the action chips, "for <note>" (14d builds the page on it). render, rebuild, search and focusOn are 14d's. */
  bar() {
    const S = ATLAS.st, projects = DB.all('projects'), lensSel = h('select.inp.at-lens', { on: { change: e => { S.lens = e.target.value; ATLAS.rebuild(); } } }, h('option', { value: 'all', selected: S.lens === 'all' }, 'The whole notebook'), projects.map(p => h('option', { value: p.id, selected: S.lens === p.id }, p.name)), ATLAS.lenses().map(l => h('option', { value: 'set:' + l.id, selected: S.lens === 'set:' + l.id }, l.name + ' (' + l.docs.length + ' notes)')));
    const chips = h('div.at-chips', Object.keys(ATLAS.KINDL).map(k => h('button.at-chip' + (S.kinds[k] ? '.on' : ''), { style: { '--c': ATLAS.KINDC[k] }, on: { click: e => { S.kinds[k] = S.kinds[k] ? 0 : 1; e.currentTarget.classList.toggle('on', !!S.kinds[k]); ATLAS.rebuild(); } } }, ATLAS.KINDL[k])), h('button.at-chip' + (S.days ? '.on' : ''), { title: 'Day notes and reviews too', on: { click: e => { S.days = !S.days; e.currentTarget.classList.toggle('on', S.days); ATLAS.rebuild(); } } }, 'Days'));
    const q = h('input.inp.at-q', { type: 'search', placeholder: 'Light up the words…', value: S.q, on: { input: debounce(e => { S.q = e.target.value; ATLAS.search(); }, 120), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') { const first = ATLAS.lit && [...ATLAS.lit][0]; if (first) ATLAS.focusOn(first); } } } });
    const actions = h('div.at-acts', [['open', 'Open'], ['refnote', 'Reference the note'], ['refcmp', 'Reference the component'], ['pull', 'Pull in'], ['connect', 'Connect']].map(([id, l]) => h('button.at-chip.act' + (S.action === id ? '.on' : ''), { on: { click: e => { S.action = id; [...e.currentTarget.parentNode.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); } } }, l)));
    const fromEl = h('span.tiny.muted.at-from'); ATLAS.fromEl = fromEl;
    return h('div.at-bar', lensSel, h('button.btn.xs', { title: 'A lens of the notes you pick', on: { click: () => ATLAS.newLens() } }, '+ Lens'), chips, h('span.spacer'), q, h('button.btn.xs', { title: 'The quick search: the list (Ctrl+Shift+K)', on: { click: () => Search.open({ quick: true }) } }, 'Quick'), actions, fromEl);
  },
  sayFrom() { const f = ATLAS.st.from, d = f && M.doc(f.docId); ATLAS.fromEl && (ATLAS.fromEl.textContent = d ? 'for “' + snippet(d.title, 28) + '”' : ''); },
  panelDraw() { const P = ATLAS.panel, G = ATLAS.G, id = ATLAS.st.focus, v = id && G.byId.get(id); if (!P) return;
    if (!v) { P.replaceChildren(h('div.at-ph', h('b', 'Atlas'), h('div.tiny.muted', 'Click a node for its edges. Type to light up the words. Shift+click a second node for the path between them.'))); return; }
    const E = G.edges.filter(e => e.a === id || e.b === id).map(e => { const o = G.byId.get(e.a === id ? e.b : e.a); return { e, o, out: e.a === id }; }).sort((x, y) => x.e.kind.localeCompare(y.e.kind) || x.o.label.localeCompare(y.o.label));
    P.replaceChildren(h('div.at-ph', h('span.pill', { style: { background: v.color || ATLAS.KINDC[v.kind], color: '#fff' } }, v.ck || ATLAS.KINDL[v.kind].replace(/s$/, '')), h('b', v.label), v.sub ? h('div.tiny.muted', v.sub) : null, v.t ? h('div.tiny.muted', fmtDayLong(v.t)) : null,
      h('div.row', { style: { gap: '6px', marginTop: '8px', flexWrap: 'wrap' } }, h('button.btn.xs.pri', { on: { click: () => ATLAS.act(v) } }, ATLAS.st.action === 'open' ? 'Open' : 'Do: ' + ATLAS.st.action), h('button.btn.xs', { on: { click: () => { ATLAS.st.focus = null; ATLAS.st.path = []; ATLAS.panelDraw(); ATLAS.draw(); } } }, 'Unfocus'))),
      h('div.at-edges', E.length ? E.map(x => h('div.at-edge', { on: { click: () => ATLAS.focusOn(x.o.id) } }, h('i', { style: { background: x.o.color || ATLAS.KINDC[x.o.kind] } }), h('span.s', x.e.kind === 'in' ? (x.out ? 'in' : 'holds') : x.e.kind === 'wire' ? (x.out ? x.e.rel + ' →' : '← ' + x.e.rel) : x.e.rel), h('span', snippet(x.o.label, 60)))) : h('div.tiny.muted', 'No edges.'))); },
  /** What a pick does for the note the Atlas was opened from. */
  async act(v) { const S = ATLAS.st, from = S.from, d = from && M.doc(from.docId), pane = () => App.panes().find(p => p.docId === from.docId) || App.panes()[0];
    if (S.action === 'open' || !d) return v.go && v.go();
    const spot = () => { const p = MOVE.spot(d); return { x: p.x, y: p.y }; };
    if (S.action === 'refnote') { const did = v.kind === 'note' ? v.id : v.kind === 'cmp' ? (M.block(v.id) || {}).docId : v.kind === 'item' ? (M.item(v.id) || {}).originDocId : null; if (!did || !M.doc(did)) return toast('Pick a note, a component or a structure'); const p = spot(), b = M.addBlock(d.id, null, { kind: 'noteref', label: '', refDocId: did, focusId: v.kind === 'cmp' ? v.id : null, x: p.x, y: p.y, w: 392 }); b.body = { text: M.doc(did).title, marks: [] }; DB.put('blocks', b); changed(); toast('Note card in ' + d.title); return App.go('#/doc/' + d.id); }
    if (S.action === 'refcmp' || S.action === 'pull') { const bid = v.kind === 'cmp' ? v.id : v.kind === 'item' ? (M.item(v.id) || {}).originBlockId : null; if (!bid || !M.block(bid)) return toast('Pick a component or a structure'); const p = spot(); M.addBlock(d.id, null, { kind: 'ref', refItemId: v.kind === 'item' ? v.id : null, refBlockId: bid, x: p.x, y: p.y, w: 392 }); changed(); toast('Pulled into ' + d.title); return App.go('#/doc/' + d.id); }
    if (S.action === 'connect') { const bid = v.kind === 'cmp' ? v.id : v.kind === 'item' ? (M.item(v.id) || {}).originBlockId : null, src = from.blockId && M.block(from.blockId); if (!bid || !src) return toast('Select a component in the note first, then pick a component here'); App.go('#/doc/' + d.id); setTimeout(() => { const pn = pane(); if (pn && pn.relationPopover) pn.relationPopover(src.id, bid, innerWidth / 2 - 150, 160); }, 500); } },
  async newLens() { const name = await askText('A lens', 'Its name', ''); if (!name) return; const ids = []; const pick = () => CMD.picker('Notes in the lens “' + name + '” (Cancel when done)', '', q => CMD.KINDS.note.list(q, CMD.ctx(), { kind: 'note' }).filter(x => !ids.includes(x.v.id))).then(d => { if (d) { ids.push(d.id); return pick(); } });
    await pick(); if (!ids.length) return; const l = { id: uid('ln'), name, docs: ids }; saveSettings({ lenses: [...ATLAS.lenses(), l] }); ATLAS.st.lens = 'set:' + l.id; App.refresh(); },
  /** Ctrl+K, /find: the Atlas with the words lit, for the note on screen. */
  openWith(q, from) { const ctx = CMD.ctx(); if (ATLAS.st.only) ATLAS.uncollect(true); ATLAS.st.q = q || ''; ATLAS.st.from = from || (ctx.doc ? { docId: ctx.doc.id, blockId: ctx.pane && ctx.pane.sel } : null); if (ctx.doc && ctx.doc.projectId && ATLAS.st.lens === 'all') ATLAS.st.lens = ctx.doc.projectId; if (App.route.name === 'atlas') { const i = $('.at-q'); if (i) i.value = ATLAS.st.q; ATLAS.search(); ATLAS.sayFrom(); } else App.go('#/atlas'); },
  /* ---------- /collection (V3.961) ---------- */
  /** The types /collection takes: its word, what it is, the words it also answers to, which components. */
  COLL: [
    ['html', 'HTML pages', 'htmls page pages webpage webpages', b => b.kind === 'html'],
    ['pdf', 'PDFs', 'pdfs', b => b.kind === 'pdf'],
    ['image', 'Image panels', 'images picture pictures figure figures panel panels photo photos img', b => b.kind === 'figure'],
    ['snip', 'Snips from PDFs and pages', 'snips clip clips', b => !!b.clip],
    ['whiteboard', 'Whiteboards', 'whiteboards board boards', b => b.kind === 'figure' && !!(b.fig && (b.fig.cells || []).some(c => c && c.board))],
    ['table', 'Tables', 'tables sheet sheets excel csv spreadsheet', b => b.kind === 'table'],
    ['plot', 'Plots of a table', 'plots chart charts graph graphs', b => b.kind === 'plot'],
    ['equation', 'Equations', 'equations eq math', b => b.kind === 'eq'],
    ['slides', 'Slides', 'slide deck decks powerpoint ppt', b => b.kind === 'deck'],
    ['recording', 'Recordings', 'recordings audio rec', b => b.kind === 'rec'],
    ['ink', 'Ink', 'inks handwriting drawing drawings sketch', b => b.kind === 'ink'],
    ['quote', 'Quotes', 'quotes', b => b.kind === 'component' && !!b.quote && !b.quote.note],
    ['text', 'Text components', 'texts block blocks component components writing', b => b.kind === 'component' && !(b.quote && !b.quote.note)],
    ['protocol', 'Protocols', 'protocols', b => b.kind === 'protocol'],
    ['run', 'Protocol runs', 'runs', b => b.kind === 'run'],
    ['task', 'Tasks', 'tasks todo todos', b => b.kind === 'task'],
    ['material', 'Materials', 'materials reagent reagents', b => b.kind === 'matcard'],
    ['plate', 'Well plates', 'plates wells', b => b.kind === 'plate'],
    ['timer', 'Timers', 'timers', b => b.kind === 'timer'],
    ['calculator', 'Calculators', 'calculators calc', b => b.kind === 'calc'],
    ['view', 'Live views', 'views', b => b.kind === 'view'],
    ['notecard', 'Note cards', 'notecards noteref', b => b.kind === 'noteref'],
    ['pulled', 'Pulled-in components', 'pullin pull-in pullins ref refs', b => b.kind === 'ref'],
    ['iteration', 'Iterations (each version)', 'iterations iterate version versions', b => typeof ITER !== 'undefined' && ITER.v(b) > 0],
  ],
  CKNOWN: new Set(['component', 'html', 'pdf', 'figure', 'table', 'plot', 'eq', 'deck', 'rec', 'ink', 'protocol', 'run', 'task', 'matcard', 'plate', 'timer', 'calc', 'view', 'noteref', 'ref']),
  CCOL: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  ccol: i => ATLAS.CCOL[i] || '#8a8f98',
  /** COLL, then any other widget this build carries (by its own name), then the component kinds (yours too). */
  items() {
    const L = ATLAS.COLL.map(([token, label, also, test]) => ({ id: token, token, label, also: also.split(' '), test }));
    Object.keys(typeof WIDGETS === 'undefined' ? {} : WIDGETS).filter(k => !ATLAS.CKNOWN.has(k)).forEach(k => { const lab = String(WIDGETS[k].label || k); L.push({ id: k, token: k.toLowerCase(), label: lab[0].toUpperCase() + lab.slice(1), also: [lab.toLowerCase().replace(/\s+/g, '-')], test: b => b.kind === k }); });
    (typeof CKINDS === 'undefined' ? [] : CKINDS.all()).forEach(k => { const t = String(k.id).toLowerCase().replace(/\s+/g, '-'); if (L.some(x => x.token === t)) return; L.push({ id: 'k:' + k.id, token: t, label: k.label + ' (a kind)', also: [String(k.label).toLowerCase().replace(/\s+/g, '-')], test: b => b.ckind === k.id }); });
    return L;
  },
  item: id => ATLAS.items().find(x => x.id === id) || null,
  /** A word typed after /collection → its type: the word, one it answers to, without a plural s / es, the type's name. */
  itemFor(word) { const w = String(word || '').trim().toLowerCase(); if (!w) return null; const L = ATLAS.items(), ws = [w, w.replace(/s$/, ''), w.replace(/es$/, '')];
    return L.find(x => ws.includes(x.token)) || L.find(x => ws.some(v => x.also.includes(v))) || L.find(x => x.label.toLowerCase() === w) || null; },
  /** How many live components of each type the notebook (or these notes) holds. */
  counts(docIds) { const L = ATLAS.items(), n = new Map(L.map(x => [x.id, 0])), docs = new Set(DB.where('documents', d => !d.deleted).map(d => d.id));
    DB.where('blocks', b => b.status === 'live' && docs.has(b.docId) && (!docIds || docIds.has(b.docId))).forEach(b => L.forEach(x => { if (x.test(b)) n.set(x.id, n.get(x.id) + 1); })); return n; },
  /** Show just these types (item ids), for the note on screen; the chips as they were come back with Show everything. */
  collect(ids) { const S = ATLAS.st, ctx = CMD.ctx(); if (!S.only) S.kinds0 = Object.assign({}, S.kinds);
    Object.assign(S, { only: ids.slice(), kinds: { note: 0, cmp: 1, item: 0, term: 0, paper: 0, person: 0 }, lens: 'all', q: '', focus: null, path: [], from: ctx.doc ? { docId: ctx.doc.id, blockId: ctx.pane && ctx.pane.sel } : S.from }); ATLAS.lit = null;
    if (App.route && App.route.name === 'atlas') App.refresh(); else App.go('#/atlas'); },
  uncollect(quiet) { const S = ATLAS.st; S.only = null; S.kinds = S.kinds0 || { note: 1, cmp: 1, item: 1, term: 1, paper: 1, person: 1 }; S.kinds0 = null; S.focus = null; S.path = []; if (!quiet && App.route && App.route.name === 'atlas') App.refresh(); },
  /** The row over the map: each type in its colour with its count (× takes it out), + Add, Show everything, and the command it is. */
  collRow() {
    const S = ATLAS.st; if (!S.only) return null;
    const lensDocs = S.lens === 'all' ? null : new Set(DB.where('documents', d => S.lens.startsWith('set:') ? (ATLAS.lenses().find(l => l.id === S.lens.slice(4)) || { docs: [] }).docs.includes(d.id) : d.projectId === S.lens).map(d => d.id));
    const n = ATLAS.counts(lensDocs), its = S.only.map(ATLAS.item).filter(Boolean), redo = () => App.refresh();
    const add = e => ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Add to the collection' }, ...ATLAS.items().filter(x => !S.only.includes(x.id)).map(x => ({ label: x.label, sub: x.token + ' · ' + (n.get(x.id) || 0), run: () => { S.only = [...S.only, x.id]; redo(); } }))]);
    return h('div.at-coll', h('b.at-coll-h', 'Collection'), its.map((x, i) => h('span.at-chip.on.at-cc', { style: { '--c': ATLAS.ccol(i) }, title: x.label + ' — ' + plural(n.get(x.id) || 0, 'component') }, x.label, h('span.at-cn', String(n.get(x.id) || 0)),
        h('button.at-cx', { type: 'button', title: 'Take ' + x.label + ' out', on: { click: e => { e.stopPropagation(); S.only = S.only.filter(id => id !== x.id); if (!S.only.length) return ATLAS.uncollect(); redo(); } } }, '×'))),
      h('button.at-chip.act', { type: 'button', on: { click: add } }, '+ Add'), h('button.btn.xs', { type: 'button', title: 'The whole notebook again, every kind of node', on: { click: () => ATLAS.uncollect() } }, 'Show everything'),
      h('code.tiny.muted.at-coll-cmd', '/collection ' + its.map(x => x.token).join(' ')));
  },
  settingsUI() { const on = ATLAS.on(); return h('div.at-settings', h('div.sec'), h('div.sec-h', h('h2', 'Atlas'), h('span.k', 'the notebook as one map')), h('label.switch', h('input', { type: 'checkbox', checked: on, on: { change: e => { saveSettings({ labs: Object.assign({}, settings().labs, { atlas: e.target.checked }) }); App.refresh(); } } }), 'Ctrl+K opens the Atlas (off: the list, as before; the Atlas tab stays)')); },
};
{
  if (!TABS.some(t => t[0] === 'atlas')) { const i = TABS.findIndex(t => t[0] === 'terms'); TABS.splice(i >= 0 ? i + 1 : TABS.length, 0, ['atlas', 'Atlas']); }
  VIEWS.atlas = { title: true, render: () => ATLAS.render() };
  setTimeout(() => { if (typeof Search === 'undefined') return; const so = Search.open; Search.open = function (o) { if (ATLAS.on() && !(o && o.quick)) return ATLAS.openWith(Search.q || ''); return so.apply(this, arguments); }; }, 0);   // Search is defined later in the build
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key || '').toLowerCase() === 'k') { e.preventDefault(); e.stopImmediatePropagation(); Search.open({ quick: true }); } }, true);
  setTimeout(() => { if (typeof SettingsView === 'undefined') return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments); try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Keys'), sec = h2 && h2.closest('.sec-h'); const ui = ATLAS.settingsUI(); if (sec) sec.before(ui); else out.append(ui); } catch (e) { } return out; }; }, 0);
}
