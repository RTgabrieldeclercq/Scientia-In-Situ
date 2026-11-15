/* ==========================================================================
   13zzb · Read a paper beside the note.
   The book on a PDF card's bar (or "◧ Beside" on the maximised view) puts
   the paper in one half of the window, full height, out of the canvas's pan
   and zoom; the note stays live in the other half. It is the maximised
   reader (13zz: its highlights, the colour menu, the pen highlighter) locked
   to half the screen, with page n / N and ‹ ›, zoom − / + (Ctrl or ⌘ and
   scroll, or pinch), the scissors to clip figures and equations (13zza),
   ⇄ to the other side and ⤢ full screen. Highlights and clips land beside
   the card as always, and the note shows them. ← → page while the pointer
   is over it; Esc never closes it. It belongs to its note: leave the note
   and it closes, come back and it is there again; Close forgets it.
   Meanwhile the card says "Reading beside", so the file is drawn once.
   V3.945 — an HTML page reads beside the note too (the book on its card,
   "◧ Beside" when maximised): the page itself, its highlights and notes,
   ⇄, ⤢ and Close; its own tools (✎ Note, Export ink labels) come from 13zze.
   V3.1002 (Gabe: "You may have multiple tabs of papers opened at once with a
   + button beside a new tab bar in the reader, which applies to HTMLs too";
   "You can split the beside view to two beside views based on reading tabs
   that you have opened (up to 2x2, just like the feature in the notes)"):
   • Reading tabs: a row of tabs over the paper — each a PDF or an HTML page
     of any note — and + to open another (a picker of the papers and pages in
     your notes and the papers of the Library, 17e). Click a tab to read it
     (it takes the note to where that paper is embedded, lit — Settings);
     × closes it, drag to reorder, right-click for more. The tabs are kept on
     this device and stay open from note to note (they step aside on pages
     that aren't notes, and come back with the next note). Feature off: one
     paper at a time, belonging to its note, as before.
   • ◫ on the tab row splits the reader like the notes' ◫ Split: one, two
     (side by side, or one over the other — Settings) or a quadrant (2×2),
     each pane showing one of the open tabs; click a pane to put the next tab
     you pick there. Every pane has its own page, zoom, highlights and ⤢.
   RDOCK.st is the pane in focus (what the rest of the app reads: its id, ov,
   zoom…); RDOCK.panes holds them all; RDOCK.open(b, { pane }) is the one way
   a pane is filled, so the tools other modules add to a pane's bar (13zze,
   13zzm, 23d) come with every pane.
   ========================================================================== */
const RDOCK = {
  st: null, panes: [], wrap: null, S: null, ZOOMS: [.6, .75, .9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5],
  BOOK: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>',
  saved: docId => _ls.get('rdock:' + docId, null),
  phone: () => document.body.classList.contains('mobile'),
  KINDS: { pdf: 1, html: 1 },
  /** What other modules add to a pane's bar, before Highlights: functions (pane, block) → element (17e: Cited in). */
  extras: [],
  /** A tab's name (17e gives a paper of the Library its short reference). */
  label: b => (b && b.label) || (b && b.kind === 'pdf' ? 'PDF' : 'Page'),
  /** + on the tab row (17e: papers and pages of your notes, papers of the Library). */
  picker() { toast('Open a PDF or a page with the book on its card'); },
  ftOn: id => typeof FEAT === 'undefined' || FEAT.on(id),
  tabsOn: () => RDOCK.ftOn('rtabs'),
  splitOn: () => RDOCK.tabsOn() && RDOCK.ftOn('rsplit'),
  tn(id, k, d) { try { const v = FEAT.tune(id, k); return v === undefined ? d : v; } catch (e) { return d; } },
  live(id) { const b = id && M.block(id); return !!(b && b.status === 'live' && RDOCK.KINDS[b.kind] && MEDIA.get(b.media)); },
  /* ---------- the state: the tabs, what each pane shows, the side — kept on this device ---------- */
  load() {
    const t = _ls.get('rtabs', null) || {}, S = { tabs: (Array.isArray(t.tabs) ? t.tabs : []).filter(RDOCK.live), side: t.side === 'right' ? 'right' : 'left', zoom: Object.assign({}, t.zoom || {}), open: !!t.open, n: [1, 2, 4].includes(t.n) ? t.n : 1, act: +t.act || 0 };
    S.tabs = [...new Set(S.tabs)]; S.show = Array.from({ length: S.n }, (_, j) => { const x = (t.show || [])[j]; return x && S.tabs.includes(x) ? x : null; });
    if (!S.show.some(Boolean) && S.tabs.length) S.show[0] = S.tabs[0]; S.act = clamp(S.act, 0, S.n - 1); if (!S.tabs.length) S.open = false; return S;
  },
  get S_() { return RDOCK.S || (RDOCK.S = RDOCK.load()); },
  save() {
    const S = RDOCK.S_; Object.keys(S.zoom).forEach(k => { if (!S.tabs.includes(k)) delete S.zoom[k]; }); _ls.set('rtabs', S);
    RDOCK.panes.forEach(p => { if (p) _ls.set('rdock:' + p.docId, { id: p.id, side: S.side, zoom: p.zoom }); });   // the note's own record, as before (what the reader goes back to with the feature off)
  },
  trimTabs() { const S = RDOCK.S_, max = +RDOCK.tn('rtabs', 'max', 12) || 12; while (S.tabs.length > max) { const old = S.tabs.find(x => !S.show.includes(x)); if (!old) break; S.tabs = S.tabs.filter(x => x !== old); } },
  paneOf: id => RDOCK.panes.find(p => p && p.id === id) || null,
  has: id => !!RDOCK.paneOf(id),
  stage: (p = RDOCK.st) => p && $('.pdf-stage', p.ov),
  /* ---------- open: a paper or page in a pane (the one way a pane is filled) ---------- */
  open(b, o = {}) {
    if (!b || !RDOCK.KINDS[b.kind] || b.status !== 'live' || RDOCK.phone() || !MEDIA.get(b.media)) return;
    const mx = $('.embed-max.dk-max:not(.rd-dock)'); if (mx) MXHL.close(mx);   // Gabe's maximised view gives way
    const S = RDOCK.S_, was = RDOCK.saved(b.docId) || {}, same = was.id === b.id;
    if (!RDOCK.tabsOn()) {   // one paper at a time, as before
      RDOCK.panes.forEach((p, j) => { if (p && p.id !== b.id) RDOCK.unmount(j); });
      S.tabs = [b.id]; S.n = 1; S.show = [b.id]; S.act = 0; if (!RDOCK.wrap) S.side = o.side || (same && was.side) || 'left';
    } else {
      if (!S.tabs.includes(b.id)) { S.tabs.push(b.id); RDOCK.trimTabs(); }
      if (!RDOCK.splitOn() && S.n > 1) { const keep = S.show[S.act]; S.n = 1; S.show = [keep || null]; S.act = 0; RDOCK.panes.slice(1).forEach((p, j) => p && RDOCK.unmount(j + 1)); RDOCK.panes.length = Math.min(RDOCK.panes.length, 1); }
      if (o.side) S.side = o.side; else if (!RDOCK.wrap && !RDOCK.panes.length && same && was.side && !o.restore) S.side = was.side;
    }
    if (same && was.zoom && !S.zoom[b.id]) S.zoom[b.id] = was.zoom;
    S.open = true;
    const at = S.show.indexOf(b.id), i = o.pane != null ? clamp(o.pane, 0, S.n - 1) : at >= 0 ? at : clamp(S.act, 0, S.n - 1);
    if (at >= 0 && at !== i) S.show[at] = null;   // it moves to the pane asked for
    RDOCK.mount(); RDOCK.build(i, b); RDOCK.focus(i); RDOCK.tabsRow(); RDOCK.save();
    if (at >= 0 && at !== i) RDOCK.fillEmpty(at);
  },
  /** The dock in the window: the tab row over the panes. */
  mount() {
    if (RDOCK.wrap && RDOCK.wrap.isConnected) return RDOCK.layout();
    RDOCK.wrap = h('div.rd-wrap', h('div.rd-tabs'), h('div.rd-panes')); $('#app').append(RDOCK.wrap); RDOCK.layout();
  },
  /** Pane i: the bar (page, zoom, scissors, what others add, highlights, ⇄, ⤢, Close) and the paper or page. */
  build(i, b) {
    RDOCK.unmount(i, true);
    const S = RDOCK.S_, pdf = b.kind === 'pdf', p = { i, id: b.id, docId: b.docId, kind: b.kind, side: S.side, zoom: S.zoom[b.id] || 1, full: false, hover: false };
    S.show[i] = b.id;
    const btn = (label, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(e); } } }, label);
    p.pg = h('span.rd-pg.mono', '…'); p.zl = h('button.btn.xs.rd-zl.mono', { title: 'Fit the width', on: { click: e => { e.stopPropagation(); RDOCK.zoom(1, false, p); } } }, '100%');
    p.hl = btn('Highlights', 'Your highlights in this ' + (pdf ? 'paper' : 'page') + ' — click one to go there', () => p.ov.classList.toggle('rd-side-on'));
    p.fs = btn('⤢', 'Full screen (Esc comes back)', () => RDOCK.full(p));
    const extra = RDOCK.extras.map(f => { try { return f(p, b); } catch (e) { console.warn('[reader bar]', e); return null; } }).filter(Boolean);
    const bar = h('div.em-bar.rd-bar', h('b.rd-ttl', { title: b.label || '' }, b.label || (pdf ? 'PDF' : 'Page')),
      pdf ? h('div.rd-grp', btn('‹', 'Previous page (←)', () => RDOCK.step(-1, p)), p.pg, btn('›', 'Next page (→)', () => RDOCK.step(1, p))) : null,
      pdf ? h('div.rd-grp', btn('−', 'Smaller (Ctrl + scroll)', () => RDOCK.zoom(-1, true, p)), p.zl, btn('+', 'Larger (Ctrl + scroll)', () => RDOCK.zoom(1, true, p))) : null,
      pdf ? CLIP.btn(b) : null, ...extra, p.hl, h('button.btn.xs.rd-swap', { title: 'Put it on the other side', on: { click: e => { e.stopPropagation(); RDOCK.swap(); } } }, '⇄'), p.fs,
      h('button.btn.sm.rd-x', { title: RDOCK.tabsOn() ? 'Close this tab — the ' + (pdf ? 'paper' : 'page') + ' goes back in its card' : 'Put the ' + (pdf ? 'paper' : 'page') + ' back in its card', on: { click: e => { e.stopPropagation(); RDOCK.closeTab(p.id); } } }, 'Close ✕'));
    const ov = p.ov = h('div.embed-max.dk-max.rd-dock.rd-docked', { 'data-pane': i }, bar, h('div.dk-maxc'));
    RDOCK.place(ov, i); $('.rd-panes', RDOCK.wrap).append(ov); MXHL.open(ov, b.id);
    ov.addEventListener('pointerenter', () => { p.hover = true; }); ov.addEventListener('pointerleave', () => { p.hover = false; });
    ov.addEventListener('pointerdown', () => { if (RDOCK.st !== p) RDOCK.focus(p.i); }, true);
    ov.addEventListener('wheel', e => RDOCK.wheel(e, p), { passive: false }); ov.addEventListener('scroll', () => RDOCK.onScroll(p), true);
    RDOCK.panes[i] = p;
    RDOCK.card(b); $$(`.box[data-id="${b.id}"] > .bh > .bh-tools`).forEach(x => x.replaceChildren());   // the card says "Reading beside" (and drops its tools)
    RDOCK.draw(p);
    setTimeout(() => { QUOTE.paintMarks(b.id); App.panes().forEach(CLIP.mark); }, 700);
    return p;
  },
  /** A pane where each tab sits in a split: by its number. */
  place(el, i) { const S = RDOCK.S_, rows = S.n === 2 && RDOCK.tn('rsplit', 'two', 'cols') === 'rows'; el.style.gridRow = S.n === 4 ? String(1 + (i >> 1)) : rows ? String(i + 1) : '1'; el.style.gridColumn = S.n === 4 ? String(1 + (i & 1)) : rows ? '1' : String(i + 1); },
  /** A pane of a split with nothing in it yet: the open tabs not shown, and + */
  emptyPane(i) {
    RDOCK.unmount(i, true); const S = RDOCK.S_, spare = S.tabs.filter(x => !S.show.includes(x)).map(M.block).filter(Boolean);
    const el = h('div.rd-empty', { 'data-pane': i }, h('div.rd-empty-in', h('b', 'This pane is free'),
      spare.length ? h('div.rd-elist', spare.map(b => h('button.rd-eopt', { on: { click: () => RDOCK.open(M.block(b.id), { pane: i }) } }, h('span.rd-tk', b.kind === 'pdf' ? 'PDF' : 'Page'), RDOCK.label(b)))) : h('div.tiny.muted', 'Every open tab is showing.'),
      h('button.btn.xs', { on: { click: e => { RDOCK.S_.act = i; RDOCK.picker(e); } } }, '+ Open a paper or page…')));
    el.addEventListener('pointerdown', () => { RDOCK.S_.act = i; RDOCK.mark(); }, true);
    RDOCK.place(el, i); $('.rd-panes', RDOCK.wrap).append(el); RDOCK.panes[i] = null; S.show[i] = null;
  },
  fillEmpty(i) { const S = RDOCK.S_, next = S.tabs.find(x => !S.show.includes(x)); if (next) RDOCK.open(M.block(next), { pane: i }); else RDOCK.emptyPane(i); },
  /** Take pane i down (its paper goes back to its card unless `quiet`). */
  unmount(i, quiet) {
    const w = RDOCK.wrap; if (w) $$(`.rd-panes > [data-pane="${i}"]`, w).forEach(x => { if (!RDOCK.panes[i] || x !== RDOCK.panes[i].ov) x.remove(); });
    const p = RDOCK.panes[i]; if (!p) return; RDOCK.panes[i] = null; p.ov.remove();
    if (CLIP.on.has(p.id)) CLIP.toggle(p.id, false); if (DOCS._max && DOCS._max.id === p.id) DOCS._max = null; if (RDOCK.st === p) RDOCK.st = null;
    const b = M.block(p.id); if (b && !RDOCK.has(b.id)) setTimeout(() => { if (!RDOCK.has(b.id)) RDOCK.card(M.block(b.id) || b); }, quiet ? 0 : 0);
  },
  /** The pane in focus: what the rest of the app reads (RDOCK.st), outlined in a split. */
  focus(i) {
    const S = RDOCK.S_; S.act = clamp(i, 0, S.n - 1); const p = RDOCK.panes[S.act] || null; RDOCK.st = p;
    DOCS._max = p ? { id: p.id, draw: () => RDOCK.draw(p) } : null; RDOCK.mark(); RDOCK.tabsRow();
    try { _ls.set('rtabs', Object.assign({}, S)); } catch (e) { }
  },
  mark() { const S = RDOCK.S_; if (!RDOCK.wrap) return; $$('.rd-panes > *', RDOCK.wrap).forEach(x => x.classList.toggle('rd-act', S.n > 1 && +x.dataset.pane === S.act)); },
  /* ---------- the tab row ---------- */
  tabsRow() {
    const w = RDOCK.wrap; if (!w) return; const S = RDOCK.S_, row = $('.rd-tabs', w), act = S.show[S.act];
    const tabs = S.tabs.map(M.block).filter(Boolean).map(b => {
      const t = h('div.rd-tab' + (b.id === act ? '.act' : S.show.includes(b.id) ? '.shown' : ''), { role: 'tab', tabindex: '0', draggable: 'true', 'data-id': b.id, 'aria-selected': String(b.id === act),
        title: RDOCK.label(b) + ' — ' + ((M.doc(b.docId) || {}).title || '') + (S.show.includes(b.id) && b.id !== act ? ' (in another pane)' : '') + '\nClick: read it' + (RDOCK.tn('rtabs', 'follow', true) ? ' and go to its note' : '') + ' · Alt+click: in another pane · right-click: more',
        on: { click: e => { if (e.target.closest('.rd-tx')) return; RDOCK.switchTo(b.id, e); }, keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); RDOCK.switchTo(b.id, e); } else if (e.key === 'Delete') RDOCK.closeTab(b.id); },
          auxclick: e => { if (e.button === 1) { e.preventDefault(); RDOCK.closeTab(b.id); } }, contextmenu: e => { e.preventDefault(); RDOCK.tabMenu(b.id, e); },
          dragstart: e => { e.dataTransfer.setData('text/sis-tab', b.id); e.dataTransfer.effectAllowed = 'move'; t.classList.add('drag'); }, dragend: () => t.classList.remove('drag'),
          dragover: e => { if ([...e.dataTransfer.types].includes('text/sis-tab')) { e.preventDefault(); const r = t.getBoundingClientRect(); t.classList.toggle('dl', e.clientX < r.left + r.width / 2); t.classList.toggle('dr', e.clientX >= r.left + r.width / 2); } },
          dragleave: () => t.classList.remove('dl', 'dr'),
          drop: e => { const id = e.dataTransfer.getData('text/sis-tab'); t.classList.remove('dl', 'dr'); if (!id || id === b.id) return; e.preventDefault(); const r = t.getBoundingClientRect(); RDOCK.move(id, b.id, e.clientX >= r.left + r.width / 2); } } },
        h('span.rd-tk', b.kind === 'pdf' ? 'PDF' : 'Page'), h('span.rd-tn', RDOCK.label(b)), h('button.rd-tx', { type: 'button', title: 'Close this tab', 'aria-label': 'Close ' + RDOCK.label(b), on: { click: e => { e.stopPropagation(); RDOCK.closeTab(b.id); } } }, '×'));
      return t; });
    row.replaceChildren(h('div.rd-tl', { role: 'tablist', on: { wheel: e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); } } } }, tabs), h('button.rd-tadd', { type: 'button', title: 'Open another paper or page in a tab', 'aria-label': 'Open another paper or page', on: { click: e => RDOCK.picker(e) } }, '+'), h('span.rd-tsp'),
      RDOCK.splitOn() ? h('button.rd-tbtn.rd-tsplit', { type: 'button', title: 'Split the reader: one, two, or a quadrant (2×2) of your tabs', on: { click: e => RDOCK.splitMenu(e) } }, '◫') : null,
      S.n > 1 ? h('button.rd-tbtn', { type: 'button', title: 'Put the reader on the other side', on: { click: () => RDOCK.swap() } }, '⇄') : null,
      h('button.rd-tbtn.rd-tclose', { type: 'button', title: 'Close the reader — every tab', on: { click: () => RDOCK.close() } }, '✕'));
    const on = $('.rd-tab.act', row); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },
  /** A tab clicked: read it here (in the pane in focus, or the pane it is in) and, with "follow", take the note to where it is embedded. */
  switchTo(id, e) {
    const b = M.block(id); if (!b) return RDOCK.closeTab(id); const S = RDOCK.S_;
    if (e && e.altKey && RDOCK.splitOn()) { const free = S.show.indexOf(null); if (free >= 0) return RDOCK.open(b, { pane: free }); if (S.n === 1) { RDOCK.setN(2); return RDOCK.open(M.block(id), { pane: 1 }); } }
    const at = S.show.indexOf(id); if (at >= 0) RDOCK.focus(at); else RDOCK.open(b);
    if (RDOCK.tn('rtabs', 'follow', true)) RDOCK.follow(id);
  },
  /** The note to where the paper or page is embedded: its component in view, lit. */
  follow(id) {
    const b = M.block(id); if (!b || !M.doc(b.docId)) return; const show = App.panes().find(p => p.docId === b.docId);
    if (show) { show.pendingFocus = { reveal: id }; show.focusPending(); } else App.openBlock(id);
    setTimeout(() => $$(`.box[data-id="${id}"]`).forEach(x => { x.classList.add('rd-lit'); setTimeout(() => x.classList.remove('rd-lit'), 2200); }), 420);
  },
  tabMenu(id, e) {
    const S = RDOCK.S_, b = M.block(id), at = S.tabs.indexOf(id), d = b && M.doc(b.docId);
    ctxMenu(e.clientX, e.clientY + 8, [{ head: RDOCK.label(b) },
      { label: 'Go to its note', sub: d ? d.title : '', run: () => RDOCK.follow(id) },
      RDOCK.splitOn() ? { label: 'Read it in another pane', sub: S.n === 4 ? 'The quadrant' : S.n === 2 ? 'Beside the other' : 'Splits the reader in two', run: () => RDOCK.switchTo(id, { altKey: true }) } : null,
      at > 0 ? { label: 'Move left', run: () => RDOCK.move(id, S.tabs[at - 1], false) } : null,
      at < S.tabs.length - 1 ? { label: 'Move right', run: () => RDOCK.move(id, S.tabs[at + 1], true) } : null, 'sep',
      { label: 'Close', run: () => RDOCK.closeTab(id) }, S.tabs.length > 1 ? { label: 'Close the others', run: () => S.tabs.filter(x => x !== id).forEach(x => RDOCK.closeTab(x)) } : null]);
  },
  move(id, to, after) { const S = RDOCK.S_; if (!S.tabs.includes(id) || !S.tabs.includes(to)) return; S.tabs = S.tabs.filter(x => x !== id); const k = S.tabs.indexOf(to) + (after ? 1 : 0); S.tabs.splice(k, 0, id); RDOCK.tabsRow(); RDOCK.save(); },
  /** × on a tab: it goes; a pane that showed it takes the next tab (or is freed); the last one closes the reader. */
  closeTab(id) {
    const S = RDOCK.S_, b = M.block(id); S.tabs = S.tabs.filter(x => x !== id); delete S.zoom[id];
    if (b) { const sv = RDOCK.saved(b.docId); if (sv && sv.id === id) _ls.set('rdock:' + b.docId, null); }
    if (!S.tabs.length) return RDOCK.close();
    const k = S.show.indexOf(id);
    if (k >= 0) { S.show[k] = null; RDOCK.unmount(k); const next = S.tabs.find(x => !S.show.includes(x));
      if (next) RDOCK.open(M.block(next), { pane: k });
      else { const left = S.show.filter(Boolean); S.n = left.length <= 1 ? 1 : left.length === 2 ? 2 : 4; S.show = Array.from({ length: S.n }, (_, j) => left[j] || null); S.act = clamp(S.show.indexOf(S.show.find(Boolean)), 0, S.n - 1); RDOCK.remount(); } }
    RDOCK.tabsRow(); RDOCK.save(); if (b) RDOCK.card(b);
  },
  /** ◫: one pane, two, or a quadrant. */
  splitMenu(e) {
    const S = RDOCK.S_, rows = RDOCK.tn('rsplit', 'two', 'cols') === 'rows', few = S.tabs.length < 2;
    ctxMenu(e.clientX - 180, e.clientY + 12, [{ head: S.n > 1 ? `Split · ${S.show.filter(Boolean).length} of ${S.tabs.length} tabs showing` : 'Split the reader' },
      { label: (S.n === 1 ? '✓ ' : '') + 'One', sub: 'The tab in focus', run: () => RDOCK.setN(1) },
      { label: (S.n === 2 ? '✓ ' : '') + (rows ? 'Two, one over the other' : 'Side by side'), sub: few ? 'Open a second tab with + (or pick it in the free pane)' : 'This tab and the next', run: () => RDOCK.setN(2) },
      { label: (S.n === 4 ? '✓ ' : '') + 'Quadrant (2×2)', sub: S.tabs.length < 4 ? 'Up to four: the free panes offer your tabs and +' : 'Four of your tabs', run: () => RDOCK.setN(4) }]);
  },
  setN(n) {
    const S = RDOCK.S_; n = RDOCK.splitOn() ? ([1, 2, 4].includes(n) ? n : 1) : 1; const actId = S.show[S.act];
    let shown = S.show.filter(Boolean); if (n < shown.length) { shown = shown.filter(x => x === actId).concat(shown.filter(x => x !== actId)).slice(0, n); shown = S.show.filter(x => x && shown.includes(x)); }
    else { const spare = S.tabs.filter(x => !shown.includes(x)); while (shown.length < n && spare.length) shown.push(spare.shift()); }
    S.n = n; S.show = Array.from({ length: n }, (_, j) => shown[j] || null); S.act = Math.max(0, S.show.indexOf(actId)); RDOCK.remount(); RDOCK.save();
  },
  /** Every pane again (a split changed). */
  remount() {
    const S = RDOCK.S_; if (!RDOCK.wrap) return; [...RDOCK.panes.keys()].forEach(j => RDOCK.unmount(j, true)); $('.rd-panes', RDOCK.wrap).replaceChildren(); RDOCK.panes = []; RDOCK.layout();
    const want = S.show.slice(), act = S.act; want.forEach((id, j) => { if (id && RDOCK.live(id)) RDOCK.open(M.block(id), { pane: j, restore: true }); else RDOCK.emptyPane(j); });
    RDOCK.focus(act);
  },
  /** Back with the next note (tabs on) after stepping aside. */
  restore() { RDOCK.S = RDOCK.load(); const S = RDOCK.S_; if (!S.open || !S.tabs.length || RDOCK.wrap || RDOCK.phone()) return; RDOCK.mount(); RDOCK.remount(); },
  close(keep) {
    const S = RDOCK.S_, ids = RDOCK.panes.filter(Boolean).map(p => p.id);
    if (!keep) { RDOCK.panes.forEach(p => { if (p) _ls.set('rdock:' + p.docId, null); }); S.tabs = []; S.show = [null]; S.n = 1; S.act = 0; S.open = false; S.zoom = {}; _ls.set('rtabs', S); }
    if (!RDOCK.wrap) return; [...RDOCK.panes.keys()].forEach(j => RDOCK.unmount(j, true)); RDOCK.panes = []; RDOCK.st = null; DOCS._max = null;
    RDOCK.wrap.remove(); RDOCK.wrap = null; RDOCK.layout();
    ids.forEach(id => { const b = M.block(id); if (b) RDOCK.card(b); });
    setTimeout(() => App.panes().forEach(CLIP.mark), 300);
  },
  /** The card on the paper drawn again: "Reading beside the note" while it is out, itself after (a PDF through DOCS). */
  card(b) {
    if (!b) return; if (b.kind !== 'html') return DOCS.repaint(b);
    $$(`.box[data-id="${b.id}"]`).forEach(box => { const old = box.querySelector(':scope > .embed'), pane = DV(box); if (old) old.replaceWith(WIDGETS.html.body(M.block(b.id), M.doc(b.docId), pane, !!(pane && pane.travel))); });
  },
  /** Gabe's maximised drawing (PDFW.full) at this zoom; the place in the paper is kept. An HTML page: the page, once
      (put in again only when its file changes, so it keeps its place and what you did in it). */
  draw(p = RDOCK.st) {
    if (!p || !p.ov) return; const b = M.block(p.id); if (!b || b.status !== 'live') return RDOCK.closeTab(p.id);
    if (b.kind === 'html') { const c = $('.dk-maxc', p.ov), rec = MEDIA.get(b.media); if (!rec) return RDOCK.closeTab(p.id);
      if (p.media !== b.media || !$('iframe', c)) { p.media = b.media; EMBED._maxId = b.id; const fr = EMBED.frame(rec, 'em-frame'); fr._rdSrc = b.id; c.replaceChildren(fr); }   // 13zw fills it as this page's (QUOTE.fill)
      return RDOCK.countP(p); }
    const at = RDOCK.where(p), body = WIDGETS.pdf.body(b, M.doc(b.docId), { maxView: true, paper: null, zoom: p.zoom }, false);
    body.classList.add('maxed'); $('.dk-maxc', p.ov).replaceChildren(body); p.zl.textContent = Math.round(p.zoom * 100) + '%'; RDOCK.countP(p);
    if (at) { let n = 60; const go = () => { const s = RDOCK.stage(p), sl = s && $(`.pdf-slot[data-p="${at.p}"]`, s); if (!sl) return --n > 0 && setTimeout(go, 50);
      requestAnimationFrame(() => requestAnimationFrame(() => { s.scrollTop = RDOCK.top(s, sl) + at.f * sl.offsetHeight; RDOCK.onScroll(p); })); }; go(); }
    else { let k = 40; const tick = () => { if (!p.ov || !p.ov.isConnected) return; if ($$('.pdf-slot', p.ov).length) RDOCK.onScroll(p); else if (--k > 0) setTimeout(tick, 150); }; setTimeout(tick, 250); }   // its page count once its pages are laid out
  },
  top: (s, sl) => sl.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop,
  /** The page at the top of the reader, and how far down it the top is. */
  where(p = RDOCK.st) { const s = RDOCK.stage(p); if (!s || !s.scrollTop) return null; const y = s.getBoundingClientRect().top, sl = $$('.pdf-slot', s).find(x => x.getBoundingClientRect().bottom > y + 1); return sl ? { p: +sl.dataset.p, f: (y - sl.getBoundingClientRect().top) / (sl.offsetHeight || 1) } : null; },
  page(p = RDOCK.st) { const s = RDOCK.stage(p); if (!s) return 1; const y = s.getBoundingClientRect().top + s.clientHeight * .3, sl = $$('.pdf-slot', s).find(x => x.getBoundingClientRect().bottom > y); return sl ? +sl.dataset.p : ((p && M.block(p.id)) || {}).cur + 1 || 1; },
  onScroll(p = RDOCK.st) { if (!p || p.kind !== 'pdf' || p.raf) return; p.raf = requestAnimationFrame(() => { p.raf = 0; const b = M.block(p.id), n = (b && b.pages) || $$('.pdf-slot', p.ov).length || 0;
    p.pg.textContent = (b && b.view === 'page' ? (b.cur || 0) + 1 : RDOCK.page(p)) + ' / ' + (n || '…'); }); },
  /** Go to page n of pane p (1-based), at a fraction f down it. */
  goPage(p, n, f = 0) { const s = RDOCK.stage(p), sl = s && $(`.pdf-slot[data-p="${n}"]`, s); if (!sl) return false; s.scrollTo({ top: RDOCK.top(s, sl) + f * sl.offsetHeight - 12, behavior: 'smooth' }); return true; },
  step(d, p = RDOCK.st) {
    const b = p && M.block(p.id); if (!b || b.kind !== 'pdf') return; if (b.view === 'page') return PDFW.go(b, (b.cur || 0) + d);
    const s = RDOCK.stage(p), sl = s && $(`.pdf-slot[data-p="${clamp(RDOCK.page(p) + d, 1, $$('.pdf-slot', s).length)}"]`, s); if (sl) s.scrollTo({ top: RDOCK.top(s, sl) - 12, behavior: 'smooth' });
  },
  zoom(v, step, p = RDOCK.st) {
    if (!p || p.kind !== 'pdf') return; let z = v;
    if (step) { const Z = RDOCK.ZOOMS, i = Z.findIndex(x => x >= p.zoom - 1e-3); z = Z[clamp((i < 0 ? Z.length - 1 : i) + v, 0, Z.length - 1)]; }
    if (Math.abs(z - p.zoom) < 1e-3) return; p.zoom = z; RDOCK.S_.zoom[p.id] = z; RDOCK.save(); RDOCK.draw(p);
  },
  wheel(e, p) { p = p || RDOCK.st; if (!p || p.kind !== 'pdf' || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); p.wz = (p.wz || 0) + e.deltaY; clearTimeout(p.wt);
    p.wt = setTimeout(() => { const d = p.wz; p.wz = 0; RDOCK.zoom(d < 0 ? Math.min(3, Math.ceil(-d / 80)) : -Math.min(3, Math.ceil(d / 80)), true, p); }, 140); },
  swap() { const S = RDOCK.S_; S.side = S.side === 'left' ? 'right' : 'left'; RDOCK.panes.forEach(p => { if (p) p.side = S.side; }); RDOCK.save(); RDOCK.layout(); },
  full(p = RDOCK.st) { if (!p) return; p.full = !p.full; p.ov.classList.toggle('rd-docked', !p.full); p.fs.textContent = p.full ? '◧' : '⤢'; p.fs.title = p.full ? 'Back beside the note (Esc)' : 'Full screen (Esc comes back)'; RDOCK.layout(); RDOCK.draw(p); },
  /** Part of the window for the reader (half, or as Settings says): #app becomes two columns, the header across both, the note in the other part. */
  layout() {
    const S = RDOCK.S_, shown = RDOCK.panes.filter(Boolean), on = !!RDOCK.wrap && !(shown.length && shown.every(p => p.full)), bd = document.body;
    bd.classList.toggle('rd-on', on); bd.classList.toggle('rd-left', on && S.side === 'left'); bd.classList.toggle('rd-right', on && S.side === 'right');
    const wv = { narrow: [2, 3], half: [1, 1], wide: [3, 2] }[RDOCK.tn('rtabs', 'width', 'half')] || [1, 1], [a, c] = S.side === 'left' ? wv : [wv[1], wv[0]];
    $('#app') && $('#app').style.setProperty('--rd-cols', `minmax(0,${a}fr) minmax(0,${c}fr)`);
    if (RDOCK.wrap) { const ps = $('.rd-panes', RDOCK.wrap), rows = S.n === 2 && RDOCK.tn('rsplit', 'two', 'cols') === 'rows'; ps.className = 'rd-panes n' + S.n + (rows ? ' rows' : ''); RDOCK.wrap.classList.toggle('rd-split', S.n > 1); RDOCK.wrap.classList.toggle('rd-notabs', !RDOCK.tabsOn()); }
    requestAnimationFrame(() => { App.panes().forEach(p => p.paper && p.paper.apply()); dispatchEvent(new Event('resize')); });   // what places itself by the window (the tab row, the web's banner) places itself again
  },
  count() { const st = RDOCK.st; if (st && st.hl) { const n = QUOTE.of(st.id).length; st.hl.textContent = n ? 'Highlights · ' + n : 'Highlights'; } },
  /** count() for one pane (what wraps count reads RDOCK.st). */
  countP(p) { const keep = RDOCK.st; RDOCK.st = p; try { RDOCK.count(); } finally { RDOCK.st = keep; } },
  countAll() { RDOCK.panes.forEach(p => p && RDOCK.countP(p)); },
};
{
  // the book on the card's bar (beside its maximise)
  const bar = PDFW.bar; PDFW.bar = function (b, m, n, cur, maxed, ro) { const r = bar.apply(this, arguments);
    if (!maxed && !RDOCK.phone()) { const mx = [...r.bar.children].find(x => x.title === 'Maximise'), bk = h('button.btn.xs.rd-open', { title: 'Read beside the note — the paper in half the screen, the note in the other', html: RDOCK.BOOK, on: { click: e => { e.stopPropagation(); RDOCK.open(M.block(b.id)); } } }); mx ? mx.before(bk) : r.bar.append(bk); }
    return r; };
  // "◧ Beside" on Gabe's maximised view
  const dm = DOCS.max; DOCS.max = function (b) { const r = dm.apply(this, arguments);
    if (b && b.kind === 'pdf' && !RDOCK.phone()) { const ov = [...$$('.embed-max.dk-max:not(.rd-dock)')].pop(), x = ov && [...$$('.em-bar button', ov)].find(z => /Close/.test(z.textContent)); if (x) x.before(h('button.btn.sm', { title: 'Read it beside the note — the paper in half the screen', on: { click: e => { e.stopPropagation(); RDOCK.open(M.block(b.id)); } } }, '◧ Beside')); }
    return r; };
  // while it is out, the card says so
  const away = (cls, b, hgt, ro) => h('div.' + cls + '.rd-away', { style: { height: hgt + 'px' } }, h('div.rd-away-in', h('span.rd-away-ic', { html: RDOCK.BOOK }), h('b', b.label || (b.kind === 'pdf' ? 'PDF' : 'Page')), h('span', 'Reading beside the note'), ro ? null : h('button.btn.xs', { on: { click: e => { e.stopPropagation(); RDOCK.closeTab(b.id); } } }, 'Put it back here')));
  const wb = WIDGETS.pdf.body; WIDGETS.pdf.body = function (b, d, pane, ro) {
    if (RDOCK.has(b.id) && !(pane && pane.maxView)) return away('pdfw', b, (b.h || 560) + 40, ro);
    return wb.apply(this, arguments); };
  // V3.945 — an HTML page: the book among its tools, "◧ Beside" when maximised, and the card while it is out
  const hb = WIDGETS.html.body; WIDGETS.html.body = function (b, d, pane, ro) {
    if (RDOCK.has(b.id)) return away('embed', b, b.h || 400, ro);
    const r = hb.apply(this, arguments), tools = r && $('.embed-tools', r);
    if (tools && !RDOCK.phone()) { const bk = h('button.rd-open', { title: 'Read beside the note — the page in half the screen, the note in the other', html: RDOCK.BOOK, on: { click: e => { e.stopPropagation(); RDOCK.open(M.block(b.id)); } } });
      tools.firstChild ? tools.firstChild.after(bk) : tools.append(bk); }   // after ⛶
    return r; };
  const em = EMBED.max; EMBED.max = function (b) { const r = em.apply(this, arguments);
    if (b && b.kind === 'html' && !RDOCK.phone()) { const ov = [...$$('.embed-max:not(.rd-dock)')].pop(), x = ov && [...$$('.em-bar button', ov)].find(z => /Close/.test(z.textContent));
      if (x) x.before(h('button.btn.sm', { title: 'Read it beside the note — the page in half the screen', on: { click: e => { e.stopPropagation(); x.click(); RDOCK.open(M.block(b.id)); } } }, '◧ Beside')); }
    return r; };
  // V3.1002 — a page in a pane is filled as that pane's page, even when two panes draw in the same moment
  const qf = QUOTE.fill; QUOTE.fill = function (fr, rec, srcId) { return qf.call(this, fr, rec, (fr && fr._rdSrc) || srcId); };
  // "from …" on a quote, and "on the note" in the highlights list, stay with the paper beside
  const qg = QUOTE.goto; QUOTE.goto = function (q) { const p = q && q.quote && RDOCK.paneOf(q.quote.src); if (p) return MXHL.goto(p.id, q); return qg.apply(this, arguments); };
  const mc = MXHL.close; MXHL.close = function (ov) { if (ov && ov.classList.contains('rd-dock')) { const p = RDOCK.panes.find(x => x && x.ov === ov); if (p && p.full) RDOCK.full(p); return; } return mc.apply(this, arguments); };
  // a highlight made in it shows up in the note
  const qm = QUOTE.make; QUOTE.make = function (sel) { const b = qm.apply(this, arguments), p = sel && RDOCK.paneOf(sel.src);
    if (b && p && !p.full) setTimeout(() => { const pn = App.panes().find(x => x.docId === b.docId); if (pn && pn.reveal) pn.reveal(b.id); }, 150); return b; };
  // a page turned on a card redraws the pane that shows it too; the panes' files are never let go while they show
  const rp = DOCS.repaint; DOCS.repaint = function (b) { const r = rp.apply(this, arguments); RDOCK.panes.forEach(p => { if (p && b && p.id === b.id && !(DOCS._max && DOCS._max.id === b.id)) RDOCK.draw(p); }); return r; };
  const tr = PDFW.trim; PDFW.trim = function () { const keep = RDOCK.panes.map(p => p && (M.block(p.id) || {}).media).filter(m => m && !PDFW.pin[m]); keep.forEach(m => { PDFW.pin[m] = 1; }); try { return tr.apply(this, arguments); } finally { keep.forEach(m => { delete PDFW.pin[m]; }); } };
  // ← → page while the pointer is over a pane; Esc from full screen comes back beside
  window.addEventListener('keydown', e => {
    if (!RDOCK.panes.some(Boolean) || $('.ovl') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    const fp = RDOCK.panes.find(p => p && p.full); if (e.key === 'Escape' && fp) { e.preventDefault(); e.stopPropagation(); return RDOCK.full(fp); }
    const p = RDOCK.panes.find(x => x && x.hover); const d = !p || p.kind !== 'pdf' ? 0 : e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'PageUp' ? -1 : 0; if (!d) return;
    e.preventDefault(); e.stopPropagation(); RDOCK.step(d, p);
  }, true);
  // where it lives: with the tabs on, it stays from note to note and steps aside on pages that aren't notes; off, it belongs to its note — back when the note is, gone when it isn't
  const rr = DocView.render; DocView.render = function (docId) { const r = rr.apply(this, arguments);
    if (!RDOCK.phone()) setTimeout(() => {
      if (RDOCK.tabsOn()) { if (!RDOCK.wrap && App.panes().length) RDOCK.restore(); return; }
      const s = RDOCK.saved(docId), b = s && M.block(s.id); if (b && b.docId === docId && !RDOCK.has(b.id) && App.panes().some(p => p.docId === docId)) RDOCK.open(b);
    }, 0);
    return r; };
  addEventListener('hashchange', () => setTimeout(() => { if (!RDOCK.wrap) return;
    if (RDOCK.tabsOn()) { if (!App.panes().length) RDOCK.close(true); return; }
    const st = RDOCK.panes.find(Boolean); if (!st || !App.panes().some(p => p.docId === st.docId)) RDOCK.close(true); }, 0));
  { const ch = changed; let t = null; changed = function (...a) { const r = ch.apply(this, a); clearTimeout(t); t = setTimeout(() => { RDOCK.countAll(); if (RDOCK.wrap) { const S = RDOCK.S_, gone = S.tabs.filter(x => !RDOCK.live(x)); gone.forEach(x => RDOCK.closeTab(x)); if (!gone.length) RDOCK.tabsRow(); } }, 250); return r; }; }
}
