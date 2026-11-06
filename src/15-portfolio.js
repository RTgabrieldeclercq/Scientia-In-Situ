/* ==========================================================================
   15 · Portfolio — containment is coarse (project → theme → note, one home
   each); links cross freely. The map draws both: notes stacked under their
   theme, and dashed magenta lines wherever notes connect (§2).
   ========================================================================== */
const PortfolioView = {
  canvas: true, title: true,
  render() {
    App.setTitle('Portfolio', [h('span', plural(DB.all('projects').length, 'project') + ' · ' + plural(DB.where('themes', t => t.status === 'active').length, 'active theme') + ' · ' + plural(DB.all('documents').filter(d => d.type !== 'review').length, 'note'))]);
    const host = h('div.canvas-host'), P = makePaper(host, { view: _ls.get('view:portfolio', null) || undefined, onView: debounce(v => _ls.set('view:portfolio', v), 400), minZ: .2 });
    const W = P.world, pos = {}, CW = 260, GAP = 40, CARD = 64;
    let y = 0;
    for (const p of DB.all('projects').sort((a, b) => a.created.localeCompare(b.created))) {
      const themes = DB.where('themes', t => t.projectId === p.id && t.status === 'active'), cols = [{ id: null, name: 'Project-wide & global', docs: DB.where('documents', d => d.projectId === p.id && !d.themeId && d.type !== 'review') }, ...themes.map(t => ({ t, id: t.id, name: t.name, docs: DB.where('documents', d => d.themeId === t.id) }))];
      const ph = h('div.box.pcard.nopan', { style: { left: '0px', top: y + 'px', width: (cols.length * (CW + GAP) - GAP) + 'px' }, on: { click: () => App.go('#/project/' + p.id) } }, h('div.pk', 'Project'), h('div.pn', p.name),
        h('div.ps', `${plural(themes.length, 'theme')} · ${plural(IX.openBarriers(p.id).length, 'open barrier')} · ${plural(DB.where('terms', t => t.projectId === p.id).length, 'term')}`));
      W.append(ph); y += 96; let maxH = 0;
      cols.forEach((c, ci) => { const x = ci * (CW + GAP); const H = c.t ? IX.themeHealth(c.t) : null;
        W.append(h('div.box.tcard.nopan', { style: { left: x + 'px', top: y + 'px', width: CW + 'px' }, on: { click: () => c.t && App.go('#/theme/' + c.id) } }, h('div.tn', c.name),
          H ? h('div.ts', H.stalled ? h('span.pill.warn', 'stalled ' + H.days + 'd') : H.aims.length ? h('span.pill.teal', plural(H.aims.length, 'aim')) : h('span.pill', 'exploratory'), ' ', fmtDur(H.ms4) + ' / 4 wk', H.openB.length ? h('span', { style: { color: 'var(--bad)' } }, ' · ' + plural(H.openB.length, 'open barrier')) : null) : h('div.ts', 'protocols, literature, seminars'),
          c.t ? heatmapEl({ weeks: 6, themeId: c.id, cell: 7 }) : null));
        let yy = y + (c.t ? 150 : 70);
        c.docs.sort((a, b) => b.modified.localeCompare(a.modified)).forEach(d => {
          const items = M.docBlocks(d.id).flatMap(b => IX.itemsOf(b.id)), ob = items.filter(i => i.kind === 'barrier' && IX.status(i) === 'open').length;
          W.append(h('div.box.dcard.nopan', { 'data-doc': d.id, style: { left: x + 'px', top: yy + 'px', width: CW + 'px' }, on: { click: () => App.go('#/doc/' + d.id) } },
            h('div.row', typechip(d.type), TIMER.activeFor(d.id) ? h('span.live', '●') : null, h('span.spacer'), h('span.mono.tiny.muted', fmtDay(d.modified))), h('div.dn', d.title),
            h('div.ds', plural(M.liveBlocks(d.id).length, prof(d.type).noun.toLowerCase()), items.length ? ' · ' + plural(items.length, 'structure') : '', ob ? h('span', { style: { color: 'var(--bad)' } }, ' · ' + ob + ' open') : null)));
          pos[d.id] = { x, y: yy, w: CW, h: CARD }; yy += CARD + 12; });
        maxH = Math.max(maxH, yy - y); });
      y += maxH + 90;
    }
    // ordinary links between notes: wires, pulled-in components, link marks
    const pairs = new Map(), add = (a, b, why) => { if (!a || !b || a === b || !pos[a] || !pos[b]) return; const k = [a, b].sort().join('|'); if (!pairs.has(k)) pairs.set(k, { a, b, why: new Set() }); pairs.get(k).why.add(why); };
    DB.all('wires').forEach(w => { const A = M.block(w.from), B = M.block(w.to); if (A && B && A.docId !== B.docId) add(A.docId, B.docId, (REL[w.rel] || {}).label || w.rel); });
    DB.all('blocks').forEach(b => { if (b.kind === 'ref' && b.status !== 'removed') { const o = M.block(b.refBlockId); if (o) add(o.docId, b.docId, 'pulled in'); } if (b.boundTo) add(b.boundTo.protocolId, b.docId, 'runs protocol'); (b.body.marks || []).forEach(m => { if (m.type === 'link' && m.ref) { const t = IX.linkTarget(m); if (t) add(b.docId, t.type === 'doc' ? t.d.id : t.b.docId, 'link'); } }); });
    let svg = '';
    for (const { a, b, why } of pairs.values()) { const A = pos[a], B = pos[b], x1 = A.x + A.w, y1 = A.y + A.h / 2, x2 = B.x, y2 = B.y + B.h / 2;
      const [p1, p2] = x1 <= x2 ? [{ x: x1, y: y1 }, { x: x2, y: y2 }] : [{ x: B.x + B.w, y: y2 }, { x: A.x, y: y1 }]; const off = Math.max(40, Math.abs(p2.x - p1.x) / 2);
      svg += `<path class="pl" d="M${p1.x},${p1.y} C${p1.x + off},${p1.y} ${p2.x - off},${p2.y} ${p2.x},${p2.y}"><title>${esc([...why].join(', '))}</title></path>`; }
    const s = SV('svg', { class: 'wires plinks' }); s.innerHTML = svg; W.prepend(s);
    W.append(h('div.box.addp.nopan', { style: { left: '0px', top: y + 'px' } }, h('button.btn', { on: { click: async () => { const n = await askText('New project', 'Name'); if (n) { M.createProject(n); } } } }, '+ Project')));
    if (!_ls.get('view:portfolio', null)) requestAnimationFrame(() => { let x1 = 0; $$('.box', W).forEach(e => x1 = Math.max(x1, e.offsetLeft + e.offsetWidth)); P.fit({ x0: 0, y0: 0, x1, y1: Math.min(y, 900) }, false); });
    host.append(h('div.hint', 'Notes sit under their theme; dashed lines are connections between notes. Drag to pan.'));
    return host;
  },
};

function aimEl(a, opts = {}) {
  const met = sum(a.milestones.filter(m => m.metAt).map(m => m.weight)), ro = a.status !== 'active' || opts.ro;
  return h('div.card.flat' + (a.status === 'superseded' ? '.ghost' : ''), { style: { marginBottom: '10px' } },
    h('div.row', h('h4', { style: { flex: 1, margin: 0 } }, a.statement), a.status === 'superseded' ? h('span.pill', 'superseded ' + fmtDay(a.supersededAt)) : null, h('span.mono.tiny', Math.round(met * 100) + '%')),
    h('div.bar', { style: { margin: '6px 0 10px' } }, h('i', { style: { width: met * 100 + '%' } })),
    a.milestones.map(m => { const ev = m.evidenceRef && (m.evidenceRef.type === 'item' ? M.item(m.evidenceRef.id) : M.block(m.evidenceRef.id));
      return h('div.msrow', h('input', { type: 'checkbox', checked: !!m.metAt, disabled: ro, on: { change: () => m.metAt ? M.meetMilestone(a.id, m.id) : evidencePick(a, m) } }),
        h('span', { style: { flex: 1 } }, m.label, ev ? h('div.tiny.muted', '↳ evidence: ', h('a', { on: { click: () => App.openBlock(ev.originBlockId || ev.id) } }, snippet(ev.text || M.blockName(ev), 60))) : m.metAt ? h('div.tiny', { style: { color: 'var(--warn)' } }, 'met without cited evidence') : null),
        m.metAt ? h('span.tiny.mono.muted', 'met ' + fmtDay(m.metAt)) : null, h('span.pill', 'w ' + m.weight.toFixed(2))); }),
    ro ? null : h('div.row', { style: { marginTop: '8px' } }, h('span.tiny.muted', { style: { flex: 1 } }, 'Weights are fixed when the aim is written. Re-scoping creates a new version, so past grades keep their numbers.'), h('button.btn.xs', { on: { click: () => newAimDialog(a.themeId, a) } }, 'Re-scope…')));
}
function evidencePick(a, m) {
  const mm = modal({ title: 'Milestone met — cite its evidence', wide: true, actions: [{ label: 'Mark met without evidence', run: () => M.meetMilestone(a.id, m.id, null) }, { label: 'Cancel' }],
    body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, '“' + m.label + '” — an unsupported completion is an assertion. Pick the claim, result or run that shows it.'),
      optionPicker({ placeholder: 'Search evidence, results, claims…', items: q => DB.where('items', i => ['evidence', 'result', 'claim', 'takeaway'].includes(i.kind) && (!q || i.text.toLowerCase().includes(q))).sort((x, y) => y.created.localeCompare(x.created)),
        render: i => h('div', kchip(i.kind), ' ', h('span.serif', snippet(i.text, 80)), h('span.s', M.docPath(M.doc(i.originDocId)))), onPick: i => { mm.close(); M.meetMilestone(a.id, m.id, { type: 'item', id: i.id }); } })) });
}
function newAimDialog(themeId, prev) {
  const st = h('input.inp', { placeholder: 'Quantify the in-situ detection floor below 2 ng/mL', value: prev ? prev.statement : '' });
  const ms = h('textarea.inp.mono', { rows: 5, placeholder: 'Calibration curve at 3 pinholes | 0.25\nZ-step sensitivity sweep | 0.25\nNoise model fitted | 0.30\nFloor with CI | 0.20' });
  if (prev) ms.value = prev.milestones.map(m => `${m.label} | ${m.weight}`).join('\n');
  modal({ title: prev ? 'Re-scope aim (new version)' : 'New aim', body: h('div', prev ? h('p.tiny.muted', { style: { marginTop: 0 } }, 'The current version is kept, superseded, with its weights — grades from past weeks keep computing from it. Milestones already met carry over by label.') : null,
    h('label.f', h('span', 'Statement'), st), h('div', { style: { height: '10px' } }), h('label.f', h('span', 'Milestones — one per line, “label | weight”; weights sum to 1.00'), ms)),
    actions: [{ label: 'Cancel' }, { label: prev ? 'Create new version' : 'Create aim', pri: true, run: () => {
      const rows = ms.value.split('\n').map(l => l.split('|')).filter(p => p[0].trim()).map(p => ({ label: p[0].trim(), weight: parseFloat(p[1]) || 0 }));
      const tot = sum(rows.map(r => r.weight)); if (!st.value.trim() || !rows.length) { toast('Statement and at least one milestone'); return false; }
      if (Math.abs(tot - 1) > 0.011) { toast(`Weights sum to ${tot.toFixed(2)} — they must sum to 1.00`); return false; }
      if (prev) { rows.forEach(r => { const o = prev.milestones.find(m => m.label === r.label && m.metAt); if (o) { r.metAt = o.metAt; r.evidenceRef = o.evidenceRef; } }); M.reviseAim(prev, st.value.trim(), rows); } else M.createAim(themeId, st.value.trim(), rows); } }] });
}

const ProjectView = {
  title: true,
  render(id) {
    const p = M.project(id); if (!p) return h('div.page', h('div.empty', 'Project not found'));
    App.setTitle(p.name, [h('span', 'project')]);
    const themes = DB.where('themes', t => t.projectId === id), active = themes.filter(t => t.status === 'active'), docs = DB.where('documents', d => d.projectId === id);
    const claims = DB.where('items', i => i.projectId === id && (i.kind === 'claim' || i.kind === 'evidence') && !i.correctedBy).sort((a, b) => ({ contested: 0, supported: 1, abandoned: 2 }[a.stance] ?? 1) - ({ contested: 0, supported: 1, abandoned: 2 }[b.stance] ?? 1) || b.created.localeCompare(a.created));
    const contested = claims.filter(c => c.stance === 'contested');
    const terms = DB.where('terms', t => t.projectId === id), pw = docs.filter(d => !d.themeId && d.type !== 'review');
    return h('div.page',
      h('div.eyebrow', 'Project'), h('h1.title', p.name),
      h('p.stand', `${plural(active.length, 'active theme')} · ${plural(docs.length, 'note')} · ${plural(IX.openBarriers(id).length, 'open barrier')} · ${plural(terms.length, 'term')}`),
      h('div.row', h('button.btn.pri', { on: { click: () => App.newDoc({ projectId: id }) } }, '+ New note'),
        h('button.btn', { on: { click: async () => { const n = await askText('New theme', 'A line of attack — a question you could plausibly answer'); if (n) M.createTheme(id, n); } } }, '+ Theme'),
        h('button.btn.ghost', { on: { click: async () => { const n = await askText('Rename project', 'Name', p.name); if (n) { p.name = n; DB.put('projects', p); changed(); } } } }, 'Rename')),
      h('div.sec-h', h('h2', 'Themes'), h('span.k', 'health roster')),
      h('div.cards', active.map(t => { const H = IX.themeHealth(t);
        return h('div.card.click', { on: { click: () => App.go('#/theme/' + t.id) } },
          h('div.row', h('h4', { style: { flex: 1, margin: 0 } }, t.name), H.stalled ? h('span.pill.warn', 'stalled ' + H.days + 'd') : H.aims.length ? null : h('span.pill', 'exploratory')),
          h('p.serif.muted', { style: { margin: '4px 0 10px', fontSize: '13.5px' } }, t.question || '—'),
          heatmapEl({ weeks: 6, themeId: t.id, cell: 9 }),
          h('div.row.mono.tiny', { style: { marginTop: '10px', color: 'var(--ink-3)', gap: '14px' } }, h('span', fmtDur(H.ms4) + ' / 4 wk'), h('span', { style: { color: H.openB.length ? 'var(--bad)' : '' } }, plural(H.openB.length, 'open barrier')), h('span', plural(H.evid, 'result'))),
          H.aims.map(a => { const met = sum(a.milestones.filter(m => m.metAt).map(m => m.weight)); return h('div', { style: { marginTop: '8px' } }, h('div.tiny', snippet(a.statement, 60)), h('div.bar', h('i', { style: { width: met * 100 + '%' } }))); })); })),
      themes.some(t => t.status !== 'active') ? [h('div.sec-h', h('h2', 'Earlier themes'), h('span.k', 'retired, merged, split or re-shaped — documents still reachable')),
        h('div.list', themes.filter(t => t.status !== 'active').map(t => h('div.li.click', { on: { click: () => App.go('#/theme/' + t.id) } }, h('span.t', t.name, h('span.s', t.status + (t.supersededBy && t.supersededBy.length ? ' → ' + t.supersededBy.map(x => (M.theme(x) || {}).name).join(', ') : '') + (t.retireReason ? ' · ' + t.retireReason : ''))), h('span.tiny.mono.muted', fmtDay(t.supersededAt || t.retiredAt || t.created)))))] : null,
      pw.length ? [h('div.sec-h', h('h2', 'Project-wide & global notes'), h('span.k', 'protocols, literature and seminars reused by every theme')),
        h('div.list', pw.map(d => h('div.li.click', { on: { click: () => App.go('#/doc/' + d.id) } }, typechip(d.type), h('span.t', d.title), h('span.tiny.mono.muted', fmtWhen(d.modified)))))] : null,
      h('div.sec-h', h('h2', 'Claims & evidence'), h('span.k', contested.length ? plural(contested.length, 'contested claim') + ' — the discussion section, assembled continuously' : 'the argument, assembled continuously')),
      capped(claims, 8, it => itemRow(it, h('span.row', { style: { gap: '4px', flexWrap: 'nowrap' } }, it.stance ? h('span.pill' + (it.stance === 'contested' ? '.warn' : it.stance === 'abandoned' ? '' : '.teal'), it.stance) : null, (it.relatedClaims || []).length ? h('span.pill.mag', '↔ ' + it.relatedClaims.length) : null,
        (IX.itemMentions.get(it.id) || []).length > 1 ? h('span.pill', plural((IX.itemMentions.get(it.id) || []).length, 'mention')) : null)), 'Mark a phrase as a claim with ' + keyLabel(settings().structKey)),
      h('div.sec-h', h('h2', 'Terms'), h('span.r', h('button.btn.sm', { on: { click: () => TermsView.importDialog(id) } }, 'Import from another project…'))),
      h('div.row', terms.map(t => h('a.btn.sm', { href: '#/lens/' + t.id }, h('span.term-demo', t.label), h('span.mono.tiny.muted', (IX.termOcc.get(t.id) || []).length), t.importedFrom ? h('span.pill.mag', 'imported') : null))));
  },
};
const ThemeView = {
  title: true,
  render(id) {
    const t = M.theme(id); if (!t) return h('div.page', h('div.empty', 'Theme not found'));
    const p = M.project(t.projectId), H = IX.themeHealth(t), docs = H.docs.sort((a, b) => b.modified.localeCompare(a.modified)), act = t.status === 'active';
    App.setTitle(t.name, [h('a', { href: '#/project/' + p.id }, p.name), h('span', 'theme' + (act ? '' : ' · ' + t.status))]);
    const q = h('textarea.inp', { rows: 2, value: t.question || '', disabled: !act, placeholder: 'The question this theme could plausibly answer…', on: { change: e => { t.question = e.target.value; DB.put('themes', t); } } });
    const lin = M.themeLineage(t), aims = DB.where('aims', a => a.themeId === id).sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1));
    const breaker = ReviewView.breaker && ReviewView.breaker(t);
    return h('div.page',
      h('div.eyebrow', h('a', { href: '#/project/' + p.id }, p.name), ' · theme'), h('h1.title', t.name), q,
      !act ? h('div.callout', { style: { marginTop: '10px' } }, h('b.h', 'This theme is ' + t.status), (t.supersededBy || []).length ? h('span', 'Continued in ', t.supersededBy.map(x => h('a', { href: '#/theme/' + x }, (M.theme(x) || {}).name + ' '))) : t.retireReason || '') : null,
      breaker ? h('div.callout.warn', { style: { marginTop: '10px' } }, h('b.h', 'Circuit breaker'), breaker, ' ', act ? h('button.btn.sm', { on: { click: () => reshapeDialog(t) } }, 'Re-shape it') : null) : null,
      h('div.row', { style: { margin: '12px 0' } }, act ? [h('button.btn.pri', { on: { click: () => App.newDoc({ projectId: p.id, themeId: id }) } }, '+ New note'), h('button.btn', { on: { click: () => newAimDialog(id) } }, '+ Aim'),
        h('button.btn', { on: { click: e => ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Lineage' }, { label: 'Re-shape…', sub: 'Rewrite as a smaller, more answerable question', run: () => reshapeDialog(t) },
          { label: 'Merge with…', run: () => pickModal('Merge “' + t.name + '” with…', 'Both are superseded by one new theme; documents stay where they are.', DB.where('themes', x => x.projectId === t.projectId && x.status === 'active' && x.id !== t.id).map(x => ({ label: x.name, run: async () => { const n = await askText('Merged theme name', 'Name', t.name); if (n) App.go('#/theme/' + M.mergeThemes(t, x, n).id); } }))) },
          { label: 'Split…', run: async () => { const n = await askText('Split theme', 'New theme names, one per line', '', { multiline: true }); if (n) M.splitTheme(t, n.split('\n').map(x => x.trim()).filter(Boolean)); } },
          { label: 'Retire', sub: 'A decision to stop, recorded', run: async () => { const r = await askText('Retire theme', 'Why (one line)'); if (r !== null) M.retireTheme(t, r); } }]) } }, 'Lineage ▾')] : null,
        h('button.btn', { on: { click: () => Exporter.theme(id) } }, 'Export read-only HTML')),
      h('div.tiles', tile(fmtDur(H.ms4), 'recorded · 4 wk'), tile(H.openB.length, 'open barriers', null, 'barrier'), tile(H.evid, 'results & evidence', null, 'result'), tile(H.days == null ? '—' : H.days + 'd', 'since last activity', H.stalled ? 'stalled — continue, re-shape or retire' : null)),
      h('div.two',
        h('div', h('div.sec-h', h('h2', 'Aims')), aims.length ? aims.map(a => aimEl(a)) : h('div.list', h('div.empty', 'No aim — this theme is exploratory by definition, which feeds the Explore lane.')),
          h('div.sec-h', h('h2', 'Activity'), h('span.k', '8 weeks')), heatmapEl({ weeks: 8, themeId: id, cell: 13 }),
          lin.length ? [h('div.sec-h', h('h2', 'Lineage')), h('div.list', lin.map(x => h('div.li.click', { on: { click: () => App.go('#/theme/' + x.t.id) } }, h('span.t', x.t.name, h('span.s', `generation ${x.gen} · ${x.t.status} ${fmtDay(x.t.supersededAt || x.t.created)}`)))))] : null),
        h('div', h('div.sec-h', h('h2', 'Notes'), h('span.k', docs.length)),
          h('div.list', docs.length ? docs.map(d => h('div.li.click', { on: { click: () => App.go('#/doc/' + d.id) } }, typechip(d.type), h('span.t', d.title, h('span.s', plural(M.liveBlocks(d.id).length, 'component'))), h('span.tiny.mono.muted', fmtWhen(d.modified)))) : h('div.empty', 'No notes yet')),
          H.openB.length ? [h('div.sec-h', h('h2', 'Open barriers')), capped(H.openB, 5, it => itemRow(it))] : null,
          (() => { const dec = DB.where('items', i => i.kind === 'decision' && H.docs.some(d => d.id === i.originDocId)).sort((a, b) => b.created.localeCompare(a.created)); return dec.length ? [h('div.sec-h', h('h2', 'Decision log')), capped(dec, 5, it => itemRow(it))] : null; })())));
  },
};
async function reshapeDialog(t) {
  const n = h('input.inp', { value: t.name }), q = h('textarea.inp', { rows: 2, value: t.question || '', placeholder: 'A smaller, more answerable question' });
  modal({ title: 'Re-shape theme', body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Not killed — re-shaped. The old theme is superseded and stays reachable; active aims and recent notes move to the new one.'), h('label.f', h('span', 'Name'), n), h('div', { style: { height: '8px' } }), h('label.f', h('span', 'Question'), q)),
    actions: [{ label: 'Cancel' }, { label: 'Re-shape', pri: true, run: () => { const x = M.reshapeTheme(t, n.value.trim() || t.name, q.value.trim()); App.go('#/theme/' + x.id); } }] });
}
VIEWS.portfolio = PortfolioView; VIEWS.project = ProjectView; VIEWS.theme = ThemeView;
