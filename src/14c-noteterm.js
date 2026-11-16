/* ==========================================================================
   14c · Note terms (V3.963, Gabe): a term that lives in one note. You type
   the ways it is written (its forms, smart case as on the Terms page) and
   choose where it comes from: the note's theme, its project or the whole
   notebook. Fetch pulls every component there that uses one of the forms
   and draws them as a small Atlas inside the component. Since V3.969 it
   is the Atlas's nests (14d): the term is the outer sphere, its themes (its
   projects, from the whole notebook) inside, the notes inside those with
   the components that use it as dots, and the terms and papers those
   components carry orbiting the note they belong to. What it shows is a
   snapshot kept on the component: nothing changes it but another Fetch.
   Click a note to fly into it, a dot to focus it (its words in the side
   panel), the space around to fly back out; double-click a component to
   open it; Reload brings the map back to how the last Fetch left it; ⤢
   opens it on the whole window. It is not one of the notebook's terms: it
   marks nothing anywhere, and only this note underlines its forms.
   ========================================================================== */
const NTERM = {
  MAXC: 150, MAXT: 24, MAXP: 24, H: 360,
  SCOPES: [['theme', 'Theme'], ['project', 'Project'], ['notebook', 'Notebook']],
  views: new Map(),   // block id → { nest, focus } — the nest the maps are in and the node picked, kept across redraws; Reload and a new Fetch clear it
  insts: new Map(),   // block id → the maps on screen (the box's, the whole window's)
  forms: T => [...new Set([T.name, ...(T.forms || [])].map(f => String(f || '').trim()).filter(f => f.length >= 2))],
  view: id => NTERM.views.get(id) || NTERM.views.set(id, { nest: null, focus: null }).get(id),
  /** The notes a scope covers, seen from note d (null when the note has no such scope). */
  scope(d, scope) {
    const live = x => !x.deleted && !x.archived;
    if (scope === 'theme') { const t = d && d.themeId && M.theme(d.themeId); return t ? { name: 'the theme ' + t.name, docs: DB.where('documents', x => live(x) && x.themeId === t.id) } : null; }
    if (scope === 'project') { const p = d && d.projectId && M.project(d.projectId); return p ? { name: 'the project ' + p.name, docs: DB.where('documents', x => live(x) && x.projectId === p.id) } : null; }
    return { name: 'the notebook', docs: DB.where('documents', live) };
  },
  why: scope => scope === 'theme' ? 'This note is in no theme' : 'This note is in no project',
  firstScope: d => NTERM.scope(d, 'theme') ? 'theme' : NTERM.scope(d, 'project') ? 'project' : 'notebook',
  /** The words around a match: { t, at: [from, to] } within t. */
  cut(text, a, z) {
    const s = Math.max(0, a - 70), e = Math.min(text.length, z + 110), cl = t => t.split(OBJ).join('').replace(/\s+/g, ' ');
    const pre = (s > 0 ? '…' : '') + cl(text.slice(s, a)), mid = cl(text.slice(a, z));
    return { t: pre + mid + cl(text.slice(z, e)) + (e < text.length ? '…' : ''), at: [pre.length, pre.length + mid.length] };
  },

  /* ---------- Fetch: the snapshot ---------- */
  fetch(b, quiet) {
    const T = b.nterm, d = M.doc(b.docId), sc = NTERM.scope(d, T.scope), forms = NTERM.forms(T);
    if (!sc) return toast(NTERM.why(T.scope) + ' — choose another scope');
    if (!forms.length) return toast('Type how the term is written first');
    const docIds = new Set(sc.docs.map(x => x.id)), hits = [];
    DB.where('blocks', x => x.status === 'live' && docIds.has(x.docId) && x.id !== b.id && x.kind !== 'nterm' && x.kind !== 'ref').forEach(x => {
      const text = String((x.body && x.body.text) || ''); if (!text.trim()) return;
      let n = 0, first = null; const found = new Set();
      forms.forEach(f => { const rx = TFORMS.rx(f); if (!rx) return; rx.lastIndex = 0; let m;
        while ((m = rx.exec(text))) { if (!m[0].length) { rx.lastIndex++; continue; } n++; found.add(f); if (!first || m.index < first[0]) first = [m.index, m.index + m[0].length]; } });
      if (n) hits.push({ x, n, first, found: [...found], text });
    });
    hits.sort((p, q) => q.n - p.n || String(q.x.modified || '').localeCompare(String(p.x.modified || '')));
    const keep = hits.slice(0, NTERM.MAXC), N = new Map(), E = [], add = (id, o) => { if (!N.has(id)) N.set(id, Object.assign({ id }, o)); return N.get(id); };
    add('T', { kind: 'term', label: T.name });
    const terms = new Map(), papers = new Map(), tally = (map, id, o) => { const e = map.get(id) || map.set(id, Object.assign({ n: 0 }, o)).get(id); e.n++; };
    keep.forEach(({ x, n, first, found, text }) => {
      const doc = M.doc(x.docId), K = typeof CKINDS !== 'undefined' && CKINDS.of(x);
      add(doc.id, { kind: 'note', label: doc.title || 'Untitled', sub: M.docPath(doc) });
      add(x.id, { kind: 'cmp', label: M.blockName(x) + ' — ' + snippet(text, 40), ck: K && K.label, color: K && K.color, doc: doc.id, sub: doc.title || 'Untitled', n, f: found, s: NTERM.cut(text, first[0], first[1]) });
      E.push([x.id, 'T', 'term', 'uses'], [x.id, doc.id, 'in', 'in']);
      (x.body.marks || []).forEach(m => {
        if (m.type === 'term' && M.term(m.ref)) { const t = M.term(m.ref); tally(terms, t.id, { kind: t.kind === 'person' ? 'person' : 'term', label: t.label, from: [] }); terms.get(t.id).from.push(x.id); }
        if (m.type === 'cite' && M.lib(m.ref)) { const r = M.lib(m.ref); tally(papers, r.id, { kind: 'paper', label: r.title || r.url || 'Paper', from: [] }); papers.get(r.id).from.push(x.id); }
      });
    });
    [[terms, NTERM.MAXT, 'term', 'mentions'], [papers, NTERM.MAXP, 'cite', 'cites']].forEach(([map, max, kind, rel]) =>
      [...map.entries()].sort((p, q) => q[1].n - p[1].n).slice(0, max).forEach(([id, o]) => { add(id, { kind: o.kind, label: o.label }); [...new Set(o.from)].forEach(f => E.push([f, id, kind, rel])); }));
    DB.all('wires').forEach(w => { if (N.has(w.from) && N.has(w.to) && N.get(w.from).kind === 'cmp' && N.get(w.to).kind === 'cmp') E.push([w.from, w.to, 'wire', (REL[w.rel] || { label: w.rel }).label]); });
    const nodes = [...N.values()];   // V3.969: no layout kept — the nests are laid out from the graph each time, the same way
    T.snap = { at: isoLocal(new Date()), scope: T.scope, scopeName: sc.name, forms, total: hits.length, notes: nodes.filter(v => v.kind === 'note').length, nodes, edges: E };
    NTERM.views.delete(b.id); NTERM.save(b);
    if (!quiet) toast(hits.length ? 'Fetched · ' + plural(hits.length, 'component') + ' in ' + plural(T.snap.notes, 'note') : 'Nothing in ' + sc.name + ' uses it yet');
  },
  /** The graph from stored nodes (copies: the snapshot stays as it was fetched) and edges ([a, b, kind, rel]). */
  graph(nodes, E) { return NEST.graph(nodes.map(v => Object.assign({}, v)), E.map(e => ({ a: e[0], b: e[1], kind: e[2], rel: e[3] }))); },
  save(b) {
    const T = b.nterm, f = NTERM.forms(T).filter(x => x !== T.name);
    b.label = T.name; b.body = { text: 'Term in this note: ' + T.name + (f.length ? ' (also ' + f.join(', ') + ')' : ''), marks: [] };
    DB.put('blocks', b); changed();
  },
  /** The words or the scope changed since the snapshot. */
  stale(T) { const s = T.snap; return !!s && (s.scope !== T.scope || NTERM.forms(T).join('\n') !== s.forms.join('\n')); },

  /* ---------- the component ---------- */
  body(b, d, pane, ro) {
    const T = b.nterm || (b.nterm = { name: b.label || '', forms: [], scope: NTERM.firstScope(d) }), s = T.snap;
    const keyStop = e => e.stopPropagation();
    const name = h('input.inp.nt-name', { value: T.name, placeholder: 'The term — e.g. ERK wave', readOnly: ro, on: { keydown: e => { keyStop(e); if (e.key === 'Enter') e.target.blur(); }, change: e => { const v = e.target.value.trim(); if (!v || v === T.name) return; T.name = v; NTERM.save(b); } } });
    const addForm = h('input.inp.nt-add', { placeholder: '+ another way it is written', readOnly: ro, on: { keydown: e => { keyStop(e); if (e.key !== 'Enter') return; const v = e.target.value.trim(); if (v.length < 2 || NTERM.forms(T).includes(v)) return; T.forms = [...(T.forms || []), v]; NTERM.save(b); } } });
    const forms = h('div.nt-forms', (T.forms || []).map(f => h('span.nt-form', f, ro ? null : h('button.nt-fx', { type: 'button', title: 'Take this form out', on: { click: () => { T.forms = T.forms.filter(x => x !== f); NTERM.save(b); } } }, '×'))), ro ? null : addForm);
    const seg = h('div.seg.nt-seg', NTERM.SCOPES.map(([k, l]) => { const ok = !!NTERM.scope(d, k); return h('button' + (T.scope === k ? '.on' : ''), { type: 'button', disabled: !ok || ro, title: ok ? 'Pull it from ' + NTERM.scope(d, k).name : NTERM.why(k), on: { click: () => { if (T.scope === k) return; T.scope = k; NTERM.save(b); } } }, l); }));
    const stale = NTERM.stale(T);
    const tools = h('div.nt-tools', ro ? null : h('button.btn.xs' + (!s || stale ? '.pri' : ''), { type: 'button', title: 'Pull the components that use it now — the map changes only when you fetch', on: { click: () => NTERM.fetch(b) } }, '⟳ Fetch'),
      h('button.btn.xs', { type: 'button', title: 'Back to how the last Fetch left it', disabled: !s, on: { click: () => NTERM.reload(b.id) } }, '↺ Reload'),
      h('button.btn.xs', { type: 'button', title: 'Dive in: the map on the whole window', disabled: !s, on: { click: () => NTERM.max(b) } }, '⤢'));
    const say = !s ? 'Not fetched yet — Fetch pulls it from ' + (NTERM.scope(d, T.scope) || { name: 'the notebook' }).name + '.'
      : 'Fetched ' + fmtWhen(s.at) + ' from ' + s.scopeName + ' · ' + plural(s.nodes.filter(v => v.kind === 'cmp').length, 'component') + ' in ' + plural(s.notes, 'note')
        + (s.total > NTERM.MAXC ? ' (the ' + NTERM.MAXC + ' that use it most of ' + s.total + ')' : '') + (stale ? ' · the words or the scope changed: Fetch to update' : ' · it stays as it is until you fetch again');
    const wrap = h('div.nterm', h('div.nt-head', name, seg, tools), forms, h('div.tiny.muted.nt-say' + (stale ? '.stale' : ''), say));
    wrap.append(s ? NTERM.stage(b, false) : h('div.nt-empty', ro ? 'Not fetched.' : 'Type the ways it is written, choose where to pull it from, then Fetch.'));
    return wrap;
  },
  /** The map and its side panel; big: on the whole window. Each map is a NEST map of its own; the pick and the nest are the block's view. */
  stage(b, big) {
    const panel = h('aside.nt-panel.scrolly'), map = h('div.nt-map', { title: 'Click a note: fly in · click outside: fly out · click a dot: its words · drag: turn · wheel: closer · double-click a component: open it' });
    const st = h('div.nt-stage.nopan.scrolly' + (big ? '.big' : ''), { style: big ? null : { height: NTERM.H + 'px' } }, map, panel);
    const I = NEST.make({ center: 'T', links: true, sel: { focus: null, path: [], time: 1 },
      pick: (I, id) => NTERM.focus(I.b, id), panel: I => NTERM.panel(I),
      moved: (I, n) => { NTERM.view(I.b).nest = n.id; if (I.panel) NTERM.panel(I); },
      open: (I, hv) => { const v = hv.o.v; if (hv.kind === 'nest') { if (hv.o.kind === 'note') NTERM.dive(I.b, hv.o.id); return; } if (!v) return;
        if (v.kind === 'cmp') return NTERM.open(v.id); if ((v.kind === 'term' || v.kind === 'person') && M.term(v.id)) return App.go('#/lens/' + v.id); if (v.kind === 'paper' && M.lib(v.id)) App.go('#/read/' + v.id); } });
    Object.assign(I, { b: b.id, big, el: st, panel });
    const L = NTERM.insts.get(b.id) || NTERM.insts.set(b.id, new Set()).get(b.id); L.forEach(x => { if (!x.el.isConnected || x.big === big) L.delete(x); }); L.add(I);
    NEST.mount(I, map, 0);
    setTimeout(() => { if (!st.isConnected) return; NEST.size(I); NTERM.build(I); }, 0);
    return st;
  },
  /** The snapshot on the map: the term the outer sphere, its themes (its projects, from the whole notebook), the notes, the dots. */
  build(I) {
    const b = M.block(I.b), s = b && b.nterm && b.nterm.snap; if (!s) return; const V = NTERM.view(I.b);
    Object.assign(I.o, { rootLabel: b.nterm.name, group: s.scope === 'notebook' ? NEST.GROUP.project : NEST.GROUP.theme, groupWord: s.scope === 'notebook' ? 'project' : 'theme' });
    I.G = NTERM.graph(s.nodes, s.edges); if (V.focus && !I.G.byId.has(V.focus)) V.focus = null; I.sel.focus = V.focus;
    NEST.show(I, V.nest); NTERM.panel(I);
  },
  /** Every map of this block again (after Reload, a Fetch, a redraw of the note). */
  redo(id) { (NTERM.insts.get(id) || new Set()).forEach(I => { if (I.el.isConnected) NTERM.build(I); }); },
  reload(id) { NTERM.views.delete(id); (NTERM.insts.get(id) || new Set()).forEach(I => { I.cam = NEST.cam0(); I.nest = null; }); NTERM.redo(id); },
  /** Into a note (null: back to where the map opens), on every map of this block. */
  dive(id, docId) { const V = NTERM.view(id); V.focus = null;
    (NTERM.insts.get(id) || new Set()).forEach(I => { if (!I.el.isConnected || !I.L) return; I.sel.focus = null; const n = docId ? I.L.byId.get(docId) : NEST.start(I); if (n) NEST.flyTo(I, n, 450); NTERM.panel(I); }); },
  focus(id, nid) { const V = NTERM.view(id); V.focus = nid; (NTERM.insts.get(id) || new Set()).forEach(I => { if (!I.el.isConnected || !I.G) return; I.sel.focus = I.G.byId.has(nid) ? nid : null; I.sel.path = []; NTERM.panel(I); NEST.draw(I); }); },
  /** The side panel: the notes (to fly into), the components of the note the map is in, or what the picked node is. */
  panel(I) {
    const P = I.panel, G = I.G, b = M.block(I.b), at = I.nest, v = I.sel.focus && G && G.byId.get(I.sel.focus); if (!P || !G || !b || !b.nterm || !b.nterm.snap) return;
    const dot = x => h('i', { style: { background: x.color || ATLAS.KINDC[x.kind] } }), row = (x, sub, click) => h('div.at-edge', { on: { click } }, dot(x), h('span', snippet(x.label, 70)), sub != null ? h('span.s', sub) : null);
    const cmps = G.nodes.filter(x => x.kind === 'cmp');
    if (!v) {
      if (at && at.kind === 'note') { const cs = cmps.filter(c => c.doc === at.id).sort((p, q) => (q.n || 0) - (p.n || 0));
        return P.replaceChildren(h('div.at-ph', h('b', at.label), h('div.tiny.muted', plural(cs.length, 'component') + ' using “' + b.nterm.name + '”')), h('div.at-edges', cs.map(c => row(c, c.n + '×', () => NTERM.focus(I.b, c.id))))); }
      const within = at && at.kind === 'project' ? new Set(at.kids.map(k => k.id)) : null;
      const notes = G.nodes.filter(x => x.kind === 'note' && (!within || within.has(x.id))).map(x => ({ x, n: cmps.filter(c => c.doc === x.id).length })).sort((p, q) => q.n - p.n);
      return P.replaceChildren(h('div.at-ph', h('b', within ? at.label : b.nterm.name), h('div.tiny.muted', 'Written ' + b.nterm.snap.forms.map(f => '“' + f + '”').join(' · '))),
        h('div.at-edges', notes.length ? notes.map(o => row(o.x, plural(o.n, 'component'), () => NTERM.dive(I.b, o.x.id))) : h('div.tiny.muted', 'No component used it when it was fetched.')));
    }
    const kids = G.edges.filter(e => e.a === v.id || e.b === v.id).map(e => G.byId.get(e.a === v.id ? e.b : e.a)).filter((x, i, A) => x && A.indexOf(x) === i);
    const head = h('div.at-ph', h('span.pill', { style: { background: v.color || ATLAS.KINDC[v.kind], color: '#fff' } }, v.id === 'T' ? 'this term' : v.ck || ATLAS.KINDL[v.kind].replace(/s$/, '')), h('b', v.kind === 'cmp' ? v.label.split(' — ')[0] : v.label), v.sub ? h('div.tiny.muted', v.sub) : null);
    const acts = [];
    if (v.kind === 'cmp') {
      acts.push(h('button.btn.xs.pri', { type: 'button', on: { click: () => NTERM.open(v.id) } }, 'Open'), h('button.btn.xs', { type: 'button', title: 'A pulled-in copy of it beside this term (live: it changes with the original)', on: { click: () => NTERM.pull(I.b, v.id) } }, 'Pull in here'));
      head.append(h('div.nt-snip', v.s.t.slice(0, v.s.at[0]), h('mark', v.s.t.slice(v.s.at[0], v.s.at[1])), v.s.t.slice(v.s.at[1])), h('div.tiny.muted', plural(v.n, 'use') + ' · as ' + v.f.map(f => '“' + f + '”').join(', ')));
    } else if (v.kind === 'note') acts.push(h('button.btn.xs.pri', { type: 'button', on: { click: () => NTERM.dive(I.b, v.id) } }, 'Fly in'), h('a.btn.xs', { href: '#/doc/' + v.id }, 'Open the note'));
    else if (v.id !== 'T' && (v.kind === 'term' || v.kind === 'person') && M.term(v.id)) acts.push(h('a.btn.xs', { href: '#/lens/' + v.id }, 'Its lens'));
    else if (v.kind === 'paper' && M.lib(v.id)) acts.push(h('a.btn.xs', { href: '#/read/' + v.id }, 'Read'));
    acts.push(h('button.btn.xs.ghost', { type: 'button', on: { click: () => NTERM.focus(I.b, null) } }, 'Unfocus'));
    head.append(h('div.row', { style: { gap: '6px', marginTop: '8px', flexWrap: 'wrap' } }, acts));
    P.replaceChildren(head, h('div.at-edges', kids.map(x => row(x, x.kind === 'cmp' && x.n ? x.n + '×' : null, () => NTERM.focus(I.b, x.id)))));
  },
  open(id) { const x = M.block(id); if (!x || x.status !== 'live') return toast('That component is no longer in the notebook'); $$('.nt-max').forEach(o => o._close && o._close()); App.openBlock(id); },
  pull(termId, id) {
    const t = M.block(termId), x = M.block(id); if (!t || !x || x.status !== 'live') return toast('That component is no longer in the notebook');
    const y = DB.where('blocks', z => z.docId === t.docId && z.kind === 'ref' && z.refBlockId === id && z.status === 'live')[0]; if (y) { App.openBlock(y.id); return toast('Already pulled into this note'); }
    M.addBlock(t.docId, t.id, { kind: 'ref', refItemId: null, refBlockId: id, x: Math.round(((t.x || 0) + (t.w || 616) + 56) / 14) * 14, y: t.y || 0, w: 392 }); changed(); toast('Pulled in beside the term');
  },
  /** Dive in: the same map on the whole window (Esc or Close comes back). */
  max(b) {
    const ov = h('div.nt-max'), close = () => { ov.remove(); document.removeEventListener('keydown', key, true); NTERM.redo(b.id); }, key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    ov._close = close;
    ov.append(h('div.em-bar', h('b', b.nterm.name), h('span.tiny.muted', 'a term in “' + ((M.doc(b.docId) || {}).title || 'this note') + '” · fetched ' + fmtWhen(b.nterm.snap.at) + ' from ' + b.nterm.snap.scopeName), h('span.spacer'),
      h('button.btn.sm', { type: 'button', title: 'Back to how the last Fetch left it', on: { click: () => NTERM.reload(b.id) } }, '↺ Reload'), h('button.btn.sm', { type: 'button', on: { click: close } }, 'Close ✕')), NTERM.stage(b, true));
    document.body.append(ov); document.addEventListener('keydown', key, true);
  },
  async insert(d, p) {
    const name = await askText('A term in this note', 'How it is written (add other forms on the component)', '', { placeholder: 'ERK wave' }); if (!name || !name.trim()) return;
    const b = M.addBlock(d.id, null, { kind: 'nterm', label: name.trim(), x: p.x, y: p.y, w: 672, nterm: { name: name.trim(), forms: [], scope: NTERM.firstScope(d) } });
    NTERM.fetch(b, true); toast(b.nterm.snap.total ? 'Term made · ' + plural(b.nterm.snap.total, 'component') + ' use it in ' + b.nterm.snap.scopeName : 'Term made · nothing in ' + b.nterm.snap.scopeName + ' uses it yet — add its other forms, then Fetch');
  },

  /* ---------- its forms underlined in this note (nothing is saved; other notes see nothing) ---------- */
  paint: debounce(() => {
    if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
    const ranges = [];
    App.panes().forEach(p => {
      const terms = DB.where('blocks', b => b.docId === p.docId && b.kind === 'nterm' && b.status === 'live' && b.nterm); if (!terms.length || !p.paper) return;
      const rxs = [...new Set(terms.flatMap(b => NTERM.forms(b.nterm)))].map(f => TFORMS.rx(f)).filter(Boolean);
      $$('.box .ed', p.paper.world).forEach(ed => { const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { const t = n.nodeValue; if (!t || t.length < 2) continue; rxs.forEach(rx => { rx.lastIndex = 0; let m; while ((m = rx.exec(t))) { if (!m[0].length) { rx.lastIndex++; continue; } const r = new Range(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); ranges.push(r); } }); } });
    });
    CSS.highlights.set('nterm', new Highlight(...ranges));
  }, 250),
};
WIDGETS.nterm = { label: 'note term', w: 672, body: NTERM.body, menu: b => [{ label: 'Fetch', sub: 'Pull the components that use it now', run: () => NTERM.fetch(b) }, b.nterm && b.nterm.snap ? { label: 'Dive in', sub: 'The map on the whole window', run: () => NTERM.max(b) } : null].filter(Boolean) };
INSERTS.push({ id: 'noteterm', group: 'Writing', icon: '⌖', label: 'Term in this note…', sub: 'A term that lives here: the ways it is written, pulled from the theme, the project or the notebook as a small Atlas', run: (d, p) => NTERM.insert(d, p) });
{
  const up = DocView.update; DocView.update = function () { const r = up.apply(this, arguments); NTERM.paint(); return r; };
  const rn = DocView.render; DocView.render = function () { const r = rn.apply(this, arguments); setTimeout(NTERM.paint, 0); return r; };
  document.addEventListener('focusout', e => { if (e.target && e.target.closest && e.target.closest('.box .ed')) NTERM.paint(); });
}
