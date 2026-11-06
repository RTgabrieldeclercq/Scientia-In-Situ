/* ==========================================================================
   12 · Shared widgets (heatmap, stat tiles) + Today
   ========================================================================== */
function heatmapEl({ weeks = 5, themeId = null, cell = 14, end = new Date() } = {}) {
  let start = dayStart(end); while (start.getDay() !== 1) start = addDays(start, -1); start = addDays(start, -7 * (weeks - 1));
  const today = localDate(new Date()), grid = h('div.hm', { style: { '--c': cell + 'px' } });
  for (let i = 0; i < weeks * 7; i++) {
    const dd = addDays(start, i), key = localDate(dd), D = IX.day(key), ms = themeId ? (D.byTheme[themeId] || 0) : D.total;
    const fut = +dd > +dayStart(new Date());
    const unm = !fut && ms === 0 && D.edits > 0 && !themeId;
    grid.append(h('i' + (fut ? '.out' : '') + (unm ? '.unm' : '') + (key === today ? '.today' : '') + (!themeId && D.multi > 0 ? '.mt' : ''), { 'data-l': IX.level(ms),
      title: `${fmtDayLong(dd)} · ${ms ? fmtDur(ms) : 'no time recorded'}${unm ? ' · edits but untimed (unmeasured, not empty)' : ''}${!themeId && D.multi ? ' · ' + fmtDur(D.multi) + ' multitask' : ''}${D.open ? ' · open time entry' : ''}` }));
  }
  return h('div.hmwrap', h('div.hmdays', { style: { '--c': cell + 'px' } }, ['M', '', 'W', '', 'F', '', 'S'].map(x => h('span', x))), grid);
}
function legendEl() {
  return h('div.legend', 'Less', [0, 1, 2, 3, 4, 5].map(i => h('i', { style: { background: `var(--hm-${i})` } })), 'More',
    h('i', { style: { marginLeft: '10px', background: 'repeating-linear-gradient(45deg,var(--hm-0) 0 3px,var(--rule-2) 3px 4px)' } }), 'untimed but active',
    h('i', { style: { marginLeft: '10px', background: 'var(--hm-0)', position: 'relative' } }, h('b', { style: { position: 'absolute', right: '1px', top: '1px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--mag)' } })), 'multitask');
}
function tile(n, l, d, kind) { return h('div.tile' + (kind ? '.k' : ''), { style: kind ? { '--kc': `var(--k-${kind})` } : {} }, h('div.n', n), h('div.l', l), d ? h('div.d', d) : null); }
function capped(list, n, render, emptyText) {
  if (!list.length) return h('div.list', h('div.empty', emptyText || 'Nothing here'));
  const box = h('div.list'); let shown = n;
  const draw = () => { box.replaceChildren(...list.slice(0, shown).map(render), ...(list.length > shown ? [h('button.more', { on: { click: () => { shown = list.length; draw(); } } }, `and ${list.length - shown} more`)] : [])); };
  draw(); return box;
}
function itemRow(it, extra) {
  const st = IX.status(it), d = M.doc(it.originDocId);
  return h('div.li.click', { on: { click: () => App.openBlock(it.originBlockId) } }, kchip(it.kind), h('span.t', h('span.serif', snippet(it.text, 110)), h('span.s', (d ? M.docPath(d) : '') + ' · ' + fmtWhen(it.created))),
    st ? h('span.pill' + (st === 'open' ? '.bad' : st === 'resolved' ? '.ok' : ''), st) : null, extra || null);
}

const HomeView = {
  render() {
    const now = new Date(), today = localDate(now), D = IX.day(today);
    // everything written today: stamped today, or written/edited today in any note (an older note, or one dated in the past)
    const blocks = DB.where('blocks', b => b.status !== 'removed' && b.status !== 'superseded' && (localDate(M.blockTime(b)) === today || (b.modified && localDate(b.modified) === today && (b.body.text || '').trim())));
    const when = b => localDate(M.blockTime(b)) === today ? M.blockTime(b) : b.modified;
    const sessToday = DB.all('sessions').filter(s => (s.segments || []).some(g => localDate(g.s) === today || (g.e && localDate(g.e) === today) || (!g.e)));
    const ev = [];
    blocks.forEach(b => { const ks = IX.kindsOf(b), other = localDate(M.blockTime(b)) !== today, isNew = localDate(b.created) === today || other && (M.doc(b.docId) || {}).backdate; ev.push({ t: +new Date(when(b)), kind: ks[0], note: other ? (isNew ? 'entered for ' : 'edited · from ') + fmtDay(M.blockTime(b)) : '', el: h('div', h('div.x', b.kind === 'ref' ? M.blockName(b) : (b.label ? h('b', b.label + ' — ') : null), b.kind === 'ref' ? null : snippet(b.body.text, 120) || h('i.muted', 'empty')), h('div.p', M.docPath(M.doc(b.docId)), ks.length ? ' · ' : '', ks.map(k => kchip(k)), b.stamp.sessionId && !other ? ` · +${fmtDur(b.stamp.offsetMs || 0)} in timer` : '', other ? h('span.pill', (isNew ? 'entered for ' : 'edited · from ') + fmtDay(M.blockTime(b))) : null)), go: () => App.openBlock(b.id) }); });
    sessToday.forEach(s => (s.segments || []).forEach(g => { if (localDate(g.s) !== today) return; const d = M.doc(s.docId); ev.push({ t: +new Date(g.s), sess: true, el: h('div', h('div.x', 'Timer — ', h('b', d ? d.title : '—')), h('div.p', g.e ? `${fmtTime(g.s)}–${fmtTime(g.e)} · ${fmtDur(+new Date(g.e) - +new Date(g.s))}` : 'running since ' + fmtTime(g.s))), go: () => App.go('#/doc/' + s.docId) }); }));
    ev.sort((a, b) => a.t - b.t);
    App.setTitle('Today', [h('span', fmtDayLong(now))]);
    const pend = IX.pendingReviews(), flags = DB.where('flags', f => f.status === 'open'), openB = IX.openBarriers();
    const recent = DB.all('documents').sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, 7);
    return h('div.page',
      h('div.eyebrow', fmtDayLong(now)), h('h1.title', 'Today'),
      DISK.server && !DISK.nb ? h('div.callout.nbwarn', h('b.h', 'Choose a notebook folder'), 'Your work is only in this browser until you pick a folder for it. ', h('a', { href: '#/settings' }, 'Settings → Notebook folder'), ' — then any copy of the app reloads everything from there, and each component is also saved as Markdown.') : null,
      DISK.paused && DISK.error ? h('div.callout.nbwarn', DISK.error) : null,
      h('p.stand', D.total ? `${fmtDur(D.total)} recorded so far${D.multi ? `, ${fmtDur(D.multi)} of it multitasking (counted once)` : ''}. ` : 'No time recorded yet today. ', `${plural(blocks.length, 'component')} written or stamped today.`),
      h('div.row', { style: { marginBottom: '6px' } }, h('button.btn.pri', { on: { click: () => App.newDoc() } }, '+ New note'), h('button.btn', { on: { click: () => Search.open() } }, 'Search ', h('kbd', 'Ctrl K')),
        pend.length ? h('button.btn.mag', { on: { click: () => App.go('#/review/' + pend[pend.length - 1].id) } }, `◇ ${plural(pend.length, 'weekly review')} waiting`) : null),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '28px', alignItems: 'start' } },
        h('div', h('div.sec-h', h('h2', 'Timeline'), h('span.k', 'stamped & timed, in order')),
          ev.length ? h('div.tl', ev.map(e => h('div.tle' + (e.sess ? '.sess' : ''), { style: { '--kc': e.kind ? `var(--k-${e.kind})` : null, cursor: 'pointer' }, on: { click: e.go } }, h('span.tm0', fmtTime(e.t)), e.el)))
            : h('div.list', h('div.empty', 'Nothing yet. Open a note and start its timer — components you write while it runs are stamped against it.'))),
        h('div',
          h('div.sec-h', h('h2', 'Capture'), h('span.r', h('a.btn.sm.ghost', { href: '#/doc/' + DAY.doc().id }, 'Day note →'))),
          h('div.capbox', h('input.inp', { placeholder: 'A thought, a delivery, a result… (Enter) — goes to today’s day note', on: { keydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { DAY.add(e.target.value); e.target.value = ''; toast('Captured'); } } } }),
            h('div.tiny.muted', plural(DAY.entries(DAY.doc()).length, 'entry', 'entries') + ' today · Ctrl+Shift+Space from anywhere')),
          REM.home(),
          h('div.dayh.home', CHORES.dayRow(today)), RESURF.card(),
          TIMER.active().length ? [h('div.sec-h', h('h2', 'Running')), h('div.list', TIMER.active().map(s => { const d = M.doc(s.docId); return h('div.li.click', { on: { click: () => App.go('#/doc/' + s.docId) } }, h('span.tchip' + (s.state === 'running' ? '.run' : '.paused'), h('i'), h('span.wt', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true))), h('span.t', d ? d.title : '—', h('span.s', d ? M.docPath(d) : '')), s.steps && s.steps.length ? h('span.tiny.mono.muted', plural(s.steps.length, 'step') + ' checked') : null); }))] : null,
          h('div.sec-h', h('h2', 'Needs attention')),
          h('div.tiles', { style: { marginBottom: '12px' } }, tile(openB.length, 'open barriers', null, 'barrier'), tile(flags.length, 'flags'), tile(DB.where('sessions', s => s.state === 'open').length, 'open time entries')),
          capped(openB.sort((a, b) => a.created.localeCompare(b.created)), 4, it => itemRow(it, h('span.tiny.mono.muted', Math.floor((Date.now() - +new Date(it.created)) / 864e5) + 'd')), 'No open barriers'),
          h('div.sec-h', { style: { marginTop: '24px' } }, h('h2', 'Last five weeks'), h('span.r', h('a.btn.sm.ghost', { href: '#/activity' }, 'Activity →'))),
          heatmapEl({ weeks: 5, cell: 15 }), h('div', { style: { marginTop: '8px' } }, legendEl()),
          h('div.sec-h', { style: { marginTop: '24px' } }, h('h2', 'Recent notes')),
          h('div.list', recent.map(d => h('div.li.click', { on: { click: () => App.go('#/doc/' + d.id) } }, typechip(d.type), h('span.t', d.title, h('span.s', M.docPath(d))), h('span.tiny.mono.muted', fmtWhen(d.modified))))))));
  },
};
VIEWS.home = HomeView;
HomeView.title = true;
