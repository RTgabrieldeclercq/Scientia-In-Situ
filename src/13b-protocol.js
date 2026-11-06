/* ==========================================================================
   13b · Protocols as one linked block.
   A protocol is a single box whose steps are joined by a rail. Written in
   any note it starts unregistered — a small yellow light breathes in its
   corner until you register it (project / theme → it gets its own protocol
   note) or keep it local (it stays where it is, still searchable).
   In other notes a protocol appears as a RUN: each step has a dot on the
   box's border for observations made during the run; the protocol note
   counts every observation in its lifetime (white circle) and every
   iteration of the step (coloured dot). Steps are only changed in the
   protocol note, and each change is logged with what prompted it.
   ========================================================================== */
const PROTO = {
  is: b => b && (b.kind === 'protocol' || b.kind === 'run'),
  defOf: b => b ? (b.kind === 'run' ? M.block(b.protocolId) : b.kind === 'protocol' ? b : null) : null,
  defIn: docId => M.liveBlocks(docId).find(b => b.kind === 'protocol' && b.registered && b.registered.docId === docId),
  live: def => (def.steps || []).filter(s => s.status === 'live'),
  step: (def, id) => (def.steps || []).find(s => s.id === id),
  num: (def, id) => PROTO.live(def).findIndex(s => s.id === id) + 1,
  numIn: (b, id) => PROTO.activeSeq(b).indexOf(id) + 1,
  /** Blocks that can be run where they sit: runs, and protocols not registered (drafts and those kept in their note). */
  runnable: b => b && (b.kind === 'run' || (b.kind === 'protocol' && !b.registered)),
  seq: b => b.kind === 'run' ? (b.stepIds || []) : PROTO.live(b).map(s => s.id),
  activeSeq: b => PROTO.seq(b).filter(id => !(b.skipped || []).includes(id)),
  stepOf: (b, def, id) => ((b && b.temp) || {})[id] || PROTO.step(def, id),
  /** What a run could hand back to its protocol: temporary steps, and skipped steps not yet decided. */
  pending: b => b.kind !== 'run' ? [] : [...Object.keys(b.temp || {}).filter(id => !(b.kept || []).includes(id)), ...(b.skipped || []).filter(id => { const s = PROTO.step(M.block(b.protocolId) || {}, id); return s && s.status === 'live' && !(b.kept || []).includes(id); })],
  homeDoc: def => def.registered ? def.registered.docId : def.docId,
  /** Can the steps be changed here? Only in the protocol's own note (or where an unregistered one lives). */
  editableIn: (def, docId) => PROTO.homeDoc(def) === docId,
  syncBody(def) { def.body = { text: [def.label, ...PROTO.live(def).map((s, i) => `${i + 1}. ${s.text}` + (s.sub && M.block(s.sub) ? ' → ' + M.block(s.sub).label : ''))].join('\n'), marks: [] }; },
  ancestors(def, stepId) { const out = [], seen = new Set(); const walk = (s, g) => (s.supersedes || []).forEach(id => { if (seen.has(id)) return; seen.add(id); const a = PROTO.step(def, id); if (a) { out.push(Object.assign({ gen: g }, a)); walk(a, g + 1); } }); const s = PROTO.step(def, stepId); if (s) walk(s, 1); return out; },
  /** Every observation ever made at this step: this wording and every earlier one, in every run. */
  observations(def, stepId, hostBlockId) {
    const ids = [stepId, ...PROTO.ancestors(def, stepId).map(a => a.id)];
    return ids.flatMap(id => IX.stepObs.get(def.id + ':' + id) || []).filter(it => !hostBlockId || it.originBlockId === hostBlockId).sort((a, b) => a.created.localeCompare(b.created));
  },
  /** Iterations of a step: its own change record and those of every ancestor, newest first. */
  iterations(def, stepId) { const s = PROTO.step(def, stepId); if (!s) return []; return [s, ...PROTO.ancestors(def, stepId)].filter(x => x.iter).map(x => Object.assign({ stepId: x.id }, x.iter)).sort((a, b) => b.at.localeCompare(a.at)); },
  runsOf(def) { return DB.where('blocks', b => b.kind === 'run' && b.protocolId === def.id && b.status !== 'removed'); },
  used(def, step) { return PROTO.observations(def, step.id).length > 0 || PROTO.runsOf(def).some(r => (r.stepIds || []).includes(step.id)) || localDate(step.created) !== localDate(new Date()); },

  /* ---------------- authoring ---------------- */
  create(docId, x, y) {
    const d = M.doc(docId), now = isoLocal(new Date());
    const b = M.addBlock(docId, null, { kind: 'protocol', label: 'New protocol', w: 448, x, y, registered: null, localOnly: false, log: [],
      steps: [{ id: uid('st'), text: '', created: now, status: 'live', supersedes: [], supersededBy: [] }] });
    PROTO.syncBody(b); DB.put('blocks', b); changed(); return b;
  },
  setName(def, name) { def.label = name; PROTO.syncBody(def); DB.put('blocks', def); changed(); },
  insertStep(def, afterId, text = '') {
    const s = { id: uid('st'), text, created: isoLocal(new Date()), status: 'live', supersedes: [], supersededBy: [] };
    if (def.registered) s.iter = { at: s.created, kind: 'add', before: '', after: text, links: [] };
    const i = afterId ? def.steps.findIndex(x => x.id === afterId) : def.steps.length - 1; def.steps.splice(i + 1, 0, s);
    PROTO.syncBody(def); DB.put('blocks', def); changed(); return s;
  },
  /** A change to a used step of a registered protocol is an iteration: the old wording stays, superseded. */
  editStep(def, step, text, anchor) {
    text = text.replace(/\s+\n/g, '\n').trim(); if (text === step.text) return;
    if (!def.registered || !PROTO.used(def, step)) { step.text = text; if (step.iter && step.iter.kind === 'add') step.iter.after = text; PROTO.syncBody(def); DB.put('blocks', def); changed(); return; }
    const now = isoLocal(new Date()), n = { id: uid('st'), text, created: now, status: 'live', supersedes: [step.id], supersededBy: [], iter: { at: now, kind: 'edit', before: step.text, after: text, links: [] } };
    if (step.sub) n.sub = step.sub;   // a new wording keeps the protocol the step is done by
    step.status = 'superseded'; step.supersededBy = [n.id]; step.supersededAt = now;
    def.steps.splice(def.steps.indexOf(step) + 1, 0, n); PROTO.syncBody(def); DB.put('blocks', def); changed();
    setTimeout(() => PROTO.linkPrompt(def, n.id, anchor), 60);
  },
  splitStep(def, step, a, b2, anchor) {
    const now = isoLocal(new Date()), mk = t => ({ id: uid('st'), text: t, created: now, status: 'live', supersedes: [step.id], supersededBy: [], iter: { at: now, kind: 'split', before: step.text, after: t, links: [] } });
    const n1 = mk(a), n2 = mk(b2); if (step.sub) n1.sub = step.sub; step.status = 'superseded'; step.supersededBy = [n1.id, n2.id]; step.supersededAt = now;
    def.steps.splice(def.steps.indexOf(step) + 1, 0, n1, n2); PROTO.syncBody(def); DB.put('blocks', def); changed();
    setTimeout(() => PROTO.linkPrompt(def, n1.id, anchor), 60);
  },
  removeStep(def, step, anchor) {
    if (!def.registered || !PROTO.used(def, step)) { def.steps = def.steps.filter(s => s !== step); PROTO.syncBody(def); DB.put('blocks', def); changed(); return; }
    step.status = 'retired'; step.retiredAt = isoLocal(new Date());
    (def.log = def.log || []).push({ at: step.retiredAt, kind: 'remove', stepId: step.id, before: step.text, links: [] });
    PROTO.syncBody(def); DB.put('blocks', def); changed(); toast('Step retired — its observations stay on record in this protocol');
  },
  moveStep(def, step, dir) { const live = PROTO.live(def), i = live.indexOf(step), j = i + dir; if (j < 0 || j >= live.length) return; const other = live[j], a = def.steps.indexOf(step), b = def.steps.indexOf(other); def.steps[a] = other; def.steps[b] = step; PROTO.syncBody(def); DB.put('blocks', def); changed(); },
  /* ---------------- Tab: the next step (a new one after the last), Shift+Tab: the previous ---------------- */
  tabFrom(def, sid, dir) {
    const now = (PROTO.step(def, sid) || {}).supersededBy || [], cur = now[now.length - 1] || sid, live = PROTO.live(def), i = live.findIndex(x => x.id === cur);
    if (i < 0) return;
    let to = live[i + dir];
    if (!to && dir > 0) to = PROTO.insertStep(def, cur);
    if (to) PROTO.focusStep(def.id, to.id);
  },
  /** In a run only temporary steps are written: Tab goes to the next one, and from the last step makes one. */
  tabRun(run, sid, dir) {
    const seq = PROTO.seq(run), i = seq.indexOf(sid), temp = run.temp || {};
    for (let j = i + dir; j >= 0 && j < seq.length; j += dir) if (temp[seq[j]]) return PROTO.focusStep(run.id, seq[j]);
    if (dir > 0 && i === seq.length - 1) PROTO.addTemp(run, sid, null);
  },
  focusStep(boxId, stepId) {
    setTimeout(() => { const n = $(`.box[data-id="${boxId}"] .pstep[data-step="${stepId}"] .ptext.edit`) || $(`.pstep[data-step="${stepId}"] .ptext.edit`); if (!n) return;
      n.focus(); const r = document.createRange(), S = getSelection(); r.selectNodeContents(n); r.collapse(false); S.removeAllRanges(); S.addRange(r); }, 80);
  },
  /* ---------------- a step done by following another protocol (step.sub = that protocol's id) ---------------- */
  /** Does following `b` lead (through its steps' protocols) to `target`? */
  reaches(b, target, seen = new Set()) { if (!b || seen.has(b.id)) return false; seen.add(b.id); return PROTO.live(b).some(s => s.sub && (s.sub === target || PROTO.reaches(M.block(s.sub), target, seen))); },
  tie(def, s, subId) {
    if (subId) s.sub = subId; else delete s.sub;
    PROTO.syncBody(def); DB.put('blocks', def); changed();
    toast(subId ? 'Step ' + PROTO.num(def, s.id) + ' is done by following “' + M.block(subId).label + '”' : 'Untied');
  },
  tieDialog(def, s) {
    const skip = new Set([def.id, ...DB.where('blocks', b => b.kind === 'protocol' && PROTO.reaches(b, def.id)).map(b => b.id)]);
    PROTO.pickProtocol('Step ' + PROTO.num(def, s.id) + ' is done by following…', df => PROTO.tie(def, s, df.id), skip);
  },
  _open: new Set(),
  /** The run of a step's protocol started from this run's step, if any. */
  subRunOf(host, sid) { return DB.where('blocks', r => r.kind === 'run' && r.status !== 'removed' && r.parentStep && r.parentStep.runId === host.id && r.parentStep.stepId === sid)[0] || null; },
  runSub(host, sid, sub, pane) {
    const R = pane && pane.rectOf ? pane.rectOf(host.id) : null, x = Math.round((R ? R.x : host.x || 0) / 14) * 14, y = Math.round(((R ? R.y + R.h : (host.y || 0) + 300) + 56) / 14) * 14;
    const run = PROTO.newRun(sub, host.docId, x, y); run.parentStep = { runId: host.id, stepId: sid }; DB.put('blocks', run);
    M.wire(host.id, run.id, 'needs', true); toast('“' + sub.label + '” runs below — checking off its last step checks this step');
    return run;
  },
  /** A finished run of a step's protocol checks that step in the run it came from. */
  parentCheck(run) {
    const ps = run.parentStep, par = ps && M.block(ps.runId); if (!par || par.status === 'removed' || (par.checks || {})[ps.stepId]) return false;
    if (!PROTO.activeSeq(run).every(id => (run.checks || {})[id])) return false;
    setTimeout(() => { const p = M.block(ps.runId); if (p && !(p.checks || {})[ps.stepId]) { PROTO.check(p, ps.stepId); toast('Step ' + PROTO.numIn(p, ps.stepId) + ' checked — its protocol is done'); } }, 40); return true;
  },
  subRow(host, def, sid, sub, d, pane, ro, canRun) {
    const key = host.id + ':' + sid, open = PROTO._open.has(key), run = canRun ? PROTO.subRunOf(host, sid) : null, all = run ? PROTO.activeSeq(run) : [];
    return h('div.psub' + (open ? '.open' : ''),
      h('div.psub-h',
        h('button.psub-fold', { title: open ? 'Hide its steps' : 'Show its steps here', on: { click: e => { e.stopPropagation(); open ? PROTO._open.delete(key) : PROTO._open.add(key); changed(); } } }, open ? '▾' : '▸'),
        h('a.psub-name', { title: 'Open that protocol · Alt+click: beside', on: { click: e => { e.stopPropagation(); App.jump(sub.id, e); } } }, '↳ ' + (sub.label || 'Protocol')),
        h('span.psub-n', plural(PROTO.live(sub).length, 'step')),
        run ? h('button.psub-run', { title: 'Its run in this note', on: { click: e => { e.stopPropagation(); App.jump(run.id, e); } } }, all.filter(id => (run.checks || {})[id]).length + '/' + all.length + ' ✓')
          : canRun && !ro ? h('button.psub-run', { title: 'Start a run of it below this one — finishing it checks this step', on: { click: e => { e.stopPropagation(); PROTO.runSub(host, sid, sub, pane); } } }, '▶ Run it here') : null),
      open ? PROTO.subList(sub, new Set([def.id, sub.id]), 1) : null);
  },
  subList(def, seen, depth) {
    return h('ol.psub-steps', PROTO.live(def).map((s, i) => { const sub = s.sub && M.block(s.sub);
      return h('li', h('span.psub-num', i + 1), h('span.psub-t', s.text || h('i.muted', 'empty step')),
        sub ? h('div.psub-in', '↳ ', h('b', sub.label), seen.has(sub.id) || depth >= 3 ? null : PROTO.subList(sub, new Set([...seen, sub.id]), depth + 1)) : null); }));
  },
  /** Link an iteration to what prompted it — anything in the app. What is already tied to this step comes first. */
  linkPrompt(def, stepId, anchor, onlyPicker) {
    const s = PROTO.step(def, stepId); if (!s || !s.iter) return;
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth / 2 - 180, bottom: 160 }, n = PROTO.num(def, stepId);
    const prim = new Set(), add = (t, x) => { if (x && !prim.has(x.id)) { prim.add(x.id); P.push({ t, x, primary: true }); } }, P = [];
    PROTO.observations(def, stepId).forEach(it => add('item', it));
    PROTO.ancestors(def, stepId).concat([s]).forEach(a => ((a.iter || {}).links || []).forEach(l => add(l.type, l.type === 'item' ? M.item(l.id) : l.type === 'doc' ? M.doc(l.id) : M.block(l.id))));
    PROTO.runsOf(def).forEach(run => DB.all('wires').filter(w => w.from === run.id || w.to === run.id).forEach(w => add('block', M.block(w.from === run.id ? w.to : w.from))));
    const rest = () => [...DB.where('items', it => !prim.has(it.id) && !it.correctedBy).map(x => ({ t: 'item', x })), ...DB.where('blocks', b => !prim.has(b.id) && b.status === 'live' && b.kind === 'component').map(x => ({ t: 'block', x })), ...DB.where('documents', d => !prim.has(d.id) && !d.archived).map(x => ({ t: 'doc', x }))];
    const txt = v => v.t === 'item' ? v.x.text : v.t === 'doc' ? v.x.title : M.blockName(v.x) + ' ' + v.x.body.text + ' ' + ((M.doc(v.x.docId) || {}).title || '');
    popover(r.left, r.bottom + 8, [h('h5', onlyPicker ? 'Link this iteration to…' : 'Iteration logged — what prompted it?'),
      h('div.tiny.muted', { style: { margin: '0 6px 8px' } }, 'Anything can be linked; it is logged on step ' + n + '. Alt+click a row to look at it beside this note first.'),
      optionPicker({ placeholder: 'Search observations, components, notes…', sort: 'iterlink', limit: 120,
        items: q => [...P, ...rest()].filter(v => !s.iter.links.some(l => l.id === v.x.id) && (!q || txt(v).toLowerCase().includes(q))),
        section: v => v.primary ? 'Connected to step ' + n : 'Everything else in the app',
        render: v => v.t === 'item' ? h('div', kchip(v.x.kind), ' ', h('span.serif', snippet(v.x.text, 70)), h('span.s', (v.x.step && v.x.step.protocolId === def.id ? 'observed at this step · ' : '') + ((M.doc(v.x.originDocId) || {}).title || '—') + ' · ' + fmtWhen(v.x.created)))
          : v.t === 'doc' ? h('div', typechip(v.x.type), ' ', h('b', v.x.title), h('span.s', M.docPath(v.x) + ' · ' + fmtWhen(v.x.modified)))
          : h('div', h('b', M.blockName(v.x)), ' ', h('span.serif', snippet(v.x.body.text, 60)), h('span.s', M.docPath(M.doc(v.x.docId)))),
        emptyText: 'Nothing matches',
        onPick: (v, e) => { if (e && e.altKey) return App.jump(v.t === 'item' ? v.x.originBlockId : v.x.id, e, v.t === 'doc');
          closePop(); s.iter.links.push({ type: v.t, id: v.x.id }); DB.put('blocks', def); changed(); toast('Linked — the reason is logged on step ' + n); } }),
      onlyPicker ? null : h('div.row', { style: { marginTop: '8px' } }, h('button.btn.sm', { on: { click: () => closePop() } }, 'No link'))]);
  },
  pickProtocol(title, cb, skip) {
    const defs = DB.where('blocks', b => b.kind === 'protocol' && b.status !== 'removed' && (b.registered || b.localOnly) && !(skip && skip.has(b.id))); if (!defs.length) return toast(skip ? 'No other protocols yet' : 'No protocols yet');
    const m = modal({ title, wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search protocols…', sort: 'protocols',
      items: q => defs.filter(df => !q || (df.label + ' ' + df.body.text).toLowerCase().includes(q)),
      render: df => h('div', h('b', df.label), ' ', df.registered ? null : h('span.pill', 'kept in its note'), ' ', h('span.muted', plural(PROTO.live(df).length, 'step') + ' · ' + plural(PROTO.runsOf(df).length, 'run')), h('span.s', M.docPath(M.doc(df.docId)))),
      onPick: df => { m.close(); cb(df); } }) });
  },

  /* ---------------- registering ---------------- */
  registerDialog(def) {
    const d = M.doc(def.docId), projects = DB.all('projects');
    const name = h('input.inp', { value: def.label || '' }), proj = h('select.inp', projects.map(p => h('option', { value: p.id, selected: p.id === d.projectId }, p.name))), th = h('select.inp');
    const fill = () => th.replaceChildren(h('option', { value: '' }, '— project-wide —'), ...DB.where('themes', t => t.projectId === proj.value && t.status === 'active').map(t => h('option', { value: t.id, selected: t.id === d.themeId }, t.name)));
    proj.onchange = fill; fill();
    modal({ title: 'Register this as a protocol?', body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'A registered protocol gets its own protocol note. This box becomes a run of it, so its steps can be followed, timed and observed from any experiment — and changed only in the protocol note.'),
      h('div.grid2', h('label.f', h('span', 'Name'), name), h('label.f', h('span', 'Project'), proj), h('label.f', h('span', 'Theme'), th)),
      h('p.tiny.muted', 'Not now: it simply lives in this note — still searchable — and the light goes out. You can register it later from its ⋯ menu.')),
      actions: [{ label: 'Keep it in this note', run: () => { def.localOnly = true; DB.put('blocks', def); changed(); } },
        { label: 'Register', pri: true, run: () => { PROTO.register(def, { name: name.value.trim() || def.label, projectId: proj.value, themeId: th.value || null }); } }] });
  },
  register(def, { name, projectId, themeId }) {
    let from = M.doc(def.docId); const now = isoLocal(new Date());
    const pd = { id: uid('d'), type: 'protocol', scope: 'project', projectId, themeId: themeId || null, title: name, templateId: null, header: { tags: [] }, blockIds: [], synthesis: { text: '', marks: [] }, citeMode: settings().citeMode, layout: { head: { x: 0, y: 0 } }, created: now, modified: now };
    DB.put('documents', pd);
    // the definition moves to its own note; where it was written, a run of it takes its place
    from = Object.assign({}, from, { blockIds: from.blockIds.filter(x => x !== def.id) }); DB.put('documents', from);
    const run = { id: uid('c'), docId: from.id, kind: 'run', protocolId: def.id, stepIds: PROTO.live(def).map(s => s.id), checks: def.checks || {}, pastRuns: def.pastRuns, label: '', body: { text: '', marks: [] }, status: 'live', supersedes: [], supersededBy: [], created: def.created, modified: now, x: def.x, y: def.y, w: def.w || 448, fields: [], stamp: def.stamp, manualSec: null };
    PROTO.syncRunBody(run, def); DB.put('blocks', run); from.blockIds.push(run.id); DB.put('documents', from);
    DB.where('wires', w => w.from === def.id || w.to === def.id).forEach(w => { if (w.from === def.id) w.from = run.id; if (w.to === def.id) w.to = run.id; DB.put('wires', w); });
    DB.where('items', it => it.originBlockId === def.id).forEach(it => { it.originBlockId = run.id; DB.put('items', it); });
    DB.where('sessions', x => (x.steps || []).some(st => st.blockId === def.id)).forEach(x => { x.steps.forEach(st => { if (st.blockId === def.id) st.blockId = run.id; }); DB.put('sessions', x); });
    delete def.checks; delete def.pastRuns;
    def.docId = pd.id; def.label = name; def.registered = { docId: pd.id, projectId, themeId: themeId || null, at: now }; def.x = 0; def.y = 168; PROTO.syncBody(def); DB.put('blocks', def);
    pd.blockIds.push(def.id); DB.put('documents', pd);
    changed(); toast('Registered — “' + name + '” has its own protocol note; this box is now a run of it');
  },
  /* ---------------- runs ---------------- */
  syncRunBody(run, def) { def = def || M.block(run.protocolId); if (!def) return; run.body = { text: ['Run · ' + def.label, ...(run.stepIds || []).map((id, i) => `${i + 1}. ${(PROTO.stepOf(run, def, id) || {}).text || ''}`)].join('\n'), marks: [] }; },
  newRun(def, docId, x, y) {
    const run = M.addBlock(docId, null, { kind: 'run', protocolId: def.id, stepIds: PROTO.live(def).map(s => s.id), checks: {}, x, y, w: 448 });
    PROTO.syncRunBody(run, def); DB.put('blocks', run); changed(); return run;
  },
  /** “Run a protocol” from New note: an experiment holding a run, timer started. */
  runInNewNote(def, { projectId, themeId, title }) {
    const d = M.createDoc({ type: 'experiment', projectId, themeId, title: title || `${def.label} — run ${fmtDay(new Date())}` });
    const first = M.block(d.blockIds[0]); if (first) { first.x = 0; first.y = 168; DB.put('blocks', first); }
    PROTO.newRun(def, d.id, 460, 168); TIMER.start(d.id, true); changed(); return d;
  },
  /** Check a step off inside a run: its split and its place in the timer; the last step stops the timer. */
  check(run, stepId) {
    run.checks = run.checks || {}; const s = TIMER.activeFor(run.docId), now = Date.now();
    if (run.checks[stepId]) { delete run.checks[stepId]; if (s) { s.steps = (s.steps || []).filter(x => !(x.blockId === run.id && x.stepId === stepId)); DB.put('sessions', s); } DB.put('blocks', run); changed(); return; }
    if (!s) { run.checks[stepId] = { at: isoLocal(now) }; DB.put('blocks', run); changed(); if (PROTO.activeSeq(run).every(id => run.checks[id]) && PROTO.pending(run).length) setTimeout(() => PROTO.promoteDialog(run), 120); PROTO.parentCheck(run); return; }
    const off = TIMER.elapsed(s, now), prev = s.steps.length ? s.steps[s.steps.length - 1].offsetMs : 0;
    const rec = { blockId: run.id, stepId, at: isoLocal(now), offsetMs: off, durMs: off - prev }; s.steps.push(rec); DB.put('sessions', s);
    run.checks[stepId] = { at: rec.at, sessionId: s.id, durMs: rec.durMs, offsetMs: off }; DB.put('blocks', run); PROTO._follow = run.id;
    // a step's protocol finished: its step is checked in the run it came from, and the timer runs on for that one
    if (PROTO.activeSeq(run).every(id => run.checks[id]) && PROTO.parentCheck(run)) changed();
    else if (PROTO.activeSeq(run).every(id => run.checks[id])) { _suppress++; TIMER.stop(s); _suppress--; changed(); setTimeout(() => protocolSummary(s.id, PROTO.pending(run).length ? { label: `Update the protocol with ${plural(PROTO.pending(run).length, 'change')}…`, run: () => setTimeout(() => PROTO.promoteDialog(run), 60) } : null), 50); } else changed();
  },
  addObservation(host, def, stepId, kind, text) {
    const run = TIMER.runningFor(host.docId), extra = { step: { protocolId: def.id, stepId } };
    if (run) extra.timer = { sessionId: run.id, offsetMs: TIMER.elapsed(run) };
    const it = M.createItem(kind, text, host, extra); changed(); return it;
  },

  lastOffset(sess) { return sess && sess.steps && sess.steps.length ? sess.steps[sess.steps.length - 1].offsetMs : 0; },
  /* ---------------- temporary steps: this experiment only ---------------- */
  addTemp(run, afterId, pane, text = '') {
    const t = { id: uid('st'), text, created: isoLocal(new Date()), status: 'live', temp: true, supersedes: [], supersededBy: [] };
    run.temp = Object.assign({}, run.temp, { [t.id]: t }); const ids = (run.stepIds || []).slice(), i = afterId ? ids.indexOf(afterId) : ids.length - 1;
    ids.splice(i + 1, 0, t.id); run.stepIds = ids; PROTO.syncRunBody(run); DB.put('blocks', run); changed();
    setTimeout(() => { const el = $(`.box[data-id="${run.id}"] .pstep[data-step="${t.id}"] .ptext`, (pane && pane.paper ? pane.paper.world : document)); el && el.focus(); }, 80);
    return t;
  },
  removeTemp(run, id) {
    if (PROTO.observations(M.block(run.protocolId), id).length) return toast('This temporary step has observations — skip it instead, so they keep their step');
    const tp = Object.assign({}, run.temp); delete tp[id]; run.temp = tp; run.stepIds = run.stepIds.filter(x => x !== id); if (run.checks) delete run.checks[id];
    PROTO.syncRunBody(run); DB.put('blocks', run); changed();
  },
  tempEditor(run, t) {
    const el = h('div.ptext.edit', { contenteditable: 'plaintext-only', spellcheck: 'true', 'data-ph': 'A step for this experiment only…' }, t.text);
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    const save = () => { const v = el.textContent.trim(); if (v !== t.text) { run.temp[t.id] = Object.assign({}, t, { text: v }); PROTO.syncRunBody(run); DB.put('blocks', run); changed(); } };
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el._skip = true; save(); PROTO.addTemp(run, t.id, DV(el)); }
      if (e.key === 'Backspace' && !el.textContent) { e.preventDefault(); el._skip = true; PROTO.removeTemp(run, t.id); }
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); el._skip = true; save(); PROTO.tabRun(M.block(run.id) || run, t.id, e.shiftKey ? -1 : 1); setTimeout(() => { el._skip = false; }, 150); }
      if (e.key === 'Escape') el.blur(); e.stopPropagation();
    });
    el.addEventListener('blur', () => { if (!el._skip) save(); el._skip = false; });
    return el;
  },
  runStepMenu(run, def, sid, e) {
    const temp = (run.temp || {})[sid], skip = (run.skipped || []).includes(sid), pane = DV(e.target);
    ctxMenu(e.clientX, e.clientY + 8, [{ head: (temp ? 'Temporary step' : 'Step ' + PROTO.numIn(run, sid)) + ' · this run only' },
      { label: 'Add a temporary step after', sub: 'Lives only in this note', run: () => PROTO.addTemp(run, sid, pane) },
      temp ? { label: 'Remove this temporary step', danger: true, run: () => PROTO.removeTemp(run, sid) } : null,
      !temp ? (skip ? { label: 'Restore this step', run: () => { run.skipped = run.skipped.filter(x => x !== sid); DB.put('blocks', run); changed(); } }
        : { label: 'Skip this step in this run', sub: 'The protocol keeps it; you can retire it at the end', run: () => { run.skipped = [...new Set([...(run.skipped || []), sid])]; if (run.checks) delete run.checks[sid]; DB.put('blocks', run); changed(); } }) : null,
      PROTO.pending(run).length ? 'sep' : null,
      PROTO.pending(run).length ? { label: 'Update the protocol with this run’s changes…', run: () => PROTO.promoteDialog(run) } : null]);
  },
  resetRun(def) {
    def.pastRuns = [...(def.pastRuns || []), { at: isoLocal(new Date()), checks: def.checks || {} }]; def.checks = {}; DB.put('blocks', def); changed(); toast('Fresh run — the last one stays on record');
  },
  /** End of a run: hand temporary steps (and skipped ones) back to the protocol, each logged as an iteration with its reason and connections. */
  promoteDialog(run) {
    const def = M.block(run.protocolId); if (!def) return;
    const order = PROTO.seq(run), live = () => PROTO.live(def), anchorOf = id => { for (let i = order.indexOf(id) - 1; i >= 0; i--) { const s = PROTO.step(def, order[i]); if (s && s.status === 'live') return s.id; } return ''; };
    const temps = Object.values(run.temp || {}).filter(t => !(run.kept || []).includes(t.id)).sort((a, c) => order.indexOf(a.id) - order.indexOf(c.id));
    const skips = (run.skipped || []).map(id => PROTO.step(def, id)).filter(s => s && s.status === 'live' && !(run.kept || []).includes(s.id));
    if (!temps.length && !skips.length) return toast('Nothing in this run differs from the protocol');
    const rows = temps.map(t => ({ t, on: true, text: t.text, after: anchorOf(t.id) })), rrows = skips.map(s => ({ s, on: false }));
    const links = [{ type: 'block', id: run.id, on: true }, ...temps.flatMap(t => PROTO.observations(def, t.id).map(it => ({ type: 'item', id: it.id, on: true })))];
    const why = h('textarea.inp', { rows: 2, placeholder: 'Why these changes? e.g. “Gels from batch 16 need a second wash before seeding.”' }), linkHost = h('div.pr-links');
    const opts = (sel) => [h('option', { value: '', selected: sel === '' }, 'At the start'), ...live().map((s, i) => h('option', { value: s.id, selected: sel === s.id }, `After ${i + 1}. ${snippet(s.text, 50)}`))];
    const drawLinks = () => linkHost.replaceChildren(...links.map(l => { const o = l.type === 'item' ? M.item(l.id) : l.type === 'doc' ? M.doc(l.id) : M.block(l.id); if (!o) return null;
      return h('label.pr-link', h('input', { type: 'checkbox', checked: l.on, on: { change: e => { l.on = e.target.checked; } } }), l.type === 'item' ? kchip(o.kind) : l.type === 'doc' ? typechip(o.type) : h('span.pill', o.id === run.id ? 'this run' : 'component'), ' ', snippet(l.type === 'item' ? o.text : l.type === 'doc' ? o.title : o.id === run.id ? (M.doc(run.docId) || {}).title : M.blockName(o), 70)); }),
      h('button.sp-add', { on: { click: e => { const r = e.currentTarget.getBoundingClientRect(); popover(r.left, r.bottom + 6, [h('h5', 'Connect to…'), optionPicker({ placeholder: 'Search observations, components, notes…', sort: 'promote',
        items: q => [...DB.where('items', i => !i.correctedBy).map(x => ({ t: 'item', x })), ...DB.where('blocks', b => b.status === 'live' && b.kind === 'component').map(x => ({ t: 'block', x })), ...DB.all('documents').map(x => ({ t: 'doc', x }))].filter(v => !links.some(l => l.id === v.x.id) && (!q || (v.x.text || v.x.title || (M.blockName(v.x) + ' ' + ((v.x.body || {}).text || ''))).toLowerCase().includes(q))),
        render: v => v.t === 'item' ? h('div', kchip(v.x.kind), ' ', h('span.serif', snippet(v.x.text, 60)), h('span.s', (M.doc(v.x.originDocId) || {}).title || '')) : v.t === 'doc' ? h('div', typechip(v.x.type), ' ', h('b', v.x.title)) : h('div', h('b', M.blockName(v.x)), ' ', h('span.serif', snippet(v.x.body.text, 50)), h('span.s', M.docPath(M.doc(v.x.docId)))),
        onPick: v => { closePop(); links.push({ type: v.t, id: v.x.id, on: true }); drawLinks(); } })]); } } }, '+ connect to something else…'));
    drawLinks();
    const body = h('div.promote',
      h('p.serif', { style: { marginTop: 0 } }, `This run of “${def.label}” differed from the protocol. Choose what to keep in the protocol — each change is logged as an iteration of the step, with the reason and connections below. Anything left unticked stays in this note only.`),
      temps.length ? h('div.pr-sec', h('h6', 'Temporary steps → add to the protocol'), rows.map(r => h('div.pr-row' + (r.on ? '' : '.off'),
        h('input', { type: 'checkbox', checked: r.on, on: { change: e => { r.on = e.target.checked; e.target.closest('.pr-row').classList.toggle('off', !r.on); } } }),
        h('div.pr-f', h('input.inp', { value: r.text, placeholder: 'Wording in the protocol', on: { input: e => { r.text = e.target.value; } } }),
          h('div.row', { style: { gap: '6px', alignItems: 'center' } }, h('span.tiny.muted', 'Place'), h('select.inp', { on: { change: e => { r.after = e.target.value; } } }, opts(r.after)),
            PROTO.observations(def, r.t.id).length ? h('span.tiny.muted', plural(PROTO.observations(def, r.t.id).length, 'observation') + (PROTO.observations(def, r.t.id).length === 1 ? ' goes' : ' go') + ' with it') : null))))) : null,
      skips.length ? h('div.pr-sec', h('h6', 'Skipped here → retire from the protocol?'), rrows.map(r => h('label.pr-row.off', h('input', { type: 'checkbox', on: { change: e => { r.on = e.target.checked; e.target.closest('.pr-row').classList.toggle('off', !r.on); } } }),
        h('div.pr-f', h('span.serif', PROTO.num(def, r.s.id) + '. ' + r.s.text), h('span.tiny.muted', 'Its observations stay on record'))))) : null,
      h('div.pr-sec', h('h6', 'Why — what prompted the change'), why),
      h('div.pr-sec', h('h6', 'Connected to'), linkHost));
    modal({ title: 'Update the protocol from this run', wide: true, body, actions: [
      { label: 'Keep them in this note only', run: () => { run.kept = [...new Set([...(run.kept || []), ...temps.map(t => t.id), ...skips.map(s => s.id)])]; DB.put('blocks', run); changed(); toast('Kept in this note only'); } },
      { label: 'Update the protocol', pri: true, run: () => {
        const add = rows.filter(r => r.on && r.text.trim()), ret = rrows.filter(r => r.on);
        if (!add.length && !ret.length) return toast('Nothing ticked — nothing changed');
        PROTO.applyRun(run, def, add, ret, why.value.trim(), links.filter(l => l.on).map(l => ({ type: l.type, id: l.id })));
        run.kept = [...new Set([...(run.kept || []), ...rows.filter(r => !r.on).map(r => r.t.id), ...rrows.filter(r => !r.on).map(r => r.s.id)])]; DB.put('blocks', run); changed();
      } }] });
  },
  applyRun(run, def, add, ret, note, links) {
    const now = isoLocal(new Date()), lastAt = {};
    for (const r of add) {
      const t = run.temp[r.t.id], text = r.text.trim();
      const step = { id: t.id, text, created: now, status: 'live', supersedes: [], supersededBy: [], iter: { at: now, kind: 'add', before: '', after: text, links: links.slice(), note, fromRun: run.id } };
      const anchor = lastAt[r.after] || r.after, i = anchor ? def.steps.findIndex(s => s.id === anchor) : -1;
      def.steps.splice(i + 1, 0, step); lastAt[r.after] = step.id;
      const tp = Object.assign({}, run.temp); delete tp[t.id]; run.temp = tp;
    }
    for (const r of ret) { const s = PROTO.step(def, r.s.id); s.status = 'retired'; s.retiredAt = now; (def.log = def.log || []).push({ at: now, kind: 'remove', stepId: s.id, before: s.text, links: links.slice(), note, fromRun: run.id }); }
    def.modified = now; PROTO.syncBody(def); DB.put('blocks', def); PROTO.syncRunBody(run, def); DB.put('blocks', run);
    const hd = M.doc(PROTO.homeDoc(def)); if (hd) { hd.modified = now; DB.put('documents', hd); }
    changed(); toast(`“${def.label}” updated — ${[add.length ? plural(add.length, 'step') + ' added' : '', ret.length ? plural(ret.length, 'step') + ' retired' : ''].filter(Boolean).join(', ')}, logged as iterations`);
  },
  /* ---------------- the run's timer: one widget on the protocol box ---------------- */
  timerWidget(b, def, d, stepIds, sess, cur, ro) {
    const checks = b.checks || {}, done = stepIds.filter(id => checks[id]).length, all = stepIds.length && done === stepIds.length;
    const lastChk = stepIds.map(id => checks[id]).filter(Boolean).sort((x, y) => (y.offsetMs || 0) - (x.offsetMs || 0))[0];
    const bar = h('div.rt-bar', stepIds.map((id, i) => h('span' + (checks[id] ? '.d' : id === cur ? '.c' : ''), { title: 'Step ' + (i + 1) + (checks[id] && checks[id].durMs != null ? ' · ' + fmtDur(checks[id].durMs, true) : '') })));
    if (ro) return h('div.rtimer.idle', h('span.rt-t', done + '/' + stepIds.length), bar);
    if (all && !sess) return h('div.rtimer.done', h('span.rt-ic', '✓'), h('div.rt-mid', h('b', 'Run complete'), h('span.rt-s', plural(stepIds.length, 'step') + (lastChk && lastChk.offsetMs != null ? ' · ' + fmtDur(lastChk.offsetMs, true) : ''))), h('div.row', { style: { gap: '6px' } }, lastChk && lastChk.sessionId ? h('button.rt-b', { title: 'Summary', on: { click: e => { e.stopPropagation(); protocolSummary(lastChk.sessionId); } } }, 'Summary') : null, b.kind === 'protocol' ? h('button.rt-b', { title: 'Keep this run on record and start a fresh one', on: { click: e => { e.stopPropagation(); PROTO.resetRun(b); } } }, 'Run again') : null), bar);
    if (!sess) return h('div.rtimer.idle', h('button.rt-play', { title: 'Start the timer — step 1 is highlighted', on: { click: e => { e.stopPropagation(); TIMER.start(d.id); } } }, h('span', '▶')),
      h('div.rt-mid', h('b', done ? 'Resume the run' : 'Start the run'), h('span.rt-s', done ? `${done}/${stepIds.length} steps done` : plural(stepIds.length, 'step') + ' · each check records its time')), bar);
    const paused = sess.state === 'paused', ci = stepIds.indexOf(cur);
    return h('div.rtimer' + (paused ? '.paused' : '.on'),
      h('button.rt-play', { title: paused ? 'Resume' : 'Pause', on: { click: e => { e.stopPropagation(); paused ? TIMER.resume(sess) : TIMER.pause(sess); } } }, h('span', paused ? '▶' : '❚❚')),
      h('div.rt-mid', h('span.rt-t', { 'data-sess': sess.id }, fmtDur(TIMER.elapsed(sess), true)),
        h('span.rt-s', paused ? 'paused · ' : '', cur ? `step ${ci + 1} of ${stepIds.length}` : 'all steps checked')),
      h('button.rt-b.stop', { title: 'Stop the timer', on: { click: e => { e.stopPropagation(); TIMER.stop(sess); } } }, '■'), bar);
  },
  /* ---------------- observations made during a run sit beside it on the paper, wired to their step's dot ---------------- */
  obsLayer(pane, d) {
    const w = pane.paper.world; $$(':scope > .obsbox', w).forEach(x => x.remove()); if (pane.travel) return;
    const hosts = M.liveBlocks(d.id).filter(b => b.kind === 'run' || (b.kind === 'protocol' && !b.registered));
    for (const host of hosts) {
      const order = PROTO.seq(host), ix = it => { const i = order.indexOf(it.step.stepId); return i < 0 ? 1e3 : i; };
      const its = IX.itemsOriginatingIn(host.id).filter(it => it.step && !it.correctedBy).sort((a, c) => ix(a) - ix(c) || a.created.localeCompare(c.created));
      for (const it of its) {
        const el = h('div.obsbox.nopan', { 'data-item': it.id, 'data-host': host.id, 'data-step': it.step.stepId, style: { '--kc': `var(--k-${it.kind})` } },
          h('div.ob-h', kchip(it.kind), IX.status(it) ? h('span.pill', IX.status(it)) : null, h('span.spacer'), h('span.mono.tiny.muted', it.timer ? '+' + fmtDur(it.timer.offsetMs) : fmtTime(it.created))),
          h('div.ob-t', it.text));
        PROTO.dragObs(el, it, host, pane); w.append(el);
      }
    }
  },
  /** Place the boxes (auto: right of the protocol box, level with their step) and say where their wires start. */
  layoutObs(pane) {
    const w = pane.paper.world, z = pane.paper.view.z, wr = w.getBoundingClientRect(), rel = el => { const r = el.getBoundingClientRect(); return { x: (r.left - wr.left) / z, y: (r.top - wr.top) / z, w: r.width / z, h: r.height / z }; };
    const byHost = new Map(); $$(':scope > .obsbox', w).forEach(el => { if (!byHost.has(el.dataset.host)) byHost.set(el.dataset.host, []); byHost.get(el.dataset.host).push(el); });
    let maxR = -1e9;
    for (const [hid, els] of byHost) {
      const host = M.block(hid), hb = $(`.box[data-id="${hid}"]`, w); if (!host || !hb) { els.forEach(e => e.remove()); continue; }
      const H = { x: hb.offsetLeft, y: hb.offsetTop, w: hb.offsetWidth }; let cursor = -1e9;
      for (const el of els) {
        const it = M.item(el.dataset.item), row = $(`.pstep[data-step="${el.dataset.step}"]`, hb) || $('.pstep', hb), rr = row ? rel(row) : { y: H.y + 40 };
        let x, y; if (it.pos) { x = H.x + it.pos.dx; y = H.y + it.pos.dy; } else { x = H.x + H.w + 64; y = Math.max(rr.y - 4, cursor); }
        el.style.left = x + 'px'; el.style.top = y + 'px'; if (!it.pos) cursor = y + el.offsetHeight + 10; maxR = Math.max(maxR, x + el.offsetWidth);
      }
    }
    if (PROTO._follow) { const cr = $(`.box[data-id="${PROTO._follow}"] .pstep.cur`, w); if (cr) { PROTO._follow = null; const r = cr.getBoundingClientRect(), pr = pane.paper.rect(), lo = pr.bottom - 110, hi = pr.top + 30;
      const dy = r.bottom > lo ? lo - r.bottom - 60 : r.top < hi ? hi - r.top + 30 : 0; if (dy) requestAnimationFrame(() => pane.paper.animateView({ x: pane.paper.view.x, y: pane.paper.view.y + dy, z: pane.paper.view.z }, 380)); } }
    const d = M.doc(pane.docId), sy = $('.box.synth', w); if (sy && d && !(d.layout || {}).synth && maxR > sy.offsetLeft - 60) sy.style.left = (Math.ceil((maxR + 80) / 14) * 14) + 'px';
  },
  obsWires(pane) {
    const w = pane.paper.world; let out = '';
    for (const el of $$(':scope > .obsbox', w)) {
      const hb = $(`.box[data-id="${el.dataset.host}"]`, w); if (!hb) continue;
      const row = $(`.pstep[data-step="${el.dataset.step}"]`, hb), dot = row && $('.obsdot', row);
      const x1 = hb.offsetLeft + hb.offsetWidth, y1 = row ? hb.offsetTop + PROTO._offIn(row, hb) + (dot ? dot.offsetTop + 5 : 14) : hb.offsetTop + 30;
      const x2 = el.offsetLeft, y2 = el.offsetTop + 15, mx = (x1 + x2) / 2;
      const left = x2 < x1 - 40, ex = left ? el.offsetLeft + el.offsetWidth : x2;
      out += `<path class="ow" style="--kc:var(--k-${(M.item(el.dataset.item) || {}).kind || 'observation'})" d="M${x1},${y1} C${left ? x1 + 60 : mx},${y1} ${left ? ex + 60 : mx},${y2} ${ex},${y2}"/><circle class="owd" cx="${ex}" cy="${y2}" r="2.5"/>`;
    }
    return out;
  },
  _offIn(el, anc) { let y = 0; while (el && el !== anc) { y += el.offsetTop; el = el.offsetParent; } return y; },
  dragObs(el, it, host, pane) {
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; e.stopPropagation(); const z = pane.paper.view.z, sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop; let moved = false;
      const mv = ev => { const dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z; if (!moved && Math.hypot(dx, dy) < 4) return; moved = true; el.classList.add('drag');
        el.style.left = Math.round((ox + dx) / 14) * 14 + 'px'; el.style.top = Math.round((oy + dy) / 14) * 14 + 'px'; pane.drawWires(); };
      const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); el.classList.remove('drag');
        if (moved) { const hb = $(`.box[data-id="${host.id}"]`, pane.paper.world); it.pos = { dx: el.offsetLeft - hb.offsetLeft, dy: el.offsetTop - hb.offsetTop }; DB.put('items', it); DB.beginGroup(); }
        else if (ev.ctrlKey || ev.metaKey) App.jump(it.originBlockId, ev);
        else ED.itemPopover(it.id, ev.clientX, ev.clientY + 8, host, null); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    el.addEventListener('mouseenter', () => { const r = $(`.box[data-id="${host.id}"] .pstep[data-step="${it.step.stepId}"]`, pane.paper.world); r && r.classList.add('hl'); });
    el.addEventListener('mouseleave', () => $$('.pstep.hl', pane.paper.world).forEach(r => r.classList.remove('hl')));
  },

  /* ---------------- rendering ---------------- */
  body(b, d, pane, ro) {
    const def = PROTO.defOf(b); if (!def) return h('div.refbody', 'Protocol missing');
    const isRun = b.kind === 'run', canEdit = !ro && !isRun && PROTO.editableIn(def, d.id), home = M.doc(PROTO.homeDoc(def));
    const inHome = !isRun && def.registered && def.registered.docId === d.id, observable = !ro && PROTO.runnable(b);
    const runner = PROTO.runnable(b), stepIds = PROTO.seq(b), active = PROTO.activeSeq(b), skipped = new Set(b.skipped || []), sess = TIMER.activeFor(d.id);
    const wrap = h('div.pbody');
    if (isRun || (def.registered && !inHome)) wrap.append(h('div.porigin', 'Protocol ', h('a', { title: 'Alt+click: open beside', on: { click: e => App.jump(def.id, e) } }, def.label), home && home.id !== d.id ? ' · ' + M.docPath(home).replace(/ › [^›]*$/, '') : '', isRun ? h('span.pstat', `${active.filter(id => (b.checks || {})[id]).length}/${active.length} steps`) : null));
    const cur = runner && sess ? active.find(id => !(b.checks || {})[id]) : null, boxes = !ro && runner;
    if (runner || (ro && isRun)) wrap.append(PROTO.timerWidget(b, def, d, active, sess, cur, ro));
    const list = h('ol.psteps'); let n = 0;
    stepIds.forEach(sid => {
      const s = PROTO.stepOf(b, def, sid); if (!s) return;
      const temp = !!(b.temp || {})[sid], skip = skipped.has(sid), num = skip ? null : ++n;
      const chk = runner && !skip && (b.checks || {})[sid], obsAll = PROTO.observations(def, sid), obsHere = isRun ? obsAll.filter(it => it.originBlockId === b.id) : obsAll;
      const its = temp ? [] : PROTO.iterations(def, sid), revised = isRun && !temp && s.status !== 'live';
      const row = h('li.pstep' + (chk ? '.done' : '') + (sid === cur ? '.cur' : '') + (temp ? '.temp' : '') + (skip ? '.skip' : ''), { 'data-step': sid });
      row.append(
        skip ? h('span.pnum', { title: 'Skipped in this run' }, '–')
          : runner && !ro ? h('button.pnum.chk' + (chk ? '.on' : ''), { title: sess ? 'Check off — times this step inside the running timer' : 'Check off (start the timer to time steps)', on: { click: e => { e.stopPropagation(); PROTO.check(b, sid); } } }, chk ? '✓' : num) : h('span.pnum', num),
        canEdit ? PROTO.editor(def, s) : temp && !ro ? PROTO.tempEditor(b, s) : h('div.ptext', s.text || h('i.muted', 'empty step')),
        h('div.pmarks',
          temp ? h('span.pill.warn', { title: 'A temporary step: it lives only in this note. At the end of the run you can add it to the protocol.' }, 'temp') : null,
          skip ? h('span.pill', 'skipped here') : null,
          chk ? h('span.stepinfo.ok', { title: 'Completed ' + fmtWhen(chk.at) }, h('i', '✓'), chk.durMs != null ? `${fmtDur(chk.durMs, true)} · +${fmtDur(chk.offsetMs)}` : fmtTime(chk.at)) : null,
          sid === cur ? h('span.stepinfo.live', { 'data-stepsess': sess.id, 'data-off': PROTO.lastOffset(sess) }, fmtDur(TIMER.elapsed(sess) - PROTO.lastOffset(sess), true)) : null,
          sid === cur && !ro ? h('button.pgo', { title: 'Mark step ' + num + ' complete — records its time and moves to the next step', on: { click: e => { e.stopPropagation(); PROTO.check(b, sid); } } }, '✓') : null,
          revised ? h('span.pill', { title: 'The protocol has changed this step since the run started' }, 'revised since') : null,
          its.length ? PROTO.iterDot(def, sid, its) : null,
          obsHere.length && !boxes ? PROTO.obsCircle(def, sid, obsHere, 'in its lifetime') : null,
          canEdit ? h('button.ib.pmenu', { title: 'Step', on: { click: e => { e.stopPropagation(); PROTO.stepMenu(def, s, e); } } }, '⋯')
            : isRun && !ro ? h('button.ib.pmenu', { title: 'This run only', on: { click: e => { e.stopPropagation(); PROTO.runStepMenu(b, def, sid, e); } } }, '⋯') : null),
        observable && !skip ? h('button.obsdot', { title: 'Add an observation at this step', on: { click: e => { e.stopPropagation(); PROTO.obsPopover(b, def, sid, e.currentTarget); } } }) : null);
      const sub = !temp && s.sub && M.block(s.sub);
      if (sub && sub.status !== 'removed') row.append(PROTO.subRow(b, def, sid, sub, d, pane, ro, runner && !skip));
      list.append(row);
    });
    wrap.append(list);
    if (canEdit) wrap.append(h('button.paddstep', { on: { click: () => { const s = PROTO.insertStep(def, null); pane.pendingFocus = null; setTimeout(() => { const el = $(`.pstep[data-step="${s.id}"] .ptext`, pane.paper.world); el && el.focus(); }, 60); } } }, '+ step'));
    if (isRun && !ro) {
      const pend = PROTO.pending(b);
      wrap.append(h('div.prunrow', h('button.paddstep.temp', { title: 'A step for this experiment only — the protocol is not changed', on: { click: () => PROTO.addTemp(b, null, pane) } }, '+ temporary step'),
        pend.length ? h('button.ppromote', { title: 'Add temporary steps (or retire skipped ones) to the protocol, logged as iterations', on: { click: () => PROTO.promoteDialog(b) } }, `Update the protocol with ${plural(pend.length, 'change')}…`) : null));
    }
    if (inHome || (!isRun && !def.registered)) {
      const runs = PROTO.runsOf(def), lifetime = def.steps.reduce((n, s) => n + (IX.stepObs.get(def.id + ':' + s.id) || []).length, 0), removed = (def.log || []).filter(l => l.kind === 'remove');
      if (runs.length || lifetime || removed.length) {
        const foot = h('div.pfoot', runs.length ? PROTO.runsChip(def, runs) : null, h('span', plural(lifetime, 'observation') + ' in its lifetime'),
          removed.length ? h('span.wchip.roll', { title: removed.map(r => fmtDay(r.at) + ': ' + r.before + (r.note ? ' — ' + r.note : '')).join('\n') }, plural(removed.length, 'retired step')) : null);
        wrap.append(foot);
      }
    }
    if (!isRun && !def.registered && !def.localOnly && !ro) wrap.append(h('button.regdot', { title: 'Not registered yet — click to register it as a protocol', on: { click: e => { e.stopPropagation(); PROTO.registerDialog(def); } } }));
    return wrap;
  },
  editor(def, s) {
    const el = h('div.ptext.edit', { contenteditable: 'plaintext-only', spellcheck: 'true', 'data-ph': 'Describe the step…' }, s.text);
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const t = el.textContent; el._skip = true; PROTO.editStep(def, s, t, el); const ns = PROTO.insertStep(def, (PROTO.step(def, s.id).supersededBy || [])[0] || s.id); setTimeout(() => { const n = $(`.pstep[data-step="${ns.id}"] .ptext`); n && n.focus(); }, 80); }
      if (e.key === 'Backspace' && !el.textContent && PROTO.live(def).length > 1) { e.preventDefault(); el._skip = true; PROTO.removeStep(def, s, el); }
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); el._skip = true; PROTO.editStep(def, s, el.textContent, el); PROTO.tabFrom(def, s.id, e.shiftKey ? -1 : 1); setTimeout(() => { el._skip = false; }, 150); }
      if (e.key === 'Escape') el.blur();
      e.stopPropagation();
    });
    el.addEventListener('blur', () => { if (el._skip) return; PROTO.editStep(def, s, el.textContent, el); });
    return el;
  },
  stepMenu(def, s, e) {
    const anchor = e.currentTarget.closest('.pstep');
    ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Step ' + PROTO.num(def, s.id) },
      { label: 'Insert a step after', run: () => PROTO.insertStep(def, s.id) },
      { label: 'Split into two…', sub: def.registered ? 'Logged as an iteration; both inherit its observations' : null, run: async () => { const t = await askText('Split step', 'Two steps, one per line', s.text + '\n', { multiline: true }); if (!t) return; const [a, b2] = t.split('\n').map(x => x.trim()).filter(Boolean); if (a && b2) PROTO.splitStep(def, s, a, b2, anchor); } },
      { label: 'Move up', run: () => PROTO.moveStep(def, s, -1) }, { label: 'Move down', run: () => PROTO.moveStep(def, s, 1) },
      PROTO.iterations(def, s.id).length ? { label: 'Link the latest iteration to…', run: () => PROTO.linkPrompt(def, s.id, anchor, true) } : null,
      { label: s.sub && M.block(s.sub) ? 'Tie to a different protocol…' : 'Tie to another protocol…', sub: 'The step is done by following that protocol', run: () => PROTO.tieDialog(def, s) },
      s.sub ? { label: 'Untie “' + snippet((M.block(s.sub) || {}).label || 'protocol', 30) + '”', run: () => PROTO.tie(def, s, null) } : null,
      { label: def.registered && PROTO.used(def, s) ? 'Retire step' : 'Remove step', danger: true, run: () => PROTO.removeStep(def, s, anchor) }]);
  },
  obsPopover(host, def, sid, anchor) {
    let kind = 'observation'; const ta = h('textarea.inp', { rows: 3, placeholder: 'What did you see at this step?' }), kinds = h('div.row', { style: { gap: '4px', margin: '6px 0' } });
    const drawK = () => kinds.replaceChildren(...['observation', 'barrier', 'deviation', 'result', 'question'].map(k => h('button.kpick' + (k === kind ? '.on' : ''), { style: { '--kc': `var(--k-${k})` }, on: { click: () => { kind = k; drawK(); } } }, KIND[k].label)));
    drawK(); const r = anchor.getBoundingClientRect();
    const add = () => { const t = ta.value.trim(); if (!t) return; closePop(); PROTO.addObservation(host, def, sid, kind, t); toast(KIND[kind].label + ' recorded at step ' + (PROTO.numIn(host, sid) || PROTO.num(def, sid)) + (TIMER.runningFor(host.docId) ? ' — stamped in the timer' : '')); };
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); add(); } });
    popover(r.right + 10, r.top - 8, [h('h5', 'Step ' + (PROTO.numIn(host, sid) || PROTO.num(def, sid)) + ' · ' + snippet((PROTO.stepOf(host, def, sid) || {}).text, 40)), ta, kinds, h('div.row', { style: { justifyContent: 'flex-end' } }, h('span.tiny.muted', { style: { marginRight: 'auto' } }, 'Enter to add · it also counts on the protocol note'), h('button.btn.sm.pri', { on: { click: add } }, 'Add'))]);
    setTimeout(() => ta.focus(), 20);
  },
  obsCircle(def, sid, list, where) {
    const el = h('span.obsn', { title: '' }, list.length);
    stickyPop(el, () => { const rows = list.slice().reverse().map(it => {
      const od = M.doc(it.originDocId), gen = PROTO.ancestors(def, sid).find(a => a.id === it.step.stepId);
      return h('div.sp-row', { on: { click: e => App.jump(it.originBlockId, e) } }, h('div.row', { style: { gap: '6px' } }, kchip(it.kind), IX.status(it) ? h('span.pill', IX.status(it)) : null, h('span.spacer'), h('span.mono.tiny.muted', fmtDay(it.created) + ' ' + fmtTime(it.created) + (it.timer ? ' · +' + fmtDur(it.timer.offsetMs) : ''))),
        h('div.serif', it.text), h('div.tiny.muted', (od ? od.title : '—') + (gen ? ` · on an earlier wording (generation ${gen.gen})` : '')));
    }).map((el2, i) => { const it = list.slice().reverse()[i]; return { el: el2, text: KIND[it.kind].label + ' ' + it.text, date: it.created, note: (M.doc(it.originDocId) || {}).title }; });
    const host = h('div'), bar = filterBar(rows, host, { placeholder: 'Search observations…', min: 2 });
    return h('div', h('div.sp-h', plural(list.length, 'observation') + ' · step ' + (PROTO.num(def, sid) || '') + ' · ' + where), bar, host, h('div.sp-f', 'Click to open · Alt+click to open beside this note')); });
    return el;
  },
  iterDot(def, sid, its) {
    const el = h('span.itdot', its.length), home = M.doc(PROTO.homeDoc(def));
    stickyPop(el, () => {
      const rows = its.map(x => { const linkObjs = x.links.map(l => [l, l.type === 'item' ? M.item(l.id) : l.type === 'doc' ? M.doc(l.id) : M.block(l.id)]).filter(v => v[1]);
        const links = linkObjs.map(([l, o]) => {
          if (l.type === 'doc') return h('a.sp-link', { on: { click: e => App.jump(o.id, e, true) } }, typechip(o.type), ' ', o.title);
          const target = l.type === 'item' ? o.originBlockId : o.id, label = l.type === 'item' ? o.text : M.blockName(o), d2 = M.doc(l.type === 'item' ? o.originDocId : o.docId);
          return h('a.sp-link', { on: { click: e => App.jump(target, e) } }, l.type === 'item' ? kchip(o.kind) : h('span.pill', 'component'), ' ', snippet(label, 60), h('span.tiny.muted', ' · ' + (d2 ? d2.title : ''))); });
        const canLink = home && App.panes().some(p => p.docId === home.id);
        return { date: x.at, text: (x.before || '') + ' ' + (x.after || '') + ' ' + linkObjs.map(([l, o]) => o.text || o.title || M.blockName(o)).join(' '), note: '',
          el: h('div.sp-row.it', h('div.row', { style: { gap: '6px' } }, h('span.pill.mag', x.kind === 'add' ? 'added' : x.kind === 'split' ? 'split' : 'changed'), h('span.spacer'), h('span.mono.tiny.muted', fmtDay(x.at) + ' ' + fmtTime(x.at))),
            x.before ? h('div.diff', h('del', x.before), h('ins', x.after)) : h('div.diff', h('ins', x.after || '(empty)')),
            x.note ? h('div.it-note', x.note) : null,
            x.fromRun && M.block(x.fromRun) ? h('div.tiny.muted', 'from the run in ', h('a', { on: { click: e => App.jump(x.fromRun, e) } }, (M.doc(M.block(x.fromRun).docId) || {}).title || 'a note')) : null,
            h('div.sp-links', h('span.tiny.muted', links.length ? 'connected to' : 'no connection recorded'), links,
              canLink ? h('button.sp-add', { on: { click: e => { e.stopPropagation(); closeSticky(); PROTO.linkPrompt(def, x.stepId, el, true); } } }, '+ connect to…') : null)) }; });
      const host = h('div'), bar = filterBar(rows, host, { placeholder: 'Search iterations…', min: 2 });
      return h('div', h('div.sp-h', plural(its.length, 'iteration') + ' · step ' + PROTO.num(def, sid)), bar, host, h('div.sp-f', 'Alt+click a connection to open it beside this note'));
    });
    return el;
  },
  runsChip(def, runs) {
    const el = h('span.wchip.teal', '⟲ ' + plural(runs.length, 'run'));
    stickyPop(el, () => { const rows = runs.map(r => { const d = M.doc(r.docId); const done = (r.stepIds || []).filter(id => (r.checks || {})[id]).length;
      return { text: d ? d.title : '—', date: r.created, note: d ? d.title : '', el: h('div.sp-row', { on: { click: e => App.jump(r.id, e) } }, h('div', { style: { fontWeight: 600, fontSize: '12.5px' } }, d ? d.title : '—'), h('div.tiny.muted', `${fmtDay(r.created)} · ${done}/${(r.stepIds || []).length} steps · ${plural(IX.itemsOriginatingIn(r.id).filter(i => i.step).length, 'observation')}`)) }; });
      const host = h('div'), bar = filterBar(rows, host, { placeholder: 'Search runs…', min: 2 });
      return h('div', h('div.sp-h', plural(runs.length, 'run') + ' of this protocol'), bar, host, h('div.sp-f', 'Alt+click opens a run beside this note')); });
    return el;
  },
};

/* ---------------- sticky hover pop-ups: they stay while the cursor is on them ---------------- */
let _sp = null, _spT = null;
function closeSticky() { clearTimeout(_spT); if (_sp) { _sp.remove(); _sp = null; } }
function stickyPop(anchor, build) {
  const later = () => { clearTimeout(_spT); _spT = setTimeout(closeSticky, 240); };
  anchor.addEventListener('mouseenter', () => { clearTimeout(_spT); _spT = setTimeout(() => {
    closeSticky(); hideHover(); const el = h('div.sticky', build()); document.body.append(el); _sp = el;
    const a = anchor.getBoundingClientRect(), r = el.getBoundingClientRect(); let x = a.right + 10; if (x + r.width > innerWidth - 8) x = Math.max(8, a.left - r.width - 10);
    el.style.left = x + 'px'; el.style.top = clamp(a.top - 12, 8, innerHeight - r.height - 8) + 'px';
    el.addEventListener('mouseenter', () => clearTimeout(_spT)); el.addEventListener('mouseleave', later); }, 140); });
  anchor.addEventListener('mouseleave', later);
  anchor.addEventListener('click', e => e.stopPropagation());
}
document.addEventListener('pointerdown', e => { if (_sp && !_sp.contains(e.target)) closeSticky(); }, true);

/* ---------------- demo: one registered protocol with three runs, one draft protocol ---------------- */
function seedProtocols(T, K, wire) {
  const P = 'p_tfe', at0 = T(-40, '09:00'), iso = x => isoLocal(x), stamp = a => ({ at: iso(a), from: iso(new Date(+a - 432e5)), to: iso(new Date(+a + 432e5)) });
  const d = { id: 'd_proto', type: 'protocol', scope: 'project', projectId: P, themeId: 't_tfm', title: 'Monolayer TFM on PAA gels', templateId: null, header: { tags: ['TFM'], version: '3', owner: 'Gabriel' }, blockIds: [], synthesis: { text: 'The standard monolayer traction run. Straining before seeding fixed the clumping; λ = 1e-9 after noisy maps.', marks: [] }, citeMode: 'title', layout: { head: { x: 0, y: 0 } }, created: iso(at0), modified: iso(T(-12, '10:00')) };
  DB.put('documents', d);
  const st = (id, text, day, hm, extra = {}) => Object.assign({ id, text, created: iso(T(day, hm)), status: 'live', supersedes: [], supersededBy: [] }, extra);
  const s3 = st('st_3', 'Seed MDCK at 40k/cm² and let spread 24 h.', -40, '09:12', { status: 'superseded', supersededBy: ['st_3a', 'st_3b'], supersededAt: iso(T(-24, '09:12')) });
  const s5o = st('st_5o', 'Run FTTC on the displacement field to get traction maps; regularisation λ = 1e-8.', -40, '09:30', { status: 'superseded', supersededBy: ['st_5'], supersededAt: iso(T(-12, '10:00')) });
  const steps = [st('st_1', 'Cast an 8 kPa PAA gel with 0.2 µm fluorescent beads; degas 20 min before polymerising.', -40, '09:00'),
    st('st_2', 'Sulfo-SANPAH activation under UV, then collagen I at 50 µg/mL overnight at 4 °C.', -40, '09:10'), s3,
    st('st_3a', 'Strain the suspension through a 40 µm mesh before counting.', -24, '09:12', { supersedes: ['st_3'], iter: { at: iso(T(-24, '09:12')), kind: 'split', before: s3.text, after: 'Strain the suspension through a 40 µm mesh before counting.', links: [] } }),
    st('st_3b', 'Count and seed at 40k/cm²; let spread 24 h.', -24, '09:13', { supersedes: ['st_3'], iter: { at: iso(T(-24, '09:13')), kind: 'split', before: s3.text, after: 'Count and seed at 40k/cm²; let spread 24 h.', links: [] } }),
    st('st_4', 'Image beads at 10× with the monolayer, then trypsinise for the stress-free reference frame.', -40, '09:20'), s5o,
    st('st_5', 'Run FTTC on the displacement field to get traction maps; regularisation λ = 1e-9.', -12, '10:00', { supersedes: ['st_5o'], iter: { at: iso(T(-12, '10:00')), kind: 'edit', before: s5o.text, after: 'Run FTTC on the displacement field to get traction maps; regularisation λ = 1e-9.', links: [] } })];
  const def = { id: 'c_proto', docId: 'd_proto', kind: 'protocol', label: 'Monolayer TFM on PAA gels', steps, registered: { docId: 'd_proto', projectId: P, themeId: 't_tfm', at: iso(at0) }, localOnly: false, log: [], body: { text: '', marks: [] }, status: 'live', supersedes: [], supersededBy: [],
    created: iso(at0), modified: iso(T(-12, '10:00')), x: 0, y: 168, w: 476, fields: [], manualSec: null, step: null, stamp: stamp(at0) };
  PROTO.syncBody(def); DB.put('blocks', def); d.blockIds.push(def.id); DB.put('documents', d);
  const mkRun = (id, docId, day, hm, stepIds, checks) => { const a = T(day, hm), D = M.doc(docId);
    const r = { id, docId, kind: 'run', protocolId: 'c_proto', stepIds, checks: checks || {}, label: '', body: { text: '', marks: [] }, status: 'live', supersedes: [], supersededBy: [], created: iso(a), modified: iso(a), x: 470, y: 168, w: 448, fields: [], manualSec: null, step: null, stamp: stamp(a) };
    PROTO.syncRunBody(r, def); DB.put('blocks', r); D.blockIds.push(id); DB.put('documents', D); return r; };
  const obs = (run, stepId, kind, text, day, hm, extra = {}) => { const it = M.createItem(kind, text, run, Object.assign({ step: { protocolId: 'c_proto', stepId } }, extra)); it.created = iso(T(day, hm)); DB.put('items', it); return it; };
  const rGel = mkRun('c_run_gel', 'd_gel', -34, '09:10', ['st_1', 'st_2', 'st_3', 'st_4', 's5o'].map(x => x === 's5o' ? 'st_5o' : x));
  const clump = obs(rGel, 'st_3', 'barrier', 'Cells clumped at seeding and spread unevenly', -34, '11:40');
  obs(rGel, 'st_3', 'deviation', 'Seeded at 60k/cm² to compensate', -34, '11:52');
  const ck = (offs) => Object.fromEntries(offs.map(([sid, at, dur, off]) => [sid, { at: iso(T(-16, at)), durMs: dur * 6e4, offsetMs: off * 6e4 }]));
  const r8 = mkRun('c_run_8k', 'd_8k', -16, '09:05', ['st_1', 'st_2', 'st_3a', 'st_3b', 'st_4', 'st_5o'], ck([['st_1', '09:12', 7, 7], ['st_2', '09:30', 18, 25], ['st_3a', '09:38', 8, 33], ['st_3b', '09:48', 10, 43], ['st_4', '10:30', 42, 85], ['st_5o', '11:40', 70, 155]]));
  const strain = obs(r8, 'st_3a', 'resolution', 'Straining removed the clumps', -16, '09:40', { resolves: clump.id, timer: { offsetMs: 35 * 6e4 } });
  obs(r8, 'st_3b', 'observation', 'Monolayer confluent by 24 h, edges even', -16, '09:50', { timer: { offsetMs: 45 * 6e4 } });
  obs(r8, 'st_4', 'deviation', 'Imaged at 15 s intervals instead of 10 s', -16, '10:20', { timer: { offsetMs: 75 * 6e4 } });
  const noisy = obs(r8, 'st_5o', 'observation', 'Traction maps noisy at λ = 1e-8; edge peaks smeared', -16, '11:30', { timer: { offsetMs: 145 * 6e4 } });
  const r30 = mkRun('c_run_30k', 'd_30k', -9, '09:05', ['st_1', 'st_2', 'st_3a', 'st_3b', 'st_4', 'st_5'], { st_1: { at: iso(T(-9, '09:20')) }, st_2: { at: iso(T(-9, '09:35')) }, st_3a: { at: iso(T(-9, '09:42')) }, st_3b: { at: iso(T(-9, '09:50')) } });
  obs(r30, 'st_1', 'observation', 'Gel batch 15, degassed 25 min', -9, '09:18');
  obs(r30, 'st_4', 'deviation', 'Imaged at 15 s intervals again', -9, '10:05');
  def.steps.find(s => s.id === 'st_3a').iter.links = [{ type: 'item', id: clump.id }];
  def.steps.find(s => s.id === 'st_3b').iter.links = [{ type: 'item', id: clump.id }];
  def.steps.find(s => s.id === 'st_5').iter.links = [{ type: 'item', id: noisy.id }];
  DB.put('blocks', def);
  wire('g4', 'proto', 'supports', -32);
  // a protocol drafted inside today's note, not yet registered — its light is on
  const pl = M.doc('d_plate'), now = new Date(), a = iso(now);
  const draft = { id: 'c_draft', docId: 'd_plate', kind: 'protocol', label: 'ELISA plate coating', registered: null, localOnly: false, log: [], status: 'live', supersedes: [], supersededBy: [], created: a, modified: a, x: 470, y: 168, w: 448, fields: [], manualSec: null, step: null, stamp: stamp(now),
    steps: ['Coat with capture antibody at 2 µg/mL, 100 µL/well, overnight at 4 °C', 'Wash 3× with PBS-T', 'Block with 1% BSA for 1 h at room temperature', 'Add standards and samples; incubate 2 h'].map(t => ({ id: uid('st'), text: t, created: a, status: 'live', supersedes: [], supersededBy: [] })) };
  PROTO.syncBody(draft); DB.put('blocks', draft); pl.blockIds.push(draft.id); DB.put('documents', pl);
}
