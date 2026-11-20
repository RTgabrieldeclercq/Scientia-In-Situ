/* ==========================================================================
   23e · Calendar (V4.57 — Gabe, 20 Nov: "Add a Calendar tab right before
   Tasks. The calendar should look modern and refined. […] a calendar event
   for an experiment can be linked to a note, opening it when clicking on it
   on the calendar." He chose the Day planner on the design canvas: "The
   calendar should be one piece where you can scroll through […] The calendar
   banner should freeze so that when you scroll, you can see it. Clicking on a
   free spot brings up a create event window that is simple to fill out,
   including time to add. You can click on the sorting types to single out the
   cards just for that sort.")
   - A tab before Tasks. Week and Day: each day one column, 0:00 to 24:00,
     that scrolls; the hour is sized so 12 hours (Settings) fill the visible
     height. It opens with now a third of the way down (8:00 on another week).
     The banner (day names and the all-day row) stays above the hours.
   - Events are their own records (store `events`): a title, a day, a start
     and an end in minutes, a kind (Meeting · Experiment · Other), tags, a
     project, a linked note, a repeat. Timed reminders with an end show as
     cards too; reminders, deadlines and dated tasks sit in the all-day row
     (a task's check ticks it).
   - A click on a free spot (the dashed free time, or any empty stretch) opens
     the create window there, at that time: title, day, start and end, 30 min ·
     1 h · 2 h, the sort type, a note. Enter adds it; Esc or a click outside
     cancels.
   - A card: drag it to another time or day (it lands at the time under the
     pointer, a dashed outline shows where); drag its bottom edge for its
     length; rest on it a second and it opens in place to change it; a click
     opens its note — or makes one (a meeting note, an experiment at its first
     stage, a quick note) and links it.
   - Colour by Project · Kind · Tag · Note type · Load. The legend counts what
     is shown; a click on a value singles its cards out (the rest fade), Ctrl
     or Shift adds another, a second click clears. A tag on a card shows only
     that tag's events.
   CAL: st · on() · all() · occurs(ev, day) · dayItems(day) · allDayItems(day)
   · colour(it) · legend(list) · render() · paint() · col(day) · create(…) ·
   bub(it, el) · open(it).
   Settings → Tabs & overview → Calendar (calendar, 20a).
   ========================================================================== */
const CAL = {
  PAL: { blue: '#2F64A8', teal: '#0B7268', plum: '#9B356B', amber: '#8F5600', green: '#2E7136', indigo: '#4A4DB0', red: '#A9372A', slate: '#525C69' },
  ORDER: ['blue', 'teal', 'plum', 'amber', 'green', 'indigo', 'red'],
  KINDS: { meeting: { label: 'Meeting', c: 'blue' }, experiment: { label: 'Experiment', c: 'teal' }, other: { label: 'Other', c: 'slate' } },
  BY: [['project', 'Project'], ['kind', 'Kind'], ['tag', 'Tag'], ['ntype', 'Note type'], ['load', 'Load']],
  LOAD: [[30, 'Under 30 min'], [60, '30 min – 1 h'], [120, '1 – 2 h'], [240, '2 – 4 h'], [1e9, '4 h or more']],
  NT: { exp: 'teal', notes: 'blue', lit: 'amber', syn: 'plum' },
  st: Object.assign({ view: 'week', by: 'kind', agents: false }, (() => { try { return _ls.get('calSt', {}) || {}; } catch (e) { return {}; } })(), { single: [], tag: null, day: null }),
  root: null, hpx: 50, ro: null, _t: null,
  on: () => typeof FEAT === 'undefined' || FEAT.on('calendar'),
  tn(k, d) { try { const v = FEAT.tune('calendar', k); return v == null ? d : v; } catch (e) { return d; } },
  span() { return clamp(+CAL.tn('span', '12') || 12, 6, 24); },
  wk0() { return CAL.tn('week', 'mon') === 'sun' ? 0 : 1; },
  keep() { try { _ls.set('calSt', { view: CAL.st.view, by: CAL.st.by, agents: !!CAL.st.agents }); } catch (e) { } },

  /* ---------------- time ---------------- */
  today: () => localDate(new Date()),
  nowMin: () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
  hm: m => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60),
  dur(m) { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), r = m % 60; return h ? h + ' h' + (r ? ' ' + r : '') : r + ' min'; },
  snap: m => Math.round(m / 15) * 15,
  pm(s) { const m = String(s || '').match(/^(\d{1,2}):(\d{2})/); return m ? clamp(+m[1] * 60 + +m[2], 0, 1440) : null; },
  addD: (day, n) => localDate(addDays(parseDay(day), n)),
  weekOf(day) { const d = parseDay(day), k = (d.getDay() - CAL.wk0() + 7) % 7; return CAL.addD(day, -k); },
  days() {
    const a = CAL.st.day || CAL.today(), v = CAL.st.view; if (v === 'day') return [a];
    if (v === 'agenda') return Array.from({ length: 14 }, (_, i) => CAL.addD(a, i));
    if (v === 'month') { const f = a.slice(0, 8) + '01', s = CAL.weekOf(f), d1 = parseDay(f), last = localDate(new Date(d1.getFullYear(), d1.getMonth() + 1, 0)); const out = []; for (let d = s; out.length < 42 && (d <= last || out.length % 7); d = CAL.addD(d, 1)) out.push(d); return out; }
    const s = CAL.weekOf(a); return [0, 1, 2, 3, 4, 5, 6].map(i => CAL.addD(s, i));
  },

  /* ---------------- records ---------------- */
  all: () => DB.all('events'),
  occurs(ev, day) {
    if (!ev || !ev.day || day < ev.day || (ev.until && day > ev.until) || (ev.skip || []).includes(day)) return false;
    const r = ev.repeat || 'none'; if (r === 'none') return ev.day === day; if (r === 'daily') return true;
    if (r === 'weekly') return parseDay(day).getDay() === parseDay(ev.day).getDay(); return false;
  },
  save(ev, label) { DB.beginGroup(label || 'Calendar'); ev.modified = isoLocal(new Date()); DB.put('events', ev); changed(); },
  make(o) {
    const ev = Object.assign({ id: uid('ev'), title: '', day: CAL.today(), start: 540, end: 600, allDay: false, kind: 'other', tags: [], projectId: null, docId: null, repeat: 'none', skip: [], created: isoLocal(new Date()) }, o);
    ev.title = String(ev.title || '').trim() || 'New event'; if (ev.end <= ev.start) ev.end = Math.min(1440, ev.start + 15); return ev;
  },
  /** A reminder's occurrence on `day` (repeats rolled forward), or null. */
  remOn(r, day) { try { if (!r.at || r.done) return null; const at = REM.when(r, dayStart(parseDay(day))); return localDate(at) === day ? at : null; } catch (e) { return null; } },
  /** What has a time on a day: events, and reminders with an end (a meeting). */
  dayItems(day) {
    const out = CAL.all().filter(ev => !ev.allDay && ev.kind !== 'run' && CAL.occurs(ev, day)).map(ev => ({ k: ev.id + '@' + day, ev, day, s: ev.start, e: Math.max(ev.start + 15, ev.end), title: ev.title }));
    if (typeof REM !== 'undefined') REM.all().forEach(r => { if (r.allDay || !r.end) return; const at = CAL.remOn(r, day); if (!at) return;
      const s = at.getHours() * 60 + at.getMinutes(), e = Math.min(1440, s + Math.max(15, Math.round((+new Date(r.end) - +new Date(r.at)) / 6e4)));
      out.push({ k: 'rem:' + r.id + '@' + day, rem: r, at, day, s, e, title: r.title || 'Reminder' }); });
    return out.filter(CAL.shown).sort((a, b) => a.s - b.s || b.e - a.e);
  },
  /** The all-day row: all-day events, reminders without an end (a deadline, a reminder), dated tasks. */
  allDayItems(day) {
    const out = CAL.all().filter(ev => ev.allDay && ev.kind !== 'run' && CAL.occurs(ev, day)).map(ev => ({ k: ev.id + '@' + day, ev, day, s: 0, e: 0, title: ev.title, ad: true }));
    if (typeof REM !== 'undefined') REM.all().forEach(r => { if (r.end && !r.allDay) return; if (r.taskId) return; const at = CAL.remOn(r, day); if (!at) return;
      out.push({ k: 'rem:' + r.id + '@' + day, rem: r, at, day, ad: true, title: r.title || 'Reminder', time: r.allDay ? '' : fmtTime(at) }); });
    if (typeof TASK !== 'undefined') TASK.all().forEach(b => { const d = TASK.dueAt(b); if (!d || localDate(d) !== day) return; const t = TASK.t(b);
      out.push({ k: 'task:' + b.id, task: b, day, ad: true, title: TASK.text(b) || 'Task', done: !!t.done, time: t.allDay ? '' : fmtTime(d) }); });
    return out.filter(CAL.shown);
  },
  tagsOf: it => (it.ev && it.ev.tags) || [],
  shown: it => !CAL.st.tag || CAL.tagsOf(it).includes(CAL.st.tag),

  /* ---------------- colour by ---------------- */
  kindOf: it => it.ev ? (CAL.KINDS[it.ev.kind] ? it.ev.kind : 'other') : it.rem ? 'rem' : 'task',
  docOf(it) { const id = it.ev ? it.ev.docId : it.rem ? (it.rem.noteId || it.rem.docId) : it.task ? it.task.docId : null; const d = id && M.doc(id); return d && !d.deleted ? d : null; },
  projOf(it) { const d = CAL.docOf(it); return (it.ev && it.ev.projectId) || (it.rem && it.rem.projectId) || (d && d.projectId) || null; },
  projOrder() { return DB.all('projects').slice().sort((a, b) => String(a.created || '').localeCompare(String(b.created || ''))).map(p => p.id); },
  tagOrder() { const s = new Set(); CAL.all().forEach(ev => (ev.tags || []).forEach(t => s.add(t))); return [...s].sort((a, b) => a.localeCompare(b)); },
  band(m) { return CAL.LOAD.findIndex(([x]) => m < x); },
  /** {key, label, col, ink?, cls?} — the value this item has under Colour by. */
  colour(it) {
    const P = CAL.PAL, by = CAL.st.by, kd = CAL.kindOf(it);
    if (it.ev && it.ev.kind === 'run') return { key: 'run', label: 'Agent run', col: '#5B4FC4' };
    if (kd === 'rem') return { key: 'rem', label: 'Reminder', col: P.amber };
    if (kd === 'task') return { key: 'task', label: 'Task', col: P.slate };
    if (by === 'project') { const id = CAL.projOf(it), i = id ? CAL.projOrder().indexOf(id) : -1, p = id && M.project(id);
      return p ? { key: 'p:' + id, label: p.name, col: P[CAL.ORDER[i]] || P.slate } : { key: 'p:', label: 'No project', col: P.slate }; }
    if (by === 'tag') { const t = CAL.tagsOf(it)[0], i = t ? CAL.tagOrder().indexOf(t) : -1; return t ? { key: 't:' + t, label: '#' + t, col: P[CAL.ORDER[i]] || P.slate } : { key: 't:', label: 'No tag', col: P.slate }; }
    if (by === 'ntype') { const d = CAL.docOf(it); if (!d) return { key: 'n:', label: 'No note', col: P.slate }; const k = typeof NOTEKIND !== 'undefined' ? NOTEKIND.of(d) : 'notes';
      return { key: 'n:' + k, label: typeof NOTEKIND !== 'undefined' ? NOTEKIND.LABEL[k] : 'Note', col: P[CAL.NT[k]] || P.blue }; }
    if (by === 'load') { const b = CAL.band(it.e - it.s); return { key: 'l:' + b, label: CAL.LOAD[b][1], col: 'var(--ld' + b + ')', ink: 'var(--ld' + b + '-ink)', cls: 'ld' + b, ord: b }; }
    return { key: 'k:' + kd, label: CAL.KINDS[kd].label, col: P[CAL.KINDS[kd].c] };
  },
  legend(list) {
    const m = new Map(); list.forEach(it => { const c = CAL.colour(it); const o = m.get(c.key) || Object.assign({ n: 0 }, c); o.n++; m.set(c.key, o); });
    const L = [...m.values()]; if (CAL.st.by === 'load') L.sort((a, b) => a.ord - b.ord); return L;
  },
  dim: it => CAL.st.single.length > 0 && !CAL.st.single.includes(CAL.colour(it).key),
  pick(key, add) { const S = CAL.st.single; const i = S.indexOf(key); CAL.st.single = add ? (i >= 0 ? S.filter(k => k !== key) : S.concat([key])) : (i >= 0 && S.length === 1 ? [] : [key]); CAL.paint(); },

  /* ---------------- the page ---------------- */
  title() {
    if (CAL.st.view === 'month') { const a = parseDay(CAL.st.day || CAL.today()); return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][a.getMonth()] + ' ' + a.getFullYear(); }
    const D = CAL.days(), a = parseDay(D[0]), b = parseDay(D[D.length - 1]);
    if (D.length === 1) return fmtDayLong(a);
    return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}` : `${fmtDay(a)} – ${fmtDay(b)} ${b.getFullYear()}`;
  },
  step(n) { const a = CAL.st.day || CAL.today(), v = CAL.st.view;
    if (v === 'month') { const d = parseDay(a); CAL.st.day = localDate(new Date(d.getFullYear(), d.getMonth() + n, 1)); CAL.st.mday = null; }
    else CAL.st.day = CAL.addD(a, n * (v === 'day' ? 1 : v === 'agenda' ? 14 : 7)); CAL._scrollTo = 'keep'; CAL.paint(); },
  setView(v, day) { CAL.st.view = v; if (day) CAL.st.day = day; if (v !== 'month') CAL.st.mday = null; CAL.keep(); CAL._scrollTo = 'auto'; CAL.paint(); },
  render() { CAL.root = h('div.cal-root'); CAL._scrollTo = 'auto'; CAL.paint(); return CAL.root; },
  paint() {
    const R = CAL.root; if (!R || !R.isConnected && R.parentNode) return;
    const old = $('.cal-scroll', R), top = old ? old.scrollTop : null;
    const v = CAL.st.view, D = CAL.days(), items = D.flatMap(CAL.dayItems), ads = D.flatMap(CAL.allDayItems), all = items.concat(ads.filter(x => x.ev));
    const body = v === 'month' ? [CAL.month(D), CAL.st.mday ? CAL.side(CAL.st.mday) : null] : v === 'agenda' ? CAL.agenda(D) : CAL.planner(D);
    R.replaceChildren(CAL.bar(all), h('div.cal-card' + (v === 'month' ? '.mo' : v === 'agenda' ? '.ag' : ''), body));
    const n = items.filter(x => x.ev).length + ads.filter(x => x.ev).length;
    try { App.setTitle('Calendar', [h('span', plural(n, 'event') + ({ day: ' today', week: ' this week', month: ' this month', agenda: ' in the next two weeks' }[v] || ''))]); } catch (e) { }
    const sc = $('.cal-scroll', R); if (!sc) { if (CAL.ro) CAL.ro.disconnect(); return; } sc.style.setProperty('--hpx', CAL.hpx + 'px');
    if (CAL._scrollTo === 'keep' && top != null) sc.scrollTop = top; else if (CAL._scrollTo !== 'auto' && top != null) sc.scrollTop = top;
    requestAnimationFrame(() => CAL.fit(sc));
    if (CAL.ro) CAL.ro.disconnect(); if (typeof ResizeObserver !== 'undefined') { CAL.ro = new ResizeObserver(() => CAL.fit(sc, true)); CAL.ro.observe(sc); }
  },
  /** The hour's height: `span` hours fill what is visible under the banner. */
  fit(sc, resized) {
    if (!sc || !sc.isConnected) return; const top = $('.cal-top', sc), avail = sc.clientHeight - (top ? top.offsetHeight : 0) - 14;
    const hpx = Math.max(22, Math.round(avail / CAL.span() * 10) / 10); const was = CAL.hpx;
    if (Math.abs(hpx - was) > .4) { const mid = sc.scrollTop / Math.max(1, was); CAL.hpx = hpx; sc.style.setProperty('--hpx', hpx + 'px'); if (resized) sc.scrollTop = mid * hpx; }
    if (CAL._scrollTo === 'auto') { CAL._scrollTo = null; const D = sc._days || CAL.days(), t = CAL.today(); const m = D.includes(t) ? CAL.nowMin() : 480;
      sc.scrollTop = Math.max(0, m / 60 * CAL.hpx - (D.includes(t) ? (sc.clientHeight - (top ? top.offsetHeight : 0)) / 3 : 8)); }
    $$('.cal-grid', sc).forEach(g => { try { CAL.drawLinks(g); } catch (e) { console.warn('[calendar] links', e); } });
  },
  bar(all) {
    const v = CAL.st.view, seg = [['day', 'Day', 'D'], ['week', 'Week', 'W'], ['month', 'Month', 'M'], ['agenda', 'Agenda', 'A']];
    const L = CAL.legend(all), S = CAL.st.single;
    return h('div.cal-bar',
      h('div.cal-nav', h('button.cal-ib', { title: 'Back (←)', 'aria-label': 'Back', on: { click: () => CAL.step(-1) } }, CAL.ic('l')),
        h('button.cal-btn', { title: 'Today (T)', on: { click: () => { CAL.st.day = null; CAL._scrollTo = 'auto'; CAL.paint(); } } }, 'Today'),
        h('button.cal-ib', { title: 'Forward (→)', 'aria-label': 'Forward', on: { click: () => CAL.step(1) } }, CAL.ic('r'))),
      h('h2.cal-ttl', CAL.title()),
      h('div.cal-seg', { role: 'group', 'aria-label': 'View' }, seg.map(([k, l, key]) => h('button' + (v === k ? '.on' : ''), { title: l + ' (' + key + ')', 'aria-pressed': String(v === k), on: { click: () => CAL.setView(k) } }, l))),
      h('span.cal-sp'),
      h('button.cal-tg' + (CAL.st.agents ? '.on' : ''), { title: 'Agent runs over your calendar (G)', 'aria-pressed': String(!!CAL.st.agents), on: { click: () => CAL.toggleAgents() } }, h('i.cal-tgd'), 'Agent runs'),
      CAL.st.agents && v !== 'month' ? (() => { const T = CAL.tally(CAL.days()); return h('span.cal-ai', { title: 'AI hours shown, and how much of it ran while you had something on' }, T.n ? [h('b.agdip', 'AI ' + CAL.hrs(T.all)), ' · 2× for ' + CAL.hrs(T.al) + ' alongside you'] : 'No agent run here'); })() : null,
      h('label.cal-by', h('span', 'Colour by'), h('select', { on: { change: e => { CAL.st.by = e.target.value; CAL.st.single = []; CAL.keep(); CAL.paint(); } } }, CAL.BY.map(([k, l]) => h('option', { value: k, selected: CAL.st.by === k }, l)))),
      h('div.cal-lg', L.map(o => h('button.cal-lgv' + (S.includes(o.key) ? '.on' : '') + (S.length && !S.includes(o.key) ? '.off' : ''), { title: 'Single out ' + o.label + ' (Ctrl or Shift adds another)', 'aria-pressed': String(S.includes(o.key)), on: { click: e => CAL.pick(o.key, e.ctrlKey || e.metaKey || e.shiftKey) } },
        h('i', { style: { background: o.col } }), h('span', o.label), h('b', String(o.n))))),
      S.length ? h('span.cal-chip', 'Showing: ' + L.filter(o => S.includes(o.key)).map(o => o.label).join(', '), h('button', { on: { click: () => { CAL.st.single = []; CAL.paint(); } } }, 'Clear')) : null,
      CAL.st.linkFrom ? h('span.cal-chip.lk', CAL.ic('link'), 'Click the event that comes after “' + ((DB.get('events', CAL.st.linkFrom) || {}).title || '') + '”', h('button', { on: { click: () => CAL.linkEnd() } }, 'Cancel')) : null,
      CAL.st.tag ? h('span.cal-chip', 'Only #' + CAL.st.tag, h('button', { 'aria-label': 'Show every event', on: { click: () => { CAL.st.tag = null; CAL.paint(); } } }, '×')) : null,
      h('button.cal-btn.pri', { title: 'A new event (N)', on: { click: e => { const d = CAL.days().includes(CAL.today()) ? CAL.today() : CAL.days()[0]; const r = e.currentTarget.getBoundingClientRect(); CAL.create({ day: d, start: CAL.snap(Math.min(1380, CAL.nowMin() + 30)), x: r.left - 300, y: r.bottom + 8 }); } } }, '＋ New'));
  },
  ic(k) {
    const P = { l: 'M15 18l-6-6 6-6', r: 'M9 6l6 6-6 6', x: 'M6 6l12 12M18 6 6 18', ck: 'M20 6 9 17l-5-5', bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4', note: 'M7 3h7l5 5v13H7zM14 3v5h5', rep: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' };
    return h('span.cal-i', { html: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[k]}"/></svg>` });
  },
  planner(D) {
    const t = CAL.today(), n = CAL.span(); CAL._vis = new Set(D);
    const heads = D.map(day => { const d = parseDay(day), it = CAL.dayItems(day), mins = it.reduce((a, x) => a + (x.e - x.s), 0);
      return h('button.cal-dh' + (day === t ? '.today' : '') + (day < t ? '.past' : ''), { title: 'Open ' + fmtDayLong(d) + (CAL.st.view === 'day' ? '' : ' as a day'), on: { click: () => CAL.setView('day', day) } },
        h('span.dw', DOW[d.getDay()]), h('span.dn', String(d.getDate())), mins ? h('span.dl', (Math.round(mins / 6) / 10) + ' h') : null); });
    const adc = D.map(day => h('div.cal-adc', { 'data-day': day, on: { click: e => { if (e.target.closest('.cal-ad')) return; const r = e.currentTarget.getBoundingClientRect(); CAL.create({ day, allDay: true, x: r.left, y: r.bottom + 6 }); } } },
      CAL.allDayItems(day).map(CAL.adEl)));
    const sc = h('div.cal-scroll' + (D.length === 1 ? '.one' : ''), { 'data-span': n },
      h('div.cal-top', h('div.cal-row', h('div.cal-gut', D.length > 1 ? 'W' + isoWeekNo(parseDay(D[3] || D[0])) : ''), h('div.cal-cells', heads)),
        h('div.cal-row.cal-adr', h('div.cal-gut', 'all day'), h('div.cal-cells', adc))),
      h('div.cal-body', h('div.cal-times', { 'aria-hidden': 'true' }, Array.from({ length: 23 }, (_, i) => h('span', { style: { top: `calc(var(--hpx) * ${i + 1})` } }, pad(i + 1) + ':00'))),
        h('div.cal-grid', { on: { click: CAL.gridClick, pointerdown: CAL.down } }, D.map(CAL.col))));
    sc._days = D; return sc;
  },
  /** One day's column: the free time, the cards, now. */
  col(day) {
    const list = CAL.dayItems(day), lanes = CAL.lanes(list), t = CAL.today(), runs = CAL.st.agents ? CAL.runsOn(day) : [], rl = CAL.lanes(runs), nl = runs.reduce((m, r) => Math.max(m, rl.get(r.k).n), 0);
    const el = h('div.cal-col' + (day === t ? '.today' : '') + (day < t ? '.past' : '') + (nl ? '.runs' : ''), { 'data-day': day, style: { '--runw': nl ? (nl * 20 + 6) + 'px' : null } }), cin = h('div.cal-cin');
    el.append(cin);
    if (CAL.tn('slots', true) !== false) CAL.frees(list).forEach(([s, e]) => cin.append(h('button.cal-slot', { tabindex: '-1', 'data-s': s, style: { top: `calc(var(--hpx) * ${s / 60} + 2px)`, height: `calc(var(--hpx) * ${(e - s) / 60} - 4px)` }, title: 'Free ' + CAL.hm(s) + '–' + CAL.hm(e) + ' — click to add an event' },
      e - s >= 45 ? h('span', 'Free') : null, e - s >= 30 ? h('b', CAL.dur(e - s)) : null)));
    list.forEach(it => cin.append(CAL.card(it, lanes.get(it.k))));
    runs.forEach(it => el.append(CAL.runEl(it, rl.get(it.k).c)));
    if (day === t) el.append(h('div.cal-now', { style: { top: `calc(var(--hpx) * ${CAL.nowMin() / 60})` } }));
    return el;
  },
  lanes(list) {
    const out = new Map(); let group = [], end = -1;
    const flush = () => { const cols = []; group.forEach(it => { let c = cols.findIndex(e => e <= it.s); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = it.e; out.set(it.k, { c, n: 0 }); }); group.forEach(it => { out.get(it.k).n = cols.length; }); group = []; };
    list.forEach(it => { if (it.s >= end && group.length) flush(); group.push(it); end = Math.max(end, it.e); }); if (group.length) flush(); return out;
  },
  /** The free time between cards (7:00–21:00), and a short one (2 h at most) before the first or after the last. */
  frees(list) {
    const a = 7 * 60, b = 21 * 60, L = list.slice().sort((x, y) => x.s - y.s), out = []; if (!L.length) return out; let t = null;
    L.forEach(it => { if (t != null && it.s - t >= 15) out.push([t, it.s]); t = t == null ? it.e : Math.max(t, it.e); });
    if (L[0].s - a >= 15 && L[0].s - a <= 120) out.unshift([a, L[0].s]); if (b - t >= 15 && b - t <= 120) out.push([t, b]);
    return out.map(([s, e]) => [Math.max(s, a), Math.min(e, b)]).filter(([s, e]) => e - s >= 15);
  },
  card(it, ln = { c: 0, n: 1 }) {
    const c = CAL.colour(it), len = it.e - it.s, short = len * CAL.hpx / 60 < 44, ev = it.ev, w = 100 / ln.n;
    const lk = CAL.st.linkFrom, has = ev && ((ev.then || []).length || CAL.afterOf(ev).length);
    const el = h('div.cal-ec' + (short ? '.short' : '') + (it.rem ? '.rem' : '') + (lk && ev ? (ev.id === lk ? '.linksrc' : '.linkable') : '') + (c.cls ? '.' + c.cls : '') + (CAL.dim(it) ? '.dim' : '') + (ev && !CAL.docOf(it) ? '.nonote' : '') + (ln.n > 1 ? '.conf' : ''),
      { 'data-k': it.k, style: { '--ecol': c.col, color: c.ink || null, top: `calc(var(--hpx) * ${it.s / 60} + 2px)`, height: `max(20px, calc(var(--hpx) * ${len / 60} - 4px))`, left: `calc(${ln.c * w}% + 3px)`, width: `calc(${w}% - 6px)` },
        on: { pointerenter: e => CAL.hovIn(it, e.currentTarget), pointerleave: () => CAL.hovOut() } },
      h('button.ec-main', { 'aria-label': `${it.title}, ${CAL.hm(it.s)}–${CAL.hm(it.e)}${CAL.docOf(it) ? ', opens its note' : ''}`, on: { click: e => { if (CAL._dragged) return; e.stopPropagation(); CAL.open(it); }, keydown: e => { if (e.key === 'e' || e.key === 'E') { e.preventDefault(); CAL.bub(it, el); } } } },
        h('span.ec-time', CAL.hm(it.s) + '–' + CAL.hm(it.e) + (CAL.st.by === 'load' ? ' · ' + CAL.dur(len) : '')), h('span.ec-t', it.title)),
      ev && (ev.tags || []).length && !short ? h('span.ec-tags', ev.tags.map(t => h('button.ec-tag', { title: 'Show only #' + t, on: { pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation(); CAL.st.tag = CAL.st.tag === t ? null : t; CAL.paint(); } } }, '#' + t))) : null,
      !short ? CAL.offLinks(ev, CAL._vis || new Set()) : null,
      h('span.ec-ic', has ? CAL.ic('link') : null, ev && ev.repeat && ev.repeat !== 'none' ? CAL.ic('rep') : null, CAL.docOf(it) ? CAL.ic('note') : null, it.rem ? CAL.ic('bell') : null),
      ln.n > 1 && !short ? h('span.ec-conf', 'Overlaps') : null,
      ev ? h('span.ec-rz', { 'aria-hidden': 'true' }) : null);
    return el;
  },
  adEl(it) {
    const c = CAL.colour(it);
    return h('div.cal-ad' + (it.task ? '.task' : it.rem ? '.rem' : '') + (it.done ? '.done' : '') + (CAL.dim(it) ? '.dim' : ''), { 'data-k': it.k, style: { '--ecol': c.col }, on: it.ev ? { pointerenter: e => CAL.hovIn(it, e.currentTarget), pointerleave: () => CAL.hovOut() } : {} },
      it.task ? h('button.adck', { 'aria-pressed': String(!!it.done), 'aria-label': 'Done: ' + it.title, on: { click: e => { e.stopPropagation(); TASK.toggle(it.task); } } }, it.done ? CAL.ic('ck') : null) : it.rem ? CAL.ic('bell') : null,
      h('button.adm', { title: it.title + (it.time ? ' · ' + it.time : ''), on: { click: e => { e.stopPropagation(); CAL.open(it); } } }, it.time ? h('b', it.time) : null, it.title));
  },

  /* ---------------- V4.58: Month, a day on the side, Agenda ---------------- */
  /** Month: a tile per day; a click on a day (or its number, or "+N more") opens it on the right; Load shows each day's hours. */
  month(D) {
    const t = CAL.today(), a = parseDay(CAL.st.day || t), mo = a.getMonth(), weeks = D.length / 7, load = CAL.st.by === 'load';
    const tileH = (Math.max(480, innerHeight - 170) - 34) / weeks - 10, cap = Math.max(1, Math.floor((tileH - 34) / 23));
    const dows = D.slice(0, 7).map(d => DOW[parseDay(d).getDay()]);
    const rows = []; for (let w = 0; w < weeks; w++) rows.push(h('div.cal-mrow', D.slice(w * 7, w * 7 + 7).map(day => {
      const d = parseDay(day), list = CAL.allDayItems(day).concat(CAL.dayItems(day)), mins = CAL.dayItems(day).filter(x => x.ev).reduce((s, x) => s + (x.e - x.s), 0);
      const sel = CAL.st.mday === day, shown = list.slice(0, list.length > cap ? cap - 1 : cap), more = list.length - shown.length;
      return h('div.cal-tile' + (d.getMonth() !== mo ? '.out' : '') + (day === t ? '.today' : '') + (sel ? '.sel' : ''), { 'data-day': day, on: { click: e => { if (e.target.closest('.cal-mc') || CAL._dragged) return; CAL.side1(day); } } },
        h('div.t-top', h('button.tnum', { 'aria-label': (sel ? 'Close ' : 'Open ') + fmtDayLong(d) + (sel ? '' : ' on the side'), 'aria-pressed': String(sel) }, String(d.getDate())),
          load && mins ? h('span.tld', { title: CAL.dur(mins) + ' planned' }, h('span.tld-b', h('i', { style: { width: Math.min(100, mins / 480 * 100) + '%' } })), h('b', (Math.round(mins / 6) / 10) + ' h')) : null),
        shown.map(it => CAL.mchip(it)),
        more > 0 ? h('button.tmore', { title: 'Open the day on the side' }, '+' + more + ' more') : null);
    })));
    return h('div.cal-mo', { on: { pointerdown: CAL.mdown } }, h('div.cal-moh', dows.map(x => h('span', x))), h('div.cal-mob', rows));
  },
  mchip(it) {
    const c = CAL.colour(it), len = it.ad ? 0 : it.e - it.s;
    return h('button.cal-mc' + (it.ad ? '.ad' : '') + (it.done ? '.done' : '') + (CAL.dim(it) ? '.dim' : '') + (c.cls ? '.' + c.cls : ''), { 'data-k': it.k, style: { '--ecol': c.col }, title: it.title + (it.ad ? ' · all day' : ' · ' + CAL.hm(it.s) + '–' + CAL.hm(it.e) + ' · ' + CAL.dur(len)),
      on: { click: e => { if (CAL._dragged) return; e.stopPropagation(); CAL.open(it); }, pointerenter: e => { if (it.ev) CAL.hovIn(it, e.currentTarget); }, pointerleave: () => CAL.hovOut() } },
      h('i'), it.ad ? null : h('b', CAL.hm(it.s)), h('span', it.title), CAL.st.by === 'load' && len ? h('em.tdur', CAL.dur(len)) : null);
  },
  /** A month chip dragged onto another day: that day, the same time. */
  mdown(e) {
    if (e.button !== 0) return; const chip = e.target.closest('.cal-mc'); if (!chip) return; const it = CAL.find(chip.dataset.k); if (!it || !it.ev) return;
    const x0 = e.clientX, y0 = e.clientY; let moving = false, tgt = null;
    const mv = ev => { if (!moving && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return; if (!moving) { moving = true; CAL.hovOut(true); chip.classList.add('drag'); document.body.classList.add('cal-dragging'); }
      const t = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.classList && x.classList.contains('cal-tile')); $$('.cal-tile.drop').forEach(x => { if (x !== t) x.classList.remove('drop'); }); if (t) t.classList.add('drop'); tgt = t ? t.dataset.day : null; };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); document.body.classList.remove('cal-dragging'); chip.classList.remove('drag'); $$('.cal-tile.drop').forEach(x => x.classList.remove('drop'));
      if (!moving) return; CAL._dragged = true; setTimeout(() => { CAL._dragged = false; }, 0); if (tgt && tgt !== it.day) CAL.moveTo(it, tgt, it.ev.start, it.ev.end, 'Move'); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  side1(day) { CAL.closeAll(); CAL.st.mday = CAL.st.mday === day ? null : day; CAL._scrollTo = 'auto'; CAL.paint(); },
  /** The month's day on the right: that day's planner column — the same scroll and scale, its banner, cards, click-to-create. */
  side(day) {
    const d = parseDay(day), it = CAL.dayItems(day), mins = it.filter(x => x.ev).reduce((s, x) => s + (x.e - x.s), 0), sc = CAL.planner([day]);
    $('.cal-row', sc).remove();   // its name is in the header above
    $('.cal-top', sc).prepend(h('div.ms-h', h('div.ms-d', h('span.dw', DOW[d.getDay()]), h('span.ms-n', fmtDay(d)), h('span.ms-sub', plural(it.length + CAL.allDayItems(day).length, 'item') + (mins ? ' · ' + CAL.dur(mins) + ' planned' : ''))),
      h('button.cal-btn', { on: { click: () => CAL.setView('day', day) } }, 'Open as a day'),
      h('button.cal-ib.sm', { 'aria-label': 'Close the day (Esc)', title: 'Close (Esc)', on: { click: () => { CAL.st.mday = null; CAL.paint(); } } }, CAL.ic('x'))));
    return h('aside.cal-mside', { 'aria-label': fmtDayLong(d) }, sc);
  },
  /** Agenda: the next two weeks as a list, all-day items first each day. */
  agenda(D) {
    const t = CAL.today(), days = D.map(day => ({ day, list: CAL.allDayItems(day).concat(CAL.dayItems(day).concat(CAL.st.agents ? CAL.runsOn(day) : []).sort((a, b) => a.s - b.s)) })).filter(x => x.list.length || x.day === t);
    return h('div.cal-ag', days.length ? days.map(({ day, list }) => { const d = parseDay(day);
      return h('section.ag-day' + (day === t ? '.today' : ''), h('h3.ag-h', h('span.dw', DOW[d.getDay()]), h('b', fmtDay(d)), day === t ? h('span.ag-t', 'today') : null),
        list.length ? list.map(it => { const c = CAL.colour(it), doc = CAL.docOf(it);
          return h('button.ag-r' + (CAL.dim(it) ? '.dim' : '') + (it.done ? '.done' : ''), { 'data-k': it.k, style: { '--ecol': c.col }, on: { click: () => CAL.open(it), pointerenter: e => { if (it.ev) CAL.hovIn(it, e.currentTarget); }, pointerleave: () => CAL.hovOut() } },
            h('span.ag-tm', it.ad ? (it.time || 'all day') : CAL.hm(it.s) + '–' + CAL.hm(it.e)), h('i'), h('span.ag-tt', it.title),
            h('span.ag-k', c.label + (it.ad ? '' : ' · ' + CAL.dur(it.e - it.s))), doc ? h('span.ag-n', CAL.ic('note'), doc.title) : null); }) : h('div.ag-none', 'Nothing planned'));
    }) : h('div.ag-none', 'Nothing in these two weeks.'));
  },

  /* ---------------- V4.59: links between events — what depends on what ---------------- */
  /** An event's `then`: the events that come after it and depend on it. Links join one-off events (a repeat has none). */
  thenOf: ev => (ev.then || []).map(id => DB.get('events', id)).filter(Boolean),
  afterOf: ev => CAL.all().filter(x => (x.then || []).includes(ev.id)),
  /** Everything that depends on it, through any number of links (each once). */
  deps(ev) { const out = [], seen = new Set([ev.id]), q = [ev]; while (q.length) { const x = q.shift(); CAL.thenOf(x).forEach(y => { if (!seen.has(y.id)) { seen.add(y.id); out.push(y); q.push(y); } }); } return out; },
  ab: (day, m) => Math.round(+parseDay(day) / 864e5) * 1440 + m,
  /** Move an event by `d` minutes (an all-day one only by whole days). */
  shift(ev, d) {
    if (!d) return; if (ev.allDay) { if (d % 1440 === 0) ev.day = CAL.addD(ev.day, d / 1440); return; }
    const len = ev.end - ev.start, tot = ev.start + d, dd = Math.floor(tot / 1440), s = tot - dd * 1440; ev.day = CAL.addD(ev.day, dd); ev.start = s; ev.end = Math.min(1440, s + len); ev.modified = isoLocal(new Date());
  },
  /** It ends `d` minutes later: what depends on it moves by as much (later only; moved earlier, they stay). */
  carry(ev, d) { if (!(d > 0)) return []; const L = CAL.deps(ev); L.forEach(x => { CAL.shift(x, d); DB.put('events', x); }); return L; },
  /** Barrier: push it back, and what depends on it by the same; the toast offers Custom… */
  pushBack(ev, d) { DB.beginGroup('Barrier'); CAL.shift(ev, d); DB.put('events', ev); const L = CAL.carry(ev, d); changed(); CAL.carried(ev, d, L, 'Pushed back ' + (d === 1440 ? 'a day' : CAL.dur(d))); },
  carried(ev, d, L, what) {
    if (!L.length) return toast((what || 'Moved') + ' — Ctrl+Z undoes it', 2200);
    CAL.tst((what || 'Moved ' + CAL.dur(d) + ' later') + ': ' + plural(L.length, 'event') + ' that depend' + (L.length === 1 ? 's' : '') + ' on it moved as much', [{ label: 'Custom…', run: () => CAL.custom(ev, d, L) }], 7000);
  },
  /** A toast with buttons. */
  tst(text, acts, ms = 5000) { toast(h('span.cal-tst', text, acts.map(a => h('button', { type: 'button', on: { click: e => { e.currentTarget.closest('.toast').remove(); a.run(); } } }, a.label))), ms); },
  /** Custom…: an amount for each event that depends on it (they moved by `d`; this sets each one's own). */
  custom(ev, d, L) {
    const rows = L.map(x => { const inp = h('input.cw-in', { type: 'number', step: 15, value: d, min: 0, 'aria-label': 'Minutes for ' + x.title, style: { width: '86px' } });
      return { x, inp, el: h('div.cal-cust-r', h('b', x.title), h('span', fmtDay(parseDay(x.day)) + ' ' + CAL.hm(x.start)), inp, h('span.cw-k', 'min'), h('button.cw-d', { type: 'button', on: { click: () => { inp.value = 0; } } }, 'None'), h('button.cw-d', { type: 'button', on: { click: () => { inp.value = d; } } }, 'Same')) }; });
    modal({ title: 'Move what depends on “' + ev.title + '”', body: h('div.cal-cust', h('p.serif', { style: { marginTop: 0 } }, 'It moved ' + CAL.dur(d) + ' later. Set how far each one that depends on it moves (0 keeps it where it was).'), rows.map(r => r.el)),
      actions: [{ label: 'Cancel' }, { label: 'Apply', pri: true, run: () => { DB.beginGroup('Custom move'); rows.forEach(r => { const want = Math.max(0, Math.round(+r.inp.value || 0)); CAL.shift(r.x, want - d); DB.put('events', r.x); }); changed(); toast('Each moved as you set — Ctrl+Z undoes it'); } }] });
  },
  linkStart(ev) { CAL.closeAll(); CAL.st.linkFrom = ev.id; CAL.paint(); },
  linkEnd() { if (!CAL.st.linkFrom) return; CAL.st.linkFrom = null; CAL.paint(); },
  /** The second click of Link → then…: `it` comes after the one the link started from. */
  linkTo(it) {
    const a = DB.get('events', CAL.st.linkFrom), b = it.ev; CAL.st.linkFrom = null;
    if (!a || !b || a.id === b.id) { CAL.paint(); return toast('Choose another event to come after it'); }
    if ((b.repeat && b.repeat !== 'none') || (a.repeat && a.repeat !== 'none')) { CAL.paint(); return toast('Links join one-off events — a repeating one cannot depend on another'); }
    if (CAL.deps(b).some(x => x.id === a.id)) { CAL.paint(); return toast('That would make a loop: “' + a.title + '” already comes after “' + b.title + '”'); }
    if ((a.then || []).includes(b.id)) { CAL.paint(); return toast('Already linked'); }
    DB.beginGroup('Link'); a.then = (a.then || []).concat([b.id]); a.modified = isoLocal(new Date()); DB.put('events', a); changed(); toast('Linked: “' + a.title + '” → then “' + b.title + '”. Pushing it back moves this one too.', 3200);
  },
  unlink(a, b) { DB.beginGroup('Unlink'); a.then = (a.then || []).filter(x => x !== b.id); DB.put('events', a); changed(); },
  /** The links, drawn on a layer above the cards like a note's arrows: lighter, with a soft shadow, where they pass over another card. */
  drawLinks(grid) {
    if (!grid || !grid.isConnected) return; $$(':scope > svg.cal-links', grid).forEach(x => x.remove());
    const G = grid.getBoundingClientRect(), R = el => { const r = el.getBoundingClientRect(); return { x: r.left - G.left, y: r.top - G.top, w: r.width, h: r.height, el }; };
    const cards = $$('.cal-ec', grid).map(R), byK = new Map(cards.map(c => [c.el.dataset.k, c])), S = CAL.st.single, P = [];
    CAL.all().forEach(a => (a.then || []).forEach(bid => { const b = DB.get('events', bid); if (!b) return; const A = byK.get(a.id + '@' + a.day), B = byK.get(b.id + '@' + b.day); if (!A || !B) return; P.push({ a, b, A, B }); }));
    if (!P.length) return;
    const uidL = 'cl' + (CAL._lid = (CAL._lid || 0) + 1); let defs = '', body = '';
    P.forEach((L, i) => {
      const { A, B } = L, same = L.a.docId && L.a.docId === L.b.docId, col = same ? 'var(--teal)' : 'var(--ink-2)';
      let x1, y1, x2, y2, d;
      if (Math.abs((A.x + A.w / 2) - (B.x + B.w / 2)) < Math.max(A.w, B.w) * .6) { x1 = A.x + A.w / 2; x2 = B.x + B.w / 2; if (B.y >= A.y + A.h - 2) { y1 = A.y + A.h; y2 = B.y; } else { y1 = A.y; y2 = B.y + B.h; }
        const k = Math.max(18, Math.abs(y2 - y1) / 2) * Math.sign(y2 - y1 || 1), bow = Math.abs(y2 - y1) < 24 ? 26 : 0; d = `M${x1},${y1} C${x1 + bow},${y1 + k} ${x2 + bow},${y2 - k} ${x2},${y2}`; }
      else { const rt = B.x > A.x; x1 = rt ? A.x + A.w : A.x; y1 = A.y + Math.min(A.h - 6, 14); x2 = rt ? B.x : B.x + B.w; y2 = B.y + Math.min(B.h / 2, 12); const k = Math.max(26, Math.abs(x2 - x1) / 2) * (rt ? 1 : -1); d = `M${x1.toFixed(1)},${y1.toFixed(1)} C${(x1 + k).toFixed(1)},${y1.toFixed(1)} ${(x2 - k).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; }
      const over = cards.filter(c => c !== A && c !== B), mid = `${uidL}m${i}`, cid = `${uidL}c${i}`, aid = `${uidL}a${i}`;
      defs += `<marker id="${aid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:${col}"/></marker>`
        + `<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${G.width}" height="${G.height}"><rect x="0" y="0" width="${G.width}" height="${G.height}" fill="#fff"/>${over.map(c => `<rect x="${(c.x - 1).toFixed(1)}" y="${(c.y - 1).toFixed(1)}" width="${(c.w + 2).toFixed(1)}" height="${(c.h + 2).toFixed(1)}" rx="10" fill="#000"/>`).join('')}</mask>`
        + `<clipPath id="${cid}">${over.map(c => `<rect x="${(c.x - 1).toFixed(1)}" y="${(c.y - 1).toFixed(1)}" width="${(c.w + 2).toFixed(1)}" height="${(c.h + 2).toFixed(1)}" rx="10"/>`).join('')}</clipPath>`;
      const dim = S.length && ![L.a, L.b].some(e => S.includes(CAL.colour({ ev: e, s: e.start, e: e.end }).key));
      body += `<g class="cal-lk${dim ? ' dim' : ''}" data-a="${L.a.id}" data-b="${L.b.id}" style="--lc:${col}"><path class="lk-o" d="${d}" mask="url(#${mid})" marker-end="url(#${aid})"/><g clip-path="url(#${cid})"><path class="lk-v" d="${d}" filter="url(#${uidL}f)"/></g><circle class="lk-c" cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.6"/></g>`;
    });
    defs = `<filter id="${uidL}f" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="2.4" flood-color="#000" flood-opacity=".28"/></filter>` + defs;
    const svg = SV('svg', { class: 'cal-links', width: G.width, height: G.height, viewBox: `0 0 ${G.width} ${G.height}`, 'aria-hidden': 'true' }); svg.innerHTML = '<defs>' + defs + '</defs>' + body; grid.append(svg);
  },
  /** A partner off this view: "then → …" / "after ← …" on the card. */
  offLinks(ev, vis) {
    if (!ev) return null; const t = CAL.thenOf(ev).filter(x => !vis.has(x.day)), a = CAL.afterOf(ev).filter(x => !vis.has(x.day)); if (!t.length && !a.length) return null;
    return h('span.ec-dep', CAL.ic('link'), t.length ? 'then → ' + t.map(x => x.title).join(', ') : 'after ← ' + a.map(x => x.title).join(', '));
  },

  /* ---------------- V4.60: agent runs — a second layer over the calendar ---------------- */
  isRun: ev => !!ev && ev.kind === 'run',
  runsOn(day) { return CAL.all().filter(ev => CAL.isRun(ev) && !ev.allDay && CAL.occurs(ev, day)).map(ev => ({ k: ev.id + '@' + day, ev, day, s: ev.start, e: Math.max(ev.start + 15, ev.end), title: ev.title, run: true })).sort((a, b) => a.s - b.s); },
  /** planned (before its start) · running · done (past its end, or marked done). */
  runSt(it) { const r = it.ev.run || {}; if (r.done) return 'done'; const now = CAL.ab(CAL.today(), CAL.nowMin()); return now < CAL.ab(it.day, it.s) ? 'planned' : now < CAL.ab(it.day, it.e) ? 'running' : 'done'; },
  /** Your events while it runs: the double dipping. */
  along(it) { return CAL.dayItems(it.day).filter(x => x.ev && x.s < it.e && x.e > it.s); },
  alongMin(it) { const iv = CAL.along(it).map(x => [Math.max(x.s, it.s), Math.min(x.e, it.e)]).sort((a, b) => a[0] - b[0]); let m = 0, cs = -1, ce = -1; iv.forEach(([a, b]) => { if (a > ce) { if (ce > cs) m += ce - cs; cs = a; ce = b; } else ce = Math.max(ce, b); }); if (ce > cs) m += ce - cs; return m; },
  tally(D) { let all = 0, al = 0, n = 0; D.forEach(day => CAL.runsOn(day).forEach(it => { n++; all += it.e - it.s; al += CAL.alongMin(it); })); return { all, al, n }; },
  hrs: m => (Math.round(m / 6) / 10) + ' h',
  /** A run: a thin line from its planned start to its planned end, its title written along it; electrons flow down it while it runs. */
  runEl(it, lane) {
    const st = CAL.runSt(it), len = it.e - it.s, S = CAL.st.single, dim = S.length && !CAL.along(it).some(x => S.includes(CAL.colour(x).key)), still = CAL.tn('electrons', true) === false;
    const el = h('button.cal-run.' + st + (still ? '.still' : '') + (dim ? '.dim' : ''), { type: 'button', 'data-k': it.k, 'data-run': '1', style: { top: `calc(var(--hpx) * ${it.s / 60} + 2px)`, height: `calc(var(--hpx) * ${len / 60} - 4px)`, right: (3 + lane * 20) + 'px', '--dur': clamp(len / 60 * 1.3, 2.2, 6).toFixed(1) + 's' },
      'aria-label': 'Agent run: ' + it.title + ', ' + CAL.hm(it.s) + '–' + CAL.hm(it.e) + ', ' + st, on: { click: e => { e.stopPropagation(); CAL.open(it); }, pointerenter: e => CAL.hovIn(it, e.currentTarget), pointerleave: () => CAL.hovOut() } },
      h('span.rt', it.title), h('span.rl'), [18, 50, 82].map((p, i) => h('span.re', { style: { top: p + '%', animationDelay: (-i * clamp(len / 60 * 1.3, 2.2, 6) / 3).toFixed(2) + 's' } })));
    return el;
  },
  /** The card a run opens in place: what it did, what it ran alongside, its output. */
  runFill(b, it, ev) {
    const day = it.day, cur = { k: ev.id + '@' + day, ev, day, s: ev.start, e: Math.max(ev.start + 15, ev.end), title: ev.title }, st = CAL.runSt(cur), al = CAL.along(cur), r = ev.run || {};
    const upd = (f, label) => { f(ev); CAL.save(ev, label); setTimeout(() => CAL.bubFill(), 0); };
    const nud = (ds, de) => upd(x => { const len = x.end - x.start; x.start = clamp(x.start + ds, 0, 1440 - Math.max(15, len + de)); x.end = clamp(x.start + len + de, x.start + 15, 1440); }, 'Time');
    const did = h('textarea.cw-in.bub-did', { rows: 3, placeholder: 'What it did, what it found…', 'aria-label': 'What it did', on: { change: e => upd(x => { x.run = Object.assign({}, x.run, { did: e.target.value }); }, 'What it did') } }); did.value = r.did || '';
    const note = CAL.notePick(() => ev.docId, id => upd(x => { x.docId = id; }, 'Output'), 'Output');
    b.classList.add('run');
    b.replaceChildren(
      h('div.bub-top.run', h('input.bub-title', { value: ev.title, 'aria-label': 'Title', on: { change: e => upd(x => { x.title = e.target.value.trim() || x.title; }, 'Title'), keydown: e => { if (e.key === 'Enter') e.target.blur(); } } }),
        h('span.bub-when', 'Agent run · ' + fmtDayLong(parseDay(day)) + ' · ' + CAL.hm(ev.start) + '–' + CAL.hm(ev.end) + ' · ' + { planned: 'planned', running: 'running now', done: 'done' }[st])),
      h('div.bub-r', h('span.cw-k', 'Time'), h('div.bub-st', h('button.cw-d', { type: 'button', on: { click: () => nud(-15, 0) } }, '−15'), h('b', CAL.hm(ev.start)), h('button.cw-d', { type: 'button', on: { click: () => nud(15, 0) } }, '+15'))),
      h('div.bub-r', h('span.cw-k', 'Length'), h('div.bub-st', h('button.cw-d', { type: 'button', on: { click: () => nud(0, -15) } }, '−15'), h('b', CAL.dur(ev.end - ev.start)), h('button.cw-d', { type: 'button', on: { click: () => nud(0, 15) } }, '+15'))),
      h('div.bub-r.top', h('span.cw-k', 'While'), h('div.bub-al', al.length ? [h('b.agdip', '2×'), h('span', ' alongside ' + al.map(x => x.title).join(', ') + ' — ' + CAL.dur(CAL.alongMin(cur)) + ' of it double dipped')] : h('span', 'On its own — nothing of yours alongside it'))),
      h('div.bub-r.top', h('span.cw-k', 'Did'), did),
      note.el,
      h('div.bub-f', h('button.cal-btn', { type: 'button', on: { click: () => CAL.open(cur) } }, ev.docId ? 'Open its output' : 'Make its output note'),
        h('span.cal-sp'),
        h('button.cal-btn', { type: 'button', on: { click: () => upd(x => { x.run = Object.assign({}, x.run, { done: !(x.run && x.run.done) }); }, 'Done') } }, r.done ? 'Not done' : 'Mark done'),
        h('button.cal-btn.danger', { type: 'button', on: { click: () => { CAL.closeBub(); DB.beginGroup('Delete run'); DB.del('events', ev.id); changed(); toast('Run deleted — Ctrl+Z undoes it'); } } }, 'Delete')));
  },
  toggleAgents() { CAL.st.agents = !CAL.st.agents; CAL.keep(); CAL.closeAll(); CAL.paint(); },

  /* ---------------- gestures ---------------- */
  minAt(colEl, y) { const r = colEl.getBoundingClientRect(); return clamp((y - r.top) / CAL.hpx * 60, 0, 1440); },
  colAt(x, y) { const els = document.elementsFromPoint(x, y); return els.find(e => e.classList && e.classList.contains('cal-col')) || null; },
  gridClick(e) {
    if (CAL._swallow || CAL._dragged) { CAL._swallow = false; return; }
    if (CAL.st.linkFrom) { if (!e.target.closest('.cal-ec')) CAL.linkEnd(); return; }
    if (e.target.closest('.cal-ec, .cal-run')) return;
    const col = e.target.closest('.cal-col'); if (!col) return;
    const m = Math.min(1425, Math.floor(CAL.minAt(col, e.clientY) / 15) * 15);
    CAL.create({ day: col.dataset.day, start: m, x: e.clientX, y: e.clientY });
  },
  down(e) {
    if (e.button !== 0) return; const card = e.target.closest('.cal-ec'); if (!card) return;
    const it = CAL.find(card.dataset.k); if (!it || !it.ev) return;
    const rz = !!e.target.closest('.ec-rz'), col = card.closest('.cal-col'), x0 = e.clientX, y0 = e.clientY, grab = CAL.minAt(col, y0) - it.s;
    let moving = false, ghost = null, tgt = null;
    const mv = ev => {
      if (!moving && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      if (!moving) { moving = true; CAL.hovOut(true); card.classList.add('drag'); document.body.classList.add('cal-dragging'); }
      const c = rz ? col : CAL.colAt(ev.clientX, ev.clientY) || col; let s = it.s, en = it.e;
      if (rz) en = Math.max(it.s + 15, Math.min(1440, CAL.snap(CAL.minAt(col, ev.clientY))));
      else { s = clamp(CAL.snap(CAL.minAt(c, ev.clientY) - grab), 0, 1440 - (it.e - it.s)); en = s + (it.e - it.s); }
      tgt = { day: c.dataset.day, s, e: en };
      const host = $('.cal-cin', c) || c; if (!ghost || ghost.parentNode !== host) { if (ghost) ghost.remove(); ghost = h('div.cal-ghost'); host.append(ghost); }
      ghost.style.top = `calc(var(--hpx) * ${s / 60} + 2px)`; ghost.style.height = `calc(var(--hpx) * ${(en - s) / 60} - 4px)`; ghost.textContent = CAL.hm(s) + '–' + CAL.hm(en);
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); document.body.classList.remove('cal-dragging');
      if (ghost) ghost.remove(); card.classList.remove('drag'); if (!moving || !tgt) return;
      CAL._dragged = true; setTimeout(() => { CAL._dragged = false; }, 0);
      if (tgt.day === it.day && tgt.s === it.s && tgt.e === it.e) return;
      CAL.moveTo(it, tgt.day, tgt.s, tgt.e, rz ? 'Length' : 'Move');
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  /** Move one occurrence: a one-off moves; one of a repeat leaves the series (the series skips that day). */
  moveTo(it, day, s, e, label) {
    const ev = it.ev; DB.beginGroup(label);
    if (ev.repeat && ev.repeat !== 'none') {
      const copy = CAL.make(Object.assign(JSON.parse(JSON.stringify(ev)), { id: uid('ev'), day, start: s, end: e, repeat: 'none', skip: [], until: null, from: ev.id, created: isoLocal(new Date()) }));
      ev.skip = (ev.skip || []).concat([it.day]); ev.modified = isoLocal(new Date()); DB.put('events', ev); DB.put('events', copy); changed(); toast('Moved this one; the others stay — Ctrl+Z undoes it', 2600); return;
    }
    const was = CAL.ab(ev.day, ev.end); Object.assign(ev, { day, start: s, end: e, modified: isoLocal(new Date()) }); DB.put('events', ev);
    const d = CAL.ab(day, e) - was, L = CAL.carry(ev, d); changed(); if (L.length) CAL.carried(ev, d, L);
  },
  find(k) { if (!k) return null; const day = k.split('@')[1]; const L = day ? CAL.dayItems(day).concat(CAL.allDayItems(day), CAL.runsOn(day)) : CAL.days().flatMap(CAL.allDayItems); return L.find(x => x.k === k) || null; },

  /* ---------------- opening ---------------- */
  /** A click: its note — or a note made for it and linked (a meeting note, an experiment's first stage, a quick note). */
  open(it) {
    if (CAL.st.linkFrom) return CAL.linkTo(it);
    CAL.closeAll();
    if (it.task) return App.openBlock(it.task.id);
    if (it.rem) { if (it.rem.kind === 'meeting' && REM.meetingNote) return REM.meetingNote(it.rem, it.at); return REM.edit({ id: it.rem.id }); }
    const ev = it.ev, d = CAL.docOf(it), rep = ev.repeat && ev.repeat !== 'none';
    const mine = rep ? (ev.notes || {})[it.day] : null, md = mine && M.doc(mine);
    if (md && !md.deleted) return App.go('#/doc/' + md.id);
    if (d && !rep) return App.go('#/doc/' + d.id);
    const link = doc => { DB.beginGroup('Note for ' + ev.title); if (rep) { ev.notes = Object.assign({}, ev.notes, { [it.day]: doc.id }); } else ev.docId = doc.id; doc.eventId = ev.id; DB.put('documents', doc); ev.modified = isoLocal(new Date()); DB.put('events', ev); changed(); };
    const theme = pid => (DB.where('themes', t => t.projectId === pid && t.status === 'active')[0] || {}).id || null;
    const kind = ev.kind, title = ev.title, pid = ev.projectId;
    if (kind === 'experiment' && typeof CHAIN !== 'undefined') {
      if (pid) { const doc = CHAIN.create({ projectId: pid, themeId: theme(pid), name: title, date: it.day }); link(doc); toast('An experiment for “' + title + '”, at ' + (prof(doc.type) || {}).label + ' — Ctrl+Z undoes it', 2800); return App.go('#/doc/' + doc.id); }
      return App.newDoc({ type: CHAIN.firstType(), title, date: it.day, onCreate: doc => { doc.chain = doc.id; doc.chainName = title; link(doc); } });
    }
    const type = kind === 'meeting' ? 'meeting' : 'note', tpl = M.enabledTemplates(type)[0], ttl = kind === 'meeting' ? title + ' — ' + fmtDay(parseDay(it.day)) : kind === 'run' ? title + ' — agent run' : title;
    if (pid) { const doc = M.createDoc({ type, projectId: pid, themeId: theme(pid), title: ttl, templateId: tpl ? tpl.id : null, date: it.day }); link(doc); toast((kind === 'meeting' ? 'A meeting note' : 'A note') + ' for “' + title + '” — Ctrl+Z undoes it', 2600); return App.go('#/doc/' + doc.id); }
    App.newDoc({ type, title: ttl, date: it.day, onCreate: link });
  },

  /* ---------------- the create window ---------------- */
  create(o) {
    CAL.closeAll(); const by = CAL.st.by, P = CAL.PAL;
    const st = { title: '', day: o.day || CAL.today(), s: o.start != null ? o.start : 540, e: null, allDay: !!o.allDay, kind: 'other', projectId: null, tag: '', docId: null };
    st.e = Math.min(1440, st.s + 60);
    const win = h('div.cal-cw', { role: 'dialog', 'aria-label': 'A new event' });
    const ti = h('input.cw-title', { placeholder: 'What is it?', 'aria-label': 'Title', autocomplete: 'off' });
    const dayI = h('input.cw-in', { type: 'date', value: st.day, 'aria-label': 'Day', on: { change: e => { if (e.target.value) st.day = e.target.value; when(); } } });
    const sI = h('input.cw-in', { type: 'time', step: 900, value: CAL.hm(st.s), 'aria-label': 'Start', on: { change: e => { const m = CAL.pm(e.target.value); if (m == null) return; const len = st.e - st.s; st.s = m; st.e = Math.min(1440, m + len); eI.value = CAL.hm(st.e % 1440); when(); } } });
    const eI = h('input.cw-in', { type: 'time', step: 900, value: CAL.hm(st.e % 1440), 'aria-label': 'End', on: { change: e => { let m = CAL.pm(e.target.value); if (m == null) return; if (m === 0) m = 1440; st.e = Math.max(st.s + 15, m); when(); } } });
    const wh = h('span.cw-when'); const when = () => { wh.textContent = fmtDayLong(parseDay(st.day)) + (st.allDay ? ' · all day' : ' · ' + CAL.hm(st.s) + '–' + CAL.hm(st.e) + ' · ' + CAL.dur(st.e - st.s)); durs.forEach(b => b.classList.toggle('on', st.e - st.s === +b.dataset.m)); tr.hidden = st.allDay; };
    const durs = [[30, '30 min'], [60, '1 h'], [120, '2 h']].map(([m, l]) => h('button.cw-d', { type: 'button', 'data-m': m, on: { click: () => { st.e = Math.min(1440, st.s + m); eI.value = CAL.hm(st.e % 1440); when(); } } }, l));
    const adB = h('label.cw-ad', h('input', { type: 'checkbox', checked: st.allDay, on: { change: e => { st.allDay = e.target.checked; when(); } } }), 'All day');
    const tr = h('div.cw-r', h('span.cw-k', 'Time'), h('div.cw-tm', h('div.cw-times', sI, h('span', '–'), eI), h('div.cw-durs', durs)));
    // the sort type: whatever Colour by is set to (a kind for Note type and Load, which the note and the length decide)
    const chips = (vals, cur, set) => h('div.cw-chips', vals.map(([v, l, col]) => h('button.cw-c' + (cur() === v ? '.on' : ''), { type: 'button', style: { '--ecol': col }, on: { click: e => { set(v); $$('.cw-c', e.currentTarget.parentNode).forEach(b => b.classList.toggle('on', b === e.currentTarget)); } } }, h('i'), l)));
    let sort;
    if (by === 'project') { const ord = CAL.projOrder(); sort = h('div.cw-r.top', h('span.cw-k', 'Project'), chips([['', 'None', P.slate]].concat(ord.slice(0, 8).map((id, i) => [id, (M.project(id) || {}).name || '?', P[CAL.ORDER[i]] || P.slate])), () => st.projectId || '', v => { st.projectId = v || null; })); }
    else if (by === 'tag') { const tg = h('input.cw-in', { placeholder: '#tag', 'aria-label': 'Tag', list: 'cal-tags', on: { input: e => { st.tag = e.target.value.replace(/^#/, '').trim(); } } }); sort = h('div.cw-r', h('span.cw-k', 'Tag'), h('div', tg, h('datalist#cal-tags', CAL.tagOrder().map(t => h('option', { value: t }))))); }
    else sort = h('div.cw-r.top', h('span.cw-k', 'Kind'), chips(Object.entries(CAL.KINDS).map(([k, o]) => [k, o.label, P[o.c]]), () => st.kind, v => { st.kind = v; }));
    const note = CAL.notePick(() => st.docId, id => { st.docId = id; });
    const typ = CAL.st.agents ? h('div.cal-seg.cw-type', { role: 'group', 'aria-label': 'What it is' }, [['ev', 'Event'], ['run', 'Agent run']].map(([k, l]) => h('button' + (k === 'ev' ? '.on' : ''), { type: 'button', on: { click: e => { st.run = k === 'run'; $$('button', typ).forEach(x => x.classList.toggle('on', x === e.currentTarget)); sort.hidden = st.run; adB.hidden = st.run; if (st.run) { st.allDay = false; $('input', adB).checked = false; when(); } } } }, l))) : null;
    const go = () => {
      const ev = CAL.make({ title: ti.value, day: st.day, start: st.allDay ? 0 : st.s, end: st.allDay ? 0 : st.e, allDay: st.allDay, kind: st.run ? 'run' : st.kind, projectId: st.projectId || (st.docId && (M.doc(st.docId) || {}).projectId) || null, tags: st.tag ? [st.tag] : [], docId: st.docId });
      if (st.allDay) ev.end = 0; if (st.run) ev.run = { did: '', done: false }; CAL.close(); DB.beginGroup('New event'); DB.put('events', ev); changed(); toast('“' + ev.title + '” added — Ctrl+Z undoes it', 2200);
    };
    win.append(h('div.cw-h', h('b', 'New event'), wh, h('button.cal-ib.sm', { type: 'button', 'aria-label': 'Cancel (Esc)', on: { click: () => CAL.close() } }, CAL.ic('x'))),
      typ, ti, h('div.cw-r', h('span.cw-k', 'Day'), h('div.cw-dayr', dayI, adB)), tr, sort, note.el,
      h('div.cw-f', h('span.cw-hint', 'Enter adds · Esc cancels'), h('button.cal-btn.pri', { type: 'button', on: { click: go } }, 'Create')));
    win.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); CAL.close(); } else if (e.key === 'Enter' && !e.target.closest('.cw-np') && e.target.tagName !== 'BUTTON') { e.preventDefault(); go(); } });
    win.addEventListener('mousedown', e => e.stopPropagation());
    document.body.append(win); when();
    const r = win.getBoundingClientRect(); win.style.left = clamp((o.x || 200) + 14, 8, innerWidth - r.width - 8) + 'px'; win.style.top = clamp((o.y || 120) - 24, 8, innerHeight - r.height - 8) + 'px';
    CAL.cw = win; setTimeout(() => ti.focus(), 20);
    if (o.day) { const g = $(`.cal-col[data-day="${o.day}"]`, CAL.root || document); if (g && !st.allDay) { const dr = h('div.cal-draft', { style: { top: `calc(var(--hpx) * ${st.s / 60} + 2px)`, height: `calc(var(--hpx) * 1 - 4px)` } }); ($('.cal-cin', g) || g).append(dr); win._draft = dr; } }
  },
  /** A note to link: type to find one; its chip, × unlinks. */
  notePick(get, set, label = 'Note') {
    const q = h('input.cw-in', { placeholder: 'Link a note (optional)', 'aria-label': 'Link a note', autocomplete: 'off' }), list = h('div.cw-nl'), chip = h('div.cw-nc');
    const draw = () => { const id = get(), d = id && M.doc(id); chip.replaceChildren(d ? [h('span', CAL.ic('note'), d.title), h('button', { type: 'button', 'aria-label': 'Unlink', on: { click: () => { set(null); draw(); } } }, '×')] : []); q.hidden = !!d; chip.hidden = !d; };
    const find = () => { const s = q.value.trim().toLowerCase(); if (!s) return list.replaceChildren();
      const ds = DB.where('documents', d => !d.deleted && !d.archived && d.type !== 'day' && String(d.title || '').toLowerCase().includes(s)).sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || ''))).slice(0, 6);
      list.replaceChildren(ds.length ? ds.map(d => h('button.cw-np', { type: 'button', on: { click: () => { set(d.id); q.value = ''; list.replaceChildren(); draw(); } } }, h('b', d.title), h('span', M.docPath ? M.docPath(d) : ''))) : h('span.cw-none', 'No note by that name')); };
    q.addEventListener('input', find); q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('.cw-np', list); if (b) { e.preventDefault(); e.stopPropagation(); b.click(); } } });
    draw(); return { el: h('div.cw-r.top', h('span.cw-k', label), h('div.cw-note', chip, q, list)), draw };
  },

  /* ---------------- rest on a card: it opens in place ---------------- */
  hovIn(it, el) { if (document.body.classList.contains('cal-dragging') || CAL.cw) return; clearTimeout(CAL._ho); clearTimeout(CAL._hc); if (CAL.bubEl && CAL.bubEl._k === it.k) return; CAL._ho = setTimeout(() => { if (el.isConnected && el.matches(':hover')) CAL.bub(it, el); }, 950); },
  hovOut(now) { clearTimeout(CAL._ho); if (!CAL.bubEl) return; if (now) return CAL.closeBub(); clearTimeout(CAL._hc); CAL._hc = setTimeout(() => { const b = CAL.bubEl; if (b && !b.matches(':hover') && !b.contains(document.activeElement)) CAL.closeBub(); }, 320); },
  closeBub() { clearTimeout(CAL._hc); if (CAL.bubEl) { CAL.bubEl.remove(); CAL.bubEl = null; } },
  bub(it, el) {
    if (!it.ev) return; CAL.closeBub(); const r = el.getBoundingClientRect();
    const b = h('div.cal-bub', { role: 'dialog', 'aria-label': it.title, on: { pointerleave: () => CAL.hovOut(), pointerenter: () => clearTimeout(CAL._hc), mousedown: e => e.stopPropagation() } }); b._k = it.k; b._it = it;
    b.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); CAL.closeBub(); } });
    document.body.append(b); CAL.bubEl = b; CAL.bubFill(); const w = Math.max(r.width, 300), bh = b.offsetHeight;
    b.style.width = w + 'px'; b.style.left = clamp(r.left, 8, innerWidth - w - 8) + 'px'; b.style.top = clamp(r.top, 8, innerHeight - bh - 8) + 'px';
  },
  bubFill() {
    const b = CAL.bubEl; if (!b) return; const it = CAL.find(b._k) || b._it, ev = it.ev && CAL.all().find(x => x.id === it.ev.id); if (!ev) return CAL.closeBub();
    if (CAL.isRun(ev)) return CAL.runFill(b, it, ev);
    const c = CAL.colour(it), P = CAL.PAL, rep = ev.repeat && ev.repeat !== 'none';
    const upd = (f, label) => { f(ev); CAL.save(ev, label); setTimeout(() => CAL.bubFill(), 0); };
    const nud = (ds, de) => { if (ev.allDay) return; const was = CAL.ab(ev.day, ev.end), len = ev.end - ev.start; DB.beginGroup('Time');
      ev.start = clamp(ev.start + ds, 0, 1440 - Math.max(15, len + de)); ev.end = clamp(ev.start + len + de, ev.start + 15, 1440); ev.modified = isoLocal(new Date()); DB.put('events', ev);
      const d = CAL.ab(ev.day, ev.end) - was, L = CAL.carry(ev, d); changed(); if (L.length) CAL.carried(ev, d, L); setTimeout(() => CAL.bubFill(), 0); };
    const ti = h('input.bub-title', { value: ev.title, 'aria-label': 'Title', on: { change: e => upd(x => { x.title = e.target.value.trim() || x.title; }, 'Title'), keydown: e => { if (e.key === 'Enter') e.target.blur(); } } });
    const tagI = h('input.bub-tagin', { placeholder: '+ tag', 'aria-label': 'Add a tag', on: { keydown: e => { if (e.key === 'Enter') { const t = e.target.value.replace(/^#/, '').trim(); if (t) upd(x => { x.tags = [...new Set((x.tags || []).concat([t]))]; }, 'Tag'); } } } });
    const note = CAL.notePick(() => ev.docId, id => upd(x => { x.docId = id; if (id && !x.projectId) x.projectId = (M.doc(id) || {}).projectId || null; }, 'Note'));
    b.replaceChildren(
      h('div.bub-top', { style: { '--ecol': c.col, color: c.ink || null } }, ti, h('span.bub-when', fmtDayLong(parseDay(it.day)) + (ev.allDay ? ' · all day' : ' · ' + CAL.hm(ev.start) + '–' + CAL.hm(ev.end)))),
      ev.allDay ? null : h('div.bub-r', h('span.cw-k', 'Time'), h('div.bub-st', h('button.cw-d', { type: 'button', on: { click: () => nud(-15, 0) } }, '−15'), h('b', CAL.hm(ev.start)), h('button.cw-d', { type: 'button', on: { click: () => nud(15, 0) } }, '+15'))),
      ev.allDay ? null : h('div.bub-r', h('span.cw-k', 'Length'), h('div.bub-st', h('button.cw-d', { type: 'button', on: { click: () => nud(0, -15) } }, '−15'), h('b', CAL.dur(ev.end - ev.start)), h('button.cw-d', { type: 'button', on: { click: () => nud(0, 15) } }, '+15'))),
      h('div.bub-r', h('span.cw-k', 'Kind'), h('div.cw-chips', Object.entries(CAL.KINDS).map(([k, o]) => h('button.cw-c' + (ev.kind === k ? '.on' : ''), { type: 'button', style: { '--ecol': P[o.c] }, on: { click: () => upd(x => { x.kind = k; }, 'Kind') } }, h('i'), o.label)))),
      h('div.bub-r', h('span.cw-k', 'Tags'), h('div.bub-tags', (ev.tags || []).map(t => h('span.bub-tag', '#' + t, h('button', { type: 'button', 'aria-label': 'Take off #' + t, on: { click: () => upd(x => { x.tags = (x.tags || []).filter(y => y !== t); }, 'Tag') } }, '×'))), tagI)),
      h('div.bub-r', h('span.cw-k', 'Project'), h('select.cw-in', { 'aria-label': 'Project', on: { change: e => upd(x => { x.projectId = e.target.value || null; }, 'Project') } }, h('option', { value: '' }, 'None'), DB.all('projects').map(p => h('option', { value: p.id, selected: ev.projectId === p.id }, p.name)))),
      note.el,
      h('div.bub-r', h('span.cw-k', 'Repeat'), h('select.cw-in', { 'aria-label': 'Repeat', on: { change: e => upd(x => { x.repeat = e.target.value; }, 'Repeat') } }, [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week']].map(([k, l]) => h('option', { value: k, selected: (ev.repeat || 'none') === k }, l)))),
      rep ? h('div.bub-note', 'Changes here change every one; dragging moves only this one. Links join one-off events.') : null,
      !rep && !ev.allDay ? h('div.bub-r', h('span.cw-k', 'Barrier'), h('div.cw-chips', [[30, '+30 min'], [60, '+1 h'], [120, '+2 h'], [1440, '+1 day']].map(([m, l]) => h('button.cw-d', { type: 'button', title: 'Push it back ' + l.slice(1) + ', and what depends on it as much', on: { click: () => { CAL.pushBack(ev, m); setTimeout(() => CAL.bubFill(), 0); } } }, l)))) : null,
      !rep ? h('div.bub-r.top', h('span.cw-k', 'Links'), h('div.bub-links',
        CAL.afterOf(ev).map(a => h('span.bub-lk', h('em', '← after'), a.title, h('button', { type: 'button', 'aria-label': 'Unlink ' + a.title, on: { click: () => { CAL.unlink(a, ev); setTimeout(() => CAL.bubFill(), 0); } } }, '×'))),
        CAL.thenOf(ev).map(b => h('span.bub-lk', h('em', 'then →'), b.title, h('button', { type: 'button', 'aria-label': 'Unlink ' + b.title, on: { click: () => { CAL.unlink(ev, b); setTimeout(() => CAL.bubFill(), 0); } } }, '×'))),
        h('button.cw-d', { type: 'button', title: 'Then click the event that comes after it', on: { click: () => CAL.linkStart(ev) } }, CAL.ic('link'), 'Link → then…'))) : null,
      h('div.bub-f', h('button.cal-btn', { type: 'button', on: { click: () => CAL.open(it) } }, CAL.docOf(it) ? 'Open its note' : 'Make its note'),
        h('span.cal-sp'),
        h('button.cal-btn', { type: 'button', on: { click: () => { const cp = CAL.make(Object.assign(JSON.parse(JSON.stringify(ev)), { id: uid('ev'), day: it.day, repeat: 'none', skip: [], notes: null, docId: null, created: isoLocal(new Date()) })); DB.beginGroup('Duplicate'); DB.put('events', cp); changed(); CAL.closeBub(); toast('Duplicated'); } } }, 'Duplicate'),
        rep ? h('button.cal-btn', { type: 'button', on: { click: () => { CAL.closeBub(); ev.skip = (ev.skip || []).concat([it.day]); CAL.save(ev, 'Delete one'); toast('This one deleted — Ctrl+Z undoes it'); } } }, 'Delete this one') : null,
        h('button.cal-btn.danger', { type: 'button', on: { click: () => { CAL.closeBub(); DB.beginGroup('Delete event'); DB.del('events', ev.id); changed(); toast((rep ? 'Every one deleted' : 'Deleted') + ' — Ctrl+Z undoes it'); } } }, rep ? 'Delete every one' : 'Delete')));
  },
  close() { if (CAL.cw) { if (CAL.cw._draft) CAL.cw._draft.remove(); CAL.cw.remove(); CAL.cw = null; } },
  closeAll() { CAL.close(); CAL.closeBub(); },
  key(e) {
    if (App.route.name !== 'calendar' || e.ctrlKey || e.metaKey || e.altKey || $('.ovl')) return;
    const t = e.target; if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('.cal-cw, .cal-bub'))) return;
    const k = e.key.toLowerCase(), act = { arrowleft: () => CAL.step(-1), arrowright: () => CAL.step(1), t: () => { CAL.st.day = null; CAL._scrollTo = 'auto'; CAL.paint(); }, d: () => CAL.setView('day', CAL.days().includes(CAL.today()) ? CAL.today() : CAL.days()[0]), w: () => CAL.setView('week'), m: () => CAL.setView('month'), a: () => CAL.setView('agenda'), g: () => CAL.toggleAgents(),
      escape: () => { if (CAL.st.linkFrom) return CAL.linkEnd(); CAL.st.mday = null; CAL.paint(); },
      n: () => { const d = CAL.days().includes(CAL.today()) ? CAL.today() : CAL.days()[0]; CAL.create({ day: d, start: CAL.snap(Math.min(1380, CAL.nowMin() + 30)), x: innerWidth / 2 - 170, y: 140 }); } }[k];
    if (act) { if (k === 'escape' && !CAL.st.linkFrom && !(CAL.st.view === 'month' && CAL.st.mday)) return; e.preventDefault(); act(); }
  },
  /** For Settings' preview: a two-day planner in miniature. */
  preview() {
    const P = CAL.PAL, n = CAL.span(), slots = CAL.tn('slots', true) !== false, cards = [[0, 9, 10.5, 'Run 4 · seed', P.teal], [0, 11, 12, 'Lab meeting', P.blue], [1, 9.5, 10, 'Order media', P.slate], [1, 13, 15.5, 'Image beads', P.teal]];
    const hp = 150 / n;
    return [h('div.pv-cal', h('div.pv-cal-h', h('span'), h('b', 'Mon 16'), h('b.today', 'Tue 17')),
      h('div.pv-cal-b', h('div.pv-cal-t', [8, 10, 12, 14].map(x => h('span', { style: { top: (x - 8) * hp + 'px' } }, x + ':00'))),
        [0, 1].map(c => h('div.pv-cal-c', slots ? h('i.pv-slot', { style: { top: (c ? 10.25 - 8 : 10.75 - 8) * hp + 'px', height: (c ? 2.5 : 0.25) * hp + 'px' } }) : null,
          cards.filter(x => x[0] === c).map(([, s, e, t, col]) => h('div.pv-ec', { style: { top: (s - 8) * hp + 2 + 'px', height: Math.max(14, (e - s) * hp - 4) + 'px', background: col } }, t)),
          c === 1 ? h('i.pv-run', { style: { top: (9 - 8) * hp + 'px', height: 3 * hp + 'px' } }, h('span', 'Digest papers'), CAL.tn('electrons', true) !== false ? [h('b', { style: { top: '30%' } }), h('b', { style: { top: '65%' } })] : null) : null,
          c === 1 ? h('i.pv-now', { style: { top: (10.6 - 8) * hp + 'px' } }) : null)))),
      PV.cap(n + ' hours fill the height; the rest scrolls. ' + (slots ? 'Free time between events shows dashed (7:00–21:00); a click adds an event there.' : 'Free time is not drawn; a click on an empty stretch still adds an event.') + ' Weeks start on ' + (CAL.wk0() ? 'Monday' : 'Sunday') + '. With Agent runs on (G), a run is a line beside the day' + (CAL.tn('electrons', true) !== false ? ', electrons flowing down it while it runs.' : '; a running one glows, without electrons.'))];
  },
};
function isoWeekNo(d) { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - y0) / 864e5 + 1) / 7); }

const CalendarView = {
  canvas: true, title: true,
  render() { return CAL.render(); },
  update() { CAL.paint(); },
};
VIEWS.calendar = CalendarView;
{
  // the tab, right before Tasks
  if (!TABS.some(t => t[0] === 'calendar')) { const i = TABS.findIndex(t => t[0] === 'tasks'); TABS.splice(i >= 0 ? i : 1, 0, ['calendar', 'Calendar']); }
  document.addEventListener('keydown', e => { try { CAL.key(e); } catch (er) { console.warn('[calendar] key', er); } });
  document.addEventListener('mousedown', e => { if (CAL.cw && !CAL.cw.contains(e.target)) { CAL._swallow = !!e.target.closest('.cal-grid'); CAL.close(); setTimeout(() => { CAL._swallow = false; }, 400); }
    if (CAL.bubEl && !CAL.bubEl.contains(e.target)) CAL.closeBub(); }, true);
  // now moves: the line, once a minute
  setInterval(() => { if (App.route && App.route.name === 'calendar' && CAL.root && CAL.root.isConnected) { const n = $('.cal-now', CAL.root); if (n) n.style.top = `calc(var(--hpx) * ${CAL.nowMin() / 60})`; } }, 60000);
  // leaving the page closes what floats over it
  addEventListener('hashchange', () => { if (!location.hash.startsWith('#/calendar')) CAL.closeAll(); });
}
