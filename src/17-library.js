const LibraryView = {
  q: '',
  render() {
    const doi = h('input.inp.mono', { placeholder: '10.1371/journal.pone.0132737 or https://doi.org/…', style: { flex: '1 1 320px' } });
    const status = h('div.tiny.mono.muted', { style: { minHeight: '18px', marginTop: '6px' } });
    const look = async () => {
      status.textContent = 'Looking up…';
      try { const r = await LIB.resolveDoi(doi.value); if (r._cache) { status.textContent = 'Already in your library.'; return; } LIB.add(r); toast('Added · ' + LIB.shortRef(r)); }
      catch (e) { status.innerHTML = ''; status.append(h('span', { style: { color: 'var(--bad)' } }, String(e.message || e)), /Failed to fetch|NetworkError|load failed/i.test(String(e)) ? ' — blocked (offline, file:// origin, or CORS). Paste BibTeX / RIS / CSL-JSON below instead; it works offline.' : ''); }
    };
    doi.addEventListener('keydown', e => { if (e.key === 'Enter') look(); });
    const paste = h('textarea.inp', { rows: 3, placeholder: '@article{…}  ·  TY  - JOUR …  ·  {"DOI": …}', style: { width: '100%', fontFamily: 'var(--f-m)', fontSize: '12px' } });
    const q = h('input.inp', { placeholder: 'Filter by author, year, journal, title…', value: LibraryView.q, style: { width: '100%' }, on: { input: debounce(e => { LibraryView.q = e.target.value; draw(); }, 120) } });
    const list = h('div.list');
    const draw = () => { const rs = LIB.search(LibraryView.q).filter(r => LGROUP.keep(r)); list.replaceChildren(...(rs.length ? rs.map(LibraryView.card) : [h('div.empty', 'Nothing matches')])); };
    draw();
    App.setTitle('Library', [h('span', plural(DB.all('library').length, 'entry', 'entries') + ' · global — owned by no project')]);
    return h('div.page', h('div.eyebrow', 'Global'), h('h1.title', 'Library'),
      h('p.stand', 'Papers and links, owned by no project and citable from all of them. Each entry keeps its full CSL-JSON, so a citation can render as its title, author–year or a number without touching the notes it sits in.'),
      h('div.grid2', h('div.card.flat', h('h3.lab', { style: { marginTop: 0 } }, 'Add by DOI · one request, cached forever'), h('div.row', doi, h('button.btn.pri', { on: { click: look } }, 'Look up')), status),
        h('div.card.flat', h('h3.lab', { style: { marginTop: 0 } }, 'Paste a citation · works offline'), paste, h('div.row', { style: { marginTop: '8px' } }, h('button.btn', { on: { click: () => { try { const r = LIB.parseAny(paste.value); LIB.add(r); paste.value = ''; toast('Added · ' + LIB.shortRef(r)); } catch (e) { toast(String(e.message || e)); } } } }, 'Parse & add'),
          h('button.btn.ghost', { on: { click: () => LibraryView.addDialog('') } }, 'Add a link…')))),
      h('div.sec'), h('div.lib-wrap', LGROUP.side(), h('div.lib-main', h('div.sec-h', h('h2', LGROUP.selLabel() || 'Entries'), h('span.k', DB.all('library').filter(r => LGROUP.keep(r)).length), LGROUP.sel ? h('button.btn.xs.ghost', { on: { click: () => LGROUP.select(null) } }, 'Show all') : null), q, h('div', { style: { height: '10px' } }), list)));
  },
  card(r) {
    const cites = IX.citations.get(r.id) || [], docs = [...new Set(cites.map(id => (M.block(id) || {}).docId))].map(M.doc).filter(Boolean), flag = M.flagFor('library', r.id);
    return h('div.libcard', { draggable: 'true', on: { dragstart: e => { e.dataTransfer.setData('text/x-sis-paper', r.id); e.dataTransfer.effectAllowed = 'copy'; } } }, LIB.sigil(r), h('div', { style: { minWidth: 0 } }, LGROUP.chips(r), h('div.ti', r.kind === 'link' ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title || r.url) : r.title),
      h('div.au', LIB.apaAuthors(r.authors), r.container ? [' — ', h('i', LIB.journal(r.container))] : '', r.year ? ', ' + r.year : ''), h('div.apa', LIB.apa(r)),
      docs.length ? h('div.row', { style: { marginTop: '6px' } }, h('span.tiny.mono.muted', 'cited in'), docs.map(d => h('a.btn.xs', { href: '#/doc/' + d.id }, d.title))) : null),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' } }, h('span.pill', r.kind), r.kind !== 'link' ? (r.pdf ? h('a.btn.xs.pri', { href: '#/read/' + r.id, title: plural(READER.annotations(r.id).length, 'highlight') }, '📄 Read' + (READER.annotations(r.id).length ? ' · ' + READER.annotations(r.id).length : '')) : h('button.btn.xs', { on: { click: () => READER.attach(r) } }, '+ PDF')) : null, h('button.btn.xs' + (flag ? '.on' : ''), { title: 'Flag for review', on: { click: () => M.toggleFlag('library', r.id) } }, flag ? '⚑' : '⚐'), r.kind !== 'link' ? h('button.btn.xs.ghost', { title: 'Use your own logo for this journal (stored locally, reused by every paper in it)', on: { click: () => LIB.setLogo(r) } }, LIB.logoFor(r) ? 'logo ✓' : 'logo…') : null));
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
