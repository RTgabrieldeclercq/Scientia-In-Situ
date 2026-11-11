/* ==========================================================================
   11b · Commands — one registry behind three doors (V3.947, Gabe's SiS
   Shaping): "/" typed in a component (13zzg), the navigation bar at the
   bottom of the window (11c), and macros (steps behind one /command, from
   a .sis-macro.json file or Settings → Commands).
   A command has a slash (and aliases), a label, its arguments — each of a
   kind with its own finder: a note, a project, a theme, a component, a
   structure, a term, a paper, a material, a choice, text, a number, a day —
   where it runs (text · canvas · both) and what it does. A string argument
   is resolved by its kind: the exact name, the one match, or a picker
   (prefiltered with it) when there are several; a missing one is asked for.
   Every + Insert row is a command too: /insert <row> and a friendly alias
   (/paper, /protocol, /material…). The person's own commands
   (settings().commands) bind a slash to an insert row, a built-in with
   preset arguments, or a macro; macros live in settings().macros.
   HIST keeps the notes opened, for /back and /forward (Alt+← / Alt+→).
   The built-ins below are one per line, `C('slash', 'label', [A(…)…], run,
   { alias, group, sub })`, which scripts/scientia_macro.py reads.
   ========================================================================== */
const CMD = {
  list: [], by: {},
  ALIAS: { rmpaper: 'paper', rmprotocol: 'protocol', rmaction: 'action', rmcollection: 'labcollection', 'material-new': 'newmaterial', 'equation-reg': 'registered', 'table-empty': 'emptytable', 'canvas-add': 'canvas', 'pull-barrier': 'barrier', 'pull-item': 'structure', 'pull-comp': 'component' },
  add(c) { c.args = c.args || []; c.scope = c.scope || 'both'; c.group = c.group || 'Notebook'; CMD.list = CMD.list.filter(x => x.slash !== c.slash); CMD.list.push(c); CMD.by[c.slash] = c; (c.alias || []).forEach(a => { CMD.by[a] = c; }); return c; },
  /** The + Insert rows as commands (read when asked, because the rows arrive from every module and from the lab layer). */
  inserts() { return (typeof INSERTS === 'undefined' ? [] : INSERTS).map(x => ({ slash: CMD.ALIAS[x.id] || x.id, alias: ['insert-' + x.id], label: typeof x.label === 'function' ? 'Insert: ' + x.id : 'Insert: ' + String(x.label).replace(/…$/, ''), sub: typeof x.sub === 'string' ? x.sub : '', group: 'Insert', insert: x, args: [{ name: 'pick', kind: 'text', optional: true, rest: true, ask: 'What to pick in its picker' }], scope: 'both', run: (A, ctx) => CMD.insert(x, A.pick, ctx) })); },
  /** Built-ins, the inserts, the person's own commands and the macros, as one list (a built-in's slash is never shadowed). */
  all() { const taken = new Set(Object.keys(CMD.by)), ins = CMD.inserts().filter(x => !taken.has(x.slash)); ins.forEach(x => taken.add(x.slash));
    const yours = (settings().commands || []).filter(x => x && x.slash && !taken.has(x.slash)).map(x => { taken.add(x.slash); return CMD.custom(x); });
    const macros = (settings().macros || []).filter(m => m && m.slash && !taken.has(m.slash)).map(m => { taken.add(m.slash); return MACRO.asCommand(m); });
    return [...CMD.list, ...ins, ...yours, ...macros]; },
  get(slash) { slash = String(slash || '').replace(/^\//, '').toLowerCase(); if (!slash) return null; return CMD.by[slash] || CMD.all().find(c => c.slash === slash || (c.alias || []).includes(slash)) || null; },
  /** A command of the person's own (Settings → Commands): what it stands for. */
  custom(x) { return { slash: x.slash, label: x.label || '/' + x.slash, sub: CMD.describe(x), group: 'Yours', custom: x, args: [], scope: 'both',
    run: (A, ctx) => x.kind === 'macro' ? MACRO.run(x.target, [], ctx) : x.kind === 'insert' ? CMD.run('insert', [x.target], ctx) : CMD.run(x.target, Array.isArray(x.args) ? x.args : CMD.tokens(x.args || ''), ctx) }; },
  describe(x) { return x.kind === 'macro' ? 'Runs the macro /' + x.target : x.kind === 'insert' ? 'Inserts ' + x.target : '/' + x.target + (x.args ? ' ' + (Array.isArray(x.args) ? x.args.join(' ') : x.args) : ''); },
  /** Where a command runs: the pane on screen and its note; from the text, the editor and its component too. */
  ctx(extra) { const panes = App.panes ? App.panes() : [], pane = panes.includes(App.pane) ? App.pane : panes[0] || null, doc = pane && M.doc(pane.docId); return Object.assign({ pane, doc, el: null, block: null, at: null }, extra || {}); },
  need(ctx) { if (!ctx.doc || !ctx.pane) throw new Error('open a note first'); return ctx.doc; },
  /** Run a command: `args` is a list (the bar: positional, quotes allowed) or an object by name (a macro). Returns false when it did not happen. */
  async run(slash, args, ctx) {
    const c = CMD.get(slash); if (!c) { toast('No command /' + String(slash || '').replace(/^\//, '') + ' — /help lists them'); return false; }
    ctx = CMD.ctx(ctx);
    try { const A = await CMD.resolve(c, args, ctx); if (A === null) return false; const r = await c.run(A, ctx); if (typeof r === 'string' && typeof NAV !== 'undefined') NAV.say(r); return r !== false; }
    catch (e) { toast('/' + c.slash + ': ' + (e && e.message || e)); return false; }
  },
  async resolve(c, args, ctx) {
    const given = Array.isArray(args) ? args.slice() : null, obj = !given && args && typeof args === 'object' ? args : {}, out = { _pick: obj._pick || null };
    for (const a of c.args) { const K = CMD.KINDS[a.kind] || CMD.KINDS.text; let v = given ? (a.many ? given.splice(0) : a.rest ? given.splice(0).join(' ') : given.shift()) : obj[a.name];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) { if (a.optional) { out[a.name] = null; continue; } v = await K.ask(a, ctx); if (v == null || v === '') return null; }
      const r = await K.resolve(v, a, ctx); if (r == null) return null; out[a.name] = r; }
    return out;
  },
  /** "a b 'c d'" → ['a', 'b', 'c d'] */
  tokens(s) { const out = []; String(s || '').replace(/"([^"]*)"|'([^']*)'|“([^”]*)”|(\S+)/g, (m, a, b, c, d) => { out.push(a ?? b ?? c ?? d); return ''; }); return out; },
  /* ---------- the kinds: finders, resolution, pickers ---------- */
  rank(items, q, label, sub) { q = String(q || '').trim(); const out = items.map(x => ({ label: label(x), sub: sub ? sub(x) : '', v: x, s: q ? PAL.fuzzy(q, label(x) + ' ' + (sub ? sub(x) : '')) : 1 })).filter(x => x.s > 0); if (q) out.sort((a, b) => b.s - a.s); return out.slice(0, 40); },
  ent(src, label, sub) { return { list: (q, ctx, a) => CMD.rank(src(ctx), q, label, sub), resolve: (v, a, ctx) => CMD.pick(a, v, ctx), ask: (a, ctx) => CMD.pick(a, '', ctx) }; },
  async pick(a, v, ctx) {
    const K = CMD.KINDS[a.kind]; if (v && typeof v === 'object' && v.id) return v;
    const q = String(v || '').trim(), L = K.list(q, ctx, a);
    if (q) { const ex = L.filter(x => x.label.toLowerCase() === q.toLowerCase()); if (ex.length === 1) return ex[0].v; if (L.length === 1) return L[0].v; if (!L.length) { toast('No ' + (a.label || a.kind) + ' matches “' + q + '”'); } }
    return CMD.picker(a.ask || 'Which ' + (a.label || a.kind) + '?', q, qq => K.list(qq, ctx, a));
  },
  picker(title, q, items) {
    return new Promise(res => { let got = false;
      const m = modal({ title, wide: true, actions: [{ label: 'Cancel' }], onClose: () => { if (!got) res(null); },
        body: optionPicker({ placeholder: 'Search…', items, render: x => h('div', h('b', x.label), x.sub ? h('span.s', x.sub) : null), onPick: x => { got = true; m.close(); res(x.v); } }) });
      if (q) setTimeout(() => { const i = $('.pk-q', m.el); if (i) { i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); } }, 30); });
  },
  date(v) { v = String(v || '').trim().toLowerCase(); const d = new Date(); if (!v || v === 'today') return localDate(d); if (v === 'yesterday') { d.setDate(d.getDate() - 1); return localDate(d); } if (v === 'tomorrow') { d.setDate(d.getDate() + 1); return localDate(d); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const t = Date.parse(v); if (!isNaN(t)) return localDate(new Date(t)); toast('A day: today, yesterday, tomorrow or 2026-11-03'); return null; },
  choices(a, ctx) { return typeof a.choices === 'function' ? a.choices(ctx) : a.choices || []; },
};
CMD.KINDS = {
  text: { list: () => [], resolve: v => String(v), ask: a => askText(a.ask || 'What?', a.label || a.name, '') },
  number: { list: () => [], resolve: v => { const n = parseFloat(v); if (isNaN(n)) { toast('A number is needed'); return null; } return n; }, ask: a => askText(a.ask || 'How much?', a.label || a.name, '').then(v => v == null ? null : parseFloat(v)) },
  date: { list: (q) => ['today', 'yesterday', 'tomorrow'].filter(x => !q || x.startsWith(q)).map(x => ({ label: x, v: x })), resolve: v => CMD.date(v), ask: a => askText(a.ask || 'Which day?', 'today · yesterday · tomorrow · 2026-11-03', 'today') },
  choice: { list: (q, ctx, a) => CMD.choices(a, ctx).filter(c => !q || c.toLowerCase().startsWith(String(q).toLowerCase())).map(c => ({ label: c, v: c })),
    resolve: (v, a, ctx) => { v = String(v).toLowerCase(); const C = CMD.choices(a, ctx), hit = C.find(x => x.toLowerCase() === v) || (C.filter(x => x.toLowerCase().startsWith(v)).length === 1 ? C.find(x => x.toLowerCase().startsWith(v)) : null); if (!hit) toast((a.label || a.name) + ': one of ' + C.join(' · ')); return hit || null; },
    ask: (a, ctx) => new Promise(res => { let got = false; pickModal(a.ask || 'Which?', a.label || a.name, CMD.choices(a, ctx).map(c => ({ label: c, run: () => { got = true; res(c); } }))); setTimeout(() => { const ov = $('.ovl'); if (ov) new MutationObserver(() => { if (!ov.isConnected && !got) res(null); }).observe(document.body, { childList: true }); }, 0); }) },
  note: CMD.ent(() => DB.where('documents', d => !d.deleted && !d.archived).sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || ''))), d => d.title || 'Untitled', d => M.docPath(d)),
  project: CMD.ent(() => DB.all('projects'), p => p.name || p.title || 'Project', p => p.status || ''),
  theme: CMD.ent(() => DB.all('themes'), t => t.name || 'Theme', t => (M.project(t.projectId) || {}).name || ''),
  component: CMD.ent(ctx => DB.where('blocks', b => b.status === 'live' && (b.kind === 'component' || b.kind === 'ink' || (typeof WIDGETS !== 'undefined' && WIDGETS[b.kind]))).sort((a, b) => ((ctx.doc && b.docId === ctx.doc.id) - (ctx.doc && a.docId === ctx.doc.id)) || String(b.modified || '').localeCompare(String(a.modified || ''))),
    b => M.blockName(b) + (b.body && b.body.text ? ' — ' + snippet(b.body.text, 50) : ''), b => M.docPath(M.doc(b.docId))),
  /** V3.981 — a component of this note (/bridge): the one typed in, or the one selected, without asking. */
  here: Object.assign(CMD.ent(ctx => !ctx.doc ? [] : DB.where('blocks', b => b.docId === ctx.doc.id && b.status === 'live' && b.kind !== 'ink' && !PROTO.is(b) && !(b.kind === 'ref' && b.refItemId)).sort((a, b) => ((ctx.block && b.id === ctx.block.id) - (ctx.block && a.id === ctx.block.id)) || (a.y || 0) - (b.y || 0)),
    b => M.blockName(b) + (b.body && b.body.text ? ' — ' + snippet(b.body.text, 50) : ''), () => 'this note'),
    { ask: (a, ctx) => { if (!ctx.doc) return Promise.reject(new Error('open a note first')); const b = ctx.block || (ctx.pane && ctx.pane.sel && M.block(ctx.pane.sel)); return b && b.docId === ctx.doc.id && b.status === 'live' ? Promise.resolve(b) : CMD.pick(a, '', ctx); } }),
  structure: CMD.ent(() => DB.where('items', it => !it.correctedBy), it => (KIND[it.kind] ? KIND[it.kind].label : it.kind) + ': ' + snippet(it.text, 60), it => M.docPath(M.doc(it.originDocId))),
  term: CMD.ent(() => DB.all('terms'), t => t.label, t => (M.project(t.projectId) || {}).name || ''),
  paper: CMD.ent(() => DB.all('library'), r => r.title || r.url || 'Untitled', r => LIB.shortRef ? LIB.shortRef(r) : ''),
  material: CMD.ent(() => DB.where('documents', d => d.type === 'resource' && !d.deleted), d => d.title || 'Material', d => M.docPath(d)),
  /** V3.961 — the types of component /collection takes (14b ATLAS.items): the list leaves out the ones already on the line (p: the bar's parse). */
  collect: {
    list(q, ctx, a, p) { if (typeof ATLAS === 'undefined') return []; const w = String(q || '').trim().toLowerCase(), n = ATLAS.counts(), have = new Set((p ? p.toks.slice(0, p.argIndex) : []).map(t => (ATLAS.itemFor(t) || {}).id).filter(Boolean));
      return ATLAS.items().filter(x => !have.has(x.id)).map(x => ({ x, s: !w ? 1 : x.token.startsWith(w) ? 4 : x.also.some(y => y.startsWith(w)) ? 3 : x.label.toLowerCase().includes(w) ? 2 : 0 })).filter(r => r.s > 0).sort((a, b) => b.s - a.s)
        .map(r => ({ label: r.x.token, sub: r.x.label + ' · ' + (n.get(r.x.id) || 0), v: r.x.token })); },
    resolve(v) { if (typeof ATLAS === 'undefined') return null; const ids = [], bad = [];
      (Array.isArray(v) ? v : [v]).flatMap(t => String(t).split(/[\s,]+/)).filter(Boolean).forEach(t => { const it = ATLAS.itemFor(t); if (!it) bad.push(t); else if (!ids.includes(it.id)) ids.push(it.id); });
      if (bad.length) toast('No such kind of component: ' + bad.join(', ') + ' — type /collection and a space for the list'); return ids.length ? ids : bad.length ? null : []; },
    ask: () => Promise.resolve([]),
  },
};
/** Yes or no, as a promise. */
function askYes(title, text) { return new Promise(res => { let v = false; modal({ title, body: h('p.serif', { style: { marginTop: 0 } }, text), actions: [{ label: 'No' }, { label: 'Yes', pri: true, run: () => { v = true; } }], onClose: () => res(v) }); }); }
/* ---------- the notes opened, for /back and /forward ---------- */
const HIST = { list: [], i: -1, skip: null,
  push(hash) { if (HIST.skip === hash) { HIST.skip = null; return; } if (HIST.list[HIST.i] === hash) return; HIST.list = HIST.list.slice(0, HIST.i + 1); HIST.list.push(hash); if (HIST.list.length > 50) HIST.list.shift(); HIST.i = HIST.list.length - 1; },
  can: d => { const j = HIST.i + d; return j >= 0 && j < HIST.list.length; },
  go(d) { if (!HIST.can(d)) return false; HIST.i += d; HIST.skip = HIST.list[HIST.i]; App.go(HIST.list[HIST.i]); return true; },
  title(d) { const hs = HIST.list[HIST.i + d]; if (!hs) return ''; const m = /^#\/doc\/([^/]+)/.exec(hs), doc = m && M.doc(m[1]); return doc ? doc.title : hs; } };
addEventListener('hashchange', () => { if (/^#\/(doc|split)\//.test(location.hash)) HIST.push(location.hash); });
setTimeout(() => { if (/^#\/(doc|split)\//.test(location.hash)) HIST.push(location.hash); }, 0);
/* ---------- macros: steps behind one /command ---------- */
const MACRO = {
  FORMAT: 'sis-macro/1',
  all: () => settings().macros || [],
  get: name => { name = String(name || '').replace(/^\//, ''); return MACRO.all().find(m => m.slash === name || m.name === name) || null; },
  asCommand(m) { return { slash: m.slash, label: m.name || '/' + m.slash, sub: 'Macro · ' + plural((m.steps || []).length, 'step') + ((m.params || []).length ? ' · asks ' + m.params.map(p => p.name).join(', ') : ''), group: 'Macros', macro: m,
    args: (m.params || []).map(p => ({ name: p.name, kind: 'text', optional: true, ask: p.ask || p.name })), scope: 'both', run: (A, ctx) => MACRO.run(m, A, ctx) }; },
  /** What a macro must look like; the errors say which part. */
  check(m) {
    const E = []; if (!m || typeof m !== 'object') return { ok: false, errors: ['not a macro object'] };
    if (m.format !== MACRO.FORMAT) E.push('format must be "' + MACRO.FORMAT + '"');
    if (!m.name || typeof m.name !== 'string') E.push('name is missing');
    if (!/^[a-z][a-z0-9-]{0,30}$/.test(String(m.slash || ''))) E.push('slash must be letters, digits and dashes, starting with a letter');
    else if (CMD.by[m.slash] || CMD.inserts().some(x => x.slash === m.slash)) E.push('/' + m.slash + ' is a built-in command');
    if (!Array.isArray(m.steps) || !m.steps.length) E.push('steps must be a non-empty list');
    (m.params || []).forEach((p, i) => { if (!p || !/^[A-Za-z_]\w*$/.test(String(p.name || ''))) E.push('param ' + (i + 1) + ' needs a name'); });
    (m.steps || []).forEach((s, i) => { const n = 'step ' + (i + 1); if (!s || typeof s !== 'object') return E.push(n + ' is not an object');
      const c = s.cmd && CMD.get(s.cmd); if (!c) return E.push(n + ': no command /' + s.cmd);
      if (c.macro) E.push(n + ': a macro cannot run a macro');
      Object.keys(s.args || {}).forEach(k => { if (k !== 'pick' && !c.args.some(a => a.name === k)) E.push(n + ': /' + c.slash + ' has no argument "' + k + '"' + (c.args.length ? ' (it takes ' + c.args.map(a => a.name).join(', ') + ')' : '')); });
      c.args.filter(a => !a.optional).forEach(a => { if (!(s.args || {})[a.name]) E.push(n + ': /' + c.slash + ' needs "' + a.name + '"'); });
      if (s.when != null && typeof s.when !== 'string') E.push(n + ': when must be text'); });
    const names = new Set(['date', 'time', 'note', 'project', ...(m.params || []).map(p => p.name)]);
    JSON.stringify(m.steps || []).replace(/\{([A-Za-z_]\w*)\}/g, (x, k) => { if (!names.has(k)) E.push('{' + k + '} is not a param (params: ' + [...names].join(', ') + ')'); return x; });
    return { ok: !E.length, errors: E };
  },
  save(m) { saveSettings({ macros: [...MACRO.all().filter(x => x.slash !== m.slash), m] }); },
  remove(slash) { saveSettings({ macros: MACRO.all().filter(x => x.slash !== slash) }); },
  import(json) { let m; try { m = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { toast('Not a macro file: ' + e.message); return null; } const r = MACRO.check(m); if (!r.ok) { toast('Macro refused — ' + r.errors[0]); return null; } MACRO.save(m); toast('Macro /' + m.slash + ' is ready'); return m; },
  file(m) { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' })), download: m.slash + '.sis-macro.json' }); document.body.append(a); a.click(); a.remove(); },
  fill(s, vars) { return String(s).replace(/\{([A-Za-z_]\w*)\}/g, (x, k) => vars[k] != null ? String(vars[k]) : x); },
  /** Run the steps in order; a failing step stops it and says which. */
  async run(m, A, ctx) {
    if (typeof m === 'string') m = MACRO.get(m); if (!m) { toast('No such macro'); return false; }
    ctx = CMD.ctx(ctx); const now = new Date(), vars = { date: localDate(now), time: fmtTime(now), note: ctx.doc ? ctx.doc.title : '', project: ctx.doc ? (M.project(ctx.doc.projectId) || {}).name || '' : '' };
    for (const [i, p] of (m.params || []).entries()) { let v = Array.isArray(A) ? A[i] : A && A[p.name];
      if (v == null || v === '') { if (p.default != null) v = MACRO.fill(p.default, vars); else { v = await askText(m.name, p.ask || p.name, ''); if (v == null) return false; } }
      vars[p.name] = v; }
    let n = 0;
    for (const st of m.steps || []) {
      if (st.when != null) { const ask = /^\{ask:\s*(.*?)\s*\}$/.exec(String(st.when).trim()); if (ask) { if (!(await askYes(m.name, ask[1]))) continue; } else { const w = MACRO.fill(st.when, vars).trim().toLowerCase(); if (!w || w === 'false' || w === 'no' || w === '0') continue; } }
      const args = {}; Object.entries(st.args || {}).forEach(([k, v]) => { args[k === 'pick' ? '_pick' : k] = typeof v === 'string' ? MACRO.fill(v, vars) : v; });
      const ok = await CMD.run(st.cmd, args, ctx); if (!ok) { toast('Macro /' + m.slash + ' stopped at step ' + (n + 1) + ' (/' + st.cmd + ')'); return false; }
      await CMD.settle(); n++; ctx = CMD.ctx();   // the note on screen may have changed (a /new)
    }
    toast('Macro /' + m.slash + ' · ' + plural(n, 'step') + ' done'); return true;
  },
};
/** A picker a command opened: fill its search with `text`. And: wait until no dialog or popover is open (a macro's next step). */
CMD.prefill = text => { if (!text) return; let n = 0; const t = () => { const i = [...$$('.ovl .pk-q, .pop .pk-q, .ovl input[type=search], .ovl input.inp')].find(x => x.offsetParent); if (i) { i.value = text; i.dispatchEvent(new Event('input', { bubbles: true })); } else if (++n < 12) setTimeout(t, 120); }; setTimeout(t, 120); };
CMD.settle = () => new Promise(res => { let n = 0; const t = () => { if (!$('.ovl') && !$('.pop') && !$('.slash-menu')) return res(); if (++n > 450) return res(); setTimeout(t, 200); }; setTimeout(t, 150); });
CMD.insert = (x, pick, ctx) => { const d = CMD.need(ctx), pane = ctx.pane; if (x.when && !x.when(d)) throw new Error('that cannot go in this note');
  const p = ctx.block ? { x: ctx.block.x || 0, y: (ctx.block.y || 0) + pane.boxH(ctx.block.id) + 28 } : (() => { const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); return { x: Math.round((c.x - 200) / 14) * 14, y: Math.round((c.y - 100) / 14) * 14 }; })();
  x.run(d, p, pane); if (pick || ctx._pick) CMD.prefill(pick || ctx._pick); return 'Inserted ' + (typeof x.label === 'function' ? x.id : String(x.label).replace(/…$/, '')); };
CMD.hand = m => { const map = { erase: 'eraser', hl: 'hl', pen: 'pen', lasso: 'lasso', pan: 'move', move: 'move', zoom: 'zoom' }, hm = map[m] || m;
  if (window.SIS_LAB && SIS_LAB.setHand) SIS_LAB.setHand(hm); else { if (hm === 'move' || hm === 'zoom') INK.mouse = false; else { INK.mouse = true; INK.setTool(hm); } INK.paintBars(); } return 'Hand: ' + hm; };
/* ---------- the built-ins (one per line; scripts/scientia_macro.py reads them) ---------- */
{
  const C = (slash, label, args, run, o = {}) => CMD.add(Object.assign({ slash, label, args, run }, o));
  const A = (name, kind, o = {}) => Object.assign({ name, kind }, o);
  const need = CMD.need, doc = ctx => need(ctx), say = s => s;
  const TABIDS = () => [...(typeof TABS === 'undefined' ? [] : TABS).map(t => t[0]), 'settings'];
  C('go', 'Open a note', [A('note', 'note')], (A_, ctx) => { App.go('#/doc/' + A_.note.id); return 'Opened ' + A_.note.title; }, { alias: ['open'], group: 'Go', sub: 'By its title' });
  C('back', 'Back to the previous note', [], () => HIST.go(-1) ? 'Back' : 'Nothing to go back to', { group: 'Go', sub: 'Alt+←' });
  C('forward', 'Forward again', [], () => HIST.go(1) ? 'Forward' : 'Nothing ahead', { group: 'Go', sub: 'Alt+→' });
  C('project', 'Open a project', [A('project', 'project')], A_ => { App.go('#/project/' + A_.project.id); return 'Opened ' + (A_.project.name || 'the project'); }, { group: 'Go' });
  C('theme', 'Open a theme', [A('theme', 'theme')], A_ => { App.go('#/theme/' + A_.theme.id); return 'Opened ' + A_.theme.name; }, { group: 'Go' });
  C('today', 'Today’s day note', [], () => { App.go('#/doc/' + DAY.doc().id); return 'Today'; }, { group: 'Go' });
  C('day', 'A day note', [A('day', 'date', { ask: 'Which day?' })], A_ => { App.go('#/doc/' + DAY.doc(A_.day, true).id); return 'Day ' + A_.day; }, { group: 'Go', sub: 'today · yesterday · tomorrow · 2026-11-03' });
  C('recent', 'Recent notes (the switcher)', [], () => { PAL.switcher(); }, { group: 'Go', sub: 'Ctrl+O' });
  C('split', 'Open a note beside this one', [A('note', 'note')], A_ => { App.openSide(A_.note.id, null, true); return 'Beside: ' + A_.note.title; }, { group: 'Go' });
  C('tab', 'Go to a tab', [A('tab', 'choice', { choices: TABIDS })], A_ => { App.go('#/' + A_.tab); return A_.tab; }, { group: 'Go' });
  C('flagged', 'The weekly review (flagged notes and structures)', [], () => { App.go('#/review'); }, { group: 'Go' });
  C('reminders', 'Reminders', [], () => { App.go('#/reminders'); }, { group: 'Go' });
  C('library', 'The library', [], () => { App.go('#/library'); }, { group: 'Go' });
  C('read', 'Read a paper', [A('paper', 'paper')], A_ => { App.go('#/read/' + A_.paper.id); return 'Reading ' + snippet(A_.paper.title, 40); }, { group: 'Go' });
  C('beside', 'Read a PDF or an HTML page beside the note', [A('component', 'component')], (A_, ctx) => { const b = A_.component; if (typeof RDOCK === 'undefined' || !RDOCK.KINDS[b.kind]) throw new Error('only a PDF or an HTML page reads beside the note'); if (!ctx.doc || b.docId !== ctx.doc.id) { App.go('#/doc/' + b.docId); setTimeout(() => RDOCK.open(M.block(b.id)), 600); } else RDOCK.open(b); return 'Beside: ' + M.blockName(b); }, { group: 'Go' });
  C('find', 'Search the notebook (the Atlas, with the words lit)', [A('text', 'text', { optional: true, rest: true, ask: 'Search for' })], A_ => { Search.q = A_.text || ''; Search.open(); }, { alias: ['search', 'atlas'], group: 'Find', sub: 'Ctrl+K' });
  C('quick', 'The quick search (the list)', [A('text', 'text', { optional: true, rest: true, ask: 'Search for' })], A_ => { Search.q = A_.text || ''; Search.open({ quick: true }); }, { group: 'Find', sub: 'Ctrl+Shift+K' });
  C('collection', 'The Atlas with just these kinds of component', [A('kinds', 'collect', { optional: true, many: true, rest: true, ask: 'Which kinds of component?' })], A_ => { if (!A_.kinds || !A_.kinds.length) { if (typeof NAV === 'undefined') throw new Error('name them: /collection html image pdf'); setTimeout(() => NAV.wake('/collection '), 0); return 'Pick the kinds: click them, or type them'; } ATLAS.collect(A_.kinds); return 'Collection · ' + A_.kinds.map(id => (ATLAS.item(id) || {}).label).join(' · '); }, { alias: ['collect'], group: 'Find', sub: 'html image pdf table equation… — a space after it lists them all' });
  C('lens', 'A term’s lens', [A('term', 'term')], A_ => { App.go('#/lens/' + A_.term.id); return A_.term.label; }, { group: 'Find', scope: 'canvas' });
  /* in the text (13zzg SLASH.text does them, at the caret of the component being written in) */
  const T = (slash, label, o = {}) => C(slash, label, [], (A_, ctx) => { if (!ctx.el || typeof SLASH === 'undefined') throw new Error('type /' + slash + ' in a component'); return SLASH.text(slash, ctx); }, Object.assign({ group: 'Text', scope: 'text' }, o));
  KINDS.forEach(k => T(k.id, 'The sentence before the caret is a ' + k.label.toLowerCase(), { sub: 'A structure' }));
  T('term', 'The word at the caret is a term', { sub: 'Joins the project’s terms' });
  T('cite', 'A citation from the library', { alias: ['citation'] });
  T('mention', 'The words refer to a structure recorded elsewhere', { alias: ['existing'] });
  T('sym', 'A symbol', { alias: ['symbol', 'symbols'] });
  T('date', 'Today’s date', {});
  T('time', 'The time now', {});
  C('select', 'Select the components of this note that carry…', [A('what', 'text', { rest: true, ask: 'structure:claim, term:<name>, or kind:hypothesis' })], (A_, ctx) => { const d = doc(ctx), m = /^(structure|term|kind):(.+)$/i.exec(A_.what.trim()); if (!m) throw new Error('structure:claim, term:name or kind:hypothesis');
    const ids = M.liveBlocks(d.id).filter(b => m[1].toLowerCase() === 'kind' ? (b.ckind || '').toLowerCase() === m[2].toLowerCase() : m[1].toLowerCase() === 'structure' ? IX.itemsOf(b.id).some(it => it.kind === m[2].toLowerCase()) : (IX.blockTerms.get(b.id) ? [...IX.blockTerms.get(b.id)].some(t => (M.term(t) || {}).label.toLowerCase() === m[2].toLowerCase()) : false)).map(b => b.id);
    if (typeof LASSO2 === 'undefined' || !ids.length) throw new Error('nothing here carries that'); LASSO2.boxes().forEach(b => LASSO2.toggleBox(ctx.pane, b.id)); ids.forEach(id => LASSO2.toggleBox(ctx.pane, id)); return plural(ids.length, 'component') + ' selected'; }, { group: 'Find', scope: 'canvas' });
  C('new', 'A new note', [A('type', 'choice', { choices: () => userProfiles().map(p => p.type) }), A('title', 'text', { optional: true, rest: true })], A_ => { App.newDoc({ type: A_.type, title: A_.title || '' }); }, { group: 'Note' });
  C('rename', 'Rename this note', [A('title', 'text', { rest: true, ask: 'New title' })], (A_, ctx) => { const d = doc(ctx); d.title = A_.title; M.touchDoc(d); DB.put('documents', d); changed(); App.refresh(); return 'Renamed'; }, { group: 'Note' });
  C('iteration', 'The next version of a component, beside it', [A('component', 'component', { optional: true })], (A_, ctx) => { const b = A_.component || ctx.block || (ctx.pane && ctx.pane.sel && M.block(ctx.pane.sel)); if (!b) throw new Error('click a component first, or name it: /iteration Figure 2'); if (typeof ITER === 'undefined' || !ITER.can(b)) throw new Error('a version can be made of text, an image panel, a table, a plot, an equation, an HTML page, a PDF, slides or a well plate'); const v = ITER.next(b); ITER.make(b); return 'Version ' + v + ' of ' + snippet(M.blockName(b), 30); }, { alias: ['iterate', 'version'], group: 'Note', scope: 'canvas', sub: 'Blank, beside it, linked; say how it improved' });
  C('bridge', 'Bridge a component of this note to another note', [A('component', 'here'), A('note', 'note'), A('why', 'text', { optional: true, rest: true })], async (A_, ctx) => { const nb = await BRIDGE.to(A_.component, { dest: A_.note, why: A_.why }); return nb ? 'Bridged to ' + A_.note.title : false; }, { group: 'Note', sub: 'It shows there, live, with a caption saying why; double-click its underline here to go there' });
  C('move', 'Move a component to another note', [A('component', 'component'), A('note', 'note')], (A_, ctx) => { MOVE.ask([A_.component.id], A_.note.id, MOVE.spot(A_.note), true); return 'Moved to ' + A_.note.title; }, { group: 'Note', scope: 'canvas' });
  C('pull', 'Pull in a barrier, a structure or a component', [A('what', 'choice', { optional: true, choices: ['barrier', 'item', 'component'] })], (A_, ctx) => { doc(ctx); ctx.pane.pullMenu(ctx.doc, A_.what || undefined); }, { group: 'Note', scope: 'canvas' });
  C('connect', 'Connect two components (in the text: this one to another)', [A('from', 'component'), A('to', 'component'), A('relation', 'choice', { optional: true, choices: () => RELATIONS.map(r => r.id) })], (A_, ctx) => { if (A_.relation) { const r = RELATIONS.find(x => x.id === A_.relation); M.wire(A_.from.id, A_.to.id, r.id, r.dir); return 'Connected · ' + r.label; } (ctx.pane || DocView).relationPopover(A_.from.id, A_.to.id, innerWidth / 2 - 150, 160); }, { group: 'Note' });
  C('flag', 'Flag this note for the weekly review (again: clear it)', [], (A_, ctx) => { const d = doc(ctx), was = !!M.flagFor('doc', d.id); Promise.resolve(M.toggleFlag('doc', d.id)).catch(() => { }); return was ? 'Flag cleared' : 'Flagged'; }, { group: 'Note' });
  C('tidy', 'Tidy the layout', [], (A_, ctx) => { doc(ctx); ctx.pane.tidy(); return 'Tidied'; }, { group: 'Note', scope: 'canvas' });
  C('fold', 'Fold or unfold every component', [A('what', 'choice', { choices: ['all', 'none'] })], (A_, ctx) => { const d = doc(ctx); let n = 0; M.liveBlocks(d.id).forEach(b => { if (b.kind === 'ink') return; const want = A_.what === 'all' ? true : undefined; if (!!b.collapsed !== !!want) { b.collapsed = want; DB.put('blocks', b); n++; } }); changed(); return plural(n, 'component') + (A_.what === 'all' ? ' folded' : ' unfolded'); }, { group: 'Note', scope: 'canvas' });
  C('region', 'A region around the selected components', [A('name', 'text', { optional: true, rest: true })], (A_, ctx) => { const d = doc(ctx); const ids = typeof LASSO2 === 'undefined' ? [] : LASSO2.boxes().map(b => b.id); if (!ids.length) throw new Error('select components first (lasso, or Ctrl+click)'); const r = REGION.create(d, ids); if (A_.name) r.name = A_.name; REGION.save(d); changed(); return 'Region ' + r.name; }, { group: 'Note', scope: 'canvas' });
  C('export', 'Export', [A('what', 'choice', { choices: ['canvas', 'json'] })], (A_, ctx) => { if (A_.what === 'json') { Exporter.json(); return 'Exporting everything'; } const d = doc(ctx); Exporter.doc(d.id); return 'Exporting the canvas'; }, { group: 'Note' });
  C('timer', 'This note’s timer', [A('action', 'choice', { choices: ['start', 'pause', 'resume', 'stop'] })], (A_, ctx) => { const d = doc(ctx), s = TIMER.activeFor(d.id); if (A_.action === 'start') { if (s) throw new Error('already running'); TIMER.start(d.id); return 'Timer started'; } if (!s) throw new Error('no timer on this note'); if (A_.action === 'pause') { TIMER.pause(s); return 'Paused'; } if (A_.action === 'resume') { TIMER.resume(s); return 'Resumed'; } TIMER.stop(s); return 'Stopped'; }, { group: 'Note' });
  C('head', 'Start the timer with a head start', [A('minutes', 'number', { optional: true })], (A_, ctx) => { const d = doc(ctx); if (typeof HEAD === 'undefined') throw new Error('no head start here'); const cur = TIMER.activeFor(d.id); if (cur) HEAD.add(cur); else HEAD.start(d.id); }, { group: 'Note' });
  C('remind', 'A reminder', [A('text', 'text', { optional: true, rest: true })], A_ => { REM.edit({ title: A_.text || '' }); }, { group: 'Note' });
  C('people', 'People mentioned in this note', [], (A_, ctx) => { doc(ctx); if (typeof SLASH !== 'undefined') SLASH.people(ctx.doc); }, { group: 'Note', scope: 'canvas' });
  C('pen', 'The pen', [], () => CMD.hand('pen'), { group: 'Hand & view' });
  C('hl', 'The highlighter', [], () => CMD.hand('hl'), { alias: ['highlighter'], group: 'Hand & view' });
  C('lasso', 'The lasso', [], () => CMD.hand('lasso'), { group: 'Hand & view' });
  C('erase', 'The eraser', [], () => CMD.hand('erase'), { alias: ['eraser'], group: 'Hand & view' });
  C('pan', 'Pan (move)', [], () => CMD.hand('move'), { alias: ['hand'], group: 'Hand & view', sub: 'P' });
  C('zoom', 'Zoom the note', [A('to', 'text', { ask: 'A percentage, or fit' })], (A_, ctx) => { doc(ctx); const P = ctx.pane.paper; if (/^fit$/i.test(A_.to)) { P.fit(ctx.pane.bbox()); return 'Fit'; } const n = parseFloat(A_.to); if (isNaN(n)) throw new Error('a percentage, or fit'); P.zoomAt(n / 100); return Math.round(P.view.z * 100) + '%'; }, { group: 'Hand & view', scope: 'canvas', sub: '50 · 100 · fit' });
  C('colour', 'The pen’s colour', [A('which', 'text', { ask: 'A number in the palette (1, 2, …), or #rrggbb' })], A_ => { const C_ = INK.COLORS, v = A_.which.trim().toLowerCase(); let i = /^\d+$/.test(v) ? +v - 1 : C_.findIndex(c => String(c).toLowerCase() === v); if (i < 0 || i >= C_.length) throw new Error('the palette has ' + C_.length + ' colours'); INK.color = i; _ls.set('inkColor', i); INK.paintBars(); return 'Colour ' + (i + 1); }, { alias: ['color'], group: 'Hand & view' });
  C('width', 'The pen’s width', [A('n', 'number', { ask: '1 (thin) to ' + 4 })], A_ => { const n = Math.round(A_.n) - 1; if (n < 0 || n >= INK.WIDTHS.length) throw new Error('1 to ' + INK.WIDTHS.length); INK.width = n; _ls.set('inkWidth', n); INK.paintBars(); return 'Width ' + (n + 1); }, { group: 'Hand & view' });
  C('pressure', 'Pen pressure', [A('on', 'choice', { choices: ['on', 'off'] })], A_ => { INK.pressure = A_.on === 'on'; _ls.set('inkPressure', INK.pressure); INK.paintBars(); return 'Pressure ' + A_.on; }, { group: 'Hand & view' });
  C('calc', 'A calculator in this note', [], (A_, ctx) => { doc(ctx); CALC.open(ctx.pane); }, { group: 'Hand & view', scope: 'canvas' });
  C('focus', 'Focus mode', [], () => { App.toggleFocus(); }, { group: 'Hand & view', sub: 'Ctrl+.' });
  C('undo', 'Undo', [], () => { App.undo(); }, { group: 'Notebook', sub: 'Ctrl+Z' });
  C('sync', 'Sync with the lab now (status: how it stands)', [A('what', 'choice', { optional: true, choices: ['now', 'status'] })], async A_ => { if (A_.what === 'status') { if (window.SIS_DESKTOP) { const j = await fetch('api/lab/status').then(r => r.json()).catch(() => null); return j ? ('Lab: ' + (j.connected || j.ok ? 'connected' : 'not connected') + (j.pending != null ? ' · ' + j.pending + ' waiting' : '') + (j.lastSync || j.last ? ' · last ' + (j.lastSync || j.last) : '')) : 'The app on this computer did not answer'; } return 'Sync runs through the lab site'; }
    if (window.SIS_DESKTOP) { await fetch('api/lab/sync-now', { method: 'POST' }).catch(() => null); return 'Syncing with the lab…'; } if (window.SIS_LAB && SIS_LAB.refresh) { SIS_LAB.refresh(); return 'Refreshing from the lab…'; } return 'Sync runs on its own here'; }, { group: 'Notebook' });
  C('settings', 'Settings', [A('section', 'text', { optional: true, rest: true })], A_ => { App.go('#/settings'); if (A_.section) setTimeout(() => { const h2 = [...$$('.sec-h h2')].find(x => x.textContent.toLowerCase().startsWith(A_.section.toLowerCase())); h2 && h2.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 300); }, { group: 'Notebook' });
  C('macro', 'Run a macro', [A('name', 'text', { ask: 'Which macro?' })], (A_, ctx) => MACRO.run(A_.name, [], ctx), { group: 'Notebook' });
  C('macros', 'Your macros', [], () => { if (typeof NAV !== 'undefined') NAV.macros(); }, { group: 'Notebook' });
  C('commands', 'Your commands (Settings → Commands)', [], () => CMD.run('settings', ['commands']), { group: 'Notebook' });
  C('help', 'Every command', [], () => { if (typeof NAV !== 'undefined') NAV.help(); }, { group: 'Notebook', sub: '? in the bar' });
  C('shortcuts', 'Keyboard shortcuts', [], () => { const f = App.help || App.shortcuts; if (typeof f === 'function') f.call(App); else if (typeof NAV !== 'undefined') NAV.help(); }, { group: 'Notebook' });
  C('version', 'This build', [], () => 'Scientia In Situ · ' + BUILD, { group: 'Notebook' });
  C('close', 'Close what is open: a popover, the reader, a maximised view', [], () => { closePop(); $$('.slash-menu').forEach(x => x.remove()); if (typeof RDOCK !== 'undefined' && RDOCK.st) RDOCK.close(); const mx = $('.embed-max:not(.rd-dock)'); if (mx && typeof MXHL !== 'undefined') MXHL.close(mx); const ov = $('.ovl'); if (ov) { const x = $('.mh .btn', ov); x ? x.click() : ov.remove(); } return 'Closed'; }, { group: 'Notebook', sub: 'Esc' });
  C('insert', 'Insert a row of + Insert', [A('row', 'choice', { choices: () => (typeof INSERTS === 'undefined' ? [] : INSERTS).map(x => CMD.ALIAS[x.id] || x.id) }), A('pick', 'text', { optional: true, rest: true })], (A_, ctx) => { const x = (typeof INSERTS === 'undefined' ? [] : INSERTS).find(r => (CMD.ALIAS[r.id] || r.id) === A_.row || r.id === A_.row); if (!x) throw new Error('no such row'); return CMD.insert(x, A_.pick, ctx); }, { group: 'Insert' });
}
/* ---------- Settings → Commands: the person's own commands, and the macros ---------- */
CMD.settingsUI = function () {
  const s = settings(), yours = s.commands || [], macros = MACRO.all();
  const edit = (x, isNew) => {
    const slash = h('input.inp.mono', { value: x.slash || '', placeholder: 'gelrun', style: { width: '140px' } }), label = h('input.inp', { value: x.label || '', placeholder: 'What it does, in a few words' });
    const kind = h('select.inp', [['insert', 'Insert a row of + Insert'], ['cmd', 'Run a built-in with preset arguments'], ['macro', 'Run a macro']].map(([v, l]) => h('option', { value: v, selected: (x.kind || 'insert') === v }, l)));
    const target = h('select.inp'), args = h('input.inp.mono', { value: Array.isArray(x.args) ? x.args.join(' ') : x.args || '', placeholder: 'arguments, as you would type them' });
    const fillT = () => { const k = kind.value; const opts = k === 'insert' ? CMD.inserts().map(i => [i.slash, i.label]) : k === 'macro' ? MACRO.all().map(m => [m.slash, m.name]) : CMD.list.map(c => [c.slash, '/' + c.slash + ' — ' + c.label]); target.replaceChildren(...opts.map(([v, l]) => h('option', { value: v, selected: x.target === v }, l))); args.parentElement && (args.parentElement.hidden = k !== 'cmd'); };
    kind.addEventListener('change', fillT);
    const m = modal({ title: isNew ? 'A command of your own' : 'Edit /' + x.slash, actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => { const sl = slash.value.trim().toLowerCase(); if (!/^[a-z][a-z0-9-]{0,30}$/.test(sl)) { toast('A slash: letters, digits, dashes'); return false; } if ((CMD.by[sl] || CMD.inserts().some(i => i.slash === sl) || MACRO.get(sl)) && sl !== x.slash) { toast('/' + sl + ' is taken'); return false; }
      const n = { slash: sl, label: label.value.trim(), kind: kind.value, target: target.value, args: kind.value === 'cmd' ? CMD.tokens(args.value) : undefined }; saveSettings({ commands: [...(settings().commands || []).filter(c => c.slash !== x.slash && c.slash !== sl), n] }); App.refresh(); } }],
      body: h('div', h('div.grid2', h('label.f', h('span', 'Slash'), slash), h('label.f', h('span', 'Label'), label)), h('label.f', { style: { marginTop: '8px' } }, h('span', 'What it does'), kind), h('label.f', h('span', 'Which'), target), h('label.f', h('span', 'Arguments'), args)) });
    fillT(); return m; };
  const importFile = accept => { const i = h('input', { type: 'file', accept, style: { display: 'none' } }); i.addEventListener('change', async () => { for (const f of i.files) { const t = await f.text(); let j = null; try { j = JSON.parse(t); } catch (e) { toast(f.name + ': not JSON'); continue; } if (j && Array.isArray(j.commands)) { const mine = settings().commands || []; saveSettings({ commands: [...mine.filter(c => !j.commands.some(x => x.slash === c.slash)), ...j.commands] }); (j.macros || []).forEach(m => MACRO.import(m)); toast('Commands imported'); } else MACRO.import(j); } App.refresh(); }); document.body.append(i); i.click(); i.remove(); };
  const folder = h('div.tiny.muted', { style: { marginTop: '6px' } });
  if (window.SIS_DESKTOP) fetch('api/macros').then(r => r.json()).then(j => { if (!j || !j.ok || !j.files.length) { folder.textContent = 'The notebook folder’s macros/ is empty — a macro file saved there shows up here.'; return; }
    folder.replaceChildren('In the notebook folder’s macros/: ', ...j.files.map(f => h('button.btn.xs', { style: { margin: '0 4px 4px 0' }, title: 'Import ' + f, on: { click: async () => { const t = await fetch('api/macros?name=' + encodeURIComponent(f)).then(r => r.text()); MACRO.import(t); App.refresh(); } } }, f))); }).catch(() => { folder.textContent = ''; });
  return h('div.cmd-settings', h('div.sec'), h('div.sec-h', h('h2', 'Commands'), h('span.k', '/ in a component · / on the canvas · macros')),
    h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'Type / in a component for the commands that act on the text; press / on the canvas (nothing selected) for the navigation bar at the bottom, which takes every command. /help lists them. Here you add commands of your own and macros — steps behind one /command, from a .sis-macro.json file.'),
    h('div.list', yours.length ? yours.map(x => h('div.li', h('code.mono', '/' + x.slash), h('span.t', x.label || '', h('span.s', CMD.describe(x))), h('button.btn.xs', { on: { click: () => edit(x, false) } }, 'Edit'), h('button.btn.xs.ghost', { on: { click: () => { saveSettings({ commands: (settings().commands || []).filter(c => c.slash !== x.slash) }); App.refresh(); } } }, '×'))) : h('div.li.muted', 'No commands of your own yet.'),
      h('div.li', h('button.btn.sm', { on: { click: () => edit({}, true) } }, '+ Command'), h('button.btn.sm', { on: { click: () => importFile('.json,application/json') } }, 'Import…'), yours.length ? h('button.btn.sm', { on: { click: () => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ format: 'sis-commands/1', commands: yours, macros }, null, 2)], { type: 'application/json' })), download: 'scientia.sis-commands.json' }); document.body.append(a); a.click(); a.remove(); } } }, 'Export all') : null)),
    h('h3', { style: { fontSize: '13px', margin: '14px 0 6px' } }, 'Macros'),
    h('div.list', macros.length ? macros.map(m => h('div.li', h('code.mono', '/' + m.slash), h('span.t', m.name, h('span.s', plural((m.steps || []).length, 'step') + ' · ' + (m.steps || []).map(st => '/' + st.cmd).join(' → '))), h('button.btn.xs', { on: { click: () => MACRO.run(m, [], null) } }, 'Run'), h('button.btn.xs', { on: { click: () => MACRO.file(m) } }, 'Export'), h('button.btn.xs.ghost', { on: { click: () => { MACRO.remove(m.slash); App.refresh(); } } }, '×'))) : h('div.li.muted', 'No macros yet — import a .sis-macro.json (the scientia-macro skill writes them).'),
      h('div.li', h('button.btn.sm', { on: { click: () => importFile('.json,application/json') } }, 'Import a macro…'))), folder);
};
setTimeout(() => { if (typeof SettingsView === 'undefined') return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
  try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Keys'), sec = h2 && h2.closest('.sec-h'); const ui = CMD.settingsUI(); if (sec) sec.before(ui); else out.append(ui); } catch (e) { console.warn('[commands]', e); }
  return out; }; }, 0);
