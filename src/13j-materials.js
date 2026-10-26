/* ==========================================================================
   13j · Materials and inventory. A resource is a project-scoped note type
   (cell line, antibody, gel batch, instrument, plasmid, chemical…) whose
   header holds lot, passage, concentration, supplier and location. A
   derived material (passage N → N+1, a new gel batch) supersedes the one
   it came from. Notes list the materials they used; components can bind to
   them. The Materials page asks the inventory question: do barriers cluster
   on one lot?
   ========================================================================== */
const MATS = {
  all: () => DB.where('documents', d => d.type === 'resource' && !d.archived),
  label(r) { const H = r.header || {}; return r.title + (H.lot ? ' · lot ' + H.lot : '') + (H.passage ? ' · p' + H.passage : ''); },
  sub(r) { const H = r.header || {}; return [H.kind || 'resource', H.conc, H.supplier, H.location, (M.project(r.projectId) || {}).name].filter(Boolean).join(' · '); },
  /** Notes that used a resource: listed on the note, or bound on one of its components. */
  usedIn(rid) { const s = new Set(DB.where('documents', d => (d.materials || []).includes(rid)).map(d => d.id)); DB.where('blocks', b => b.status !== 'removed' && ((b.binds || {}).resources || []).includes(rid)).forEach(b => s.add(b.docId)); return [...s].map(M.doc).filter(Boolean); },
  barriersIn(docs, term) {
    const ids = new Set(docs.map(d => d.id));
    return DB.where('items', it => it.kind === 'barrier' && ids.has(it.originDocId) && !it.correctedBy && (!term || (IX.blockTerms.get(it.originBlockId) || new Set()).has(term.id) || it.text.toLowerCase().includes(term.label.toLowerCase())));
  },
  pick(d, cb) {
    const m = modal({ title: 'Materials used in this note', wide: true, actions: [{ label: 'Done' }, { label: '+ New material', run: () => App.newDoc({ type: 'resource', projectId: d.projectId }) }],
      body: optionPicker({ placeholder: 'Search cell lines, antibodies, gel batches, lots…', sort: 'mats', items: q => MATS.all().filter(r => !(d.materials || []).includes(r.id) && (!q || (MATS.label(r) + ' ' + MATS.sub(r)).toLowerCase().includes(q))),
        section: r => ((r.header || {}).kind || 'other') + (r.projectId === d.projectId ? '' : ' · other project'), render: r => h('div', h('b', MATS.label(r)), (r.supersededBy || []).length ? h('span.pill', 'has a newer one') : null, h('span.s', MATS.sub(r))),
        emptyText: 'No materials yet — “+ New material”', onPick: r => { d.materials = [...new Set([...(d.materials || []), r.id])]; M.touchDoc(d); changed(); m.close(); cb && cb(); } }) });
  },
  derive(r) {
    const H = Object.assign({}, r.header), p = parseInt(H.passage, 10); if (!isNaN(p)) H.passage = String(p + 1);
    const title = !isNaN(p) && /p\s?\d+/i.test(r.title) ? r.title.replace(/p\s?(\d+)/i, (m, n) => 'p' + (+n + 1)) : r.title + ' (next)';
    askText('Derive a new material from “' + r.title + '”', 'Name', title).then(t => { if (!t) return;
      const nd = M.createDoc({ type: 'resource', projectId: r.projectId, title: t, templateId: (M.enabledTemplates('resource')[0] || {}).id, header: H });
      nd.supersedes = [r.id]; DB.put('documents', nd); r.supersededBy = [...(r.supersededBy || []), nd.id]; DB.put('documents', r); changed(); App.go('#/doc/' + nd.id); toast('Derived — lineage kept'); });
  },
  /** Extra rows on a note's header box: materials used, or for a resource its lineage and use. */
  headExtras(d, pane) {
    if (pane.travel) return null;
    if (d.type === 'day') return DAY.head(d);
    if (prof(d.type).scope === 'global' && d.type !== 'literature') return null;
    if (d.type === 'resource') {
      const from = (d.supersedes || []).map(M.doc).filter(Boolean), to = (d.supersededBy || []).map(M.doc).filter(Boolean), used = MATS.usedIn(d.id), bars = MATS.barriersIn(used);
      return h('div.hfoot.mats',
        from.length ? h('div', 'Derived from ', from.map(x => h('a', { on: { click: e => App.jump(x.id, e, true) } }, x.title))) : null,
        to.length ? h('div', 'Superseded by ', to.map(x => h('a', { on: { click: e => App.jump(x.id, e, true) } }, x.title))) : null,
        h('div', `Used in ${plural(used.length, 'note')} · ${plural(bars.length, 'barrier')} recorded there`, ' ', h('a', { on: { click: () => App.go('#/materials') } }, 'compare lots ↗')),
        h('button.btn.xs', { on: { click: () => MATS.derive(d) } }, (d.header || {}).passage ? 'Next passage…' : 'Derive next batch…'));
    }
    const mats = (d.materials || []).map(M.doc).filter(Boolean);
    return h('div.hfoot.mats', h('span.lab', 'Materials'), mats.map(r => h('span.bchip.res', { title: MATS.sub(r) }, h('a', { on: { click: e => App.jump(r.id, e, true) } }, '◇ ' + snippet(MATS.label(r), 34)), h('button', { title: 'Remove', on: { click: () => { d.materials = d.materials.filter(x => x !== r.id); M.touchDoc(d); changed(); } } }, '×'))),
      h('button.btn.xs', { on: { click: () => MATS.pick(d) } }, '+ material'));
  },
};

/* ---------------- the Materials page: inventory + the barrier axis ---------------- */
const MaterialsView = {
  title: true, st: { kind: '', term: '', q: '' },
  render() {
    const st = MaterialsView.st, all = MATS.all(), terms = DB.all('terms'), term = st.term && M.term(st.term);
    App.setTitle('Materials', [h('span', plural(all.length, 'material') + ' · cell lines, antibodies, batches, instruments')]);
    const kinds = [...new Set(all.map(r => (r.header || {}).kind || 'other'))];
    const rows = all.filter(r => (!st.kind || ((r.header || {}).kind || 'other') === st.kind) && (!st.q || (MATS.label(r) + ' ' + MATS.sub(r)).toLowerCase().includes(st.q.toLowerCase())))
      .map(r => { const used = MATS.usedIn(r.id), bars = MATS.barriersIn(used, term); return { r, used, bars, open: bars.filter(b => IX.status(b) === 'open').length, rate: used.length ? bars.length / used.length : 0 }; });
    const byKind = {}; rows.forEach(x => { const k = (x.r.header || {}).kind || 'other'; (byKind[k] = byKind[k] || []).push(x); });
    const redraw = () => { App._mounted = false; App.refresh(); };
    const groups = Object.entries(byKind).map(([k, xs]) => {
      const tot = xs.reduce((s, x) => s + x.bars.length, 0), notes = xs.reduce((s, x) => s + x.used.length, 0), mean = notes ? tot / notes : 0, max = Math.max(1, ...xs.map(x => x.rate));
      xs.sort((a, b) => b.rate - a.rate || b.bars.length - a.bars.length);
      return h('div.card.flat', { style: { marginBottom: '12px' } }, h('div.row', h('h3.lab', { style: { margin: 0 } }, k), h('span.tiny.muted', `${plural(xs.length, 'item')} · ${plural(tot, 'barrier')} across ${plural(notes, 'use')}${term ? ' mentioning “' + term.label + '”' : ''}`)),
        h('table.t.matt', h('thead', h('tr', ['Material', 'Lot · passage', 'Used in', 'Barriers', 'Per use', ''].map(x => h('th', x)))),
          h('tbody', xs.map(x => { const cl = xs.length > 1 && x.bars.length >= 2 && x.rate >= 2 * mean, H = x.r.header || {};
            return h('tr' + (cl ? '.cluster' : ''), { on: { click: e => App.jump(x.r.id, e, true) } }, h('td', h('b', x.r.title), (x.r.supersededBy || []).length ? h('span.pill', 'superseded') : null, h('div.tiny.muted', [H.conc, H.supplier].filter(Boolean).join(' · '))),
              h('td.mono.tiny', [H.lot ? 'lot ' + H.lot : '', H.passage ? 'p' + H.passage : ''].filter(Boolean).join(' · ') || '—'),
              h('td', { title: x.used.map(d => d.title).join('\n') }, plural(x.used.length, 'note')), h('td', x.bars.length ? `${x.bars.length}${x.open ? ' (' + x.open + ' open)' : ''}` : '—'),
              h('td', h('div.matbar', h('i', { style: { width: (100 * x.rate / max) + '%' } })), h('span.mono.tiny', x.rate ? x.rate.toFixed(2) : '0')), h('td', cl ? h('span.pill.bad', { title: `More than twice the ${k} average (${mean.toFixed(2)} per use)` }, 'clusters here') : null)); }))));
    });
    return h('div.page', h('div.eyebrow', 'Inventory'), h('h1.title', 'Materials'),
      h('p.stand', 'Cell lines, antibodies, gel batches, plasmids, chemicals and instruments — each a note with its lot, passage and concentration. List them on the notes that used them, and the barriers recorded there roll up by lot: a failing protocol is often one bad antibody lot or one gel batch.'),
      h('div.row', { style: { margin: '8px 0 14px', gap: '8px', flexWrap: 'wrap' } }, h('button.btn.pri', { on: { click: () => App.newDoc({ type: 'resource' }) } }, '+ New material'),
        h('select.inp', { style: { width: 'auto' }, on: { change: e => { st.kind = e.target.value; redraw(); } } }, h('option', { value: '' }, 'All kinds'), kinds.map(k => h('option', { value: k, selected: st.kind === k }, k))),
        h('select.inp', { style: { width: 'auto' }, title: 'Only barriers about this term', on: { change: e => { st.term = e.target.value; redraw(); } } }, h('option', { value: '' }, 'Barriers about any term'), terms.map(t => h('option', { value: t.id, selected: st.term === t.id }, 'Barriers about “' + t.label + '”'))),
        h('input.inp', { type: 'search', placeholder: 'Search…', value: st.q, style: { flex: '1 1 160px' }, on: { change: e => { st.q = e.target.value; redraw(); } } })),
      groups.length ? groups : h('div.empty', 'No materials yet. Add your cell lines, antibody lots and gel batches, then list them on the notes that used them.'));
  },
};
VIEWS.materials = MaterialsView;
