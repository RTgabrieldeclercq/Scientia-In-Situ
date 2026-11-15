const LibraryView = {
  q: '',
  /** The two ways to add a paper (by DOI, a pasted citation); the lab's Library uses them too (V3.963). */
  adders() {
    const doi = h('input.inp.mono', { placeholder: '10.1371/journal.pone.0132737 or https://doi.org/…', style: { flex: '1 1 320px' } });
    const status = h('div.tiny.mono.muted', { style: { minHeight: '18px', marginTop: '6px' } });
    const look = async () => {
      status.textContent = 'Looking up…';
      try { const r = await LIB.resolveDoi(doi.value); if (r._cache) { status.textContent = 'Already in your library.'; return; } LIB.add(r); toast('Added · ' + LIB.shortRef(r)); }
      catch (e) { status.innerHTML = ''; status.append(h('span', { style: { color: 'var(--bad)' } }, String(e.message || e)), /Failed to fetch|NetworkError|load failed/i.test(String(e)) ? ' — blocked (offline, file:// origin, or CORS). Paste BibTeX / RIS / CSL-JSON below instead; it works offline.' : ''); }
    };
    doi.addEventListener('keydown', e => { if (e.key === 'Enter') look(); });
    const paste = h('textarea.inp', { rows: 3, placeholder: '@article{…}  ·  TY  - JOUR …  ·  {"DOI": …}', style: { width: '100%', fontFamily: 'var(--f-m)', fontSize: '12px' } });
    return h('div.grid2', h('div.card.flat', h('h3.lab', { style: { marginTop: 0 } }, 'Add by DOI · one request, cached forever'), h('div.row', doi, h('button.btn.pri', { on: { click: look } }, 'Look up')), status),
      h('div.card.flat', h('h3.lab', { style: { marginTop: 0 } }, 'Paste a citation · works offline'), paste, h('div.row', { style: { marginTop: '8px' } }, h('button.btn', { on: { click: () => { try { const r = LIB.parseAny(paste.value); LIB.add(r); paste.value = ''; toast('Added · ' + LIB.shortRef(r)); } catch (e) { toast(String(e.message || e)); } } } }, 'Parse & add'),
        h('button.btn.ghost', { on: { click: () => LibraryView.addDialog('') } }, 'Add a link…'))));
  },
  /* ---------- V4.1: the page — search, facets, the tree, the shelf map or the list, the paper's sheet ----------
     Gabe: "an overhaul of the library page, where shelves and foci have a massive overhaul that feels better with
     its features and displays its organization better. The search in the library should be updated to be better
     and have more ways to search." The search box (17e's language) is the one place that says what you see: a click
     on a shelf, a focus or a facet puts its words in the box. Map or list (Settings → Shelf map: Auto shows the map
     with nothing typed and the list once you search). Keyboard: Ctrl+F searches, ↑ ↓ through the results, Enter opens
     the paper's sheet, Esc clears. With Library search off: the plain filter and the tree's selection, as before. */
  view: null, adding: false, act: 0, full: false, inside: null, sort: null, el: null, inp: null, sugL: null, sugI: 0, sugFrom: 0,
  query: () => LibraryView.q || '',
  on: () => typeof FEAT === 'undefined' || FEAT.on('libsearch'),
  mapOn: () => typeof FEAT === 'undefined' || FEAT.on('libmap'),
  insideOn: () => LibraryView.inside != null ? LibraryView.inside : FEAT.tune('libsearch', 'inside') !== false,
  sortBy: () => LibraryView.sort || FEAT.tune('libsearch', 'sort') || 'rel',
  isScope: t => !t.neg && !t.any && (t.field === 'shelf' || t.field === 'focus' || (t.field === 'is' && t.v === 'unfiled')),
  /** The shelf, focus or "in no focus" words in the box (the tree lights that row). */
  scopeTok() { if (!LibraryView.on()) return ''; const t = LSEARCH.parse(LibraryView.q).find(LibraryView.isScope); return t ? LSEARCH.unparse(t) : ''; },
  /** Show a shelf, a focus, "in no focus" (tok) or everything (''), keeping the rest of the search. */
  scope(tok) { const rest = LSEARCH.parse(LibraryView.q).filter(t => !LibraryView.isScope(t)).map(LSEARCH.unparse); const s = [tok, ...rest].filter(Boolean).join(' '); LibraryView.setQ(s ? s + ' ' : ''); },
  setQ(s) { LibraryView.q = s; LibraryView.act = 0; if (LibraryView.inp) LibraryView.inp.value = s; LibraryView.autoView(); LibraryView.draw(); },
  toggleTok(tok) { const toks = LSEARCH.parse(LibraryView.q), i = toks.findIndex(t => LSEARCH.unparse(t) === tok); if (i >= 0) { toks.splice(i, 1); LibraryView.setQ(toks.map(LSEARCH.unparse).join(' ') + (toks.length ? ' ' : '')); } else LibraryView.setQ((LibraryView.q.trim() ? LibraryView.q.trim() + ' ' : '') + tok + ' '); },
  /** Map or list: what you picked, or the setting (Auto: the map until you search). */
  curView() { if (!LibraryView.mapOn()) return 'list'; if (LibraryView.view) return LibraryView.view; const s = FEAT.tune('libmap', 'start') || 'auto'; return s === 'auto' ? (LibraryView.q.trim() ? 'list' : 'map') : s; },
  autoView() { },
  results() {
    if (!LibraryView.on()) { const rs = LIB.search(LibraryView.q).filter(r => LGROUP.keep(r)); return rs.map(r => ({ r, f: LSEARCH.facts(r), why: [], score: 0 })); }
    return LSEARCH.sort(LSEARCH.run(LibraryView.q, { inside: LibraryView.insideOn(), text: LibraryView.full }), LibraryView.sortBy());
  },
  render() {
    const on = LibraryView.on(), all = DB.all('library'), meta = plural(all.length, 'entry', 'entries') + ' · ' + all.filter(r => r.pdf).length + ' with PDFs · ' + all.filter(r => (IX.citations.get(r.id) || []).length).length + ' cited in notes';
    App.setTitle('Library', [h('span', meta + ' · global — owned by no project')]);
    const adding = LibraryView.adding || !all.length;
    const page = h('div.page.lib-page', h('div.lib-top', h('div', h('div.eyebrow', 'Global'), h('h1.title', 'Library'), h('div.tiny.mono.muted', meta)),
        h('div.row', h('button.btn' + (adding ? '.on' : ''), { title: 'Add a paper by DOI, a pasted citation or a link', on: { click: () => { LibraryView.adding = !adding; App._mounted = false; App.refresh(); } } }, adding ? '− Add' : '+ Add'),
          h('button.btn', { title: 'New paper shelf', on: { click: () => LGROUP.addTheme() } }, '+ Shelf'))),
      h('p.stand', 'Papers and links, owned by no project and citable from all of them. Shelves hold foci, foci hold papers' + (LGROUP.smartOn() ? '; a smart focus ✶ is a saved search that fills itself' : '') + '.'),
      adding ? LibraryView.adders() : null,
      on ? LibraryView.searchBar() : h('input.inp.lib-filter', { placeholder: 'Filter by author, year, journal, title…', value: LibraryView.q, style: { width: '100%', marginTop: '14px' }, on: { input: debounce(e => { LibraryView.q = e.target.value; LibraryView.draw(); }, 120) } }),
      h('div.lib-facets'),
      h('div.lib-wrap', h('div.lib-sidehost'), h('div.lib-main', h('div.sec-h.lib-mh'), h('div.lib-view'))));
    LibraryView.el = page; LibraryView.draw();
    return page;
  },
  update() { if (!LibraryView.el || !LibraryView.el.isConnected || !!LibraryView.inp !== LibraryView.on()) { App._mounted = false; return App.refresh(); } LibraryView.draw(); LSHEET.redraw(); },
  after() { if (LSHEET.id) LSHEET.redraw(); },
  searchBar() {
    const inp = h('input.lib-q-in', { type: 'search', value: LibraryView.q, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Search the library', placeholder: 'Search: words, "a phrase", author:engler, year:2010-2016, is:unread, cited:"run 3"…',
      on: { input: e => { LibraryView.q = e.target.value; LibraryView.act = 0; LibraryView.suggest(); LibraryView.drawSoon(); }, keydown: LibraryView.key, blur: () => setTimeout(() => LibraryView.showSugg(null), 160) } });
    LibraryView.inp = inp;
    const sort = h('select.lib-sort', { 'aria-label': 'Sort', on: { change: e => { LibraryView.sort = e.target.value; LibraryView.draw(); } } }, LSEARCH.SORTS.map(([k, l]) => h('option', { value: k, selected: LibraryView.sortBy() === k }, l)));
    return h('div.lib-search', h('label.lib-q', h('span.lib-q-ic', { 'aria-hidden': 'true' }, '⌕'), inp, h('kbd', { title: 'Ctrl+F (⌘F) comes here' }, 'Ctrl F')), h('div.lib-sugg', { hidden: true }), h('div.lib-toks'),
      h('div.lib-sopts', h('label', h('input', { type: 'checkbox', checked: LibraryView.insideOn(), on: { change: e => { LibraryView.inside = e.target.checked; LibraryView.draw(); } } }), ' Inside highlights, quotes and notes'),
        FEAT.tune('libsearch', 'pdftext') !== false ? h('label', h('input', { type: 'checkbox', checked: LibraryView.full, on: { change: e => LibraryView.setFull(e.target.checked) } }), ' Inside the PDFs’ text', h('span.lib-load.tiny.mono.muted')) : null,
        h('span.sp'), h('label.lib-sortl', 'Sort ', sort),
        LGROUP.smartOn() ? h('button.btn.xs', { title: 'Keep this search as a smart focus: every paper that matches, now and later', on: { click: () => LibraryView.saveSmart() } }, '✶ Save as smart focus') : null));
  },
  _drawT: 0,
  drawSoon() { clearTimeout(LibraryView._drawT); LibraryView._drawT = setTimeout(() => LibraryView.draw(), 90); },
  async setFull(on) {
    LibraryView.full = on; const ld = LibraryView.el && $('.lib-load', LibraryView.el);
    if (on && !LSEARCH.textsReady()) { const n = await LSEARCH.loadTexts((k, N) => { if (ld) ld.textContent = ' reading the PDFs… ' + k + ' / ' + N; }); if (ld) ld.textContent = n ? ' ' + plural(n, 'PDF') + ' read' : ''; }
    LibraryView.draw();
  },
  async saveSmart() {
    const q = LibraryView.q.trim(); if (!q) return toast('Type a search first, then keep it as a smart focus');
    const sc = LSEARCH.parse(q).find(LibraryView.isScope), g = sc && sc.field === 'focus' ? LGROUP.allGroups().find(x => LGROUP.tok(x) === LSEARCH.unparse(sc)) : null, t = sc && sc.field === 'shelf' ? LGROUP.themes().find(x => LGROUP.tok(x) === LSEARCH.unparse(sc)) : (g ? LGROUP.shelfOf(g) : null);
    await LGROUP.addSmart(t ? t.id : null, q);
  },
  /* ---------- drawing (everything but the search box, so typing keeps its place) ---------- */
  draw() {
    const P = LibraryView.el; if (!P) return; const on = LibraryView.on(), R = LibraryView.results(), q = !!LibraryView.q.trim(), view = LibraryView.curView();
    LibraryView._R = R; LibraryView.act = Math.min(LibraryView.act, Math.max(0, R.length - 1));
    if (on && /(^|\s)-?text:/i.test(LibraryView.q) && !LSEARCH.textsReady() && !LibraryView._loading) { LibraryView._loading = true; const ld = $('.lib-load', P); LSEARCH.loadTexts((k, N) => { if (ld) ld.textContent = ' reading the PDFs… ' + k + ' / ' + N; }).then(() => { LibraryView._loading = false; if (ld) ld.textContent = ''; LibraryView.draw(); }); }   // text: reads the PDFs' words once
    const sh = $('.lib-sidehost', P); if (sh) sh.replaceChildren(LGROUP.side());
    if (on) LibraryView.drawToks(); const fc = $('.lib-facets', P); if (fc) fc.replaceChildren(...(on && FEAT.tune('libsearch', 'facets') !== false && DB.all('library').length ? LibraryView.facets(R) : []));
    const total = DB.all('library').length, sel = !on && LGROUP.selLabel();
    const mh = $('.lib-mh', P); if (mh) mh.replaceChildren(h('h2', on ? (q ? 'Results' : 'All papers') : (sel || 'Entries')), h('span.k', on && q ? R.length + ' of ' + total : String(R.length)),
      !on && sel ? h('button.btn.xs.ghost', { on: { click: () => LGROUP.select(null) } }, 'Show all') : null, h('span.sp'),
      LibraryView.mapOn() ? h('div.seg.lib-vseg', { role: 'group', 'aria-label': 'View' }, [['map', 'Shelves'], ['list', 'List']].map(([k, l]) => h('button' + (view === k ? '.on' : ''), { type: 'button', 'aria-pressed': String(view === k), on: { click: () => { LibraryView.view = k; LibraryView.draw(); } } }, l))) : null);
    const vh = $('.lib-view', P); if (!vh) return;
    if (view === 'map') vh.replaceChildren(LMAP.render(R, on ? q : !!(LibraryView.q.trim() || LGROUP.sel)));
    else vh.replaceChildren(R.length ? h('div.list.lib-list', R.map((x, i) => LibraryView.card(x.r, x, i))) : h('div.empty', total ? 'Nothing matches.' + (on ? ' Remove a part of the search' + (FEAT.tune('libsearch', 'pdftext') !== false && !LibraryView.full ? ', or tick “Inside the PDFs’ text”' : '') + '.' : '') : 'Nothing in the library yet — + Add a paper by DOI or a pasted citation.'));
  },
  drawToks() {
    const host = LibraryView.el && $('.lib-toks', LibraryView.el); if (!host) return; const T = LSEARCH.parse(LibraryView.q);
    const lbl = t => t.field ? [h('b', (t.neg ? '−' : '') + t.field + ':'), t.phrase || /\s/.test(t.v) ? '“' + t.v + '”' : t.v] : [t.neg ? h('b', '−') : null, t.phrase ? '“' + t.v + '”' : t.v];
    host.replaceChildren(...(T.length ? T.map((t, i) => h('span.lib-tok' + (t.neg ? '.neg' : ''), ...(t.any ? t.any.flatMap((a, k) => [k ? h('i', ' or ') : null, ...lbl(a)]) : lbl(t)),
        h('button', { type: 'button', title: 'Take this out of the search', 'aria-label': 'Remove', on: { click: () => { const left = T.filter((_, k) => k !== i); LibraryView.setQ(left.map(LSEARCH.unparse).join(' ') + (left.length ? ' ' : '')); } } }, '×')))
      : [h('span.lib-try', 'Try ', ...['is:unread year:>2019', 'cited:', '"traction force" -review', 'hl:drift OR quote:drift'].map(x => h('button.lib-ex', { type: 'button', on: { click: () => { LibraryView.setQ(x + (x.endsWith(':') ? '' : ' ')); if (LibraryView.inp) { LibraryView.inp.focus(); if (x.endsWith(':')) LibraryView.suggest(); } } } }, x)))]));
  },
  facets(R) {
    const F = LSEARCH.facets(R), cur = new Set(LSEARCH.parse(LibraryView.q).map(LSEARCH.unparse)), mx = Math.max(1, ...F.bins.map(b => b.n));
    const opts = list => h('div.lf-opts', list.filter(x => x[2] > 0).map(([tok, label, n]) => h('button' + (cur.has(tok) ? '.on' : ''), { type: 'button', on: { click: () => LibraryView.toggleTok(tok) } }, h('span', label), h('em', String(n)))));
    const out = [];
    if (F.bins.length > 1) out.push(h('div.lf', h('h4', 'Year'), h('div.lf-yh', { role: 'group', 'aria-label': 'Papers by year' }, F.bins.map(b => h('button' + (b.n ? '' : '.off'), { type: 'button', title: (b.a === b.z ? b.a : b.a + '–' + b.z) + ': ' + plural(b.n, 'paper'), style: { height: Math.max(3, b.n / mx * 44) + 'px' }, on: { click: () => b.n && LibraryView.toggleTok('year:' + (b.a === b.z ? b.a : b.a + '-' + b.z)) } }))), h('div.lf-yx', h('span', String(F.y0)), h('span', String(F.y1)))));
    if (LGROUP.readOn()) out.push(h('div.lf', h('h4', 'Reading'), opts(F.states.map(([k, n]) => ['is:' + k, { unread: 'Not opened', reading: 'Reading', read: 'Read', annotated: 'Highlighted', cited: 'Cited in notes' }[k], n]))));
    else out.push(h('div.lf', h('h4', 'In notes'), opts(F.states.filter(x => x[0] === 'annotated' || x[0] === 'cited').map(([k, n]) => ['is:' + k, k === 'cited' ? 'Cited in notes' : 'Highlighted', n]))));
    if (F.journals.length) out.push(h('div.lf', h('h4', 'Journal'), opts(F.journals.map(([j, n]) => ['journal:' + LSEARCH.quoteV(j.toLowerCase().replace(/"/g, '')), LIB.journal(j), n]))));
    if (F.shelves.length) out.push(h('div.lf', h('h4', 'Shelf'), opts(F.shelves.map(([t, n]) => [LGROUP.tok(t), t.name, n]))));
    return out;
  },
  /* ---------- suggestions and keys ---------- */
  suggest() {
    const inp = LibraryView.inp; if (!inp || FEAT.tune('libsearch', 'suggest') === false) return LibraryView.showSugg(null);
    const s = LSEARCH.suggest(inp.value.slice(0, inp.selectionStart == null ? inp.value.length : inp.selectionStart)); LibraryView.sugFrom = s ? s.from : 0; LibraryView.showSugg(s && s.list.length ? s.list : null);
  },
  showSugg(L) {
    LibraryView.sugL = L; LibraryView.sugI = 0; const box = LibraryView.el && $('.lib-sugg', LibraryView.el); if (!box) return;
    if (!L) { box.hidden = true; box.replaceChildren(); return; }
    box.replaceChildren(...L.map((s, i) => h('button' + (i ? '' : '.on'), { type: 'button', on: { mousedown: e => { e.preventDefault(); LibraryView.take(i); } } }, h('b', s.val ? '' : s.label), h('span', s.val ? s.label : ''), h('i', s.hint || ''))));
    box.hidden = false;
  },
  take(i) {
    const s = (LibraryView.sugL || [])[i], inp = LibraryView.inp; if (!s || !inp) return; const end = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
    inp.value = inp.value.slice(0, LibraryView.sugFrom) + s.ins + inp.value.slice(end); const p = LibraryView.sugFrom + s.ins.length; inp.setSelectionRange(p, p); inp.focus();
    LibraryView.q = inp.value; LibraryView.showSugg(null); LibraryView.draw(); if (!s.val) LibraryView.suggest();
  },
  key(e) {
    const L = LibraryView.sugL, box = LibraryView.el && $('.lib-sugg', LibraryView.el);
    if (L && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); LibraryView.sugI = (LibraryView.sugI + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length; if (box) [...box.children].forEach((b, i) => b.classList.toggle('on', i === LibraryView.sugI)); return; }
    if (L && (e.key === 'Tab' || e.key === 'Enter')) { e.preventDefault(); LibraryView.take(LibraryView.sugI); return; }
    if (e.key === 'Escape') { e.stopPropagation(); if (L) LibraryView.showSugg(null); else if (LSHEET.id) LSHEET.close(); else if (LibraryView.q) LibraryView.setQ(''); return; }
    const R = LibraryView._R || [];
    if (LibraryView.curView() === 'list' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); LibraryView.act = clamp(LibraryView.act + (e.key === 'ArrowDown' ? 1 : -1), 0, Math.max(0, R.length - 1));
      $$('.lib-list .libcard', LibraryView.el).forEach(c => c.classList.toggle('act', +c.dataset.i === LibraryView.act)); const c = $('.lib-list .libcard.act', LibraryView.el); if (c) c.scrollIntoView({ block: 'nearest' }); return; }
    if (e.key === 'Enter' && R[LibraryView.act]) { e.preventDefault(); LSHEET.open(R[LibraryView.act].r); }
  },
  /** A paper in the list: its foci, title (the matched words marked), authors, why it matched, the notes that cite it; a click opens its sheet. */
  card(r, x, i) {
    const f = (x && x.f) || LSEARCH.facts(r), W = (x && x.why) || [], tw = W.find(w => w.f === 'title'), why = W.filter(w => !/^(title|year|state|kind|added|author|journal|shelf|focus)$/.test(w.f));
    const flag = M.flagFor('library', r.id), st = LIBSTATE.of(r, f), stOn = LGROUP.readOn() && FEAT.tune('libread', 'cards') !== false, title = r.title || r.url || 'Untitled';
    return h('div.libcard' + (i != null && i === LibraryView.act ? '.act' : ''), { 'data-i': i == null ? '' : i, 'data-id': r.id, draggable: 'true',
      on: { dragstart: e => { e.dataTransfer.setData('text/x-sis-paper', r.id); e.dataTransfer.effectAllowed = 'copy'; }, click: e => { if (e.target.closest('a, button, input, label, .lg-chips')) return; if (i != null) LibraryView.act = i; LSHEET.open(r); } } },
      LIB.sigil(r), h('div', { style: { minWidth: 0 } }, LGROUP.chips(r),
        h('div.ti', r.kind === 'link' ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, tw ? LSEARCH.mark(title, tw.v, 400) : title) : (tw ? LSEARCH.mark(title, tw.v, 400) : title)),
        h('div.au', LIB.apaAuthors(r.authors), r.container ? [' — ', h('i', LIB.journal(r.container))] : '', r.year ? ', ' + r.year : ''),
        why.length ? h('div.lib-why', why.slice(0, 3).map(w => h('div', h('b', w.f), h('span', LSEARCH.mark(w.s, w.v))))) : h('div.apa', LIB.apa(r)),
        f.cites.length ? h('div.row', { style: { marginTop: '6px' } }, h('span.tiny.mono.muted', 'cited in'), f.cites.slice(0, 4).map(d => h('a.btn.xs', { href: '#/doc/' + d.id }, d.title || 'Untitled')), f.cites.length > 4 ? h('span.tiny.muted', '+' + (f.cites.length - 4)) : null) : null),
      h('div.lib-cside', stOn ? h('span.lib-st.lib-st-' + st, LIBSTATE.LABEL[st]) : null, h('span.pill', r.kind || 'paper'),
        r.kind !== 'link' ? (r.pdf ? h('a.btn.xs.pri', { href: '#/read/' + r.id, title: plural(f.hl.length, 'highlight') }, '📄 Read' + (f.hl.length ? ' · ' + f.hl.length : '')) : h('button.btn.xs', { on: { click: () => READER.attach(r) } }, '+ PDF')) : null,
        h('button.btn.xs' + (flag ? '.on' : ''), { title: 'Flag for review', on: { click: () => M.toggleFlag('library', r.id) } }, flag ? '⚑' : '⚐'),
        r.kind !== 'link' ? h('button.btn.xs.ghost', { title: 'Use your own logo for this journal (stored locally, reused by every paper in it)', on: { click: () => LIB.setLogo(r) } }, LIB.logoFor(r) ? 'logo ✓' : 'logo…') : null));
  },
  addDialog(txt) {
    const looksDoi = /^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\//i.test((txt || '').trim());
    let kind = looksDoi || !txt ? 'paper' : 'link';
    const v = h('input.inp.mono', { value: txt || '', style: { width: '100%' } }), title = h('input.inp', { placeholder: 'Title (links only)', style: { width: '100%' } });
    const seg = h('div.seg'); const draw = () => seg.replaceChildren(...[['paper', 'Paper (DOI)'], ['link', 'Link']].map(([k, l]) => h('button' + (k === kind ? '.on' : ''), { on: { click: () => { kind = k; draw(); } } }, l)));
    draw();
    modal({ title: 'Add to library — paper or link?', body: h('div', seg, h('div', { style: { height: '10px' } }), h('label.f', h('span', 'DOI or URL'), v), h('div', { style: { height: '8px' } }), h('label.f', h('span', 'Title'), title)),
      actions: [{ label: 'Cancel' }, { label: 'Add', pri: true, run: async () => {
        if (kind === 'link') { LIB.add({ kind: 'link', url: v.value.trim(), title: title.value.trim() || v.value.trim(), authors: [] }); toast('Link added'); return; }
        try { const r = await LIB.resolveDoi(v.value); if (!r._cache) LIB.add(r); toast('Added · ' + LIB.shortRef(r)); } catch (e) { toast('Lookup failed — use the paste box in Library (' + (e.message || e) + ')'); return false; } } }] });
  },
};
LibraryView.title = true; VIEWS.library = LibraryView;
/* Ctrl+F (⌘F) searches the Library while you are on it (/ stays the command bar's, as everywhere; the reader's Ctrl+F searches its paper) */
addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || (e.key !== 'f' && e.key !== 'F') || !/^#\/library/.test(location.hash)) return; if (LibraryView.inp && LibraryView.inp.isConnected) { e.preventDefault(); LibraryView.inp.focus(); LibraryView.inp.select(); } });
