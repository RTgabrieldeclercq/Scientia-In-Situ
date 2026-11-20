/* ==========================================================================
   13zpb · Connections to the steps of a protocol (V4.68).
   Gabe, 20 Nov: "Have external component connect to specific protocol steps.
   Direct links from protocol steps can be modified, not permanent to what you
   set them to."
   - A step of a protocol (in its own note, and in a run of it) has a link
     circle of its own on the box's left edge, like an image in a panel: drag
     it to another component and the wire starts at that step. Dragging from
     any component and dropping on a step connects that step; a drop on the
     rest of the box still connects the box. The step's ⋯ menu does the same
     from a list ("Connect this step to a component…").
   - The wire's end is the step: wire.fromCell / wire.toCell = 'st:<step id>'
     (the field an image of an image panel uses, 12b). Steps have always had
     a stable id (`uid('st')`), and a reworded step of a registered protocol
     keeps its wire: the wire follows `supersededBy` to the step that replaced
     it, so it lands on the new wording. A step that is gone (removed, the box
     folded) leaves the wire on the box.
   - A connection is not fixed once made. Its menu (click its label) gains:
     Reconnect either end to another component; for the end on a step, Move it
     to another step of that protocol, or Connect it to the whole protocol; for
     an end on a protocol box, Connect it to one step. (Relation, direction and
     Remove were there already.) A step's ⋯ menu lists the connections on that
     step, each opening this menu.
   STEPLINK: is · tok · on · resolve · row · rect · dropToken · partTitle ·
   menuItems · stepMenuItems · pickTarget · reconnect · pickStep · redraw.
   Settings → Canvas & notes → Links to protocol steps (stepwires, 20a).
   ========================================================================== */
const STEPLINK = {
  PRE: 'st:',
  is: c => typeof c === 'string' && c.startsWith(STEPLINK.PRE),
  tok: sid => STEPLINK.PRE + sid,
  sid: c => c.slice(STEPLINK.PRE.length),
  on: () => FEAT.on('stepwires'),
  /** The step a wire was made on, followed to the wording that replaced it (a protocol shows only its live steps). */
  resolve(block, sid) {
    const def = PROTO.defOf(block); if (!def) return sid; const seq = new Set(PROTO.seq(block)); let s = sid;
    for (let i = 0; i < 12 && !seq.has(s); i++) { const st = PROTO.step(def, s), nx = st && (st.supersededBy || [])[0]; if (!nx) break; s = nx; }
    return s;
  },
  row(boxEl, block, sid) { return $(`.pstep[data-step="${STEPLINK.resolve(block, sid)}"]`, boxEl); },
  /** The wire's end for a step: the box's width, the step row's height, leaving only by the box's left or right edge. */
  rect(pane, id, cell) {
    const R = pane.rectOf(id); if (!R) return R; const b = M.block(id), box = $(`.box[data-id="${id}"]`, pane.paper.world); if (!b || !box || !PROTO.is(b)) return R;
    const row = STEPLINK.row(box, b, STEPLINK.sid(cell)); if (!row || !row.offsetHeight) return R;
    const z = pane.paper.view.z || 1, wr = pane.paper.world.getBoundingClientRect(), r = row.getBoundingClientRect();
    return { x: R.x, w: R.w, y: (r.top - wr.top) / z, h: r.height / z, only: ['l', 'r'] };
  },
  /** A drop on a step row of a protocol box: its wire part (null when the feature is off or it is not a protocol). */
  dropToken(over) {
    if (!STEPLINK.on() || !over || !over.step || !over.box) return null; const b = M.block(over.box.dataset.id); if (!b || !PROTO.is(b)) return null;
    return STEPLINK.tok(over.step.dataset.step);
  },
  /** " (step 3)" / " (one image)" for a wire's tooltip. */
  partTitle(id, cell) {
    if (!cell) return ''; if (!STEPLINK.is(cell)) return ' (one image)';
    const b = M.block(id), n = b ? PROTO.numIn(b, STEPLINK.resolve(b, STEPLINK.sid(cell))) : 0; return n ? ' (step ' + n + ')' : ' (a step)';
  },
  stepText(block, sid) { const def = PROTO.defOf(block), s = def && PROTO.stepOf(block, def, STEPLINK.resolve(block, sid)); return s ? s.text : ''; },
  /** The wires on one step of a box. */
  wiresOf(boxId, sid) { const b = M.block(boxId), want = b ? STEPLINK.resolve(b, sid) : sid, at = (id, c) => id === boxId && STEPLINK.is(c) && b && STEPLINK.resolve(b, STEPLINK.sid(c)) === want;
    return DB.all('wires').filter(w => at(w.from, w.fromCell) || at(w.to, w.toCell)); },

  /* ---------------- choosing ---------------- */
  /** The components of a note a wire could end on (not the ids in `skip`). */
  components(docId, skip = []) { return M.liveBlocks(docId).filter(b => !skip.includes(b.id) && (b.kind === 'component' || b.kind === 'ink' || b.kind === 'ref' || WIDGETS[b.kind] || PROTO.is(b))); },
  /** From a step: pick a component of the note, then say how they are connected. */
  pickTarget(host, sid, at) {
    const part = { box: host.id, cell: STEPLINK.tok(sid) }, n = PROTO.numIn(host, STEPLINK.resolve(host, sid));
    const m = modal({ title: 'Connect step ' + (n || '') + ' to…', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search the components of this note…',
      items: q => STEPLINK.components(host.docId, [host.id]).filter(b => !q || (M.blockName(b) + ' ' + (b.body ? b.body.text : '')).toLowerCase().includes(q)),
      render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body ? b.body.text : '', 80))),
      onPick: b => { m.close(); setTimeout(() => LINKS.connect(DocView, host.id, b.id, (at && at.x) || innerWidth / 2 - 150, (at && at.y) || 160, part), 30); } }) });   // after the picker's mousedown has passed: a popover opened inside it would be closed by it
  },
  /** Take one end of a connection to another component of the note (the end's own part is dropped). */
  reconnect(x, end) {
    const e = M.end(x[end === 'from' ? 'to' : 'from']), here = M.end(x[end]); if (!e || !here) return;
    const m = modal({ title: 'Connect “' + snippet(M.endName(x[end === 'from' ? 'to' : 'from']), 30) + '” to…', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search the components of this note…',
      items: q => STEPLINK.components(here.docId, [x.from, x.to]).filter(b => !q || (M.blockName(b) + ' ' + (b.body ? b.body.text : '')).toLowerCase().includes(q)),
      render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body ? b.body.text : '', 80))),
      onPick: b => { m.close(); delete x[end === 'from' ? 'fromCell' : 'toCell']; if (end === 'to') delete x.toItem; M.setWire(x, { [end]: b.id }); toast('Connection moved to “' + snippet(M.blockName(b), 30) + '”'); } }) });
  },
  /** Move the end on a protocol box to one of its steps (or, with `sid` null, back to the whole box). */
  pickStep(x, end) {
    const id = x[end], b = M.block(id), def = b && PROTO.defOf(b); if (!def) return; const key = end === 'from' ? 'fromCell' : 'toCell', cur = x[key] && STEPLINK.is(x[key]) ? STEPLINK.resolve(b, STEPLINK.sid(x[key])) : null;
    const rows = PROTO.seq(b).filter(s => s !== cur && !(b.skipped || []).includes(s)).map(s => ({ id: s, n: PROTO.numIn(b, s), text: STEPLINK.stepText(b, s) }));
    if (!rows.length) return toast('No other steps');
    const m = modal({ title: 'Connect it to which step of “' + snippet(M.blockName(b), 30) + '”?', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search its steps…', sort: 'steps',
      items: q => rows.filter(r => !q || r.text.toLowerCase().includes(q)),
      render: r => h('div', h('b', r.n + '.'), ' ', h('span.serif', snippet(r.text, 90) || 'empty step')),
      onPick: r => { m.close(); M.setWire(x, { [key]: STEPLINK.tok(r.id) }); toast('Connected to step ' + r.n); } }) });
  },
  /** What the wire menu (12-doc wireMenu) adds: reconnect either end; move / widen an end on a protocol. */
  menuItems(x, pane) {
    const out = [];
    for (const end of ['from', 'to']) {
      const e = M.end(x[end]); if (!e || !e.block) continue; const key = end === 'from' ? 'fromCell' : 'toCell', part = x[key], b = e.block, nm = snippet(M.endName(x[end]), 22);
      const isStep = STEPLINK.is(part) && PROTO.is(b);
      out.push({ label: 'Reconnect the “' + nm + '”' + (isStep ? ' (step ' + (PROTO.numIn(b, STEPLINK.resolve(b, STEPLINK.sid(part))) || '') + ')' : '') + ' end to another component…', reconnect: true, run: () => STEPLINK.reconnect(x, end) });
      if (isStep) {
        out.push({ label: 'Move it to another step of “' + nm + '”…', reconnect: true, run: () => STEPLINK.pickStep(x, end) });
        out.push({ label: 'Connect it to the whole protocol instead', reconnect: true, run: () => { M.setWire(x, { [key]: null }); toast('Connected to the whole protocol'); } });
      } else if (PROTO.is(b) && !part && STEPLINK.on()) out.push({ label: 'Connect it to one step of “' + nm + '”…', reconnect: true, run: () => STEPLINK.pickStep(x, end) });
    }
    if (out.length) out.push('sep');
    return out;
  },
  /** The step's ⋯ menu: connect it, and each connection it already has (opens that connection's menu). */
  stepMenuItems(host, sid, e) {
    if (!STEPLINK.on()) return []; const pane = DV(e.target), at = { x: e.clientX, y: e.clientY + 12 };
    const mine = STEPLINK.wiresOf(host.id, sid).map(w => { const other = w.from === host.id ? w.to : w.from, R = REL[w.rel] || REL.related;
      return { label: R.label + ' · “' + snippet(M.endName(other), 28) + '”…', sub: 'Change, reconnect or remove this link', run: () => pane && pane.wireMenu(w, { clientX: at.x, clientY: at.y }) }; });
    return [{ label: 'Connect this step to a component…', sub: 'A wire from this step; change or remove it any time', run: () => STEPLINK.pickTarget(host, sid, at) }, ...mine];
  },
  /** A step's text changed size while typing: its wires follow it. */
  redraw(el) { const dv = DV(el), box = el.closest('.box'); if (!dv || !dv.drawWires || !box) return;
    if (DB.all('wires').some(w => (w.from === box.dataset.id && STEPLINK.is(w.fromCell)) || (w.to === box.dataset.id && STEPLINK.is(w.toCell)))) requestAnimationFrame(() => { try { dv.drawWires(); } catch (err) { } }); },
};

/* the rectangle of a wire's end on a step: the row (images stay as they were, 12b) */
{
  const pr = DocView.partRect;
  DocView.partRect = function (id, cell) { return STEPLINK.is(cell) ? STEPLINK.rect(this, id, cell) : pr.apply(this, arguments); };
}
