/* ==========================================================================
   13zza · Clip a figure or an equation out of a PDF onto the canvas.
   Point at a figure, table or display equation in a PDF (the card, the
   maximised view, or the paper read beside the note, 13zzb) and "＋ Figure 2"
   / "＋ Equation 3" appears on it: click it and it becomes an image panel
   on top of the paper (over the place it came from, when the card shows
   that page), floating there until you drag it where you want it; drawn
   again from the PDF at about 1600 px wide, titled with its label, a
   figure's caption from the paper under it and "from …, p. 4" to go back
   to the page. The scissors on the PDF's bar:
   everything outlined, click one or drag a box round anything (one panel,
   a few lines); Esc or the scissors again ends it.
   Found by the lab site's detectors (rm/js/page-layout.js figures and tables
   from the page's text and artwork; rm/js/page-regions.js equations — both
   copied into vendor/ by scripts/scientia_build.py). Without them the box
   still works. A figure clip is an ordinary image panel with `clip`
   { src, media, page, rect (0–1 of the page), label, file }; an equation
   is captured the way the lab's paper reader does it — the snip read to
   LaTeX (CLIP.read, the web build's equationOcr), checked by you in the
   equation editor — and becomes an equation component with the same
   `clip`. Each is wired to the paper ("clipped from"), and a paper's wires
   to its clips and quotes stay faint except those from the page it shows.
   ========================================================================== */
const CLIP = {
  reg: new Map(), on: new Set(), cur: null, busy: false, REL: 'c:clipped from',
  ICON: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>',

  /* ---------- finding the figures on a page ---------- */
  /** The page's words where the detector expects them: scale 1, from the top left (the lab's offline extractor does the same). */
  items(tc, vp) {
    const out = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim() || !it.transform) continue;
      const tx = pdfjsLib.Util.transform(vp.transform, it.transform), fh = Math.hypot(tx[2], tx[3]), an = Math.atan2(tx[1], tx[0]), w = it.width * vp.scale;
      if (!(w > 0) || !(fh > 0)) continue;
      const left = tx[4], top = tx[5] - fh * .8;   // pdf.js's default ascent
      if (Math.abs(an) < 1e-3) { out.push({ x: left, y: top, width: w, height: fh, text: it.str }); continue; }
      const c = Math.cos(an), s = Math.sin(an), ps = [[0, 0], [w, 0], [0, fh], [w, fh]].map(([a, b]) => [left + a * c - b * s, top + a * s + b * c]), xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
      out.push({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), text: it.str, rotated: true });
    }
    return out;
  },
  /** pdf.js 3 writes a path's bounds as [minX, maxX, minY, maxY]; the detector reads pdf.js 4's [minX, minY, maxX, maxY]. */
  ops(ol) {
    if (!/^3\./.test(pdfjsLib.version || '')) return ol;
    const P = pdfjsLib.OPS.constructPath;
    return { fnArray: ol.fnArray, argsArray: ol.argsArray.map((a, i) => ol.fnArray[i] === P && a && a[2] && a[2].length === 4 ? [a[0], a[1], [a[2][0], a[2][2], a[2][1], a[2][3]]] : a) };
  },
  /** How dark the page is between two corners (0–1), from a small drawing of it: the detector's column and caption tests. */
  async probe(pg, W, H) {
    const gw = Math.max(40, Math.min(360, Math.round(W / 2))), sc = gw / W, cv = document.createElement('canvas'); cv.width = gw; cv.height = Math.max(40, Math.round(H * sc));
    const ctx = cv.getContext('2d', { willReadFrequently: true }), gh = cv.height; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, gw, gh);
    await pg.render({ canvasContext: ctx, viewport: pg.getViewport({ scale: sc }) }).promise;
    const d = ctx.getImageData(0, 0, gw, gh).data, ink = new Float32Array(gw * gh); for (let i = 0, p = 0; i < ink.length; i++, p += 4) ink[i] = 1 - (d[p] + d[p + 1] + d[p + 2]) / 765;
    cv.width = cv.height = 0;
    return (x1, y1, x2, y2) => { let a = Math.max(0, Math.floor(x1 * sc)), b = Math.min(gw - 1, Math.ceil(x2 * sc) - 1), c = Math.max(0, Math.floor(y1 * sc)), e = Math.min(gh - 1, Math.ceil(y2 * sc) - 1); if (b < a) b = a; if (e < c) e = c;
      let s = 0, n = 0; for (let y = c; y <= e; y++) for (let x = a; x <= b; x++) { s += ink[y * gw + x]; n++; } return n ? s / n : 0; };
  },
  /** Page n's figures, tables and equations → { W, H, list: [{x, y, w, h, label, kind}] } in page units (scale 1, from the top left). */
  async detect(pdf, n) {
    const pg = await pdf.getPage(n), vp = pg.getViewport({ scale: 1 }), W = vp.width, H = vp.height, PL = window.PAGE_LAYOUT;
    if (!PL || !PL.figureRegions) return { W, H, list: [] };
    const items = CLIP.items(await pg.getTextContent(), vp); let graphics, ink = null;
    try { graphics = PL.collectGraphics(CLIP.ops(await pg.getOperatorList()), pdfjsLib.OPS, vp.transform, W, H); } catch { graphics = undefined; }
    try { ink = await CLIP.probe(pg, W, H); } catch { }
    try { PL.segmentPage(items, { pageWidth: W, pageHeight: H, inkProbe: ink }); } catch { }
    const opts = { pageWidth: W, pageHeight: H, inkProbe: ink, graphics, pageNum: n, numPages: pdf.numPages }, box = r => ({ x: r.x, y: r.y, w: r.w, h: r.h, label: r.label || '' });
    const figs = (PL.figureRegions(items, opts) || []).filter(r => r.w > 8 && r.h > 8).map(r => Object.assign(box(r), { kind: r.kind || 'figure' }));
    // the caption becomes the clip's text: below the artwork it is cut off the picture (a table's, above, stays — its rows would read as more caption)
    figs.forEach(f => { const inF = it => { const cx = it.x + it.width / 2, cy = it.y + it.height / 2; return cx > f.x && cx < f.x + f.w && cy > f.y && cy < f.y + f.h; };
      const head = items.filter(it => inF(it) && /^\s*(?:extended\s+data\s+)?(?:fig(?:ure)?s?|table|scheme)\b/i.test(it.text)).sort((a, b) => b.y - a.y)[0];
      if (!head || head.y < f.y + f.h * .45 || head.y - 3 - f.y < Math.max(24, f.h * .25)) return;
      f.art = { x: f.x, y: f.y, w: f.w, h: head.y - 3 - f.y };
      f.cap = items.filter(it => inF(it) && it.y >= head.y - 1).sort((a, b) => Math.round(a.y / 3) - Math.round(b.y / 3) || a.x - b.x).map(it => it.text).join(' ').replace(/-\s+(?=[a-z])/g, '').replace(/\s+/g, ' ').trim(); });
    let eqs = []; try { eqs = window.PAGE_REGIONS ? PAGE_REGIONS.detect(items.slice(), opts).filter(r => r.t === 'equation' && r.w > 8 && r.h > 4).map(r => Object.assign(box(r), { kind: 'equation' })) : []; } catch { }
    eqs = eqs.filter(e => !figs.some(f => e.x + e.w / 2 > f.x && e.x + e.w / 2 < f.x + f.w && e.y + e.h / 2 > f.y && e.y + e.h / 2 < f.y + f.h));   // math inside a figure is the figure's
    // its number: the right-most "(3)" level with it (often out in the margin, past the box); its picture: taller than the
    // words it was found from, so sub- and superscripts are in the snip the reader gets (on Alex's labels the boxes sit ~4 pt high, 3 pt short)
    eqs.forEach(e => { const k = items.filter(it => /^\s*[\[(]\s*\d{1,3}[a-z]?\s*[\])]\s*$/.test(it.text) && it.x >= e.x + e.w * .5 && it.y + it.height / 2 > e.y && it.y + it.height / 2 < e.y + e.h).sort((a, b) => b.x - a.x)[0];
      if (k) e.num = k.text.replace(/[^\da-z]/gi, ''); e.art = { x: e.x - 2, y: Math.max(0, e.y - e.h * .1), w: e.w + 4, h: Math.min(H, e.h * 1.45) }; });
    return { W, H, list: figs.concat(eqs) };
  },
  regions(m, n) { const k = m.id + ':' + n; if (!CLIP.reg.has(k)) CLIP.reg.set(k, PDFW.load(m).then(pdf => CLIP.detect(pdf, n)).catch(() => { CLIP.reg.delete(k); return { W: 0, H: 0, list: [] }; })); return CLIP.reg.get(k); },
  /** "Figure 2", "Table 1", "Extended Data Fig. 3" from the start of the caption; "Equation 3" from the (3) after it. */
  short(r) {
    if (r.kind === 'equation') return r.num ? 'Equation ' + r.num : 'Equation';
    const m = (r.label || '').match(/^\s*((?:extended\s+data\s+|supp(?:lementary)?\.?\s*)?(?:fig(?:ure)?s?|table|scheme)\.?\s*S?\d+[a-z]?)/i); return m ? m[1].replace(/\s+/g, ' ').replace(/\bfig(?:ure)?s?\.?\s*/i, 'Figure ').replace(/\btable\s*/i, 'Table ').trim() : /table/i.test(r.kind) ? 'Table' : 'Figure'; },
  caption: r => r.kind === 'equation' ? '' : (r.cap || r.label || '').replace(/\s+/g, ' ').trim(),   // an equation's text from the PDF is glyph soup

  /* ---------- where a page sits ---------- */
  slotOf: el => el && el.closest && el.closest('.pdfw .pdf-slot, .pdfw .pdf-one'),
  /** The PDF component a page belongs to: the card's box, or the maximised / beside view's data-src. */
  srcOf(slot) { const box = slot.closest('.box'); if (box) return box.dataset.id; const c = slot.closest('[data-src]'); return c ? c.dataset.src : null; },
  canEdit(slot) { const box = slot.closest('.box'), pane = box && DV(box); return !(pane && pane.travel) && !slot.closest('.pdf-far'); },
  clipping: slot => !!slot.closest('.pdfw.clipping'),
  page: slot => +slot.dataset.p || 0,
  media(slot) { const b = M.block(CLIP.srcOf(slot)); return b && b.kind === 'pdf' ? MEDIA.get(b.media) : null; },
  /** The layer over the page's canvas (percent units: it follows any zoom). */
  layer(slot) {
    const cv = $(':scope > canvas.pdf-page', slot); if (!cv) return null; let L = $(':scope > .clip-layer', slot);
    if (!L) { L = h('div.clip-layer'); slot.append(L); }
    Object.assign(L.style, { left: cv.offsetLeft + 'px', top: cv.offsetTop + 'px', width: cv.style.width || cv.offsetWidth + 'px', height: cv.style.height || cv.offsetHeight + 'px' });
    return L;
  },
  at(slot, R, cx, cy) { const q = $(':scope > canvas.pdf-page', slot).getBoundingClientRect(), x = (cx - q.left) / q.width * R.W, y = (cy - q.top) / q.height * R.H;
    return R.list.filter(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h).sort((a, b) => a.w * a.h - b.w * b.h)[0] || null; },
  /** Outline the figures (all of them in clip mode, else the one under the pointer), each with its "＋ Figure 2". */
  paint(slot, R, all, hit) {
    const L = CLIP.layer(slot); if (!L) return; const key = (all ? 'all' : hit ? R.list.indexOf(hit) : '-') + ':' + R.list.length + ':' + L.style.width; if (L._k === key) return; L._k = key;
    L.replaceChildren(...R.list.filter(r => all || r === hit).map(r => { const s = CLIP.short(r), g = r.art || r;   // outlined: what the picture will hold
      return h('div.clip-hs' + (r.kind === 'equation' ? '.eq' : ''), { style: { left: g.x / R.W * 100 + '%', top: g.y / R.H * 100 + '%', width: g.w / R.W * 100 + '%', height: g.h / R.H * 100 + '%' } },
        h('button.clip-badge.nopan', { title: r.kind === 'equation' ? 'Read it into an equation on top of the paper (checked by you first)' : (r.label ? snippet(r.label, 160) + '\n' : '') + 'Put it on the canvas, on top of the paper', on: { click: e => { e.stopPropagation(); e.preventDefault(); CLIP.go(slot, R, r); } } }, '＋ ' + s)); }));
  },
  clear(slot) { const L = slot && $(':scope > .clip-layer', slot); if (L && !CLIP.clipping(slot)) { L.replaceChildren(); L._k = ''; } },
  move(e) {
    const slot = CLIP.slotOf(e.target); if (CLIP.cur && CLIP.cur !== slot) CLIP.clear(CLIP.cur); CLIP.cur = slot;
    if (!slot || CLIP.clipping(slot) || !CLIP.canEdit(slot) || !CLIP.page(slot) || !$(':scope > canvas.pdf-page', slot)) return;
    const m = CLIP.media(slot); if (!m) return;
    CLIP.regions(m, CLIP.page(slot)).then(R => { if (CLIP.cur !== slot || !R.list.length || CLIP.clipping(slot)) return; CLIP.paint(slot, R, false, CLIP.at(slot, R, e.clientX, e.clientY)); });
  },

  /* ---------- clip mode ---------- */
  btn(b) { return h('button.btn.xs.clip-btn' + (CLIP.on.has(b.id) ? '.on' : ''), { 'data-for': b.id, title: 'Clip a figure — every figure outlined: click one, or drag a box round anything (Esc ends)', html: CLIP.ICON, on: { click: e => { e.stopPropagation(); CLIP.toggle(b.id); } } }); },
  roots: id => [...new Set([...$$(`.box[data-id="${id}"] .pdfw`), ...$$(`[data-src="${id}"] .pdfw`)])],
  toggle(id, on) { on = on == null ? !CLIP.on.has(id) : on; on ? CLIP.on.add(id) : CLIP.on.delete(id); CLIP.sync(id); },
  sync(id) {
    const on = CLIP.on.has(id); $$(`.clip-btn[data-for="${id}"]`).forEach(b => b.classList.toggle('on', on));
    CLIP.roots(id).forEach(el => { el.classList.toggle('clipping', on); $$('.clip-layer', el).forEach(L => { L._k = ''; if (!on) L.replaceChildren(); }); if (on) CLIP.paintIn(el); });
  },
  /** Clip mode: a layer on every page in view (so a box can be drawn by pen or finger too), its figures outlined. */
  paintIn(el) {
    const st = $('.pdf-stage', el) || el, vr = st.getBoundingClientRect();
    $$('.pdf-slot, .pdf-one', el).forEach(slot => { const r = slot.getBoundingClientRect(), m = CLIP.media(slot), n = CLIP.page(slot); if (!m || !n || r.bottom < vr.top - 200 || r.top > vr.bottom + 200 || !CLIP.layer(slot)) return;
      CLIP.regions(m, n).then(R => { if (CLIP.clipping(slot)) CLIP.paint(slot, R, true); }); });
  },
  /** A box drawn in clip mode (or a click on a figure). */
  drag(e, L) {
    $$('.clip-ask, .clip-mq.kept').forEach(x => x.remove());
    const slot = L.parentElement, q = L.getBoundingClientRect(), x0 = e.clientX - q.left, y0 = e.clientY - q.top, mq = h('div.clip-mq'); let box = null;
    // the pointer is in screen pixels, the layer's own pixels are scaled by the canvas zoom (a card at 60% has 0.6 screen px each)
    const k = L.offsetWidth / (q.width || 1), css = b => ({ left: b.x * k + 'px', top: b.y * k + 'px', width: b.w * k + 'px', height: b.h * k + 'px' });
    try { L.setPointerCapture(e.pointerId); } catch { }
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; const x1 = clamp(ev.clientX - q.left, 0, q.width), y1 = clamp(ev.clientY - q.top, 0, q.height); box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      if (!mq.isConnected && (box.w > 4 || box.h > 4)) L.append(mq); Object.assign(mq.style, css(box)); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; ['pointermove', 'pointerup', 'pointercancel'].forEach((t, i) => L.removeEventListener(t, i ? up : mv)); mq.remove();
      const m = CLIP.media(slot), n = CLIP.page(slot); if (!m || !n || ev.type === 'pointercancel') return;
      CLIP.regions(m, n).then(R => { if (!R.W) return;
        if (box && box.w >= 10 && box.h >= 10) return CLIP.ask(L, { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k }, { x: box.x / q.width * R.W, y: box.y / q.height * R.H, w: box.w / q.width * R.W, h: box.h / q.height * R.H, W: R.W, H: R.H });
        const hit = CLIP.at(slot, R, e.clientX, e.clientY); if (hit) CLIP.go(slot, R, hit); }); };
    L.addEventListener('pointermove', mv); L.addEventListener('pointerup', up); L.addEventListener('pointercancel', up);
  },
  /** A drawn box (in the layer's own pixels): a picture of it, or an equation read from it (for one the detector missed). */
  ask(L, box, a) {
    $$('.clip-ask').forEach(x => x.remove()); const slot = L.parentElement, src = CLIP.srcOf(slot), n = CLIP.page(slot), keep = h('div.clip-mq.kept', { style: { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' } });
    const done = () => { bar.remove(); keep.remove(); }, b = (label, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); done(); fn(); } } }, label);
    const below = box.y + box.h + 34 < L.offsetHeight, bar = h('div.clip-ask', { style: { left: box.x + 'px', top: (below ? box.y + box.h + 6 : Math.max(0, box.y - 34)) + 'px' } },
      b('Picture', 'An image panel of this region, on top of the paper', () => CLIP.take(src, n, a, 'Clip', '')), b('Equation', 'Read it into an equation on top of the paper (checked by you first)', () => CLIP.equation(src, n, a, 'Equation')), b('✕', 'Never mind', () => { }));
    bar.addEventListener('pointerdown', e => e.stopPropagation()); L.append(keep, bar);
  },

  /* ---------- the clip itself ---------- */
  /** The region drawn again from the PDF, about px wide, on white with a 4 pt margin. */
  async canvas(m, n, r, px) {
    const pdf = await PDFW.load(m), pg = await pdf.getPage(n), pad = 4, x0 = Math.max(0, r.x - pad), y0 = Math.max(0, r.y - pad), x1 = Math.min(r.W, r.x + r.w + pad), y1 = Math.min(r.H, r.y + r.h + pad);
    const s = Math.min(clamp(px / Math.max(60, x1 - x0), 1.5, 4), 4096 / Math.max(x1 - x0, y1 - y0)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round((x1 - x0) * s)); cv.height = Math.max(1, Math.round((y1 - y0) * s));
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: ctx, viewport: pg.getViewport({ scale: s, offsetX: -x0 * s, offsetY: -y0 * s }) }).promise;
    return cv;
  },
  /** A picture: ~1600 px wide WebP (PNG where WebP can't be made). */
  async render(m, n, r) {
    const cv = await CLIP.canvas(m, n, r, 1600), blob = await new Promise(res => cv.toBlob(res, 'image/webp', .92)) || await new Promise(res => cv.toBlob(res, 'image/png'));
    cv.width = cv.height = 0; if (!blob) throw new Error('the picture could not be made'); return blob;
  },
  /** An equation's snip for reading: ~1000 px wide JPEG as a data URI (what the lab's equationOcr takes). */
  async snip(m, n, r) { const cv = await CLIP.canvas(m, n, r, 1000), u = cv.toDataURL('image/jpeg', .9); cv.width = cv.height = 0; return u; },
  /** Set by the web build (rm/scientia/lab-mode.js): snip → Promise<LaTeX> through the lab's equationOcr, as the paper reader does. None on the desktop: you type it. */
  read: null,
  /** An equation, the way the lab's paper reader captures one: the snip read to LaTeX (CLIP.read), checked in the equation editor
      against the picture, then an equation component on top of the paper (its terms, calculator and register all work on it). */
  async equation(srcId, n, r, label) {
    const src = M.block(srcId), m = src && MEDIA.get(src.media); if (!m || CLIP.busy) return; CLIP.busy = true; let snip;
    if (r.art) r = Object.assign({ W: r.W, H: r.H }, r.art);
    try { snip = await CLIP.snip(m, n, r); } catch (e) { return toast('Could not snip that: ' + (e.message || e)); } finally { CLIP.busy = false; }
    const paper = src.label || (m.name || 'PDF').replace(/\.pdf$/i, ''), name = label || 'Equation', at = CLIP.spot(src, n, r, 392);   // where it was, before the editor covers it
    MATH.editor({ tex: '', display: true, title: name + ' · ' + paper + ', p. ' + n, onSave: tex => { if (!tex) return;
      try { DB.beginGroup('clip');
        const b = EQ.create(M.doc(src.docId), at, { tex }); b.label = name; CLIP.lift(b);
        b.clip = { src: src.id, media: m.id, page: n, rect: [r.x / r.W, r.y / r.H, r.w / r.W, r.h / r.H].map(v => +clamp(v, 0, 1).toFixed(4)), label: name, file: paper };
        EQ.syncText(b); DB.put('blocks', b); M.wire(b.id, src.id, CLIP.REL, true); changed(); CLIP.fresh(b); toast(name + ' is on top of the paper: drag it where you want it');
      } catch (e) { toast('Could not add the equation: ' + (e.message || e)); } } });   // never leave the editor stuck open
    const ed = [...$$('.meditor')].pop(), mf = ed && $('math-field', ed), ta = ed && $('.mtex', ed); if (!ed) return;
    const note = h('div.clip-ocr'); ed.prepend(h('div.clip-eqhead', h('img.clip-snip', { src: snip, alt: 'The equation in the paper' }), note));
    if (!CLIP.read || !mf) { note.textContent = 'Type it in, checking it against the snip above.'; return; }
    note.textContent = 'Reading the equation from the snip…'; note.classList.add('busy');
    CLIP.read(snip).then(tex => { if (!ed.isConnected) return; note.classList.remove('busy');
      if ((mf.value || '').trim()) { note.textContent = 'Read — but you had started typing, so your version is kept.'; return; }   // never over what you typed
      mf.setValue(tex, { silenceNotifications: true }); if (ta) ta.value = tex; note.classList.add('ok');
      note.textContent = 'Read from the snip — check it against the picture, then Done. Letters that are one name (like MESF) read as separate terms: select them and press One name.';
    }).catch(e => { if (!ed.isConnected) return; note.classList.remove('busy'); note.classList.add('bad'); note.textContent = 'Could not read it (' + (e.message || e) + ') — type it in.'; });
  },
  /** The page a paper is showing: the paper read beside the note, else its card (the page across the top third of its stage). */
  pageOf(id) {
    if (typeof RDOCK !== 'undefined' && RDOCK.st && RDOCK.st.id === id) return RDOCK.page();
    const b = M.block(id), cur = b ? (b.cur || 0) + 1 : 0, box = $(`.box[data-id="${id}"]`), st = box && $('.pdf-stage', box);
    if (!st || !b || b.view === 'page' || $('.pdfw.pdf-far', box)) return cur;
    const y = st.getBoundingClientRect().top + st.clientHeight * .3, sl = $$('.pdf-slot', st).find(x => x.getBoundingClientRect().bottom > y); return sl ? +sl.dataset.p : cur;
  },
  /** The wires from a paper to what came out of it (clips, quotes) stay faint while you read, except those from the page it is
      showing: solid, and drawn again above the cards. */
  mark(pane) {
    const w = pane && pane.paper && pane.paper.world; if (!w || !pane.svg) return; const pages = {};
    $$('.pw-top', w).forEach(x => x.remove());
    DB.all('wires').forEach(x => { const a = M.block(x.from), b = M.block(x.to); if (!a || !b || a.docId !== pane.docId) return;
      const [item, paper] = b.kind === 'pdf' ? [a, b] : a.kind === 'pdf' ? [b, a] : []; const s = item && (item.clip || item.quote); if (!s || s.src !== paper.id || !s.page) return;
      const on = (pages[paper.id] != null ? pages[paper.id] : (pages[paper.id] = CLIP.pageOf(paper.id))) === s.page;
      $$(`[data-w="${x.id}"]`, w).forEach(el => { el.classList.toggle('pw-dim', !on); el.classList.toggle('pw-on', on); });
      const p = on && pane.svgOver && $(`path.w[data-w="${x.id}"]:not(.lift)`, pane.svg); if (p) { const c = p.cloneNode(); c.removeAttribute('data-w'); c.classList.remove('pw-on'); c.classList.add('pw-top'); pane.svgOver.append(c); } });
  },
  /** The new component in view, briefly lit. */
  fresh(b) { setTimeout(() => { const pane = App.panes().find(p => p.docId === b.docId); if (pane && pane.reveal) pane.reveal(b.id); $$(`.box[data-id="${b.id}"]`).forEach(x => { x.classList.add('clip-new'); setTimeout(() => x.classList.remove('clip-new'), 1600); }); }, 80); },
  /** A figure's badge clips it; an equation's captures it. */
  go(slot, R, r) { const a = Object.assign({ W: R.W, H: R.H }, r), src = CLIP.srcOf(slot), n = CLIP.page(slot); return r.kind === 'equation' ? CLIP.equation(src, n, a, CLIP.short(r)) : CLIP.take(src, n, a, CLIP.short(r), CLIP.caption(r)); },
  /** Where a new clip goes, w wide: on top of the paper — over the place it came from when the card shows that page (a little
      down and right, lifted off it), else over the part of the card in view, else (the paper read beside the note or maximised,
      its card scrolled away) the middle of the note in view. You then drag it where you want it. */
  spot(src, n, r, w) {
    const panes = App.panes().filter(p => p.docId === src.docId && p.paper), over = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    for (const pane of panes) {
      const P = pane.paper, pr = P.rect(), box = $(`.box[data-id="${src.id}"]`, P.world); if (!box) continue;
      const cv = r && r.W && $(`.pdf-slot[data-p="${n}"] > canvas.pdf-page, .pdf-one[data-p="${n}"] > canvas.pdf-page`, box);
      if (cv) { const q = cv.getBoundingClientRect(), st = cv.closest('.pdf-stage'), sr = st ? st.getBoundingClientRect() : q, cx = q.left + r.x / r.W * q.width, cy = q.top + r.y / r.H * q.height;
        if (cx >= Math.max(pr.left, sr.left) && cx < Math.min(pr.right, sr.right) && cy >= Math.max(pr.top, sr.top) && cy < Math.min(pr.bottom, sr.bottom)) { const p = P.toWorld(cx, cy); return { x: p.x + 14, y: p.y + 14 }; } }
      const q = box.getBoundingClientRect(); if (over(q, pr)) { const p = P.toWorld((Math.max(q.left, pr.left) + Math.min(q.right, pr.right)) / 2, (Math.max(q.top, pr.top) + Math.min(q.bottom, pr.bottom)) / 2); return { x: p.x - w / 2, y: p.y - 100 }; }
    }
    const P = panes[0] && panes[0].paper; if (P) { const pr = P.rect(), p = P.toWorld(pr.left + pr.width / 2, pr.top + pr.height * .4); return { x: p.x - w / 2, y: p.y - 100 }; }
    return { x: (src.x || 0) + 42, y: (src.y || 0) + 42 };
  },
  /** A clip floats where it was put, over the paper — the canvas keeps its boxes apart (12-doc settle), but not this one until it
      is moved (`float` = the spot it was put; once it is somewhere else it is an ordinary box again). */
  lift(b) { b.float = { x: b.x, y: b.y }; },
  floats: b => !!(b && b.float && b.float.x === b.x && b.float.y === b.y),
  async take(srcId, n, r, label, caption) {
    const src = M.block(srcId), m = src && MEDIA.get(src.media); if (!m || CLIP.busy) return; CLIP.busy = true;
    if (r.art) r = Object.assign({ W: r.W, H: r.H }, r.art);
    try {
      const blob = await CLIP.render(m, n, r), ext = blob.type === 'image/png' ? 'png' : 'webp', paper = src.label || (m.name || 'PDF').replace(/\.pdf$/i, '');
      DB.beginGroup('clip');
      const rec = await MEDIA.add(new File([blob], `${label || 'Clip'} · ${paper} p${n}.${ext}`.replace(/[\\/:*?"<>|]+/g, '-'), { type: blob.type })), w = rec.w >= rec.h * .9 ? 476 : 336;
      const b = FIG.create(M.doc(src.docId), CLIP.spot(src, n, r, w), 1, 1); FIG.cells(b)[0].media = rec.id; b.fig.letters = false; b.label = label || 'Clip'; b.w = w; CLIP.lift(b);
      b.clip = { src: src.id, media: m.id, page: n, rect: [r.x / r.W, r.y / r.H, r.w / r.W, r.h / r.H].map(v => +clamp(v, 0, 1).toFixed(4)), label: b.label, file: paper };
      M.saveBlockBody(b, { text: caption || '', marks: [] }); FIG.save(b); M.wire(b.id, src.id, CLIP.REL, true); changed(); CLIP.fresh(b);
      toast(b.label + ' is on top of the paper: drag it where you want it');
    } catch (e) { toast('Could not clip that: ' + (e.message || e)); }
    finally { CLIP.busy = false; }
  },
  /** Back to where a clip came from: the paper beside the note or maximised if either holds it, else the card. */
  show(fig) {
    const c = fig && fig.clip, src = c && M.block(c.src); if (!src || src.status !== 'live') return toast('The PDF it came from is gone');
    const host = $(`.embed-max[data-src="${src.id}"]`); if (host) return CLIP.scrollTo(host, src, c);
    App.jump(src.id, null); setTimeout(() => { const box = $(`.box[data-id="${src.id}"]`); if (box) CLIP.scrollTo(box, M.block(src.id), c); }, 380);
  },
  scrollTo(root, src, c) {
    if (src.view === 'page' && (src.cur || 0) + 1 !== c.page) { PDFW.go(M.block(src.id), c.page - 1); return setTimeout(() => CLIP.scrollTo(root, M.block(src.id), c), 700); }
    const sl = $(`.pdf-slot[data-p="${c.page}"]`, root) || $('.pdf-one', root); if (!sl) return; const st = sl.closest('.pdf-stage, .dk-maxc');
    if (st && src.view !== 'page') st.scrollTo({ top: sl.getBoundingClientRect().top - st.getBoundingClientRect().top + st.scrollTop + c.rect[1] * sl.offsetHeight - 60, behavior: 'smooth' });
    setTimeout(() => { const L = CLIP.layer(sl); if (!L) return; const f = h('div.clip-flash', { style: { left: c.rect[0] * 100 + '%', top: c.rect[1] * 100 + '%', width: c.rect[2] * 100 + '%', height: c.rect[3] * 100 + '%' } }); L.append(f); setTimeout(() => f.remove(), 2400); }, 450);
  },
};
{
  // the scissors on every PDF bar that can add to the note (the card, maximised, beside)
  const bar = PDFW.bar; PDFW.bar = function (b, m, n, cur, maxed, ro) { const r = bar.apply(this, arguments); if (!ro) { r.count.after(CLIP.btn(b)); if (CLIP.on.has(b.id)) requestAnimationFrame(() => CLIP.sync(b.id)); } return r; };
  // pointing at a figure
  let raf = 0, last = null;
  document.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; last = e; if (!raf) raf = requestAnimationFrame(() => { raf = 0; CLIP.move(last); }); }, { passive: true });
  // before anything else on the page (the pen highlighter, the box's drag): a badge's press, a box in clip mode
  window.addEventListener('pointerdown', e => {
    const t = e.target; if (!t.closest) return;
    if (t.closest('.clip-badge, .clip-ask')) { e.stopPropagation(); return; }
    const L = t.closest('.pdfw.clipping .clip-layer'); if (!L || e.button > 0) return; e.preventDefault(); e.stopPropagation(); CLIP.drag(e, L);
  }, true);
  // Esc ends clip mode first (the maximised view would close on it)
  window.addEventListener('keydown', e => { if (e.key !== 'Escape' || !CLIP.on.size || $('.ovl')) return; e.preventDefault(); e.stopPropagation(); [...CLIP.on].forEach(id => CLIP.toggle(id, false)); }, true);
  // clip mode: pages scrolled into view get their layer and outlines
  const later = debounce(() => CLIP.on.forEach(id => CLIP.roots(id).forEach(CLIP.paintIn)), 150);
  document.addEventListener('scroll', e => { if (CLIP.on.size && e.target.closest && e.target.closest('.pdfw.clipping')) later(); }, true);
  // the paper's wires follow the page it shows (after each drawing of the wires, and as a paper scrolls)
  const dw = DocView.drawWires; DocView.drawWires = function () { const r = dw.apply(this, arguments); CLIP.mark(this); return r; };
  const rewire = debounce(() => App.panes().forEach(CLIP.mark), 90);
  document.addEventListener('scroll', e => { if (e.target.closest && e.target.closest('.pdf-stage')) rewire(); }, true);
  // a clip says where it is from, and lies on top of the paper (lifted) until it is moved
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (el && b && (b.kind === 'figure' || b.kind === 'eq') && b.clip) { const c = b.clip, src = M.block(c.src);
      el.append(h('button.q-from.clip-from.nopan', { title: 'Show it in the paper', on: { click: ev => { ev.stopPropagation(); CLIP.show(M.block(b.id)); } } }, 'from ', h('b', c.file || (src && src.label) || 'the PDF'), ', p. ' + c.page, src && src.status === 'live' ? '' : ' (gone)'));
      if (CLIP.floats(b)) el.classList.add('clip-float'); }
    return el; };
  // moved: an ordinary box again (the next drawing would say so too; this is at once, after the drop)
  window.addEventListener('pointerup', () => requestAnimationFrame(() => $$('.box.clip-float').forEach(el => { if (!CLIP.floats(M.block(el.dataset.id))) el.classList.remove('clip-float'); })), true);
}
