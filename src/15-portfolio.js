/* ==========================================================================
   15 · Portfolio — containment is coarse (project → theme → note, one home
   each); links cross freely.
   V3.988 (Gabe: "the portfolio look should be reorganized to not look like
   blocks, but be a relevant list of projects, that once opened, bring up the
   themes and notes (keep the dropdown system of experiments, the dots, the
   separation of types of notes: Lit Reviews, Experiments, general notes)";
   he chose design B): two panes. On the left the projects, most relevant
   first (activity in the last four weeks; or Recent, A–Z), and the notes
   outside any project. On the right the open project: its themes, each with
   its Experiments beside its other Notes, then the project-wide notes and its
   Lit reviews. A switch shows only Experiments, Notes or Lit reviews; chips
   narrow it to one theme. An experiment is one row that unfolds into its
   notes (PFKIT.prefs().exp, as before); the dots open onto their words; a
   note linked to others says ↔ and lights them up, in the list too. On a
   narrow screen the project slides in over the list.
   The lab layer gives the list its own groups and buttons (groups, meta,
   actions, foot, notePills, themePill).
   ========================================================================== */
const PortfolioView = {
  canvas: true, title: true, KEY: 'pf:view', _det: false, _shown: null, _scroll: null,
  st() { let s = null; try { s = _ls.get(PortfolioView.KEY, null); } catch (e) { } s = s && typeof s === 'object' ? s : {}; s.sort = s.sort || 'relevant'; s.type = s.type || 'all'; s.theme = s.theme && typeof s.theme === 'object' ? s.theme : {}; return s; },
  save(s) { try { _ls.set(PortfolioView.KEY, s); } catch (e) { } },
  /* ---------- what the list holds: the lab layer gives its own ---------- */
  /** Groups of rows: [{ key, head, sort, rows: [{ id, p (a project) | general: true, name, kick (above the name), lead (under the title), shut (muted), readOnly }] }] */
  groups() {
    return [{ key: 'projects', head: null, sort: true, rows: DB.all('projects').map(p => ({ id: p.id, p, name: p.name })) },
      { key: 'general', head: null, rows: [{ id: 'general', general: true, name: 'General', kick: 'Outside any project' }] }];
  },
  meta() { return plural(DB.all('projects').length, 'project') + ' · ' + plural(DB.where('themes', t => t.status === 'active').length, 'active theme') + ' · ' + plural(DB.where('documents', d => d.type !== 'review' && !d.deleted).length, 'note'); },
  /** The buttons beside the open project's title; redraw() draws it again (after its order changes). */
  actions(row, redraw) {
    if (row.general) return [h('button.btn.xs', { type: 'button', title: 'A note outside every project', on: { click: () => App.newDoc({ projectId: null }) } }, '+ Note')];
    const p = row.p;
    return [PFKIT.sortBtn(p.id, redraw), h('button.btn.xs', { type: 'button', title: 'A new note in this project', on: { click: () => App.newDoc({ projectId: p.id }) } }, '+ Note'),
      h('button.btn.xs', { type: 'button', on: { click: async () => { const n = await askText('New theme', 'A line of attack — a question you could plausibly answer'); if (n) M.createTheme(p.id, n); } } }, '+ Theme')];
  },
  /** Under the list. */
  foot() { return [h('button.btn.sm', { type: 'button', on: { click: async () => { const n = await askText('New project', 'Name'); if (n) M.createProject(n); } } }, '+ Project')]; },
  /** Small marks on a note's row (the lab marks one lab members can read). */
  notePills(d) { return null; },
  /** A theme's state beside its name. */
  themePill(t, H) { return H.stalled ? h('span.pill.warn', 'stalled ' + H.days + 'd') : H.aims.length ? h('span.pill.teal', plural(H.aims.length, 'aim')) : h('span.pill', 'exploratory'); },

  render() {
    const V = PortfolioView, L = PFLIST, s = V.st();
    App.setTitle('Portfolio', [h('span', V.meta())]);
    L.begin();
    const groups = V.groups().filter(g => g && g.rows && g.rows.length);
    groups.forEach(g => { if (g.sort) g.rows = L.order(g.rows, s.sort); });
    const rows = groups.flatMap(g => g.rows);
    let sel = rows.find(r => r.id === s.sel) || rows.find(r => r.p) || rows[0] || null;
    rows.forEach(r => L._rowDocs.set(r.id, new Set(L.info(r).docs.map(d => d.id))));
    const root = h('div.pf-root'), inn = h('div.pf-in' + (V._det ? '.det' : '')), ind = h('span.pf-ind', { 'aria-hidden': 'true' }), list = h('div.pf-rows', ind), det = h('section.pf-det', { 'aria-label': 'The open project' });
    const rowEls = [];
    const rowEl = r => { const I = L.info(r);
      const el = h('div.pf-row' + (r.shut ? '.shut' : ''), { role: 'button', tabindex: '0', 'data-row': r.id, 'aria-current': String(!!sel && r.id === sel.id), on: {
          click: () => pick(r, el),
          keydown: e => { if (e.target !== el) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r, el); }
            else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const all = $$('.pf-row', list), i = all.indexOf(el), n = all[i + (e.key === 'ArrowDown' ? 1 : -1)]; if (n) { n.focus(); n.click(); } } } } },
        r.kick ? h('span.pf-rk', { title: r.kick }, r.kick) : null, h('span.pf-rn', r.name),
        h('span.pf-rs', h('span', L.sub(r, I)), h('span.spacer'), PFKIT.heat(I.act.perDay, { weeks: 4, cell: 3 })), PFKIT.dots(I.docs));
      rowEls.push(el); return el; };
    groups.forEach(g => list.append(h('div.pf-grp', { 'data-g': g.key }, g.head ? h('div.pf-gh', g.head) : null, g.rows.map(rowEl))));
    const placeInd = () => { const r = rowEls.find(x => sel && x.dataset.row === sel.id); if (!r || !r.offsetHeight) { ind.style.height = '0px'; return; } ind.style.height = r.offsetHeight + 'px'; ind.style.transform = 'translateY(' + (r.offsetTop) + 'px)'; };
    const sortSeg = L.seg([['relevant', 'Most relevant'], ['recent', 'Recent'], ['az', 'A–Z']], s.sort, k => {
      const s2 = V.st(); s2.sort = k; V.save(s2); const first = new Map(rowEls.map(el => [el.dataset.row, el.getBoundingClientRect().top]));
      groups.forEach(g => { if (!g.sort) return; const box = $(`.pf-grp[data-g="${g.key}"]`, list); L.order(g.rows, k).forEach(r => { const el = rowEls.find(x => x.dataset.row === r.id); if (el) box.append(el); }); });
      placeInd(); L.flip(rowEls, first); }, 'The order of the projects');
    const scroll = h('div.pf-scroll', list);
    inn.append(h('aside.pf-list', { 'aria-label': 'Projects' }, h('div.pf-lh', h('span', 'Projects'), sortSeg), scroll, h('div.pf-foot', V.foot())), det);
    root.append(inn);
    const show = (r, animate) => { det.replaceChildren(r ? V.detail(r, () => App.refresh(), animate) : h('div.pf-body', h('div.pf-none', 'No projects yet — + Project'))); };
    function pick(r, el) {
      if (sel && r.id === sel.id) { inn.classList.add('det'); V._det = true; return; }
      const s2 = V.st(); s2.sel = r.id; V.save(s2); sel = r; V._shown = r.id;
      rowEls.forEach(x => x.setAttribute('aria-current', String(x.dataset.row === r.id))); placeInd();
      const swap = () => { show(r, true); det.scrollTop = 0; inn.classList.add('det'); V._det = true; };
      if (document.startViewTransition && !RM() && inn.offsetWidth > 720) {
        const nm = el.querySelector('.pf-rn'), ob = det.querySelector('.pf-body'); nm.style.viewTransitionName = 'pf-title'; if (ob) ob.style.viewTransitionName = 'pf-body';
        const vt = document.startViewTransition(() => { nm.style.viewTransitionName = ''; swap(); const nb = det.querySelector('.pf-body'), nt = det.querySelector('.pf-title'); if (nb) nb.style.viewTransitionName = 'pf-body'; if (nt) nt.style.viewTransitionName = 'pf-title'; });
        vt.finished.finally(() => { $$('.pf-body,.pf-title', det).forEach(x => { x.style.viewTransitionName = ''; }); nm.style.viewTransitionName = ''; });
      } else { swap(); const b = det.querySelector('.pf-body'); if (b && !RM()) b.classList.add('pf-swap'); }
    }
    const again = !!sel && V._shown === sel.id; V._shown = sel ? sel.id : null;
    show(sel, !again);
    // the same project drawn again (a change elsewhere): keep where both panes were scrolled
    const sc = again && V._scroll; if (sc) requestAnimationFrame(() => { scroll.scrollTop = sc.list || 0; det.scrollTop = sc.det || 0; });
    const keep = () => { V._scroll = { list: scroll.scrollTop, det: det.scrollTop }; };
    scroll.addEventListener('scroll', keep, { passive: true }); det.addEventListener('scroll', keep, { passive: true });
    requestAnimationFrame(() => { placeInd(); L.placeAll(); });
    try { if (V._ro) V._ro.disconnect(); V._ro = new ResizeObserver(() => { placeInd(); L.placeAll(); }); V._ro.observe(root); } catch (e) { }
    return root;
  },

  /** The open project: its title and buttons, the switch and the theme chips, then its notes. */
  detail(row, redraw, animate) {
    const V = PortfolioView, L = PFLIST, s = V.st(), I = L.info(row), P = I.parts, p = row.p;
    const items = h('div.pf-items'), th = () => (V.st().theme[row.id] || 'all');
    const fill = anim => { items.replaceChildren(...L.items(row, I, V.st().type, th())); if (anim && !RM()) { items.classList.remove('pf-enter'); void items.offsetWidth; items.classList.add('pf-enter'); } };
    const n = L.counts(I, th());
    const seg = L.seg([['all', 'All', n.all], ['exp', 'Experiments', n.exp], ['notes', 'Notes', n.notes], ['lit', 'Lit reviews', n.lit]], s.type, k => { const s2 = V.st(); s2.type = k; V.save(s2); fill(true); }, 'Which notes');
    const chips = P.themes.length > 1 ? h('div.pf-chips', { role: 'group', 'aria-label': 'Themes' }, [['all', 'All themes'], ...P.themes.map(t => [t.id, t.name])].map(([id, label]) => h('button.pf-chip', { type: 'button', title: label, 'aria-pressed': String(th() === id), on: { click: e => {
        const s2 = V.st(); s2.theme[row.id] = id; V.save(s2); $$('.pf-chip', chips).forEach(c => c.setAttribute('aria-pressed', String(c === e.currentTarget)));
        const c2 = L.counts(I, id); $$('button', seg).forEach(b => { const x = $('.c', b); if (x) x.textContent = c2[b.dataset.k]; }); fill(true); } } }, label))) : null;
    const A = I.act, ob = I.openB, stats = row.general ? [h('span', plural(I.docs.length, 'note') + ' outside any project')]
      : [h('span', plural(P.themes.length, 'theme') + ' · ' + plural(I.docs.length - P.lit.length, 'note') + (P.lit.length ? ' · ' + plural(P.lit.length, 'lit review') : '') + ' · ' + plural(ob, 'open barrier')), h('span', PFKIT.say({ act: A.score }))];
    const body = h('div.pf-body',
      h('button.pf-back', { type: 'button', on: { click: e => { const inn = e.currentTarget.closest('.pf-in'); if (inn) inn.classList.remove('det'); V._det = false; } } }, '‹ Projects'),
      h('div.eyebrow', row.kick || (row.general ? 'Outside any project' : 'Project')),
      h('div.pf-top', h('div.pf-tl', h('h2.pf-title', p ? h('a', { href: '#/project/' + p.id, title: 'Open the project page' }, row.name) : row.name), row.lead ? h('div.pf-lead', row.lead) : null,
        h('div.pf-stats', stats, L.when(A))), row.general ? null : PFKIT.heat(A.perDay, { weeks: 8, cell: 7 })),
      h('div.pf-acts', V.actions(row, redraw)),
      h('div.pf-ctl', seg, chips), items);
    fill(animate);
    return body;
  },
};

/** The Portfolio's working parts (V3.988). */
const PFLIST = {
  _info: new Map(), _links: new Map(), _rowDocs: new Map(), _segs: new Set(),
  begin() { PFLIST._info = new Map(); PFLIST._links = PFLIST.links(); PFLIST._rowDocs = new Map(); PFLIST._segs = new Set(); },
  isLit: d => PFKIT.isLit(d) || (typeof LITREV !== 'undefined' && LITREV.is(d)),
  isExp: d => !!(prof(d.type) || {}).stage && !PFKIT.isLit(d),
  /** A row's notes by section — its themes, then project-wide — and its lit reviews (a review linked to the project counts, wherever it is stored). */
  parts(row) {
    const live = d => !!d && !d.deleted && d.type !== 'review' && d.type !== 'day';
    if (row.general) { const G = GENERAL.docs().filter(live); return { themes: [], secs: [{ wide: true, bare: true, name: 'Outside any project', docs: G.filter(d => !PFLIST.isLit(d)) }], lit: G.filter(PFLIST.isLit) }; }
    const p = row.p, themes = DB.where('themes', t => t.projectId === p.id && t.status === 'active').sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const docs = DB.where('documents', d => d.projectId === p.id && live(d));
    const secs = themes.map(t => ({ t, name: t.name, docs: docs.filter(d => d.themeId === t.id && !PFLIST.isLit(d)) }));
    const wide = docs.filter(d => (!d.themeId || !M.theme(d.themeId)) && !PFLIST.isLit(d));   // a retired theme's notes stay on its page, as before
    if (wide.length || !themes.length) secs.push({ wide: true, name: 'Project-wide', docs: wide });
    const lit = docs.filter(PFLIST.isLit); if (typeof LITREV !== 'undefined') LITREV.of(p.id).forEach(d => { if (!lit.includes(d) && !d.deleted) lit.push(d); });
    return { themes, secs, lit };
  },
  /** What a row's list entry and page need, once a drawing. */
  info(row) {
    const I0 = PFLIST._info.get(row.id); if (I0) return I0;
    const parts = PFLIST.parts(row), docs = [...parts.secs.flatMap(c => c.docs), ...parts.lit];
    const act = row.general ? PFKIT.activity(docs) : PFKIT.ofProject(row.p.id), last = docs.map(d => String(d.modified || d.created || '')).sort().pop() || '';
    let openB = 0; if (!row.general) { try { openB = IX.openBarriers(row.p.id).length + (typeof CKINDS !== 'undefined' && CKINDS.counted ? CKINDS.counted(docs.map(d => d.id)).barrier.length : 0); } catch (e) { } }
    const I = { parts, docs, act, last, openB }; PFLIST._info.set(row.id, I); return I;
  },
  sub(row, I) { return row.general ? plural(I.docs.length, 'note') : plural(I.parts.themes.length, 'theme') + ' · ' + plural(I.docs.length, 'note'); },
  /** Most relevant: activity in the last four weeks (then the latest change); Recent: the latest change; A–Z. */
  order(rows, key) {
    const I = r => PFLIST.info(r), name = r => String(r.name || '').toLowerCase();
    const by = { recent: (a, b) => I(b).last.localeCompare(I(a).last) || name(a).localeCompare(name(b)), az: (a, b) => name(a).localeCompare(name(b)),
      relevant: (a, b) => (I(b).act.score - I(a).act.score) || I(b).last.localeCompare(I(a).last) || name(a).localeCompare(name(b)) }[key] || ((a, b) => 0);
    return rows.slice().sort(by);
  },
  /** Experiments (an experiment's notes as one entry, or a note of a staged type) and the other notes, of one section. */
  split(docs, order) { const E = PFKIT.entries(docs, order); return { exps: E.filter(e => e.docs || PFLIST.isExp(e.doc)), notes: E.filter(e => e.doc && !PFLIST.isExp(e.doc)) }; },
  counts(I, th) {
    let exp = 0, notes = 0; I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => { const S = PFLIST.split(c.docs, 'date'); exp += S.exps.length; notes += S.notes.length; });
    return { all: exp + notes + I.parts.lit.length, exp, notes, lit: I.parts.lit.length };
  },
  items(row, I, type, th) {
    const P = I.parts, order = row.p ? PFKIT.sortOf(row.p.id) : 'date', out = [], add = el => { el.style.setProperty('--i', out.length); out.push(el); };
    if (type !== 'lit') P.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => {
      const S = PFLIST.split(c.docs, order), pick = type === 'exp' ? S.exps : type === 'notes' ? S.notes : null;
      if (pick ? !pick.length : (!c.t && !c.docs.length && P.themes.length)) return;
      add(PFLIST.section(row, c, pick ? h('div.pf-flat', pick.map(e => PFLIST.entry(e, row))) : h('div.pf-groups', PFLIST.group('Experiments', S.exps, row, c), PFLIST.group('Notes', S.notes, row, c))));
    });
    if ((type === 'lit' || (type === 'all' && th === 'all')) && P.lit.length)
      add(h('div.pf-sec.pf-lit', h('div.pf-sh', h('span.pf-sn', 'Lit reviews'), h('span.pf-c', P.lit.length)), PFKIT.entries(P.lit, order).map(e => PFLIST.note(e.doc || e.docs[0], row))));
    if (!out.length) add(h('div.pf-none', type === 'lit' ? 'No lit review here yet' : th !== 'all' ? 'Nothing of this kind in this theme yet' : row.general ? 'Notes outside any project come here: meetings, seminars, broad ideas.' : 'No notes yet — + Note'));
    return out;
  },
  section(row, c, body) {
    const t = c.t, H = t ? IX.themeHealth(t) : null;
    if (c.bare) return h('div.pf-sec.pf-bare', { 'data-sec': 'wide' }, body);   // the notes outside any project: the page's title says it
    return h('div.pf-sec', { 'data-sec': t ? t.id : 'wide' },
      h('div.pf-sh', t ? h('a.pf-sn', { href: '#/theme/' + t.id, title: 'Open the theme' }, t.name) : h('span.pf-sn', c.name), t ? PortfolioView.themePill(t, H) : h('span.pf-c', plural(c.docs.length, 'note')),
        t ? h('span.pf-say', PFKIT.say(H)) : null, t && H.openB.length ? h('span.pf-ob', plural(H.openB.length, 'open barrier')) : null, h('span.spacer'), t && H.actMap ? PFKIT.heat(H.actMap, { weeks: 6, cell: 5 }) : null),
      t && t.question ? h('div.pf-q', snippet(t.question, 200)) : null, body);
  },
  group(label, E, row, c) {
    return h('div.pf-g', { 'data-g': label === 'Experiments' ? 'exp' : 'notes' }, h('div.pf-gl', h('span', label), h('span.pf-c', E.length)),
      E.length ? E.map(e => PFLIST.entry(e, row)) : h('div.pf-none', label === 'Experiments' ? 'No experiment yet' : 'No other notes'));
  },
  entry(e, row) { return e.docs ? PFLIST.exp(e, row) : PFLIST.note(e.doc, row); },
  linkedTo(id) { return [...(PFLIST._links.get(id) || [])].map(M.doc).filter(x => x && !x.deleted); },
  /** A note: its type (or stage), title, marks, links, dots and date. */
  note(d, row, stage) {
    const L = PFLIST.linkedTo(d.id), go = () => App.go('#/doc/' + d.id);
    let tail = null; if (row && row.general) { try { const T = GENERAL.touches(d); if (T.length) tail = 'touches ' + T.map(x => x.p.name).join(', '); } catch (e) { } } else if (typeof LITREV !== 'undefined' && LITREV.is(d)) tail = LITREV.line(d);
    const el = h('div.pf-n' + (stage ? '.stage' : ''), { role: 'link', tabindex: '0', 'data-doc': d.id, title: d.title || '', on: { click: go, keydown: e => { if (e.target === el && e.key === 'Enter') { e.preventDefault(); go(); } },
        mouseenter: () => PFLIST.light([d.id], true, el), mouseleave: () => PFLIST.light([d.id], false, el) } },
      stage ? h('span.pf-stg', prof(d.type).stage || prof(d.type).label) : typechip(d.type),
      h('span.pf-t', d.title || 'Untitled'), TIMER.activeFor(d.id) ? h('span.live', { title: 'Its timer is running' }, '●') : null, PortfolioView.notePills(d),
      L.length ? h('span.pf-lk', { title: 'Linked to ' + L.map(x => x.title).join(', ') }, '↔ ' + L.length) : null,
      tail ? h('span.pf-tail', tail) : null, h('span.spacer'), PFKIT.dots([d]), h('span.pf-d', { title: 'Its date · edited ' + fmtWhen(d.modified) }, fmtDay(d.created)));
    return el;
  },
  /** An experiment: one row (its name, stages, dots, dates); ▸ unfolds its notes, and it stays unfolded on this device. */
  exp(g, row) {
    const open = !!PFKIT.prefs().exp[g.chain], ids = g.docs.map(d => d.id), linked = ids.some(id => PFLIST.linkedTo(id).length), stop = e => e.stopPropagation();
    const wrap = h('div.pf-exp' + (open ? '.open' : ''), { 'data-chain': g.chain });
    const flip = () => { const now = !wrap.classList.contains('open'); wrap.classList.toggle('open', now); head.setAttribute('aria-expanded', String(now)); const s = PFKIT.prefs(); if (now) s.exp[g.chain] = true; else delete s.exp[g.chain]; PFKIT.save(s); };
    const head = h('div.pf-er', { role: 'button', tabindex: '0', 'aria-expanded': String(open), 'data-docs': ids.join(','), title: 'An experiment: ' + plural(g.docs.length, 'note'), on: {
        click: flip, keydown: e => { if (e.target === head && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(); } },
        mouseenter: () => PFLIST.light(ids, true, wrap), mouseleave: () => PFLIST.light(ids, false, wrap) } },
      h('div.pf-er1', h('span.pf-tog', '▸'), h('span.pill', 'Experiment'), h('span.pf-t', g.name || 'Experiment'), linked ? h('span.pf-lk', { title: 'Its notes link to others' }, '↔') : null,
        h('span.spacer'), PFKIT.dots(g.docs), h('span.pf-d', { title: 'From its first note to its last' }, fmtDay(g.docs[0].created) + (g.docs.length > 1 ? ' → ' + fmtDay(g.docs[g.docs.length - 1].created) : ''))),
      h('div.pf-stages', g.docs.map(d => h('a.pf-stage', { href: '#/doc/' + d.id, title: d.title, on: { pointerdown: stop, click: stop } }, prof(d.type).stage || prof(d.type).label))));
    wrap.append(head, h('div.pf-eb', h('div.pf-ei', g.docs.map((d, i) => { const n = PFLIST.note(d, row, true); n.style.setProperty('--i', i); return n; }))));
    return wrap;
  },
  /** Notes tied to others: wires, pulled-in components, protocol runs, link marks (both ways). */
  links() {
    const L = new Map(), add = (a, b) => { if (!a || !b || a === b) return; (L.get(a) || L.set(a, new Set()).get(a)).add(b); (L.get(b) || L.set(b, new Set()).get(b)).add(a); };
    DB.all('wires').forEach(w => { const A = M.block(w.from), B = M.block(w.to); if (A && B && A.docId !== B.docId) add(A.docId, B.docId); });
    DB.all('blocks').forEach(b => { if (b.status === 'removed') return; if (b.kind === 'ref') { const o = M.block(b.refBlockId); if (o) add(o.docId, b.docId); } if (b.boundTo) add(b.boundTo.protocolId, b.docId);
      ((b.body && b.body.marks) || []).forEach(m => { if (m.type === 'link' && m.ref) { try { const t = IX.linkTarget(m); if (t) add(b.docId, t.type === 'doc' ? t.d.id : t.b.docId); } catch (e) { } } }); });
    return L;
  },
  /** Hovering a note lights the notes it is tied to, and the projects in the list that hold them. */
  light(ids, on, from) {
    const root = from && from.closest('.pf-root'); if (!root) return; const T = new Set(); ids.forEach(id => (PFLIST._links.get(id) || []).forEach(x => T.add(x))); if (!T.size) return;
    $$('[data-doc],[data-docs]', root).forEach(el => { const mine = el.dataset.doc ? [el.dataset.doc] : el.dataset.docs.split(','); if (mine.some(x => T.has(x))) el.classList.toggle('lit', on); });
    $$('.pf-row', root).forEach(el => { const D = PFLIST._rowDocs.get(el.dataset.row); if (D && [...T].some(x => D.has(x))) el.classList.toggle('lit', on); });
  },
  when(A) {
    if (A.days == null) return h('span', 'no activity yet');
    if (A.days >= 21) return h('span.pill.warn', { title: 'No activity for ' + A.days + ' days' }, 'stalled ' + A.days + 'd');
    return h('span', { title: 'The last activity' }, A.days === 0 ? 'active today' : A.days === 1 ? 'active yesterday' : 'active ' + A.days + 'd ago');
  },
  /** A segmented switch whose dark pill slides to the choice. */
  seg(opts, cur, onPick, label) {
    const ind = h('span.pf-si', { 'aria-hidden': 'true' }), wrap = h('div.pf-seg', { role: 'group', 'aria-label': label || '' }, ind);
    const btns = opts.map(([k, text, count]) => { const b = h('button', { type: 'button', 'data-k': k, 'aria-pressed': String(k === cur), on: { click: () => { if (b.getAttribute('aria-pressed') === 'true') return;
        btns.forEach(x => x.setAttribute('aria-pressed', String(x === b))); place(); onPick(k); } } }, text, count != null ? h('span.c', String(count)) : null); wrap.append(b); return b; });
    const place = () => { const b = btns.find(x => x.getAttribute('aria-pressed') === 'true'); if (!b || !b.offsetWidth) return; ind.style.width = b.offsetWidth + 'px'; ind.style.transform = 'translateX(' + b.offsetLeft + 'px)'; };
    wrap._place = place; PFLIST._segs.add(wrap); requestAnimationFrame(place); return wrap;
  },
  placeAll() { PFLIST._segs.forEach(w => { if (!w.isConnected) { PFLIST._segs.delete(w); return; } w._place(); }); },
  flip(els, first) { if (RM()) return; els.forEach(el => { const a = first.get(el.dataset.row); if (a == null) return; const dy = a - el.getBoundingClientRect().top; if (Math.abs(dy) < 1) return;
    el.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }); }); },
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
      optionPicker({ placeholder: 'Search evidence, results, claims…', items: q => [   // V3.988: a Result component is evidence too
          ...DB.where('blocks', b => b.ckind === 'result' && b.status === 'live' && (!q || (M.blockName(b) + ' ' + ((b.body || {}).text || '')).toLowerCase().includes(q))).map(b => ({ block: b, created: b.created || '' })),
          ...DB.where('items', i => ['evidence', 'result', 'claim', 'takeaway'].includes(i.kind) && (!q || i.text.toLowerCase().includes(q))).map(i => ({ item: i, created: i.created || '' }))].sort((x, y) => String(y.created).localeCompare(String(x.created))),
        render: x => x.block ? h('div', h('span.pill', 'Result'), ' ', h('span.serif', snippet((x.block.body || {}).text || M.blockName(x.block), 80)), h('span.s', M.docPath(M.doc(x.block.docId))))
          : h('div', kchip(x.item.kind), ' ', h('span.serif', snippet(x.item.text, 80)), h('span.s', M.docPath(M.doc(x.item.originDocId)))),
        onPick: x => { mm.close(); M.meetMilestone(a.id, m.id, x.block ? { type: 'block', id: x.block.id } : { type: 'item', id: x.item.id }); } })) });
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
    const terms = DB.where('terms', t => t.projectId === id), pw = docs.filter(d => !d.themeId && d.type !== 'review' && !d.deleted && !PFKIT.isLit(d)), lits = docs.filter(d => !d.deleted && PFKIT.isLit(d));   // V3.975
    return h('div.page',
      h('div.eyebrow', 'Project'), h('h1.title', p.name),
      h('p.stand', `${plural(active.length, 'active theme')} · ${plural(docs.length, 'note')} · ${plural(IX.openBarriers(id).length, 'open barrier')} · ${plural(terms.length, 'term')}`),
      h('div.row', h('button.btn.pri', { on: { click: () => App.newDoc({ projectId: id }) } }, '+ New note'),
        h('button.btn', { on: { click: async () => { const n = await askText('New theme', 'A line of attack — a question you could plausibly answer'); if (n) M.createTheme(id, n); } } }, '+ Theme'),
        h('button.btn.ghost', { on: { click: async () => { const n = await askText('Rename project', 'Name', p.name); if (n) { p.name = n; DB.put('projects', p); changed(); } } } }, 'Rename'),
        p.rm || p.sharedFrom ? null : h('button.btn.ghost.danger.pv-del', { title: 'Delete the project: its notes stay (outside any project) or go with it — you choose', on: { click: () => EDIT.confirmProject(p) } }, 'Delete project…')),
      h('div.sec-h', h('h2', 'Themes'), h('span.k', 'health roster')),
      h('div.cards', active.map(t => { const H = IX.themeHealth(t);
        return h('div.card.click', { on: { click: () => App.go('#/theme/' + t.id) } },
          h('div.row', h('h4', { style: { flex: 1, margin: 0 } }, t.name), H.stalled ? h('span.pill.warn', 'stalled ' + H.days + 'd') : H.aims.length ? null : h('span.pill', 'exploratory')),
          h('p.serif.muted', { style: { margin: '4px 0 10px', fontSize: '13.5px' } }, t.question || '—'),
          PFKIT.heat(H.actMap, { weeks: 6, cell: 9 }),
          h('div.row.mono.tiny', { style: { marginTop: '10px', color: 'var(--ink-3)', gap: '14px' } }, h('span', PFKIT.say(H)), h('span', { style: { color: H.openB.length ? 'var(--bad)' : '' } }, plural(H.openB.length, 'open barrier')), h('span', plural(H.evid, 'result'))),
          H.aims.map(a => { const met = sum(a.milestones.filter(m => m.metAt).map(m => m.weight)); return h('div', { style: { marginTop: '8px' } }, h('div.tiny', snippet(a.statement, 60)), h('div.bar', h('i', { style: { width: met * 100 + '%' } }))); })); })),
      themes.some(t => t.status !== 'active') ? [h('div.sec-h', h('h2', 'Earlier themes'), h('span.k', 'retired, merged, split or re-shaped — documents still reachable')),
        h('div.list', themes.filter(t => t.status !== 'active').map(t => h('div.li.click', { on: { click: () => App.go('#/theme/' + t.id) } }, h('span.t', t.name, h('span.s', t.status + (t.supersededBy && t.supersededBy.length ? ' → ' + t.supersededBy.map(x => (M.theme(x) || {}).name).join(', ') : '') + (t.retireReason ? ' · ' + t.retireReason : ''))), h('span.tiny.mono.muted', fmtDay(t.supersededAt || t.retiredAt || t.created)))))] : null,
      lits.length ? [h('div.sec-h', h('h2', 'Lit reviews'), h('span.k', plural(lits.length, 'literature note') + ' in this project')),
        h('div.list', lits.map(d => h('div.li.click', { on: { click: () => App.go('#/doc/' + d.id) } }, typechip(d.type), h('span.t', d.title), h('span.tiny.mono.muted', fmtDay(d.created)))))] : null,
      pw.length ? [h('div.sec-h', h('h2', 'Project-wide & global notes'), h('span.k', 'protocols and seminars reused by every theme')),
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
      h('div.tiles', tile(H.act || 0, 'activity · 4 wk', 'notes in their first two weeks'), tile(H.openB.length, 'open barriers', null, 'barrier'), tile(H.evid, 'results & evidence', null, 'result'), tile(H.days == null ? '—' : H.days + 'd', 'since last activity', H.stalled ? 'stalled — continue, re-shape or retire' : null)),
      h('div.two',
        h('div', h('div.sec-h', h('h2', 'Aims')), aims.length ? aims.map(a => aimEl(a)) : h('div.list', h('div.empty', 'No aim — this theme is exploratory by definition, which feeds the Explore lane.')),
          h('div.sec-h', h('h2', 'Activity'), h('span.k', '8 weeks')), PFKIT.heat(PFKIT.activity(H.docs.filter(d => !d.deleted), 28, 56).perDay, { weeks: 8, cell: 13 }),   // V3.978: activity, as the project's
          lin.length ? [h('div.sec-h', h('h2', 'Lineage')), h('div.list', lin.map(x => h('div.li.click', { on: { click: () => App.go('#/theme/' + x.t.id) } }, h('span.t', x.t.name, h('span.s', `generation ${x.gen} · ${x.t.status} ${fmtDay(x.t.supersededAt || x.t.created)}`)))))] : null),
        h('div', h('div.sec-h', h('h2', 'Notes'), h('span.k', docs.length)),
          h('div.list', docs.length ? docs.map(d => { const A = PFKIT.noteAct(d);
            return h('div.li.click', { on: { click: () => App.go('#/doc/' + d.id) } }, typechip(d.type), h('span.t', d.title, h('span.s', plural(M.liveBlocks(d.id).length, 'component'))),
              PFKIT.isLit(d) ? null : h('span.tiny.mono' + (A.open ? '.th-act-open' : '.muted'), { title: A.open ? 'Its activity counts until ' + fmtDayLong(A.until) + ' (two weeks from its date)' : 'Its two weeks are over: what it scored stays in the record' }, 'activity ' + A.score + (A.open ? ' · open' : '')),
              h('span.tiny.mono.muted', fmtWhen(d.modified))); }) : h('div.empty', 'No notes yet')),
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
