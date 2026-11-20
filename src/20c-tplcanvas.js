/* ==========================================================================
   20c · A template as a note canvas (V4.68). Gabe, 20 Nov: "Templates in
   settings should bring up a note canvas with placeholder components. For
   example, you can add a placeholder image panel that waits for you to click
   on them to add images when you create a note with that template."
   Settings → Templates → Edit opens the template as a small canvas, not a
   list of labels: its components sit where a note made from it will put them
   (the header band on top, then each component at its x, y); a component is
   dragged by its title bar, its label and default text are typed in place, ×
   takes it out, and the toolbar adds more. Three kinds of component:
     • a text component — { label, body, x, y, w }, as templates always held;
     • an image placeholder — { ph: 'image', fig: { rows, cols }, label, x, y, w }:
       M.createDoc makes it an empty image panel that waits in the note (13x
       phBody); one click, or a dropped file, adds images and it is a real
       panel from then on. Its shape is one m×n box with the shape drawn as you
       type, as in the Image panel dialog (FIG.parseShape / shapeWidget);
     • a whiteboard placeholder — { ph: 'board' }: a click starts the lab's
       whiteboard there.
   The records stay as they were: old templates have blocks [{ label, body, x?, y? }]
   and open with their components laid out as a note would; the new keys are
   optional. Settings → Features → Templates switches the canvas off (the
   plain list comes back); templates already holding placeholders still make them.
   ========================================================================== */
const TPLC = {
  S: .7, SNAP: 14, HEADH: 140, TEXTH: 132,
  /** What a placeholder kind is: its words, width and first shape. */
  PH: {
    image: { label: 'Image placeholder', w: 560, fig: [1, 2], waits: 'waits for images — one click adds them' },
    board: { label: 'Whiteboard placeholder', w: 420, fig: [1, 1], waits: 'waits for a click — then the whiteboard' },
  },
  /** The shape a new image placeholder starts as (Settings → Templates). */
  startShape() { const s = FIG.parseShape(FEAT.tune('templates', 'shape')); return s || [1, 2]; },
  fig: r => ({ rows: Math.max(1, +(r.fig || {}).rows || 1), cols: Math.max(1, +(r.fig || {}).cols || 1) }),
  width: r => r.w || (r.ph ? TPLC.PH[r.ph === 'board' ? 'board' : 'image'].w : 392),
  height(r) { if (!r.ph) return TPLC.TEXTH; const F = TPLC.fig(r); return FIG.phHeight(TPLC.width(r), F.rows, F.cols) + 4; },
  snap: v => Math.max(0, Math.round(v / TPLC.SNAP) * TPLC.SNAP),
  /** Give every component without a place the one a new note would give it (M.autoLayout): a column for ordered types, two columns otherwise; a panel on a row of its own. */
  place(blocks, type, force) {
    const ordered = !!prof(type).ordered; let y = TPLC.HEADH, col = 0, rowH = 0;
    if (!force) blocks.forEach(r => { if (r.x != null && r.y != null) y = Math.max(y, r.y + TPLC.height(r) + 22); });
    blocks.forEach(r => {
      if (!force && r.x != null && r.y != null) return;
      const hh = TPLC.height(r), wide = !!r.ph || ordered;
      if (col % 2 && wide) { y += rowH + 22; col = 0; rowH = 0; }
      if (wide) { r.x = 0; r.y = y; y += hh + 22; }
      else { r.x = (col % 2) * 420; r.y = y; rowH = Math.max(rowH, hh); if (col % 2) { y += rowH + 22; rowH = 0; } col++; }
      r.x = TPLC.snap(r.x); r.y = TPLC.snap(r.y);
    });
    return blocks;
  },
  bottom: blocks => blocks.reduce((m, r) => Math.max(m, (r.y || 0) + TPLC.height(r)), TPLC.HEADH),

  /** The editor: a canvas in a wide window, a toolbar above it. */
  edit(t, isNew) {
    const blocks = JSON.parse(JSON.stringify(t.blocks || [])), S = TPLC.S, p = prof(t.type);
    if (!blocks.length) blocks.push({ label: '', body: '' });
    TPLC.place(blocks, t.type);
    const name = h('input.inp.tc-name', { value: t.name, 'aria-label': 'Template name', on: { keydown: e => e.stopPropagation() } });
    const stage = h('div.tc-stage'), inner = h('div.tc-inner'), sheet = h('div.tc-sheet', inner); stage.append(sheet);
    const cardEl = new Map();
    const size = () => { const W = Math.max(...blocks.map(r => (r.x || 0) + TPLC.width(r)), 560) + 80, H = Math.max(TPLC.bottom(blocks) + 80, 420);
      Object.assign(inner.style, { width: W + 'px', height: H + 'px', transform: `scale(${S})` }); Object.assign(sheet.style, { width: W * S + 'px', height: H * S + 'px' }); };
    const put = r => { const el = cardEl.get(r); if (el) Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: TPLC.width(r) + 'px', height: TPLC.height(r) + 'px' }); };
    const grip = (r, kids, label) => {
      const g = h('div.tc-grip', { title: 'Drag to move' }, h('span.tc-n', label), ...kids);
      g.addEventListener('pointerdown', e => {
        if (e.target.closest('input,button,textarea')) return; e.preventDefault(); g.setPointerCapture(e.pointerId);
        const x0 = r.x, y0 = r.y, px = e.clientX, py = e.clientY, card = cardEl.get(r); card.classList.add('drag');
        const mv = ev => { r.x = TPLC.snap(x0 + (ev.clientX - px) / S); r.y = TPLC.snap(y0 + (ev.clientY - py) / S); put(r); };
        const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); card.classList.remove('drag'); size(); };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      });
      return g;
    };
    const lab = (r, ph) => h('input.tc-lab', { value: r.label || '', placeholder: ph, 'aria-label': 'Label', on: { input: e => { r.label = e.target.value; }, keydown: e => e.stopPropagation() } });
    const rm = r => h('button.tc-x', { title: 'Take this component out of the template', 'aria-label': 'Remove', on: { click: () => { blocks.splice(blocks.indexOf(r), 1); draw(); } } }, '×');
    const card = (r, i) => {
      let el;
      if (!r.ph) el = h('div.tc-card', grip(r, [lab(r, 'label'), rm(r)], 'Block'), h('textarea.tc-body', { placeholder: 'Default text (optional) — what a new note starts with here', value: r.body || '', on: { input: e => { r.body = e.target.value; }, keydown: e => e.stopPropagation() } }));
      else {
        const k = TPLC.PH[r.ph === 'board' ? 'board' : 'image'], F = TPLC.fig(r), wid = FIG.shapeWidget(F.rows, F.cols, true, 230, 130);
        const box = h('div.tc-ph', wid, h('div.tc-phr', h('b', k.label), h('span.tiny.muted', k.waits)));
        if (r.ph !== 'board') {
          const mn = h('input.inp.mono.tc-mn', { value: F.rows + '×' + F.cols, placeholder: 'm×n', spellcheck: false, 'aria-label': 'Rows × columns', title: 'Rows × columns, e.g. 2×3',
            on: { keydown: e => e.stopPropagation(), input: () => { const s = FIG.parseShape(mn.value); mn.classList.toggle('bad', !s); if (s) { r.fig = { rows: s[0], cols: s[1] }; FIG.shapeSet(wid, s[0], s[1], true, 230, 130); put(r); size(); } } } });
          box.querySelector('.tc-phr').append(h('label.tc-shape', h('span.tiny', 'Shape, rows × columns'), mn));
        }
        el = h('div.tc-card.ph', grip(r, [lab(r, k.label), rm(r)], 'Placeholder'), box);
      }
      cardEl.set(r, el); return el;
    };
    const head = h('div.tc-card.head', { title: 'Every note has its header here: title, type, project, theme, tags' }, h('div.tc-grip.fixed', h('span.tc-n', 'Header')), h('div.tc-hd', 'Title · type · project · theme · tags'));
    const draw = () => { cardEl.clear(); inner.replaceChildren(head, ...blocks.map(card)); blocks.forEach(put); size(); };
    const add = (r, focusSel) => { r.x = 0; r.y = TPLC.snap(TPLC.bottom(blocks) + 28); blocks.push(r); draw(); requestAnimationFrame(() => { const el = cardEl.get(r); if (!el) return; el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const f = el.querySelector(focusSel); f && f.focus(); }); };
    const tool = (label, tip, fn) => h('button.btn.sm', { title: tip, on: { click: fn } }, label);
    const bar = h('div.tc-bar',
      tool('+ Text component', 'A component with a label and, if you like, some starting text', () => add({ label: '', body: '' }, '.tc-lab')),
      tool('+ Image placeholder', 'An empty image panel that waits in the note: one click adds images', () => { const [r, c] = TPLC.startShape(); add({ label: '', body: '', ph: 'image', fig: { rows: r, cols: c }, w: 560 }, '.tc-lab'); }),
      tool('+ Whiteboard placeholder', 'Waits in the note; a click starts the whiteboard there', () => add({ label: '', body: '', ph: 'board', fig: { rows: 1, cols: 1 }, w: 420 }, '.tc-lab')),
      h('span.spacer'), h('span.tiny.muted', 'Drag a title bar to move · the grid snaps to ' + TPLC.SNAP + ' px'),
      tool('Tidy', 'Lay the components out as a new ' + p.label.toLowerCase() + ' note would', () => { blocks.sort((a, b) => (a.y - b.y) || (a.x - b.x)); TPLC.place(blocks, t.type, true); draw(); }));
    draw();
    const m = modal({ title: (isNew ? 'New ' : 'Edit ') + p.label.toLowerCase() + ' template', wide: true,
      body: h('div.tc', h('label.f', h('span', 'Name'), name), h('div.tc-hint.tiny.muted', 'A note made from this template opens like this. A placeholder waits in the note: one click on it adds images and it becomes a real image panel.'), bar, stage),
      actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => {
        const rows = blocks.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
        t.name = name.value.trim() || t.name; t.blocks = rows; DB.put('templates', t); App.refresh(); } }] });
    const md = m.el.querySelector('.modal'); md.classList.add('tc-modal');
    return m;
  },

  /** A small static picture of a template for Settings' preview: header band, a text component, a placeholder. */
  mini(rows, W = 330) {
    const k = W / 640, hh = Math.max(...rows.map(r => r.y + TPLC.height(r)), 200) + 14;
    const el = h('div.tc-mini', { style: { width: W + 'px', height: Math.round(hh * k) + 'px' } }, h('div.tc-minin', { style: { transform: `scale(${k})`, width: '640px', height: hh + 'px' } },
      h('div.tc-card.head', { style: { left: '0px', top: '0px', width: '420px', height: '120px' } }, h('div.tc-grip.fixed', h('span.tc-n', 'Header')), h('div.tc-hd', 'Title · type · project')),
      ...rows.map(r => r.ph ? h('div.tc-card.ph', { style: { left: r.x + 'px', top: r.y + 'px', width: TPLC.width(r) + 'px', height: TPLC.height(r) + 'px' } }, h('div.tc-grip.fixed', h('span.tc-n', 'Placeholder'), h('b.tc-lab-s', r.label || TPLC.PH[r.ph].label)),
        h('div.tc-ph', FIG.shapeWidget(TPLC.fig(r).rows, TPLC.fig(r).cols, true, 230, 130), h('div.tc-phr', h('b', TPLC.PH[r.ph].label), h('span.tiny.muted', TPLC.PH[r.ph].waits))))
        : h('div.tc-card', { style: { left: r.x + 'px', top: r.y + 'px', width: TPLC.width(r) + 'px', height: TPLC.height(r) + 'px' } }, h('div.tc-grip.fixed', h('span.tc-n', 'Block'), h('b.tc-lab-s', r.label)), h('div.tc-hd', r.body || '')))));
    return el;
  },
};
