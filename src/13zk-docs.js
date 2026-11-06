/* ==========================================================================
   13zk · Slides and PDFs in a note.
   Slides (+ Insert → Slides…): a PowerPoint file is turned into one picture
   per slide by PowerPoint on your computer; the component shows one slide at
   a time (‹ › or ← → to page through, its speaker notes below) or all of
   them as a grid. "Image panel…" makes an image panel from chosen slides.
   Each slide's words and notes are kept, so Search and terms find them.
   PDF (+ Insert → PDF…): pages drawn by the app (the same on the iPad), as a
   scrolling column or one page at a time; resize from the corner, maximise,
   open in a new tab, replace. Its words are kept for Search too.
   On the canvas a PDF draws only while it is on screen and only as sharp as
   the zoom needs, and keeps its pages when the note is redrawn, so a note
   with dozens of PDFs stays smooth; zoomed far out it shows its title.
   ========================================================================== */
const DOCS = {
  hover: null,
  btn: (label, title, fn, on) => h('button.btn.xs' + (on ? '.on' : ''), { title: title || '', on: { click: e => { e.stopPropagation(); fn(e); } } }, label),
  seg: (opts, cur, fn) => h('div.seg.sm', opts.map(([k, l]) => h('button' + (k === cur ? '.on' : ''), { on: { click: e => { e.stopPropagation(); fn(k); } } }, l))),
  save(b) { DB.put('blocks', b); },
  /** Redraw just this component's body (no full refresh). */
  repaint(b) { $$(`.box[data-id="${b.id}"]`).forEach(box => { const W = WIDGETS[b.kind], old = box.querySelector(':scope > .dk, :scope > .pdfw'); if (W && old) { const pane = DV(box); old.replaceWith(W.body(M.block(b.id), M.doc(b.docId), pane, !!(pane && pane.travel))); } }); if (DOCS._max && DOCS._max.id === b.id) DOCS._max.draw(); },
  /** A resize grip for width and height (like the HTML component). */
  grip(b, wrap, pane, hk = 'h') {
    const g = h('div.embed-rz', { title: 'Drag to resize' });
    g.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const box = wrap.closest('.box'), z = (pane && pane.paper && pane.paper.view.z) || 1, x0 = e.clientX, y0 = e.clientY, w0 = box.offsetWidth, h0 = wrap.offsetHeight;
      // V3.942 — no largest size, either way
      document.body.classList.add('resizing');
      const mv = ev => { b.w = Math.max(280, Math.round(w0 + (ev.clientX - x0) / z)); b[hk] = Math.max(160, Math.round(h0 + (ev.clientY - y0) / z)); box.style.width = b.w + 'px'; wrap.style.height = b[hk] + 'px'; pane && pane.drawWires && pane.drawWires(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); document.body.classList.remove('resizing'); b.w = Math.round(b.w / 14) * 14; b[hk] = Math.round(b[hk] / 14) * 14; DB.put('blocks', b); DB.beginGroup(); DOCS.repaint(b); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    return g;
  },
  /** Full screen for a slide deck or a PDF; ← → page through, Esc closes. */
  max(b) {
    const W = WIDGETS[b.kind]; let ov;
    const draw = () => { const cur = M.block(b.id); const body = W.body(cur, M.doc(cur.docId), { maxView: true, paper: null }, false); body.classList.add('maxed'); const c = $('.dk-maxc', ov); c.replaceChildren(body); };
    const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); DOCS._max = null; };
    const key = e => { if ($('.ovl')) return; if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); DOCS.step(M.block(b.id), e.key === 'ArrowRight' ? 1 : -1); } };
    ov = h('div.embed-max.dk-max', h('div.em-bar', h('b', b.label || (b.deck && b.deck.name) || 'Document'), h('span.spacer'), h('button.btn.sm', { on: { click: close } }, 'Close ✕')), h('div.dk-maxc'));
    document.body.append(ov); document.addEventListener('keydown', key, true); DOCS._max = { id: b.id, draw }; draw();
  },
  step(b, d) { if (b.kind === 'deck') DECK.go(b, (b.deck.cur || 0) + d); else if (b.kind === 'pdf') PDFW.go(b, (b.cur || 0) + d); },
};

/* ---------------- slide decks ---------------- */
const DECK = {
  async insert(d, p) {
    PLATE.pickFiles(async files => {
      const f = files[0]; if (!f) return; const ext = (f.name.match(/\.([a-z0-9]+)$/i) || [])[1]; if (!/^(pptx|ppt|pptm|ppsx|odp)$/i.test(ext || '')) return toast('That is not a PowerPoint file');
      const id = uid('m'); toast('Turning the slides into pictures with PowerPoint…', 60000);
      let j; try { j = await (await fetch(`api/slides?id=${id}&ext=${ext.toLowerCase()}`, { method: 'POST', body: f, headers: { 'Content-Type': 'application/octet-stream' } })).json(); } catch { $$('#toasts > *').forEach(t => t.remove()); return toast('The app’s server isn’t running — open the app with launch.bat'); }
      $$('#toasts > *').forEach(t => t.remove());
      if (!j.ok) return modal({ title: 'Couldn’t turn the slides into pictures', body: h('p.serif', j.error || 'Unknown error'), actions: [{ label: 'OK' }] });
      const now = isoLocal(new Date()), slides = j.slides.map((s, i) => { const m = { id: uid('m'), kind: 'image', ext: 'png', name: `${f.name} · slide ${i + 1}`, mime: 'image/png', size: 0, w: s.w, h: s.h, created: now, path: s.path };
        DB.put('media', m); return { media: m.id, title: s.title || '', text: s.text || '', notes: s.notes || '' }; });
      DB.put('media', { id, kind: 'file', ext: ext.toLowerCase(), name: f.name, mime: f.type, size: f.size, created: now, path: j.file });
      const b = M.addBlock(d.id, null, { kind: 'deck', label: f.name.replace(/\.[^.]+$/, ''), x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 616, deck: { file: id, name: f.name, slides, view: 'slide', cur: 0, cols: 3 } });
      DECK.words(b); DB.put('blocks', b); IX.rebuild(); changed(); toast(plural(slides.length, 'slide') + ' added');
    }, false, '.pptx,.ppt,.pptm,.ppsx,.odp');
  },
  /** The deck's words in the component's text: Search, terms and the Markdown see them. */
  words(b) { const D = b.deck; b.body = { text: [b.label || D.name, ...D.slides.map((s, i) => `Slide ${i + 1}${s.title ? ': ' + s.title : ''}\n${s.text}${s.notes ? '\nNotes: ' + s.notes : ''}`)].join('\n\n'), marks: [] }; },
  go(b, i) { const D = b.deck; D.cur = clamp(i, 0, D.slides.length - 1); D.view = 'slide'; DOCS.save(b); DOCS.repaint(b); },
  img(s, cls) { const m = MEDIA.get(s.media); return m ? h('img' + (cls ? '.' + cls : ''), { src: MEDIA.url(m), alt: s.title || '', draggable: false, loading: 'lazy' }) : h('div.dk-miss', 'missing picture'); },
  body(b, d, pane, ro) {
    const D = b.deck || { slides: [] }, n = D.slides.length, cur = clamp(D.cur || 0, 0, Math.max(0, n - 1)), s = D.slides[cur], maxed = pane && pane.maxView;
    if (!n) return h('div.dk', h('div.tiny.muted', 'No slides.'));
    const set = (k, v) => { const B = M.block(b.id); B.deck[k] = v; DOCS.save(B); DOCS.repaint(B); };
    const bar = h('div.dk-bar', DOCS.seg([['slide', 'Slides'], ['grid', 'Grid']], D.view, v => set('view', v)),
      D.view === 'grid' ? h('select.inp.dk-cols', { title: 'Columns', on: { click: e => e.stopPropagation(), change: e => set('cols', +e.target.value) } }, [2, 3, 4, 5, 6].map(c => h('option', { value: c, selected: c === (D.cols || 3) }, c + ' across'))) : h('span.dk-count.mono', `${cur + 1} / ${n}`),
      ro ? null : DOCS.btn('Image panel…', 'Make an image panel from chosen slides', () => DECK.toPanel(M.block(b.id))),
      maxed ? null : DOCS.btn('⤢', 'Maximise', () => DOCS.max(M.block(b.id))),
      D.file && MEDIA.get(D.file) ? h('a.btn.xs', { href: MEDIA.url(MEDIA.get(D.file)), download: D.name, title: 'The original file', on: { click: e => e.stopPropagation() } }, '↓') : null);
    let main;
    if (D.view === 'grid') main = h('div.dk-grid', { style: { gridTemplateColumns: `repeat(${D.cols || 3},1fr)` } }, D.slides.map((x, i) => h('button.dk-th' + (i === cur ? '.on' : ''), { title: x.title || 'Slide ' + (i + 1), on: { click: e => { e.stopPropagation(); DECK.go(M.block(b.id), i); } } }, DECK.img(x), h('span.dk-n', i + 1))));
    else main = h('div.dk-slide', h('div.dk-stage', DECK.img(s, 'dk-img'),
        h('button.dk-nav.prev', { disabled: cur === 0, title: 'Previous (←)', on: { click: e => { e.stopPropagation(); DECK.go(M.block(b.id), cur - 1); } } }, '‹'),
        h('button.dk-nav.next', { disabled: cur === n - 1, title: 'Next (→)', on: { click: e => { e.stopPropagation(); DECK.go(M.block(b.id), cur + 1); } } }, '›')),
      s.notes ? h('details.dk-notes', { open: D.notesOpen !== false, on: { toggle: e => { const B = M.block(b.id); B.deck.notesOpen = e.target.open; DOCS.save(B); } } }, h('summary', 'Speaker notes'), h('div.serif', s.notes)) : null);
    const el = h('div.dk' + (maxed ? '.maxed' : ''), bar, main);
    el.addEventListener('mouseenter', () => { DOCS.hover = b.id; }); el.addEventListener('mouseleave', () => { if (DOCS.hover === b.id) DOCS.hover = null; });
    return el;
  },
  toPanel(b) {
    const D = b.deck, on = new Set([D.cur || 0]);
    const grid = h('div.dk-pick', D.slides.map((s, i) => { const lab = h('label.dk-pk' + (on.has(i) ? '.on' : ''), h('input', { type: 'checkbox', checked: on.has(i), on: { change: e => { e.target.checked ? on.add(i) : on.delete(i); lab.classList.toggle('on', e.target.checked); } } }), DECK.img(s), h('span.dk-n', i + 1)); return lab; }));
    modal({ title: 'An image panel from these slides', wide: true, body: h('div', h('div.row', { style: { gap: '6px', marginBottom: '8px' } }, h('span.tiny.muted', 'Tick the slides to put in the panel.'), h('span.spacer'), DOCS.btn('All', '', () => { D.slides.forEach((_, i) => on.add(i)); $$('.dk-pk', grid).forEach((l, i) => { l.classList.add('on'); $('input', l).checked = true; }); }), DOCS.btn('None', '', () => { on.clear(); $$('.dk-pk', grid).forEach(l => { l.classList.remove('on'); $('input', l).checked = false; }); })), grid),
      actions: [{ label: 'Cancel' }, { label: 'Make the image panel', pri: true, run: () => { const ids = [...on].sort((a, c) => a - c); if (!ids.length) { toast('Tick at least one slide'); return false; }
        const cols = Math.min(ids.length, ids.length <= 4 ? ids.length : 3), rows = Math.ceil(ids.length / cols), d = M.doc(b.docId);
        const F = FIG.create(d, { x: (b.x || 0) + (b.w || 616) + 56, y: b.y || 0 }, rows, cols), cells = FIG.cells(F);
        ids.forEach((si, k) => { cells[k].media = D.slides[si].media; cells[k].caption = D.slides[si].title || 'Slide ' + (si + 1); });
        F.label = (b.label || 'Slides') + ' · slides ' + ids.map(i => i + 1).join(', '); FIG.save(F); M.wire(F.id, b.id, 'c:from the slides', true); changed(); toast('Image panel made beside the deck'); } }] });
  },
};
WIDGETS.deck = { label: 'slides', w: 616, body: DECK.body, menu: b => [{ label: 'Maximise', run: () => DOCS.max(b) }, { label: 'Make an image panel from slides…', run: () => DECK.toPanel(b) }, { label: b.deck.view === 'grid' ? 'Show one slide at a time' : 'Show as a grid', run: () => { b.deck.view = b.deck.view === 'grid' ? 'slide' : 'grid'; DOCS.save(b); DOCS.repaint(b); } }] };
INSERTS.push({ id: 'deck', group: 'Widgets', icon: '▭', label: 'Slides (PowerPoint)…', sub: 'Each slide as a picture, ← → to page through, as a grid or an image panel; words and notes searchable', run: (d, p) => DECK.insert(d, p) });

/* ---------------- PDFs ----------------
   On the canvas a PDF draws only while it is on screen, only as sharp as the zoom needs, and keeps its viewer when the
   note is drawn again (every change redraws every box; a sync from another device is a change): a note with dozens of
   PDFs stays smooth. Off screen for a few seconds it gives its pages back; zoomed far out it shows its title. The file
   is read in pieces (range requests), only the pages drawn. The maximised view and the phone draw as before (full). */
const PDFW = {
  docs: new Map(), used: new Map(), pin: {}, live: new Map(), cards: new Set(), aspect: new Map(), q: [], busy: 0, n: 0,
  onDemand: true, MIN_Z: .33, IDLE: 4000, KEEP: 6, JOBS: 2,
  load(m) { READER.init(); if (!window.pdfjsLib) return Promise.reject(new Error('PDF support is missing')); if (!PDFW.docs.has(m.id)) {   // a load that fails is forgotten here, so every caller (card, full view, words) tries again next time
      let pr; try { pr = pdfjsLib.getDocument({ url: MEDIA.url(m), isEvalSupported: false, disableAutoFetch: true, disableStream: true }).promise; } catch (e) { return Promise.reject(e); }
      pr.catch(() => { if (PDFW.docs.get(m.id) === pr) PDFW.docs.delete(m.id); }); PDFW.docs.set(m.id, pr); }
    PDFW.used.set(m.id, Date.now()); return PDFW.docs.get(m.id); },
  async insert(d, p) {
    PLATE.pickFiles(async files => {
      const f = files[0]; if (!f) return; toast('Adding ' + f.name + '…'); const rec = await MEDIA.add(f); if (rec.kind !== 'pdf') return toast('That is not a PDF');
      const b = M.addBlock(d.id, null, { kind: 'pdf', label: f.name.replace(/\.pdf$/i, ''), media: rec.id, x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 616, h: 560, view: 'scroll', cur: 0 });
      b.body = { text: b.label, marks: [] }; DB.put('blocks', b); changed(); PDFW.words(b);
    }, false, '.pdf,application/pdf');
  },
  /** Its words into the component's text, for Search and terms (the file stays loaded until done). */
  async words(b) { const id = b.media; PDFW.pin[id] = (PDFW.pin[id] || 0) + 1;
    try { const pdf = await PDFW.load(MEDIA.get(b.media)), parts = []; let len = 0;
      for (let i = 1; i <= pdf.numPages && len < 200000; i++) { const tc = await (await pdf.getPage(i)).getTextContent(); const t = tc.items.map(x => x.str).join(' ').replace(/\s+/g, ' ').trim(); parts.push(`Page ${i}\n${t}`); len += t.length; }
      const cur = M.block(b.id); if (!cur) return; cur.pages = pdf.numPages; cur.body = { text: [cur.label, ...parts].join('\n\n'), marks: [] }; DB.put('blocks', cur); IX.rebuild(); DOCS.repaint(cur); } catch { } finally { PDFW.pin[id]--; } },
  go(b, i) { b.cur = clamp(i, 0, Math.max(0, (b.pages || 1) - 1)); DOCS.save(b); DOCS.repaint(b); },
  /** A page into a canvas `width` px wide; `res` = pixels per px (default: the screen's, at most 2.5). */
  async page(m, n, canvas, width, res) { const pdf = await PDFW.load(m), pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), dpr = res || Math.min(2.5, window.devicePixelRatio || 1), sc = width / v0.width, vp = pg.getViewport({ scale: sc * dpr });
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height); canvas.style.width = width + 'px'; canvas.style.height = Math.round(v0.height * sc) + 'px';
    await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise; try { pg.cleanup(); } catch { } return pdf.numPages; },
  bar(b, m, n, cur, maxed, ro) {
    const set = (k, v) => { const B = M.block(b.id); B[k] = v; DOCS.save(B); DOCS.repaint(B); };
    const count = h('span.dk-count.mono', n ? (b.view === 'page' ? `${cur + 1} / ${n}` : plural(n, 'page')) : '…');
    const bar = h('div.dk-bar.pdf-bar', DOCS.seg([['scroll', 'Pages'], ['page', 'One at a time']], b.view || 'scroll', v => set('view', v)), count,
      maxed ? null : DOCS.btn('⤢', 'Maximise', () => DOCS.max(M.block(b.id))),
      h('a.btn.xs', { href: MEDIA.url(m), target: '_blank', rel: 'noopener', title: 'Open in a new tab', on: { click: e => e.stopPropagation() } }, '↗'),
      ro || maxed ? null : DOCS.btn('Replace', 'Replace the file', () => PLATE.pickFiles(async fs => { const r = await MEDIA.add(fs[0]); if (r.kind !== 'pdf') return toast('That is not a PDF'); const B = M.block(b.id); B.media = r.id; B.pages = 0; B.cur = 0; DOCS.save(B); DOCS.repaint(B); PDFW.words(B); }, false, '.pdf')));
    return { bar, count };
  },
  body(b, d, pane, ro) {
    if (!MEDIA.get(b.media)) return h('div.pdfw', h('div.embed-missing', 'The PDF is missing.'));
    if (!pane || pane.maxView || !pane.paper) return PDFW.full(b, d, pane, ro);
    const key = (Object.prototype.hasOwnProperty.call(pane, '_pdk') ? pane._pdk : (pane._pdk = ++PDFW.n)) + ':' + b.id, hit = PDFW.live.get(key), sig = PDFW.sig(b, ro);
    if (hit && hit.b === b && hit.sig === sig && !hit.dead && !hit.failed) {   // the same viewer, its pages still drawn
      if (hit.bar.parentNode !== hit.el) hit.el.insertBefore(hit.bar, hit.stage);   // SLIM docked the bar in the old box's header; the new box docks it again
      PDFW.want(hit); return hit.el;
    }
    if (hit) PDFW.drop(hit);
    const C = PDFW.card(b, pane, ro, sig); C.key = key; PDFW.live.set(key, C); return C.el;
  },
  /** Every page, drawn as you scroll and given back far off screen: the maximised view, the paper beside the note
      (13zzb, which passes pane.zoom) and the phone. Pages are sized from page 1 until drawn. */
  full(b, d, pane, ro) {
    const m = MEDIA.get(b.media), maxed = pane && pane.maxView, n = b.pages || 0, cur = clamp(b.cur || 0, 0, Math.max(0, n - 1));
    const { bar, count } = PDFW.bar(b, m, n, cur, maxed, ro);
    const stage = h('div.pdf-stage.scrolly.nopan' + (b.view === 'page' ? '.one' : ''), { style: maxed ? {} : { height: (b.h || 560) + 'px' } });
    const el = h('div.pdfw' + (maxed ? '.maxed' : ''), bar, stage);
    if (!maxed && !ro) el.append(DOCS.grip(b, stage, pane));
    el.addEventListener('mouseenter', () => { DOCS.hover = b.id; }); el.addEventListener('mouseleave', () => { if (DOCS.hover === b.id) DOCS.hover = null; });
    requestAnimationFrame(async () => {
      const zoom = (pane && pane.zoom) || 1, W = Math.round(Math.max(200, (stage.clientWidth || (b.w || 616) - 24) - 16) * zoom);
      try {
        const pdf = await PDFW.load(m); if (!b.pages || b.pages !== pdf.numPages) { const B = M.block(b.id); B.pages = pdf.numPages; DOCS.save(B); count.textContent = b.view === 'page' ? `${cur + 1} / ${pdf.numPages}` : plural(pdf.numPages, 'page'); if (!/Page 1\n/.test(B.body.text || '')) PDFW.words(B); }
        if (b.view === 'page') {
          const H = (stage.clientHeight || 500) - 12, pg = await pdf.getPage(cur + 1), v0 = pg.getViewport({ scale: 1 }), w = Math.min(W, H * v0.width / v0.height * zoom), cv = h('canvas.pdf-page');
          stage.replaceChildren(h('div.dk-stage.pdf-one', cv, h('button.dk-nav.prev', { disabled: cur === 0, on: { click: e => { e.stopPropagation(); PDFW.go(M.block(b.id), cur - 1); } } }, '‹'), h('button.dk-nav.next', { disabled: cur >= pdf.numPages - 1, on: { click: e => { e.stopPropagation(); PDFW.go(M.block(b.id), cur + 1); } } }, '›')));
          await PDFW.page(m, cur + 1, cv, Math.floor(w));
        } else {
          if (!PDFW.aspect.has(m.id)) { const v = (await pdf.getPage(1)).getViewport({ scale: 1 }); PDFW.aspect.set(m.id, v.height / v.width); }
          const a = PDFW.aspect.get(m.id), slots = []; for (let i = 1; i <= pdf.numPages; i++) slots.push(h('div.pdf-slot', { 'data-p': i }, h('canvas.pdf-page', { style: { width: W + 'px', height: Math.round(W * a) + 'px' } }), h('span.pdf-pn', i)));
          stage.replaceChildren(...slots);
          const io = new IntersectionObserver(ents => ents.forEach(en => { const sl = en.target; if (en.isIntersecting) { if (!sl._res) { sl._res = 1; PDFW.page(m, +sl.dataset.p, $('canvas', sl), W).catch(() => { sl._res = 0; }); } } else if (sl._res) PDFW.releaseSlot(sl); }), { root: stage, rootMargin: '1200px 0px' });
          slots.forEach(s => io.observe(s));
          stage.addEventListener('scroll', debounce(() => { const top = stage.scrollTop, k = slots.findIndex(s => s.offsetTop + s.offsetHeight > top + 20); if (k >= 0) { const B = M.block(b.id); if (B.cur !== k) { B.cur = k; DOCS.save(B); } } }, 300));
          if (cur) requestAnimationFrame(() => { const s = slots[cur]; if (s) stage.scrollTop = s.offsetTop - 4; });
        }
      } catch (e) { stage.replaceChildren(h('div.embed-missing', 'Could not open the PDF: ' + (e.message || e))); }
    });
    return el;
  },

  /* ---- the card on the canvas ---- */
  sig: (b, ro) => [b.media, b.view || 'scroll', b.view === 'page' ? (b.cur || 0) : '', b.pages || 0, b.w || 616, b.h || 560, ro ? 1 : 0].join('|'),
  zoom: C => (C.pane.paper && C.pane.paper.view.z) || 1,
  // V3.942 — a card can grow without limit; a page's canvas stays within what every browser draws (≤ 3600 px a side)
  res: C => clamp(Math.round(PDFW.zoom(C) * (window.devicePixelRatio || 1) * 4) / 4, .25, Math.max(.25, Math.min(3, 3600 / PDFW.width(C)))),
  width: C => Math.max(200, (C.stage.clientWidth || ((C.b.w || 616) - 24)) - 16),
  blank(W, a) { const cv = h('canvas.pdf-page', { style: { width: W + 'px', height: Math.round(W * a) + 'px' } }); cv.width = 0; cv.height = 0; return cv; },
  card(b, pane, ro, sig) {
    const m = MEDIA.get(b.media), n = b.pages || 0, page = b.view === 'page', cur = clamp(b.cur || 0, 0, Math.max(0, n - 1));
    const { bar, count } = PDFW.bar(b, m, n, cur, false, ro);
    const stage = h('div.pdf-stage.scrolly.nopan' + (page ? '.one' : ''), { style: { height: (b.h || 560) + 'px' } });
    const ph = h('div.pdf-ph', h('b', b.label || 'PDF'), h('span', n ? plural(n, 'page') : ''));
    const el = h('div.pdfw', bar, stage, ph);
    if (!ro) el.append(DOCS.grip(b, stage, pane));
    el.addEventListener('mouseenter', () => { DOCS.hover = b.id; }); el.addEventListener('mouseleave', () => { if (DOCS.hover === b.id) DOCS.hover = null; });
    const C = { b, m, pane, el, bar, stage, ph, count, sig, page, cur, n, slots: [], one: null, W: 0, vis: false, active: false, pdf: null, idleT: null, gone: 0 };
    el._pd = C; PDFW.cards.add(C); PDFW.sweeping();
    if (page) {
      C.one = h('div.dk-stage.pdf-one', h('canvas.pdf-page'), h('button.dk-nav.prev', { disabled: cur === 0, on: { click: e => { e.stopPropagation(); PDFW.go(M.block(b.id), cur - 1); } } }, '‹'), h('button.dk-nav.next', { disabled: !!n && cur >= n - 1, on: { click: e => { e.stopPropagation(); PDFW.go(M.block(b.id), cur + 1); } } }, '›'));
      stage.replaceChildren(C.one);
    } else {
      if (n) PDFW.slots(C, n);
      stage.addEventListener('scroll', debounce(() => { const top = stage.scrollTop, k = C.slots.findIndex(s => s.offsetTop + s.offsetHeight > top + 20); if (k >= 0) { const B = M.block(b.id); if (B && B.cur !== k) { B.cur = k; DOCS.save(B); } } }, 300));
      if (cur) requestAnimationFrame(() => { const s = C.slots[cur]; if (s) stage.scrollTop = s.offsetTop - 4; });
    }
    PDFW.io().observe(el);
    return C;
  },
  /** The page slots, sized but not drawn (so "from …" can scroll to a page before it is drawn). */
  slots(C, n) {
    const W = C.W = C.W || PDFW.width(C), a = PDFW.aspect.get(C.m.id) || 1.294;
    C.slots = []; for (let i = 1; i <= n; i++) C.slots.push(h('div.pdf-slot', { 'data-p': i }, PDFW.blank(W, a), h('span.pdf-pn', i)));
    C.stage.replaceChildren(...C.slots);
    C.pio = new IntersectionObserver(es => { es.forEach(en => { en.target._in = en.isIntersecting; if (!en.isIntersecting && en.target._res) PDFW.releaseSlot(en.target); }); PDFW.want(C); }, { root: C.stage, rootMargin: '200px 0px' });
    C.slots.forEach(s => C.pio.observe(s));
  },
  io() { return PDFW._io || (PDFW._io = new IntersectionObserver(es => es.forEach(en => { const C = en.target._pd; if (C) { C.vis = en.isIntersecting; PDFW.want(C); } }), { rootMargin: '400px' })); },
  want(C) { if (C.raf || C.dead) return; C.raf = requestAnimationFrame(() => { C.raf = 0; PDFW.update(C); }); },
  shown: C => C.vis && C.el.isConnected && PDFW.zoom(C) >= PDFW.MIN_Z,
  update(C) {
    if (C.dead) return;
    const far = PDFW.zoom(C) < PDFW.MIN_Z, st = C.stage;
    if (far) C.ph.style.cssText = `top:${st.offsetTop}px;left:${st.offsetLeft}px;width:${st.offsetWidth}px;height:${st.offsetHeight}px`;
    C.el.classList.toggle('pdf-far', far);
    if (PDFW.shown(C)) { clearTimeout(C.idleT); C.idleT = null; if (C.active) PDFW.plan(C); else if (!C.failed || C.retry) { C.retry = false; PDFW.activate(C); } }   // a failed card waits for its retry timer (C.retry) or the next redraw
    else if (C.active && !C.idleT) C.idleT = setTimeout(() => { C.idleT = null; if (!PDFW.shown(C)) PDFW.release(C); }, far ? 600 : PDFW.IDLE);
  },
  async activate(C) {
    C.active = true;
    try {
      const pdf = await PDFW.load(C.m); if (!C.active || C.dead) return;
      if (C.failed) { C.failed = false; const back = C.page ? [C.one] : C.slots; if (back.length && !back[0].isConnected) C.stage.replaceChildren(...back); }   // open after all: the pages back in place of the error
      const B = M.block(C.b.id);
      if (B && (!B.pages || B.pages !== pdf.numPages)) { B.pages = pdf.numPages; DOCS.save(B); C.count.textContent = C.page ? `${C.cur + 1} / ${pdf.numPages}` : plural(pdf.numPages, 'page'); if (!/Page 1\n/.test((B.body && B.body.text) || '')) PDFW.words(B); }
      if (!PDFW.aspect.has(C.m.id)) { const v = (await pdf.getPage(1)).getViewport({ scale: 1 }), a = v.height / v.width; PDFW.aspect.set(C.m.id, a);
        C.slots.forEach(s => { const cv = !s._res && $('canvas.pdf-page', s); if (cv) cv.style.height = Math.round(parseFloat(cv.style.width) * a) + 'px'; }); }
      if (!C.active || C.dead) return; C.pdf = pdf;
      const W = PDFW.width(C);
      if (C.page) C.W = W;
      else if (!C.slots.length) { C.W = W; PDFW.slots(C, pdf.numPages); }
      else if (Math.abs(W - C.W) > 1) { C.W = W; C.slots.forEach(s => { PDFW.releaseSlot(s); s.replaceChild(PDFW.blank(W, PDFW.aspect.get(C.m.id) || 1.294), $('canvas.pdf-page', s)); }); }
      PDFW.plan(C);
    } catch (e) { C.active = false; C.failed = true; if (!C.dead) C.stage.replaceChildren(h('div.embed-missing', 'Could not open the PDF: ' + (e.message || e)));
      // a file that isn't there yet (the web still loading its file list, a file on its way from another device): try again soon —
      // only on this timer (C.retry): a failed card is not re-activated by every pan or zoom (update); PDFW.load has already forgotten the failure
      if (!C.dead && (C.tries = (C.tries || 0) + 1) < 4) setTimeout(() => { if (!C.dead && !C.active) { C.retry = true; PDFW.want(C); } }, 1500 * C.tries); }
  },
  plan(C) {
    if (!C.active || !C.pdf) return;
    const res = PDFW.res(C), off = s => !s._res || s._res < res * .8 || s._res > res * 2;
    if (C.page) { if (off(C.one)) PDFW.enqueue(C, C.one, res); }
    else C.slots.forEach(s => { if (s._in && off(s)) PDFW.enqueue(C, s, res); });
    PDFW.pump();
  },
  enqueue(C, s, res) { if (s._job) { s._job.res = res; return; } s._job = { C, s, res }; PDFW.q.push(s._job); },
  pump() {
    while (PDFW.busy < PDFW.JOBS && PDFW.q.length) {
      const j = PDFW.q.shift(); j.s._job = null;
      if (!j.C.active || j.C.dead || !j.C.pdf || (!j.C.page && !j.s._in)) continue;
      PDFW.busy++; PDFW.draw(j).catch(() => { }).then(() => { PDFW.busy--; PDFW.pump(); });
    }
  },
  /** The first draw goes into the slot's canvas (so the quote layer, 13zw, is laid on it); a redraw at another zoom
      goes into a new canvas swapped in when done (no white flash). */
  async draw(j) {
    const C = j.C, s = j.s, pdf = C.pdf, n = C.page ? clamp(C.cur, 0, pdf.numPages - 1) + 1 : +s.dataset.p;
    let W = C.W; if (C.page) { const v0 = (await pdf.getPage(n)).getViewport({ scale: 1 }); W = Math.floor(Math.min(C.W, ((C.stage.clientHeight || 500) - 12) * v0.width / v0.height)); }
    const old = $('canvas.pdf-page', s), first = !s._res || !$(':scope > .textLayer', s), cv = first ? old : h('canvas.pdf-page');
    await PDFW.page(C.m, n, cv, W, j.res);
    if (!C.active || C.dead || !s.isConnected) { if (first) PDFW.releaseSlot(s); else { cv.width = 0; cv.height = 0; } return; }
    if (!first) { s.replaceChild(cv, old); old.width = 0; old.height = 0; }
    s._res = j.res;
  },
  releaseSlot(s) {
    const cv = $('canvas.pdf-page', s); if (cv) { cv.width = 0; cv.height = 0; }
    s._res = 0; $$(':scope > .textLayer, :scope > .q-marks', s).forEach(x => x.remove());
  },
  release(C) { C.active = false; C.pdf = null; C.slots.forEach(PDFW.releaseSlot); if (C.one) PDFW.releaseSlot(C.one); PDFW.trim(); },
  drop(C) {
    if (C.dead) return; PDFW.release(C); C.dead = true; clearTimeout(C.idleT);
    if (PDFW._io) PDFW._io.unobserve(C.el); if (C.pio) C.pio.disconnect();
    PDFW.cards.delete(C); if (PDFW.live.get(C.key) === C) PDFW.live.delete(C.key);
  },
  /** At most a few parsed files that no card on screen (or the maximised view) is using. */
  trim() {
    const inUse = new Set([...PDFW.cards].filter(C => C.active).map(C => C.m.id)); if (DOCS._max) { const mb = M.block(DOCS._max.id); if (mb) inUse.add(mb.media); }
    const idle = [...PDFW.docs.keys()].filter(id => !inUse.has(id) && !PDFW.pin[id]).sort((a, b) => (PDFW.used.get(a) || 0) - (PDFW.used.get(b) || 0));
    while (idle.length > PDFW.KEEP) { const id = idle.shift(), p = PDFW.docs.get(id); PDFW.docs.delete(id); PDFW.used.delete(id); p.then(d => d.destroy(), () => { }); }
  },
  /** A card whose note was closed (or that was removed) lets go after ~10 s; a redraw of the note takes it back at once. */
  sweeping() {
    if (PDFW._sw) return;
    PDFW._sw = setInterval(() => { PDFW.cards.forEach(C => { if (C.el.isConnected) C.gone = 0; else if (++C.gone >= 2) PDFW.drop(C); }); if (!PDFW.cards.size) { clearInterval(PDFW._sw); PDFW._sw = null; PDFW.trim(); } }, 5000);
  },
  kick() { if (!PDFW.cards.size) return; clearTimeout(PDFW._zt); PDFW._zt = setTimeout(() => PDFW.cards.forEach(C => { if (C.el.isConnected) PDFW.want(C); }), 220); },
  stats() {
    const o = { cards: 0, active: 0, drawn: 0, mb: 0, docs: PDFW.docs.size, queued: PDFW.q.length };
    PDFW.cards.forEach(C => { if (C.el.isConnected) { o.cards++; if (C.active) o.active++; } });
    $$('.pdfw canvas.pdf-page').forEach(c => { if (c.width > 0 && c.height > 0) { o.drawn++; o.mb += c.width * c.height * 4; } });
    o.mb = Math.round(o.mb / 1048576); return o;
  },
};
WIDGETS.pdf = { label: 'pdf', w: 616, body: PDFW.body, menu: b => [{ label: 'Maximise', run: () => DOCS.max(b) }, { label: b.view === 'page' ? 'Show all pages' : 'One page at a time', run: () => { b.view = b.view === 'page' ? 'scroll' : 'page'; DOCS.save(b); DOCS.repaint(b); } }] };
INSERTS.push({ id: 'pdf', group: 'Widgets', icon: '▤', label: 'PDF…', sub: 'Its pages drawn here — scroll or one at a time, resize, maximise, open in a new tab; words searchable', run: (d, p) => PDFW.insert(d, p) });

{
  SLIM.BARS.deck = '.dk-bar'; SLIM.BARS.pdf = '.pdf-bar';
  // a zoom or a pan: the PDF cards on screen redraw at the new sharpness (titles when far out)
  const ap = Paper.prototype.apply; Paper.prototype.apply = function () { const r = ap.apply(this, arguments); PDFW.kick(); return r; };
  // ← → page through the slide deck or PDF under the mouse (or selected), when not typing
  document.addEventListener('keydown', e => {
    if (DOCS._max || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.ctrlKey || e.metaKey || e.altKey || $('.ovl') || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
    const pane = App.pane && App.panes().includes(App.pane) ? App.pane : DocView, sel = pane && pane.sel && M.block(pane.sel), b = DOCS.hover ? M.block(DOCS.hover) : (sel && (sel.kind === 'deck' || sel.kind === 'pdf') ? sel : null);
    if (!b) return; e.preventDefault(); e.stopPropagation(); DOCS.step(b, e.key === 'ArrowRight' ? 1 : -1);
  }, true);
}
