/* ==========================================================================
   13z · Holding several selections at once. Hold Ctrl while you select (drag
   or double-click) and what you selected before stays highlighted — in the
   same component or in others. Then, on every piece at once:
     Ctrl+B / Alt+I / Ctrl+U  style · Ctrl+C copy (one piece per line) ·
     Backspace / Delete  remove · Alt+W (Ctrl+W in Focus)  one term for all ·
     Ctrl+Enter or right-click  a menu with those and "Link all to a note…".
   A click without Ctrl, typing, or Esc lets them go.
   ========================================================================== */
const MSEL = {
  pieces: [], // { blockId, from, to }
  edOf(id) { const all = $$(`.box[data-id="${id}"] > .ed, .box[data-id="${id}"] .ed`); return all.find(e => e.isConnected) || null; },
  /** The current browser selection as a piece, when it lies inside one component. */
  live() {
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return null;
    const n = s.anchorNode, el = n && (n.nodeType === 3 ? n.parentElement : n).closest('.box .ed'); if (!el || !el.contains(s.focusNode)) return null;
    const box = el.closest('.box'), sel = ED.selection(el); if (!box || !sel || sel.collapsed) return null;
    return { blockId: box.dataset.id, from: sel.from, to: sel.to };
  },
  /** Everything held plus what is selected right now. */
  all() { const L = MSEL.live(), out = MSEL.pieces.slice(); if (L && !out.some(p => p.blockId === L.blockId && p.from === L.from && p.to === L.to)) out.push(L); return out; },
  active() { return MSEL.pieces.length > 0; },
  add(p) {
    if (!p) return; const same = MSEL.pieces.filter(x => x.blockId === p.blockId), rest = MSEL.pieces.filter(x => x.blockId !== p.blockId);
    let a = p.from, z = p.to; const keep = []; same.forEach(x => { if (x.to < a || x.from > z) keep.push(x); else { a = Math.min(a, x.from); z = Math.max(z, x.to); } });
    MSEL.pieces = [...rest, ...keep, { blockId: p.blockId, from: a, to: z }]; MSEL.paint();
  },
  clear() { if (!MSEL.pieces.length) return; MSEL.pieces = []; MSEL.paint(); },
  paint() {
    if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
    const rs = []; MSEL.pieces.forEach(p => { const el = MSEL.edOf(p.blockId); if (!el) return; try { const [n1, o1] = ED.domPos(el, p.from), [n2, o2] = ED.domPos(el, p.to), r = new Range(); r.setStart(n1, o1); r.setEnd(n2, o2); rs.push(r); } catch {} });
    if (rs.length) CSS.highlights.set('msel', new Highlight(...rs)); else CSS.highlights.delete('msel');
  },
  /** Text of every piece. */
  texts(ps) { return ps.map(p => { const el = MSEL.edOf(p.blockId), b = M.block(p.blockId); const t = el ? ED.read(el, b.body.marks).text : b.body.text; return t.slice(p.from, p.to).replace(/￼/g, ''); }); },
  /** Change each touched component once: fn(body, piecesInIt) → new body. */
  edit(ps, fn) {
    const by = groupBy(ps, p => p.blockId);
    Object.entries(by).forEach(([id, list]) => { const b = M.block(id), el = MSEL.edOf(id); if (!b) return; if (el && el.contentEditable !== 'true') return;
      const body = el ? ED.read(el, b.body.marks) : { text: b.body.text, marks: (b.body.marks || []).slice() };
      const nb = fn(body, list.slice().sort((x, y) => y.from - x.from)); if (!nb) return;
      M.saveBlockBody(b, typeof WRITE !== 'undefined' ? WRITE.renumber(nb, 0).body : nb); if (el) ED.render(el, M.block(id)); });
    IX.rebuild(); changed();
  },
  style(s) {
    const ps = MSEL.all(); if (!ps.length) return;
    const cov = {}; ps.forEach(p => { const el = MSEL.edOf(p.blockId), b = M.block(p.blockId); cov[p.blockId] = cov[p.blockId] || (el ? ED.read(el, b.body.marks) : b.body); });
    const covered = p => { const body = cov[p.blockId], F = body.marks.filter(m => m.type === 'fmt' && m.s === s); for (let i = p.from; i < p.to; i++) if (body.text[i] !== '\n' && !F.some(m => m.from <= i && m.to > i)) return false; return true; };
    const off = ps.every(covered);
    MSEL.edit(ps, (body, list) => { let marks = body.marks.slice();
      list.forEach(p => { const F = marks.filter(m => m.type === 'fmt' && m.s === s); marks = marks.filter(m => !(m.type === 'fmt' && m.s === s));
        if (off) F.forEach(m => { if (m.to <= p.from || m.from >= p.to) marks.push(m); else { if (m.from < p.from) marks.push({ id: uid('m'), type: 'fmt', s, from: m.from, to: p.from }); if (m.to > p.to) marks.push({ id: uid('m'), type: 'fmt', s, from: p.to, to: m.to }); } });
        else { let a = p.from, z = p.to; F.forEach(m => { if (m.to < a || m.from > z) marks.push(m); else { a = Math.min(a, m.from); z = Math.max(z, m.to); } }); marks.push({ id: uid('m'), type: 'fmt', s, from: a, to: z }); } });
      return { text: body.text, marks }; });
    MSEL.pieces = ps; requestAnimationFrame(() => MSEL.paint());
    toast(`${off ? 'Removed' : 'Applied'} ${WRITE.STYLE[s]} on ${plural(ps.length, 'piece')}`);
  },
  copy(ps = MSEL.all()) { const t = MSEL.texts(ps).join('\n'); if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {}); return t; },
  del() {
    const ps = MSEL.all(); if (!ps.length) return;
    MSEL.edit(ps, (body, list) => { let nb = body; list.forEach(p => { nb = ED.splice(nb, p.from, p.to - p.from, ''); }); return nb; });
    MSEL.pieces = []; MSEL.paint(); toast('Removed ' + plural(ps.length, 'piece'));
  },
  trim(text, p) { let a = p.from, z = p.to; while (a < z && /\s/.test(text[a])) a++; while (z > a && /\s/.test(text[z - 1])) z--; return { a, z }; },
  term() {
    const ps = MSEL.all(); if (!ps.length) return; const first = ps[0], label = MSEL.texts([first])[0].trim(); if (!label) return;
    const d = M.doc(M.block(first.blockId).docId), t = M.findOrCreateTerm(d.projectId || (DB.all('projects')[0] || {}).id, label);
    MSEL.edit(ps, (body, list) => { const marks = body.marks.slice(); list.forEach(p => { const { a, z } = MSEL.trim(body.text, p); if (z > a && !marks.some(m => m.type === 'term' && m.from === a && m.to === z)) marks.push({ id: uid('m'), type: 'term', from: a, to: z, ref: t.id }); }); return { text: body.text, marks }; });
    MSEL.pieces = []; MSEL.paint(); toast(`${plural(ps.length, 'piece')} marked as the term “${t.label}”`);
  },
  link() {
    const ps = MSEL.all(); if (!ps.length) return; const first = ps[ps.length - 1], el = MSEL.edOf(first.blockId), b = M.block(first.blockId); if (!el) return;
    const [n, o] = ED.domPos(el, first.to), r = document.createRange(); r.setStart(n, o); const rc = r.getBoundingClientRect(), rect = rc.width || rc.height ? rc : el.getBoundingClientRect();
    ED.linkPicker(el, b, { from: first.from, to: first.to, rect }, tg => {
      MSEL.edit(ps, (body, list) => { const marks = body.marks.slice(); list.forEach(p => { const { a, z } = MSEL.trim(body.text, p); if (z > a) marks.push(Object.assign({ id: uid('m'), type: 'link', from: a, to: z }, tg)); }); return { text: body.text, marks }; });
      MSEL.pieces = []; MSEL.paint(); toast('Linked ' + plural(ps.length, 'piece'));
    });
  },
  menu(x, y) {
    const ps = MSEL.all(); if (!ps.length) return;
    ctxMenu(x, y, [{ head: plural(ps.length, 'selected piece') }, { label: 'Bold', key: 'Ctrl+B', run: () => MSEL.style('b') }, { label: 'Italic', key: 'Alt+I', run: () => MSEL.style('i') }, { label: 'Underline', key: 'Ctrl+U', run: () => MSEL.style('u') }, 'sep',
      { label: 'Mark all as one term', key: keyLabel(settings().termKey), run: () => MSEL.term() }, { label: 'Link all to a note…', run: () => MSEL.link() }, 'sep',
      { label: 'Copy', key: 'Ctrl+C', run: () => { MSEL.copy(ps); toast('Copied ' + plural(ps.length, 'piece')); } }, { label: 'Delete them', key: 'Del', danger: true, run: () => MSEL.del() }]);
  },
};
{
  // Ctrl held while a selection ends: keep it
  let ctrlDown = false;
  document.addEventListener('mousedown', e => {
    ctrlDown = e.ctrlKey || e.metaKey;
    if (e.button !== 0 || ctrlDown || !MSEL.active()) return;
    if (e.target.closest('.pop,.menu,.modal,.ctx')) return;
    MSEL.clear();
  }, true);
  let start = null;
  const at = (x, y) => { const p = document.caretPositionFromPoint ? document.caretPositionFromPoint(x, y) : null; if (p) return [p.offsetNode, p.offset]; const r = document.caretRangeFromPoint && document.caretRangeFromPoint(x, y); return r ? [r.startContainer, r.startOffset] : null; };
  document.addEventListener('mousedown', e => { // the selection about to be replaced is held before a Ctrl+drag starts
    start = null; if (e.button !== 0 || !(e.ctrlKey || e.metaKey) || !e.target.closest('.box .ed')) return;
    hideHover(); const L = MSEL.live(); if (L) MSEL.add(L); start = { x: e.clientX, y: e.clientY, ed: e.target.closest('.box .ed') };
  }, true);
  document.addEventListener('mouseup', e => { if (!(e.ctrlKey || e.metaKey) || !ctrlDown) return; const st = start; start = null;
    setTimeout(() => { let L = MSEL.live();
      // a browser that does not select while Ctrl is held: make the selection from where the drag began and ended
      if (!L && st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 4) { const a = at(st.x, st.y), z = at(e.clientX, e.clientY);
        if (a && z && st.ed.contains(a[0]) && st.ed.contains(z[0])) { try { getSelection().setBaseAndExtent(a[0], a[1], z[0], z[1]); } catch {} L = MSEL.live(); } }
      if (L) MSEL.add(L); }, 0); }, true);
  document.addEventListener('dblclick', e => { if (!(e.ctrlKey || e.metaKey)) return; setTimeout(() => { const L = MSEL.live(); if (L) MSEL.add(L); }, 0); }, true);
  document.addEventListener('keydown', e => {
    if (!MSEL.active()) return; const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (mod && !e.altKey && !e.shiftKey && k === 'b') { stop(); return MSEL.style('b'); }
    if (mod && !e.altKey && !e.shiftKey && k === 'u') { stop(); return MSEL.style('u'); }
    if (e.altKey && !mod && !e.shiftKey && e.code === 'KeyI') { stop(); return MSEL.style('i'); }
    if (ED.termKeyHit(e)) { stop(); return MSEL.term(); }
    if (mod && e.key === 'Enter') { stop(); const s = getSelection(), r = s.rangeCount ? s.getRangeAt(0).getBoundingClientRect() : { left: innerWidth / 2, bottom: 200 }; return MSEL.menu(r.left, r.bottom + 8); }
    if (mod && k === 'c') { stop(); MSEL.copy(); return toast('Copied ' + plural(MSEL.all().length, 'piece')); }
    if (!mod && (e.key === 'Backspace' || e.key === 'Delete')) { stop(); return MSEL.del(); }
    if (e.key === 'Escape') { MSEL.clear(); return; }
    if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key) || mod) return;
    MSEL.clear(); // typing lets them go
  }, true);
  document.addEventListener('contextmenu', e => { if (!MSEL.active() || !e.target.closest('.box .ed')) return; e.preventDefault(); e.stopPropagation(); MSEL.menu(e.clientX, e.clientY + 6); }, true);
  // keep the highlight on the text after the canvas redraws
  const refresh = App.refresh; App.refresh = function (...a) { const r = refresh.apply(this, a); if (MSEL.active()) requestAnimationFrame(() => MSEL.paint()); return r; };
}
