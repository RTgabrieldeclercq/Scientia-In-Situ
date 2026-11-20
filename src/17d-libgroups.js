/* ==========================================================================
   17d · Paper shelves and foci (V3.963 — the words were "library themes and
   groups"; the records did not change). A focus is a named set of papers (a
   paper can sit in several foci); foci are grouped in shelves — a focus sits
   on one shelf or on none. Example: the focus "R-PE Photobleaching Kinetics"
   on the shelf "Confocal Optics". Kept in the store `libsets` ({kind:
   'theme' (a shelf) | 'group' (a focus), name, themeId (its shelf),
   paperIds}) and synced like everything else.
   Library page: the tree on the left filters the list (all papers, papers in
   no focus, a shelf = every paper in its foci, one focus). On each paper,
   its foci show as chips; ＋ adds it to foci or a new one. Papers can also
   be dragged onto a focus in the tree.
   V4.1 (Gabe: "shelves and foci have a massive overhaul that feels better
   with its features and displays its organization better"):
   • A shelf has a colour (`hue`, from its name until chosen) and a place
     (`order`): its swatch in the tree, its board on the shelf map (17f), the
     dot on its foci's chips. Drag a shelf in the tree to move it; drag a
     focus onto a shelf to move it there, onto another focus to put it before.
   • A smart focus (Settings → Smart foci) is a saved search (`query`, the
     Library's search language, 17e): it holds every paper that matches, and
     the papers put in it by hand. "✶ Save as smart focus" under the search
     makes one; ⋯ → Edit its search.
   • Each focus shows how much of it is read (a small bar, Settings → Reading
     state); counts include the smart papers.
   • On the Library page (with the search on) a click in the tree puts the
     shelf or focus in the search box (shelf:"…", focus:"…"), so the box
     always says what you see; with the search off it selects, as before.
   ========================================================================== */
const LGROUP = {
  sel: _ls.get('libSel', null),          // null = all · {t: 'none'} · {t: 'theme', id} · {t: 'group', id}
  open: new Set(_ls.get('libOpen', [])),  // themes folded open
  byName: (a, b) => (a.name || '').localeCompare(b.name || ''),
  byPlace: (a, b) => ((a.order ?? 1e9) - (b.order ?? 1e9)) || (a.name || '').localeCompare(b.name || ''),
  themes: () => DB.where('libsets', x => x.kind === 'theme').sort(LGROUP.byPlace),
  groups: themeId => DB.where('libsets', x => x.kind === 'group' && (x.themeId || null) === (themeId || null)).sort(LGROUP.byPlace),
  allGroups: () => DB.where('libsets', x => x.kind === 'group').sort(LGROUP.byPlace),
  /** The foci a paper is in: by hand, and the smart foci whose search finds it. */
  groupsOf: pid => { const r = M.lib(pid); return r && typeof LSEARCH !== 'undefined' ? LSEARCH.fociOf(r) : DB.where('libsets', x => x.kind === 'group' && (x.paperIds || []).includes(pid)).sort(LGROUP.byPlace); },
  members: g => typeof LSEARCH !== 'undefined' ? LSEARCH.members(g) : new Set((g.paperIds || []).filter(p => M.lib(p))),
  papersOfTheme: tid => new Set(LGROUP.groups(tid).flatMap(g => [...LGROUP.members(g)])),
  get: id => DB.get('libsets', id),
  /** A shelf's colour: its own hue, or one from its name. CSS: --sh on the element, --sc derived (25-library.css). */
  hue: t => t ? (Number.isFinite(t.hue) ? t.hue : hashHue(t.name || t.id)) : null,
  shelfOf: g => g && g.themeId ? LGROUP.get(g.themeId) : null,
  sh: t => t ? { '--sh': String(LGROUP.hue(t)) } : {},
  select(s) { LGROUP.sel = s; _ls.set('libSel', s); App.refresh(); },
  /** does the current selection keep this paper in the list? */
  keep(r) { const s = LGROUP.sel; if (!s) return true;
    if (s.t === 'none') return !LGROUP.groupsOf(r.id).length;
    if (s.t === 'group') { const g = LGROUP.get(s.id); return !g || LGROUP.members(g).has(r.id); }
    if (s.t === 'theme') return !LGROUP.get(s.id) || LGROUP.papersOfTheme(s.id).has(r.id);
    return true; },
  selLabel() { const s = LGROUP.sel; if (!s) return null; if (s.t === 'none') return 'In no focus'; const x = LGROUP.get(s.id); if (!x) return null; const t = x.themeId && LGROUP.get(x.themeId); return (t ? t.name + ' › ' : '') + x.name; },
  /** The search words that show a shelf or a focus (the app's Library page puts them in its search box). */
  tok(x) { if (!x) return ''; if (x.kind === 'theme') return 'shelf:' + LGROUP.q(x.name); const t = LGROUP.shelfOf(x); return 'focus:' + LGROUP.q((t ? t.name + ' › ' : '') + x.name); },
  q: s => { s = String(s || '').toLowerCase().replace(/"/g, ''); return /\s/.test(s) ? '"' + s + '"' : s; },
  qmode: () => typeof LibraryView !== 'undefined' && VIEWS.library === LibraryView && typeof FEAT !== 'undefined' && FEAT.on('libsearch'),

  /* ---------- changes ---------- */
  save(x) { x.modified = isoLocal(new Date()); DB.put('libsets', x); changed(); return x; },
  async addTheme() { const n = await askText('New paper shelf', 'Name', '', { placeholder: 'Confocal Optics' }); if (!n) return null; DB.beginGroup('library');
    const t = LGROUP.save({ id: uid('lt'), kind: 'theme', name: n, order: LGROUP.themes().length, created: isoLocal(new Date()) }); LGROUP.open.add(t.id); _ls.set('libOpen', [...LGROUP.open]); return t; },
  async addGroup(themeId, paperId) { const th = themeId && LGROUP.get(themeId); const n = await askText('New paper focus' + (th ? ' on ' + th.name : ''), 'Name', '', { placeholder: 'R-PE Photobleaching Kinetics' }); if (!n) return null; DB.beginGroup('library');
    const g = LGROUP.save({ id: uid('lg'), kind: 'group', name: n, themeId: themeId || null, paperIds: paperId ? [paperId] : [], order: LGROUP.groups(themeId).length, created: isoLocal(new Date()) });
    if (themeId) { LGROUP.open.add(themeId); _ls.set('libOpen', [...LGROUP.open]); } toast(paperId ? 'Focus made with this paper' : 'Focus made — add papers with ＋ on each paper or drag them here'); return g; },
  /** A smart focus: a saved search (asked for, or the one given), on a shelf or none. */
  async addSmart(themeId, query, name) {
    const th = themeId && LGROUP.get(themeId);
    const q = query != null ? query : await askText('New smart focus' + (th ? ' on ' + th.name : ''), 'Its search (the Library’s search words)', '', { placeholder: 'is:unread year:>2019 author:engler' }); if (!q || !q.trim()) return null;
    const n = name || await askText('Name the smart focus', 'Name', q.trim().length > 40 ? q.trim().slice(0, 38) + '…' : q.trim()); if (!n) return null; DB.beginGroup('library');
    const g = LGROUP.save({ id: uid('lg'), kind: 'group', name: n, themeId: themeId || null, paperIds: [], query: q.trim(), order: LGROUP.groups(themeId).length, created: isoLocal(new Date()) });
    if (themeId) { LGROUP.open.add(themeId); _ls.set('libOpen', [...LGROUP.open]); } if (typeof LSEARCH !== 'undefined') LSEARCH.bust();
    toast('Smart focus “' + n + '”: ' + plural(LGROUP.members(g).size, 'paper') + ' match now; new ones join by themselves'); return g; },
  async editQuery(g) { const q = await askText('The search of “' + g.name + '”', 'Search words', g.query || ''); if (q == null) return; DB.beginGroup('library'); const x = Object.assign({}, g); if (q.trim()) x.query = q.trim(); else delete x.query; LGROUP.save(x); if (typeof LSEARCH !== 'undefined') LSEARCH.bust(); },
  async rename(x) { const n = await askText('Rename ' + (x.kind === 'theme' ? 'shelf' : 'focus'), 'Name', x.name); if (!n || n === x.name) return; DB.beginGroup('library'); LGROUP.save(Object.assign({}, x, { name: n })); },
  HUES: [205, 160, 120, 45, 25, 350, 300, 260],
  colorMenu(t, e) {
    popover(e.clientX - 90, e.clientY + 12, [h('h5', 'Colour of “' + t.name + '”'), h('div.lg-hues', LGROUP.HUES.map(hu => h('button.lg-hue' + (LGROUP.hue(t) === hu ? '.on' : ''), { type: 'button', title: 'This colour', style: { '--sh': String(hu) }, on: { click: () => { closePop(); DB.beginGroup('library'); LGROUP.save(Object.assign({}, t, { hue: hu })); } } })),
      h('button.btn.xs.ghost', { type: 'button', on: { click: () => { closePop(); const x = Object.assign({}, t); delete x.hue; DB.beginGroup('library'); LGROUP.save(x); } } }, 'From its name'))], { cls: 'pop.lg-pop' });
  },
  toggle(gid, pid, on) { const g = LGROUP.get(gid); if (!g) return; const has = (g.paperIds || []).includes(pid); if (on === has) return; DB.beginGroup('library');
    LGROUP.save(Object.assign({}, g, { paperIds: has ? g.paperIds.filter(x => x !== pid) : [...(g.paperIds || []), pid] })); },
  moveGroup(gid, themeId) { const g = LGROUP.get(gid); if (!g) return; DB.beginGroup('library'); LGROUP.save(Object.assign({}, g, { themeId: themeId || null, order: LGROUP.groups(themeId).length })); },
  /** Put shelf `id` before shelf `before` (or last); every shelf gets its place. */
  placeTheme(id, before) { const L = LGROUP.themes().filter(t => t.id !== id), me = LGROUP.get(id); if (!me) return; const i = before ? L.findIndex(t => t.id === before) : -1; L.splice(i < 0 ? L.length : i, 0, me);
    DB.beginGroup('library'); L.forEach((t, k) => { if (t.order !== k) DB.put('libsets', Object.assign({}, t, { order: k, modified: isoLocal(new Date()) })); }); changed(); },
  /** Put focus `id` before focus `before` (moving it to that focus's shelf), or last on shelf `themeId`. */
  placeGroup(id, before, themeId) { const me = LGROUP.get(id); if (!me) return; const b = before && LGROUP.get(before), th = b ? (b.themeId || null) : (themeId === undefined ? (me.themeId || null) : themeId);
    const L = LGROUP.groups(th).filter(g => g.id !== id), i = b ? L.findIndex(g => g.id === b.id) : -1; L.splice(i < 0 ? L.length : i, 0, Object.assign({}, me, { themeId: th }));
    DB.beginGroup('library'); L.forEach((g, k) => { const cur = LGROUP.get(g.id); if (cur.order !== k || (cur.themeId || null) !== th) DB.put('libsets', Object.assign({}, cur, { order: k, themeId: th, modified: isoLocal(new Date()) })); }); changed(); },
  removeGroup(g) { pickModal('Delete the focus “' + g.name + '”?', `Its ${plural((g.paperIds || []).length, 'paper')} stay in the library. Ctrl+Z undoes it.`, [{ label: 'Delete focus', danger: true, run: () => { DB.beginGroup('library'); DB.del('libsets', g.id); if (LGROUP.sel && LGROUP.sel.id === g.id) LGROUP.sel = null; changed(); } }]); },
  removeTheme(t) { const gs = LGROUP.groups(t.id); pickModal('Delete the shelf “' + t.name + '”?', gs.length ? `Its ${plural(gs.length, 'focus', 'foci')} move to “Foci on no shelf”; no papers are removed.` : 'No papers are removed.', [{ label: 'Delete shelf', danger: true, run: () => { DB.beginGroup('library'); gs.forEach(g => DB.put('libsets', Object.assign({}, g, { themeId: null }))); DB.del('libsets', t.id); if (LGROUP.sel && LGROUP.sel.id === t.id) LGROUP.sel = null; changed(); } }]); },
  moveMenu(g, e) { ctxMenu(e.clientX, e.clientY + 10, [{ head: 'Move “' + g.name + '” to' }, ...LGROUP.themes().map(t => ({ label: t.name + (t.id === g.themeId ? ' ✓' : ''), run: () => LGROUP.moveGroup(g.id, t.id) })), { label: 'No shelf' + (!g.themeId ? ' ✓' : ''), run: () => LGROUP.moveGroup(g.id, null) }, 'sep', { label: 'New shelf…', run: async () => { const t = await LGROUP.addTheme(); if (t) LGROUP.moveGroup(g.id, t.id); } }]); },
  smartOn: () => typeof FEAT === 'undefined' || FEAT.on('libsmart'),
  readOn: () => typeof FEAT === 'undefined' || FEAT.on('libread'),

  /* ---------- the tree ---------- */
  side() {
    const S0 = LGROUP.sel, qm = LGROUP.qmode(), all = DB.all('library').length, none = DB.all('library').filter(r => !LGROUP.groupsOf(r.id).length).length;
    const isSel = (t, id) => { if (qm) { const x = id && LGROUP.get(id); return t === 'all' ? !LibraryView.scopeTok() : t === 'none' ? LibraryView.scopeTok() === 'is:unfiled' : !!x && LibraryView.scopeTok() === LGROUP.tok(x); }
      return S0 ? S0.t === t && (id == null || S0.id === id) : t === 'all'; };
    const pickIt = (t, id) => { if (qm) { const x = id && LGROUP.get(id); LibraryView.scope(t === 'all' ? '' : t === 'none' ? 'is:unfiled' : (isSel(t, id) ? '' : LGROUP.tok(x))); return; } LGROUP.select(t === 'all' ? null : t === 'none' ? { t: 'none' } : { t, id }); };
    const dt = e => e.dataTransfer.types, has = (e, k) => [...dt(e)].includes(k);
    const dropPaper = gid => ({ dragover: e => { if (has(e, 'text/x-sis-paper') || has(e, 'text/x-sis-focus')) { e.preventDefault(); e.currentTarget.classList.add('lg-drop'); } }, dragleave: e => e.currentTarget.classList.remove('lg-drop'),
      drop: e => { e.preventDefault(); e.currentTarget.classList.remove('lg-drop'); const pid = e.dataTransfer.getData('text/x-sis-paper'), fid = e.dataTransfer.getData('text/x-sis-focus');
        if (pid) { LGROUP.toggle(gid, pid, true); toast('Added to ' + LGROUP.get(gid).name); } else if (fid && fid !== gid) LGROUP.placeGroup(fid, gid); } });
    const readBar = g => { const m = [...LGROUP.members(g)].map(M.lib).filter(Boolean); if (!m.length || !LGROUP.readOn() || typeof LIBSTATE === 'undefined') return h('span.lg-ic', g.query ? '' : '▤');
      const rd = m.filter(r => LIBSTATE.of(r) === 'read').length, rg = m.filter(r => LIBSTATE.of(r) === 'reading').length;
      return h('span.lg-rb', { title: `${rd} read, ${rg} reading, of ${m.length}` }, h('i', { style: { width: (rd / m.length * 100) + '%' } }), h('i', { style: { width: (rg / m.length * 100) + '%' } })); };
    const grow = g => { const t = LGROUP.shelfOf(g), smart = !!g.query && LGROUP.smartOn();
      return h('div.lg-row.lg-g' + (isSel('group', g.id) ? '.on' : '') + (smart ? '.lg-smart' : ''), { 'data-id': g.id, draggable: 'true', title: smart ? 'Smart focus · ' + g.query : 'Drop a paper here to add it · drag to move the focus',
        style: LGROUP.sh(t), on: Object.assign({ click: () => pickIt('group', g.id), dragstart: e => { e.stopPropagation(); e.dataTransfer.setData('text/x-sis-focus', g.id); e.dataTransfer.effectAllowed = 'move'; } }, dropPaper(g.id)) },
        smart ? h('span.lg-ic.lg-star', { 'aria-label': 'smart focus' }, '✶') : readBar(g), h('span.lg-n', g.name), h('span.lg-c', LGROUP.members(g).size),
        h('button.lg-m', { title: 'Focus', on: { click: e => { e.stopPropagation(); ctxMenu(e.clientX, e.clientY + 10, [{ head: g.name }, { label: 'Rename…', run: () => LGROUP.rename(g) },
          LGROUP.smartOn() ? { label: g.query ? 'Edit its search…' : 'Make it smart (a search)…', sub: g.query || 'Papers that match join by themselves', run: () => LGROUP.editQuery(g) } : null,
          { label: 'Move to a shelf…', run: () => LGROUP.moveMenu(g, e) },
          LIB.risOn() ? { label: 'Export as .ris', sub: plural(LGROUP.members(g).size, 'paper'), run: () => LIB.exportRis([...LGROUP.members(g)].map(M.lib).filter(Boolean), (LGROUP.shelfOf(g) ? LGROUP.shelfOf(g).name + '-' : '') + g.name) } : null,
          'sep', { label: 'Delete focus…', danger: true, run: () => LGROUP.removeGroup(g) }].filter(Boolean)); } } }, '⋯')); };
    const theme = t => { const gs = LGROUP.groups(t.id), op = LGROUP.open.has(t.id) || isSel('theme', t.id) || gs.some(g => isSel('group', g.id));
      return h('div.lg-theme', { style: LGROUP.sh(t) }, h('div.lg-row.lg-t' + (isSel('theme', t.id) ? '.on' : ''), { 'data-id': t.id, draggable: 'true', title: 'Show this shelf · drag to move it · drop a focus here to put it on this shelf',
        on: { click: () => pickIt('theme', t.id), dragstart: e => { e.dataTransfer.setData('text/x-sis-shelf', t.id); e.dataTransfer.effectAllowed = 'move'; },
          dragover: e => { if (has(e, 'text/x-sis-shelf') || has(e, 'text/x-sis-focus')) { e.preventDefault(); e.currentTarget.classList.add('lg-drop'); } }, dragleave: e => e.currentTarget.classList.remove('lg-drop'),
          drop: e => { e.preventDefault(); e.currentTarget.classList.remove('lg-drop'); const sid = e.dataTransfer.getData('text/x-sis-shelf'), fid = e.dataTransfer.getData('text/x-sis-focus'); if (sid && sid !== t.id) LGROUP.placeTheme(sid, t.id); else if (fid) LGROUP.placeGroup(fid, null, t.id); } } },
        h('button.lg-fold', { title: op ? 'Fold' : 'Unfold', on: { click: e => { e.stopPropagation(); op ? LGROUP.open.delete(t.id) : LGROUP.open.add(t.id); _ls.set('libOpen', [...LGROUP.open]); App.refresh(); } } }, op ? '▾' : '▸'),
        h('span.lg-sw', { 'aria-hidden': 'true' }), h('span.lg-n', t.name), h('span.lg-c', LGROUP.papersOfTheme(t.id).size),
        h('button.lg-m', { title: 'Shelf', on: { click: e => { e.stopPropagation(); ctxMenu(e.clientX, e.clientY + 10, [{ head: t.name }, { label: '+ Focus on this shelf…', run: () => LGROUP.addGroup(t.id) },
          LGROUP.smartOn() ? { label: '+ Smart focus on this shelf…', sub: 'A saved search that fills itself', run: () => LGROUP.addSmart(t.id) } : null,
          { label: 'Rename…', run: () => LGROUP.rename(t) }, { label: 'Colour…', run: () => LGROUP.colorMenu(t, e) },
          LIB.risOn() ? { label: 'Export as .ris', sub: plural(LGROUP.papersOfTheme(t.id).size, 'paper'), run: () => LIB.exportRis([...LGROUP.papersOfTheme(t.id)].map(M.lib).filter(Boolean), t.name) } : null,
          'sep', { label: 'Delete shelf…', danger: true, run: () => LGROUP.removeTheme(t) }].filter(Boolean)); } } }, '⋯')),
        op ? h('div.lg-kids', gs.map(grow), h('button.lg-add', { on: { click: () => LGROUP.addGroup(t.id) } }, '+ Focus')) : null); };
    const loose = LGROUP.groups(null);
    return h('aside.lg-side',
      h('div.lg-row' + (isSel('all') ? '.on' : ''), { on: { click: () => pickIt('all') } }, h('span.lg-n', 'All papers'), h('span.lg-c', all)),
      h('div.lg-row' + (isSel('none') ? '.on' : ''), { on: { click: () => pickIt('none') } }, h('span.lg-n.muted', 'In no focus'), h('span.lg-c', none)),
      h('div.lg-h', h('span', 'Shelves'), h('button.lg-add', { title: 'New paper shelf', on: { click: () => LGROUP.addTheme() } }, '+ Shelf')),
      LGROUP.themes().map(theme),
      !LGROUP.themes().length ? h('p.tiny.muted.lg-hint', 'A shelf holds foci, a focus holds papers — e.g. Confocal Optics › R-PE Photobleaching Kinetics.') : null,
      h('div.lg-h', { on: { dragover: e => { if (has(e, 'text/x-sis-focus')) e.preventDefault(); }, drop: e => { const fid = e.dataTransfer.getData('text/x-sis-focus'); if (fid) { e.preventDefault(); LGROUP.placeGroup(fid, null, null); } } } }, h('span', 'Foci on no shelf'), h('button.lg-add', { title: 'New focus on no shelf', on: { click: () => LGROUP.addGroup(null) } }, '+ Focus')),
      loose.map(grow),
      h('p.tiny.muted.lg-hint', 'Drag a paper onto a focus to add it; drag shelves and foci to move them.' + (LGROUP.smartOn() ? ' ✶ a smart focus: a saved search that fills itself.' : '')));
  },
  /* ---------- on a paper ---------- */
  chips(r) {
    const gs = LGROUP.groupsOf(r.id);
    return h('div.lg-chips', gs.map(g => { const t = LGROUP.shelfOf(g), smart = !!g.query && LGROUP.smartOn() && !(g.paperIds || []).includes(r.id);
      return h('span.lg-chip' + (smart ? '.lg-chip-smart' : ''), { title: (t ? t.name + ' › ' : '') + g.name + (smart ? ' — found by its search' : ''), style: LGROUP.sh(t), on: { click: () => LGROUP.qmode() ? LibraryView.scope(LGROUP.tok(g)) : LGROUP.select({ t: 'group', id: g.id }) } }, smart ? '✶ ' + g.name : g.name); }),
      h('button.lg-chip.lg-plus', { title: 'Add to a focus', on: { click: e => { e.stopPropagation(); LGROUP.pick(r, e); } } }, gs.length ? '＋' : '＋ Focus'));
  },
  pick(r, e) {
    const row = g => { const has = (g.paperIds || []).includes(r.id), auto = !has && !!g.query && LGROUP.smartOn() && LGROUP.members(g).has(r.id);
      return h('label.lg-pk', { title: auto ? 'Its search finds this paper' : '' }, h('input', { type: 'checkbox', checked: has || auto, disabled: auto, on: { change: ev => { LGROUP.toggle(g.id, r.id, ev.target.checked); } } }), h('span', (g.query && LGROUP.smartOn() ? '✶ ' : '') + g.name)); };
    const sec = LGROUP.themes().map(t => { const gs = LGROUP.groups(t.id); return h('div.lg-pks', { style: LGROUP.sh(t) }, h('div.lg-pkh', t.name), gs.length ? gs.map(row) : h('div.tiny.muted', 'no foci yet'), h('button.btn.xs.ghost', { on: { click: () => { closePop(); LGROUP.addGroup(t.id, r.id); } } }, '+ New focus on ' + t.name)); });
    const loose = LGROUP.groups(null);
    popover(e.clientX - 160, e.clientY + 12, [h('h5', 'Foci for this paper'), ...sec, h('div.lg-pks', h('div.lg-pkh', 'On no shelf'), loose.map(row), h('button.btn.xs.ghost', { on: { click: () => { closePop(); const s = LGROUP.sel, th = s && s.t === 'theme' ? s.id : s && s.t === 'group' ? (LGROUP.get(s.id) || {}).themeId : null; LGROUP.addGroup(th || null, r.id); } } }, '+ New focus'))], { cls: 'pop.lg-pop' });
  },
};
