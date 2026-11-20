/* ==========================================================================
   18b · The monthly review (V4.8). Gabe: "rework the weekly reviews to become
   a monthly review that creates a rich report of your deliverables in the
   form of takeaways and results per note. It shows you all unassigned
   components from daily notes that do not pertain to any note in the
   portfolio" — and a tab on par with the others, efficient, to power
   through science. Design: the Monthly review artifact (his picks).
   - A month opens the day after it ends (Settings: its last weekend) and
     stays open until you complete it (the `reviews` record, id YYYY-MM).
   - The report: what the month added up to (from its takeaways, editable),
     its numbers against the month before, then per project → per note:
     takeaways and results first (Result image panels as pictures), then
     barriers resolved (with the term that joined them, TARC), questions
     answered, Reports and References, and what is still open.
   - Unassigned: every component of a daily (and quick) note that belongs
     to no note of the Portfolio, with the note it most likely belongs to
     (shared terms) and an inbox's keys: j/k, x, f/Enter files it there as a
     bridge, m picks the note, l makes it a float, n a new note from the
     ones selected, d leaves it, u undoes.
   - Next month: open barriers, questions, flags and notes gone quiet to
     tick into the plan, which becomes the review note's synthesis.
   ReviewView.render is this; the weekly bet stays as ReviewView.renderWeek.
   ========================================================================== */
const MONTHLY = {
  MON: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  cur: 0, sel: new Set(), doc: false, _key: '',
  on: () => typeof FEAT === 'undefined' || FEAT.on('review'),
  t(k, d) { try { const v = FEAT.tune('review', k); return v == null ? d : v; } catch (e) { return d; } },
  id: d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
  /** A month id (YYYY-MM), or a week id (YYYY-MM-DD, the weekly review's) → that month's first day. */
  parse(id) { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(id || ''); return m ? new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1) : null; },
  name: (d, yr) => MONTHLY.MON[d.getMonth()] + (yr ? ' ' + d.getFullYear() : ''),
  /** When a month's review opens: the day after it ends, or (Settings) its last Saturday. */
  opensAt(start) {
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1); if (MONTHLY.t('opens', 'after') !== 'weekend') return next;
    let d = addDays(next, -1); while (d.getDay() !== 6) d = addDays(d, -1); return d;
  },
  months() {
    let first = Infinity; DB.all('blocks').forEach(b => { const t = +new Date(b.created); if (t && t < first) first = t; }); DB.all('sessions').forEach(s => { const t = +new Date(s.created); if (t && t < first) first = t; });
    if (first === Infinity) return [];
    const now = new Date(), f = new Date(first), cur = new Date(now.getFullYear(), now.getMonth(), 1), out = []; let m = new Date(f.getFullYear(), f.getMonth(), 1);
    while (+m <= +cur) { const id = MONTHLY.id(m), next = new Date(m.getFullYear(), m.getMonth() + 1, 1), rv = DB.get('reviews', id), availableAt = MONTHLY.opensAt(m);
      out.push({ id, start: m, next, end: addDays(next, -1), availableAt, status: rv && rv.status === 'complete' ? 'complete' : now >= availableAt ? 'waiting' : 'running', rv }); m = next; }
    return out.reverse();
  },
  lit: d => !!d && typeof TERMLIT !== 'undefined' && TERMLIT.is && TERMLIT.is(d),
  docOk: d => !!d && !d.deleted && d.type !== 'review' && !MONTHLY.lit(d),
  /* ---------- the month's numbers and deliverables ---------- */
  stats(m) {
    const a = m.start, b = m.next, inW = x => !!x && IX.inWin(x, a, b), made = x => inW(x.made || x.created);
    const items = DB.where('items', i => inW(i.created) && !i.correctedBy && MONTHLY.docOk(M.doc(i.originDocId)));
    const docs = DB.where('documents', MONTHLY.docOk), CK = CKINDS.counted(docs.map(d => d.id));
    const ent = (it, b0, kind) => it ? { kind, item: it, blockId: it.originBlockId, docId: it.originDocId, text: it.text, t: it.created } : { kind, block: b0, blockId: b0.id, docId: b0.docId, text: b0.kind === 'figure' ? (b0.label || 'Figure') : snippet(String((b0.body || {}).text || b0.label || ''), 220), t: b0.made || b0.created };
    const take = [...items.filter(i => i.kind === 'takeaway').map(i => ent(i, null, 'takeaway')), ...CK.takeaway.filter(made).map(x => ent(null, x, 'takeaway'))];
    const results = [...items.filter(i => i.kind === 'result').map(i => ent(i, null, 'result')), ...CK.evidence.filter(x => x.ckind === 'result' && made(x)).map(x => ent(null, x, 'result'))];
    const resolved = items.filter(i => i.kind === 'resolution' && i.resolves).map(r => { const bi = M.item(r.resolves); if (!bi) return null;
      const through = typeof TARC !== 'undefined' ? TARC.through({ from: bi.originBlockId, to: r.originBlockId }, []).map(t => (M.term(t) || {}).label).filter(Boolean) : [];
      return { kind: 'resolved', item: r, barrier: bi, blockId: r.originBlockId, docId: r.originDocId, text: bi.text, res: r.text, t: r.created, through, days: Math.max(0, Math.round((+new Date(r.created) - +new Date(bi.created)) / 864e5)) }; }).filter(Boolean);
    const answers = DB.where('wires', w => w.rel === 'answers' && inW(w.created)).map(w => { const q = M.block(w.to); return q && MONTHLY.docOk(M.doc(q.docId)) ? { kind: 'answered', blockId: q.id, docId: q.docId, text: snippet(String((q.body || {}).text || q.label || ''), 160), by: w.from, t: w.created } : null; }).filter(Boolean);
    const closedQ = DB.where('items', i => i.kind === 'question' && i.status === 'closed' && inW(i.closedAt) && MONTHLY.docOk(M.doc(i.originDocId))).map(i => ({ kind: 'answered', item: i, blockId: i.originBlockId, docId: i.originDocId, text: i.text, t: i.closedAt }));
    const answered = [...answers, ...closedQ.filter(q => !answers.some(x => x.blockId === q.blockId))];
    const openB = IX.openBarriers().filter(i => +new Date(i.created) < +b && MONTHLY.docOk(M.doc(i.originDocId))).map(i => ({ kind: 'open', item: i, blockId: i.originBlockId, docId: i.originDocId, text: i.text, t: i.created }));
    const reports = DB.where('blocks', x => x.status === 'live' && x.ckind === 'report' && made(x)).map(x => ({ kind: 'report', block: x, blockId: x.id, docId: x.docId, text: x.label || 'Report', t: x.created }));
    const refs = DB.where('blocks', x => x.status === 'live' && x.isRef && inW(x.refAt || x.created)).map(x => ({ kind: 'reference', block: x, blockId: x.id, docId: x.docId, text: x.label || snippet(String((x.body || {}).text || ''), 120), t: x.refAt || x.created }));
    const touched = new Set(); DB.all('blocks').forEach(x => { if (x.status !== 'removed' && inW(x.modified || x.created)) { const d = M.doc(x.docId); if (MONTHLY.docOk(d) && d.type !== 'day') touched.add(d.id); } });
    let time = 0; for (let d = new Date(a); +d < +b; d = addDays(d, 1)) { const D = IX.day(d); time += (D.union || 0) + (D.manual || 0); }
    return { a, b, items, take, results, resolved, answered, openB, reports, refs, touched, time };
  },
  /** What the month added up to, from its takeaways (until edited). */
  summary(m, S) {
    if (!S.take.length) return S.results.length ? `${MONTHLY.name(m.start)} gave ${plural(S.results.length, 'result')}${S.resolved.length ? ` and resolved ${plural(S.resolved.length, 'barrier')}` : ''}, with no takeaway written yet.` : `Nothing marked as a takeaway or a result in ${MONTHLY.name(m.start)}.`;
    const lines = S.take.slice(0, 4).map(x => String(x.text || '').replace(/\s+/g, ' ').trim().replace(/[.;\s]+$/, '')).filter(Boolean);
    return `In ${MONTHLY.name(m.start)}: ` + lines.join('; ') + '.' + (S.take.length > 4 ? ` (+${S.take.length - 4} more takeaways.)` : '');
  },
  /* ---------- Unassigned ---------- */
  inbox(m) {
    const quick = MONTHLY.t('inbox', 'quick') === 'quick', qd = new Set(quick && typeof GENERAL !== 'undefined' ? GENERAL.docs().map(d => d.id) : []);
    const bridged = new Set(DB.where('blocks', x => x.kind === 'ref' && x.status === 'live' && x.refBlockId).map(x => x.refBlockId));
    return DB.where('blocks', b => {
      if (b.status !== 'live' || b.kind !== 'component' || +new Date(b.created) >= +m.next) return false;
      const d = M.doc(b.docId); if (!d || d.deleted || !(d.type === 'day' || qd.has(d.id))) return false;
      if (!String((b.body || {}).text || '').trim() || b.synthHead || b.synthFrom) return false;
      return !b.themeId && !(b.filed || []).length && !b.reviewedAt && !bridged.has(b.id) && !(b.afloat && !b.afloat.to);
    }).sort((x, y) => String(y.created).localeCompare(String(x.created)));
  },
  /** The Portfolio note it most likely belongs to: the one sharing the most terms with it. */
  suggest(b) {
    const ts = IX.blockTerms.get(b.id) || new Set(), cnt = new Map();
    ts.forEach(t => (IX.termOcc.get(t) || []).forEach(o => { const d = M.doc(o.docId); if (!d || !d.projectId || d.deleted || d.id === b.docId || d.type === 'day' || MONTHLY.lit(d)) return; const c = cnt.get(d.id) || { d, terms: new Set() }; c.terms.add(t); cnt.set(d.id, c); }));
    const best = [...cnt.values()].sort((x, y) => y.terms.size - x.terms.size || String(y.d.modified || '').localeCompare(String(x.d.modified || '')))[0];
    return best ? { doc: best.d, terms: [...best.terms].map(t => (M.term(t) || {}).label).filter(Boolean) } : null;
  },
  /* The inbox's own undo (u): a bridge is made through M.addBlock, whose changed() starts a new journal group, so Ctrl+Z
     would take back a filing in two steps. Each action records exactly what it did, and u puts that back in one. */
  hist: [],
  rec(e) { if (e && (e.xs ? e.xs.length : true)) { MONTHLY.hist.push(e); if (MONTHLY.hist.length > 40) MONTHLY.hist.shift(); } },
  fileOne(b, doc, at) {
    const cur0 = b && M.block(b.id); if (!cur0 || !doc) return null; const prev = (cur0.filed || []).slice();
    const br = BRIDGE.make(cur0, doc, Object.assign({ quiet: true, why: 'Filed at the monthly review' }, at ? { at } : {})); if (!br) return null;
    const cur = M.block(b.id); cur.filed = [...prev, { blockId: br.id, at: isoLocal(new Date()), by: 'review' }]; DB.put('blocks', cur);
    return { blockId: b.id, bridgeId: br.id, prevFiled: prev };
  },
  fileMany(pairs, msg) {
    const xs = pairs.map(([b, d]) => MONTHLY.fileOne(b, d)).filter(Boolean); if (!xs.length) { toast('Nothing filed — no note shares its terms; m picks one'); return 0; }
    MONTHLY.rec({ t: 'file', xs }); changed(); MONTHLY.undoToast(msg(xs.length)); return xs.length;
  },
  file(b, doc) { return MONTHLY.fileMany([[b, doc]], () => 'Filed in “' + snippet(doc.title || 'the note', 40) + '” as a bridge'); },
  dismiss(bs) {
    const xs = bs.map(b => { const cur = M.block(b.id); if (!cur) return null; const x = { blockId: b.id, prev: cur.reviewedAt || null }; cur.reviewedAt = isoLocal(new Date()); DB.put('blocks', cur); return x; }).filter(Boolean);
    MONTHLY.rec({ t: 'leave', xs }); changed(); MONTHLY.undoToast(xs.length > 1 ? plural(xs.length, 'component') + ' left in their notes' : 'Left in its note');
  },
  pick(bs) {
    const m = modal({ title: bs.length > 1 ? 'File ' + plural(bs.length, 'component') + ' in…' : 'File it in…', actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'A note of the Portfolio…',
      items: q => DB.where('documents', d => d.projectId && !d.deleted && d.type !== 'day' && !MONTHLY.lit(d) && (!q || (d.title || '').toLowerCase().includes(q))).sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || ''))),
      render: d => h('div', h('b', d.title || 'Untitled'), h('span.s', (M.project(d.projectId) || {}).name || '')),
      onPick: d => { m.close(); MONTHLY.fileMany(bs.map(b => [b, d]), n => plural(n, 'component') + ' filed in “' + snippet(d.title || 'the note', 40) + '”'); } }) });
  },
  async newNote(bs) {
    if (!bs.length) return; const sg = bs.map(MONTHLY.suggest).find(Boolean), pid = sg ? sg.doc.projectId : null;
    const title = await askText('A new note from ' + plural(bs.length, 'component'), 'Its title' + (pid ? ' — in ' + ((M.project(pid) || {}).name || 'the project') : ''), ''); if (!title) return;
    const d = M.createDoc({ type: 'note', projectId: pid, title });
    const xs = bs.map((b, i) => MONTHLY.fileOne(b, d, { x: (i % 2) * 448, y: 168 + Math.floor(i / 2) * 210 })).filter(Boolean);
    MONTHLY.rec({ t: 'new', docId: d.id, xs }); changed(); MONTHLY.undoToast('“' + snippet(title, 40) + '” made from ' + plural(xs.length, 'component'));
  },
  float(bs) {
    if (typeof FLOATS === 'undefined' || !bs.length) return; const ids = bs.map(b => b.id); FLOATS.mark(ids);
    MONTHLY.rec({ t: 'float', ids }); changed(); MONTHLY.undoToast(ids.length > 1 ? plural(ids.length, 'float') + ' made' : 'Made a float');
  },
  undoToast(msg) { MONTHLY.sel.clear(); toast(msg + ' · u undoes'); },
  undo() {
    const e = MONTHLY.hist.pop(); if (!e) return App.undo();
    if (e.t === 'file' || e.t === 'new') e.xs.forEach(x => { const br = M.block(x.bridgeId); if (br && br.status !== 'removed') M.removeRef(br); const cur = M.block(x.blockId); if (cur) { cur.filed = x.prevFiled; DB.put('blocks', cur); } });
    if (e.t === 'new') { const d = M.doc(e.docId); if (d && !M.docBlocks(d.id).some(b => b && b.status === 'live')) DB.put('documents', Object.assign({}, d, { deleted: true, modified: isoLocal(new Date()) })); }
    if (e.t === 'leave') e.xs.forEach(x => { const cur = M.block(x.blockId); if (!cur) return; if (x.prev) cur.reviewedAt = x.prev; else delete cur.reviewedAt; DB.put('blocks', cur); });
    if (e.t === 'float') { if (typeof FLOATS !== 'undefined' && typeof FLOATS.unmark === 'function') FLOATS.unmark(e.ids); else e.ids.forEach(id => { const b = M.block(id); if (b && b.afloat && !b.afloat.to) { delete b.afloat; DB.put('blocks', b); } }); }
    changed(); toast('Undone');
  },
  /* ---------- Next month ---------- */
  carry(m, S) {
    const L = [], b = +m.next;
    S.openB.slice(0, 8).forEach(x => L.push({ id: 'b:' + x.item.id, line: 'Unblock: ' + snippet(x.text, 90), blockId: x.blockId, kind: 'barrier' }));
    DB.where('items', i => i.kind === 'question' && IX.status(i) === 'open' && +new Date(i.created) < b && MONTHLY.docOk(M.doc(i.originDocId))).slice(0, 6).forEach(i => L.push({ id: 'q:' + i.id, line: 'Answer: ' + snippet(i.text, 90), blockId: i.originBlockId, kind: 'question' }));
    DB.where('flags', f => f.status === 'open').slice(0, 6).forEach(f => { const t = M.describeTarget(f.targetType, f.targetId); if (t) L.push({ id: 'f:' + f.id, line: 'Flagged: ' + snippet(t.title, 90), go: t.go, kind: 'flag' }); });
    MONTHLY.quiet().slice(0, 5).forEach(x => L.push({ id: 'n:' + x.d.id, line: 'Pick up: ' + snippet(x.d.title || 'Untitled', 80) + ' (quiet ' + x.days + ' d)', docId: x.d.id, kind: 'quiet' }));
    return L;
  },
  /** Portfolio notes with no edit in two weeks that were busy in the two months before. */
  quiet() {
    const last = new Map(); DB.all('blocks').forEach(b => { if (b.status === 'removed') return; const t = +new Date(b.modified || b.created); if (t > (last.get(b.docId) || 0)) last.set(b.docId, t); });
    return DB.where('documents', d => d.projectId && MONTHLY.docOk(d) && d.type !== 'day').map(d => ({ d, days: last.get(d.id) ? Math.floor((Date.now() - last.get(d.id)) / 864e5) : null })).filter(x => x.days != null && x.days >= 14 && x.days <= 75).sort((a, b) => a.days - b.days);
  },
  complete(m, rv, S) {
    const now = isoLocal(new Date()); rv.status = 'complete'; rv.completedAt = now; rv.month = m.id;
    DB.where('items', i => i.kind === 'reminder' && i.status !== 'closed' && IX.inWin(i.created, m.start, m.next)).forEach(i => { i.status = 'closed'; i.closedAt = now; i.expiredBy = rv.id; DB.put('items', i); });
    const d = { id: 'd_rv_' + rv.id, type: 'review', scope: 'global', projectId: null, themeId: null, title: 'Monthly review · ' + MONTHLY.name(m.start, true), templateId: null, header: { tags: ['review'], month: m.id }, blockIds: [], synthesis: { text: rv.plan || '', marks: [] }, citeMode: 'title', layout: { head: { x: 0, y: 0 } }, created: now, modified: now };
    DB.put('documents', d);
    const list = (xs, f) => xs.length ? xs.map(f).join('\n') : 'None this month.';
    [['What it added up to', rv.summary || MONTHLY.summary(m, S)], ['Takeaways', list(S.take, x => '• ' + x.text)], ['Results', list(S.results, x => '• ' + x.text)],
      ['Barriers resolved', list(S.resolved, x => '• ' + snippet(x.text, 80) + (x.through.length ? ' — through ' + x.through.join(', ') : ''))], ['Still open', list(S.openB, x => '• ' + snippet(x.text, 90))]]
      .forEach(([l, text], i) => M._newBlock(d, { label: l, body: { text, marks: [] }, x: (i % 2) * 448, y: 160 + Math.floor(i / 2) * 230 }));
    DB.put('documents', d); rv.docId = d.id; DB.put('reviews', rv); changed(); toast('Review completed — next month’s plan is the review note’s synthesis');
  },
  /* ---------- drawing ---------- */
  delta(n, p) { if (!MONTHLY.t('compare', true) || p == null) return null; const d = n - p; return h('span.mr-d' + (d > 0 ? '.up' : d < 0 ? '.dn' : ''), d > 0 ? '+' + d : d < 0 ? String(d) : '±0'); },
  line(x) {
    const b = x.blockId && M.block(x.blockId), img = x.block && x.block.kind === 'figure' ? (() => { try { const c = FIG.cells(x.block).find(c => c.media), rec = c && MEDIA.get(c.media); return rec ? h('img.mr-fig', { src: MEDIA.url(rec), alt: x.text, loading: 'lazy' }) : null; } catch (e) { return null; } })() : null;
    return h('div.mr-ln.k-' + x.kind, { role: 'button', tabindex: '0', title: 'Open it in its note', on: { click: () => b && App.openBlock(b.id), keydown: e => { if (e.key === 'Enter' && b) App.openBlock(b.id); } } },
      img, h('span.mr-tx', x.text || '—', x.kind === 'resolved' ? h('span.mr-sub', ' — resolved' + (x.days ? ' in ' + plural(x.days, 'day') : '') + (x.through.length ? ' · through ' : ''), x.through.map(t => h('span.term-demo', t + ' '))) : null,
        x.kind === 'open' ? h('span.mr-open', 'open') : null));
  },
  sec(title, xs, kind) { return xs.length ? h('div.mr-sec', h('h5', h('i.kdot', { style: { background: `var(--k-${kind}, var(--ink-3))` } }), title, h('span', xs.length)), xs.map(MONTHLY.line)) : null; },
  report(m, S, P) {
    const lvl = MONTHLY.t('deliver', 'all'), more = lvl !== 'core', all = lvl === 'all';
    const groups = new Map(), add = x => { const d = M.doc(x.docId); if (!d) return; const g = groups.get(d.id) || { d, take: [], results: [], resolved: [], answered: [], open: [], reports: [], refs: [] }; groups.set(d.id, g); return g; };
    S.take.forEach(x => { const g = add(x); g && g.take.push(x); }); S.results.forEach(x => { const g = add(x); g && g.results.push(x); });
    if (more) { S.resolved.forEach(x => { const g = add(x); g && g.resolved.push(x); }); S.answered.forEach(x => { const g = add(x); g && g.answered.push(x); }); }
    if (all) { S.reports.forEach(x => { const g = add(x); g && g.reports.push(x); }); S.refs.forEach(x => { const g = add(x); g && g.refs.push(x); }); }
    S.openB.forEach(x => { const g = groups.get(x.docId); g && g.open.push(x); });
    const byP = new Map(); [...groups.values()].forEach(g => { const k = g.d.projectId || (g.d.type === 'day' ? '_day' : '_quick'); (byP.get(k) || byP.set(k, []).get(k)).push(g); });
    const pname = k => k === '_day' ? 'Daily notes' : k === '_quick' ? 'Quick notes' : ((M.project(k) || {}).name || 'A project');
    const card = g => h('div.mr-card', h('div.mr-ch', h('a', { href: '#/doc/' + g.d.id }, g.d.title || 'Untitled'), h('span', [g.take.length ? plural(g.take.length, 'takeaway') : null, g.results.length ? plural(g.results.length, 'result') : null].filter(Boolean).join(' · '))),
      MONTHLY.sec('Takeaways', g.take, 'takeaway'), MONTHLY.sec('Results', g.results, 'result'), MONTHLY.sec('Barriers resolved', g.resolved, 'resolution'), MONTHLY.sec('Questions answered', g.answered, 'question'),
      MONTHLY.sec('Reports', g.reports, 'evidence'), MONTHLY.sec('References', g.refs, 'decision'), MONTHLY.sec('Still open', g.open, 'barrier'));
    const nums = [['Notes touched', S.touched.size, P && P.touched.size], ['Results', S.results.length, P && P.results.length], ['Takeaways', S.take.length, P && P.take.length], ['Barriers resolved', S.resolved.length, P && P.resolved.length],
      ['Still open', S.openB.length, P && P.openB.length], ['Questions answered', S.answered.length, P && P.answered.length]];
    return h('div.mr-report', { id: 'mr-report' },
      h('div.mr-nums', nums.map(([l, n, p]) => h('div.mr-num', h('b', String(n)), h('span', l), MONTHLY.delta(n, p))), h('div.mr-num', h('b', fmtDur(S.time) || '0'), h('span', 'Time logged'), MONTHLY.t('compare', true) && P ? h('span.mr-d', 'was ' + (fmtDur(P.time) || '0')) : null)),
      byP.size ? [...byP.entries()].sort((a, b) => sum(b[1].map(g => g.take.length + g.results.length)) - sum(a[1].map(g => g.take.length + g.results.length))).map(([k, gs]) => h('div.mr-proj', h('div.mr-ph', pname(k), h('span', plural(gs.length, 'note'))),
        h('div.mr-cards', gs.sort((a, b) => (b.take.length + b.results.length) - (a.take.length + a.results.length)).map(card))))
        : h('div.empty', 'Nothing marked in ' + MONTHLY.name(m.start) + ' yet: takeaways and results you mark show here, per note.'));
  },
  inboxEl(m, L) {
    const keys = MONTHLY.t('keys', true), fl = typeof FLOATS !== 'undefined';
    MONTHLY.cur = clamp(MONTHLY.cur, 0, Math.max(0, L.length - 1)); [...MONTHLY.sel].forEach(id => { if (!L.some(b => b.id === id)) MONTHLY.sel.delete(id); });
    const chosen = () => MONTHLY.sel.size ? L.filter(b => MONTHLY.sel.has(b.id)) : L[MONTHLY.cur] ? [L[MONTHLY.cur]] : [];
    const row = (b, i) => { const sg = MONTHLY.suggest(b), d = M.doc(b.docId), k = IX.kindsOf(b)[0];
      return h('div.mr-in' + (i === MONTHLY.cur ? '.cur' : '') + (MONTHLY.sel.has(b.id) ? '.sel' : ''), { 'data-id': b.id, on: { click: e => { if (e.target.closest('button,input')) return; MONTHLY.cur = i; MONTHLY.redraw(); } } },
        h('input', { type: 'checkbox', checked: MONTHLY.sel.has(b.id), 'aria-label': 'Select', on: { change: e => { e.target.checked ? MONTHLY.sel.add(b.id) : MONTHLY.sel.delete(b.id); MONTHLY.redraw(); } } }),
        h('div.mr-int', h('div.mr-it', k ? kchip(k) : null, h('span.serif', snippet(String(b.body.text || ''), 160))),
          h('div.mr-is', h('span', d && d.type === 'day' ? 'Day · ' + (d.title || fmtDay(b.created)) : 'Quick note · ' + ((d && d.title) || '') + ' · ' + fmtDay(b.created)), sg ? h('span.mr-sg', '→ ' + snippet(sg.doc.title || 'Untitled', 40), sg.terms.length ? h('i', ' shares ' + sg.terms.slice(0, 3).join(', ')) : null) : h('span.mr-sg.none', 'no note shares its terms'))),
        h('div.mr-ia', sg ? h('button.btn.xs.pri', { title: 'File it in ' + (sg.doc.title || 'that note') + ' as a bridge (f)', on: { click: () => MONTHLY.file(b, sg.doc) } }, 'File') : null,
          h('button.btn.xs', { title: 'Pick the note (m)', on: { click: () => MONTHLY.pick([b]) } }, 'Into…'), fl ? h('button.btn.xs', { title: 'Make it a float (l)', on: { click: () => MONTHLY.float([b]) } }, 'Float') : null,
          h('button.btn.xs.ghost', { title: 'Leave it in its note (d)', on: { click: () => MONTHLY.dismiss([b]) } }, 'Leave'))); };
    const n = MONTHLY.sel.size, total = MONTHLY.inboxTotal || L.length, done = Math.max(0, total - L.length);
    return h('div.mr-inbox', { id: 'mr-inbox' },
      h('div.mr-ib', h('div.mr-ring', { style: { '--p': total ? Math.round(100 * done / total) : 100 }, title: done + ' of ' + total + ' placed this visit' }, h('span', String(L.length))),
        h('div', h('b', L.length ? plural(L.length, 'component') + ' belong to no note' : 'Nothing unassigned'), h('div.tiny.muted', keys ? 'j / k move · x select · f or Enter file · m into… · ' + (fl ? 'l float · ' : '') + 'n new note · d leave · u undo' : 'Daily' + (MONTHLY.t('inbox', 'quick') === 'quick' ? ' and quick' : '') + ' notes')),
        n ? h('div.mr-bulk', h('span', n + ' selected'), h('button.btn.xs', { on: { click: () => MONTHLY.pick(chosen()) } }, 'Into…'), h('button.btn.xs', { on: { click: () => MONTHLY.newNote(chosen()) } }, 'New note'), fl ? h('button.btn.xs', { on: { click: () => MONTHLY.float(chosen()) } }, 'Float') : null, h('button.btn.xs.ghost', { on: { click: () => MONTHLY.dismiss(chosen()) } }, 'Leave'), h('button.btn.xs.ghost', { on: { click: () => { MONTHLY.sel.clear(); MONTHLY.redraw(); } } }, 'Clear')) : null),
      L.length ? h('div.mr-ins', L.slice(0, 60).map(row), L.length > 60 ? h('div.tiny.muted', '+' + (L.length - 60) + ' more — file these first') : null) : h('div.empty', 'Every daily-note component is in a note, a float, or left where it is.'));
  },
  floatsEl() {
    if (typeof FLOATS === 'undefined') return null;
    let W = [], P = []; try { W = FLOATS.waiting() || []; P = FLOATS.placed() || []; } catch (e) { return null; }
    const old = W.filter(b => { try { return FLOATS.old(b) != null; } catch (e) { return false; } }), fresh = W.filter(b => !old.includes(b));
    const row = b => h('div.mr-fl', h('span.serif', snippet(String((b.body || {}).text || b.label || ''), 110)), (() => { const o = FLOATS.old(b); return o != null ? h('span.mr-age', o + ' d') : null; })(),
      h('button.btn.xs', { on: { click: () => MONTHLY.placeIn(b) } }, 'Place in…'), h('button.btn.xs', { on: { click: async () => { const t = await askText('A new note from this float', 'Its title', ''); if (!t) return; const d = M.createDoc({ type: 'note', projectId: (M.doc(b.docId) || {}).projectId || null, title: t }); if (typeof FLOATS.place === 'function') FLOATS.place(b, d); else BRIDGE.make(b, d, { quiet: true, why: 'From a float' }); changed(); } } }, 'New note from it'),
      typeof FLOATS.letGo === 'function' ? h('button.btn.xs.ghost', { on: { click: () => { FLOATS.letGo(b); changed(); } } }, 'Let go') : null);
    return h('div.mr-floats', h('div.mr-nums.sm', h('div.mr-num', h('b', String(fresh.length)), h('span', 'Waiting')), h('div.mr-num', h('b', String(old.length)), h('span', 'Waited too long')), h('div.mr-num', h('b', String(P.length)), h('span', 'Placed'))),
      [...old, ...fresh].slice(0, 12).map(row), h('button.btn.sm', { on: { click: () => FLOATS.open() } }, 'Open the floats'));
  },
  placeIn(b) {
    const m = modal({ title: 'Place it in…', actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'A note…', items: q => DB.where('documents', d => MONTHLY.docOk(d) && d.type !== 'day' && (!q || (d.title || '').toLowerCase().includes(q))).sort((a, c) => String(c.modified || '').localeCompare(String(a.modified || ''))),
      render: d => h('div', h('b', d.title || 'Untitled'), h('span.s', (M.project(d.projectId) || {}).name || 'Quick note')), onPick: d => { m.close(); if (typeof FLOATS.place === 'function') { FLOATS.place(b, d); changed(); } else { App.go('#/doc/' + d.id); setTimeout(() => FLOATS.open(), 500); } } }) });
  },
  side(m, months) {
    const a = m.start, b = m.next, score = new Map(), add = (t, s) => { if (!t || !IX.inWin(t, a, b)) return; const k = localDate(new Date(t)); score.set(k, (score.get(k) || 0) + s); };
    DB.all('blocks').forEach(x => { if (x.status !== 'removed' && MONTHLY.docOk(M.doc(x.docId))) add(x.made || x.created, 1); }); DB.all('items').forEach(i => add(i.created, 3));
    for (let d = new Date(a); +d < +b; d = addDays(d, 1)) { const D = IX.day(d), k = localDate(d); if (D.union) score.set(k, (score.get(k) || 0) + Math.round(D.union / 18e5)); }
    const lv = s => !s ? 0 : s < 4 ? 1 : s < 10 ? 2 : s < 20 ? 3 : 4, cells = []; let pad = (a.getDay() + 6) % 7; for (let i = 0; i < pad; i++) cells.push(h('i.mr-hc.pad'));
    for (let d = new Date(a); +d < +b; d = addDays(d, 1)) { const s = score.get(localDate(d)) || 0; cells.push(h('i.mr-hc.l' + lv(s), { title: fmtDay(d) + ' · ' + (s ? s + ' moments' : 'quiet') })); }
    const weeks = []; for (let d = new Date(a); +d < +b; d = addDays(d, 7)) weeks.push([new Date(d), addDays(d, 7)]);
    const projs = DB.where('projects', p => !p.deleted && !p.archived).map(p => { const ids = new Set(DB.where('documents', d => d.projectId === p.id && !d.deleted).map(d => d.id)); const w = weeks.map(([x, y]) => DB.where('blocks', z => ids.has(z.docId) && IX.inWin(z.made || z.created, x, y)).length); return { p, w, n: sum(w) }; }).filter(x => x.n).sort((x, y) => y.n - x.n).slice(0, 6);
    const mx = Math.max(1, ...projs.flatMap(x => x.w)), q = MONTHLY.quiet().slice(0, 5);
    return h('aside.mr-side',
      h('div.mr-box', h('h4', MONTHLY.name(a, true)), h('div.mr-cal', ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => h('b', x)), cells), h('div.mr-leg', 'quiet', [0, 1, 2, 3, 4].map(l => h('i.mr-hc.l' + l)), 'busy')),
      projs.length ? h('div.mr-box', h('h4', 'Projects, week by week'), projs.map(x => h('div.mr-pr', h('span', x.p.name), h('div.mr-bars', x.w.map(v => h('i', { style: { height: Math.round(4 + 22 * v / mx) + 'px' }, title: v + ' components' })))))) : null,
      q.length ? h('div.mr-box', h('h4', 'Gone quiet'), q.map(x => h('a.mr-q', { href: '#/doc/' + x.d.id }, snippet(x.d.title || 'Untitled', 34), h('span', x.days + ' d')))) : null,
      h('div.mr-box', h('h4', 'Inbox'), h('div.mr-q', 'Unassigned', h('span', String(MONTHLY.inbox(m).length))), typeof FLOATS !== 'undefined' ? h('div.mr-q', 'Floats waiting', h('span', String((() => { try { return FLOATS.waiting().length; } catch (e) { return 0; } })()))) : null,
        h('div.mr-q', 'Months waiting', h('span', String(months.filter(x => x.status === 'waiting').length)))));
  },
  redraw() { App._mounted = false; App.refresh(); },
  render(id) {
    const months = MONTHLY.months();
    App.setTitle('Monthly review', [h('span', months.filter(m => m.status === 'waiting').length + ' waiting')]);
    if (!months.length) return h('div.page', h('h1.title', 'Monthly review'), h('div.empty', 'No activity yet — a month’s review appears once you have worked in it.'));
    const want = MONTHLY.parse(id), wid = want ? MONTHLY.id(want) : null;
    let m = months.find(x => x.id === wid); if (!m) m = months.find(x => x.status === 'waiting') || months.find(x => x.status === 'running') || months[0];   // the latest month waiting for you
    const prevM = months[months.indexOf(m) + 1] || null;
    const rv = DB.get('reviews', m.id) || { id: m.id, status: 'pending', flagDecisions: {}, plan: '', picks: {} }; rv.picks = rv.picks || {}; rv.flagDecisions = rv.flagDecisions || {};
    const save = () => DB.put('reviews', rv), S = MONTHLY.stats(m), P = prevM ? MONTHLY.stats(prevM) : null, locked = rv.status === 'complete', L = MONTHLY.inbox(m);
    if (MONTHLY._key !== m.id) { MONTHLY._key = m.id; MONTHLY.inboxTotal = L.length; MONTHLY.cur = 0; MONTHLY.sel.clear(); }
    App.setTitle('Monthly review', [h('span', MONTHLY.name(m.start, true)), h('span.pill' + (m.status === 'waiting' ? '.mag' : m.status === 'complete' ? '.ok' : ''), m.status)]);
    const strip = h('div.mr-strip', months.slice(0, 12).reverse().map(x => { const days = Math.round((+x.next - +x.start) / 864e5);
      return h('a.mr-mo' + (x.id === m.id ? '.on' : '') + '.' + x.status, { href: '#/review/' + x.id, title: x.status === 'complete' ? 'Completed' : x.status === 'waiting' ? 'Waiting for you' : 'Running — opens ' + fmtDay(x.availableAt) }, h('b', MONTHLY.name(x.start).slice(0, 3)), h('span.mr-ms', x.status === 'complete' ? '✓' : x.status === 'waiting' ? '●' : '◐'), h('i.mr-mbar', { style: { '--w': Math.min(100, Math.round(100 * Math.min(Date.now() - +x.start, +x.next - +x.start) / (+x.next - +x.start))) + '%' } })); }));
    const sum0 = rv.summary || MONTHLY.summary(m, S);
    const summ = h('div.mr-sum', h('div.eyebrow', 'What ' + MONTHLY.name(m.start) + ' added up to'),
      h('div.mr-sumtx.serif', { contenteditable: locked ? 'false' : 'true', spellcheck: 'true', on: { blur: e => { const v = e.target.textContent.trim(); if (v && v !== MONTHLY.summary(m, S)) { rv.summary = v; save(); } } } }, sum0),
      !locked && rv.summary ? h('button.btn.xs.ghost', { on: { click: () => { delete rv.summary; save(); MONTHLY.redraw(); } } }, 'Back to the takeaways') : null);
    const nav = h('div.mr-nav', [['#mr-report', 'Report'], ['#mr-inbox', 'Unassigned · ' + L.length], typeof FLOATS !== 'undefined' ? ['#mr-fl', 'Floats'] : null, ['#mr-next', 'Next month']].filter(Boolean).map(([a, l]) => h('a', { href: 'javascript:void 0', on: { click: () => { const el = $(a); el && el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); } } }, l)),
      h('span.spacer'), h('button.btn.sm' + (MONTHLY.doc ? '.on' : ''), { title: 'The report laid out as a page to send or print', on: { click: () => { MONTHLY.doc = !MONTHLY.doc; MONTHLY.redraw(); } } }, MONTHLY.doc ? 'Back to the review' : 'Document view'));
    if (MONTHLY.doc) return h('div.page.mr-page.mr-docv', strip, nav, h('div.mr-docpage', h('div.eyebrow', 'Monthly review'), h('h1.title', MONTHLY.name(m.start, true)), h('p.serif.mr-sumtx', sum0), MONTHLY.report(m, S, P),
      h('div.row', { style: { marginTop: '18px' } }, h('button.btn', { on: { click: () => window.print() } }, 'Print or save as PDF'))));
    const picks = MONTHLY.carry(m, S), toggle = (x, on) => { rv.picks[x.id] = on; const lines = (rv.plan || '').split('\n').filter(l => l.trim() !== '• ' + x.line); if (on) lines.push('• ' + x.line); rv.plan = lines.filter((l, i, A) => l.trim() || i < A.length - 1).join('\n').replace(/^\n+/, ''); save(); MONTHLY.redraw(); };
    const nextName = MONTHLY.name(m.next);
    const next = h('div.mr-next', { id: 'mr-next' }, h('div.sec-h', h('h2', 'Next month'), h('span.k', 'tick what ' + nextName + ' should attend to')),
      picks.length ? h('div.mr-picks', picks.map(x => h('label.mr-pick.k-' + x.kind, h('input', { type: 'checkbox', checked: !!rv.picks[x.id], disabled: locked, on: { change: e => toggle(x, e.target.checked) } }), h('span', x.line)))) : h('div.tiny.muted', 'Nothing open to carry over.'),
      h('div.lab', nextName + ', I will attend to — the review note’s synthesis'),
      h('textarea.inp', { rows: 4, value: rv.plan || '', disabled: locked, placeholder: nextName + ', I will attend to… (commit to attend, not to finish)', on: { change: e => { rv.plan = e.target.value; save(); } } }),
      h('div.row', { style: { marginTop: '12px' } }, locked ? [h('span.pill.ok', '✓ completed ' + fmtWhen(rv.completedAt)), rv.docId ? h('a.btn.sm', { href: '#/doc/' + rv.docId }, 'Open the review note') : null]
        : [h('button.btn.pri', { disabled: m.status === 'running' && !settings().reviewPreview, title: m.status === 'running' ? 'This month is still running; its review opens ' + fmtDayLong(m.availableAt) : '', on: { click: () => MONTHLY.complete(m, rv, S) } }, 'Complete the review'),
          m.status === 'running' ? h('span.tiny.muted', 'Opens ' + fmtDayLong(m.availableAt)) : null]));
    const head = h('div.mr-head', h('div', h('div.eyebrow', 'Monthly review'), h('h1.title', MONTHLY.name(m.start, true)),
      h('p.stand', m.status === 'complete' ? 'Completed ' + fmtWhen(rv.completedAt) + '.' : m.status === 'waiting' ? 'Open since ' + fmtDayLong(m.availableAt) + '. It stays open until you complete it.' : 'Running — this month’s review opens ' + fmtDayLong(m.availableAt) + '. What it holds so far:')));
    return h('div.page.mr-page', strip, h('div.mr-grid', h('div.mr-main', head, summ, nav, MONTHLY.report(m, S, P),
      h('div.sec-h', h('h2', 'Unassigned'), h('span.k', 'components of daily' + (MONTHLY.t('inbox', 'quick') === 'quick' ? ' and quick' : '') + ' notes that belong to no note of the Portfolio')), MONTHLY.inboxEl(m, L),
      typeof FLOATS !== 'undefined' ? [h('div.sec-h', { id: 'mr-fl' }, h('h2', 'Floats'), h('span.k', 'waiting for a note')), MONTHLY.floatsEl()] : null, next), MONTHLY.side(m, months)));
  },
  key(e) {
    if (!App.route || App.route.name !== 'review' || !MONTHLY.on() || !MONTHLY.t('keys', true) || MONTHLY.doc) return;
    const t = e.target; if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.closest('input,textarea,select,[contenteditable="true"]') || t.isContentEditable)) || document.querySelector('.ovl,.pop')) return;
    const m = MONTHLY.months().find(x => x.id === MONTHLY._key); if (!m) return; const L = MONTHLY.inbox(m), b = L[MONTHLY.cur], k = e.key;
    const chosen = MONTHLY.sel.size ? L.filter(x => MONTHLY.sel.has(x.id)) : b ? [b] : [];
    const done = () => { e.preventDefault(); const el = $(`.mr-in[data-id="${(L[MONTHLY.cur] || {}).id}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
    if (k === 'j' || k === 'ArrowDown' && e.shiftKey) { MONTHLY.cur = Math.min(L.length - 1, MONTHLY.cur + 1); MONTHLY.redraw(); return done(); }
    if (k === 'k') { MONTHLY.cur = Math.max(0, MONTHLY.cur - 1); MONTHLY.redraw(); return done(); }
    if (k === 'x' && b) { MONTHLY.sel.has(b.id) ? MONTHLY.sel.delete(b.id) : MONTHLY.sel.add(b.id); MONTHLY.redraw(); return done(); }
    if ((k === 'f' || k === 'Enter') && chosen.length) { MONTHLY.fileMany(chosen.map(c => { const sg = MONTHLY.suggest(c); return sg ? [c, sg.doc] : null; }).filter(Boolean), n => n > 1 ? plural(n, 'component') + ' filed where they belong' : 'Filed where it belongs, as a bridge'); return done(); }
    if (k === 'm' && chosen.length) { MONTHLY.pick(chosen); return done(); }
    if (k === 'l' && chosen.length && typeof FLOATS !== 'undefined') { MONTHLY.float(chosen); return done(); }
    if (k === 'n' && chosen.length) { MONTHLY.newNote(chosen); return done(); }
    if (k === 'd' && chosen.length) { MONTHLY.dismiss(chosen); return done(); }
    if (k === 'u') { MONTHLY.undo(); return done(); }
  },
  /** Settings preview: a report card and an inbox row, as set. */
  preview() {
    const lvl = MONTHLY.t('deliver', 'all'), cmp = MONTHLY.t('compare', true), keys = MONTHLY.t('keys', true);
    return [h('div.mr-pv', h('div.mr-nums.sm', [['Results', 7, 3], ['Takeaways', 5, 4]].map(([l, n, p]) => h('div.mr-num', h('b', String(n)), h('span', l), cmp ? MONTHLY.delta(n, p) : null))),
      h('div.mr-card', h('div.mr-ch', h('a', 'Analysis — traction maps'), h('span', '2 takeaways · 1 result')),
        h('div.mr-sec', h('h5', h('i.kdot', { style: { background: 'var(--k-takeaway)' } }), 'Takeaways'), h('div.mr-ln', h('span.mr-tx', 'The edge pulls through its focal adhesions'))),
        h('div.mr-sec', h('h5', h('i.kdot', { style: { background: 'var(--k-result)' } }), 'Results'), h('div.mr-ln', h('span.mr-tx', 'Peak traction 1.2 kPa at the rim'))),
        lvl !== 'core' ? h('div.mr-sec', h('h5', h('i.kdot', { style: { background: 'var(--k-resolution)' } }), 'Barriers resolved'), h('div.mr-ln', h('span.mr-tx', 'Bead drift smeared the maps', h('span.mr-sub', ' — through ', h('span.term-demo', 'bead drift'))))) : null),
      h('div.mr-in.cur', h('div.mr-int', h('div.mr-it', h('span.serif', 'Try 40k/cm² seeding next run')), h('div.mr-is', h('span', 'Day · 12 Nov'), h('span.mr-sg', '→ Seeding density notes'))), h('div.mr-ia', h('button.btn.xs.pri', 'File'), keys ? h('kbd', 'f') : null))),
      PV.cap('Opens ' + (MONTHLY.t('opens', 'after') === 'weekend' ? 'on the month’s last weekend' : 'the day after the month ends') + ' · deliverables: ' + ({ core: 'takeaways and results', more: '+ barriers resolved, questions answered', all: '+ Reports and References' }[lvl] || lvl) + '.')];
  },
};
addEventListener('keydown', e => { try { MONTHLY.key(e); } catch (err) { console.warn('[monthly]', err); } });
{
  // the Review tab is the monthly review; the weekly bet stays as renderWeek (a pulse can come back later)
  ReviewView.renderWeek = ReviewView.render;
  ReviewView.render = function (id) { return MONTHLY.on() ? MONTHLY.render(id) : ReviewView.renderWeek(id); };
  // the Today page's "waiting" counts months now
  const pr = IX.pendingReviews.bind(IX); IX.pendingReviews = function () { return MONTHLY.on() ? MONTHLY.months().filter(m => m.status === 'waiting') : pr(); };
}
