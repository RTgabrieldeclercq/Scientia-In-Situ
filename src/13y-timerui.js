/* ==========================================================================
   13y · Timers you can see from anywhere. A note's own "⏱ Timer" button
   (top right of its canvas, beside Calculator) starts a timer that counts
   for that note. Every running or paused timer sits in a floating card at
   the bottom left of every page: pause / resume, ✓ complete (logs it),
   ✕ cancel (asks first; nothing is logged), and ↻ iterate (logs it and
   starts the next one — if you are in a different note, it asks where the
   next one should count). Several notes can each have their own timer.
   ========================================================================== */
const TIMERUI = {
  paneDoc() { const p = App.panes && App.panes()[0]; return p && p.docId && M.doc(p.docId) ? p.docId : null; },
  cancel(s) {
    const d = M.doc(s.docId);
    pickModal('Cancel this timer?', `${fmtDur(TIMER.elapsed(s), true)} on “${d ? d.title : '—'}” will not be logged. Components written during it keep their time stamps.`, [{ label: 'Cancel the timer — log nothing', danger: true, run: () => {
      DB.where('blocks', b => b.stamp && b.stamp.sessionId === s.id).forEach(b => { b.stamp.sessionId = null; b.stamp.offsetMs = null; DB.put('blocks', b); });
      DB.del('sessions', s.id); changed(); toast('Timer cancelled — nothing logged'); } }]);
  },
  complete(s) { TIMER.stop(s); },
  /** Log this one and start the next; from another note, ask where the next one counts. */
  iterate(s) {
    const here = TIMERUI.paneDoc(), go = docId => { const n = (s.iterN || 1) + 1; TIMER.stop(s); const s2 = TCMP.start(docId); if (s2 && s2.id) { s2.iterN = docId === s.docId ? n : 1; s2.iterOf = s.id; DB.put('sessions', s2); changed(); toast((docId === s.docId ? 'Iteration ' + n : 'New timer') + ' started on “' + (M.doc(docId) || {}).title + '”'); } };
    if (here && here !== s.docId && !TIMER.activeFor(here)) {
      const a = M.doc(here), b = M.doc(s.docId);
      return pickModal('Where should the next timer count?', `The current one (${fmtDur(TIMER.elapsed(s), true)}) is logged on “${b ? b.title : '—'}” either way.`, [
        { label: 'Here — “' + snippet(a.title, 50) + '”', run: () => go(here) }, { label: 'Stay on “' + snippet(b ? b.title : '—', 50) + '”', run: () => go(s.docId) }]);
    }
    go(s.docId);
  },
  card(s) {
    const d = M.doc(s.docId), run = s.state === 'running', multi = TIMER.runningAll().length > 1 && run;
    return h('div.td-card' + (run ? '.run' : '.paused') + (multi ? '.multi' : ''), { title: multi ? 'Two timers running — the overlap counts once' : '' },
      h('div.td-top', h('i.td-dot'), h('a.td-note', { href: '#/doc/' + s.docId, title: d ? M.docPath(d) : '' }, d ? snippet(d.title, 34) : '—'), s.iterN > 1 ? h('span.td-iter', '#' + s.iterN) : null),
      h('div.td-row', h('span.td-time', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true)), h('span.spacer'),
        run ? h('button.td-b', { title: 'Pause', on: { click: () => TIMER.pause(s) } }, '❚❚') : h('button.td-b', { title: 'Resume', on: { click: () => TIMER.resume(s) } }, '▶'),
        h('button.td-b.ok', { title: 'Complete — log this time', on: { click: () => TIMERUI.complete(s) } }, '✓'),
        h('button.td-b', { title: 'Iterate — log this one and start the next', on: { click: () => TIMERUI.iterate(s) } }, '↻'),
        h('button.td-b.bad', { title: 'Cancel — log nothing (asks first)', on: { click: () => TIMERUI.cancel(s) } }, '✕')));
  },
  paint() {
    const act = TIMER.active(); let el = $('#tdock'); if (!el) { el = h('div#tdock'); document.body.append(el); }
    const min = _ls.get('tdockMin', false);
    el.className = act.length ? (min ? 'min' : '') : 'none';
    el.replaceChildren(...(!act.length ? [] : min ? [h('button.td-pill', { title: 'Show timers', on: { click: () => { _ls.set('tdockMin', false); TIMERUI.paint(); } } }, act.map(s => [h('i.td-dot.' + s.state), h('span', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true))]))]
      : [h('div.td-h', h('span', '⏱ ' + plural(act.length, 'timer')), h('span.spacer'), h('button.td-min', { title: 'Collapse', on: { click: () => { _ls.set('tdockMin', true); TIMERUI.paint(); } } }, '–')), ...act.map(TIMERUI.card)]));
    $$('.ctools .ct-timer').forEach(b => TIMERUI.ctool(b));
  },
  /** The note's own timer button, beside Calculator. */
  ctool(btn) {
    const host = btn.closest('.canvas-host'), pane = host && host._dv, docId = pane && pane.docId; if (!docId) return;
    const s = TIMER.activeFor(docId);
    btn.classList.toggle('on', !!s); btn.classList.toggle('paused', !!s && s.state === 'paused');
    btn.replaceChildren(h('span', { style: { fontSize: '14px' } }, '⏱'), s ? h('span', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true)) : 'Timer', s ? h('span.ct-st', s.state === 'running' ? '❚❚' : '▶') : null);
    btn.title = !s ? 'Start a timer for this note' : s.state === 'running' ? 'Pause this note’s timer' : 'Resume this note’s timer';
    btn.onclick = () => { const cur = TIMER.activeFor(docId); if (!cur) TCMP.start(docId); else if (cur.state === 'running') TIMER.pause(cur); else TIMER.resume(cur); };
  },
};
{
  App.renderDock = () => { const t = $('#timers'); if (t) t.replaceChildren(); TIMERUI.paint(); };
  const render = DocView.render; DocView.render = function (docId) { const r = render.call(this, docId); if (this.ctools && !$('.ct-timer', this.ctools)) { const b = h('button.ct-timer'); this.ctools.prepend(b); requestAnimationFrame(() => TIMERUI.ctool(b)); } return r; };
}
