/* ==========================================================================
   13zz3 · Line style for pen strokes: solid, dashed or dotted.
   Select strokes with the lasso (pen button) and pick ─ ┄ ┈ in the selection
   bar. Kept on the stroke as s.dash = 'dash' | 'dot' (solid = none).
   A pen stroke is normally a filled outline (its width follows pressure);
   a dashed or dotted one is drawn along its centre line at its average width.
   ========================================================================== */
const DASH = {
  KINDS: [['', '─', 'Solid'], ['dash', '┄', 'Dashed'], ['dot', '┈', 'Dotted']],
  /** average drawn width of a pen stroke (the same formula the outline uses, without the taper) */
  width(s) { const w = s.w || 2.4; if (s.hl || s.geo) return w; const P = s.p || []; if (!P.length) return w;
    const m = P.reduce((a, q) => a + (q[2] == null ? .5 : q[2]), 0) / P.length;
    return Math.max(.8, w * (s.pr ? (s.wr ? s.wr[0] + (s.wr[1] - s.wr[0]) * m : .18 + 1.65 * m) : .4 + .9 * m) * .9); },
  centre(s) { const P = s.p || [], br = new Set(s.br || []); return P.map((p, i) => (i === 0 || br.has(i) ? 'M' : 'L') + p[0] + ',' + p[1]).join('') + (s.closed ? 'Z' : ''); },
  pattern(s, w) { return s.dash === 'dot' ? `0.01 ${Math.max(2.2 * w, 4)}` : `${Math.max(3.2 * w, 6)} ${Math.max(2.2 * w, 4.5)}`; },
  /** set the style of every selected stroke (one undo step) */
  set(kind) { const sel = INK.sel; if (!sel || !sel.items.length) return; DB.beginGroup('ink');
    INK.selStrokes().forEach(({ s }) => { if (kind) s.dash = kind; else delete s.dash; });
    new Set(sel.items.map(x => x.id)).forEach(id => { const b = M.block(id); if (b) { b.modified = isoLocal(new Date()); DB.put('blocks', b); } });
    LASSO2.keep(sel); },
};
{
  const sp = INK.svgPath; INK.svgPath = function (s, i) { const p = sp.call(INK, s, i); if (!s.dash || !s.p || s.p.length < 2 || (INK.isArea && INK.isArea(s))) return p;
    const w = DASH.width(s);
    if (!s.hl && !s.geo) { p.setAttribute('d', DASH.centre(s)); p.style.fill = 'none'; p.setAttribute('fill', 'none'); p.style.stroke = INK.col(s.c); p.setAttribute('stroke-width', w); }
    p.setAttribute('stroke-dasharray', DASH.pattern(s, w)); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); p.classList.add('ink-dash');
    return p; };
  // ─ ┄ ┈ in the selection bar when strokes are selected
  const ps = INK.paintSel; INK.paintSel = function () { ps.call(this); const sel = INK.sel, pane = sel && sel.pane; if (!pane || !pane.paper || !sel.items.length) return;
    const bar = $('.ink-selbar', pane.paper.world); if (!bar || $('.ink-dashg', bar)) return;
    const S = INK.selStrokes(), cur = S.length && S.every(({ s }) => (s.dash || '') === (S[0].s.dash || '')) ? (S[0].s.dash || '') : null;
    const g = h('span.ink-dashg', ...DASH.KINDS.map(([k, ic, t]) => h('button.btn.xs.ink-dashb' + (cur === k ? '.on' : ''), { title: t + ' line', 'data-k': k, on: { click: e => { e.stopPropagation(); DASH.set(k); } } }, ic)));
    const del = $('.btn.danger', bar); del ? del.before(g) : bar.append(g); };
}
