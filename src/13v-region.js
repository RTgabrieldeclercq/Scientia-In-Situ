/* ==========================================================================
   13v · Regions. Right-click and drag on a note's paper to draw a region:
   the border follows the mouse, then snaps to the components inside it with
   a little room around them. Members carry the border with them when you
   drag them; dropping a component inside a region adds it; Alt while
   dragging a member takes it out. A region has a name and a colour, moves
   as a group by its title, and deleting it leaves the components.
   One region per component. A term found in one member reports the whole
   region: the other members appear as secondary sources in the lens.
   Regions nest: draw one around components of a region (or around whole
   regions) and it sits inside; a region dragged by its title into another
   joins it (Alt takes it out). The ▾ left of the name folds a region into
   its title — what is inside is hidden and its connections end on the
   folded region. A region connects like a component (its ●; drop a
   connection on its title), and is embedded in another note like one:
   its components appear there, its regions re-made around them.
   ========================================================================== */
const REGION = {
  PAD: 22, TOP: 34, FOLDH: 38, COLORS: ['#2A9D8F', '#E76F51', '#457B9D', '#9C6ADE', '#E9C46A', '#6A994E', '#D4A5A5', '#8D99AE'],
  list: d => (d && d.regions) || [],
  isRg: id => typeof id === 'string' && id.startsWith('rg_'),
  _idx: null, _rid: null,
  /** member id (a component or a region) → the region it is in; region id → {r, d} */
  index() { if (REGION._idx) return REGION._idx; const m = new Map(), rid = new Map(); DB.all('documents').forEach(d => (d.regions || []).forEach(r => { rid.set(r.id, { r, d }); r.members.forEach(id => m.set(id, { r, d })); })); REGION._rid = rid; return (REGION._idx = m); },
  of: blockId => REGION.index().get(blockId) || null,
  find(id) { if (!REGION.isRg(id)) return null; REGION.index(); return REGION._rid.get(id) || null; },
  /** The other live components of a component's region, nested regions included (the secondary sources). */
  peers(blockId) { const x = REGION.of(blockId); if (!x) return []; return REGION.blocksOf(x.r, x.d).filter(id => id !== blockId).map(M.block).filter(b => b && b.status === 'live'); },
  /** Every component inside a region, at any depth. */
  blocksOf(r, d, seen = new Set()) { d = d || (REGION.find(r.id) || {}).d; if (!d || seen.has(r.id)) return []; seen.add(r.id);
    return r.members.flatMap(id => { if (!REGION.isRg(id)) return [id]; const k = REGION.list(d).find(x => x.id === id); return k ? REGION.blocksOf(k, d, seen) : []; }); },
  /** The regions inside a region, at any depth. */
  subRegions(d, r, seen = new Set()) { if (seen.has(r.id)) return []; seen.add(r.id);
    return r.members.filter(REGION.isRg).map(id => REGION.list(d).find(x => x.id === id)).filter(Boolean).flatMap(k => [k, ...REGION.subRegions(d, k, seen)]); },
  /** The regions around a component or region, innermost first. */
  ancestors(d, id) { const out = [], seen = new Set(); let cur = id;
    for (;;) { const p = REGION.list(d).find(y => y.members.includes(cur)); if (!p || seen.has(p.id)) break; seen.add(p.id); out.push(p); cur = p.id; } return out; },
  within: (d, id, anc) => REGION.ancestors(d, id).some(a => a.id === anc),
  depth: (d, r) => REGION.ancestors(d, r.id).length,
  /** The outermost folded region that hides a component or region, or null. */
  hider(d, id) { const f = REGION.ancestors(d, id).filter(a => a.collapsed); return f.length ? f[f.length - 1] : null; },
  /** What a connection to this component or region ends on in a pane: itself, or the folded region hiding it. */
  shown(pane, id) { const d = M.doc(pane.docId), hz = d && REGION.hider(d, id); return hz ? hz.id : id; },
  /** Where a region's top-left is when its members have no box on screen. */
  home(d, r) { const bs = REGION.blocksOf(r, d).map(M.block).filter(b => b && b.x != null); return bs.length ? { x: Math.min(...bs.map(b => b.x)) - REGION.PAD, y: Math.min(...bs.map(b => b.y || 0)) - REGION.TOP } : { x: 0, y: 0 }; },
  save(d) { REGION._idx = null; M.touchDoc(d); DB.put('documents', d); },
  /** Empty regions go, and with them their place in the regions around them. */
  tidy(d) {
    for (let k = 0; k < 8; k++) { const ids = new Set(REGION.list(d).map(r => r.id)); let ch = false;
      d.regions = REGION.list(d).map(r => { const m = r.members.filter(id => !REGION.isRg(id) || (ids.has(id) && id !== r.id)); if (m.length === r.members.length) return r; ch = true; return Object.assign({}, r, { members: m }); });
      const keep = d.regions.filter(r => r.members.length); if (keep.length !== d.regions.length) { ch = true; d.regions = keep; }
      if (!ch) break; }
  },
  create(d, members) {
    // a region drawn inside another (around some of its members) sits inside it
    const anc = members.map(id => REGION.ancestors(d, id)), par = (anc[0] || []).find(a => !members.includes(a.id) && anc.every(l => l.some(x => x.id === a.id))) || null;
    d.regions = REGION.list(d).map(r => Object.assign({}, r, { members: r.members.filter(id => !members.includes(id)) }));
    const n = REGION.list(d).length, r = { id: uid('rg'), name: 'Region ' + (n + 1), color: REGION.COLORS[n % REGION.COLORS.length], members: [...members], created: isoLocal(new Date()) };
    if (par) { const p = d.regions.find(x => x.id === par.id); if (p) p.members = [...p.members, r.id]; }
    d.regions = [...d.regions, r]; REGION.tidy(d); REGION.save(d); changed(); return r;
  },
  /** Deleting a region leaves what was in it in the region around it (or on the paper); its connections go. */
  remove(d, rid) {
    const r = REGION.list(d).find(x => x.id === rid); if (!r) return; const par = REGION.list(d).find(x => x.members.includes(rid));
    d.regions = REGION.list(d).filter(x => x.id !== rid).map(x => x === par ? Object.assign({}, x, { members: x.members.flatMap(id => id === rid ? r.members : [id]) }) : x);
    DB.where('wires', w => w.from === rid || w.to === rid).forEach(w => DB.del('wires', w.id));
    REGION.tidy(d); REGION.save(d); changed(); toast('Region removed — its components stay');
  },
  join(d, r, id) {
    if (id === r.id || (REGION.isRg(id) && REGION.within(d, r.id, id))) return;   // never inside itself
    d.regions.forEach(x => { if (x.id !== r.id) x.members = x.members.filter(m => m !== id); }); const t = d.regions.find(x => x.id === r.id); if (t && !t.members.includes(id)) t.members.push(id);
    REGION.tidy(d); REGION.save(d);
  },
  /** Out of its region, into the one around that (or onto the paper). */
  leave(d, id) { const cur = REGION.list(d).find(x => x.members.includes(id)), gp = cur && REGION.list(d).find(x => x.members.includes(cur.id));
    REGION.list(d).forEach(x => x.members = x.members.filter(m => m !== id)); if (gp && !gp.members.includes(id)) gp.members.push(id); REGION.tidy(d); REGION.save(d); },
  fold(pane, d, r) {
    d = M.doc(d.id) || d; r = REGION.list(d).find(x => x.id === r.id) || r;
    if (!r.collapsed) { const R = REGION.rect(pane, r); r.at = R ? { x: Math.round(R.x), y: Math.round(R.y) } : REGION.home(d, r); r.collapsed = true; }
    else r.collapsed = false;
    REGION.save(d); changed();
  },

  /* ---------------- drawing on the paper ---------------- */
  /** World rectangle of a region from its members' boxes (and inner regions) as they are on screen now; a folded one is its title. */
  rect(pane, r, seen = new Set()) {
    if (seen.has(r.id)) return null; seen.add(r.id);
    const w = pane.paper.world, d = M.doc(pane.docId);
    if (r.collapsed) { const tab = $(`:scope > .region[data-rg="${r.id}"] > .rg-tab`, w), at = r.at || REGION.home(d, r); return { x: at.x, y: at.y, w: Math.max(150, tab && tab.offsetWidth ? tab.offsetWidth + 34 : 200), h: REGION.FOLDH }; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    r.members.forEach(id => { let R = null;
      if (REGION.isRg(id)) { const k = REGION.list(d).find(x => x.id === id); R = k && REGION.rect(pane, k, seen); }
      else { const el = $(`:scope > .box[data-id="${id}"]`, w); if (el && el.offsetWidth) R = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; }
      if (!R) return; n++; x0 = Math.min(x0, R.x); y0 = Math.min(y0, R.y); x1 = Math.max(x1, R.x + R.w); y1 = Math.max(y1, R.y + R.h); });
    return n ? { x: x0 - REGION.PAD, y: y0 - REGION.TOP, w: x1 - x0 + REGION.PAD * 2, h: y1 - y0 + REGION.TOP + REGION.PAD } : null;
  },
  /** The innermost region at a world point, measured without `skip` (a component or region being dropped). */
  at(pane, d, x, y, skip) {
    let best = null, area = 1e18;
    for (const r of REGION.list(d)) {
      if (r.id === skip || REGION.hider(d, r.id) || (REGION.isRg(skip) && REGION.within(d, r.id, skip))) continue;
      const R = REGION.rect(pane, skip ? Object.assign({}, r, { members: r.members.filter(m => m !== skip) }) : r);
      if (!R || x < R.x || x > R.x + R.w || y < R.y || y > R.y + R.h) continue;
      if (R.w * R.h < area) { area = R.w * R.h; best = r; }
    }
    return best;
  },
  /** Draw (or redraw) every region of the pane's note behind its boxes; what a folded region holds is hidden. */
  render(pane) {
    const w = pane.paper && pane.paper.world; if (!w) return; $$(':scope > .region', w).forEach(x => x.remove());
    const d = M.doc(pane.docId); if (!d) return;
    const L = REGION.list(d), hid = new Set();
    L.filter(r => r.collapsed).forEach(r => { REGION.blocksOf(r, d).forEach(id => hid.add(id)); REGION.subRegions(d, r).forEach(x => hid.add(x.id)); });
    INK.blocks(d.id).forEach(b => { if (b.glue && hid.has(b.glue.to)) hid.add(b.id); });   // ink on an image goes with it (13zzc)
    $$(':scope > .box', w).forEach(el => el.classList.toggle('rg-hid', hid.has(el.dataset.id)));
    $$(':scope > .obsbox', w).forEach(el => el.classList.toggle('rg-hid', hid.has(el.dataset.host)));
    const depth = new Map(L.map(r => [r.id, REGION.depth(d, r)]));
    for (const r of L.slice().sort((a, b) => depth.get(b.id) - depth.get(a.id))) {   // the innermost first: prepending puts the outermost behind
      if (hid.has(r.id)) continue;
      const name = h('span.rg-name', { title: 'Double-click to rename · drag to move the region' }, r.name);
      const fold = h('button.rg-fold', { title: r.collapsed ? 'Unfold — show what is inside' : 'Fold it up into its title', disabled: !!pane.travel, on: { click: e => { e.stopPropagation(); REGION.fold(pane, d, r); } } }, r.collapsed ? '▸' : '▾');
      const tab = h('div.rg-tab.nopan', fold, name, h('span.rg-n', REGION.blocksOf(r, d).length), TCMP.pill(r), pane.travel ? null : h('button.rg-more', { title: 'Region', on: { click: e => { e.stopPropagation(); REGION.menu(pane, d, r, e); } } }, '⋯'));
      const port = pane.travel ? null : h('div.rg-port', { title: 'Drag to another component or region to connect them' });
      const el = h('div.region' + (r.collapsed ? '.folded' : ''), { 'data-rg': r.id, style: { '--rg': r.color || REGION.COLORS[0] } }, tab, port);
      if (!pane.travel) {
        name.addEventListener('dblclick', e => { e.stopPropagation(); REGION.rename(pane, d, r, name); });
        tab.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button,input')) return; e.preventDefault(); e.stopPropagation(); REGION.drag(pane, d, r, e); });
        port.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); pane.wireDrag(r.id, e); });
      }
      w.prepend(el);
    }
    REGION.layout(pane);
  },
  layout(pane) {
    const w = pane.paper && pane.paper.world, d = w && M.doc(pane.docId); if (!d) return;
    for (const r of REGION.list(d)) { const el = $(`:scope > .region[data-rg="${r.id}"]`, w), R = el && REGION.rect(pane, r); if (!el) continue; if (!R) { el.style.display = 'none'; continue; }
      Object.assign(el.style, { display: '', left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px' }); }
  },
  rename(pane, d, r, name) {
    const inp = h('input.rg-in', { value: r.name }); name.replaceWith(inp); inp.focus(); inp.select();
    const done = ok => { if (ok && inp.value.trim()) { r.name = inp.value.trim(); REGION.save(d); } changed(); };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
    inp.addEventListener('blur', () => done(true));
  },
  menu(pane, d, r, e) {
    const n = REGION.blocksOf(r, d).length;
    ctxMenu(e.clientX, e.clientY + 8, [{ head: r.name + ' · ' + plural(n, 'component') },
      { label: 'Rename…', run: () => { const el = $(`.region[data-rg="${r.id}"] .rg-name`, pane.paper.world); el && REGION.rename(pane, d, r, el); } },
      { label: 'Colour', sub: h('span.rg-sw', REGION.COLORS.map(c => h('button', { style: { background: c }, title: c, on: { click: ev => { ev.stopPropagation(); closePop(); r.color = c; REGION.save(d); changed(); } } }))), run: () => { } },
      { label: r.collapsed ? 'Unfold' : 'Fold it up', sub: r.collapsed ? null : 'Only its title shows; its connections end on it', run: () => REGION.fold(pane, d, r) },
      { label: 'Connect to a component in another note…', run: () => pane.crossWire(r.id) },
      { label: 'Embed in another note…', sub: 'Its components appear there, the origin kept; its regions are re-made around them', run: () => REGION.copyDialog(d, r) },
      'sep', { label: 'Delete region', danger: true, sub: REGION.depth(d, r) ? 'Its components stay, in the region around it' : 'The components stay where they are', run: () => REGION.remove(d, r.id) }]);
  },
  /** Drag the region by its title: every member moves together, inner regions too. */
  drag(pane, d, r, e) {
    d = M.doc(pane.docId) || d; r = REGION.list(d).find(x => x.id === r.id) || r;
    const P = pane.paper, sx = e.clientX, sy = e.clientY, start = REGION.blocksOf(r, d).map(M.block).filter(Boolean).map(b => ({ b, x: b.x || 0, y: b.y || 0, el: $(`:scope > .box[data-id="${b.id}"]`, P.world) }));
    const folds = [r, ...REGION.subRegions(d, r)].filter(x => x.at).map(x => ({ r: x, x: x.at.x, y: x.at.y }));
    let moved = false;
    const mv = ev => { const dx = (ev.clientX - sx) / P.view.z, dy = (ev.clientY - sy) / P.view.z; if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return; moved = true;
      start.forEach(s => { s.b.x = s.x + dx; s.b.y = s.y + dy; if (s.el) { s.el.style.left = s.b.x + 'px'; s.el.style.top = s.b.y + 'px'; } }); folds.forEach(s => { s.r.at = { x: s.x + dx, y: s.y + dy }; }); pane.drawWires(); };
    const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (!moved) return;
      if (REGION._stay) { REGION._stay = false; start.forEach(s => { s.b.x = s.x; s.b.y = s.y; if (s.el) { s.el.style.left = s.x + 'px'; s.el.style.top = s.y + 'px'; } }); folds.forEach(s => { s.r.at = { x: s.x, y: s.y }; }); pane.drawWires(); return; }   // embedded elsewhere (13zb): it stays here
      start.forEach(s => { s.b.x = Math.round(s.b.x / 14) * 14; s.b.y = Math.round(s.b.y / 14) * 14; DB.put('blocks', s.b); if (s.el) { s.el.style.left = s.b.x + 'px'; s.el.style.top = s.b.y + 'px'; } });
      folds.forEach(s => { s.r.at = { x: Math.round(s.r.at.x / 14) * 14, y: Math.round(s.r.at.y / 14) * 14 }; }); if (folds.length) REGION.save(d);
      DB.beginGroup(); pane.drawWires(); REGION.droppedRegion(pane, d, r, ev); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },
  /** After a component was dragged: Alt takes it out; dropped inside a region (deeper than its own) it joins it. */
  dropped(pane, id) {
    const d = M.doc(pane.docId), b = M.block(id); if (!d || !b || id[0] === '_') return; const cur = REGION.list(d).find(r => r.members.includes(id));
    if (cur && REGION.alt) { REGION.leave(d, id); toast('Taken out of “' + cur.name + '”'); changed(); return; }
    const el = $(`:scope > .box[data-id="${id}"]`, pane.paper.world); if (!el) return; const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + Math.min(40, el.offsetHeight / 2);
    const hit = REGION.at(pane, d, cx, cy, id);
    if (hit && (!cur || (hit.id !== cur.id && REGION.within(d, hit.id, cur.id)))) { REGION.join(d, hit, id); toast('Added to “' + hit.name + '” — Alt+drag takes it out'); changed(); return; }
    REGION.layout(pane);
  },
  /** After a region was dragged by its title: the same rules — into the region it was dropped in, Alt out of its own. */
  droppedRegion(pane, d, r) {
    const cur = REGION.list(d).find(x => x.members.includes(r.id));
    if (cur && REGION.alt) { REGION.leave(d, r.id); toast('“' + r.name + '” taken out of “' + cur.name + '”'); changed(); return; }
    const R = REGION.rect(pane, r); if (!R) return; const hit = REGION.at(pane, d, R.x + 30, R.y + 16, r.id);
    if (hit && (!cur || (hit.id !== cur.id && REGION.within(d, hit.id, cur.id)))) { REGION.join(d, hit, r.id); toast('“' + r.name + '” is inside “' + hit.name + '” — Alt+drag takes it out'); changed(); return; }
    REGION.layout(pane);
  },
  /** Right-button drag on the paper draws a new region (around components, and whole regions inside the band). A plain right-click still opens the menu. */
  attach(pane) {
    const P = pane.paper; if (!P || P.el._rg) return; P.el._rg = true;
    P.el.addEventListener('pointerdown', e => {
      if (e.button !== 2 || pane.travel || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const sx = e.clientX, sy = e.clientY, a = P.toWorld(sx, sy), d = M.doc(pane.docId); let band = null, picked = [], pickedR = [];
      REGION.rdown = true; REGION.pending = null;
      const boxes = () => $$(':scope > .box.cmp', P.world).filter(x => x.dataset.id && x.dataset.id[0] !== '_' && !x.classList.contains('rg-hid'));
      const mv = ev => {
        if (!band && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        const z = P.toWorld(ev.clientX, ev.clientY), x = Math.min(a.x, z.x), y = Math.min(a.y, z.y), w = Math.abs(z.x - a.x), hh = Math.abs(z.y - a.y);
        if (!band) { band = h('div.rg-band'); P.world.append(band); closePop(); document.body.classList.add('rg-drawing'); }
        Object.assign(band.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
        // whole regions inside the band come along with what is in them
        const inR = REGION.list(d).filter(r => { if (REGION.hider(d, r.id)) return false; const R = REGION.rect(pane, r); return R && R.x >= x && R.y >= y && R.x + R.w <= x + w && R.y + R.h <= y + hh; });
        const inside = new Set(inR.flatMap(r => [...REGION.blocksOf(r, d), ...REGION.subRegions(d, r).map(s => s.id)]));
        pickedR = inR.filter(r => !inside.has(r.id));
        const all = boxes().filter(el => { const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + Math.min(el.offsetHeight / 2, 60); return cx > x && cx < x + w && cy > y && cy < y + hh; });
        picked = all.filter(el => !inside.has(el.dataset.id));
        boxes().forEach(el => el.classList.toggle('rg-pick', all.includes(el) || inside.has(el.dataset.id)));
        band.dataset.n = picked.length || pickedR.length ? [picked.length ? plural(picked.length, 'component') : '', pickedR.length ? plural(pickedR.length, 'region') : ''].filter(Boolean).join(' · ') : 'nothing inside yet';
        P.edgePan && P.edgePan(ev);
      };
      const up = ev => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); P.stopEdgePan && P.stopEdgePan(); REGION.rdown = false; document.body.classList.remove('rg-drawing');
        $$('.rg-pick', P.world).forEach(x => x.classList.remove('rg-pick'));
        if (band) { band.remove(); REGION.noMenu = Date.now(); const ids = [...pickedR.map(r => r.id), ...picked.map(x => x.dataset.id)];
          if (ids.length) { const r = REGION.create(M.doc(pane.docId), ids); setTimeout(() => { const n = $(`.region[data-rg="${r.id}"] .rg-name`, P.world); n && REGION.rename(pane, M.doc(pane.docId), r, n); }, 60); }
          else toast('Draw around at least one component'); return; }
        if (REGION.pending) { const [ce, cp] = REGION.pending; REGION.pending = null; REGION._menu.call(pane, ce, cp); }
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
  },

  /* ---------------- embedding a region in another note, as a component is ---------------- */
  /** Kinds copied (their files and data shared); text components and the rest are embedded live, the origin kept. */
  CLONE: ['ink', 'figure', 'html', 'pdf', 'deck', 'table', 'plot', 'eq', 'calc', 'plate', 'view'],
  copyDialog(d, r) {
    const m = modal({ title: 'Embed “' + snippet(r.name, 40) + '” in another note', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search notes…', sort: 'region-copy',
      items: q => DB.where('documents', x => x.id !== d.id && !x.deleted && (!q || (x.title + ' ' + M.docPath(x)).toLowerCase().includes(q))).sort((x, y) => (y.modified || '').localeCompare(x.modified || '')),
      render: x => h('div', typechip(x.type), ' ', x.title, h('span.s', M.docPath(x))), onPick: x => { m.close(); REGION.copyTo(d, r, x.id); } }) });
  },
  copyTo(d, r, destId, pos) {
    const dest = M.doc(destId); if (!dest || !d) return null;
    const bs = REGION.blocksOf(r, d).map(M.block).filter(b => b && b.status === 'live'); if (!bs.length) return toast('Nothing in this region to embed');
    const placed = bs.filter(b => b.x != null), x0 = placed.length ? Math.min(...placed.map(b => b.x)) : 0, y0 = placed.length ? Math.min(...placed.map(b => b.y || 0)) : 0, at = pos || MOVE.spot(dest);
    const map = new Map(), now = isoLocal(new Date()); let rmap = new Map(); DB.beginGroup('region-embed'); _suppress++;
    try {
      bs.forEach(b => { const x = Math.round((at.x + (b.x || 0) - x0) / 14) * 14, y = Math.round((at.y + (b.y || 0) - y0) / 14) * 14; let nb;
        if (REGION.CLONE.includes(b.kind)) {
          const c = JSON.parse(JSON.stringify(b)); ['id', 'docId', 'created', 'modified', 'stamp', 'supersedes', 'supersededBy', 'clip', 'float', 'inkItemId', 'movedFrom'].forEach(k => delete c[k]);
          if (c.body) c.body = { text: c.body.text || '', marks: (c.body.marks || []).filter(mk => mk.type !== 'struct') };   // its structures stay with the original
          if (c.fig) { delete c.fig.itemId; (c.fig.cells || []).forEach(cc => delete cc.itemId); }
          nb = M.addBlock(dest.id, null, Object.assign(c, { x, y, copiedFrom: b.id }));
        } else nb = M.pullInto(dest.id, null, b.kind === 'ref' ? { itemId: b.refItemId, blockId: b.refBlockId, x, y } : { blockId: b.id, x, y });
        map.set(b.id, nb.id); });
      // what pointed inside the region points at the copies
      bs.forEach(b => { const c = M.block(map.get(b.id)); if (!c) return; let ch = false;
        if (c.glue) { if (map.has(c.glue.to)) c.glue = Object.assign({}, c.glue, { to: map.get(c.glue.to) }); else delete c.glue; ch = true; }
        if (c.kind === 'plot' && c.plot && map.has(c.plot.src)) { c.plot = Object.assign({}, c.plot, { src: map.get(c.plot.src) }); ch = true; }
        if (ch) DB.put('blocks', c); });
      const regs = [r, ...REGION.subRegions(d, r)]; rmap = new Map(regs.map(x => [x.id, uid('rg')]));
      const copies = regs.map(x => ({ id: rmap.get(x.id), name: x.name, color: x.color, members: x.members.map(id => map.get(id) || rmap.get(id)).filter(Boolean), created: now, embeddedFrom: x.id }));
      dest.regions = [...REGION.list(dest), ...copies]; REGION.tidy(dest); REGION.save(dest);
      // the connections between them (and their regions) are drawn again
      const ends = new Map([...map, ...rmap]);
      DB.where('wires', w => ends.has(w.from) && ends.has(w.to)).forEach(w => DB.put('wires', Object.assign({}, w, { id: uid('w'), from: ends.get(w.from), to: ends.get(w.to), created: now })));
    } finally { _suppress--; }
    IX.rebuild(); changed(); toast('“' + snippet(r.name, 30) + '” embedded in “' + snippet(dest.title, 30) + '” — ' + plural(bs.length, 'component'), 3500);
    return rmap.get(r.id);
  },
};
addEventListener('pointermove', e => { REGION.alt = e.altKey; }, true);
addEventListener('keydown', e => { if (e.key === 'Alt') REGION.alt = true; }, true); addEventListener('keyup', e => { if (e.key === 'Alt') REGION.alt = false; }, true);

/* ---------------- hooks into the note view ---------------- */
{
  const fill = DocView.fill; DocView.fill = function (d) { fill.call(this, d); REGION.attach(this); REGION.render(this); requestAnimationFrame(() => REGION.layout(this)); };
  const draw = DocView.drawWires; DocView.drawWires = function (...a) { const r = draw.apply(this, a); REGION.layout(this); return r; };
  // the context menu waits for the right button to come up: a drag draws a region instead
  REGION._menu = DocView.menu; DocView.menu = function (e, p) { if (REGION.rdown) { REGION.pending = [e, p]; return; } if (REGION.noMenu && Date.now() - REGION.noMenu < 800) { REGION.noMenu = 0; return; } return REGION._menu.call(this, e, p); };
  const rebuild = IX.rebuild.bind(IX); IX.rebuild = (...a) => { REGION._idx = null; return rebuild(...a); };
}
