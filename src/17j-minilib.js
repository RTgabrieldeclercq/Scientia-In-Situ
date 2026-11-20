/* ==========================================================================
   17j · The maximised reader keeps its tabs; the mini library from the left;
   shelves assigned to projects (V4.30 — Gabe: "When in maximized view, the
   multi tabs remain, but dragging the interface on the left of your screen
   brings up a mini library view of the current active shelves in your
   reader, which become the new system to navigate between PDFs or HTMLs.
   Shelves in libraries are assigned to projects.")
   • The maximised view keeps the tab row with its reading sets (17i):
     – a pane of the reader in full screen (⤢): the reader's own row stays
       across the top of the window; a tab, a chip, + or a pick from the
       mini library reads in that pane, still full screen; × on the tab read
       there reads the next one, still full screen;
     – a maximised card (a PDF's or a page's ⤢ / ⛶ on a note): the card
       becomes a tab of the note's project's set, and the set's row sits
       over it; a tab or a chip clicked there reads that paper in the reader,
       full screen.
   • The mini library: a thin grip on the left edge of a maximised view;
     drag it to the right (mouse, finger or pen) or click it, and a panel
     slides out: the tabs open in this set, then this project's shelves
     (each with its foci and their papers that have a PDF or a page here),
     with All shelves to see the rest. Click a paper: it opens as a tab of
     this set, read in the maximised view, through its literature note as
     + does (RDX.embedFor). It closes by dragging it back, Esc, or a click
     outside. It sits inside the maximised view (.embed-max), which the
     edge pan (13zzh) leaves alone, and left of where the pills go.
   • Shelves are assigned to projects: `projectIds` on a shelf (a `libsets`
     row, kind 'theme'; synced like the rest). A project button on each
     shelf of the Library's tree (both builds draw it through LGROUP.side)
     and Settings → Mini library list and change them.
   Wrapped: MXHL.open, RDOCK.open / switchTo / closeTab / full, RSET.pick /
   paintRow, LGROUP.side.
   ========================================================================== */
const RLIB = {
  PROJ: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"/></svg>',
  LIBI: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"/></svg>',
  isOpen: false, scope: null, guard: null,
  on: () => !!RDOCK.tabsOn() && RDOCK.ftOn('rlib') && RDOCK.ftOn('library') && !RDOCK.phone(),
  /** The tab row stays in the maximised view (Settings → Reading sets by project). */
  rowOn: () => RSET.live() && RDOCK.tn('rsets', 'max', true) !== false,
  /** The maximised view on screen: a pane of the reader in full screen, or a maximised card. */
  max() {
    const p = RDOCK.panes.find(x => x && x.full && x.ov && x.ov.isConnected); if (p) return { kind: 'pane', p, ov: p.ov, id: p.id };
    const ov = [...$$('.embed-max.mx-hl:not(.rd-dock)')].pop(); return ov ? { kind: 'card', ov, id: ov.dataset.src } : null;
  },
  /** Read tab `id` in the maximised view: the reader's pane in full screen (a maximised card gives way to it). */
  read(id) {
    const b = M.block(id); if (!b) return; const m = RLIB.max();
    if (m && m.kind === 'pane') { if (m.id === id) return; const at = RDOCK.S_.show.indexOf(id); if (at >= 0 && at !== m.p.i) { RDOCK.full(m.p); RDOCK.focus(at); } else RDOCK.open(b, { pane: m.p.i }); }
    else RDOCK.open(b);
    const p = RDOCK.paneOf(id); if (p && !p.full) RDOCK.full(p);
  },
  /* ---------- the row over a maximised card ---------- */
  /** A card maximised is a visit: a tab of the set shown (the note's project's when the reader is closed), read now. */
  visit(id) {
    const S = RDOCK.S_, b = M.block(id); if (!b || !RDOCK.KINDS[b.kind] || !RDOCK.live(id)) return;
    if (!RDOCK.wrap) { const k = RSET.ctxKey(); if (k != null && k !== S.cur) RSET.use(k, { quiet: true }); }
    const x = RSET.set(S.cur, S); if (!S.tabs.includes(id)) { const d = RSET.ctxDoc(); S.tabs.push(id); x.from[id] = d ? d.id : b.docId; RDOCK.trimTabs(); }
    x.at[id] = Date.now(); RDOCK.save(); if (RDOCK.wrap) RDOCK.tabsRow();
  },
  cardRow(ov) {
    const S = RDOCK.S_, src = ov.dataset.src;
    const tabs = S.tabs.map(M.block).filter(Boolean).map(b => h('div.rd-tab' + (b.id === src ? '.act' : ''), { role: 'tab', tabindex: '0', 'data-id': b.id, 'aria-selected': String(b.id === src), title: RDOCK.label(b) + ' — ' + ((M.doc(b.docId) || {}).title || '') + '\nClick: read it, full screen',
      on: { click: e => { if (e.target.closest('.rd-tx') || b.id === src) return; RLIB.read(b.id); }, keydown: e => { if (e.key === 'Enter') RLIB.read(b.id); } } },
      h('span.rd-tk', b.kind === 'pdf' ? 'PDF' : 'Page'), h('span.rd-tn', RDOCK.label(b)),
      h('button.rd-tx', { type: 'button', title: 'Close this tab', 'aria-label': 'Close ' + RDOCK.label(b), on: { click: e => { e.stopPropagation(); RLIB.closeTab(b.id); } } }, '×')));
    const tl = h('div.rd-tl', { role: 'tablist' }, RSET.keys(S).map(k => k === S.cur ? RSET.band(k, tabs) : RSET.chip(k)));
    return h('div.rd-tabs.rs-maxrow.rs-row' + (RDOCK.tn('rsets', 'tint', true) === false ? '.rs-plain' : ''), tl, h('span.rd-tsp'));
  },
  paintCards() { $$('.embed-max.mx-hl:not(.rd-dock)').forEach(ov => { const old = $(':scope > .rs-maxrow', ov); if (!RLIB.rowOn()) { if (old) old.remove(); return; } const r = RLIB.cardRow(ov); old ? old.replaceWith(r) : ov.prepend(r); }); },
  /** × on a tab over a maximised card: it leaves the set (the card stays maximised). */
  closeTab(id) { const S = RDOCK.S_; if (RDOCK.wrap) RDOCK.closeTab(id); else { S.tabs = S.tabs.filter(x => x !== id); S.show = S.show.map(x => x === id ? null : x); RDOCK.save(); } RLIB.paintCards(); },
  /* ---------- the mini library ---------- */
  openable: l => !!l && (!!(l.pdf && MEDIA.get(l.pdf)) || RDX.embedsOf(l).some(b => MEDIA.get(b.media))),
  ref: l => l.kind !== 'link' && (l.authors || []).length ? LIB.shortRef(l) : snippet(l.title || l.url || 'Untitled', 40),
  kindOf(l) { if (l.pdf && MEDIA.get(l.pdf)) return 'PDF'; const e = RDX.embedsOf(l).find(b => MEDIA.get(b.media)); return e && e.kind === 'html' ? 'Page' : 'PDF'; },
  /** A shelf's projects (those that still exist). */
  projs: t => ((t && t.projectIds) || []).filter(id => M.project(id)),
  /** The shelves of set k first (assigned to its project), then the rest. */
  shelves(k) { const all = LGROUP.themes(), mine = k && k !== RSET.NONE ? all.filter(t => RLIB.projs(t).includes(k)) : []; return { mine, rest: all.filter(t => !mine.includes(t)) }; },
  grip(ov) {
    const row = $(':scope > .mx-row', ov); if (!row || $(':scope > .rs-grip', row)) return;
    const g = h('div.rs-grip', { title: 'The mini library — drag to the right, or click', 'aria-label': 'Open the mini library', role: 'button' }, h('i'));
    g.addEventListener('pointerdown', e => RLIB.pull(e, row, g));
    row.prepend(g);
  },
  panel(row) { let p = $(':scope > .rs-lib', row); if (!p) { p = h('aside.rs-lib', { 'aria-label': 'Mini library' }); p.addEventListener('pointerdown', e => RLIB.push(e, p)); row.append(p); } return p; },
  /** The grip pulled: the panel follows the pointer; let go past a third of its width (or a click) and it stays open. */
  pull(e, row, g) {
    if (e.button > 0 || !RLIB.on()) return; e.preventDefault(); e.stopPropagation();
    const p = RLIB.panel(row); RLIB.fill(p); p.classList.add('drag'); const w = p.offsetWidth || 300, x0 = e.clientX; let dx = 0, moved = false;
    p.style.transform = `translateX(${-w}px)`; try { g.setPointerCapture(e.pointerId); } catch (er) { }
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; dx = ev.clientX - x0; if (Math.abs(dx) > 4) moved = true; p.style.transform = `translateX(${Math.min(0, -w + Math.max(0, dx))}px)`; };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      p.classList.remove('drag'); p.style.transform = ''; if (!moved || dx > w / 3) RLIB.open(row); else RLIB.close(); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  },
  /** The panel dragged back to the left (from anywhere but a button): it closes past a third of its width. */
  push(e, p) {
    if (e.button > 0 || e.target.closest('button, input, a, .rs-paper')) return; const w = p.offsetWidth || 300, x0 = e.clientX; let dx = 0;
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; dx = Math.min(0, ev.clientX - x0); if (dx < -6) { p.classList.add('drag'); p.style.transform = `translateX(${dx}px)`; } };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      p.classList.remove('drag'); p.style.transform = ''; if (dx < -w / 3) RLIB.close(); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  },
  open(row) {
    if (!row || !RLIB.on()) return; const p = RLIB.panel(row); if (!RLIB.isOpen) RLIB.scope = RDOCK.tn('rlib', 'start', 'project'); RLIB.fill(p); p.classList.add('open'); RLIB.isOpen = true;
    // 13zzb's keys (Esc leaves full screen, ← → page) wait while a .ovl is up: the panel takes Esc first (see the keydown below)
    if (!RLIB.guard || !RLIB.guard.isConnected) { RLIB.guard = h('div.ovl.rs-libguard', { style: { display: 'none' }, 'aria-hidden': 'true' }); document.body.append(RLIB.guard); }
  },
  close() { $$('.rs-lib.open').forEach(p => p.classList.remove('open')); RLIB.isOpen = false; if (RLIB.guard) { RLIB.guard.remove(); RLIB.guard = null; } },
  refresh() { $$('.rs-lib.open').forEach(p => RLIB.fill(p)); },
  fill(p) {
    const S = RDOCK.S_, sets = RSET.live(), k = sets ? S.cur : (RSET.ctxKey() || RSET.NONE), m = RLIB.max(), shown = m && m.id, shownLib = shown && RDX.libOf(M.block(shown)), { mine, rest } = RLIB.shelves(k), all = RLIB.scope === 'all';
    const inSet = new Set(S.tabs.map(id => (RDX.libOf(M.block(id)) || {}).id).filter(Boolean));
    const paper = l => h('button.rs-paper' + (shownLib && shownLib.id === l.id ? '.act' : '') + (inSet.has(l.id) ? '.in' : ''), { type: 'button', title: (l.title || l.url || '') + '\nClick: read it here — a tab of this set', on: { click: e => { e.stopPropagation(); RLIB.pick(l); } } },
      h('span.rd-tk', RLIB.kindOf(l)), h('span.rs-pr', RLIB.ref(l)), h('span.rs-pt', snippet(l.title || l.url || '', 90)));
    const focus = g => { const ps = [...LGROUP.members(g)].map(M.lib).filter(RLIB.openable).sort((a, z) => RLIB.ref(a).localeCompare(RLIB.ref(z))); if (!ps.length) return null;
      return h('div.rs-focus', h('div.rs-fh', h('span', g.name), h('span.rs-c', String(ps.length))), ps.map(paper)); };
    const shelf = (t, yours) => { const fs = LGROUP.groups(t.id).map(focus).filter(Boolean);
      return h('section.rs-shelf', { style: LGROUP.sh(t) }, h('div.rs-shh', h('span.lg-sw', { 'aria-hidden': 'true' }), h('b', t.name), yours ? h('span.rs-yours', { title: 'Assigned to ' + RSET.name(k) }, 'this project') : null),
        fs.length ? fs : h('div.rs-none', 'No paper with a PDF here on this shelf yet')); };
    const tabRow = id => { const b = M.block(id); if (!b) return null; return h('button.rs-paper.in' + (id === shown ? '.act' : ''), { type: 'button', title: 'Read it here', on: { click: e => { e.stopPropagation(); RLIB.pickTab(id); } } }, h('span.rd-tk', b.kind === 'pdf' ? 'PDF' : 'Page'), h('span.rs-pr', RDOCK.label(b)), h('span.rs-pt', (M.doc(b.docId) || {}).title || '')); };
    const seg = h('div.rs-seg', { role: 'group' }, [['project', 'This project'], ['all', 'All shelves']].map(([v, l]) => h('button' + (RLIB.scope === v || (!all && v === 'project') ? '.on' : ''), { type: 'button', 'aria-pressed': String(all ? v === 'all' : v === 'project'), on: { click: e => { e.stopPropagation(); RLIB.scope = v; RLIB.fill(p); } } }, l)));
    const loose = all ? LGROUP.groups(null).map(focus).filter(Boolean) : [];
    const list = all ? [...mine.map(t => shelf(t, true)), ...rest.map(t => shelf(t, false))] : mine.map(t => shelf(t, true));
    const emptyMsg = !LGROUP.themes().length ? 'No shelves yet. The Library’s tree makes them (+ Shelf), and its project button assigns them to projects.'
      : !all && !mine.length ? (k === RSET.NONE ? 'These notes are outside any project: All shelves shows every shelf.' : 'No shelf is assigned to ' + RSET.name(k) + ' yet. The project button on a shelf in the Library’s tree assigns it; All shelves shows every shelf.') : '';
    p.replaceChildren(
      h('div.rs-lh', h('span.rs-li', { html: RLIB.LIBI }), h('b', 'Library'), h('span.rs-lp', RSET.name(k)), h('span.sp'), h('button.rs-lx', { type: 'button', title: 'Close (Esc)', 'aria-label': 'Close the mini library', on: { click: e => { e.stopPropagation(); RLIB.close(); } } }, '×')),
      seg,
      h('div.rs-lbody', S.tabs.length ? h('div.rs-sec', h('div.rs-sh', sets ? 'Open in this set' : 'Open tabs'), S.tabs.map(tabRow)) : null,
        list.length ? h('div.rs-sec', h('div.rs-sh', all ? 'Shelves' : 'This project’s shelves'), list) : null,
        loose.length ? h('div.rs-sec', h('div.rs-sh', 'Foci on no shelf'), loose) : null,
        emptyMsg ? h('div.rs-none.rs-empty-l', emptyMsg) : null,
        !all && rest.length ? h('button.rs-more', { type: 'button', on: { click: e => { e.stopPropagation(); RLIB.scope = 'all'; RLIB.fill(p); } } }, 'All shelves (' + rest.length + ' more)') : null));
  },
  /** A paper of the mini library: a tab of this set, through its literature note (as + does), read here. */
  pick(l) {
    const e = RDX.embedFor(l); if (!e) return toast('That paper has no PDF here');
    RLIB.read(e.id); RLIB.after();
  },
  pickTab(id) { RLIB.read(id); RLIB.after(); },
  after() { if (RDOCK.tn('rlib', 'after', 'close') !== 'stay') return RLIB.close(); RLIB.isOpen = false; setTimeout(() => { const m = RLIB.max(), row = m && $(':scope > .mx-row', m.ov); if (row) RLIB.open(row); }, 80); },
  /* ---------- shelves assigned to projects ---------- */
  setProjs(t, ids) { const cur = LGROUP.get(t.id); if (!cur) return; DB.beginGroup('library'); const x = Object.assign({}, cur); if (ids.length) x.projectIds = ids; else delete x.projectIds; LGROUP.save(x);
    try { if (App.route.name === 'settings') $$('.rs-stl').forEach(n => n.replaceWith(RLIB.settingsNode())); } catch (e) { } },
  /** Settings → Mini library: every shelf, its projects, its project button. */
  settingsNode() {
    const ts = LGROUP.themes(); if (!ts.length) return h('div.rs-stl', h('div.tiny.muted', 'No shelves yet — the Library’s tree makes them (+ Shelf).'));
    return h('div.rs-stl', ts.map(t => h('div.rs-str', { style: LGROUP.sh(t) }, h('span.lg-sw', { 'aria-hidden': 'true' }), h('b', t.name), h('span.rs-stp', RLIB.projs(t).map(RSET.name).join(', ') || 'No project'), RLIB.projBtn(t))));
  },
  assign(t, at) {
    const r = at.getBoundingClientRect(), ps = DB.all('projects');
    const row = p => h('label.lg-pk', h('input', { type: 'checkbox', checked: RLIB.projs(LGROUP.get(t.id)).includes(p.id), on: { change: e => { const now = RLIB.projs(LGROUP.get(t.id)).filter(x => x !== p.id); RLIB.setProjs(t, e.target.checked ? [...now, p.id] : now); } } }), h('span', p.name));
    popover(Math.max(8, r.left - 120), r.bottom + 6, [h('h5', 'Projects of “' + t.name + '”'), ps.length ? h('div.lg-pks', ps.map(row)) : h('div.tiny.muted', 'No project yet — the Portfolio makes them.'),
      h('div.tiny.muted', { style: { margin: '6px 6px 2px', maxWidth: '260px' } }, 'In these projects, the mini library of the maximised reader shows this shelf first.')], { cls: 'pop.lg-pop' });
  },
  projBtn(t) {
    const ids = RLIB.projs(t), n = ids.length;
    return h('button.rs-shp' + (n ? '.on' : ''), { type: 'button', title: n ? 'Projects: ' + ids.map(RSET.name).join(', ') + ' — click to change' : 'Assign to projects… (the mini library shows it first there)', 'aria-label': 'Assign “' + t.name + '” to projects',
      on: { click: e => { e.stopPropagation(); RLIB.assign(t, e.currentTarget); } } }, h('span', { html: RLIB.PROJ }), n ? h('span.rs-shn', String(n)) : null);
  },
  /** The maximised row's height, for the pane in full screen below it; the setting as a class. */
  paint() {
    const b = document.body; if (!b) return; b.classList.toggle('rs-maxrow', RLIB.rowOn());
    const r = RDOCK.wrap && $('.rd-tabs', RDOCK.wrap); if (r && RDOCK.panes.some(p => p && p.full)) requestAnimationFrame(() => { const hgt = r.offsetHeight; if (hgt) document.documentElement.style.setProperty('--rs-th', hgt + 'px'); });
  },
};
RSET.readMax = id => RLIB.read(id);
{
  // every maximised view gets the grip; a maximised card is a visit, with the set's row over it
  const mo = MXHL.open; MXHL.open = function (ov, srcId) {
    const r = mo.apply(this, arguments);
    try { RLIB.grip(ov); if (!ov.classList.contains('rd-dock') && RSET.live()) { RLIB.visit(srcId); RLIB.paintCards(); } } catch (e) { console.warn('[mini library]', e); }
    return r;
  };
  // in full screen: what the row, + or the mini library opens is read in that pane, still full screen
  const op = RDOCK.open; RDOCK.open = function (b, o) {
    const fp = RDOCK.panes.find(p => p && p.full), t = window.event && window.event.target, here = !!fp && RLIB.rowOn() && !(o && o.restore) && !!b && !!t && !!t.closest && !!t.closest('.rd-tabs, .rs-lib, .ovl');
    if (here && !(o && o.pane != null)) o = Object.assign({}, o || {}, { pane: fp.i });
    const r = op.call(this, b, o);
    if (here) { const np = RDOCK.paneOf(b.id); if (np && !np.full) RDOCK.full(np); }
    return r;
  };
  const sw = RDOCK.switchTo; RDOCK.switchTo = function (id, e) {
    const fp = RDOCK.panes.find(p => p && p.full); if (!fp || !RLIB.rowOn() || (e && e.altKey)) return sw.apply(this, arguments);
    if (!M.block(id)) return RDOCK.closeTab(id); if (fp.id === id) return; RLIB.read(id);
  };
  const ct = RDOCK.closeTab; RDOCK.closeTab = function (id) {
    const t = window.event && window.event.target, p = RDOCK.paneOf(id), was = p && p.full && RLIB.rowOn() && !(t && t.closest && t.closest('.rd-bar .rd-x')) ? p.i : -1;
    const r = ct.apply(this, arguments); if (was >= 0) { const np = RDOCK.panes[was]; if (np && !np.full) RDOCK.full(np); } RLIB.paintCards(); return r;
  };
  const fl = RDOCK.full; RDOCK.full = function () { const r = fl.apply(this, arguments); if (!RDOCK.panes.some(p => p && p.full) && RLIB.isOpen && !RLIB.max()) RLIB.close(); RLIB.paint(); return r; };
  // a chip clicked over a maximised card: that set's paper read, full screen
  const pk = RSET.pick; RSET.pick = function (k) { const m = RLIB.max(), card = m && m.kind === 'card'; const r = pk.apply(this, arguments); if (card) { const id = RSET.recent(k); if (id) RLIB.read(id); } return r; };
  const pr = RSET.paintRow; RSET.paintRow = function () { const r = pr.apply(this, arguments); try { RLIB.paintCards(); if (RLIB.isOpen) RLIB.refresh(); RLIB.paint(); } catch (e) { } return r; };
  // the Library's tree: each shelf's projects
  const sd = LGROUP.side; LGROUP.side = function () {
    const el = sd.apply(this, arguments);
    try { if (RLIB.on() && el) $$('.lg-row.lg-t[data-id]', el).forEach(row => { const t = LGROUP.get(row.dataset.id); if (!t || $('.rs-shp', row)) return; const m = $(':scope > .lg-m', row), b = RLIB.projBtn(t); m ? m.before(b) : row.append(b); }); } catch (e) { console.warn('[shelf projects]', e); }
    return el;
  };
  // Esc and a click outside close the panel (before 13zzb's Esc leaves full screen, and before a maximised card closes)
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !RLIB.isOpen) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); RLIB.close(); }, true);
  document.addEventListener('pointerdown', e => { if (!RLIB.isOpen) return; const t = e.target; if (t && t.closest && t.closest('.rs-lib, .rs-grip, .pop, .ovl:not(.rs-libguard)')) return; RLIB.close(); }, true);
  // a maximised view gone: so is the panel
  try { new MutationObserver(() => { if (RLIB.isOpen && !$('.rs-lib.open')) RLIB.close(); }).observe(document.body, { childList: true }); } catch (e) { }
  RLIB.paint();
}
