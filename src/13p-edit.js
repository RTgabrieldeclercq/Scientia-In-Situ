/* ==========================================================================
   13p · Editing freely. Notes and components can be edited or deleted;
   a note's details (title, type, project, theme, date) are one dialog away;
   stamps and time entries move to any date. A note can be dated in the past
   (a past experiment): its new components are stamped on that day.
   Every deletion is one undo step (Ctrl+Z), and with a notebook folder a
   copy of the record is kept first.
   ========================================================================== */
const EDIT = {
  today: () => localDate(new Date()),
  /** The moment a new component in this note is stamped at: now, or now's clock time on the note's day. */
  stampAt(d) {
    const now = new Date(); if (!d || !d.backdate || d.backdate === EDIT.today()) return now;
    const [y, m, dd] = d.backdate.split('-').map(Number); return new Date(y, m - 1, dd, now.getHours(), now.getMinutes(), now.getSeconds());
  },
  atOn(dateStr, base = new Date()) { const [y, m, dd] = String(dateStr).split('-').map(Number); return new Date(y, m - 1, dd, base.getHours(), base.getMinutes(), base.getSeconds()); },
  locks: () => !!settings().lockAfterDay,

  /* ---------------- deleting ---------------- */
  /** Everything a component deletion takes with it. */
  footprint(ids) {
    const set = new Set(ids), lineage = [];
    // earlier wordings that only lead to what is being deleted go too
    let grew = true; while (grew) { grew = false; for (const id of [...set]) { const b = M.block(id); (b && b.supersedes || []).forEach(a => { const ab = M.block(a); if (ab && !set.has(a) && (ab.supersededBy || []).every(x => set.has(x))) { set.add(a); lineage.push(a); grew = true; } }); } }
    const items = DB.where('items', it => set.has(it.originBlockId)), itemIds = new Set(items.map(i => i.id));
    const wires = DB.where('wires', w => set.has(w.from) || set.has(w.to));
    const refs = DB.where('blocks', b => b.kind === 'ref' && !set.has(b.id) && (set.has(b.refBlockId) || itemIds.has(b.refItemId)));
    return { set, items, itemIds, wires, refs, lineage };
  },
  /** Protocols that runs still follow can't go before their runs. */
  blocker(ids) {
    for (const id of ids) { const b = M.block(id); if (b && b.kind === 'protocol') { const runs = DB.where('blocks', r => r.kind === 'run' && r.protocolId === b.id && r.status !== 'removed' && !ids.includes(r.id)); if (runs.length) return `“${b.label || 'Protocol'}” is followed by ${plural(runs.length, 'run')} — delete those runs (or their notes) first`; } }
    return null;
  },
  purge(fp) {
    const { set, items, itemIds, wires, refs } = fp;
    wires.forEach(w => DB.del('wires', w.id));
    refs.forEach(r => { let d = M.doc(r.docId); if (d) { d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== r.id) }); DB.put('documents', d); } DB.del('blocks', r.id); });
    items.forEach(it => DB.del('items', it.id));
    // other text that pointed at what is going: structure marks drop, links become open links with the old name
    DB.all('blocks').forEach(b => { if (set.has(b.id) || !b.body || !(b.body.marks || []).length) return; let ch = false;
      const marks = b.body.marks.filter(m => { if (m.type === 'struct' && itemIds.has(m.ref)) { ch = true; return false; } return true; }).map(m => { if (m.type === 'link' && set.has(m.ref)) { ch = true; return Object.assign({}, m, { ref: null, title: m.title || M.blockName(M.block(m.ref)) }); } return m; });
      const B = b.binds; if (B && (B.from || []).some(x => set.has(x))) { B.from = B.from.filter(x => !set.has(x)); ch = true; }
      if (ch) { b.body = Object.assign({}, b.body, { marks }); DB.put('blocks', b); } });
    DB.where('items', it => itemIds.has(it.resolves) || itemIds.has(it.correctedBy) || itemIds.has(it.corrects)).forEach(it => { ['resolves', 'correctedBy', 'corrects'].forEach(k => { if (itemIds.has(it[k])) it[k] = null; }); DB.put('items', it); });
    DB.where('flags', f => (f.targetType === 'block' && set.has(f.targetId)) || (f.targetType === 'item' && itemIds.has(f.targetId))).forEach(f => DB.del('flags', f.id));
    DB.where('datasets', x => set.has(x.producedBy)).forEach(x => { x.producedBy = null; DB.put('datasets', x); });
    DB.all('canvases').forEach(c => { const n0 = c.nodes.length; c.nodes = c.nodes.filter(n => !(n.ref && ((n.ref.type === 'block' && set.has(n.ref.id)) || (n.ref.type === 'item' && itemIds.has(n.ref.id))))); if (c.nodes.length !== n0) { const keep = new Set(c.nodes.map(n => n.id)); c.edges = (c.edges || []).filter(e => keep.has(e.from) && keep.has(e.to)); DB.put('canvases', c); } });
    for (const id of set) { const b = M.block(id); if (!b) continue; let d = M.doc(b.docId); if (d) { d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== id) }); DB.put('documents', d); } DB.del('blocks', id); }
  },
  deleteBlocks(ids, { quiet } = {}) {
    const why = EDIT.blocker(ids); if (why) { toast(why, 5000); return false; }
    DB.beginGroup(); const fp = EDIT.footprint(ids); EDIT.purge(fp); DB.beginGroup(); IX.rebuild(); changed();
    if (!quiet) toast('Deleted — Ctrl+Z (outside a text box) brings it back', 4000); return true;
  },
  /** Ask, saying what goes with it, then delete one component. */
  confirmBlock(b) {
    const fp = EDIT.footprint([b.id]), bits = [fp.items.length ? plural(fp.items.length, 'structure') : null, fp.wires.length ? plural(fp.wires.length, 'connection') : null, fp.lineage.length ? plural(fp.lineage.length, 'earlier wording') : null, fp.refs.length ? plural(fp.refs.length, 'pulled-in copy', 'pulled-in copies') + ' in other notes' : null].filter(Boolean);
    if (!bits.length && !(b.body.text || '').trim() && b.kind === 'component') return EDIT.deleteBlocks([b.id], { quiet: true });
    pickModal('Delete “' + snippet(M.blockName(b), 50) + '”?', bits.length ? 'Also removed: ' + bits.join(', ') + '. Ctrl+Z undoes it.' : 'Ctrl+Z undoes it.', [{ label: 'Delete component', danger: true, run: async () => { if (DISK.on) await DISK.keep('before-delete-component'); EDIT.deleteBlocks([b.id]); } }]);
  },
  deleteDoc(d) {
    const ids = DB.where('blocks', b => b.docId === d.id).map(b => b.id), why = EDIT.blocker(ids); if (why) { toast(why, 5000); return false; }
    DB.beginGroup(); EDIT.purge(EDIT.footprint(ids));
    DB.where('sessions', s => s.docId === d.id).forEach(s => DB.del('sessions', s.id));
    DB.where('flags', f => f.targetType === 'doc' && f.targetId === d.id).forEach(f => DB.del('flags', f.id));
    DB.all('blocks').forEach(b => { if (!(b.body && b.body.marks || []).some(m => m.type === 'link' && m.ref === d.id)) return; b.body = Object.assign({}, b.body, { marks: b.body.marks.map(m => m.type === 'link' && m.ref === d.id ? Object.assign({}, m, { ref: null, title: m.title || d.title }) : m) }); DB.put('blocks', b); });
    DB.where('documents', x => x.id !== d.id && ((x.materials || []).includes(d.id) || (x.supersedes || []).includes(d.id) || (x.supersededBy || []).includes(d.id))).forEach(x => { ['materials', 'supersedes', 'supersededBy'].forEach(k => { if (x[k]) x[k] = x[k].filter(y => y !== d.id); }); DB.put('documents', x); });
    DB.where('blocks', b => b.binds && (b.binds.resources || []).includes(d.id)).forEach(b => { b.binds.resources = b.binds.resources.filter(x => x !== d.id); DB.put('blocks', b); });
    DB.del('documents', d.id); DB.beginGroup(); IX.rebuild(); changed(); return true;
  },
  confirmDoc(d) {
    const n = M.liveBlocks(d.id).filter(b => b.status !== 'removed').length, its = DB.where('items', it => it.originDocId === d.id).length, ses = DB.where('sessions', s => s.docId === d.id).length;
    const m = modal({ title: 'Delete “' + d.title + '”?', body: h('div', h('p.serif', { style: { marginTop: 0 } }, `This removes the note with its ${plural(n, 'component')}${its ? ', ' + plural(its, 'structure') : ''}${ses ? ' and ' + plural(ses, 'time entry', 'time entries') : ''}. Links to it from other notes become open links.`),
      h('p.tiny.muted', 'Ctrl+Z (outside a text box) undoes it in this session. With a notebook folder, a copy of everything is kept in .scientia/kept first.')),
      actions: [{ label: 'Cancel' }, { label: 'Delete note', danger: true, pri: true, run: async () => { if (DISK.on) await DISK.keep('before-delete-note'); if (EDIT.deleteDoc(d)) { App.go('#/portfolio'); toast('Note deleted — Ctrl+Z brings it back', 4000); } } }] });
  },

  /* ---------------- a note's details ---------------- */
  noteDialog(d) {
    const p0 = prof(d.type), projects = DB.all('projects');
    const title = h('input.inp', { value: d.title });
    const typ = h('select.inp', userProfiles().map(p => h('option', { value: p.type, selected: p.type === d.type }, p.label)));
    const proj = h('select.inp', h('option', { value: '' }, '— none —'), projects.map(p => h('option', { value: p.id, selected: p.id === d.projectId }, p.name)));
    const th = h('select.inp'); const fillThemes = () => th.replaceChildren(h('option', { value: '' }, '— none —'), ...DB.where('themes', t => t.projectId === proj.value).map(t => h('option', { value: t.id, selected: t.id === d.themeId }, t.name + (t.status !== 'active' ? ' (' + t.status + ')' : ''))));
    proj.onchange = fillThemes; fillThemes();
    const date = h('input.inp.mono', { type: 'date', value: localDate(d.created) }), time = h('input.inp.mono', { type: 'time', value: fmtTime(d.created) });
    const shift = h('input', { type: 'checkbox', checked: true }), back = h('input', { type: 'checkbox', checked: !!d.backdate });
    const sync = () => { if (date.value !== EDIT.today()) back.checked = true; };
    date.addEventListener('change', sync);
    modal({ title: 'Note details', wide: true, body: h('div',
      h('label.f', h('span', 'Title'), title),
      h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', 'Type'), typ), h('label.f', h('span', 'Project'), proj), h('label.f', h('span', 'Theme'), th),
        h('label.f', h('span', 'Date of the note'), h('div.row', { style: { gap: '6px', flexWrap: 'nowrap' } }, date, time))),
      h('label.row', { style: { marginTop: '12px', gap: '8px', alignItems: 'flex-start' } }, shift, h('span', h('b', 'Move the components with it'), h('div.tiny.muted', 'Changing the date shifts every component’s stamp by the same amount, so a past experiment lands on its day.'))),
      h('label.row', { style: { marginTop: '8px', gap: '8px', alignItems: 'flex-start' } }, back, h('span', h('b', 'Entered after the fact'), h('div.tiny.muted', 'New components in this note are stamped on the note’s day (at the current clock time), not today. Move any stamp afterwards.')))),
      actions: [{ label: 'Delete note…', danger: true, run: () => setTimeout(() => EDIT.confirmDoc(d), 50) }, { label: 'Cancel' }, { label: 'Save', pri: true, run: () => {
        DB.beginGroup();
        const t = title.value.trim(); if (t) d.title = t;
        if (typ.value !== d.type) { const np = prof(typ.value); d.type = np.type; d.scope = np.scope; }
        d.projectId = proj.value || null; d.themeId = prof(d.type).scope === 'theme' ? th.value || null : null;
        if (date.value) { const [hh, mm] = (time.value || '09:00').split(':').map(Number), [y, mo, dd] = date.value.split('-').map(Number), at = new Date(y, mo - 1, dd, hh, mm), delta = +at - +new Date(d.created);
          if (delta && shift.checked) EDIT.shiftDoc(d, delta);
          d.created = isoLocal(at); }
        d.backdate = back.checked && date.value !== EDIT.today() ? date.value : null;
        DB.where('sessions', s => s.docId === d.id).forEach(s => { s.projectId = d.projectId; s.themeId = d.themeId; DB.put('sessions', s); });
        M.touchDoc(d); changed(); toast('Note updated'); } }] });
    setTimeout(() => title.focus(), 30);
  },
  /** Move every component's time by delta (ms). Time entries stay where they are — edit them under Time entries. */
  shiftDoc(d, delta) {
    DB.where('blocks', b => b.docId === d.id).forEach(b => { const mv = iso => iso ? isoLocal(new Date(+new Date(iso) + delta)) : iso;
      b.created = mv(b.created); if (b.stamp) { b.stamp.at = mv(b.stamp.at); b.stamp.from = mv(b.stamp.from); b.stamp.to = mv(b.stamp.to); if (Math.abs(delta) > 12 * 36e5) { b.stamp.sessionId = null; b.stamp.offsetMs = null; } } DB.put('blocks', b); });
    DB.where('items', it => it.originDocId === d.id).forEach(it => { it.created = isoLocal(new Date(+new Date(it.created) + delta)); DB.put('items', it); });
  },

  /* ---------------- time entries ---------------- */
  timeDialog(d) {
    const host = h('div');
    const draw = () => {
      const list = DB.where('sessions', s => s.docId === d.id).sort((a, b) => (EDIT.sStart(a) || '').localeCompare(EDIT.sStart(b) || ''));
      host.replaceChildren(list.length ? h('div.tlist', list.map(s => EDIT.timeRow(s, draw))) : h('div.empty', 'No time recorded on this note yet.'),
        h('div.row', { style: { marginTop: '10px' } }, h('button.btn.sm', { on: { click: () => DocView.logTime(d) } }, '+ Log time…')));
    };
    draw(); modal({ title: 'Time entries · ' + d.title, wide: true, body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Change when an entry started and ended, its duration and day, or delete it. Pauses inside a timed entry are kept; changing the start or end moves the first or last stretch.'), host), actions: [{ label: 'Done', pri: true }] });
  },
  sStart: s => s.entry === 'duration' ? s.localDate + 'T00:00' : (s.segments && s.segments[0] && s.segments[0].s) || s.startedAt || s.created,
  timeRow(s, redraw) {
    const del = h('button.btn.xs.ghost', { title: 'Delete this entry', on: { click: () => { if (s.state === 'running' || s.state === 'paused') return toast('Stop the timer first'); DB.del('sessions', s.id); changed(); redraw(); toast('Entry deleted — Ctrl+Z undoes it'); } } }, 'Delete');
    if (s.entry === 'duration') {
      const dur = h('input.inp.mono.sm', { value: fmtDur(s.seconds * 1000).replace(/\s/g, ''), style: { width: '90px' } }), day = h('input.inp.mono.sm', { type: 'date', value: s.localDate });
      return h('div.trow', h('span.pill', 'duration'), day, dur, h('input.inp.sm', { value: s.note || '', placeholder: 'note', on: { change: e => { s.note = e.target.value; DB.put('sessions', s); } } }),
        h('button.btn.xs', { on: { click: () => { const sec = parseDuration(dur.value); if (!sec) return toast('Could not read that duration'); s.seconds = sec; s.localDate = day.value; DB.put('sessions', s); changed(); toast('Saved'); redraw(); } } }, 'Save'), del);
    }
    const segs = s.segments || [], first = segs[0], last = segs[segs.length - 1];
    const st = h('input.inp.mono.sm', { type: 'datetime-local', value: first ? toInputDT(first.s) : toInputDT(s.startedAt || '') }), en = h('input.inp.mono.sm', { type: 'datetime-local', value: last && last.e ? toInputDT(last.e) : toInputDT(s.endedAt || '') });
    const live = s.state === 'running' || s.state === 'paused';
    return h('div.trow', h('span.pill' + (live ? '.teal' : ''), s.entry === 'timer' ? (live ? 'timer · ' + s.state : 'timer') : 'start / end'), st, h('span.muted', '→'), en,
      h('span.tiny.muted', segs.length > 1 ? plural(segs.length - 1, 'pause') : ''), h('span.mono.tiny', fmtDur(TIMER.elapsed(s))),
      live ? null : h('button.btn.xs', { on: { click: () => {
        const a = st.value ? isoLocal(new Date(st.value)) : null, z = en.value ? isoLocal(new Date(en.value)) : null; if (a && z && z < a) return toast('The end is before the start');
        if (!s.segments || !s.segments.length) s.segments = [{ s: a, e: z }]; else { if (a) s.segments[0].s = a; if (z) s.segments[s.segments.length - 1].e = z; }
        if (s.entry === 'endpoints') { s.startedAt = a; s.endedAt = z; s.state = a && z ? 'complete' : 'open'; }
        s.seconds = Math.round(TIMER.elapsed(s) / 1000); DB.put('sessions', s); changed(); toast('Saved'); redraw(); } } }, 'Save'), del);
  },
};

/* ---------------- hooks into the model ---------------- */
{
  const newBlock = M._newBlock;
  M._newBlock = function (d, init, afterId) {
    const b = newBlock.call(M, d, init, afterId);
    if (d && d.backdate && d.backdate !== EDIT.today() && !(init && init.created)) { const at = EDIT.stampAt(d); b.created = isoLocal(at); b.modified = isoLocal(new Date()); b.stamp = M.stampFor(d.id, at); if (TIMER.runningFor(d.id) == null) { b.stamp.sessionId = null; b.stamp.offsetMs = null; } DB.put('blocks', b); }
    return b;
  };
  const isLocked = M.isLocked;
  M.isLocked = b => EDIT.locks() && isLocked.call(M, b);
  const correct = M.correctItem; M.correctItem = (it, text) => { if (!EDIT.locks()) { M.setItem(it, { text }); return it; } return correct.call(M, it, text); };
  /** Stamps move to any date; a stamp moved far from its timer leaves the timer. */
  M.setStamp = (b, dt) => { if (!dt) return false; const t = new Date(dt); if (isNaN(+t)) return false; const old = +new Date(b.stamp.at);
    b.stamp.at = isoLocal(t); if (Math.abs(+t - old) > 12 * 36e5) { b.stamp.sessionId = null; b.stamp.offsetMs = null; } DB.put('blocks', b); changed(); return true; };
}
