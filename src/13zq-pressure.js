/* ==========================================================================
   13zq · Pressure feel (ink bar → ⚙ beside the pressure button, shown when
   pressure is on). Sensitivity (firm ↔ light touch), the thinnest and the
   thickest line as a multiple of the pen width, and how much light strokes
   fade. A test strip to scribble on shows it live. Kept on this device.
   Each stroke keeps the width range it was drawn with.
   ========================================================================== */
INK.pressureDialog = function (e) {
  const C = INK.curve, save = () => { _ls.set('inkCurve', C); redraw(); };
  const eprev = h('div.pr-eprev'), drawE = () => eprev.replaceChildren(...[0, .5, 1].map(v => { const r = (C.emin ?? 4) + ((C.emax ?? 20) - (C.emin ?? 4)) * (v ? INK.mapP(v) : 0); return h('span.pr-ec', h('i', { style: { width: 2 * r + 'px', height: 2 * r + 'px' } }), h('span.tiny.muted', v === 0 ? 'light' : v === 1 ? 'hard' : 'medium')); }));
  const strip = h('div.pr-test'), svg = SV('svg', { class: 'pr-svg' }); strip.append(svg); let strokes = [];
  const redraw = () => { drawE(); svg.replaceChildren(...strokes.map(s => { s.wr = [C.min, C.max]; if (s.pr) { const m = s.p.reduce((a, q) => a + q[2], 0) / s.p.length; s.o = clamp(1 - C.fade * (1 - m) * 1.15, .22, 1); } return INK.svgPath(s); })); drawCurve(); };
  strip.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); try { strip.setPointerCapture(ev.pointerId); } catch { } const R = strip.getBoundingClientRect(), raw = [];
    const st = { c: 'auto', w: INK.WIDTHS[INK.width] || 2.4, p: [], pr: ev.pointerType === 'pen' };
    const add = q => { raw.push(q.pressure); const v = q.pointerType === 'pen' ? (q.pressure > 0 ? q.pressure : .5) : .5; st.p.push([INK.r1(q.clientX - R.left), INK.r1(q.clientY - R.top), q.pointerType === 'pen' ? INK.mapP(v) : .5]); INK.meter(st.p[st.p.length - 1][2]); };
    add(ev); strokes.push(st); if (strokes.length > 14) strokes.shift();
    const mv = q => { ((q.getCoalescedEvents && q.getCoalescedEvents().length) ? q.getCoalescedEvents() : [q]).forEach(add); redraw(); }, up = () => { strip.removeEventListener('pointermove', mv); strip.removeEventListener('pointerup', up); redraw(); };
    strip.addEventListener('pointermove', mv); strip.addEventListener('pointerup', up); });
  const curve = SV('svg', { class: 'pr-curve', viewBox: '0 0 100 60' });
  const drawCurve = () => { let d = ''; for (let i = 0; i <= 40; i++) { const x = i / 40, y = INK.mapP(Math.max(.001, x)), wv = C.min + (C.max - C.min) * y; d += (i ? 'L' : 'M') + (x * 100).toFixed(1) + ',' + (58 - wv / 4 * 56).toFixed(1); } curve.innerHTML = `<path d="M0,58H100" class="ax"/><path d="${d}" class="cv"/><text x="2" y="10">thick</text><text x="62" y="54">harder →</text>`; };
  const slider = (label, key, min, max, step, fmt, hint) => { const out = h('span.pr-v.mono', fmt(C[key])); const inp = h('input', { type: 'range', min, max, step, value: C[key], on: { input: ev => { C[key] = +ev.target.value; if (key === 'min' && C.min > C.max - .1) C.max = C.min + .1; if (key === 'max' && C.max < C.min + .1) C.min = Math.max(.05, C.max - .1); if (key === 'emin' && C.emin > C.emax) C.emax = C.emin; if (key === 'emax' && C.emax < C.emin) C.emin = C.emax; out.textContent = fmt(C[key]); save(); } } });
    return h('label.pr-row', h('span.pr-l', label, hint ? h('span.tiny.muted', ' ' + hint) : null), inp, out); };
  popover(e.clientX - 140, e.clientY + 14, [h('h5', 'Pressure feel'),
    slider('Sensitivity', 'sens', 0, 1, .01, v => v < .35 ? 'firm' : v > .65 ? 'light' : 'medium', 'firm ↔ light touch'),
    slider('Thinnest', 'min', .05, 1.2, .05, v => '×' + v.toFixed(2), 'light pressure'),
    slider('Thickest', 'max', .6, 4, .05, v => '×' + v.toFixed(2), 'full pressure'),
    slider('Fade light strokes', 'fade', 0, 1, .05, v => Math.round(v * 100) + '%'),
    h('div.pr-cwrap', curve, h('div.tiny.muted', 'Line width against how hard you press')),
    h('h5', { style: { marginTop: '8px' } }, 'Eraser (pen’s back end)'),
    slider('Smallest', 'emin', 2, 30, 1, v => Math.round(v) + ' px', 'light touch'),
    slider('Largest', 'emax', 4, 60, 1, v => Math.round(v) + ' px', 'full pressure'),
    eprev,
    strip, h('div.row', { style: { gap: '6px', marginTop: '6px' } }, h('span.tiny.muted', 'Scribble above with the pen to try it.'), h('span.spacer'),
      h('button.btn.xs', { on: { click: () => { strokes = []; redraw(); } } }, 'Clear'),
      h('button.btn.xs.ghost', { title: 'Back to the standard feel', on: { click: () => { Object.assign(C, { sens: .5, min: .15, max: 2.2, fade: .6, emin: 4, emax: 20 }); save(); closePop(); INK.pressureDialog(e); } } }, 'Reset'))]);
  drawCurve(); drawE();
};
