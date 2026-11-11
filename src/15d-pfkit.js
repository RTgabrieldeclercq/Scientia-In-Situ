/* ==========================================================================
   15d · The portfolio's shared parts (V3.975 — Gabe's list of
   11 Nov): used by the app's portfolio and project page (15) and by the
   lab's portfolio (rm/scientia/lab-mode.js), so both draw the same.
   • Lit reviews (literature notes) go to the project's Lit reviews column,
     never to Project-wide (isLit).
   • An experiment's notes (Planning, Run, Analysis, Synthesis — one chain)
     are one card with ▸; unfolded, it stays unfolded (on this device)
     until ▾ folds it (entries, expCard).
   • Notes are in the order of their date — the day the note is about —
     unless the project's sort button says otherwise: note date (newest or
     oldest first), recent changes, most active, title (sortBtn).
   • Each note's card shows its takeaways, open barriers and evidence as
     dots in their colours from Settings with the count inside; hovering
     (or a tap) opens the dot onto the words marked (dots).
   • Health is activity, not time recorded (activity, heat): a
     note scores only in the two weeks from its date — a component made
     (+1), a structure marked (+3), a takeaway or a result (+10); lit
     reviews score nothing.
   ========================================================================== */
const PFKIT = {
  KEY: 'pf:kit',
  prefs() { let s = null; try { s = _ls.get(PFKIT.KEY, null); } catch (e) { } s = s && typeof s === 'object' ? s : {}; s.sort = s.sort || {}; s.exp = s.exp || {}; return s; },
  save(s) { try { _ls.set(PFKIT.KEY, s); } catch (e) { } },
  isLit: d => !!d && d.type === 'literature',
  /* ---------- order ---------- */
  SORTS: [['date', 'Note date — newest first', 'Date'], ['oldest', 'Note date — oldest first', 'Oldest'], ['changed', 'Recent changes', 'Changed'], ['active', 'Most active', 'Active'], ['title', 'Title, A–Z', 'A–Z']],
  sortOf: pid => PFKIT.prefs().sort[pid] || 'date',
  /** The cards of a column: an experiment's notes as one entry ({ chain, docs, name }), every other note alone ({ doc }), in the order asked for. */
  entries(docs, key) {
    const out = [], chains = new Map();
    docs.forEach(d => { if (d.chain && !PFKIT.isLit(d)) { const g = chains.get(d.chain) || chains.set(d.chain, { chain: d.chain, docs: [] }).get(d.chain); g.docs.push(d); } else out.push({ doc: d }); });
    chains.forEach(g => { if (g.docs.length < 2) return out.push({ doc: g.docs[0] }); g.docs.sort((a, b) => String(a.created).localeCompare(String(b.created))); g.name = CHAIN.name(g.docs[0]); out.push(g); });
    const D = e => e.doc ? [e.doc] : e.docs, date = e => D(e).map(d => String(d.created || '')).sort()[0] || '', changed = e => D(e).map(d => String(d.modified || d.created || '')).sort().pop() || '';
    const title = e => String(e.doc ? e.doc.title : e.name || '').toLowerCase(), act = new Map();
    if (key === 'active') out.forEach(e => act.set(e, PFKIT.activity(D(e), 14).score));
    const by = { date: (a, b) => date(b).localeCompare(date(a)), oldest: (a, b) => date(a).localeCompare(date(b)), changed: (a, b) => changed(b).localeCompare(changed(a)),
      active: (a, b) => act.get(b) - act.get(a) || date(b).localeCompare(date(a)), title: (a, b) => title(a).localeCompare(title(b)) }[key] || ((a, b) => date(b).localeCompare(date(a)));
    return out.sort(by);
  },
  /** ⇅ — the project's order; redraw() draws the project again. */
  sortBtn(pid, redraw) {
    const k = PFKIT.sortOf(pid), cur = PFKIT.SORTS.find(x => x[0] === k) || PFKIT.SORTS[0];
    return h('button.btn.xs.pf-sort', { type: 'button', title: 'The order of this project’s notes: ' + cur[1], on: { pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation();
      ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Sort the notes' }, ...PFKIT.SORTS.map(([id, label]) => ({ label: (id === k ? '✓ ' : '') + label, run: () => { const s = PFKIT.prefs(); s.sort[pid] = id; PFKIT.save(s); redraw(); } }))]); } } }, '⇅ ' + cur[2]);
  },
  /** An experiment's notes as one card: its name, its stages, ▸ to unfold them — unfolded, it stays so until ▾. card(d) draws a note's card. */
  expCard(g, card, redraw) {
    const open = !!PFKIT.prefs().exp[g.chain], flip = e => { e.stopPropagation(); const s = PFKIT.prefs(); if (open) delete s.exp[g.chain]; else s.exp[g.chain] = true; PFKIT.save(s); redraw(); };
    const tog = h('button.ib.pf-exp-tog', { type: 'button', 'aria-expanded': String(open), title: open ? 'Fold the experiment' : 'Unfold the experiment: each of its notes', on: { pointerdown: e => e.stopPropagation(), click: flip } }, open ? '▾' : '▸');
    const stages = h('div.pf-stages', g.docs.map(d => h('a.pf-stage', { href: '#/doc/' + d.id, title: d.title, on: { pointerdown: e => e.stopPropagation(), click: e => e.stopPropagation() } }, prof(d.type).stage || prof(d.type).label)));
    const head = h('div.box.dcard.pf-exp.nopan' + (open ? '.open' : ''), { 'data-chain': g.chain, title: 'An experiment: ' + plural(g.docs.length, 'note'), on: { click: flip } },
      h('div.row', tog, h('span.pill', 'Experiment'), h('span.spacer'), h('span.mono.tiny.muted', { title: 'Its first note’s date' }, fmtDay(g.docs[0].created))), h('div.dn', g.name), stages, PFKIT.dots(g.docs));
    return open ? h('div.pf-expg', head, h('div.pf-exp-in', g.docs.map(d => card(d)))) : head;
  },
  /* ---------- the dots ---------- */
  DOTS: [['takeaway', 'takeaway', 'takeaways'], ['barrier', 'open barrier', 'open barriers'], ['evidence', 'evidence', 'evidence']],
  col: k => (((settings().kinds || {})[k] || {}).color) || (KIND[k] || {}).color || '#888',
  /** Takeaways, open barriers and evidence marked in these notes: a dot each in its colour with the count; hover or tap opens it onto the words. */
  dots(docs) {
    docs = Array.isArray(docs) ? docs : [docs]; const ids = new Set(docs.map(d => d.id)), its = DB.where('items', i => ids.has(i.originDocId) && !i.correctedBy), out = [];
    PFKIT.DOTS.forEach(([k, one, many]) => { const L = its.filter(i => i.kind === k && (k !== 'barrier' || IX.status(i) === 'open')); if (!L.length) return;
      const el = h('span.pfdot', { 'data-k': k, style: { '--c': PFKIT.col(k) },
        on: { mouseenter: () => { if (!(PFKIT._pop && PFKIT._pop._for === el)) PFKIT.pop(el, k, L.length === 1 ? one : many, L); }, mouseleave: e => { if (PFKIT._pop && e.relatedTarget && PFKIT._pop.contains(e.relatedTarget)) return; PFKIT.unpop(); }, pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation(); if (PFKIT._pop && PFKIT._pop._for === el) PFKIT.unpop(); else PFKIT.pop(el, k, L.length === 1 ? one : many, L); } } }, String(L.length));
      out.push(el); });
    return out.length ? h('div.pfdots', out) : null;
  },
  pop(el, k, word, L) {
    PFKIT.unpop(); const r = el.getBoundingClientRect();
    const p = h('div.pfdot-pop', { style: { '--c': PFKIT.col(k), left: Math.max(8, Math.min(innerWidth - 340, r.left - 6)) + 'px', top: Math.min(innerHeight - 60, r.top - 6) + 'px' } },
      h('div.pp-h', h('b', String(L.length)), ' ', word), L.slice(0, 12).map(i => h('div.pp-i', snippet(String(i.text || ''), 180))), L.length > 12 ? h('div.pp-more', '+ ' + (L.length - 12) + ' more') : null);
    p._for = el; p.addEventListener('mouseleave', e => { if (e.relatedTarget === el) return; PFKIT.unpop(); }); document.body.append(p); PFKIT._pop = p;   // the dot opened: the cursor goes from the dot onto it
  },
  unpop() { if (PFKIT._pop) { PFKIT._pop.remove(); PFKIT._pop = null; } },
  /* ---------- activity ---------- */
  WINDOW: 14 * 864e5, SCORE: { component: 1, structure: 3, takeaway: 10, result: 10 },
  /** A note's scored moments: components made and structures marked within two weeks of its date; none for a lit review. */
  events(d, items) {
    if (!d || d.deleted || PFKIT.isLit(d) || d.type === 'day' || d.type === 'review') return []; const t0 = +new Date(d.created), t1 = t0 + PFKIT.WINDOW, ev = [];
    if (!t0) return ev; const inside = t => t >= t0 - 60000 && t <= t1;
    M.docBlocks(d.id).forEach(b => { if (!b || b.status === 'removed' || b.kind === 'ref' || b.synthHead || b.synthFrom) return; if (b.kind === 'component' && !String((b.body || {}).text || '').trim()) return; const t = +new Date(b.made || b.created); if (inside(t)) ev.push({ t, s: PFKIT.SCORE.component }); });   // made: the real time (V3.975)
    (items || DB.where('items', i => i.originDocId === d.id && !i.correctedBy)).forEach(i => { const t = +new Date(i.created); if (inside(t)) ev.push({ t, s: PFKIT.SCORE[i.kind] || PFKIT.SCORE.structure }); });
    return ev;
  },
  /** Activity of these notes: { score (the last `days`), last, days (since the last moment), perDay (the last `mapDays`: 6 weeks, a theme's page 8) }. */
  activity(docs, days = 28, mapDays = 42) {
    const since = Date.now() - days * 864e5, map = Date.now() - mapDays * 864e5, byDoc = new Map(), ids = new Set(docs.map(d => d.id));
    DB.where('items', i => ids.has(i.originDocId) && !i.correctedBy).forEach(i => { (byDoc.get(i.originDocId) || byDoc.set(i.originDocId, []).get(i.originDocId)).push(i); });
    let score = 0, last = 0; const perDay = new Map();
    docs.forEach(d => PFKIT.events(d, byDoc.get(d.id) || []).forEach(e => { if (e.t > last) last = e.t; if (e.t >= since) score += e.s; if (e.t >= map) { const k = localDate(new Date(e.t)); perDay.set(k, (perDay.get(k) || 0) + e.s); } }));
    return { score, last, days: last ? Math.floor((Date.now() - last) / 864e5) : null, perDay };
  },
  ofProject: pid => PFKIT.activity(DB.where('documents', d => d.projectId === pid && !d.deleted)),
  level: s => !s ? 0 : s < 4 ? 1 : s < 10 ? 2 : s < 20 ? 3 : 4,
  /** The activity as the six-week heatmap (the same look as the time one). */
  heat(perDay, { weeks = 6, cell = 7 } = {}) {
    let start = dayStart(new Date()); while (start.getDay() !== 1) start = addDays(start, -1); start = addDays(start, -7 * (weeks - 1));
    const today = localDate(new Date()), grid = h('div.hm', { style: { '--c': cell + 'px' } });
    for (let i = 0; i < weeks * 7; i++) { const dd = addDays(start, i), key = localDate(dd), s = (perDay && perDay.get(key)) || 0, fut = +dd > +dayStart(new Date());
      grid.append(h('i' + (fut ? '.out' : '') + (key === today ? '.today' : ''), { 'data-l': PFKIT.level(s), title: fmtDayLong(dd) + ' · ' + (s ? 'activity ' + s : 'no activity') })); }
    return h('div.hmwrap', { title: 'Activity: components made (+1) and structures marked (+3; a takeaway or a result +10) in notes less than two weeks old' }, h('div.hmdays', { style: { '--c': cell + 'px' } }, ['M', '', 'W', '', 'F', '', 'S'].map(x => h('span', x))), grid);
  },
  /** "activity 34 · 4 wk" for a health line. */
  say: H => 'activity ' + (H.act || 0) + ' · 4 wk',
  /** V3.978 — one note's activity, for a list: what it scored, and until when it still counts (two weeks from its date). */
  noteAct(d) { const ev = PFKIT.events(d), s = ev.reduce((a, e) => a + e.s, 0), t0 = +new Date(d.created), open = !!t0 && !PFKIT.isLit(d) && Date.now() < t0 + PFKIT.WINDOW;
    return { score: s, open, until: open ? new Date(t0 + PFKIT.WINDOW) : null }; },
};
{
  // a theme's health is its activity: the score of the last four weeks, stalled after three weeks without any
  const th = IX.themeHealth; IX.themeHealth = function (t) { const H = th.apply(this, arguments); try { const A = PFKIT.activity(H.docs.filter(d => !d.deleted));
    Object.assign(H, { act: A.score, actDays: A.days, actMap: A.perDay, days: A.days, stalled: A.days !== null && A.days >= 21 }); } catch (e) { } return H; };
  addEventListener('scroll', e => { const P = PFKIT._pop; if (P && P._for && (!e.target || !e.target.contains || e.target.contains(P._for))) PFKIT.unpop(); }, true);   // only a scroll that moves the dot
}
