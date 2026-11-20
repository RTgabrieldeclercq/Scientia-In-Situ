/* ==========================================================================
   14fg · Code — a compendium of your scripts, and the Code kind (V4.88 —
   Gabe, 20 Nov: "In Atlas, add Code tab where you can upload .py with title
   and user description of what it is. Allow the user to input a new kind
   called code which asks the input data (from the data tree), and reflects
   with the output result as a figure, plot, table, etc...")
   - Compendiums → Code: ＋ Upload a .py — its title and what it does; each
     script a card (its first lines, the components that run it), View, Edit,
     Use in a note… (a Code component there), Delete. Kept in the `scripts`
     store (synced like the rest; the text of the file, never the file).
   - The Code kind (13zzi's kinds: double-click a component's label → Code):
     under its text, the script (one of the compendium's, or upload one), its
     inputs — from the data tree: a file logged in a data tree (read from its
     folder on this device, or chosen again), a table (as CSV), an image of an
     image panel — and Run. The output comes back into the component: the
     figures matplotlib made, a table (a pandas DataFrame — or rows — named
     `result`), what was printed, or the error. A figure can become an image
     panel, a table a table, beside it.
   - Python runs in this browser (Pyodide, from cdn.jsdelivr.net — the first
     run needs the network and takes a moment; a worker, so the page stays
     free). The script sees INPUT (the first input's path) and INPUTS, in /data.
   Settings → Canvas & notes → Code (code, 20a).
   CODE: all() · upload() · foot(b) · run(b) · engine(code, files) (replaceable)
   ========================================================================== */
const CODE = {
  BASE: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  ICON: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>',
  q: '', busy: new Set(),
  on: () => typeof FEAT === 'undefined' || FEAT.on('code'),
  tn(k, d) { try { const v = FEAT.tune('code', k); return v == null ? d : v; } catch (e) { return d; } },
  all: () => DB.all('scripts').filter(s => !s.deleted).sort((a, b) => String(b.modified || b.created || '').localeCompare(String(a.modified || a.created || ''))),
  is: b => !!b && b.ckind === 'code',
  usedBy: id => DB.where('blocks', b => b.status === 'live' && CODE.is(b) && (b.code || {}).script === id),
  lines: s => String(s.code || '').replace(/\s+$/, '').split('\n'),
  /* ---------------- the compendium ---------------- */
  upload(then) {
    PLATE.pickFiles(async files => { const f = files[0]; if (!f) return; const text = await f.text(); if (text.length > 400000) return toast('That script is over 400 KB — too big to keep in the notebook', 4000);
      CODE.details({ id: uid('py'), title: f.name.replace(/\.py$/i, '').replace(/[_-]+/g, ' '), desc: '', file: f.name, code: text, lang: 'python', created: isoLocal(new Date()) }, true, then); }, false, '.py,text/x-python,text/plain');
  },
  details(rec, isNew, then) {
    const ti = h('input.inp', { value: rec.title || '', placeholder: 'Its title', 'aria-label': 'Title' }), de = h('textarea.inp.code-desc', { rows: 3, placeholder: 'What it does: what it reads, what it makes', 'aria-label': 'What it does' }, rec.desc || '');
    modal({ title: isNew ? 'A new script — ' + rec.file : 'The script’s details', wide: true, body: h('div.code-dlg', h('label.f', h('span', 'Title'), ti), h('label.f', h('span', 'What it does'), de),
      h('div.code-pre', h('div.code-ph', rec.file + ' · ' + plural(CODE.lines(rec).length, 'line')), h('pre', CODE.lines(rec).slice(0, 14).join('\n') + (CODE.lines(rec).length > 14 ? '\n…' : '')))),
      actions: [{ label: 'Cancel' }, { label: isNew ? 'Keep it' : 'Save', pri: true, run: () => { DB.beginGroup(isNew ? 'New script' : 'Script'); const r = Object.assign({}, rec, { title: ti.value.trim() || rec.file || 'Script', desc: de.value.trim(), modified: isoLocal(new Date()) }); DB.put('scripts', r); changed(); toast(isNew ? '“' + r.title + '” is in Compendiums → Code' : 'Saved'); then && then(r); } }] });
    setTimeout(() => ti.focus(), 30);
  },
  view(rec) { modal({ title: rec.title + ' — ' + (rec.file || 'script.py'), wide: true, body: h('div.code-pre.big', h('pre', rec.code || '')), actions: [{ label: 'Close' }] }); },
  del(rec) { const n = CODE.usedBy(rec.id).length; modal({ title: 'Delete “' + rec.title + '”?', body: h('p', n ? plural(n, 'Code component') + ' run it: they keep their last output, and ask for another script.' : 'No component runs it.'), actions: [{ label: 'Cancel' }, { label: 'Delete', danger: true, run: () => { DB.beginGroup('Delete script'); DB.del('scripts', rec.id); changed(); toast('Deleted — Ctrl+Z brings it back'); } }] }); },
  async useIn(rec) {
    const d = typeof MPANEL !== 'undefined' ? await MPANEL.note({ title: 'Run “' + rec.title + '” in a note', intro: 'A Code component there, with this script: choose its input and run it.', verb: 'Put it here' }) : null; if (!d) return;
    DB.beginGroup('Code component'); const sp = typeof MOVE !== 'undefined' && MOVE.spot ? MOVE.spot(d) : { x: 0, y: 200 };
    const b = M.addBlock(d.id, null, { label: rec.title, x: sp.x, y: sp.y, w: 520, ckind: 'code' }); b.body = { text: rec.desc || '', marks: [] }; b.code = { script: rec.id, inputs: [] }; DB.put('blocks', b); changed();
    App.openComponent(b.id);
  },
  card(rec) { const used = CODE.usedBy(rec.id).length;
    return h('div.cp-pr.code-card', { 'data-id': rec.id }, h('div.cp-prh', h('span.cp-ic', { html: CODE.ICON }), h('b', rec.title), h('span.cp-prs', [rec.file || 'script.py', plural(CODE.lines(rec).length, 'line'), used ? 'run by ' + plural(used, 'component') : 'not used yet'].join(' · '))),
      rec.desc ? h('p.code-d', rec.desc) : null, h('pre.code-peek', CODE.lines(rec).filter(l => l.trim()).slice(0, 4).join('\n')),
      h('div.cp-prf', h('button.btn.sm', { type: 'button', on: { click: () => CODE.useIn(rec) } }, 'Use in a note…'), h('button.cp-run', { type: 'button', on: { click: () => CODE.view(rec) } }, 'View'),
        h('button.cp-run', { type: 'button', on: { click: () => CODE.details(rec, false) } }, 'Edit'), h('button.cp-run', { type: 'button', on: { click: () => CODE.del(rec) } }, 'Delete'))); },
  render() {
    const list = h('div.cp-prl'), q = h('input.cp-q', { type: 'search', placeholder: 'Search scripts, what they do and their code', value: CODE.q, 'aria-label': 'Search scripts' });
    const fill = () => { const s = CODE.q.trim().toLowerCase(), L = CODE.all().filter(r => !s || (r.title + ' ' + r.desc + ' ' + r.file + ' ' + r.code).toLowerCase().includes(s));
      list.replaceChildren(...(L.length ? L.map(CODE.card) : [h('p.cp-empty', s ? 'No script matches.' : 'No script yet. Upload a .py: give it a title and say what it does. A component of the Code kind runs it on your data.')])); };
    q.addEventListener('input', () => { CODE.q = q.value; fill(); }); fill();
    App.setTitle('Code', [h('span', plural(CODE.all().length, 'script') + ' · a compendium')]);
    return h('div.page.cp-page', h('div.eyebrow', 'Compendiums'), h('h1.title', 'Code'),
      h('p.stand', 'Your analysis scripts. Upload a .py with a title and what it does; a component of the Code kind runs it on data from your data trees and shows what it makes — a figure, a plot, a table.'),
      h('div.row.code-bar', h('button.btn.pri', { type: 'button', on: { click: () => CODE.upload() } }, '＋ Upload a .py'), q), list);
  },
  /* ---------------- the inputs: from the data tree ---------------- */
  inputsAll(docId) {
    const out = [], where = b => (M.doc(b.docId) || {}).title || 'a note';
    DB.where('blocks', b => b.status === 'live' && DTREE.items(b).length > 0 && !!ADATA.liveDoc(b.docId)).forEach(b => { const walk = (L, base, top) => (L || []).forEach(e => { const p = base ? base + '/' + e.n : e.n;
      if (e.dir) walk(e.k, p, top || e); else out.push({ t: 'dt', blk: b.id, top: (top || e).id, path: p, name: e.n, where: where(b), sub: (e.s ? DATA.fmtSize(e.s) + ' · ' : '') + 'data tree', here: b.docId === docId }); }); walk(DTREE.items(b), '', null); });
    DB.where('blocks', b => b.status === 'live' && b.kind === 'table' && !!ADATA.liveDoc(b.docId)).forEach(b => out.push({ t: 'table', blk: b.id, name: (b.label || 'Table').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.csv', where: where(b), sub: 'a table, as CSV', here: b.docId === docId }));
    DB.where('blocks', b => b.status === 'live' && b.kind === 'figure' && b.fig && !!ADATA.liveDoc(b.docId)).forEach(b => FIG.cells(b).forEach(c => { const m = c.media && MEDIA.get(c.media); if (m) out.push({ t: 'media', id: m.id, blk: b.id, name: m.name || (m.id + '.' + (m.ext || 'png')), where: where(b), sub: 'an image of “' + (b.label || 'an image panel') + '”', here: b.docId === docId }); }));
    return out.sort((a, z) => (z.here - a.here));
  },
  key: x => x.t + ':' + (x.t === 'media' ? x.id : x.blk + (x.path ? '/' + x.path : '')),
  pickInput(b, x, y) {
    const cur = new Set(((b.code || {}).inputs || []).map(CODE.key)), q = h('input.inp.df-q', { placeholder: 'Search the data: files, tables, images', 'aria-label': 'Input' }), list = h('div.df-pl');
    const fill = () => { const s = q.value.trim().toLowerCase(), L = CODE.inputsAll(b.docId).filter(x => !cur.has(CODE.key(x)) && (!s || (x.name + ' ' + x.where + ' ' + (x.path || '')).toLowerCase().includes(s))).slice(0, 60);
      list.replaceChildren(...(L.length ? L.map(x => h('button.df-pi', { type: 'button', on: { click: () => { closePop(); CODE.setInputs(b, ((b.code || {}).inputs || []).concat([x])); } } }, h('span', { html: x.t === 'dt' ? DTREE.svg('file', 13) : x.t === 'table' ? DTREE.svg('tree', 13) : CODE.ICON }), h('b', x.name), h('span.df-ps', x.where + ' · ' + x.sub + (x.path && x.path !== x.name ? ' · ' + x.path : ''))))
        : [h('p.df-none', s ? 'Nothing matches.' : 'No data yet: log a folder or files on a component (⋯ → Log data…), or add a table or an image panel.')])); };
    q.addEventListener('input', fill); q.addEventListener('keydown', e => e.stopPropagation());
    popover(x, y, [h('h5', 'Input from the data tree'), q, list]); fill(); setTimeout(() => q.focus(), 20);
  },
  setInputs(b, L) { const cur = M.block(b.id); DB.beginGroup('Code input'); cur.code = Object.assign({ inputs: [] }, cur.code, { inputs: L.map(x => { const o = Object.assign({}, x); delete o.here; return o; }) }); DB.put('blocks', cur); changed(); },
  setScript(b, id) { const cur = M.block(b.id); DB.beginGroup('Code script'); cur.code = Object.assign({ inputs: [] }, cur.code, { script: id }); const s = DB.get('scripts', id); if (s && !(cur.label || '').trim()) cur.label = s.title; DB.put('blocks', cur); changed(); },
  csv: cells => (cells || []).map(r => (r || []).map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n'),
  /** The bytes of an input (a file from its folder on this device, else chosen again; a table as CSV; an image's file). */
  async bytes(x) {
    if (x.t === 'table') { const tb = M.block(x.blk); if (!tb) throw new Error('the table “' + x.name + '” is gone'); return new TextEncoder().encode(CODE.csv(TABLE.sheet(tb).cells)).buffer; }
    if (x.t === 'media') { const m = MEDIA.get(x.id); const u = m && MEDIA.url(m); if (!u) throw new Error('the image ' + x.name + ' is not on this device'); return await (await fetch(u)).arrayBuffer(); }
    const hd = DTREE.handle(x.top);
    if (hd) { try { if (hd.queryPermission && (await hd.queryPermission({ mode: 'read' })) !== 'granted') await hd.requestPermission({ mode: 'read' });
      let cur = hd; const parts = x.path.split('/'); if (hd.kind === 'directory') { for (const p of parts.slice(1, -1)) cur = await cur.getDirectoryHandle(p); cur = await cur.getFileHandle(parts[parts.length - 1]); }
      return await (await cur.getFile()).arrayBuffer(); } catch (e) { console.warn('[code] folder', e); } }
    return await new Promise((res, rej) => modal({ title: 'Choose ' + x.name, body: h('p', 'This device does not keep the folder of “' + x.path + '” — choose the file here (it is read, not copied).'), actions: [{ label: 'Cancel', run: () => rej(new Error('no file chosen for ' + x.name)) }, { label: 'Choose the file…', pri: true, run: () => PLATE.pickFiles(async fs => { if (!fs[0]) return rej(new Error('no file chosen')); res(await fs[0].arrayBuffer()); }, false, '*/*') }] }));
  },
  /* ---------------- Python, in a worker ---------------- */
  WRAP: String.raw`
import sys, io, os, json, base64, traceback
os.environ['MPLBACKEND'] = 'AGG'
_buf = io.StringIO(); _o, _e = sys.stdout, sys.stderr; sys.stdout = _buf; sys.stderr = _buf
_names = list(INPUT_NAMES)
_g = {'__name__': '__main__', 'INPUTS': _names, 'INPUT': _names[0] if _names else None}
_err = None
try:
    exec(compile(USER_CODE, 'script.py', 'exec'), _g)
except BaseException:
    _err = traceback.format_exc(limit=-3)
finally:
    sys.stdout, sys.stderr = _o, _e
_figs = []
if 'matplotlib.pyplot' in sys.modules:
    import matplotlib.pyplot as _plt
    for _n in _plt.get_fignums():
        _b = io.BytesIO(); _plt.figure(_n).savefig(_b, format='png', dpi=110, bbox_inches='tight'); _figs.append(base64.b64encode(_b.getvalue()).decode())
    _plt.close('all')
_tab = None
_r = _g.get('result')
if _r is not None:
    if 'pandas' in sys.modules:
        import pandas as _pd
        if isinstance(_r, _pd.Series): _r = _r.to_frame()
        if isinstance(_r, _pd.DataFrame):
            _tab = {'cols': [str(c) for c in _r.columns], 'rows': [[str(v) for v in row] for row in _r.head(500).itertuples(index=False)], 'n': int(len(_r))}
    if _tab is None and isinstance(_r, (list, tuple)) and len(_r) and isinstance(_r[0], (list, tuple)):
        _tab = {'cols': [str(c) for c in _r[0]], 'rows': [[str(v) for v in row] for row in _r[1:501]], 'n': len(_r) - 1}
    if _tab is None and _err is None:
        _buf.write(repr(_r) + '\n')
json.dumps({'text': _buf.getvalue()[-20000:], 'figs': _figs, 'table': _tab, 'err': _err})
`,
  _w: null, _n: 0, _wait: new Map(),
  worker() {
    if (CODE._w) return CODE._w;
    const src = `let py = null; self.onmessage = async (e) => { const { id, base, code, files, wrap } = e.data; try {
      if (!py) { importScripts(base + 'pyodide.js'); py = await loadPyodide({ indexURL: base }); }
      try { await py.loadPackagesFromImports(code); } catch (x) {}
      try { py.FS.mkdir('/data'); } catch (x) {}
      for (const f of files) py.FS.writeFile('/data/' + f.name, new Uint8Array(f.bytes));
      py.globals.set('USER_CODE', code); py.globals.set('INPUT_NAMES', py.toPy(files.map(f => '/data/' + f.name)));
      const res = await py.runPythonAsync(wrap); self.postMessage({ id, ok: true, res });
    } catch (err) { self.postMessage({ id, ok: false, err: String((err && err.message) || err) }); } };`;
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = e => { const p = CODE._wait.get(e.data.id); if (!p) return; CODE._wait.delete(e.data.id); e.data.ok ? p.res(e.data.res) : p.rej(new Error(e.data.err)); };
    w.onerror = e => { CODE._wait.forEach(p => p.rej(new Error(e.message || 'Python could not start'))); CODE._wait.clear(); CODE._w = null; };
    return (CODE._w = w);
  },
  /** Run Python: { text, figs: [base64 PNG], table: { cols, rows, n } | null, err }. Tests may replace it. */
  engine(code, files) {
    return new Promise((res, rej) => { const id = ++CODE._n; CODE._wait.set(id, { res: s => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }, rej });
      CODE.worker().postMessage({ id, base: CODE.BASE, code, files, wrap: CODE.WRAP }, files.map(f => f.bytes)); });
  },
  async run(b) {
    const cur = M.block(b.id), C = cur.code || {}, s = C.script && DB.get('scripts', C.script); if (!s) return toast('Choose a script first');
    if (CODE.busy.has(b.id)) return; CODE.busy.add(b.id); changed();
    let out;
    try { const files = []; const seen = new Set();
      for (const x of (C.inputs || [])) { let n = x.name, i = 2; while (seen.has(n)) n = x.name.replace(/(\.[^.]*)?$/, m => ' (' + i++ + ')' + m); seen.add(n); files.push({ name: n, bytes: await CODE.bytes(x) }); }
      const t0 = Date.now(), r = await CODE.engine(s.code, files);
      const figs = []; for (const [i, b64] of (r.figs || []).entries()) { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const rec = await MEDIA.add(new File([bin], (s.title || 'figure').replace(/[^\w -]+/g, '') + ' ' + (i + 1) + '.png', { type: 'image/png' }), { quiet: true }); figs.push(rec.id); }
      out = { text: r.text || '', figs, table: r.table || null, err: r.err || null, at: isoLocal(new Date()), ms: Date.now() - t0, script: s.id, rev: s.modified || s.created };
    } catch (e) { out = { err: String(e.message || e).replace(/^Error: /, ''), at: isoLocal(new Date()), script: s.id, load: /importScripts|NetworkError|Failed to fetch|pyodide/i.test(String(e)) }; }
    CODE.busy.delete(b.id); const nb = M.block(b.id); DB.beginGroup('Code output'); nb.code = Object.assign({}, nb.code, { out }); nb.modified = isoLocal(new Date()); DB.put('blocks', nb); changed();
    toast(out.err ? 'The script stopped with an error — it is under the component' : 'Ran “' + s.title + '”' + (out.figs && out.figs.length ? ' — ' + plural(out.figs.length, 'figure') : '') + (out.table ? ' — a table of ' + plural(out.table.n, 'row') : ''), 2600);
  },
  /** A figure → an image panel beside it; a table → a table beside it. */
  asFigure(b, mediaId) { const d = M.doc(b.docId); DB.beginGroup('Figure from code'); const f = M.addBlock(d.id, null, { kind: 'figure', label: 'Figure — ' + (b.label || 'code'), x: (b.x || 0) + (b.w || 520) + 40, y: b.y || 0, w: 480, fig: { rows: 1, cols: 1, letters: false, cells: [{ id: uid('fc'), media: mediaId }] } }); f.body = { text: '', marks: [] }; FIG.syncText && FIG.syncText(f); DB.put('blocks', f); M.wire(b.id, f.id, 'produces', true); changed(); toast('An image panel beside it — connected: the code produces it'); },
  asTable(b) { const T = (b.code || {}).out && b.code.out.table; if (!T) return; const d = M.doc(b.docId); DB.beginGroup('Table from code');
    const t = M.addBlock(d.id, null, { kind: 'table', label: 'Result — ' + (b.label || 'code'), x: (b.x || 0) + (b.w || 520) + 40, y: (b.y || 0) + 40, w: 560, h: 320, table: { sheets: [{ name: 'result', cells: [T.cols].concat(T.rows) }], cur: 0, header: true } }); TABLE.sum(t); DB.put('blocks', t); M.wire(b.id, t.id, 'produces', true); changed(); toast('A table beside it — connected: the code produces it'); },
  /* ---------------- the component ---------------- */
  foot(b, pane, ro) {
    const C = b.code || {}, s = C.script && DB.get('scripts', C.script), L = CODE.all(), out = C.out, busy = CODE.busy.has(b.id), rows = +CODE.tn('rows', '20') || 20;
    const sel = h('select.inp.code-sel', { disabled: ro, 'aria-label': 'Script', on: { change: e => { if (e.target.value === '+') { e.target.value = C.script || ''; CODE.upload(r => CODE.setScript(b, r.id)); } else CODE.setScript(b, e.target.value); } } },
      h('option', { value: '' }, L.length ? 'Choose a script…' : 'No script yet'), L.map(r => h('option', { value: r.id, selected: r.id === C.script }, r.title)), h('option', { value: '+' }, '＋ Upload a .py…'));
    const ins = (C.inputs || []).map((x, i) => h('span.code-in', { title: x.where + ' · ' + (x.path || x.name) }, h('span', { html: x.t === 'dt' ? DTREE.svg('file', 12) : x.t === 'table' ? DTREE.svg('tree', 12) : CODE.ICON }), x.name,
      ro ? null : h('button', { type: 'button', 'aria-label': 'Not this input', on: { click: e => { e.stopPropagation(); CODE.setInputs(b, C.inputs.filter((_, j) => j !== i)); } } }, '×')));
    const outEl = !out ? null : h('div.code-out' + (out.err ? '.err' : ''),
      h('div.code-oh', out.err ? 'Stopped with an error' : 'Output', h('span', ' · ' + fmtDay(out.at) + ' ' + fmtTime(out.at) + (out.ms ? ' · ' + (out.ms / 1000).toFixed(1) + ' s' : '') + (s && out.rev && out.rev !== (s.modified || s.created) ? ' · the script changed since' : ''))),
      (out.figs || []).map(id => { const m = MEDIA.get(id); return m ? h('div.code-fig', h('img', { src: MEDIA.url(m), alt: 'A figure the script made' }), ro ? null : h('button.cp-run', { type: 'button', on: { click: e => { e.stopPropagation(); CODE.asFigure(b, id); } } }, '＋ As an image panel')) : null; }),
      out.table ? h('div.code-tw', h('table.code-t', h('thead', h('tr', out.table.cols.map(c => h('th', c)))), h('tbody', out.table.rows.slice(0, rows).map(r => h('tr', r.map(v => h('td', v)))))),
        h('div.code-tf', plural(out.table.n, 'row') + (out.table.n > rows ? ' · the first ' + rows + ' shown' : ''), ro ? null : h('button.cp-run', { type: 'button', on: { click: e => { e.stopPropagation(); CODE.asTable(b); } } }, '＋ As a table'))) : null,
      out.err ? h('pre.code-err', (out.load ? 'Python could not load (it needs the network the first time): ' : '') + out.err) : null,
      out.text && CODE.tn('text', true) !== false ? h('pre.code-txt', out.text.split('\n').slice(-40).join('\n')) : null);
    return h('div.code-foot.nopan', { on: { pointerdown: e => { if (e.target.closest('button, select, input, .code-out')) e.stopPropagation(); }, dblclick: e => e.stopPropagation() } },
      h('div.code-r', h('span.code-k', 'Script'), sel, s ? h('button.cp-run', { type: 'button', on: { click: e => { e.stopPropagation(); CODE.view(s); } } }, 'View') : null),
      h('div.code-r', h('span.code-k', 'Input'), h('div.code-ins', ins, ro ? null : h('button.df-add', { type: 'button', on: { click: e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); CODE.pickInput(b, r.left, r.bottom + 4); } } }, '＋ From the data tree'))),
      ro ? null : h('div.code-r', h('button.btn.sm.pri.code-go', { type: 'button', disabled: !s || busy, on: { click: e => { e.stopPropagation(); CODE.run(b); } } }, busy ? 'Running…' : out ? '▶ Run again' : '▶ Run'),
        busy ? h('span.code-hint', 'Python starts in this browser — the first run loads it (it needs the network) and takes a moment') : !s ? h('span.code-hint', 'Choose a script, then run it') : null),
      outEl);
  },
  preview() {
    const txt = CODE.tn('text', true) !== false;
    return [h('div.pv-code', h('div.pv-ch', h('b', 'Bead displacement'), h('i', 'Code')), h('div.pv-cr', h('span', 'Script'), h('em', 'displacement.py')), h('div.pv-cr', h('span', 'Input'), h('em', 'field1.tif'), h('em', 'OD readings.csv')),
      h('div.pv-cf', { html: '<svg viewBox="0 0 120 44" width="120" height="44" aria-hidden="true"><path d="M4 40 L24 30 L44 33 L64 18 L84 22 L104 8 L116 10" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }), txt ? h('div.pv-ct', 'mean shift 0.42 µm (n = 36)') : null),
      PV.cap('Compendiums → Code holds your .py scripts, each with a title and what it does. A component of the Code kind runs one on data from your data trees; the figures it makes, a table named result' + (txt ? ' and what it prints' : '') + ' come back into the component. Python runs in this browser (it loads from the network the first time).')];
  },
};
{
  // the kind: Code (double-click a component's label → Code)
  if (typeof CKINDS !== 'undefined' && !CKINDS.BASE.some(k => k.id === 'code')) CKINDS.BASE.push({ id: 'code', label: 'Code', color: '#5B4FC4', links: [{ rel: 'produces', with: ['result', 'figure', 'evidence', 'any'] }, { rel: 'leads', with: ['any'] }, { rel: 'comments', with: ['any'], in: true }] });
  // its footer: the script, the inputs, Run, the output
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); try { if (!el || !CODE.is(b) || !CODE.on()) return el; const ed = $(':scope > .ed', el); const foot = CODE.foot(b, this, !!this.travel || (typeof M.canEdit === 'function' && !M.canEdit(b))); ed ? ed.after(foot) : el.append(foot); el.classList.add('k-code'); } catch (e) { console.warn('[code] foot', e); } return el; };
  COMP.add({ key: 'code', label: 'Code', order: 50, icon: CODE.ICON, title: 'Your analysis scripts, and the components that run them', desc: 'Your .py scripts, each with a title and what it does — a component of the Code kind runs one on your data.', on: CODE.on,
    count: () => { try { return CODE.all().length; } catch (e) { return null; } }, peek: () => { try { return CODE.all().slice(0, 4).map(r => r.title); } catch (e) { return []; } }, render: () => CODE.render() });
}
