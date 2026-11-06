/* ==========================================================================
   13k · Live views and formulas. A view is
     { source(s), where: predicate tree, layout: table|board|calendar|timeline,
       columns, formulas: [{name, expr}], sort, group, dateField }
   evaluated over what is already stored (structures, components and their
   typed fields, notes, time sessions, aim milestones, datasets, materials,
   day entries). A view can sit in any note as a component and stays live.
   Formulas use FX, a small expression language parsed here — never eval.
   ========================================================================== */
const FX = {
  /* ---------------- tokenizer + Pratt parser ---------------- */
  lex(src) {
    const out = [], re = /\s*(?:(\d*\.\d+|\d+\.?\d*)(?:[eE]([+-]?\d+))?|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w.$]*)|(==|!=|<=|>=|&&|\|\||[-+*/%^<>!(),?:=]))/y;
    let i = 0; src = String(src || '');
    while (i < src.length) { if (/^\s+$/.test(src.slice(i))) break; re.lastIndex = i; const m = re.exec(src); if (!m) throw new Error('unexpected “' + src[i] + '”'); i = re.lastIndex;
      if (m[1] != null) out.push({ t: 'n', v: parseFloat(m[1] + (m[2] ? 'e' + m[2] : '')) });
      else if (m[3] != null || m[4] != null) out.push({ t: 's', v: (m[3] ?? m[4]).replace(/\\(.)/g, '$1') });
      else if (m[5]) { const w = m[5].toLowerCase(); out.push(w === 'and' ? { t: 'op', v: '&&' } : w === 'or' ? { t: 'op', v: '||' } : w === 'not' ? { t: 'op', v: '!' } : w === 'true' ? { t: 'b', v: true } : w === 'false' ? { t: 'b', v: false } : w === 'null' ? { t: 'b', v: null } : { t: 'id', v: m[5] }); }
      else out.push({ t: 'op', v: m[6] === '=' ? '==' : m[6] }); }
    return out;
  },
  BP: { '?': 1, '||': 2, '&&': 3, '==': 4, '!=': 4, '<': 5, '<=': 5, '>': 5, '>=': 5, '+': 6, '-': 6, '*': 7, '/': 7, '%': 7, '^': 9 },
  parse(src) {
    const T = FX.lex(src); let k = 0;
    const peek = () => T[k], take = () => T[k++], isOp = v => peek() && peek().t === 'op' && peek().v === v;
    const expr = (rbp = 0) => {
      let t = take(); if (!t) throw new Error('incomplete'); let left;
      if (t.t === 'n' || t.t === 's' || t.t === 'b') left = { k: 'lit', v: t.v };
      else if (t.t === 'id') { if (isOp('(')) { take(); const args = []; if (!isOp(')')) { args.push(expr()); while (isOp(',')) { take(); args.push(expr()); } } if (!isOp(')')) throw new Error('missing )'); take(); left = { k: 'call', f: t.v, args }; } else left = { k: 'var', n: t.v }; }
      else if (t.v === '(') { left = expr(); if (!isOp(')')) throw new Error('missing )'); take(); }
      else if (t.v === '-') left = { k: 'un', o: '-', a: expr(8) }; else if (t.v === '!') left = { k: 'un', o: '!', a: expr(8) }; else if (t.v === '+') left = expr(8);
      else throw new Error('unexpected ' + t.v);
      for (;;) { const o = peek(); if (!o || o.t !== 'op' || !(o.v in FX.BP) || FX.BP[o.v] <= rbp) break; take();
        if (o.v === '?') { const a = expr(); if (!isOp(':')) throw new Error('missing :'); take(); const b = expr(0); left = { k: 'if', c: left, a, b }; continue; }
        left = { k: 'bin', o: o.v, a: left, b: expr(o.v === '^' ? FX.BP[o.v] - 1 : FX.BP[o.v]) }; }
      return left;
    };
    const ast = expr(); if (k < T.length) throw new Error('unexpected “' + T[k].v + '”'); return ast;
  },
  _cache: new Map(),
  compile(src) { if (FX._cache.has(src)) return FX._cache.get(src); let r; try { r = { ast: FX.parse(src) }; } catch (e) { r = { err: e.message }; } FX._cache.set(src, r); return r; },
  num: v => v == null || v === '' ? NaN : typeof v === 'number' ? v : typeof v === 'boolean' ? +v : v instanceof Date ? +v : (/^\d{4}-\d\d-\d\d/.test(v) ? +new Date(v) : parseFloat(v)),
  date: v => v == null || v === '' ? null : v instanceof Date ? v : typeof v === 'number' ? new Date(v) : (isNaN(+new Date(v)) ? null : new Date(v)),
  FN: {
    if: (c, a, b) => c ? a : b, round: (x, d = 0) => Math.round(FX.num(x) * 10 ** d) / 10 ** d, floor: x => Math.floor(FX.num(x)), ceil: x => Math.ceil(FX.num(x)), abs: x => Math.abs(FX.num(x)),
    sqrt: x => Math.sqrt(FX.num(x)), ln: x => Math.log(FX.num(x)), log: x => Math.log10(FX.num(x)), exp: x => Math.exp(FX.num(x)), pow: (a, b) => FX.num(a) ** FX.num(b),
    min: (...a) => Math.min(...a.map(FX.num)), max: (...a) => Math.max(...a.map(FX.num)), sum: (...a) => a.map(FX.num).reduce((s, x) => s + (isNaN(x) ? 0 : x), 0), avg: (...a) => { const v = a.map(FX.num).filter(x => !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; },
    len: x => x == null ? 0 : String(x).length, lower: x => String(x ?? '').toLowerCase(), upper: x => String(x ?? '').toUpperCase(), trim: x => String(x ?? '').trim(),
    contains: (a, b) => String(a ?? '').toLowerCase().includes(String(b ?? '').toLowerCase()), startsWith: (a, b) => String(a ?? '').toLowerCase().startsWith(String(b ?? '').toLowerCase()),
    concat: (...a) => a.map(x => x ?? '').join(''), coalesce: (...a) => a.find(x => x != null && x !== ''), number: x => FX.num(x), text: x => x == null ? '' : String(x), empty: x => x == null || x === '' || (typeof x === 'number' && isNaN(x)),
    days: d => { const x = FX.date(d); return x ? Math.floor((Date.now() - +x) / 864e5) : NaN; }, daysBetween: (a, b) => { const x = FX.date(a), y = FX.date(b); return x && y ? Math.round((+y - +x) / 864e5) : NaN; },
    hours: ms => FX.num(ms) / 36e5, minutes: ms => FX.num(ms) / 6e4, today: () => localDate(new Date()), now: () => isoLocal(new Date()),
    date: d => { const x = FX.date(d); return x ? localDate(x) : ''; }, weekday: d => { const x = FX.date(d); return x ? x.toLocaleDateString(undefined, { weekday: 'short' }) : ''; }, week: d => { const x = FX.date(d); return x ? localDate(IX.weekStartFor(x)) : ''; },
    fmt: (x, d = 2) => { const n = FX.num(x); return isNaN(n) ? '' : String(Math.round(n * 10 ** d) / 10 ** d); },
  },
  run(ast, row) {
    const ev = n => {
      switch (n.k) {
        case 'lit': return n.v;
        case 'var': { if (n.n in row) return row[n.n]; const alt = Object.keys(row).find(k => k.toLowerCase() === n.n.toLowerCase()); return alt ? row[alt] : null; }
        case 'un': { const a = ev(n.a); return n.o === '-' ? -FX.num(a) : !a; }
        case 'if': return ev(n.c) ? ev(n.a) : ev(n.b);
        case 'call': { const f = FX.FN[n.f] || FX.FN[n.f.toLowerCase()]; if (!f) throw new Error('unknown function ' + n.f); if (n.f === 'if') return ev(n.args[0]) ? ev(n.args[1]) : ev(n.args[2]); return f(...n.args.map(ev)); }
        case 'bin': {
          if (n.o === '&&') return ev(n.a) && ev(n.b); if (n.o === '||') return ev(n.a) || ev(n.b);
          const a = ev(n.a), b = ev(n.b);
          switch (n.o) {
            case '+': return (typeof a === 'string' && isNaN(FX.num(a))) || (typeof b === 'string' && isNaN(FX.num(b))) ? String(a ?? '') + String(b ?? '') : FX.num(a) + FX.num(b);
            case '-': return FX.num(a) - FX.num(b); case '*': return FX.num(a) * FX.num(b); case '/': return FX.num(a) / FX.num(b); case '%': return FX.num(a) % FX.num(b); case '^': return FX.num(a) ** FX.num(b);
            case '==': return a == b || String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase(); case '!=': return !(a == b || String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase());
            case '<': return FX.cmp(a, b) < 0; case '<=': return FX.cmp(a, b) <= 0; case '>': return FX.cmp(a, b) > 0; case '>=': return FX.cmp(a, b) >= 0;
          }
        }
      }
      return null;
    };
    return ev(ast);
  },
  cmp(a, b) { const x = FX.num(a), y = FX.num(b); if (!isNaN(x) && !isNaN(y)) return x - y; return String(a ?? '').localeCompare(String(b ?? '')); },
  eval(src, row) { const c = FX.compile(src); if (c.err) throw new Error(c.err); return FX.run(c.ast, row); },
};

/* ---------------- sources: what a view can look over ---------------- */
const LV = {
  SOURCES: {
    items: { label: 'Structures (claims, barriers, questions…)', date: 'created', title: 'text', group: 'kind', rows() { return DB.where('items', i => !i.correctedBy).map(i => { const d = M.doc(i.originDocId) || {}, th = d.themeId && M.theme(d.themeId);
      return { _id: i.id, _open: e => App.jump(i.originBlockId, e), _src: 'items', kind: i.kind, text: i.text, status: IX.status(i) || '', stance: i.stance || '', created: i.created, age: Math.floor((Date.now() - +new Date(i.created)) / 864e5), note: d.title || '', noteType: d.type || '', theme: th ? th.name : '', themeId: d.themeId || '', project: (M.project(i.projectId) || {}).name || '', projectId: i.projectId || '', noteId: d.id || '' }; }); } },
    components: { label: 'Components (with their fields)', date: 'created', title: 'label', group: 'note', rows() { return DB.where('blocks', b => b.status === 'live' && b.kind === 'component').map(b => { const d = M.doc(b.docId) || {}, th = d.themeId && M.theme(d.themeId);
      const r = { _id: b.id, _open: e => App.jump(b.id, e), _src: 'components', label: M.blockName(b), text: snippet(b.body.text, 160), note: d.title || '', noteType: d.type || '', noteId: d.id || '', theme: th ? th.name : '', themeId: d.themeId || '', projectId: d.projectId || '', created: b.created, modified: b.modified || b.created,
        kinds: IX.kindsOf(b).join(', '), structures: IX.itemsOf(b.id).length, links: IX.wiresOf(b.id).length, stepMin: b.step && b.step.durMs != null ? Math.round(b.step.durMs / 6e4) : null };
      (b.fields || []).forEach(f => { const n = parseFloat(f.value); r['f.' + f.key] = isNaN(n) || String(n) !== String(f.value).trim() ? f.value : n; }); return r; }); } },
    notes: { label: 'Notes', date: 'created', title: 'title', group: 'type', rows() { return DB.where('documents', d => !d.archived).map(d => { const th = d.themeId && M.theme(d.themeId), ids = new Set([d.id]);
      return { _id: d.id, _open: e => App.jump(d.id, e, true), _src: 'notes', title: d.title, type: prof(d.type).label, noteId: d.id, theme: th ? th.name : '', themeId: d.themeId || '', project: (M.project(d.projectId) || {}).name || '', projectId: d.projectId || '', created: d.created, modified: d.modified,
        components: M.liveBlocks(d.id).filter(b => b.kind === 'component').length, openBarriers: DB.where('items', i => i.originDocId === d.id && i.kind === 'barrier' && IX.status(i) === 'open').length, minutes: Math.round(sum(DB.where('sessions', s => s.docId === d.id).map(s => TIMER.elapsed(s))) / 6e4) }; }); } },
    sessions: { label: 'Time (timer sessions and entries)', date: 'start', end: 'end', title: 'note', group: 'theme', rows() { return DB.all('sessions').map(s => { const d = M.doc(s.docId) || {}, th = s.themeId && M.theme(s.themeId), g0 = (s.segments || [])[0], gl = (s.segments || []).slice(-1)[0], ms = TIMER.elapsed(s);
      const start = g0 ? g0.s : s.localDate ? s.localDate + 'T09:00' : s.created, end = gl && gl.e ? gl.e : isoLocal(new Date(+new Date(start) + ms));
      return { _id: s.id, _open: e => d.id && App.jump(d.id, e, true), _src: 'sessions', note: d.title || '—', noteId: d.id || '', theme: th ? th.name : 'no theme', themeId: s.themeId || '', projectId: s.projectId || '', start, end, minutes: Math.round(ms / 6e4), state: s.state, source: s.source || s.entry }; }); } },
    milestones: { label: 'Aim milestones', date: 'metAt', title: 'label', group: 'theme', rows() { return DB.where('aims', a => a.status !== 'superseded').flatMap(a => (a.milestones || []).map(m => { const th = M.theme(a.themeId);
      return { _id: m.id, _open: () => th && App.go('#/theme/' + th.id), _src: 'milestones', label: m.label, aim: a.statement, weight: m.weight, met: !!m.metAt, metAt: m.metAt || '', due: m.due || '', theme: th ? th.name : '', themeId: a.themeId, projectId: th ? th.projectId : '', created: a.created }; })); } },
    datasets: { label: 'Datasets', date: 'acquired', title: 'name', group: 'instrument', rows() { return DB.all('datasets').map(x => ({ _id: x.id, _open: () => DATA.detail(x), _src: 'datasets', name: x.name, path: x.path, folder: x.root, sizeMB: Math.round(x.size / 1048576 * 10) / 10, instrument: x.instrument || '', acquired: x.acquired, status: x.status || '', projectId: x.projectId || '', usedBy: DB.where('blocks', b => ((b.binds || {}).datasets || []).includes(x.id)).length })); } },
    materials: { label: 'Materials', date: 'created', title: 'title', group: 'kind', rows() { return MATS.all().map(r => { const H = r.header || {}, used = MATS.usedIn(r.id);
      return { _id: r.id, _open: e => App.jump(r.id, e, true), _src: 'materials', title: r.title, kind: H.kind || 'other', lot: H.lot || '', passage: H.passage || '', conc: H.conc || '', projectId: r.projectId || '', created: r.created, uses: used.length, barriers: MATS.barriersIn(used).length, superseded: !!(r.supersededBy || []).length }; }); } },
    day: { label: 'Day entries (capture)', date: 'at', title: 'text', group: 'date', rows() { return DB.where('blocks', b => b.status === 'live' && (M.doc(b.docId) || {}).type === 'day').map(b => { const d = M.doc(b.docId), th = b.themeId && M.theme(b.themeId);
      return { _id: b.id, _open: e => App.jump(b.id, e), _src: 'day', text: snippet(b.body.text, 160), at: b.created, date: d.dayDate || localDate(b.created), kind: IX.kindsOf(b)[0] || '', filed: (b.filed || []).length > 0, theme: th ? th.name : '', themeId: b.themeId || '', projectId: th ? th.projectId : '' }; }); } },
  },
  fieldsOf(srcs) { const keys = new Set(); srcs.forEach(s => { const rs = LV.rowsOf([s]).slice(0, 400); rs.forEach(r => Object.keys(r).forEach(k => { if (!k.startsWith('_')) keys.add(k); })); }); return [...keys]; },
  rowsOf(srcs) { return srcs.flatMap(s => (LV.SOURCES[s] ? LV.SOURCES[s].rows() : [])); },
  srcs: v => Array.isArray(v.source) ? v.source : [v.source || 'items'],
  /** $here.* values come from the note the view sits in. */
  ctx(docId) { const d = M.doc(docId) || {}; return { '$here.theme': d.themeId || '', '$here.project': d.projectId || '', '$here.note': d.id || '', '$today': localDate(new Date()) }; },
  test(c, r, ctx) {
    if (c.terms) { const res = c.terms.map(t => LV.test(t, r, ctx)); return c.op === 'or' ? res.some(Boolean) : res.every(Boolean); }
    if (c.expr) { try { return !!FX.eval(c.expr, r); } catch { return false; } }
    const v = r[c.field], raw = c.value in ctx ? ctx[c.value] : c.value;
    switch (c.cmp) {
      case '=': return String(v ?? '').toLowerCase() === String(raw ?? '').toLowerCase(); case '!=': return String(v ?? '').toLowerCase() !== String(raw ?? '').toLowerCase();
      case 'contains': return String(v ?? '').toLowerCase().includes(String(raw ?? '').toLowerCase()); case '!contains': return !String(v ?? '').toLowerCase().includes(String(raw ?? '').toLowerCase());
      case '>': return FX.cmp(v, raw) > 0; case '>=': return FX.cmp(v, raw) >= 0; case '<': return FX.cmp(v, raw) < 0; case '<=': return FX.cmp(v, raw) <= 0;
      case 'empty': return v == null || v === '' || v === false; case '!empty': return !(v == null || v === '' || v === false);
      case 'within': { const x = FX.date(v); return !!x && (Date.now() - +x) / 864e5 <= +raw; } case 'older': { const x = FX.date(v); return !!x && (Date.now() - +x) / 864e5 > +raw; }
      case 'this week': { const x = FX.date(v); if (!x) return false; const ws = IX.weekStartFor(new Date()); return +x >= +ws && +x < +addDays(ws, 7); }
    }
    return true;
  },
  /** rows → filtered, with formula columns, sorted */
  compute(v, docId) {
    const ctx = LV.ctx(docId), forms = (v.formulas || []).filter(f => f.name && f.expr);
    let rows = LV.rowsOf(LV.srcs(v)).filter(r => !v.where || LV.test(v.where, r, ctx));
    rows.forEach(r => forms.forEach(f => { try { r[f.name] = FX.eval(f.expr, r); } catch (e) { r[f.name] = '⚠'; r._err = (r._err || {}); r._err[f.name] = e.message; } }));
    if (v.sort && v.sort.field) { const dir = v.sort.dir === 'desc' ? -1 : 1; rows.sort((a, b) => dir * FX.cmp(a[v.sort.field], b[v.sort.field])); }
    return rows;
  },
  fmt(x, key) {
    if (x == null || x === '') return '';
    if (typeof x === 'boolean') return x ? '✓' : '';
    if (typeof x === 'number') return Number.isInteger(x) ? String(x) : String(Math.round(x * 1000) / 1000);
    if (/^\d{4}-\d\d-\d\dT/.test(x)) return fmtDay(x) + ' ' + fmtTime(x); if (/^\d{4}-\d\d-\d\d$/.test(x)) return fmtDay(x + 'T12:00');
    return String(x);
  },

  /* ---------------- presets ---------------- */
  PRESETS: [
    { name: 'Open barriers in this theme', source: 'items', layout: 'board', group: 'status', where: { op: 'and', terms: [{ field: 'kind', cmp: '=', value: 'barrier' }, { field: 'themeId', cmp: '=', value: '$here.theme' }] }, columns: ['text', 'note', 'age'], sort: { field: 'age', dir: 'desc' } },
    { name: 'Questions older than 30 days', source: 'items', layout: 'table', where: { op: 'and', terms: [{ field: 'kind', cmp: '=', value: 'question' }, { field: 'status', cmp: '=', value: 'open' }, { field: 'created', cmp: 'older', value: '30' }] }, columns: ['text', 'note', 'theme', 'age'], sort: { field: 'age', dir: 'desc' } },
    { name: 'This week — time and milestones', source: ['sessions', 'milestones'], layout: 'timeline', group: 'theme', where: { op: 'or', terms: [{ field: 'start', cmp: 'this week', value: '' }, { field: 'metAt', cmp: 'this week', value: '' }, { op: 'and', terms: [{ field: 'met', cmp: '=', value: 'false' }, { field: 'themeId', cmp: '!empty', value: '' }] }] }, columns: ['note', 'label', 'minutes'] },
    { name: 'Fields across this theme', source: 'components', layout: 'table', where: { op: 'and', terms: [{ field: 'themeId', cmp: '=', value: '$here.theme' }, { expr: 'structures >= 0 && len(text) > 0' }] }, columns: ['label', 'note', 'kinds', 'structures'], formulas: [{ name: 'age (d)', expr: 'days(created)' }], sort: { field: 'created', dir: 'desc' } },
    { name: 'Time per note (hours)', source: 'notes', layout: 'table', where: { op: 'and', terms: [{ field: 'projectId', cmp: '=', value: '$here.project' }, { field: 'minutes', cmp: '>', value: '0' }] }, columns: ['title', 'type', 'theme', 'minutes', 'hours'], formulas: [{ name: 'hours', expr: 'round(minutes / 60, 1)' }], sort: { field: 'minutes', dir: 'desc' } },
    { name: 'Calendar of structures', source: 'items', layout: 'calendar', where: { op: 'and', terms: [{ field: 'projectId', cmp: '=', value: '$here.project' }] }, columns: ['text'] },
    { name: 'Datasets', source: 'datasets', layout: 'table', where: { op: 'and', terms: [] }, columns: ['name', 'instrument', 'sizeMB', 'acquired', 'status', 'usedBy'], sort: { field: 'acquired', dir: 'desc' } },
    { name: 'Materials by kind', source: 'materials', layout: 'board', group: 'kind', where: { op: 'and', terms: [] }, columns: ['title', 'lot', 'uses', 'barriers'] },
    { name: 'Day entries this week, not yet filed', source: 'day', layout: 'table', where: { op: 'and', terms: [{ field: 'at', cmp: 'this week', value: '' }, { field: 'filed', cmp: '=', value: 'false' }] }, columns: ['date', 'text', 'kind', 'theme'] },
  ],
  insert(d, p, preset) {
    const v = JSON.parse(JSON.stringify(preset || { name: 'Live view', source: 'items', layout: 'table', where: { op: 'and', terms: [] }, columns: ['text', 'kind', 'note'] }));
    const b = M.addBlock(d.id, null, { kind: 'view', label: v.name, view: v, x: p.x, y: p.y, w: v.layout === 'timeline' || v.layout === 'calendar' ? 868 : 728 });
    b.body = { text: v.name, marks: [] }; DB.put('blocks', b); changed(); if (!preset) setTimeout(() => LV.editor(b), 60); return b;
  },
  chooser(d, p) {
    const saved = DB.all('views');
    const m = modal({ title: 'Insert a live view', wide: true, actions: [{ label: 'Cancel' }, { label: 'Start empty…', run: () => LV.insert(d, p) }], body: optionPicker({ placeholder: 'Search views…', sort: 'lv',
      items: q => [...LV.PRESETS.map(v => ({ v, preset: true })), ...saved.map(v => ({ v, saved: true }))].filter(x => !q || x.v.name.toLowerCase().includes(q)),
      section: x => x.saved ? 'Saved views' : 'Starting points', render: x => h('div', h('b', x.v.name), ' ', h('span.pill', x.v.layout), h('span.s', LV.srcs(x.v).map(s => LV.SOURCES[s].label).join(' + '))),
      onPick: x => { m.close(); const b = LV.insert(d, p, x.v); if (x.saved) { b.viewId = x.v.id; DB.put('blocks', b); } } }) });
  },

  /* ---------------- the widget ---------------- */
  body(b, d, pane, ro) {
    const v = b.viewId && DB.get('views', b.viewId) ? DB.get('views', b.viewId) : b.view; if (!v) return h('div.empty', 'View missing');
    let rows; try { rows = LV.compute(v, d.id); } catch (e) { return h('div.callout.warn', 'This view has an error: ' + e.message); }
    const q = (pane._lvq || {})[b.id] || '';
    const shown = q ? rows.filter(r => Object.keys(r).some(k => !k.startsWith('_') && String(r[k] ?? '').toLowerCase().includes(q.toLowerCase()))) : rows;
    const setLayout = l => { v.layout = l; if (b.viewId) DB.put('views', v); else { b.view = v; } DB.put('blocks', b); changed(); };
    const search = h('input.inp.lv-q', { type: 'search', placeholder: 'Filter…', value: q, on: { input: debounce(e => { pane._lvq = Object.assign({}, pane._lvq, { [b.id]: e.target.value }); const host = e.target.closest('.lv'); const nb = LV.body(b, d, pane, ro); host.replaceWith(nb); const ni = $('.lv-q', nb); ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }, 200), keydown: e => e.stopPropagation() } });
    const head = h('div.lv-h.nopan', h('span.lv-n', plural(shown.length, 'row') + (shown.length !== rows.length ? ' of ' + rows.length : '')),
      h('div.seg.sm', ['table', 'board', 'calendar', 'timeline'].map(l => h('button' + (v.layout === l ? '.on' : ''), { on: { click: () => setLayout(l) } }, l[0].toUpperCase() + l.slice(1)))),
      h('span.spacer'), search, ro ? null : h('button.wbtn', { on: { click: () => LV.editor(b) } }, 'Edit view…'));
    const R = { table: LV.table, board: LV.board, calendar: LV.calendar, timeline: LV.timeline }[v.layout] || LV.table;
    let body; try { body = R(shown, v, b, pane); } catch (e) { body = h('div.callout.warn', e.message); }
    return h('div.lv', head, h('div.lv-b.nopan', body));
  },
  cols(v, rows) { const c = (v.columns && v.columns.length ? v.columns : [LV.titleKey(v)]).slice(); (v.formulas || []).forEach(f => { if (f.name && !c.includes(f.name)) c.push(f.name); }); return c; },
  titleKey: v => (LV.SOURCES[LV.srcs(v)[0]] || {}).title || 'text',
  table(rows, v, b, pane) {
    const cols = LV.cols(v, rows), sortBy = k => { v.sort = { field: k, dir: v.sort && v.sort.field === k && v.sort.dir === 'asc' ? 'desc' : 'asc' }; if (b.viewId) DB.put('views', v); else b.view = v; DB.put('blocks', b); changed(); };
    const isF = k => (v.formulas || []).some(f => f.name === k);
    const grp = v.layout === 'table' && v.group ? v.group : null, groups = grp ? [...new Set(rows.map(r => r[grp] ?? ''))] : [null];
    return h('table.t.lv-t', h('thead', h('tr', cols.map(k => h('th' + (isF(k) ? '.fx' : ''), { title: isF(k) ? '= ' + v.formulas.find(f => f.name === k).expr : 'Sort', on: { click: () => sortBy(k) } }, k, v.sort && v.sort.field === k ? (v.sort.dir === 'desc' ? ' ↓' : ' ↑') : '')))),
      h('tbody', groups.flatMap(g => [g != null ? h('tr.lv-g', h('td', { colSpan: cols.length }, String(g || '—'))) : null, ...rows.filter(r => g == null || (r[grp] ?? '') === g).slice(0, 500).map(r => h('tr', { on: { click: e => r._open && r._open(e) } },
        cols.map(k => { const x = r[k]; return h('td' + (typeof x === 'number' ? '.num' : '') + (isF(k) ? '.fx' : ''), { title: r._err && r._err[k] ? r._err[k] : '' }, k === 'kind' && KIND[x] ? kchip(x) : LV.fmt(x, k)); })))])));
  },
  /** Board: one column per value of the group field. Dragging a structure between status columns opens or closes it; a component field takes the column's value. */
  board(rows, v, b, pane) {
    const g = v.group || (LV.SOURCES[LV.srcs(v)[0]] || {}).group || 'kind', order = { status: ['open', 'resolved', 'closed', ''], kind: KINDS.map(k => k.id) }[g];
    let vals = [...new Set(rows.map(r => r[g] ?? ''))]; if (order) vals.sort((a, c) => (order.indexOf(a) + 1 || 99) - (order.indexOf(c) + 1 || 99));
    if (g === 'status' && LV.srcs(v)[0] === 'items') ['open', 'closed'].forEach(x => { if (!vals.includes(x)) vals.push(x); });
    const tk = LV.titleKey(v), extra = LV.cols(v, rows).filter(k => k !== tk && k !== g).slice(0, 3);
    const writable = r => (r._src === 'items' && g === 'status') || (r._src === 'components' && g.startsWith('f.'));
    const drop = (r, val) => { if (r._src === 'items' && g === 'status') { const it = M.item(r._id); if (!it) return; if (val === 'closed') M.closeItem(it); else if (val === 'open') M.reopenItem(it); else toast('Resolve a barrier by linking a resolution'); }
      else if (r._src === 'components') { const blk = M.block(r._id), key = g.slice(2), fs = (blk.fields || []).filter(f => f.key !== key); fs.push({ key, value: val }); M.setFields(blk, fs); } };
    return h('div.lv-board', vals.map(val => { const col = rows.filter(r => (r[g] ?? '') === val);
      const el = h('div.lv-col', { on: { dragover: e => { e.preventDefault(); el.classList.add('over'); }, dragleave: () => el.classList.remove('over'), drop: e => { e.preventDefault(); el.classList.remove('over'); const r = rows.find(x => x._id === e.dataTransfer.getData('text/lv')); if (r && (r[g] ?? '') !== val) { if (writable(r)) drop(r, val); else toast('This field is derived — it cannot be changed by dragging'); } } } },
        h('div.lv-ch', g === 'kind' && KIND[val] ? kchip(val) : h('b', String(val || '—')), h('span.tiny.muted', col.length)),
        col.slice(0, 80).map(r => h('div.lv-card', { draggable: true, style: r.kind && KIND[r.kind] ? { '--kc': `var(--k-${r.kind})` } : {}, on: { dragstart: e => { LV._dragAt = Date.now(); e.dataTransfer.setData('text/lv', r._id); }, dragend: () => { LV._dragAt = Date.now(); }, click: e => { if (Date.now() - (LV._dragAt || 0) < 400) return; r._open && r._open(e); } } },
          h('div.serif', snippet(String(r[tk] ?? ''), 140)), extra.length ? h('div.lv-meta', extra.map(k => r[k] != null && r[k] !== '' ? h('span', h('i', k), ' ', LV.fmt(r[k], k)) : null)) : null)),
        col.length > 80 ? h('div.tiny.muted', `+ ${col.length - 80} more`) : null);
      return el; }));
  },
  calendar(rows, v, b, pane) {
    const df = v.dateField || (LV.SOURCES[LV.srcs(v)[0]] || {}).date || 'created', st = (pane._lvcal = pane._lvcal || {}), cur = st[b.id] || localDate(new Date()).slice(0, 7);
    const [Y, Mo] = cur.split('-').map(Number), first = new Date(Y, Mo - 1, 1), start = addDays(first, -((first.getDay() + 6) % 7)), tk = LV.titleKey(v);
    const by = {}; rows.forEach(r => { const x = FX.date(r[df] || r.start || r.created); if (!x) return; const k = localDate(x); (by[k] = by[k] || []).push(r); });
    const nav = n => { const d2 = new Date(Y, Mo - 1 + n, 1); st[b.id] = localDate(d2).slice(0, 7); const host = $(`.box[data-id="${b.id}"] .lv`); host && host.replaceWith(LV.body(b, M.doc(b.docId), pane, false)); };
    const grid = h('div.lv-cal'); ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(x => grid.append(h('div.lv-dow', x)));
    for (let i = 0; i < 42; i++) { const dd = addDays(start, i), k = localDate(dd), list = by[k] || [];
      grid.append(h('div.lv-day' + (dd.getMonth() !== Mo - 1 ? '.out' : '') + (k === localDate(new Date()) ? '.today' : ''), h('span.lv-dn', dd.getDate()),
        list.slice(0, 4).map(r => h('div.lv-ev', { style: r.kind && KIND[r.kind] ? { '--kc': `var(--k-${r.kind})` } : {}, title: String(r[tk] ?? ''), on: { click: e => r._open && r._open(e) } }, snippet(String(r[tk] ?? r.note ?? ''), 28))),
        list.length > 4 ? h('div.tiny.muted', '+' + (list.length - 4)) : null)); }
    return h('div', h('div.row.lv-calh', h('button.wbtn', { on: { click: () => nav(-1) } }, '◀'), h('b', first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })), h('button.wbtn', { on: { click: () => nav(1) } }, '▶'), h('span.tiny.muted', 'by ' + df)), grid);
  },
  /** Timeline: rows per group, a bar from start to end (sessions) or a mark on a date (milestones, structures). This week's plan as a chart. */
  timeline(rows, v, b, pane) {
    const ws = IX.weekStartFor(new Date()), st = (pane._lvtl = pane._lvtl || {}), off = st[b.id] || 0, from = addDays(ws, off * 7), to = addDays(from, 7), span = +to - +from;
    const g = v.group || 'theme', items = rows.map(r => { const s = FX.date(r.start || r.metAt || r.due || r.acquired || r.at || r.created), e = FX.date(r.end) || s; return s ? { r, s, e } : null; }).filter(x => x && +x.e >= +from && +x.s < +to);
    const groups = [...new Set(items.map(x => x.r[g] || '—'))].sort();
    const pct = t => Math.max(0, Math.min(100, (+t - +from) / span * 100));
    const nav = n => { st[b.id] = off + n; const host = $(`.box[data-id="${b.id}"] .lv`); host && host.replaceWith(LV.body(b, M.doc(b.docId), pane, false)); };
    const days = [...Array(7)].map((_, i) => addDays(from, i));
    const tot = {}; items.filter(x => x.r._src === 'sessions').forEach(x => { const k = x.r[g] || '—'; tot[k] = (tot[k] || 0) + (x.r.minutes || 0); });
    return h('div.lv-tl', h('div.row.lv-calh', h('button.wbtn', { on: { click: () => nav(-1) } }, '◀'), h('b', fmtDay(from) + ' – ' + fmtDay(addDays(to, -1))), h('button.wbtn', { on: { click: () => nav(1) } }, '▶'), off ? h('button.wbtn', { on: { click: () => nav(-off) } }, 'This week') : null),
      h('div.lv-tlg', h('div.lv-tlax', h('span'), h('div.lv-tlt', days.map(d2 => h('span', { style: { left: pct(d2) + '%' } }, d2.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + d2.getDate())))),
        groups.length ? groups.map(gr => h('div.lv-tlr', h('span.lv-tll', h('b', gr), tot[gr] ? h('span.tiny.muted', ' ' + fmtDur(tot[gr] * 6e4)) : null),
          h('div.lv-tlt', days.map(d2 => h('i.lv-grid', { style: { left: pct(d2) + '%' } })), items.filter(x => (x.r[g] || '—') === gr).map(x => {
            const point = +x.e - +x.s < 30 * 6e4 || x.r._src === 'milestones';
            return point ? h('span.lv-pt' + (x.r.met ? '.met' : ''), { title: (x.r.label || x.r.text || x.r.note || '') + (x.r.met ? ' · met' : ''), style: { left: pct(x.s) + '%' }, on: { click: e => x.r._open && x.r._open(e) } }, x.r._src === 'milestones' ? '◆' : '●')
              : h('span.lv-bar', { title: `${x.r.note || ''} · ${fmtTime(x.s)}–${fmtTime(x.e)} · ${x.r.minutes} min`, style: { left: pct(x.s) + '%', width: Math.max(0.6, pct(x.e) - pct(x.s)) + '%' }, on: { click: e => x.r._open && x.r._open(e) } }); }))))
          : h('div.empty', 'Nothing in this week.')));
  },

  /* ---------------- the view editor ---------------- */
  editor(b) {
    const src0 = b.viewId && DB.get('views', b.viewId) ? DB.get('views', b.viewId) : b.view, v = JSON.parse(JSON.stringify(src0)); v.where = v.where || { op: 'and', terms: [] }; v.formulas = v.formulas || []; v.columns = v.columns || [];
    const host = h('div.lv-ed'); const CMPS = ['=', '!=', 'contains', '!contains', '>', '>=', '<', '<=', 'empty', '!empty', 'within', 'older', 'this week'];
    const draw = () => {
      const fields = LV.fieldsOf(LV.srcs(v)), allCols = [...fields, ...v.formulas.map(f => f.name).filter(Boolean)];
      const sample = (() => { try { return LV.compute(Object.assign({}, v, { formulas: [] }), b.docId)[0]; } catch { return null; } })();
      const cond = (t, i, parent) => t.terms ? h('div.lv-sub', h('div.row', h('select.inp', { on: { change: e => { t.op = e.target.value; } } }, ['and', 'or'].map(o => h('option', { value: o, selected: t.op === o }, o === 'and' ? 'all of' : 'any of'))), h('button.wbtn', { on: { click: () => { parent.terms.splice(i, 1); draw(); } } }, '×')), t.terms.map((x, j) => cond(x, j, t)), h('button.wbtn', { on: { click: () => { t.terms.push({ field: fields[0], cmp: '=', value: '' }); draw(); } } }, '+ condition'))
        : t.expr != null ? h('div.row.lv-c', h('span.tiny.muted', 'formula is true:'), h('input.inp.mono', { value: t.expr, on: { input: e => { t.expr = e.target.value; } } }), h('button.wbtn', { on: { click: () => { parent.terms.splice(i, 1); draw(); } } }, '×'))
          : h('div.row.lv-c', h('select.inp', { on: { change: e => { t.field = e.target.value; } } }, fields.map(f => h('option', { value: f, selected: f === t.field }, f))), h('select.inp', { on: { change: e => { t.cmp = e.target.value; draw(); } } }, CMPS.map(c => h('option', { value: c, selected: c === t.cmp }, c))),
            ['empty', '!empty', 'this week'].includes(t.cmp) ? null : h('input.inp', { value: t.value ?? '', placeholder: t.cmp === 'within' || t.cmp === 'older' ? 'days' : 'value or $here.theme', list: 'lv-ctx', on: { input: e => { t.value = e.target.value; } } }), h('button.wbtn', { on: { click: () => { parent.terms.splice(i, 1); draw(); } } }, '×'));
      host.replaceChildren(
        h('div.grid2', h('label.f', h('span', 'Name'), h('input.inp', { value: v.name || '', on: { input: e => { v.name = e.target.value; } } })),
          h('label.f', h('span', 'Looks over'), h('div.lv-srcs', Object.entries(LV.SOURCES).map(([k, s]) => h('label.tiny', h('input', { type: 'checkbox', checked: LV.srcs(v).includes(k), on: { change: e => { const cur = LV.srcs(v).filter(x => x !== k); if (e.target.checked) cur.push(k); v.source = cur.length === 1 ? cur[0] : cur.length ? cur : 'items'; draw(); } } }), ' ', s.label)))) ),
        h('datalist#lv-ctx', ['$here.theme', '$here.project', '$here.note', '$today', 'open', 'closed', 'barrier', 'question', 'claim'].map(x => h('option', { value: x }))),
        h('div.lab', 'Where'), cond(v.where, 0, { terms: [] }), h('div.row', h('button.wbtn', { on: { click: () => { v.where.terms.push({ op: 'or', terms: [] }); draw(); } } }, '+ group'), h('button.wbtn', { on: { click: () => { v.where.terms.push({ expr: '' }); draw(); } } }, '+ formula condition')),
        h('div.lab', 'Formulas ', h('span.tiny.muted', '— e.g. round(minutes / 60, 1) · days(created) · if(status == "open", "⚠", "") · contains(text, "EGF")')),
        h('div', v.formulas.map((f, i) => { const out = h('span.tiny.mono.lv-fxo'); const test = () => { try { const c = FX.compile(f.expr || ''); if (c.err) throw new Error(c.err); out.textContent = sample ? '→ ' + LV.fmt(FX.run(c.ast, sample)) : 'ok'; out.className = 'tiny mono lv-fxo ok'; } catch (e) { out.textContent = e.message; out.className = 'tiny mono lv-fxo bad'; } }; test();
          return h('div.row.lv-c', h('input.inp', { value: f.name, placeholder: 'column name', style: { width: '140px' }, on: { input: e => { f.name = e.target.value.trim(); } } }), h('span', '='), h('input.inp.mono', { value: f.expr, placeholder: 'expression', on: { input: e => { f.expr = e.target.value; test(); }, keydown: e => e.stopPropagation() } }), out, h('button.wbtn', { on: { click: () => { v.formulas.splice(i, 1); draw(); } } }, '×')); }),
          h('button.wbtn', { on: { click: () => { v.formulas.push({ name: 'formula ' + (v.formulas.length + 1), expr: '' }); draw(); } } }, '+ formula')),
        h('div.lab', 'Columns ', h('span.tiny.muted', 'in this order')),
        h('div.lv-colpick', allCols.map(k => h('label.tiny', h('input', { type: 'checkbox', checked: v.columns.includes(k), on: { change: e => { v.columns = e.target.checked ? [...v.columns, k] : v.columns.filter(x => x !== k); } } }), ' ', k))),
        h('div.grid2', h('label.f', h('span', 'Layout'), h('select.inp', { on: { change: e => { v.layout = e.target.value; } } }, ['table', 'board', 'calendar', 'timeline'].map(l => h('option', { value: l, selected: v.layout === l }, l)))),
          h('label.f', h('span', 'Group by (board, timeline, table)'), h('select.inp', { on: { change: e => { v.group = e.target.value || null; } } }, h('option', { value: '' }, '—'), allCols.map(k => h('option', { value: k, selected: v.group === k }, k)))),
          h('label.f', h('span', 'Sort'), h('div.row', h('select.inp', { on: { change: e => { v.sort = Object.assign({}, v.sort, { field: e.target.value || null }); } } }, h('option', { value: '' }, '—'), allCols.map(k => h('option', { value: k, selected: v.sort && v.sort.field === k }, k))), h('select.inp', { on: { change: e => { v.sort = Object.assign({}, v.sort, { dir: e.target.value }); } } }, h('option', { value: 'asc', selected: !v.sort || v.sort.dir !== 'desc' }, '↑'), h('option', { value: 'desc', selected: v.sort && v.sort.dir === 'desc' }, '↓')))),
          h('label.f', h('span', 'Date (calendar)'), h('select.inp', { on: { change: e => { v.dateField = e.target.value || null; } } }, h('option', { value: '' }, 'default'), allCols.map(k => h('option', { value: k, selected: v.dateField === k }, k))))));
    };
    draw();
    modal({ title: 'Live view', wide: true, body: host, actions: [
      { label: 'Cancel' },
      { label: b.viewId ? 'Save (updates the saved view everywhere)' : 'Save as a reusable view', run: () => { v.id = b.viewId || uid('v'); DB.put('views', v); b.viewId = v.id; b.view = v; b.label = v.name; b.body = { text: v.name, marks: [] }; DB.put('blocks', b); changed(); } },
      { label: 'Apply here', pri: true, run: () => { if (b.viewId) { b.viewId = null; } b.view = v; b.label = v.name; b.body = { text: v.name, marks: [] }; DB.put('blocks', b); changed(); } }] });
  },
};
WIDGETS.view = { label: 'live view', w: 728, body: LV.body, menu: b => [{ label: 'Edit view…', run: () => LV.editor(b) }, { label: 'Export rows as CSV', run: () => { const v = b.viewId && DB.get('views', b.viewId) || b.view, rows = LV.compute(v, b.docId), cols = LV.cols(v, rows); Exporter.download(Exporter.slug(v.name || 'view') + '.csv', [cols.join(','), ...rows.map(r => cols.map(k => '"' + String(LV.fmt(r[k], k)).replace(/"/g, '""') + '"').join(','))].join('\n'), 'text/csv'); } }] };
INSERTS.push({ id: 'view', group: 'Live views', icon: '▦', label: 'Live view…', sub: 'Table, board, calendar or timeline over your records — stays live; formulas allowed', run: (d, p) => LV.chooser(d, p) });
