/* ==========================================================================
   13ze · The phone layout. On a narrow screen (or when chosen) the app shows
   five screens instead of the canvas: Today, Search, ＋ Capture, Timers and
   Reminders, with notes opened as a single column of their components (the
   same editor: marks, lists, styles, terms all work). "Use the full layout"
   (in ⋯) switches back to the canvas; the choice is kept on this device.
   ========================================================================== */
const MOBILE = {
  on: false, tab: 'today', note: null, q: '', _dirty: false, focusAfterRender: null,
  pref: () => _ls.get('layout', null), // 'phone' | 'full' | null (by screen width)
  narrow: () => matchMedia('(max-width: 760px) and (pointer: coarse)').matches,
  decide() { const p = MOBILE.pref(); MOBILE.on = p === 'phone' || (p !== 'full' && MOBILE.narrow()); document.body.classList.toggle('mobile', MOBILE.on); return MOBILE.on; },
  toggle() { _ls.set('layout', MOBILE.on ? 'full' : 'phone'); MOBILE.decide(); App._mounted = false; App.refresh(); },
  go(tab, note) { MOBILE.tab = tab; MOBILE.note = note || null; const hsh = '#/m/' + tab + (note ? '/' + note : ''); if (location.hash !== hsh) location.hash = hsh; else MOBILE.render(); },
  fromHash() { const p = (location.hash || '').slice(2).split('/'); if (p[0] === 'm') { MOBILE.tab = p[1] || 'today'; MOBILE.note = p[2] ? decodeURIComponent(p[2]) : null; }
    else if (p[0] === 'doc' && p[1]) { MOBILE.tab = 'note'; MOBILE.note = decodeURIComponent(p[1]); } else if (p[0] === 'reminders') MOBILE.tab = 'remind'; else if (p[0] === 'settings') MOBILE.tab = 'more'; },
  /** Don't redraw under the person typing: wait until they leave the field. */
  refresh() { const a = document.activeElement; if (a && $('#view') && $('#view').contains(a) && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && a.type !== 'search') { MOBILE._dirty = true; return; } MOBILE.render(); },

  /* ---------- the frame ---------- */
  render() {
    MOBILE._dirty = false; MOBILE.fromHash(); const v = $('#view'); if (!v) return;
    const tabs = [['today', '◷', 'Today'], ['search', '⌕', 'Search'], ['capture', '＋', 'Capture'], ['timers', '⏱', 'Timers'], ['remind', '🔔', 'Reminders']];
    const body = MOBILE.tab === 'note' ? MOBILE.noteView(MOBILE.note) : MOBILE.tab === 'search' ? MOBILE.search() : MOBILE.tab === 'capture' ? MOBILE.capture() : MOBILE.tab === 'timers' ? MOBILE.timers() : MOBILE.tab === 'remind' ? MOBILE.reminders() : MOBILE.tab === 'more' ? MOBILE.more() : MOBILE.today();
    const st = SYNC.conflicts ? ['conf', '⚠ ' + SYNC.conflicts] : SYNC.online === false ? ['off', 'offline · ' + SYNC.outbox.size] : SYNC.outbox.size ? ['pend', '↑ ' + SYNC.outbox.size] : SYNC.on ? ['ok', ''] : ['none', ''];
    v.className = 'mview';
    v.replaceChildren(h('div.m-top', h('button.m-brand', { on: { click: () => MOBILE.go('today') } }, 'SiS'), h('span.m-ttl', MOBILE.title || ''), h('span.spacer'),
        st[0] !== 'none' ? h('button.m-sync.sy-' + st[0], { on: { click: e => SYNC.conflicts ? SYNC.conflictsDialog() : SYNC.menu(e) } }, h('i.sy-dot'), st[1]) : null,
        h('button.m-more', { on: { click: () => MOBILE.go('more') } }, '⋯')),
      h('div.m-body.scrolly', body),
      h('nav.m-nav', tabs.map(([k, ic, lab]) => h('button.m-tab' + (MOBILE.tab === k ? '.on' : '') + (k === 'capture' ? '.cap' : ''), { on: { click: () => MOBILE.go(k) } }, h('span.m-ic', ic), h('span.m-lab', lab)))));
    if (MOBILE.focusAfterRender) { const f = MOBILE.focusAfterRender; MOBILE.focusAfterRender = null; requestAnimationFrame(() => { const ed = $(`.m-card[data-id="${f.id}"] .ed`); if (ed) { ed.focus(); ED.setCaret(ed, f.pos || 0); ed.scrollIntoView({ block: 'center' }); } }); }
    if (MOBILE._reveal) { const id = MOBILE._reveal; MOBILE._reveal = null; requestAnimationFrame(() => { const c = $(`.m-card[data-id="${id}"]`); if (c) { c.scrollIntoView({ block: 'center' }); c.classList.add('flash'); } }); }
  },
  head(t) { MOBILE.title = t; },
  recentDocs(n = 12) { return DB.all('documents').filter(d => !d.deleted).sort((a, b) => (b.modified || b.created || '').localeCompare(a.modified || a.created || '')).slice(0, n); },
  docRow(d, sub) { return h('div.m-row', { on: { click: () => MOBILE.go('note', d.id) } }, typechip(d.type), h('div.m-rt', h('b', d.title), h('span.m-rs', sub || M.docPath(d)))); },

  /* ---------- screens ---------- */
  today() {
    MOBILE.head(fmtDayLong(new Date()));
    const today = localDate(new Date()), recent = DB.where('blocks', b => b.status === 'live' && b.kind === 'component' && localDate(b.modified || b.created) === today).sort((a, b) => (b.modified || '').localeCompare(a.modified || '')).slice(0, 30);
    const act = TIMER.active(), due = REM.due();
    return h('div.m-pg',
      act.length ? h('div.m-sec', h('h3', 'Timers'), act.map(s => h('div.m-row', { on: { click: () => MOBILE.go('timers') } }, h('i.td-dot.' + s.state), h('div.m-rt', h('b', (M.doc(s.docId) || {}).title || '—'), h('span.m-rs.mono', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true)))))) : null,
      due.length ? h('div.m-sec', h('h3', 'Due soon'), h('div.rm-list', REM.list(due, { compact: true }))) : null,
      h('div.m-sec', h('h3', 'Written today'), recent.length ? recent.map(b => h('div.m-row', { on: { click: () => { MOBILE._reveal = b.id; MOBILE.go('note', b.docId); } } }, h('span.m-tm.mono', fmtTime(b.modified || b.created)), h('div.m-rt', h('b', M.blockName(b)), h('span.m-rs', snippet(b.body.text, 90) || '—'), h('span.m-rs.muted', (M.doc(b.docId) || {}).title || '')))) : h('p.muted.tiny', 'Nothing yet today — ＋ Capture adds to today’s day note.')),
      h('div.m-sec', h('h3', 'Recent notes'), MOBILE.recentDocs(8).map(d => MOBILE.docRow(d, fmtWhen(d.modified || d.created)))));
  },
  search() {
    MOBILE.head('Search');
    const inp = h('input.inp.m-q', { type: 'search', placeholder: 'Notes, components, terms…', value: MOBILE.q }), out = h('div');
    const draw = () => { const q = inp.value.trim().toLowerCase(); MOBILE.q = inp.value; if (!q) { out.replaceChildren(h('div.m-sec', h('h3', 'Recent notes'), MOBILE.recentDocs(15).map(d => MOBILE.docRow(d)))); return; }
      const docs = DB.where('documents', d => !d.deleted && (d.title || '').toLowerCase().includes(q)).slice(0, 20);
      const comps = DB.where('blocks', b => b.status === 'live' && (b.kind === 'component') && ((b.label || '') + ' ' + b.body.text).toLowerCase().includes(q)).sort((a, b) => (b.modified || '').localeCompare(a.modified || '')).slice(0, 40);
      const terms = DB.where('terms', t => (t.label || '').toLowerCase().includes(q)).slice(0, 8);
      out.replaceChildren(
        docs.length ? h('div.m-sec', h('h3', 'Notes'), docs.map(d => MOBILE.docRow(d))) : null,
        terms.length ? h('div.m-sec', h('h3', 'Terms'), h('div.row', { style: { gap: '6px', flexWrap: 'wrap' } }, terms.map(t => h('button.btn.xs', { on: { click: () => { inp.value = t.label; draw(); } } }, h('span.term-demo', t.label))))) : null,
        comps.length ? h('div.m-sec', h('h3', 'Components'), comps.map(b => { const t = b.body.text, i = t.toLowerCase().indexOf(q), s = Math.max(0, i - 40);
          return h('div.m-row', { on: { click: () => { MOBILE._reveal = b.id; MOBILE.go('note', b.docId); } } }, h('div.m-rt', h('b', M.blockName(b)), h('span.m-rs', (s ? '…' : '') + t.slice(s, i), i >= 0 ? h('mark', t.slice(i, i + q.length)) : '', t.slice(i + q.length, i + q.length + 80)), h('span.m-rs.muted', (M.doc(b.docId) || {}).title || ''))); })) : null,
        !docs.length && !comps.length && !terms.length ? h('p.muted', 'Nothing matches.') : null); };
    inp.addEventListener('input', debounce(draw, 150)); draw(); setTimeout(() => inp.focus(), 50);
    return h('div.m-pg', inp, out);
  },
  capture() {
    MOBILE.head('Capture'); let kind = null, target = null;
    const ta = h('textarea.inp.m-cap', { rows: 6, placeholder: 'What happened, what arrived, what you thought…' });
    const kinds = h('div.m-kinds'), drawK = () => kinds.replaceChildren(...[null, 'observation', 'idea', 'question', 'barrier', 'result'].filter(k => !k || KIND[k]).map(k => h('button.kpick' + (kind === k ? '.on' : ''), { style: { '--kc': k ? `var(--k-${k})` : 'var(--ink-3)' }, on: { click: () => { kind = k; drawK(); } } }, k ? KIND[k].label : 'Entry')));
    drawK();
    const where = h('button.btn.sm.m-where'), drawW = () => where.textContent = '→ ' + (target ? snippet(M.doc(target).title, 40) : 'Today’s day note');
    where.addEventListener('click', () => { const m = modal({ title: 'Add it to…', body: optionPicker({ placeholder: 'Search notes…', sort: 'mcap', items: q => [{ day: true }, ...MOBILE.recentDocs(200).filter(d => d.type !== 'day' && (!q || d.title.toLowerCase().includes(q)))], render: d => d.day ? h('div', h('b', 'Today’s day note')) : h('div', typechip(d.type), ' ', d.title, h('span.s', M.docPath(d))), onPick: d => { m.close(); target = d.day ? null : d.id; drawW(); } }), actions: [{ label: 'Cancel' }] }); });
    drawW();
    const add = () => { const text = ta.value.trim(); if (!text) return toast('Write something first');
      if (!target) DAY.add(text, kind); else { const d = M.doc(target), last = M.liveBlocks(d.id).slice(-1)[0], b = M.addBlock(d.id, last ? last.id : null, {}); const body = { text, marks: [] }; if (kind) { const it = M.createItem(kind, text, b); body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: text.length, ref: it.id }); } M.saveBlockBody(b, body); IX.rebuild(); changed(); }
      ta.value = ''; toast('Added to ' + (target ? '“' + snippet(M.doc(target).title, 30) + '”' : 'today’s day note')); };
    const photo = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, on: { change: async e => { const f = e.target.files && e.target.files[0]; if (!f) return;
      const d = target ? M.doc(target) : DAY.doc(), bs = M.liveBlocks(d.id).filter(b => b.x != null), y = bs.length ? Math.max(...bs.map(b => (b.y || 0) + 160)) : 200;
      const b = FIG.create(d, { x: 0, y }, 1, 1, [f]); if (ta.value.trim()) { b.body = { text: ta.value.trim(), marks: [] }; DB.put('blocks', b); ta.value = ''; } toast('Photo added to ' + (target ? '“' + snippet(d.title, 30) + '”' : 'today’s day note')); e.target.value = ''; } } });
    return h('div.m-pg', ta, kinds, h('div.row.m-capbar', where, h('span.spacer'), h('button.btn', { on: { click: () => photo.click() } }, '📷 Photo'), h('button.btn', { title: 'Record from the microphone into the note (or today’s day note)', on: { click: () => { const d = target ? M.doc(target) : DAY.doc(), bs = M.liveBlocks(d.id).filter(b => b.x != null), y = bs.length ? Math.max(...bs.map(b => (b.y || 0) + 160)) : 200; const b = REC.create(d.id, { x: 0, y }); MOBILE._reveal = b.id; MOBILE.go('note', d.id); setTimeout(() => REC.start(M.block(b.id)), 80); } } }, '● Record'), h('button.btn.pri', { on: { click: add } }, 'Add')), photo,
      h('p.tiny.muted', 'A photo goes in as an image panel; any text you wrote becomes its caption.'),
      h('div.m-sec', h('h3', 'Earlier today'), DAY.entries(DAY.doc(undefined, false) || { id: '_' }).slice(-6).reverse().map(b => h('div.m-row', { on: { click: () => { MOBILE._reveal = b.id; MOBILE.go('note', b.docId); } } }, h('span.m-tm.mono', b.label || ''), h('div.m-rt', h('span.m-rs', snippet(b.body.text, 100)))))));
  },
  timers() {
    MOBILE.head('Timers'); const act = TIMER.active();
    const card = s => { const d = M.doc(s.docId), run = s.state === 'running';
      return h('div.m-timer' + (run ? '.run' : ''), h('div.m-tn', { on: { click: () => MOBILE.go('note', s.docId) } }, d ? d.title : '—', s.iterN > 1 ? h('span.pill', '#' + s.iterN) : null),
        h('div.m-tt.mono', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true)),
        h('div.m-tb', run ? h('button.btn', { on: { click: () => TIMER.pause(s) } }, '❚❚ Pause') : h('button.btn', { on: { click: () => TIMER.resume(s) } }, '▶ Resume'),
          h('button.btn.pri', { on: { click: () => TIMERUI.complete(s) } }, '✓ Done'), h('button.btn', { on: { click: () => TIMERUI.iterate(s) } }, '↻ Next'), h('button.btn.danger', { on: { click: () => TIMERUI.cancel(s) } }, '✕'))); };
    const waiting = DB.where('blocks', b => b.kind === 'timer' && b.status === 'live' && M.session(b.sessionId) && M.session(b.sessionId).state === 'complete');
    return h('div.m-pg', act.length ? act.map(card) : h('p.muted', 'No timer running.'),
      waiting.length ? h('div.m-sec', h('h3', 'Finished, waiting for a tag'), waiting.map(b => h('div.m-row', { on: { click: () => { MOBILE._reveal = b.id; MOBILE.go('note', b.docId); } } }, h('div.m-rt', h('b', fmtDur(TIMER.elapsed(M.session(b.sessionId)), true)), h('span.m-rs', (M.doc(b.docId) || {}).title))))) : null,
      h('div.m-sec', h('h3', 'Start a timer on…'), MOBILE.recentDocs(10).filter(d => !TIMER.activeFor(d.id)).map(d => h('div.m-row', { on: { click: () => { TCMP.start(d.id); MOBILE.render(); } } }, h('span.m-ic2', '▶'), h('div.m-rt', h('b', d.title), h('span.m-rs', M.docPath(d)))))));
  },
  reminders() {
    MOBILE.head('Reminders'); const open = REM.open();
    return h('div.m-pg', h('div.row', { style: { gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } }, Object.entries(REMKIND).map(([k, K]) => h('button.btn.sm' + (k === 'deadline' ? '.pri' : ''), { on: { click: () => REM.edit({ kind: k }) } }, '+ ' + K.label))),
      open.length ? h('div.rm-list.page', REM.list(open)) : h('p.muted', 'Nothing coming up.'));
  },
  more() {
    MOBILE.head('More');
    return h('div.m-pg', h('div.m-sec', h('h3', 'This device'), DEVICES.settings()),
      h('div.m-sec', h('h3', 'Layout'), h('button.btn', { on: { click: () => MOBILE.toggle() } }, 'Use the full layout (canvas)'), h('p.tiny.muted', 'Kept on this device. Settings → Devices switches back.')),
      h('div.m-sec', h('h3', 'Theme'), h('button.btn', { on: { click: () => { saveSettings({ theme: isDark() ? 'light' : 'dark' }); applyTheme(); applyKindCSS(); MOBILE.render(); } } }, isDark() ? 'Light' : 'Dark')),
      h('p.tiny.muted', 'Build ' + BUILD));
  },
  /** A note as one column of its components, in order — the same editor as on the canvas. */
  noteView(id) {
    const d = M.doc(id); if (!d) { MOBILE.head('Note'); return h('p.muted', 'This note isn’t here (yet).'); }
    MOBILE.head(d.title);
    const host = h('div.canvas-host.m-note'); host._dv = MOBILE.pane(d);
    const blocks = d.blockIds.map(M.block).filter(b => b && b.status === 'live' && b.kind !== 'timer' || b && b.kind === 'timer' && b.status === 'live');
    blocks.forEach(b => { const kinds = IX.kindsOf(b), card = h('div.m-card' + (kinds[0] ? '' : ''), { 'data-id': b.id, style: { '--kc': kinds[0] ? `var(--k-${kinds[0]})` : 'var(--rule-2)' } });
      const head = h('div.m-ch', h('span.m-cn', b.kind === 'component' ? (prof(d.type).ordered ? prof(d.type).noun + ' ' + M.blockIndex(b) : prof(d.type).noun) : (WIDGETS[b.kind] || {}).label || b.kind), b.label ? h('b', b.label) : null, h('span.spacer'), kinds.slice(0, 2).map(k => kchip(k)), h('span.m-tm.mono', fmtStamp(M.blockTime(b))), TCMP.pill(b));
      card.append(head);
      if (b.kind === 'component' || b.kind === 'ref') { const ed = h('div.ed'); card.append(ed); if (b.kind === 'ref') { const src = M.block(b.refBlockId); ed.textContent = src ? src.body.text : ''; card.append(h('div.tiny.muted', 'embedded from ' + (src ? M.docPath(M.doc(src.docId)) : '—'))); } else ED.attach(ed, b); }
      else if (b.kind === 'figure') { card.append(h('div.m-fig', (b.fig && b.fig.cells || []).filter(c => c.media).map(c => { const m = MEDIA.get(c.media); return m ? h('img', { src: MEDIA.url(m), loading: 'lazy' }) : null; })), b.body && b.body.text ? h('div.serif.tiny', b.body.text) : null); }
      else if (b.kind === 'timer') card.append(TCMP.body(b, d, host._dv, false));
      else if (b.kind === 'task') card.append(TASK.body(b, d, host._dv, false));
      else if (b.kind === 'rec') card.append(REC.body(b, d, host._dv, false));
      else if (b.kind === 'deck' || b.kind === 'pdf') card.append(WIDGETS[b.kind].body(b, d, { maxView: true }, false));
      else if (b.kind === 'ink') card.append(h('div.m-ink', INK.body(b)), h('button.btn.xs', { on: { click: () => INK.convert(b) } }, 'Convert to text'));
      else card.append(h('div.tiny.muted', 'Open this note on a larger screen to use its ' + ((WIDGETS[b.kind] || {}).label || b.kind) + '.'));
      host.append(card); });
    if (!blocks.length) host.append(h('p.muted', 'No components yet.'));
    const add = () => { const last = M.liveBlocks(d.id).slice(-1)[0], b = M.addBlock(d.id, last ? last.id : null, {}); MOBILE.focusAfterRender = { id: b.id, pos: 0 }; MOBILE.render(); };
    return h('div.m-pg', h('div.m-nh', h('button.btn.xs', { on: { click: () => history.length > 1 ? history.back() : MOBILE.go('today') } }, '‹ Back'), typechip(d.type), h('span.m-rs', M.docPath(d))),
      d.synthesis && d.synthesis.text ? h('div.m-syn.serif', d.synthesis.text) : null, host,
      h('div.row', { style: { gap: '8px', margin: '12px 0 30px' } }, h('button.btn.pri', { on: { click: add } }, '＋ ' + prof(d.type).noun), h('button.btn', { on: { click: () => { TCMP.start(d.id); toast('Timer started'); MOBILE.render(); } } }, '⏱ Timer'), h('span.spacer'),
        h('button.btn.ghost.sm', { on: { click: () => { _ls.set('layout', 'full'); MOBILE.decide(); App.go('#/doc/' + d.id); } } }, 'Canvas')));
  },
  /** What the editor expects of a pane, for a single column. */
  pane(d) {
    return { docId: d.id, paper: null, travel: null, sel: null, softRefresh() { }, renderInsp() { }, drawWires() { }, makeRoomBelow() { }, reveal() { }, select() { }, boxH: () => 120, settle: () => false,
      set focusAfterRender(v) { MOBILE.focusAfterRender = v; }, get focusAfterRender() { return MOBILE.focusAfterRender; },
      orderedEditors: () => $$('.m-note .ed'), boxMenu() { }, focusPending() { } };
  },
};
{
  const refresh = App.refresh; App.refresh = function (...a) { if (MOBILE.decide()) { App.renderDock && App.renderDock(); return MOBILE.refresh(); } document.getElementById('view').classList.remove('mview'); return refresh.apply(this, a); };
  document.addEventListener('focusout', () => setTimeout(() => { if (MOBILE.on && MOBILE._dirty) MOBILE.refresh(); }, 300), true);
  matchMedia('(max-width: 760px) and (pointer: coarse)').addEventListener('change', () => { App._mounted = false; App.refresh(); });
  const paint = SYNC.paintDot; SYNC.paintDot = function () { paint.call(SYNC); const b = $('.m-sync'); if (MOBILE.on && b) { const st = SYNC.conflicts ? ['conf', '⚠ ' + SYNC.conflicts] : SYNC.online === false ? ['off', 'offline · ' + SYNC.outbox.size] : SYNC.outbox.size ? ['pend', '↑ ' + SYNC.outbox.size] : ['ok', '']; b.className = 'm-sync sy-' + st[0]; b.replaceChildren(h('i.sy-dot'), st[1]); } };
}
