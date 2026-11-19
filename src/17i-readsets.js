/* ==========================================================================
   17i · The Reader button and reading sets by project (V4.29 — Gabe: "Add a
   button in the top right corner, which is to open the Reader (responsible
   for PDFs, HTMLs, websites, and more). […] Your tabs are organized by
   projects, so you may have multiple reading sets opened at once. The
   current project you are in displays that reading set. Project reading
   sets overlap tabs from the same project, which act similar to regions.
   Other projects have their reading set region collapsed, Clicking on a
   collapsed region collapses the previous one while opening this one.
   Clicking close on the tab is the only way to close the PDF, HTML, etc…
   from that reading set. If you are opening the reader outside of a
   project, your most recent visit gets opened. This applies to projects
   too: the most recent visit from the project you're currently in is
   opened. If a paper is cited in multiple projects and is opened from a
   specific project, it may appear in both.")
   The reader beside a note (13zzb, its tabs and ◫ split; 17e's + and names)
   keeps its tabs by project:
   • A reading set per project (and one for notes outside any project). A
     tab belongs to the set of the note it was opened from; the same paper
     opened from two projects is a tab in both.
   • The tab row shows the set of the project you are in, its tabs together
     in a band of the project's colour (like a region of a note), and every
     other set folded into one chip: its project's name and its count. A
     chip clicked opens that set at the tab read last there; the open one
     folds. Going to a note of another project opens its set (Settings);
     a project with no set yet: the reader steps aside until you come back
     or press the Reader button.
   • Only × on a tab closes it. ✕ on the row, /close, leaving the note or
     the last tab of a set closed: the reader closes or steps aside, and
     every set keeps its tabs.
   • When each tab was last read, per set: the Reader button and a chip
     clicked open the most recent.
   • The Reader button (the book at the top right of every page): in a note,
     the set of its project at its most recent tab (none yet: the papers and
     pages of the project's notes to pick from); anywhere else, the last
     thing read — of the project selected (Portfolio, a project's or a
     theme's page), else of any — beside the note it was opened from (or,
     as Settings says, full screen there). Clicked while the reader is open,
     it closes it.
   The state stays on this device in `_ls 'rtabs'`, extended: sets { key:
   { tabs, at, from, show, act } } (key = the project's id, or '-'), cur (the
   set shown), mode ('sets' | 'flat'). RDOCK.S.tabs is the set shown, so
   13zzb's tabs, panes and split work on it unchanged. The tabs kept before
   V4.29 go once each into the set of its note's project. Feature off: one
   flat row of every set's tabs, as before.
   Wrapped: RDOCK.load / save / open / focus / close / closeTab / follow /
   tabsRow / layout, RDX.goTab, DocView.render.
   ========================================================================== */
const RSET = {
  NONE: '-',
  lastCtx: null, _closingTab: false, _full: null,
  on: () => !!RDOCK.tabsOn() && RDOCK.ftOn('rsets'),
  btnOn: () => !!RDOCK.tabsOn() && RDOCK.ftOn('rbtn'),
  followOn: () => RDOCK.tn('rsets', 'follow', true) !== false,
  /** Sets are in use now (the feature on, and the state loaded as sets). */
  live: () => RSET.on() && RDOCK.S_.mode === 'sets',
  /** A note's set: its project's id, or '-' (no project). */
  keyOf: d => d && d.projectId && M.project(d.projectId) ? d.projectId : RSET.NONE,
  keyOfBlock: id => { const b = M.block(id); return RSET.keyOf(b && M.doc(b.docId)); },
  /* V4.38 (Gabe: "Papers that are not assigned a project get assigned to a project based on the greatest number of appearance in a
     project out of all of them … Right now, all papers open in Auto In-Vitro so project assignment is not working properly"). A
     paper read from the Library sits on its literature note (17b litDoc), made in READER.project() — the first project unless one
     was chosen — so every such paper fell in that project's set. Now: */
  /** The reader's own literature note of a Library paper: its project was only a default, never an assignment. */
  auto: d => !!d && d.type === 'literature' && !!d.libId && !d.review,
  /** Where a paper or page appears, by project: its cards in notes, the components that cite it (/cite), bridge it in or quote it. */
  appears(b) {
    const A = new Map(), seen = new Set(), add = x => { if (!x || seen.has(x.id)) return; seen.add(x.id); const d = M.doc(x.docId); if (!d || d.deleted || RSET.auto(d)) return; const k = RSET.keyOf(d); if (k !== RSET.NONE) A.set(k, (A.get(k) || 0) + 1); };
    const lib = typeof RDX !== 'undefined' && RDX.libOf ? RDX.libOf(b) : null;
    const es = lib ? RDX.embedsOf(lib) : DB.where('blocks', x => RDOCK.KINDS[x.kind] && x.status === 'live' && !!x.media && x.media === b.media); if (!es.some(x => x.id === b.id)) es.push(b);
    es.forEach(add); if (lib) { try { RDX.citedIn(lib).forEach(r => add(r.b)); } catch (e) { } }
    const eid = new Set(es.map(x => x.id)); DB.where('blocks', x => x.status === 'live' && x.quote && eid.has(x.quote.src)).forEach(add);
    return A;
  },
  /** A paper's project: the note it is a card in, when that note is in a project (not the reader's own literature note); else the project it appears in most (none: null). */
  home(b, A) {
    const d = b && M.doc(b.docId); if (d && !RSET.auto(d) && d.projectId && M.project(d.projectId)) return d.projectId;
    let best = null, n = 0; (A || RSET.appears(b)).forEach((c, k) => { if (c > n) { best = k; n = c; } }); return best;
  },
  /** Once (V4.38): tabs that went into a set they do not belong to (it does not appear in that project, and it has a home elsewhere) move to their home. */
  rehome(S) {
    if (!S || S.mode !== 'sets' || !S.sets) return 0; RSET.sync(S); let moved = 0;
    Object.keys(S.sets).forEach(k => { const x = S.sets[k]; x.tabs.slice().forEach(id => { const b = M.block(id); if (!b) return; const A = RSET.appears(b), home = RSET.home(b, A);
      if ((k !== RSET.NONE && A.get(k)) || !home || home === k) return;
      const y = RSET.set(home, S); if (!y.tabs.includes(id)) { y.tabs.push(id); y.at[id] = x.at[id] || 0; y.from[id] = x.from[id] || b.docId; }
      x.tabs = x.tabs.filter(t => t !== id); delete x.at[id]; delete x.from[id]; x.show = (x.show || []).map(v => v === id ? null : v); moved++; }); });
    if (moved) { if (!RSET.tabsOf(S.cur, S).length) { const k2 = RSET.lastSet(S); if (k2) S.cur = k2; } RSET.fill(S); }
    return moved;
  },
  /** The note in focus (a split: the pane last touched), or null on a page that isn't a note. */
  ctxDoc() { const ps = App.panes(); if (!ps.length) return null; const p = ps.includes(App.pane) ? App.pane : ps[0]; return M.doc(p.docId) || null; },
  ctxKey() { const ps = App.panes(); return ps.length ? RSET.keyOf(RSET.ctxDoc()) : null; },
  name: k => k === RSET.NONE ? 'No project' : ((M.project(k) || {}).name || 'A project'),
  hue: k => k === RSET.NONE ? null : hashHue(k),
  blank: () => ({ tabs: [], at: {}, from: {}, show: [], act: 0 }),
  set(k, S = RDOCK.S_) { S.sets = S.sets || {}; return S.sets[k] || (S.sets[k] = RSET.blank()); },
  tabsOf: (k, S = RDOCK.S_) => k === S.cur ? S.tabs : ((S.sets || {})[k] || { tabs: [] }).tabs.filter(RDOCK.live),
  /** When a set was last read (its most recent tab), and that tab. */
  last(k, S = RDOCK.S_) { const x = (S.sets || {})[k]; if (!x) return 0; return Math.max(0, ...RSET.tabsOf(k, S).map(id => x.at[id] || 0)); },
  recent(k, S = RDOCK.S_) { const x = (S.sets || {})[k]; if (!x) return null; return RSET.tabsOf(k, S).slice().sort((a, b) => (x.at[b] || 0) - (x.at[a] || 0))[0] || null; },
  lastSet(S = RDOCK.S_) { return Object.keys(S.sets || {}).filter(k => RSET.tabsOf(k, S).length).sort((a, b) => RSET.last(b, S) - RSET.last(a, S))[0] || null; },
  /** The sets on the row: those with tabs and the one shown — projects in the Portfolio's order, no project last. */
  keys(S = RDOCK.S_) {
    const has = k => k === S.cur || RSET.tabsOf(k, S).length > 0, out = DB.all('projects').map(p => p.id).filter(has);
    if (has(RSET.NONE)) out.push(RSET.NONE); if (S.cur && !out.includes(S.cur)) out.push(S.cur); return out;
  },
  /* ---------- the state ---------- */
  /** RDOCK.load's state, given its sets (13zzb read the shown set's tabs, filtered to what is still there). */
  adopt(S, t) {
    const norm = x => { x = Object.assign(RSET.blank(), x && typeof x === 'object' ? x : {}); x.tabs = [...new Set((Array.isArray(x.tabs) ? x.tabs : []).filter(RDOCK.live))]; x.at = Object.assign({}, x.at); x.from = Object.assign({}, x.from); x.show = Array.isArray(x.show) ? x.show.slice() : []; x.act = +x.act || 0; return x; };
    const sets = {}; Object.entries(t.sets && typeof t.sets === 'object' ? t.sets : {}).forEach(([k, x]) => {
      const n = norm(x), key = k === RSET.NONE || M.project(k) ? k : RSET.NONE;   // a project deleted since: its tabs join "no project"
      if (!sets[key]) sets[key] = n; else { n.tabs.forEach(id => { if (!sets[key].tabs.includes(id)) { sets[key].tabs.push(id); sets[key].at[id] = n.at[id]; sets[key].from[id] = n.from[id]; } }); } });
    S.sets = sets; S.cur = typeof t.cur === 'string' ? (t.cur === RSET.NONE || M.project(t.cur) ? t.cur : RSET.NONE) : null;
    if (t.mode === 'sets' && S.cur) RSET.set(S.cur, S).tabs = S.tabs.slice();   // what was saved as the row is the shown set, as it was last
    if (!RSET.on()) {   // off: one flat row of every set's tabs — the one shown first, then by when last read
      if (t.mode === 'sets') { const flat = []; [S.cur, ...Object.keys(sets).filter(k => k !== S.cur).sort((a, b) => RSET.last(b, S) - RSET.last(a, S))].forEach(k => ((sets[k] || {}).tabs || []).forEach(id => { if (!flat.includes(id)) flat.push(id); }));
        S.tabs = flat; S.show = S.show.map(x => x && flat.includes(x) ? x : null); if (!S.show.some(Boolean) && flat.length) S.show[0] = flat[0]; }
      S.mode = 'flat'; return S;
    }
    if (t.mode !== 'sets') {   // the first time (the tabs kept before V4.29), or the switch on again: each tab into the set of its note's project; one in a set already stays there
      const flat = S.tabs.slice(), inSet = new Set(), now = Date.now();
      Object.values(sets).forEach(x => { x.tabs = x.tabs.filter(id => flat.includes(id)); x.tabs.forEach(id => inSet.add(id)); });
      flat.forEach((id, i) => { if (inSet.has(id)) return; const b = M.block(id), k = RSET.home(b) || RSET.keyOf(M.doc(b.docId)), x = sets[k] || (sets[k] = RSET.blank()); x.tabs.push(id); x.from[id] = b.docId; x.at[id] = x.at[id] || now - (flat.length - i) * 1000; });
      const shown = S.show[S.act] || S.show.find(Boolean); if (shown) { const k = RSET.keyOfBlock(shown); RSET.set(k, S).at[shown] = now; S.cur = k; }
    }
    S.mode = 'sets';
    if (!S.cur) S.cur = RSET.lastSet(S) || RSET.NONE;
    RSET.decide(S); RSET.fill(S);
    S.open = !!t.open && Object.keys(sets).some(k => RSET.tabsOf(k, S).length);
    return S;
  },
  /** The note in focus came from another project than the last one: its set is the one shown (Settings). */
  decide(S) { const k = RSET.ctxKey(); if (k == null || k === RSET.lastCtx) return false; RSET.lastCtx = k; if (!RSET.followOn() || S.cur === k) return false; S.cur = k; return true; },
  /** The shown set into the row: its tabs, what each pane showed (else its most recent tab), the pane in focus. */
  fill(S) {
    const x = RSET.set(S.cur, S); S.tabs = x.tabs.filter(RDOCK.live); const n = S.n || 1;
    S.show = Array.from({ length: n }, (_, j) => { const id = x.show[j]; return id && S.tabs.includes(id) ? id : null; });
    if (!S.show.some(Boolean) && S.tabs.length) S.show[0] = RSET.recent(S.cur, S);
    S.act = clamp(x.act || 0, 0, n - 1); if (!S.show[S.act]) S.act = Math.max(0, S.show.findIndex(Boolean));
  },
  /** The row back into its set (what 13zzb changed: the tabs, the panes, the focus). */
  sync(S = RDOCK.S) {
    if (!S || S.mode !== 'sets' || !S.cur) return; const x = RSET.set(S.cur, S); x.tabs = S.tabs.slice(); x.show = (S.show || []).slice(); x.act = S.act || 0;
    Object.keys(x.at).forEach(id => { if (!x.tabs.includes(id)) delete x.at[id]; }); Object.keys(x.from).forEach(id => { if (!x.tabs.includes(id)) delete x.from[id]; });
  },
  /** Show set k: its tabs in the row, the panes as it left them (else its most recent tab); `quiet`: the state only. A set with no tab: the empty set (`empty`) or the reader steps aside. */
  use(k, o = {}) {
    const S = RDOCK.S_; if (!RSET.live()) return; RSET.sync(S); S.cur = k; RSET.set(k, S); RSET.fill(S); RDOCK.save();
    if (o.quiet || !RDOCK.wrap) return;
    if (!S.tabs.length) return o.empty ? RSET.showEmpty() : RDOCK.close(true);
    const full = RDOCK.panes.some(p => p && p.full); RDOCK.remount(); if (full) RSET.refull();
  },
  /** A pane was in full screen when the set changed: the pane in focus is again (V4.30 keeps the maximised view). */
  refull() { const p = RDOCK.st || RDOCK.panes.find(Boolean); if (p && !p.full) RDOCK.full(p); },
  /** The set a paper being opened goes in (V4.38): the set of the project you are in — the note's, or from the reader itself the set
      shown — when the paper appears in that project (cited, embedded, quoted, bridged there: a paper of two projects is in both);
      otherwise its own project (RSET.home: its note's, else where it appears most); a paper that appears in no project stays where you
      are. A tab of the set shown, from a menu or a key, stays in it. */
  target(b) {
    const S = RDOCK.S_, ev = window.event, t = ev && ev.target && ev.target.closest ? ev.target : null, fromReader = !!(t && t.closest('.rd-wrap, .rs-lib, .rs-maxrow, .ovl'));
    let ctx = fromReader ? S.cur : RSET.ctxKey(); if (ctx == null) ctx = S.cur;
    if (!fromReader && ctx !== S.cur && S.tabs.includes(b.id) && !(t && t.closest('.canvas-host, .embed-max:not(.rd-dock), .nav'))) return S.cur;   // a tab of the set shown, from a menu or a key
    const A = RSET.appears(b), home = RSET.home(b, A);
    if (ctx && ctx !== RSET.NONE && (A.get(ctx) || home === ctx)) return ctx;
    return home || ctx || RSET.NONE;
  },
  /** Going to a note: the set of its project, when the project changed (Settings). */
  follow() {
    RSET.paintBtn(); if (!RSET.live() || RDOCK.phone()) return; const S = RDOCK.S_, k = RSET.ctxKey(); if (k == null || k === RSET.lastCtx) return RSET.later();
    RSET.lastCtx = k; if (!RSET.followOn() || S.cur === k) return RSET.later();
    if (RDOCK.wrap) RSET.use(k);
    else { RSET.use(k, { quiet: true }); if (S.open && S.tabs.length && App.panes().length) { RDOCK.mount(); RDOCK.remount(); } }
    RSET.later();
  },
  /** After the Reader button took you to a note: full screen there, as Settings says. */
  later() { const id = RSET._full; if (!id) return; RSET._full = null; setTimeout(() => { const p = RDOCK.paneOf(id); if (p && !p.full) RDOCK.full(p); }, 120); },
  /** A chip clicked: that set opens (the one open folds), at the tab read last there. */
  pick(k) { if (!RSET.live() || k === RDOCK.S_.cur) return; RSET.use(k, { empty: true }); RSET.paintBtn(); },
  /* ---------- the row ---------- */
  band(k, tabs) {
    const hu = RSET.hue(k), n = tabs.length;
    return h('div.rs-set.rs-open' + (hu == null ? '.rs-none' : ''), { 'data-set': k, style: hu == null ? {} : { '--rs-h': String(hu) }, title: 'The reading set of ' + RSET.name(k) + ' — ' + (n ? plural(n, 'tab') + ', opened from its notes' : 'no tab yet') },
      h('span.rs-nm', RSET.name(k)), ...tabs);
  },
  chip(k) {
    const hu = RSET.hue(k), n = RSET.tabsOf(k).length;
    return h('button.rs-chip' + (hu == null ? '.rs-none' : ''), { type: 'button', 'data-set': k, style: hu == null ? {} : { '--rs-h': String(hu) }, title: RSET.name(k) + ' · ' + plural(n, 'tab') + '\nClick: open this reading set (the one open folds)', 'aria-label': 'Open the reading set of ' + RSET.name(k),
      on: { click: e => { e.stopPropagation(); RSET.pick(k); } } }, h('span.rs-nm', RSET.name(k)), h('span.rs-n', String(n)));
  },
  /** 13zzb drew the shown set's tabs: they go in their project's band, every other set folds into a chip. */
  paintRow(row) {
    if (!row || !RSET.live()) return; const S = RDOCK.S_, tl = $('.rd-tl', row); if (!tl) return;
    row.classList.add('rs-row'); row.classList.toggle('rs-plain', RDOCK.tn('rsets', 'tint', true) === false);
    const tabs = [...tl.children].filter(x => x.classList.contains('rd-tab'));
    tl.replaceChildren(...RSET.keys(S).map(k => k === S.cur ? RSET.band(k, tabs) : RSET.chip(k)));
    const x = $('.rd-tclose', row); if (x) x.title = 'Close the reader — your tabs stay in their sets';
    const on = $('.rd-tab.act', tl); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },
  /** The reader open on a set with no tab yet: what to read from this project's notes, and +. */
  showEmpty() {
    const S = RDOCK.S_; S.open = true; RDOCK.mount();
    [...RDOCK.panes.keys()].forEach(j => RDOCK.unmount(j, true)); RDOCK.panes = []; RDOCK.st = null; DOCS._max = null;
    S.tabs = []; S.n = 1; S.show = [null]; S.act = 0;
    $('.rd-panes', RDOCK.wrap).replaceChildren(RSET.emptyEl()); RDOCK.layout(); RDOCK.tabsRow(); RDOCK.save();
  },
  /** The papers and pages embedded in the notes of set k, newest first. */
  picks(k, max = 6) {
    const seen = new Set();
    return DB.where('blocks', b => RDOCK.KINDS[b.kind] && b.status === 'live' && MEDIA.get(b.media) && M.doc(b.docId) && !M.doc(b.docId).deleted && RSET.keyOf(M.doc(b.docId)) === k)
      .sort((a, z) => (z.modified || z.created || '').localeCompare(a.modified || a.created || '')).filter(b => !seen.has(b.media) && seen.add(b.media)).slice(0, max);
  },
  emptyEl() {
    const S = RDOCK.S_, k = S.cur, picks = RSET.picks(k), others = RSET.keys(S).filter(x => x !== k).length;
    return h('div.rd-empty.rs-empty', { 'data-pane': '0' }, h('div.rd-empty-in', h('span.rs-eic', { html: RDOCK.BOOK }), h('b', 'Nothing open in ' + RSET.name(k) + ' yet'),
      h('div.tiny.muted', picks.length ? 'The papers and pages in ' + (k === RSET.NONE ? 'your notes outside any project' : 'this project’s notes') + ':' : 'Open one with the book on a PDF or page card, or pick one:'),
      picks.length ? h('div.rd-elist', picks.map(b => h('button.rd-eopt', { type: 'button', title: 'Read it here — a tab of this set', on: { click: () => RDOCK.open(M.block(b.id)) } }, h('span.rd-tk', b.kind === 'pdf' ? 'PDF' : 'Page'), h('span.rs-et', RDOCK.label(b)), h('span.rs-en', (M.doc(b.docId) || {}).title || '')))) : null,
      h('button.btn.xs', { type: 'button', on: { click: e => RDOCK.picker(e) } }, '+ Open a paper or page…'),
      others ? h('div.tiny.muted', 'Or open another project’s reading set above.') : null));
  },
  /* ---------- the Reader button ---------- */
  btn: null,
  paintBtn() {
    const b = RSET.btn; if (!b) return; const show = RSET.btnOn() && !RDOCK.phone(), open = !!RDOCK.wrap;
    b.hidden = !show; b.classList.toggle('on', open); b.setAttribute('aria-pressed', String(open));
    b.title = open ? 'Reader — close it (your tabs stay)' : 'Reader';
  },
  /** The project of the page you are on (a project's or a theme's page, the Portfolio's selection), or null. */
  pageKey() {
    const r = App.route || {}, a = r.args || [];
    if (r.name === 'project' && M.project(a[0])) return a[0];
    if (r.name === 'theme') { const t = M.theme(a[0]); return t && M.project(t.projectId) ? t.projectId : null; }
    if (r.name === 'portfolio') { const v = _ls.get('pf:view', null) || {}, s = v.sel; if (s && M.project(s)) return s; if (s === 'general' || s === 'quick') return RSET.NONE; }
    return null;
  },
  button(e) {
    if (RDOCK.phone()) return;
    if (RDOCK.wrap) { RDOCK.close(); return RSET.paintBtn(); }   // the reader closes; every set keeps its tabs
    const S = RDOCK.S_, inNote = App.panes().length > 0;
    if (!RSET.live()) {   // reading sets off: the one row of tabs, as before
      if (inNote) { if (S.tabs.length) { S.open = true; RDOCK.mount(); RDOCK.remount(); } else RDOCK.picker(e); return RSET.paintBtn(); }
      const id = S.show[S.act] || S.show.find(Boolean) || S.tabs[S.tabs.length - 1]; if (!id) return RDOCK.picker(e);
      return RSET.goRead(null, id);
    }
    if (inNote) {   // this note's project: its set, at its most recent tab
      const k = RSET.ctxKey(); RSET.lastCtx = k; if (S.cur !== k) RSET.use(k, { quiet: true }); S.open = true;
      if (S.tabs.length) { RDOCK.mount(); RDOCK.remount(); } else RSET.showEmpty();
      return RSET.paintBtn();
    }
    let k = RSET.pageKey(); if (k == null || !RSET.tabsOf(k).length) k = RSET.lastSet();   // the project selected, else the last thing read anywhere
    if (k == null) return RDOCK.picker(e);   // nothing read yet: + (the papers and pages of your notes, and the Library's)
    RSET.goRead(k, RSET.recent(k));
  },
  /** From a page that isn't a note: the note tab `id` was opened from (else the note it is in), with it beside — or full screen, as Settings says. */
  goRead(k, id) {
    const S = RDOCK.S_, b = M.block(id); if (!b) return;
    const from = k != null ? RSET.set(k, S).from[id] : null, fd = from && M.doc(from), d = fd && !fd.deleted ? fd : M.doc(b.docId); if (!d) return;
    if (k != null) RSET.use(k, { quiet: true });
    S.open = true; const at = S.show.indexOf(id); if (at >= 0) S.act = at; else S.show[clamp(S.act, 0, S.n - 1)] = id; RDOCK.save();
    RSET.lastCtx = RSET.keyOf(d); RSET._full = RDOCK.tn('rbtn', 'away', 'note') === 'full' ? id : null;
    App.go('#/doc/' + d.id);
  },
  mountBtn() {
    const row = $('#hd .hrow'); if (!row || RSET.btn) return;
    RSET.btn = h('button.ib#readerbtn', { type: 'button', title: 'Reader', 'aria-label': 'Reader', html: RDOCK.BOOK, on: { click: e => { e.stopPropagation(); RSET.button(e); } } });
    row.append(RSET.btn); RSET.paintBtn();
  },
};
{
  // the state: sets around 13zzb's row
  const ld = RDOCK.load; RDOCK.load = function () { const S = ld.apply(this, arguments); try { const t = _ls.get('rtabs', null) || {}, S2 = RSET.adopt(S, t);
    if (S2.mode === 'sets' && !t.home438) { try { RSET.rehome(S2); } catch (e) { console.warn('[reading sets] rehome', e); } S2.home438 = 1; }   // V4.38: once — tabs filed under the default project go home
    return S2; } catch (e) { console.warn('[reading sets]', e); return S; } };
  const sv = RDOCK.save; RDOCK.save = function () {
    const S = RDOCK.S_; if (S.mode !== 'sets') return sv.apply(this, arguments);
    RSET.sync(S); const keep = {}; Object.values(S.sets || {}).forEach(x => x.tabs.forEach(id => { if (S.zoom[id] != null) keep[id] = S.zoom[id]; }));
    const r = sv.apply(this, arguments); Object.assign(S.zoom, keep); _ls.set('rtabs', S); return r;   // 13zzb keeps the zoom of the row's tabs only: the other sets' too
  };
  // a paper opened goes in the set of the note it was opened from (or the set shown, from the reader itself); when it was read is kept
  const op = RDOCK.open; RDOCK.open = function (b, o) {
    let re = false;
    try { if (b && RSET.live() && RDOCK.KINDS[b.kind] && b.status === 'live' && !RDOCK.phone() && MEDIA.get(b.media) && !(o && o.restore)) {
      const S = RDOCK.S_, k = RSET.target(b); if (k !== S.cur) { re = !!RDOCK.wrap && S.n > 1; RSET.use(k, { quiet: true }); }
      const x = RSET.set(S.cur, S); if (!S.tabs.includes(b.id)) { const d = RSET.ctxDoc(); x.from[b.id] = d ? d.id : b.docId; } x.at[b.id] = Date.now(); } } catch (e) { console.warn('[reading sets]', e); }
    const r = op.apply(this, arguments); if (re) RDOCK.remount(); return r;
  };
  const fo = RDOCK.focus; RDOCK.focus = function (i) { try { const S = RDOCK.S_; if (S.mode === 'sets' && RSET.on()) { const id = S.show[clamp(i, 0, S.n - 1)]; if (id) RSET.set(S.cur, S).at[id] = Date.now(); RSET.sync(S); } } catch (e) { } return fo.apply(this, arguments); };
  // only × closes a tab: ✕ on the row, /close and the last tab closed close the reader and keep every set
  const cl = RDOCK.close; RDOCK.close = function (keep) {
    const S = RDOCK.S_; if (keep || !RSET.live()) return cl.apply(this, arguments);
    S.open = false; RDOCK.save();
    if (RSET._closingTab && !S.tabs.length) RDOCK.panes.forEach(p => { if (p) _ls.set('rdock:' + p.docId, null); });   // its last tab closed: the note forgets it (the other sets keep theirs)
    return cl.call(this, true);
  };
  const ct = RDOCK.closeTab; RDOCK.closeTab = function (id) {
    const p = RDOCK.paneOf(id), ev = window.event, t = ev && ev.target && ev.target.closest ? ev.target : null;
    if (RSET.live() && p && p.full && t && t.closest('.rd-bar .rd-x') && !(typeof RVIEW !== 'undefined' && RVIEW.tn && RVIEW.tn('fullClose', 'beside') === 'close')) return RDOCK.full(p);   // Close on a pane in full screen: back beside, the tab stays — unless V4.31's Settings → Close, in full screen says Closes the tab
    RSET._closingTab = true; try { return ct.apply(this, arguments); } finally { RSET._closingTab = false; }
  };
  // a tab clicked takes the note to its paper only within the set's project (else it would leave the project, and the set with it)
  const fw = RDOCK.follow; RDOCK.follow = function (id) { const b = M.block(id), t = window.event && window.event.target; if (b && RSET.live() && t && t.closest && t.closest('.rd-tab') && RSET.keyOf(M.doc(b.docId)) !== RDOCK.S_.cur) return; return fw.apply(this, arguments); };
  const tr = RDOCK.tabsRow; RDOCK.tabsRow = function () { const r = tr.apply(this, arguments); try { if (RDOCK.wrap) RSET.paintRow($('.rd-tabs', RDOCK.wrap)); } catch (e) { console.warn('[reading sets]', e); } return r; };
  const ly = RDOCK.layout; RDOCK.layout = function () { const r = ly.apply(this, arguments); RSET.paintBtn(); return r; };
  // from outside a note (the Library's reader, + there): the tab goes in the set of the note it is read beside
  const gt = RDX.goTab; RDX.goTab = function (id) {
    try { const b = M.block(id); if (b && RSET.live() && !(RDOCK.wrap && App.panes().length)) { const S = RDOCK.S_, k = RSET.keyOf(M.doc(b.docId)); if (S.cur !== k) RSET.use(k, { quiet: true }); const x = RSET.set(k, S); if (!S.tabs.includes(id)) x.from[id] = b.docId; x.at[id] = Date.now(); RSET.lastCtx = k; } } catch (e) { console.warn('[reading sets]', e); }
    return gt.apply(this, arguments);
  };
  // going to a note: its project's set
  const rr = DocView.render; DocView.render = function () { const r = rr.apply(this, arguments); setTimeout(() => RSET.follow(), 0); return r; };
  addEventListener('hashchange', () => setTimeout(() => RSET.follow(), 30));
  // the button, at the top right of every page
  if (!RDOCK.wrap) RDOCK.S = null;
  RSET.mountBtn();
}
