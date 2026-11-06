/* ==========================================================================
   13r · The material sheet. A material (cell line, antibody, gel batch,
   buffer…) opens as one compact page instead of a canvas: what it is, where
   it came from (made here — when, by whom, from what — or bought — supplier,
   catalogue number, lot), the details that matter for its kind, a quick log
   (thawed, aliquoted, passaged…), and where it was used. "Make another
   batch" copies the recipe into a new batch made now.
   Scalar fields live in doc.header (so lots and passages keep clustering on
   the Materials page); the recipe and the log live in doc.mat.
   ========================================================================== */
const MATKIND = {
  'cell line': { icon: '◐', fields: [['passage', 'Passage', 'p12'], ['medium', 'Medium', 'DMEM + 10% FBS'], ['frozen', 'Frozen / thawed', 'thawed 2 Oct'], ['myco', 'Mycoplasma test', 'neg · 1 Sep']] },
  'antibody': { icon: 'Y', fields: [['target', 'Target', 'pFAK Y397'], ['host', 'Host · clonality', 'rabbit mono'], ['dilution', 'Working dilution', '1:500'], ['conjugate', 'Conjugate', 'AF488']] },
  'gel batch': { icon: '▦', fields: [['stiffness', 'Target stiffness', '8 kPa'], ['measured', 'Measured', '8.4 ± 0.6 kPa'], ['ratio', 'Acrylamide · bis', '5% · 0.15%'], ['thickness', 'Thickness', '~100 µm'], ['coating', 'Coating', 'collagen I, 0.2 mg/mL']] },
  'reagent': { icon: '⚗', fields: [['ph', 'pH', '7.4'], ['volume', 'Volume made', '500 mL'], ['expires', 'Use by', '']] },
  'medium': { icon: '⚗', fields: [['base', 'Base', 'DMEM'], ['supplements', 'Supplements', '10% FBS, 1% P/S'], ['volume', 'Volume', '500 mL'], ['expires', 'Use by', '']] },
  'plasmid': { icon: '◯', fields: [['backbone', 'Backbone', 'pcDNA3.1'], ['insert', 'Insert', 'GFP-paxillin'], ['resistance', 'Resistance', 'Amp'], ['prep', 'Prep', 'midi · 1.2 µg/µL']] },
  'chemical': { icon: '◇', fields: [['mw', 'MW', '342.3 g/mol'], ['cas', 'CAS', ''], ['expires', 'Expires', '']] },
  'instrument': { icon: '⌖', fields: [['model', 'Model', ''], ['settings', 'Settings', ''], ['calibrated', 'Last calibrated', '']] },
  'other': { icon: '·', fields: [] },
};
const MATSTATUS = ['in use', 'running low', 'finished', 'discarded'];
const UNITS = ['µL', 'mL', 'L', 'mg', 'g', 'µg', 'ng', 'µM', 'mM', 'M', 'nM', '%', '% w/v', '% v/v', 'X', 'mg/mL', 'µg/mL', 'U', 'drops', 'pcs'];

const MATS2 = {
  mat(d) { d.mat = d.mat || { source: 'made', ingredients: [], log: [], notes: '' }; return d.mat; },
  kindOf: d => ((d.header || {}).kind || 'other'),
  /** Quick create: name, kind, made here / bought — then the sheet. */
  quick(pre = {}, onCreate) {
    const projects = DB.all('projects'); if (!projects.length) return toast('Create a project first (Portfolio → + Project)');
    let kind = pre.kind || _ls.get('lastMatKind', 'gel batch'), source = pre.source || 'made';
    const name = h('input.inp', { placeholder: 'e.g. PAA gel batch 16 · MDCK p13 · anti-pFAK lot 7731', value: pre.name || '' });
    const proj = h('select.inp', projects.map(p => h('option', { value: p.id, selected: p.id === (pre.projectId || _ls.get('lastMatProject', projects[0].id)) }, p.name)));
    const kinds = h('div.matkinds'), src = h('div.seg');
    const draw = () => { kinds.replaceChildren(...Object.keys(MATKIND).map(k => h('button.mk' + (k === kind ? '.on' : ''), { on: { click: () => { kind = k; draw(); } } }, h('i', MATKIND[k].icon), k)));
      src.replaceChildren(...[['made', 'Made here'], ['bought', 'Bought / received']].map(([k, l]) => h('button' + (k === source ? '.on' : ''), { on: { click: () => { source = k; draw(); } } }, l))); };
    draw();
    const go = () => { const nm = name.value.trim(); if (!nm) { toast('Give it a name'); return false; } _ls.set('lastMatKind', kind); _ls.set('lastMatProject', proj.value);
      const d = MATS2.create({ name: nm, kind, source, projectId: proj.value }); onCreate ? onCreate(d) : App.go('#/mat/' + d.id); };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (go() !== false) m.close(); } });
    const m = modal({ title: 'New material', body: h('div', h('label.f', h('span', 'Name'), name), h('div.lab', { style: { margin: '12px 0 6px' } }, 'Kind'), kinds,
      h('div.grid2', { style: { marginTop: '12px' } }, h('label.f', h('span', 'Source'), src), h('label.f', h('span', 'Project'), proj)),
      h('p.tiny.muted', { style: { marginTop: '10px' } }, source === 'made' ? 'Made here: it is stamped now — add the ingredients on its sheet.' : 'Bought: add supplier, catalogue number and lot on its sheet.')),
      actions: [{ label: 'Cancel' }, { label: 'Create', pri: true, run: go }] });
    setTimeout(() => name.focus(), 30);
  },
  create({ name, kind, source, projectId, header = {}, mat = {} }) {
    const d = M.createDoc({ type: 'resource', projectId, title: name, templateId: null, header: Object.assign({ kind }, header) });
    d.blockIds.map(M.block).filter(b => b && !b.body.text).forEach(b => DB.del('blocks', b.id)); d.blockIds = [];
    d.mat = Object.assign({ source, ingredients: [], log: [], notes: '', status: 'in use' }, mat);
    if (source === 'made' && !d.mat.madeAt) d.mat.madeAt = isoLocal(new Date());
    if (source === 'made' && !d.header.lot) { const base = 'B' + localDate(new Date()).slice(2).replace(/-/g, ''), taken = new Set(MATS.all().map(x => (x.header || {}).lot)); let lot = base, i = 1; while (taken.has(lot)) lot = base + '-' + (++i); d.header.lot = lot; }
    DB.put('documents', d); changed(); return d;
  },
  /** A new batch from this one: same recipe and details, made now, its own lot; the old one is marked as superseded. */
  again(r) {
    const H = Object.assign({}, r.header), p = parseInt(H.passage, 10); if (!isNaN(p)) H.passage = String(p + 1); delete H.lot;
    const om = MATS2.mat(r), title = !isNaN(p) && /p\s?\d+/i.test(r.title) ? r.title.replace(/p\s?(\d+)/i, (m, n) => 'p' + (+n + 1)) : /\d+\s*$/.test(r.title) ? r.title.replace(/(\d+)\s*$/, (m, n) => String(+n + 1)) : r.title + ' (new batch)';
    const d = MATS2.create({ name: title, kind: MATS2.kindOf(r), source: om.source || 'made', projectId: r.projectId, header: H, mat: { ingredients: (om.ingredients || []).map(x => Object.assign({}, x, { id: uid('ing') })), notes: om.notes || '', madeBy: om.madeBy || '' } });
    d.supersedes = [r.id]; DB.put('documents', d); r.supersededBy = [...(r.supersededBy || []), d.id]; DB.put('documents', r); changed(); App.go('#/mat/' + d.id); toast('New batch — recipe copied, made now');
  },
  /** One line for a material in lists. */
  oneLine(d) { const H = d.header || {}, m = d.mat || {}; return [m.source === 'made' && m.madeAt ? 'made ' + fmtDay(m.madeAt) : H.supplier, H.lot ? 'lot ' + H.lot : '', H.passage ? 'p' + H.passage : '', H.conc, H.location, m.status && m.status !== 'in use' ? m.status : ''].filter(Boolean).join(' · '); },
};

const MatSheet = {
  title: true,
  render(id) {
    const d = M.doc(id); if (!d || d.type !== 'resource') return h('div.page', h('div.empty', 'Material not found'));
    this.id = id; const host = h('div.page.matsheet'); this.host = host; this.fill(d); return host;
  },
  /** Keep typing undisturbed: only redraw when focus is outside the sheet. */
  update(id) { const d = M.doc(id); if (!d) return App.go('#/materials'); if (this.host && this.host.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return; this.fill(d); },
  fill(d) {
    const H = d.header = d.header || {}, m = MATS2.mat(d), kind = MATS2.kindOf(d), K = MATKIND[kind] || MATKIND.other;
    App.setTitle(d.title, [h('span.pill', kind), h('span', M.docPath(d).replace(/ › [^›]*$/, ''))], { editable: true, onEdit: v => { if (v && v !== d.title) { d.title = v; M.touchDoc(d); changed(); } } });
    const save = () => { M.touchDoc(d); DB.put('documents', d); IX.rebuild && 0; };
    const setH = (k, v) => { if (v) H[k] = v; else delete H[k]; save(); }, setM = (k, v) => { m[k] = v; save(); };
    const fld = (label, val, on, o = {}) => h('label.msf' + (o.wide ? '.wide' : ''), h('span', label), o.el || h('input.inp', Object.assign({ value: val || '', placeholder: o.ph ? (/^(initials|lot)$/.test(o.ph) ? o.ph : 'e.g. ' + o.ph) : '', on: { change: e => on(e.target.value.trim()), keydown: e => { if (e.key === 'Enter') e.target.blur(); } } }, o.attrs || {})));
    const redraw = () => this.fill(M.doc(d.id));
    // ---- top: kind, name, status
    const kinds = h('div.matkinds.sm', Object.keys(MATKIND).map(k => h('button.mk' + (k === kind ? '.on' : ''), { on: { click: () => { H.kind = k; save(); redraw(); } } }, h('i', MATKIND[k].icon), k)));
    const status = h('select.inp.sm', { on: { change: e => { setM('status', e.target.value); redraw(); } } }, MATSTATUS.map(s => h('option', { value: s, selected: (m.status || 'in use') === s }, s)));
    const from = (d.supersedes || []).map(M.doc).filter(Boolean), to = (d.supersededBy || []).map(M.doc).filter(Boolean);
    const top = h('div.ms-top', h('div.ms-icon', K.icon), h('div.ms-name', h('input.ms-title', { value: d.title, on: { change: e => { const v = e.target.value.trim(); if (v) { d.title = v; save(); changed(); } } } }),
      h('div.ms-sub', MATS2.oneLine(d) || kind, from.length ? [' · from ', from.map(x => h('a', { href: '#/mat/' + x.id }, x.title))] : null, to.length ? [' · next: ', to.map(x => h('a', { href: '#/mat/' + x.id }, x.title))] : null)),
      h('span.spacer'), h('label.ms-status', h('span', 'Status'), status));
    // ---- source
    const made = (m.source || 'made') === 'made';
    const srcSeg = h('div.seg.sm', [['made', 'Made here'], ['bought', 'Bought']].map(([k, l]) => h('button' + (k === (m.source || 'made') ? '.on' : ''), { on: { click: () => { setM('source', k); if (k === 'made' && !m.madeAt) m.madeAt = isoLocal(new Date()); save(); redraw(); } } }, l)));
    const madeAt = h('input.inp.mono', { type: 'datetime-local', value: m.madeAt ? toInputDT(m.madeAt) : '', on: { change: e => setM('madeAt', e.target.value ? isoLocal(new Date(e.target.value)) : null) } });
    const source = h('div.ms-card', h('div.ms-h', h('b', 'Source'), srcSeg),
      made ? h('div.ms-grid', fld('Made on', '', null, { el: h('div.row', { style: { gap: '4px', flexWrap: 'nowrap' } }, madeAt, h('button.btn.xs', { on: { click: () => { m.madeAt = isoLocal(new Date()); save(); redraw(); } } }, 'Now')) }),
          fld('Made by', m.madeBy, v => setM('madeBy', v), { ph: 'initials' }), fld('Batch / lot', H.lot, v => setH('lot', v), { ph: 'B261009' }), fld('Amount made', H.amount, v => setH('amount', v), { ph: '500 mL · 12 coverslips' }))
        : h('div.ms-grid', fld('Supplier', H.supplier, v => setH('supplier', v), { ph: 'Sigma' }), fld('Catalogue no.', H.cat, v => setH('cat', v), { ph: 'A3553' }), fld('Lot', H.lot, v => setH('lot', v), { ph: '7731' }),
          fld('Received', H.received, v => setH('received', v), { attrs: { type: 'date' } }), fld('Expires', H.expires, v => setH('expires', v), { attrs: { type: 'date' } })));
    // ---- details for this kind + storage
    const details = h('div.ms-card', h('div.ms-h', h('b', 'Details'), h('span.tiny.muted', kind)),
      h('div.ms-grid', K.fields.map(([k, l, ph]) => fld(l, H[k], v => setH(k, v), { ph })), fld('Concentration', H.conc, v => setH('conc', v), { ph: '1 mg/mL' }),
        fld('Stored at', H.location, v => setH('location', v), { ph: '−80 °C · box 3 · A4' }), fld('Amount left', H.left, v => setH('left', v), { ph: '6 aliquots' })));
    // ---- ingredients
    const others = MATS.all().filter(x => x.id !== d.id), dl = h('datalist', { id: 'matnames' }, others.map(x => h('option', { value: x.title }))), udl = h('datalist', { id: 'matunits' }, UNITS.map(u => h('option', { value: u })));
    const ing = m.ingredients = m.ingredients || [];
    const row = (x, i) => { const link = x.matId && M.doc(x.matId);
      const nm = h('input.inp', { value: x.name || '', list: 'matnames', placeholder: 'ingredient or material', on: { change: e => { x.name = e.target.value.trim(); const hit = others.find(o => o.title.toLowerCase() === x.name.toLowerCase()); x.matId = hit ? hit.id : null; if (hit && !x.lot) { x.lot = (hit.header || {}).lot || ''; lot.value = x.lot; } save();
        const nl = hit ? h('a.ing-l', { href: '#/mat/' + hit.id, title: 'Open ' + hit.title }, '↗') : h('span.ing-l'); lk.replaceWith(nl); lk = nl; } } });
      const amt = h('input.inp.mono', { value: x.amount || '', placeholder: '10', on: { change: e => { x.amount = e.target.value.trim(); save(); } } });
      const unit = h('input.inp.mono', { value: x.unit || '', list: 'matunits', placeholder: 'mL', on: { change: e => { x.unit = e.target.value.trim(); save(); } } });
      const lot = h('input.inp.mono', { value: x.lot || '', placeholder: 'lot', on: { change: e => { x.lot = e.target.value.trim(); save(); } } });
      [nm, amt, unit, lot].forEach((el, j, all) => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (j < 3) all[j + 1].focus(); else { e.target.blur(); add(); } } }));
      let lk = link ? h('a.ing-l', { href: '#/mat/' + link.id, title: 'Open ' + link.title }, '↗') : h('span.ing-l');
      return h('div.ing', h('span.ing-n', i + 1), nm, amt, unit, lot, lk, h('button.ib', { title: 'Remove', on: { click: () => { ing.splice(i, 1); save(); redraw(); } } }, '×')); };
    const add = () => { ing.push({ id: uid('ing'), name: '', amount: '', unit: '', lot: '' }); save(); redraw(); setTimeout(() => { const r = $$('.matsheet .ing'); const last = r[r.length - 1]; last && $('input', last).focus(); }, 0); };
    const notes = h('textarea.inp', { rows: 3, placeholder: made ? 'How it was made — order, times, temperatures…' : 'Notes', value: m.notes || '', on: { change: e => setM('notes', e.target.value) } });
    const recipe = h('div.ms-card', h('div.ms-h', h('b', made ? 'Ingredients' : 'Contents'), h('span.tiny.muted', ing.length ? plural(ing.length, 'item') : 'Enter moves along a row; Enter at the end adds the next')),
      ing.length ? h('div.ing.head', h('span'), h('span', 'Ingredient'), h('span', 'Amount'), h('span', 'Unit'), h('span', 'Lot'), h('span'), h('span')) : null,
      ing.map(row), h('div.row', { style: { marginTop: '6px' } }, h('button.btn.sm', { on: { click: add } }, '+ ingredient')), dl, udl,
      h('label.msf.wide', { style: { marginTop: '10px' } }, h('span', made ? 'Method' : 'Notes'), notes));
    // ---- log
    const log = m.log = m.log || [];
    const logIn = h('input.inp', { placeholder: 'thawed · aliquoted 10 × 50 µL · passaged 1:10 · opened…  (Enter)', on: { keydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { log.push({ id: uid('lg'), at: isoLocal(new Date()), text: e.target.value.trim() }); if (/passag/i.test(e.target.value) && H.passage && !isNaN(parseInt(H.passage, 10))) H.passage = String(parseInt(H.passage, 10) + 1); save(); redraw(); setTimeout(() => $('.matsheet .ms-log input') && $('.matsheet .ms-log input').focus(), 0); } } } });
    const logCard = h('div.ms-card.ms-log', h('div.ms-h', h('b', 'Log'), h('span.tiny.muted', '“passaged” also bumps the passage')), logIn,
      h('div.ms-ll', log.slice().reverse().map(x => h('div.ms-le', h('input.inp.mono.xs', { type: 'datetime-local', value: toInputDT(x.at), title: 'When', on: { change: e => { if (e.target.value) { x.at = isoLocal(new Date(e.target.value)); log.sort((a, b) => a.at.localeCompare(b.at)); save(); } } } }), h('span.t', x.text),
        h('button.ib', { title: 'Remove', on: { click: () => { m.log = log.filter(y => y !== x); save(); redraw(); } } }, '×')))));
    // ---- used in
    const used = MATS.usedIn(d.id), bars = MATS.barriersIn(used);
    const usedCard = h('div.ms-card', h('div.ms-h', h('b', 'Used in'), h('span.tiny.muted', `${plural(used.length, 'note')} · ${plural(bars.length, 'barrier')}`), h('span.spacer'), h('a.tiny', { href: '#/materials' }, 'compare lots ↗')),
      used.length ? h('div.ms-used', used.map(x => h('a.bchip', { on: { click: e => App.jump(x.id, e, true) } }, typechip(x.type), ' ', snippet(x.title, 40)))) : h('div.tiny.muted', 'Add it to a note with “+ material” on the note’s header box.'));
    const acts = h('div.ms-acts', h('button.btn.pri', { on: { click: () => MATS2.again(d) } }, (H.passage ? 'Next passage' : 'Make another batch') + ' →'),
      h('button.btn', { title: 'Its notes canvas — for longer write-ups, images, plates', on: { click: () => { MatSheet.canvasOK.add(d.id); App.go('#/doc/' + d.id); } } }, 'Notes canvas'),
      h('button.btn', { on: { click: () => App.go('#/materials') } }, 'All materials'), h('span.spacer'), h('button.btn.danger', { on: { click: () => EDIT.confirmDoc(d) } }, 'Delete…'));
    this.host.replaceChildren(top, kinds, h('div.ms-cols', h('div', source, details, usedCard), h('div', recipe, logCard)), acts);
  },
  canvasOK: new Set(),
};
VIEWS.mat = MatSheet;

/* ---------------- wiring: materials open as sheets; quick create everywhere ---------------- */
{
  const render = DocView.render;
  DocView.render = function (docId) {
    const d = M.doc(docId);
    if (this === DocView && d && d.type === 'resource' && App.route.name === 'doc' && !MatSheet.canvasOK.has(docId)) { setTimeout(() => App.go('#/mat/' + docId), 0); return h('div.canvas-host'); }
    return render.call(this, docId);
  };
  MATS.derive = MATS2.again;
  // the note's "+ material" picker: create on the spot and add it to the note
  const pick = MATS.pick; MATS.pick = (d, cb) => { pick(d, cb); setTimeout(() => { const btn = [...$$('.modal .mf .btn')].find(b => /New material/.test(b.textContent)); if (btn) { const nb = btn.cloneNode(true); nb.textContent = '+ New material (made now or bought)'; btn.replaceWith(nb);
    nb.addEventListener('click', () => { $$('.ovl').slice(-1)[0] && $$('.ovl').slice(-1)[0].remove(); MATS2.quick({ projectId: d.projectId }, nd => { d.materials = [...new Set([...(d.materials || []), nd.id])]; M.touchDoc(d); changed(); toast('“' + nd.title + '” added to this note — fill it in from its chip'); cb && cb(); }); }); } }, 30); };
  const newDoc = App.newDoc; App.newDoc = (pre = {}) => pre.type === 'resource' ? MATS2.quick(pre) : newDoc.call(App, pre);
}

/* ---------------- a material card on any note (+ Insert → Material…) ---------------- */
MATS2.place = (d, p, r) => {
  const b = M.addBlock(d.id, null, { kind: 'matcard', matId: r.id, label: r.title, x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 360 });
  b.body = { text: r.title + '\n' + MATS2.oneLine(r), marks: [] }; DB.put('blocks', b);
  if (!(d.materials || []).includes(r.id)) { d.materials = [...(d.materials || []), r.id]; M.touchDoc(d); }
  changed(); return b;
};
MATS2.insert = (d, p) => {
  const m = modal({ title: 'Insert a material', wide: true, actions: [{ label: 'Cancel' }, { label: '+ New material', run: () => setTimeout(() => MATS2.quick({ projectId: d.projectId }, nd => { MATS2.place(d, p, nd); toast('“' + nd.title + '” placed — open its card to fill it in'); }), 30) }],
    body: optionPicker({ placeholder: 'Search cell lines, antibodies, gel batches, lots…', sort: 'mats-insert', items: q => MATS.all().filter(r => !q || (r.title + ' ' + MATS2.oneLine(r) + ' ' + MATS2.kindOf(r)).toLowerCase().includes(q)).map(r => Object.assign(Object.create(r), { date: r.modified })),
      section: r => MATS2.kindOf(r) + (r.projectId === d.projectId ? '' : ' · other project'),
      render: r => h('div', h('span.mk-i', (MATKIND[MATS2.kindOf(r)] || MATKIND.other).icon), ' ', h('b', r.title), (r.mat || {}).status && r.mat.status !== 'in use' ? h('span.pill', r.mat.status) : null, h('span.s', MATS2.oneLine(r) || MATS2.kindOf(r))),
      emptyText: 'No materials yet — “+ New material”', onPick: r => { m.close(); MATS2.place(d, p, M.doc(r.id) || r); } }) });
};
MATS2.cardBody = (b, d, pane, ro) => {
  const r = M.doc(b.matId); if (!r) return h('div.mcard.gone', h('div.tiny.muted', 'This material was deleted.'));
  const H = r.header || {}, m = r.mat || {}, kind = MATS2.kindOf(r), K = MATKIND[kind] || MATKIND.other;
  if (b.label !== r.title) { b.label = r.title; b.body = { text: r.title + '\n' + MATS2.oneLine(r), marks: [] }; DB.put('blocks', b); }
  const facts = [...K.fields.map(([k, l]) => [l, H[k]]), ['Concentration', H.conc], ['Stored at', H.location], ['Left', H.left]].filter(([, v]) => v).slice(0, 6);
  const ing = m.ingredients || [];
  const open = e => { e.stopPropagation(); if (e.altKey) return App.openSide(r.id, e.target, true); App.go('#/mat/' + r.id); };
  const logIn = ro ? null : h('input.inp.mc-log', { placeholder: 'Log on this material… (Enter) e.g. used 2 coverslips', on: { keydown: e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.value.trim()) { const x = MATS2.mat(r); x.log = [...(x.log || []), { id: uid('lg'), at: isoLocal(new Date()), text: e.target.value.trim() + ' — ' + d.title, note: d.id }]; M.touchDoc(r); DB.put('documents', r); e.target.value = ''; toast('Logged on “' + r.title + '”'); changed(); } } } });
  return h('div.mcard', h('div.mc-h', h('span.mc-i', K.icon), h('a.mc-t', { title: 'Open its sheet · Alt+click: beside', on: { click: open } }, r.title), m.status && m.status !== 'in use' ? h('span.pill.warn', m.status) : null),
    h('div.mc-sub', [kind, MATS2.oneLine(r)].filter(Boolean).join(' · ')),
    facts.length ? h('div.mc-facts', facts.map(([l, v]) => h('div', h('span', l), h('b', v)))) : null,
    ing.length ? h('div.mc-ing', h('span', plural(ing.length, 'ingredient') + ': '), ing.slice(0, 6).map((x, i) => [i ? ', ' : '', x.matId && M.doc(x.matId) ? h('a', { on: { click: e => { e.stopPropagation(); App.go('#/mat/' + x.matId); } } }, x.name) : x.name, x.amount ? ' ' + x.amount + (x.unit ? ' ' + x.unit : '') : '']), ing.length > 6 ? ' …' : '') : null,
    logIn);
};
WIDGETS.matcard = { label: 'material', w: 360, body: MATS2.cardBody, menu: b => [{ label: 'Open its sheet', run: () => App.go('#/mat/' + b.matId) }, M.doc(b.matId) ? { label: (M.doc(b.matId).header || {}).passage ? 'Next passage…' : 'Make another batch', run: () => MATS2.again(M.doc(b.matId)) } : null].filter(Boolean) };
INSERTS.push({ id: 'material', group: 'Materials', icon: '◇', label: 'Material…', sub: 'A card for a cell line, antibody, gel batch, reagent… — also listed on this note', run: (d, p) => MATS2.insert(d, p) });
INSERTS.push({ id: 'material-new', group: 'Materials', icon: '＋', label: 'New material…', sub: 'Made here now, or bought — placed here and listed on this note', run: (d, p) => MATS2.quick({ projectId: d.projectId }, nd => MATS2.place(d, p, nd)) });
