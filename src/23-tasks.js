/* ==========================================================================
   13zl · Tasks. A task is a component (+ Insert → Task, or + Task on the
   Tasks page or a project's page): a tick box, its words (the same editor —
   terms, links, styles), a due time, priority, repeat and subtasks. It wires
   to the components it concerns like any component.
     Due time = reminder: a dated task sits in Reminders with deadlines and
     meetings, alerts like them, and leaves when it is done.
     Done is logged three ways: on the task ("done 19 Oct 2026 17:40", struck
     through), as a "✓ Done: …" entry in that day's day note (so Today's
     timeline shows it), and in Activity's "Done" list. A repeating task logs
     the occurrence and moves to its next time.
   Tasks added to a project without a note live in that project's "Tasks"
   note. The Tasks page lists every open task: overdue, today, upcoming, no
   date, and what was done lately; filter by project.
   ========================================================================== */
const TASK = {
  PRIO: { high: { label: 'High', icon: '▲' }, normal: { label: 'Normal', icon: '' }, low: { label: 'Low', icon: '▽' } },
  REP: { none: 'Does not repeat', daily: 'Every day', weekly: 'Every week', monthly: 'Every month' },
  all: () => DB.where('blocks', b => b.kind === 'task' && b.status === 'live'),
  t: b => Object.assign({ due: null, allDay: false, prio: 'normal', repeat: 'none', subs: [], done: null, log: [] }, b.task || {}),
  text: b => ((b.body && b.body.text) || '').split('\n')[0].trim() || 'Untitled task',
  projectOf: b => { const d = M.doc(b.docId); return d && d.projectId; },
  isOpen: b => !TASK.t(b).done,
  dueAt: b => { const t = TASK.t(b); return t.due ? new Date(t.allDay ? t.due.slice(0, 10) + 'T23:59' : t.due) : null; },
  overdue: b => { const d = TASK.dueAt(b); return !!d && TASK.isOpen(b) && d < new Date(); },
  fmtDue(t) { if (!t.due) return 'no date'; const d = new Date(t.due); return t.allDay ? `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` : fmtStamp(d); },
  next(iso, rep) { const d = new Date(iso); if (rep === 'daily') d.setDate(d.getDate() + 1); else if (rep === 'weekly') d.setDate(d.getDate() + 7); else if (rep === 'monthly') d.setMonth(d.getMonth() + 1); return isoLocal(d); },

  /* ---------- making and saving ---------- */
  create(docId, pos, init = {}) {
    const d = M.doc(docId); if (!d) return null;
    const b = M.addBlock(docId, null, { kind: 'task', label: '', x: pos ? Math.round(pos.x / 14) * 14 : null, y: pos ? Math.round(pos.y / 14) * 14 : null, w: 392, task: Object.assign({ due: null, allDay: false, prio: 'normal', repeat: 'none', subs: [], done: null, log: [] }, init.task || {}) });
    b.body = { text: init.text || '', marks: [] }; DB.put('blocks', b); TASK.syncRem(b); changed(); return b;
  },
  save(b) { b.modified = isoLocal(new Date()); DB.put('blocks', b); TASK.syncRem(b); },
  /** The project's own "Tasks" note, for tasks that don't belong in any other note. */
  projectDoc(pid) {
    const id = 'tasks_' + pid; let d = M.doc(id); if (d) return d; const p = M.project(pid); if (!p) return null;
    d = { id, type: 'planning', scope: prof('planning').scope, projectId: pid, themeId: null, title: 'Tasks · ' + p.name, templateId: null, header: { tags: [] }, blockIds: [], synthesis: { text: '', marks: [] }, citeMode: settings().citeMode,
      layout: { head: { x: 0, y: 0 }, synth: null }, created: isoLocal(new Date()), modified: isoLocal(new Date()), backdate: null, taskList: true };
    DB.put('documents', d); return d;
  },
  /** Due time = reminder: one reminder per dated, open task (id rt_<task>). */
  syncRem(b) {
    const rid = 'rt_' + b.id, t = TASK.t(b), r0 = DB.get('reminders', rid), d = M.doc(b.docId);
    if (b.status === 'live' && t.due && !t.done) {
      const r = Object.assign({}, r0 || {}, { id: rid, kind: 'task', title: TASK.text(b), at: t.allDay ? t.due.slice(0, 10) + 'T09:00' : t.due, allDay: !!t.allDay, repeat: 'none', taskId: b.id, docId: b.docId, projectId: d && d.projectId || null, done: null });
      if (!r0 || r0.at !== r.at) r.alerted = null; if (r0 && r0.lead == null) r.lead = null;
      if (!r0 || JSON.stringify(r0) !== JSON.stringify(r)) DB.put('reminders', r);
    } else if (r0) DB.del('reminders', rid);
  },

  /* ---------- done ---------- */
  done(b) {
    b = M.block(b.id); if (!b) return; const t = TASK.t(b), now = new Date(), at = isoLocal(now); DB.beginGroup('task done');
    const entry = DAY.add('✓ Done: ' + TASK.text(b), null);
    if (entry) { const eb = M.block(entry.id), txt = eb.body.text; eb.body.marks = [...(eb.body.marks || []), { id: uid('m'), type: 'link', from: 8, to: txt.length, ref: b.id }]; eb.taskDone = b.id; DB.put('blocks', eb); }
    t.log = [...(t.log || []), { at, entryId: entry ? entry.id : null, due: t.due || null }].slice(-200);
    if (t.repeat && t.repeat !== 'none' && t.due) { let n = TASK.next(t.due, t.repeat); while (new Date(n) < now) n = TASK.next(n, t.repeat); t.due = n; t.subs = (t.subs || []).map(s => Object.assign({}, s, { done: false })); toast('Done — next one ' + TASK.fmtDue(t)); }
    else { t.done = at; toast('Done ✓ — logged in today’s day note'); }
    b.task = t; TASK.save(b); IX.rebuild(); changed();
  },
  undo(b) {
    b = M.block(b.id); const t = TASK.t(b); if (!t.done) return; const last = (t.log || []).slice(-1)[0];
    if (last && last.entryId) { const e = M.block(last.entryId); if (e) { let d = M.doc(e.docId); if (d) { d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== e.id) }); DB.put('documents', d); } DB.del('blocks', e.id); } }
    t.log = (t.log || []).slice(0, -1); t.done = null; b.task = t; TASK.save(b); IX.rebuild(); changed(); toast('Open again');
  },
  toggle(b) { TASK.t(b).done ? TASK.undo(b) : TASK.done(b); },

  /* ---------- editing ---------- */
  editDialog(b) {
    const t = TASK.t(b), d0 = t.due ? new Date(t.due) : (() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; })();
    const date = h('input.inp.mono', { type: 'date', value: t.due ? localDate(d0) : '' }), time = h('input.inp.mono', { type: 'time', value: fmtTime(d0) }), allDay = h('input', { type: 'checkbox', checked: !!t.allDay });
    const rep = h('select.inp', Object.entries(TASK.REP).map(([v, l]) => h('option', { value: v, selected: v === t.repeat }, l))), pr = h('select.inp', Object.entries(TASK.PRIO).map(([v, P]) => h('option', { value: v, selected: v === t.prio }, P.label)));
    const quick = (lab, fn) => h('button.btn.xs', { on: { click: () => { const d = fn(); date.value = localDate(d); } } }, lab);
    modal({ title: 'Task · ' + snippet(TASK.text(b), 40), body: h('div',
      h('label.f', h('span', 'Due (also the reminder)'), h('div.row', { style: { gap: '6px', flexWrap: 'wrap' } }, date, time, h('label.row.tiny', { style: { gap: '4px' } }, allDay, 'all day'))),
      h('div.row', { style: { gap: '4px', margin: '-4px 0 10px' } }, quick('Today', () => new Date()), quick('Tomorrow', () => addDays(new Date(), 1)), quick('Next week', () => addDays(new Date(), 7)), h('button.btn.xs.ghost', { on: { click: () => { date.value = ''; } } }, 'No date')),
      h('label.f', h('span', 'Repeat'), rep), h('label.f', h('span', 'Priority'), pr)),
      actions: [{ label: 'Delete task', danger: true, run: () => { const cur = M.block(b.id); pickModal('Delete this task?', TASK.text(cur), [{ label: 'Delete', danger: true, run: () => { let d = M.doc(cur.docId); d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== cur.id) }); DB.put('documents', d); DB.where('wires', w => w.from === cur.id || w.to === cur.id).forEach(w => DB.del('wires', w.id)); DB.del('blocks', cur.id); DB.del('reminders', 'rt_' + cur.id); changed(); toast('Task deleted · Ctrl+Z undoes'); } }]); } },
        { label: 'Cancel' }, { label: 'Save', pri: true, run: () => { const cur = M.block(b.id), T = TASK.t(cur);
          T.due = date.value ? (allDay.checked ? date.value + 'T00:00' : `${date.value}T${time.value || '09:00'}`) : null; T.allDay = !!date.value && allDay.checked; T.repeat = rep.value; T.prio = pr.value; cur.task = T; TASK.save(cur); changed(); } }] });
  },
  setSubs(b, fn) { const cur = M.block(b.id), t = TASK.t(cur); t.subs = fn((t.subs || []).slice()); cur.task = t; TASK.save(cur); TASK.repaint(cur); },
  repaint(b) { $$(`.box[data-id="${b.id}"] > .tk`).forEach(old => { const box = old.closest('.box'), pane = DV(box); old.replaceWith(TASK.body(M.block(b.id), M.doc(b.docId), pane, !!(pane && pane.travel))); }); },

  /* ---------- the component ---------- */
  body(b, d, pane, ro) {
    const t = TASK.t(b), done = !!t.done, od = TASK.overdue(b), subs = t.subs || [], nd = subs.filter(s => s.done).length;
    const ed = h('div.ed.tk-ed', { 'data-ph': 'What needs doing…' }); if (ro) { ED.render(ed, b, d); ed.contentEditable = 'false'; } else ED.attach(ed, b);
    ed.addEventListener('blur', () => setTimeout(() => { const cur = M.block(b.id); if (cur) TASK.syncRem(cur); }, 600));
    const tick = h('button.tk-box' + (done ? '.on' : ''), { title: done ? 'Done — click to open it again' : 'Mark done', disabled: ro, on: { click: e => { e.stopPropagation(); TASK.toggle(M.block(b.id)); } } }, done ? '✓' : '');
    const chip = (cls, txt, title, fn) => h('button.tk-chip' + cls, { title, disabled: ro, on: { click: e => { e.stopPropagation(); fn(e); } } }, txt);
    const meta = h('div.tk-meta',
      chip(od ? '.late' : t.due ? '' : '.none', (t.due ? '⏰ ' : '+ ') + (t.due ? TASK.fmtDue(t) : 'due date'), 'Due time — also the reminder', () => TASK.editDialog(M.block(b.id))),
      t.prio !== 'normal' ? chip('.p-' + t.prio, TASK.PRIO[t.prio].icon + ' ' + TASK.PRIO[t.prio].label, 'Priority — click to change', () => { const cur = M.block(b.id), T = TASK.t(cur); T.prio = { high: 'low', low: 'normal', normal: 'high' }[T.prio]; cur.task = T; TASK.save(cur); TASK.repaint(cur); }) : chip('.none', '+ priority', 'Priority', () => { const cur = M.block(b.id), T = TASK.t(cur); T.prio = 'high'; cur.task = T; TASK.save(cur); TASK.repaint(cur); }),
      t.repeat !== 'none' ? chip('', '↻ ' + t.repeat, 'Repeats — each tick logs it and moves to the next time', () => TASK.editDialog(M.block(b.id))) : null,
      subs.length ? h('span.tk-n.mono', `${nd}/${subs.length}`) : null);
    const subEl = h('div.tk-subs', subs.map((s, i) => h('div.tk-sub' + (s.done ? '.on' : ''),
      h('button.tk-sbox', { disabled: ro, on: { click: e => { e.stopPropagation(); TASK.setSubs(b, L => { L[i] = Object.assign({}, L[i], { done: !L[i].done }); return L; }); } } }, s.done ? '✓' : ''),
      h('input.tk-st', { value: s.t, readOnly: ro, on: { pointerdown: e => e.stopPropagation(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); }, change: e => TASK.setSubs(b, L => { L[i] = Object.assign({}, L[i], { t: e.target.value }); return L; }) } }),
      ro ? null : h('button.tk-x', { title: 'Remove', on: { click: e => { e.stopPropagation(); TASK.setSubs(b, L => (L.splice(i, 1), L)); } } }, '×'))),
      ro ? null : h('input.tk-add', { placeholder: '+ subtask', on: { pointerdown: e => e.stopPropagation(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.value.trim()) { const v = e.target.value.trim(); TASK.setSubs(b, L => [...L, { id: uid('s'), t: v, done: false }]); setTimeout(() => { const n = $(`.box[data-id="${b.id}"] .tk-add`); n && n.focus(); }, 30); } } } }));
    const log = (t.log || []), last = log[log.length - 1];
    return h('div.tk' + (done ? '.done' : '') + (od ? '.late' : '') + '.p-' + t.prio, h('div.tk-row', tick, ed), meta, subEl,
      done ? h('div.tk-log', '✓ done ' + fmtStamp(t.done)) : log.length ? h('div.tk-log', `done ${plural(log.length, 'time')} · last ${fmtStamp(last.at)}`) : null);
  },

  /* ---------- lists (Tasks page, project page) ---------- */
  row(b, { showProject = true } = {}) {
    const t = TASK.t(b), d = M.doc(b.docId), p = d && M.project(d.projectId), od = TASK.overdue(b);
    return h('div.tk-li' + (t.done ? '.done' : '') + (od ? '.late' : '') + '.p-' + t.prio,
      h('button.tk-box' + (t.done ? '.on' : ''), { on: { click: e => { e.stopPropagation(); TASK.toggle(b); } } }, t.done ? '✓' : ''),
      h('div.tk-lt', { on: { click: e => App.jump(b.id, e) }, title: 'Open it in its note' }, h('span.tk-lw', t.prio === 'high' ? h('b.tk-hi', '▲ ') : null, TASK.text(b), (t.subs || []).length ? h('span.tk-n.mono', ` ${(t.subs || []).filter(s => s.done).length}/${t.subs.length}`) : null),
        h('span.tk-ls', [showProject && p ? p.name : null, d && !d.taskList ? d.title : null].filter(Boolean).join(' · '))),
      h('span.tk-ld.mono' + (od ? '.late' : ''), t.done ? 'done ' + fmtDay(t.done) : t.due ? TASK.fmtDue(t) : '—', t.repeat !== 'none' ? ' ↻' : ''));
  },
  groups(list) {
    const now = new Date(), today = localDate(now), G = { Overdue: [], Today: [], Upcoming: [], 'No date': [] };
    list.filter(TASK.isOpen).forEach(b => { const d = TASK.dueAt(b); if (!d) G['No date'].push(b); else if (localDate(d) === today && !(d < now && !TASK.t(b).allDay)) G.Today.push(b); else if (d < now) G.Overdue.push(b); else G.Upcoming.push(b); });
    const pr = { high: 0, normal: 1, low: 2 }, by = (a, c) => (+(TASK.dueAt(a) || 0) - +(TASK.dueAt(c) || 0)) || pr[TASK.t(a).prio] - pr[TASK.t(c).prio];
    Object.values(G).forEach(L => L.sort(by)); return G;
  },
  adder(pid, docId) {
    const inp = h('input.inp.tk-new', { placeholder: '+ Add a task (Enter)…' }), proj = pid ? null : h('select.inp.tk-psel', DB.all('projects').map(p => h('option', { value: p.id, selected: p.id === _ls.get('taskProj', null) }, p.name)));
    const go = () => { const v = inp.value.trim(); if (!v) return; const P = pid || (proj && proj.value); if (!P && !docId) return toast('Make a project first'); if (proj) _ls.set('taskProj', proj.value); const d = docId ? M.doc(docId) : TASK.projectDoc(P);
      const n = d.blockIds.map(M.block).filter(x => x && x.kind === 'task').length, b = TASK.create(d.id, { x: 0, y: 200 + n * 150 }, { text: v }); inp.value = ''; toast('Task added to “' + snippet(d.title, 30) + '” · open it for a due date'); return b; };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    return h('div.row.tk-adder', inp, proj, h('button.btn.sm.pri', { on: { click: go } }, 'Add'));
  },
  listView(list, opts = {}) {
    const G = TASK.groups(list), recent = list.filter(b => TASK.t(b).done).sort((a, c) => TASK.t(c).done.localeCompare(TASK.t(a).done)).slice(0, opts.doneN || 10);
    return h('div.tk-list', Object.entries(G).filter(([, L]) => L.length).map(([g, L]) => h('div.tk-g', h('div.tk-gh' + (g === 'Overdue' ? '.late' : ''), g, h('span.muted', ' ' + L.length)), L.map(b => TASK.row(b, opts)))),
      !list.some(TASK.isOpen) ? h('div.tiny.muted', { style: { margin: '6px 0' } }, 'No open tasks.') : null,
      recent.length ? h('details.tk-g.tk-donegrp', h('summary.tk-gh', 'Done lately', h('span.muted', ' ' + recent.length)), recent.map(b => TASK.row(b, opts))) : null);
  },
};
WIDGETS.task = { label: 'task', w: 392, body: TASK.body, menu: b => [{ label: 'Due date, repeat, priority…', run: () => TASK.editDialog(b) }, { label: TASK.t(b).done ? 'Open it again' : 'Mark done', run: () => TASK.toggle(b) }] };
INSERTS.push({ id: 'task', group: 'Plan', icon: '☐', label: 'Task', sub: 'A tick box with a due time (= a reminder), priority, repeat and subtasks; done is logged', run: (d, p, pane) => { const b = TASK.create(d.id, p); if (pane) pane.focusAfterRender = { id: b.id, pos: 0 }; setTimeout(() => { const ed = $(`.box[data-id="${b.id}"] .tk-ed`); ed && ed.focus(); }, 120); } });
REMKIND.task = { icon: '☐', label: 'Task', lead: 0 };

/* ---------------- the Tasks page ---------------- */
const TasksView = {
  title: true,
  render() {
    const pf = _ls.get('taskFilter', ''), all = TASK.all().filter(b => !pf || TASK.projectOf(b) === pf), open = all.filter(TASK.isOpen);
    App.setTitle('Tasks', [h('span', open.length + ' open')]);
    const sel = h('select.inp', { on: { change: e => { _ls.set('taskFilter', e.target.value); App.refresh(); } } }, h('option', { value: '' }, 'All projects'), DB.all('projects').map(p => h('option', { value: p.id, selected: p.id === pf }, p.name)));
    return h('div.page.narrow', h('div.eyebrow', 'Things to do'), h('h1.title', 'Tasks'),
      h('div.row', { style: { gap: '8px', margin: '4px 0 14px', flexWrap: 'wrap' } }, sel, h('span.spacer'), h('span.tiny.muted', 'Dated tasks are reminders too · done ones are logged in the day note')),
      TASK.adder(pf || null), TASK.listView(all, { showProject: !pf, doneN: 20 }));
  },
};
VIEWS.tasks = TasksView;

{
  // a tab for Tasks, after Today
  if (!TABS.some(t => t[0] === 'tasks')) TABS.splice(1, 0, ['tasks', 'Tasks']);
  // the project page: its tasks
  const pr = ProjectView.render; ProjectView.render = function (id) { const el = pr.call(this, id); if (!M.project(id)) return el;
    const list = TASK.all().filter(b => TASK.projectOf(b) === id), sec = h('div.tk-proj', h('div.sec-h', h('h2', 'Tasks'), h('span.k', list.filter(TASK.isOpen).length + ' open'), h('span.r', h('a.tiny', { href: '#/tasks', on: { click: () => _ls.set('taskFilter', id) } }, 'All tasks →'))),
      TASK.adder(id), TASK.listView(list, { showProject: false }));
    const anchor = [...el.querySelectorAll('.sec-h')][0]; anchor ? anchor.before(sec) : el.append(sec); return el; };
  // reminders: a task's reminder opens / ticks / clears the task
  const edit = REM.edit; REM.edit = function (pre = {}) { const r = pre.id && DB.get('reminders', pre.id); if (r && r.taskId && M.block(r.taskId)) { closePop(); return App.openBlock(r.taskId); } return edit.call(REM, pre); };
  const done = REM.done; REM.done = function (r, at) { if (r && r.taskId && M.block(r.taskId)) return TASK.done(M.block(r.taskId)); return done.call(REM, r, at); };
  const open = REM.open; REM.open = function (now) { return open.call(REM, now).filter(x => !x.r.taskId || (M.block(x.r.taskId) && M.block(x.r.taskId).status === 'live' && TASK.isOpen(M.block(x.r.taskId)))); };
  // Activity: what was done
  const act = ActivityView.render; ActivityView.render = function () { const el = act.call(this);
    const rows = TASK.all().concat(DB.where('blocks', b => b.kind === 'task' && b.status !== 'live')).flatMap(b => (TASK.t(b).log || []).map(l => ({ b, at: l.at }))).sort((a, c) => c.at.localeCompare(a.at)).slice(0, 40);
    el.append(h('div.sec'), h('div.sec-h', h('h2', 'Done'), h('span.k', 'tasks ticked off, newest first')),
      rows.length ? h('div.list', rows.map(({ b, at }) => h('div.li.click', { on: { click: e => App.jump(b.id, e) } }, h('span.mono.tiny', fmtStamp(at)), h('span.t', '✓ ' + TASK.text(b), h('span.s', M.docPath(M.doc(b.docId))))))) : h('div.tiny.muted', 'Nothing ticked off yet.'));
    return el; };
  // a task's words changed: its reminder follows
  setInterval(() => { TASK.all().forEach(b => { const r = DB.get('reminders', 'rt_' + b.id); if (r && r.title !== TASK.text(b)) TASK.syncRem(b); }); }, 15000);
}
