/* ==========================================================================
   13zv · Fill, and palettes.
   • ◧ Fill is a tool. With it, tap inside a closed shape (a recognised
     shape or a stroke that closes on itself): it is filled with the colour
     of the pen or highlighter you used last — a full, solid fill with pen
     ink (tap again with another colour to replace it); with the
     highlighter each tap lays a translucent layer, so the shade deepens.
     The fill is its own colour: the border keeps its own.
   • Holding the highlighter still turns the stroke into a shape (as with
     the pen); a closed one is filled with a highlighter layer at once.
   • Lasso → Fill fills the selected closed strokes the same way; Unfill
     clears them.
   • Palettes: the pen and the highlighter each have their own. Press and
     hold (or right-click / double-click) a colour to change it — a large
     palette or any colour; the dotted ⊕ circle adds one. Kept per device.
   Highlighter strokes are translucent, so overlaps deepen too.
   ========================================================================== */
INK.HL_DEFAULT = ['#F6D55C', '#90BE6D', '#7FB3E8', '#F28BB0', '#F4A261'];
INK.PEN_DEFAULT = INK.COLORS.slice();
{ const pal = _ls.get('inkPalette', null), hp = _ls.get('hlPalette', null);
  if (Array.isArray(pal) && pal.length) INK.COLORS = pal[0] === 'auto' ? pal : ['auto', ...pal];
  INK.HL = Array.isArray(hp) && hp.length ? hp : INK.HL_DEFAULT.slice(); }
INK.hlColor = _ls.get('inkHlColor', 0);
INK.lastDraw = _ls.get('inkLastDraw', 'pen');
INK.color = Math.min(INK.color, INK.COLORS.length - 1); INK.hlColor = Math.min(INK.hlColor, INK.HL.length - 1);
INK.closedLoop = s => { const P = s.p || []; if (P.length < 8) return false; const [a, z] = [P[0], P[P.length - 1]]; let L = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); P.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  const diag = Math.hypot(x1 - x0, y1 - y0); return diag > 14 && Math.hypot(z[0] - a[0], z[1] - a[1]) < Math.max(.22 * diag, 12) && L > 1.6 * diag; };
INK.fillable = s => !!s && !!s.p && s.p.length >= 3 && ((s.geo && s.closed) || INK.closedLoop(s) || (s.fills && s.fills.length));
INK.isArea = s => !!(s && s.hl && s.geo && s.closed && (s.area || (s.fills && s.fills[0] && s.fills[0].hl && s.fills[0].c === s.c)));
INK.fillsOf = s => s.fills || (s.fill ? [{ c: s.c, light: true, hl: !!s.hl }] : []); // older strokes: s.fill = a light fill in the stroke colour

const FILL = {
  /** What a fill tap paints with: the colour of the last pen or highlighter used. */
  paint() { const hl = INK.lastDraw === 'hl'; return { c: hl ? INK.HL[INK.hlColor] || INK.HL[0] : INK.COLORS[INK.color] || INK.COLORS[0], hl }; },
  add(s, f) { const cur = INK.fillsOf(s).filter(x => !x.light); s.fills = f.hl ? [...cur, { c: f.c, hl: true }].slice(-8) : [{ c: f.c }]; delete s.fill; },
  /** The smallest closed stroke of this note around a world point. */
  at(pane, wp) { let best = null, ba = 1e18;
    INK.blocks(pane.docId).forEach(b => (b.ink.strokes || []).forEach((s, i) => { if (!INK.fillable(s)) return; const x = wp.x - b.x, y = wp.y - b.y; if (!INK.inPoly(x, y, s.p)) return;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; s.p.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); const a = (x1 - x0) * (y1 - y0); if (a < ba) { ba = a; best = { b, i }; } }));
    return best; },
  tap(pane, paper, e) {
    const sx = e.clientX, sy = e.clientY; INK.drawing = e.pointerId;
    const up = ev => { if (ev.pointerId !== e.pointerId) return; INK.drawing = null; removeEventListener('pointerup', up, true); if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) return;
      const hit = FILL.at(pane, paper.toWorld(ev.clientX, ev.clientY)); if (!hit) return toast('Tap inside a closed shape to fill it');
      const b = M.block(hit.b.id), s = b.ink.strokes[hit.i], f = FILL.paint(); DB.beginGroup('ink'); FILL.add(s, f); DB.put('blocks', b); changed(); };
    addEventListener('pointerup', up, true); return true;
  },

  /* ---------- palettes ---------- */
  BIG: (() => { const hues = [0, 20, 38, 52, 90, 140, 170, 195, 215, 240, 270, 300, 330], out = [];
    [[85, 32], [75, 45], [70, 58], [60, 72], [45, 85]].forEach(([s, l]) => hues.forEach(hh => out.push(`hsl(${hh} ${s}% ${l}%)`)));
    return [...out, '#000000', '#3a3a3a', '#6b6b6b', '#9a9a9a', '#c8c8c8', '#ffffff']; })(),
  kind: () => INK.tool === 'hl' || (INK.tool === 'fill' && INK.lastDraw === 'hl') ? 'hl' : 'pen',
  list: k => k === 'hl' ? INK.HL : INK.COLORS,
  cur: k => k === 'hl' ? INK.hlColor : INK.color,
  pick(k, i) { if (k === 'hl') { INK.hlColor = i; _ls.set('inkHlColor', i); } else { INK.color = i; _ls.set('inkColor', i); }
    if (INK.tool === 'eraser' || INK.tool === 'lasso') { if (INK.sel && INK.sel.items.length) FILL.recolorSel(FILL.list(k)[i]); else INK.setTool(k === 'hl' ? 'hl' : 'pen'); }
    else if (INK.sel && INK.sel.items.length) FILL.recolorSel(FILL.list(k)[i]);
    INK.paintBars(); },
  recolorSel(c) { DB.beginGroup('ink'); INK.selStrokes().forEach(({ s }) => { s.c = c; }); new Set(INK.sel.items.map(x => x.id)).forEach(id => DB.put('blocks', M.block(id))); const keep = INK.sel; changed(); setTimeout(() => { INK.sel = keep; INK.paintSel(); }, 60); },
  save(k) { _ls.set(k === 'hl' ? 'hlPalette' : 'inkPalette', FILL.list(k).slice()); },
  /** Change colour i of palette k (i = null: add one). */
  editor(k, i, x, y) {
    const L = FILL.list(k), adding = i == null, cur = adding ? null : L[i];
    const set = c => { if (adding) { L.push(c); FILL.pick(k, L.length - 1); } else { L[i] = c; INK.paintBars(); } FILL.save(k); closePop(); };
    const custom = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(cur || '') ? cur : '#3366cc', on: { change: e => set(e.target.value) } });
    popover(x, y, [h('h5', adding ? 'Add a colour to the ' + (k === 'hl' ? 'highlighter' : 'pen') : 'Change this ' + (k === 'hl' ? 'highlighter' : 'pen') + ' colour'),
      h('div.pal-big', FILL.BIG.map(c => h('button.pal-sw', { style: { background: c }, title: c, on: { click: () => set(c) } }))),
      h('div.row', { style: { gap: '8px', alignItems: 'center', marginTop: '8px' } }, h('label.row.tiny', { style: { gap: '6px', alignItems: 'center' } }, custom, 'Any colour…'), h('span.spacer'),
        !adding && cur !== 'auto' && L.length > 1 ? h('button.btn.xs.ghost', { on: { click: () => { L.splice(i, 1); if (FILL.cur(k) >= L.length) FILL.pick(k, L.length - 1); FILL.save(k); INK.paintBars(); closePop(); } } }, 'Remove') : null,
        h('button.btn.xs.ghost', { title: 'Back to the standard colours', on: { click: () => { const d = k === 'hl' ? INK.HL_DEFAULT : INK.PEN_DEFAULT; L.splice(0, L.length, ...d); FILL.pick(k, 0); FILL.save(k); closePop(); } } }, 'Reset palette')),
      cur === 'auto' ? h('p.tiny.muted', 'This one is “ink”: black on the light theme, white on the dark. Changing it gives a fixed colour instead.') : null]);
  },
  swatches(pane) {
    const k = FILL.kind(), L = FILL.list(k), cur = FILL.cur(k);
    const sw = L.map((c, i) => { let t = null, held = false; const el = h('button.ink-c2' + (i === cur ? '.on' : ''), { style: { background: c === 'auto' ? INK.swatch(c) : c }, title: (c === 'auto' ? 'Ink — white on the dark theme, black on the light' : c) + ' · press and hold to change',
      on: { pointerdown: e => { held = false; clearTimeout(t); t = setTimeout(() => { held = true; const r = el.getBoundingClientRect(); FILL.editor(k, i, r.left, r.bottom + 8); }, 520); }, pointerup: () => clearTimeout(t), pointerleave: () => clearTimeout(t),
        click: e => { if (held) { held = false; return; } FILL.pick(k, i); }, dblclick: e => { const r = el.getBoundingClientRect(); FILL.editor(k, i, r.left, r.bottom + 8); }, contextmenu: e => { e.preventDefault(); const r = el.getBoundingClientRect(); FILL.editor(k, i, r.left, r.bottom + 8); } } }); return el; });
    const add = h('button.ink-cadd', { title: 'Add a colour', on: { click: e => { const r = e.currentTarget.getBoundingClientRect(); FILL.editor(k, null, r.left, r.bottom + 8); } } }, '+');
    return [h('span.ink-kind.tiny.muted', k === 'hl' ? '▍' : '✎'), ...sw, add];
  },
};

{
  // fills under their stroke: solid with pen ink, translucent layers with the highlighter
  const svg = INK.svg; INK.svg = function (strokes, w, hh) { const el = svg.call(INK, strokes, w, hh);
    strokes.forEach((s, i) => { let F = INK.fillsOf(s); if (s.hl && s.geo && s.closed && !s.area && F.length && F[0].hl && F[0].c === s.c) F = F.slice(1); if (!F.length || !s.p || s.p.length < 3) return; const at = el.querySelector(`path[data-i="${i}"]`);
      const d = s.geo ? INK.path(s) : 'M' + s.p.map(q => q[0] + ',' + q[1]).join('L') + 'Z';
      F.forEach(f => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('class', 'ink-fill' + (f.hl ? ' hl' : '') + (f.light ? ' light' : '')); p.style.fill = INK.col(f.c); p.dataset.fi = i; at ? el.insertBefore(p, at) : el.prepend(p); }); });
    return el; };
  const sp = INK.svgPath; INK.svgPath = function (s, i) { const p = sp.call(INK, s, i); if (s.hl && s.geo) p.classList.add('ink-hl');
    // a closed shape drawn with the highlighter is an area: filled, no border
    if (INK.isArea(s)) { p.style.stroke = 'none'; p.setAttribute('fill', INK.col(s.c)); p.classList.add('ink-area'); }
    return p; };
  // the fill tool
  const st = INK.setTool; INK.setTool = function (t) { if (t === 'pen' || t === 'hl') { INK.lastDraw = t; _ls.set('inkLastDraw', t); } return st.call(this, t); };
  const pd = INK.penDown; INK.penDown = function (paper, e) {
    if (INK.writing() && INK.tool === 'fill' && !(typeof LASSO2 !== 'undefined' && LASSO2.barrel(e)) && !(typeof PENERASE !== 'undefined' && PENERASE.isEraser(e))) { const host = paper.el.closest('.canvas-host'), pane = host && host._dv;
      if (pane && pane.docId && !pane.travel && !INK.interactive(e.target)) { const box = e.target.closest('.box'); if (!box || box.classList.contains('w-ink')) { if (INK.sel) INK.clearSel(); return FILL.tap(pane, paper, e); } } }
    return pd.call(this, paper, e); };
  // the ink bar: a Fill tool beside the lasso; the palette of the pen or the highlighter, editable, with ⊕
  const bar = INK.bar; INK.bar = function (pane) { const r = bar.call(this, pane); const el = pane && pane.host && $('.ink-bar', pane.host); if (!el) return r;
    $$('.ink-fillb', el).forEach(x => x.remove());
    if (!$('.ink-filltool', el)) { const lasso = [...$$('.ib-t', el)].find(b => /Lasso/.test(b.title)); const fb = h('button.ib-t.ink-filltool' + (INK.tool === 'fill' ? '.on' : ''), { title: 'Fill — tap inside a closed shape (with the colour of the pen or highlighter you used last)', on: { click: () => INK.setTool('fill') } }, '◧');
      lasso ? lasso.after(fb) : el.prepend(fb); }
    const old = $$('.ink-c', el); if (old.length) { const first = old[0]; first.before(...FILL.swatches(pane)); old.forEach(x => x.remove()); }
    return r; };
  // Lasso → Fill / Unfill
  const ps = INK.paintSel; INK.paintSel = function () { ps.call(this); const sel = INK.sel, pane = sel && sel.pane; if (!pane || !pane.paper || !sel.items.length) return; const bar = $('.ink-selbar', pane.paper.world); if (!bar || $('.ink-fsel', bar)) return;
    const S = INK.selStrokes(), on = S.length && S.every(({ s }) => INK.fillsOf(s).length);
    const go = fill => e => { e.stopPropagation(); DB.beginGroup('ink'); let n = 0; INK.selStrokes().forEach(({ s }) => { if (!fill) { delete s.fills; delete s.fill; n++; } else if (INK.fillable(s) || s.p.length > 8) { FILL.add(s, FILL.paint()); n++; } }); new Set(sel.items.map(x => x.id)).forEach(id => DB.put('blocks', M.block(id))); LASSO2.keep(sel); if (fill && !n) toast('No closed strokes to fill'); };
    const d = $('.btn.danger', bar), btns = [h('button.btn.xs.ink-fsel', { title: 'Fill with the colour of the pen or highlighter used last', on: { click: go(true) } }, '◧ Fill'), on ? h('button.btn.xs', { on: { click: go(false) } }, 'Unfill') : null].filter(Boolean);
    d ? d.before(...btns) : bar.append(...btns); };
}
