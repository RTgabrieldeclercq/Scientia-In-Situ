/* ==========================================================================
   13zz2 · Pen, round three.
   • Pen mode off (✎ Pen not on): the pen doesn't write; it pans the paper
     and moves components, like a finger or the mouse.
   • A component's name or date: drag it to move the component; double-click
     to edit (the name) or to change the time (the date). Mouse and pen.
   • While the pen writes, the frame around ink components is hidden.
   • The pen's button out of pen mode: loop around components to make a
     region of them (in pen mode it selects, 13zu).
   • The right mouse button held and dragged draws a loop; on release:
     Make a region · Select (move, copy, cut, delete…). A plain right-click
     still opens the menu.
   • Cut in the selection bar.
   • ☆ The ink library (in the ink bar): save an ink component (its ⋯ menu)
     or a lasso selection, then place it again anywhere — click it, tap the
     paper. Also + Insert → Saved ink. Kept in the notebook, synced.
   ========================================================================== */
const PEN3 = {
  /** What a loop surrounds: components (boxes) and ink components with most of their ink inside. */
  inside(pane, poly) {
    const ids = new Set(LASSO2.boxesIn(pane, poly));
    INK.blocks(pane.docId).forEach(b => { const S = b.ink.strokes || []; let n = 0, k = 0; S.forEach(s => s.p.forEach(p => { n++; if (INK.inPoly(b.x + p[0], b.y + p[1], poly)) k++; })); if (n && k >= n * .6) ids.add(b.id); });
    return [...ids].filter(id => { const b = M.block(id); return b && b.docId === pane.docId && b.status === 'live'; });
  },
  region(pane, poly) { const ids = PEN3.inside(pane, poly); if (!ids.length) return toast('Nothing inside the loop to make a region of');
    const d = M.doc(pane.docId); DB.beginGroup(); const r = REGION.create(d, ids); toast(`Region of ${plural(ids.length, 'component')} — rename it on its tab`); return r; },
  ask(pane, poly, x, y) {
    popover(x, y + 8, [h('h5', 'This loop…'), h('div.row', { style: { gap: '6px', padding: '0 6px 6px' } },
      h('button.btn.xs.pri', { on: { click: () => { closePop(); PEN3.region(pane, poly); } } }, '▭ Make a region'),
      h('button.btn.xs', { on: { click: () => { closePop(); if (INK.sel) INK.clearSel(); INK.lassoSelect(pane, poly); } } }, '◌ Select'),
      h('span.tiny.muted', { style: { alignSelf: 'center' } }, 'move · copy · cut · delete…'))]);
  },
  /** A loop drawn while a button is held; done(poly, upEvent) unless it was just a click. */
  loop(paper, e, done, onClick) {
    const svg = INK.live(paper), path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', 'ink-lasso'); svg.appendChild(path);
    const w0 = paper.toWorld(e.clientX, e.clientY), poly = [[w0.x, w0.y]]; let moved = false;
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 8) moved = true; if (!moved) return; ev.preventDefault(); const p = paper.toWorld(ev.clientX, ev.clientY); poly.push([p.x, p.y]); path.setAttribute('d', 'M' + poly.map(q => q[0] + ',' + q[1]).join('L') + 'Z'); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); path.remove(); if (moved && poly.length > 3) done(poly, ev); else onClick && onClick(ev); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },

  /* ---------- the ink library ---------- */
  lib: () => DB.all('inklib').sort((a, b) => (b.created || '').localeCompare(a.created || '')),
  save(strokes, name) { // strokes in any coordinates → stored from 0,0
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; strokes.forEach(s => s.p.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }));
    const S = strokes.map(s => Object.assign(JSON.parse(JSON.stringify(s)), { p: s.p.map(p => [INK.r1(p[0] - x0 + 8), INK.r1(p[1] - y0 + 8), p[2]]) }));
    const rec = { id: uid('il'), name: name || 'Ink ' + fmtStamp(new Date()), strokes: S, w: Math.ceil(x1 - x0 + 16), h: Math.ceil(y1 - y0 + 16), created: isoLocal(new Date()) };
    DB.put('inklib', rec); changed(); toast('☆ Saved to the ink library as “' + rec.name + '”'); return rec;
  },
  async saveBlock(b) { const nm = await askText('Save to the ink library', 'Name', b.label || ''); if (nm === null || nm === undefined) return; PEN3.save(b.ink.strokes, nm || b.label); },
  async saveSel() { const S = INK.selStrokes().map(({ b, s }) => Object.assign({}, s, { p: s.p.map(p => [b.x + p[0], b.y + p[1], p[2]]) })); if (!S.length) return toast('Select some ink first'); const nm = await askText('Save to the ink library', 'Name', ''); if (nm === null || nm === undefined) return; PEN3.save(S, nm); },
  /** Put a saved ink down as a new ink component, its top-left at (x, y). */
  place(pane, rec, x, y) {
    const d = M.doc(pane.docId); if (!d || !rec) return; DB.beginGroup('ink'); _suppress++; const b = M.addBlock(d.id, null, { kind: 'ink', label: rec.name, x, y, w: rec.w, inkH: rec.h, ink: { strokes: JSON.parse(JSON.stringify(rec.strokes)).map(s => Object.assign(s, { p: s.p.map(p => [p[0] + INK.PAD - 8, p[1] + INK.PAD - 8, p[2]]) })) } }); _suppress--;
    b.body = { text: '', marks: [] }; INK.fit(b); DB.put('blocks', b); M.touchDoc(d); changed(); toast('Placed “' + rec.name + '”'); return b;
  },
  /** Choose a saved ink, then tap where it goes (or place at `at`). */
  open(pane, at) {
    const L = PEN3.lib();
    const grid = h('div.il-grid', L.length ? L.map(r => h('div.il-item', { title: 'Click, then tap the paper where it goes', on: { click: () => { m.close(); at ? PEN3.place(pane, r, at.x, at.y) : PEN3.armPlace(r); } } },
      h('div.il-thumb', INK.svg(r.strokes, r.w, r.h)), h('div.il-name', r.name),
      h('div.il-acts', h('button.ib', { title: 'Rename', on: { click: async e => { e.stopPropagation(); const v = await askText('Rename', 'Name', r.name); if (v) { DB.put('inklib', Object.assign({}, r, { name: v })); changed(); m.close(); PEN3.open(pane, at); } } } }, '✎'),
        h('button.ib', { title: 'Remove from the library', on: { click: e => { e.stopPropagation(); DB.del('inklib', r.id); changed(); m.close(); PEN3.open(pane, at); } } }, '×')))) : [h('div.empty', 'Nothing saved yet. Save an ink component from its ⋯ menu (☆ Save to ink library), or lasso some ink → ☆ Save.')]);
    const m = modal({ title: '☆ Ink library', wide: true, body: grid, actions: [{ label: 'Close' }] });
  },
  armPlace(rec) {
    PEN3.stopPlace && PEN3.stopPlace();
    const tip = h('div.q-pick', h('span', 'Tap the paper where “' + rec.name + '” goes'), h('button.btn.xs.ghost', { on: { click: () => stop() } }, 'Cancel'));
    document.body.append(tip); document.body.classList.add('il-placing');
    const down = e => { const host = e.target.closest && e.target.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.paper || e.target.closest('.q-pick,button,input')) return; e.preventDefault(); e.stopPropagation(); const w = pane.paper.toWorld(e.clientX, e.clientY); stop(); PEN3.place(pane, rec, Math.round(w.x), Math.round(w.y)); };
    const key = e => { if (e.key === 'Escape') stop(); };
    const stop = PEN3.stopPlace = () => { tip.remove(); document.body.classList.remove('il-placing'); document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true); PEN3.stopPlace = null; };
    setTimeout(() => { document.addEventListener('pointerdown', down, true); document.addEventListener('keydown', key, true); }, 0);
  },
};

{
  /* name / date: drag moves, double-click edits (mouse and pen) */
  let allowStamp = false;
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return; if (typeof LASSO2 !== 'undefined' && LASSO2.barrel(e)) return;
    const t = e.target.closest && e.target.closest('.box > .bh .blab, .box > .bh .stampbtn'); if (!t || document.activeElement === t) return;
    const box = t.closest('.box'), host = box && box.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.pointer || pane.travel) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return; off();
      pane.pointer({ button: 0, target: box, clientX: sx, clientY: sy, pointerId: e.pointerId, pointerType: e.pointerType, preventDefault() { }, stopPropagation() { } }); };
    const off = () => { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', off, true); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', off, true);
  }, true);
  document.addEventListener('click', e => { const st = e.target.closest && e.target.closest('.box > .bh .stampbtn'); if (st && !allowStamp) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('dblclick', e => { const t = e.target.closest && e.target.closest('.box > .bh .blab, .box > .bh .stampbtn'); if (!t) return; e.preventDefault(); e.stopPropagation();
    if (t.classList.contains('stampbtn')) { allowStamp = true; try { t.click(); } finally { allowStamp = false; } }
    else if (!t.readOnly) { t.focus(); t.select(); } }, true);

  /* while the pen writes, ink frames step aside */
  const st = INK.stroke; INK.stroke = function (pane, paper, e, lasso) { if (!lasso) { document.body.classList.add('ink-writing'); const end = ev => { if (ev.pointerId !== e.pointerId) return; document.body.classList.remove('ink-writing'); removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true); }; addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true); } return st.call(this, pane, paper, e, lasso); };

  /* the pen's button out of pen mode: a region */
  const ld = LASSO2.down; LASSO2.down = function (pane, paper, e) {
    if (INK.writing()) return ld.call(this, pane, paper, e);
    PEN3.loop(paper, e, poly => PEN3.region(pane, poly), ev => LASSO2.paste(pane, paper, ev)); return true; };

  /* right mouse button held + loop → ask */
  let eatMenu = 0;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 2) return; const paperEl = e.target.closest && e.target.closest('.paper'); const host = paperEl && paperEl.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.paper || pane.travel || !pane.docId) return;
    if (e.target.closest('input,textarea,[contenteditable="true"]')) return;
    PEN3.loop(pane.paper, e, (poly, ev) => { eatMenu = Date.now(); PEN3.ask(pane, poly, ev.clientX, ev.clientY); });
  }, true);
  document.addEventListener('contextmenu', e => { if (Date.now() - eatMenu < 600) { e.preventDefault(); e.stopPropagation(); } }, true);

  /* Cut, ☆ Save in the selection bar */
  const ps = INK.paintSel; INK.paintSel = function () { ps.call(this); const sel = INK.sel, pane = sel && sel.pane; if (!pane || !pane.paper) return; const bar = $('.ink-selbar', pane.paper.world); if (!bar || $('.ink-cut', bar)) return;
    const copy = [...$$('button', bar)].find(b => b.textContent === 'Copy');
    const cut = h('button.btn.xs.ink-cut', { title: 'Copy, then remove (hold the pen button and tap to paste)', on: { click: e => { e.stopPropagation(); if (LASSO2.copy()) INK.deleteSel(); } } }, 'Cut');
    const save = sel.items.length ? h('button.btn.xs', { title: 'Save this ink to the ink library', on: { click: e => { e.stopPropagation(); PEN3.saveSel(); } } }, '☆ Save') : null;
    copy ? copy.after(...[cut, save].filter(Boolean)) : bar.append(...[cut, save].filter(Boolean)); };
  // ⋯ on an ink component
  const im = WIDGETS.ink.menu; WIDGETS.ink.menu = b => [{ label: '☆ Save to ink library', sub: 'Place it again anywhere later', run: () => PEN3.saveBlock(M.block(b.id)) }, ...im(b)];
  // ☆ in the ink bar
  const bar = INK.bar; INK.bar = function (pane) { const r = bar.call(this, pane); const el = pane && pane.host && $('.ink-bar', pane.host); if (el && !$('.ink-libb', el)) { const b = h('button.ib-t.ink-libb', { title: 'Ink library — saved ink to place again', on: { click: () => PEN3.open(pane) } }, '☆'); const fb = $('.ink-filltool', el); fb ? fb.after(b) : el.append(b); } return r; };
  // + Insert → Saved ink
  INSERTS.push({ id: 'inklib', group: 'Writing', icon: '☆', label: 'Saved ink…', sub: 'From the ink library, placed here as a new ink component', run: (d, p, pane) => PEN3.open(pane || DocView, { x: Math.round(p.x), y: Math.round(p.y) }) });
}
