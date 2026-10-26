/* ==========================================================================
   17d · Library themes and groups. A group is a named set of papers (a paper
   can sit in several groups); a group sits in one library theme or in none.
   Example: the group "R-PE Photobleaching Kinetics" in the theme "Confocal
   Optics". Kept in the store `libsets` ({kind: 'theme' | 'group', name,
   themeId, paperIds}) and synced like everything else.
   Library page: the tree on the left filters the list (all papers, papers in
   no group, a theme = every paper in its groups, one group). On each paper,
   its groups show as chips; ＋ adds it to groups or a new one. Papers can
   also be dragged onto a group in the tree.
   ========================================================================== */
const LGROUP = {
  sel: _ls.get('libSel', null),          // null = all · {t: 'none'} · {t: 'theme', id} · {t: 'group', id}
  open: new Set(_ls.get('libOpen', [])),  // themes folded open
  byName: (a, b) => (a.name || '').localeCompare(b.name || ''),
  themes: () => DB.where('libsets', x => x.kind === 'theme').sort(LGROUP.byName),
  groups: themeId => DB.where('libsets', x => x.kind === 'group' && (x.themeId || null) === (themeId || null)).sort(LGROUP.byName),
  allGroups: () => DB.where('libsets', x => x.kind === 'group').sort(LGROUP.byName),
  groupsOf: pid => DB.where('libsets', x => x.kind === 'group' && (x.paperIds || []).includes(pid)).sort(LGROUP.byName),
  papersOfTheme: tid => new Set(LGROUP.groups(tid).flatMap(g => g.paperIds || [])),
  get: id => DB.get('libsets', id),
  select(s) { LGROUP.sel = s; _ls.set('libSel', s); App.refresh(); },
  /** does the current selection keep this paper in the list? */
  keep(r) { const s = LGROUP.sel; if (!s) return true;
    if (s.t === 'none') return !LGROUP.groupsOf(r.id).length;
    if (s.t === 'group') { const g = LGROUP.get(s.id); return !g || (g.paperIds || []).includes(r.id); }
    if (s.t === 'theme') return !LGROUP.get(s.id) || LGROUP.papersOfTheme(s.id).has(r.id);
    return true; },
  selLabel() { const s = LGROUP.sel; if (!s) return null; if (s.t === 'none') return 'Not in a group'; const x = LGROUP.get(s.id); if (!x) return null; const t = x.themeId && LGROUP.get(x.themeId); return (t ? t.name + ' › ' : '') + x.name; },

  /* ---------- changes ---------- */
  save(x) { x.modified = isoLocal(new Date()); DB.put('libsets', x); changed(); return x; },
  async addTheme() { const n = await askText('New library theme', 'Name', '', { placeholder: 'Confocal Optics' }); if (!n) return null; DB.beginGroup('library');
    const t = LGROUP.save({ id: uid('lt'), kind: 'theme', name: n, created: isoLocal(new Date()) }); LGROUP.open.add(t.id); _ls.set('libOpen', [...LGROUP.open]); return t; },
  async addGroup(themeId, paperId) { const th = themeId && LGROUP.get(themeId); const n = await askText('New group' + (th ? ' in ' + th.name : ''), 'Name', '', { placeholder: 'R-PE Photobleaching Kinetics' }); if (!n) return null; DB.beginGroup('library');
    const g = LGROUP.save({ id: uid('lg'), kind: 'group', name: n, themeId: themeId || null, paperIds: paperId ? [paperId] : [], created: isoLocal(new Date()) });
    if (themeId) { LGROUP.open.add(themeId); _ls.set('libOpen', [...LGROUP.open]); } toast(paperId ? 'Group made with this paper' : 'Group made — add papers with ＋ on each paper or drag them here'); return g; },
  async rename(x) { const n = await askText('Rename ' + (x.kind === 'theme' ? 'theme' : 'group'), 'Name', x.name); if (!n || n === x.name) return; DB.beginGroup('library'); LGROUP.save(Object.assign({}, x, { name: n })); },
  toggle(gid, pid, on) { const g = LGROUP.get(gid); if (!g) return; const has = (g.paperIds || []).includes(pid); if (on === has) return; DB.beginGroup('library');
    LGROUP.save(Object.assign({}, g, { paperIds: has ? g.paperIds.filter(x => x !== pid) : [...(g.paperIds || []), pid] })); },
  moveGroup(gid, themeId) { const g = LGROUP.get(gid); if (!g) return; DB.beginGroup('library'); LGROUP.save(Object.assign({}, g, { themeId: themeId || null })); },
  removeGroup(g) { pickModal('Delete the group “' + g.name + '”?', `Its ${plural((g.paperIds || []).length, 'paper')} stay in the library. Ctrl+Z undoes it.`, [{ label: 'Delete group', danger: true, run: () => { DB.beginGroup('library'); DB.del('libsets', g.id); if (LGROUP.sel && LGROUP.sel.id === g.id) LGROUP.sel = null; changed(); } }]); },
  removeTheme(t) { const gs = LGROUP.groups(t.id); pickModal('Delete the theme “' + t.name + '”?', gs.length ? `Its ${plural(gs.length, 'group')} move to “Groups without a theme”; no papers are removed.` : 'No papers are removed.', [{ label: 'Delete theme', danger: true, run: () => { DB.beginGroup('library'); gs.forEach(g => DB.put('libsets', Object.assign({}, g, { themeId: null }))); DB.del('libsets', t.id); if (LGROUP.sel && LGROUP.sel.id === t.id) LGROUP.sel = null; changed(); } }]); },
  moveMenu(g, e) { ctxMenu(e.clientX, e.clientY + 10, [{ head: 'Move “' + g.name + '” to' }, ...LGROUP.themes().map(t => ({ label: t.name + (t.id === g.themeId ? ' ✓' : ''), run: () => LGROUP.moveGroup(g.id, t.id) })), { label: 'No theme' + (!g.themeId ? ' ✓' : ''), run: () => LGROUP.moveGroup(g.id, null) }, 'sep', { label: 'New theme…', run: async () => { const t = await LGROUP.addTheme(); if (t) LGROUP.moveGroup(g.id, t.id); } }]); },

  /* ---------- the tree ---------- */
  side() {
    const S0 = LGROUP.sel, n = id => (LGROUP.get(id).paperIds || []).filter(p => M.lib(p)).length, all = DB.all('library').length, none = DB.all('library').filter(r => !LGROUP.groupsOf(r.id).length).length;
    const isSel = (t, id) => S0 ? S0.t === t && (id == null || S0.id === id) : t === 'all';
    const drop = gid => ({ dragover: e => { if (e.dataTransfer.types.includes('text/x-sis-paper')) { e.preventDefault(); e.currentTarget.classList.add('lg-drop'); } }, dragleave: e => e.currentTarget.classList.remove('lg-drop'),
      drop: e => { e.preventDefault(); e.currentTarget.classList.remove('lg-drop'); const pid = e.dataTransfer.getData('text/x-sis-paper'); if (pid) { LGROUP.toggle(gid, pid, true); toast('Added to ' + LGROUP.get(gid).name); } } });
    const grow = g => h('div.lg-row.lg-g' + (isSel('group', g.id) ? '.on' : ''), { 'data-id': g.id, on: Object.assign({ click: () => LGROUP.select({ t: 'group', id: g.id }) }, drop(g.id)) },
      h('span.lg-ic', '▤'), h('span.lg-n', g.name), h('span.lg-c', n(g.id)),
      h('button.lg-m', { title: 'Group', on: { click: e => { e.stopPropagation(); ctxMenu(e.clientX, e.clientY + 10, [{ head: g.name }, { label: 'Rename…', run: () => LGROUP.rename(g) }, { label: 'Move to a theme…', run: () => LGROUP.moveMenu(g, e) }, 'sep', { label: 'Delete group…', danger: true, run: () => LGROUP.removeGroup(g) }]); } } }, '⋯'));
    const theme = t => { const gs = LGROUP.groups(t.id), op = LGROUP.open.has(t.id) || isSel('theme', t.id) || gs.some(g => isSel('group', g.id));
      return h('div.lg-theme', h('div.lg-row.lg-t' + (isSel('theme', t.id) ? '.on' : ''), { 'data-id': t.id, on: { click: () => LGROUP.select({ t: 'theme', id: t.id }) } },
        h('button.lg-fold', { title: op ? 'Fold' : 'Unfold', on: { click: e => { e.stopPropagation(); op ? LGROUP.open.delete(t.id) : LGROUP.open.add(t.id); _ls.set('libOpen', [...LGROUP.open]); App.refresh(); } } }, op ? '▾' : '▸'),
        h('span.lg-n', t.name), h('span.lg-c', LGROUP.papersOfTheme(t.id).size),
        h('button.lg-m', { title: 'Theme', on: { click: e => { e.stopPropagation(); ctxMenu(e.clientX, e.clientY + 10, [{ head: t.name }, { label: '+ Group in this theme…', run: () => LGROUP.addGroup(t.id) }, { label: 'Rename…', run: () => LGROUP.rename(t) }, 'sep', { label: 'Delete theme…', danger: true, run: () => LGROUP.removeTheme(t) }]); } } }, '⋯')),
        op ? h('div.lg-kids', gs.map(grow), h('button.lg-add', { on: { click: () => LGROUP.addGroup(t.id) } }, '+ Group')) : null); };
    const loose = LGROUP.groups(null);
    return h('aside.lg-side',
      h('div.lg-row' + (isSel('all') ? '.on' : ''), { on: { click: () => LGROUP.select(null) } }, h('span.lg-n', 'All papers'), h('span.lg-c', all)),
      h('div.lg-row' + (isSel('none') ? '.on' : ''), { on: { click: () => LGROUP.select({ t: 'none' }) } }, h('span.lg-n.muted', 'Not in a group'), h('span.lg-c', none)),
      h('div.lg-h', h('span', 'Themes'), h('button.lg-add', { title: 'New library theme', on: { click: () => LGROUP.addTheme() } }, '+ Theme')),
      LGROUP.themes().map(theme),
      !LGROUP.themes().length ? h('p.tiny.muted.lg-hint', 'A theme holds groups of papers — e.g. Confocal Optics › R-PE Photobleaching Kinetics.') : null,
      h('div.lg-h', h('span', 'Groups without a theme'), h('button.lg-add', { title: 'New group without a theme', on: { click: () => LGROUP.addGroup(null) } }, '+ Group')),
      loose.map(grow));
  },
  /* ---------- on a paper ---------- */
  chips(r) {
    const gs = LGROUP.groupsOf(r.id);
    return h('div.lg-chips', gs.map(g => { const t = g.themeId && LGROUP.get(g.themeId); return h('span.lg-chip', { title: (t ? t.name + ' › ' : '') + g.name, on: { click: () => LGROUP.select({ t: 'group', id: g.id }) } }, g.name); }),
      h('button.lg-chip.lg-plus', { title: 'Add to a group', on: { click: e => { e.stopPropagation(); LGROUP.pick(r, e); } } }, gs.length ? '＋' : '＋ Group'));
  },
  pick(r, e) {
    const row = g => { const has = (g.paperIds || []).includes(r.id); return h('label.lg-pk', h('input', { type: 'checkbox', checked: has, on: { change: ev => { LGROUP.toggle(g.id, r.id, ev.target.checked); } } }), h('span', g.name)); };
    const sec = LGROUP.themes().map(t => { const gs = LGROUP.groups(t.id); return h('div.lg-pks', h('div.lg-pkh', t.name), gs.length ? gs.map(row) : h('div.tiny.muted', 'no groups yet'), h('button.btn.xs.ghost', { on: { click: () => { closePop(); LGROUP.addGroup(t.id, r.id); } } }, '+ New group in ' + t.name)); });
    const loose = LGROUP.groups(null);
    popover(e.clientX - 160, e.clientY + 12, [h('h5', 'Groups for this paper'), ...sec, h('div.lg-pks', h('div.lg-pkh', 'Without a theme'), loose.map(row), h('button.btn.xs.ghost', { on: { click: () => { closePop(); const s = LGROUP.sel, th = s && s.t === 'theme' ? s.id : s && s.t === 'group' ? (LGROUP.get(s.id) || {}).themeId : null; LGROUP.addGroup(th || null, r.id); } } }, '+ New group'))], { cls: 'pop.lg-pop' });
  },
};
