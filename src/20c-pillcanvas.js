/* ==========================================================================
   20c · Your pill layout, placed in Settings (V4.35 — Gabe: "the settings
   tab should have an empty note canvas in which you can place your pill
   layout, which will be remembered across devices.")
   Settings → Pen & touch → Pills shows an empty note with the four pills
   where they sit on every note: drag one to its place. The layout is the
   one the pills themselves keep (settings().labPills, lab-mode §11 and its
   cut in vendor/lab-pills.js): in the notebook's settings, so every device
   gets it with the next sync. Landscape and Portrait each have their own
   places (labPills.portrait — a note taller than it is wide reads them;
   V4.35 in §11); a pill not placed in Portrait keeps its landscape place, as
   a share of the note. Dropped against a side it docks as a column, against
   the top or bottom as a row, as on a note. Reset puts that shape's pills
   back. "Portrait and landscape: the same places" (labPills.one) leaves one
   layout for both.
   The canvas has the shape of a note on this screen (the window's long and
   short sides, less the header), so a place here is the place on a note.
   V4.93 (Gabe: "Live preview of pills should show their extended look as
   well, and clicking on it sets it horizontal/vertical and vice versa."):
   each pill shows its extended look beside it — its row or column of what
   it holds, the icons it has on a note (LAB.pillPreview, vendor/lab-pills.js) — and
   a click on the pill or its strip (not a drag) turns a row into a column
   and back (labPills.orient, what a docked pill reads).
   ========================================================================== */
const PILLCANVAS = {
  NAMES: [['view', '⊕', 'Zoom'], ['tools', '✦', 'Tools'], ['insert', '＋', 'Quick cast'], ['hand', '✎', 'The hand']],
  shape: null,   // 'land' | 'port' — the one shown (starts as this window is)
  L: () => window.SIS_LAB || window.SIS_PILLS || null,
  read() { let s = null; try { s = settings().labPills; } catch (e) { } return s && typeof s === 'object' ? s : {}; },
  one: () => !!PILLCANVAS.read().one,
  /** a note's size in that shape on this screen */
  ref(port) { const a = Math.max(innerWidth, innerHeight), b = Math.max(320, Math.min(innerWidth, innerHeight) - 110); return port ? [b, a] : [a, b]; },
  /** where a pill sits until it is moved: the pills' own rule (lab-mode §11, LAB.pillDefs), else the same numbers */
  defAt(name, W, H) {
    const L = PILLCANVAS.L(), d = L && L.pillDefs && L.pillDefs[name];
    try { if (d && d.at) return d.at(W, H); } catch (e) { }
    return { hand: [W - 36, H - 38], insert: [W / 2, H - 38], tools: [W - 36, 36], view: [36, 36] }[name] || [W / 2, H / 2];
  },
  place(name, port) {
    const s = PILLCANVAS.read(), [W, H] = PILLCANVAS.ref(port), ok = p => p && isFinite(+p.fx) && isFinite(+p.fy);
    const pp = (port && !s.one && s.portrait && s.portrait.pos && ok(s.portrait.pos[name]) && s.portrait.pos[name]) || (s.pos && ok(s.pos[name]) && s.pos[name]);
    if (pp) return { fx: +pp.fx, fy: +pp.fy };
    const at = PILLCANVAS.defAt(name, W, H); return { fx: at[0] / W, fy: at[1] / H };
  },
  /** has this shape any place of its own? (for Reset) */
  placed(port) { const s = PILLCANVAS.read(), X = port && !s.one ? (s.portrait || {}) : s; return !!(X.pos && Object.keys(X.pos).length) || !!(X.orient && Object.keys(X.orient).length); },
  save(name, port, fx, fy, orient) {
    const s = JSON.parse(JSON.stringify(PILLCANVAS.read())), r = v => Math.round(v * 1000) / 1000;
    const X = port && !s.one ? (s.portrait = s.portrait && typeof s.portrait === 'object' ? s.portrait : {}) : s;
    X.pos = Object.assign({}, X.pos || {}, { [name]: { fx: r(fx), fy: r(fy) } });
    if (orient) X.orient = Object.assign({}, X.orient || {}, { [name]: orient });
    PILLCANVAS.write(s);
  },
  reset(port) {
    const s = JSON.parse(JSON.stringify(PILLCANVAS.read()));
    if (port && !s.one) delete s.portrait; else { s.pos = {}; s.orient = {}; }
    PILLCANVAS.write(s);
  },
  write(s) {
    saveSettings({ labPills: s });
    const L = PILLCANVAS.L(); try { if (L && L.pillLayout) L.pillLayout.load(); if (L && L.paintPills) L.paintPills(); } catch (e) { }
    $$('.pcv').forEach(x => { try { x.replaceWith(PILLCANVAS.el()); } catch (e) { } });   // every canvas on screen shows the layout as it is now
  },
  /** V4.93: a pill's docked form here — this shape's, else the landscape one, else the pill's own start ('h' a row, 'v' a column) */
  orient(name, port) { const s = PILLCANVAS.read(), L = PILLCANVAS.L(), X = port && !s.one ? (s.portrait || {}) : s, d = L && L.pillDefs && L.pillDefs[name];
    return (X.orient && X.orient[name]) || (s.orient && s.orient[name]) || (d && d.orient) || ({ hand: 'v', insert: 'h', tools: 'h', view: 'v' })[name] || 'h'; },
  /** what the pill holds, as icons: the pills' own (vendor/lab-pills.js), else dots */
  items(name) { const L = PILLCANVAS.L(); let I = []; try { I = L && L.pillPreview ? L.pillPreview(name) : []; } catch (e) { } return I.length ? I : Array.from({ length: name === 'insert' ? 6 : 5 }, () => ({ icon: '<i class="pcv-dot"></i>', label: '' })); },
  /** the extended look beside the pill: a row (to the side with more room; the Quick cast in the middle splits) or a column (up from the bottom half) */
  strip(name, port, p, flip) {
    const o = PILLCANVAS.orient(name, port), I = PILLCANVAS.items(name).slice(0, 9), cell = x => h('span.pcv-it' + (x.sel ? '.sel' : ''), { title: x.label || '', html: x.icon });
    const mk = (L, dir) => h('span.pcv-ext.o-' + o + '.to-' + dir, { 'data-pill': name, title: (o === 'h' ? 'A row' : 'A column') + ' — click to make it ' + (o === 'h' ? 'a column' : 'a row'), style: { left: (p.fx * 100) + '%', top: (p.fy * 100) + '%' }, on: { click: e => { e.stopPropagation(); flip(); } } }, L.map(cell));
    if (o === 'h') { if (p.fx > .38 && p.fx < .62) { const k = Math.ceil(I.length / 2); return [mk(I.slice(0, k), 'l'), mk(I.slice(k), 'r')]; } return [mk(I, p.fx >= .5 ? 'l' : 'r')]; }
    return [mk(I, p.fy >= .5 ? 'u' : 'd')];
  },
  setOne(v) { const s = JSON.parse(JSON.stringify(PILLCANVAS.read())); if (v) s.one = true; else delete s.one; PILLCANVAS.write(s); },
  /** the canvas: an empty note in the shape shown, its four pills where they sit; drag one to place it */
  el() {
    const one = PILLCANVAS.one();
    if (!PILLCANVAS.shape) PILLCANVAS.shape = innerHeight > innerWidth * 1.05 ? 'port' : 'land';
    const port = PILLCANVAS.shape === 'port' && !one, [W, H] = PILLCANVAS.ref(port), on = typeof FEAT === 'undefined' || FEAT.on('pills');
    const wrap = h('div.pcv' + (on ? '' : '.off'), { 'data-shape': port ? 'port' : 'land' });
    const redraw = () => { const n = PILLCANVAS.el(); wrap.replaceWith(n); };
    const seg = h('div.pcv-seg', { role: 'group', 'aria-label': 'Which shape of note' }, [['land', 'Landscape'], ['port', 'Portrait']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String((port ? 'port' : 'land') === k), disabled: one && k === 'port',
      title: one && k === 'port' ? 'Portrait and landscape share their places (the setting below)' : (k === 'port' ? 'A note taller than it is wide: a tablet held upright, the app turned by Rotate' : 'A note wider than it is tall'),
      on: { click: () => { PILLCANVAS.shape = k; redraw(); } } }, l)));
    const reset = h('button.btn.xs.ghost.pcv-reset', { type: 'button', disabled: !PILLCANVAS.placed(port), title: 'Put the pills of this shape back where they start', on: { click: () => { PILLCANVAS.reset(port); redraw(); } } }, 'Reset');
    const note = h('div.pcv-note', { style: { aspectRatio: W + ' / ' + H } });
    const k = () => note.getBoundingClientRect().width / W;   // canvas px per note px
    PILLCANVAS.NAMES.forEach(([name, glyph, label]) => {
      const p = PILLCANVAS.place(name, port), b = h('button.pcv-pill', { type: 'button', 'data-pill': name, title: label + ' — drag to place it', 'aria-label': label + ': drag to place it', style: { left: (p.fx * 100) + '%', top: (p.fy * 100) + '%' } }, glyph);
      const flip = () => { if (!on) return; const o = PILLCANVAS.orient(name, port) === 'h' ? 'v' : 'h'; PILLCANVAS.save(name, port, p.fx, p.fy, o); toast(label + ': ' + (o === 'h' ? 'a row' : 'a column') + ' — on every note' + (port ? ' held upright' : '') + ', on every device', 2200); };
      if (on) PILLCANVAS.strip(name, port, p, flip).forEach(x => note.append(x));
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !on) return; e.preventDefault(); e.stopPropagation();
        const R = note.getBoundingClientRect(), half = b.offsetWidth / 2, sx = e.clientX, sy = e.clientY; let moved = false, cx = p.fx * R.width, cy = p.fy * R.height;
        try { b.setPointerCapture(e.pointerId); } catch (x) { }
        const mv = ev => { const dx = ev.clientX - sx, dy = ev.clientY - sy; if (!moved && Math.hypot(dx, dy) < 4) return; moved = true; b.classList.add('drag');
          cx = clamp(p.fx * R.width + dx, half, R.width - half); cy = clamp(p.fy * R.height + dy, half, R.height - half); b.style.left = (cx / R.width * 100) + '%'; b.style.top = (cy / R.height * 100) + '%'; };
        const up = ev => { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up); b.classList.remove('drag');
          if (!moved) { if (ev && ev.type === 'pointerup') flip(); return; }   // V4.93: a click flips its row and column
          // as on a note: against a side it docks as a column, against the top or bottom as a row (a corner keeps it)
          const E = half + 3 * Math.max(.5, k()), side = cx <= E || cx >= R.width - E, end = cy <= E || cy >= R.height - E;
          PILLCANVAS.save(name, port, cx / R.width, cy / R.height, side !== end ? (side ? 'v' : 'h') : null);
          reset.disabled = false; toast(label + ' placed — on every note' + (port ? ' held upright' : '') + ', on every device', 2200); };
        b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      });
      note.append(b);
    });
    // the pills' size on a note, scaled to the canvas
    requestAnimationFrame(() => { const s = Math.max(26, Math.round(44 * k())); wrap.style.setProperty('--pcv-s', s + 'px'); });
    wrap.append(h('div.pcv-bar', h('span.pcv-t', 'Your pill layout'), seg, h('span.spacer'), reset), note,
      h('div.pcv-cap', !on ? 'The pills are off — turn them on to place them.' : one ? 'One layout for every shape of note. Drag a pill to its place; click it (or its strip) to turn its row into a column and back: every note, every device.'
        : port ? 'A note held upright (a tablet turned, or the app turned by Rotate). A pill you have not placed here keeps its landscape place.' : 'Drag a pill to its place; click it (or its strip) to turn its row into a column and back — every note, every device. Portrait keeps its own places.'));
    return wrap;
  },
};
