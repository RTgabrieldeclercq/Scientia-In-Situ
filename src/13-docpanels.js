/* ==========================================================================
   13 · Note tools — the floating dock, the provenance panel, menus, time
   entry, pulling barriers/structures/components in, and time travel.
   ========================================================================== */
Object.assign(DocView, {
  renderDock(d) {
    const sess = TIMER.activeFor(d.id), flag = M.flagFor('doc', d.id), t = this.travel;
    if (t) { this.dock.replaceChildren(h('span.dk-l', 'Read-only · as it stood ' + fmtDayLong(t.at) + ' ' + fmtTime(t.at)), h('button.btn.sm.pri', { on: { click: () => { this.travel = null; this.update(this.docId); } } }, 'Back to now')); return; }
    const timer = sess ? [h('span.tchip' + (sess.state === 'running' ? '.run' : '.paused'), h('i'), h('span.wt', { 'data-sess': sess.id }, fmtDur(TIMER.elapsed(sess), true))),
      sess.state === 'running' ? h('button.dk', { title: 'Pause', on: { click: () => TIMER.pause(sess) } }, '❚❚') : h('button.dk', { title: 'Resume', on: { click: () => TIMER.resume(sess) } }, '▶'),
      h('button.dk', { title: 'Stop and record', on: { click: () => TIMER.stop(sess) } }, '■')]
      : h('button.dk.pri', { title: 'Start this note’s timer (two may run at once)', on: { click: () => TIMER.start(d.id) } }, '▶ Timer');
    this.dock.replaceChildren(h('button.dk.ins', { title: 'Insert a well plate, a protocol, a box… (what can go in this note)', on: { click: e => INSERT.menu(this, e.currentTarget) } }, '+ Insert'), h('span.dk-sep'), h('button.dk', { title: 'Log time without the timer', on: { click: () => this.logTime(d) } }, '+ Time'), h('span.dk-sep'),
      h('div.seg.sm', { title: 'Citation display for this note' }, ['title', 'author', 'number'].map(m => h('button' + (d.citeMode === m ? '.on' : ''), { on: { click: () => { d.citeMode = m; DB.put('documents', d); changed(); } } }, m === 'title' ? 'Title' : m === 'author' ? 'Author–year' : '[1]'))),
      h('span.dk-sep'),
      h('button.dk', { title: 'Pull an unresolved barrier, a structure or a component from another note', on: { click: () => this.pullMenu(d) } }, '⤓ Pull in'),
      h('button.dk' + (flag ? '.on' : ''), { title: 'Flag this note for the weekly review', on: { click: () => M.toggleFlag('doc', d.id) } }, flag ? '⚑' : '⚐'),
      h('button.dk' + (this.inspOpen ? '.on' : ''), { title: 'Provenance panel (I)', on: { click: () => { this.inspOpen = !this.inspOpen; _ls.set('insp', this.inspOpen); this.renderInsp(); this.renderDock(d); } } }, 'ⓘ'),
      h('button.dk', { title: 'Fit (Ctrl+0)', on: { click: () => this.paper.fit(this.bbox()) } }, '⤢'),
      h('button.dk' + (document.fullscreenElement ? '.on' : ''), { title: 'Focus mode (Ctrl+.) — fullscreen; frees Ctrl+W for terms', on: { click: () => App.toggleFocus() } }, '⛶'),
      h('button.dk', { title: 'More', on: { click: e => this.docMenu(d, e) } }, '⋯'));
  },
  renderHint(d, live) {
    const s = settings(); this.hint.replaceChildren(live.length && live.some(b => b.body.text.trim() || b.kind === 'ref') ? h('span', `${keyLabel(s.structKey)} says what a phrase is · Ctrl+W term (Focus) · Ctrl+I cite · drag ● to connect`)
      : h('span', 'Write in the first box. Double-click the paper for another; right-click to pull in barriers or components from other notes.'));
  },
  docMenu(d, e) {
    ctxMenu(e.clientX - 200, e.clientY - 10, [{ head: d.title },
      { label: 'Note details…', sub: 'Title, type, project, theme, date', run: () => EDIT.noteDialog(d) },
      { label: 'Time entries…', sub: 'Move, change or delete recorded time', run: () => EDIT.timeDialog(d) },
      prof(d.type).type === 'protocol' ? { label: 'Run this protocol…', sub: 'New experiment with its steps bound here; starts the timer', run: () => App.newDoc({ type: 'experiment', projectId: d.projectId }) } : null,
      { label: 'Tidy layout', sub: 'Re-flow the boxes in order', run: () => this.tidy() },
      { label: 'View as it stood on…', sub: 'Time travel through the journal', run: () => this.travelDialog(d) },
      { label: 'Export canvas (HTML)…', sub: 'One file: the live canvas with its PDFs, pages and recordings, read-only', run: () => Exporter.doc(d.id) },
      { label: 'Save structure as template…', run: async () => { const n = await askText('Save as template', 'Template name', d.title + ' template'); if (n) { M.saveAsTemplate(d, n); toast('Template saved — tick it in Settings to use it'); } } },
      prof(d.type).scope === 'theme' ? { label: 'Move to theme…', run: () => this.moveDoc(d) } : null,
      { label: 'Delete note…', danger: true, sub: 'Ctrl+Z undoes it', run: () => EDIT.confirmDoc(d) },
      { label: 'Change type…', sub: 'Profiles are data — the components stay', run: () => pickModal('Change note type', 'Labels, nouns and header fields follow the new type.', userProfiles().filter(p => p.type !== d.type).map(p => ({ label: p.label, run: () => { d.type = p.type; d.scope = p.scope; if (p.scope !== 'theme') d.themeId = null; M.touchDoc(d); changed(); } }))) }]);
  },
  menu(e, p) {
    if (this.travel) return;
    const ed = e.target.closest('.ed'), box = e.target.closest('.box.cmp'), sel = ed && ED.selection(ed);
    if (ed && sel && !sel.collapsed && ed.contentEditable === 'true') { const b = M.block(box.dataset.id);
      return ctxMenu(e.clientX, e.clientY + 6, [{ head: 'Selection' }, { label: 'What is it…', key: keyLabel(settings().structKey), run: () => { ed.focus(); ED.setCaret(ed, sel.from, sel.to); ED.openStrip(ed, b, ED.selection(ed) || sel); } },
        { label: 'Mark as a term', key: 'Ctrl+W', run: () => ED.markTerm(ed, b, sel) }, { label: 'Link to a note…', run: () => ED.linkPicker(ed, b, sel) }, { label: 'Reference an existing structure…', run: () => ED.mentionPicker(ed, b, sel) }, { label: 'Add to library', key: 'Ctrl+I', run: () => LibraryView.addDialog(ED.read(ed, []).text.slice(sel.from, sel.to)) }]); }
    if (box) return this.boxMenu(M.block(box.dataset.id), e);
    const d = M.doc(this.docId);
    ctxMenu(e.clientX, e.clientY + 6, [{ head: d.title },
      { label: 'New ' + prof(d.type).noun.toLowerCase() + ' here', key: 'Dbl-click', run: () => this.newAt(p.x, p.y) },
      { label: 'Pull in an unresolved barrier…', sub: 'From any note; closed barriers are not offered', run: () => this.pullMenu(d, 'barrier', p) },
      { label: 'Pull in a structure…', sub: 'A claim, result or question from elsewhere', run: () => this.pullMenu(d, 'item', p) },
      { label: 'Embed a component from another note…', run: () => this.pullMenu(d, 'component', p) }, 'sep',
      { label: 'Insert…', sub: 'A well plate, a protocol, a box — everything that can go here', run: () => INSERT.menu(this, { x: e.clientX, y: e.clientY }, { x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14 }) },
      { label: 'New protocol here', sub: 'One block, steps linked; register it when it is ready', run: () => PROTO.create(d.id, Math.round(p.x / 14) * 14, Math.round(p.y / 14) * 14) },
      { label: 'Run a registered protocol here…', sub: 'Steps to check, time and observe', run: () => { const defs = DB.where('blocks', b => b.kind === 'protocol' && b.registered); if (!defs.length) return toast('No registered protocols yet'); PROTO.pickProtocol('Run which protocol here?', df => PROTO.newRun(df, d.id, Math.round(p.x / 14) * 14, Math.round(p.y / 14) * 14)); } }, 'sep',
      { label: 'Fit', key: 'Ctrl+0', run: () => this.paper.fit(this.bbox()) }, { label: 'Tidy layout', run: () => this.tidy() }]);
  },
  boxMenu(b, e) {
    if (!b) return; this.select(b.id);
    const d = M.doc(b.docId), i = d.blockIds.indexOf(b.id), next = d.blockIds.slice(i + 1).map(M.block).find(x => x && x.status === 'live' && x.kind === 'component'), flag = M.flagFor('block', b.id), live = b.status === 'live' && b.kind === 'component';
    const isP = PROTO.is(b), pdef = isP && PROTO.defOf(b), W = WIDGETS[b.kind];
    if (W) return ctxMenu(e.clientX, e.clientY + 6, [{ head: b.label || W.label }, ...(W.menu ? W.menu(b) : []), 'sep',
      { label: 'Connect to a component in another note…', run: () => this.crossWire(b.id) },
      { label: flag ? 'Clear flag' : 'Flag for weekly review', run: () => M.toggleFlag('block', b.id) },
      { label: 'Remove from this note', sub: 'Kept in the record; the files stay in the images folder', danger: true, run: () => { b.status = 'removed'; b.removedAt = isoLocal(new Date()); DB.put('blocks', b); changed(); toast((b.label || 'Widget') + ' removed'); } }]);
    if (isP) return ctxMenu(e.clientX, e.clientY + 6, [{ head: b.kind === 'run' ? 'Run of ' + (pdef ? pdef.label : 'a protocol') : pdef.label },
      b.kind === 'protocol' && !b.registered ? { label: 'Register as a protocol…', sub: 'Gives it its own protocol note; this box becomes a run', run: () => PROTO.registerDialog(b) } : null,
      b.kind === 'protocol' && !b.registered && !b.localOnly ? { label: 'Keep it in this note', sub: 'Stays here, still searchable; the light goes out', run: () => { b.localOnly = true; DB.put('blocks', b); changed(); } } : null,
      pdef && pdef.registered && pdef.registered.docId !== d.id ? { label: 'Open the protocol note', sub: 'Steps are changed only there · Alt+click: beside', run: ev => App.jump(pdef.id, ev) } : null,
      pdef && pdef.registered ? { label: 'Run it in a new experiment…', run: () => App.newDoc({ type: 'experiment', projectId: pdef.registered.projectId, themeId: pdef.registered.themeId, runDef: pdef.id }) } : null,
      { label: 'Connect to a component in another note…', run: () => this.crossWire(b.id) },
      { label: flag ? 'Clear flag' : 'Flag for weekly review', run: () => M.toggleFlag('block', b.id) },
      b.kind === 'run' ? { label: 'Materials & data of this run…', run: () => BINDS.dialog(b) } : null,
      b.kind === 'run' && !IX.itemsOriginatingIn(b.id).length && !Object.keys(b.checks || {}).length ? { label: 'Remove this run', danger: true, run: () => M.removeRef(Object.assign(b, { kind: 'ref' })) } : null]);
    ctxMenu(e.clientX, e.clientY + 6, [{ head: M.blockName(b) },
      live ? { label: 'Revise wording', sub: 'The old wording stays inside, greyed, with its history', run: () => { const [n] = M.reviseBlock(b); this.pendingFocus = { focus: n, pos: 0 }; } } : null,
      live ? { label: 'Split into two…', sub: 'Both successors inherit the history', run: () => this.splitDialog(b) } : null,
      live && next ? { label: 'Merge with next', sub: `with “${snippet(M.blockName(next), 30)}”`, run: () => M.mergeBlocks(b, next) } : null,
      { label: 'Connect to a component in another note…', run: () => this.crossWire(b.id) },
      live ? { label: 'Embed in another note…', sub: 'It appears there; the origin is kept', run: () => this.embedElsewhere(b) } : null,
      live && !b.parent && i > 0 ? { label: 'Make it a substep of the one above', sub: 'Nested, numbered as a sub-step', run: () => { const prev = d.blockIds.slice(0, i).reverse().map(M.block).find(x => x && x.status === 'live' && x.kind === 'component' && !x.parent); if (prev) M.nestUnder(b, prev.id); } } : null,
      live && b.parent ? { label: 'Un-nest', run: () => M.nestUnder(b, null) } : null,
      live ? { label: 'Fields…', sub: 'Typed key/value rows, charted across runs', run: () => this.fieldsDialog(b) } : null,
      d.type === 'day' && live ? { label: 'File to a component…', sub: 'The entry stays here; a structure pointing to it is added there', run: () => DAY.file(b) } : null,
      d.type === 'day' && live ? { label: 'Assign to a theme…', run: () => pickModal('Assign to a theme', snippet(b.body.text, 80), DB.where('themes', t => t.status === 'active').map(t => ({ label: t.name, run: () => DAY.assign(b, t.id) }))) } : null,
      { label: 'Data, materials & code…', sub: 'Bind datasets, lots and a code version — builds the provenance chain', run: () => BINDS.dialog(b) },
      PROV.has(b) ? { label: 'Export provenance…', sub: 'Read-only HTML: figure ← pass ← dataset ← step', run: () => PROV.export(b.id) } : null,
      { label: 'Stamp & manual duration…', run: () => this.stampPopover(b, e) },
      { label: flag ? 'Clear flag' : 'Flag for weekly review', run: () => M.toggleFlag('block', b.id) },
      b.kind === 'ref' ? { label: 'Remove from this note', sub: 'The original stays where it was written', run: () => M.removeRef(b) } : null,
      b.kind !== 'ref' ? { label: 'Delete component…', danger: true, sub: 'With its structures and connections · Ctrl+Z undoes it', run: () => EDIT.confirmBlock(b) } : null]);
  },
  stampPopover(b, e) {
    const st = b.stamp, dt = h('input.inp.mono', { type: 'datetime-local', value: toInputDT(st.at) });
    const dur = h('input.inp.mono', { placeholder: '90 · 1h30 · 1:30', value: b.manualSec ? fmtDur(b.manualSec * 1000).replace(' ', '') : '', style: { width: '140px' } });
    popover(e.clientX - 120, e.clientY + 14, [h('h5', 'Stamp'), h('div.tiny.muted', { style: { margin: '0 6px 6px' } }, `When it happened — any date and time. Written ${fmtWhen(b.created)}.`),
      h('div.row', { style: { padding: '0 6px' } }, dt, h('button.btn.sm', { on: { click: () => { dt.value = toInputDT(new Date()); } } }, 'Now')),
      st.sessionId ? h('div.tiny', { style: { margin: '6px', color: 'var(--teal)' } }, `Recorded during a timer session, +${fmtDur(st.offsetMs || 0)} in.`) : null,
      h('h5', { style: { marginTop: '12px' } }, 'Manual duration'), h('div.row', { style: { padding: '0 6px' } }, dur, h('span.tiny.muted', 'counts as if it had a timer')),
      h('div.row', { style: { margin: '10px 6px 4px', justifyContent: 'flex-end' } }, h('button.btn.sm.pri', { on: { click: () => {
        const ok = M.setStamp(b, dt.value); const sec = dur.value.trim() ? parseDuration(dur.value) : null;
        if (dur.value.trim() && sec == null) return toast('Could not read that duration');
        if (sec !== b.manualSec) M.setManual(b, sec); if (ok !== false) closePop(); } } }, 'Save'))]);
  },
  fieldsDialog(b) {
    const rows = JSON.parse(JSON.stringify(b.fields || [])), host = h('div');
    const draw = () => host.replaceChildren(...rows.map((f, i) => h('div.row', { style: { marginBottom: '6px', flexWrap: 'nowrap' } }, h('input.inp', { value: f.key, placeholder: 'key (e.g. stiffness)', style: { width: '170px' }, on: { input: e => f.key = e.target.value } }), h('input.inp', { value: f.value, placeholder: 'value (e.g. 8 kPa)', style: { flex: 1 }, on: { input: e => f.value = e.target.value } }), h('button.btn.xs.ghost', { on: { click: () => { rows.splice(i, 1); draw(); } } }, '×'))),
      h('button.btn.sm', { on: { click: () => { rows.push({ key: '', value: '' }); draw(); } } }, '+ field'));
    if (!rows.length) rows.push({ key: '', value: '' }); draw();
    modal({ title: 'Fields · ' + M.blockName(b), body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Typed rows on the component (Key:: value, hidden). The same key across runs becomes a column in the protocol roll-up.'), host),
      actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => M.setFields(b, rows.filter(r => r.key.trim()).map(r => ({ key: r.key.trim(), value: r.value.trim() }))) }] });
  },
  splitDialog(b) {
    const t = b.body.text.replace(/￼/g, ''), cut = Math.max(t.indexOf('. ') + 1, Math.floor(t.length / 2));
    const a = h('textarea.inp', { rows: 3 }); a.value = t.slice(0, cut).trim();
    const c = h('textarea.inp', { rows: 3 }); c.value = t.slice(cut).trim();
    const la = h('input.inp', { value: b.label ? b.label + ' (a)' : '', placeholder: 'label' }), lc = h('input.inp', { value: b.label ? b.label + ' (b)' : '', placeholder: 'label' });
    modal({ title: 'Split component', body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Structures, barriers and resolutions stay on the original wording — it remains inside both new components, greyed, and both inherit its history. No triage needed.'),
      h('label.f', h('span', 'First'), la, a), h('div', { style: { height: '10px' } }), h('label.f', h('span', 'Second'), lc, c)),
      actions: [{ label: 'Cancel' }, { label: 'Split', pri: true, run: () => { M.splitBlock(b, [{ label: la.value, text: a.value }, { label: lc.value, text: c.value }]); } }] });
  },
  embedElsewhere(b) {
    const m = modal({ title: 'Embed in another note', actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search notes…', items: q => DB.where('documents', x => x.id !== b.docId && (!q || x.title.toLowerCase().includes(q))).sort((x, y) => y.modified.localeCompare(x.modified)),
      render: x => h('div', typechip(x.type), ' ', x.title, h('span.s', M.docPath(x))), onPick: x => { m.close(); M.pullInto(x.id, null, { blockId: b.id }); toast('Embedded in “' + x.title + '”'); } }) });
  },
  moveDoc(d) {
    const m = modal({ title: 'Move note to theme', actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Theme…', items: q => DB.where('themes', t => t.projectId === d.projectId && t.status === 'active' && (!q || t.name.toLowerCase().includes(q))),
      render: t => h('div', t.name), onPick: t => { m.close(); d.themeId = t.id; M.touchDoc(d); changed(); } }) });
  },
  pullMenu(d, mode = 'barrier', at) {
    const sel = this.sel && M.block(this.sel), after = sel && sel.docId === d.id ? sel.id : d.blockIds[d.blockIds.length - 1];
    const pos = at || (() => { const bb = this.bbox(); return bb ? { x: bb.x0, y: bb.y1 + 40 } : { x: 0, y: 200 }; })();
    const tabs = h('div.seg', { style: { marginBottom: '10px' } }), host = h('div');
    const set = md => {
      mode = md; tabs.replaceChildren(...[['barrier', 'Unresolved barriers'], ['item', 'Any structure'], ['component', 'Component']].map(([k, l]) => h('button' + (k === mode ? '.on' : ''), { on: { click: () => set(k) } }, l)));
      const inDoc = new Set(M.docBlocks(d.id).filter(b => b.status !== 'removed').map(b => b.refItemId).filter(Boolean));
      host.replaceChildren(mode === 'component'
        ? optionPicker({ placeholder: 'Search components in other notes…', items: q => DB.where('blocks', b => b.docId !== d.id && b.kind === 'component' && b.status === 'live' && (!q || (b.body.text + b.label).toLowerCase().includes(q))).sort((a, b) => (b.modified || '').localeCompare(a.modified || '')),
            render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body.text, 70)), h('span.s', M.docPath(M.doc(b.docId)))), onPick: b => { m.close(); M.pullInto(d.id, after, { blockId: b.id, x: pos.x, y: pos.y }); } })
        : optionPicker({ placeholder: mode === 'barrier' ? 'Search barriers not yet closed…' : 'Search claims, results, questions…',
            items: q => (mode === 'barrier' ? IX.pullable(null) : DB.where('items', i => i.status !== 'closed' && !i.correctedBy)).filter(i => i.originDocId !== d.id && !inDoc.has(i.id) && (!q || i.text.toLowerCase().includes(q)))
              .sort((a, b) => (a.projectId === d.projectId ? -1 : 1) - (b.projectId === d.projectId ? -1 : 1) || b.created.localeCompare(a.created)),
            render: i => h('div', kchip(i.kind), ' ', IX.status(i) ? h('span.pill' + (IX.status(i) === 'open' ? '.bad' : '.ok'), IX.status(i)) : null, ' ', h('span.serif', snippet(i.text, 80)), h('span.s', M.docPath(M.doc(i.originDocId)) + ' · ' + fmtWhen(i.created))),
            emptyText: mode === 'barrier' ? 'No open barriers elsewhere — closed barriers are not offered' : 'Nothing matches', onPick: i => { m.close(); M.pullInto(d.id, after, { itemId: i.id, x: pos.x, y: pos.y }); toast(KIND[i.kind].label + ' pulled in — its status stays live across notes'); } }));
    };
    const m = modal({ title: 'Pull into this note', wide: true, actions: [{ label: 'Close' }], body: h('div', tabs, host) }); set(mode);
  },
  logTime(d) {
    let mode = 'duration';
    const seg = h('div.seg'), host = h('div', { style: { marginTop: '12px' } });
    const dur = h('input.inp.mono', { placeholder: '150 · 2h30 · 2:30', autofocus: true }), date = h('input.inp.mono', { type: 'date', value: d.backdate || localDate(new Date()) });
    const st = h('input.inp.mono', { type: 'datetime-local' }), en = h('input.inp.mono', { type: 'datetime-local' }), note = h('input.inp', { placeholder: 'note (optional)' });
    const draw = () => { seg.replaceChildren(...[['duration', 'Raw duration'], ['endpoints', 'Start / end']].map(([k, l]) => h('button' + (k === mode ? '.on' : ''), { on: { click: () => { mode = k; draw(); } } }, l)));
      host.replaceChildren(mode === 'duration' ? h('div.grid2', h('label.f', h('span', 'Duration'), dur), h('label.f', h('span', 'Date'), date))
        : h('div', h('div.grid2', h('label.f', h('span', 'Started'), h('div.row', st, h('button.btn.sm', { on: { click: () => st.value = toInputDT(new Date()) } }, 'Now'))), h('label.f', h('span', 'Ended'), h('div.row', en, h('button.btn.sm', { on: { click: () => en.value = toInputDT(new Date()) } }, 'Now')))),
          h('p.tiny.muted', 'Either endpoint can be saved alone — the entry stays open until the other arrives, and the weekly review lists it.'))); };
    draw();
    modal({ title: 'Log time · ' + d.title, body: h('div', seg, host, h('div', { style: { height: '10px' } }), note), actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => {
      if (mode === 'duration') { const s = parseDuration(dur.value); if (!s) { toast('Could not read that duration'); return false; } TIMER.logManual(d.id, { mode, seconds: s, date: date.value, note: note.value }); }
      else { if (!st.value && !en.value) { toast('Give at least one endpoint'); return false; } if (st.value && en.value && en.value < st.value && !confirm('The end is before the start. Treat it as ending the next day?')) return false;
        let e2 = en.value; if (st.value && en.value && en.value < st.value) { const x = new Date(en.value); x.setDate(x.getDate() + 1); e2 = toInputDT(x); }
        TIMER.logManual(d.id, { mode, startedAt: st.value, endedAt: e2, note: note.value }); }
    } }] });
  },
  completeOpen(s) {
    const st = h('input.inp.mono', { type: 'datetime-local', value: s.startedAt ? toInputDT(s.startedAt) : '' }), en = h('input.inp.mono', { type: 'datetime-local', value: s.endedAt ? toInputDT(s.endedAt) : '' });
    modal({ title: 'Complete time entry', body: h('div.grid2', h('label.f', h('span', 'Started'), st), h('label.f', h('span', 'Ended'), en)), actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => TIMER.completeOpen(s, st.value, en.value) }] });
  },
  rollupPopover(b, e) {
    const roll = IX.rollup(b.id), runs = IX.boundRuns(b.id), by = groupBy(roll, x => x.it.kind);
    const keys = [...new Set(runs.flatMap(r => (r.fields || []).map(f => f.key)))];
    const body = h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Everything recorded at this step, at any earlier wording of it, and in every run bound to it. Generation 0 is the current wording.'),
      ['barrier', 'resolution', 'deviation', 'observation', 'result', 'question'].filter(k => by[k]).map(k => h('div', h('div.lab', KIND[k].label + ' · ' + by[k].length),
        h('div.list', by[k].map(x => h('div.li.click', { on: { click: e => { m.close(); App.jump(x.blockId, e); } } }, kchip(x.it.kind, x.it.kind === 'barrier' ? IX.status(x.it) : null), h('span.t', h('span.serif', snippet(x.it.text, 100)), h('span.s', (x.via === 'run' ? 'in run · ' + (M.doc((M.block(x.blockId) || {}).docId) || {}).title : 'at this step') + (x.generation ? ` · from an earlier version (generation ${x.generation})` : '')))))))),
      by.deviation && by.deviation.length >= 3 ? h('div.callout.warn', 'Three or more deviations here: the step probably does not describe what people actually do. Revise it.') : null,
      keys.length ? h('div', h('div.lab', 'Fields across runs'), h('table.t', h('thead', h('tr', h('th', 'Run'), keys.map(k => h('th', k)))), h('tbody', runs.map(r => h('tr', h('td', (M.doc(r.docId) || {}).title), keys.map(k => h('td', ((r.fields || []).find(f => f.key === k) || {}).value || '—'))))))) : null,
      !roll.length ? h('div.empty', 'Nothing recorded at this step yet') : null);
    const m = modal({ title: 'What goes wrong here? · ' + M.blockName(b), wide: true, body, actions: [{ label: 'Close' }] });
  },
  async travelDialog(d) {
    const inp = h('input.inp.mono', { type: 'datetime-local', value: toInputDT(addDays(new Date(), -7)) });
    modal({ title: 'View as it stood on…', body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Reconstructed from the append-only journal. Read-only; nothing changes.'), inp), actions: [{ label: 'Cancel' }, { label: 'Show', pri: true, run: async () => {
      const at = new Date(inp.value); const st = await this.reconstruct(d, at); if (!st) return toast('The journal has no record before then for this note');
      this.travel = Object.assign(st, { at }); this.update(d.id); } }] });
  },
  /** Undo the journal backwards from now to `at` on copies of this note's records. */
  async reconstruct(d, at) {
    const iso = isoLocal(at); const entries = (await DB.journalSince(iso)).filter(e => e.store === 'documents' || e.store === 'blocks').sort((a, b) => b.seq - a.seq);
    const doc = JSON.parse(JSON.stringify(d)), blocks = new Map(M.docBlocks(d.id).map(b => [b.id, JSON.parse(JSON.stringify(b))]));
    if (+new Date(d.created) > +at) return null;
    for (const e of entries) {
      if (e.store === 'documents' && e.id === d.id) { if (e.prev) Object.assign(doc, e.prev); }
      if (e.store === 'blocks') { if (!e.prev) blocks.delete(e.id); else if (e.prev.docId === d.id) blocks.set(e.id, e.prev); }
    }
    return { doc, blocks: doc.blockIds.map(id => blocks.get(id)).filter(Boolean) };
  },

  /* ---------------- provenance panel ---------------- */
  renderInsp() {
    if (!this.insp) return; this.insp.classList.toggle('open', !!this.inspOpen); if (!this.inspOpen) return;
    const d = M.doc(this.docId); if (!d) return;
    const b = this.sel && M.block(this.sel);
    this.insp.replaceChildren(h('button.ib.x', { on: { click: () => { this.inspOpen = false; _ls.set('insp', false); this.renderInsp(); this.renderDock(d); } } }, '✕'), b && b.docId === d.id ? this.blockInsp(b, d) : this.docInsp(d));
  },
  blockInsp(b, d) {
    const items = IX.itemsOf(b.id), wires = IX.wiresOf(b.id), terms = [...(IX.blockTerms.get(b.id) || [])].map(M.term).filter(Boolean), s = b.stamp.sessionId && M.session(b.stamp.sessionId);
    const anc = DocView.ancestors(b), hist = M.historyFor(b.id);
    return h('div',
      h('div.ins-h', h('div.k', b.kind === 'ref' ? 'pulled-in component' : 'component'), h('b', M.blockName(b)), h('div.tiny.muted', M.docPath(d))),
      h('div.ins-s', h('h6', 'Provenance'), h('dl.kv',
        h('dt', 'created'), h('dd', fmtDayLong(b.created) + ' ' + fmtTime(b.created)),
        h('dt', 'stamp'), h('dd', fmtTime(b.stamp.at), ' ', h('button.btn.xs', { on: { click: e => this.stampPopover(b, e) } }, 'adjust')),
        s ? [h('dt', 'timer'), h('dd', `+${fmtDur(b.stamp.offsetMs || 0)} into a ${fmtDur(TIMER.elapsed(s))} session`)] : null,
        b.manualSec ? [h('dt', 'manual'), h('dd', fmtDur(b.manualSec * 1000))] : null,
        (b.timed || []).length ? [h('dt', 'timed'), h('dd', fmtDur(sum(b.timed.map(t => t.sec)) * 1000) + (b.timed.length > 1 ? ` · ${b.timed.length} timers` : ''))] : null,
        b.step && b.step.checkedAt ? [h('dt', 'step'), h('dd', 'checked ' + fmtTime(b.step.checkedAt) + (b.step.durMs != null ? ` · ${fmtDur(b.step.durMs, true)}` : ''))] : null,
        b.boundTo ? [h('dt', 'bound to'), h('dd', h('a', { on: { click: e => App.jump(b.boundTo.componentId, e) } }, (M.doc(b.boundTo.protocolId) || {}).title + ' › ' + M.blockName(M.block(b.boundTo.componentId))))] : null,
        M.isLocked(b) ? [h('dt', 'record'), h('dd', 'locked since the day turned — revise or correct')] : null,
        h('dt', 'edited'), h('dd', fmtWhen(b.modified || b.created)))),
      h('div.ins-s', h('h6', 'Structures', h('span.muted', items.length)), items.length ? items.map(it => h('div.ins-it', { on: { click: e => ED.itemPopover(it.id, e.clientX - 200, e.clientY + 10, b, (b.body.marks.find(m => m.ref === it.id) || {}).id) } },
        h('div.row', kchip(it.kind), IX.status(it) ? h('span.pill' + (IX.status(it) === 'open' ? '.bad' : IX.status(it) === 'resolved' ? '.ok' : ''), IX.status(it)) : null, it.originBlockId !== b.id ? h('span.pill', 'referenced') : null),
        h('div.serif', snippet(it.text, 120)))) : h('div.tiny.muted', `Select text and press ${keyLabel(settings().structKey)}.`)),
      h('div.ins-s', h('h6', 'Connections', h('span.muted', wires.length)),
        wires.map(w => { const out = w.from === b.id, o = M.block(out ? w.to : w.from), rel = REL[w.rel] || REL.related; return h('div.ins-w', h('span.mono', (w.directed ? (out ? '→ ' : '← ') : '↔ ') + (out ? rel.label : rel.inv)),
          h('a', { title: 'Alt+click: open beside', on: { click: e => o && App.jump(o.id, e) } }, o ? M.blockName(o) : '—'), h('button.ib', { title: 'Remove connection', on: { click: () => M.unwire(w.id) } }, '×')); }),
        h('div.tiny.muted', { style: { marginTop: '4px' } }, 'Drag the ● on a box to connect.')),
      PROV.has(b) || (d.materials || []).length ? h('div.ins-s', h('h6', 'Provenance chain'), PROV.tree(PROV.chain(b.id)), h('button.btn.xs', { style: { marginTop: '6px' }, on: { click: () => PROV.export(b.id) } }, 'Export')) : null,
      terms.length ? h('div.ins-s', h('h6', 'Terms'), h('div.row', terms.map(t => h('a.btn.xs', { href: '#/lens/' + t.id }, h('span.term-demo', t.label))))) : null,
      anc.length ? h('div.ins-s', h('h6', 'Lineage', h('span.muted', plural(anc.length, 'ancestor'))), h('div.tiny.muted', `${plural(hist.filter(x => x.generation === 0).length, 'structure')} on this wording, plus ${plural(hist.filter(x => x.generation > 0).length, 'more')} from earlier versions.`)) : null,
      h('div.ins-s', h('h6', 'Review'), h('button.btn.sm' + (M.flagFor('block', b.id) ? '.on' : ''), { on: { click: () => M.toggleFlag('block', b.id) } }, M.flagFor('block', b.id) ? '⚑ Flagged' : '⚐ Flag for weekly review')));
  },
  docInsp(d) {
    const blocks = M.docBlocks(d.id).filter(b => b.status !== 'removed'), items = blocks.flatMap(b => IX.itemsOf(b.id)), byK = groupBy(items, i => i.kind);
    const sess = DB.where('sessions', s => s.docId === d.id).sort((a, b) => b.created.localeCompare(a.created));
    const total = sum(sess.filter(s => s.state !== 'open').map(s => TIMER.elapsed(s))) + sum(blocks.map(b => (b.manualSec || 0) * 1000));
    const terms = new Set(blocks.flatMap(b => [...(IX.blockTerms.get(b.id) || [])])), bl = IX.backlinks(d.id);
    return h('div', h('div.ins-h', h('div.k', 'note'), h('b', d.title), h('div.tiny.muted', 'Select a component for its provenance')),
      h('div.ins-s', h('h6', 'Structures'), items.length ? h('div.row', Object.entries(byK).map(([k, v]) => kchip(k, `${KIND[k].label} ${v.length}`))) : h('div.tiny.muted', 'None yet')),
      h('div.ins-s', h('h6', 'Time', h('span.muted', fmtDur(total))), sess.length ? sess.slice(0, 8).map(s => h('div.ins-w', h('span.mono', s.entry === 'duration' ? s.localDate.slice(5) : fmtWhen(s.created)),
        h('span', s.state === 'open' ? h('span.pill.warn', 'open entry') : fmtDur(TIMER.elapsed(s)) + (s.steps && s.steps.length ? ` · ${s.steps.length} steps` : '')),
        s.state === 'open' ? h('button.btn.xs', { on: { click: () => this.completeOpen(s) } }, 'complete') : h('span.pill', s.source))) : h('div.tiny.muted', 'No time recorded')),
      terms.size ? h('div.ins-s', h('h6', 'Terms'), h('div.row', [...terms].map(M.term).filter(Boolean).map(t => h('a.btn.xs', { href: '#/lens/' + t.id }, h('span.term-demo', t.label))))) : null,
      bl.length ? h('div.ins-s', h('h6', 'Linked from'), bl.map(x => { const bb = x.blockId && M.block(x.blockId); return h('div.ins-w', h('a', { on: { click: e => bb && App.jump(bb.id, e) } }, bb ? M.docPath(M.doc(bb.docId)) : '—')); })) : null);
  },
});

/* ==========================================================================
   Side by side: Alt+click on any connection opens its note in another pane —
   two side by side, a third splits the right column, a fourth makes a 2×2
   grid. Ctrl+click opens the note in the pane you clicked in.
   ========================================================================== */
function makePane(side) { const p = Object.create(DocView); Object.assign(p, { docId: null, paper: null, sel: null, pendingFocus: null, openGhosts: new Set(), travel: null, inspOpen: false, side: !!side, selWire: null }); return p; }
const PANES = [DocView, makePane(true), makePane(true), makePane(true)], SidePane = PANES[1], MAXPANES = 4;
/** The pane (note canvas) an element belongs to, or the active one. */
function DV(el) { const host = el && el.closest && el.closest('.canvas-host'); return (host && host._dv) || App.pane || DocView; }
const SplitView = {
  canvas: true, title: true,
  /** #/split/<doc>/<doc>[/<doc>[/<doc>]][/<component to reveal>] */
  parse(args) { const docs = args.filter(x => M.doc(x)).slice(0, MAXPANES), focus = args.find(x => !M.doc(x) && M.block(x)); return { docs, focus }; },
  route: (docs, focus) => '#/split/' + docs.map(encodeURIComponent).join('/') + (focus ? '/' + focus : ''),
  render(...args) {
    const { docs, focus } = SplitView.parse(args); if (docs.length < 2) { setTimeout(() => App.go('#/doc/' + (docs[0] || '')), 0); return h('div'); }
    DocView.side = false; PANES.slice(1).forEach(p => p.side = true);
    if (focus) { const i = docs.indexOf((M.block(focus) || {}).docId); if (i >= 0 && !PANES[i].pendingFocus) PANES[i].pendingFocus = { reveal: focus }; }
    const n = docs.length, wrap = h('div.split.n' + n);
    const panes = docs.map((id, i) => { const el = h('div.pane.p' + i); el.append(PANES[i].render(id), PANES[i].paneHead(i)); return el; });
    const vsep = h('div.split-sep.v', { title: 'Drag to resize' }), hsep = n > 2 ? h('div.split-sep.h', { title: 'Drag to resize' }) : null;
    wrap.append(...panes, vsep, hsep || '');
    wrap.style.setProperty('--at', _ls.get('splitAt', 50) + '%'); wrap.style.setProperty('--rat', _ls.get('splitRow', 50) + '%');
    const drag = (sep, axis) => sep.addEventListener('pointerdown', e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); sep.classList.add('drag');
      const mv = ev => { const at = clamp(axis === 'x' ? (ev.clientX - r.left) / r.width * 100 : (ev.clientY - r.top) / r.height * 100, 18, 82); wrap.style.setProperty(axis === 'x' ? '--at' : '--rat', at + '%'); _ls.set(axis === 'x' ? 'splitAt' : 'splitRow', Math.round(at)); };
      const up = () => { sep.classList.remove('drag'); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); App.panes().forEach(p => p.paper && p.paper.apply()); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    drag(vsep, 'x'); hsep && drag(hsep, 'y');
    App.pane = DocView;
    return wrap;
  },
  update(...args) { const { docs } = SplitView.parse(args); docs.forEach((id, i) => PANES[i].update(id)); $$('.panehead').forEach(x => x.remove()); docs.forEach((id, i) => { const el = $('.split > .pane.p' + i); el && el.append(PANES[i].paneHead(i)); }); },
  after() { App.panes().forEach(p => p.focusPending()); },
};
VIEWS.split = SplitView;
Object.assign(DocView, {
  paneHead(i) {
    const d = M.doc(this.docId); if (!d) return null; const docs = SplitView.parse(App.route.args).docs;
    const without = docs.filter((_, k) => k !== i), go = list => App.go(list.length > 1 ? SplitView.route(list) : '#/doc/' + list[0]);
    return h('div.panehead.nopan', typechip(d.type), h('b', d.title), h('span.s', M.docPath(d).replace(/ › [^›]*$/, '')),
      h('button.ib', { title: 'Open this note alone', on: { click: () => App.go('#/doc/' + d.id) } }, '⤢'),
      docs.length === 2 ? h('button.ib', { title: 'Swap sides', on: { click: () => go([docs[1], docs[0]]) } }, '⇄') : h('button.ib', { title: 'Move to the first pane', on: { click: () => go([d.id, ...without]) } }, '⇤'),
      h('button.ib', { title: 'Close this pane', on: { click: () => go(without) } }, '✕'));
  },
});
