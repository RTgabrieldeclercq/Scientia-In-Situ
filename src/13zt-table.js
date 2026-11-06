/* ==========================================================================
   13zt · Tables (Excel, CSV) and plots.
   + Insert → Table (Excel / CSV)… copies the file's sheets into the note (so
   they sync and work everywhere) and keeps the original file beside it.
   The table: pick the sheet, search rows, sort by a column (the view only —
   the cells don't move), click a cell to edit it, Enter / Tab to move,
   paste a block from Excel into a cell, + Row / + Column, header row on or
   off. A cell starting with = is a formula: + − × ÷ ^, cell references
   (A2, $B$3), ranges (B2:B20), comparisons, and SUM, MEAN (AVERAGE),
   MEDIAN, SD (STDEV), SEM, VAR, MIN, MAX, COUNT, ABS, SQRT, LN, LOG,
   LOG10, EXP, ROUND, POWER, PI, IF.
   Plot… makes a plot component beside it, wired to the table ("plotted
   in"): scatter or line (X against one or more Y columns, error bars from
   a column, log axes), bar (mean ± SD or SEM per group, with the points),
   histogram. The plot follows the table as you edit it.
   ========================================================================== */
const TABLE = {
  MAXCELLS: 60000, SHOW: 800,
  view: new Map(),   // per table on this screen: { q, sort: {c, dir}, all }
  V(id) { let v = TABLE.view.get(id); if (!v) { v = { q: '', sort: null, all: false }; TABLE.view.set(id, v); } return v; },
  col: c => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; },
  colIdx: s => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; },
  sheet: b => { const T = b.table || {}; return (T.sheets || [])[T.cur || 0] || { name: 'Sheet1', cells: [[]] }; },
  dims: sh => ({ rows: sh.cells.length, cols: Math.max(1, ...sh.cells.map(r => r.length)) }),
  num(v) { if (typeof v === 'number') return v; if (v == null) return NaN; const s = String(v).trim().replace(/,(?=\d{3}\b)/g, ''); if (!s || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?%?$/.test(s)) return NaN; return s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s); },

  /* ---------- formulas ---------- */
  /** every cell's value (formulas evaluated), memoised per call */
  values(sh) {
    const memo = new Map(), busy = new Set(), cells = sh.cells;
    const raw = (r, c) => (cells[r] || [])[c];
    const val = (r, c) => { const k = r * 100000 + c; if (memo.has(k)) return memo.get(k); const x = raw(r, c); let v;
      if (typeof x === 'string' && x.startsWith('=')) { if (busy.has(k)) return '#CYCLE'; busy.add(k); try { v = TABLE.evalF(x.slice(1), val, sh); } catch (e) { v = String(e.message || '#ERR').startsWith('#') ? e.message : '#ERR'; } busy.delete(k); }
      else v = x == null ? '' : x; memo.set(k, v); return v; };
    return val;
  },
  FN: {
    SUM: a => a.reduce((s, x) => s + x, 0), MEAN: a => a.length ? TABLE.FN.SUM(a) / a.length : NaN,
    MEDIAN: a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
    VAR: a => { if (a.length < 2) return NaN; const m = TABLE.FN.MEAN(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); },
    SD: a => Math.sqrt(TABLE.FN.VAR(a)), SEM: a => TABLE.FN.SD(a) / Math.sqrt(a.length), MIN: a => a.length ? Math.min(...a) : NaN, MAX: a => a.length ? Math.max(...a) : NaN, COUNT: a => a.length,
  },
  evalF(src, val, sh) {
    let i = 0; const s = src; const sp = () => { while (s[i] === ' ') i++; };
    const ref = m => { const c = TABLE.colIdx(m[1].replace(/\$/g, '')), r = +m[2].replace(/\$/g, '') - 1; return [r, c]; };
    const rangeVals = (a, b) => { const out = []; for (let r = Math.min(a[0], b[0]); r <= Math.max(a[0], b[0]); r++) for (let c = Math.min(a[1], b[1]); c <= Math.max(a[1], b[1]); c++) out.push(val(r, c)); return out; };
    const nums = args => args.flat().map(TABLE.num).filter(x => !isNaN(x));
    const N = v => { if (Array.isArray(v)) throw new Error('#VALUE'); if (typeof v === 'string' && v.startsWith('#')) throw new Error(v); const n = TABLE.num(v); if (v === '' || v == null) return 0; if (isNaN(n)) throw new Error('#VALUE'); return n; };
    const prim = () => { sp(); const c = s[i];
      if (c === '(') { i++; const v = cmp(); sp(); if (s[i] !== ')') throw new Error('#ERR'); i++; return v; }
      if (c === '-') { i++; return -N(pow()); } if (c === '+') { i++; return N(pow()); }
      if (c === '"') { const j = s.indexOf('"', i + 1); if (j < 0) throw new Error('#ERR'); const t = s.slice(i + 1, j); i = j + 1; return t; }
      let m = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(s.slice(i)); if (m) { i += m[0].length; return parseFloat(m[0]); }
      m = /^(\$?[A-Za-z]{1,3}\$?\d+)(?::(\$?[A-Za-z]{1,3}\$?\d+))?/.exec(s.slice(i));
      const fm = /^([A-Za-z][A-Za-z0-9.]*)\s*\(/.exec(s.slice(i));
      if (fm && !(m && !/^[A-Za-z]/.test(s.slice(i + m[0].length).trim().charAt(0)) && s.slice(i + m[0].length).trimStart()[0] !== '(')) {
        const name = fm[1].toUpperCase(); i += fm[0].length; const args = []; sp();
        if (s[i] !== ')') { for (;;) { args.push(cmp()); sp(); if (s[i] === ',' || s[i] === ';') { i++; continue; } break; } }
        sp(); if (s[i] !== ')') throw new Error('#ERR'); i++; return TABLE.call(name, args, nums, N); }
      if (m) { i += m[0].length; const a = ref(/^(\$?[A-Za-z]{1,3})(\$?\d+)$/.exec(m[1])); if (m[2]) return rangeVals(a, ref(/^(\$?[A-Za-z]{1,3})(\$?\d+)$/.exec(m[2]))); const v = val(a[0], a[1]); if (typeof v === 'string' && v.startsWith('#')) throw new Error(v); return v; }
      if (/^PI\b/i.test(s.slice(i))) { i += 2; return Math.PI; } if (/^TRUE\b/i.test(s.slice(i))) { i += 4; return 1; } if (/^FALSE\b/i.test(s.slice(i))) { i += 5; return 0; }
      throw new Error('#NAME'); };
    const pow = () => { let a = prim(); sp(); while (s[i] === '^') { i++; a = Math.pow(N(a), N(prim())); sp(); } return a; };
    const mul = () => { let a = pow(); sp(); while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const b = pow(); a = o === '*' ? N(a) * N(b) : N(a) / N(b); sp(); } return a; };
    const add = () => { let a = mul(); sp(); while (s[i] === '+' || s[i] === '-' || s[i] === '&') { const o = s[i++]; const b = mul(); a = o === '&' ? String(a) + String(b) : o === '+' ? N(a) + N(b) : N(a) - N(b); sp(); } return a; };
    const cmp = () => { let a = add(); sp(); const m = /^(<=|>=|<>|=|<|>)/.exec(s.slice(i)); if (!m) return a; i += m[0].length; const b = add(); const x = TABLE.num(a), y = TABLE.num(b), num = !isNaN(x) && !isNaN(y), A = num ? x : String(a), B = num ? y : String(b);
      return ({ '<': A < B, '>': A > B, '<=': A <= B, '>=': A >= B, '=': A === B, '<>': A !== B })[m[0]] ? 1 : 0; };
    const v = cmp(); sp(); if (i < s.length) throw new Error('#ERR'); if (Array.isArray(v)) throw new Error('#VALUE'); return typeof v === 'number' && !isFinite(v) ? '#DIV/0' : v;
  },
  call(name, args, nums, N) {
    const F = TABLE.FN, a = () => nums(args), one = () => N(args[0]);
    switch (name) {
      case 'SUM': return F.SUM(a()); case 'MEAN': case 'AVERAGE': return F.MEAN(a()); case 'MEDIAN': return F.MEDIAN(a());
      case 'SD': case 'STDEV': case 'STDEV.S': return F.SD(a()); case 'SEM': return F.SEM(a()); case 'VAR': case 'VAR.S': return F.VAR(a());
      case 'MIN': return F.MIN(a()); case 'MAX': return F.MAX(a()); case 'COUNT': return F.COUNT(a());
      case 'ABS': return Math.abs(one()); case 'SQRT': return Math.sqrt(one()); case 'LN': return Math.log(one()); case 'LOG10': return Math.log10(one());
      case 'LOG': return args.length > 1 ? Math.log(one()) / Math.log(N(args[1])) : Math.log10(one()); case 'EXP': return Math.exp(one());
      case 'ROUND': { const k = Math.pow(10, args.length > 1 ? N(args[1]) : 0); return Math.round(one() * k) / k; }
      case 'POWER': return Math.pow(one(), N(args[1])); case 'PI': return Math.PI;
      case 'IF': return N(args[0]) ? (args.length > 1 ? args[1] : 1) : (args.length > 2 ? args[2] : 0);
    }
    throw new Error('#NAME');
  },
  SUPPORTED: /^(SUM|MEAN|AVERAGE|MEDIAN|SD|STDEV|STDEV\.S|SEM|VAR|VAR\.S|MIN|MAX|COUNT|ABS|SQRT|LN|LOG|LOG10|EXP|ROUND|POWER|PI|IF)$/,
  fmt(v) { if (typeof v === 'number') { if (!isFinite(v)) return '#DIV/0'; const a = Math.abs(v); return a !== 0 && (a < 1e-4 || a >= 1e9) ? v.toExponential(3) : String(Math.round(v * 1e6) / 1e6); } return v == null ? '' : String(v); },

  /* ---------- files in ---------- */
  async read(file) {
    if (!window.XLSX) throw new Error('Excel support is missing');
    const name = (file.name || '').toLowerCase(), isText = /\.(csv|tsv|txt)$/.test(name) || /text\//.test(file.type || '');
    const wb = isText ? XLSX.read(await file.text(), { type: 'string', raw: false, FS: name.endsWith('.tsv') ? '\t' : undefined }) : XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: true, cellDates: false });
    let cut = false;
    const sheets = wb.SheetNames.map(n => { const ws = wb.Sheets[n]; if (!ws['!ref']) return { name: n, cells: [['']] }; const R = XLSX.utils.decode_range(ws['!ref']); const rows = [];
      for (let r = R.s.r; r <= R.e.r; r++) { const row = []; for (let c = R.s.c; c <= R.e.c; c++) { const cell = ws[XLSX.utils.encode_cell({ r, c })]; let v = '';
          if (cell) { if (cell.f && TABLE.formulaOk(cell.f)) v = '=' + cell.f; else if (cell.t === 'n') v = String(cell.v); else v = cell.w != null ? String(cell.w) : String(cell.v ?? ''); }
          row.push(v); }
        while (row.length && row[row.length - 1] === '') row.pop(); rows.push(row);
        if ((r - R.s.r + 1) * (R.e.c - R.s.c + 1) > TABLE.MAXCELLS) { cut = true; break; } }
      while (rows.length > 1 && !rows[rows.length - 1].length) rows.pop();
      return { name: n, cells: rows.length ? rows : [['']] }; });
    return { sheets, cut };
  },
  formulaOk: f => !/[!\[]/.test(f) && [...String(f).matchAll(/([A-Za-z][A-Za-z0-9.]*)\s*\(/g)].every(m => TABLE.SUPPORTED.test(m[1].toUpperCase())),
  async insert(d, p) {
    PLATE.pickFiles(async files => {
      const f = files[0]; if (!f) return; toast('Reading ' + f.name + '…');
      let T; try { T = await TABLE.read(f); } catch (e) { return toast('Couldn’t read that file: ' + (e.message || e), 5000); }
      let rec = null; try { rec = await MEDIA.add(f); } catch { }
      DB.beginGroup('table');
      const b = M.addBlock(d.id, null, { kind: 'table', label: f.name.replace(/\.(xlsx|xlsm|xls|csv|tsv|txt|ods)$/i, ''), media: rec ? rec.id : null, x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 644, h: 360,
        table: { sheets: T.sheets, cur: 0, header: true } });
      TABLE.sum(b); DB.put('blocks', b); changed();
      toast(plural(T.sheets.length, 'sheet') + ' copied into the note' + (T.cut ? ' — only the first ' + TABLE.MAXCELLS.toLocaleString() + ' cells of a big sheet' : ''), 4000);
    }, false, '.xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt,text/csv');
  },
  empty(d, p) { DB.beginGroup('table'); const cells = [['Sample', 'Value'], ['', ''], ['', ''], ['', '']];
    const b = M.addBlock(d.id, null, { kind: 'table', label: 'Table', x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 476, h: 260, table: { sheets: [{ name: 'Sheet1', cells }], cur: 0, header: true } }); TABLE.sum(b); DB.put('blocks', b); changed(); },
  /** searchable text for the table (its headers and first rows) */
  sum(b) { const sh = TABLE.sheet(b); b.body = { text: (b.label || 'Table') + ' · ' + sh.cells.slice(0, 6).map(r => r.filter(Boolean).join(' ')).join(' · ').slice(0, 400), marks: [] }; },

  /* ---------- changes ---------- */
  setCell(id, r, c, v, quiet) { const b = M.block(id); if (!b) return; const sh = TABLE.sheet(b);
    while (sh.cells.length <= r) sh.cells.push([]); const row = sh.cells[r]; while (row.length < c) row.push(''); row[c] = v;
    if (!quiet) { DB.beginGroup('table'); TABLE.commit(b); } },
  commit(b) { if (b.table.sheets[b.table.cur || 0] && (b.table.cur || 0) === 0) TABLE.sum(b); b.modified = isoLocal(new Date()); DB.put('blocks', b); TABLE.repaint(b.id); TABLE.repaintPlots(b.id); },
  addRow(id, at) { const b = M.block(id); const sh = TABLE.sheet(b), n = TABLE.dims(sh).cols; DB.beginGroup('table'); sh.cells.splice(at == null ? sh.cells.length : at, 0, Array(n).fill('')); TABLE.commit(b); },
  addCol(id, at) { const b = M.block(id); const sh = TABLE.sheet(b), n = TABLE.dims(sh).cols; DB.beginGroup('table'); sh.cells.forEach(r => { while (r.length < n) r.push(''); r.splice(at == null ? n : at, 0, ''); }); TABLE.commit(b); },
  delRow(id, r) { const b = M.block(id); const sh = TABLE.sheet(b); if (sh.cells.length <= 1) return; DB.beginGroup('table'); sh.cells.splice(r, 1); TABLE.commit(b); toast('Row deleted · Ctrl+Z undoes'); },
  delCol(id, c) { const b = M.block(id); const sh = TABLE.sheet(b); if (TABLE.dims(sh).cols <= 1) return; DB.beginGroup('table'); sh.cells.forEach(r => r.splice(c, 1)); TABLE.commit(b); toast('Column deleted · Ctrl+Z undoes'); },
  paste(id, r0, c0, text) { const rows = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t')); if (rows.length === 1 && rows[0].length === 1) return false;
    const b = M.block(id); DB.beginGroup('table'); rows.forEach((row, i) => row.forEach((v, j) => TABLE.setCell(id, r0 + i, c0 + j, v, true))); TABLE.commit(b); toast(`Pasted ${rows.length} × ${Math.max(...rows.map(r => r.length))}`); return true; },
  csv(b) { const sh = TABLE.sheet(b), val = TABLE.values(sh), { rows, cols } = TABLE.dims(sh), q = v => { const s = TABLE.fmt(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    let out = ''; for (let r = 0; r < rows; r++) { const row = []; for (let c = 0; c < cols; c++) row.push(q(val(r, c))); out += row.join(',') + '\n'; } return out; },
  repaint(id) { $$(`.box[data-id="${id}"] > .tbw`).forEach(el => { const box = el.closest('.box'), pane = DV(box), b = M.block(id); if (!b) return; const keep = el.querySelector('.tb-scroll'), st = keep ? [keep.scrollTop, keep.scrollLeft] : null;
    const nw = TABLE.body(b, M.doc(b.docId), pane, !!(pane && pane.travel)); el.replaceWith(nw); const sc = nw.querySelector('.tb-scroll'); if (sc && st) { sc.scrollTop = st[0]; sc.scrollLeft = st[1]; } }); },
  repaintPlots(id) { DB.where('blocks', x => x.kind === 'plot' && x.plot && x.plot.src === id && x.status !== 'removed').forEach(p => PLOT.repaint(p.id)); },

  /* ---------- the table on the paper ---------- */
  body(b, d, pane, ro) {
    const T = b.table || (b.table = { sheets: [{ name: 'Sheet1', cells: [['']] }], cur: 0, header: true }), sh = TABLE.sheet(b), V = TABLE.V(b.id), val = TABLE.values(sh), { rows, cols } = TABLE.dims(sh), head = !!T.header;
    const wrap = h('div.tbw.nopan', { style: { '--tbh': (b.h || 360) + 'px' } });
    // which rows, in which order
    let order = []; for (let r = head ? 1 : 0; r < rows; r++) order.push(r);
    if (V.q) { const q = V.q.toLowerCase(); order = order.filter(r => { for (let c = 0; c < cols; c++) if (TABLE.fmt(val(r, c)).toLowerCase().includes(q)) return true; return false; }); }
    if (V.sort) { const { c, dir } = V.sort; order.sort((x, y) => { const a = val(x, c), bb = val(y, c); const ea = a === '' || a == null, eb = bb === '' || bb == null; if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1; const na = TABLE.num(a), nb = TABLE.num(bb); const k = !isNaN(na) && !isNaN(nb) ? na - nb : !isNaN(na) ? -1 : !isNaN(nb) ? 1 : TABLE.fmt(a).localeCompare(TABLE.fmt(bb), undefined, { numeric: true }); return dir * k; }); }
    const shown = V.all ? order : order.slice(0, TABLE.SHOW);
    const name = c => head ? TABLE.fmt(val(0, c)) : '';
    const thead = h('tr', h('th.tb-corner', { title: plural(order.length, 'row') + (V.q ? ' match' : '') }, order.length), ...Array.from({ length: cols }, (_, c) => h('th.tb-col' + (V.sort && V.sort.c === c ? '.s' + (V.sort.dir > 0 ? 'a' : 'd') : ''), { 'data-c': c, title: 'Sort by this column (click again: reverse, then off)',
      on: { click: () => { V.sort = !V.sort || V.sort.c !== c ? { c, dir: 1 } : V.sort.dir > 0 ? { c, dir: -1 } : null; TABLE.repaint(b.id); } } }, h('span.tb-cl', TABLE.col(c)))));
    const td = (r, c) => { const raw = (sh.cells[r] || [])[c], v = val(r, c), s = TABLE.fmt(v), isF = typeof raw === 'string' && raw.startsWith('='), isN = !isNaN(TABLE.num(v)), err = typeof v === 'string' && v.startsWith('#');
      return h('td' + (isN ? '.n' : '') + (isF ? '.f' : '') + (err ? '.err' : ''), { 'data-r': r, 'data-c': c, title: isF ? raw : '' }, s); };
    const body = h('tbody', ...(head ? [h('tr.tb-head', h('th.tb-rn', 1), ...Array.from({ length: cols }, (_, c) => td(0, c)))] : []), ...shown.map(r => h('tr', h('th.tb-rn', r + 1), ...Array.from({ length: cols }, (_, c) => td(r, c)))));
    const table = h('table.tb', h('thead', thead), body);
    const scroll = h('div.tb-scroll', table, order.length > shown.length ? h('div.tb-more', h('button.btn.xs', { on: { click: () => { V.all = true; TABLE.repaint(b.id); } } }, `Show all ${order.length.toLocaleString()} rows`)) : null);
    const q = h('input.inp.tb-q', { placeholder: 'Search rows…', value: V.q, on: { input: debounce(e => { V.q = e.target.value; TABLE.repaint(b.id); setTimeout(() => { const n = $(`.box[data-id="${b.id}"] .tb-q`); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 200) } });
    const tabs = T.sheets.length > 1 ? h('div.tb-tabs', T.sheets.map((s, k) => h('button' + (k === (T.cur || 0) ? '.on' : ''), { on: { click: () => { const cur = M.block(b.id); cur.table.cur = k; TABLE.V(b.id).sort = null; if (ro) { b.table.cur = k; return TABLE.repaint(b.id); } DB.put('blocks', cur); TABLE.repaint(b.id); } } }, s.name))) : null;
    const B = (lab, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(e); } } }, lab);
    const bar = h('div.tb-bar', tabs, q, h('span.spacer'), ro ? null : B('+ Row', 'Add a row at the end', () => TABLE.addRow(b.id)), ro ? null : B('+ Col', 'Add a column at the end', () => TABLE.addCol(b.id)),
      B('Plot…', 'A plot of this table beside it, wired to it', () => PLOT.create(M.block(b.id), pane)));
    const fx = h('div.tb-fx', h('span.tb-at', ''), h('span.tb-raw.mono', ''));
    wrap.append(bar, scroll, fx);
    // a cell: click to select and edit, Enter / Tab to move, Esc to leave it
    let sel = TABLE._sel && TABLE._sel.id === b.id ? TABLE._sel : null;
    const cellEl = (r, c) => table.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
    const show = () => { table.querySelectorAll('td.sel').forEach(x => x.classList.remove('sel')); if (!sel) { fx.style.visibility = 'hidden'; return; } const el = cellEl(sel.r, sel.c); el && el.classList.add('sel'); fx.style.visibility = ''; fx.firstChild.textContent = TABLE.col(sel.c) + (sel.r + 1); fx.lastChild.textContent = (sh.cells[sel.r] || [])[sel.c] ?? ''; };
    const visible = () => [...(head ? [0] : []), ...shown];
    const move = (dr, dc) => { if (!sel) return; const vr = visible(), i = vr.indexOf(sel.r), ni = clamp(i + dr, 0, vr.length - 1); sel = TABLE._sel = { id: b.id, r: vr[ni], c: clamp(sel.c + dc, 0, cols - 1 + (dc > 0 ? 1 : 0)) }; show(); const el = cellEl(sel.r, sel.c); el && el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); };
    const edit = (el, first) => { if (ro || !el || el.querySelector('input')) return; const r = +el.dataset.r, c = +el.dataset.c, raw = (sh.cells[r] || [])[c] ?? '';
      const inp = h('input.tb-in', { value: first != null ? first : raw }); el.replaceChildren(inp); inp.focus(); if (first == null) inp.select(); let done = false;
      const fin = (save, dr, dc) => { if (done) return; done = true; const v = inp.value; if (save && v !== raw) { TABLE._sel = { id: b.id, r, c }; TABLE.setCell(b.id, r, c, v); if (dr || dc) setTimeout(() => { const box = $(`.box[data-id="${b.id}"]`); box && box._tbMove && box._tbMove(dr, dc); }, 0); } else { el.textContent = TABLE.fmt(val(r, c)); if (dr || dc) move(dr, dc); } };
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); fin(true, e.shiftKey ? -1 : 1, 0); } else if (e.key === 'Tab') { e.preventDefault(); fin(true, 0, e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } });
      inp.addEventListener('blur', () => fin(true)); inp.addEventListener('pointerdown', e => e.stopPropagation()); };
    table.addEventListener('click', e => { const el = e.target.closest('td'); if (!el) return; e.stopPropagation(); const r = +el.dataset.r, c = +el.dataset.c; if (sel && sel.r === r && sel.c === c) return edit(el); sel = TABLE._sel = { id: b.id, r, c }; show(); scroll.focus({ preventScroll: true }); });
    table.addEventListener('dblclick', e => { const el = e.target.closest('td'); if (el) { e.stopPropagation(); edit(el); } });
    scroll.tabIndex = 0;
    scroll.addEventListener('keydown', e => { if (!sel || e.target.closest('input')) return; const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); move(k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0, k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0); }
      else if (k === 'Enter' || k === 'F2') { e.preventDefault(); e.stopPropagation(); edit(cellEl(sel.r, sel.c)); }
      else if ((k === 'Delete' || k === 'Backspace') && !ro) { e.preventDefault(); e.stopPropagation(); TABLE.setCell(b.id, sel.r, sel.c, ''); }
      else if (k === 'Tab') { e.preventDefault(); e.stopPropagation(); move(0, e.shiftKey ? -1 : 1); }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'c') { const v = (sh.cells[sel.r] || [])[sel.c] ?? ''; navigator.clipboard && navigator.clipboard.writeText(TABLE.fmt(val(sel.r, sel.c)) || String(v)).catch(() => { }); e.stopPropagation(); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !ro) { e.preventDefault(); e.stopPropagation(); edit(cellEl(sel.r, sel.c), k); } });
    scroll.addEventListener('paste', e => { if (ro || !sel || e.target.closest('input')) return; const t = e.clipboardData && e.clipboardData.getData('text/plain'); if (t && TABLE.paste(b.id, sel.r, sel.c, t)) { e.preventDefault(); e.stopPropagation(); } });
    setTimeout(() => { const box = wrap.closest('.box'); if (box) box._tbMove = move; show(); }, 0);
    // height: drag the bottom edge
    if (!ro) { const rz = h('div.tb-rz', { title: 'Drag to change the height' }); wrap.append(rz); rz.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const z = pane && pane.paper ? pane.paper.view.z : 1, y0 = e.clientY, h0 = b.h || 360;
      const mv = ev => { b.h = Math.max(120, Math.round(h0 + (ev.clientY - y0) / z)); wrap.style.setProperty('--tbh', b.h + 'px'); pane && pane.drawWires && pane.drawWires(); };   // V3.942 — no largest height
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const cur = M.block(b.id); cur.h = b.h; DB.put('blocks', cur); DB.beginGroup(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); }); }
    return wrap;
  },
  menu(b) { const s = TABLE._sel && TABLE._sel.id === b.id ? TABLE._sel : null, m = b.media && MEDIA.get(b.media);
    return [{ label: (b.table && b.table.header ? '✓ ' : '') + 'First row is the header', run: () => { const cur = M.block(b.id); DB.beginGroup('table'); cur.table.header = !cur.table.header; TABLE.commit(cur); } },
      { label: 'Plot…', sub: 'A plot beside it, wired to this table', run: () => PLOT.create(M.block(b.id), DocView) },
      s ? { label: `Insert a row above ${s.r + 1}`, run: () => TABLE.addRow(b.id, s.r) } : null, s ? { label: `Insert a column before ${TABLE.col(s.c)}`, run: () => TABLE.addCol(b.id, s.c) } : null,
      s ? { label: `Delete row ${s.r + 1}`, danger: true, run: () => TABLE.delRow(b.id, s.r) } : null, s ? { label: `Delete column ${TABLE.col(s.c)}`, danger: true, run: () => TABLE.delCol(b.id, s.c) } : null,
      { label: 'Download this sheet as CSV', run: () => Exporter.download(Exporter.slug(b.label || 'table') + '-' + Exporter.slug(TABLE.sheet(b).name) + '.csv', TABLE.csv(b), 'text/csv') },
      m ? { label: 'Download the original file', sub: m.name, run: () => { const a = h('a', { href: MEDIA.url(m), download: m.name }); document.body.append(a); a.click(); a.remove(); } } : null,
      { label: 'Replace with a newer file…', sub: 'The sheets are copied again; plots keep their columns', run: () => PLATE.pickFiles(async fs => { const f = fs[0]; if (!f) return; let T; try { T = await TABLE.read(f); } catch (e) { return toast('Couldn’t read that file: ' + (e.message || e)); }
        let rec = null; try { rec = await MEDIA.add(f); } catch { } const cur = M.block(b.id); DB.beginGroup('table'); cur.table = { sheets: T.sheets, cur: Math.min(cur.table.cur || 0, T.sheets.length - 1), header: cur.table.header }; if (rec) cur.media = rec.id; TABLE.commit(cur); toast('Table replaced'); }, false, '.xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt') }].filter(Boolean); },
};

/* ---------- plots ---------- */
const PLOT = {
  PAL: ['#2f6fdf', '#e0663a', '#2a9d6f', '#b04fc7', '#c9a227', '#5a7a8c', '#d0457a', '#3aa6b9'],
  /** the source table's columns: names and computed values (data rows only) */
  data(p) { const t = M.block(p.plot.src); if (!t || !t.table) return null; const sh = (t.table.sheets || [])[p.plot.sheet || 0] || TABLE.sheet(t), val = TABLE.values(sh), { rows, cols } = TABLE.dims(sh), head = !!t.table.header;
    const names = Array.from({ length: cols }, (_, c) => (head && TABLE.fmt(val(0, c))) || TABLE.col(c)), R = []; for (let r = head ? 1 : 0; r < rows; r++) R.push(r);
    return { t, names, cols, col: c => R.map(r => val(r, c)), num: c => R.map(r => TABLE.num(val(r, c))) }; },
  create(t, pane) {
    if (!t) return; const D = (() => { const tmp = { plot: { src: t.id, sheet: t.table.cur || 0 } }; return PLOT.data(tmp); })(); if (!D) return;
    const numeric = Array.from({ length: D.cols }, (_, c) => c).filter(c => D.num(c).filter(x => !isNaN(x)).length >= Math.max(1, D.num(c).length * .5));
    const x = numeric[0] ?? 0, y = numeric[1] ?? numeric[0] ?? Math.min(1, D.cols - 1);
    DB.beginGroup('plot');
    const p = M.addBlock(t.docId, null, { kind: 'plot', label: 'Plot of ' + (t.label || 'table'), x: (t.x || 0) + (t.w || 600) + 56, y: t.y || 0, w: 476, h: 320,
      plot: { src: t.id, sheet: t.table.cur || 0, type: 'scatter', x, ys: [y], errs: {}, group: numeric.length ? (Array.from({ length: D.cols }, (_, c) => c).find(c => !numeric.includes(c)) ?? 0) : 0, err: 'sd', logX: false, logY: false, bins: 0 } });
    p.body = { text: p.label, marks: [] }; DB.put('blocks', p);
    DB.put('wires', { id: uid('w'), from: t.id, to: p.id, rel: 'c:plotted in', created: isoLocal(new Date()) });
    changed(); setTimeout(() => { const el = $(`.box[data-id="${p.id}"] .pl-set`); el && PLOT.settings(M.block(p.id), el); }, 350);
  },
  insertMenu(d, pp) { const ts = M.docBlocks(d.id).filter(b => b.kind === 'table' && b.status !== 'removed'); if (!ts.length) return toast('Put a table in this note first (+ Insert → Table)');
    if (ts.length === 1) return PLOT.create(ts[0], DocView); pickModal('Plot which table?', '', ts.map(t => ({ label: t.label || 'Table', run: () => PLOT.create(t, DocView) }))); },
  repaint(id) { $$(`.box[data-id="${id}"] > .plw`).forEach(el => { const box = el.closest('.box'), pane = DV(box), b = M.block(id); if (b) el.replaceWith(PLOT.body(b, M.doc(b.docId), pane, !!(pane && pane.travel))); }); },
  save(p) { DB.beginGroup('plot'); p.modified = isoLocal(new Date()); DB.put('blocks', p); PLOT.repaint(p.id); },
  body(b, d, pane, ro) {
    const P = b.plot || {}, D = PLOT.data(b), w = Math.max(240, (b.w || 476) - 24), hh = Math.max(160, b.h || 320);
    const wrap = h('div.plw.nopan');
    if (!D) { wrap.append(h('div.embed-missing', 'Its table was removed.')); return wrap; }
    const svg = PLOT.draw(P, D, w, hh);
    const bar = h('div.pl-bar', h('span.tiny.muted', ({ scatter: 'Scatter', line: 'Line', bar: 'Bar · mean ± ' + (P.err === 'sem' ? 'SEM' : 'SD'), hist: 'Histogram' })[P.type] + ' · ' + (D.t.label || 'table')), h('span.spacer'),
      ro ? null : h('button.btn.xs.pl-set', { title: 'Columns, type, axes', on: { click: e => { e.stopPropagation(); PLOT.settings(M.block(b.id), e.currentTarget); } } }, '⚙ Plot'),
      h('button.btn.xs', { title: 'Download as SVG', on: { click: e => { e.stopPropagation(); Exporter.download(Exporter.slug(b.label || 'plot') + '.svg', '<?xml version="1.0"?>\n' + svg.outerHTML.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'), 'image/svg+xml'); } } }, '↓'));
    wrap.append(bar, svg);
    if (!ro) { const rz = h('div.tb-rz', { title: 'Drag to change the height' }); wrap.append(rz); rz.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const z = pane && pane.paper ? pane.paper.view.z : 1, y0 = e.clientY, h0 = b.h || 320;
      const mv = ev => { b.h = Math.max(160, Math.round(h0 + (ev.clientY - y0) / z)); }, up =() => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const cur = M.block(b.id); cur.h = b.h; PLOT.save(cur); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); }); }
    return wrap;
  },
  settings(p, anchor) {
    const D = PLOT.data(p); if (!D) return; const P = p.plot, r = anchor.getBoundingClientRect();
    const sel = (val, opts, on) => h('select.inp.sm', { on: { change: e => on(e.target.value) } }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) }, l)));
    const cols = D.names.map((n, c) => [c, TABLE.col(c) + ' · ' + snippet(n, 24)]);
    const up = fn => { const cur = M.block(p.id); fn(cur.plot); PLOT.save(cur); closePop(); PLOT.settings(M.block(p.id), anchor); };
    const ysBox = h('div.pl-ys', D.names.map((n, c) => h('label.pl-y', h('input', { type: 'checkbox', checked: (P.ys || []).includes(c), on: { change: e => up(Q => { Q.ys = e.target.checked ? [...new Set([...(Q.ys || []), c])] : (Q.ys || []).filter(x => x !== c); }) } }), h('span', TABLE.col(c) + ' · ' + snippet(n, 22)),
      (P.ys || []).includes(c) && (P.type === 'scatter' || P.type === 'line') ? sel((P.errs || {})[c] ?? '', [['', 'no error bars'], ...cols.map(([v, l]) => [v, '± ' + l])], v => up(Q => { Q.errs = Object.assign({}, Q.errs, { [c]: v === '' ? null : +v }); })) : null)));
    const row = (l, el) => h('label.pl-r', h('span', l), el);
    popover(r.left - 160, r.bottom + 6, [h('h5', 'Plot'),
      row('Type', sel(P.type, [['scatter', 'Scatter'], ['line', 'Line'], ['bar', 'Bar · mean ± error'], ['hist', 'Histogram']], v => up(Q => { Q.type = v; }))),
      P.type === 'scatter' || P.type === 'line' ? row('X', sel(P.x, cols, v => up(Q => { Q.x = +v; }))) : null,
      P.type === 'bar' ? row('Groups', sel(P.group, cols, v => up(Q => { Q.group = +v; }))) : null,
      P.type === 'bar' ? row('Error', sel(P.err || 'sd', [['sd', 'SD'], ['sem', 'SEM']], v => up(Q => { Q.err = v; }))) : null,
      P.type === 'hist' ? row('Bins', sel(P.bins || 0, [[0, 'automatic'], ...[5, 8, 10, 15, 20, 30, 50].map(n => [n, n])], v => up(Q => { Q.bins = +v; }))) : null,
      h('div.pl-lab', P.type === 'hist' ? 'Column' : P.type === 'bar' ? 'Values' : 'Y'), ysBox,
      P.type !== 'bar' && P.type !== 'hist' ? h('label.pl-r', h('span', 'Log X'), h('input', { type: 'checkbox', checked: !!P.logX, on: { change: e => up(Q => { Q.logX = e.target.checked; }) } })) : null,
      P.type !== 'hist' ? h('label.pl-r', h('span', 'Log Y'), h('input', { type: 'checkbox', checked: !!P.logY, on: { change: e => up(Q => { Q.logY = e.target.checked; }) } })) : null,
      row('X title', h('input.inp.sm', { value: P.xlab || '', placeholder: 'from the column', on: { change: e => up(Q => { Q.xlab = e.target.value; }) } })),
      row('Y title', h('input.inp.sm', { value: P.ylab || '', placeholder: 'from the column', on: { change: e => up(Q => { Q.ylab = e.target.value; }) } }))], { cls: 'pop.pl-pop' });
  },
  /* ---------- drawing ---------- */
  ticks(lo, hi, n, log) {
    if (log) { const a = Math.floor(Math.log10(lo)), b = Math.ceil(Math.log10(hi)), out = []; for (let k = a; k <= b; k++) out.push(Math.pow(10, k)); return out; }
    if (!(hi > lo)) { hi = lo + 1; lo = lo - 1; } const span = hi - lo, step0 = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(step0))), st = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= step0) || mag * 10;
    const out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(Math.round(v / st) * st); return out; },
  fmtT: v => { const a = Math.abs(v); return a !== 0 && (a < 1e-3 || a >= 1e5) ? v.toExponential(0) : String(Math.round(v * 1e6) / 1e6); },
  draw(P, D, W, H) {
    const NS = 'http://www.w3.org/2000/svg', S = (t, a, kids) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (kids || []).forEach(c => e.append(c)); return e; }, T = (x, y, s, a) => { const e = S('text', Object.assign({ x, y }, a || {})); e.textContent = s; return e; };
    const svg = S('svg', { class: 'pl-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` }), m = { l: 56, r: 14, t: 12, b: 42 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const type = P.type || 'scatter', ys = (P.ys || []).filter(c => c < D.cols); if (!ys.length) { svg.append(T(W / 2, H / 2, 'Pick a column in ⚙ Plot', { 'text-anchor': 'middle', class: 'pl-empty' })); return svg; }
    let xs = [], series = [], xlo, xhi, ylo, yhi, cats = null, bars = null, hist = null;
    if (type === 'scatter' || type === 'line') { const X = D.num(P.x);
      series = ys.map((c, k) => { const Y = D.num(c), E = P.errs && P.errs[c] != null ? D.num(P.errs[c]) : null; const pts = []; X.forEach((x, i) => { const y = Y[i]; if (isNaN(x) || isNaN(y) || (P.logX && x <= 0) || (P.logY && y <= 0)) return; pts.push([x, y, E && !isNaN(E[i]) ? Math.abs(E[i]) : 0]); }); if (type === 'line') pts.sort((a, z) => a[0] - z[0]); return { name: D.names[c], pts, col: PLOT.PAL[k % PLOT.PAL.length] }; });
      const all = series.flatMap(s => s.pts); if (!all.length) { svg.append(T(W / 2, H / 2, 'No numbers in those columns', { 'text-anchor': 'middle', class: 'pl-empty' })); return svg; }
      xlo = Math.min(...all.map(p => p[0])); xhi = Math.max(...all.map(p => p[0])); ylo = Math.min(...all.map(p => p[1] - p[2])); yhi = Math.max(...all.map(p => p[1] + p[2]));
      if (P.logY) ylo = Math.min(...all.map(p => p[1] - p[2] > 0 ? p[1] - p[2] : p[1])); }
    else if (type === 'bar') { const G = D.col(P.group).map(TABLE.fmt); cats = [...new Set(G.filter(g => g !== ''))];
      bars = ys.map((c, k) => { const Y = D.num(c); return { name: D.names[c], col: PLOT.PAL[k % PLOT.PAL.length], g: cats.map(cat => { const v = Y.filter((y, i) => G[i] === cat && !isNaN(y)); const mean = TABLE.FN.MEAN(v), e = P.err === 'sem' ? TABLE.FN.SEM(v) : TABLE.FN.SD(v); return { v, mean, e: isNaN(e) ? 0 : e }; }) }; });
      const vals = bars.flatMap(s => s.g.flatMap(g => [...g.v, g.mean + g.e, g.mean - g.e])).filter(x => !isNaN(x)); if (!vals.length) { svg.append(T(W / 2, H / 2, 'No numbers to average', { 'text-anchor': 'middle', class: 'pl-empty' })); return svg; }
      ylo = P.logY ? Math.min(...vals.filter(v => v > 0)) : Math.min(0, ...vals); yhi = Math.max(...vals); }
    else { const V = D.num(ys[0]).filter(x => !isNaN(x)); if (!V.length) { svg.append(T(W / 2, H / 2, 'No numbers in that column', { 'text-anchor': 'middle', class: 'pl-empty' })); return svg; }
      const lo = Math.min(...V), hi = Math.max(...V), n = P.bins || Math.max(4, Math.ceil(Math.log2(V.length) + 1)), wbin = (hi - lo) / n || 1, counts = Array(n).fill(0); V.forEach(v => { counts[Math.min(n - 1, Math.floor((v - lo) / wbin))]++; });
      hist = { lo, wbin, counts, name: D.names[ys[0]] }; xlo = lo; xhi = lo + wbin * n; ylo = 0; yhi = Math.max(...counts); }
    if (P.logY && !(ylo > 0)) ylo = (yhi || 1) / 1000;
    if (yhi === ylo) { yhi += Math.abs(yhi) * .1 || 1; ylo -= Math.abs(ylo) * .1 || (P.logY ? 0 : 1); }
    const pad = (lo, hi, log) => log ? [lo / 1.15, hi * 1.15] : [lo - (hi - lo) * .05, hi + (hi - lo) * .05];
    if (type === 'scatter' || type === 'line') [xlo, xhi] = xlo === xhi ? [xlo - 1, xhi + 1] : pad(xlo, xhi, P.logX);
    [ylo, yhi] = type === 'hist' || (type === 'bar' && !P.logY && ylo >= 0) ? [ylo, yhi * 1.06] : pad(ylo, yhi, P.logY);
    const sx = v => m.l + (P.logX && type !== 'bar' && type !== 'hist' ? (Math.log10(v) - Math.log10(xlo)) / (Math.log10(xhi) - Math.log10(xlo)) : (v - xlo) / (xhi - xlo)) * iw;
    const sy = v => m.t + ih - (P.logY && type !== 'hist' ? (Math.log10(Math.max(v, ylo)) - Math.log10(ylo)) / (Math.log10(yhi) - Math.log10(ylo)) : (v - ylo) / (yhi - ylo)) * ih;
    const g = S('g', { class: 'pl-ax' }); svg.append(g);
    // y axis
    PLOT.ticks(ylo, yhi, Math.max(3, Math.round(ih / 50)), P.logY && type !== 'hist').filter(v => v >= ylo - 1e-12 && v <= yhi + 1e-12).forEach(v => { const y = sy(v); g.append(S('line', { x1: m.l, x2: m.l + iw, y1: y, y2: y, class: 'pl-grid' }), T(m.l - 6, y + 3.5, PLOT.fmtT(v), { 'text-anchor': 'end' })); });
    // x axis
    if (type === 'bar') { const bw = iw / cats.length; cats.forEach((c, i) => g.append(T(m.l + bw * (i + .5), m.t + ih + 15, snippet(c, Math.max(4, Math.floor(bw / 7))), { 'text-anchor': 'middle' }))); }
    else PLOT.ticks(xlo, xhi, Math.max(3, Math.round(iw / 80)), P.logX && type !== 'hist').filter(v => v >= xlo - 1e-12 && v <= xhi + 1e-12).forEach(v => { const x = sx(v); g.append(S('line', { x1: x, x2: x, y1: m.t + ih, y2: m.t + ih + 4, class: 'pl-tk' }), T(x, m.t + ih + 15, PLOT.fmtT(v), { 'text-anchor': 'middle' })); });
    g.append(S('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'pl-axl' }), S('line', { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih, class: 'pl-axl' }));
    const xl = P.xlab || (type === 'bar' ? D.names[P.group] : type === 'hist' ? hist.name : D.names[P.x]), yl = P.ylab || (type === 'hist' ? 'count' : ys.length === 1 ? D.names[ys[0]] : '');
    g.append(T(m.l + iw / 2, H - 6, xl || '', { 'text-anchor': 'middle', class: 'pl-t' })); if (yl) g.append(T(-(m.t + ih / 2), 13, yl, { 'text-anchor': 'middle', class: 'pl-t', transform: 'rotate(-90)' }));
    const data = S('g', { class: 'pl-data' }); svg.append(data);
    if (type === 'scatter' || type === 'line') series.forEach(s => { const pts = s.pts;
      if (type === 'line' && pts.length > 1) data.append(S('path', { d: 'M' + pts.map(p => sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join('L'), stroke: s.col, fill: 'none', 'stroke-width': 1.8 }));
      pts.forEach(p => { if (p[2]) { const x = sx(p[0]), y1 = sy(p[1] - p[2]), y2 = sy(p[1] + p[2]); data.append(S('path', { d: `M${x},${y1}V${y2}M${x - 3},${y1}h6M${x - 3},${y2}h6`, stroke: s.col, 'stroke-width': 1.1, fill: 'none' })); }
        const c = S('circle', { cx: sx(p[0]).toFixed(1), cy: sy(p[1]).toFixed(1), r: type === 'line' ? 2.6 : 3.4, fill: s.col, 'fill-opacity': .85 }); const tt = S('title'); tt.textContent = `${PLOT.fmtT(p[0])}, ${PLOT.fmtT(p[1])}${p[2] ? ' ± ' + PLOT.fmtT(p[2]) : ''}`; c.append(tt); data.append(c); }); });
    if (type === 'bar') { const bw = iw / cats.length, k = bars.length, inner = bw * .74 / k;
      bars.forEach((s, si) => s.g.forEach((gg, i) => { if (isNaN(gg.mean)) return; const x0 = m.l + bw * i + bw * .13 + inner * si, base = P.logY ? sy(ylo) : sy(Math.max(0, ylo)), top = sy(gg.mean);
        const rct = S('rect', { x: x0 + 1, y: Math.min(base, top), width: Math.max(1, inner - 2), height: Math.abs(base - top), fill: s.col, 'fill-opacity': .32, stroke: s.col, 'stroke-width': 1.2 }); const tt = S('title'); tt.textContent = `${cats[i]} · ${s.name}: ${PLOT.fmtT(gg.mean)} ± ${PLOT.fmtT(gg.e)} (n = ${gg.v.length})`; rct.append(tt); data.append(rct);
        const cx = x0 + inner / 2; if (gg.e) data.append(S('path', { d: `M${cx},${sy(gg.mean - gg.e)}V${sy(gg.mean + gg.e)}M${cx - 4},${sy(gg.mean + gg.e)}h8M${cx - 4},${sy(gg.mean - gg.e)}h8`, stroke: s.col, 'stroke-width': 1.3, fill: 'none' }));
        gg.v.forEach((v, j) => data.append(S('circle', { cx: (cx + ((j * 37) % 11 - 5) * inner / 26).toFixed(1), cy: sy(v).toFixed(1), r: 2.2, fill: s.col, 'fill-opacity': .8 }))); })); }
    if (type === 'hist') hist.counts.forEach((n, i) => { const x0 = sx(hist.lo + hist.wbin * i), x1 = sx(hist.lo + hist.wbin * (i + 1)); const rct = S('rect', { x: x0 + .5, y: sy(n), width: Math.max(1, x1 - x0 - 1), height: sy(0) - sy(n), fill: PLOT.PAL[0], 'fill-opacity': .45, stroke: PLOT.PAL[0], 'stroke-width': 1 }); const tt = S('title'); tt.textContent = `${PLOT.fmtT(hist.lo + hist.wbin * i)} – ${PLOT.fmtT(hist.lo + hist.wbin * (i + 1))}: ${n}`; rct.append(tt); data.append(rct); });
    // legend for several series
    const L = type === 'bar' ? bars : type === 'hist' ? [] : series; if (L.length > 1) { const lg = S('g', { class: 'pl-leg' }); L.forEach((s, i) => { const y = m.t + 6 + i * 15; lg.append(S('rect', { x: m.l + iw - 118, y: y - 8, width: 10, height: 10, fill: s.col, rx: 2 }), T(m.l + iw - 104, y + 1, snippet(s.name, 18))); }); svg.append(lg); }
    return svg;
  },
};
WIDGETS.table = { label: 'table', w: 644, body: TABLE.body, menu: b => TABLE.menu(b) };
WIDGETS.plot = { label: 'plot', w: 476, body: PLOT.body, menu: b => [{ label: 'Plot settings…', run: () => { const el = $(`.box[data-id="${b.id}"] .pl-set`); el && PLOT.settings(M.block(b.id), el); } }, { label: 'Go to its table', run: () => { const t = M.block(b.plot && b.plot.src); t && App.jump(t.id, {}); } }] };
INSERTS.push({ id: 'table', group: 'Widgets', icon: '▦', label: 'Table (Excel / CSV)…', sub: 'The sheets copied in: sort, search, edit, formulas; plot it', run: (d, p) => TABLE.insert(d, p) });
INSERTS.push({ id: 'table-empty', group: 'Widgets', icon: '▤', label: 'Empty table', sub: 'Type or paste from Excel; formulas with =', run: (d, p) => TABLE.empty(d, p) });
INSERTS.push({ id: 'plot', group: 'Widgets', icon: '📈', label: 'Plot of a table…', sub: 'Scatter, line, bar (mean ± SD/SEM), histogram — follows the table', run: (d, p) => PLOT.insertMenu(d, p) });
