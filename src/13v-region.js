/* ==========================================================================
   13v · Regions. Right-click and drag on a note's paper to draw a region:
   the border follows the mouse, then snaps to the components inside it with
   a little room around them. Members carry the border with them when you
   drag them; dropping a component inside a region adds it; Alt while
   dragging a member takes it out. A region has a name and a colour, moves
   as a group by its title, and deleting it leaves the components.
   One region per component. A term found in one member reports the whole
   region: the other members appear as secondary sources in the lens.
   ========================================================================== */
const REGION = {
  PAD: 22, TOP: 34, COLORS: ['#2A9D8F', '#E76F51', '#457B9D', '#9C6ADE', '#E9C46A', '#6A994E', '#D4A5A5', '#8D99AE'],
  list: d => (d && d.regions) || [],
  _idx: null,
  index() { if (REGION._idx) return REGION._idx; const m = new Map(); DB.all('documents').forEach(d => (d.regions || []).forEach(r => r.members.forEach(id => m.set(id, { r, d })))); return (REGION._idx = m); },
  of: blockId => REGION.index().get(blockId) || null,
  /** The other live members of a component's region (the secondary sources). */
  peers(blockId) { const x = REGION.of(blockId); if (!x) return []; return x.r.members.filter(id => id !== blockId).map(M.block).filter(b => b && b.status === 'live'); },
  save(d) { REGION._idx = null; M.touchDoc(d); DB.put('documents', d); },
  create(d, members) {
    d.regions = REGION.list(d).map(r => Object.assign({}, r, { members: r.members.filter(id => !members.includes(id)) })).filter(r => r.members.length);
    const r = { id: uid('rg'), name: 'Region ' + (REGION.list(d).length + 1), color: REGION.COLORS[REGION.list(d).length % REGION.COLORS.length], members: [...members], created: isoLocal(new Date()) };
    d.regions = [...d.regions, r]; REGION.save(d); changed(); return r;
  },
  remove(d, rid) { d.regions = REGION.list(d).filter(r => r.id !== rid); REGION.save(d); changed(); toast('Region removed — its components stay'); },
  join(d, r, id) { d.regions.forEach(x => { if (x !== r) x.members = x.members.filter(m => m !== id); }); if (!r.members.includes(id)) r.members.push(id); d.regions = d.regions.filter(x => x.members.length); REGION.save(d); },
  leave(d, id) { d.regions.forEach(x => x.members = x.members.filter(m => m !== id)); d.regions = d.regions.filter(x => x.members.length); REGION.save(d); },

  /* ---------------- drawing on the paper ---------------- */
  /** World rectangle of a region from its members' boxes as they are on screen now. */
  rect(pane, r) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    r.members.forEach(id => { const el = $(`:scope > .box[data-id="${id}"]`, pane.paper.world); if (!el) return; n++; x0 = Math.min(x0, el.offsetLeft); y0 = Math.min(y0, el.offsetTop); x1 = Math.max(x1, el.offsetLeft + el.offsetWidth); y1 = Math.max(y1, el.offsetTop + el.offsetHeight); });
    return n ? { x: x0 - REGION.PAD, y: y0 - REGION.TOP, w: x1 - x0 + REGION.PAD * 2, h: y1 - y0 + REGION.TOP + REGION.PAD } : null;
  },
  /** Draw (or redraw) every region of the pane's note behind its boxes. */
  render(pane) {
    const w = pane.paper && pane.paper.world; if (!w) return; $$(':scope > .region', w).forEach(x => x.remove());
    const d = M.doc(pane.docId); if (!d) return;
    for (const r of REGION.list(d)) {
      const name = h('span.rg-name', { title: 'Double-click to rename · drag to move the region' }, r.name);
      const tab = h('div.rg-tab.nopan', name, h('span.rg-n', r.members.length), TCMP.pill(r), pane.travel ? null : h('button.rg-more', { title: 'Region', on: { click: e => { e.stopPropagation(); REGION.menu(pane, d, r, e); } } }, '⋯'));
      const el = h('div.region', { 'data-rg': r.id, style: { '--rg': r.color || REGION.COLORS[0] } }, tab);
      if (!pane.travel) {
        name.addEventListener('dblclick', e => { e.stopPropagation(); REGION.rename(pane, d, r, name); });
        tab.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button,input')) return; e.preventDefault(); e.stopPropagation(); REGION.drag(pane, d, r, e); });
      }
      w.prepend(el);
    }
    REGION.layout(pane);
  },
  layout(pane) {
    const w = pane.paper && pane.paper.world, d = w && M.doc(pane.docId); if (!d) return;
    for (const r of REGION.list(d)) { const el = $(`:scope > .region[data-rg="${r.id}"]`, w), R = REGION.rect(pane, r); if (!el) continue; if (!R) { el.style.display = 'none'; continue; }
      Object.assign(el.style, { display: '', left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px' }); }
  },
  rename(pane, d, r, name) {
    const inp = h('input.rg-in', { value: r.name }); name.replaceWith(inp); inp.focus(); inp.select();
    const done = ok => { if (ok && inp.value.trim()) { r.name = inp.value.trim(); REGION.save(d); } changed(); };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
    inp.addEventListener('blur', () => done(true));
  },
  menu(pane, d, r, e) {
    ctxMenu(e.clientX, e.clientY + 8, [{ head: r.name + ' · ' + plural(r.members.length, 'component') },
      { label: 'Rename…', run: () => { const n = $(`.region[data-rg="${r.id}"] .rg-name`, pane.paper.world); n && REGION.rename(pane, d, r, n); } },
      { label: 'Colour', sub: h('span.rg-sw', REGION.COLORS.map(c => h('button', { style: { background: c }, title: c, on: { click: ev => { ev.stopPropagation(); closePop(); r.color = c; REGION.save(d); changed(); } } }))), run: () => { } },
      'sep', { label: 'Delete region', danger: true, sub: 'The components stay where they are', run: () => REGION.remove(d, r.id) }]);
  },
  /** Drag the region by its title: every member moves together. */
  drag(pane, d, r, e) {
    const P = pane.paper, sx = e.clientX, sy = e.clientY, start = r.members.map(M.block).filter(Boolean).map(b => ({ b, x: b.x || 0, y: b.y || 0, el: $(`:scope > .box[data-id="${b.id}"]`, P.world) }));
    let moved = false;
    const mv = ev => { const dx = (ev.clientX - sx) / P.view.z, dy = (ev.clientY - sy) / P.view.z; if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return; moved = true;
      start.forEach(s => { s.b.x = s.x + dx; s.b.y = s.y + dy; if (s.el) { s.el.style.left = s.b.x + 'px'; s.el.style.top = s.b.y + 'px'; } }); pane.drawWires(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (!moved) return;
      start.forEach(s => { s.b.x = Math.round(s.b.x / 14) * 14; s.b.y = Math.round(s.b.y / 14) * 14; DB.put('blocks', s.b); if (s.el) { s.el.style.left = s.b.x + 'px'; s.el.style.top = s.b.y + 'px'; } }); DB.beginGroup(); pane.drawWires(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },
  /** After a box was dragged: Alt takes a member out; a component dropped inside another region joins it. */
  dropped(pane, id) {
    const d = M.doc(pane.docId), b = M.block(id); if (!d || !b || id[0] === '_') return; const cur = REGION.list(d).find(r => r.members.includes(id));
    if (cur && REGION.alt) { REGION.leave(d, id); toast('Taken out of “' + cur.name + '”'); changed(); return; }
    if (cur) return REGION.layout(pane);
    const el = $(`:scope > .box[data-id="${id}"]`, pane.paper.world); if (!el) return; const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + Math.min(40, el.offsetHeight / 2);
    const hit = REGION.list(d).find(r => { const R = REGION.rect(pane, Object.assign({}, r, { members: r.members.filter(m => m !== id) })); return R && cx > R.x && cx < R.x + R.w && cy > R.y && cy < R.y + R.h; });
    if (hit) { REGION.join(d, hit, id); toast('Added to “' + hit.name + '” — Alt+drag takes it out'); changed(); }
  },
  /** Right-button drag on the paper draws a new region. A plain right-click still opens the menu. */
  attach(pane) {
    const P = pane.paper; if (!P || P.el._rg) return; P.el._rg = true;
    P.el.addEventListener('pointerdown', e => {
      if (e.button !== 2 || pane.travel || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const sx = e.clientX, sy = e.clientY, a = P.toWorld(sx, sy); let band = null, picked = [];
      REGION.rdown = true; REGION.pending = null;
      const boxes = () => $$(':scope > .box.cmp', P.world).filter(x => x.dataset.id && x.dataset.id[0] !== '_');
      const mv = ev => {
        if (!band && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        const z = P.toWorld(ev.clientX, ev.clientY), x = Math.min(a.x, z.x), y = Math.min(a.y, z.y), w = Math.abs(z.x - a.x), hh = Math.abs(z.y - a.y);
        if (!band) { band = h('div.rg-band'); P.world.append(band); closePop(); document.body.classList.add('rg-drawing'); }
        Object.assign(band.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
        picked = boxes().filter(el => { const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + Math.min(el.offsetHeight / 2, 60); return cx > x && cx < x + w && cy > y && cy < y + hh; });
        boxes().forEach(el => el.classList.toggle('rg-pick', picked.includes(el)));
        band.dataset.n = picked.length ? plural(picked.length, 'component') : 'nothing inside yet';
        P.edgePan && P.edgePan(ev);
      };
      const up = ev => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); P.stopEdgePan && P.stopEdgePan(); REGION.rdown = false; document.body.classList.remove('rg-drawing');
        $$('.rg-pick', P.world).forEach(x => x.classList.remove('rg-pick'));
        if (band) { band.remove(); REGION.noMenu = Date.now(); const ids = picked.map(x => x.dataset.id);
          if (ids.length) { const r = REGION.create(M.doc(pane.docId), ids); setTimeout(() => { const n = $(`.region[data-rg="${r.id}"] .rg-name`, P.world); n && REGION.rename(pane, M.doc(pane.docId), r, n); }, 60); }
          else toast('Draw around at least one component'); return; }
        if (REGION.pending) { const [ce, cp] = REGION.pending; REGION.pending = null; REGION._menu.call(pane, ce, cp); }
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
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
