/* ==========================================================================
   13zu2 · The selection does more (V3.950, Gabe's SiS Shaping, Phase E).
   • Bulk actions on a lasso or Ctrl+click selection, in its bar: Region
     around them, Move to another note… (a stub stays behind saying where
     they went), Bridge to another note… (V3.981, 13zzu; was Pull into…), Tidy (align left · stack · grid),
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
   • V3.961 (Gabe): copy and paste reach outside the notebook and between
     notes. Ctrl+C with components selected (the lasso, Ctrl+click, or the
     one clicked) and nothing highlighted copies them; pasted in another note
     they are pulled in (references, where they sit relative to each other;
     Ctrl+Shift+V: copies instead), in their own note they are copied. From
     outside: a picture (a screenshot, an image copied from a page) becomes
     an image panel — several, one panel — and a PDF, an HTML page, a
     spreadsheet or slides copied in the Explorer becomes that component,
     made by its own + Insert code; text becomes a component. Files pasted
     while writing in a component go under it. A rich copy (Word, a web page)
     brings a picture of itself too: its text wins.
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
  /** V3.981 — bridges to another note: one note, one reason (the caption under each), a bridge each (13zzu). */
  async pullTo() { const ids = BULK.ids().filter(id => !REGION.isRg(id)); if (!ids.length) return; const d = BULK.doc(); const dest = await BRIDGE.pickNote('Bridge ' + plural(ids.length, 'component') + ' to…', d && d.id); if (!dest) return;
    const why = await BRIDGE.ask(dest, ids.length > 1 ? 'them' : 'it'); if (why == null) return; const p = MOVE.spot(dest); DB.beginGroup('bridge'); let n = 0;
    ids.forEach(id => { if (BRIDGE.make(M.block(id), dest, { why, at: { x: p.x, y: p.y + n * 150 }, quiet: true })) n++; }); IX.rebuild(); changed(); if (n) BRIDGE.said(dest, n); else toast('Already bridged to “' + snippet(dest.title || 'that note', 40) + '”'); },
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
  TYPE: 'application/x-scientia+json', last: null, at: null, armed: 0, shiftAt: 0,
  norm: s => String(s || '').replace(/\s+/g, ' ').trim(),
  /** V3.961 — Ctrl+C on components (the lasso's, Ctrl+click's, or the one clicked) with no text highlighted: the clip is made and the
      copy event is let through (cancelling beforecopy enables it with nothing selected), where the clipboard gets their text and, as
      our own type, which they are; if no copy event comes, their text alone. */
  keyCopy(e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || (e.key || '').toLowerCase() !== 'c' || $('.ovl') || $('.pop')) return;
    const t = e.target, s = getSelection(); if (t && t.closest && t.closest('input,textarea,select,math-field')) return; if (s && s.rangeCount && !s.isCollapsed) return;
    let sel = INK.sel && (INK.sel.items.length || LASSO2.boxes().length) ? INK.sel : null;
    if (!sel) { const pane = App.panes().includes(App.pane) ? App.pane : null, b = pane && pane.sel && M.block(pane.sel); if (!b || b.status !== 'live' || pane.travel) return;
      sel = { docId: pane.docId, items: b.kind === 'ink' ? ((b.ink && b.ink.strokes) || []).map((_, i) => ({ id: b.id, i })) : [], boxes: b.kind === 'ink' ? [] : [b.id], pane }; }
    const keep = INK.sel; INK.sel = sel; let n; try { n = LASSO2.copy({ sys: false }); } finally { INK.sel = keep; } if (!n) return;
    CLIPX.armed = Date.now(); setTimeout(() => { if (!CLIPX.armed) return; CLIPX.armed = 0; const C = LASSO2.clip; try { navigator.clipboard && navigator.clipboard.writeText((C && C.text) || '​').catch(() => { }); } catch { } }, 150);
  },
  copy(e) {
    if (CLIPX.armed && Date.now() - CLIPX.armed < 1000 && e.clipboardData) { const C = LASSO2.clip; CLIPX.armed = 0; e.clipboardData.setData('text/plain', (C && C.text) || '​');
      if (C) e.clipboardData.setData(CLIPX.TYPE, JSON.stringify({ kind: 'boxes', docId: C.docId, ids: (C.refs || []).map(r => r.id) })); e.preventDefault(); return; }
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed || !e.clipboardData) return; const n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode; if (!n || !n.closest) return;
    const ed = n.closest('.ed'), box = ed && ed.closest('.box.cmp[data-id]');
    if (box && ed.contentEditable === 'true') { const b = M.block(box.dataset.id), sel = ED.selection(ed); if (!b || !sel) return; const text = s.toString(); e.clipboardData.setData('text/plain', text); e.clipboardData.setData(CLIPX.TYPE, JSON.stringify({ kind: 'text', blockId: b.id, docId: b.docId, from: sel.from, to: sel.to, text })); e.preventDefault(); return; }
    if (n.closest('.q-slot')) { const q = QUOTE.pdfSel(); if (q) CLIPX.last = { kind: 'quote', sel: q, text: q.exact, at: Date.now() }; }
  },
  paste(e) {
    const t = e.target, cd = e.clipboardData; if (!cd) return;
    const files = CLIPX.files(cd), raw = cd.getData(CLIPX.TYPE), text = cd.getData('text/plain'), rich = cd.getData('text/html');
    const useFiles = files.length > 0 && !((text || '').trim() && files.every(f => CLIPX.sort(f) === 'image') && (rich || raw));   // Word, a web page: a picture of the copy comes with its text
    if (t && t.closest && t.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"],math-field')) {   // in a text: text is the editor's; files go under the component
      const box = useFiles && !$('.ovl') && !$('.pop') && t.closest('.box.cmp[data-id]'), bp = box && DV(box), b = box && M.block(box.dataset.id); if (!bp || bp.travel || !b) return;
      e.preventDefault(); e.stopPropagation(); return CLIPX.addFiles(M.doc(b.docId), { x: b.x || 0, y: (b.y || 0) + bp.boxH(b.id) + 28 }, files); }
    if ($('.ovl') || $('.pop')) return;
    const A = CLIPX.at, pane = A && Date.now() - A.t < 60000 && App.panes().includes(A.pane) ? A.pane : CMD.ctx().pane; if (!pane || pane.travel || !pane.paper) return; const d = M.doc(pane.docId); if (!d) return;
    if (!raw && !text && !useFiles) return; e.preventDefault();
    const at = CLIPX.spot(pane); let j = null; try { j = raw && JSON.parse(raw); } catch (x) { }
    const C = CLIPX.copied(j, text); if (C) return CLIPX.pull(pane, at, C, Date.now() - CLIPX.shiftAt < 1500);
    if (useFiles) return CLIPX.addFiles(d, at, files);
    if (j && j.kind === 'text' && M.block(j.blockId)) { const src = M.block(j.blockId); if (src.docId !== d.id && src.status === 'live' && !(Date.now() - CLIPX.shiftAt < 1500)) return EXCERPT.pull(d, at, src, j); return CLIPX.component(d, at, j.text, src, j); }   // V3.972: just the words copied (13zzt); Ctrl+Shift+V a copy
    const L = CLIPX.last; if (L && L.kind === 'quote' && text && CLIPX.norm(L.text) === CLIPX.norm(text) && M.block(L.sel.src)) return CLIPX.quote(d, at, L.sel);
    if (text) CLIPX.component(d, at, text.replace(/\r/g, ''), null, null);
  },
  /** The components a copy holds: our own type (which they are), else the text the copy wrote; the clip when it is that copy. */
  copied(j, text) {
    const C = typeof LASSO2 !== 'undefined' ? LASSO2.clip : null, same = C && C.refs && j && Array.isArray(j.ids) && C.refs.length === j.ids.length && C.refs.every((r, i) => r.id === j.ids[i]);
    if (j && j.kind === 'boxes' && Array.isArray(j.ids)) { if (same) return C; const B = j.ids.map(M.block).filter(b => b && b.status === 'live'); if (!B.length) return null;
      return { strokes: [], boxes: B.filter(b => !['protocol', 'run', 'timer', 'rec'].includes(b.kind)).map(b => JSON.parse(JSON.stringify(b))), refs: B.map(b => ({ id: b.id, x: b.x || 0, y: b.y || 0 })), docId: j.docId || B[0].docId, x0: Math.min(...B.map(b => b.x || 0)), y0: Math.min(...B.map(b => b.y || 0)), text: '' }; }
    if (j || !C || text == null) return null;
    return text === (C.text || '​') || (C.text && CLIPX.norm(text) === CLIPX.norm(C.text)) ? C : null;
  },
  /** Copied components into this note: from another note they are pulled in (a reference each, as they sat; strokes are copied), from
      this one — or with Ctrl+Shift+V — they are copied. */
  pull(pane, at, C, copies) {
    const d = M.doc(pane.docId); if (!d) return; const from = M.doc(C.docId), keep = LASSO2.clip;
    if (copies || C.docId === d.id) { LASSO2.clip = C; LASSO2.drop(pane, at.x, at.y); if (keep !== C && keep) LASSO2.clip = keep; toast(C.docId === d.id ? 'Pasted — copies of them' : 'Pasted as copies'); return; }
    if (C.strokes.length) { LASSO2.clip = Object.assign({}, C, { boxes: [] }); LASSO2.drop(pane, at.x, at.y); LASSO2.clip = keep; } else DB.beginGroup('pull');
    const dx = at.x - C.x0, dy = at.y - C.y0; let n = 0, here = 0;
    (C.refs || []).forEach(r => { const src = M.block(r.id), to = src && (src.kind === 'ref' ? M.block(src.refBlockId) : src); if (!to || to.status !== 'live' || src.status !== 'live') return; if (to.docId === d.id) { here++; return; }
      M.addBlock(d.id, null, { kind: 'ref', refItemId: src.kind === 'ref' ? src.refItemId || null : null, refBlockId: to.id, x: Math.round((r.x + dx) / 14) * 14, y: Math.round((r.y + dy) / 14) * 14, w: 392 }); n++; });
    M.touchDoc(d); IX.rebuild(); changed();
    toast(n ? `Bridged ${plural(n, 'component')} from “${(from && from.title) || 'their note'}”` + (here ? ` (${here} already here)` : '') + ' — say why in the caption under each · Ctrl+Shift+V pastes copies instead' : here ? 'They are in this note already' : C.strokes.length ? 'Pasted the strokes' : 'Nothing to bridge: they were removed', 4500);
  },
  /** Files on the clipboard: a screenshot, an image copied from a page, files copied in the Explorer or the Finder. */
  files(cd) { let F = []; try { F = [...(cd.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); } catch (x) { } if (!F.length) try { F = [...(cd.files || [])]; } catch (x) { } return F; },
  sort(f) { const n = String(f.name || '').toLowerCase(), t = String(f.type || '').toLowerCase(), x = (n.match(/\.([a-z0-9]+)$/) || [])[1] || '';
    if (x === 'mhtml' || x === 'mht' || t === 'multipart/related' || t === 'message/rfc822' && /\.mht/.test(n)) return 'mhtml';   // V3.977: a page saved in the browser (13zzs)
    if (t === 'application/pdf' || x === 'pdf') return 'pdf'; if (t === 'text/html' || x === 'html' || x === 'htm') return 'html';
    if (t.startsWith('image/') || t.startsWith('video/') || /^(png|jpe?g|gif|webp|bmp|avif|mp4|webm|mov|m4v)$/.test(x)) return 'image';
    if (/^(xlsx|xlsm|xls|ods|csv|tsv)$/.test(x) || /spreadsheet|ms-excel|text\/csv|tab-separated/.test(t)) return 'sheet'; if (/^(pptx|ppt|pptm|ppsx|odp)$/.test(x)) return 'deck'; return null; },
  /** Each file as what it is, made by its own + Insert code: images (and videos) together in one image panel, a PDF, an HTML page, a table, slides. */
  addFiles(d, at, files) {
    const by = { image: [], pdf: [], html: [], sheet: [], deck: [], mhtml: [] }, skip = []; files.forEach(f => { const k = CLIPX.sort(f); if (k) by[k].push(f); else skip.push(f.name || 'a file'); });
    if (skip.length) toast('Can’t add ' + skip.join(', ') + ': pictures, PDFs, HTML pages, pages saved in the browser, spreadsheets and slides can be', 4500);
    let p = { x: at.x, y: at.y }; const next = () => { const q = p; p = { x: p.x + 42, y: p.y + 42 }; return q; }; DB.beginGroup('paste');
    if (by.image.length) { const n = by.image.length, cols = n <= 4 ? n : 3, b = FIG.create(d, next(), Math.ceil(n / cols), cols, by.image.map(CLIPX.named)); b.fig.letters = n > 1; DB.put('blocks', b); toast(n > 1 ? plural(n, 'picture') + ' pasted as one image panel' : 'Pasted as an image panel'); }
    by.pdf.forEach(f => CLIPX.through([f], () => PDFW.insert(d, next()))); by.html.forEach(f => CLIPX.through([f], () => EMBED.insert(d, next())));
    by.sheet.forEach(f => CLIPX.through([f], () => TABLE.insert(d, next()))); by.deck.forEach(f => CLIPX.through([f], () => DECK.insert(d, next())));
    by.mhtml.forEach(f => WEBCAP.fromMhtml(d, next(), f));
  },
  /** A screenshot is "image.png": it gets the day and time instead. */
  named(f) { if (f.name && !/^image\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name)) return f; const ext = String((f.type || 'image/png').split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\W.*$/, ''), now = new Date();
    return new File([f], 'Pasted ' + localDate(now) + ' ' + fmtTime(now).replace(/:/g, '.') + '.' + ext, { type: f.type || 'image/png' }); },
  /** An insert run with these files standing in for the file dialog it opens (PLATE.pickFiles), so a pasted file is made exactly as an inserted one. */
  through(files, run) { const pf = PLATE.pickFiles, stand = (cb, multiple) => { PLATE.pickFiles = pf; cb(multiple === false ? files.slice(0, 1) : files); }; PLATE.pickFiles = stand;
    try { return run(); } finally { setTimeout(() => { if (PLATE.pickFiles === stand) PLATE.pickFiles = pf; }, 1500); } },
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
    const g = h('span.bulk-g', X('Region', 'A region around them', () => BULK.region()), X('Move to…', 'Move them to another note; a stub stays here saying where they went', () => BULK.moveTo()), X('Bridge to…', 'Bridge them to another note: they show there, live, with a caption saying why', () => BULK.pullTo()),
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
  // V3.961 — Ctrl+C on components; beforecopy cancelled makes the copy event come with nothing selected; Ctrl+Shift+V pastes copies
  document.addEventListener('keydown', e => { try { CLIPX.keyCopy(e); } catch (x) { console.warn('[copy]', x); } if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'v') CLIPX.shiftAt = e.shiftKey ? Date.now() : 0; }, true);
  document.addEventListener('beforecopy', e => { if (CLIPX.armed && Date.now() - CLIPX.armed < 1000) e.preventDefault(); }, true);
}
