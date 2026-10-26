/* ==========================================================================
   13zu · The pen's button. Holding the Slim Pen's barrel button makes the
   pen a lasso, whatever tool is on: loop around ink and components to
   select them. With a selection:
   • drag inside it to move (components too); corner handles scale (keep
     proportions; hold the pen button — or Shift — to stretch freely), side
     handles stretch one way, the round handle on top rotates (snaps every
     15° when near). Ink only: components stay upright and their size.
   • a width or colour in the ink bar applies to the selected strokes.
   • the bar: Copy, Duplicate, Flip ↔ / ↕, Pen ↔ Highlighter, colours,
     Convert to text, Connect / Merge, Delete.
   • copy: Copy in the bar, Ctrl+C, or button held + tap on the selection.
   Paste: button held + tap anywhere — copied ink and components land at
   the tap; copied text (from the app or elsewhere) becomes a new text
   component there, or goes into a component's text where you tap in it.
   ========================================================================== */
const LASSO2 = {
  barrel: e => e.pointerType === 'pen' && ((e.buttons & 2) === 2 || e.button === 2),
  clip: null,      // { strokes: [{s, x, y}] (world points), boxes: [block copies], box: {x, y, w, h}, text, at }
  boxes: () => (INK.sel && INK.sel.boxes || []).map(M.block).filter(b => b && b.status === 'live'),
  rectOf(pane, id) { return pane.rectOf ? pane.rectOf(id) : null; },

  /* ---------- the barrel-button pen ---------- */
  down(pane, paper, e) {
    const wp = paper.toWorld(e.clientX, e.clientY), sx = e.clientX, sy = e.clientY; let moved = false, onSel = INK.sel && INK.sel.docId === pane.docId && INK.inSel(wp);
    if (onSel) { // drag = move it; tap = copy it
      const mv0 = ev => { if (ev.pointerId !== e.pointerId) return; if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { cleanup(); LASSO2.move(pane, paper, e, wp); } };
      const up0 = ev => { if (ev.pointerId !== e.pointerId) return; cleanup(); LASSO2.copy(); };
      const cleanup = () => { removeEventListener('pointermove', mv0, true); removeEventListener('pointerup', up0, true); };
      addEventListener('pointermove', mv0, true); addEventListener('pointerup', up0, true); return true;
    }
    const svg = INK.live(paper), path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', 'ink-lasso'); svg.appendChild(path); const poly = [[wp.x, wp.y]];
    INK.drawing = e.pointerId; try { paper.el.setPointerCapture(e.pointerId); } catch { }
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault(); if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      ((ev.getCoalescedEvents && ev.getCoalescedEvents().length) ? ev.getCoalescedEvents() : [ev]).forEach(q => { const p = paper.toWorld(q.clientX, q.clientY); poly.push([p.x, p.y]); });
      path.setAttribute('d', 'M' + poly.map(p => p[0] + ',' + p[1]).join('L') + 'Z'); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; INK.drawing = null; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); path.remove();
      if (ev.type === 'pointercancel') return;
      if (!moved) return LASSO2.paste(pane, paper, ev);
      if (INK.sel) INK.clearSel(); INK.lassoSelect(pane, poly); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
    return true;
  },

  /* ---------- selecting components too ---------- */
  boxesIn(pane, poly) {
    return $$(':scope > .box.cmp', pane.paper.world).filter(el => !el.classList.contains('w-ink') && el.dataset.id && el.dataset.id[0] !== '_').filter(el => {
      const x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, hh = el.offsetHeight, pts = [[x + w / 2, y + hh / 2], [x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + hh - 4], [x + w - 4, y + hh - 4]];
      return INK.inPoly(pts[0][0], pts[0][1], poly) && pts.slice(1).filter(p => INK.inPoly(p[0], p[1], poly)).length >= 3; }).map(el => el.dataset.id);
  },

  /* ---------- move (ink + components) ---------- */
  move(pane, paper, e, wp0) {
    const sel = INK.sel, paths = sel.items.map(x => $(`:scope > .box[data-id="${x.id}"] .ink-svg path[data-i="${x.i}"]`, paper.world)).filter(Boolean), bx = LASSO2.boxes().map(b => ({ b, el: $(`:scope > .box[data-id="${b.id}"]`, paper.world), x: b.x || 0, y: b.y || 0 }));
    let d = { x: 0, y: 0 }; INK.drawing = e.pointerId;
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault(); const p = paper.toWorld(ev.clientX, ev.clientY); d = { x: p.x - wp0.x, y: p.y - wp0.y };
      paths.forEach(pt => pt.setAttribute('transform', `translate(${d.x},${d.y})`)); bx.forEach(o => { if (o.el) { o.el.style.left = (o.x + d.x) + 'px'; o.el.style.top = (o.y + d.y) + 'px'; } });
      $$('.ink-selbox', paper.world).forEach(x => x.style.transform = `translate(${d.x}px,${d.y}px)`); pane.drawWires && pane.drawWires(); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; INK.drawing = null; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true);
      if (Math.hypot(d.x, d.y) < 1) return; DB.beginGroup('ink');
      INK.selStrokes().forEach(({ s }) => s.p.forEach(p => { p[0] = INK.r1(p[0] + d.x); p[1] = INK.r1(p[1] + d.y); }));
      new Set(sel.items.map(x => x.id)).forEach(id => { const b = M.block(id); INK.fit(b); DB.put('blocks', b); });
      bx.forEach(o => { const b = M.block(o.b.id); b.x = Math.round((o.x + d.x) / 14) * 14; b.y = Math.round((o.y + d.y) / 14) * 14; DB.put('blocks', b); });
      LASSO2.keep(sel); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },
  keep(sel) { changed(); setTimeout(() => { INK.sel = sel; INK.paintSel(); }, 60); },

  /* ---------- scale / stretch / rotate the ink ---------- */
  inkBox() { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; INK.selStrokes().forEach(({ b, s }) => s.p.forEach(p => { x0 = Math.min(x0, b.x + p[0]); y0 = Math.min(y0, b.y + p[1]); x1 = Math.max(x1, b.x + p[0]); y1 = Math.max(y1, b.y + p[1]); })); return x0 < 1e9 ? { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) } : null; },
  handle(pane, kind, e) {
    e.preventDefault(); e.stopPropagation(); const paper = pane.paper, sel = INK.sel, B = LASSO2.inkBox(); if (!B) return;
    const c = { x: B.x + B.w / 2, y: B.y + B.h / 2 }, anchor = { x: kind.includes('w') ? B.x + B.w : kind.includes('e') ? B.x : c.x, y: kind.includes('n') ? B.y + B.h : kind.includes('s') ? B.y : c.y };
    const w0 = paper.toWorld(e.clientX, e.clientY), a0 = Math.atan2(w0.y - c.y, w0.x - c.x);
    const paths = sel.items.map(x => { const el = $(`:scope > .box[data-id="${x.id}"] .ink-svg path[data-i="${x.i}"]`, paper.world); if (!el) return null; const svg = el.ownerSVGElement, r = svg.getBoundingClientRect(), o = paper.toWorld(r.left, r.top); return { el, o }; }).filter(Boolean);
    let M0 = null; INK.drawing = e.pointerId;
    const mat = ev => { const w = paper.toWorld(ev.clientX, ev.clientY);
      if (kind === 'rot') { let a = Math.atan2(w.y - c.y, w.x - c.x) - a0; const deg = a * 180 / Math.PI, near = Math.round(deg / 15) * 15; if (Math.abs(deg - near) < 4) a = near * Math.PI / 180; const k = Math.cos(a), s = Math.sin(a); return { m: [k, s, -s, k], o: c, deg: Math.round(a * 180 / Math.PI) }; }
      let sx = 1, sy = 1; const fx = kind.includes('e') ? 1 : kind.includes('w') ? -1 : 0, fy = kind.includes('s') ? 1 : kind.includes('n') ? -1 : 0;
      if (fx) sx = Math.max(.05, (fx * (w.x - anchor.x)) / B.w); if (fy) sy = Math.max(.05, (fy * (w.y - anchor.y)) / B.h);
      const corner = fx && fy, free = LASSO2.barrel(ev) || ev.shiftKey; if (corner && !free) { const s = Math.max(sx, sy); sx = sy = s; }
      return { m: [sx, 0, 0, sy], o: anchor, sc: [sx, sy] }; };
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault(); M0 = mat(ev); const [a, b, cc, d] = M0.m, o = M0.o;
      paths.forEach(({ el, o: so }) => el.setAttribute('transform', `translate(${o.x - so.x},${o.y - so.y}) matrix(${a},${b},${cc},${d},0,0) translate(${so.x - o.x},${so.y - o.y})`));
      const tag = $('.ink-xf-tag', paper.world); if (tag) tag.textContent = M0.deg != null ? M0.deg + '°' : `${Math.round(M0.sc[0] * 100)}% × ${Math.round(M0.sc[1] * 100)}%`; };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; INK.drawing = null; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); if (!M0) return;
      const [a, b, cc, d] = M0.m, o = M0.o; DB.beginGroup('ink');
      INK.selStrokes().forEach(({ b: blk, s }) => { s.p.forEach(p => { const x = blk.x + p[0] - o.x, y = blk.y + p[1] - o.y; p[0] = INK.r1(o.x + a * x + cc * y - blk.x); p[1] = INK.r1(o.y + b * x + d * y - blk.y); }); if (s.geo || s.shape) { delete s.br; s.geo = s.geo; } });
      new Set(sel.items.map(x => x.id)).forEach(id => { const blk = M.block(id); INK.fit(blk); DB.put('blocks', blk); }); LASSO2.keep(sel); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },

  /* ---------- the selection bar's actions ---------- */
  setWidth(k) { if (!INK.sel) return; DB.beginGroup('ink'); INK.selStrokes().forEach(({ s }) => { if (!s.hl) s.w = INK.WIDTHS[k] || s.w; }); new Set(INK.sel.items.map(x => x.id)).forEach(id => { const b = M.block(id); INK.fit(b); DB.put('blocks', b); }); LASSO2.keep(INK.sel); },
  flip(axis) { const B = LASSO2.inkBox(); if (!B) return; DB.beginGroup('ink'); const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    INK.selStrokes().forEach(({ b, s }) => s.p.forEach(p => { if (axis === 'x') p[0] = INK.r1(2 * cx - (b.x + p[0]) - b.x); else p[1] = INK.r1(2 * cy - (b.y + p[1]) - b.y); }));
    new Set(INK.sel.items.map(x => x.id)).forEach(id => { const b = M.block(id); INK.fit(b); DB.put('blocks', b); }); LASSO2.keep(INK.sel); },
  toggleHl() { const S = INK.selStrokes(); if (!S.length) return; const toHl = S.some(({ s }) => !s.hl); DB.beginGroup('ink');
    S.forEach(({ s }) => { if (toHl) { s.hl = true; s.w = 14; delete s.pr; delete s.o; } else { delete s.hl; s.w = INK.WIDTHS[INK.width] || 2.4; } });
    new Set(INK.sel.items.map(x => x.id)).forEach(id => { const b = M.block(id); INK.fit(b); DB.put('blocks', b); }); LASSO2.keep(INK.sel); toast(toHl ? 'Now highlighter strokes' : 'Now pen strokes'); },
  copy() {
    if (!INK.sel) return; const strokes = INK.selStrokes().map(({ b, s }) => ({ s: JSON.parse(JSON.stringify(s)), x: b.x, y: b.y })), boxes = LASSO2.boxes().filter(b => !['protocol', 'run', 'timer', 'rec'].includes(b.kind)).map(b => JSON.parse(JSON.stringify(b)));
    let x0 = 1e9, y0 = 1e9; strokes.forEach(({ s, x, y }) => s.p.forEach(p => { x0 = Math.min(x0, x + p[0]); y0 = Math.min(y0, y + p[1]); })); boxes.forEach(b => { x0 = Math.min(x0, b.x || 0); y0 = Math.min(y0, b.y || 0); });
    const text = boxes.map(b => (b.body && b.body.text) || '').filter(Boolean).join('\n\n');
    LASSO2.clip = { strokes, boxes, at: Date.now(), x0, y0, text }; LASSO2.lastText = null;
    try { navigator.clipboard && navigator.clipboard.writeText(text || '​').catch(() => { }); } catch { }
    const n = strokes.length + boxes.length; toast(`Copied ${[strokes.length ? plural(strokes.length, 'stroke') : '', boxes.length ? plural(boxes.length, 'component') : ''].filter(Boolean).join(' and ')} — hold the pen button and tap to paste`, 3200); return n;
  },
  /** Put the clip down with its top-left at (x, y) in pane's note; returns the new selection. */
  drop(pane, x, y) {
    const C = LASSO2.clip; if (!C) return null; const d = M.doc(pane.docId); if (!d) return null; const dx = x - C.x0, dy = y - C.y0; DB.beginGroup('paste'); const sel = { docId: pane.docId, items: [], boxes: [], pane };
    if (C.strokes.length) { _suppress++; const b = M.addBlock(d.id, null, { kind: 'ink', label: '', x: x, y: y, w: 60, inkH: 60, ink: { strokes: [] } }); _suppress--; b.body = { text: '', marks: [] };
      C.strokes.forEach(({ s, x: bx, y: by }) => { const n = JSON.parse(JSON.stringify(s)); n.p = n.p.map(p => [INK.r1(bx + p[0] + dx - b.x), INK.r1(by + p[1] + dy - b.y), p[2]]); b.ink.strokes.push(n); });
      INK.fit(b); DB.put('blocks', b); sel.items = b.ink.strokes.map((_, i) => ({ id: b.id, i })); }
    C.boxes.forEach(src => { const init = JSON.parse(JSON.stringify(src)); ['id', 'docId', 'created', 'modified', 'status', 'supersedes', 'parent', 'sessionId', 'registered', 'anchor'].forEach(k => delete init[k]);
      init.x = Math.round(((src.x || 0) + dx) / 14) * 14; init.y = Math.round(((src.y || 0) + dy) / 14) * 14;
      const body = init.body ? { text: init.body.text || '', marks: (init.body.marks || []).filter(m => m.type !== 'struct') } : { text: '', marks: [] }; delete init.body;
      _suppress++; const nb = M.addBlock(d.id, null, init); _suppress--; nb.body = body; DB.put('blocks', nb); sel.boxes.push(nb.id); });
    M.touchDoc(d); IX.rebuild(); changed(); setTimeout(() => { INK.sel = sel.items.length || sel.boxes.length ? sel : null; INK.sel && INK.paintSel(); }, 80); return sel;
  },
  duplicate() { const pane = INK.sel && INK.sel.pane; if (!pane || !LASSO2.copy()) return; const C = LASSO2.clip; LASSO2.drop(pane, C.x0 + 28, C.y0 + 28); },
  async paste(pane, paper, ev) {
    const wp = paper.toWorld(ev.clientX, ev.clientY), C = LASSO2.clip;
    let sys = null; try { sys = navigator.clipboard && navigator.clipboard.readText ? await navigator.clipboard.readText() : null; } catch { }
    const mine = C && (sys == null || sys === (C.text || '​') || (LASSO2.lastText && LASSO2.lastText.at < C.at && sys === LASSO2.lastText.text));
    if (mine && C && (C.strokes.length || C.boxes.length)) { LASSO2.drop(pane, wp.x, wp.y); toast('Pasted'); return; }
    const text = (sys != null && sys !== '​' ? sys : LASSO2.lastText && LASSO2.lastText.text) || ''; if (!text.trim()) return toast('Nothing copied yet — select with the pen button held, then Copy');
    // tapped inside a component's text: insert there
    const ed = document.elementsFromPoint(ev.clientX, ev.clientY).map(x => x.closest && x.closest('.box .ed[contenteditable="true"]')).find(Boolean);
    if (ed) { ed.focus(); const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(ev.clientX, ev.clientY) : null; if (r) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); } document.execCommand('insertText', false, text.replace(/\r/g, '')); toast('Pasted into the text'); return; }
    const nb = pane.newAt(wp.x, wp.y, true); M.saveBlockBody(nb, { text: text.replace(/\r/g, '').trim(), marks: [] }); IX.rebuild(); changed(); toast('Pasted as a new component');
  },
};

{
  /* the barrel button first: lasso / copy / paste, whatever tool is on and wherever it starts */
  const pd = INK.penDown; INK.penDown = function (paper, e) {
    if (LASSO2.barrel(e) && !(typeof PENERASE !== 'undefined' && PENERASE.isEraser(e))) { const host = paper.el.closest('.canvas-host'), pane = host && host._dv; if (pane && pane.docId && !pane.travel && M.doc(pane.docId) && !(e.target.closest && e.target.closest('button,input,select,textarea,a,.pop,.ink-bar,.ink-selbar,.ink-h'))) return LASSO2.down(pane, paper, e); }
    if (e.target.closest && e.target.closest('.ink-h')) return false;
    if (INK.sel && e.pointerType === 'pen') { const host = paper.el.closest('.canvas-host'), pane = host && host._dv, wp = paper.toWorld(e.clientX, e.clientY); if (pane && INK.sel.docId === pane.docId && INK.inSel(wp) && LASSO2.boxes().length) { LASSO2.move(pane, paper, e, wp); return true; } }
    return pd.call(this, paper, e); };
  // the plain lasso tool also moves components with the ink
  const ms = INK.moveSel; INK.moveSel = function (pane, paper, e, wp0) { if (LASSO2.boxes().length) return LASSO2.move(pane, paper, e, wp0); return ms.call(this, pane, paper, e, wp0); };
  // the lasso takes components it surrounds
  const ls = INK.lassoSelect; INK.lassoSelect = function (pane, poly) {
    const boxes = poly.length >= 3 ? LASSO2.boxesIn(pane, poly) : []; const t0 = toast; let none = false; toast = (m, ...a) => { if (/Nothing inside/.test(m)) { none = true; return; } return t0(m, ...a); };
    try { ls.call(this, pane, poly); } finally { toast = t0; }
    if (boxes.length) { if (!INK.sel) INK.sel = { docId: pane.docId, items: [], pane }; INK.sel.boxes = boxes; INK.paintSel(); }
    else if (none) toast('Nothing inside the lasso'); };
  // the selection's box includes its components
  const sb = INK.selBox; INK.selBox = function () { const r = INK.selStrokes().length ? sb.call(INK) : null; const B = LASSO2.boxes(), pane = INK.sel && INK.sel.pane; if (!B.length || !pane) return r || { x: 0, y: 0, w: 0, h: 0 };
    let x0 = r ? r.x : 1e9, y0 = r ? r.y : 1e9, x1 = r ? r.x + r.w : -1e9, y1 = r ? r.y + r.h : -1e9; B.forEach(b => { const q = pane.rectOf(b.id) || { x: b.x, y: b.y, w: b.w || 392, h: 120 }; x0 = Math.min(x0, q.x - 6); y0 = Math.min(y0, q.y - 6); x1 = Math.max(x1, q.x + q.w + 6); y1 = Math.max(y1, q.y + q.h + 6); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  // delete takes the components too
  const del = INK.deleteSel; INK.deleteSel = function () { const B = LASSO2.boxes(); if (B.length) { DB.beginGroup('ink'); B.forEach(b => { if (b.kind === 'ref') M.removeRef(b); else { b.status = 'removed'; b.removedAt = isoLocal(new Date()); DB.put('blocks', b); } }); }
    if (INK.sel && INK.sel.items.length) return del.call(this); const n = B.length; INK.clearSel(); changed(); if (n) toast(plural(n, 'component') + ' removed · Ctrl+Z undoes'); };
  const cs = INK.clearSel; INK.clearSel = function () { $$('.box.lsel').forEach(x => x.classList.remove('lsel')); return cs.call(this); };
  // handles + the extra buttons
  const ps = INK.paintSel; INK.paintSel = function () { ps.call(this); const sel = INK.sel, pane = sel && sel.pane; if (!pane || !pane.paper) return;
    LASSO2.boxes().forEach(b => { const el = $(`:scope > .box[data-id="${b.id}"]`, pane.paper.world); el && el.classList.add('lsel'); });
    const bar = $('.ink-selbar', pane.paper.world); if (bar) { const cnt = $('.tiny', bar), nb = LASSO2.boxes().length, ns = sel.items.length; if (cnt) cnt.textContent = [ns ? plural(ns, 'stroke') : '', nb ? plural(nb, 'component') : ''].filter(Boolean).join(' + ');
      const B = (lab, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(); } } }, lab);
      const extra = [B('Copy', 'Copy (Ctrl+C) — then hold the pen button and tap to paste', () => LASSO2.copy()), B('Duplicate', 'A copy beside it, selected', () => LASSO2.duplicate()),
        ns ? B('⇋', 'Flip left–right', () => LASSO2.flip('x')) : null, ns ? B('⇵', 'Flip upside down', () => LASSO2.flip('y')) : null,
        ns ? B(INK.selStrokes().every(({ s }) => s.hl) ? '✎ Pen' : '▍ Highlighter', 'Turn the strokes into highlighter strokes or back', () => LASSO2.toggleHl()) : null].filter(Boolean);
      const del2 = $('.btn.danger', bar); del2 ? del2.before(...extra) : bar.append(...extra);
      if (!ns) { const cv = $('.btn.pri', bar); cv && /Convert/.test(cv.textContent) && cv.remove(); const sw = $('.ink-sw', bar); sw && sw.remove(); } }
    if (!sel.items.length) return;
    const R = LASSO2.inkBox(); if (!R) return; const pad = 8, x0 = R.x - pad, y0 = R.y - pad, w = R.w + pad * 2, hh = R.h + pad * 2;
    const H = (k, x, y) => h('div.ink-h.ink-selbox.nopan.h-' + k, { style: { left: x + 'px', top: y + 'px' }, title: k === 'rot' ? 'Rotate (snaps every 15°)' : k.length === 2 ? 'Scale (pen button / Shift: stretch freely)' : 'Stretch', on: { pointerdown: e => LASSO2.handle(pane, k, e) } });
    pane.paper.world.append(h('div.ink-xf-frame.ink-selbox', { style: { left: x0 + 'px', top: y0 + 'px', width: w + 'px', height: hh + 'px' } }, h('span.ink-xf-tag')),
      H('nw', x0, y0), H('n', x0 + w / 2, y0), H('ne', x0 + w, y0), H('e', x0 + w, y0 + hh / 2), H('se', x0 + w, y0 + hh), H('s', x0 + w / 2, y0 + hh), H('sw', x0, y0 + hh), H('w', x0, y0 + hh / 2), H('rot', x0 + w / 2, y0 - 26)); };
  // a width or colour in the ink bar applies to the selection
  const bar = INK.bar; INK.bar = function (pane) { const r = bar.call(this, pane); const el = pane && pane.host && $('.ink-bar', pane.host);
    if (el) { $$('.ink-w', el).forEach((b, k) => b.addEventListener('click', () => { if (INK.sel) LASSO2.setWidth(k); })); $$('.ink-c', el).forEach((b, k) => b.addEventListener('click', () => { if (INK.sel && INK.sel.items.length) INK.recolor(k); })); }
    return r; };
  // Ctrl+C copies the selection; text copied in the app is remembered for the pen's paste
  document.addEventListener('keydown', e => { if (!INK.sel || !(e.ctrlKey || e.metaKey) || (e.key || '').toLowerCase() !== 'c') return; if (e.target.closest && e.target.closest('input,textarea,[contenteditable="true"]') && !getSelection().isCollapsed) return; e.preventDefault(); LASSO2.copy(); }, true);
  document.addEventListener('copy', () => { const t = String(getSelection() || ''); if (t.trim()) LASSO2.lastText = { text: t, at: Date.now() }; }, true);
  // the barrel button's right-click never opens the menu on the paper
  document.addEventListener('contextmenu', e => { if (e.pointerType === 'pen' && e.target.closest && e.target.closest('.paper')) { e.preventDefault(); e.stopPropagation(); } }, true);
}
