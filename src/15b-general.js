/* ==========================================================================
   15b · Notes outside any project ("General"). A meeting with a mentor, a
   seminar, a broad idea: + Note → Project: "No project (general)". They sit
   at the top of the Portfolio in a General section, and are searched,
   linked and listed like any note. Their links reach notes in any project;
   the note's header shows which projects it touches. ⋯ → "Project &
   theme…" moves any note into a project, between projects, or out of one.
   ========================================================================== */
const GENERAL = {
  docs: () => DB.where('documents', d => !d.projectId && !d.deleted && !['day', 'review'].includes(d.type) && !(PROFILE[d.type] && PROFILE[d.type].system)),
  /** The other notes this one is tied to: wires, embeds, note cards, link marks — both ways. */
  linked(d) {
    const mine = new Set(M.docBlocks(d.id).map(b => b.id)), out = new Set(), add = id => { if (id && id !== d.id) out.add(id); };
    DB.all('wires').forEach(w => { const A = M.block(w.from), B = M.block(w.to); if (!A || !B) return; if (mine.has(A.id)) add(B.docId); if (mine.has(B.id)) add(A.docId); });
    DB.all('blocks').forEach(b => { if (b.status === 'removed') return; const src = b.kind === 'ref' && M.block(b.refBlockId);
      if (mine.has(b.id)) { if (src) add(src.docId); if (b.kind === 'noteref') add(b.refDocId); (b.body && b.body.marks || []).forEach(m => { if (m.type === 'link' && m.ref) { const t = M.doc(m.ref) || (M.block(m.ref) && M.doc(M.block(m.ref).docId)); t && add(t.id); } }); }
      else if (src && mine.has(src.id)) add(b.docId); else if (b.kind === 'noteref' && b.refDocId === d.id) add(b.docId); });
    return [...out].map(M.doc).filter(Boolean);
  },
  touches(d) { const ps = new Map(); GENERAL.linked(d).forEach(x => { if (x.projectId && M.project(x.projectId)) { const p = M.project(x.projectId); ps.set(p.id, (ps.get(p.id) || 0) + 1); } }); return [...ps].map(([id, n]) => ({ p: M.project(id), n })).sort((a, b) => b.n - a.n); },
  /** ⋯ → Project & theme… */
  move(d) {
    const rows = [{ id: '', label: 'No project (general)', sub: 'Outside every project' }];
    DB.all('projects').forEach(p => { rows.push({ id: p.id, theme: null, label: p.name, sub: 'project-wide' }); DB.where('themes', t => t.projectId === p.id && t.status === 'active').forEach(t => rows.push({ id: p.id, theme: t.id, label: p.name + ' › ' + t.name, sub: 'theme' })); });
    const m = modal({ title: 'Move “' + snippet(d.title, 40) + '”', actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Project or theme…', items: q => rows.filter(r => !q || r.label.toLowerCase().includes(q)),
      render: r => h('div', h('b', r.label), h('span.s', r.sub + ((d.projectId || '') === r.id && (d.themeId || null) === (r.theme || null) ? ' · here now' : ''))),
      onPick: r => { m.close(); const cur = M.doc(d.id); cur.projectId = r.id || null; cur.themeId = r.id && prof(cur.type).scope === 'theme' ? r.theme || null : null; M.touchDoc(cur); DB.put('documents', cur); changed(); toast('Moved to ' + (r.id ? r.label : 'General (no project)')); } }) });
  },
};
{
  // the note's ⋯ menu: Project & theme… (for every note type)
  const dm = DocView.docMenu; if (dm) DocView.docMenu = function (d, e) { const orig = ctxMenu; ctxMenu = (x, y, rows) => orig(x, y, [...rows.filter(r => !(r && /Move to theme/.test(r.label || ''))), 'sep', { label: 'Project & theme…', sub: d.projectId ? (M.project(d.projectId) || {}).name : 'General — no project', run: () => GENERAL.move(d) }]); try { return dm.call(this, d, e); } finally { ctxMenu = orig; } };
  // header: a general note shows the projects it touches
  const rn = DocView.render; DocView.render = function (docId) { const r = rn.call(this, docId); const d = M.doc(docId);
    if (d && !d.projectId && this === App.pane) setTimeout(() => { const meta = $('#meta'); if (!meta || $('.gen-touch', meta)) return; const T = GENERAL.touches(d);
      meta.append(h('span.gen-touch', h('span.pill', 'General'), T.length ? [' touches ', ...T.map(({ p, n }, i) => [i ? ', ' : '', h('a', { title: plural(n, 'linked note'), on: { click: () => App.go('#/project/' + p.id) } }, p.name)])] : ' · not tied to a project')); }, 0);
    return r; };
  // Portfolio: a General section above the projects
  const pr = PortfolioView.render; PortfolioView.render = function (...a) { const host = pr.apply(this, a); const G = GENERAL.docs(); if (!G.length) return host;
    const W = $('.world', host) || host.querySelector('.paper > div'); if (!W) return host;
    const CW = 260, GAP = 40, CARD = 64, cols = Math.min(4, Math.max(1, Math.ceil(G.length / 4))), rows = Math.ceil(G.length / cols), H = 96 + rows * (CARD + 12) + 70;
    $$(':scope > *', W).forEach(el => { if (el.style && el.style.top) el.style.top = (parseFloat(el.style.top) + H) + 'px'; });
    const sv = $(':scope > svg.plinks', W); if (sv) sv.style.transform = `translateY(${H}px)`;
    W.append(h('div.box.pcard.gcard.nopan', { style: { left: '0px', top: '0px', width: (cols * (CW + GAP) - GAP) + 'px' } }, h('div.pk', 'Outside projects'), h('div.pn', 'General'), h('div.ps', plural(G.length, 'note') + ' · meetings, seminars, broad ideas — they link into any project')));
    G.sort((a, b) => b.modified.localeCompare(a.modified)).forEach((d, i) => { const x = (i % cols) * (CW + GAP), y = 96 + Math.floor(i / cols) * (CARD + 12), T = GENERAL.touches(d);
      W.append(h('div.box.dcard.nopan', { 'data-doc': d.id, style: { left: x + 'px', top: y + 'px', width: CW + 'px' }, on: { click: () => App.go('#/doc/' + d.id) } },
        h('div.row', typechip(d.type), h('span.spacer'), h('span.mono.tiny.muted', fmtDay(d.modified))), h('div.dn', d.title),
        h('div.ds', T.length ? 'touches ' + T.map(t => t.p.name).join(', ') : 'not linked to a project yet'))); });
    return host; };
}
