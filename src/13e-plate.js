/* ==========================================================================
   13e · Widgets and the Insert menu.
   WIDGETS[kind] renders a block of that kind on the paper; INSERTS lists what
   "+ Insert" offers. A new widget = one WIDGETS entry + one INSERTS row.

   The well plate: each well is filled with a colour and shows its id
   (A1, B3…), or — in image mode — the image, GIF or video placed in it,
   cropped to the well. Notes on a well hang outside its border (or show on
   hover). Clicking a well opens it: the full images in time order, its
   notes, and a minimap to move to other wells. A plate carried into the
   Run keeps the plan (colours, planned notes) and starts with empty wells.
   ========================================================================== */
const WIDGETS = {};
const PLATE_FORMATS = { 1: [1, 1], 6: [2, 3], 12: [3, 4], 24: [4, 6], 48: [6, 8], 96: [8, 12], 384: [16, 24] };
const PLATE_COLORS = ['#E9C46A', '#F4A261', '#E76F51', '#D1495B', '#B5179E', '#7B2CBF', '#4361EE', '#4CC9F0', '#2A9D8F', '#43AA8B', '#90BE6D', '#8D99AE', '#ADB5BD', '#FFFFFF'];
const ROWS = 'ABCDEFGHIJKLMNOP';

const PLATE = {
  dims: b => PLATE_FORMATS[b.fmt] || PLATE_FORMATS[96],
  ids(b) { const [r, c] = PLATE.dims(b), out = []; for (let i = 0; i < r; i++) for (let j = 1; j <= c; j++) out.push(ROWS[i] + j); return out; },
  rc: id => [ROWS.indexOf(id[0]), +id.slice(1) - 1],
  well: (b, id) => (b.wells || {})[id] || {},
  setWell(b, id, patch) { b.wells = Object.assign({}, b.wells); b.wells[id] = Object.assign({}, b.wells[id], patch); PLATE.sync(b); },
  media: (b, id) => (PLATE.well(b, id).media || []).map(m => Object.assign({}, m, { rec: MEDIA.get(m.id) })).filter(m => m.rec),
  sync(b) {
    const lines = Object.entries(b.wells || {}).filter(([, w]) => w.info || (w.planned && w.planned.info)).map(([id, w]) => `${id}: ${w.info || ''}${w.planned && w.planned.info ? ' (planned: ' + w.planned.info + ')' : ''}`);
    const leg = Object.entries(b.legend || {}).filter(([, v]) => v).map(([c, v]) => v);
    b.body = { text: [`${b.label || 'Well plate'} · ${b.fmt}-well`, ...leg, ...lines].join('\n'), marks: [] }; b.modified = isoLocal(new Date());
  },
  save(b) { PLATE.sync(b); DB.put('blocks', b); const d = M.doc(b.docId); if (d) M.touchDoc(d); changed(); },
  insert(docId, x, y, init = {}) {
    const d = M.doc(docId), n = M.liveBlocks(docId).filter(x => x.kind === 'plate').length + 1;
    const b = M.addBlock(docId, null, Object.assign({ kind: 'plate', label: 'Plate ' + n, fmt: 96, mode: 'color', infoShow: true, wells: {}, legend: {}, stage: prof(d.type).bindsTo === 'protocol' ? 'run' : 'plan', x, y, w: 616 }, init));
    PLATE.sync(b); DB.put('blocks', b); changed(); return b;
  },
  /** The plan travels to the Run: colours, legend and planned notes stay; notes and images start empty. */
  carry(src, docId, x, y) {
    const wells = {}; for (const [id, w] of Object.entries(src.wells || {})) wells[id] = { color: w.color || null, planned: { info: w.info || '', media: (w.media || []).map(m => ({ id: m.id, crop: m.crop })) }, info: '', media: [] };
    return PLATE.insert(docId, x, y, { label: src.label, fmt: src.fmt, legend: Object.assign({}, src.legend), wells, mode: 'color', from: { blockId: src.id, docId: src.docId }, stage: 'run' });
  },

  /* ---------------- the widget on the paper ---------------- */
  body(b, d, pane, ro) {
    const [R, C] = PLATE.dims(b), sel = pane._plateSel && pane._plateSel.id === b.id ? pane._plateSel.set : new Set();
    const D = ((b.w || 616) - 60 - 4 * C) / C, wrap = h('div.wplate-wrap' + (b.mode === 'image' ? '.img' : '') + (b.infoShow ? '' : '.collapsed'), { 'data-fmt': b.fmt, style: { '--cols': C, '--rows': R, '--wfs': clamp(D * 0.28, 6, 15) + 'px' } });
    const tool = ro ? null : h('div.wtool.nopan',
      h('select.inp.wfmt', { title: 'Plate format', on: { change: e => { b.fmt = +e.target.value; PLATE.save(b); } } }, Object.keys(PLATE_FORMATS).map(k => h('option', { value: k, selected: +k === +b.fmt }, +k === 1 ? 'Single well / dish' : k + '-well'))),
      h('div.seg.sm', [['color', 'Colour'], ['image', 'Image']].map(([k, l]) => h('button' + ((b.mode || 'color') === k ? '.on' : ''), { title: k === 'color' ? 'Solid fills with each well’s id' : 'Each well shows what you placed in it', on: { click: () => { b.mode = k; PLATE.save(b); } } }, l))),
      h('button.wbtn' + (b.infoShow ? '.on' : ''), { title: b.infoShow ? 'Notes hang outside the wells — click to show them only on hover' : 'Notes show on hover — click to show them all', on: { click: () => { b.infoShow = !b.infoShow; PLATE.save(b); } } }, b.infoShow ? '✎ Notes shown' : '✎ Notes on hover'),
      h('span.spacer'),
      sel.size ? h('span.wsel', plural(sel.size, 'well') + ' selected') : h('span.tiny.muted', 'Drag across wells to select'));
    const selBar = !ro && sel.size ? h('div.wselbar.nopan',
      PLATE_COLORS.map(c => h('button.swatch', { style: { '--c': c }, title: c, on: { click: () => { sel.forEach(id => PLATE.setWell(b, id, { color: c })); PLATE.save(b); } } })),
      h('label.swatch.custom', { title: 'Any colour' }, '+', h('input', { type: 'color', on: { change: e => { sel.forEach(id => PLATE.setWell(b, id, { color: e.target.value })); PLATE.save(b); } } })),
      h('button.wbtn', { title: 'Remove the fill', on: { click: () => { sel.forEach(id => PLATE.setWell(b, id, { color: null })); PLATE.save(b); } } }, 'No fill'),
      h('span.dk-sep'),
      h('button.wbtn', { on: { click: async () => { const t = await askText('Note for ' + plural(sel.size, 'well'), 'Note', sel.size === 1 ? PLATE.well(b, [...sel][0]).info || '' : '', { multiline: true }); if (t == null) return; sel.forEach(id => PLATE.setWell(b, id, { info: t })); PLATE.save(b); } } }, 'Note…'),
      h('button.wbtn', { on: { click: () => PLATE.pickFiles(files => PLATE.addMedia(b, [...sel], files)) } }, 'Image / video…'),
      h('button.wbtn', { on: { click: () => { pane._plateSel = null; pane.update(pane.docId); } } }, 'Done')) : null;
    const plate = h('div.wplate.nopan');
    plate.append(h('div.wcorner', { title: 'Select all', on: { click: () => PLATE.select(pane, b, PLATE.ids(b), false) } }));
    for (let j = 1; j <= C; j++) plate.append(h('div.wcol', { on: { click: e => PLATE.select(pane, b, PLATE.ids(b).filter(id => +id.slice(1) === j), e.shiftKey) } }, j));
    const span = {}; for (let i = 0; i < R; i++) { let j = 1; while (j <= C) { const t = PLATE.well(b, ROWS[i] + j).info; let k = j; while (t && k < C && PLATE.well(b, ROWS[i] + (k + 1)).info === t) k++; if (t && k > j) { span[ROWS[i] + j] = ROWS[i] + j + '–' + k; for (let q = j + 1; q <= k; q++) span[ROWS[i] + q] = 'dup'; } j = k + 1; } }
    pane._span = span;
    for (let i = 0; i < R; i++) {
      plate.append(h('div.wrow', { on: { click: e => PLATE.select(pane, b, PLATE.ids(b).filter(id => id[0] === ROWS[i]), e.shiftKey) } }, ROWS[i]));
      for (let j = 1; j <= C; j++) plate.append(PLATE.wellEl(b, ROWS[i] + j, sel.has(ROWS[i] + j), pane, ro));
    }
    PLATE.dragSelect(plate, b, pane, ro);
    plate.addEventListener('mouseenter', () => PLATE.animate(plate, true)); plate.addEventListener('mouseleave', () => PLATE.animate(plate, false));
    const used = [...new Set(Object.values(b.wells || {}).map(w => w.color).filter(Boolean))];
    const legend = used.length ? h('div.wlegend.nopan', used.map(c => h('label.wleg', h('i', { style: { background: c } }), ro ? h('span', (b.legend || {})[c] || '—') : h('input', { value: (b.legend || {})[c] || '', placeholder: 'what this colour means', on: { change: e => { b.legend = Object.assign({}, b.legend, { [c]: e.target.value.trim() }); PLATE.save(b); }, keydown: e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } } })))) : null;
    const src = b.from && M.block(b.from.blockId), origin = src ? h('div.porigin', 'Planned in ', h('a', { on: { click: e => App.jump(src.id, e) } }, (M.doc(src.docId) || {}).title || 'another note'), h('span.pstat', 'notes and images start empty here')) : null;
    wrap.append(...[origin, tool, selBar, plate, legend].filter(Boolean));
    return wrap;
  },
  wellEl(b, id, selected, pane, ro) {
    const w = PLATE.well(b, id), media = PLATE.media(b, id), img = b.mode === 'image' && media.length, planned = w.planned || {};
    const el = h('div.well' + (w.color ? '.fill' : '') + (selected ? '.sel' : '') + (img ? '.hasimg' : '') + (media.length ? '.hasmedia' : '') + (w.info ? '.hasinfo' : ''), { 'data-well': id, style: { '--wc': w.color || 'transparent' }, title: '' });
    if (img) { const m = media[0], disc = h('div.wdisc'); disc.append(MEDIA.cropped(m.rec, m.crop)); if (media.length > 1) disc.dataset.frames = media.length; el.append(disc); if (media.length > 1) el.append(h('span.wcount', media.length)); }
    else el.append(h('span.wid', id));
    if (media.length && b.mode !== 'image') el.append(h('span.wdot', { title: plural(media.length, 'image') }));
    const info = w.info || (b.stage === 'run' && planned.info ? '' : '');
    const sp = (pane._span || {})[id];
    if (info) el.append(h('div.winfo' + (sp === 'dup' ? '.dup' : ''), h('b', sp && sp !== 'dup' ? sp : id), ' ', info));
    if (b.mode === 'image' && !img && w.color) el.classList.add('ghostfill');
    if (!info && (planned.info || media.length)) el.addEventListener('mouseenter', () => hoverCard(el, () => h('div', h('b', id), planned.info ? h('div.tiny', 'Planned: ' + planned.info) : null, media.length ? h('div.tiny.muted', plural(media.length, 'image') + ' · click to open') : null)));
    return el;
  },
  /** Drag across wells to select a rectangle (Shift adds); a click without a drag opens the well. */
  dragSelect(plate, b, pane, ro) {
    plate.addEventListener('pointerdown', e => {
      const w0 = e.target.closest('.well'); if (!w0 || e.button !== 0) return; e.stopPropagation(); e.preventDefault();
      const a = PLATE.rc(w0.dataset.well), base = e.shiftKey && pane._plateSel && pane._plateSel.id === b.id ? new Set(pane._plateSel.set) : new Set(); let cur = a, moved = false;
      const paint = () => { const s = new Set(base); for (let i = Math.min(a[0], cur[0]); i <= Math.max(a[0], cur[0]); i++) for (let j = Math.min(a[1], cur[1]); j <= Math.max(a[1], cur[1]); j++) s.add(ROWS[i] + (j + 1));
        $$('.well', plate).forEach(x => x.classList.toggle('sel', s.has(x.dataset.well))); return s; };
      const mv = ev => { const t = document.elementFromPoint(ev.clientX, ev.clientY), wl = t && t.closest && t.closest('.well'); if (!wl || !plate.contains(wl)) return; const rc = PLATE.rc(wl.dataset.well); if (rc[0] !== cur[0] || rc[1] !== cur[1]) { cur = rc; moved = true; paint(); } };
      const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
        if (!moved && !e.shiftKey) { PLATE.open(b, w0.dataset.well, pane, ro); return; }
        if (ro) return; const s = paint(); pane._plateSel = { id: b.id, set: s }; pane.update(pane.docId); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
  },
  select(pane, b, ids, add) { const s = add && pane._plateSel && pane._plateSel.id === b.id ? new Set(pane._plateSel.set) : new Set(); ids.forEach(i => s.add(i)); pane._plateSel = { id: b.id, set: s }; pane.update(pane.docId); },
  /** Hovering the plate plays its videos and GIFs, and steps through wells holding a timelapse. */
  animate(plate, on) {
    MEDIA.playIn(plate, on); clearInterval(plate._tl);
    const b = M.block(plate.closest('.box') && plate.closest('.box').dataset.id); if (!b) return;
    const discs = $$('.wdisc[data-frames]', plate);
    if (!on) { discs.forEach(dc => { const id = dc.closest('.well').dataset.well, m = PLATE.media(b, id)[0]; if (m) dc.replaceChildren(MEDIA.cropped(m.rec, m.crop)); }); return; }
    if (!discs.length) return; let k = 0;
    plate._tl = setInterval(() => { k++; discs.forEach(dc => { const id = dc.closest('.well').dataset.well, ms = PLATE.media(b, id); if (!ms.length) return; const m = ms[k % ms.length]; dc.replaceChildren(MEDIA.cropped(m.rec, m.crop, { live: true })); }); }, 650);
  },
  pickFiles(cb, multiple = true, accept = 'image/*,video/mp4,video/webm,video/quicktime,.gif,.mp4,.webm,.mov') { const i = h('input', { type: 'file', multiple, accept }); i.onchange = () => { const fs = [...i.files]; if (fs.length) cb(fs); }; i.click(); },
  /** Store the files (to images/), place them in the wells in name order, then open the crop editor on the first. */
  async addMedia(b, wellIds, files, after) {
    files = files.slice().sort((a, c) => a.name.localeCompare(c.name, undefined, { numeric: true }));
    toast('Adding ' + plural(files.length, 'file') + '…'); const recs = []; for (const f of files) recs.push(await MEDIA.add(f));
    const items = recs.map(r => ({ id: r.id, crop: { z: 1, cx: .5, cy: .5 }, t: r.fileDate ? fmtDay(r.fileDate) + ' ' + fmtTime(r.fileDate) : '', note: '' }));
    wellIds.forEach(id => PLATE.setWell(b, id, { media: [...(PLATE.well(b, id).media || []), ...items.map(x => Object.assign({}, x, { crop: Object.assign({}, x.crop) }))] }));
    if (b.mode !== 'image' && b.stage !== 'run') b.mode = 'image';
    PLATE.save(b); toast(recs.some(r => r.local) ? 'Kept in this browser for now — start the app with launch.bat to save files into its images folder' : plural(recs.length, 'file') + ' saved in the app’s images folder');
    const first = wellIds[0], ms = PLATE.well(b, first).media || [], idx = ms.length - items.length;
    PLATE.cropEditor(b, first, idx, { all: items.length > 1 || wellIds.length > 1, wells: wellIds, count: items.length, done: after });
  },

  /* ---------------- crop: the well's circle over the image; drag to move, wheel or slider to zoom ---------------- */
  cropEditor(b, id, idx, { all = false, wells = [id], count = 1, done } = {}) {
    const ms = PLATE.well(b, id).media || [], item = ms[idx], rec = item && MEDIA.get(item.id); if (!rec) return done && done();
    const c = Object.assign({ z: 1, cx: .5, cy: .5 }, item.crop), D = 300, S = 440;
    const stage = h('div.crop-stage', { style: { width: S + 'px', height: S + 'px' } }), holder = h('div.crop-img', { style: { left: (S - D) / 2 + 'px', top: (S - D) / 2 + 'px', width: D + 'px', height: D + 'px' } });
    const ring = h('div.crop-ring', { style: { left: (S - D) / 2 + 'px', top: (S - D) / 2 + 'px', width: D + 'px', height: D + 'px' } }, h('span', id));
    stage.append(holder, ring);
    const zl = h('span.mono.tiny'), slider = h('input', { type: 'range', min: -3, max: 4, step: 0.001, value: Math.log(c.z) / Math.log(10) * 1 });
    const draw = () => { holder.replaceChildren(MEDIA.cropped(rec, c, { live: true })); slider.value = Math.log10(c.z); zl.textContent = (c.z * 100).toFixed(c.z < 1 ? 1 : 0) + '%'; };
    slider.addEventListener('input', () => { c.z = Math.pow(10, +slider.value); draw(); });
    stage.addEventListener('wheel', e => { e.preventDefault(); c.z = clamp(c.z * Math.exp(-e.deltaY * 0.0016), 0.001, 10000); draw(); }, { passive: false });
    stage.addEventListener('pointerdown', e => { e.preventDefault(); const x0 = e.clientX, y0 = e.clientY, a = { ...c }, m = Math.min(rec.w, rec.h), pxPerImg = D * c.z / m;
      const mv = ev => { c.cx = a.cx - (ev.clientX - x0) / pxPerImg / rec.w; c.cy = a.cy - (ev.clientY - y0) / pxPerImg / rec.h; draw(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    let applyAll = all; draw();
    const fit = z => () => { c.z = z === 'whole' ? Math.min(rec.w, rec.h) / Math.hypot(rec.w, rec.h) : 1; c.cx = .5; c.cy = .5; draw(); };
    modal({ title: `Place it in ${wells.length > 1 ? plural(wells.length, 'well') : 'well ' + id}`, body: h('div.cropper', stage,
      h('div.crop-ctl', h('span.tiny.muted', 'Zoom'), h('button.wbtn', { on: { click: () => { c.z /= 1.25; draw(); } } }, '−'), slider, h('button.wbtn', { on: { click: () => { c.z *= 1.25; draw(); } } }, '+'), zl,
        h('button.wbtn', { title: 'The short side fills the well', on: { click: fit(1) } }, 'Fill well'), h('button.wbtn', { title: 'The whole image inside the well', on: { click: fit('whole') } }, 'Whole image')),
      h('div.tiny.muted', { style: { marginTop: '6px' } }, 'Drag to move · scroll to zoom as far as you like. Only what is inside the circle shows on the plate; the full image stays in the well.'),
      (count > 1 || wells.length > 1) ? h('label.row.tiny', { style: { gap: '6px', marginTop: '8px' } }, h('input', { type: 'checkbox', checked: all, on: { change: e => { applyAll = e.target.checked; } } }), `Use this framing for all ${count > 1 ? plural(count, 'frame') : ''}${count > 1 && wells.length > 1 ? ' in ' : ''}${wells.length > 1 ? plural(wells.length, 'well') : ''} just added`) : null),
      actions: [{ label: 'Cancel', run: () => done && done() }, { label: 'Place', pri: true, run: () => {
        if (applyAll) wells.forEach(wid => { const arr = (PLATE.well(b, wid).media || []).slice(); for (let i = Math.max(0, arr.length - count); i < arr.length; i++) arr[i] = Object.assign({}, arr[i], { crop: { ...c } }); PLATE.setWell(b, wid, { media: arr }); });
        else { const arr = ms.slice(); arr[idx] = Object.assign({}, arr[idx], { crop: { ...c } }); PLATE.setWell(b, id, { media: arr }); }
        PLATE.save(b); done && done(); } }] });
  },

  /* ---------------- a well, opened: full images in time, its notes, a minimap of the plate ---------------- */
  open(b, id, pane, ro, frame = 0) {
    closeSticky(); hideHover();
    const ov = h('div.ovl.wellpop-ovl'), box = h('div.wellpop'); ov.append(box); document.body.append(ov);
    let cur = id, fi = frame, playT = null;
    const close = () => { clearInterval(playT); ov.remove(); document.removeEventListener('keydown', key, true); };
    const key = e => { const typing = e.target.closest && e.target.closest('input,textarea,[contenteditable="true"]');
      if (e.key === 'Escape') { e.stopPropagation(); typing ? e.target.blur() : close(); return; } if (typing) return;
      const [r, c] = PLATE.rc(cur), [R, C] = PLATE.dims(b), mv = (dr, dc) => { const nr = clamp(r + dr, 0, R - 1), nc = clamp(c + dc, 0, C - 1); cur = ROWS[nr] + (nc + 1); fi = 0; draw(); e.preventDefault(); };
      if (e.key === 'ArrowLeft') mv(0, -1); else if (e.key === 'ArrowRight') mv(0, 1); else if (e.key === 'ArrowUp') mv(-1, 0); else if (e.key === 'ArrowDown') mv(1, 0);
      else if (e.key === '[' || e.key === ',') { fi = Math.max(0, fi - 1); draw(); } else if (e.key === ']' || e.key === '.') { fi = fi + 1; draw(); } };
    document.addEventListener('keydown', key, true); ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    const draw = () => {
      clearInterval(playT); playT = null;
      const w = PLATE.well(b, cur), ms = PLATE.media(b, cur); fi = clamp(fi, 0, Math.max(0, ms.length - 1)); const m = ms[fi];
      const [R, C] = PLATE.dims(b), mini = h('div.wmini', { style: { '--cols': C, '--rows': R } });
      PLATE.ids(b).forEach(x => { const wx = PLATE.well(b, x); mini.append(h('button.wm' + (x === cur ? '.on' : '') + ((wx.media || []).length ? '.has' : '') + (wx.info ? '.inf' : ''), { title: x + (wx.info ? ' · ' + wx.info : ''), style: { '--wc': wx.color || 'transparent' }, on: { click: () => { cur = x; fi = 0; draw(); } } })); });
      const viewer = h('div.wview'), planned = w.planned || {};
      if (m) viewer.append(MEDIA.el(m.rec, { live: true, controls: m.rec.kind === 'video', cls: 'wfull' }));
      else viewer.append(h('div.wempty', h('div.wbig', { style: { '--wc': w.color || 'transparent' } }, cur), ro ? null : h('button.btn.sm', { on: { click: () => PLATE.pickFiles(fs => PLATE.addMedia(b, [cur], fs, () => draw())) } }, 'Add images or a video…')));
      const strip = ms.length > 1 ? h('div.wstrip', ms.map((x, i) => h('button.wfr' + (i === fi ? '.on' : ''), { title: x.t || 'frame ' + (i + 1), on: { click: () => { fi = i; draw(); } } }, h('div.wfr-d', MEDIA.cropped(x.rec, x.crop)), h('span', x.t || i + 1)))) : null;
      const timeBar = ms.length > 1 ? h('div.wtime', h('button.wbtn', { on: { click: () => { fi = Math.max(0, fi - 1); draw(); } } }, '◀'),
        h('button.wbtn', { title: 'Play through the frames', on: { click: e => { if (playT) { clearInterval(playT); playT = null; e.target.textContent = '▶ Play'; return; } e.target.textContent = '❚❚'; playT = setInterval(() => { fi = (fi + 1) % ms.length; const keep = playT; draw(); playT = keep; }, 700); } } }, '▶ Play'),
        h('input', { type: 'range', min: 0, max: ms.length - 1, value: fi, on: { input: e => { fi = +e.target.value; draw(); } } }),
        h('button.wbtn', { on: { click: () => { fi = Math.min(ms.length - 1, fi + 1); draw(); } } }, '▶'), h('span.mono.tiny', `${fi + 1} / ${ms.length}`)) : null;
      const editMedia = m && !ro ? h('div.wmedia-ed',
        h('input.inp', { value: m.t || '', placeholder: 'Time point / label (e.g. 0 h, 24 h)', on: { change: e => { const arr = (w.media || []).slice(); arr[fi] = Object.assign({}, arr[fi], { t: e.target.value }); PLATE.setWell(b, cur, { media: arr }); PLATE.save(b); draw(); } } }),
        h('button.wbtn', { title: 'Choose what the well shows on the plate', on: { click: () => PLATE.cropEditor(b, cur, fi, { done: () => draw() }) } }, 'Crop in well…'),
        h('button.wbtn', { title: 'Earlier', disabled: fi === 0, on: { click: () => { const arr = (w.media || []).slice(); [arr[fi - 1], arr[fi]] = [arr[fi], arr[fi - 1]]; PLATE.setWell(b, cur, { media: arr }); PLATE.save(b); fi--; draw(); } } }, '↤'),
        h('button.wbtn', { title: 'Later', disabled: fi >= ms.length - 1, on: { click: () => { const arr = (w.media || []).slice(); [arr[fi + 1], arr[fi]] = [arr[fi], arr[fi + 1]]; PLATE.setWell(b, cur, { media: arr }); PLATE.save(b); fi++; draw(); } } }, '↦'),
        h('button.wbtn', { on: { click: () => PLATE.pickFiles(fs => PLATE.addMedia(b, [cur], fs, () => { fi = PLATE.media(b, cur).length - 1; draw(); })) } }, '+ Add'),
        h('button.wbtn.danger', { title: 'Take it out of this well (the file stays in the images folder)', on: { click: () => { const arr = (w.media || []).slice(); arr.splice(fi, 1); PLATE.setWell(b, cur, { media: arr }); PLATE.save(b); draw(); } } }, 'Remove')) : null;
      const side = h('div.wside',
        h('div.wside-h', h('span.wbadge', { style: { '--wc': w.color || 'transparent' } }, cur), h('div', h('b', b.label || 'Well plate'), h('div.tiny.muted', `${b.fmt}-well · ${b.stage === 'run' ? 'run' : 'plan'}${(b.legend || {})[w.color] ? ' · ' + b.legend[w.color] : ''}`))),
        ro ? null : h('div.wsw', PLATE_COLORS.map(c => h('button.swatch' + (w.color === c ? '.on' : ''), { style: { '--c': c }, on: { click: () => { PLATE.setWell(b, cur, { color: c }); PLATE.save(b); draw(); } } })),
          h('label.swatch.custom', '+', h('input', { type: 'color', value: w.color || '#888888', on: { change: e => { PLATE.setWell(b, cur, { color: e.target.value }); PLATE.save(b); draw(); } } })),
          h('button.swatch.none', { title: 'No fill', on: { click: () => { PLATE.setWell(b, cur, { color: null }); PLATE.save(b); draw(); } } })),
        h('label.f', h('span', 'Notes for ' + cur), h('textarea.inp', { rows: 6, readOnly: ro, placeholder: b.stage === 'run' ? 'What you saw in this well…' : 'What goes in this well — cells, treatment, dose…', on: { change: e => { PLATE.setWell(b, cur, { info: e.target.value.trim() }); PLATE.save(b); draw(); } } }, w.info || '')),
        m && !ro ? h('label.f', h('span', 'About this ' + (m.rec.kind === 'video' ? 'video' : 'image')), h('textarea.inp', { rows: 2, placeholder: 'Optional caption', on: { change: e => { const arr = (w.media || []).slice(); arr[fi] = Object.assign({}, arr[fi], { note: e.target.value }); PLATE.setWell(b, cur, { media: arr }); PLATE.save(b); } } }, m.note || '')) : m && m.note ? h('div.serif', m.note) : null,
        planned.info || (planned.media || []).length ? h('div.wplanned', h('h6', 'Planned'), planned.info ? h('div.serif', planned.info) : null,
          h('div.row', { style: { gap: '6px', flexWrap: 'wrap' } }, (planned.media || []).map(pm => { const r = MEDIA.get(pm.id); return r ? h('div.wfr-d.sm', MEDIA.cropped(r, pm.crop)) : null; }))) : null,
        m ? h('div.tiny.muted', `${m.rec.name} · ${m.rec.w}×${m.rec.h}${m.rec.dur ? ' · ' + fmtDur(m.rec.dur * 1000, true) : ''}${m.rec.local ? ' · kept in this browser until launch.bat runs' : ' · images/' + m.rec.id + '.' + m.rec.ext}`) : null);
      box.replaceChildren(h('div.wp-top', mini, h('span.spacer'), h('span.tiny.muted', '← ↑ → ↓ other wells' + (ms.length > 1 ? ' · [ ] frames' : '')), h('button.btn.ghost.sm.icon', { title: 'Close', on: { click: close } }, '✕')),
        h('div.wp-main', h('div.wp-view', viewer, timeBar, strip, editMedia), side));
    };
    draw();
  },
  menu(b) {
    return [{ label: 'Duplicate the layout', sub: 'Colours, legend and notes; no images', run: () => PLATE.insert(b.docId, (b.x || 0) + 40, (b.y || 0) + 40, { label: (b.label || 'Plate') + ' (copy)', fmt: b.fmt, legend: Object.assign({}, b.legend), wells: Object.fromEntries(Object.entries(b.wells || {}).map(([k, w]) => [k, { color: w.color, info: w.info }])) }) },
      { label: 'Clear selection', run: () => { const p = App.pane || DocView; p._plateSel = null; p.update(p.docId); } }];
  },
};
WIDGETS.plate = { label: 'well plate', w: 616, body: PLATE.body, menu: PLATE.menu, icon: '◍' };

/* ---------------- + Insert: everything that can be placed on a note ---------------- */
const INSERTS = [
  { id: 'plate', group: 'Widgets', icon: '◍', label: 'Well plate', sub: '6 to 384 wells · colours, notes, images and videos per well', run: (d, p) => PLATE.insert(d.id, p.x, p.y) },
  { id: 'plate-carry', group: 'Widgets', icon: '◍', label: 'Well plate from the plan…', sub: 'Carries colours and planned notes; wells start empty', when: d => DB.where('blocks', b => b.kind === 'plate' && b.status === 'live' && b.docId !== d.id).length,
    run: (d, p) => { const chain = new Set(CHAIN.members(d).map(x => x.id)), plates = DB.where('blocks', b => b.kind === 'plate' && b.status === 'live' && b.docId !== d.id);
      const m = modal({ title: 'Carry a well plate into this note', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search plates…', sort: 'plates', items: q => plates.filter(b => !q || (b.body.text + ' ' + (M.doc(b.docId) || {}).title).toLowerCase().includes(q)),
        section: b => chain.has(b.docId) ? 'This experiment' : 'Elsewhere', render: b => h('div', h('b', b.label || 'Plate'), ' ', h('span.muted', b.fmt + '-well · ' + plural(Object.values(b.wells || {}).filter(w => w.color || w.info).length, 'well') + ' planned'), h('span.s', M.docPath(M.doc(b.docId)))),
        onPick: b => { m.close(); PLATE.carry(b, d.id, p.x, p.y); } }) }); } },
  { id: 'protocol', group: 'Protocols', icon: '☰', label: 'New protocol', sub: 'One block, steps linked; register it when it is ready', run: (d, p) => PROTO.create(d.id, p.x, p.y) },
  { id: 'run', group: 'Protocols', icon: '▶', label: 'Run a protocol…', sub: 'Steps to check, time and observe', run: (d, p) => PROTO.pickProtocol('Run which protocol here?', df => PROTO.newRun(df, d.id, p.x, p.y)) },
  { id: 'component', group: 'Writing', icon: '¶', label: d => 'New ' + prof(d.type).noun.toLowerCase(), sub: 'A box to write in', run: (d, p, pane) => pane.newAt(p.x, p.y) },
  { id: 'pull-barrier', group: 'Writing', icon: '⤓', label: 'An unresolved barrier…', sub: 'From any note', run: (d, p, pane) => pane.pullMenu(d, 'barrier', p) },
  { id: 'pull-item', group: 'Writing', icon: '⤓', label: 'A structure from elsewhere…', sub: 'A claim, result or question', run: (d, p, pane) => pane.pullMenu(d, 'item', p) },
  { id: 'pull-comp', group: 'Writing', icon: '⤓', label: 'A component from another note…', run: (d, p, pane) => pane.pullMenu(d, 'component', p) },
];
const INSERT = {
  menu(pane, anchor, at) {
    const d = M.doc(pane.docId); if (!d) return;
    let p = at; if (!p) { const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); p = { x: Math.round((c.x - 200) / 14) * 14, y: Math.round((c.y - 140) / 14) * 14 }; }
    const rows = INSERTS.filter(x => !x.when || x.when(d)), lab = x => typeof x.label === 'function' ? x.label(d) : x.label;
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, top: anchor.y };
    popover(r.left, Math.max(8, r.top - 8), [h('h5', 'Insert into this note'), optionPicker({ placeholder: 'Search what to insert…', sort: 'insert', items: q => rows.filter(x => !q || (lab(x) + ' ' + (x.sub || '') + ' ' + x.group).toLowerCase().includes(q)),
      section: x => x.group, render: x => h('div.insrow', h('span.insic', x.icon || '•'), h('div', h('b', lab(x)), x.sub ? h('span.s', x.sub) : null)), onPick: x => { closePop(); x.run(d, p, pane); } })]);
    const pop = $('.pop'); if (pop && anchor.getBoundingClientRect) { const pr = pop.getBoundingClientRect(); pop.style.top = Math.max(8, r.top - pr.height - 10) + 'px'; }
  },
};
