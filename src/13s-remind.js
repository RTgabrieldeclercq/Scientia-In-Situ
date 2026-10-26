/* ==========================================================================
   13s · Reminders: deadlines, meetings and plain reminders. Each has a time
   (a deadline can be all-day), an optional end and place for meetings, an
   alert ahead of time, an optional weekly / monthly repeat, and can belong
   to a project, a theme or a note. They show under 🔔 in the header, on
   Today ("Coming up"), in live views (source: Reminders) and in the day
   note; alerts pop up inside the app (and as a system notification if you
   allow it). A meeting can open its own meeting note.
   ========================================================================== */
const REMKIND = { deadline: { icon: '⚑', label: 'Deadline', lead: 1440 }, meeting: { icon: '◷', label: 'Meeting', lead: 15 }, reminder: { icon: '◔', label: 'Reminder', lead: 0 } };
const REM = {
  all: () => DB.all('reminders'),
  /** The next occurrence at or after `from` (repeats roll forward). */
  when(r, from) {
    let t = new Date(r.at); if (!r.repeat || r.repeat === 'none') return t;
    const step = d => { const n = new Date(d); if (r.repeat === 'daily') n.setDate(n.getDate() + 1); else if (r.repeat === 'weekly') n.setDate(n.getDate() + 7); else if (r.repeat === 'monthly') n.setMonth(n.getMonth() + 1); return n; };
    const span = r.end ? +new Date(r.end) - +new Date(r.at) : 0; let guard = 0;
    const skip = r.skip || []; while ((+t + span < +from || skip.includes(localDate(t))) && guard++ < 2000) t = step(t);
    return t;
  },
  /** Open items with their next time, soonest first. Done one-offs drop out. */
  open(now = new Date()) {
    return REM.all().filter(r => !r.done).map(r => { const at = REM.when(r, r.repeat && r.repeat !== 'none' ? new Date(+now - 864e5) : new Date(0)); return { r, at, end: r.end ? new Date(+at + (+new Date(r.end) - +new Date(r.at))) : null }; })
      .filter(x => !(x.r.skip || []).includes(localDate(x.at))).sort((a, b) => a.at - b.at);
  },
  bucket(x, now = new Date()) { const day = localDate(x.at), today = localDate(now); if ((x.end || x.at) < now && !(x.r.allDay && day === today)) return 'Overdue'; if (day === today) return 'Today'; if (day === localDate(addDays(now, 1))) return 'Tomorrow'; if (+x.at - +now < 7 * 864e5) return 'This week'; return 'Later'; },
  due(now = new Date()) { return REM.open(now).filter(x => +x.at - +now < 864e5); },
  fmtAt(x) { const d = fmtDay(x.at); return x.r.allDay ? d + ' · all day' : d + ' ' + fmtTime(x.at) + (x.end ? '–' + fmtTime(x.end) : ''); },
  rel(x, now = new Date()) { const m = Math.round((+x.at - +now) / 6e4); if (x.r.allDay) { const dd = Math.round((+new Date(localDate(x.at) + 'T12:00') - +new Date(localDate(now) + 'T12:00')) / 864e5); return dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : dd < 0 ? Math.abs(dd) + ' d overdue' : 'in ' + dd + ' d'; }
    if (Math.abs(m) < 60) return m >= 0 ? 'in ' + m + ' min' : Math.abs(m) + ' min ago'; const hh = Math.round(m / 60); if (Math.abs(hh) < 36) return hh >= 0 ? 'in ' + hh + ' h' : Math.abs(hh) + ' h ago'; const dd = Math.round(m / 1440); return dd >= 0 ? 'in ' + dd + ' d' : Math.abs(dd) + ' d overdue'; },
  /** Mark done: a one-off is closed; a repeating one moves to its next time. */
  done(r, at) {
    if (r.repeat && r.repeat !== 'none') { r.skip = [...new Set([...(r.skip || []), localDate(at)])].slice(-60); DB.put('reminders', r); toast('Done for ' + fmtDay(at) + ' — next one stays'); }
    else { r.done = isoLocal(new Date()); DB.put('reminders', r); toast('Done'); }
    changed(); REM.badge();
  },
  remove(r) { DB.del('reminders', r.id); changed(); REM.badge(); toast('Removed — Ctrl+Z undoes it'); },

  /* ---------------- add / edit ---------------- */
  edit(pre = {}) {
    const r0 = pre.id ? DB.get('reminders', pre.id) : null, r = Object.assign({ kind: 'deadline', title: '', allDay: false, repeat: 'none', lead: null }, r0 || pre);
    let kind = r.kind; const projects = DB.all('projects');
    const title = h('input.inp', { value: r.title || '', placeholder: 'e.g. Committee report · Lab meeting · Order FBS' });
    const at0 = r.at ? new Date(r.at) : (() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; })();
    const date = h('input.inp.mono', { type: 'date', value: localDate(at0) }), time = h('input.inp.mono', { type: 'time', value: fmtTime(at0) });
    const endT = h('input.inp.mono', { type: 'time', value: r.end ? fmtTime(r.end) : fmtTime(new Date(+at0 + 36e5)) });
    { let last = time.value; time.addEventListener('change', () => { const mins = v => { const [a, b] = (v || '0:0').split(':').map(Number); return a * 60 + b; }, dur = Math.max(15, mins(endT.value) - mins(last)), n = mins(time.value) + dur; endT.value = String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); last = time.value; }); }
    const allDay = h('input', { type: 'checkbox', checked: !!r.allDay }), where = h('input.inp', { value: r.where || '', placeholder: 'room, Zoom link, with whom' });
    const rep = h('select.inp', [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month']].map(([v, l]) => h('option', { value: v, selected: r.repeat === v }, l)));
    const lead = h('select.inp'); const fillLead = () => { const cur = r.lead != null ? r.lead : REMKIND[kind].lead; lead.replaceChildren(...[[-1, 'No alert'], [0, 'At the time'], [5, '5 min before'], [15, '15 min before'], [30, '30 min before'], [60, '1 h before'], [1440, '1 day before'], [2880, '2 days before'], [10080, '1 week before']].map(([v, l]) => h('option', { value: v, selected: v === cur }, l))); };
    const proj = h('select.inp', h('option', { value: '' }, '— none —'), projects.map(p => h('option', { value: p.id, selected: p.id === r.projectId }, p.name)));
    const th = h('select.inp'); const fillTh = () => th.replaceChildren(h('option', { value: '' }, '— none —'), ...DB.where('themes', t => t.projectId === proj.value && t.status === 'active').map(t => h('option', { value: t.id, selected: t.id === r.themeId }, t.name))); proj.onchange = fillTh; fillTh();
    const notes = h('textarea.inp', { rows: 2, value: r.notes || '', placeholder: 'Notes (optional)' });
    const note = r.docId && M.doc(r.docId);
    const seg = h('div.seg'), body = h('div');
    const draw = () => { seg.replaceChildren(...Object.entries(REMKIND).map(([k, K]) => h('button' + (k === kind ? '.on' : ''), { on: { click: () => { kind = k; if (r.lead == null) fillLead(); draw(); } } }, K.icon + ' ' + K.label)));
      body.replaceChildren(h('label.f', { style: { marginTop: '12px' } }, h('span', kind === 'meeting' ? 'What' : 'Title'), title),
        h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', kind === 'deadline' ? 'Due' : 'When'), h('div.row', { style: { gap: '6px', flexWrap: 'nowrap' } }, date, allDay.checked ? null : time)),
          kind === 'meeting' ? h('label.f', h('span', 'Ends'), endT) : h('label.row', { style: { gap: '6px', alignSelf: 'end', paddingBottom: '6px' } }, allDay, h('span.tiny', 'All day'))),
        kind === 'meeting' ? h('label.f', { style: { marginTop: '10px' } }, h('span', 'Where · with'), where) : null,
        h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', 'Alert'), lead), h('label.f', h('span', 'Repeat'), rep), h('label.f', h('span', 'Project'), proj), h('label.f', h('span', 'Theme'), th)),
        note ? h('div.tiny.muted', { style: { marginTop: '8px' } }, 'Linked to “' + note.title + '”') : null,
        h('label.f', { style: { marginTop: '10px' } }, h('span', 'Notes'), notes)); };
    allDay.addEventListener('change', draw); fillLead(); draw();
    const save = () => {
      const t = title.value.trim(); if (!t) { toast('Give it a title'); return false; } if (!date.value) { toast('Pick a date'); return false; }
      const [y, mo, dd] = date.value.split('-').map(Number), [hh, mm] = (kind !== 'meeting' && allDay.checked ? '09:00' : time.value || '09:00').split(':').map(Number), at = new Date(y, mo - 1, dd, hh, mm);
      let end = null; if (kind === 'meeting') { const [eh, em] = (endT.value || '').split(':').map(Number); if (!isNaN(eh)) { end = new Date(y, mo - 1, dd, eh, em); if (end <= at) end = new Date(+at + 36e5); } }
      const rec = Object.assign(r0 || { id: uid('rm'), created: isoLocal(new Date()) }, { kind, title: t, at: isoLocal(at), end: end ? isoLocal(end) : null, allDay: kind !== 'meeting' && allDay.checked, where: kind === 'meeting' ? where.value.trim() : '', repeat: rep.value, lead: +lead.value === REMKIND[kind].lead && r.lead == null ? null : +lead.value,
        projectId: proj.value || null, themeId: th.value || null, docId: r.docId || null, notes: notes.value.trim(), modified: isoLocal(new Date()), alerted: (r0 && r0.at === isoLocal(at)) ? r0.alerted : null, done: null });
      DB.put('reminders', rec); changed(); REM.badge(); toast(REMKIND[kind].label + ' saved · ' + fmtDay(at)); REM.askNotify();
    };
    const m = modal({ title: r0 ? 'Edit ' + REMKIND[kind].label.toLowerCase() : 'New reminder', wide: true, body: h('div', seg, body), actions: [r0 ? { label: 'Delete', danger: true, run: () => REM.remove(r0) } : null, { label: 'Cancel' }, { label: 'Save', pri: true, run: save }].filter(Boolean) });
    title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (save() !== false) m.close(); } });
    setTimeout(() => title.focus(), 30);
  },

  /* ---------------- meeting notes ---------------- */
  meetingNote(r, at) {
    if (r.noteId && M.doc(r.noteId) && (!r.repeat || r.repeat === 'none')) return App.go('#/doc/' + r.noteId);
    const day = localDate(at), have = DB.where('documents', d => d.reminderId === r.id && localDate(d.created) === day)[0]; if (have) return App.go('#/doc/' + have.id);
    const make = (projectId, themeId) => { const tpl = M.enabledTemplates('meeting')[0]; const d = M.createDoc({ type: 'meeting', projectId, themeId, title: r.title + ' — ' + fmtDay(at), templateId: tpl ? tpl.id : null, date: day });
      d.reminderId = r.id; d.header = Object.assign({}, d.header, { attendees: r.where || '' }); DB.put('documents', d); if (!r.repeat || r.repeat === 'none') { r.noteId = d.id; DB.put('reminders', r); } changed(); App.go('#/doc/' + d.id); };
    if (r.projectId) return make(r.projectId, r.themeId || (DB.where('themes', t => t.projectId === r.projectId && t.status === 'active')[0] || {}).id || null);
    App.newDoc({ type: 'meeting', title: r.title + ' — ' + fmtDay(at), date: day, onCreate: d => { d.reminderId = r.id; DB.put('documents', d); } });
  },

  /* ---------------- where they show ---------------- */
  row(x, { compact } = {}) {
    const r = x.r, K = REMKIND[r.kind] || REMKIND.reminder, now = new Date(), late = REM.bucket(x, now) === 'Overdue', doc = r.docId && M.doc(r.docId), meta = [REM.fmtAt(x), r.where, doc ? doc.title : (r.projectId && (M.project(r.projectId) || {}).name)].filter(Boolean).join(' · ');
    return h('div.rm-row.k-' + r.kind + (late ? '.late' : ''), h('span.rm-i', K.icon),
      h('div.rm-t', { on: { click: () => REM.edit({ id: r.id }) }, title: 'Edit' }, h('b', r.title), h('span.rm-m', meta)),
      h('span.rm-rel', REM.rel(x, now)),
      compact ? null : h('span.rm-acts',
        r.kind === 'meeting' ? h('button.btn.xs', { title: 'Open or create this meeting’s note', on: { click: e => { e.stopPropagation(); closePop(); REM.meetingNote(r, x.at); } } }, 'Note') : doc ? h('button.btn.xs', { on: { click: e => { e.stopPropagation(); closePop(); App.go('#/doc/' + doc.id); } } }, 'Open') : null,
        h('button.btn.xs', { title: 'Done', on: { click: e => { e.stopPropagation(); REM.done(r, x.at); const p = $('.pop.rmpop'); if (p) { closePop(); REM.panel(); } } } }, '✓')));
  },
  list(items, opts) {
    const groups = {}; items.forEach(x => { const b = REM.bucket(x); (groups[b] = groups[b] || []).push(x); });
    return ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later'].filter(g => groups[g]).map(g => h('div.rm-g', h('div.rm-gh' + (g === 'Overdue' ? '.late' : ''), g), groups[g].map(x => REM.row(x, opts))));
  },
  panel() {
    const b = $('#remindbtn'), r = b ? b.getBoundingClientRect() : { left: innerWidth - 420, bottom: 60 }, items = REM.open().slice(0, 40);
    popover(Math.max(8, r.right - 400), r.bottom + 8, [h('div.rm-ph', h('b', '🔔 Reminders'), h('span.spacer'), ...Object.entries(REMKIND).map(([k, K]) => h('button.btn.xs', { on: { click: () => { closePop(); REM.edit({ kind: k, docId: (App.panes()[0] && App.panes()[0].docId) || null }); } } }, '+ ' + K.label))),
      items.length ? h('div.rm-list', REM.list(items)) : h('div.empty', { style: { padding: '18px' } }, 'Nothing coming up. Add a deadline or a meeting.'),
      h('div.rm-pf', h('a.tiny', { on: { click: () => { closePop(); App.go('#/reminders'); } } }, 'All reminders →'))], { cls: 'pop.rmpop' });
  },
  badge() { const b = $('#remindbtn'); if (!b) return; const n = REM.due().length, late = REM.open().some(x => REM.bucket(x) === 'Overdue'); b.dataset.n = n || ''; b.classList.toggle('late', late); b.title = n ? plural(n, 'reminder') + ' in the next 24 h' + (late ? ' (some overdue)' : '') : 'Reminders — deadlines and meetings'; },
  home() {
    const items = REM.open().filter(x => +x.at - Date.now() < 7 * 864e5);
    return [h('div.sec-h', h('h2', 'Coming up'), h('span.r', h('button.btn.sm.ghost', { on: { click: () => REM.edit({}) } }, '+ Add'))), items.length ? h('div.rm-list.home', REM.list(items.slice(0, 8))) : h('div.tiny.muted', { style: { margin: '0 0 14px' } }, 'No deadlines or meetings in the next 7 days.')];
  },

  /* ---------------- alerts ---------------- */
  askNotify() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { } },
  check() {
    const now = Date.now();
    for (const x of REM.open()) { const r = x.r, lead = r.lead != null ? r.lead : REMKIND[r.kind].lead; if (lead < 0) continue;
      const key = isoLocal(x.at), fire = +x.at - lead * 6e4; if (now < fire || r.alerted === key || now > +(x.end || x.at) + 36e5) continue;
      r.alerted = key; DB.put('reminders', r); REM.alert(x); }
    REM.badge();
  },
  alert(x) {
    const r = x.r, K = REMKIND[r.kind], msg = r.title + ' — ' + REM.rel(x);
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(K.label + ': ' + r.title, { body: REM.fmtAt(x) + (r.where ? ' · ' + r.where : '') }); } catch { }
    let host = $('#rmalerts'); if (!host) { host = h('div#rmalerts'); document.body.append(host); }
    const card = h('div.rm-alert.k-' + r.kind, h('div.rm-ah', h('span', K.icon + ' ' + K.label), h('span.spacer'), h('span.tiny', REM.fmtAt(x))), h('b', r.title), r.where ? h('div.tiny', r.where) : null, h('div.tiny.muted', REM.rel(x)),
      h('div.row', { style: { gap: '6px', marginTop: '8px' } },
        r.kind === 'meeting' ? h('button.btn.xs.pri', { on: { click: () => { card.remove(); REM.meetingNote(r, x.at); } } }, 'Meeting note') : null,
        h('button.btn.xs', { on: { click: () => { card.remove(); r.alerted = null; r.lead = Math.max(0, Math.round((+x.at - Date.now()) / 6e4) - 10); if (+x.at <= Date.now()) { r.at = isoLocal(new Date(Date.now() + 10 * 6e4)); r.lead = 0; } DB.put('reminders', r); toast('Snoozed 10 min'); } } }, 'Snooze 10 min'),
        h('button.btn.xs', { on: { click: () => { card.remove(); REM.done(r, x.at); } } }, '✓ Done'), h('button.btn.xs.ghost', { on: { click: () => card.remove() } }, 'Dismiss')));
    host.append(card); toast(msg);
  },
  init() {
    const b = $('#remindbtn'); b && b.addEventListener('click', () => REM.panel());
    REM.badge(); setTimeout(() => REM.check(), 1500); setInterval(() => REM.check(), 30000);
  },
};

/* ---------------- the Reminders page ---------------- */
const RemindersView = {
  title: true,
  render() {
    App.setTitle('Reminders', [h('span', plural(REM.open().length, 'open'))]);
    const done = REM.all().filter(r => r.done).sort((a, b) => b.done.localeCompare(a.done)).slice(0, 30);
    return h('div.page.narrow', h('div.eyebrow', 'Deadlines · meetings'), h('h1.title', 'Reminders'),
      h('div.row', { style: { gap: '8px', margin: '6px 0 16px' } }, Object.entries(REMKIND).map(([k, K]) => h('button.btn' + (k === 'deadline' ? '.pri' : ''), { on: { click: () => REM.edit({ kind: k }) } }, '+ ' + K.label))),
      REM.open().length ? h('div.rm-list.page', REM.list(REM.open())) : h('div.empty', 'Nothing coming up.'),
      done.length ? [h('div.sec-h', { style: { marginTop: '24px' } }, h('h2', 'Done')), h('div.list', done.map(r => h('div.li', h('span.muted', (REMKIND[r.kind] || {}).icon), h('span.t', h('s', r.title), h('span.s', 'due ' + fmtDay(r.at) + ' · done ' + fmtDay(r.done))), h('button.btn.xs.ghost', { on: { click: () => { r.done = null; DB.put('reminders', r); changed(); } } }, 'Reopen'))))] : null);
  },
};
VIEWS.reminders = RemindersView;

/* ---------------- hooks: Insert, palette, live views, day note ---------------- */
INSERTS.push({ id: 'reminder', group: 'Plan', icon: '🔔', label: 'Deadline or meeting…', sub: 'A reminder linked to this note — shows under 🔔, on Today and in the day note', run: d => REM.edit({ docId: d.id, projectId: d.projectId, themeId: d.themeId }) });
if (typeof LV !== 'undefined' && LV.SOURCES) LV.SOURCES.reminders = { label: 'Reminders (deadlines, meetings)', date: 'at', end: 'end', title: 'title', group: 'kind',
  rows() { return REM.all().map(r => ({ _id: r.id, _src: 'reminders', _open: () => REM.edit({ id: r.id }), title: r.title, kind: r.kind, at: r.at, end: r.end, where: r.where || '', repeat: r.repeat || 'none', status: r.done ? 'done' : 'open', project: (M.project(r.projectId) || {}).name || '', theme: (r.themeId && (M.theme(r.themeId) || {}).name) || '', note: (M.doc(r.docId) || {}).title || '', themeId: r.themeId, projectId: r.projectId, docId: r.docId })); } };
