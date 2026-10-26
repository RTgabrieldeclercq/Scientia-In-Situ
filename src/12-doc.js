/* ==========================================================================
   12 · A note is a page of paper. Its header, every component and its
   synthesis are boxes you can place anywhere; connections between
   components are drawn on the paper with their direction and relation.
   Superseded wordings stay inside the box that replaced them (§5).
   ========================================================================== */
const DocView = {
  canvas: true, title: true, docId: null, paper: null, sel: null, pendingFocus: null, inspOpen: _ls.get('insp', false), openGhosts: new Set(), travel: null,

  render(docId) {
    const d = M.doc(docId); this.docId = docId; this.sel = null; this.travel = VIEWER && d && docId === VIEWER.X.docId ? { at: VIEWER.X.at, viewer: true, doc: d, blocks: M.docBlocks(d.id) } : null;
    if (!d) return h('div.canvas-host', h('div.empty-c', 'Note not found'));
    const host = h('div.canvas-host'); host._dv = this; this.host = host;
    host.addEventListener('pointerdown', () => { App.pane = this; }, true); host.addEventListener('focusin', () => { App.pane = this; });
    this.paper = makePaper(host, { view: (_ls.get('view:' + docId, null)) || undefined,
      onView: debounce(v => _ls.set('view:' + docId, v), 400),
      onTap: () => { this.select(null); },
      onDouble: (e, p) => this.newAt(p.x - 20, p.y - 20),
      onContext: (e, p) => this.menu(e, p) });
    this.svg = SV('svg', { class: 'wires' }); this.paper.world.append(this.svg);
    this.dock = h('div.dock.nopan'); this.insp = h('aside.insp.nopan.scrolly'); this.hint = h('div.hint');
    this.ctools = h('div.ctools.nopan', h('button', { title: 'Open a calculator in this note (as many as you like)', on: { click: () => CALC.open(this) } }, h('span', { style: { fontSize: '14px' } }, '🖩'), 'Calculator'),
      h('button', { title: 'New equation, or insert a registered one', on: { click: e => EQ.newMenu(this, e) } }, h('span', { style: { fontSize: '14px' } }, '∑'), 'Equation'));
    host.append(this.dock, this.insp, this.hint, this.ctools);
    this.paper.el.addEventListener('pointerdown', e => this.pointer(e));
    this.fill(d);
    if (!_ls.get('view:' + docId, null)) requestAnimationFrame(() => { this.settle(); const bb = this.bbox(); if (bb) this.paper.fit({ x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: Math.min(bb.y1, bb.y0 + 1100) }, false); });
    return host;
  },
  update(docId) {
    const d = M.doc(docId); if (!d) return App.refresh();
    const ae = document.activeElement, box = ae && ae.closest && ae.closest('.box'), ed = ae && ae.classList && ae.classList.contains('ed') ? ae : null;
    let keep = null; if (ed && box) { const s = ED.selection(ed); keep = { id: box.dataset.id, pos: s ? s.from : 0, label: false }; }
    else if (ae && ae.classList && ae.classList.contains('blab') && box) keep = { id: box.dataset.id, label: true };
    else if (ae && ae.classList && ae.classList.contains('synth-in')) keep = { synth: true, a: ae.selectionStart, z: ae.selectionEnd, v: ae.value };
    this.fill(d);
    if (keep && keep.synth) { const t = $('.synth-in', this.paper.world); if (t) { if (t.value !== keep.v) t.value = keep.v; t.focus({ preventScroll: true }); t.setSelectionRange(keep.a, keep.z); } keep = null; }
    if (keep && !this.pendingFocus) { const nb = $(`.box[data-id="${keep.id}"]`, this.paper.world); if (nb) { if (keep.label) { const l = $('.blab', nb); l && l.focus(); } else { const e2 = $('.ed', nb); if (e2 && e2.contentEditable === 'true') { e2.focus({ preventScroll: true }); ED.setCaret(e2, keep.pos); } } } }
  },
  after() { this.focusPending(); },

  /* ---------------- render the page ---------------- */
  fill(d) {
    const p = prof(d.type), w = this.paper.world;
    d.layout = d.layout || { head: { x: 0, y: 0 } };
    if (M.liveBlocks(d.id).some(b => b.x == null)) { M.autoLayout(d); }
    $$(':scope > .nextbtn', this.host).forEach(x => x.remove()); { const nb = CHAIN.button(d, this); if (nb) this.host.append(nb); }
    if (!this.side) App.setTitle(d.title, [typechip(d.type), CHAIN.strip(d), h('span', M.docPath(d).replace(/ › [^›]*$/, '')), h('span', 'edited ' + fmtWhen(d.modified)), this.travel && !this.travel.viewer ? h('span.pill.warn', 'as it stood ' + fmtWhen(this.travel.at)) : null],
      { editable: !this.travel, onEdit: v => { if (v && v !== d.title) { d.title = v; M.touchDoc(d); changed(); } } });
    $$(':scope > .box, :scope > .wl, :scope > .obsbox', w).forEach(x => x.remove());
    const src = this.travel || { doc: d, blocks: M.docBlocks(d.id) };
    w.append(this.headBox(src.doc));
    const live = src.blocks.filter(b => b.status !== 'superseded' && b.status !== 'removed');
    for (const b of live) w.append(this.box(b, src.doc, p));
    PROTO.obsLayer(this, src.doc);
    w.append(this.synthBox(src.doc, live));
    this.drawWires(); this.renderDock(d); this.renderInsp(); this.renderHint(d, live);
    requestAnimationFrame(() => { this.settle(); this.drawWires(); });
    this.focusPending();
  },
  focusPending() {
    const f = this.pendingFocus; if (!f) return; this.pendingFocus = null;
    requestAnimationFrame(() => {
      let id = f.focus || f.reveal || f.id, el = id && $(`.box[data-id="${id}"]`, this.paper.world);
      if (!el && id && M.block(id) && M.block(id).status === 'superseded') { const g = M.block(id), live = DocView.anchorOf(g); if (live && !this.openGhosts.has(live)) { this.openGhosts.add(live); this.pendingFocus = { reveal: live }; this.update(this.docId); return; } id = live; el = live && $(`.box[data-id="${live}"]`, this.paper.world); }
      if (!el) return;
      this.select(id); this.reveal(id);
      if (f.reveal) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      if (f.focus || f.id) { const ed = $('.ed', el); if (ed && ed.contentEditable === 'true') { ed.focus({ preventScroll: true }); ED.setCaret(ed, f.pos != null ? f.pos : ED.read(ed, []).text.length); } }
    });
  },
  set focusAfterRender(v) { this.pendingFocus = v ? { focus: v.id, pos: v.pos } : null; },

  headBox(d) {
    const p = prof(d.type), L = d.layout.head || { x: 0, y: 0 }, sess = TIMER.activeFor(d.id);
    const fields = (p.headerFields || []).map(f => h('label.hf', h('span', f.label), f.options ? h('select.hin', { disabled: !!this.travel, on: { change: e => M.setHeader(d, f.key, e.target.value) } }, h('option', { value: '' }, '—'), f.options.map(o => h('option', { value: o, selected: (d.header || {})[f.key] === o }, o)))
      : h('input.hin', { value: (d.header || {})[f.key] || '', placeholder: '—', disabled: !!this.travel, on: { change: e => M.setHeader(d, f.key, e.target.value.trim()) } })));
    const tags = (d.header && d.header.tags) || [];
    const bound = d.type === 'experiment' && M.docBlocks(d.id).find(b => b.boundTo), pr = bound && M.doc(bound.boundTo.protocolId);
    return h('div.box.head', { 'data-id': '_head', style: { left: L.x + 'px', top: L.y + 'px' } },
      h('div.bh', h('span.num', p.label), d.backdate ? h('span.pill.warn', { title: 'Entered after the fact — new components are stamped on this day' }, 'past entry') : null, h('span.spacer'), h('span.mono.tiny', fmtDayLong(d.created)),
        this.travel ? null : h('button.ib.hedit', { title: 'Note details — title, type, project, theme, date · delete', on: { click: e => { e.stopPropagation(); EDIT.noteDialog(d); } } }, '✎')),
      h('div.hgrid', fields.length ? fields : null,
        h('label.hf', h('span', 'Tags'), h('div.tags', tags.map(t => h('span.tag', t, this.travel ? null : h('button', { title: 'Remove tag', on: { click: () => M.setHeader(d, 'tags', tags.filter(x => x !== t)) } }, '×'))),
          this.travel ? null : h('input.tagin', { placeholder: '+ tag', on: { keydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { M.setHeader(d, 'tags', [...new Set([...tags, e.target.value.trim()])]); } } } })))),
      MATS.headExtras(d, this),
      pr ? h('div.hfoot', 'Runs ', h('a', { on: { click: () => App.go('#/doc/' + pr.id) } }, pr.title), ' — steps are bound to it') : null,
      sess ? h('div.hfoot', { style: { color: 'var(--teal)' } }, 'Timer ', sess.state, ' · components written now are stamped against it') : null);
  },
  synthBox(d, live) {
    let L = d.layout.synth; if (!L) { const bb = this.bboxOf(live); L = { x: (bb ? bb.x1 : 400) + 80, y: 0 }; }
    const keep = debounce(v => { const cur = M.doc(d.id); if (!cur) return; cur.synthesis = Object.assign({}, cur.synthesis, { text: v }); M.touchDoc(cur); DB.put('documents', cur); }, 400);
    const ta = h('textarea.synth-in', { rows: 3, placeholder: 'What this note adds up to — one or two sentences you would tell your advisor…', disabled: !!this.travel, value: d.synthesis.text, on: { input: e => keep(e.target.value), change: e => { keep(e.target.value); keep.flush ? keep.flush() : null; const cur = M.doc(d.id); if (cur) { cur.synthesis = Object.assign({}, cur.synthesis, { text: e.target.value }); M.touchDoc(cur); DB.put('documents', cur); changed(); } } } });
    requestAnimationFrame(() => { ta.style.height = 'auto'; ta.style.height = Math.max(60, ta.scrollHeight) + 'px'; });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.max(60, ta.scrollHeight) + 'px'; });
    const nums = ED.citeNumbers(d);
    return h('div.box.synth', { 'data-id': '_synth', style: { left: L.x + 'px', top: L.y + 'px' } }, h('div.bh', h('span.num', 'Synthesis'), h('span.spacer'), h('span.tiny.muted', 'what this note adds up to')), ta,
      d.citeMode === 'number' && nums.size ? h('div.refs', h('div.lab', 'References'), h('ol', [...nums.keys()].map(id => h('li', LIB.apa(M.lib(id) || { title: 'missing' }))))) : null);
  },

  /* ---------------- one component box ---------------- */
  box(b, d, p) {
    const ro = !!this.travel, isRef = b.kind === 'ref', isP = PROTO.is(b), pdef = isP && PROTO.defOf(b), pEdit = isP && b.kind === 'protocol' && !ro && PROTO.editableIn(b, d.id), flag = M.flagFor('block', b.id), stamp = b.stamp || {}, s = stamp.sessionId && M.session(stamp.sessionId);
    const kinds = IX.kindsOf(b), accent = kinds[0], W = WIDGETS[b.kind];
    const el = h('div.box.cmp' + (isRef ? '.ref' : '') + (isP ? '.proto' + (b.kind === 'run' ? '.run' : '') + (b.kind === 'protocol' && !b.registered ? '.draft' : '') : '') + (this.sel === b.id ? '.sel' : '') + (b.boundTo ? '.bound' : '') + (W ? '.widget.w-' + b.kind : ''), { 'data-id': b.id, style: { left: (b.x || 0) + 'px', top: (b.y || 0) + 'px', width: (b.w || (isP ? 448 : W ? W.w : 392)) + 'px', '--kc': isP ? 'var(--teal)' : accent ? `var(--k-${accent})` : null } });
    const stepBox = p.steps && !isRef && !isP && !W && !ro ? h('button.step' + (b.step && b.step.checkedAt ? '.done' : ''), { title: TIMER.activeFor(d.id) ? 'Check off — records this step’s time inside the running timer' : 'Check off (start the timer to time steps)', on: { click: e => { e.stopPropagation(); TIMER.checkStep(b.id); } } }, b.step && b.step.checkedAt ? '✓' : '') : null;
    const num = W ? W.label : isRef ? 'pulled in' : isP ? (b.kind === 'run' ? 'protocol run' : b.registered ? 'protocol' : b.localOnly ? 'protocol · local' : 'protocol · draft') : p.ordered ? `${p.noun} ${M.blockIndex(b)}` : p.noun;
    el.append(h('div.bh', stepBox, h('span.num', num),
      isP ? (pEdit ? h('input.blab.pname', { value: b.label || '', placeholder: 'Protocol name', on: { change: e => PROTO.setName(b, e.target.value.trim() || 'Protocol'), keydown: e => { if (e.key === 'Enter') e.target.blur(); } } }) : h('span.pname', pdef ? pdef.label : 'missing protocol')) :
      isRef ? null : h('input.blab', { value: b.label || '', placeholder: 'label', readOnly: ro, on: { change: e => { b.label = e.target.value; DB.put('blocks', b); changed(); }, keydown: e => { if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); const ed = $('.ed', el); if (!ed) return; if (e.key === 'Tab' && e.target.value !== (b.label || '')) { b.label = e.target.value; DB.put('blocks', b); } ed.focus(); if (ed.contentEditable === 'true') { const n = (ED.read(ed, []).text || '').length; ED.setCaret(ed, n); } } } } }),
      h('span.spacer'),
      b.step && b.step.durMs != null ? h('span.stepinfo', { title: 'step time · where it sits in the timer' }, `${fmtDur(b.step.durMs, true)} · +${fmtDur(b.step.offsetMs)}`) : null,
      flag ? h('span.flag', { title: flag.reason || 'flagged for review' }, '⚑') : null,
      b.manualSec ? h('span.pill.teal', { title: 'manual duration — counts as if timed' }, fmtDur(b.manualSec * 1000)) : null, TCMP.pill(b),
      h('button.stampbtn', { title: 'When it happened — click to move it to any date and time, or add a manual duration', on: { click: e => { e.stopPropagation(); if (!ro) this.stampPopover(b, e); } } }, fmtStamp(stamp.at || b.created) + (s ? ` · +${fmtDur(stamp.offsetMs || 0)}` : '')),
      ro ? null : h('button.ib.bmore', { title: 'More', on: { click: e => { e.stopPropagation(); this.boxMenu(b, e); } } }, '⋯')));
    if (isP) el.append(PROTO.body(b, d, this, ro));
    else if (W) el.append(W.body(b, d, this, ro));
    else if (isRef) el.append(this.refCard(b, d));
    else { const ed = h('div.ed', { 'data-ph': `Write the ${p.noun.toLowerCase()}…` }); if (ro) { ED.render(ed, b, d); ed.contentEditable = 'false'; } else ED.attach(ed, b); el.append(ed); }
    if ((b.fields || []).length) el.append(h('div.fields', b.fields.map(f => h('div.fr', h('span', f.key), h('b', f.value)))));
    el.append(this.chipsFor(b, d));
    const anc = DocView.ancestors(b);
    if (anc.length) {
      const depth = settings().lineageDepth, open = this.openGhosts.has(b.id), shown = anc.filter(a => a._gen <= depth), older = anc.length - shown.length;
      const nIt = sum(anc.map(a => IX.itemsOriginatingIn(a.id).length));
      el.append(h('button.ghostbar', { on: { click: e => { e.stopPropagation(); open ? this.openGhosts.delete(b.id) : this.openGhosts.add(b.id); this.update(this.docId); } } }, (open ? '▾ ' : '▸ ') + plural(anc.length, 'earlier version') + (nIt ? ` · ${plural(nIt, 'structure')} still on the old wording` : '')));
      if (open) el.append(h('div.ghosts', shown.map(a => { const ged = h('div.ed'); ED.render(ged, a); ged.contentEditable = 'false';
        return h('div.ghost', h('div.g-h', `generation ${a._gen} · superseded ${fmtDay(a.supersededAt)}`, a.label ? ' · ' + a.label : ''), ged,
          IX.itemsOriginatingIn(a.id).length ? h('div.chips', IX.itemsOriginatingIn(a.id).map(it => kchip(it.kind, KIND[it.kind].label + (IX.status(it) ? ' · ' + IX.status(it) : '')))) : null); }),
        older ? h('div.tiny.muted', { style: { padding: '4px 2px' } }, `${plural(older, 'older generation')} consolidated (Settings → lineage depth) — still in the record, the search and the export`) : null));
    }
    if (!ro) el.append(h('div.port', { title: 'Drag to another component to connect them' }));
    if (!ro) el.append(h('div.rz', { title: 'Drag to resize' }));
    return el;
  },
  chipsFor(b, d) {
    const chips = [], wires = IX.wiresOf(b.id);
    if (b.boundTo) { const pb = M.block(b.boundTo.componentId), pd = M.doc(b.boundTo.protocolId); if (pd) chips.push(h('button.wchip.bind', { title: 'Bound to the protocol step this run followed' + (pd.modified !== b.boundTo.protocolVersion ? ' (the protocol has changed since)' : ''), on: { click: e => App.jump(b.boundTo.componentId, e) } }, '↳ ' + snippet(pd.title, 20) + ' › ' + (pb ? snippet(M.blockName(pb), 22) : 'step') + (pb && pb.status === 'superseded' ? ' (earlier wording)' : ''))); }
    if (d.type === 'protocol' && b.kind === 'component') { const runs = IX.boundRuns(b.id), roll = IX.rollup(b.id), nb = roll.filter(x => x.it.kind === 'barrier').length, nd = roll.filter(x => x.it.kind === 'deviation').length;
      if (runs.length || roll.length) chips.push(h('button.wchip.roll', { title: 'Everything recorded at this step, its earlier wordings, and every run bound to it', on: { click: e => this.rollupPopover(b, e) } }, `⟲ ${plural(runs.length, 'run')} · ${plural(nb, 'barrier')} · ${plural(nd, 'deviation')}`)); }
    for (const w of wires) { const out = w.from === b.id, other = M.block(out ? w.to : w.from); if (!other || other.docId === b.docId) continue;
      const rel = REL[w.rel] || REL.related; chips.push(h('button.wchip.cross', { title: M.docPath(M.doc(other.docId)) + ' · Alt+click: open beside', on: { click: e => App.jump(other.id, e) } }, (w.directed ? (out ? '→ ' : '← ') : '↔ ') + (out ? rel.label : rel.inv) + ' · ⇱ ' + snippet(M.blockName(other), 28))); }
    const refs = [...(IX.refsOfBlock.get(b.id) || []), ...IX.itemsOf(b.id).flatMap(i => IX.refsOfItem.get(i.id) || [])].map(M.block).filter(x => x && x.docId !== b.docId && x.status !== 'removed');
    if (refs.length) chips.push(h('button.wchip.teal', { on: { click: e => metaPop(e.clientX, e.clientY + 8, 'Appears in', [...new Set(refs.map(r => r.docId))].map(id => ({ label: M.doc(id).title, sub: M.docPath(M.doc(id)), date: M.doc(id).modified, note: M.doc(id).title, run: ev => App.jump(refs.find(r => r.docId === id).id, ev) }))) } }, `⇲ in ${plural(new Set(refs.map(r => r.docId)).size, 'other note')}`));
    const bl = IX.backlinks(b.id); if (bl.length) chips.push(h('button.wchip', { on: { click: e => metaPop(e.clientX, e.clientY + 8, 'Linked from', bl.filter(x => x.blockId && M.block(x.blockId)).map(x => ({ label: M.blockName(M.block(x.blockId)), sub: M.docPath(M.doc(M.block(x.blockId).docId)), date: M.block(x.blockId).modified, note: (M.doc(M.block(x.blockId).docId) || {}).title, run: ev => App.jump(x.blockId, ev) }))) } }, `↩ linked from ${bl.length}`));
    for (const it of IX.itemsOf(b.id).filter(i => i.kind === 'barrier')) { const st = IX.status(it); chips.push(h('span.pill' + (st === 'open' ? '.bad' : st === 'resolved' ? '.ok' : ''), 'barrier ' + st)); }
    if (b.anchor && b.anchor.source) chips.push(h('button.dschip.pdf', { title: 'Open the paper at this highlight', on: { click: e => { e.stopPropagation(); App.go('#/read/' + b.anchor.source + '/' + b.anchor.page); } } }, '📄 p. ' + b.anchor.page + ' ↗'));
    chips.push(...BINDS.chips(b), ...DAY.chips(b));
    return h('div.chips', chips);
  },
  refCard(b, d) {
    const it = b.refItemId && M.item(b.refItemId), ob = M.block(b.refBlockId), od = ob && M.doc(ob.docId);
    const origin = h('div.origin', 'from ', h('a', { title: 'Alt+click: open beside', on: { click: e => ob && App.jump(ob.id, e) } }, od ? M.docPath(od) : 'missing'), ob ? ' › ' + M.blockName(ob) : '', ' · ', ob ? fmtDay(ob.created) : '');
    if (it) {
      const st = IX.status(it), res = (IX.resolutions.get(it.id) || []).map(M.item).filter(Boolean);
      return h('div.refbody', { style: { '--kc': `var(--k-${it.kind})` } }, h('div.row', kchip(it.kind), st ? h('span.pill' + (st === 'open' ? '.bad' : st === 'resolved' ? '.ok' : ''), st) : null), origin,
        h('div.x.serif', h('span.st.st-' + it.kind + (st === 'closed' ? '.closed' : ''), it.text)),
        res.length ? h('div.res', res.map(r => h('div', '✓ ', snippet(r.text, 110), h('span.muted.mono', '  — ' + (M.doc(r.originDocId) || {}).title)))) : null,
        this.travel ? null : h('div.row', { style: { marginTop: '6px', gap: '6px' } },
          it.kind === 'barrier' && st !== 'closed' ? h('button.btn.xs', { on: { click: () => this.resolveHere(b, it) } }, '✓ Resolve here') : null,
          it.kind === 'barrier' && st === 'resolved' ? h('button.btn.xs', { on: { click: () => { M.closeItem(it); toast('Closed — not offered for pulling any more; still searchable here'); } } }, 'Close barrier') : null,
          st === 'closed' ? h('span.tiny.muted', 'closed — still searchable here, no longer offered for pulling') : null));
    }
    if (ob) { const pv = h('div.ed'); ED.render(pv, ob); pv.contentEditable = 'false'; return h('div.refbody', h('div.row', h('span.pill', 'component'), ob.label ? h('b', { style: { fontSize: '12.5px' } }, ob.label) : null), origin, pv); }
    return h('div.refbody', 'Missing reference');
  },
  async resolveHere(refBlock, barrier) {
    const txt = await askText('Resolve barrier', 'How was it overcome?', '', { multiline: true, placeholder: 'e.g. Dropped EGF to 2 ng/mL; the edge held for 120 frames.' });
    if (!txt) return;
    const nb = M.addBlock(refBlock.docId, refBlock.id, { label: 'Resolution', body: { text: txt, marks: [] }, x: (refBlock.x || 0) + (refBlock.w || 392) + 70, y: refBlock.y });
    const it = M.createItem('resolution', txt, nb, { resolves: barrier.id });
    nb.body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: txt.length, ref: it.id }); DB.put('blocks', nb);
    M.wire(nb.id, refBlock.id, 'resolves', true); toast('Resolution recorded and wired to the barrier');
  },

  /* ---------------- connections drawn on the paper ---------------- */
  rectOf(id) { const el = $(`.box[data-id="${id}"]`, this.paper.world); if (!el || !el.isConnected || !el.offsetWidth) return null; return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; },
  boxH(id) { const r = this.rectOf(id); return r ? r.h : 120; },
  geom(a, b, R) {
    const blocked = R && (b.y > a.y + a.h || a.y > b.y + b.h) && R.some(r => r.id !== a.id && r.id !== b.id && r.y > Math.min(a.y + a.h, b.y + b.h) - 4 && r.y + r.h < Math.max(a.y, b.y) + 4 && r.x < Math.max(a.x + a.w, b.x + b.w) && r.x + r.w > Math.min(a.x, b.x));
    if (blocked) { const ac = { y: a.y + a.h / 2 }, bc = { y: b.y + b.h / 2 }, xr = Math.max(a.x + a.w, b.x + b.w), p1 = { x: a.x + a.w, y: ac.y }, p2 = { x: b.x + b.w, y: bc.y }, off = 46 + Math.min(80, Math.abs(bc.y - ac.y) * .12);
      const c1 = { x: xr + off, y: p1.y }, c2 = { x: xr + off, y: p2.y }; // the label sits on the curve: its true midpoint (t = ½)
      return { d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`, mx: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8, my: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8 }; }
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, dx = bc.x - ac.x, dy = bc.y - ac.y;
    let p1, p2, c1, c2; const k = 0.45;
    if (Math.abs(dx) > Math.abs(dy) * 1.1 && (b.x > a.x + a.w + 20 || a.x > b.x + b.w + 20)) {
      const r = dx > 0; p1 = { x: r ? a.x + a.w : a.x, y: ac.y }; p2 = { x: r ? b.x : b.x + b.w, y: bc.y }; const off = Math.max(40, Math.abs(p2.x - p1.x) * k) * (r ? 1 : -1); c1 = { x: p1.x + off, y: p1.y }; c2 = { x: p2.x - off, y: p2.y };
    } else if (b.y > a.y + a.h || a.y > b.y + b.h) {
      const dn = dy > 0; p1 = { x: ac.x, y: dn ? a.y + a.h : a.y }; p2 = { x: bc.x, y: dn ? b.y : b.y + b.h }; const off = Math.max(30, Math.abs(p2.y - p1.y) * k) * (dn ? 1 : -1); c1 = { x: p1.x, y: p1.y + off }; c2 = { x: p2.x, y: p2.y - off };
    } else { p1 = { x: a.x + a.w, y: ac.y }; p2 = { x: b.x + b.w, y: bc.y }; const off = 60 + Math.abs(dy) * .2; c1 = { x: p1.x + off, y: p1.y }; c2 = { x: p2.x + off, y: p2.y }; }
    const t = .5, mt = 1 - t, mx = mt ** 3 * p1.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * p2.x, my = mt ** 3 * p1.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * p2.y;
    return { d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`, mx, my };
  },
  drawWires(temp) {
    if (!this.paper) return; const w = this.paper.world;
    $$(':scope > .wl', w).forEach(x => x.remove());
    if (!$(':scope > .obsbox.drag', w)) PROTO.layoutObs(this);
    let html = '<defs><marker id="wa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mag)"/></marker></defs>';
    const ws = DB.all('wires').filter(x => { const a = M.block(x.from), b = M.block(x.to); return a && b && a.docId === this.docId && b.docId === this.docId && $(`.box[data-id="${x.from}"]`, w) && $(`.box[data-id="${x.to}"]`, w); });
    const labels = [], R = $$(':scope > .box.cmp', w).map(el => ({ id: el.dataset.id, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
    for (const x of ws) { const A = this.rectOf(x.from), B = this.rectOf(x.to); if (!A || !B) continue; A.id = x.from; B.id = x.to; const g = this.geom(A, B, R);
      html += `<path class="w${x.directed ? '' : ' und'}${this.selWire === x.id ? ' sel' : ''}" d="${g.d}" ${x.directed ? 'marker-end="url(#wa)"' : ''}/>`;
      labels.push(h('button.wl.nopan' + (this.selWire === x.id ? '.sel' : ''), { 'data-w': x.id, style: { left: g.mx + 'px', top: g.my + 'px' }, title: `${M.blockName(M.block(x.from))} ${(REL[x.rel] || REL.related).verb} ${M.blockName(M.block(x.to))}`, on: { click: e => this.wireMenu(x, e) } }, (REL[x.rel] || { label: x.rel }).label)); }
    html += PROTO.obsWires(this);
    if (temp) html += `<path class="w tmp" d="${temp}"/>`;
    this.svg.innerHTML = html; w.append(...labels);
  },
  wireMenu(x, e) {
    this.selWire = x.id; this.drawWires(); const A = M.blockName(M.block(x.from)), B = M.blockName(M.block(x.to));
    ctxMenu(e.clientX, e.clientY + 10, [{ head: `“${snippet(A, 24)}” ${(REL[x.rel] || REL.related).verb} “${snippet(B, 24)}”` },
      ...RELATIONS.filter(r => r.id !== x.rel).map(r => ({ label: 'Make it: ' + r.label, run: () => M.setWire(x, { rel: r.id, directed: r.dir }) })),
      { label: 'Make it: your own words…', run: async () => { const v = customRel(await askText('Name this connection', 'Connection', REL[x.rel] && REL[x.rel].custom ? REL[x.rel].label : '')); if (v) M.setWire(x, { rel: v, directed: true }); } }, 'sep',
      { label: '⇄ Reverse direction', run: () => M.setWire(x, { from: x.to, to: x.from }) },
      { label: x.directed ? 'Make undirected' : 'Make directed', run: () => M.setWire(x, { directed: !x.directed }) },
      { label: 'Remove connection', danger: true, run: () => M.unwire(x.id) }]);
    setTimeout(() => { this.selWire = null; }, 0);
  },
  relationPopover(from, to, x, y) {
    let rev = false; const A = () => M.blockName(M.block(rev ? to : from)), B = () => M.blockName(M.block(rev ? from : to));
    const go = r => { closePop(); M.wire(rev ? to : from, rev ? from : to, r.id, r.dir); toast('Connected · ' + r.label); };
    // typing straight away names your own connection (Enter connects with it)
    const own = h('input.inp.rel-own', { placeholder: 'Or type your own connection…', maxlength: 40, on: { input: () => draw(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); const v = customRel(own.value); if (v) go(REL[v]); } else if (e.key === 'Escape') closePop(); } } });
    const list = h('div.opts'); const draw = () => { const v = customRel(own.value), C = v && REL[v];
      list.replaceChildren(...(C ? [h('div.opt.on.rel-custom', { on: { click: () => go(C) } }, h('div', h('b', '“' + C.label + '”'), h('span.s', `“${snippet(A(), 26)}” ${C.label} “${snippet(B(), 26)}” · Enter`)))] : []),
        ...RELATIONS.map(r => h('div.opt' + (C ? '.dim' : ''), { on: { click: () => go(r) } }, h('div', h('b', r.label), h('span.s', `“${snippet(A(), 26)}” ${r.verb} “${snippet(B(), 26)}”`))))); };
    draw();
    popover(x, y, [h('h5', 'How are these connected?'), own, list, h('div.row', { style: { marginTop: '8px' } }, h('button.btn.sm', { on: { click: () => { rev = !rev; draw(); } } }, '⇄ Reverse direction'))]);
    setTimeout(() => own.focus(), 30);
  },

  /* ---------------- pointer: drag boxes, draw wires, resize ---------------- */
  pointer(e) {
    if (e.button !== 0 || this.paper.space || this.travel) return;
    const box = e.target.closest('.box'); if (!box) return;
    const id = box.dataset.id, P = this.paper;
    if (e.target.closest('.port')) { e.preventDefault(); e.stopPropagation(); this.wireDrag(id, e); return; }
    if (e.target.closest('.rz')) { e.preventDefault(); const b = M.block(id); if (!b) return; const x0 = e.clientX, w0 = box.offsetWidth;
      const mv = ev => { b.w = clamp(Math.round(w0 + (ev.clientX - x0) / P.view.z), 240, WIDGETS[b.kind] ? 1600 : 900); box.style.width = b.w + 'px'; this.drawWires(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); b.w = Math.round(b.w / 14) * 14; box.style.width = b.w + 'px'; DB.put('blocks', b); DB.beginGroup(); this.drawWires(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); return; }
    if (e.target.closest('.ed,input,textarea,select,button,a,label,.chips,.ghosts,.refs,.tags,.ptext.edit,.obsn,.itdot,.wplate,.wlegend,.fg-cell')) { if (id[0] !== '_') this.select(id, true); return; }
    // drag the box by its frame or header
    e.preventDefault(); if (id[0] !== '_') this.select(id, true);
    const d = M.doc(this.docId), rec = id === '_head' ? d.layout.head : id === '_synth' ? (d.layout.synth = d.layout.synth || { x: box.offsetLeft, y: box.offsetTop }) : M.block(id);
    const sx = e.clientX, sy = e.clientY, ox = rec.x || 0, oy = rec.y || 0; let moved = false, shift = { x: 0, y: 0 };
    const mv = ev => { const dx = (ev.clientX - sx) / P.view.z + shift.x, dy = (ev.clientY - sy) / P.view.z + shift.y; if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return; if (!moved) { moved = true; box.classList.add('dragging'); hideHover(); }
      rec.x = ox + dx; rec.y = oy + dy; box.style.left = rec.x + 'px'; box.style.top = rec.y + 'px'; this.drawWires(); P.edgePan(ev, (ddx, ddy) => { shift.x -= ddx / P.view.z; shift.y -= ddy / P.view.z; mv(ev); }); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); P.stopEdgePan(); if (!moved) return; box.classList.remove('dragging');
      const nx = Math.round(rec.x / 14) * 14, ny = Math.round(rec.y / 14) * 14, ddx = rec.x - nx, ddy = rec.y - ny; rec.x = nx; rec.y = ny; box.style.left = nx + 'px'; box.style.top = ny + 'px';
      box.animate && !RM() && box.animate([{ transform: `translate(${ddx}px,${ddy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.34,1.4,.64,1)' });
      if (id[0] === '_') DB.put('documents', d); else { DB.put('blocks', rec); REGION.dropped(this, id); } DB.beginGroup(); setTimeout(() => this.drawWires(), 250); this.drawWires(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },
  wireDrag(fromId, e) {
    const P = this.paper, A = this.rectOf(fromId); document.body.classList.add('wiring');
    const mv = ev => { const p = P.toWorld(ev.clientX, ev.clientY), over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.box.cmp');
      $$('.box.target', P.world).forEach(x => x.classList.remove('target'));
      if (over && over.dataset.id !== fromId) { over.classList.add('target'); this.drawWires(this.geom(A, this.rectOf(over.dataset.id)).d); }
      else this.drawWires(this.geom(A, { x: p.x - 1, y: p.y - 1, w: 2, h: 2 }).d); P.edgePan(ev); };
    const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); P.stopEdgePan(); document.body.classList.remove('wiring');
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.box.cmp'); $$('.box.target', P.world).forEach(x => x.classList.remove('target')); this.drawWires();
      const pair = over && [M.block(fromId), M.block(over.dataset.id)].map(x => x && x.kind).sort().join('+');
      if (pair === 'calc+eq') { const c = [M.block(fromId), M.block(over.dataset.id)].find(x => x.kind === 'calc'); EQ.widen(c); M.wire(fromId, over.dataset.id, 'related', false); CALC._focus = c.id; toast('Wired — the calculator now solves the equation'); return; }
      if (over && over.dataset.id !== fromId) this.relationPopover(fromId, over.dataset.id, ev.clientX, ev.clientY + 12);
      else CHAINDROP.open(this, fromId, ev); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },
  crossWire(from) {
    const m = modal({ title: 'Connect to a component in another note', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search components across all notes…',
      items: q => DB.where('blocks', b => b.id !== from && b.status === 'live' && b.kind === 'component' && b.docId !== M.block(from).docId && (!q || (b.body.text + ' ' + b.label + ' ' + (M.doc(b.docId) || {}).title).toLowerCase().includes(q))).sort((a, b) => (b.modified || '').localeCompare(a.modified || '')),
      render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body.text, 80)), h('span.s', M.docPath(M.doc(b.docId)))),
      onPick: b => { m.close(); DocView.relationPopover(from, b.id, innerWidth / 2 - 150, 160); } }) });
  },

  /* ---------------- selection, layout helpers ---------------- */
  select(id, quiet) {
    this.sel = id; $$('.box.sel', this.paper && this.paper.world).forEach(x => x.classList.toggle('sel', x.dataset.id === id)); if (id) { const el = $(`.box[data-id="${id}"]`, this.paper.world); el && el.classList.add('sel'); }
    this.renderInsp();
  },
  reveal(id) { const r = this.rectOf(id); if (!r) return; const P = this.paper, s = P.toScreen(r.x, r.y), pr = P.rect(); const inView = s.x > pr.left + 20 && s.y > pr.top + 20 && s.x + r.w * P.view.z < pr.right - 20 && s.y + Math.min(r.h, 300) * P.view.z < pr.bottom - 20;
    if (!inView) P.centerOn(r.x + r.w / 2, r.y + Math.min(r.h, 300) / 2, Math.max(P.view.z, .8)); },
  orderedEditors() { return M.liveBlocks(this.docId).map(b => $(`.box[data-id="${b.id}"] .ed`, this.paper.world)).filter(x => x && x.contentEditable === 'true'); },
  bboxOf(bs) { const xs = bs.filter(b => b.x != null); if (!xs.length) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; xs.forEach(b => { const r = this.rectOf(b.id) || { x: b.x, y: b.y, w: b.w || 392, h: 120 }; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }); return { x0, y0, x1, y1 }; },
  bbox() { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; $$(':scope > .box', this.paper.world).forEach(el => { x0 = Math.min(x0, el.offsetLeft); y0 = Math.min(y0, el.offsetTop); x1 = Math.max(x1, el.offsetLeft + el.offsetWidth); y1 = Math.max(y1, el.offsetTop + el.offsetHeight); }); return x0 < 1e9 ? { x0, y0, x1, y1 } : null; },
  makeRoomBelow(nb) { const h0 = 130; M.liveBlocks(nb.docId).filter(x => x.id !== nb.id && x.x != null && Math.abs(x.x - nb.x) < 200 && x.y >= nb.y - 10).forEach(x => { x.y += h0 + 28; DB.put('blocks', x); }); },
  /** Tidy: re-flow components in order, respecting their heights. */
  tidy() { const d = M.doc(this.docId), p = prof(d.type), bs = M.liveBlocks(d.id); let y = 168, col = 0, rowH = 0;
    bs.forEach((b, i) => { const hh = this.boxH(b.id); if (p.ordered) { b.x = 0; b.y = y; y += hh + 42; } else { b.x = (col % 2) * ((b.w || 392) + 56); b.y = y; rowH = Math.max(rowH, hh); if (col % 2) { y += rowH + 42; rowH = 0; } col++; } b.y = Math.round(b.y / 14) * 14; DB.put('blocks', b); });
    d.layout.head = { x: 0, y: 0 }; d.layout.synth = null; DB.put('documents', d); changed(); setTimeout(() => this.paper.fit(this.bbox()), 60); },
  newAt(x, y, quiet) {
    const d = M.doc(this.docId); if (this.travel) return;
    const sel = this.sel && M.block(this.sel); const after = sel && sel.docId === d.id ? sel.id : d.blockIds[d.blockIds.length - 1];
    const nb = M.addBlock(d.id, prof(d.type).ordered ? after : null, { x: Math.round(x / 14) * 14, y: Math.round(y / 14) * 14 });
    if (!quiet) this.pendingFocus = { focus: nb.id, pos: 0 }; return nb;
  },
  /** Boxes placed automatically are nudged apart once their real heights are known. */
  settle() {
    const d = M.doc(this.docId); if (!d || this.travel || !this.paper) return false;
    const live = M.liveBlocks(d.id).filter(b => b.x != null && b.kind !== 'ink'), auto = live.filter(b => b.auto); // ink floats where it was written
    const head = this.rectOf('_head'); let moved = false;
    // boxes never overlap: a box that grew (or was placed automatically) pushes the ones below it down
    const R = live.map(b => ({ b, r: this.rectOf(b.id) })).filter(x => x.r).sort((a, c) => a.b.y - c.b.y || d.blockIds.indexOf(a.b.id) - d.blockIds.indexOf(c.b.id));
    const placed = head ? [{ x: head.x, w: head.w, bottom: head.y + head.h }] : [];
    for (const { b, r } of R) {
      const hz = placed.filter(p => p.x < b.x + r.w && p.x + p.w > b.x); let mv = false;
      if (b.auto) { if (hz.length) { const ny = Math.ceil((Math.max(...hz.map(p => p.bottom)) + 28) / 14) * 14; if (ny !== b.y) { b.y = ny; mv = true; } } }
      else { const over = hz.filter(p => b.y < p.bottom + 14 && b.y + r.h > (p.top == null ? -1e9 : p.top)); if (over.length) { const ny = Math.ceil((Math.max(...over.map(p => p.bottom)) + 14) / 14) * 14; if (ny > b.y) { b.y = ny; mv = true; } } }
      if (mv) { moved = true; DB.put('blocks', b); const el = $(`.box[data-id="${b.id}"]`, this.paper.world); if (el) el.style.top = b.y + 'px'; }
      placed.push({ x: b.x, w: r.w, top: b.y, bottom: b.y + r.h });
    }
    auto.forEach(b => { b.auto = false; DB.put('blocks', b); }); if (moved || auto.length) DB.beginGroup();
    const sy = $('.box.synth', this.paper.world); if (sy && !d.layout.synth) { const bb = this.bboxOf(live); if (bb) sy.style.left = (bb.x1 + 80) + 'px'; }
    this.drawWires(); return moved;
  },
  softRefresh(blockId) { const el = blockId && $(`.box[data-id="${blockId}"]`, this.paper && this.paper.world); requestAnimationFrame(() => { if (this.settle()) this.drawWires(); }); if (el) { const b = M.block(blockId), d = M.doc(b.docId); const c = $(':scope > .chips', el); c && c.replaceWith(this.chipsFor(b, d)); const k = IX.kindsOf(b)[0]; el.style.setProperty('--kc', k ? `var(--k-${k})` : null); } this.renderInsp(); this.drawWires(); },
  anchorOf(g) { const q = [...(g.supersededBy || [])], seen = new Set(); while (q.length) { const id = q.shift(); if (seen.has(id)) continue; seen.add(id); const x = M.block(id); if (!x) continue; if (x.status === 'live') return x.id; q.push(...(x.supersededBy || [])); } return null; },
  ancestors(b) { const out = [], seen = new Set(); const walk = (x, g) => { for (const id of x.supersedes || []) { if (seen.has(id)) continue; seen.add(id); const a = M.block(id); if (a) { out.push(Object.assign(a, { _gen: g })); walk(a, g + 1); } } }; walk(b, 1); return out; },
};
VIEWS.doc = DocView;
