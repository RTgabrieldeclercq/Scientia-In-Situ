/* ==========================================================================
   17 · Activity — heatmap, theme small multiples, weekly numbers
   ========================================================================== */
const ActivityView = {
  render() {
    const themes = DB.where('themes', t => t.status === 'active'), weeks = IX.reviewWeeks().slice(0, 6);
    const rows = weeks.map(w => { const S = IX.weekStats(w.start); let unm = 0; S.perDay.forEach(D => { if (D.total === 0 && D.edits > 0) unm++; }); return { w, S, unm }; });
    App.setTitle('Activity', [h('span', 'presence, not progress')]);
    return h('div.page', h('div.eyebrow', 'Measured time'), h('h1.title', 'Activity'),
      h('p.stand', 'Presence, not progress — read it alongside barriers. Overlapping timers count once in the total; a day with edits and no timer is unmeasured, never empty.'),
      h('div.sec-h', h('h2', 'Ten weeks'), h('span.r', legendEl())), heatmapEl({ weeks: 10, cell: 18 }),
      h('div.sec'), h('div.sec-h', h('h2', 'By theme'), h('span.k', 'same scale · a gap three columns wide is a stalled theme')),
      h('div.cards', themes.map(t => h('div.card.flat', h('div.row', h('b', { style: { flex: 1, fontSize: '13px' } }, t.name), h('span.tiny.mono.muted', (M.project(t.projectId) || {}).name)), h('div', { style: { marginTop: '8px' } }, heatmapEl({ weeks: 10, themeId: t.id, cell: 11 }))))),
      h('div.sec'), h('div.sec-h', h('h2', 'Weekly numbers'), h('span.k', 'the accessible view of the chart')),
      h('div.list', h('table.t', h('thead', h('tr', h('th', 'Week'), h('th', 'Recorded'), h('th', 'Multitask (once)'), h('th', 'Manual'), h('th', 'Blocks · 90 min'), h('th', 'Planned'), h('th', 'Untimed active days'), h('th', 'Review'))),
        h('tbody', rows.map(({ w, S, unm }) => h('tr', h('td', `${fmtDay(w.start)} – ${fmtDay(w.end)}`), h('td', fmtDur(S.total)), h('td', S.multi ? fmtDur(S.multi) : '—'), h('td', S.manual ? fmtDur(S.manual) : '—'), h('td', (S.total / 54e5).toFixed(1)), h('td', (() => { const pr = DB.get('reviews', localDate(addDays(w.start, -7))); return pr && pr.alloc ? String(sum(Object.entries(pr.alloc).filter(([k]) => k !== '_slack').map(([, v]) => v.blocks || 0))) : '—'; })()),
          h('td', unm ? h('span.pill.warn', unm) : '—'), h('td', h('a', { href: '#/review/' + w.id }, w.status === 'complete' ? '✓ ' + (w.rv.impact ?? '') : w.status))))))));
  },
};
ActivityView.title = true; VIEWS.activity = ActivityView;

/* ==========================================================================
   18 · Search — relevance (link degree), recent, keyword; superseded
   results live in a separate side pop-out so the main list stays clean.
   ========================================================================== */
const Search = {
  sort: 'relevance', filter: 'all', q: '',
  open() {
    if ($('.ovl.search')) return;
    const inp = h('input', { placeholder: 'Search components, structures, notes, terms, library…', value: Search.q });
    const fl = h('div.fl'), res = h('div.res'), side = h('div.sidepop.hidden'); let sel = 0, hits = [];
    const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); };
    const go = x => { close(); x.go(); };
    const draw = () => {
      Search.q = inp.value; const r = Search.run(inp.value); hits = r.live;
      const views = settings().views || [];
      fl.replaceChildren(views.length ? h('div.views', h('span.tiny.mono.muted', 'views'), views.map((v, i) => h('button.vchip', { title: `${v.q} · ${v.filter} · ${v.sort}`, on: { click: () => { inp.value = v.q; Search.filter = v.filter; Search.sort = v.sort; draw(); }, contextmenu: e => { e.preventDefault(); saveSettings({ views: views.filter((_, j) => j !== i) }); draw(); } } }, v.name))) : null, h('div.seg', [['all', 'All'], ['component', 'Components'], ['structure', 'Structures'], ['note', 'Notes'], ['term', 'Terms'], ['library', 'Library']].map(([k, l]) => h('button' + (Search.filter === k ? '.on' : ''), { on: { click: () => { Search.filter = k; draw(); } } }, l))),
        h('span.spacer'), inp.value.trim() ? h('button.btn.xs', { title: 'Save this query, filter and sort as a named view (right-click a view to remove it)', on: { click: async () => { const n = await askText('Save view', 'Name', inp.value.trim()); if (n) { saveSettings({ views: [...(settings().views || []), { name: n, q: inp.value.trim(), filter: Search.filter, sort: Search.sort }] }); draw(); } } } }, '+ Save view') : null, h('span.tiny.mono.muted', 'sort'), h('div.seg', [['relevance', 'Relevance'], ['recent', 'Recent'], ['keyword', 'Keyword']].map(([k, l]) => h('button' + (Search.sort === k ? '.on' : ''), { on: { click: () => { Search.sort = k; draw(); } } }, l))));
      sel = clamp(sel, 0, Math.max(0, hits.length - 1));
      res.replaceChildren(...(hits.length ? hits.slice(0, 60).map((x, i) => Search.hitEl(x, i === sel, () => go(x))) : [h('div.empty', inp.value ? 'No matches' : 'Type to search. Results rank by how connected they are; switch to Recent or Keyword above.')]));
      side.classList.toggle('hidden', !r.old.length);
      side.replaceChildren(h('div.h', `Earlier versions · ${r.old.length}`, h('span.spacer'), h('span', { style: { textTransform: 'none', letterSpacing: 0 } }, 'superseded')), ...r.old.slice(0, 30).map(x => Search.hitEl(x, false, () => go(x))));
    };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'ArrowDown') { sel++; draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel--; draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); go(hits[sel]); }
    };
    inp.addEventListener('input', debounce(() => { sel = 0; draw(); }, 80));
    const ov = h('div.ovl.search', { on: { mousedown: e => { if (e.target === ov) close(); } } }, h('div.searchwrap', h('div.searchpanel', h('div.q', h('span.muted', '⌕'), inp, h('kbd', 'Esc')), fl, res), side));
    document.body.append(ov); document.addEventListener('keydown', key, true); draw(); setTimeout(() => { inp.focus(); inp.select(); }, 10);
  },
  hitEl(x, on, click) {
    return h('div.hit' + (on ? '.on' : ''), { on: { click } }, h('div.x', { html: x.html }), h('div.sc', x.badge, h('br'), Search.sort === 'relevance' ? `${x.deg} links` : Search.sort === 'recent' ? fmtWhen(x.t) : `${x.kw} hits`),
      h('div.p', x.path), x.ctx && x.ctx.length ? h('div.cx', x.ctx) : null);
  },
  run(q) {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
    const hl = t => { let s = esc(snippet(t, 200)); toks.forEach(k => { if (k.length > 1) s = s.replace(new RegExp('(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return s; };
    const score = t => { t = String(t || '').toLowerCase(); let n = 0; for (const k of toks) { const c = t.split(k).length - 1; if (!c) return 0; n += c; } if (toks.length > 1 && t.includes(q.toLowerCase())) n += 3; return n; };
    const F = Search.filter;
    if (!toks.length) return { live: [], old: [] };
    if (F === 'all' || F === 'component') for (const b of DB.all('blocks')) { if (b.status === 'removed') continue;
      const txt = (b.label ? b.label + ' — ' : '') + b.body.text, kw = score(txt); if (!kw) continue;
      const d = M.doc(b.docId); if (!d) continue;
      const ctx = [...IX.kindsOf(b).map(k => kchip(k)), ...IX.wiresOf(b.id).slice(0, 3).map(w => { const o = M.block(w.from === b.id ? w.to : w.from); return h('span.wchip', (w.from === b.id ? '→ ' : '← ') + (REL[w.rel] || {}).label + ' · ' + snippet(M.blockName(o), 26)); }), ...[...(IX.blockTerms.get(b.id) || [])].map(M.term).filter(Boolean).map(t => h('span.pill', t.label))];
      out.push({ kind: 'component', old: b.status === 'superseded', kw, deg: IX.degree(b.id) + IX.itemsOf(b.id).length, t: +new Date(b.modified || b.created), html: hl(txt), path: M.docPath(d) + ' › ' + M.blockName(b), badge: b.status === 'superseded' ? 'superseded' : 'component', ctx, go: () => App.openBlock(b.id) });
    }
    if (F === 'all' || F === 'structure') for (const it of DB.all('items')) {
      const kw = score(it.text); if (!kw) continue; const ob = M.block(it.originBlockId);
      out.push({ kind: 'structure', old: !!(ob && ob.status === 'superseded'), kw, deg: IX.degree(it.id) + (IX.refsOfItem.get(it.id) || []).length * 2 + (IX.resolutions.get(it.id) || []).length, t: +new Date(it.created), html: hl(it.text), path: M.docPath(M.doc(it.originDocId)), badge: KIND[it.kind].label + (IX.status(it) ? ' · ' + IX.status(it) : ''),
        ctx: [kchip(it.kind), ...((IX.refsOfItem.get(it.id) || []).length ? [h('span.pill.teal', 'in ' + plural((IX.refsOfItem.get(it.id) || []).length + 1, 'note'))] : [])], go: () => App.openBlock(it.originBlockId) });
    }
    if (F === 'all' || F === 'note') for (const d of DB.all('documents')) { const kw = score(d.title + ' ' + d.synthesis.text); if (kw) out.push({ kind: 'note', kw, deg: d.blockIds.length, t: +new Date(d.modified), html: hl(d.title), path: M.docPath(d), badge: prof(d.type).label, go: () => App.go('#/doc/' + d.id) }); }
    if (F === 'all' || F === 'term') for (const t of DB.all('terms')) { const kw = score(t.label); if (kw) out.push({ kind: 'term', kw: kw + 2, deg: (IX.termOcc.get(t.id) || []).length, t: +new Date(t.created), html: '<span class="term-demo">' + hl(t.label) + '</span>', path: (M.project(t.projectId) || {}).name + ' · term', badge: 'term', go: () => App.go('#/lens/' + t.id) }); }
    if (F === 'all' || F === 'library') for (const r of DB.all('library')) { const kw = score([r.title, r.container, r.year, ...(r.authors || []).map(a => a.family)].join(' ')); if (kw) out.push({ kind: 'library', kw, deg: (IX.citations.get(r.id) || []).length, t: +new Date(r.added), html: '<i>' + hl(r.title) + '</i>', path: LIB.shortRef(r) + (r.container ? ' · ' + LIB.journal(r.container) : ''), badge: 'library', go: () => App.go('#/library') }); }
    const cmp = { relevance: (a, b) => b.deg - a.deg || b.kw - a.kw || b.t - a.t, recent: (a, b) => b.t - a.t, keyword: (a, b) => b.kw - a.kw || b.deg - a.deg }[Search.sort];
    out.sort(cmp);
    return { live: out.filter(x => !x.old), old: out.filter(x => x.old) };
  },
};
