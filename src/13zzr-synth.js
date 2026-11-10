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
   ========================================================================== */
const SYNTH = {
  KINDS: ['claim', 'evidence', 'result', 'takeaway', 'barrier', 'resolution'],
  HEAD: { claim: 'Claims', evidence: 'Evidence', result: 'Results', takeaway: 'Takeaways', barrier: 'Barriers', resolution: 'Resolutions' },
  COL: 440, ROW: 150, Y0: 0,
  is: d => !!d && d.type === 'reflection' && !!d.chain,
  /** Where the first column goes: right of the note's header and of every box it holds. */
  start(d) { const bs = M.docBlocks(d.id).filter(b => b.status === 'live' && b.x != null); return Math.ceil(Math.max(476, ...bs.map(b => b.x + (b.w || 392) + 84)) / 14) * 14; },
  others: d => CHAIN.members(d).filter(x => x.id !== d.id),
  /** What the experiment's other notes hold that this note does not reference yet: pulled in, a column per kind. */
  gather(d, quiet) {
    const mem = SYNTH.others(d); if (!mem.length) { if (!quiet) toast('This note is not the end of an experiment yet'); return 0; } const ids = new Set(mem.map(x => x.id));
    const mine = () => M.docBlocks(d.id).filter(b => b.status === 'live');
    const have = new Set(mine().filter(b => b.kind === 'ref').flatMap(b => [b.refItemId, b.refBlockId]).filter(Boolean));
    const items = DB.where('items', it => ids.has(it.originDocId) && !it.correctedBy && SYNTH.KINDS.includes(it.kind) && !have.has(it.id)).sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));
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
    mem.forEach(m => { const t = m.synthesis && String(m.synthesis.text || '').trim(); if (!t || said.has(m.id)) return;
      const b = M.addBlock(d.id, null, { kind: 'component', x, y: fy, w: 392 }); fy += 170; b.body = { text: t, marks: [] }; b.label = (prof(m.type).stage || prof(m.type).label) + ' — what it added up to'; b.synthFrom = m.id; DB.put('blocks', b); n++; });
    if (n) changed(); if (!quiet) toast(n ? plural(n, 'thing') + ' gathered from ' + plural(mem.length, 'note') : 'Everything from the experiment is here already', 3200); return n;
  },
  /** The rest: the other notes' live components this note does not reference, by note. */
  rest(d) { const have = new Set(M.docBlocks(d.id).filter(b => b.status === 'live' && b.kind === 'ref' && b.refBlockId && !b.refItemId).map(b => b.refBlockId));   // referenced whole (a structure's reference is not the component)
    return SYNTH.others(d).map(x => ({ doc: x, blocks: M.liveBlocks(x.id).filter(b => b.kind !== 'ref' && !have.has(b.id) && !(b.kind === 'component' && !((b.body || {}).text || '').trim())) })).filter(g => g.blocks.length); },
  /** The panel in the note: every other component of the experiment, each with Pull in. */
  panel(pane, d) {
    const host = pane.host; if (!host) return; const old = $(':scope > .synth-rest', host); if (old) { old.remove(); return; }
    const body = h('div.sr-b'), el = h('div.synth-rest.nopan', h('div.sr-h', h('span', '☰ The rest of the experiment'), h('button.x', { type: 'button', title: 'Close', on: { click: () => el.remove() } }, '×')), body);
    ['pointerdown', 'mousedown', 'wheel', 'keydown', 'dblclick', 'contextmenu'].forEach(t => el.addEventListener(t, e => e.stopPropagation()));
    const fill = () => { const groups = SYNTH.rest(M.doc(d.id) || d); body.replaceChildren(groups.length ? groups.map(g => h('div', h('h4', (prof(g.doc.type).stage || prof(g.doc.type).label) + ' · ' + snippet(g.doc.title, 40)),
      g.blocks.map(b => { const K = typeof CKINDS !== 'undefined' && CKINDS.of(b); return h('div.sr-row', h('div.t', h('b', M.blockName(b) + (K ? ' · ' + K.label : '')), h('span', snippet((b.body || {}).text || (WIDGETS[b.kind] || {}).label || b.kind, 90))),
        h('button.btn.xs', { type: 'button', title: 'A reference to it here — the original stays where it is', on: { click: () => { const p = MOVE.spot(M.doc(d.id)); M.pullInto(d.id, null, { blockId: b.id, x: p.x, y: p.y }); changed(); fill(); toast('Pulled in: ' + snippet(M.blockName(b), 40)); } } }, 'Pull in')); }))) : h('div.tiny.muted', { style: { padding: '10px' } }, 'Every component of the experiment is referenced here.')); };
    fill(); host.append(el);
  },
};
{
  // the Synthesis note, when it is made from the Analysis, gathers the experiment
  const adv = CHAIN.advance; CHAIN.advance = function (d, e) { const before = CHAIN.nextOf(d); const r = adv.apply(this, arguments); const n = CHAIN.nextOf(d); if (n && !before && SYNTH.is(n)) setTimeout(() => SYNTH.gather(n, true), 0); return r; };
  // the dock of a Synthesis note: ⟲ Gather, ☰ The rest
  const rd = DocView.renderDock; DocView.renderDock = function (d) { const r = rd.apply(this, arguments); if (!SYNTH.is(d) || this.travel || !this.dock) return r;
    this.dock.append(h('span.dk-sep'), h('button.dk', { title: 'Pull in what the experiment’s notes have gained: claims, evidence, results, takeaways, barriers, resolutions, and what each note added up to', on: { click: () => SYNTH.gather(d) } }, '⟲ Gather'),
      h('button.dk', { title: 'Every other component of the experiment, to pull in', on: { click: () => SYNTH.panel(this, d) } }, '☰ The rest')); return r; };
}
