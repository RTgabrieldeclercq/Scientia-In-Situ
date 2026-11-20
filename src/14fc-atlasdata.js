/* ==========================================================================
   14fc · The Atlas's Data (V4.49 — Gabe: "create data tab in Atlas, which
   organizes all trees recorded there for a master tree").
   Every data tree in the notebook (13zzyc: the folders and files logged on a
   component, b.dtree) in one master tree, read-only, drawn by the data tree
   itself (DTREE.el on a tree made for it), so folders fold and sizes, counts
   and dates read the same as on a note:
   - By project (where it starts): each project (then "No project"), its
     notes with data — each with its kind's label in its colour (Experiment,
     Note, Lit review, Synthesis: the Portfolio's colours) and Open, which
     goes to the component in its note — then the folders and files logged
     there. A note with data on several components has one branch each.
   - One merged tree: the folders of every note merged by name, level by
     level — the same folder logged in three notes is one folder — each
     marked with the notes it is in ("in 3 notes", a click lists them).
   - A line at the top adds it all up (folders · files · size, in how many
     notes of how many projects); Search keeps what matches and opens the
     folders above it. Nothing is copied or changed: the trees stay on their
     components.
   NOTEKIND: a note's kind for its label — of(d) ('exp' | 'notes' | 'lit' |
   'syn', as the Portfolio sorts them), chip(d) (its symbol and word in the
   section colour, 31-banners.css). Hot notes (20e) use it too.
   ADATA: render() the section · build(by, q) the master tree · stats().
   Settings → Tabs & overview → Data (in the Atlas) (atlasdata, 20a).
   ========================================================================== */
const NOTEKIND = {
  LABEL: { exp: 'Experiment', notes: 'Note', lit: 'Lit review', syn: 'Synthesis' },
  of(d) {
    if (!d) return 'notes';
    try { if (d.type === 'reflection' || (typeof SYNTH !== 'undefined' && SYNTH.is && SYNTH.is(d))) return 'syn'; } catch (e) { }
    try { if (PFLIST.isLit(d)) return 'lit'; if (PFLIST.isExp(d)) return 'exp'; } catch (e) { }
    return 'notes';
  },
  chip(d, cls, k) {
    k = k || NOTEKIND.of(d); const el = h('span.nk' + (cls ? '.' + cls : ''), { 'data-sk': k, title: NOTEKIND.LABEL[k] });
    if (typeof PFICON !== 'undefined') el.append(PFICON.el(k, 12)); el.append(h('span.nk-l', NOTEKIND.LABEL[k])); return el;
  },
};
const ADATA = {
  st: { by: 'project', q: '' }, meta: new Map(),
  on: () => (typeof FEAT === 'undefined' || FEAT.on('atlasdata')) && (typeof DTREE === 'undefined' || DTREE.on()),
  liveDoc: id => { const d = M.doc(id); return d && !d.deleted && !d.archived ? d : null; },
  comps: () => DB.where('blocks', b => b.status === 'live' && DTREE.shows(b) && DTREE.items(b).length > 0 && !!ADATA.liveDoc(b.docId)),
  copy: list => JSON.parse(JSON.stringify(list || [])),
  /** A component's entries in the master tree (V4.87: an experiment's image panels, tables and datasets too, 14ff). */
  items: b => DTREE.items(b),
  stats() {
    const C = ADATA.comps(), c = { dirs: 0, files: 0, bytes: 0, notes: new Set(), projects: new Set() };
    C.forEach(b => { const x = DTREE.count(ADATA.items(b)); c.dirs += x.dirs; c.files += x.files; c.bytes += x.bytes; c.notes.add(b.docId); c.projects.add(ADATA.liveDoc(b.docId).projectId || '-'); });
    return { dirs: c.dirs, files: c.files, bytes: c.bytes, notes: c.notes.size, projects: c.projects.size, comps: C.length };
  },
  /** The master tree: { items, meta } — meta by path: { t: 'project' | 'note' | 'comp', id, doc, blk, src: [docIds] }. */
  build(by, q) {
    const C = ADATA.comps(), meta = new Map(); let items = [];
    if (by === 'merged') {
      const merge = (into, list, docId) => list.forEach(e => {
        let x = into.find(y => y.n === e.n && !!y.dir === !!e.dir);
        if (!x) { x = Object.assign({}, e, { k: e.dir ? [] : undefined, _src: [] }); delete x.st; into.push(x); }
        else if (!e.dir && (e.m || 0) > (x.m || 0)) { x.s = e.s; x.m = e.m; }
        if (!x._src.includes(docId)) x._src.push(docId);
        if (e.dir) { merge(x.k, e.k || [], docId); x.more = Math.max(x.more || 0, e.more || 0); }
      });
      C.forEach(b => merge(items, ADATA.copy(ADATA.items(b)), b.docId));
      DTREE.sortAll(items);
      const walk = (list, base) => list.forEach(e => { const p = base ? base + '/' + e.n : e.n; meta.set(p, { t: 'merged', src: e._src || [] }); if (e.dir) walk(e.k || [], p); });
      walk(items, '');
    } else {
      const projs = new Map(), order = DB.all('projects').map(p => p.id);
      C.forEach(b => { const d = ADATA.liveDoc(b.docId), pk = d.projectId && M.project(d.projectId) ? d.projectId : '-'; if (!projs.has(pk)) projs.set(pk, new Map()); const notes = projs.get(pk); if (!notes.has(d.id)) notes.set(d.id, []); notes.get(d.id).push(b); });
      const keys = [...projs.keys()].sort((a, z) => (a === '-') - (z === '-') || order.indexOf(a) - order.indexOf(z));
      const names = new Set(), uniq = (n, set) => { let x = n, i = 2; while (set.has(x)) x = n + ' (' + i++ + ')'; set.add(x); return x; };
      keys.forEach(pk => {
        const P = pk === '-' ? null : M.project(pk), pn = uniq(P ? P.name || 'A project' : 'No project', names), notes = projs.get(pk), nnames = new Set();
        const docs = [...notes.keys()].map(ADATA.liveDoc).sort((a, z) => String(z.modified || z.created || '').localeCompare(String(a.modified || a.created || '')));
        const pnode = { n: pn, dir: 1, k: [] }; meta.set(pn, { t: 'project', id: pk });
        docs.forEach(d => { const bs = notes.get(d.id), nn = uniq(d.title || 'Untitled', nnames), npath = pn + '/' + nn, nnode = { n: nn, dir: 1, k: [] };
          meta.set(npath, { t: 'note', doc: d.id, blk: bs[0].id });
          if (bs.length === 1) nnode.k = ADATA.copy(ADATA.items(bs[0]));
          else { const cn = new Set(); bs.forEach(b => { const lab = uniq((b.label || '').trim() || snippet((b.body && b.body.text) || 'A component', 40), cn); meta.set(npath + '/' + lab, { t: 'comp', doc: d.id, blk: b.id }); nnode.k.push({ n: lab, dir: 1, k: ADATA.copy(ADATA.items(b)) }); }); }
          pnode.k.push(nnode); });
        items.push(pnode);
      });
    }
    // Search: keep what matches (and what is above it), open the folders above it
    q = String(q || '').trim().toLowerCase();
    if (q) {
      const keep = (list, base) => list.filter(e => { const p = base ? base + '/' + e.n : e.n, me = String(e.n).toLowerCase().includes(q); if (e.dir) { const k2 = keep(e.k || [], p); if (k2.length && !me) e.k = k2; if (k2.length) { DTREE.st.open['_adata|' + p] = true; DTREE.st.all.add('_adata|' + p); } return me || k2.length > 0; } return me; });
      items = keep(items, '');
    }
    ADATA.meta = meta; return items;
  },
  tree() {
    const items = ADATA.build(ADATA.st.by, ADATA.st.q), vb = { id: '_adata', docId: null, kind: 'component', status: 'live', dtree: { items } };
    if (!items.length) return h('div.ad-empty', ADATA.st.q ? 'Nothing logged has “' + ADATA.st.q + '” in its name.' : 'No data logged yet. In a note, ⋯ → Log data… on a component (or drop a folder on it): its data tree joins this master tree.');
    return DTREE.el(vb, { ro: true, decorate: ADATA.dress });
  },
  /** The rows of the master tree: projects, notes (their kind, Open), components, and in the merged tree the notes a folder is in. */
  dress(root) {
    root.classList.add('ad-tree');
    root.querySelectorAll('.dt-r[data-p]').forEach(r => {
      const m = ADATA.meta.get(r.dataset.p); if (!m) return; const nm = r.querySelector('.dt-n');
      const open = (blk, label) => h('button.ad-open', { type: 'button', title: 'Open ' + label + ' at its data', 'aria-label': 'Open ' + label, on: { click: e => { e.stopPropagation(); const b = M.block(blk); if (b) App.jump(b.id, e); } } }, 'Open ↗');
      if (m.t === 'project') { r.classList.add('ad-proj'); const P = M.project(m.id); r.style.setProperty('--ph', String(P ? hashHue(m.id) : 210)); nm.before(h('span.ad-pdot', { 'aria-hidden': 'true' })); }
      else if (m.t === 'note') { const d = M.doc(m.doc); r.classList.add('ad-note'); nm.before(NOTEKIND.chip(d, 'ad-k')); const c = r.querySelector('.dt-c'); (c || nm).after(open(m.blk, '“' + (d ? d.title : 'the note') + '”')); }
      else if (m.t === 'comp') { r.classList.add('ad-comp'); const c = r.querySelector('.dt-c'); (c || nm).after(open(m.blk, 'this component')); }
      else if (m.t === 'merged' && m.src.length) {
        const ds = m.src.map(ADATA.liveDoc).filter(Boolean); if (!ds.length) return;
        const b = h('button.ad-src' + (ds.length > 1 ? '.many' : ''), { type: 'button', title: ds.map(d => d.title).join('\n') + '\nClick: go to one', on: { click: e => { e.stopPropagation(); const rr = e.currentTarget.getBoundingClientRect();
          ctxMenu(rr.left, rr.bottom + 4, [{ head: ds.length > 1 ? 'In ' + plural(ds.length, 'note') : 'In the note' }, ...ds.map(d => ({ label: d.title || 'Untitled', sub: NOTEKIND.LABEL[NOTEKIND.of(d)], run: () => { const bl = ADATA.comps().find(x => x.docId === d.id); if (bl) App.jump(bl.id); else App.go('#/doc/' + d.id); } }))]); } } },
          ds.length > 1 ? 'in ' + ds.length + ' notes' : snippet(ds[0].title || 'Untitled', 28));
        const c = r.querySelector('.dt-c'); (c || nm).after(b);
      }
    });
  },
  paint() { const host = ADATA.host; if (!host || !host.isConnected) return; host.replaceChildren(ADATA.tree()); },
  render() {
    const S = ADATA.stats(), st = ADATA.st;
    App.setTitle('Data', [h('span', S.notes ? plural(S.notes, 'note') + ' with data · the master tree' : 'the master tree')]);
    const seg = h('div.ad-seg', { role: 'radiogroup', 'aria-label': 'Arrange the master tree' }, [['project', 'By project'], ['merged', 'One merged tree']].map(([k, l]) =>
      h('button' + (st.by === k ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(st.by === k), on: { click: () => { if (st.by === k) return; st.by = k; seg.querySelectorAll('button').forEach(x => { const on = x.textContent === l; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); ADATA.paint(); } } }, l)));
    const q = h('input.inp.ad-q', { type: 'search', placeholder: 'Search the files and folders…', value: st.q, 'aria-label': 'Search the master tree', on: { input: debounce(e => { st.q = e.target.value; ADATA.paint(); }, 160) } });
    const sum = S.comps ? [plural(S.dirs, 'folder'), plural(S.files, 'file'), S.bytes ? DATA.fmtSize(S.bytes) : null].filter(Boolean).join(' · ') + ' — in ' + plural(S.notes, 'note') + ' of ' + plural(S.projects, 'project') : 'Nothing logged yet';
    ADATA.host = h('div.ad-host');
    const page = h('div.page.ad-page', h('div.eyebrow', COMP.on() ? 'Compendiums' : 'Atlas'), h('h1.title', 'Data'),
      h('p.stand', 'Every folder and file logged in your notes, in one master tree — by project and note, or merged into one. Open goes to the component it was logged on; nothing is copied or moved.'),
      h('div.ad-sum', sum), h('div.row.ad-bar', seg, q), ADATA.host);
    ADATA.host.append(ADATA.tree()); return page;   // drawn now (the page is not in the document yet); paint() redraws it later
  },
  /** Settings' preview: a small master tree, as it is set now. */
  preview() {
    const row = (d, kids, cls) => h('div.pv-ad-r' + (cls ? '.' + cls : ''), { style: { '--d': d } }, ...kids);
    const lab = k => h('span.nk', { 'data-sk': k }, NOTEKIND.LABEL[k]);
    return h('div.pv-ad', COMP.pv('data'),
      h('div.pv-ad-t', row(0, [h('i.pv-ad-dot'), h('b', 'Cell mechanics'), h('span', '2 notes')], 'p'),
        row(1, [lab('exp'), h('b', 'Run 3 · 30 kPa'), h('span', '2 folders · 41 files'), h('em', 'Open ↗')]),
        row(2, [h('span.pv-ad-f', '▸'), h('span', 'raw'), h('span', '36 files · 3.1 GB')]),
        row(2, [h('span.pv-ad-f', '▸'), h('span', 'fields'), h('span', '5 files · 280 MB')]),
        row(1, [lab('notes'), h('b', 'Bead calibration'), h('span', '1 folder · 6 files'), h('em', 'Open ↗')])));
  },
};
{
  // the data tree draws the master tree: rows dressed after each draw (a fold draws it again)
  const el0 = DTREE.el; DTREE.el = function (b, o) { const r = el0.apply(this, arguments); try { if (o && o.decorate) o.decorate(r); } catch (e) { console.warn('[atlas data]', e); } return r; };
  COMP.add({ key: 'data', label: 'Data', order: 20, desc: 'Every folder and file logged in your notes, in one master tree — by project and note, or merged.', peek: () => { try { const S = ADATA.stats(); return S.comps ? [plural(S.files, 'file') + ' in ' + plural(S.dirs, 'folder'), plural(S.notes, 'note') + ' of ' + plural(S.projects, 'project')] : []; } catch (e) { return []; } }, icon: DTREE.svg('tree', 14), title: 'Every data tree in your notes, in one master tree', on: ADATA.on, count: () => { try { return ADATA.stats().notes; } catch (e) { return null; } }, render: () => ADATA.render() });
}
