/* ==========================================================================
   17b · Reading PDFs. A library entry can carry its PDF (saved in the app's
   images/ folder like other files). The reader renders it with the bundled
   PDF.js; select text to highlight it. Each highlight is a component on the
   paper's literature note, anchored the W3C Web Annotation way
   (TextQuoteSelector: exact + prefix/suffix, plus the page and the boxes it
   covered), and Ctrl+B (or your structure key) turns it straight into a
   claim, evidence, question… whose source is the paper and page.
   ========================================================================== */
const READER = {
  ok: () => !!window.pdfjsLib,
  _init: false,
  init() {
    if (READER._init || !READER.ok()) return; READER._init = true;
    const src = $('#wk-pdf'); if (src) pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([src.textContent], { type: 'text/javascript' }));
  },
  COLORS: { yellow: '#F6D55C', green: '#90BE6D', blue: '#7FB3E8', pink: '#F28BB0', orange: '#F4A261' },
  litDoc(lib, create = true) {
    let d = DB.where('documents', x => x.type === 'literature' && x.libId === lib.id)[0];
    if (!d && create) {
      d = M.createDoc({ type: 'literature', projectId: READER.project(), title: 'Reading: ' + (lib.title || lib.url || 'paper'), templateId: null });
      d.blockIds.map(M.block).filter(b => b && !b.body.text).forEach(b => DB.del('blocks', b.id)); d.blockIds = []; d.libId = lib.id; d.header = Object.assign({ tags: [] }, d.header); DB.put('documents', d);
    }
    return d;
  },
  project() { const p = _ls.get('readerProject', null); return DB.get('projects', p) ? p : (DB.all('projects')[0] || {}).id || null; },
  annotations: libId => { const d = READER.litDoc(M.lib(libId), false); return d ? M.liveBlocks(d.id).filter(b => b.anchor && b.anchor.source === libId && b.status !== 'removed') : []; },
  /** Notes written on a highlight: their own component on the literature note, placed beside it and wired to it. */
  notesOf: b => IX.wiresOf(b.id).filter(w => w.to === b.id && w.rel === 'comments').map(w => M.block(w.from)).filter(x => x && x.status === 'live').sort((a, c) => a.created.localeCompare(c.created)),
  addNote(hl, text) {
    text = (text || '').trim(); if (!text) return null;
    const prev = READER.notesOf(hl), last = prev[prev.length - 1];
    const nb = M.addBlock(hl.docId, hl.id, { label: 'Note · p. ' + hl.anchor.page, x: (hl.x || 0) + (hl.w || 360) + 56, y: last ? (last.y || 0) + 120 : (hl.y || 0), w: 320, noteOn: hl.id });
    M.saveBlockBody(nb, { text, marks: [] }); M.wire(nb.id, hl.id, 'comments', true); IX.rebuild(); changed(); return nb;
  },
  async attach(lib) {
    PLATE.pickFiles(async fs => { const f = fs[0]; if (!f) return; const rec = await MEDIA.add(f); if (rec.kind !== 'pdf') return toast('That is not a PDF');
      lib.pdf = rec.id; DB.put('library', lib); changed(); toast('PDF attached — open it with “Read”'); }, false, 'application/pdf,.pdf');
  },
};

const ReaderView = {
  canvas: true, title: true, zoom: 1,
  render(libId, page) {
    READER.init();
    const lib = M.lib(libId); if (!lib) return h('div.canvas-host', h('div.empty-c', 'Not in the library'));
    App.setTitle(lib.title || 'Paper', [h('span', LIB.shortRef ? LIB.shortRef(lib) : ''), h('span', 'reader')]);
    const host = h('div.reader'); this.lib = lib; this.libId = libId;
    if (!READER.ok()) { host.append(h('div.empty-c', 'The PDF reader is not available in this build.')); return host; }
    const rec = lib.pdf && MEDIA.get(lib.pdf);
    if (!rec) { host.append(h('div.empty-c', h('div', h('p', 'No PDF attached to this entry yet.'), h('button.btn.pri', { on: { click: () => READER.attach(lib) } }, 'Attach the PDF…')))); return host; }
    const pages = h('div.rd-pages'), side = h('aside.rd-side'), bar = h('div.rd-bar');
    const projSel = h('select.inp', { title: 'Project that new claims and evidence belong to', on: { change: e => _ls.set('readerProject', e.target.value) } }, DB.all('projects').map(p => h('option', { value: p.id, selected: p.id === READER.project() }, p.name)));
    const zl = h('span.mono.tiny');
    bar.append(h('button.btn.sm', { on: { click: () => App.go('#/library') } }, '← Library'), h('b.rd-t', snippet(lib.title || '', 80)), h('span.spacer'),
      h('button.wbtn', { on: { click: () => this.setZoom(this.zoom / 1.15) } }, '−'), zl, h('button.wbtn', { on: { click: () => this.setZoom(this.zoom * 1.15) } }, '+'),
      h('span.tiny.muted', 'Evidence goes to'), projSel, h('button.btn.sm', { on: { click: e => { const d = READER.litDoc(lib); App.jump(d.id, e, true); } } }, 'Literature note ↗'));
    host.append(bar, h('div.rd-main', pages, side));
    this.pagesEl = pages; this.side = side; this.zl = zl; this.pageEls = []; this.pendingPage = +page || null;
    this.drawSide();
    pdfjsLib.getDocument({ url: MEDIA.url(rec), isEvalSupported: false }).promise.then(pdf => { this.pdf = pdf; this.layout(); }).catch(e => { pages.replaceChildren(h('div.empty-c', 'Could not open the PDF: ' + e.message)); });
    pages.addEventListener('mouseup', e => setTimeout(() => this.onSelect(e), 10));
    host.addEventListener('keydown', e => this.onKey(e)); host.tabIndex = -1;
    this._key = e => { if (App.route.name !== 'read') return document.removeEventListener('keydown', this._key); this.onKey(e); }; document.addEventListener('keydown', this._key);
    return host;
  },
  update(libId) { this.drawSide(); this.pageEls.forEach(p => this.paintMarks(p)); },
  setZoom(z) { this.zoom = clamp(z, 0.4, 4); this.layout(true); },
  async layout(keep) {
    const pdf = this.pdf; if (!pdf) return; const W = this.pagesEl.clientWidth - 48, first = await pdf.getPage(1), base = first.getViewport({ scale: 1 }), scale = Math.max(0.3, W / base.width) * this.zoom;
    this.zl.textContent = Math.round(this.zoom * 100) + '%'; this.scale = scale;
    const top = this.pagesEl.scrollTop / Math.max(1, this.pagesEl.scrollHeight);
    this.pagesEl.replaceChildren(); this.pageEls = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const vp = n === 1 ? first.getViewport({ scale }) : null, el = h('div.rd-page', { 'data-page': n, style: { width: (vp ? vp.width : base.width * scale) + 'px', height: (vp ? vp.height : base.height * scale) + 'px' } }, h('span.rd-pn', n));
      el._n = n; this.pageEls.push(el); this.pagesEl.append(el);
    }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !e.target._done) this.renderPage(e.target); }), { root: this.pagesEl, rootMargin: '800px 0px' });
    this.pageEls.forEach(p => io.observe(p));
    if (keep) this.pagesEl.scrollTop = top * this.pagesEl.scrollHeight;
    if (this.pendingPage) { const p = this.pageEls[this.pendingPage - 1]; this.pendingPage = null; if (p) setTimeout(() => p.scrollIntoView({ block: 'start' }), 50); }
  },
  async renderPage(el) {
    el._done = true; const page = await this.pdf.getPage(el._n), vp = page.getViewport({ scale: this.scale }), dpr = window.devicePixelRatio || 1;
    el.style.width = vp.width + 'px'; el.style.height = vp.height + 'px';
    const c = h('canvas.rd-canvas'); c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr); c.style.width = vp.width + 'px'; c.style.height = vp.height + 'px';
    const tl = h('div.textLayer'); tl.style.setProperty('--scale-factor', vp.scale);
    const marks = h('div.rd-marks'); el.append(c, marks, tl); el._marks = marks; el._tl = tl;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    const tc = await page.getTextContent(); el._text = tc.items.map(i => i.str).join(' ');
    const task = pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: vp, textDivs: [] }); await task.promise;
    this.paintMarks(el);
  },
  /** Highlights: from the stored boxes; if a box set is missing, find the quote again on its page (TextQuoteSelector). */
  paintMarks(el) {
    if (!el._marks) return; el._marks.replaceChildren();
    for (const b of READER.annotations(this.libId).filter(b => b.anchor.page === el._n)) {
      let rects = b.anchor.rects;
      if (!rects || !rects.length) rects = this.findQuote(el, b.anchor);
      const it = IX.itemsOf(b.id)[0], col = it ? `var(--k-${it.kind})` : (READER.COLORS[b.anchor.color] || READER.COLORS.yellow);
      (rects || []).forEach(r => el._marks.append(h('div.rd-hl' + (it ? '.kind' : ''), { 'data-id': b.id, title: (it ? KIND[it.kind].label + ' · ' : '') + snippet(b.body.text, 120) + READER.notesOf(b).map(n => '\n✎ ' + snippet(n.body.text, 80)).join(''), style: { left: r[0] * 100 + '%', top: r[1] * 100 + '%', width: r[2] * 100 + '%', height: r[3] * 100 + '%', '--hc': col },
        on: { click: e => { e.stopPropagation(); this.markMenu(b, e); } } })));
    }
  },
  findQuote(el, a) {
    if (!el._tl) return []; const spans = [...el._tl.querySelectorAll('span')]; let txt = '', map = [];
    spans.forEach(s => { const t = s.textContent; map.push([txt.length, txt.length + t.length, s]); txt += t; });
    const norm = s => s.replace(/\s+/g, ' ').trim(), ex = norm(a.exact); let i = txt.indexOf(ex); if (i < 0) i = txt.replace(/\s+/g, ' ').indexOf(ex); if (i < 0) return [];
    const pr = el.getBoundingClientRect(); return map.filter(([s, e]) => e > i && s < i + ex.length).map(([, , sp]) => { const r = sp.getBoundingClientRect(); return [(r.left - pr.left) / pr.width, (r.top - pr.top) / pr.height, r.width / pr.width, r.height / pr.height]; });
  },
  /** The selection → a pending highlight with its anchor. */
  onSelect(e) {
    const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return;
    const r = sel.getRangeAt(0), pageEl = (r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement).closest('.rd-page'); if (!pageEl) return;
    const exact = sel.toString().replace(/\s+/g, ' ').trim(); if (exact.length < 2) return;
    const pr = pageEl.getBoundingClientRect(), rects = [...r.getClientRects()].filter(x => x.width > 1 && x.height > 1).map(x => [(x.left - pr.left) / pr.width, (x.top - pr.top) / pr.height, x.width / pr.width, x.height / pr.height]);
    const full = (pageEl._text || '').replace(/\s+/g, ' '), at = full.indexOf(exact);
    this.pending = { page: pageEl._n, exact, prefix: at > 0 ? full.slice(Math.max(0, at - 32), at) : '', suffix: at >= 0 ? full.slice(at + exact.length, at + exact.length + 32) : '', rects };
    const last = r.getBoundingClientRect(); this.selPop(last.left, last.bottom + 8);
  },
  selPop(x, y) {
    const p = this.pending; if (!p) return;
    popover(x, y, [h('h5', 'p. ' + p.page + ' · ' + snippet(p.exact, 50)),
      h('div.row', { style: { gap: '6px', padding: '0 6px 6px' } }, Object.entries(READER.COLORS).map(([k, c]) => h('button.swatch', { title: 'Highlight ' + k, style: { '--c': c }, on: { click: () => { closePop(); this.save(null, k); } } }))),
      h('div.tiny.muted', { style: { margin: '0 6px 4px' } }, 'Make it… (Ctrl+B, then a letter)'),
      h('div.rd-kinds', KINDS.map(k => h('button.kpick', { style: { '--kc': `var(--k-${k.id})` }, title: 'Key: ' + k.key.toUpperCase(), on: { click: () => { closePop(); this.save(k.id); } } }, k.label, h('kbd', k.key))))]);
  },
  onKey(e) {
    if (App.route.name !== 'read' || e.target.closest && e.target.closest('input,textarea,select')) return;
    const struct = ED.matchKey ? ED.matchKey(e, settings().structKey) : false;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B') || struct) { if (!this.pending) this.onSelect(); if (!this.pending) return; e.preventDefault(); e.stopPropagation(); this.chooser = true; const r = getSelection().rangeCount ? getSelection().getRangeAt(0).getBoundingClientRect() : { left: 200, bottom: 200 }; this.selPop(r.left, r.bottom + 8); return; }
    if (this.chooser && $('.pop') && !e.ctrlKey && !e.metaKey && e.key.length === 1) { const k = KINDS.find(x => x.key === e.key.toLowerCase()); if (k) { e.preventDefault(); closePop(); this.chooser = false; this.save(k.id); } }
    if (e.key === 'Escape') { this.chooser = false; this.pending = null; }
  },
  /** One highlight = one component on the literature note; with a kind it also becomes a structure whose source is this paper and page. */
  save(kind, color = 'yellow') {
    const p = this.pending; if (!p) return; this.pending = null; getSelection().removeAllRanges();
    const lib = this.lib, d = READER.litDoc(lib), n = READER.annotations(lib.id).length;
    const b = M.addBlock(d.id, null, { label: 'p. ' + p.page, x: 0, y: 220 + n * 150, anchor: { type: 'TextQuoteSelector', source: lib.id, page: p.page, exact: p.exact, prefix: p.prefix, suffix: p.suffix, rects: p.rects, color } });
    const body = { text: p.exact, marks: [] };
    if (kind) { const it = M.createItem(kind, p.exact, Object.assign({}, b, { docId: d.id }), { projectId: READER.project(), sourceRef: { type: 'library', id: lib.id, page: p.page, selector: { type: 'TextQuoteSelector', exact: p.exact, prefix: p.prefix, suffix: p.suffix } } }); body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: p.exact.length, ref: it.id }); }
    M.saveBlockBody(b, body); IX.rebuild(); changed(); toast((kind ? KIND[kind].label : 'Highlight') + ' saved on p. ' + p.page + (kind === 'evidence' || kind === 'claim' ? ' — source: ' + LIB.shortRef(lib) + ', p. ' + p.page : ''));
  },
  markMenu(b, e) {
    const it = IX.itemsOf(b.id)[0];
    ctxMenu(e.clientX, e.clientY + 8, [{ head: 'p. ' + b.anchor.page + (it ? ' · ' + KIND[it.kind].label : ' · highlight') },
      { label: 'Add a note…', sub: 'A box beside the highlight on the literature note, wired to it', run: () => askText('Note on p. ' + b.anchor.page, '“' + snippet(b.body.text, 70) + '”', '', { multiline: true }).then(t => { if (READER.addNote(b, t)) { toast('Note added'); this.drawSide(); } }) },
      { label: 'Open on the literature note', sub: 'Alt+click: beside', run: ev => App.jump(b.id, ev) },
      !it ? { label: 'Make it…', sub: 'claim, evidence, question…', run: () => pickModal('Make this highlight a…', '“' + snippet(b.body.text, 90) + '”', KINDS.map(k => ({ label: k.label, run: () => { const x = M.createItem(k.id, b.body.text, b, { projectId: READER.project(), sourceRef: { type: 'library', id: this.libId, page: b.anchor.page } }); M.saveBlockBody(b, { text: b.body.text, marks: [...(b.body.marks || []), { id: uid('m'), type: 'struct', from: 0, to: b.body.text.length, ref: x.id }] }); IX.rebuild(); changed(); } }))) } : null,
      { label: 'Remove highlight', danger: true, sub: it ? 'The structure stays on record' : null, run: () => { b.status = 'removed'; DB.put('blocks', b); changed(); } }]);
  },
  drawSide() {
    if (!this.side) return; const anns = READER.annotations(this.libId).sort((a, b) => a.anchor.page - b.anchor.page || (a.anchor.rects && b.anchor.rects && a.anchor.rects[0] && b.anchor.rects[0] ? a.anchor.rects[0][1] - b.anchor.rects[0][1] : 0));
    const rows = anns.map(b => { const it = IX.itemsOf(b.id)[0]; return { date: b.created, text: b.body.text + ' ' + (it ? it.kind : ''), note: 'p' + String(b.anchor.page).padStart(4, '0'),
      el: h('div.rd-ann', { style: { '--hc': it ? `var(--k-${it.kind})` : READER.COLORS[b.anchor.color] || READER.COLORS.yellow }, on: { click: () => { const p = this.pageEls[b.anchor.page - 1]; p && p.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } },
        h('div.row', { style: { gap: '6px' } }, it ? kchip(it.kind) : h('span.pill', 'highlight'), h('span.spacer'), h('span.mono.tiny.muted', 'p. ' + b.anchor.page)), h('div.serif', snippet(b.body.text, 220)),
        READER.notesOf(b).map(n => h('div.rd-note', { title: 'Open on the literature note', on: { click: e => { e.stopPropagation(); App.jump(n.id, e); } } }, h('span.mono.tiny.muted', fmtDay(n.created) + ' '), n.body.text)),
        h('textarea.inp.rd-ni', { rows: 1, placeholder: 'Add a note… (Enter)', on: { click: e => e.stopPropagation(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (READER.addNote(b, e.target.value)) toast('Note added beside the highlight on the literature note'); } }, input: e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; } } }),
        h('a.tiny', { on: { click: e => { e.stopPropagation(); App.jump(b.id, e); } } }, 'on the note ↗')) }; });
    const host = h('div'), bar = filterBar(rows, host, { placeholder: 'Search highlights…', min: 1 });
    this.side.replaceChildren(h('div.rd-sh', h('b', plural(anns.length, 'highlight')), h('div.tiny.muted', 'Select text to highlight · Ctrl+B to make it a claim, evidence, question…')), bar, host);
  },
};
VIEWS.read = ReaderView;
