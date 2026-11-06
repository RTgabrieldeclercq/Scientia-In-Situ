/* ==========================================================================
   13zu2 · The selection does more (V3.950, Gabe's SiS Shaping, Phase E).
   • Bulk actions on a lasso or Ctrl+click selection, in its bar: Region
     around them, Move to another note… (a stub stays behind saying where
     they went), Pull into another note…, Tidy (align left · stack · grid),
     Connect all to…, Make them all a…, Fold / Unfold.
   • Connect all from one socket: dragging a wire from any selected
     component draws one from every selected component; one relation,
     chosen once, makes them all.
   • The relation offered first on a drop is the last one used from that
     kind of component (settings().relDefaults); Enter keeps it.
   • Copy and paste (CLIPX): text copied in a component carries where it
     came from; pasted on another note's canvas it is a pull-in reference
     (the same note: a copy with its structures); text copied from a PDF or
     an HTML page pasted on a canvas is a quote wired to the file; anything
     else pasted on a canvas is a new component. Inside a text, paste is
     plain text as before. Move to… leaves a stub with a link (my #8).
   ========================================================================== */
const BULK = {
  multi: null,
  pane: () => INK.sel && INK.sel.pane,
  blocks: () => (typeof LASSO2 === 'undefined' ? [] : LASSO2.boxes()).filter(b => b && b.status === 'live'),
  ids: () => BULK.blocks().map(b => b.id),
  doc: () => { const p = BULK.pane(); return p && M.doc(p.docId); },
  keep() { const sel = INK.sel; if (sel && typeof LASSO2 !== 'undefined' && LASSO2.keep) LASSO2.keep(sel); },
  region(name) { const d = BULK.doc(), ids = BULK.ids().filter(id => !REGION.isRg(id)); if (!d || !ids.length) return; const r = REGION.create(d, ids); if (name) r.name = name; REGION.save(d); changed(); toast('Region ' + r.name + ' · name it from its header'); },
  async moveTo() { const ids = BULK.ids(); if (!ids.length) return; const dest = await CMD.pick({ name: 'note', kind: 'note', ask: 'Move ' + plural(ids.length, 'component') + ' to…' }, '', CMD.ctx()); if (dest) BULK.move(ids, dest); },
  /** Move, then a stub where they were: "Moved to <note>", linked to the first of them. */
  async move(ids, dest) {
    const blocks = ids.map(M.block).filter(b => b && b.kind !== 'ink'), src = blocks.length && M.doc(blocks[0].docId); if (!src) return; if (dest.id === src.id) return toast('They are in this note already');
    const first = blocks.slice().sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0))[0], at = { x: first.x || 0, y: first.y || 0 };
    INK.clearSel(); MOVE.ask(blocks.map(b => b.id), dest.id, MOVE.spot(dest), true); await CMD.settle();
    const moved = M.block(first.id); if (!moved || moved.docId !== dest.id) return;
    const text = 'Moved to ' + dest.title, s = M.addBlock(src.id, null, { x: at.x, y: at.y, w: 300, label: '' });
    M.saveBlockBody(s, { text, marks: [{ id: uid('m'), type: 'link', from: 9, to: text.length, ref: first.id }] }); IX.rebuild(); changed();
  },
  async pullTo() { const ids = BULK.ids().filter(id => !REGION.isRg(id)); if (!ids.length) return; const dest = await CMD.pick({ name: 'note', kind: 'note', ask: 'Pull ' + plural(ids.length, 'component') + ' into…' }, '', CMD.ctx()); if (!dest) return;
    const d = BULK.doc(); if (dest.id === (d && d.id)) return toast('They are in this note already'); const p = MOVE.spot(dest); DB.beginGroup('pull');
    ids.forEach((id, i) => M.addBlock(dest.id, null, { kind: 'ref', refItemId: null, refBlockId: id, x: p.x, y: p.y + i * 150, w: 392 })); changed(); toast(plural(ids.length, 'component') + ' pulled into ' + dest.title); },
  tidy(mode) {
    const pane = BULK.pane(), B = BULK.blocks().filter(b => b.kind !== 'ink' && b.x != null); if (!pane || B.length < 2) return; DB.beginGroup('tidy');
    const x0 = Math.min(...B.map(b => b.x)), y0 = Math.min(...B.map(b => b.y)), W = Math.max(...B.map(b => b.w || 392)), order = B.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    if (mode === 'left') B.forEach(b => { b.x = x0; });
    else if (mode === 'stack') { let y = y0; order.forEach(b => { b.x = x0; b.y = Math.round(y / 14) * 14; y += pane.boxH(b.id) + 42; }); }
    else { const cols = Math.max(2, Math.ceil(Math.sqrt(order.length))), colH = []; order.forEach((b, i) => { const c = i % cols; colH[c] = colH[c] || y0; b.x = x0 + c * (W + 56); b.y = Math.round(colH[c] / 14) * 14; colH[c] += pane.boxH(b.id) + 42; }); }
    B.forEach(b => DB.put('blocks', b)); const w = pane.paper.world; w.classList.add('tidying'); setTimeout(() => w.classList.remove('tidying'), 320); BULK.keep(); changed();
  },
  async connectAll() { const ids = BULK.ids().filter(id => !REGION.isRg(id)); if (!ids.length) return; const pane = BULK.pane();
    const t = await CMD.pick({ name: 'to', kind: 'component', ask: 'Connect ' + plural(ids.length, 'component') + ' to…' }, '', CMD.ctx({ pane })); if (!t || ids.includes(t.id)) return;
    BULK.multi = { ids, until: Date.now() + 120000 }; pane.relationPopover(ids[0], t.id, innerWidth / 2 - 150, 180); },
  makeAll() { const B = BULK.blocks().filter(b => b.kind === 'component' && b.body && b.body.text.trim()); if (!B.length) return toast('Select text components first');
    pickModal('Make them all a…', plural(B.length, 'component') + ': each one, whole, becomes that structure.', KINDS.map(k => ({ label: k.label, run: () => { DB.beginGroup('struct'); let n = 0; B.forEach(b => { const cur = M.block(b.id), text = cur.body.text; if ((cur.body.marks || []).some(m => m.type === 'struct' && m.from === 0 && m.to === text.length)) return; const it = M.createItem(k.id, text.trim(), cur); M.saveBlockBody(cur, { text, marks: [...(cur.body.marks || []), { id: uid('m'), type: 'struct', from: 0, to: text.length, ref: it.id }] }); n++; }); IX.rebuild(); changed(); toast(plural(n, k.label.toLowerCase()) + ' recorded'); } }))); },
  fold(on) { const B = BULK.blocks().filter(b => b.kind !== 'ink'); DB.beginGroup('fold'); B.forEach(b => { b.collapsed = on ? true : undefined; DB.put('blocks', b); }); BULK.keep(); changed(); },
  relKey: id => { const b = M.block(id); return (b && (b.ckind || b.kind)) || 'component'; },
};
/* ---------- copy and paste ---------- */
const CLIPX = {
  TYPE: 'application/x-scientia+json', last: null, at: null,
  norm: s => String(s || '').replace(/\s+/g, ' ').trim(),
  copy(e) {
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed || !e.clipboardData) return; const n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode; if (!n || !n.closest) return;
    const ed = n.closest('.ed'), box = ed && ed.closest('.box.cmp[data-id]');
    if (box && ed.contentEditable === 'true') { const b = M.block(box.dataset.id), sel = ED.selection(ed); if (!b || !sel) return; const text = s.toString(); e.clipboardData.setData('text/plain', text); e.clipboardData.setData(CLIPX.TYPE, JSON.stringify({ kind: 'text', blockId: b.id, docId: b.docId, from: sel.from, to: sel.to, text })); e.preventDefault(); return; }
    if (n.closest('.q-slot')) { const q = QUOTE.pdfSel(); if (q) CLIPX.last = { kind: 'quote', sel: q, text: q.exact, at: Date.now() }; }
  },
  paste(e) {
    const t = e.target; if (t && t.closest && t.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"],math-field')) return; if ($('.ovl') || $('.pop')) return;
    const pane = CMD.ctx().pane; if (!pane || pane.travel || !pane.paper) return; const d = M.doc(pane.docId); if (!d) return;
    const raw = e.clipboardData && e.clipboardData.getData(CLIPX.TYPE), text = e.clipboardData && e.clipboardData.getData('text/plain'); if (!raw && !text) return; e.preventDefault();
    const at = CLIPX.spot(pane); let j = null; try { j = raw && JSON.parse(raw); } catch (x) { }
    if (j && j.kind === 'text' && M.block(j.blockId)) { const src = M.block(j.blockId); if (src.docId !== d.id && src.status === 'live') { M.addBlock(d.id, null, { kind: 'ref', refItemId: null, refBlockId: src.id, x: at.x, y: at.y, w: 392 }); changed(); toast('Pulled in from ' + ((M.doc(src.docId) || {}).title || 'its note')); return; } return CLIPX.component(d, at, j.text, src, j); }
    const L = CLIPX.last; if (L && L.kind === 'quote' && text && CLIPX.norm(L.text) === CLIPX.norm(text) && M.block(L.sel.src)) return CLIPX.quote(d, at, L.sel);
    if (text) CLIPX.component(d, at, text.replace(/\r/g, ''), null, null);
  },
  spot(pane) { const A = CLIPX.at; if (A && A.pane === pane && Date.now() - A.t < 60000) return { x: Math.round(A.x / 14) * 14, y: Math.round(A.y / 14) * 14 }; const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); return { x: Math.round((c.x - 196) / 14) * 14, y: Math.round((c.y - 60) / 14) * 14 }; },
  /** A new component; from a component of this note, its structures, terms and styles over the copied range come along. */
  component(d, at, text, src, j) {
    const b = M.addBlock(d.id, null, { x: at.x, y: at.y, w: 392, label: '' }); let marks = [];
    if (src && j && src.body) marks = (src.body.marks || []).filter(m => m.from < j.to && m.to > j.from && m.type !== 'cite' && m.type !== 'math').map(m => Object.assign({}, m, { id: uid('m'), from: Math.max(0, m.from - j.from), to: Math.min(text.length, m.to - j.from) })).filter(m => m.to > m.from);
    M.saveBlockBody(b, { text, marks }); IX.rebuild(); changed(); toast(src ? 'Copied as a component, with its structures' : 'Pasted as a component'); return b;
  },
  /** A quote in this note, wired to the file it came from (a PDF or an HTML page, in any note). */
  quote(d, at, sel) {
    const src = M.block(sel.src), rec = src.media && MEDIA.get(src.media);
    const b = M.addBlock(d.id, null, { x: at.x, y: at.y, w: 336, label: 'Quote' + (sel.page ? ' · p. ' + sel.page : ''), quote: { src: src.id, kind: src.kind, page: sel.page || null, exact: sel.exact, prefix: sel.prefix || '', suffix: sel.suffix || '', rects: sel.rects || null, file: rec ? rec.name : '', color: null } });
    M.saveBlockBody(b, { text: sel.exact, marks: [] }); M.wire(b.id, src.id, QUOTE.REL, true); IX.rebuild(); changed(); setTimeout(() => QUOTE.paintMarks(src.id), 120); toast('Quoted from ' + (rec ? rec.name : M.blockName(src))); return b;
  },
};
{
  // the selection's bar
  const ps = INK.paintSel; INK.paintSel = function () { ps.apply(this, arguments); const sel = INK.sel, pane = sel && sel.pane; if (!pane || !pane.paper) return; const B = BULK.blocks(); if (!B.length) return;
    const bar = $('.ink-selbar', pane.paper.world); if (!bar || $('.bulk-g', bar)) return; const X = (lab, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(e); } } }, lab);
    const g = h('span.bulk-g', X('Region', 'A region around them', () => BULK.region()), X('Move to…', 'Move them to another note; a stub stays here saying where they went', () => BULK.moveTo()), X('Pull into…', 'References to them in another note', () => BULK.pullTo()),
      X('Tidy ▾', 'Align left · stack · grid', e => ctxMenu(e.clientX, e.clientY + 8, [{ label: 'Align left', run: () => BULK.tidy('left') }, { label: 'Stack', sub: 'One under the other', run: () => BULK.tidy('stack') }, { label: 'Grid', run: () => BULK.tidy('grid') }])),
      X('Connect all…', 'One relation from every selected component to one you pick', () => BULK.connectAll()), X('Make them…', 'Each one, whole, a claim, a barrier, a question…', () => BULK.makeAll()),
      X(B.every(b => b.collapsed) ? 'Unfold' : 'Fold', 'Fold them to their titles, or open them', () => BULK.fold(!B.every(b => b.collapsed))));
    const del = $('.btn.danger', bar); del ? del.before(g) : bar.append(g); };
  // a wire dragged from a selected component comes from every selected one; the relation chosen once makes them all
  const wd = DocView.wireDrag; DocView.wireDrag = function (fromId, e) { const ids = BULK.ids(); if (ids.length > 1 && ids.includes(fromId)) BULK.multi = { ids: [fromId, ...ids.filter(x => x !== fromId)], until: Date.now() + 120000 }; else BULK.multi = null; return wd.apply(this, arguments); };
  const wire = M.wire; M.wire = function (from, to, rel, directed) {
    const w = wire.apply(this, arguments);
    try { if (rel && !/^c:quotes$|^comments$|^mentions$/.test(rel)) { const key = BULK.relKey(from), rd = Object.assign({}, settings().relDefaults || {}); if (rd[key] !== rel) { rd[key] = rel; saveSettings({ relDefaults: rd }); } } } catch (x) { }
    const Mu = BULK.multi; if (Mu && Date.now() < Mu.until && (Mu.ids[0] === from || Mu.ids[0] === to)) { BULK.multi = null; const rev = Mu.ids[0] === to; let n = 0; Mu.ids.slice(1).forEach(id => { if (id === from || id === to) return; wire.call(this, rev ? (from) : id, rev ? id : to, rel, directed); n++; }); if (n) toast('Connected ' + (n + 1) + ' · ' + ((REL[rel] || {}).label || rel)); }
    return w; };
  // the relation offered first is the last one used from that kind of component; Enter keeps it
  const rp = DocView.relationPopover; DocView.relationPopover = function (from, to, x, y) { const r = rp.apply(this, arguments);
    try { const def = (settings().relDefaults || {})[BULK.relKey(from)], R = def && REL[def], pop = $('.pop'); if (R && pop) { const opt = [...pop.querySelectorAll('.opts .opt')].find(o => (o.querySelector('b') || {}).textContent === R.label); if (opt) { opt.classList.add('on'); opt.parentNode.prepend(opt); const own = $('.rel-own', pop); own && own.addEventListener('keydown', e => { if (e.key === 'Enter' && !own.value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); opt.click(); } }, true); } } } catch (x) { }
    return r; };
  // where the pointer last was on a note, for a paste; the HTML page's selection, for a quote
  document.addEventListener('pointermove', e => { const host = e.target && e.target.closest && e.target.closest('.canvas-host'); if (host && host._dv && host._dv.paper) { const p = host._dv.paper.toWorld(e.clientX, e.clientY); CLIPX.at = { pane: host._dv, x: p.x, y: p.y, t: Date.now() }; } }, true);
  addEventListener('message', e => { const d = e.data; if (!d || d.sis !== 'sel' || !d.text) return; const fr = [...document.querySelectorAll('iframe')].find(f => f.contentWindow === e.source); if (fr && fr._qsrc) CLIPX.last = { kind: 'quote', sel: { src: fr._qsrc, exact: d.text, prefix: d.prefix || '', suffix: d.suffix || '' }, text: d.text, at: Date.now() }; });
  document.addEventListener('copy', e => { try { CLIPX.copy(e); } catch (x) { } }, true);
  document.addEventListener('paste', e => { try { CLIPX.paste(e); } catch (x) { console.warn('[paste]', x); } }, true);
}
