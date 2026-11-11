/* ==========================================================================
   13zzr · Synthesis (V3.967 — Gabe: "Reflection at the end of an experiment
   becomes synthesis, which is a staple note in the project that summarizes
   all important takeaways, evidence, claims and results into one note. The
   process lives in Planning, Run, and Analysis. All claims, evidence,
   results, takeaways, barriers, resolutions, and a panel of the rest of the
   components in a scrollable list for you to pick any more, get transferred
   to the synthesis note automatically, and you build/rearrange the note.")
   • The last stage of an experiment is Synthesis (the reflection profile,
     relabelled in 02-schema; a Reflection note made before is one too).
   • When it is made (Next from the Analysis), every claim, evidence, result,
     takeaway, barrier and resolution in the experiment's other notes is
     pulled in as a reference, in a column per kind under a heading, and
     each stage's "what this note adds up to" comes along as a component.
     Nothing is copied: a reference points at the original. ⟲ Gather (the
     dock) pulls in what the notes gained since.
   • ☰ The rest (the dock): a panel listing every other component of the
     experiment's notes, by stage, each with Pull in. The person builds and
     rearranges the note.
   • V3.973 (Gabe: "I want to be able to create a synthesis note outside of
     an experiment. In doing so, I can add a list of notes that get
     synthesized as a synthesis note for an experiment would. For example,
     if there is a takeaway from a couple of lines inside a giant text
     component, then only that takeaway gets synthesized."): /synthesis (or
     ± Notes in the dock of any Synthesis note) chooses the notes, kept as
     d.synthOf; gathering then works on them as on an experiment's — what is
     marked as a structure comes in as that structure alone (a reference to
     the takeaway, not to the component around it). An experiment's
     Synthesis can take more notes the same way.
   • V3.976 (Gabe: "Synthesis notes, when created, have a component in them
     that ask you to add notes you'd like to synthesize. Additionally, you
     can right click a component or a highlighted text in those notes to
     flag for synthesis, which automatically ports them into that synthesis
     note, like a pulled in component would. For Lit Reviews, only the
     information that is flagged for synthesis may appear in a synthesis
     note, not the usual takeaways, results, etc..."): every Synthesis note
     has a "notes to synthesize" component (WIDGETS.synthof) listing its
     notes, with + Add notes… and ⟲ Gather. In those notes, right-click a
     component, words you select, or a marked passage → Flag for synthesis:
     a pulled-in component (or a live excerpt of the words, 13zzt) lands
     under "Flagged for synthesis". A lit review gives nothing but that.
   ========================================================================== */
const SYNTH = {
  KINDS: ['claim', 'evidence', 'result', 'takeaway', 'barrier', 'resolution'],
  HEAD: { claim: 'Claims', evidence: 'Evidence', result: 'Results', takeaway: 'Takeaways', barrier: 'Barriers', resolution: 'Resolutions' },
  COL: 440, ROW: 150, Y0: 0,
  is: d => !!d && d.type === 'reflection',   // V3.973: any Synthesis note — an experiment's last stage, or one of notes you choose
  /** Where the first column goes: right of the note's header and of every box it holds. */
  start(d) { const bs = M.docBlocks(d.id).filter(b => b.status === 'live' && b.x != null); return Math.ceil(Math.max(476, ...bs.map(b => b.x + (b.w || 392) + 84)) / 14) * 14; },
  /** The notes it synthesizes: the experiment's other notes, and those chosen (d.synthOf). */
  others(d) { const L = d.chain ? CHAIN.members(d).filter(x => x.id !== d.id) : [], seen = new Set(L.map(x => x.id));
    (Array.isArray(d.synthOf) ? d.synthOf : []).forEach(id => { const x = M.doc(id); if (x && !x.deleted && x.id !== d.id && !seen.has(id)) { seen.add(id); L.push(x); } }); return L; },
  /** What the experiment's other notes hold that this note does not reference yet: pulled in, a column per kind. */
  gather(d, quiet) {
    const mem = SYNTH.others(d); if (!mem.length) { if (!quiet) toast('Choose the notes it synthesizes first: ± Notes in the dock'); return 0; } const ids = new Set(mem.map(x => x.id));
    const mine = () => M.docBlocks(d.id).filter(b => b.status === 'live');
    const have = new Set(mine().filter(b => b.kind === 'ref').flatMap(b => [b.refItemId, b.refBlockId]).filter(Boolean));
    const lit = new Set(mem.filter(SYNTH.lit).map(x => x.id));   // V3.976: a lit review gives only what is flagged
    const items = DB.where('items', it => ids.has(it.originDocId) && !lit.has(it.originDocId) && !it.correctedBy && SYNTH.KINDS.includes(it.kind) && !have.has(it.id)).sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));
    const heads = new Map(mine().filter(b => b.synthHead).map(b => [b.synthHead, b])), H = [...heads.values()]; let n = 0;
    // the columns go right of what the note holds (its header and template boxes); a kind new since goes right of the last column
    const F0 = mine().filter(b => b.synthFrom), at = [...H, ...F0];
    let nextX = at.length ? Math.max(...at.map(b => b.x)) + SYNTH.COL : SYNTH.start(d); const y0 = at.length ? Math.min(...at.map(b => b.y)) : SYNTH.Y0;
    SYNTH.KINDS.forEach(k => { let head = heads.get(k); if (!head && !items.some(it => it.kind === k)) return;
      if (!head) { head = M.addBlock(d.id, null, { kind: 'component', x: nextX, y: y0, w: 392 }); head.body = { text: SYNTH.HEAD[k], marks: [] }; head.synthHead = k; DB.put('blocks', head); nextX += SYNTH.COL; }
      const below = mine().filter(b => b.id !== head.id && b.x != null && Math.abs(b.x - head.x) < SYNTH.COL / 2 && b.y > head.y);
      let y = Math.max(head.y + 96, ...below.map(b => b.y + 136));
      items.filter(it => it.kind === k).forEach(it => { M.pullInto(d.id, null, { itemId: it.id, x: head.x, y }); y += SYNTH.ROW; n++; }); });
    // each stage's "what this note adds up to", once
    const from = mine().filter(b => b.synthFrom), said = new Set(from.map(b => b.synthFrom)), x = from.length ? from[0].x : nextX; let fy = from.length ? Math.max(...from.map(b => b.y)) + 170 : y0;
    mem.forEach(m => { const t = m.synthesis && String(m.synthesis.text || '').trim(); if (!t || said.has(m.id) || lit.has(m.id)) return;
      const b = M.addBlock(d.id, null, { kind: 'component', x, y: fy, w: 392 }); fy += 170; b.body = { text: t, marks: [] }; b.label = (prof(m.type).stage || prof(m.type).label) + ' — what it added up to'; b.synthFrom = m.id; DB.put('blocks', b); n++; });
    if (n) changed(); if (!quiet) toast(n ? plural(n, 'thing') + ' gathered from ' + plural(mem.length, 'note') : 'Everything from ' + (d.chain ? 'the experiment' : 'its notes') + ' is here already', 3200); return n;
  },
  /** The rest: the other notes' live components this note does not reference, by note. */
  rest(d) { const have = new Set(M.docBlocks(d.id).filter(b => b.status === 'live' && b.kind === 'ref' && b.refBlockId && !b.refItemId).map(b => b.refBlockId));   // referenced whole (a structure's reference is not the component)
    return SYNTH.others(d).filter(x => !SYNTH.lit(x)).map(x => ({ doc: x, blocks: M.liveBlocks(x.id).filter(b => b.kind !== 'ref' && !have.has(b.id) && !(b.kind === 'component' && !((b.body || {}).text || '').trim())) })).filter(g => g.blocks.length); },
  /** The panel in the note: every other component of the experiment, each with Pull in. */
  panel(pane, d) {
    const host = pane.host; if (!host) return; const old = $(':scope > .synth-rest', host); if (old) { old.remove(); return; }
    const body = h('div.sr-b'), el = h('div.synth-rest.nopan', h('div.sr-h', h('span', '☰ The rest of ' + (d.chain ? 'the experiment' : 'its notes')), h('button.x', { type: 'button', title: 'Close', on: { click: () => el.remove() } }, '×')), body);
    ['pointerdown', 'mousedown', 'wheel', 'keydown', 'dblclick', 'contextmenu'].forEach(t => el.addEventListener(t, e => e.stopPropagation()));
    const fill = () => { const groups = SYNTH.rest(M.doc(d.id) || d); body.replaceChildren(groups.length ? groups.map(g => h('div', h('h4', (prof(g.doc.type).stage || prof(g.doc.type).label) + ' · ' + snippet(g.doc.title, 40)),
      g.blocks.map(b => { const K = typeof CKINDS !== 'undefined' && CKINDS.of(b); return h('div.sr-row', h('div.t', h('b', M.blockName(b) + (K ? ' · ' + K.label : '')), h('span', snippet((b.body || {}).text || (WIDGETS[b.kind] || {}).label || b.kind, 90))),
        h('button.btn.xs', { type: 'button', title: 'A reference to it here — the original stays where it is', on: { click: () => { const p = MOVE.spot(M.doc(d.id)); M.pullInto(d.id, null, { blockId: b.id, x: p.x, y: p.y }); changed(); fill(); toast('Pulled in: ' + snippet(M.blockName(b), 40)); } } }, 'Pull in')); }))) : h('div.tiny.muted', { style: { padding: '10px' } }, 'Every component of the experiment is referenced here.')); };
    fill(); host.append(el);
  },
  /* ---------- V3.976: the component that asks for the notes; Flag for synthesis ---------- */
  lit: x => !!x && x.type === 'literature',
  /** The Synthesis notes that synthesize note docId: an experiment's last stage, or ones that list it. */
  of(docId) { return DB.where('documents', x => x.type === 'reflection' && !x.deleted && x.id !== docId && SYNTH.others(x).some(o => o.id === docId)); },
  /** The "notes to synthesize" component: the notes it gathers from, + Add notes…, ⟲ Gather. */
  ofBody(b, d, pane, ro) {
    d = M.doc(b.docId) || d; const chain = d.chain ? CHAIN.members(d).filter(x => x.id !== d.id) : [], own = (d.synthOf || []).map(M.doc).filter(x => x && !x.deleted);
    const stop = e => e.stopPropagation(), row = (x, fixed) => h('div.sy-row', typechip(x.type), h('a.sy-t', { href: '#/doc/' + x.id, title: 'Open it', on: { pointerdown: stop } }, x.title || 'Untitled'),
      h('span.mono.tiny.muted', fmtDay(x.created)), SYNTH.lit(x) ? h('span.pill', { title: 'From a lit review only what you flag for synthesis comes in' }, 'flagged only') : null, h('span.spacer'),
      fixed ? h('span.tiny.muted', 'the experiment') : ro ? null : h('button.ib.sy-x', { type: 'button', title: 'Take it out of the list — what it gave stays', on: { pointerdown: stop, click: e => { stop(e); SYNTH.drop(d, x.id); } } }, '×'));
    const all = [...chain.map(x => row(x, true)), ...own.map(x => row(x, false))];
    return h('div.synth-of.nopan', h('div.sy-h', all.length ? 'Notes this synthesizes' : 'Which notes would you like to synthesize?'),
      all.length ? h('div.sy-list', all) : null,
      h('p.sy-ask', all.length ? 'In those notes, right-click a component, or words you select, and Flag for synthesis to bring just that. From a lit review only what you flag comes in.'
        : 'Add the notes: their claims, evidence, results, takeaways, barriers and resolutions are gathered here. In them, right-click a component or words you select → Flag for synthesis.'),
      ro ? null : h('div.sy-acts', h('button.btn.xs.pri', { type: 'button', on: { pointerdown: stop, click: e => { stop(e); SYNTH.addNotes(d); } } }, '+ Add notes…'),
        all.length ? h('button.btn.xs', { type: 'button', title: 'Pull in what the notes have gained', on: { pointerdown: stop, click: e => { stop(e); SYNTH.gather(M.doc(d.id)); } } }, '⟲ Gather') : null));
  },
  /** A Synthesis note gets its "notes to synthesize" component once (made with the note, or the first time it is opened). */
  ensureAsk(d) { d = d && M.doc(d.id); if (!d || !SYNTH.is(d) || d.synthAsked) return null; d.synthAsked = true; DB.put('documents', d);
    if (M.liveBlocks(d.id).some(b => b.kind === 'synthof')) return null;
    const x = M.liveBlocks(d.id).some(o => o.x != null && o.x < 996 && o.x + (o.w || 392) > 476 && (o.y || 0) < 280) ? SYNTH.start(d) : 476;   // V3.977: clear of a template's boxes
    const b = M.addBlock(d.id, null, { kind: 'synthof', label: 'Notes to synthesize', x, y: 0, w: 520 }); b.body = { text: 'Notes to synthesize', marks: [] }; DB.put('blocks', b); return b; },
  async addNotes(d) { const ids = ((M.doc(d.id) || d).synthOf || []).slice(), n0 = ids.length; await SYNTH.pick(ids, 'Notes to synthesize (Cancel when done)'); if (ids.length === n0) return;
    const cur = M.doc(d.id); cur.synthOf = ids; M.touchDoc(cur); changed(); SYNTH.gather(cur); },
  drop(d, id) { const cur = M.doc(d.id); if (!cur) return; cur.synthOf = (cur.synthOf || []).filter(x => x !== id); M.touchDoc(cur); changed(); toast('Taken out of the list — what it already gave stays in the note'); },
  /** Flag a component — or words in it (span { from, to }) — for Synthesis s: a pulled-in reference (a live excerpt for words), under "Flagged for synthesis". */
  flag(s, b, span) {
    s = M.doc(s.id); b = b && M.block(b.id); if (!s || !b) return null; const text = String((b.body && b.body.text) || '');
    let refSpan = null; if (span && span.to > span.from && !(span.from <= 0 && span.to >= text.length)) { const a = span.from, z = span.to; refSpan = { from: a, to: z, exact: text.slice(a, z), prefix: text.slice(Math.max(0, a - 40), a), suffix: text.slice(z, z + 40) }; }
    const mine = M.docBlocks(s.id).filter(x => x.status === 'live');
    if (mine.some(x => x.kind === 'ref' && x.refBlockId === b.id && !x.refItemId && (refSpan ? x.refSpan && x.refSpan.exact === refSpan.exact : !x.refSpan))) { toast('Already in “' + s.title + '”'); return null; }
    let head = mine.find(x => x.synthHead === 'flagged');
    if (!head) { head = M.addBlock(s.id, null, { kind: 'component', x: SYNTH.start(s), y: 0, w: 392 }); head.body = { text: 'Flagged for synthesis', marks: [] }; head.synthHead = 'flagged'; DB.put('blocks', head); }
    const below = M.docBlocks(s.id).filter(x => x.status === 'live' && x.id !== head.id && x.x != null && Math.abs(x.x - head.x) < SYNTH.COL / 2 && x.y > head.y);
    const nb = M.addBlock(s.id, null, Object.assign({ kind: 'ref', refItemId: null, refBlockId: b.id, x: head.x, y: Math.max(head.y + 96, ...below.map(x => x.y + 136)), w: 392, synthFlag: true }, refSpan ? { refSpan } : {}));
    IX.rebuild(); changed(); toast((refSpan ? 'The words are flagged' : 'Flagged') + ' for synthesis — pulled into “' + s.title + '”'); return nb;
  },
  /* ---------- V3.973: a Synthesis of the notes you choose ---------- */
  /** Notes added to ids, one at a time, until Cancel. */
  pick(ids, title) { const go = () => CMD.picker(title, '', q => CMD.KINDS.note.list(q, CMD.ctx(), { kind: 'note' }).filter(x => !ids.includes(x.v.id))).then(x => { if (x && x.id) { ids.push(x.id); return go(); } }); return go(); },
  /** A new Synthesis note of the notes you pick (the note on screen first, when there is one), gathered, opened. */
  async create(first) {
    const ids = first && M.doc(first) && M.doc(first).type !== 'reflection' ? [first] : [];
    await SYNTH.pick(ids, 'Notes to synthesize' + (ids.length ? ' — “' + snippet(M.doc(ids[0]).title, 30) + '” and…' : '') + ' (Cancel when done)'); if (!ids.length) return;
    const f = M.doc(ids[0]), tpl = M.enabledTemplates('reflection')[0];
    const d = M.createDoc({ type: 'reflection', projectId: f.projectId || null, themeId: f.themeId || null, title: 'Synthesis — ' + (ids.length === 1 ? f.title : snippet(f.title, 28) + ' and ' + plural(ids.length - 1, 'other note')), templateId: tpl ? tpl.id : null });
    d.synthOf = ids.slice(); DB.put('documents', d); SYNTH.ensureAsk(d); changed(); App.go('#/doc/' + d.id); setTimeout(() => SYNTH.gather(M.doc(d.id)), 400); return d;
  },
  /** ± Notes: the notes it synthesizes (click one to take it out), and + Add notes… */
  notes(pane, d, e) {
    d = M.doc(d.id) || d; const chain = d.chain ? CHAIN.members(d).filter(x => x.id !== d.id).map(x => x.id) : [], own = (d.synthOf || []).map(M.doc).filter(Boolean);
    const out = id => SYNTH.drop(d, id);
    ctxMenu(e.clientX, e.clientY - 8, [{ head: 'Notes it synthesizes' }, ...(chain.length ? [{ label: 'The experiment’s ' + plural(chain.length, 'note'), sub: 'Planning, Run and Analysis — always', run: () => { } }] : []),
      ...own.map(x => ({ label: x.title || 'Untitled', sub: M.docPath(x) + ' · click: take it out', run: () => out(x.id) })), own.length || chain.length ? 'sep' : null,
      { label: '+ Add notes…', sub: 'Their claims, evidence, results, takeaways, barriers and resolutions come in', run: () => SYNTH.addNotes(d) }].filter(Boolean));
  },
};
WIDGETS.synthof = { label: 'notes to synthesize', w: 520, body: SYNTH.ofBody, menu: b => [{ label: '+ Add notes…', run: () => SYNTH.addNotes(M.doc(b.docId)) }, { label: '⟲ Gather', run: () => SYNTH.gather(M.doc(b.docId)) }] };
{
  // V3.976: a component, the words selected in it, or a marked passage → Flag for synthesis (each Synthesis that synthesizes this note).
  // What a right-click began on is kept: the press can collapse the selection, or redraw the text, before the menu opens.
  let press = null;
  document.addEventListener('pointerdown', e => { press = null; if (e.button !== 2 || !e.target || !e.target.closest) return; const ed = e.target.closest('.box[data-id] .ed'); if (!ed) return;
    const s = ED.selection(ed), mk = e.target.closest('span.st[data-m]') || e.target.closest('[data-m]');
    press = { box: ed.closest('.box[data-id]').dataset.id, at: Date.now(), span: s && !s.collapsed && s.to > s.from ? { from: s.from, to: s.to } : null, mark: mk ? mk.dataset.m : null }; }, true);
  const mn = DocView.menu; DocView.menu = function (e, p) {
    if (this.travel || !e || !e.target || !e.target.closest) return mn.apply(this, arguments);
    const box = e.target.closest('.box[data-id]'), b = box && M.block(box.dataset.id), S = b && b.kind !== 'ref' && b.kind !== 'synthof' && !b.synthHead ? SYNTH.of(b.docId) : [];
    if (!S.length) return mn.apply(this, arguments);
    const ed = e.target.closest('.ed'), sel = ed && box.contains(ed) ? ED.selection(ed) : null, P0 = press && press.box === b.id && Date.now() - press.at < 3000 ? press : null;
    let span = sel && !sel.collapsed && sel.to > sel.from ? { from: sel.from, to: sel.to } : P0 && P0.span;
    if (!span) { const mk = e.target.closest('span.st[data-m]') || e.target.closest('[data-m]'), id = (mk && mk.dataset.m) || (P0 && P0.mark), m = id && ((b.body && b.body.marks) || []).find(x => x.id === id); if (m && m.to > m.from) span = { from: m.from, to: m.to }; }
    const to = s => S.length > 1 ? ' → ' + snippet(s.title, 28) : '';
    const rows = [{ head: 'Synthesis' }, ...S.flatMap(s => [span ? { label: 'Flag these words for synthesis' + to(s), sub: 'Into “' + snippet(s.title, 40) + '”, a live excerpt of them', run: () => SYNTH.flag(s, b, span) } : null,
      { label: (span ? 'Flag the whole component for synthesis' : 'Flag for synthesis') + to(s), sub: 'Into “' + snippet(s.title, 40) + '”, pulled in', run: () => SYNTH.flag(s, b, null) }].filter(Boolean))];
    const orig = ctxMenu; ctxMenu = (x, y, list) => orig(x, y, [...list, 'sep', ...rows]);
    try { return mn.apply(this, arguments); } finally { ctxMenu = orig; } };
  // a Synthesis note made otherwise (/new, a changed type, from before): its "notes to synthesize" component the first time it is drawn —
  // V3.977: drawn, not opened (a note whose type becomes Synthesis is redrawn, not opened again: it waited until the next visit)
  const fl = DocView.fill; DocView.fill = function (d) { const r = fl.apply(this, arguments);
    if (d && !this.travel && SYNTH.is(d) && !d.synthAsked) setTimeout(() => { if (SYNTH.ensureAsk(d)) changed(); }, 0); return r; };
  // V3.973: /synthesis — a Synthesis of the notes you choose
  CMD.add({ slash: 'synthesis', label: 'A synthesis of notes…', args: [], alias: ['synthesize'], group: 'Note', sub: 'Pick the notes; their claims, evidence, results, takeaways, barriers and resolutions are gathered into a new Synthesis note',
    run: (A_, ctx) => { SYNTH.create(ctx && ctx.doc && ctx.doc.id); return 'Pick the notes to synthesize'; } });
  // the note's ⋯ menu (the lab's pills hide the dock): a Synthesis's tools; any other note: a synthesis of it and others
  const dm = DocView.docMenu; DocView.docMenu = function (d, e) { if (this.travel) return dm.apply(this, arguments); const orig = ctxMenu, pane = this;
    const rows = SYNTH.is(d) ? [{ head: 'Synthesis' }, { label: '± Notes it synthesizes… (' + SYNTH.others(d).length + ')', sub: 'Add notes, or take one out', run: () => SYNTH.notes(pane, d, e) },
        { label: '⟲ Gather', sub: 'What its notes have gained: claims, evidence, results, takeaways, barriers, resolutions', run: () => SYNTH.gather(M.doc(d.id) || d) },
        { label: '☰ The rest', sub: 'Every other component of its notes, to pull in', run: () => SYNTH.panel(pane, d) }, 'sep']
      : [{ label: 'A synthesis of this note and others…', sub: 'A new Synthesis note: pick the notes; what is marked in them is gathered', run: () => SYNTH.create(d.id) }];
    ctxMenu = (x, y, list) => orig(x, y, [list[0], ...rows, ...list.slice(1)]);
    try { return dm.apply(this, arguments); } finally { ctxMenu = orig; } };
  // the Synthesis note, when it is made from the Analysis, gathers the experiment
  const adv = CHAIN.advance; CHAIN.advance = function (d, e) { const before = CHAIN.nextOf(d); const r = adv.apply(this, arguments); const n = CHAIN.nextOf(d); if (n && !before && SYNTH.is(n)) setTimeout(() => { const a = SYNTH.ensureAsk(n), g = SYNTH.gather(M.doc(n.id), true); if (a && !g) changed(); }, 0); return r; };
  // the dock of a Synthesis note: ⟲ Gather, ☰ The rest
  const rd = DocView.renderDock; DocView.renderDock = function (d) { const r = rd.apply(this, arguments); if (!SYNTH.is(d) || this.travel || !this.dock) return r;
    const n = SYNTH.others(d).length;
    this.dock.append(h('span.dk-sep'), h('button.dk', { title: 'The notes it synthesizes: add or take out', on: { click: e => SYNTH.notes(this, d, e) } }, '± Notes' + (n ? ' (' + n + ')' : '')),
      h('button.dk', { title: 'Pull in what its notes have gained: claims, evidence, results, takeaways, barriers, resolutions, and what each note added up to', on: { click: () => SYNTH.gather(d) } }, '⟲ Gather'),
      h('button.dk', { title: 'Every other component of its notes, to pull in', on: { click: () => SYNTH.panel(this, d) } }, '☰ The rest')); return r; };
}
