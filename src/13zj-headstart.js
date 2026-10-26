/* ==========================================================================
   13zj · A head start for a timer: time that already went by before you
   pressed start (you began the incubation 20 minutes ago). "▾" beside a
   note's ⏱ Timer → "Start with a head start…"; on a running timer, ＋ (on
   its card and its box) → "Add a head start…". The timer's start moves
   earlier by that much; components already stamped against it keep their
   place in its time.
   ========================================================================== */
const HEAD = {
  apply(s, sec) {
    if (!s || !sec || !(s.segments || []).length) return; const g = s.segments[0], t = new Date(+new Date(g.s) - sec * 1000);
    g.s = isoLocal(t); s.created = isoLocal(new Date(Math.min(+new Date(s.created), +t))); s.headStart = (s.headStart || 0) + sec; DB.put('sessions', s);
    DB.where('blocks', b => b.stamp && b.stamp.sessionId === s.id && b.stamp.offsetMs != null).forEach(b => { b.stamp.offsetMs += sec * 1000; DB.put('blocks', b); });
    changed(); toast(`Head start of ${fmtDur(sec * 1000, sec < 60)} — the timer now reads ${fmtDur(TIMER.elapsed(s), true)}`);
  },
  async ask(title) { const v = await askText(title, 'How much time already went by? (20 · 1h10 · 1:30 · 45s)', '', { placeholder: '20' }); if (!v) return null;
    const m = /^\s*(\d+(?:\.\d+)?)\s*s(ec(onds?)?)?\s*$/i.exec(v); const sec = m ? Math.round(+m[1]) : parseDuration(v); if (!sec || sec <= 0) { toast('Could not read that duration'); return null; } return sec; },
  async start(docId) { if (TIMER.activeFor(docId)) return HEAD.add(TIMER.activeFor(docId)); const sec = await HEAD.ask('Start with a head start'); if (!sec) return; const s = TCMP.start(docId); if (s && s.id) HEAD.apply(M.session(s.id), sec); },
  async add(s) { const sec = await HEAD.ask('Add a head start'); if (sec) HEAD.apply(M.session(s.id), sec); },
};
{
  const plus = s => h('button.td-b', { title: 'Add a head start — time that went by before you started it', on: { click: e => { e.stopPropagation(); HEAD.add(s); } } }, '＋');
  const card = TIMERUI.card; TIMERUI.card = function (s) { const el = card.call(TIMERUI, s); const it = $('.td-b[title^="Iterate"]', el); if (it) it.before(plus(s)); return el; };
  const body = TCMP.body; TCMP.body = function (b, d, pane, ro) { const el = body.call(TCMP, b, d, pane, ro); const s = M.session(b.sessionId); if (!ro && s && (s.state === 'running' || s.state === 'paused')) { const it = $('.td-b[title^="Iterate"]', el); if (it) it.before(plus(s)); } return el; };
  WIDGETS.timer.body = TCMP.body;
  const render = DocView.render; DocView.render = function (docId) { const r = render.call(this, docId);
    if (this.ctools && !$('.ct-timer-more', this.ctools)) { const pane = this, t = $('.ct-timer', this.ctools); if (t) t.after(h('button.ct-timer-more', { title: 'Timer options — start with a head start', on: { click: e => { const id = pane.docId, s = TIMER.activeFor(id);
      ctxMenu(e.clientX - 160, e.clientY + 12, [{ head: 'Timer' }, s ? { label: 'Add a head start…', sub: 'Time that went by before you started it', run: () => HEAD.add(s) } : { label: 'Start with a head start…', sub: 'Count from a moment that already passed', run: () => HEAD.start(id) }]); } } }, '▾')); }
    return r; };
}
