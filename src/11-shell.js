/* ==========================================================================
   11 · Shell — one page owns the frame, router, storage, index and search
   (§12). Minimal chrome, as in the journal: a small title line, then the
   sections as small text tabs. Everything renders on the paper below.
   ========================================================================== */
const _ls = { get(k, d) { try { const v = localStorage.getItem('sis:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('sis:' + k, JSON.stringify(v)); } catch { } } };
const VIEWS = {};
const TABS = [['home', 'Today'], ['portfolio', 'Portfolio'], ['review', 'Review'], ['activity', 'Activity'], ['terms', 'Terms'], ['library', 'Library'], ['data', 'Data'], ['materials', 'Materials'], ['canvas', 'Canvas'], ['settings', 'Settings']];
const TABOF = { reminders: 'home', mat: 'materials', read: 'library', canvas: 'canvas', project: 'portfolio', theme: 'portfolio', doc: 'portfolio', split: 'portfolio', lens: 'terms' };

const App = {
  route: { name: 'home', args: [] }, focusMode: false,
  go(hash) { if (location.hash === hash) App.refresh(); else location.hash = hash; },
  parse() { const p = (location.hash || '#/home').slice(2).split('/'); return { name: p[0] || 'home', args: p.slice(1).map(decodeURIComponent) }; },
  refresh() {
    const r = App.parse(), view = VIEWS[r.name] || VIEWS.home, same = r.name === App.route.name && r.args.join('/') === App.route.args.join('/') && App._mounted;
    App.route = r; hideHover();
    App.renderTabs(); App.renderDock();
    if (same && view.update) { view.update(...r.args); }
    else {
      const host = $('#view'); host.className = view.canvas ? 'canvasview' : 'pageview';
      const out = view.render(...r.args) || h('div');
      host.replaceChildren(view.canvas ? out : h('div.pagewrap.scrolly', out)); App._mounted = true;
      if (!view.canvas) { const pw = $('.pagewrap', host); if (App._scroll && App._scroll.key === location.hash) pw.scrollTop = App._scroll.top; pw.addEventListener('scroll', debounce(() => { App._scroll = { key: location.hash, top: pw.scrollTop }; }, 80)); }
      view.after && view.after(...r.args);
    }
    if (!view.title) App.setTitle(TABS.find(t => t[0] === (TABOF[r.name] || r.name)) ? TABS.find(t => t[0] === (TABOF[r.name] || r.name))[1] : '', null);
  },
  /** Row one: the journal-entry-sized title and a small mono meta line. */
  setTitle(text, meta, { editable, onEdit } = {}) {
    const t = $('#ttl'); t.textContent = text || ''; t.contentEditable = editable ? 'plaintext-only' : 'false'; if (editable && t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
    t._onEdit = onEdit || null; t.classList.toggle('ed', !!editable);
    $('#meta').replaceChildren(...(Array.isArray(meta) ? meta : meta ? [meta] : []));
    document.title = (text ? text + ' · ' : '') + 'Scientia In Situ';
  },
  openBlock(id) {
    const b = M.block(id); if (!b) return;
    const panes = App.panes().filter(p => p.docId === b.docId);
    if (panes.length) { const p = panes.includes(App.pane) ? App.pane : panes[0]; p.pendingFocus = { reveal: id }; p.focusPending(); return; }
    DocView.pendingFocus = { reveal: id }; App.go('#/doc/' + b.docId);
  },
  /** Live note panes on screen: one, or up to four (2×2). */
  panes() { return App.route.name === 'doc' ? [DocView] : App.route.name === 'split' ? PANES.slice(0, SplitView.parse(App.route.args).docs.length) : []; },
  /** Every connection opens its target. Alt+click opens it in another pane (up to four); Ctrl+click opens it in the pane you clicked in. */
  jump(id, e, isDoc) {
    if (e && e.altKey) { e.preventDefault && e.preventDefault(); return App.openSide(id, e.target, isDoc); }
    if (e && (e.ctrlKey || e.metaKey) && App.route.name === 'split') { e.preventDefault && e.preventDefault(); return App.replacePane(id, e.target, isDoc); }
    if (isDoc) return App.go('#/doc/' + id); App.openBlock(id);
  },
  openSide(id, fromEl, isDoc) {
    const b = isDoc ? null : M.block(id), docId = isDoc ? id : b && b.docId; if (!docId) return;
    const from = DV(fromEl), cur = App.route.name === 'split' ? SplitView.parse(App.route.args).docs : App.route.name === 'doc' ? [App.route.args[0]] : [];
    if (!cur.length) return isDoc ? App.go('#/doc/' + docId) : App.openBlock(id);
    const at = cur.indexOf(docId);
    if (at >= 0) { const p = PANES[at]; p.pendingFocus = b ? { reveal: id } : null; p.focusPending(); return; }
    let docs = [...cur, docId];
    if (docs.length > MAXPANES) { const fi = Math.max(0, PANES.indexOf(from)); const drop = fi === MAXPANES - 1 ? MAXPANES - 2 : MAXPANES - 1; docs = cur.slice(); docs[drop] = docId; toast('Four panes is the most — replaced one'); }
    const i = docs.indexOf(docId); PANES[i].pendingFocus = b ? { reveal: id } : null;
    App.go(SplitView.route(docs, b ? id : null));
  },
  replacePane(id, fromEl, isDoc) {
    const b = isDoc ? null : M.block(id), docId = isDoc ? id : b && b.docId; if (!docId) return;
    const docs = SplitView.parse(App.route.args).docs, i = Math.max(0, PANES.indexOf(DV(fromEl))), at = docs.indexOf(docId);
    if (at >= 0) { PANES[at].pendingFocus = b ? { reveal: id } : null; PANES[at].focusPending(); return; }
    docs[i] = docId; PANES[i].pendingFocus = b ? { reveal: id } : null; App.go(SplitView.route(docs, b ? id : null));
  },
  renderTabs() {
    const nav = $('#tabs'), cur = App.route.name === 'doc' && (M.doc(App.route.args[0]) || {}).type === 'day' ? 'home' : TABOF[App.route.name] || App.route.name, pend = IX.pendingReviews().length;
    if (!nav.children.length) nav.append(...TABS.map(([k, l]) => h('a.tab', { href: '#/' + k, 'data-k': k }, h('span.tlab', l), h('span.tc'))), h('span.tink'));
    $$('.tab', nav).forEach(a => { const on = a.dataset.k === cur; a.classList.toggle('on', on); if (a.dataset.k === 'canvas') a.hidden = !CANVAS.on();
      const c = $('.tc', a); c.textContent = a.dataset.k === 'review' && pend ? pend : ''; c.classList.toggle('badge', a.dataset.k === 'review' && pend > 0); });
    requestAnimationFrame(() => { const on = $('.tab.on', nav), ink = $('.tink', nav); if (!on) { ink.style.opacity = 0; return; } ink.style.opacity = 1; ink.style.width = $('.tlab', on).offsetWidth + 'px'; ink.style.transform = `translateX(${on.offsetLeft + $('.tlab', on).offsetLeft}px)`; });
  },

  /* ---------------- timer chips (two may run: overlap is multitask, counted once) ---------------- */
  renderDock() {
    const act = TIMER.active(), multi = TIMER.runningAll().length > 1;
    $('#timers').replaceChildren(...act.map(s => { const d = M.doc(s.docId);
      return h('div.tchip' + (s.state === 'running' ? '.run' : '.paused') + (multi && s.state === 'running' ? '.multi' : ''), { title: (multi ? 'Multitasking — the overlap is counted once in day totals. ' : '') + (d ? d.title : '') },
        h('i'), h('a.tlk', { href: '#/doc/' + s.docId }, d ? snippet(d.title, 22) : '—'), h('span.wt', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true)),
        s.state === 'running' ? h('button.ib', { title: 'Pause', on: { click: () => TIMER.pause(s) } }, '❚❚') : h('button.ib', { title: 'Resume', on: { click: () => TIMER.resume(s) } }, '▶'),
        h('button.ib', { title: 'Stop — records the session', on: { click: () => TIMER.stop(s) } }, '■')); }),
      act.length > 1 ? h('span.multi-n', { title: 'Two timers running: overlap counts once' }, '⧉') : null);
  },
  tick() { $$('[data-stepsess]').forEach(el => { const s = M.session(el.dataset.stepsess); if (s) el.textContent = fmtDur(TIMER.elapsed(s) - (+el.dataset.off || 0), true); });
    $$('[data-sess]').forEach(el => { const s = M.session(el.dataset.sess); if (s) el.textContent = fmtDur(TIMER.elapsed(s), true); }); },

  /* ---------------- new note (templates: one → automatic, several → choose) ---------------- */
  newDoc(pre = {}) {
    const projects = DB.all('projects'); if (!projects.length) return toast('Create a project first (Portfolio → + Project)');
    const typ = h('select.inp', userProfiles().map(p => h('option', { value: p.type, selected: p.type === (pre.type || 'experiment') }, p.label)));
    const proj = h('select.inp', h('option', { value: '', selected: pre.projectId === null }, 'No project (general)'), projects.map(p => h('option', { value: p.id, selected: pre.projectId !== null && p.id === (pre.projectId || projects[0].id) }, p.name)));
    const th = h('select.inp'), tpl = h('div'), title = h('input.inp', { placeholder: 'Title (optional)', value: pre.title || '' }), date = h('input.inp.mono', { type: 'date', value: pre.date || localDate(new Date()) });
    let from = 'template', protoSel = null;
    if (pre.runDef) { const rd = M.block(pre.runDef); if (rd && rd.registered) { from = 'protocol'; protoSel = rd.registered.docId; } }
    const fillThemes = () => { th.replaceChildren(h('option', { value: '' }, '— none —'), ...DB.where('themes', t => t.projectId === proj.value && t.status === 'active').map(t => h('option', { value: t.id, selected: t.id === pre.themeId }, t.name))); };
    let tplSel = null;
    const fillTpl = () => {
      const p = prof(typ.value), en = M.enabledTemplates(typ.value), protos = DB.where('documents', d => d.type === 'protocol' && (d.projectId === proj.value));
      tplSel = en[0] ? en[0].id : null; th.disabled = p.scope !== 'theme' || !proj.value;
      if (p.scope === 'theme' && !th.value && th.options.length > 1) th.selectedIndex = 1;
      const canRun = p.bindsTo === 'protocol' && protos.length; if (!canRun) from = 'template';
      tpl.replaceChildren(
        canRun ? h('div.seg', { style: { margin: '12px 0 4px' } }, [['template', 'From a template'], ['protocol', 'Run a protocol']].map(([k, l]) => h('button' + (from === k ? '.on' : ''), { on: { click: () => { from = k; fillTpl(); } } }, l))) : null,
        from === 'protocol' ? h('div', h('div.list', { style: { marginTop: '8px' } }, protos.map((d, i) => { if (!protoSel) protoSel = d.id; return h('label.li.click', h('input', { type: 'radio', name: 'proto', checked: protoSel === d.id, on: { change: () => { protoSel = d.id; } } }), h('span.t', d.title, h('span.s', plural(PROTO.defIn(d.id) ? PROTO.live(PROTO.defIn(d.id)).length : M.liveBlocks(d.id).length, 'step') + ' · every step is bound to the protocol, so barriers roll up to it'))); })),
          h('div.tiny.muted', { style: { marginTop: '6px' } }, 'The timer starts with the run. Check each step off to time it; checking the last one stops the timer.'))
        : en.length > 1
          ? h('div', h('div.lab', { style: { margin: '12px 0 6px' } }, 'Template — more than one is in use for this type'),
            h('div.list', en.map((t, i) => h('label.li.click', h('input', { type: 'radio', name: 'tpl', checked: i === 0, on: { change: () => { tplSel = t.id; } } }), h('span.t', t.name, h('span.s', t.blocks.map(b => b.label || '·').join(' → '))), t.isStandard ? h('span.pill', 'standard') : null))))
          : h('div.tiny.muted', { style: { marginTop: '10px' } }, en.length ? `Uses “${en[0].name}”` : 'No template in use for this type — starts on an empty page'));
    };
    proj.onchange = () => { fillThemes(); fillTpl(); }; typ.onchange = fillTpl;
    fillThemes(); fillTpl();
    modal({ title: 'New note', body: h('div', h('div.grid2', h('label.f', h('span', 'Type'), typ), h('label.f', h('span', 'Project'), proj), h('label.f', h('span', 'Theme'), th), h('label.f', h('span', 'Title'), title), h('label.f', h('span', 'Date — earlier for something done in the past'), date)), tpl),
      actions: [{ label: 'Cancel' }, { label: 'Create', pri: true, run: () => {
        // an experiment starts with its first stage (Planning); a protocol picked here is run in the Run stage that Next makes
        const first0 = CHAIN.firstType();
        if (typ.value === 'experiment' && first0 !== 'experiment' && CHAIN.precedes(first0, 'experiment')) {
          const d = CHAIN.create({ projectId: proj.value || null, themeId: proj.value ? th.value : null, name: title.value, date: date.value, planProto: from === 'protocol' ? protoSel : null });
          pre.onCreate && pre.onCreate(d); const f0 = d.blockIds.map(M.block).find(Boolean); DocView.pendingFocus = f0 ? { focus: f0.id, pos: 0 } : null; App.go('#/doc/' + d.id);
          return toast(`Starts with ${prof(first0).stage || prof(first0).label} — “Next” at the bottom right makes the ${(prof('experiment').stage || 'run').toLowerCase()}${from === 'protocol' && protoSel ? ', with the protocol ready to run' : ''}`, 4500); }
        const pdef = from === 'protocol' && protoSel ? PROTO.defIn(protoSel) : null;
        const d = pdef ? PROTO.runInNewNote(pdef, { projectId: proj.value || null, themeId: proj.value ? th.value || null : null, title: title.value.trim() })
          : from === 'protocol' && protoSel ? M.runProtocol(protoSel, { projectId: proj.value || null, themeId: proj.value ? th.value || null : null, title: title.value.trim() })
          : M.createDoc({ type: typ.value, projectId: proj.value || null, themeId: proj.value ? th.value || null : null, title: title.value.trim(), templateId: tplSel, date: date.value });
        if (date.value && date.value !== localDate(new Date()) && !d.backdate) { // a protocol run entered after the fact: no live timer, everything on that day
          DB.where('sessions', s => s.docId === d.id && s.entry === 'timer').forEach(s => DB.del('sessions', s.id));
          const at = EDIT.atOn(date.value, new Date(d.created)); EDIT.shiftDoc(d, +at - +new Date(d.created)); d.created = isoLocal(at); d.backdate = date.value; DB.put('documents', d); changed(); }
        pre.onCreate && pre.onCreate(d);
        const first = d.blockIds.map(M.block).find(Boolean); DocView.pendingFocus = first ? { focus: first.id, pos: 0 } : null; App.go('#/doc/' + d.id); } }] });
  },

  /* ---------------- Focus mode: fullscreen + keyboard lock, which frees Ctrl+W for terms ---------------- */
  async toggleFocus() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    try { await document.documentElement.requestFullscreen(); if (navigator.keyboard && navigator.keyboard.lock) await navigator.keyboard.lock(['KeyW']); App.focusMode = !!(navigator.keyboard && navigator.keyboard.lock); toast(App.focusMode ? 'Focus mode — Ctrl+W marks a term. Esc (hold) to leave.' : 'Focus mode — this browser cannot lock Ctrl+W; use ' + keyLabel(settings().termKey)); }
    catch (e) { toast('Fullscreen refused: ' + e.message); }
  },
  undo() { const g = DB.undo(); if (!g) return toast('Nothing to undo in this session'); IX.rebuild(); App.refresh(); toast('Undone'); },
  redo() { const g = DB.redo(); if (!g) return toast('Nothing to redo'); IX.rebuild(); App.refresh(); toast('Redone'); },
};

function bootShell() {
  $('#brand').title = 'Today · build ' + BUILD;
  $('#brand').addEventListener('click', () => App.go('#/home'));
  $('#search').addEventListener('click', () => Search.open());
  $('#newexp').addEventListener('click', () => CHAIN.start(App.route.name === 'theme' ? { projectId: (M.theme(App.route.args[0]) || {}).projectId, themeId: App.route.args[0] } : App.route.name === 'project' ? { projectId: App.route.args[0] } : App.route.name === 'doc' && M.doc(App.route.args[0]) ? { projectId: M.doc(App.route.args[0]).projectId, themeId: M.doc(App.route.args[0]).themeId } : {}));
  $('#capture').addEventListener('click', () => DAY.capture());
  $('#newnote').addEventListener('click', () => App.newDoc(App.route.name === 'theme' ? { projectId: (M.theme(App.route.args[0]) || {}).projectId, themeId: App.route.args[0] } : App.route.name === 'project' ? { projectId: App.route.args[0] } : {}));
  $('#themetoggle').addEventListener('click', () => { const go = () => { saveSettings({ theme: isDark() ? 'light' : 'dark' }); applyTheme(); applyKindCSS(); App._mounted = false; App.refresh(); }; document.startViewTransition && !RM() ? document.startViewTransition(go) : go(); });
  const t = $('#ttl');
  t.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); t.blur(); } });
  t.addEventListener('blur', () => { if (t._onEdit) { const v = t.textContent.replace(/\s+/g, ' ').trim(); t._onEdit(v); } });
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey, inField = e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]');
    TIMER.noteInput();
    if (mod && k === 'k' && !inField) { e.preventDefault(); Search.open(); return; }
    if (mod && k === 'k' && inField && !e.target.closest('.ed')) { e.preventDefault(); Search.open(); return; }
    if (mod && e.altKey && k === 'n') { e.preventDefault(); App.newDoc(); return; }
    if (mod && e.shiftKey && (k === ' ' || e.code === 'Space')) { e.preventDefault(); DAY.capture(); return; }
    if (mod && !e.shiftKey && !e.altKey && k === 'p' && !e.target.closest('.ed')) { e.preventDefault(); PAL.open(); return; }
    if (mod && !e.shiftKey && !e.altKey && k === 'o' && !e.target.closest('.ed')) { e.preventDefault(); PAL.switcher(); return; }
    if ($('.ovl')) return;
    if (inField) return;
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? App.redo() : App.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); App.redo(); return; }
    if (mod && k === '.') { e.preventDefault(); App.toggleFocus(); return; }
    if (e.key === '?') { helpModal(); return; }
    if (!mod && !e.altKey && /^[1-7]$/.test(e.key) && !App.route.name.match(/doc|lens|portfolio/)) { App.go('#/' + TABS[+e.key - 1][0]); }
  });
  document.addEventListener('pointerdown', () => TIMER.noteInput(), true);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { App.focusMode = false; navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock(); } document.body.classList.toggle('focus', !!document.fullscreenElement); });
  window.addEventListener('beforeunload', e => { const editing = document.activeElement && document.activeElement.closest && document.activeElement.closest('.ed[contenteditable="true"]'); if (DB.pending > 0 || editing) { e.preventDefault(); e.returnValue = ''; } });
  addEventListener('resize', debounce(() => App.renderTabs(), 100));
}
function helpModal() {
  const s = settings(), row = (k, d) => [h('dt', k), h('dd', d)];
  modal({ title: 'Keys and gestures', wide: true, body: h('dl.help', row(keyLabel(s.structKey), 'Say what a selected phrase is — claim, barrier, resolution, result, takeaway, decision, question, idea, deviation, observation, reminder; / an existing one; W a term; L a link'),
    row('Ctrl+W', 'Mark a term — in Focus mode (Ctrl+.), where the browser lets the page have it. ' + keyLabel(s.termKey) + ' works everywhere'), row('Ctrl+I', 'Cite from the library (with text selected: add it to the library)'),
    row('Enter / Shift+Enter', 'New component below / line break'), row('Double-click paper', 'New component there'), row('Right-click', 'Pull in barriers, structures or components; box actions'),
    row('Drag ● on a box', 'Connect two components and say how (direction matters)'), row('Drag paper · wheel', 'Pan; Ctrl+wheel or pinch zooms; Space+drag pans over boxes'),
    row('Ctrl+click a link', 'Open that note (in a split view: in the pane you clicked)'), row('Alt+click a link', 'Open it beside — up to four notes, 2×2'),
    row('∑ Equation', 'New equation with a legend of its terms, or a registered one; drag its ● onto a calculator to solve it'),
    row('Ctrl+P', 'Command palette — everything the app can do'), row('Ctrl+O', 'Quick switcher — open a note by name'), row('Ctrl+Shift+Space', 'Capture to today’s day note, from anywhere'),
    row('Ctrl+K', 'Search — relevance, recent or keyword; earlier versions open beside'), row('Ctrl+Z · Ctrl+Shift+Z', 'Undo · redo (outside a text box)'),
    row('Ctrl+Alt+N', 'New note'), row('Ctrl+0', 'Fit the note'), row('1 … 7', 'Sections (outside a note)')), actions: [{ label: 'Close', pri: true }] });
}
