/* ==========================================================================
   13l · The day, capture, chores, resurfacing, and the command palette.
   A thought at 10 pm has no component to attach to, so capture goes to the
   day note (one per date, global). Entries never move: filing one creates a
   new structure on the target component that points back at the entry. The
   day note is also the calendar surface: time, notes touched, open entries,
   chores due, and one old claim or question brought back.
   ========================================================================== */
const DAY = {
  idFor: date => 'day_' + date.replace(/-/g, ''),
  doc(date = localDate(new Date()), create = true) {
    const id = DAY.idFor(date); let d = M.doc(id);
    if (!d && create) {
      const now = isoLocal(new Date()), dt = new Date(date + 'T12:00');
      d = { id, type: 'day', scope: 'global', projectId: null, themeId: null, dayDate: date, title: dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), templateId: null, header: { tags: [] }, blockIds: [], synthesis: { text: '', marks: [] }, citeMode: settings().citeMode, layout: { head: { x: 0, y: 0 }, synth: null }, created: now, modified: now };
      DB.put('documents', d);
    }
    return d;
  },
  entries: d => M.liveBlocks(d.id).filter(b => b.kind === 'component' && b.status === 'live'),
  add(text, kind, date) {
    text = (text || '').trim(); if (!text) return null; const d = DAY.doc(date), n = DAY.entries(d).length;
    const b = M.addBlock(d.id, null, { label: fmtTime(new Date()), x: 0, y: 200 + n * 130 });
    const body = { text, marks: [] }; if (kind) { const it = M.createItem(kind, text, b); body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: text.length, ref: it.id }); }
    M.saveBlockBody(b, body); IX.rebuild(); changed(); return b;
  },
  /** Quick capture from anywhere (Ctrl+Shift+Space or ✎ in the header). */
  capture() {
    if ($('.ovl.capture')) return; let kind = null;
    const ta = h('textarea.inp.cap-in', { rows: 3, placeholder: 'What happened, what arrived, what you thought… it goes to today’s day note' });
    const kinds = h('div.row.cap-k'), drawK = () => kinds.replaceChildren(h('button.kpick' + (!kind ? '.on' : ''), { style: { '--kc': 'var(--ink-3)' }, on: { click: () => { kind = null; drawK(); ta.focus(); } } }, 'Entry'), ...['observation', 'idea', 'question', 'barrier', 'reminder', 'result'].map(k => h('button.kpick' + (kind === k ? '.on' : ''), { style: { '--kc': `var(--k-${k})` }, on: { click: () => { kind = k; drawK(); ta.focus(); } } }, KIND[k].label)));
    drawK();
    const recent = DAY.entries(DAY.doc(undefined, false) || { id: '_' }).slice(-4).reverse();
    const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); };
    const go = () => { const b = DAY.add(ta.value, kind); if (b) { toast('Captured in today’s day note'); close(); } };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } };
    const ov = h('div.ovl.capture', { on: { mousedown: e => { if (e.target === ov) close(); } } }, h('div.modal.cap', h('div.mh', h('h3', '✎ Capture'), h('span.tiny.muted', fmtDayLong(new Date()) + ' · ' + fmtTime(new Date())), h('span.spacer'), h('a.tiny', { on: { click: () => { close(); App.go('#/doc/' + DAY.doc().id); } } }, 'Today’s day note ↗')),
      h('div.mb', ta, kinds, recent.length ? h('div.cap-r', recent.map(b => h('div.tiny', h('span.mono.muted', b.label + ' '), snippet(b.body.text, 90)))) : null),
      h('div.mf', h('span.tiny.muted', { style: { marginRight: 'auto' } }, 'Ctrl+Enter to add · file it to a component later, or in the weekly review'), h('button.btn', { on: { click: close } }, 'Cancel'), h('button.btn.pri', { on: { click: go } }, 'Add'))));
    document.body.append(ov); document.addEventListener('keydown', key, true); setTimeout(() => ta.focus(), 20);
  },
  /** Filing never moves the entry: a new structure on the target points back to it. */
  file(b) {
    BINDS.pickComponent('File “' + snippet(b.body.text, 40) + '” to…', t => {
      const k = (IX.kindsOf(b)[0]) || 'observation';
      const it = M.createItem(k, b.body.text, t, { fromDay: { docId: b.docId, blockId: b.id, date: (M.doc(b.docId) || {}).dayDate } });
      b.filed = [...(b.filed || []), { itemId: it.id, blockId: t.id, at: isoLocal(new Date()) }]; const td = M.doc(t.docId); if (td && td.themeId && !b.themeId) b.themeId = td.themeId;
      DB.put('blocks', b); IX.rebuild(); changed(); toast('Filed — it now appears on “' + snippet(M.blockName(t), 30) + '”; the entry stays in its day');
    });
  },
  assign(b, themeId) { b.themeId = themeId || null; b.reviewedAt = isoLocal(new Date()); DB.put('blocks', b); changed(); },
  chips(b) {
    const out = [], d = M.doc(b.docId);
    if (d && d.type === 'day') {
      (b.filed || []).map(f => M.block(f.blockId)).filter(Boolean).forEach(t => out.push(h('button.dschip.from', { title: 'Filed to ' + M.docPath(M.doc(t.docId)), on: { click: e => { e.stopPropagation(); App.jump(t.id, e); } } }, '→ ', snippet(M.blockName(t), 26))));
      if (b.themeId && M.theme(b.themeId)) out.push(h('span.dschip.code', '◎ ' + M.theme(b.themeId).name));
    }
    IX.itemsOriginatingIn(b.id).filter(i => i.fromDay).forEach(i => out.push(h('button.dschip.day', { title: '“' + snippet(i.text, 120) + '” — captured ' + (i.fromDay.date || '') + ' · click: the day entry', on: { click: e => { e.stopPropagation(); App.jump(i.fromDay.blockId, e); } } }, kchip(i.kind), ' 📅 ', fmtDay((i.fromDay.date || localDate(i.created)) + 'T12:00'), ' · ', snippet(i.text, 30))));
    return out;
  },
  /** The calendar surface on a day note's header box. */
  head(d) {
    const date = d.dayDate, sess = DB.all('sessions').filter(s => (s.segments || []).some(g => localDate(g.s) === date) || s.localDate === date);
    const touched = DB.where('documents', x => x.type !== 'day' && (localDate(x.modified) === date || localDate(x.created) === date));
    const open = DB.where('sessions', s => s.state === 'open' || s.state === 'running' || s.state === 'paused');
    const total = sum(sess.map(s => TIMER.elapsed(s)));
    return h('div.hfoot.dayh',
      h('div.dh-row', h('span.lab', 'Capture'), h('input.inp.dh-cap', { placeholder: 'Add an entry… (Enter)', on: { keydown: e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.value.trim()) { DAY.add(e.target.value, null, date); e.target.value = ''; } } } })),
      h('div.dh-row', h('span.lab', 'Time'), sess.length ? h('span', fmtDur(total) + ' · ', sess.map(s => h('a.dh-l', { on: { click: e => App.jump(s.docId, e, true) } }, (M.doc(s.docId) || {}).title || '—', ' ', h('span.muted', fmtDur(TIMER.elapsed(s)))))) : h('span.muted', 'nothing timed')),
      touched.length ? h('div.dh-row', h('span.lab', 'Notes'), touched.slice(0, 12).map(x => h('a.dh-l', { on: { click: e => App.jump(x.id, e, true) } }, typechip(x.type), ' ', snippet(x.title, 30)))) : null,
      (() => { const rs = REM.open(new Date(date + 'T00:00')).filter(x => localDate(x.at) === date); return rs.length ? h('div.dh-row', h('span.lab', 'Due · meetings'), rs.map(x => h('a.dh-l' + (x.r.kind === 'deadline' ? '.warn' : ''), { on: { click: () => REM.edit({ id: x.r.id }) } }, REMKIND[x.r.kind].icon + ' ' + (x.r.allDay ? '' : fmtTime(x.at) + ' ') + x.r.title))) : null; })(),
      open.length ? h('div.dh-row', h('span.lab', 'Open'), open.map(s => h('a.dh-l.warn', { on: { click: e => App.jump(s.docId, e, true) } }, (M.doc(s.docId) || {}).title + ' · ' + s.state))) : null,
      CHORES.dayRow(date), date === localDate(new Date()) ? RESURF.card(true) : null);
  },
  /** Weekly review: the week's entries, to assign to a theme or file to a component. */
  reviewSection(w, locked) {
    const from = +w.start, to = +addDays(w.start, 7);
    const rows = DB.where('blocks', b => b.status === 'live' && b.kind === 'component' && (M.doc(b.docId) || {}).type === 'day' && +new Date(b.created) >= from && +new Date(b.created) < to).sort((a, b) => a.created.localeCompare(b.created));
    const todo = rows.filter(b => !b.themeId && !(b.filed || []).length && !b.reviewedAt);
    const themes = DB.where('themes', t => t.status === 'active');
    const row = b => h('div.li', IX.kindsOf(b)[0] ? kchip(IX.kindsOf(b)[0]) : h('span.pill', 'entry'), h('span.t.click', { on: { click: e => App.jump(b.id, e) } }, h('span.serif', snippet(b.body.text, 120)), h('span.s', fmtDay(b.created) + ' ' + fmtTime(b.created) + ((b.filed || []).length ? ' · filed to ' + b.filed.map(f => M.blockName(M.block(f.blockId) || {})).join(', ') : ''))),
      locked ? (b.themeId ? h('span.pill', (M.theme(b.themeId) || {}).name) : null) : h('span.row', { style: { gap: '4px', flexWrap: 'nowrap' } },
        h('select.inp.sm', { title: 'Assign to a theme', on: { change: e => DAY.assign(b, e.target.value) } }, h('option', { value: '' }, b.themeId ? '— no theme' : 'Theme…'), themes.map(t => h('option', { value: t.id, selected: b.themeId === t.id }, t.name))),
        h('button.btn.xs', { on: { click: () => DAY.file(b) } }, 'File…'), !b.themeId && !(b.filed || []).length && !b.reviewedAt ? h('button.btn.xs.ghost', { title: 'Leave it in its day', on: { click: () => { b.reviewedAt = isoLocal(new Date()); DB.put('blocks', b); changed(); } } }, 'Leave') : null));
    return { todo: todo.length, el: rows.length ? [h('div.lab', `Day entries · ${rows.length}${todo.length ? ` · ${todo.length} to place` : ''}`), capped(rows.sort((a, b) => (!a.themeId && !(a.filed || []).length) - (!b.themeId && !(b.filed || []).length) || 0).reverse(), 6, row, ''), CHORES.weekEl(w)] : [CHORES.weekEl(w)] };
  },
};

/* ---------------- recurring chores: surfaced, never a task list ---------------- */
const CHORES = {
  all: () => DB.where('chores', c => c.active !== false),
  lastDone: (c, before) => (c.done || []).filter(x => !before || x <= before).sort().slice(-1)[0] || null,
  /** 'due' | 'overdue' | 'done' | null for a date */
  stateOn(c, date) {
    if ((c.done || []).includes(date)) return 'done'; if (date < (c.start || '0000')) return null;
    if (c.mode === 'weekdays') return (c.days || []).includes(new Date(date + 'T12:00').getDay()) ? 'due' : null;
    const last = CHORES.lastDone(c, date) || c.start, gap = Math.round((+new Date(date + 'T12:00') - +new Date(last + 'T12:00')) / 864e5);
    return gap >= (c.every || 1) ? (gap > (c.every || 1) && CHORES.lastDone(c, date) ? 'overdue' : 'due') : null;
  },
  tick(c, date) { c.done = (c.done || []).includes(date) ? c.done.filter(x => x !== date) : [...(c.done || []), date]; DB.put('chores', c); changed(); },
  dayRow(date) {
    const list = CHORES.all().map(c => ({ c, st: CHORES.stateOn(c, date) })).filter(x => x.st);
    return h('div.dh-row', h('span.lab', 'Chores'), list.length ? list.map(({ c, st }) => h('button.chore.' + st, { title: st === 'overdue' ? 'Overdue — last done ' + (CHORES.lastDone(c) || 'never') : 'Mark done', on: { click: () => CHORES.tick(c, date) } }, st === 'done' ? '✓ ' : '○ ', c.title)) : h('span.muted', 'none due'), h('button.btn.xs.ghost', { on: { click: () => CHORES.manage() } }, 'Chores…'));
  },
  weekEl(w) {
    const list = CHORES.all(); if (!list.length) return null; const days = [...Array(7)].map((_, i) => localDate(addDays(w.start, i)));
    return h('div', h('div.lab', 'Chores this week'), h('div.list', list.map(c => { const due = days.filter(d2 => CHORES.stateOn(c, d2) && d2 <= localDate(new Date())).length, done = days.filter(d2 => (c.done || []).includes(d2)).length;
      return h('div.li', h('span.t', c.title, h('span.s', c.mode === 'weekdays' ? 'on ' + (c.days || []).map(x => 'SMTWTFS'[x]).join(' ') : 'every ' + plural(c.every, 'day'))), h('span.mono.tiny', `${done} done${due > done ? ' · ' + (due - done) + ' missed' : ''}`)); })));
  },
  manage() {
    const host = h('div'), draw = () => host.replaceChildren(h('div.list', CHORES.all().map(c => h('div.li', h('span.t', c.title, h('span.s', (c.mode === 'weekdays' ? 'on ' + (c.days || []).map(x => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x]).join(', ') : 'every ' + plural(c.every, 'day') + ' after it was last done') + ' · last ' + (CHORES.lastDone(c) || 'never'))),
      h('button.btn.xs.ghost', { on: { click: () => { c.active = false; DB.put('chores', c); draw(); changed(); } } }, 'Stop')))), h('div.empty.tiny', CHORES.all().length ? '' : 'No chores yet.'));
    const title = h('input.inp', { placeholder: 'e.g. Passage MDCK, media change' }), mode = h('select.inp', h('option', { value: 'interval' }, 'every N days after last done'), h('option', { value: 'weekdays' }, 'on weekdays')), every = h('input.inp', { type: 'number', min: 1, value: 3, style: { width: '80px' } });
    const wd = h('div.row', ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => h('label.tiny', h('input', { type: 'checkbox', value: i }), x)));
    draw();
    modal({ title: 'Recurring chores', body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Chores show up in the day note and in the weekly review — they never become a task list.'), host,
      h('div.lab', 'Add'), h('div.row', title, mode, every), wd), actions: [{ label: 'Close' }, { label: 'Add chore', pri: true, run: () => { if (!title.value.trim()) return false;
        DB.put('chores', { id: uid('ch'), title: title.value.trim(), mode: mode.value, every: +every.value || 1, days: $$('input:checked', wd).map(i => +i.value), start: localDate(new Date()), done: [], active: true, created: isoLocal(new Date()) }); changed(); toast('Chore added'); } }] });
  },
};

/* ---------------- one old claim or question, every day ---------------- */
const RESURF = {
  pick(date = localDate(new Date()), skip) {
    const s = settings(); if (!skip && s.resurface && s.resurface.date === date && M.item(s.resurface.id)) return M.item(s.resurface.id);
    const seen = s.resurfaced || {}, cut = Date.now() - 14 * 864e5;
    const pool = DB.where('items', i => (i.kind === 'claim' || i.kind === 'question') && !i.correctedBy && IX.status(i) !== 'closed' && i.stance !== 'abandoned' && +new Date(i.created) < cut && i.id !== (skip || ''));
    if (!pool.length) return null;
    const hsh = x => { let v = 0; for (const c of x) v = (v * 31 + c.charCodeAt(0)) >>> 0; return v; };
    pool.sort((a, b) => (seen[a.id] || '').localeCompare(seen[b.id] || '') || hsh(date + a.id) - hsh(date + b.id));
    const it = pool[0]; saveSettings({ resurface: { date, id: it.id }, resurfaced: Object.assign({}, seen, { [it.id]: date }) }); return it;
  },
  card(compact) {
    const it = RESURF.pick(); if (!it) return null; const age = Math.floor((Date.now() - +new Date(it.created)) / 864e5), d = M.doc(it.originDocId);
    const act = (label, fn, title) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(); } } }, label);
    return h('div.resurf' + (compact ? '.compact' : ''), { style: { '--kc': `var(--k-${it.kind})` } }, h('div.row', h('span.lab', 'Resurfaced'), kchip(it.kind), h('span.tiny.muted', `${age} days ago · ${d ? d.title : ''}`)),
      h('div.serif.rs-t', { on: { click: () => App.openBlock(it.originBlockId) } }, it.text),
      h('div.row', { style: { gap: '4px' } }, act(it.kind === 'question' ? 'Still open' : 'Still holds', () => { toast('Noted — it will come back later'); RESURF.pick(undefined, it.id); changed(); }),
        act('Explore lane', () => { if (!M.flagFor('item', it.id)) M.toggleFlag('item', it.id); const f = M.flagFor('item', it.id); if (f) { f.reason = 'Explore — resurfaced ' + fmtDay(new Date()); DB.put('flags', f); } toast('Flagged for the review’s Explore lane'); }, 'Flag it for the weekly review'),
        it.kind === 'question' ? act('Answered', () => { M.closeItem(it); toast('Closed'); }) : act('Contest', () => M.setItem(it, { stance: 'contested' })),
        act('Another', () => { RESURF.pick(undefined, it.id); changed(); })));
  },
};

/* ---------------- command palette (Ctrl+P) and quick switcher (Ctrl+O) ---------------- */
const PAL = {
  commands() {
    const pane = App.panes && App.panes()[0], d = pane && M.doc(pane.docId), go = r => () => App.go(r);
    return [
      ...TABS.map(([k, l]) => ({ g: 'Go to', label: l, run: go('#/' + k) })),
      { g: 'Go to', label: 'Today’s day note', key: '', run: () => App.go('#/doc/' + DAY.doc().id) },
      { g: 'Create', label: 'Capture to today', key: 'Ctrl+Shift+Space', run: () => DAY.capture() },
      { g: 'Create', label: 'New note', key: 'Ctrl+Alt+N', run: () => App.newDoc() }, { g: 'Create', label: 'New experiment', run: () => CHAIN.start() },
      { g: 'Create', label: 'New material', run: () => App.newDoc({ type: 'resource' }) },
      ...(d ? INSERTS.filter(x => !x.when || x.when(d)).map(x => ({ g: 'Insert into this note', label: typeof x.label === 'function' ? x.label(d) : x.label, run: () => { const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); x.run(d, { x: Math.round((c.x - 200) / 14) * 14, y: Math.round((c.y - 140) / 14) * 14 }, pane); } })) : []),
      d ? { g: 'This note', label: 'Calculator', run: () => CALC.open(pane) } : null, d ? { g: 'This note', label: 'Fit to screen', key: 'Ctrl+0', run: () => pane.paper.fit(pane.bbox()) } : null,
      d ? { g: 'This note', label: 'Export canvas (HTML)', run: () => Exporter.doc(d.id) } : null, d ? { g: 'This note', label: 'Flag this note for review', run: () => M.toggleFlag('doc', d.id) } : null,
      { g: 'Tools', label: 'Search', key: 'Ctrl+K', run: () => Search.open() }, { g: 'Tools', label: 'Quick switcher', key: 'Ctrl+O', run: () => PAL.switcher() },
      { g: 'Create', label: 'New deadline', run: () => REM.edit({ kind: 'deadline' }) }, { g: 'Create', label: 'New meeting', run: () => REM.edit({ kind: 'meeting' }) }, { g: 'Go to', label: 'Reminders', run: () => App.go('#/reminders') },
      { g: 'Tools', label: 'Recurring chores…', run: () => CHORES.manage() }, { g: 'Tools', label: 'Rescan data folders', run: () => DATA.rescanAll() },
      { g: 'Tools', label: (settings().labs || {}).canvas ? 'Turn off spatial canvases (lab)' : 'Turn on spatial canvases (lab)', run: () => CANVAS.toggleLab() },
      { g: 'Tools', label: 'Toggle light / dark', run: () => $('#themetoggle').click() }, { g: 'Tools', label: 'Focus mode', key: 'Ctrl+.', run: () => App.toggleFocus() },
      { g: 'Tools', label: 'Export everything (JSON)', run: () => Exporter.json() }, window.SIS_TARGET === 'web' ? null : { g: 'Tools', label: 'Export for the lab website', run: () => LABX.export() }, { g: 'Tools', label: 'Undo', key: 'Ctrl+Z', run: () => App.undo() },
    ].filter(Boolean);
  },
  fuzzy(q, s) { q = q.toLowerCase(); s = String(s).toLowerCase(); if (!q) return 1; if (s.includes(q)) return 100 - s.indexOf(q); let i = 0, score = 0, run = 0; for (const c of s) { if (c === q[i]) { i++; run++; score += run; } else run = 0; if (i === q.length) return score; } return 0; },
  overlay(title, picker) {
    if ($('.ovl.palette')) return; const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); }, key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    const ov = h('div.ovl.palette', { on: { mousedown: e => { if (e.target === ov) close(); } } }, h('div.modal.pal', h('div.mb', h('div.pal-t', title), picker(close))));
    document.body.append(ov); document.addEventListener('keydown', key, true);
  },
  open() {
    PAL.overlay('Commands', close => optionPicker({ placeholder: 'Type a command…', sort: 'palette', limit: 60,
      items: q => PAL.commands().map(c => ({ c, s: PAL.fuzzy(q, c.label + ' ' + c.g) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.c),
      section: c => c.g, render: c => h('div.pal-r', h('span', c.label), c.key ? h('kbd', c.key) : null), onPick: c => { close(); c.run(); } }));
  },
  switcher() {
    PAL.overlay('Open a note', close => optionPicker({ placeholder: 'Note title, theme or project…', sort: 'switcher', limit: 60,
      items: q => DB.where('documents', d => !d.archived).map(d => ({ d, s: PAL.fuzzy(q, d.title + ' ' + M.docPath(d)) + (q ? 0 : 0) })).filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s || b.d.modified.localeCompare(a.d.modified)).map(x => x.d),
      render: d => h('div.pal-r', typechip(d.type), ' ', h('b', d.title), h('span.s', M.docPath(d) + ' · ' + fmtWhen(d.modified))), onPick: (d, e) => { close(); App.jump(d.id, e, true); } }));
  },
};
