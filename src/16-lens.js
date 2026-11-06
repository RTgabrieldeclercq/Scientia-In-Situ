/* ==========================================================================
   14 · Terms & the lens — how a term's components chain together
   ========================================================================== */
const TermsView = {
  render() {
    const terms = DB.all('terms').map(t => { const occ = IX.termOcc.get(t.id) || [], ks = {};
      occ.forEach(o => o.itemIds.forEach(i => { const it = M.item(i); if (it) ks[it.kind] = (ks[it.kind] || 0) + 1; }));
      return { t, occ, ks, notes: new Set(occ.map(o => o.docId)).size, last: Math.max(0, ...occ.map(o => +new Date(M.blockTime(M.block(o.blockId)) || 0))) }; })
      .sort((a, b) => b.occ.length - a.occ.length);
    return h('div.page', h('div.eyebrow', 'Repository'), h('div.row', { style: { alignItems: 'baseline' } }, h('h1.title', 'Terms'), h('span.spacer'), h('button.btn.sm', { title: 'Look through every component in every note and mark each use of each term', on: { click: () => TERMSCAN.rescan() } }, '⟳ Rescan terms')),
      h('p.stand', `Mark a word or phrase with ${keyLabel(settings().termKey)} inside any note. Each term accumulates the structures it appears with — the claim it sat in, the barrier that sentence became, the resolution that closed it — with provenance.`),
      h('div.list', terms.length ? terms.map(({ t, occ, ks, notes, last }) => h('div.li.click', { on: { click: () => App.go('#/lens/' + t.id) } },
        h('span', { style: { width: '220px', flex: 'none', fontSize: '15px' } }, h('span.term-demo', t.label)),
        h('span.t', h('span.row', Object.entries(ks).map(([k, n]) => kchip(k, `${KIND[k].label} ${n}`))), h('span.s', `${(M.project(t.projectId) || { name: 'General' }).name} · ${plural(notes, 'note')} · ${plural(occ.length, 'occurrence')}${last ? ' · last ' + fmtWhen(last) : ''}`)),
        t.importedFrom ? h('span.pill.mag', 'imported') : null)) : h('div.empty', 'No terms yet')));
  },
  importDialog(projectId) {
    const m = modal({ title: 'Import a term into ' + M.project(projectId).name, actions: [{ label: 'Cancel' }], body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'An imported term stays linked to its source. In the lens, “include linked projects” chains occurrences across both.'),
      optionPicker({ placeholder: 'Search terms in other projects…', items: q => DB.where('terms', t => t.projectId !== projectId && (!q || t.label.toLowerCase().includes(q))),
        render: t => h('div', h('span.term-demo', t.label), h('span.s', (M.project(t.projectId) || { name: 'General' }).name + ' · ' + plural((IX.termOcc.get(t.id) || []).length, 'occurrence'))),
        onPick: t => { m.close(); M.importTerm(t.id, projectId); toast('Imported “' + t.label + '”'); } })) });
  },
};

const LensView = {
  canvas: true, title: true, state: {},
  render(termId) {
    const t = M.term(termId); if (!t) return h('div.canvas-host', h('div.empty-c', 'Term not found'));
    const st = LensView.state[termId] || (LensView.state[termId] = { scope: 'project', scopeId: t.projectId, imported: false });
    const occ = IX.termOcc.get(termId) || [], docs = [...new Set(occ.map(o => o.docId))].map(M.doc).filter(Boolean);
    const themes = [...new Set(docs.map(d => d.themeId).filter(Boolean))].map(M.theme).filter(Boolean);
    if (st.scope === 'theme' && !themes.find(x => x.id === st.scopeId)) st.scopeId = themes[0] && themes[0].id;
    if (st.scope === 'doc' && !docs.find(x => x.id === st.scopeId)) st.scopeId = (docs.find(d => prof(d.type).steps) || docs[0] || {}).id;
    if (st.scope === 'project') st.scopeId = t.projectId;
    const fam = M.termFamily(termId);
    const G = st.scopeId ? IX.termGraph(termId, st.scope, st.scopeId, st.imported) : { nodes: [], edges: [], insights: [] };
    LensView._G = G;
    const setScope = s => { st.scope = s; st.scopeId = s === 'project' ? t.projectId : s === 'theme' ? (themes[0] || {}).id : (docs.find(d => prof(d.type).steps) || docs[0] || {}).id; App._mounted = false; App.refresh(); };
    App.setTitle(t.label, [h('span', 'term lens · ' + (M.project(t.projectId) || { name: 'General' }).name), h('span', `${plural(docs.length, 'note')} · ${plural(occ.length, 'occurrence')} · ${plural(G.edges.filter(e => e.type !== 's').length, 'connection')}`), fam.length > 1 ? h('span.pill.mag', 'linked to ' + (fam.length - 1) + ' other project' + (fam.length > 2 ? 's' : '')) : null]);
    const host = h('div.canvas-host'), P = makePaper(host, { minZ: .25 });
    const B = LensView.board(G, st, t, P); P.world.append(B.el);
    const bar = h('div.lensbar.nopan',
      h('div.seg', [['project', 'Project · large'], ['theme', 'Theme · medium'], ['doc', 'Experiment · small']].map(([k, l]) => h('button' + (st.scope === k ? '.on' : ''), { on: { click: () => setScope(k) } }, l))),
      st.scope === 'theme' && themes.length ? h('select.inp', { on: { change: e => { st.scopeId = e.target.value; App._mounted = false; App.refresh(); } } }, themes.map(x => h('option', { value: x.id, selected: x.id === st.scopeId }, x.name))) : null,
      st.scope === 'doc' && docs.length ? h('select.inp', { on: { change: e => { st.scopeId = e.target.value; App._mounted = false; App.refresh(); } } }, docs.map(x => h('option', { value: x.id, selected: x.id === st.scopeId }, prof(x.type).label + ' · ' + x.title))) : null,
      fam.length > 1 ? h('label.switch', h('input', { type: 'checkbox', checked: st.imported, on: { change: e => { st.imported = e.target.checked; App._mounted = false; App.refresh(); } } }), 'chain across linked projects') : null,
      h('span.spacer'),
      h('button.btn.sm', { on: { click: () => { const others = DB.where('projects', p => p.id !== t.projectId); if (!others.length) return toast('No other project to import into'); pickModal('Import “' + t.label + '” into…', 'The imported term stays linked to this one, so the lens can chain across both projects.', others.map(p => ({ label: p.name, run: () => { M.importTerm(termId, p.id); toast('Imported into ' + p.name); } }))); } } }, 'Import into…'),
      h('button.btn.sm', { on: { click: () => Exporter.chain(termId, st) } }, 'Export chain'));
    const side = h('aside.insp.open.nopan.scrolly', h('button.ib.x', { title: 'Hide', on: { click: () => { side.classList.remove('open'); tog.hidden = false; } } }, '✕'), h('div.ins-h', h('div.k', 'What the wiring says'), h('div.tiny.muted', 'Inferred from directed connections between components that share this term.')),
      G.insights.length ? G.insights.map(i => h('div.insight' + (i.cls ? '.' + i.cls : ''), { on: { mouseenter: () => LensView.hl(i.path), mouseleave: () => LensView.hl([]), click: () => App.openBlock(i.path[i.path.length - 1]) } }, h('b', i.title), i.body))
        : h('div.empty', 'Connect components that use this term — chains, pivots and faulty assumptions surface here.'),
      h('div.ins-s', h('h6', 'Occurrences', h('span.muted', occ.length)), LensView.occList(occ)),
      B.legend, h('div.ins-s', h('h6', 'Key'), h('div.lkey', LensView.key('x', 'explicit connection'), LensView.key('r', 'pulled in / referenced'), LensView.key('v', 'via other components'), LensView.key('s', 'suggested — click to accept or dismiss'))));
    const tog = h('button.btn.sm.lenstog.nopan', { hidden: true, on: { click: () => { side.classList.add('open'); tog.hidden = true; } } }, 'What the wiring says');
    host.append(bar, side, tog); if (innerWidth < 820) { side.classList.remove('open'); tog.hidden = false; }
    requestAnimationFrame(() => { const [w, hh] = B.layout(); const sv = LensView._view && LensView._view[termId + st.scope + st.scopeId]; if (sv) { Object.assign(P.view, sv); P.apply(); } else { P.fit({ x0: 0, y0: 0, x1: Math.min(w, 2400) + (innerWidth < 820 ? 20 : 340), y1: Math.min(hh, 1400) + 60 }, false); if (P.view.z < .62) { P.view.z = .62; P.view.x = 24; P.view.y = 70; P.apply(); } if (innerWidth < 820) { P.view.y += 150; P.apply(); } } });
    P.o.onView = v => { (LensView._view = LensView._view || {})[termId + st.scope + st.scopeId] = { ...v }; };
    return host;
  },
  occList(occ) {
    const rows = occ.map(o => ({ o, b: M.block(o.blockId) })).filter(x => x.b).sort((a, b) => +new Date(M.blockTime(b.b)) - +new Date(M.blockTime(a.b)));
    return h('div', rows.slice(0, 40).map(({ o, b }) => { const d = M.doc(b.docId), th = d.themeId && M.theme(d.themeId), s = b.stamp.sessionId && M.session(b.stamp.sessionId);
      return h('div.occ', { on: { click: () => App.openBlock(b.id) } }, h('div.row', { style: { gap: '4px' } }, o.itemIds.map(M.item).filter(Boolean).map(it => kchip(it.kind)), o.direct ? null : h('span.pill', 'carried'), h('span.spacer'), h('span.mono.tiny.muted', fmtDay(M.blockTime(b)) + ' ' + fmtTime(M.blockTime(b)))),
        h('div', { style: { fontSize: '12.5px', fontWeight: 600 } }, M.blockName(b)), h('div.tiny.muted', prof(d.type).label + ' · ' + d.title + (th ? ' · ' + th.name : '') + (s ? ` · during timer +${fmtDur(b.stamp.offsetMs || 0)}` : b.manualSec ? ' · manual ' + fmtDur(b.manualSec * 1000) : ''))); }));
  },
  key(type, label) { const sw = { x: 'var(--mag)', r: 'var(--teal)', v: 'var(--mag)', s: 'var(--ink-3)' }[type], da = { x: '', r: '', v: '2 3', s: '6 4' }[type];
    return h('span.row', { style: { gap: '6px' }, html: `<svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="${sw}" stroke-width="1.6" stroke-dasharray="${da}"/></svg>${esc(label)}` }); },
  hl(path) { $$('.lbox').forEach(n => n.classList.toggle('hl', path.includes(n.dataset.id))); },
  TERMCOL: ['#E07A1F', '#3A6FE0', '#2E9E5B', '#B5179E', '#C9A227', '#0FA3B1'],
  termsIn: b => [...new Set(((b && b.body && b.body.marks) || []).filter(m => m.type === 'term' && m.ref).map(m => m.ref))],
  /** The lens as boxes: every component in full, under a header naming its note; lanes by theme or note, columns by day.
   *  Terms sitting in the same boxes are pulled in too, their connections drawn in their own colour. */
  board(G, st, t, P) {
    const el = h('div.lensboard'), svgNS = 'http://www.w3.org/2000/svg';
    if (!G.nodes.length) { el.append(h('div.empty', { style: { padding: '60px' } }, 'No occurrences in this scope.')); return { el, layout: () => [600, 300], legend: null }; }
    st.show = st.show || {};
    // terms that share boxes with this one, most shared first
    const share = new Map(); G.nodes.forEach(n => LensView.termsIn(n.b).forEach(id => { if (id !== t.id && M.term(id)) share.set(id, (share.get(id) || 0) + 1); }));
    const others = [...share.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 6);
    others.forEach((id, i) => { if (st.show[id] == null) st.show[id] = i < 3; });
    const color = id => id === t.id ? null : LensView.TERMCOL[others.indexOf(id) % LensView.TERMCOL.length];
    const nodes = new Map(), edges = [];
    G.nodes.forEach(n => nodes.set(n.id, { id: n.id, b: n.b, via: n.via, terms: new Set([t.id]) }));
    G.edges.forEach(e => edges.push(Object.assign({}, e, { term: t.id })));
    others.filter(id => st.show[id]).forEach(id => { const G2 = IX.termGraph(id, st.scope, st.scopeId, st.imported);
      G2.nodes.forEach(n => { const x = nodes.get(n.id); if (x) x.terms.add(id); else nodes.set(n.id, { id: n.id, b: n.b, via: n.via, terms: new Set([id]), second: true }); });
      G2.edges.forEach(e => edges.push(Object.assign({}, e, { term: id }))); });
    const list = [...nodes.values()].filter(n => n.b).map(n => Object.assign(n, { t: +new Date(M.blockTime(n.b)) })).sort((a, b) => a.t - b.t);
    const laneOf = n => { const d = M.doc(n.b.docId); if (st.scope === 'project') return d.projectId !== t.projectId ? 'P:' + d.projectId : (d.themeId || 'pw:' + d.projectId); if (st.scope === 'theme') return d.id; return d.id; };
    const laneName = k => k.startsWith('P:') ? 'Linked · ' + (M.project(k.slice(2)) || {}).name : k.startsWith('pw:') ? 'Project-wide' : (M.theme(k) ? M.theme(k).name : M.doc(k) ? M.doc(k).title : k);
    list.forEach(n => n.lane = laneOf(n)); const lanes = [...new Set(list.map(n => n.lane))];
    // boxes
    for (const n of list) {
      const d = M.doc(n.b.docId), kinds = IX.kindsOf(n.b), k = kinds[0], ed = h('div.ed.lb-ed'); ED.render(ed, n.b); ed.contentEditable = 'false';
      const tchips = LensView.termsIn(n.b).filter(id => M.term(id)).map(id => { const c = color(id); return h('button.lb-term' + (id === t.id ? '.main' : ''), { style: c ? { '--tc': c } : {}, title: id === t.id ? 'This term' : (st.show[id] ? 'Hide' : 'Show') + ' the connections of “' + M.term(id).label + '”', on: { click: e => { e.stopPropagation(); if (id === t.id) return; if (others.includes(id)) { st.show[id] = !st.show[id]; App._mounted = false; App.refresh(); } else App.go('#/lens/' + id); } } }, M.term(id).label); });
      const box = h('div.lbox.nopan' + (n.via ? '.via' : '') + (n.second ? '.second' : ''), { 'data-id': n.id, style: { '--kc': k ? `var(--k-${k})` : 'var(--rule-2)', '--tc': n.second ? color([...n.terms][0]) : null } },
        h('button.lb-h', { title: 'Open “' + d.title + '” at this component · Alt+click: beside', on: { click: e => { e.stopPropagation(); App.jump(n.id, e); } } }, typechip(d.type), h('span.lb-title', d.title), h('span.lb-go', '↗')),
        h('div.lb-meta', kinds.map(x => kchip(x)), n.via ? h('span.pill', 'via') : null, h('span.spacer'), h('span.mono.tiny.muted', fmtDay(n.t) + ' ' + fmtTime(n.t))),
        n.b.label ? h('div.lb-label', n.b.label) : null, ed,
        tchips.length ? h('div.lb-terms', tchips) : null,
        (() => { const rg = !n.second && REGION.of(n.id), peers = rg ? REGION.peers(n.id) : []; if (!peers.length) return null;
          return h('div.lb-region', { style: { '--rg': rg.r.color || REGION.COLORS[0] }, title: 'Secondary sources: the other components in the same region' }, h('div.lb-rh', '◰ ', h('b', rg.r.name), h('span', ' · same region · ' + plural(peers.length, 'secondary source'))),
            peers.slice(0, 6).map(p => h('a.lb-rm', { on: { click: e => { e.stopPropagation(); App.jump(p.id, e); } } }, IX.kindsOf(p)[0] ? kchip(IX.kindsOf(p)[0]) : null, ' ', h('b', M.blockName(p)), ' ', h('span', snippet(p.body.text || '', 70)))), peers.length > 6 ? h('div.tiny.muted', '+ ' + (peers.length - 6) + ' more') : null); })());
      box.addEventListener('click', e => { if (e.target.closest('.ln,.ct,.mx')) return; App.jump(n.id, e); });
      n.el = box; el.append(box);
    }
    const svg = document.createElementNS(svgNS, 'svg'); svg.classList.add('lb-wires'); el.prepend(svg);
    const legend = others.length ? h('div.ins-s', h('h6', 'Terms in the same boxes'), h('div.tiny.muted', { style: { marginBottom: '6px' } }, 'Their own connections are drawn in their colour.'),
      others.map(id => h('label.lb-leg', h('input', { type: 'checkbox', checked: !!st.show[id], on: { change: e => { st.show[id] = e.target.checked; App._mounted = false; App.refresh(); } } }), h('i', { style: { background: color(id) } }), h('span.term-demo', M.term(id).label), h('span.tiny.muted', plural(share.get(id), 'shared box')), h('a.tiny', { on: { click: e => { e.preventDefault(); App.go('#/lens/' + id); } } }, 'lens ↗')))) : null;
    const layout = () => {
      const BW = 300, GX = 64, LW = 150, TOP = 40, PADY = 18;
      let col = -1, colDay = null, used = new Set(); list.forEach(n => { const dd = localDate(n.t); if (dd !== colDay || used.has(n.lane)) { col++; colDay = dd; used = new Set(); } used.add(n.lane); n.col = col; });
      const laneH = lanes.map(l => Math.max(80, ...list.filter(n => n.lane === l).map(n => n.el.offsetHeight))), laneY = []; let y = TOP; lanes.forEach((l, i) => { laneY.push(y); y += laneH[i] + PADY * 2; });
      const W = LW + (col + 1) * (BW + GX) + 40, H = y;
      $$('.lb-lane,.lb-day', el).forEach(x => x.remove());
      lanes.forEach((l, i) => el.prepend(h('div.lb-lane' + (i % 2 ? '.alt' : ''), { style: { top: laneY[i] + 'px', height: laneH[i] + PADY * 2 + 'px', width: W + 'px' } }, h('span', snippet(laneName(l), 26)))));
      let prev = ''; list.forEach(n => { n.x = LW + n.col * (BW + GX); n.y = laneY[lanes.indexOf(n.lane)] + PADY; n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px'; n.el.style.width = BW + 'px';
        const dd = localDate(n.t); if (dd !== prev) { el.append(h('div.lb-day', { style: { left: n.x + 'px', height: H + 'px' } }, h('span', fmtDay(n.t)))); prev = dd; } });
      // wires: this term's in its usual inks, the others' in their colour
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      let html = '<defs>' + ['mag', 'teal', 'ink-3'].map(c => `<marker id="lm-${c}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--${c})"/></marker>`).join('') + others.map((id, i) => `<marker id="lm-t${i}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${color(id)}"/></marker>`).join('') + '</defs>';
      const pairN = {};
      edges.forEach((e, i) => { const a = nodes.get(e.from), b = nodes.get(e.to); if (!a || !b || !a.el || !b.el) return;
        const pk = [e.from, e.to].sort().join('|'), off = (pairN[pk] = (pairN[pk] || 0) + 1) - 1, oy = off * 7;
        const ah = a.el.offsetHeight, bh = b.el.offsetHeight, fwd = b.x > a.x + 10, back = b.x < a.x - 10;
        let d; if (fwd) { const x1 = a.x + BW, y1 = a.y + Math.min(40, ah / 2) + oy, x2 = b.x, y2 = b.y + Math.min(40, bh / 2) + oy; d = `M${x1},${y1} C${x1 + GX * .7},${y1} ${x2 - GX * .7},${y2} ${x2 - 2},${y2}`; }
        else if (back) { const x1 = a.x, y1 = a.y + 30 + oy, x2 = b.x + BW, y2 = b.y + 30 + oy; d = `M${x1},${y1} C${x1 - GX},${y1} ${x2 + GX},${y2} ${x2 + 2},${y2}`; }
        else { const down = b.y > a.y, x1 = a.x + BW - 30 - oy, y1 = down ? a.y + ah : a.y, x2 = b.x + BW - 30 - oy, y2 = down ? b.y : b.y + bh; d = `M${x1},${y1} C${x1 + 60},${y1 + (down ? 40 : -40)} ${x2 + 60},${y2 + (down ? -40 : 40)} ${x2},${y2 + (down ? -2 : 2)}`; }
        const main = e.term === t.id, oi = others.indexOf(e.term), stroke = main ? (e.type === 'r' ? 'var(--teal)' : e.type === 's' ? 'var(--ink-3)' : 'var(--mag)') : color(e.term), mk = main ? (e.type === 'r' ? 'lm-teal' : e.type === 's' ? 'lm-ink-3' : 'lm-mag') : 'lm-t' + oi;
        html += `<path class="lw ${e.type}${main ? '' : ' other'}" d="${d}" style="stroke:${stroke}" marker-end="url(#${mk})" data-ei="${i}"><title>${esc((main ? '' : '“' + M.term(e.term).label + '” · ') + (e.type === 's' ? 'suggested: ' + e.rel : e.type === 'v' ? 'via ' + (e.via || []).length + ' component(s)' : (REL[e.rel] || { label: e.rel || 'connection' }).label))}</title></path>`; });
      svg.innerHTML = html; el.style.width = W + 'px'; el.style.height = H + 'px';
      return [W, H];
    };
    svg.addEventListener('click', e => { const p = e.target.closest('path.lw.s'); if (p) { const ed = edges[+p.dataset.ei]; LensView.suggest(ed, e.clientX, e.clientY + 10); } });
    return { el, layout, legend };
  },
  svg(G, st, t) {
    const ns = 'http://www.w3.org/2000/svg';
    if (!G.nodes.length) return h('div.empty', { style: { padding: '60px' } }, 'No occurrences in this scope.');
    const laneOf = n => { const d = M.doc(n.b.docId); if (st.scope === 'project') return d.projectId !== t.projectId ? 'P:' + d.projectId : (d.themeId || 'pw:' + d.projectId); return d.id; };
    const laneName = k => k.startsWith('P:') ? 'Linked · ' + (M.project(k.slice(2)) || {}).name : k.startsWith('pw:') ? 'Project-wide' : (M.theme(k) ? M.theme(k).name : M.doc(k) ? M.doc(k).title : k);
    const nodes = G.nodes.map(n => Object.assign(n, { t: +new Date(M.blockTime(n.b)), lane: laneOf(n), kinds: IX.kindsOf(n.b) })).sort((a, b) => a.t - b.t);
    const lanes = [...new Set(nodes.map(n => n.lane))];
    const LW = 168, CW = 168, LH = 84, NW = 140, NH = 52, TOP = 34;
    let col = -1, colDay = null, used = new Set();
    nodes.forEach(n => { const dd = localDate(n.t); if (dd !== colDay || used.has(n.lane)) { col++; colDay = dd; used = new Set(); } used.add(n.lane); n.x = LW + 14 + col * CW; n.y = TOP + lanes.indexOf(n.lane) * LH + (LH - NH) / 2; });
    const W = LW + 28 + (col + 1) * CW, H = TOP + lanes.length * LH + 10;
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
    let html = '<defs><marker id="la" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mag)"/></marker><marker id="lt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--teal)"/></marker><marker id="lg" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink-3)"/></marker></defs>';
    lanes.forEach((l, i) => { html += `<g class="lane"><rect x="0" y="${TOP + i * LH}" width="${W}" height="${LH - 2}" opacity="${i % 2 ? 0.35 : 0.7}"/><text x="12" y="${TOP + i * LH + LH / 2 + 3}">${esc(snippet(laneName(l), 24))}</text></g>`; });
    let prevDay = ''; html += '<g class="ax">';
    nodes.forEach(n => { const dd = localDate(n.t); if (dd !== prevDay) { html += `<line x1="${n.x}" y1="${TOP - 6}" x2="${n.x}" y2="${H}"/><text x="${n.x + 3}" y="${TOP - 12}">${esc(fmtDay(n.t))}</text>`; prevDay = dd; } });
    html += '</g>';
    const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
    G.edges.forEach((e, i) => { const a = pos[e.from], b = pos[e.to]; if (!a || !b) return;
      const fwd = b.x >= a.x, x1 = fwd ? a.x + NW : a.x + NW / 2, y1 = fwd ? a.y + NH / 2 : a.y + NH, x2 = fwd ? b.x : b.x + NW / 2, y2 = fwd ? b.y + NH / 2 : b.y + NH;
      const c = fwd ? `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2 - 2},${y2}` : `M${x1},${y1} C${x1},${y1 + 50} ${x2},${y2 + 50} ${x2},${y2 + 2}`;
      const cls = e.type === 'r' ? 'e r' : 'e ' + e.type, mk = e.type === 's' ? 'lg' : e.type === 'r' ? 'lt' : 'la';
      html += `<path class="${cls}" d="${c}" marker-end="url(#${mk})" data-ei="${i}" ${e.type === 'r' ? 'style="stroke:var(--teal)"' : ''}><title>${esc(e.type === 's' ? 'suggested: ' + e.rel : e.type === 'v' ? 'via ' + e.via.length + ' component(s)' : (REL[e.rel] || { label: e.rel }).label)}</title></path>`; });
    nodes.forEach(n => { const k = n.kinds[0], d = M.doc(n.b.docId);
      html += `<g class="node${n.via ? ' via' : ''}" data-id="${n.id}" transform="translate(${n.x},${n.y})"><rect width="${NW}" height="${NH}" rx="6" ${k ? `style="stroke:var(--k-${k})"` : ''}/>` +
        (k ? `<rect width="4" height="${NH}" rx="2" style="fill:var(--k-${k});stroke:none"/>` : '') +
        `<text class="nk" x="10" y="14" style="fill:${k ? `var(--k-${k})` : 'var(--ink-3)'}">${esc(n.kinds.map(x => KIND[x].label).join(' · ') || (n.via ? 'via' : 'mention'))}</text>` +
        `<text x="10" y="30">${esc(snippet(M.blockName(n.b), 22))}</text><text x="10" y="44" style="fill:var(--ink-3);font-size:9.5px">${esc(snippet((PROFILE[d.type] || {}).label + ' · ' + d.title, 26))}</text></g>`; });
    svg.innerHTML = html;
    svg.addEventListener('click', e => {
      const n = e.target.closest('.node'); if (n) return App.openBlock(n.dataset.id);
      const p = e.target.closest('path.e.s'); if (p) { const ed = LensView._G.edges[+p.dataset.ei]; LensView.suggest(ed, e.clientX, e.clientY + 10); }
    });
    return svg;
  },
  suggest(ed, x, y) {
    const A = M.block(ed.from), B = M.block(ed.to);
    popover(x, y, [h('h5', 'Suggested connection'), h('div.serif', { style: { fontSize: '13.5px' } }, `“${snippet(M.blockName(A), 40)}” → “${snippet(M.blockName(B), 40)}”`),
      h('div.tiny.muted', { style: { margin: '6px 0 10px' } }, `Same term, ${ed.rel.replace('→', ' then ')}, ${Math.round((+new Date(M.blockTime(B)) - +new Date(M.blockTime(A))) / 864e5)} days apart, nothing connects them yet.`),
      h('div.row', RELATIONS.filter(r => ['leads', 'causes', 'resolves', 'supports'].includes(r.id)).map(r => h('button.btn.sm', { on: { click: () => { closePop(); M.wire(A.id, B.id, r.id, true); DB.put('verdicts', { id: ed.key, verdict: 'accepted', at: isoLocal(new Date()) }); toast('Connected'); } } }, r.label)),
        h('button.btn.sm.ghost', { on: { click: () => { closePop(); DB.put('verdicts', { id: ed.key, verdict: 'dismissed', at: isoLocal(new Date()) }); changed(); } } }, 'Dismiss'))]);
  },
  occTable(occ, st) {
    const rows = occ.map(o => ({ o, b: M.block(o.blockId) })).filter(x => x.b).sort((a, b) => +new Date(M.blockTime(b.b)) - +new Date(M.blockTime(a.b)));
    return h('div.list', h('table.t', h('thead', h('tr', h('th', 'When'), h('th', 'Structures'), h('th', 'Component'), h('th', 'Note · theme'), h('th', 'Context'))),
      h('tbody', rows.map(({ o, b }) => { const d = M.doc(b.docId), th = d.themeId && M.theme(d.themeId), s = b.stamp.sessionId && M.session(b.stamp.sessionId);
        return h('tr', { style: { cursor: 'pointer' }, on: { click: () => App.openBlock(b.id) } },
          h('td.mono', { style: { whiteSpace: 'nowrap', fontSize: '11.5px' } }, fmtDay(M.blockTime(b)), ' ', fmtTime(M.blockTime(b))),
          h('td', o.itemIds.map(M.item).filter(Boolean).map(it => kchip(it.kind)), o.direct ? null : h('span.pill', 'carried')),
          h('td', M.blockName(b)), h('td', h('span', typechip(d.type), ' ', d.title), h('div.tiny.muted', th ? th.name : 'project-wide')),
          h('td.tiny.muted', s ? `during timer · +${fmtDur(b.stamp.offsetMs || 0)}` : b.manualSec ? 'manual ' + fmtDur(b.manualSec * 1000) : 'stamped')); }))));
  },
};
VIEWS.terms = TermsView; VIEWS.lens = LensView;
