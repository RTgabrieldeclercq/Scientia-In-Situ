/* ==========================================================================
   13x · Image panels. A figure component holds images in a grid you choose
   (1×1, 1×2, 2×2, 1×4…). Images in a row share one height and take the
   width their shape needs, so every cell is flush with its image; rows
   differ, but the grid you set is kept. Click an image to crop it (any
   shape — the row reflows); drag one onto another to swap them. Each image
   can carry a letter (A, B…), a caption and its own structure label
   (evidence, observation…); the whole panel can be one too, and its
   caption below is a normal text with terms, links and structures.
   ========================================================================== */
const FIG = {
  GAP: 4, PRESETS: [[1, 1], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [2, 3], [3, 2], [3, 3], [4, 1]],
  cells(b) { const F = b.fig; const n = F.rows * F.cols; F.cells = F.cells || []; while (F.cells.length < n) F.cells.push({ id: uid('fc') }); return F.cells.slice(0, n); },
  letter: i => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : ''),
  aspect(c) { const m = c.media && MEDIA.get(c.media); if (!m || !m.w || !m.h) return 4 / 3; const k = c.crop || { x: 0, y: 0, w: 1, h: 1 }; return (k.w * m.w) / (k.h * m.h); },
  /** Sizes for every cell: a row's images share a height and fill the width exactly. */
  layout(b, W) {
    const F = b.fig, cells = FIG.cells(b), out = [];
    for (let r = 0; r < F.rows; r++) { const row = cells.slice(r * F.cols, (r + 1) * F.cols), as = row.map(FIG.aspect), sum = as.reduce((s, a) => s + a, 0), H = (W - FIG.GAP * (row.length - 1)) / sum;
      row.forEach((c, i) => out.push({ c, w: as[i] * H, h: H, r, i: r * F.cols + i })); }
    return out;
  },
  save(b) { b.modified = isoLocal(new Date()); FIG.syncText(b); DB.put('blocks', b); const d = M.doc(b.docId); d && M.touchDoc(d); },
  /** The searchable text: letters, captions and file names (the caption editor keeps its own text). */
  syncText(b) { b.fig.index = FIG.cells(b).map((c, i) => { const m = c.media && MEDIA.get(c.media); return m ? `${FIG.letter(i)}: ${c.caption || ''} ${m.name || ''}`.trim() : ''; }).filter(Boolean).join(' · '); },
  create(d, p, rows, cols, files) {
    const b = M.addBlock(d.id, null, { kind: 'figure', label: 'Figure', x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 560, fig: { rows, cols, letters: true, cells: [] } });
    b.body = { text: '', marks: [] }; FIG.cells(b); DB.put('blocks', b); changed();
    if (files && files.length) FIG.addFiles(b, files); return b;
  },
  async addFiles(b, files, at = 0) {
    const cells = FIG.cells(b); let k = at;
    for (const f of files) { while (k < cells.length && cells[k].media) k++; if (k >= cells.length) { toast('The grid is full — change its layout to add more'); break; }
      const rec = await MEDIA.add(f); if (!['image', 'gif', 'video'].includes(rec.kind)) { toast(rec.name + ' is not an image'); continue; } cells[k].media = rec.id; cells[k].crop = null; k++; }
    const cur = M.block(b.id); cur.fig = b.fig; FIG.save(cur); changed();
  },
  pick(b, at) { PLATE.pickFiles(fs => FIG.addFiles(M.block(b.id), fs, at), true, 'image/*,video/mp4,video/webm,.gif'); },
  /** A structure on one image: its text is the caption (or "Panel A"). */
  labelCell(b, c, i, kind) {
    const text = c.caption || 'Panel ' + FIG.letter(i) + (b.label ? ' · ' + b.label : '');
    if (c.itemId && M.item(c.itemId)) M.setItem(M.item(c.itemId), { kind, text }); else { const it = M.createItem(kind, text, b, { figCell: c.id }); c.itemId = it.id; }
    FIG.save(b); IX.rebuild(); changed(); toast(KIND[kind].label + ' — ' + snippet(text, 40));
  },
  labelPanel(b, kind) {
    const text = (b.body.text || '').trim() || b.label || 'Figure';
    if (b.fig.itemId && M.item(b.fig.itemId)) M.setItem(M.item(b.fig.itemId), { kind, text }); else { const it = M.createItem(kind, text, b, { figPanel: true }); b.fig.itemId = it.id; }
    FIG.save(b); IX.rebuild(); changed();
  },
  kindMenu(e, title, onPick, current, onRemove) {
    ctxMenu(e.clientX, e.clientY + 8, [{ head: title }, ...KINDS.map(k => ({ label: (k.id === current ? '✓ ' : '') + k.label, run: () => onPick(k.id) })), onRemove ? 'sep' : null, onRemove ? { label: 'Remove label', danger: true, sub: 'The record is kept, unlinked', run: onRemove } : null].filter(Boolean));
  },

  /* ---------------- the box ---------------- */
  body(b, d, pane, ro) {
    const F = b.fig, cells = FIG.cells(b), grid = h('div.fg-grid'), panelIt = F.itemId && M.item(F.itemId);
    const draw = () => {
      const W = Math.max(120, grid.clientWidth || (b.w || 560) - 28), L = FIG.layout(b, W); grid.replaceChildren();
      for (let r = 0; r < F.rows; r++) {
        const row = h('div.fg-row', { style: { gap: FIG.GAP + 'px' } });
        L.filter(x => x.r === r).forEach(({ c, w, h: hh, i }) => {
          const m = c.media && MEDIA.get(c.media), it = c.itemId && M.item(c.itemId);
          const frame = h('div.fg-cell' + (m ? '' : '.empty') + (it ? '.lab' : ''), { style: { width: w + 'px', height: hh + 'px', '--kc': it ? `var(--k-${it.kind})` : null }, draggable: !ro && !!m, 'data-i': i,
            title: ro ? '' : m ? 'Click to crop · drag onto another image to swap' : 'Add an image' });
          if (m) { const k = c.crop || { x: 0, y: 0, w: 1, h: 1 }, iw = w / k.w, ih = hh / k.h; frame.append(MEDIA.el(m, { style: { position: 'absolute', width: iw + 'px', height: ih + 'px', left: -k.x * iw + 'px', top: -k.y * ih + 'px', maxWidth: 'none', pointerEvents: 'none' } })); }
          else frame.append(h('span.fg-add', '+ image'));
          if (F.letters !== false && m) frame.append(h('span.fg-letter', FIG.letter(i)));
          if (it) frame.append(h('button.fg-kind' + (w < 96 ? '.dot' : ''), { title: 'Change or remove the label', on: { click: e => { e.stopPropagation(); if (ro) return; FIG.kindMenu(e, 'Image ' + FIG.letter(i), k => FIG.labelCell(M.block(b.id), FIG.cells(M.block(b.id))[i], i, k), it.kind, () => { const cur = M.block(b.id), cc = FIG.cells(cur)[i]; cc.itemId = null; FIG.save(cur); IX.rebuild(); changed(); }); } } }, kchip(it.kind)));
          else if (m && !ro) frame.append(h('button.fg-kind.add', { title: 'Label this image as a structure', on: { click: e => { e.stopPropagation(); FIG.kindMenu(e, 'Image ' + FIG.letter(i) + ' is…', k => FIG.labelCell(M.block(b.id), FIG.cells(M.block(b.id))[i], i, k)); } } }, '+ label'));
          if (!ro) {
            frame.addEventListener('click', e => { if (e.target.closest('button')) return; e.stopPropagation(); m ? FIG.cropDialog(M.block(b.id), i) : FIG.pick(b, i); });
            frame.addEventListener('dragstart', e => { e.dataTransfer.setData('text/fig', b.id + ':' + i); e.dataTransfer.effectAllowed = 'move'; });
            frame.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/fig') || [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); frame.classList.add('over'); } });
            frame.addEventListener('dragleave', () => frame.classList.remove('over'));
            frame.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); frame.classList.remove('over');
              if (e.dataTransfer.files && e.dataTransfer.files.length) { const cur = M.block(b.id); FIG.cells(cur)[i].media = null; return FIG.addFiles(cur, [...e.dataTransfer.files], i); }
              const [bid, j] = (e.dataTransfer.getData('text/fig') || '').split(':'); if (bid !== b.id || +j === i) return; const cur = M.block(b.id), cs = FIG.cells(cur), t = cs[+j]; cur.fig.cells[+j] = cs[i]; cur.fig.cells[i] = t; FIG.save(cur); changed(); });
          }
          const cap = ro ? (c.caption ? h('div.fg-cap', c.caption) : null) : m ? h('input.fg-cap', { value: c.caption || '', title: c.caption || '', placeholder: FIG.letter(i) + ' caption', on: { pointerdown: e => e.stopPropagation(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); },
            change: e => { const cur = M.block(b.id), cc = FIG.cells(cur)[i]; cc.caption = e.target.value.trim(); if (cc.itemId && M.item(cc.itemId)) M.setItem(M.item(cc.itemId), { text: cc.caption || 'Panel ' + FIG.letter(i) }); FIG.save(cur); } } }) : null;
          row.append(h('div.fg-col', { style: { width: w + 'px' } }, frame, cap));
        });
        grid.append(row);
      }
    };
    requestAnimationFrame(draw);
    try { const ro2 = new ResizeObserver(() => { if (grid.isConnected && Math.abs((grid._w || 0) - grid.clientWidth) > 2) { grid._w = grid.clientWidth; draw(); } }); ro2.observe(grid); } catch { }
    const ed = h('div.ed.fg-capt', { 'data-ph': 'Caption for the whole panel…' }); if (ro) { ED.render(ed, b, d); ed.contentEditable = 'false'; } else ED.attach(ed, b);
    const bar = h('div.fg-bar', panelIt ? h('button.fg-pk', { title: 'The whole panel is labelled — click to change', on: { click: e => { if (ro) return; FIG.kindMenu(e, 'The whole panel', k => FIG.labelPanel(M.block(b.id), k), panelIt.kind, () => { const cur = M.block(b.id); cur.fig.itemId = null; FIG.save(cur); IX.rebuild(); changed(); }); } } }, kchip(panelIt.kind), ' whole panel') : null,
      h('span.spacer'), ro ? null : h('button.btn.xs', { on: { click: e => FIG.layoutMenu(M.block(b.id), e) } }, F.rows + '×' + F.cols + ' ▾'),
      ro ? null : h('button.btn.xs', { on: { click: () => FIG.pick(b, 0) } }, '+ images'), pane && pane.maxView ? null : h('button.btn.xs', { title: 'Maximise', on: { click: () => FIG.max(M.block(b.id)) } }, '⤢'));
    const el = h('div.fgbox', bar, grid, ed);
    el.addEventListener('mouseenter', () => MEDIA.playIn(el, true)); el.addEventListener('mouseleave', () => MEDIA.playIn(el, false));
    return el;
  },
  /** The whole panel filling the screen (images as large as fit); click an image to crop it, arrows inside. */
  max(b) {
    const d = M.doc(b.docId); if (!d) return; let ov;
    const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); }, key = e => { if (e.key === 'Escape' && !$('.ovl')) { e.stopPropagation(); close(); } };
    const fitW = () => { const availH = innerHeight - 150, availW = innerWidth - 80; let W = availW; for (let t = 0; t < 6; t++) { const L = FIG.layout(b, W), rows = [...new Set(L.map(x => x.r))], H = rows.reduce((s, r) => s + Math.max(...L.filter(x => x.r === r).map(x => x.h)) + 30, 0); if (H <= availH) break; W = Math.max(240, W * availH / H); } return Math.floor(W); };
    const draw = () => { const cur = M.block(b.id); const body = FIG.body(cur, d, { maxView: true }, false); body.style.width = fitW() + 'px'; return h('div.fg-max-wrap', body); };
    let content = draw();
    ov = h('div.embed-max.fg-max', h('div.em-bar', h('b', b.label || 'Image panel'), h('span.tiny.muted', b.fig.rows + '×' + b.fig.cols + ' · ' + (d.title || '')), h('span.spacer'), h('button.btn.sm', { on: { click: close } }, 'Close ✕')), content);
    document.body.append(ov); document.addEventListener('keydown', key, true);
    const re = () => { if (!ov.isConnected) return window.removeEventListener('resize', re); const n = draw(); content.replaceWith(n); content = n; }; window.addEventListener('resize', re);
    let sig = JSON.stringify(b.fig); const t = setInterval(() => { if (!ov.isConnected) return clearInterval(t); const cur = M.block(b.id), s = cur && JSON.stringify(cur.fig); if (s && s !== sig && !$('.ovl')) { sig = s; re(); } }, 600);
  },
  layoutMenu(b, e) {
    const set = (r, c) => { const n = r * c, have = FIG.cells(b).filter(x => x.media); if (have.length > n && !confirm(`${have.length} images won't fit in ${r}×${c}; the last ${have.length - n} will be taken out of the panel (their files stay). Continue?`)) return;
      const keep = [...have, ...FIG.cells(b).filter(x => !x.media)]; b.fig.rows = r; b.fig.cols = c; b.fig.cells = keep.slice(0, n); FIG.cells(b); FIG.save(b); changed(); };
    ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Panel layout (rows × columns)' }, ...FIG.PRESETS.map(([r, c]) => ({ label: (r === b.fig.rows && c === b.fig.cols ? '✓ ' : '') + r + ' × ' + c, run: () => set(r, c) })),
      { label: 'Custom…', run: async () => { const v = await askText('Rows × columns', 'e.g. 2x3', b.fig.rows + 'x' + b.fig.cols); const m = /^(\d+)\s*[x×*]\s*(\d+)$/.exec(v || ''); if (m && +m[1] > 0 && +m[2] > 0 && +m[1] * +m[2] <= 36) set(+m[1], +m[2]); else if (v) toast('Use rows×columns, up to 36 cells'); } },
      'sep', { label: (b.fig.letters !== false ? 'Hide' : 'Show') + ' panel letters', run: () => { b.fig.letters = b.fig.letters === false; FIG.save(b); changed(); } }]);
  },

  /* ---------------- crop: any rectangle on the full image ---------------- */
  cropDialog(b, i) {
    const c = FIG.cells(b)[i], m = MEDIA.get(c.media); if (!m) return;
    let k = Object.assign({ x: 0, y: 0, w: 1, h: 1 }, c.crop || {}), ratio = null;
    const MW = Math.min(820, innerWidth - 140), MH = Math.min(520, innerHeight - 280), s = Math.min(MW / (m.w || 1), MH / (m.h || 1)), W = (m.w || 1) * s, H = (m.h || 1) * s;
    const stage = h('div.fgc-stage', { style: { width: W + 'px', height: H + 'px' } }, MEDIA.el(m, { style: { width: W + 'px', height: H + 'px', display: 'block' }, live: true }));
    const shade = h('div.fgc-shade'), box = h('div.fgc-box', ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(p => h('i.fgc-h.' + p, { 'data-h': p }))), info = h('span.mono.tiny');
    stage.append(shade, box);
    const paint = () => { Object.assign(box.style, { left: k.x * W + 'px', top: k.y * H + 'px', width: k.w * W + 'px', height: k.h * H + 'px' });
      shade.style.clipPath = `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${k.x * 100}% ${k.y * 100}%,${k.x * 100}% ${(k.y + k.h) * 100}%,${(k.x + k.w) * 100}% ${(k.y + k.h) * 100}%,${(k.x + k.w) * 100}% ${k.y * 100}%,${k.x * 100}% ${k.y * 100}%)`;
      info.textContent = `${Math.round(k.w * m.w)} × ${Math.round(k.h * m.h)} px · ${(k.w * m.w / (k.h * m.h)).toFixed(2)}:1`; };
    const fix = () => { const minW = 12 / W, minH = 12 / H; k.w = clamp(k.w, minW, 1); k.h = clamp(k.h, minH, 1); k.x = clamp(k.x, 0, 1 - k.w); k.y = clamp(k.y, 0, 1 - k.h); };
    const applyRatio = () => { if (!ratio) return; const want = ratio * (m.h / m.w); // in fraction units w/h
      if (k.w / k.h > want) { const nw = k.h * want; k.x += (k.w - nw) / 2; k.w = nw; } else { const nh = k.w / want; k.y += (k.h - nh) / 2; k.h = nh; } fix(); };
    stage.addEventListener('pointerdown', e => {
      e.preventDefault(); const hd = e.target.dataset && e.target.dataset.h, r0 = stage.getBoundingClientRect(), p0 = { x: (e.clientX - r0.left) / W, y: (e.clientY - r0.top) / H }, k0 = Object.assign({}, k);
      const full = k.w > .98 && k.h > .98, mode = hd || (e.target === box && !full ? 'move' : 'new');
      const mv = ev => { const px = clamp((ev.clientX - r0.left) / W, 0, 1), py = clamp((ev.clientY - r0.top) / H, 0, 1), dx = px - p0.x, dy = py - p0.y;
        if (mode === 'move') { k.x = k0.x + dx; k.y = k0.y + dy; }
        else if (mode === 'new') { k = { x: Math.min(p0.x, px), y: Math.min(p0.y, py), w: Math.abs(px - p0.x), h: Math.abs(py - p0.y) }; if (ratio) { const want = ratio * (m.h / m.w); k.h = k.w / want; if (py < p0.y) k.y = p0.y - k.h; } }
        else { let { x, y, w, h: hh } = k0; if (mode.includes('e')) w = k0.w + dx; if (mode.includes('s')) hh = k0.h + dy; if (mode.includes('w')) { x = k0.x + dx; w = k0.w - dx; } if (mode.includes('n')) { y = k0.y + dy; hh = k0.h - dy; }
          if (ratio) { const want = ratio * (m.h / m.w); if (mode === 'n' || mode === 's') w = hh * want; else hh = w / want; if (mode.includes('n')) y = k0.y + k0.h - hh; if (mode.includes('w')) x = k0.x + k0.w - w; }
          k = { x, y, w, h: hh }; if (k.w < 0) { k.x += k.w; k.w = -k.w; } if (k.h < 0) { k.y += k.h; k.h = -k.h; } }
        fix(); paint(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    const ratios = h('div.seg.sm', [['Free', null], ['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['16:9', 16 / 9]].map(([l, v]) => h('button' + (v === ratio ? '.on' : ''), { on: { click: e => { ratio = v; $$('button', ratios).forEach(x => x.classList.toggle('on', x === e.currentTarget)); applyRatio(); paint(); } } }, l)));
    paint();
    // move between the panel's images like between wells: arrows, or the little map; the crop so far is kept
    const commit = () => { const cur = M.block(b.id), cc = FIG.cells(cur)[i]; const nk = k.w > .999 && k.h > .999 ? null : { x: +k.x.toFixed(4), y: +k.y.toFixed(4), w: +k.w.toFixed(4), h: +k.h.toFixed(4) }; if (JSON.stringify(nk) !== JSON.stringify(cc.crop || null)) { cc.crop = nk; FIG.save(cur); changed(); } };
    const R = b.fig.rows, C = b.fig.cols, go = j => { if (j === i || j < 0 || j >= R * C) return; const cs = FIG.cells(M.block(b.id)); if (!cs[j] || !cs[j].media) return; commit(); mm.close(); FIG.cropDialog(M.block(b.id), j); };
    const step = (dr, dc) => { const cs = FIG.cells(M.block(b.id)); let r = Math.floor(i / C), c0 = i % C; for (let n = 0; n < R * C; n++) { r += dr; c0 += dc; if (dc) { if (c0 >= C) { c0 = 0; r++; } if (c0 < 0) { c0 = C - 1; r--; } } if (r < 0 || r >= R) return; const j = r * C + c0; if (cs[j] && cs[j].media) return go(j); } };
    const map = h('div.fgc-map', { style: { gridTemplateColumns: `repeat(${C},14px)` } }, FIG.cells(b).map((cc, j) => h('button.fgc-m' + (j === i ? '.on' : '') + (cc.media ? '' : '.empty'), { title: FIG.letter(j), disabled: !cc.media, on: { click: () => go(j) } }, FIG.letter(j))));
    const keyNav = e => { if ($('.pop')) return; const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!d || e.target.closest('input,textarea')) return; e.preventDefault(); e.stopPropagation(); step(...d); };
    document.addEventListener('keydown', keyNav, true);
    const mm = modal({ onClose: () => document.removeEventListener('keydown', keyNav, true), title: 'Crop image ' + FIG.letter(i) + ' · ' + (m.name || ''), wide: true, body: h('div.fgc', h('div.row', { style: { gap: '8px', marginBottom: '10px' } }, R * C > 1 ? map : null, R * C > 1 ? h('span.tiny.muted', '← ↑ → ↓ other images') : null, h('span.tiny.muted', 'Shape'), ratios, h('span.spacer'), info), h('div.fgc-wrap', stage),
      h('p.tiny.muted', { style: { marginTop: '8px' } }, 'Drag across the image to draw the crop; then drag inside it to move it, or its edges and corners to resize (or drag outside it to draw again). The panel reflows to the new shape.')),
      actions: [{ label: 'Remove image', danger: true, run: () => { const cur = M.block(b.id), cc = FIG.cells(cur)[i]; cc.media = null; cc.crop = null; FIG.save(cur); changed(); } }, { label: 'Reset', keep: true, run: () => { k = { x: 0, y: 0, w: 1, h: 1 }; ratio = null; paint(); } }, { label: 'Cancel' },
        { label: 'Crop', pri: true, run: () => { const cur = M.block(b.id), cc = FIG.cells(cur)[i]; cc.crop = k.w > .999 && k.h > .999 ? null : { x: +k.x.toFixed(4), y: +k.y.toFixed(4), w: +k.w.toFixed(4), h: +k.h.toFixed(4) }; FIG.save(cur); changed(); } }] });
  },

  insert(d, p) {
    const pick = (r, c) => { m.close(); PLATE.pickFiles(fs => FIG.create(d, p, r, c, fs), true, 'image/*,video/mp4,video/webm,.gif'); };
    const tile = (r, c) => h('button.fg-preset', { title: r + ' × ' + c, on: { click: () => pick(r, c) } }, h('span.fg-mini', { style: { gridTemplateColumns: `repeat(${c},1fr)`, gridTemplateRows: `repeat(${r},1fr)` } }, Array.from({ length: r * c }, () => h('i'))), h('b', r + ' × ' + c));
    const rr = h('input.inp.mono', { type: 'number', min: 1, max: 6, value: 2, style: { width: '64px' } }), cc = h('input.inp.mono', { type: 'number', min: 1, max: 6, value: 3, style: { width: '64px' } });
    const m = modal({ title: 'Image panel', wide: true, body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Pick a grid, then the images (they fill the cells in order; add more or swap later). Images in a row share a height, so each cell is flush with its image.'),
      h('div.fg-presets', FIG.PRESETS.map(([r, c]) => tile(r, c))), h('div.row', { style: { gap: '6px', marginTop: '12px' } }, h('span.tiny', 'Custom'), rr, '×', cc, h('button.btn.sm', { on: { click: () => pick(clamp(+rr.value || 1, 1, 6), clamp(+cc.value || 1, 1, 6)) } }, 'Choose images…'),
        h('span.spacer'), h('button.btn.sm.ghost', { on: { click: () => { m.close(); FIG.create(d, p, 1, 2); } } }, 'Empty 1×2'))), actions: [{ label: 'Cancel' }] });
  },
};
WIDGETS.figure = { label: 'image panel', w: 560, body: FIG.body, menu: b => [
  { label: 'Maximise', run: () => FIG.max(b) },
  { label: 'Layout…', run: () => { const box = $(`.box[data-id="${b.id}"] .fg-bar .btn`); box && box.click(); } },
  { label: b.fig && b.fig.itemId && M.item(b.fig.itemId) ? 'Whole panel: ' + KIND[M.item(b.fig.itemId).kind].label : 'Label the whole panel as…', run: ev => FIG.kindMenu(ev || { clientX: innerWidth / 2, clientY: 200 }, 'The whole panel is…', k => FIG.labelPanel(M.block(b.id), k), b.fig && b.fig.itemId && (M.item(b.fig.itemId) || {}).kind) },
  { label: 'Add images…', run: () => FIG.pick(b, 0) }] };
INSERTS.push({ id: 'figure', group: 'Widgets', icon: '▦', label: 'Image panel…', sub: '1×1, 1×2, 2×2, 1×4… flush to each image; crop, letters, captions, labels', run: (d, p) => FIG.insert(d, p) });

/* the figure's own structures count as the component's */
{ const rebuild = IX.rebuild.bind(IX); IX.rebuild = (...a) => { const r = rebuild(...a);
  DB.where('blocks', b => b.kind === 'figure' && b.fig && b.status !== 'removed').forEach(b => { const ids = [b.fig.itemId, ...(b.fig.cells || []).map(c => c.itemId)].filter(id => id && M.item(id)); if (!ids.length) return; const cur = IX.blockItems.get(b.id) || []; IX.blockItems.set(b.id, [...new Set([...cur, ...ids])]); });
  return r; }; }
