/* ==========================================================================
   14a · Captures on the Today tab (Gabe, 20 Nov: "Captures show up in
   the Today tab for the user to come back during the day and potentially move
   them to projects. Additionally, each capture entry has a move to button
   footer right below them to bring up a move panel.")
   - A capture is what the quick capture makes (Ctrl+Shift+Space, DAY.capture,
     13l): a component in the day note. Today lists them, newest first, in the
     right-hand column under the capture box, so they are easy to come back to.
   - Each one is a small card: its time, its kind when it has one, its words
     (a click opens it in the day note), and a footer right under it with
     "Move to…".
   - Move to… picks where it goes and moves it the way "Move to another note"
     does (MOVE, 13zb): the component, its structures, marks and time belong to
     that note afterwards and nothing is left in the day note.
       · a note: the capture lands beside what is there;
       · a project or a theme: a new Note is made there (titled with the first
         words of the capture) and the capture is moved into it.
   - Once moved it leaves the list; this session's moves stay under it as a
     line each saying where it went, with Open. Ctrl+Z puts it back.
   TCAP: on() · days() · list() · target(b) · move(b) · card(b) · section().
   Settings → Tabs & overview → Captures on Today (todaycaps, 20a).
   ========================================================================== */
const TCAP = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('todaycaps'),
  /** How many days back the list reaches: 1 (today) or 3 (a late-night capture of yesterday is still there). */
  days: () => { const n = parseInt(typeof FEAT !== 'undefined' ? FEAT.tune('todaycaps', 'days') : 1, 10); return n > 1 ? n : 1; },
  moved: [],
  /** The captures not moved yet, newest first. */
  list(days = TCAP.days()) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const date = localDate(addDays(new Date(), -i)), d = DAY.doc(date, false); if (!d) continue;
      // newest first within a day (the time it was made, then its place in the note: captures made in one second keep their order)
      DAY.entries(d).filter(b => b.body && String(b.body.text || '').trim()).map((b, n) => ({ b, n })).sort((x, y) => String(y.b.created || '').localeCompare(String(x.b.created || '')) || y.n - x.n).forEach(x => out.push(x.b));
    }
    return out;
  },
  /** Where it goes: a note ({doc}) or a project / theme ({projectId, themeId}); null when cancelled. The move panel (13zzzd): a search, or a click on a note in the Portfolio. */
  target(b) {
    return MPANEL.pick({ title: 'Move “' + snippet(b.body.text, 40) + '” to…', exclude: [b.docId], places: MPANEL.projectRows({ sub: ['a new note in the project', 'a new note in the theme'] }) });
  },
  /** Move a capture to what target(b) chooses. */
  async move(b) {
    b = M.block(b.id); if (!b || !MOVE.can(b)) return;
    const t = await TCAP.target(b); if (!t) return; b = M.block(b.id); if (!b) return;
    DB.beginGroup('Move capture');
    let dest = t.doc && M.doc(t.doc.id);
    if (!dest) {   // a project or a theme: a new note there, without the empty starter box
      _suppress++; try {
        dest = M.createDoc({ type: 'note', projectId: t.projectId, themeId: t.themeId, title: snippet(b.body.text, 60) });
        DB.group--;   // createDoc's changed() opened a new undo group even while suppressed: the note, the move and this are one Ctrl+Z
        M.docBlocks(dest.id).forEach(x => { if (!String((x.body || {}).text || '').trim()) { DB.del('blocks', x.id); dest.blockIds = dest.blockIds.filter(id => id !== x.id); } });
        DB.put('documents', dest);
      } finally { _suppress--; }
    }
    TCAP.moved.unshift({ blockId: b.id, destId: dest.id, text: snippet(b.body.text, 60) }); TCAP.moved.length = Math.min(TCAP.moved.length, 8);
    MOVE.ask([b.id], dest.id, MOVE.spot(dest));
  },
  /** One capture, real or the preview's — { id, time, date, kinds, text, open(), move() }: time, kind, words, and under them the footer with Move to…. */
  cardEl(o) {
    return h('div.tcp-card', { 'data-id': o.id || '' },
      h('div.tcp-top', h('span.tcp-t', o.time), o.date ? h('span.tcp-d', o.date) : null, (o.kinds || []).map(k => kchip(k))),
      h('div.tcp-x', { tabindex: '0', role: 'link', title: 'Open it in the day note', on: { click: () => o.open && o.open(), keydown: e => { if (e.key === 'Enter') { e.preventDefault(); o.open && o.open(); } } } }, o.text),
      h('div.tcp-foot', h('button.tcp-mv', { type: 'button', title: 'Move it to a note, a project or a theme', on: { click: () => o.move && o.move() } }, TCAP.ARROW(), 'Move to…')));
  },
  card(b) {
    const d = M.doc(b.docId), date = d && d.dayDate;
    return TCAP.cardEl({ id: b.id, time: b.label || fmtTime(b.created), date: date && date !== localDate(new Date()) ? fmtDay(date + 'T12:00') : null, kinds: IX.kindsOf(b), text: String(b.body.text || ''), open: () => App.openComponent(b.id), move: () => TCAP.move(b) });
  },
  ARROW: () => h('span.tcp-i', { html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' }),
  /** The Today column's block: the cards, then where this session's moves went. */
  section() {
    if (!TCAP.on()) return null;
    const L = TCAP.list(), gone = TCAP.moved.filter(m => { const b = M.block(m.blockId); return b && b.docId === m.destId && M.doc(m.destId); });
    return h('div.tcap', h('div.tcp-h', h('span.tcp-n', L.length ? plural(L.length, 'capture') + (TCAP.days() > 1 ? ' · last ' + TCAP.days() + ' days' : ' today') : 'No captures waiting'), h('span.tcp-k', 'newest first')),
      L.length ? h('div.tcp-list', L.map(TCAP.card)) : h('div.tcp-none', 'Ctrl+Shift+Space from anywhere: what you capture waits here until you move it.'),
      gone.length ? h('div.tcp-gone', gone.map(m => h('div.tcp-g', h('span.tcp-gt', '“' + m.text + '”'), ' → ', h('a', { href: '#/doc/' + m.destId, title: M.docPath(M.doc(m.destId)) }, snippet(M.doc(m.destId).title || 'Untitled', 34)), h('span.tcp-u', ' · Ctrl+Z puts it back')))) : null);
  },
};
