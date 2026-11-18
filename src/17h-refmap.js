/* ==========================================================================
   17h · The References Map (V4.22). Gabe: "If there are embedded links in the
   PDF from the citation in text to the actual reference at the end of the
   paper, have a section in the Highlights sidebar that is the References Map,
   which allows you to hover on a citation and see the associated paper
   without having to scroll down all the way. If you click on it, it will
   automatically bring you there. If there is a superscript number or a
   citation style based on the paper that you can associate to the journal,
   automatically find the citations if no links are evident for this to still
   work on older papers."
   - The finding is the lab's own (vendor/paper-cite.js `PCITE`, generated from
     rm/js/paper-citations.js + pdf-viewer.js, unchanged): the paper's words and
     links read headless, its reference list parsed at the back, internal GoTo
     links mapped onto its entries; without links, citations found in the text
     (numbered superscripts, [12], (12), Smith et al. 2014), validated against
     the list. The journal (the Library entry, the PDF's XMP, its first page)
     says which style to expect; the paper's own text wins when it disagrees.
   - In every PDF reader (a maximised PDF and the reader beside a note — 13zz
     MXHL; the Library's reader — 17b): hover a citation and, after the hover
     delay, a card shows the paper; click it and the PDF goes to that entry of
     the list, lit, with ‹ Back to where you were. The Highlights panel gains a
     References Map: the references, numbered as in the paper, how often each
     is cited; hover a row to light its citations (its card after the delay),
     click it to go to the entry, ×n to its first citation.
   Positions are the PDF's own (scale 1, top-down), so they hold at any zoom.
   ========================================================================== */
const REFMAP = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('refmap'),
  delay() { let v = 1000; try { v = +FEAT.tune('refmap', 'delay') || 1000; } catch (e) { } return clamp(v, 200, 4000); },
  mode() { let v = 'both'; try { v = FEAT.tune('refmap', 'find') || 'both'; } catch (e) { } return v === 'links' ? 'links' : 'both'; },
  runs: new Map(),   // media id|mode → Promise<result>
  done: new Map(),   // media id|mode → result
  STYLE: { link: 'from the PDF’s links', super: 'numbered superscripts', 'numeric-bracket': 'numbers in brackets', 'numeric-paren': 'numbers in parentheses', 'author-year': 'author and year' },
  /** The journal says which style to expect (a hint: the paper's own text decides). [name test, family, how it is called] */
  JOURNALS: [
    [/^nature\b|^scientific reports$|^communications (biology|physics|chemistry)$/i, 'super', 'Nature'],
    [/^science( advances| translational medicine| signaling| robotics| immunology)?$/i, 'numeric-paren', 'Science'],
    [/proceedings of the national academy|^pnas\b/i, 'numeric-paren', 'PNAS'],
    [/^(journal of the american chemical society|acs\b.*|nano letters|langmuir|biomacromolecules|chemical reviews|analytical chemistry|chemistry of materials)$/i, 'super', 'ACS'],
    [/^(lab on a chip|soft matter|chemical science|rsc advances|nanoscale|biomaterials science)$/i, 'super', 'RSC'],
    [/new england journal of medicine|^the lancet\b|^jama\b/i, 'super', 'medical'],
    [/^(cell|molecular cell|developmental cell|cell reports|neuron|current biology|cell stem cell|cell systems|cell metabolism|immunity|structure|iscience|matter|joule|chem)$/i, 'author-year', 'Cell Press'],
    [/journal of cell biology|^elife$|^development$|journal of cell science|molecular biology of the cell|^the embo journal$|^embo /i, 'author-year', 'author–year'],
    [/\bieee\b|physical review|applied physics letters|journal of applied physics|^plos\b|^bmc\b|^biomaterials$|acta biomaterialia|advanced (functional )?materials|^small$|angewandte/i, 'numeric-bracket', 'numbered'],
  ],
  journalOf(name) { const s = String(name || '').trim(); if (!s) return null; for (const [re, family, label] of REFMAP.JOURNALS) if (re.test(s)) return { name: s, family, label }; return null; },
  /** A journal's name heading a short line of the first page (its running head or footer: "nature physics | VOL 15 | 2019"). */
  journalOnPage(items) {
    const lines = new Map(); items.forEach(it => { const k = Math.round(it.y / 3); lines.set(k, (lines.get(k) || '') + ' ' + it.text); });
    for (const t0 of lines.values()) { const t = t0.replace(/\s+/g, ' ').trim(); if (!t || t.length > 80) continue;
      for (const [re, family, label] of REFMAP.JOURNALS) { let lead; try { lead = new RegExp('^(?:' + re.source.replace(/\^|\$/g, '') + ')(?![A-Za-z])', 'i'); } catch (e) { continue; } const mm = t.match(lead); if (mm) return { name: mm[0], family, label }; } }
    return null;
  },
  key: (m, mode) => m.id + '|' + (mode || REFMAP.mode()),
  libOf(m) { try { return DB.all('library').find(l => l.pdf === m.id) || null; } catch (e) { return null; } },

  /** Read the paper once (per file and finding mode): its reference list, every citation with its place, how they were found. */
  analyse(m, lib) {
    const k = REFMAP.key(m), hit = REFMAP.runs.get(k); if (hit) return hit;
    const run = REFMAP._analyse(m, lib || REFMAP.libOf(m), REFMAP.mode()).then(r => { REFMAP.done.set(k, r); return r; }, e => { console.warn('[refmap]', e); const r = { refs: [], cites: new Map(), per: [], family: 'none', how: 'Could not read this PDF', sizes: new Map(), items: [] }; REFMAP.done.set(k, r); return r; });
    REFMAP.runs.set(k, run); return run;
  },
  async _analyse(m, lib, mode) {
    PDFW.pin[m.id] = (PDFW.pin[m.id] || 0) + 1;
    try {
      const doc = await PDFW.load(m), view = { numPages: doc.numPages, getPage: p => doc.getPage(p), getDestination: d => doc.getDestination(d), getPageIndex: r => doc.getPageIndex(r), destroy() { } };
      const { items, links } = await PCITE.extract({ url: 'scientia', pdfDoc: view }, { withAnnotations: true });
      const sizes = new Map(); for (let p = 1; p <= doc.numPages; p++) { const v = (await doc.getPage(p)).getViewport({ scale: 1 }); sizes.set(p, { w: v.width, h: v.height }); }
      const printed = PCITE.parseRefsFromAllItems(items) || [];
      const refs = printed.map((r, i) => Object.assign({ i }, r));
      // the Library entry's own references (DOIs, by number) fill what the parse missed
      if (lib && Array.isArray(lib.references)) refs.forEach(r => { const o = lib.references[(r.n || 0) - 1]; if (o && !r.doi && o.doi) r.doi = o.doi; if (o && !r.title && o.title) r.title = o.title; });
      // the journal: the Library entry, the PDF's XMP / info, the first page's words
      let J = REFMAP.journalOf(lib && (lib.container || lib.journal));
      if (!J) { try { const md = await doc.getMetadata(); const x = md && md.metadata; J = REFMAP.journalOf(x && x.get && (x.get('prism:publicationname') || x.get('prism:publicationName'))) || REFMAP.journalOf(md && md.info && md.info.Subject && String(md.info.Subject).split(/[,;(]|\d/)[0]); } catch (e) { } }
      if (!J) J = REFMAP.journalOnPage(items.filter(it => it.page === 1));
      PCITE.state(refs, null);
      const byPage = new Map(); items.forEach(it => { const p = it.page || 1; (byPage.get(p) || byPage.set(p, []).get(p)).push(it); });
      const linkMap = PCITE._linkMatchesFromAnnotations(links || [], printed);
      const counts = { 'numeric-bracket': 0, 'numeric-paren': 0, super: 0, 'author-year': 0 }, raw = new Map();
      if (mode === 'both') for (const [p, arr] of byPage) { const ms = PCITE._matchItemsOnPage(arr, p, null); raw.set(p, ms); ms.forEach(x => { if (refs.length && !PCITE._matchedRef(x)) return; counts[PCITE._familyOf(x.kindLabel)]++; }); }
      const covered = new Set(); for (const arr of linkMap.values()) arr.forEach(x => covered.add(x.refKey));
      let style = refs.length && covered.size && (mode === 'links' || covered.size >= refs.length * .5) ? { family: 'link', counts: { link: covered.size } } : PCITE._pickFamily(counts);
      if (mode === 'both' && J && style.family !== 'link' && (style.family === 'none' || style.family === 'mixed' || (counts[J.family] || 0) >= .6 * (counts[style.family] || 0))) style = { family: J.family, counts, journal: true };
      PCITE.state(refs, style);
      const flat = mode === 'both' && refs.length && (style.family === 'super' || style.family === 'none'), cites = new Map(), per = refs.map(r => ({ ref: r, cites: [] }));
      const pages = new Set([...byPage.keys(), ...linkMap.keys()]);
      for (const p of [...pages].sort((a, b) => a - b)) {
        const L = linkMap.get(p) || [], T = mode === 'both' ? PCITE._filterValidated(flat ? PCITE._matchItemsOnPage(byPage.get(p) || [], p, null, { flatSuper: true }) : (raw.get(p) || [])) : [];
        const merged = L.concat(T.filter(t => !L.some(l => l.refKey === t.refKey && Math.abs(l.x - t.x) < Math.max(l.w, t.w, 6) && Math.abs(l.y - t.y) < Math.max(l.h, t.h, 6))));
        const out = [];
        merged.forEach(x => { const ref = PCITE._matchedRef(x); if (!ref) return; if (ref.firstPage === p && typeof ref.listY === 'number' && x.y >= ref.listY - 2 && x.kindLabel !== 'link') return;   // a number inside the list itself is not a citation
          const c = { page: p, k: out.length, x: x.x, y: x.y, w: Math.max(x.w, 3), h: Math.max(x.h, 4), ref, link: x.kindLabel === 'link' }; out.push(c); per[ref.i].cites.push(c); });
        if (out.length) cites.set(p, out);
      }
      PCITE.state(null, null);
      const n = [...cites.values()].reduce((a, v) => a + v.length, 0);
      const how = !refs.length ? 'No reference list found in this PDF' : !n ? (mode === 'links' ? 'No links to the references in this PDF' : 'References listed; no citations found in the text')
        : style.family === 'link' ? 'From the PDF’s links' : 'Found in the text · ' + (style.journal && J ? J.label + ' style, ' : '') + (REFMAP.STYLE[style.family] || 'mixed styles');
      return { refs, cites, per, family: style.family, how, journal: J, sizes, items, n };
    } finally { PDFW.pin[m.id]--; }
  },
  /** The text box of a reference entry on its page (for the flash): its first line down to the next entry. */
  entryBox(res, ref) {
    const p = ref.firstPage, y0 = ref.listY; if (!p || typeof y0 !== 'number') return null;
    const next = res.refs.filter(r => r.firstPage === p && typeof r.listY === 'number' && r.listY > y0 + 1).sort((a, b) => a.listY - b.listY)[0], y1 = next ? next.listY : y0 + 40;
    const its = res.items.filter(it => it.page === p && it.y >= y0 - 1 && it.y < y1 - 1); if (!its.length) return { x: 40, y: y0 - 2, w: (res.sizes.get(p) || { w: 600 }).w - 80, h: 14 };
    const x0 = Math.min(...its.map(i => i.x)), x1 = Math.max(...its.map(i => i.x + (i.width || 0))), yb = Math.max(...its.map(i => i.y + (i.height || 0)));
    return { x: x0 - 3, y: y0 - 2, w: x1 - x0 + 6, h: yb - y0 + 4 };
  },
  inLib(ref) {
    try { const d = (ref.doi || '').toLowerCase(), t = String(ref.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return DB.all('library').find(l => (d && (l.doi || '').toLowerCase() === d) || (t.length > 12 && String(l.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === t)) || null; } catch (e) { return null; }
  },

  /* ---------- where a page is, in each reader ---------- */
  /** { el (the page), box (what is drawn: the canvas or the page), n, m, root, kind } for a page element, or null. */
  page(el) {
    if (!el || !el.closest) return null;
    const slot = el.closest('.embed-max .pdf-slot');
    if (slot) { const ov = slot.closest('.embed-max'), c = slot.closest('[data-src]'), b = c && M.block(c.dataset.src), m = b && b.kind === 'pdf' && MEDIA.get(b.media), cv = $(':scope > canvas.pdf-page', slot); if (!m || !cv) return null; return { el: slot, box: cv, n: +slot.dataset.p, m, root: ov, b, kind: 'max' }; }
    const pg = el.closest('.reader .rd-page'), host = pg && pg.closest('.reader'), rv = host && host._rv;   // the reader that drew it (17b renders as an instance: drawSide below keeps it on its element)
    if (pg && rv && rv.lib) { const m = rv.lib.pdf && MEDIA.get(rv.lib.pdf); if (!m) return null; return { el: pg, box: pg, n: pg._n || +pg.dataset.page, m, root: host, lib: rv.lib, kind: 'lib' }; }
    return null;
  },
  pagesOf(root) { return root ? [...root.querySelectorAll('.pdf-slot, .rd-page')].map(e => REFMAP.page(e)).filter(Boolean) : []; },
  /** The citation under a point of a page (geometry, a little slack round each). */
  hitAt(P, res, cx, cy) {
    const L = res && res.cites.get(P.n), S = res && res.sizes.get(P.n); if (!L || !S) return null;
    const r = P.box.getBoundingClientRect(); if (!r.width || !r.height) return null;
    const x = (cx - r.left) / r.width * S.w, y = (cy - r.top) / r.height * S.h, pad = 1.5;
    let best = null, bd = Infinity;
    L.forEach(c => { if (x < c.x - pad || x > c.x + c.w + pad || y < c.y - pad || y > c.y + c.h + pad) return; const d = Math.hypot(x - (c.x + c.w / 2), y - (c.y + c.h / 2)); if (d < bd) { bd = d; best = c; } });
    return best;
  },
  /** The screen box of a citation (for the card). */
  screenOf(P, res, c) { const r = P.box.getBoundingClientRect(), S = res.sizes.get(P.n); return { left: r.left + c.x / S.w * r.width, top: r.top + c.y / S.h * r.height, width: c.w / S.w * r.width, height: c.h / S.h * r.height }; },

  /* ---------- the marks on the page (they never take the pointer: text stays selectable) ---------- */
  paint(P) {
    if (!P || !REFMAP.on()) return; const res = REFMAP.done.get(REFMAP.key(P.m)); if (!res) return;
    const S = res.sizes.get(P.n), L = res.cites.get(P.n) || []; let lay = $(':scope > .rfm-layer', P.el);
    const geo = P.box === P.el ? { left: '0px', top: '0px', width: '100%', height: '100%' } : { left: P.box.offsetLeft + 'px', top: P.box.offsetTop + 'px', width: P.box.offsetWidth + 'px', height: P.box.offsetHeight + 'px' };
    if (lay && lay._res === res) { Object.assign(lay.style, geo); return lay; }
    if (lay) lay.remove(); if (!S || !L.length) return null;
    lay = h('div.rfm-layer', { style: geo, 'aria-hidden': 'true' }, L.map(c => h('i.rfm-c' + (c.link ? '.lk' : ''), { 'data-i': c.ref.i, 'data-k': c.k, style: { left: c.x / S.w * 100 + '%', top: c.y / S.h * 100 + '%', width: c.w / S.w * 100 + '%', height: c.h / S.h * 100 + '%' } })));
    lay._res = res; P.el.append(lay); return lay;
  },
  paintAll(root) { REFMAP.pagesOf(root).forEach(P => REFMAP.paint(P)); },
  light(root, i, on) { if (!root) return; if (on) REFMAP.paintAll(root); $$('.rfm-c', root).forEach(x => x.classList.toggle('lit', !!on && +x.dataset.i === i)); },

  /* ---------- the card ---------- */
  card: null, cardT: 0, hideT: 0, hot: null,
  cardEl(res, ref) {
    const L = REFMAP.inLib(ref), n = res.per[ref.i] ? res.per[ref.i].cites.length : 0;
    const who = ref.firstAuthor ? ref.firstAuthor + (/\bet al\b|,\s*[A-Z]/.test(ref.stripped || ref.raw || '') ? ' et al.' : '') : '';
    return h('div.rfm-card', { role: 'tooltip' },
      h('div.rfm-ch', h('span.rfm-cn', String(ref.n)), h('span', [who, ref.year].filter(Boolean).join(' · ') || 'Reference'), h('span.spacer'), n ? h('span.rfm-cc', 'cited ' + plural(n, 'time')) : null),
      ref.title ? h('div.rfm-ct', ref.title) : h('div.rfm-ct.raw', snippet(ref.stripped || ref.raw || '', 260)),
      ref.journal ? h('div.rfm-cj', ref.journal) : null,
      h('div.rfm-cf', ref.doi ? h('a', { href: 'https://doi.org/' + ref.doi, target: '_blank', rel: 'noopener', on: { click: e => e.stopPropagation() } }, 'doi:' + ref.doi) : null,
        L ? h('a.rfm-lib', { href: L.pdf ? '#/read/' + L.id : '#/library', title: 'In your Library: ' + (L.title || ''), on: { click: e => e.stopPropagation() } }, 'In your Library') : null,
        h('span.spacer'), h('span.tiny.muted', 'Click: go there')));
  },
  showCard(res, ref, rect) {
    REFMAP.hideCard(true); const c = REFMAP.cardEl(res, ref); document.body.append(c); REFMAP.card = c;
    const q = c.getBoundingClientRect(), below = rect.top + rect.height + 8 + q.height < innerHeight - 8;
    c.style.left = clamp(rect.left + rect.width / 2 - q.width / 2, 8, innerWidth - q.width - 8) + 'px';
    c.style.top = (below ? rect.top + rect.height + 8 : Math.max(8, rect.top - q.height - 8)) + 'px';
    c.addEventListener('pointerenter', () => clearTimeout(REFMAP.hideT)); c.addEventListener('pointerleave', () => REFMAP.hideCard());
  },
  hideCard(now) { clearTimeout(REFMAP.hideT); const go = () => { if (REFMAP.card) { REFMAP.card.remove(); REFMAP.card = null; } }; if (now) go(); else REFMAP.hideT = setTimeout(go, 220); },
  /** Hovering: after the delay, the card; moving away cancels. */
  hover(P, res, c) {
    const same = REFMAP.hot && c && REFMAP.hot.c === c; if (same) return;
    clearTimeout(REFMAP.cardT); $$('.rfm-hot').forEach(x => x.classList.remove('rfm-hot'));
    REFMAP.hot = c ? { P, res, c } : null;
    if (!c) { if (REFMAP.card && !REFMAP.card.matches(':hover')) REFMAP.hideCard(); return; }
    P.el.classList.add('rfm-hot'); REFMAP.paint(P); const lay = $(':scope > .rfm-layer', P.el); if (lay) $$('.rfm-c', lay).forEach(x => x.classList.toggle('hot', +x.dataset.k === c.k));
    REFMAP.cardT = setTimeout(() => { if (REFMAP.hot && REFMAP.hot.c === c) REFMAP.showCard(res, c.ref, REFMAP.screenOf(P, res, c)); }, REFMAP.delay());
  },

  /* ---------- going there, and back ---------- */
  scroller(root) { return root.classList.contains('reader') ? $('.rd-pages', root) : ($('.pdf-stage', root) || $('.dk-maxc', root)); },
  pageEl(root, n) { return $(`.pdf-slot[data-p="${n}"]`, root) || $(`.rd-page[data-page="${n}"]`, root); },
  /** Scroll a reader so that point y (the PDF's units) of page n sits near the top; returns false while a one-page view turns. */
  goPoint(root, P0, n, y, box) {
    if (P0.kind === 'max' && P0.b && P0.b.view === 'page') { const B = M.block(P0.b.id); if ((B.cur || 0) + 1 !== n) { PDFW.go(B, n - 1); setTimeout(() => { const el = REFMAP.pageEl(root, n); if (el) REFMAP.flash(REFMAP.page(el), box); }, 900); return; } }
    const sc = REFMAP.scroller(root), el = REFMAP.pageEl(root, n); if (!sc || !el) return;
    const P = REFMAP.page(el), res = REFMAP.done.get(REFMAP.key(P0.m)), S = res && res.sizes.get(n), bx = P ? P.box : el;
    const frac = S ? y / S.h : 0, top = bx.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + frac * bx.getBoundingClientRect().height - 90;
    sc.scrollTo({ top: Math.max(0, top), behavior: RM() ? 'auto' : 'smooth' });
    if (P && box) setTimeout(() => REFMAP.flash(REFMAP.page(REFMAP.pageEl(root, n)), box), 420);
  },
  flash(P, box) {
    if (!P || !box) return; const res = REFMAP.done.get(REFMAP.key(P.m)), S = res && res.sizes.get(P.n); if (!S) return;
    let lay = REFMAP.paint(P) || $(':scope > .rfm-layer', P.el);
    if (!lay) { lay = h('div.rfm-layer', { style: P.box === P.el ? { left: '0px', top: '0px', width: '100%', height: '100%' } : { left: P.box.offsetLeft + 'px', top: P.box.offsetTop + 'px', width: P.box.offsetWidth + 'px', height: P.box.offsetHeight + 'px' } }); P.el.append(lay); }
    const f = h('i.rfm-flash', { style: { left: box.x / S.w * 100 + '%', top: box.y / S.h * 100 + '%', width: box.w / S.w * 100 + '%', height: box.h / S.h * 100 + '%' } });
    lay.append(f); setTimeout(() => f.remove(), 2600);
  },
  goRef(P, res, ref) {
    const root = P.root, sc = REFMAP.scroller(root); if (!ref.firstPage) return toast('This reference has no place in the PDF');
    REFMAP.back(root, sc ? { sc, top: sc.scrollTop } : (P.b ? { b: P.b.id, cur: M.block(P.b.id).cur || 0 } : null));
    REFMAP.hideCard(true); REFMAP.goPoint(root, P, ref.firstPage, ref.listY || 0, REFMAP.entryBox(res, ref));
  },
  goCite(P, res, c) { const root = P.root, sc = REFMAP.scroller(root); REFMAP.back(root, sc ? { sc, top: sc.scrollTop } : null); REFMAP.goPoint(root, P, c.page, c.y, { x: c.x - 2, y: c.y - 2, w: c.w + 4, h: c.h + 4 }); },
  back(root, prev) {
    $$('.rfm-back', root).forEach(x => x.remove()); if (!prev) return;
    const host = root.classList.contains('reader') ? ($('.rd-main', root) || root) : ($('.mx-main', root) || root);
    const go = () => { chip.remove(); document.removeEventListener('keydown', esc, true); if (prev.sc) prev.sc.scrollTo({ top: prev.top, behavior: RM() ? 'auto' : 'smooth' }); else if (prev.b) PDFW.go(M.block(prev.b), prev.cur); };
    const esc = e => { if (e.key === 'Escape' && chip.isConnected) { e.preventDefault(); e.stopPropagation(); go(); } };
    const chip = h('button.rfm-back', { type: 'button', title: 'Back to the place you clicked the citation (Esc)', on: { click: e => { e.stopPropagation(); go(); } } }, '‹ Back to where you were');
    const hr = host.getBoundingClientRect(); chip.style.left = Math.max(8, hr.left + 16) + 'px'; chip.style.top = Math.max(8, Math.min(innerHeight, hr.bottom) - 52) + 'px';
    host.append(chip); document.addEventListener('keydown', esc, true); setTimeout(() => { if (chip.isConnected) { chip.remove(); document.removeEventListener('keydown', esc, true); } }, 45000);
  },

  /* ---------- the section in the Highlights panel ---------- */
  open: () => _ls.get('refmapOpen', true) !== false,
  section(side, m, lib) {
    if (!side || !m) return null;
    let sec = side._rfm; if (sec && sec._m === m.id && sec._mode === REFMAP.mode()) return sec;
    sec = h('section.rfm-sec' + (REFMAP.open() ? '' : '.shut'), { 'aria-label': 'References Map' }); sec._m = m.id; sec._mode = REFMAP.mode(); side._rfm = sec;
    const head = h('button.rfm-sh', { type: 'button', 'aria-expanded': String(REFMAP.open()), on: { click: () => { const o = !sec.classList.contains('shut'); sec.classList.toggle('shut', o); head.setAttribute('aria-expanded', String(!o)); _ls.set('refmapOpen', !o); } } },
      h('span.rfm-chev', { 'aria-hidden': 'true' }), h('b', 'References Map'), h('span.rfm-n', '…'));
    const how = h('div.rfm-how', 'Reading the paper’s references…'), list = h('div.rfm-list');
    sec.append(head, how, list);
    REFMAP.analyse(m, lib).then(res => {
      head.querySelector('.rfm-n').textContent = res.refs.length ? plural(res.refs.length, 'reference') + (res.n ? ' · ' + plural(res.n, 'citation') : '') : '';
      how.textContent = res.how;
      list.replaceChildren(...res.per.map(({ ref, cites }) => {
        const L = REFMAP.inLib(ref), row = h('div.rfm-row' + (cites.length ? '' : '.none'), { role: 'button', tabindex: '0', 'data-i': ref.i, title: snippet(ref.stripped || ref.raw || '', 300) },
          h('span.rfm-num', String(ref.n)),
          h('span.rfm-t', h('b', [ref.firstAuthor, ref.year].filter(Boolean).join(' ') || 'Reference'), ' ', ref.title ? snippet(ref.title, 90) : snippet(ref.stripped || ref.raw || '', 90)),
          L ? h('span.rfm-inlib', { title: 'In your Library' }, '◆') : null,
          cites.length ? h('button.rfm-x', { type: 'button', title: 'Cited ' + plural(cites.length, 'time') + ' — go to its first citation (p. ' + cites[0].page + ')', on: { click: e => { e.stopPropagation(); const P = REFMAP.anyPage(side); if (P) REFMAP.goCite(P, res, cites[0]); } } }, '×' + cites.length) : h('span.rfm-x.zero', { title: 'Not found cited in the text' }, '×0'));
        let t = 0;
        row.addEventListener('pointerenter', () => { const root = REFMAP.rootOf(side); REFMAP.light(root, ref.i, true); clearTimeout(t); t = setTimeout(() => { if (row.matches(':hover')) { const r = row.getBoundingClientRect(); REFMAP.showCard(res, ref, { left: r.left - 340, top: r.top, width: 330, height: 0 }); } }, REFMAP.delay()); });
        row.addEventListener('pointerleave', () => { clearTimeout(t); REFMAP.light(REFMAP.rootOf(side), ref.i, false); REFMAP.hideCard(); });
        const go = () => { const P = REFMAP.anyPage(side); if (P) REFMAP.goRef(P, res, ref); };
        row.addEventListener('click', go); row.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        return row; }), res.per.length ? '' : h('div.rfm-empty', 'Nothing to map here.'));
      REFMAP.paintAll(REFMAP.rootOf(side));
    });
    return sec;
  },
  rootOf: side => side && (side.closest('.embed-max') || side.closest('.reader')),
  anyPage(side) { const root = REFMAP.rootOf(side); if (!root) return null; const el = $('.pdf-slot, .rd-page', root); return el ? REFMAP.page(el) : null; },
  /** Keep the section in a panel that redraws its own children (13zz draw(), 17b drawSide). */
  mount(side, m, lib) {
    if (!side || !m) return; if (!REFMAP.on()) { if (side._rfm) side._rfm.remove(); return; }
    const sec = REFMAP.section(side, m, lib); if (sec && sec.parentNode !== side) side.append(sec);
    if (!side._rfmObs) { side._rfmObs = new MutationObserver(() => { if (!REFMAP.on() || !side._rfm) return; if (side._rfm.parentNode !== side) side.append(side._rfm); }); side._rfmObs.observe(side, { childList: true }); }
  },
  /** Settings changed: forget what was read with the old mode, draw the open readers' sections again. */
  refresh() {
    REFMAP.hideCard(true); REFMAP.hot = null;
    $$('.embed-max.mx-hl').forEach(ov => { const side = $('.mx-side', ov), b = M.block(ov.dataset.src), m = b && b.kind === 'pdf' && MEDIA.get(b.media); if (side) { if (side._rfm) { side._rfm.remove(); side._rfm = null; } if (m) REFMAP.mount(side, m, null); } });
    $$('.reader').forEach(host => { const rv = host._rv, s = rv && rv.side, m = rv && rv.lib && rv.lib.pdf && MEDIA.get(rv.lib.pdf); if (!s) return; if (s._rfm) { s._rfm.remove(); s._rfm = null; } if (m) REFMAP.mount(s, m, rv.lib); });
    $$('.rfm-layer').forEach(x => x.remove()); $$('.rfm-back').forEach(x => x.remove());
  },
};
{
  // the two places a PDF opens with a Highlights panel
  const mo = MXHL.open; MXHL.open = function (ov, srcId) { const r = mo.apply(this, arguments);
    try { const b = M.block(srcId), m = b && b.kind === 'pdf' && MEDIA.get(b.media); if (m) REFMAP.mount($('.mx-row .mx-side', ov), m, REFMAP.libOf(m)); } catch (e) { console.warn('[refmap]', e); } return r; };
  const ds = ReaderView.drawSide; ReaderView.drawSide = function () { const r = ds.apply(this, arguments);
    try { if (this.host) this.host._rv = this; const lib = this.lib, m = lib && lib.pdf && MEDIA.get(lib.pdf); if (m && this.side) REFMAP.mount(this.side, m, lib); } catch (e) { console.warn('[refmap]', e); } return r; };
  // hover: geometry, not elements (the page's text stays selectable and the pen keeps its highlighter)
  let raf = 0, last = null;
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'pen' || e.pointerType === 'touch') return; last = e; if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const ev = last; if (!REFMAP.on()) return;
      const P = REFMAP.page(ev.target); if (!P) { if (REFMAP.hot) REFMAP.hover(null, null, null); return; }
      const res = REFMAP.done.get(REFMAP.key(P.m)); if (!res) { REFMAP.analyse(P.m, P.lib); return; }
      REFMAP.paint(P); REFMAP.hover(P, res, REFMAP.hitAt(P, res, ev.clientX, ev.clientY)); });
  }, { passive: true });
  // click (or tap): go to the reference — not when it ended a drag or a text selection, never the pen (it highlights)
  let down = null;
  document.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('click', e => {
    if (!REFMAP.on() || e.button !== 0 || e.pointerType === 'pen' || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const P = REFMAP.page(e.target); if (!P) return; const res = REFMAP.done.get(REFMAP.key(P.m)); if (!res) return;
    const s = window.getSelection && getSelection(); if (s && !s.isCollapsed && String(s).trim()) return;
    const c = REFMAP.hitAt(P, res, e.clientX, e.clientY); if (!c) return;
    e.preventDefault(); e.stopPropagation(); clearTimeout(REFMAP.cardT); REFMAP.goRef(P, res, c.ref);
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && REFMAP.card) REFMAP.hideCard(true); });
}
