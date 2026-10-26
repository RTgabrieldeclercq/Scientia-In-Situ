/* ==========================================================================
   13zb · Moving components to another note, as if they had always been
   there. From a component's ⋯ / right-click menu ("Move to another note…",
   where you can tick more components to take along), from a region's menu
   (the whole region, re-made in the new note), or by dragging a component
   (or a region by its name tab) from one split pane into another — a component
   with Alt held (a plain drag embeds it there instead, 13zp).
   Along with it go its earlier versions, its sub-steps, its structures
   (they now originate in the new note), its marks, terms and time. Nothing
   is left behind in the old note. Connections to components that stay are
   listed first: keep each as a cross-note connection, or drop it.
   Protocol definitions, runs and timers stay where they are.
   ========================================================================== */
const MOVE = {
  can: b => b && b.status === 'live' && !['protocol', 'run', 'timer'].includes(b.kind),
  /** Everything that travels with these: earlier versions and sub-steps. */
  expand(ids) {
    const set = new Set(ids), q = [...ids];
    while (q.length) { const b = M.block(q.pop()); if (!b) continue;
      [...(b.supersedes || []), ...DB.where('blocks', x => x.parent === b.id && x.docId === b.docId).map(x => x.id)].forEach(id => { if (!set.has(id) && M.block(id)) { set.add(id); q.push(id); } }); }
    return [...set];
  },
  /** Connections between what moves and what stays in the same note. */
  crossing(ids) { const set = new Set(ids), doc = id => (M.block(id) || {}).docId;
    return DB.where('wires', w => (set.has(w.from) !== set.has(w.to)) && doc(w.from) === doc(w.to)); },
  /** Pick the note, then go. */
  dialog(b, preset) {
    const src = M.doc(b.docId), others = M.docBlocks(src.id).filter(x => x.id !== b.id && MOVE.can(x) && x.status === 'live');
    const take = new Set(preset || [b.id]); take.add(b.id);
    const extra = others.length ? h('details.mv-more', h('summary', 'Take other components along'), h('div.list.mv-list', others.map(x => h('label.li.click', h('input', { type: 'checkbox', checked: take.has(x.id), on: { change: e => e.target.checked ? take.add(x.id) : take.delete(x.id) } }), h('span.t', h('b', M.blockName(x)), ' ', h('span.serif.muted', snippet(x.body.text, 60))))))) : null;
    if (preset && preset.length > 1 && extra) extra.open = true;
    const m = modal({ title: 'Move to another note', wide: true, actions: [{ label: 'Cancel' }], body: h('div',
      h('p.serif', { style: { marginTop: 0 } }, `“${snippet(M.blockName(b), 50)}”${take.size > 1 ? ' and the ticked components' : ''} will belong to the note you pick — structures, terms, marks and time go with it, and nothing stays here.`), extra,
      optionPicker({ placeholder: 'Search notes…', sort: 'move', items: q => DB.where('documents', d => d.id !== src.id && !d.deleted && (!q || (d.title + ' ' + M.docPath(d)).toLowerCase().includes(q))),
        render: d => h('div', typechip(d.type), ' ', d.title, h('span.s', M.docPath(d))), onPick: d => { m.close(); MOVE.ask([...take], d.id, null); } })) });
  },
  /** Ask about connections that would cross, then move. */
  ask(ids, destId, pos, regionsToo) {
    const all = MOVE.expand(ids), cross = MOVE.crossing(all);
    if (!cross.length) return MOVE.run(all, destId, pos, [], regionsToo);
    const keep = new Set(cross.map(w => w.id)), set = new Set(all);
    modal({ title: 'Connections to components that stay', wide: true, body: h('div',
      h('p.serif', { style: { marginTop: 0 } }, `These connect what moves to components staying in “${(M.doc(M.block(cross[0].from).docId) || {}).title}”. Ticked ones are kept as connections between the two notes.`),
      h('div.list', cross.map(w => { const a = M.block(w.from), z = M.block(w.to), R = REL[w.rel] || REL.related;
        return h('label.li.click', h('input', { type: 'checkbox', checked: true, on: { change: e => e.target.checked ? keep.add(w.id) : keep.delete(w.id) } }),
          h('span.t', h('b', snippet(M.blockName(a), 30)), ' ', h('span.muted', R.verb), ' ', h('b', snippet(M.blockName(z), 30)), h('span.s', set.has(w.from) ? 'moves → stays' : 'stays → moves'))); }))),
      actions: [{ label: 'Cancel' }, { label: 'Drop them all', run: () => MOVE.run(all, destId, pos, [], regionsToo) }, { label: 'Move', pri: true, run: () => MOVE.run(all, destId, pos, [...keep], regionsToo) }] });
  },
  /** Where moved boxes land in a note that isn't being dropped on: to the right of what's there. */
  spot(d) { const bs = M.docBlocks(d.id).filter(b => b.status === 'live' && b.x != null); if (!bs.length) return { x: 0, y: 168 };
    return { x: Math.round((Math.max(...bs.map(b => b.x + (b.w || 392))) + 70) / 14) * 14, y: Math.round(Math.min(...bs.map(b => b.y || 0)) / 14) * 14 }; },
  run(ids, destId, pos, keepWires, regionsToo) {
    const dest = M.doc(destId); if (!dest) return; const set = new Set(ids), blocks = ids.map(M.block).filter(Boolean); if (!blocks.length) return;
    const srcIds = [...new Set(blocks.map(b => b.docId))], srcs = srcIds.map(M.doc).filter(Boolean);
    // connections that would cross: keep the ticked ones (they become cross-note), drop the rest
    MOVE.crossing(ids).forEach(w => { if (!keepWires.includes(w.id)) DB.del('wires', w.id); });
    // regions: whole regions travel (re-made in the new note); otherwise the moved ones just leave theirs
    const carried = [];
    srcs.forEach(d => { REGION.list(d).forEach(r => { const live = r.members.filter(id => (M.block(id) || {}).status === 'live'); if (live.length && live.every(id => set.has(id)) && (regionsToo == null || regionsToo.includes(r.id))) carried.push(Object.assign({}, r, { id: uid('rg'), members: r.members.filter(id => set.has(id)) })); });
      d.regions = REGION.list(d).map(r => Object.assign({}, r, { members: r.members.filter(id => !set.has(id)) })).filter(r => r.members.length); REGION.save(d); });
    if (carried.length) { dest.regions = [...REGION.list(dest).map(r => Object.assign({}, r, { members: r.members.filter(id => !set.has(id)) })).filter(r => r.members.length), ...carried]; }
    // the boxes keep their arrangement, placed at the drop point (or beside the note's content)
    const live = blocks.filter(b => b.x != null), x0 = live.length ? Math.min(...live.map(b => b.x)) : 0, y0 = live.length ? Math.min(...live.map(b => b.y || 0)) : 0, at = pos || MOVE.spot(dest);
    blocks.forEach(b => {
      srcs.forEach(d => { if (d.blockIds.includes(b.id)) d.blockIds = d.blockIds.filter(x => x !== b.id); });
      if (!dest.blockIds.includes(b.id)) dest.blockIds.push(b.id);
      b.docId = dest.id; if (b.parent && !set.has(b.parent)) b.parent = null;
      if (b.x != null) { b.x = Math.round((at.x + b.x - x0) / 14) * 14; b.y = Math.round((at.y + (b.y || 0) - y0) / 14) * 14; }
      const s = b.stamp && b.stamp.sessionId && M.session(b.stamp.sessionId); if (s && s.docId !== dest.id) { b.stamp.sessionId = null; b.stamp.offsetMs = null; }
      b.movedFrom = [...(b.movedFrom || []), { docId: srcs[0] && srcs[0].id, at: isoLocal(new Date()) }];
      DB.put('blocks', b);
    });
    DB.where('items', it => set.has(it.originBlockId)).forEach(it => { it.originDocId = dest.id; if (dest.projectId) it.projectId = dest.projectId; DB.put('items', it); });
    srcs.forEach(d => { DB.put('documents', d); M.touchDoc(d); }); DB.put('documents', dest); REGION.save(dest);
    IX.rebuild(); changed();
    const n = blocks.filter(b => b.status === 'live').length;
    toast(`${plural(n, 'component')} moved to “${snippet(dest.title, 40)}”`, 3500);
  },
  /** Move a whole region by its menu. */
  region(d, r) { const ids = r.members.filter(id => MOVE.can(M.block(id))); if (!ids.length) return toast('Nothing in this region can move');
    const first = M.block(ids[0]); MOVE.dialog(first, ids); },
  /** The pane under a screen point, other than `not`. */
  paneAt(x, y, not) { const els = document.elementsFromPoint(x, y); for (const el of els) { const host = el.closest && el.closest('.canvas-host'); if (host && host._dv && host._dv !== not) return host._dv; if (host) return null; } return null; },
};
{
  // menus: components and regions
  const bm = DocView.boxMenu; DocView.boxMenu = function (b, e) {
    if (!MOVE.can(b) || this.travel) return bm.call(this, b, e);
    const orig = ctxMenu; ctxMenu = (x, y, rows) => orig(x, y, [rows[0], { label: 'Move to another note…', sub: 'It will belong there; nothing stays here', run: () => MOVE.dialog(b) }, ...rows.slice(1)]);
    try { return bm.call(this, b, e); } finally { ctxMenu = orig; }
  };
  const rm = REGION.menu; REGION.menu = function (pane, d, r, e) {
    const orig = ctxMenu; ctxMenu = (x, y, rows) => orig(x, y, [rows[0], { label: 'Move region to another note…', sub: 'The region and its components', run: () => MOVE.region(d, r) }, ...rows.slice(1)]);
    try { return rm.call(this, pane, d, r, e); } finally { ctxMenu = orig; }
  };
  // dragging a box (or a region's tab) from one split pane into another
  const watch = (src, ids, e, regionId) => {
    let target = null;
    const mv = ev => { const t = MOVE.paneAt(ev.clientX, ev.clientY, src); if (t !== target) { if (target && target.host) target.host.classList.remove('mv-drop'); target = t && t.docId !== src.docId ? t : null; if (target && target.host) target.host.classList.add('mv-drop'); } };
    const up = ev => { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); const t = target; if (t && t.host) t.host.classList.remove('mv-drop'); if (!t) return;
      if (!regionId && !ev.altKey) return; // a plain (or pen) drag embeds it there instead (13zp); Alt moves it
      const p = t.paper.toWorld(ev.clientX, ev.clientY), live = ids.filter(id => MOVE.can(M.block(id))); if (!live.length) return;
      setTimeout(() => MOVE.ask(live, t.docId, { x: p.x - 40, y: p.y - 20 }, regionId ? [regionId] : undefined), 0); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  };
  const ptr = DocView.pointer; DocView.pointer = function (e) {
    if (e.button === 0 && !this.travel && !(this.paper && this.paper.space)) { const box = e.target.closest('.box');
      if (box && box.dataset.id[0] !== '_' && !e.target.closest('.port,.rz,.ed,input,textarea,select,button,a,label,.chips,.ghosts,.refs,.tags,.ptext.edit,.obsn,.itdot,.wplate,.wlegend,.fg-cell') && MOVE.can(M.block(box.dataset.id)) && App.panes().length > 1) watch(this, [box.dataset.id], e); }
    return ptr.call(this, e);
  };
  const rd = REGION.drag; REGION.drag = function (pane, d, r, e) { if (App.panes().length > 1) watch(pane, r.members.slice(), e, r.id); return rd.call(this, pane, d, r, e); };
}
