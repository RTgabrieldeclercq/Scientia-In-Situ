/* ==========================================================================
   13zzga · Slash commands you make, from workflows (V4.95).
   Gabe, 20 Nov 2026: "Slash commands should be tunable with workflows or
   actions (everything you can think of)."
   - A command of your own is a name (what you type after /), a short
     description and a WORKFLOW: an ordered list of steps, each one chosen
     from a list of actions the app already has — insert text (with
     {date} {time} {now} {selection} {note} {project} {cursor} and the answers
     of earlier prompts), turn the sentence into a structure, set the
     component's kind, tag the note, make a task or a reminder, start the
     timer, insert a widget or a template's components, flag for synthesis,
     bridge, move (the move panel), float, wire to the previous component,
     log a line in the day note, open a note or a tab, run any command-bar
     command or macro, and PROMPT — wait for you to type a value, inline at
     the caret (never the browser's prompt), which later steps use.
   - It is the macro idea (11b: steps behind one /command) with an editor and
     richer steps: a step can run any command, so a macro's steps all fit, and
     Settings can turn a macro into a workflow in one click. Macros stay as
     they are.
   - Running one is ONE undo group: Ctrl+Z undoes every step. A step works on
     the data (the component's body), not the editor, so the steps after a
     re-draw still land where the caret was.
   - The built-in slash commands are tunable too: hide the ones you never use,
     pin favourites (and put them in order), give them aliases (/r for result).
   - Stored in settings (synced): slashCmds = [{ id, name, desc, aliases,
     steps: [{ action, opts }] }], slashTune = { hidden: [], order: [],
     aliases: { slash: [alias…] } }. Edited in Settings → Features → Slash
     commands (a list, a row per step, ↑ ↓ or drag, Try it on a sample
     component in the live preview, export / import as JSON).
   ========================================================================== */
const SWF = {
  FORMAT: 'sis-slash/1',
  CANCEL: { cancel: true },
  CURSOR: '\u0001',
  ICON: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9.2 1.6 3.6 9h4.2l-1 5.4L12.4 7H8.2z"/></svg>',
  opt(k, d) { try { const v = FEAT.tune('slash', k); return v == null ? d : v; } catch (e) { return d; } },
  all: () => (settings().slashCmds || []).filter(x => x && x.name && Array.isArray(x.steps)),
  get: id => SWF.all().find(x => x.id === id || x.name === id) || null,
  /* ---------- the tuning of the built-ins ---------- */
  tune() { const t = settings().slashTune || {}; return { hidden: Array.isArray(t.hidden) ? t.hidden : [], order: Array.isArray(t.order) ? t.order : [], aliases: t.aliases && typeof t.aliases === 'object' ? t.aliases : {} }; },
  saveTune(t) { saveSettings({ slashTune: { hidden: t.hidden, order: t.order, aliases: t.aliases } }); },
  hidden: c => !c.swf && SWF.tune().hidden.includes(c.slash),
  pinned: c => SWF.tune().order.indexOf(c.slash),
  aliasesOf: slash => SWF.tune().aliases[slash] || [],
  /** A tuned alias → the command it stands for (CMD.get falls back to this). */
  byAlias(a) { const T = SWF.tune().aliases; for (const slash of Object.keys(T)) if ((T[slash] || []).includes(a)) { const c = CMD.list.find(x => x.slash === slash) || CMD.inserts().find(x => x.slash === slash); if (c) return c; } return null; },
  /** What the slash menu adds to a command's score: pinned first (in their order), then mine (when asked), a nudge only once you type. */
  boost(c, q) { const p = SWF.pinned(c), mine = !!c.swf && SWF.opt('first', true); if (q) return p >= 0 ? 6 : mine ? 3 : 0; return p >= 0 ? 200 - p : mine ? 100 : 0; },
  /** My commands as CMD commands (11b's CMD.all adds them after the macros; a built-in's slash is never shadowed). */
  asCommands(taken) {
    return SWF.all().filter(x => !taken.has(x.name)).map(x => { taken.add(x.name);
      return { slash: x.name, label: x.desc || '/' + x.name, sub: 'Workflow · ' + plural(x.steps.length, 'step'), group: 'Yours', swf: x, alias: (x.aliases || []).filter(a => !taken.has(a) || a === x.name), args: [], scope: 'both',
        run: async (A, ctx) => { const r = await SWF.run(x, ctx); return r === false ? false : ctx && ctx.el ? true : r; } }; });
  },
  /* ---------- the words a step may use ---------- */
  BUILTIN: ['date', 'time', 'now', 'datelong', 'weekday', 'selection', 'line', 'component', 'note', 'project', 'theme', 'cursor'],
  /** "+1d", "tomorrow 17:00", "fri", "2026-12-01", "+2h": { d, allDay } (null for nothing). */
  when(s, now = new Date()) {
    s = String(s || '').trim().toLowerCase(); if (!s) return null;
    let tm = /\s+(\d{1,2}):(\d{2})$/.exec(s); if (tm) s = s.slice(0, tm.index).trim();
    let d = new Date(now), allDay = !tm, m;
    if ((m = /^\+(\d+)\s*(m|min|h|d|w)$/.exec(s))) { const n = +m[1], u = m[2]; if (u === 'm' || u === 'min') { d = new Date(+now + n * 6e4); allDay = false; } else if (u === 'h') { d = new Date(+now + n * 36e5); allDay = false; } else d.setDate(d.getDate() + n * (u === 'w' ? 7 : 1)); }
    else if (s === 'today' || s === 'now') { if (s === 'now') allDay = false; }
    else if (s === 'tomorrow') d.setDate(d.getDate() + 1);
    else if ((m = /^(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/.exec(s))) { const w = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[1]); d.setDate(d.getDate() + ((w - d.getDay() + 6) % 7) + 1); }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s + 'T00:00');
    else throw new Error('a day: +1d, +2h, tomorrow 17:00, fri, 2026-12-01');
    if (tm) d.setHours(+tm[1], +tm[2], 0, 0); else if (allDay) d.setHours(9, 0, 0, 0);
    return { d, allDay };
  },
  /* ---------- the actions ---------- */
  GROUPS: ['Text', 'Structure', 'Component', 'Note', 'Time and tasks', 'Insert', 'Go and run', 'Ask'],
  A: {},
  def(a) { a.opts = a.opts || []; SWF.A[a.id] = a; return a; },
  defaults(a) { const o = {}; (a.opts || []).forEach(f => { o[f.k] = f.def !== undefined ? f.def : f.type === 'bool' ? false : ''; }); return o; },
  /** A one-line reading of a step (the list, the Try it log). */
  sum(st) { const a = SWF.A[st.action]; if (!a) return 'Unknown action “' + st.action + '”'; const o = Object.assign(SWF.defaults(a), st.opts || {});
    const bits = (a.opts || []).filter(f => f.type !== 'bool' && o[f.k] !== '' && o[f.k] != null).slice(0, 2).map(f => { const v = f.type === 'select' ? ((SWF.optsOf(f).find(x => String(x[0]) === String(o[f.k])) || [])[1] || o[f.k]) : o[f.k]; return snippet(String(v), 38); });
    return a.label + (bits.length ? ' · ' + bits.join(' · ') : ''); },
  optsOf: f => typeof f.opts === 'function' ? f.opts() : f.opts || [],
};
/* ---------- a run: the component, the caret, the answers ---------- */
SWF.session = function ({ cmd, ctx, doc, pane, sim }) {
  const W = {
    sim: !!sim, cmd, ctx, doc, pane, b: null, at: 0, last: null, vars: {}, said: [], i: 0, now: new Date(), rect: null, moved: false, S: null,
    say(t) { W.said.push(t); },
    /** The component this runs on: the one written in, else the one selected, else a new one made when a step needs it. */
    start() {
      if (W.sim) { W.S = { body: { text: 'The edge held at 2 ng/mL after 4 h ', marks: [] }, kind: null, tags: [], items: [] }; W.b = 'sample'; W.at = W.S.body.text.length; return; }
      let b = ctx.block && M.block(ctx.block.id); if (!b && pane && pane.sel) b = M.block(pane.sel); if (b && (b.docId !== doc.id || b.status !== 'live')) b = null;
      W.rect = ctx.el && ctx.el.isConnected ? SLASH.rect(ctx.el) : (() => { const r = pane && pane.paper ? pane.paper.rect() : { left: innerWidth / 2 - 100, top: innerHeight / 2 - 40 }; return { left: r.left + (r.width || 400) / 2 - 150, bottom: r.top + (r.height || 200) / 3, top: r.top + (r.height || 200) / 3 }; })();
      if (b && b.kind === 'component') { W.b = b.id;
        if (ctx.el && ctx.el.isConnected && ctx.block && ctx.block.id === b.id) { const cur = M.block(b.id), body = ED.read(ctx.el, cur.body.marks); if (body.text !== cur.body.text || JSON.stringify(body.marks) !== JSON.stringify(cur.body.marks)) M.saveBlockBody(cur, body); }   // what was typed, as it is now (the /word is already out of it)
        const len = M.block(b.id).body.text.length; W.at = ctx.at != null && ctx.block && ctx.block.id === b.id ? clamp(ctx.at, 0, len) : len; }
      else if (b) W.anchor = b;
    },
    block() { return W.sim ? null : W.b && M.block(W.b); },
    /** A component to write in: make one (below the component this started on, or at the middle of the view) when there is none. */
    ensure() { if (W.sim || W.b) return; if (!pane || pane.docId !== doc.id) throw new Error('the note is not on screen'); const from = W.anchor, p = W.spot(from); const nb = pane.newAt(p.x, p.y, true); W.b = nb.id; W.at = 0; W.last = null; },
    spot(from) { if (from) return { x: from.x || 0, y: (from.y || 0) + pane.boxH(from.id) + 28 }; const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); return { x: Math.round((c.x - 200) / 14) * 14, y: Math.round((c.y - 100) / 14) * 14 }; },
    body() { if (W.sim) return { text: W.S.body.text, marks: W.S.body.marks.map(m => Object.assign({}, m)) }; const cur = M.block(W.b); return { text: cur.body.text || '', marks: ((cur.body && cur.body.marks) || []).map(m => Object.assign({}, m)) }; },
    put(body) { if (W.sim) { W.S.body = body; return; } M.saveBlockBody(M.block(W.b), body); },
    /** Which words a step works on: 'auto' = what the last text step put in, else the sentence before the caret, else all of it. */
    range(what) {
      const t = W.body().text, len = t.length, ok = r => r && r[1] > r[0] ? r : null;
      const sentence = () => ok(SLASH.sentence(t, clamp(W.at, 0, len))), line = () => { let a = W.at, z = W.at; while (a > 0 && t[a - 1] !== '\n') a--; while (z < len && t[z] !== '\n') z++; return ok([a, z]); };
      const last = () => W.last && W.last[1] <= len ? ok(W.last) : null, all = () => ok([0, len]);
      const r = what === 'sentence' ? sentence() : what === 'line' ? line() : what === 'component' ? all() : what === 'last' ? last() : (last() || sentence() || line() || all());
      if (!r) return null; let [a, z] = r; while (a < z && /\s/.test(t[a])) a++; while (z > a && /\s/.test(t[z - 1])) z--; return z > a ? [a, z] : null;
    },
    selText() { if (!W.b) return ''; const r = W.range('auto'); return r ? W.body().text.slice(r[0], r[1]).replace(/￼/g, '') : ''; },
    lineText() { if (!W.b) return ''; const t = W.body().text; let a = W.at, z = W.at; while (a > 0 && t[a - 1] !== '\n') a--; while (z < t.length && t[z] !== '\n') z++; return t.slice(a, z).replace(/￼/g, ''); },
    builtin(k) {
      const n = W.now, bl = W.block(), doc = W.doc;
      switch (k) {
        case 'date': return localDate(n); case 'time': return fmtTime(n); case 'now': return localDate(n) + ' ' + fmtTime(n); case 'datelong': return fmtDayLong(n);
        case 'weekday': return n.toLocaleDateString(undefined, { weekday: 'long' });
        case 'selection': return W.selText(); case 'line': return W.lineText();
        case 'component': return W.sim ? 'Sample' : bl ? M.blockName(bl) : '';
        case 'note': return doc ? doc.title || '' : ''; case 'project': return W.sim ? 'Sample project' : (doc && M.project(doc.projectId) || {}).name || ''; case 'theme': return W.sim ? 'Sample theme' : (doc && doc.themeId && (M.theme(doc.themeId) || {}).name) || '';
        case 'cursor': return SWF.CURSOR;
      } return null;
    },
    /** A text with its {placeholders} filled: a prompt's answer first, then the built-ins; one that is neither stays as written. */
    fill(s) { return String(s == null ? '' : s).replace(/\{([A-Za-z_]\w*)\}/g, (x, k) => { if (k in W.vars) return W.vars[k]; const v = W.builtin(k); return v == null ? x : v; }); },
    /** Where commands run: this note's pane, the component, no editor. */
    cmdCtx() { const c = CMD.ctx({ pane, doc }); return Object.assign(c, { block: W.b && !W.sim ? M.block(W.b) : null, el: null, at: null }); },
    onScreen() { if (!pane || pane.docId !== doc.id || (typeof App !== 'undefined' && App.panes && !App.panes().includes(pane))) throw new Error('the note is not on screen any more — put this step before the one that leaves it'); },
    finish() {
      if (W.sim) return; try { IX.rebuild(); } catch (e) { }
      const b = W.b && M.block(W.b); if (b && !W.moved && b.docId === doc.id && pane && pane.docId === doc.id) pane.focusAfterRender = { id: b.id, pos: W.at };
      changed();
    },
  };
  return W;
};
/** Two animation frames (the canvas settles in the next one), but never more than a moment. */
SWF.frames = () => new Promise(res => { const t = setTimeout(res, 350); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(t); setTimeout(res, 30); })); });
/** Run a workflow in the note on screen. One undo group; a step that fails (or a prompt you Esc) stops the rest and says which. */
SWF.run = async function (cmd, ctx) {
  if (typeof cmd === 'string') cmd = SWF.get(cmd); if (!cmd) { toast('No such command'); return false; }
  ctx = CMD.ctx(ctx); const doc = CMD.need(ctx), pane = ctx.pane, W = SWF.session({ cmd, ctx, doc, pane });
  const real = DB.beginGroup; DB.beginGroup('/' + cmd.name); const grp = DB.group; DB.beginGroup = () => { };   // the steps' own groups fold into this one
  let n = 0, fail = null;
  try {
    W.start();
    for (const [i, st] of cmd.steps.entries()) { const A = SWF.A[st.action]; W.i = i; if (!A) { fail = { i, e: new Error('no such action “' + st.action + '”') }; break; }
      try { await A.run(W, Object.assign(SWF.defaults(A), st.opts || {})); n++; } catch (e) { fail = { i, e }; break; } }
  } catch (e) { fail = { i: 0, e }; }
  finally { try { W.finish(); await SWF.frames(); } catch (e) { console.warn('[slashwf]', e); } DB.beginGroup = real; DB.beginGroup(); SWF.lastRun = { group: grp, name: cmd.name }; }   // the note settles (boxes nudged apart) inside the group, so Ctrl+Z takes that too
  if (fail) { const st = cmd.steps[fail.i], A = st && SWF.A[st.action]; toast(fail.e === SWF.CANCEL ? '/' + cmd.name + ' stopped at step ' + (fail.i + 1) + ' (' + (A ? A.label : '?') + ') — Ctrl+Z undoes the ' + plural(n, 'step') + ' that ran' : '/' + cmd.name + ' stopped at step ' + (fail.i + 1) + (A ? ' (' + A.label + ')' : '') + ': ' + (fail.e && fail.e.message || fail.e), 5200); return false; }
  const said = 'Ran /' + cmd.name + ' · ' + plural(n, 'step') + ' — Ctrl+Z undoes them together'; if (SWF.opt('say', true)) toast(said, 3600); return said;
};
/** The same steps on a sample component in memory (Settings → Try it): what changes is shown, nothing is written; steps that act elsewhere say what they would do. */
SWF.simulate = async function (cmd) {
  const W = SWF.session({ cmd, ctx: {}, doc: { id: 'sample', title: 'Sample note', projectId: null, themeId: null }, pane: null, sim: true }); W.start();
  W.now = new Date(); const log = []; let n = 0, err = null;
  for (const [i, st] of cmd.steps.entries()) { const A = SWF.A[st.action]; if (!A) { err = 'step ' + (i + 1) + ': no such action'; break; }
    const k = W.said.length; try { await A.run(W, Object.assign(SWF.defaults(A), st.opts || {})); n++; } catch (e) { err = 'step ' + (i + 1) + ' (' + A.label + '): ' + (e && e.message || e); break; }
    log.push({ i, label: SWF.sum(st), said: W.said.slice(k) }); }
  return { name: cmd.name, n, err, body: W.S.body, kind: W.S.kind, tags: W.S.tags, items: W.S.items, log };
};
/** Check a command (the editor refuses to save one with a problem; an import too). The messages say which step. */
SWF.check = function (c, selfId) {
  const E = [], name = String(c.name || '').trim();
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(name)) E.push('The name is what you type after /: letters, digits and dashes, starting with a letter');
  else if (SWF.nameTaken(name, selfId)) E.push('/' + name + ' is taken — pick another name');
  (c.aliases || []).forEach(a => { if (!/^[a-z][a-z0-9-]{0,30}$/.test(a)) E.push('The alias “' + a + '” is not a name'); else if (a !== name && SWF.nameTaken(a, selfId)) E.push('The alias /' + a + ' is taken'); });
  if (!Array.isArray(c.steps) || !c.steps.length) E.push('Add at least one step');
  const asked = new Set();
  (c.steps || []).forEach((st, i) => { const n = 'Step ' + (i + 1), A = SWF.A[st && st.action]; if (!A) return E.push(n + ': no such action “' + (st && st.action) + '”');
    const o = Object.assign(SWF.defaults(A), st.opts || {});
    A.opts.forEach(f => { if (f.req && (o[f.k] == null || String(o[f.k]).trim() === '')) E.push(n + ' (' + A.label + '): ' + f.label + ' is needed'); });
    Object.values(o).forEach(v => { if (typeof v === 'string') v.replace(/\{([A-Za-z_]\w*)\}/g, (x, k) => { if (!SWF.BUILTIN.includes(k) && !asked.has(k)) E.push(n + ' uses {' + k + '}, which no earlier Ask step gives'); return x; }); });
    if (st.action === 'prompt') { const v = String(o.name || ''); if (!/^[A-Za-z_]\w*$/.test(v)) E.push(n + ': the answer’s name is letters, digits and _ (like who)'); else if (SWF.BUILTIN.includes(v)) E.push(n + ': {' + v + '} is already a placeholder — name the answer something else'); else asked.add(v); }
    if (st.action === 'cmd' && o.command && !CMD.get(o.command)) E.push(n + ': no command /' + o.command);
    if (st.action === 'cmd' && o.command && CMD.get(o.command) && CMD.get(o.command).swf) E.push(n + ': a workflow cannot run another workflow');
    [['task', 'due'], ['remind', 'when']].forEach(([a, k]) => { if (st.action === a && o[k] && !/\{/.test(o[k])) { try { SWF.when(o[k]); } catch (e) { E.push(n + ': ' + e.message); } } }); });
  return E;
};
SWF.nameTaken = function (name, selfId) {
  const taken = new Set(Object.keys(CMD.by)); CMD.inserts().forEach(x => { taken.add(x.slash); (x.alias || []).forEach(a => taken.add(a)); });
  (settings().commands || []).forEach(x => taken.add(x.slash)); (settings().macros || []).forEach(x => taken.add(x.slash));
  Object.values(SWF.tune().aliases).forEach(L => (L || []).forEach(a => taken.add(a)));
  SWF.all().filter(x => x.id !== selfId).forEach(x => { taken.add(x.name); (x.aliases || []).forEach(a => taken.add(a)); });
  return taken.has(name);
};
/* ---------- an inline question at the caret (the Ask step) ---------- */
SWF.ask = function ({ label, def, choices, rect }) {
  return new Promise(res => {
    let done = false; const prev = document.activeElement;
    const fin = v => { if (done) return; done = true; document.removeEventListener('keydown', key, true); box.remove(); try { prev && prev.isConnected && prev.focus && prev.focus(); } catch (e) { } res(v); };
    const inp = h('input.inp.swf-ask-in', { type: 'text', value: def || '', placeholder: choices && choices.length ? 'or type your own' : '', 'aria-label': label });
    const ok = () => { const v = inp.value.trim(); if (!v && !(def || '').trim() && !choices) { inp.focus(); return; } if (!v && choices && choices.length && !def) return; fin(v || def || ''); };
    const key = e => { if (!box.contains(document.activeElement) && e.key !== 'Escape') return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(null); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ok(); } };
    const box = h('div.swf-ask', { role: 'dialog', 'aria-label': 'Question from your command' }, h('div.swf-ask-q', label), choices && choices.length ? h('div.swf-ask-c', choices.map(c => h('button.btn.sm', { type: 'button', on: { mousedown: e => e.preventDefault(), click: () => fin(c) } }, c))) : null,
      h('div.swf-ask-r', inp, h('button.btn.sm.pri', { type: 'button', on: { click: ok } }, 'OK')), h('div.swf-ask-f', 'Enter answers · Esc stops the command'));
    document.body.append(box); document.addEventListener('keydown', key, true);
    const r = box.getBoundingClientRect(), p = rect || { left: innerWidth / 2 - 150, bottom: innerHeight / 3, top: innerHeight / 3 };
    box.style.left = clamp(p.left, 8, innerWidth - r.width - 8) + 'px'; box.style.top = (p.bottom + r.height + 14 < innerHeight ? p.bottom + 8 : Math.max(8, p.top - r.height - 8)) + 'px';
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
  });
};
/* ---------- the actions, one by one ---------- */
{
  const D = SWF.def, O = (k, label, type, o = {}) => Object.assign({ k, label, type }, o);
  const kindOpts = () => KINDS.map(k => [k.id, k.label]), ckOpts = () => CKINDS.all().map(k => [k.id, k.label]);
  const tryBlock = (W, what) => { if (W.sim) return null; const b = W.block(); if (!b) throw new Error('no component to ' + what); return b; };
  const needPane = W => { if (W.sim) return; W.onScreen(); };
  /* — Text — */
  D({ id: 'text', label: 'Insert text', group: 'Text', d: 'Types text into the component. {date} {time} {now} {selection} {note} {project} {cursor} and the answers of Ask steps are filled in; {cursor} is where the caret ends.',
    opts: [O('text', 'Text', 'area', { def: '{date} — ', req: true, ph: '{date} — {cursor}' }), O('where', 'Where', 'select', { def: 'caret', opts: [['caret', 'At the caret'], ['end', 'At the end, on a new line'], ['start', 'At the start'], ['replace', 'Replacing the words it works on']] })],
    run(W, o) { W.ensure(); const body = W.body(), len = body.text.length; let t = W.fill(o.text), from = W.at, del = 0, lead = '';
      if (o.where === 'start') from = 0; else if (o.where === 'end') { from = len; if (len && !body.text.endsWith('\n')) lead = '\n'; } else if (o.where === 'replace') { const r = W.range('auto'); if (r) { from = r[0]; del = r[1] - r[0]; } }
      const ci = (lead + t).indexOf(SWF.CURSOR), full = (lead + t).split(SWF.CURSOR).join(''); W.put(ED.splice(body, from, del, full));
      const a = from + lead.length, z = from + full.length, s = full.slice(lead.length); W.last = [a + (s.length - s.trimStart().length), z - (s.length - s.trimEnd().length)]; W.at = ci >= 0 ? from + ci : z; W.say('Typed “' + snippet(s, 40) + '”'); } });
  D({ id: 'clear', label: 'Clear the component’s text', group: 'Text', d: 'Empties the component (Ctrl+Z brings it back). Use it first, to start a component from the workflow’s own text.',
    run(W) { W.ensure(); W.put({ text: '', marks: [] }); W.at = 0; W.last = null; W.say('Cleared the text'); } });
  /* — Structure — */
  D({ id: 'struct', label: 'Make it a structure', group: 'Structure', d: 'The words become a Claim, Result, Takeaway, Question… (the same as /claim), recorded in the notebook.',
    opts: [O('kind', 'As', 'select', { def: 'result', opts: kindOpts }), O('what', 'Which words', 'select', { def: 'auto', opts: [['auto', 'What the last step typed, else the sentence before the caret'], ['sentence', 'The sentence before the caret'], ['line', 'The line'], ['component', 'The whole component']] })],
    run(W, o) { if (!KIND[o.kind]) throw new Error('no structure called ' + o.kind); W.ensure(); const r = W.range(o.what); if (!r) throw new Error('no words to make a ' + KIND[o.kind].label.toLowerCase() + ' of — write the phrase first');
      const body = W.body(), text = body.text.slice(r[0], r[1]);
      if (W.sim) { body.marks.push({ id: uid('m'), type: 'struct', from: r[0], to: r[1], ref: 'sim:' + o.kind }); W.S.items.push(o.kind); } else { const it = M.createItem(o.kind, text, M.block(W.b)); body.marks.push({ id: uid('m'), type: 'struct', from: r[0], to: r[1], ref: it.id }); }
      W.put(body); W.say(KIND[o.kind].label + ': “' + snippet(text, 40) + '”'); } });
  /* — Component — */
  D({ id: 'ckind', label: 'Set the component’s kind', group: 'Component', d: 'Result, Insight, Method, Caveat… — the kinds of Settings → Component kinds.',
    opts: [O('kind', 'Kind', 'select', { def: 'result', opts: ckOpts })],
    run(W, o) { const K = CKINDS.get(o.kind); if (!K) throw new Error('no kind called ' + o.kind); W.ensure(); if (W.sim) { W.S.kind = o.kind; W.say('Kind: ' + K.label); return; } const cur = M.block(W.b); cur.ckind = o.kind; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); W.say('Kind: ' + K.label); } });
  D({ id: 'label', label: 'Name the component', group: 'Component', d: 'Gives the component a title (its label).', opts: [O('text', 'Title', 'text', { def: '{date}', req: true })],
    run(W, o) { W.ensure(); const t = W.fill(o.text).split(SWF.CURSOR).join('').trim(); if (W.sim) { W.S.label = t; W.say('Titled “' + t + '”'); return; } const cur = M.block(W.b); cur.label = t; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); W.say('Titled “' + t + '”'); } });
  D({ id: 'newcomp', label: 'New component below', group: 'Component', d: 'Makes a component under this one, with text if you give it; the steps after work in the new one.',
    opts: [O('text', 'Its text', 'area', { def: '', ph: 'optional' }), O('switch', 'Carry on in the new component', 'bool', { def: true })],
    run(W, o) { if (W.sim) { W.say('A new component' + (o.text ? ' with “' + snippet(W.fill(o.text), 30) + '”' : '')); return; } needPane(W); const from = W.block() || W.anchor, p = W.spot(from), nb = W.pane.newAt(p.x, p.y, true); const t = W.fill(o.text).split(SWF.CURSOR).join('');
      if (t) { const c = M.block(nb.id); M.saveBlockBody(c, { text: t, marks: [] }); } if (o.switch) { W.b = nb.id; W.at = t.length; W.last = t.trim() ? [0, t.length] : null; } W.say('A new component'); } });
  D({ id: 'float', label: 'Mark as a float', group: 'Component', d: 'A float waits to belong to a note not made yet (/float brings it).', opts: [],
    run(W) { if (W.sim) return W.say('Mark the component as a float'); if (!FLOATS.on()) throw new Error('Floats are off — Settings → Features → Floats'); W.ensure(); if (!FLOATS.mark([W.b])) throw new Error('it is a float already'); W.say('A float'); } });
  D({ id: 'wire', label: 'Wire to the previous component', group: 'Component', d: 'Connects this component to the one before it in the note.',
    opts: [O('rel', 'Connection', 'select', { def: 'follows', opts: () => RELATIONS.map(r => [r.id, r.label]) }), O('dir', 'Direction', 'select', { def: 'in', opts: [['in', 'previous → this one'], ['out', 'this one → previous']] })],
    run(W, o) { if (W.sim) return W.say('Wire to the previous component (' + o.rel + ')'); W.ensure(); const bs = M.docBlocks(W.doc.id).filter(x => x.status === 'live' && x.kind !== 'ink'), i = bs.findIndex(x => x.id === W.b); const prev = i > 0 ? bs[i - 1] : null; if (!prev) throw new Error('there is no component before this one');
      const R = RELATIONS.find(r => r.id === o.rel) || RELATIONS[0]; if (o.dir === 'out') M.wire(W.b, prev.id, R.id, R.dir); else M.wire(prev.id, W.b, R.id, R.dir); changed(); W.say('Wired to “' + snippet(M.blockName(prev), 30) + '”'); } });
  D({ id: 'fold', label: 'Fold the component', group: 'Component', d: 'Collapses it to its title.', opts: [],
    run(W) { if (W.sim) return W.say('Fold the component'); W.ensure(); const cur = M.block(W.b); cur.collapsed = true; DB.put('blocks', cur); changed(); W.say('Folded'); } });
  D({ id: 'synth', label: 'Flag for synthesis', group: 'Component', d: 'Sends the component to a Synthesis note (asks which, when there is more than one).', opts: [],
    run: async W => { if (W.sim) return W.say('Flag the component for synthesis'); const b = tryBlock(W, 'flag'); if (typeof SYNTH === 'undefined' || (typeof FEAT !== 'undefined' && !FEAT.on('synthflag'))) throw new Error('Flag for synthesis is off'); const n = await SYNTH.flagMany([b]); if (!n) throw SWF.CANCEL; W.say('Flagged for synthesis'); } });
  D({ id: 'bridge', label: 'Bridge to a note', group: 'Component', d: 'Opens the note picker; the component shows there, live, with a caption saying why.', opts: [],
    run: async W => { if (W.sim) return W.say('Bridge the component to a note you pick'); const b = tryBlock(W, 'bridge'); const ok = await CMD.run('bridge', { component: b }, W.cmdCtx()); if (!ok) throw SWF.CANCEL; W.say('Bridged'); } });
  D({ id: 'move', label: 'Move to another note', group: 'Component', d: 'Opens the move panel to pick the note; put this step last (the component leaves).', opts: [],
    run: async W => { if (W.sim) return W.say('Move the component to a note you pick'); const b = tryBlock(W, 'move'); const d = await MPANEL.note({ title: 'Move “' + snippet(M.blockName(b), 40) + '” to…', exclude: [W.doc.id] }); if (!d) throw SWF.CANCEL; MOVE.ask(MOVE.expand([b.id]), d.id, MOVE.spot(d), true); W.moved = true; W.say('Moved to “' + snippet(d.title, 30) + '”'); } });
  /* — Note — */
  D({ id: 'tag', label: 'Add a tag to the note', group: 'Note', d: 'A tag in the note’s header.', opts: [O('tag', 'Tag', 'text', { def: '', req: true, ph: 'gel-run' })],
    run(W, o) { const t = W.fill(o.tag).split(SWF.CURSOR).join('').replace(/^#/, '').trim(); if (!t) throw new Error('the tag is empty'); if (W.sim) { W.S.tags.push(t); W.say('Tagged #' + t); return; } const d = M.doc(W.doc.id); const cur = (d.header && d.header.tags) || []; if (!cur.includes(t)) M.setHeader(d, 'tags', [...cur, t]); W.say('Tagged #' + t); } });
  D({ id: 'flagnote', label: 'Flag the note for the weekly review', group: 'Note', d: 'Puts it on the review list (nothing if it is flagged already).', opts: [O('why', 'Reason', 'text', { def: '', ph: 'optional' })],
    run(W, o) { if (W.sim) return W.say('Flag the note for review'); if (!M.flagFor('doc', W.doc.id)) { M.setFlag('doc', W.doc.id, W.fill(o.why)); W.say('Flagged the note'); } else W.say('Already flagged'); } });
  D({ id: 'daylog', label: 'Log a line in today’s day note', group: 'Note', d: 'Adds an entry to today’s day note (the timeline of Today), as a plain entry or as an observation, idea, question…',
    opts: [O('text', 'Line', 'text', { def: '{note}: {selection}', req: true }), O('kind', 'As', 'select', { def: '', opts: () => [['', 'A plain entry'], ...['observation', 'idea', 'question', 'barrier', 'reminder', 'result'].filter(k => KIND[k]).map(k => [k, KIND[k].label])] })],
    run(W, o) { const t = W.fill(o.text).split(SWF.CURSOR).join('').trim(); if (!t) throw new Error('nothing to log'); if (W.sim) return W.say('Log in the day note: “' + snippet(t, 50) + '”'); if (!DAY.add(t, o.kind || null)) throw new Error('could not log it'); W.say('Logged in the day note'); } });
  /* — Time and tasks — */
  D({ id: 'task', label: 'Make a task', group: 'Time and tasks', d: 'A task component beside this one (its due time is also a reminder). Due: +1d, +2h, tomorrow 17:00, fri, 2026-12-01; empty for no date.',
    opts: [O('text', 'Task', 'text', { def: 'Follow up: {selection}', req: true }), O('due', 'Due', 'text', { def: '+1d', ph: '+1d' }), O('prio', 'Priority', 'select', { def: 'normal', opts: [['normal', 'Normal'], ['high', 'High'], ['low', 'Low']] }), O('wire', 'Connect it to this component', 'bool', { def: true })],
    run(W, o) { const t = W.fill(o.text).split(SWF.CURSOR).join('').replace(/\s+/g, ' ').trim(); if (!t) throw new Error('the task has no words'); const w = SWF.when(W.fill(o.due), W.now);
      if (W.sim) return W.say('Task “' + snippet(t, 40) + '”' + (w ? ' due ' + (w.allDay ? localDate(w.d) : localDate(w.d) + ' ' + fmtTime(w.d)) : ''));
      needPane(W); const from = W.block() || W.anchor, p = from ? { x: (from.x || 0) + (from.w || 392) + 40, y: from.y || 0 } : W.spot(null);
      const task = { due: w ? (w.allDay ? localDate(w.d) + 'T09:00' : isoLocal(w.d)) : null, allDay: !!(w && w.allDay), prio: o.prio || 'normal' }, tb = TASK.create(W.doc.id, p, { text: t, task });
      if (!tb) throw new Error('could not make the task'); if (o.wire && W.b) M.wire(W.b, tb.id, 'related', false); changed(); W.say('Task: ' + snippet(t, 40)); } });
  D({ id: 'remind', label: 'Set a reminder', group: 'Time and tasks', d: 'A reminder (Reminders, the bell, My Week). When: +1d, +2h, tomorrow 9:00, fri, 2026-12-01.',
    opts: [O('title', 'Reminder', 'text', { def: '{note}: {selection}', req: true }), O('when', 'When', 'text', { def: 'tomorrow 09:00', req: true }), O('kind', 'As', 'select', { def: 'reminder', opts: [['reminder', 'A reminder'], ['deadline', 'A deadline']] })],
    run(W, o) { const t = W.fill(o.title).split(SWF.CURSOR).join('').replace(/\s+/g, ' ').trim(), w = SWF.when(W.fill(o.when), W.now); if (!t || !w) throw new Error('a reminder needs words and a time'); if (W.sim) return W.say('Reminder “' + snippet(t, 40) + '” ' + localDate(w.d) + (w.allDay ? '' : ' ' + fmtTime(w.d)));
      const at = new Date(w.d); const rec = { id: uid('rm'), created: isoLocal(new Date()), kind: o.kind === 'deadline' ? 'deadline' : 'reminder', title: t, at: isoLocal(at), end: null, allDay: !!w.allDay, where: '', repeat: 'none', lead: null, projectId: W.doc.projectId || null, themeId: W.doc.themeId || null, docId: W.doc.id, notes: '', modified: isoLocal(new Date()), alerted: null, done: null };
      DB.put('reminders', rec); changed(); try { REM.badge(); } catch (e) { } W.say('Reminder: ' + snippet(t, 40)); } });
  D({ id: 'timer', label: 'The note’s timer', group: 'Time and tasks', d: 'Start, pause, resume or stop the timer of this note.', opts: [O('what', 'Timer', 'select', { def: 'start', opts: [['start', 'Start'], ['pause', 'Pause'], ['resume', 'Resume'], ['stop', 'Stop']] })],
    run(W, o) { if (W.sim) return W.say('Timer: ' + o.what); const d = W.doc, s = TIMER.activeFor(d.id); if (o.what === 'start') { if (!s) TIMER.start(d.id); } else { if (!s) throw new Error('no timer on this note'); if (o.what === 'pause') TIMER.pause(s); else if (o.what === 'resume') TIMER.resume(s); else TIMER.stop(s); } W.say('Timer: ' + o.what); } });
  /* — Insert — */
  D({ id: 'widget', label: 'Insert a widget', group: 'Insert', d: 'A row of + Insert under this component: a table, an image panel, an equation, the calculator, a protocol…',
    opts: [O('row', 'Widget', 'select', { def: 'table', opts: () => (typeof INSERTS === 'undefined' ? [] : INSERTS).map(x => [x.id, typeof x.label === 'function' ? x.id : String(x.label).replace(/…$/, '')]), req: true }), O('pick', 'What to pick in its picker', 'text', { def: '', ph: 'optional' })],
    run: async (W, o) => { const x = (typeof INSERTS === 'undefined' ? [] : INSERTS).find(r => r.id === o.row); if (!x) throw new Error('no widget called ' + o.row); if (W.sim) return W.say('Insert ' + (typeof x.label === 'function' ? x.id : String(x.label).replace(/…$/, ''))); needPane(W);
      const c = W.cmdCtx(); if (!c.block && W.anchor) c.block = W.anchor; const r = CMD.insert(x, W.fill(o.pick), c); await CMD.settle(); W.say(typeof r === 'string' ? r : 'Inserted'); } });
  D({ id: 'template', label: 'Insert a template’s components', group: 'Insert', d: 'The components of a template (Settings → Templates) added to this note, to the right of what is there.',
    opts: [O('template', 'Template', 'select', { def: '', opts: () => DB.all('templates').map(t => [t.id, prof(t.type).label + ' · ' + t.name]), req: true })],
    run(W, o) { const t = DB.get('templates', o.template); if (!t) throw new Error('no such template'); if (W.sim) return W.say('Insert the ' + plural((t.blocks || []).length, 'component') + ' of “' + t.name + '”');
      const rows = (t.blocks || []).filter(r => !r.ph), sp = MOVE.spot(W.doc), x0 = Math.min(0, ...rows.map(r => r.x || 0)), y0 = Math.min(...rows.map(r => r.y == null ? 1e9 : r.y), 1e9); let n = 0;
      rows.forEach((r, i) => { const nb = M.addBlock(W.doc.id, null, { label: r.label || '', x: sp.x + ((r.x || 0) - x0), y: sp.y + (r.y == null || y0 === 1e9 ? i * 150 : r.y - y0), w: r.w || 392 }); nb.body = { text: r.body || '', marks: [] }; DB.put('blocks', nb); n++; }); changed(); W.say(plural(n, 'component') + ' from “' + t.name + '”'); } });
  /* — Go and run — */
  D({ id: 'cmd', label: 'Run a command-bar command', group: 'Go and run', d: 'Any command of the bar (/help lists them), with its arguments as you would type them: "Run 3" or note "Gel notes". Placeholders are filled in.',
    opts: [O('command', 'Command', 'select', { def: 'today', req: true, opts: () => CMD.list.filter(c => !c.swf).map(c => [c.slash, '/' + c.slash + ' — ' + c.label]).sort((a, b) => a[0].localeCompare(b[0])) }), O('args', 'Arguments', 'text', { def: '', ph: 'as you would type them' })],
    run: async (W, o) => { const c = CMD.get(o.command); if (!c) throw new Error('no command /' + o.command); if (W.sim) return W.say('Run /' + c.slash + (o.args ? ' ' + W.fill(o.args) : '')); const args = CMD.tokens(o.args).map(t => W.fill(t).split(SWF.CURSOR).join(''));
      const ok = await CMD.run(c.slash, args, W.cmdCtx()); if (!ok) throw new Error('/' + c.slash + ' did not run'); await CMD.settle(); W.say('/' + c.slash); } });
  D({ id: 'macro', label: 'Run a macro', group: 'Go and run', d: 'One of your macros (Settings → Keys & commands).', opts: [O('name', 'Macro', 'select', { def: '', req: true, opts: () => (settings().macros || []).map(m => [m.slash, m.name || m.slash]) })],
    run: async (W, o) => { if (W.sim) return W.say('Run the macro /' + o.name); const ok = await MACRO.run(o.name, [], W.cmdCtx()); if (!ok) throw new Error('the macro stopped'); W.say('Macro /' + o.name); } });
  D({ id: 'opennote', label: 'Open a note', group: 'Go and run', d: 'By its title (a picker opens when several match). Put it last: the steps after it would run with another note on screen.', opts: [O('note', 'Note', 'text', { def: '', req: true, ph: 'title, or {note}' })],
    run: async (W, o) => { const t = W.fill(o.note); if (W.sim) return W.say('Open the note “' + t + '”'); const ok = await CMD.run('go', { note: t }, W.cmdCtx()); if (!ok) throw SWF.CANCEL; W.moved = true; W.say('Opened “' + t + '”'); } });
  D({ id: 'opentab', label: 'Open a tab', group: 'Go and run', d: 'Portfolio, Library, Reminders, Settings… (put it last).', opts: [O('tab', 'Tab', 'select', { def: 'portfolio', opts: () => [...(typeof TABS === 'undefined' ? [] : TABS).map(t => [t[0], t[1]]), ['settings', 'Settings']] })],
    run(W, o) { if (W.sim) return W.say('Open the ' + o.tab + ' tab'); App.go('#/' + o.tab); W.moved = true; W.say('Opened ' + o.tab); } });
  D({ id: 'today', label: 'Open today’s day note', group: 'Go and run', d: 'Put it last.', opts: [],
    run(W) { if (W.sim) return W.say('Open today’s day note'); App.go('#/doc/' + DAY.doc().id); W.moved = true; W.say('Opened today'); } });
  D({ id: 'say', label: 'Say something', group: 'Go and run', d: 'A message in the corner (placeholders filled in).', opts: [O('text', 'Message', 'text', { def: 'Done: {note}', req: true })],
    run(W, o) { const t = W.fill(o.text).split(SWF.CURSOR).join(''); W.say('Says “' + t + '”'); if (!W.sim) toast(t, 3200); } });
  /* — Ask — */
  D({ id: 'prompt', label: 'Ask for a value', group: 'Ask', d: 'Waits for you to type a value, in a small box at the caret; later steps use it as {name}. Esc stops the command.',
    opts: [O('name', 'Call it', 'text', { def: 'answer', req: true, ph: 'who' }), O('ask', 'Question', 'text', { def: 'What?', req: true }), O('def', 'Starting value', 'text', { def: '', ph: 'optional' }), O('choices', 'Choices', 'text', { def: '', ph: 'optional: gel, plate, stain' })],
    run: async (W, o) => { const q = W.fill(o.ask), def = W.fill(o.def), ch = String(o.choices || '').split(',').map(s => s.trim()).filter(Boolean);
      const v = W.sim ? (def || ch[0] || 'sample') : await SWF.ask({ label: q, def, choices: ch, rect: W.rect }); if (v == null) throw SWF.CANCEL; W.vars[o.name] = v; W.say('{' + o.name + '} = “' + snippet(v, 30) + '”'); } });
}
/* ---------- examples (a start for a new command) ---------- */
SWF.EXAMPLES = [
  { label: 'Daily log line', name: 'daily', desc: 'A dated line, tagged', steps: [{ action: 'text', opts: { text: '{date} — {cursor}', where: 'caret' } }, { action: 'tag', opts: { tag: 'daily' } }] },
  { label: 'Result with a follow-up task', name: 'rt', desc: 'Type the result, then a task to repeat it', steps: [{ action: 'prompt', opts: { name: 'what', ask: 'What was the result?', def: '', choices: '' } }, { action: 'text', opts: { text: '{what}', where: 'caret' } }, { action: 'struct', opts: { kind: 'result', what: 'auto' } }, { action: 'task', opts: { text: 'Repeat: {what}', due: '+1d', prio: 'normal', wire: true } }] },
  { label: 'Question for later', name: 'later', desc: 'Make the sentence a question and remind me', steps: [{ action: 'struct', opts: { kind: 'question', what: 'sentence' } }, { action: 'remind', opts: { title: 'Look at: {selection}', when: 'tomorrow 09:00', kind: 'reminder' } }] },
];
/** A macro (11b) as a workflow: its params become Ask steps, its steps run the same commands. */
SWF.fromMacro = function (m) {
  const steps = (m.params || []).map(p => ({ action: 'prompt', opts: { name: p.name, ask: p.ask || p.name, def: p.default || '', choices: '' } }));
  (m.steps || []).forEach(st => { const c = CMD.get(st.cmd), a = st.args || {}, toks = c ? c.args.map(x => a[x.name] == null ? '' : String(a[x.name])) : []; while (toks.length && toks[toks.length - 1] === '') toks.pop();
    steps.push({ action: 'cmd', opts: { command: st.cmd, args: toks.map(t => /\s/.test(t) ? '"' + t + '"' : t).join(' ') } }); });
  let name = String(m.slash || 'macro'); const base = name; for (let i = 2; SWF.nameTaken(name); i++) name = base + '-' + i;
  return { id: uid('sw'), name, desc: m.name || '', aliases: [], steps };
};
{
  // Ctrl+Z straight after a run, caret still in the component: the editor would undo its own typing; this undoes the whole run (the notebook's undo), as it does from anywhere else
  document.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || (e.key || '').toLowerCase() !== 'z') return; const top = DB.undoStack[DB.undoStack.length - 1]; if (!SWF.lastRun || !top || top.group !== SWF.lastRun.group || $('.ovl')) return; e.preventDefault(); e.stopPropagation(); SWF.lastRun = null; App.undo(); }, true);
  // the slash menu and the bar: my commands, and the tuning of the built-ins (the rows themselves are 13zzg's)
  if (typeof CMD !== 'undefined') { const g = CMD.get; CMD.get = function (slash) { const r = g.apply(this, arguments); if (r) return r; const a = String(slash || '').replace(/^\//, '').toLowerCase(); return a ? SWF.byAlias(a) : null; }; }
}
/* ---------- Settings → Features → Slash commands: the editor, the tuning, the preview ---------- */
SWF.UI = { ed: null, errs: [], tryRes: null, trying: false, palette: false, q: '' };
SWF.repaint = () => { try { SettingsView.repaint(); } catch (e) { } };
SWF.download = (name, json) => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); a.remove(); };
SWF.clean = d => ({ id: d.id || uid('sw'), name: String(d.name || '').trim(), desc: String(d.desc || '').trim(), aliases: (d.aliases || []).filter(Boolean), steps: (d.steps || []).map(s => ({ action: s.action, opts: Object.assign({}, s.opts || {}) })) });
SWF.saveAll = list => saveSettings({ slashCmds: list });
SWF.importJSON = function (t) {
  let j; try { j = JSON.parse(t); } catch (e) { toast('Not a JSON file: ' + e.message); return 0; }
  const list = j && Array.isArray(j.commands) ? j.commands : j && j.name && Array.isArray(j.steps) ? [j] : null; if (!list) { toast('No slash commands in that file'); return 0; }
  let n = 0; const bad = []; let mine = SWF.all();
  list.forEach(c => { const same = mine.find(x => x.name === c.name), cc = SWF.clean(Object.assign({}, c, { id: same ? same.id : uid('sw') })), E = SWF.check(cc, cc.id); if (E.length) { bad.push('/' + (c.name || '?') + ': ' + E[0]); return; } mine = [...mine.filter(x => x.id !== cc.id), cc]; n++; });
  if (n) SWF.saveAll(mine);
  if (j.tune && typeof j.tune === 'object') { const T = SWF.tune(), u = a => [...new Set(a)]; SWF.saveTune({ hidden: u([...T.hidden, ...(j.tune.hidden || [])]), order: u([...T.order, ...(j.tune.order || [])]), aliases: Object.assign({}, T.aliases, j.tune.aliases || {}) }); }
  toast(n ? 'Imported ' + plural(n, 'command') + (bad.length ? ' — left out: ' + bad.join('; ') : '') : 'Nothing imported — ' + bad.join('; '), n && !bad.length ? 2600 : 6000); return n;
};
/** The sample component after a Try it: its text with the structures marked. */
SWF.sampleBody = function (r) {
  const out = [], t = r.body.text; let i = 0; const ms = r.body.marks.filter(m => m.type === 'struct').sort((a, b) => a.from - b.from);
  ms.forEach(m => { if (m.from < i) return; if (m.from > i) out.push(t.slice(i, m.from)); out.push(PV.st(String(m.ref).replace(/^sim:/, ''), t.slice(m.from, m.to))); i = m.to; }); if (i < t.length) out.push(t.slice(i)); return out;
};
SWF.logList = r => h('ol.swf-pvlog', r.log.map(l => h('li', h('b', l.label), l.said.length ? h('span.s', l.said.join(' · ')) : null)));
SWF.preview = function () {
  const rows = SLASH.rows('').slice(0, 7), U = SWF.UI, T = SWF.tune(), n = SWF.all().length, r = U.tryRes;
  const menu = h('div.pv-menu', rows.map((x, i) => h('div' + (i ? '' : '.on'), h('b', x.mine && SWF.opt('icon', true) ? h('span.sm-mine', { html: SWF.ICON }) : null, x.label), h('span', x.sub))));
  const als = Object.values(T.aliases).flat();
  const cap = [n ? plural(n, 'command') + ' of your own' + (SWF.opt('first', true) ? ' first' : '') : 'no commands of your own yet', T.hidden.length ? plural(T.hidden.length, 'built-in') + ' hidden' : '', T.order.length ? plural(T.order.length, 'favourite') + ' pinned' : '', als.length ? 'aliases ' + als.map(a => '/' + a).join(' ') : ''].filter(Boolean).join(' · ');
  return [PV.box({ num: 'Block', label: 'Notes', body: ['The edge held at 2 ng/mL after 4 h. ', h('span.pv-caret', '/')] }), menu, PV.cap('The menu as it is now: ' + cap + '.'),
    r ? h('div.swf-pv', h('div.swf-pvh', 'Try it · ' + r.label + ' on a sample component'), PV.box({ num: 'Block', label: 'Sample', kind: r.kind || null, body: SWF.sampleBody(r), chips: [...(r.kind ? [PV.chip((CKINDS.get(r.kind) || { label: r.kind }).label, 'teal')] : []), ...r.tags.map(t => PV.chip('#' + t))] }),
      SWF.logList(r), r.err ? h('div.swf-err', r.err) : PV.cap('Nothing was written: the sample lives in memory; steps that act on the notebook say what they would do.'))
      : PV.cap('Open a command below and press Try it: its steps run on a sample component here.')];
};
SWF.settingsUI = function () {
  const U = SWF.UI, root = h('div.swf-ed'), draw = () => root.replaceChildren(U.ed ? editor() : list());
  const act = (label, fn, o = {}) => h('button.btn.sm' + (o.pri ? '.pri' : '') + (o.ghost ? '.ghost' : ''), Object.assign({ type: 'button', on: { click: fn } }, o.attrs || {}), label);
  const importFile = () => { const i = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } }); i.addEventListener('change', async () => { for (const f of i.files) SWF.importJSON(await f.text()); draw(); SWF.repaint(); }); document.body.append(i); i.click(); i.remove(); };
  const open = (id, isNew, d) => { U.ed = { id, isNew, d }; U.errs = []; U.palette = false; draw(); };
  function list() {
    const mine = SWF.all(), macros = settings().macros || [], T = SWF.tune();
    return h('div.swf-list',
      h('div.swf-h', h('b', 'Your slash commands'), h('span.tiny.muted', mine.length ? plural(mine.length, 'command') : 'none yet')),
      h('p.tiny.muted', { style: { margin: '2px 0 8px' } }, 'A name, a description and a workflow: steps run in order, each chosen from what the app can do. Type / in a component and the name; they are in the command bar too. Ctrl+Z undoes a whole run.'),
      h('div.list', mine.length ? mine.map(x => h('div.li.swf-row', h('span.swf-ic', { html: SWF.ICON }), h('code.mono', '/' + x.name), h('span.t', x.desc || '', h('span.s', plural(x.steps.length, 'step') + ' · ' + x.steps.map(s => (SWF.A[s.action] || { label: '?' }).label).join(' → '))),
        act('Edit', () => open(x.id, false, JSON.parse(JSON.stringify(x))), { attrs: { 'aria-label': 'Edit /' + x.name } }),
        act('Duplicate', () => { let nm = x.name + '-copy'; for (let i = 2; SWF.nameTaken(nm); i++) nm = x.name + '-copy' + i; SWF.saveAll([...SWF.all(), Object.assign(SWF.clean(x), { id: uid('sw'), name: nm, aliases: [] })]); draw(); SWF.repaint(); }, { attrs: { 'aria-label': 'Duplicate /' + x.name } }),
        delBtn(x))) : h('div.li.muted', 'No commands of your own yet — add one, or start from an example.')),
      h('div.swf-acts', act('+ New command', () => open(null, true, { id: uid('sw'), name: '', desc: '', aliases: [], steps: [] }), { pri: true }), act('Import…', importFile),
        mine.length || T.hidden.length || T.order.length ? act('Export…', () => SWF.download('scientia.sis-slash.json', { format: SWF.FORMAT, commands: SWF.all(), tune: SWF.tune() })) : null),
      macros.length ? h('div.swf-mac', h('span.tiny.muted', 'Your macros can become workflows (they stay as they are): '), macros.map(m => act('/' + m.slash + ' → workflow', () => open(null, true, SWF.fromMacro(m)), { attrs: { 'aria-label': 'Make a workflow from the macro /' + m.slash } }))) : null);
  }
  function delBtn(x) {
    const b = h('button.btn.sm.ghost', { type: 'button', 'aria-label': 'Delete /' + x.name }, 'Delete'); let armed = null;
    b.addEventListener('click', () => { if (armed) { clearTimeout(armed); SWF.saveAll(SWF.all().filter(c => c.id !== x.id)); draw(); SWF.repaint(); return; } b.textContent = 'Delete it?'; b.classList.add('danger'); armed = setTimeout(() => { armed = null; b.textContent = 'Delete'; b.classList.remove('danger'); }, 3200); });
    return b;
  }
  function editor() {
    const E = U.ed, d = E.d, stepsEl = h('div.swf-steps'), hint = h('div.tiny.muted.swf-hint'), errEl = h('div.swf-errs'), logEl = h('div.swf-log');
    const name = h('input.inp.mono', { value: d.name, placeholder: 'daily', 'aria-label': 'Name (what you type after /)', on: { input: e => { d.name = e.target.value.replace(/^\//, '').toLowerCase(); } } });
    const desc = h('input.inp', { value: d.desc, placeholder: 'What it does, in a few words', 'aria-label': 'Description', on: { input: e => { d.desc = e.target.value; } } });
    const alias = h('input.inp.mono', { value: (d.aliases || []).join(' '), placeholder: 'optional: d dl', 'aria-label': 'Aliases', on: { input: e => { d.aliases = e.target.value.split(/[\s,]+/).map(s => s.replace(/^\//, '').toLowerCase()).filter(Boolean); } } });
    const hints = () => { const asked = d.steps.filter(s => s.action === 'prompt' && s.opts && s.opts.name).map(s => '{' + s.opts.name + '}'); hint.replaceChildren('Placeholders: ', h('code', ['{date}', '{time}', '{now}', '{selection}', '{note}', '{project}', '{cursor}'].join(' ')), asked.length ? ' · your answers: ' : '', asked.length ? h('code', asked.join(' ')) : ''); };
    const move = (i, j) => { if (j < 0 || j >= d.steps.length || i === j) return; const [s] = d.steps.splice(i, 1); d.steps.splice(j, 0, s); drawSteps(); };
    const field = (st, f) => {
      const set = v => { st.opts = st.opts || {}; st.opts[f.k] = v; hints(); }, v = st.opts && st.opts[f.k] !== undefined ? st.opts[f.k] : f.def;
      if (f.type === 'bool') return h('label.swf-f.chk', h('input', { type: 'checkbox', checked: !!v, 'aria-label': f.label, on: { change: e => set(e.target.checked) } }), h('span', f.label));
      let c;
      if (f.type === 'select') { const L = SWF.optsOf(f).slice(); if (v !== '' && v != null && !L.some(x => String(x[0]) === String(v))) L.push([v, v + ' (not found)']);
        c = h('select.inp', { 'aria-label': f.label, on: { change: e => set(e.target.value) } }, L.length ? null : h('option', { value: '' }, '— none to pick —'), L.map(([val, lab]) => h('option', { value: val, selected: String(val) === String(v) }, lab)));
        if ((v === '' || v == null) && L.length) set(L[0][0]); }
      else if (f.type === 'area') c = h('textarea.inp', { rows: 2, value: v == null ? '' : v, placeholder: f.ph || '', 'aria-label': f.label, on: { input: e => set(e.target.value) } });
      else c = h('input.inp', { type: 'text', value: v == null ? '' : v, placeholder: f.ph || '', 'aria-label': f.label, on: { input: e => set(e.target.value) } });
      return h('label.swf-f', h('span', f.label), c);
    };
    function drag(e, i) {
      if (e.button) return; e.preventDefault(); const rows = [...stepsEl.querySelectorAll('.swf-step')]; let to = i; rows[i].classList.add('dragging'); stepsEl.classList.add('dragging');
      const mv = ev => { to = rows.findIndex(r => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; }); if (to < 0) to = rows.length - 1; rows.forEach((r, k) => r.classList.toggle('dropat', k === to && k !== i)); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); move(i, to); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    }
    function drawSteps() {
      stepsEl.classList.remove('dragging');
      stepsEl.replaceChildren(...(d.steps.length ? d.steps.map((st, i) => {
        const A = SWF.A[st.action];
        const sel = h('select.inp.swf-act', { 'aria-label': 'Step ' + (i + 1) + ' action', on: { change: e => { st.action = e.target.value; st.opts = SWF.defaults(SWF.A[st.action]); drawSteps(); } } },
          SWF.GROUPS.map(g => h('optgroup', { label: g }, Object.values(SWF.A).filter(a => a.group === g).map(a => h('option', { value: a.id, selected: a.id === st.action }, a.label)))), A ? null : h('option', { value: st.action, selected: true }, st.action + ' (unknown)'));
        return h('div.swf-step', { 'data-i': i }, h('span.swf-grip', { title: 'Drag to reorder', 'aria-label': 'Drag step ' + (i + 1) + ' to reorder', role: 'button', on: { pointerdown: e => drag(e, i) } }, '⠿'), h('span.swf-n', String(i + 1)),
          h('div.swf-sm', sel, h('div.swf-opts', A ? A.opts.map(f => field(st, f)) : null), A && A.d ? h('div.tiny.muted.swf-d', A.d) : null),
          h('div.swf-sb', h('button.btn.xs', { type: 'button', title: 'Move up', 'aria-label': 'Move step ' + (i + 1) + ' up', disabled: i === 0, on: { click: () => move(i, i - 1) } }, '↑'), h('button.btn.xs', { type: 'button', title: 'Move down', 'aria-label': 'Move step ' + (i + 1) + ' down', disabled: i === d.steps.length - 1, on: { click: () => move(i, i + 1) } }, '↓'),
            h('button.btn.xs', { type: 'button', title: 'Duplicate this step', 'aria-label': 'Duplicate step ' + (i + 1), on: { click: () => { d.steps.splice(i + 1, 0, JSON.parse(JSON.stringify(st))); drawSteps(); } } }, '⧉'),
            h('button.btn.xs.ghost', { type: 'button', title: 'Remove this step', 'aria-label': 'Remove step ' + (i + 1), on: { click: () => { d.steps.splice(i, 1); drawSteps(); } } }, '×')));
      }) : [h('div.swf-none', 'No steps yet — add one below' + (E.isNew ? ', or start from an example.' : '.'))]), paletteEl());
      hints();
    }
    function paletteEl() {
      return h('div.swf-addbar', act(U.palette ? 'Close the list' : '+ Add a step', () => { U.palette = !U.palette; drawSteps(); }, { attrs: { 'aria-expanded': String(!!U.palette) } }),
        E.isNew && !d.steps.length ? h('span.swf-ex', h('span.tiny.muted', 'or start from: '), SWF.EXAMPLES.map(x => act(x.label, () => { Object.assign(d, JSON.parse(JSON.stringify({ name: x.name, desc: x.desc, steps: x.steps }))); name.value = d.name; desc.value = d.desc; drawSteps(); }))) : null,
        U.palette ? h('div.swf-pal', SWF.GROUPS.map(g => h('div.swf-pg', h('div.swf-pgh', g), h('div.swf-pb', Object.values(SWF.A).filter(a => a.group === g).map(a => h('button.btn.sm', { type: 'button', title: a.d, on: { click: () => { d.steps.push({ action: a.id, opts: SWF.defaults(a) }); U.palette = false; drawSteps(); } } }, a.label)))))) : null);
    }
    const paintErr = () => errEl.replaceChildren(...(U.errs || []).map(m => h('div.swf-err', { role: 'alert' }, m)));
    const paintLog = () => { const r = U.tryRes; logEl.replaceChildren(r ? h('div', h('div.tiny.muted', 'Last Try it, ' + r.label + ' — ' + plural(r.n, 'step') + ' ran on the sample component, nothing written:'), SWF.logList(r), r.err ? h('div.swf-err', r.err) : null) : null); };
    const doTry = async () => { const c = SWF.clean(d); if (!c.steps.length) { U.errs = ['Add a step first']; paintErr(); return; } U.errs = []; paintErr();
      let r; try { r = await SWF.simulate(c); } catch (e) { r = { n: 0, err: e.message, body: { text: '', marks: [] }, kind: null, tags: [], items: [], log: [] }; } r.label = d.name ? '/' + d.name : 'your command'; U.tryRes = r; paintLog(); SWF.repaint(); };
    const save = () => { const c = SWF.clean(d), errs = SWF.check(c, c.id); if (errs.length) { U.errs = errs; paintErr(); return; } const L = SWF.all(), i = L.findIndex(x => x.id === c.id); if (i >= 0) L[i] = c; else L.push(c); SWF.saveAll(L); U.ed = null; U.errs = []; U.palette = false; toast('/' + c.name + ' is ready — type it in a component'); draw(); SWF.repaint(); };
    drawSteps(); paintErr(); paintLog();
    return h('div.swf-edit', h('div.swf-h', h('b', E.isNew ? 'A new slash command' : 'Edit /' + (E.d.name || '')), h('span.tiny.muted', 'a workflow: its steps run in order')),
      h('div.grid2', h('label.f', h('span', 'Name — what you type after /'), h('div.swf-nm', h('span.mono', '/'), name)), h('label.f', h('span', 'Description'), desc)),
      h('label.f', { style: { marginTop: '8px' } }, h('span', 'Aliases (optional)'), alias),
      h('div.swf-sh', 'Steps'), stepsEl, hint, errEl,
      h('div.swf-acts', act('Try it', doTry, { attrs: { 'aria-label': 'Try it on a sample component' } }), act('Save', save, { pri: true }), act('Cancel', () => { U.ed = null; U.errs = []; U.palette = false; draw(); }, { ghost: true })), logEl);
  }
  draw(); return root;
};
/** The built-in commands: shown or hidden, pinned (in an order), with aliases of your own. */
SWF.tuneUI = function () {
  const U = SWF.UI, root = h('div.swf-tune');
  const all = () => CMD.all().filter(c => c.scope !== 'canvas' && !c.swf);
  const save = T => { SWF.saveTune(T); draw(); SWF.repaint(); };
  function draw() {
    const T = SWF.tune(), list = all(), by = new Map(list.map(c => [c.slash, c])), q = (U.q || '').toLowerCase().trim(), pinned = T.order.filter(s => by.has(s));
    const shown = list.filter(c => !q || (c.slash + ' ' + c.label + ' ' + c.group + ' ' + SWF.aliasesOf(c.slash).join(' ')).toLowerCase().includes(q));
    const qi = h('input.inp.swf-q', { type: 'search', value: U.q || '', placeholder: 'Find a command…', 'aria-label': 'Find a built-in command', on: { input: e => { U.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('.swf-q', root); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } } } });
    const aliasIn = c => {
      const inp = h('input.inp.mono.swf-al', { type: 'text', value: SWF.aliasesOf(c.slash).join(' '), placeholder: 'aliases', 'aria-label': 'Aliases of /' + c.slash });
      inp.addEventListener('change', () => { const mine = SWF.aliasesOf(c.slash), want = inp.value.split(/[\s,]+/).map(s => s.replace(/^\//, '').toLowerCase()).filter(Boolean);
        const bad = want.find(a => !/^[a-z][a-z0-9-]{0,30}$/.test(a) || a === c.slash || (!mine.includes(a) && SWF.nameTaken(a)));
        if (bad) { toast('/' + bad + ' cannot be an alias — it is not a plain name, or it is taken'); inp.value = mine.join(' '); return; }
        const T2 = SWF.tune(); if (want.length) T2.aliases[c.slash] = want; else delete T2.aliases[c.slash]; save(T2); });
      return inp;
    };
    const pinBtn = c => { const on = T.order.includes(c.slash); return h('button.btn.xs' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), 'aria-label': (on ? 'Unpin /' : 'Pin /') + c.slash, title: on ? 'Pinned: first in the menu' : 'Pin it first in the menu', on: { click: () => { const T2 = SWF.tune(); T2.order = on ? T2.order.filter(s => s !== c.slash) : [...T2.order, c.slash]; save(T2); } } }, on ? 'Pinned' : 'Pin'); };
    const mv = (s, k) => { const T2 = SWF.tune(), i = T2.order.indexOf(s), j = i + k; if (i < 0 || j < 0 || j >= T2.order.length) return; [T2.order[i], T2.order[j]] = [T2.order[j], T2.order[i]]; save(T2); };
    const groups = {}; shown.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
    root.replaceChildren(h('div.swf-h', h('b', 'The built-in slash commands'), h('span.tiny.muted', plural(T.hidden.filter(s => by.has(s)).length, 'hidden') + ' · ' + plural(pinned.length, 'pinned'))),
      h('p.tiny.muted', { style: { margin: '2px 0 8px' } }, 'Hide the ones you never use (they stay in the command bar), pin your favourites so they come first, give any an alias — /r for result. An alias typed after / and Enter runs the command.'),
      pinned.length ? h('div.swf-pins', h('div.swf-pgh', 'Pinned, in this order'), pinned.map((s, i) => h('div.swf-pin', h('code.mono', '/' + s), h('span.s.tiny.muted', by.get(s).label), h('span.sp'),
        h('button.btn.xs', { type: 'button', disabled: i === 0, 'aria-label': 'Move /' + s + ' up', on: { click: () => mv(s, -1) } }, '↑'), h('button.btn.xs', { type: 'button', disabled: i === pinned.length - 1, 'aria-label': 'Move /' + s + ' down', on: { click: () => mv(s, 1) } }, '↓')))) : null,
      qi, h('div.swf-bl', Object.keys(groups).map(g => h('div.swf-bg', h('div.swf-pgh', g), groups[g].map(c => h('div.swf-br' + (T.hidden.includes(c.slash) ? '.off' : ''),
        h('label.swf-sh2', h('input', { type: 'checkbox', checked: !T.hidden.includes(c.slash), 'aria-label': 'Show /' + c.slash + ' in the menu', on: { change: e => { const T2 = SWF.tune(); T2.hidden = e.target.checked ? T2.hidden.filter(s => s !== c.slash) : [...T2.hidden, c.slash]; save(T2); } } }), h('code.mono', '/' + c.slash)),
        h('span.t.tiny.muted', c.label), pinBtn(c), aliasIn(c)))))),
      shown.length ? null : h('div.tiny.muted', 'No command matches.'));
  }
  draw(); return root;
};
