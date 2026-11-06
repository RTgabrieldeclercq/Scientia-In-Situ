/* ==========================================================================
   18 · The weekly bet (§6). A read over the indexes plus your decisions.
   Opens on the weekend after the week ends (Sat→Fri, so the past Saturday
   and Sunday are in it), stays open until you complete it, never graded for
   you. Order: what needs addressing → decide → what moved → rate → friction
   → signal → bet next week. Completing it writes a `review` note whose lanes
   are its components and whose synthesis is next week's plan.
   ========================================================================== */
const ReviewView = {
  title: true,
  render(weekId) {
    const weeks = IX.reviewWeeks();
    App.setTitle('Weekly review', [h('span', weeks.filter(w => w.status === 'pending').length + ' waiting')]);
    if (!weeks.length) return h('div.page', h('h1.title', 'Weekly review'), h('div.empty', 'No activity yet — reviews appear once you have worked for a week.'));
    let w = weeks.find(x => x.id === weekId);
    if (!w) w = weeks.filter(x => x.status === 'pending').pop() || weeks.find(x => x.status === 'preview') || weeks.find(x => x.status === 'complete') || weeks[0];
    const rv = DB.get('reviews', w.id) || { id: w.id, status: 'pending', flagDecisions: {}, impact: null, alloc: null, plan: '', longBlocks: {} };
    rv.flagDecisions = rv.flagDecisions || {}; rv.longBlocks = rv.longBlocks || {};
    const save = () => { DB.put('reviews', rv); }, S = IX.weekStats(w.start), locked = rv.status === 'complete';
    App.setTitle('Weekly review', [h('span', `${DOW[w.start.getDay()]} ${fmtDay(w.start)} – ${DOW[w.end.getDay()]} ${fmtDay(w.end)}`), h('span.pill' + (w.status === 'pending' ? '.mag' : w.status === 'complete' ? '.ok' : ''), w.status)]);
    const chips = h('div.row.weeks', weeks.slice(0, 12).map(x => h('a.btn.sm' + (x.id === w.id ? '.on' : ''), { href: '#/review/' + x.id, title: x.status },
      x.status === 'complete' ? '✓ ' : x.status === 'pending' ? '● ' : x.status === 'preview' ? '◐ ' : '○ ', `${fmtDay(x.start)}–${fmtDay(x.end)}`)));
    const head = [h('div.eyebrow', 'Weekly review · the bet'), h('h1.title', `${DOW[w.start.getDay()]} ${fmtDay(w.start)} – ${DOW[w.end.getDay()]} ${fmtDay(w.end)}`),
      h('p.stand', w.status === 'complete' ? `Completed ${fmtWhen(rv.completedAt)}.` : w.status === 'pending' ? `Open since ${fmtDayLong(w.availableAt)}. It stays available until you complete it, and nothing is graded for you if Sunday passes.` : w.status === 'preview' ? 'Preview of the current, unfinished week (enabled in Settings).' : `Opens ${fmtDayLong(w.availableAt)}.`),
      chips];
    if (w.status === 'upcoming') return h('div.page.narrow', head, h('div.callout', { style: { marginTop: '20px' } }, h('b.h', 'Not open yet'), `This week runs until ${fmtDayLong(w.end)}; its review opens that weekend. `,
      h('button.btn.sm', { on: { click: () => { saveSettings({ reviewPreview: true }); changed(); } } }, 'Preview it now')));

    /* ---- everything that needs addressing, first ---- */
    const flags = DB.where('flags', f => (f.status === 'open' && +new Date(f.created) < +S.b) || rv.flagDecisions[f.id]).sort((a, b) => b.carry - a.carry || a.created.localeCompare(b.created));
    const undecided = flags.filter(f => !rv.flagDecisions[f.id] && f.status === 'open');
    const openS = S.openSessions, staleOpen = openS.filter(s => Date.now() - +new Date(s.created) > 7 * 864e5);
    const sugg = ReviewView.suggestions(S), unclassified = S.items.filter(i => i.kind === 'takeaway');
    const openB = IX.openBarriers().sort((a, b) => a.created.localeCompare(b.created));
    const devs = groupBy(DB.where('items', i => i.kind === 'deviation'), i => { const b = M.block(i.originBlockId); const pb = b && b.boundTo && M.block(b.boundTo.componentId); return pb ? 'p:' + pb.id : 'b:' + ((b && (b.label || M.blockName(b))) || '—'); });
    const recurring = Object.entries(devs).filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length);
    const themes = DB.where('themes', t => t.status === 'active').map(t => ({ t, H: IX.themeHealth(t), br: ReviewView.breaker(t, w.start) }));
    const ageingQ = DB.where('items', i => i.kind === 'question' && IX.status(i) !== 'closed' && Date.now() - +new Date(i.created) > 14 * 864e5);
    const reminders = S.items.filter(i => i.kind === 'reminder' && i.status !== 'closed');
    const contested = DB.where('items', i => i.kind === 'claim' && i.stance === 'contested' && !i.correctedBy);
    const unmeasured = S.perDay.filter(D => D.total === 0 && D.edits > 0);
    const unrated = weeks.filter(x => x.status === 'complete' && x.rv && x.rv.impact == null);
    const openLinks = DB.all('blocks').filter(b => b.status === 'live').flatMap(b => (b.body.marks || []).filter(m => m.type === 'link' && !IX.linkTarget(m)).map(m => ({ b, m })));
    const cycle = ReviewView.cycleDue(), daySec = DAY.reviewSection(w, rv.status === 'complete');
    const todo = [
      [undecided.length, 'flags to resolve or keep', '#rv-1'], [openS.length, 'unfinished time entries' + (staleOpen.length ? ` (${staleOpen.length} older than a week)` : ''), '#rv-1'], [unclassified.length, 'unclassified takeaways', '#rv-1'],
      [sugg.length, 'suggested connections', '#rv-1'], [daySec.todo, 'day entries to assign to a theme or file', '#rv-1'], [unmeasured.length, 'days with edits but no time (backfill)', '#rv-2'], [rv.impact == null ? 1 : 0, 'impact rating', '#rv-3'],
      [openB.length, 'open barriers (Unblock lane)', '#rv-4'], [recurring.filter(([, v]) => v.length >= 3).length, 'steps with 3+ deviations — revise the protocol', '#rv-4'],
      [themes.filter(x => x.H.stalled).length, 'stalled themes — continue, re-shape or retire', '#rv-4'], [themes.filter(x => x.br).length, 'themes at the circuit breaker', '#rv-6'],
      [ageingQ.length, 'ageing questions (Explore lane)', '#rv-5'], [reminders.length, 'reminders — they expire when this review closes', '#rv-5'], [contested.length, 'contested claims', '#rv-5'],
      [openLinks.length, 'links to notes not yet written', '#rv-5'], [cycle ? 1 : 0, 'cycle review due (every ~6 weeks)', '#rv-7']].filter(x => x[0]);
    const addr = h('div.address', h('div.lab', `To address · ${todo.length ? sum(todo.map(x => x[0])) : 'nothing'}`), todo.length ? h('div.addr-g', todo.map(([n, l, a]) => h('a.addr', { href: 'javascript:void 0', on: { click: () => { const el = $(a); el && el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); } } }, h('b', n), l))) : h('div.tiny.muted', 'Nothing outstanding.'));

    /* ---- 1 · decide ---- */
    const flagRow = f => { const t = M.describeTarget(f.targetType, f.targetId) || { title: '(missing)', sub: '' }, dec = rv.flagDecisions[f.id];
      return h('div.li', t.kind ? kchip(t.kind) : h('span.pill', f.targetType), h('span.t.click', { on: { click: () => t.go && t.go() } }, h('span.serif', t.title), h('span.s', [t.sub, f.reason ? '“' + f.reason + '”' : null, f.carry ? `kept ${f.carry}×` : null, f.reflagged ? `re-flagged ${f.reflagged}×` : null].filter(Boolean).join(' · '))),
        f.carry >= 3 || f.reflagged >= 3 ? h('span.pill.warn', 'recurring — a different signal') : null,
        dec ? h('span.pill' + (dec.action === 'keep' ? '' : '.ok'), dec.action === 'keep' ? 'kept → next week' : 'resolved') : locked ? null : h('span.row', { style: { gap: '4px', flexWrap: 'nowrap' } },
          h('button.btn.xs', { on: { click: async () => { const txt = await askText('Resolve with a note', 'What settles it? (becomes a component wired to the flagged item)', '', { multiline: true }); if (!txt) return; ReviewView.resolveFlag(f, rv, { type: 'note', text: txt }); } } }, 'Resolve with note'),
          h('button.btn.xs', { on: { click: () => ReviewView.resolveWithComponent(f, rv) } }, '…with component'),
          h('button.btn.xs.ghost', { on: { click: () => { f.carry = (f.carry || 0) + 1; f.history = [...(f.history || []), { week: w.id, action: 'keep' }]; DB.put('flags', f); rv.flagDecisions[f.id] = { action: 'keep', at: isoLocal(new Date()) }; save(); changed(); } } }, 'Keep'))); };
    const step1 = ReviewView.step(1, 'Decide', 'Everything that needs a decision before you read the numbers. Each flag must be resolved — with a note or a component — or kept for next week.', undecided.length === 0,
      h('div.lab', `Flags · ${flags.length}${undecided.length ? ` · ${undecided.length} undecided` : ''}`), capped(flags, 5, flagRow, 'No flags this week'), daySec.el,
      openS.length ? [h('div.lab', `Unfinished time entries · ${openS.length}`), h('div.callout.warn', { style: { marginBottom: '8px' } }, 'An open entry has no duration yet — every total below is incomplete until these are closed.'),
        capped(openS, 5, s => h('div.li', h('span.t', (M.doc(s.docId) || {}).title, h('span.s', s.startedAt ? 'started ' + fmtWhen(s.startedAt) : 'ended ' + fmtWhen(s.endedAt))), h('button.btn.xs', { on: { click: () => DocView.completeOpen(s) } }, 'Complete')))] : null,
      sugg.length ? [h('div.lab', `Suggested connections · ${sugg.length}`), capped(sugg, 5, sg => h('div.li', h('span.t', h('span.serif', `“${snippet(M.blockName(M.block(sg.from)), 38)}” → “${snippet(M.blockName(M.block(sg.to)), 38)}”`), h('span.s', h('span.term-demo', sg.term.label), ' · ', sg.rel)),
        h('button.btn.xs', { on: { click: () => { M.wire(sg.from, sg.to, 'leads', true); DB.put('verdicts', { id: sg.key, verdict: 'accepted', at: isoLocal(new Date()) }); } } }, 'Connect'), h('button.btn.xs.ghost', { on: { click: () => { DB.put('verdicts', { id: sg.key, verdict: 'dismissed', at: isoLocal(new Date()) }); changed(); } } }, 'Dismiss')))] : null,
      unclassified.length ? [h('div.lab', `Unclassified takeaways · ${unclassified.length}`), capped(unclassified, 5, it => itemRow(it, h('span.row', { style: { gap: '3px', flexWrap: 'nowrap' } }, ['claim', 'evidence', 'decision', 'question', 'reminder'].map(k => h('button.btn.xs', { title: 'Reclassify as ' + k, on: { click: e => { e.stopPropagation(); M.setItem(it, { kind: k, status: KIND[k].lifecycle === 'open' ? 'open' : null, stance: k === 'claim' ? 'supported' : null }); } } }, KIND[k].label[0])))))] : null);

    /* ---- 2 · what moved (raw, derived) ---- */
    const themeRows = Object.entries(S.byTheme).map(([tid, ms]) => ({ t: M.theme(tid), tid, ms })).sort((a, b) => b.ms - a.ms), totT = sum(themeRows.map(r => r.ms));
    const prevRv = ReviewView.previous(w), planned = prevRv && prevRv.alloc ? prevRv.alloc : null, plannedTot = planned ? sum(Object.values(planned).map(x => x.blocks || 0)) : null;
    const aimsMet = DB.all('aims').flatMap(a => a.milestones.filter(m => m.metAt && IX.inWin(m.metAt, S.a, S.b)).map(m => ({ a, m })));
    const kindsBy = ['barrier', 'resolution', 'claim', 'evidence', 'result', 'takeaway', 'decision', 'question', 'deviation'];
    const themeKinds = {}; S.items.forEach(i => { const d = M.doc(i.originDocId), tid = (d && d.themeId) || '_'; (themeKinds[tid] = themeKinds[tid] || {})[i.kind] = ((themeKinds[tid] || {})[i.kind] || 0) + 1; });
    const step2 = ReviewView.step(2, 'What moved', 'Raw counts derived from what you wrote and timed — nothing typed by hand.', true,
      h('div.tiles', kindsBy.slice(0, 8).map(k => tile(S.byKind[k] || 0, KIND[k].label + (k === 'evidence' ? '' : 's'), k === 'barrier' ? `${S.resolvedBarriers} resolved` : null, k)),
        tile(S.docsCreated.length, 'notes created', `${S.docsEdited.length} more edited`), tile(fmtDur(S.total), 'recorded', S.multi ? `${fmtDur(S.multi)} multitask, counted once` : (S.manual ? fmtDur(S.manual) + ' manual' : null))),
      h('div.two', { style: { marginTop: '16px' } },
        h('div', h('div.lab', 'Hours per theme · planned vs measured'), h('div.list', h('table.t', h('thead', h('tr', h('th', 'Theme'), h('th', 'Recorded'), h('th', 'Share'), h('th', 'Blocks'), planned ? h('th', 'Planned') : null)),
          h('tbody', themeRows.map(r => h('tr', h('td', r.t ? r.t.name : 'unassigned'), h('td', fmtDur(r.ms)), h('td', totT ? Math.round(100 * r.ms / totT) + '%' : '—'), h('td', (r.ms / 54e5).toFixed(1)), planned ? h('td', (planned[r.tid] || {}).blocks != null ? String(planned[r.tid].blocks) : '—') : null)),
            h('tr.tot', h('td', 'Total'), h('td', fmtDur(S.total)), h('td', ''), h('td', (S.total / 54e5).toFixed(1) + ' measured'), planned ? h('td', plannedTot + ' planned') : null)))),
          planned && prevRv.docId && !locked ? h('div.tiny.muted', { style: { marginTop: '6px' } }, 'Where the week diverged from the plan, ', h('a', { href: 'javascript:void 0', on: { click: () => ReviewView.logDivergence(prevRv, themeRows, planned) } }, 'log it as a deviation on last week’s plan'), '.') : null,
          unmeasured.length ? h('div.callout', { style: { marginTop: '10px' } }, h('b.h', plural(unmeasured.length, 'day') + ' unmeasured, not empty'), unmeasured.map(D => h('button.btn.xs', { style: { margin: '2px' }, on: { click: () => ReviewView.backfill(D.date) } }, 'Backfill ' + fmtDay(parseDay(D.date))))) : null),
        h('div', h('div.lab', 'Terms this week, by structure'), S.terms.length ? h('div.list', S.terms.slice(0, 6).map(x => h('div.li.click', { on: { click: () => App.go('#/lens/' + x.term.id) } }, h('span', { style: { width: '150px', flex: 'none' } }, h('span.term-demo', x.term.label)), h('span.t', h('span.row', Object.entries(x.kinds).map(([k, n]) => kchip(k, `${KIND[k].label} ${n}`)))))))
          : h('div.list', h('div.empty', 'No structured terms this week')),
          Object.keys(themeKinds).length ? [h('div.lab', 'Structures by theme'), h('div.list', h('table.t.compact', h('thead', h('tr', h('th', 'Theme'), kindsBy.map(k => h('th', { title: KIND[k].label }, h('i.kdot', { style: { background: `var(--k-${k})` } }))))),
            h('tbody', Object.entries(themeKinds).map(([tid, ks]) => h('tr', h('td', (M.theme(tid) || { name: 'project-wide' }).name), kindsBy.map(k => h('td', ks[k] || ''))))))) ] : null,
          aimsMet.length ? [h('div.lab', 'Aim milestones met'), h('div.list', aimsMet.map(({ a, m }) => h('div.li', h('span.t', m.label, h('span.s', a.statement)), h('span.pill.teal', 'w ' + m.weight.toFixed(2)))))] : null)));

    /* ---- 3 · rate ---- */
    const hist = weeks.slice().reverse().filter(x => +x.start <= +w.start).slice(-8);
    const effort = S.total / 54e5, boost = S.aimBoost;
    const val = h('span.grade', rv.impact == null ? '—' : String(rv.impact), boost ? h('span.boost', `(+${boost.toFixed(1)})`) : null);
    const retTxt = () => rv.impact == null ? 'not rated' : `effort ${effort.toFixed(1)} blocks · return ${effort ? ((rv.impact + boost) / effort).toFixed(2) : '—'} per block`;
    const ret = h('div.mono.tiny.muted', retTxt());
    const slider = h('input', { type: 'range', min: 0, max: 10, step: 1, value: rv.impact == null ? 5 : rv.impact, disabled: locked, on: { input: e => { rv.impact = +e.target.value; rv.ratedAt = isoLocal(new Date()); save(); val.firstChild.textContent = rv.impact; ret.textContent = retTxt(); }, change: () => { App._mounted = false; App.refresh(); } } });
    const late = rv.ratedAt && +new Date(rv.ratedAt) > +addDays(w.availableAt, 3);
    const step3 = ReviewView.step(3, 'Rate the week', 'Impact out of ten — after seeing what moved, before the friction list. Time is context, never a multiplier.', rv.impact != null,
      h('div.card.flat', h('div.row', { style: { flexWrap: 'nowrap', gap: '20px' } }, val, h('div', { style: { flex: 1 } }, slider, ret, late ? h('div.tiny', { style: { color: 'var(--warn)' } }, 'rated late (' + fmtDay(rv.ratedAt) + ') — less reliable than a same-weekend rating') : null),
        h('div', h('div.tiny.mono.muted', 'last 8'), h('div.spark', hist.map(x => { const r = x.id === w.id ? rv : x.rv; return r && r.impact != null ? h('i' + (x.id === w.id ? '.cur' : ''), { title: `${fmtDay(x.start)}: ${r.impact}`, style: { height: (r.impact * 10) + '%' } }) : h('i.gap', { title: fmtDay(x.start) + ': unrated — a gap, never a zero' }); })))),
        h('div.tiny.muted', { style: { marginTop: '8px' } }, 'Shown as impact (+aim boost) side by side, never summed or clamped. Unrated weeks stay gaps. No averages, streaks or targets.')));

    /* ---- 4 · friction ---- */
    const step4 = ReviewView.step(4, 'Friction', 'What blocked. Open barriers pull blocks into Unblock; three identical deviations mean the protocol is wrong, not the runs. Hours are read alongside barriers.', true,
      h('div.lab', `Open barriers · ${openB.length}`), capped(openB, 5, it => itemRow(it, h('span.tiny.mono.muted', Math.floor((Date.now() - +new Date(it.created)) / 864e5) + 'd old')), 'No open barriers'),
      recurring.length ? [h('div.lab', 'Recurring deviations'), h('div.list', recurring.map(([k, v]) => { const pb = k.startsWith('p:') && M.block(k.slice(2)); return h('div.li' + (pb ? '.click' : ''), { on: { click: () => pb && App.openBlock(pb.id) } }, kchip('deviation', v.length + '×'), h('span.t', pb ? (M.doc(pb.docId) || {}).title + ' › ' + M.blockName(pb) : k.slice(2), h('span.s', v.map(i => snippet(i.text, 40)).join(' · '))), v.length >= 3 ? h('span.pill.warn', 'revise the protocol') : null); }))] : null,
      h('div.lab', 'Theme roster'), h('div.list', h('table.t', h('thead', h('tr', h('th', 'Theme'), h('th', 'Last activity'), h('th', '4 wk'), h('th', 'Open barriers'), h('th', 'Hours + barriers say'))),
        h('tbody', themes.map(({ t, H }) => h('tr', h('td', h('a', { href: '#/theme/' + t.id }, t.name)), h('td', H.days == null ? '—' : H.days + 'd ago'), h('td', fmtDur(H.ms4)), h('td', H.openB.length),
          h('td', H.stalled ? h('span.pill.warn', 'stalled — re-shape or retire') : H.ms4 > 6 * 36e5 && H.openB.length >= 2 ? h('span.pill.bad', 'stuck, not productive') : H.aims.length ? h('span.pill.teal', 'advancing') : h('span.pill', 'exploratory'))))))));

    /* ---- 5 · signal ---- */
    const sig = S.items.filter(i => ['claim', 'evidence', 'decision', 'result'].includes(i.kind)).sort((a, b) => b.created.localeCompare(a.created));
    const step5 = ReviewView.step(5, 'Signal', 'What you marked as mattering. Reminders expire when this review closes; questions age into Explore.', true,
      capped(sig, 5, it => itemRow(it), 'Nothing marked this week'),
      reminders.length ? [h('div.lab', `Reminders · ${reminders.length} · expire at completion`), capped(reminders, 5, it => itemRow(it))] : null,
      ageingQ.length ? [h('div.lab', `Ageing questions · ${ageingQ.length}`), capped(ageingQ, 4, it => itemRow(it, h('span.tiny.mono.muted', Math.floor((Date.now() - +new Date(it.created)) / 864e5) + 'd')))] : null,
      contested.length ? [h('div.lab', `Contested claims · ${contested.length}`), capped(contested, 4, it => itemRow(it))] : null,
      openLinks.length ? [h('div.lab', `Links to notes not yet written · ${openLinks.length}`), capped(openLinks, 4, ({ b, m }) => h('div.li.click', { on: { click: () => App.openBlock(b.id) } }, h('span.t', '“' + (m.title || '') + '”', h('span.s', M.docPath(M.doc(b.docId))))))] : null);

    /* ---- 6 · bet next week: appetites on themes, not tasks ---- */
    const alloc = rv.alloc || ReviewView.suggestAlloc(S, openB, ageingQ, themes), why = ReviewView._why || {};
    const laneTot = k => sum(Object.values(alloc).filter(x => x.lane === k).map(x => x.blocks || 0));
    const slack = alloc._slack ? alloc._slack.blocks : 0, total = sum(Object.values(alloc).map(x => x.blocks || 0));
    const setA = (tid, patch) => { alloc[tid] = Object.assign({}, alloc[tid] || { blocks: 0, lane: 'cont' }, patch); rv.alloc = alloc; save(); App._mounted = false; App.refresh(); };
    const wip = Object.entries(alloc).filter(([k, v]) => k !== '_slack' && v.blocks > 0).length;
    const rows = themes.map(({ t, H, br }) => { const a = alloc[t.id] || { blocks: 0, lane: H.openB.length ? 'unblock' : H.aims.length ? 'cont' : 'explore' };
      return h('tr', h('td', h('a', { href: '#/theme/' + t.id }, t.name), br ? h('div.tiny', { style: { color: 'var(--bad)' } }, 'circuit breaker: ' + br) : null),
        h('td', h('select.inp.sm', { disabled: locked, on: { change: e => setA(t.id, { lane: e.target.value }) } }, [['cont', 'Continue'], ['unblock', 'Unblock'], ['explore', 'Explore']].map(([v, l]) => h('option', { value: v, selected: a.lane === v }, l)))),
        h('td', h('span.stepper', h('button.btn.xs', { disabled: locked, on: { click: () => setA(t.id, { blocks: Math.max(0, (a.blocks || 0) - 1) }) } }, '−'), h('b.mono', String(a.blocks || 0)), h('button.btn.xs', { disabled: locked || !!br, title: br ? 'Re-shape the theme before it can receive a fourth week of blocks' : '', on: { click: () => setA(t.id, { blocks: (a.blocks || 0) + 1 }) } }, '+'))),
        h('td', h('label.switch', h('input', { type: 'checkbox', checked: !!rv.longBlocks[t.id], disabled: locked, on: { change: e => { rv.longBlocks[t.id] = e.target.checked; save(); } } }), 'one long block'))); });
    const plan = h('textarea.inp', { rows: 4, value: rv.plan || '', disabled: locked, placeholder: 'Next week I will attend to… (commit to attend, not to finish)', on: { change: e => { rv.plan = e.target.value; save(); } } });
    const canComplete = undecided.length === 0 && rv.impact != null;
    const step6 = ReviewView.step(6, 'Bet next week', 'Blocks of 90 minutes on themes. The suggestion is computed from this week’s data — the arithmetic is shown; override it freely.', locked,
      h('div.lanes', [['cont', 'Continue'], ['unblock', 'Unblock'], ['explore', 'Explore']].map(([k, l]) => h('div.lane', h('div.ln', l), h('div.lv', laneTot(k)), h('div.why', rv.alloc ? 'from your allocation' : (why[k] || '')))),
        h('div.lane', h('div.ln', 'Unallocated'), h('div.row', { style: { flexWrap: 'nowrap' } }, h('div.lv', slack), h('span.spacer'), locked ? null : h('span.stepper', h('button.btn.xs', { on: { click: () => setA('_slack', { blocks: Math.max(0, slack - 1), lane: 'slack' }) } }, '−'), h('button.btn.xs', { on: { click: () => setA('_slack', { blocks: slack + 1, lane: 'slack' }) } }, '+'))), h('div.why', total ? Math.round(100 * slack / total) + '% deliberate slack (aim ≈ 20%)' : ''))),
      h('div.list', { style: { marginTop: '12px' } }, h('table.t', h('thead', h('tr', h('th', 'Theme'), h('th', 'Lane'), h('th', 'Blocks'), h('th', 'Maker time'))), h('tbody', rows))),
      wip > 3 ? h('div.callout.warn', { style: { marginTop: '8px' } }, `${wip} themes get blocks. Four active themes is how a month passes with everything half-done — stop starting, start finishing (WIP limit 2–3).`) : h('div.tiny.muted', { style: { marginTop: '6px' } }, `${wip} active theme${wip === 1 ? '' : 's'} · WIP limit 3 · ${total} blocks`),
      h('div.lab', 'Plan — becomes next week’s baseline (the review note’s synthesis)'), plan,
      h('div.row', { style: { marginTop: '14px' } }, locked ? [h('span.pill.ok', '✓ completed ' + fmtWhen(rv.completedAt)), rv.docId ? h('a.btn.sm', { href: '#/doc/' + rv.docId }, 'Open the review note') : null] : [
        h('button.btn.pri', { disabled: !canComplete, on: { click: () => ReviewView.complete(w, rv, S, alloc, boost, effort, reminders, flags) } }, 'Complete review'),
        !canComplete ? h('span.tiny.muted', [undecided.length ? `${plural(undecided.length, 'flag')} still undecided` : null, rv.impact == null ? 'impact not rated' : null].filter(Boolean).join(' · ')) : null]));
    const step7 = cycle ? h('div', { id: 'rv-7' }, ReviewView.cycleEl(themes, recurring, contested)) : null;
    return h('div.page.narrow', head, addr, step1, step2, step3, step4, step5, step6, step7);
  },
  step(n, title, desc, done, ...body) { return h('div.rv-step' + (done ? '.done' : ''), { id: 'rv-' + n }, h('div.rv-num', done ? '✓' : n), h('div.bd', h('h2', title), h('p.d', desc), body)); },
  previous(w) { const prev = localDate(addDays(w.start, -7)); return DB.get('reviews', prev); },
  complete(w, rv, S, alloc, boost, effort, reminders, flags) {
    const now = isoLocal(new Date()); rv.status = 'complete'; rv.completedAt = now; rv.boostAtRating = boost; rv.effortBlocks = +effort.toFixed(2); rv.alloc = alloc; rv.weekEnd = localDate(w.end);
    reminders.forEach(i => { i.status = 'closed'; i.closedAt = now; i.expiredBy = rv.id; DB.put('items', i); });
    // flags the review surfaced and you decided on: resolved ones stay resolved, kept ones carry over
    // the review is a document too (§6): lanes are components, the plan is its synthesis
    const d = { id: 'd_rv_' + rv.id, type: 'review', scope: 'global', projectId: null, themeId: null, title: `Weekly review · ${fmtDay(w.start)}–${fmtDay(w.end)}`, templateId: null, header: { tags: ['review'], week: rv.id }, blockIds: [], synthesis: { text: rv.plan || '', marks: [] }, citeMode: 'title', layout: { head: { x: 0, y: 0 } }, created: now, modified: now };
    DB.put('documents', d);
    [['cont', 'Continue'], ['unblock', 'Unblock'], ['explore', 'Explore'], ['slack', 'Unallocated']].forEach(([k, l], i) => {
      const ts = Object.entries(alloc).filter(([tid, v]) => (v.lane || 'cont') === k && v.blocks);
      const text = k === 'slack' ? `${(alloc._slack || {}).blocks || 0} blocks of deliberate slack.` : ts.length ? ts.map(([tid, v]) => `${(M.theme(tid) || {}).name}: ${v.blocks} block${v.blocks === 1 ? '' : 's'}${rv.longBlocks[tid] ? ' (one long block protected)' : ''}`).join('\n') : 'Nothing allocated.';
      M._newBlock(d, { label: l, body: { text, marks: [] }, x: (i % 2) * 420, y: 160 + Math.floor(i / 2) * 170 });
    });
    DB.put('documents', d); rv.docId = d.id;
    DB.put('reviews', rv); changed(); toast('Review completed — next week’s plan is the review note’s synthesis');
  },
  logDivergence(prevRv, themeRows, planned) {
    const d = M.doc(prevRv.docId); if (!d) return;
    const lines = Object.entries(planned).filter(([k]) => k !== '_slack').map(([tid, v]) => { const got = ((themeRows.find(r => r.tid === tid) || {}).ms || 0) / 54e5; return { tid, planned: v.blocks || 0, got }; }).filter(x => Math.abs(x.got - x.planned) >= 1);
    if (!lines.length) return toast('The week matched the plan within a block per theme');
    const b = M.addBlock(d.id, null, { label: 'How the week diverged', body: { text: '', marks: [] }, x: 860, y: 160 });
    let text = ''; const marks = [];
    lines.forEach(l => { const s = `${(M.theme(l.tid) || {}).name}: planned ${l.planned}, measured ${l.got.toFixed(1)} blocks.`; const it = M.createItem('deviation', s, b); marks.push({ id: uid('m'), type: 'struct', from: text.length, to: text.length + s.length, ref: it.id }); text += s + '\n'; });
    M.saveBlockBody(b, { text: text.trim(), marks }); changed(); toast(plural(lines.length, 'deviation') + ' logged on last week’s plan');
  },
  backfill(date) {
    const docs = DB.where('blocks', b => localDate(b.created) === date || localDate(b.modified || b.created) === date).map(b => b.docId), ids = [...new Set(docs)].map(M.doc).filter(Boolean);
    if (!ids.length) return;
    pickModal('Backfill ' + fmtDayLong(parseDay(date)), 'Edits but no timer. Which note did the time go to?', ids.map(d => ({ label: d.title, run: async () => { const v = await askText('Time on ' + d.title, 'Duration (150 · 2h30 · 2:30)'); const s = parseDuration(v); if (s) TIMER.logManual(d.id, { mode: 'duration', seconds: s, date, note: 'backfilled at review' }); } })));
  },
  resolveFlag(f, rv, by) {
    f.status = 'resolved'; f.resolvedAt = isoLocal(new Date()); f.resolvedBy = by; f.history = [...(f.history || []), { week: rv.id, action: 'resolve' }]; DB.put('flags', f);
    if (by.type === 'note') { const tb = f.targetType === 'block' ? M.block(f.targetId) : f.targetType === 'item' ? M.block((M.item(f.targetId) || {}).originBlockId) : null, d = tb ? M.doc(tb.docId) : f.targetType === 'doc' ? M.doc(f.targetId) : null;
      if (d) { _suppress++; const nb = M.addBlock(d.id, tb ? tb.id : null, { label: 'Review note', body: { text: by.text, marks: [] }, x: tb ? (tb.x || 0) + (tb.w || 392) + 70 : null, y: tb ? tb.y : null }); if (tb) M.wire(nb.id, tb.id, 'resolves', true); _suppress--; f.resolvedBy = { type: 'block', id: nb.id, text: by.text }; DB.put('flags', f); } }
    if (by.type === 'block' && f.targetType === 'block' && by.id !== f.targetId) { _suppress++; M.wire(by.id, f.targetId, 'resolves', true); _suppress--; }
    rv.flagDecisions[f.id] = { action: 'resolve', at: isoLocal(new Date()) }; DB.put('reviews', rv); changed();
  },
  resolveWithComponent(f, rv) {
    const m = modal({ title: 'Resolve flag with a component', actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search components…', items: q => DB.where('blocks', b => b.status === 'live' && (!q || (b.body.text + b.label).toLowerCase().includes(q))).sort((a, b) => (b.modified || '').localeCompare(a.modified || '')),
      render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body.text, 70)), h('span.s', M.docPath(M.doc(b.docId)))), onPick: b => { m.close(); ReviewView.resolveFlag(f, rv, { type: 'block', id: b.id }); } }) });
  },
  suggestions(S) {
    const out = [], seen = new Set();
    for (const x of S.terms.slice(0, 8)) { const G = IX.termGraph(x.term.id, 'project', x.term.projectId, false);
      for (const e of G.edges.filter(e => e.type === 's')) { const b = M.block(e.to); if (!b || seen.has(e.key) || !IX.inWin(M.blockTime(b), S.a, S.b)) continue; seen.add(e.key); out.push(Object.assign({ term: x.term }, e)); } }
    return out;
  },
  /** Suggested allocation: open barriers pull into Unblock, evidence pulls into Continue, ageing questions into Explore; ~20% slack. */
  suggestAlloc(S, openB, ageingQ, themes) {
    const prior = IX.reviewWeeks().filter(x => +x.start < +S.a).slice(0, 4).map(x => IX.weekStats(x.start).total / 54e5).filter(x => x > 0);
    const total = Math.max(6, Math.round(prior.length ? sum(prior) / prior.length : 12)), slack = Math.round(total * 0.2), avail = total - slack;
    const scored = themes.filter(x => !x.H.stalled || x.H.openB.length).map(x => { const ob = x.H.openB.length, ev = DB.where('items', i => ['evidence', 'result'].includes(i.kind) && x.H.docs.some(d => d.id === i.originDocId) && IX.inWin(i.created, S.a, S.b)).length;
      return { x, ob, ev, lane: ob >= 2 ? 'unblock' : x.H.aims.length ? 'cont' : 'explore', score: 1 + ob * .8 + ev * .6 + x.H.ms4 / 36e5 / 10 }; }).sort((a, b) => b.score - a.score).slice(0, 3);
    const tot = sum(scored.map(s => s.score)) || 1, alloc = {};
    scored.forEach(s => { alloc[s.x.t.id] = { blocks: s.x.br ? 0 : Math.max(1, Math.round(avail * s.score / tot)), lane: s.lane }; });
    if (ageingQ.length && !scored.some(s => s.lane === 'explore')) { const e = themes.find(x => !x.H.aims.length && !alloc[x.t.id]); if (e) alloc[e.t.id] = { blocks: 1, lane: 'explore' }; }
    alloc._slack = { blocks: slack, lane: 'slack' };
    ReviewView._why = { cont: 'themes with aims and fresh evidence', unblock: `${openB.length} open barriers pull here`, explore: ageingQ.length ? `${ageingQ.length} ageing questions` : 'exploratory themes (no aim)' };
    return alloc;
  },
  /** §6 circuit breaker: blocks three weeks running with no recorded outcome → no fourth week until re-shaped. */
  breaker(t, before = new Date()) {
    const weeks = IX.reviewWeeks().filter(x => +x.start < +before && x.rv && x.rv.status === 'complete').slice(0, 3);
    if (weeks.length < 3) return null;
    const docs = new Set(DB.where('documents', d => d.themeId === t.id).map(d => d.id));
    const got = weeks.every(x => { const prevAlloc = (DB.get('reviews', localDate(addDays(x.start, -7))) || {}).alloc; return prevAlloc && prevAlloc[t.id] && prevAlloc[t.id].blocks > 0; });
    if (!got) return null;
    const from = addDays(weeks[2].start, 0), outcome = DB.where('items', i => docs.has(i.originDocId) && ['result', 'evidence', 'resolution', 'claim', 'decision'].includes(i.kind) && +new Date(i.created) >= +from).length
      + sum(DB.where('aims', a => a.themeId === t.id).flatMap(a => a.milestones.filter(m => m.metAt && +new Date(m.metAt) >= +from)).map(() => 1));
    if (outcome || (t.reshapedAt && +new Date(t.reshapedAt) >= +from)) return null;
    return 'blocks three weeks running with no recorded outcome — re-shape it into a smaller question before it gets a fourth';
  },
  cycleDue() { const last = settings().cycleAt; return !last || Date.now() - +new Date(last) > 42 * 864e5; },
  cycleEl(themes, recurring, contested) {
    return h('div.rv-step.cycle', h('div.rv-num', '◎'), h('div.bd', h('h2', 'Cycle review'), h('p.d', 'About every six weeks: which themes deserve to exist? Strategy moves slower than the weekly bet — that split prevents thrash.'),
      h('div.lab', 'Themes'), h('div.list', themes.map(({ t, H }) => h('div.li', h('span.t', h('a', { href: '#/theme/' + t.id }, t.name), h('span.s', `${fmtDur(H.ms4)} / 4 wk · ${plural(H.openB.length, 'open barrier')} · ${H.aims.length ? plural(H.aims.length, 'aim') : 'exploratory'}${H.stalled ? ' · stalled' : ''}`)),
        h('button.btn.xs', { on: { click: () => reshapeDialog(t) } }, 'Re-shape'), h('button.btn.xs', { on: { click: async () => { const r = await askText('Retire theme', 'Why (one line)'); if (r !== null) M.retireTheme(t, r); } } }, 'Retire'), h('button.btn.xs.ghost', { on: { click: () => App.go('#/theme/' + t.id) } }, 'Merge / split…')))),
      recurring.filter(([, v]) => v.length >= 3).length ? [h('div.lab', 'Protocol revisions from repeated deviations'), h('div.list', recurring.filter(([, v]) => v.length >= 3).map(([k, v]) => { const pb = k.startsWith('p:') && M.block(k.slice(2)); return h('div.li', h('span.t', pb ? M.blockName(pb) : k.slice(2), h('span.s', v.length + ' deviations')), pb ? h('button.btn.xs', { on: { click: () => App.openBlock(pb.id) } }, 'Revise step') : null); }))] : null,
      contested.length ? [h('div.lab', 'Contested claims'), capped(contested, 5, it => itemRow(it))] : null,
      h('div.row', { style: { marginTop: '12px' } }, h('button.btn.pri', { on: { click: () => { saveSettings({ cycleAt: isoLocal(new Date()) }); changed(); toast('Cycle review recorded — next one in about six weeks'); } } }, 'Cycle review done'))));
  },
};
VIEWS.review = ReviewView;
