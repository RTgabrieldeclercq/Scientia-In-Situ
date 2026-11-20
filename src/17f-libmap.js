/* ==========================================================================
   17f · The shelf map and a paper's sheet (V4.1 — Gabe: shelves and foci
   should "display its organization better").
   LMAP — the Library as shelves you can see: each shelf a board in its own
   colour (17d), its foci standing on it as rows of spines, one spine per
   paper (sorted by year). A spine is outlined until the paper is opened,
   half filled while it is read, filled when it is marked read (Settings →
   Reading state); a yellow dot: it has highlights, a light dot: a note cites
   it (Settings → Shelf map). A paper in two foci stands in both. Foci on no
   shelf and papers in no focus have boards of their own. With a search
   typed, the papers it finds rise and the rest fade. Point at a spine for
   the paper, click for its sheet, drag it onto a focus (here or in the tree)
   to add it there, or into a note as usual.
   LSHEET — the paper's sheet, sliding in at the right of the window: its
   reading state, its foci, the notes that cite it and the notes it is
   embedded in (click: go there), its highlights, the quotes taken from it
   and the notes on it, and Read · Copy reference · Flag. Esc closes it.
   ========================================================================== */
const LMAP = {
  marks: () => typeof FEAT === 'undefined' || FEAT.tune('libmap', 'marks') !== false,
  stateOn: () => typeof FEAT === 'undefined' || (FEAT.on('libread') && FEAT.tune('libread', 'cards') !== false),
  spine(r, hit) {
    const f = LSEARCH.facts(r), st = LMAP.stateOn() ? LIBSTATE.of(r, f) : 'none', hgt = 46 + (String(r.title || r.url || '').length % 6) * 6 + Math.min(16, f.hl.length * 4);
    const el = h('button.lm-sp.lm-' + st + (hit ? '.lm-hit' : ''), { type: 'button', draggable: 'true', 'data-id': r.id, 'aria-label': (r.title || r.url || 'Untitled') + ' — ' + LIB.shortRef(r) + (st !== 'none' ? ', ' + LIBSTATE.LABEL[st].toLowerCase() : ''), style: { height: hgt + 'px' },
      on: { click: () => LSHEET.open(r), dragstart: e => { e.dataTransfer.setData('text/x-sis-paper', r.id); e.dataTransfer.effectAllowed = 'copy'; hideHover(); },
        mouseenter: e => hoverCard(e.currentTarget, () => h('div', LIB.hovercard(r), h('div.tiny.mono.muted', { style: { marginTop: '6px' } }, [st !== 'none' ? LIBSTATE.LABEL[st] : '', f.hl.length ? plural(f.hl.length, 'highlight') : '', f.cites.length ? 'cited in ' + plural(f.cites.length, 'note') : ''].filter(Boolean).join(' · ')))) } },
      LMAP.marks() && f.hl.length ? h('span.lm-hl') : null, LMAP.marks() && f.cites.length ? h('span.lm-ct') : null);
    return el;
  },
  focus(g, hits, q) {
    const ps = [...LGROUP.members(g)].map(M.lib).filter(Boolean).sort((a, b) => (a.year || 0) - (b.year || 0)), smart = !!g.query && LGROUP.smartOn();
    const row = h('div.lm-sps', ps.map(r => LMAP.spine(r, q && hits.has(r.id))));
    row.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/x-sis-paper')) { e.preventDefault(); row.classList.add('lm-drop'); } });
    row.addEventListener('dragleave', () => row.classList.remove('lm-drop'));
    row.addEventListener('drop', e => { e.preventDefault(); row.classList.remove('lm-drop'); const pid = e.dataTransfer.getData('text/x-sis-paper'); if (pid) { LGROUP.toggle(g.id, pid, true); toast('Added to ' + g.name); } });
    return h('div.lm-focus', h('button.lm-fl', { type: 'button', title: smart ? 'Smart focus · ' + g.query : 'Show this focus', on: { click: () => LGROUP.qmode() ? LibraryView.scope(LGROUP.tok(g)) : LGROUP.select({ t: 'group', id: g.id }) } }, smart ? h('span.lm-star', '✶') : null, g.name, h('span.lm-n', String(ps.length))),
      ps.length ? row : h('div.lm-sps.lm-empty', { on: { dragover: e => e.preventDefault(), drop: e => { e.preventDefault(); const pid = e.dataTransfer.getData('text/x-sis-paper'); if (pid) LGROUP.toggle(g.id, pid, true); } } }, smart ? 'nothing matches yet' : 'drop papers here'));
  },
  render(R, q) {
    const hits = new Set(R.map(x => x.r.id)), shelves = LGROUP.themes(), loose = LGROUP.groups(null), unfiled = DB.all('library').filter(r => !LGROUP.groupsOf(r.id).length);
    const board = (t, gs) => h('section.lm-shelf', { style: LGROUP.sh(t) },
      h('div.lm-h', t ? h('button.lm-sn', { type: 'button', on: { click: () => LGROUP.qmode() ? LibraryView.scope(LGROUP.tok(t)) : LGROUP.select({ t: 'theme', id: t.id }) } }, t.name) : h('span.lm-sn', 'Foci on no shelf'),
        h('span.tiny.mono.muted', plural(new Set(gs.flatMap(g => [...LGROUP.members(g)])).size, 'paper') + ' · ' + plural(gs.length, 'focus', 'foci'))),
      h('div.lm-board', gs.length ? gs.map(g => LMAP.focus(g, hits, q)) : h('div.tiny.muted.lm-none', 'No foci on this shelf yet — ⋯ on the shelf in the tree adds one.')));
    if (!DB.all('library').length) return h('div.empty', 'Nothing in the library yet — add a paper by DOI or a pasted citation above.');
    return h('div.lm' + (q ? '.lm-q' : ''),
      h('div.lm-key', LMAP.stateOn() ? [h('span', h('i.lm-k.lm-unread'), 'not opened'), h('span', h('i.lm-k.lm-reading'), 'reading'), h('span', h('i.lm-k.lm-read'), 'read')] : null,
        LMAP.marks() ? [h('span', h('i.lm-kd.lm-kh'), 'highlights'), h('span', h('i.lm-kd.lm-kc'), 'cited in a note')] : null, q ? h('span.lm-found', plural(R.length, 'paper') + ' found, raised') : null),
      ...shelves.map(t => board(t, LGROUP.groups(t.id))), loose.length ? board(null, loose) : null,
      unfiled.length ? h('section.lm-shelf.lm-loose', h('div.lm-h', h('span.lm-sn', 'In no focus'), h('span.tiny.mono.muted', plural(unfiled.length, 'paper'))), h('div.lm-board', h('div.lm-focus', h('div.lm-sps', unfiled.sort((a, b) => (a.year || 0) - (b.year || 0)).map(r => LMAP.spine(r, q && hits.has(r.id))))))) : null);
  },
};

const LSHEET = {
  id: null,
  open(r) { LSHEET.id = r.id; LSHEET.redraw(true); LSEARCH.warm([r]); },   // V4.3: an added source fetches what it still has to
  close() { LSHEET.id = null; const el = $('#lib-sheet'); if (el) { el.classList.remove('open'); setTimeout(() => { if (!LSHEET.id) el.remove(); }, 320); } },
  redraw(fresh) {
    const r = LSHEET.id && M.lib(LSHEET.id); if (!r || !/^#\/library/.test(location.hash)) return LSHEET.close();
    const f = LSEARCH.facts(r), st = LIBSTATE.of(r, f);
    let el = $('#lib-sheet'); if (!el) { el = h('aside#lib-sheet.lib-sheet', { 'aria-label': 'Paper' }); document.body.append(el); requestAnimationFrame(() => el.classList.add('open')); } else el.classList.add('open');
    const go = (id, e) => { App.jump(id, e); };
    const sec = (title, kids) => kids && kids.length ? h('div.ls-sec', h('h5', title), ...kids) : null;
    const flag = M.flagFor('library', r.id), ex = (typeof LibraryView !== 'undefined' && LibraryView.ext && LibraryView.ext.sheet && LibraryView.ext.sheet(r, f)) || {};   // V4.3: a build's own sections and actions, if it adds them
    el.replaceChildren(
      h('button.ls-x', { type: 'button', title: 'Close (Esc)', 'aria-label': 'Close', on: { click: LSHEET.close } }, '×'),
      h('div.ls-top', LIB.sigil(r), h('div', { style: { minWidth: 0 } }, h('div.ls-ti', r.kind === 'link' ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title || r.url) : (r.title || 'Untitled')),
        h('div.ls-au', LIB.apaAuthors(r.authors), r.container ? [' — ', h('i', LIB.journal(r.container))] : '', r.year ? ', ' + r.year : ''),
        r.doi ? h('a.ls-doi.mono', { href: 'https://doi.org/' + r.doi, target: '_blank', rel: 'noopener' }, 'doi:' + r.doi) : null)),
      LGROUP.readOn() ? h('div.ls-sec', h('h5', 'Reading'), h('div.seg.ls-state', ['unread', 'reading', 'read'].map(k => h('button' + (st === k ? '.on' : ''), { type: 'button', on: { click: () => LIBSTATE.set(r, k) } }, LIBSTATE.LABEL[k])))) : null,
      h('div.ls-sec', h('h5', 'Foci'), LGROUP.chips(r)),
      sec(f.cites.length ? 'Cited in ' + plural(f.cites.length, 'note') : 'Cited in', f.cites.length ? f.cites.map(d => { const b = f.citeIds.map(M.block).find(x => x && x.docId === d.id); return h('a.ls-ln', { title: (M.docPath ? M.docPath(d) : d.title) + ' — click: go to the citation · Alt+click: beside', on: { click: e => go(b ? b.id : d.id, e) } }, h('span', '↗'), h('span', d.title || 'Untitled')); }) : [h('div.tiny.muted', 'No note cites it yet.')]),
      sec('Embedded in', f.embeds.map(b => { const d = M.doc(b.docId); return d ? h('a.ls-ln', { on: { click: e => go(b.id, e) } }, h('span', '▤'), h('span', d.title || 'Untitled')) : null; }).filter(Boolean)),
      sec('Highlights', f.hl.slice().sort((a, b) => (a.page || 0) - (b.page || 0)).map(x => x.ext   // an added source's highlight opens where it says
        ? h('a.ls-q.ls-hl', { href: '#', style: { '--qc': x.hex || READER.COLORS.yellow }, on: { click: e => { e.preventDefault(); if (x.open) x.open(); } } }, snippet(x.text, 220), h('small', [x.src ? x.src : '', x.page != null ? 'p. ' + x.page : '', x.by || ''].filter(Boolean).join(' · ')))
        : h('a.ls-q.ls-hl', { href: '#/read/' + r.id + (x.page ? '/' + x.page : ''), style: { '--qc': READER.COLORS[(x.b.anchor && x.b.anchor.color) || 'yellow'] || READER.COLORS.yellow } }, snippet(x.text, 220), h('small', 'p. ' + x.page)))),
      sec('Quoted in notes', f.quotes.map(x => h('a.ls-q.ls-qt', { on: { click: e => go(x.b.id, e) } }, snippet(x.text, 220), h('small', ((x.doc && x.doc.title) || 'a note') + (x.page ? ' · p. ' + x.page : ''))))),
      sec('Notes on it', f.notes.map(x => h('div.ls-q', snippet(x.text, 220), h('small', (x.it ? 'a structure' : 'a note') + (x.page ? ' · p. ' + x.page : ''))))),
      ...(ex.secs || []),
      h('div.ls-acts', ex.acts ? ex.acts : r.kind !== 'link' ? (r.pdf ? h('a.btn.sm.pri', { href: '#/read/' + r.id }, 'Read') : h('button.btn.sm', { on: { click: () => READER.attach(r) } }, '+ PDF')) : h('a.btn.sm', { href: r.url, target: '_blank', rel: 'noopener' }, 'Open the page'),
        h('button.btn.sm', { on: { click: async () => { try { await navigator.clipboard.writeText(LIB.apa(r)); toast('Reference copied (APA)'); } catch (e) { toast(LIB.apa(r)); } } } }, 'Copy reference'),
        h('button.btn.sm' + (flag ? '.on' : ''), { title: 'Flag for the weekly review', on: { click: () => M.toggleFlag('library', r.id) } }, flag ? '⚑ Flagged' : '⚐ Flag'),
        ...(LIB.risOn() ? [h('button.btn.sm', { title: r.ris ? 'The RIS record kept from the DOI lookup' : 'A RIS record made from this paper’s fields', on: { click: () => LIB.exportRis([r], (r.authors && r.authors[0] && r.authors[0].family) ? r.authors[0].family + '-' + (r.year || '') : r.title) } }, 'Export .ris' + (r.ris ? ' ✓' : '')),
          r.doi && !r.ris && !r.rm ? h('button.btn.sm.ghost', { title: 'Ask doi.org for this paper’s RIS record and keep it (needs the network)', on: { click: async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Asking…'; const t = await LIB.attachRis(r); if (!t) { b.disabled = false; b.textContent = 'Get RIS record'; toast('No RIS record came back — offline, or doi.org has none for this DOI'); } } } }, 'Get RIS record') : null] : [])));
    if (fresh) { const x = $('.ls-x', el); if (x) setTimeout(() => x.focus({ preventScroll: true }), 30); }
  },
};
addEventListener('keydown', e => { if (e.key === 'Escape' && LSHEET.id && !document.querySelector('.modal-bg, .pop')) { LSHEET.close(); } }, true);
addEventListener('hashchange', () => { if (LSHEET.id && !/^#\/library/.test(location.hash)) LSHEET.close(); });
