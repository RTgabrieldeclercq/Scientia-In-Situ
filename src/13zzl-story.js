/* ==========================================================================
   13zzl · Story (V3.955): a kind of component for telling. Each beat has
   a complexity (1–10, a row of ten in its footer) and a + Whiteboard: a
   1×1 image panel with the board already in it, placed right beneath and
   wired (the panel illustrates the beat). The ● dragged from a story onto
   empty paper makes the next beat at once — a story component wired with
   the bare arrow (no relation name). Beside the first beat (a story no
   story leads into) sits the arc: complexity by beat, each beat at its
   number of links from the first, so you see how much you ask of the
   audience as the story goes — where it climbs, where it rests.
   ========================================================================== */
const STORY = {
  W: 236, H: 150, GAP: 24,
  is: b => !!b && b.kind === 'component' && b.ckind === 'story',
  cx: b => clamp(Math.round(+(b && b.complexity) || 5), 1, 10),
  set(b, n) { const cur = M.block(b.id); if (!cur) return; cur.complexity = clamp(Math.round(n), 1, 10); cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); },
  nextWires: () => DB.where('wires', w => w.rel === 'next'),
  /** A story no story leads into: the first beat. */
  isRoot(b) { return STORY.is(b) && !STORY.nextWires().some(w => w.to === b.id && STORY.is(M.block(w.from))); },
  roots: docId => M.liveBlocks(docId).filter(STORY.isRoot),
  /** What follows a beat over → wires: every component reached, its distance from the first beat, and the links walked. */
  chain(root) { const W = STORY.nextWires(), depth = new Map([[root.id, 0]]), q = [root.id], edges = []; while (q.length) { const id = q.shift(), d = depth.get(id);
    W.filter(w => w.from === id).forEach(w => { const b = M.block(w.to); if (!b || b.status !== 'live' || b.docId !== root.docId) return; if (!depth.has(w.to)) { depth.set(w.to, d + 1); q.push(w.to); } edges.push([id, w.to]); }); }
    return { ids: [...depth.keys()], depth, edges }; },
  /** The panel beneath a beat (a figure wired "illustrates" to it). */
  board(b) { const w = DB.all('wires').find(x => x.to === b.id && x.rel === 'illustrates' && (M.block(x.from) || {}).kind === 'figure' && M.block(x.from).status === 'live'); return w ? M.block(w.from) : null; },
  addBoard(b, pane) {
    const d = M.doc(b.docId), r = pane.rectOf(b.id) || { h: 120 }; DB.beginGroup('story-board');
    const F = M.block(FIG.create(d, { x: b.x || 0, y: (b.y || 0) + r.h + 28 }, 1, 1).id); F.x = b.x || 0; F.w = b.w || 392; F.label = (b.label || 'Story') + ' · whiteboard'; F.auto = true; DB.put('blocks', F);
    BOARD.make(F, 0, true); M.wire(F.id, b.id, 'illustrates', true); changed(); toast('A whiteboard beneath the beat — click it to draw');
  },
  /** The next beat, from the ● dropped on empty paper: a story component, wired with the bare arrow. */
  next(pane, from, ev) {
    const at = pane.paper.toWorld(ev.clientX, ev.clientY), nb = pane.newAt(at.x, at.y - 20, true); if (!nb) return;
    nb.ckind = 'story'; nb.complexity = STORY.cx(from); DB.put('blocks', nb); M.wire(from.id, nb.id, 'next', true); pane.pendingFocus = { focus: nb.id, pos: 0 }; changed(); toast('The next beat — just the arrow');
  },
  /** The footer of a beat: Complexity 1–10 and + Whiteboard. */
  foot(b, pane, ro) {
    const cx = STORY.cx(b), bd = STORY.board(b);
    return h('div.story-foot.nopan', h('span.sf-l', { title: 'How much the audience must hold at this beat: 1 light, 10 dense' }, 'Complexity'),
      h('div.sf-cx', { role: 'radiogroup', 'aria-label': 'Complexity' }, Array.from({ length: 10 }, (_, i) => h('button.sf-n' + (i + 1 === cx ? '.on' : ''), { type: 'button', disabled: ro, title: 'Complexity ' + (i + 1) + ' of 10', 'aria-pressed': i + 1 === cx ? 'true' : 'false', on: { click: e => { e.stopPropagation(); STORY.set(b, i + 1); } } }, String(i + 1)))),
      h('span.spacer'),
      ro ? null : h('button.btn.xs.sf-wb', { type: 'button', title: bd ? 'Open the whiteboard beneath this beat' : 'A whiteboard beneath this beat: a 1×1 image panel with the board already in it, linked', on: { click: e => { e.stopPropagation(); bd ? BOARD.open(bd, 0) : STORY.addBoard(M.block(b.id) || b, pane); } } }, bd ? '✎ Whiteboard ↓' : '+ Whiteboard'));
  },
  /* ---------- the arc beside the first beat ---------- */
  plot(root, pane) {
    const C = STORY.chain(root), beats = C.ids.map(M.block).filter(STORY.is), n = Math.max(4, ...beats.map(b => C.depth.get(b.id) + 1));
    const W = STORY.W, H = STORY.H, L = 26, R = 12, T = 12, Bm = 22, pw = W - L - R, ph = H - T - Bm, col = (CKINDS.get('story') || {}).color || '#1E5E8C';
    const X = d => L + d * pw / (n - 1), Y = c => T + ph - (c - 1) * ph / 9, at = b => ({ x: X(C.depth.get(b.id)), y: Y(STORY.cx(b)) });
    const svg = SV('svg', { class: 'sp-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: `--sc:${col}` });
    [1, 5, 10].forEach(c => svg.append(SV('line', { x1: L, x2: W - R, y1: Y(c), y2: Y(c), class: 'sp-grid' }), SV('text', { x: L - 6, y: Y(c) + 3.5, class: 'sp-t', 'text-anchor': 'end' }, String(c))));
    for (let d = 0; d < n; d++) svg.append(SV('text', { x: X(d), y: H - 8, class: 'sp-t', 'text-anchor': 'middle' }, String(d + 1)));
    // the main line: from the first beat, the first beat that follows each time; the area beneath it is what the audience carries
    const main = [root]; for (;;) { const last = main[main.length - 1], e = C.edges.find(x => x[0] === last.id && STORY.is(M.block(x[1])) && !main.some(m => m.id === x[1])); if (!e) break; main.push(M.block(e[1])); }
    if (main.length > 1) svg.append(SV('polygon', { class: 'sp-a', points: [`${at(main[0]).x},${Y(1)}`, ...main.map(b => `${at(b).x},${at(b).y}`), `${at(main[main.length - 1]).x},${Y(1)}`].join(' ') }));
    C.edges.forEach(([a, b]) => { const A = M.block(a), B = M.block(b); if (!STORY.is(A) || !STORY.is(B)) return; const p = at(A), q = at(B); svg.append(SV('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'sp-l' })); });
    const top = beats.reduce((m, b) => STORY.cx(b) > STORY.cx(m) ? b : m, beats[0]), last = main[main.length - 1];
    beats.forEach(b => { const p = at(b), d = C.depth.get(b.id) + 1; const dot = SV('circle', { class: 'sp-d', cx: p.x, cy: p.y, r: 4.5 }, SV('title', {}, `Beat ${d} · ${M.blockName(b)} · complexity ${STORY.cx(b)}`));
      dot.addEventListener('click', e => { e.stopPropagation(); pane.select(b.id); pane.reveal(b.id); }); svg.append(dot);
      if (b === top || b === last) svg.append(SV('text', { x: p.x, y: p.y - 8, class: 'sp-v', 'text-anchor': 'middle' }, String(STORY.cx(b)))); });
    return svg;
  },
  key(root) { const C = STORY.chain(root); return C.ids.map(id => id + ':' + ((M.block(id) || {}).complexity || '')).join(',') + '|' + C.edges.map(e => e.join('>')).join(','); },
  /** One arc per first beat, left of its box; drawn again only when a beat, a link or a complexity changed. */
  paint(pane) {
    const w = pane.paper && pane.paper.world; if (!w) return; const keep = new Set();
    STORY.roots(pane.docId).forEach(root => { const box = $(`:scope > .box[data-id="${root.id}"]`, w); if (!box || !box.offsetWidth) return; keep.add(root.id);
      const key = STORY.key(root), left = (box.offsetLeft - STORY.W - STORY.GAP) + 'px', top = box.offsetTop + 'px'; let el = $(`:scope > .story-plot[data-for="${root.id}"]`, w);
      if (el && el.dataset.key === key) { el.style.left = left; el.style.top = top; return; }
      const nb = STORY.chain(root).ids.map(M.block).filter(STORY.is).length;
      const fresh = h('div.story-plot.nopan', { 'data-for': root.id, 'data-key': key, title: 'The story’s arc: complexity (up) by beat (across, its links from the first). Click a point to go to the beat.', style: { left, top, width: STORY.W + 'px' } }, h('div.sp-h', h('b', 'Story arc'), h('span', plural(nb, 'beat') + ' · complexity 1–10')), STORY.plot(root, pane));
      el ? el.replaceWith(fresh) : w.append(fresh); });
    $$(':scope > .story-plot', w).forEach(el => { if (!keep.has(el.dataset.for)) el.remove(); });
  },
};
{
  // the footer on a story; the kinds' header is 13zzi's
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (!el || !STORY.is(b)) return el; const ed = $(':scope > .ed', el); const foot = STORY.foot(b, this, !!this.travel); ed ? ed.after(foot) : el.append(foot); return el; };
  // the ● from a story onto empty paper: the next beat, no panels
  const co = CHAINDROP.open; CHAINDROP.open = function (pane, fromId, ev) { const from = M.block(fromId); if (!STORY.is(from) || pane.travel) return co.apply(this, arguments); STORY.next(pane, from, ev); };
  // the arc, with the wires; Fit counts it
  const dw = DocView.drawWires; DocView.drawWires = function () { const r = dw.apply(this, arguments); try { STORY.paint(this); } catch (e) { console.warn('[story]', e); } return r; };
  const bb = DocView.bbox; DocView.bbox = function () { const r = bb.apply(this, arguments); if (!r) return r; $$(':scope > .story-plot', this.paper.world).forEach(el => { r.x0 = Math.min(r.x0, el.offsetLeft); r.y0 = Math.min(r.y0, el.offsetTop); r.x1 = Math.max(r.x1, el.offsetLeft + el.offsetWidth); r.y1 = Math.max(r.y1, el.offsetTop + el.offsetHeight); }); return r; };
}
