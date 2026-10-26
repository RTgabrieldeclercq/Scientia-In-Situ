/* ==========================================================================
   13i · Data by reference, bindings and provenance.
   Raw data stays where it was created (the microscope's export folder, your
   disk). A dataset record holds only a reference: the folder you granted
   (File System Access handle, kept in the browser), the path inside it,
   size, modified time, a fingerprint of the first and last 4 MB, the
   instrument and the acquisition time. "Rescan" re-checks everything on
   demand; live folder watching is used when the browser offers it.
   Any component can bind to datasets, materials and upstream components
   (+ a code version), which gives the chain
   figure ← pass ← dataset ← experiment step.
   ========================================================================== */
const DATA = {
  CHUNK: 4 * 1024 * 1024,
  INSTR: { nd2: 'Nikon (ND2)', czi: 'Zeiss (CZI)', lif: 'Leica (LIF)', lsm: 'Zeiss (LSM)', oib: 'Olympus (OIB)', oir: 'Olympus (OIR)', vsi: 'Olympus (VSI)', ims: 'Imaris', fcs: 'Flow cytometer (FCS)', xlsx: 'Spreadsheet', csv: 'Table (CSV)', tif: 'TIFF', tiff: 'TIFF', h5: 'HDF5', mat: 'MATLAB', npy: 'NumPy' },
  supported: () => 'showDirectoryPicker' in window,
  roots: () => (settings().dataRoots || []),
  handles: new Map(), perm: new Map(),
  async handle(rootId) {
    if (DATA.handles.has(rootId)) return DATA.handles.get(rootId);
    const r = DB.get('blobs', 'dsroot:' + rootId); if (r && r.handle) DATA.handles.set(rootId, r.handle); return r ? r.handle : null;
  },
  /** Ask for read access again after a reload (needs a click). */
  async allow(rootId, ask = true) {
    const hd = await DATA.handle(rootId); if (!hd) return false;
    let p = await hd.queryPermission({ mode: 'read' }); if (p !== 'granted' && ask) p = await hd.requestPermission({ mode: 'read' });
    DATA.perm.set(rootId, p === 'granted'); return p === 'granted';
  },
  async addRoot() {
    if (!DATA.supported()) return toast('This browser cannot open folders — use Chrome or Edge');
    try {
      const hd = await window.showDirectoryPicker({ mode: 'read', id: 'sis-data' }), id = uid('root');
      DB.put('blobs', { id: 'dsroot:' + id, handle: hd }); DATA.handles.set(id, hd); DATA.perm.set(id, true);
      saveSettings({ dataRoots: [...DATA.roots(), { id, name: hd.name, added: isoLocal(new Date()) }] }); changed(); DATA.watch(); return id;
    } catch (e) { if (e.name !== 'AbortError') toast('Folder refused: ' + e.message); return null; }
  },
  /** Walk a folder (depth-limited) → [{path, handle, file}] */
  async walk(dir, prefix = '', depth = 0, out = [], max = 4000) {
    for await (const [name, h2] of dir.entries()) {
      if (out.length >= max) break; if (name.startsWith('.')) continue;
      const p = prefix ? prefix + '/' + name : name;
      if (h2.kind === 'directory') { if (depth < 6) await DATA.walk(h2, p, depth + 1, out, max); }
      else out.push({ path: p, handle: h2 });
    }
    return out;
  },
  async fileAt(rootId, path) {
    let dir = await DATA.handle(rootId); if (!dir) return null; const parts = path.split('/');
    try { for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p); const fh = await dir.getFileHandle(parts[parts.length - 1]); return await fh.getFile(); } catch { return null; }
  },
  /** SHA-256 of size + first 4 MB + last 4 MB: fast on multi-GB files, and catches nearly every change. */
  async fingerprint(file) {
    const n = file.size, C = DATA.CHUNK, head = await file.slice(0, Math.min(C, n)).arrayBuffer(), tail = n > C ? await file.slice(Math.max(C, n - C), n).arrayBuffer() : new ArrayBuffer(0);
    const sizeB = new TextEncoder().encode(String(n) + ':'), buf = new Uint8Array(sizeB.length + head.byteLength + tail.byteLength);
    buf.set(sizeB, 0); buf.set(new Uint8Array(head), sizeB.length); buf.set(new Uint8Array(tail), sizeB.length + head.byteLength);
    const h2 = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h2)].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  ext: p => ((p.match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase(),
  async register(rootId, entries, { projectId } = {}) {
    let n = 0; const out = [];
    for (const e of entries) {
      const f = e.file || await e.handle.getFile(); const fp = await DATA.fingerprint(f), x = DATA.ext(e.path);
      const dup = DB.where('datasets', d => d.rootId === rootId && d.path === e.path)[0]; if (dup) { out.push(dup); continue; }
      const rec = { id: uid('ds'), projectId: projectId || (DB.all('projects')[0] || {}).id || null, rootId, root: (DATA.roots().find(r => r.id === rootId) || {}).name || '', path: e.path, name: e.path.split('/').pop(),
        size: f.size, mtime: isoLocal(new Date(f.lastModified)), mtimeMs: f.lastModified, fp, fpAlg: 'sha256(size+head4MB+tail4MB)', instrument: DATA.INSTR[x] || '', acquired: isoLocal(new Date(f.lastModified)),
        status: 'ok', lastScan: isoLocal(new Date()), created: isoLocal(new Date()), producedBy: null, note: '' };
      DB.put('datasets', rec); out.push(rec); n++;
    }
    changed(); toast(plural(n, 'dataset') + ' registered — the files stay where they are'); return out;
  },
  /** On demand: check every dataset under a folder; a moved file is found again by size + fingerprint. */
  async rescan(rootId, ask = true, deep = false) {
    if (!(await DATA.allow(rootId, ask))) { toast('Read access to the folder is needed — click Rescan'); return null; }
    const list = DB.where('datasets', d => d.rootId === rootId), now = isoLocal(new Date()); let missing = [], changed_ = 0, moved = 0;
    for (const d of list) {
      const f = await DATA.fileAt(rootId, d.path);
      if (!f) { missing.push(d); continue; }
      const mt = isoLocal(new Date(f.lastModified));
      if (deep || f.size !== d.size || (d.mtimeMs != null ? f.lastModified !== d.mtimeMs : mt !== d.mtime)) { const fp = await DATA.fingerprint(f); const st = fp === d.fp ? 'ok' : 'changed'; if (st === 'changed') changed_++;
        Object.assign(d, { status: st, seenSize: f.size, seenMtime: mt, seenMtimeMs: f.lastModified, seenFp: fp, lastScan: now }); if (st === 'ok') Object.assign(d, { mtime: mt, mtimeMs: f.lastModified }); }
      else Object.assign(d, { status: d.status === 'changed' ? 'changed' : 'ok', lastScan: now });
      DB.put('datasets', d);
    }
    if (missing.length) { const all = await DATA.walk(await DATA.handle(rootId)), bySize = new Map();
      for (const e of all) { try { const f = await e.handle.getFile(); if (!bySize.has(f.size)) bySize.set(f.size, []); bySize.get(f.size).push({ e, f }); } catch { } }
      for (const d of missing) { let hit = null; for (const c of bySize.get(d.size) || []) { if (DB.where('datasets', x => x.rootId === rootId && x.path === c.e.path).length) continue; if (await DATA.fingerprint(c.f) === d.fp) { hit = c; break; } }
        if (hit) { Object.assign(d, { movedFrom: d.path, path: hit.e.path, name: hit.e.path.split('/').pop(), status: 'ok', lastScan: now }); moved++; } else Object.assign(d, { status: 'missing', lastScan: now }); DB.put('datasets', d); } }
    changed(); const miss = list.filter(d => d.status === 'missing').length;
    toast(`Rescanned ${plural(list.length, 'dataset')}: ${list.length - miss - changed_} unchanged${changed_ ? ', ' + changed_ + ' changed' : ''}${moved ? ', ' + moved + ' found after a move' : ''}${miss ? ', ' + miss + ' missing' : ''}`);
    return list;
  },
  async rescanAll() { for (const r of DATA.roots()) await DATA.rescan(r.id); },
  /** Live watching where the browser has it (FileSystemObserver); otherwise Rescan is the way. */
  _obs: null,
  async watch() {
    if (!('FileSystemObserver' in window)) return false;
    try { if (DATA._obs) DATA._obs.disconnect(); const kick = debounce(() => DATA.roots().forEach(r => DATA.rescan(r.id, false)), 3000);
      DATA._obs = new window.FileSystemObserver(() => kick());
      for (const r of DATA.roots()) { const hd = await DATA.handle(r.id); if (hd && (await hd.queryPermission({ mode: 'read' })) === 'granted') await DATA._obs.observe(hd, { recursive: true }); }
      return true; } catch { return false; }
  },
  fmtSize(n) { if (n == null) return '—'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 2 : 1) : n) + ' ' + u[i]; },
  chip(ds, onX) {
    const st = ds.status || 'unverified';
    return h('button.dschip.st-' + st, { title: `${ds.root}/${ds.path}\n${DATA.fmtSize(ds.size)} · ${ds.instrument || 'unknown instrument'} · acquired ${fmtDay(ds.acquired)}\nstatus: ${st}${ds.lastScan ? ' (scanned ' + fmtWhen(ds.lastScan) + ')' : ''}`, on: { click: e => { e.stopPropagation(); onX ? onX(e) : DATA.detail(ds); } } }, '⛁ ', snippet(ds.name, 28), st !== 'ok' ? h('b', ' · ' + st) : null);
  },
  /** One dataset: what it is, where it came from (the experiment step that produced it) and who used it. */
  detail(ds) {
    const users = DB.where('blocks', b => b.status !== 'removed' && ((b.binds || {}).datasets || []).includes(ds.id)), prod = ds.producedBy && M.block(ds.producedBy);
    const inp = (k, ph) => h('input.inp', { value: ds[k] || '', placeholder: ph, on: { change: e => { ds[k] = e.target.value.trim(); DB.put('datasets', ds); changed(); } } });
    const m = modal({ title: ds.name, wide: true, body: h('div',
      h('dl.kv', h('dt', 'where'), h('dd.mono', ds.root + '/' + ds.path), h('dt', 'size'), h('dd', DATA.fmtSize(ds.size)), h('dt', 'modified'), h('dd', fmtDayLong(ds.mtime) + ' ' + fmtTime(ds.mtime)),
        h('dt', 'fingerprint'), h('dd.mono.tiny', (ds.fp || '').slice(0, 24) + '… ', h('span.muted', ds.fpAlg || '')), h('dt', 'status'), h('dd', h('span.pill.st-' + (ds.status || 'unverified'), ds.status || 'unverified'), ds.lastScan ? ' scanned ' + fmtWhen(ds.lastScan) : '', ds.movedFrom ? ' · found after a move from ' + ds.movedFrom : ''),
        ds.status === 'changed' ? [h('dt', 'now'), h('dd', `${DATA.fmtSize(ds.seenSize)} · ${fmtWhen(ds.seenMtime)} — the file differs from when it was registered. `, h('button.btn.xs', { on: { click: () => { Object.assign(ds, { size: ds.seenSize, mtime: ds.seenMtime, mtimeMs: ds.seenMtimeMs, fp: ds.seenFp, status: 'ok', reaccepted: isoLocal(new Date()) }); DB.put('datasets', ds); changed(); m.close(); } } }, 'Accept the new version'))] : null),
      h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', 'Instrument'), inp('instrument', 'e.g. Nikon Ti2 spinning disk')), h('label.f', h('span', 'Acquired'), h('input.inp', { type: 'datetime-local', value: (ds.acquired || '').slice(0, 16), on: { change: e => { ds.acquired = isoLocal(new Date(e.target.value)); DB.put('datasets', ds); changed(); } } })),
        h('label.f', h('span', 'Project'), h('select.inp', { on: { change: e => { ds.projectId = e.target.value; DB.put('datasets', ds); changed(); } } }, DB.all('projects').map(p => h('option', { value: p.id, selected: p.id === ds.projectId }, p.name)))), h('label.f', h('span', 'Note'), inp('note', 'Optional'))),
      h('div.ins-s', h('h6', 'Produced by'), prod ? h('div.row', h('a', { on: { click: e => { m.close(); App.jump(prod.id, e); } } }, M.blockName(prod)), h('span.tiny.muted', M.docPath(M.doc(prod.docId))), h('button.btn.xs', { on: { click: () => { ds.producedBy = null; DB.put('datasets', ds); changed(); m.close(); DATA.detail(ds); } } }, 'Unlink')) : h('div.tiny.muted', 'Which experiment step made this file?'),
        h('button.btn.sm', { style: { marginTop: '6px' }, on: { click: () => BINDS.pickComponent('Produced by which step?', b => { ds.producedBy = b.id; DB.put('datasets', ds); changed(); m.close(); DATA.detail(ds); }, b => prof((M.doc(b.docId) || {}).type).steps || b.kind === 'run') } }, prod ? 'Change…' : 'Link the step…')),
      h('div.ins-s', h('h6', 'Used by', h('span.muted', users.length)), users.length ? users.map(b => h('div.row', h('a', { on: { click: e => { m.close(); App.jump(b.id, e); } } }, M.blockName(b)), h('span.tiny.muted', M.docPath(M.doc(b.docId)) + ((b.binds || {}).code ? ' · code ' + b.binds.code.slice(0, 10) : '')))) : h('div.tiny.muted', 'No analysis pass is bound to it yet.'))),
      actions: [{ label: 'Close' }] });
  },
};

/* ---------------- bindings on any component: datasets, materials, upstream components, code version ---------------- */
const BINDS = {
  of: b => b.binds || {},
  set(b, patch) { b.binds = Object.assign({}, b.binds, patch); b.modified = isoLocal(new Date()); DB.put('blocks', b); changed(); },
  pickComponent(title, cb, filter) {
    const m = modal({ title, wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search components…', sort: 'comp-' + title,
      items: q => DB.where('blocks', b => b.status === 'live' && (b.kind === 'component' || b.kind === 'run') && (!filter || filter(b)) && (!q || (M.blockName(b) + ' ' + (b.body.text || '') + ' ' + ((M.doc(b.docId) || {}).title || '')).toLowerCase().includes(q))),
      section: b => prof((M.doc(b.docId) || {}).type).label, render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body.text, 60)), h('span.s', M.docPath(M.doc(b.docId)))), onPick: b => { m.close(); cb(b); } }) });
  },
  dialog(b) {
    const d = M.doc(b.docId), B = Object.assign({ datasets: [], resources: [], from: [], code: '' }, b.binds);
    let tab = 'datasets'; const host = h('div'), cur = h('div.bind-cur');
    const drawCur = () => cur.replaceChildren(
      ...B.datasets.map(id => DB.get('datasets', id)).filter(Boolean).map(ds => h('span.bchip', '⛁ ' + snippet(ds.name, 30), h('button', { on: { click: () => { B.datasets = B.datasets.filter(x => x !== ds.id); drawCur(); } } }, '×'))),
      ...B.resources.map(M.doc).filter(Boolean).map(r => h('span.bchip.res', '◇ ' + snippet(MATS.label(r), 30), h('button', { on: { click: () => { B.resources = B.resources.filter(x => x !== r.id); drawCur(); } } }, '×'))),
      ...B.from.map(M.block).filter(Boolean).map(x => h('span.bchip.from', '⟵ ' + snippet(M.blockName(x), 30), h('button', { on: { click: () => { B.from = B.from.filter(y => y !== x.id); drawCur(); } } }, '×'))),
      !(B.datasets.length + B.resources.length + B.from.length) ? h('span.tiny.muted', 'Nothing bound yet.') : null);
    const pickers = {
      datasets: () => optionPicker({ placeholder: 'Search datasets by name, folder, instrument…', sort: 'bind-ds', items: q => DB.where('datasets', x => !B.datasets.includes(x.id) && (!q || (x.path + ' ' + x.root + ' ' + (x.instrument || '')).toLowerCase().includes(q))),
        section: x => x.projectId === d.projectId ? 'This project' : 'Other projects', render: x => h('div', h('b', x.name), ' ', h('span.pill.st-' + (x.status || 'unverified'), x.status || '?'), h('span.s', `${x.root}/${x.path} · ${DATA.fmtSize(x.size)} · ${x.instrument || '—'} · ${fmtDay(x.acquired)}`)),
        emptyText: DATA.roots().length ? 'No dataset matches — register files in Data' : 'No datasets yet — add a data folder in Data', onPick: x => { B.datasets.push(x.id); drawCur(); draw(); } }),
      resources: () => optionPicker({ placeholder: 'Search materials: cell lines, antibodies, gel batches…', sort: 'bind-res', items: q => MATS.all().filter(r => !B.resources.includes(r.id) && (!q || (MATS.label(r) + ' ' + JSON.stringify(r.header || {})).toLowerCase().includes(q))),
        section: r => (r.header || {}).kind || 'other', render: r => h('div', h('b', MATS.label(r)), h('span.s', MATS.sub(r))), emptyText: 'No materials yet — add one in Materials', onPick: r => { B.resources.push(r.id); drawCur(); draw(); } }),
      from: () => optionPicker({ placeholder: 'Search components this one is made from (an analysis pass, a figure…)', sort: 'bind-from', items: q => DB.where('blocks', x => x.id !== b.id && x.status === 'live' && x.kind === 'component' && !B.from.includes(x.id) && (!q || (M.blockName(x) + ' ' + x.body.text + ' ' + ((M.doc(x.docId) || {}).title || '')).toLowerCase().includes(q))),
        section: x => prof((M.doc(x.docId) || {}).type).label, render: x => h('div', h('b', M.blockName(x)), ' ', h('span.serif', snippet(x.body.text, 50)), h('span.s', M.docPath(M.doc(x.docId)))), onPick: x => { B.from.push(x.id); drawCur(); draw(); } }),
    };
    const tabs = h('div.seg'), draw = () => { tabs.replaceChildren(...[['datasets', '⛁ Datasets'], ['resources', '◇ Materials'], ['from', '⟵ Made from']].map(([k, l]) => h('button' + (tab === k ? '.on' : ''), { on: { click: () => { tab = k; draw(); } } }, l))); host.replaceChildren(pickers[tab]()); };
    const code = h('input.inp.mono', { value: B.code || '', placeholder: 'Code version — a commit hash, tag or script@version' });
    draw(); drawCur();
    modal({ title: 'Data, materials and code for “' + snippet(M.blockName(b), 40) + '”', wide: true, body: h('div', h('div.tiny.muted', { style: { marginBottom: '8px' } }, 'Binding builds the provenance chain: figure ← pass ← dataset ← experiment step. The files themselves stay where they are.'),
      cur, h('label.f', { style: { margin: '10px 0' } }, h('span', 'Code version'), code), tabs, h('div', { style: { height: '8px' } }), host),
      actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => { B.code = code.value.trim(); BINDS.set(b, B); } }] });
  },
  chips(b) {
    const B = BINDS.of(b), out = [];
    (B.datasets || []).map(id => DB.get('datasets', id)).filter(Boolean).forEach(ds => out.push(DATA.chip(ds)));
    (B.resources || []).map(M.doc).filter(Boolean).forEach(r => out.push(h('button.dschip.res', { title: MATS.sub(r) + ' · Alt+click: beside', on: { click: e => { e.stopPropagation(); App.jump(r.id, e, true); } } }, '◇ ', snippet(MATS.label(r), 28))));
    (B.from || []).map(M.block).filter(Boolean).forEach(x => out.push(h('button.dschip.from', { title: 'Made from · ' + M.docPath(M.doc(x.docId)), on: { click: e => { e.stopPropagation(); App.jump(x.id, e); } } }, '⟵ ', snippet(M.blockName(x), 26))));
    if (B.code) out.push(h('span.dschip.code', { title: 'Code version' }, '⌥ ', B.code.slice(0, 12)));
    return out;
  },
};

/* ---------------- provenance: walk back from any component ---------------- */
const PROV = {
  /** Tree of {kind, label, sub, id, jump, children}. figure ← pass ← dataset ← step ← protocol, with materials. */
  chain(blockId, seen = new Set(), depth = 0) {
    const b = M.block(blockId); if (!b || seen.has('b:' + b.id) || depth > 8) return null; seen.add('b:' + b.id);
    const d = M.doc(b.docId), B = BINDS.of(b), kids = [];
    (B.from || []).forEach(id => { const n = PROV.chain(id, seen, depth + 1); if (n) kids.push(n); });
    (B.datasets || []).map(id => DB.get('datasets', id)).filter(Boolean).forEach(ds => { if (seen.has('d:' + ds.id)) return; seen.add('d:' + ds.id);
      const dk = []; if (ds.producedBy) { const n = PROV.chain(ds.producedBy, seen, depth + 1); if (n) dk.push(n); }
      kids.push({ kind: 'dataset', label: ds.name, sub: `${ds.root}/${ds.path} · ${DATA.fmtSize(ds.size)} · ${ds.instrument || 'instrument —'} · acquired ${fmtDay(ds.acquired)} · ${ds.status || 'unverified'} · fp ${(ds.fp || '').slice(0, 12)}`, ds, children: dk }); });
    const mats = [...new Set([...(B.resources || []), ...((d && d.materials) || [])])].map(M.doc).filter(Boolean);
    mats.forEach(r => kids.push({ kind: 'material', label: MATS.label(r), sub: MATS.sub(r), id: r.id, isDoc: true, children: [] }));
    if (b.kind === 'run') { const def = M.block(b.protocolId); if (def) kids.push({ kind: 'protocol', label: def.label, sub: 'protocol' + (def.modified ? ' · last changed ' + fmtDay(def.modified) : ''), id: def.id, children: [] }); }
    if (b.boundTo) { const pd = M.doc(b.boundTo.protocolId); if (pd) kids.push({ kind: 'protocol', label: pd.title, sub: 'protocol step', id: b.boundTo.componentId, children: [] }); }
    return { kind: prof(d.type).label.toLowerCase(), label: M.blockName(b), sub: M.docPath(d) + (B.code ? ' · code ' + B.code : ''), id: b.id, b, children: kids };
  },
  has: b => { const B = BINDS.of(b); return !!((B.datasets || []).length || (B.from || []).length || (B.resources || []).length); },
  tree(n, live = true) {
    if (!n) return null;
    return h('div.pv', h('div.pv-n.k-' + n.kind.replace(/\W/g, ''), h('span.pv-k', n.kind), live && (n.id || n.ds) ? h('a', { on: { click: e => n.ds ? DATA.detail(n.ds) : App.jump(n.id, e, n.isDoc) } }, n.label) : h('b', n.label), h('div.tiny.muted', n.sub)),
      n.children.length ? h('div.pv-c', n.children.map(c => PROV.tree(c, live))) : null);
  },
  /** §16.8 — read-only HTML of one component's provenance, with the component texts. */
  export(blockId) {
    const n = PROV.chain(blockId), b = M.block(blockId); if (!n) return;
    const blocks = []; const walk = x => { if (x.b) blocks.push(x.b); x.children.forEach(walk); }; walk(n);
    const body = h('div', h('h3.lab', 'Chain'), PROV.tree(n, false), h('h3.lab', 'Components'), ...blocks.map(x => { const ed = h('div.ed'); ED.render(ed, x); return h('div.blk', h('div.bh', h('b', M.blockName(x)), h('span.tiny.muted', ' · ' + M.docPath(M.doc(x.docId)))), ed); }));
    Exporter.download('provenance-' + Exporter.slug(M.blockName(b)) + '.html', Exporter.page('Provenance · ' + M.blockName(b), 'Read-only provenance chain', body.outerHTML)); toast('Provenance exported');
  },
};

/* ---------------- the Data page ---------------- */
const DataView = {
  title: true, q: '',
  render() {
    const roots = DATA.roots(), all = DB.all('datasets');
    App.setTitle('Data', [h('span', plural(all.length, 'dataset') + ' by reference · ' + plural(roots.length, 'folder'))]);
    const list = h('div'), q = h('input.inp', { type: 'search', placeholder: 'Filter by name, path, instrument…', value: DataView.q, on: { input: debounce(e => { DataView.q = e.target.value; draw(); }, 120) } });
    const draw = () => { const k = DataView.q.toLowerCase(); list.replaceChildren(...(roots.length ? roots.map(r => { const ds = all.filter(d => d.rootId === r.id && (!k || (d.path + ' ' + (d.instrument || '')).toLowerCase().includes(k))).sort((a, b) => (b.acquired || '').localeCompare(a.acquired || ''));
        return h('div.card.flat.dsroot', h('div.row', h('b', '📁 ' + r.name), h('span.tiny.muted', plural(ds.length, 'dataset')), h('span.spacer'),
          h('button.btn.sm', { on: { click: () => DataView.browse(r.id) } }, 'Register files…'), h('button.btn.sm', { title: 'Size and modified time; fingerprints only where those changed', on: { click: () => DATA.rescan(r.id) } }, '⟳ Rescan'), h('button.btn.sm.ghost', { title: 'Re-read the first and last 4 MB of every file — catches edits that kept size and date', on: { click: () => DATA.rescan(r.id, true, true) } }, 'Verify fingerprints')),
          ds.length ? h('table.t.dst', h('thead', h('tr', ['Dataset', 'Size', 'Instrument', 'Acquired', 'Status', 'Produced by', 'Used by'].map(x => h('th', x)))),
            h('tbody', ds.map(d => { const users = DB.where('blocks', b => b.status !== 'removed' && ((b.binds || {}).datasets || []).includes(d.id)), pb = d.producedBy && M.block(d.producedBy);
              return h('tr', { on: { click: () => DATA.detail(d) } }, h('td', h('b', d.name), h('div.tiny.muted.mono', d.path)), h('td.mono', DATA.fmtSize(d.size)), h('td', d.instrument || '—'), h('td.mono.tiny', fmtDay(d.acquired) + ' ' + fmtTime(d.acquired)),
                h('td', h('span.pill.st-' + (d.status || 'unverified'), d.status || 'unverified')), h('td.tiny', pb ? M.blockName(pb) : '—'), h('td.tiny', users.length ? users.map(u => M.blockName(u)).join(', ') : '—')); }))) : h('div.empty', 'Nothing registered from this folder yet.'));
      }) : [h('div.empty', DATA.supported() ? 'Add the folder your instrument exports to. Nothing is copied: the app keeps a reference and checks the files when you rescan.' : 'This browser cannot open folders (File System Access). Use Chrome or Edge on this computer.')]));
    };
    draw();
    return h('div.page', h('div.eyebrow', 'Provenance'), h('h1.title', 'Data'),
      h('p.stand', 'Raw data stays where it was created. Each dataset here is a reference — the folder, the path inside it, size, modified time and a fingerprint of the first and last 4 MB — so multi-gigabyte files are never copied. Bind an analysis pass to a dataset and a code version to complete figure ← pass ← dataset ← experiment step.'),
      h('div.row', { style: { margin: '10px 0 14px' } }, h('button.btn.pri', { on: { click: () => DATA.addRoot() } }, '+ Add a data folder'), roots.length ? h('button.btn', { on: { click: () => DATA.rescanAll() } }, '⟳ Rescan all') : null, h('span.spacer'),
        h('span.tiny.muted', 'FileSystemObserver' in window ? 'Live watching is on for granted folders.' : 'Changes are picked up when you rescan.')), q, h('div', { style: { height: '10px' } }), list);
  },
  async browse(rootId) {
    if (!(await DATA.allow(rootId))) return toast('Read access is needed to list the folder');
    toast('Listing the folder…'); const files = await DATA.walk(await DATA.handle(rootId)); const known = new Set(DB.where('datasets', d => d.rootId === rootId).map(d => d.path));
    let filter = '', sel = new Set(); const proj = h('select.inp', DB.all('projects').map(p => h('option', { value: p.id }, p.name)));
    const list = h('div.dsbrowse'), count = h('span.tiny.muted');
    const draw = () => { const k = filter.toLowerCase(), rows = files.filter(f => !k || f.path.toLowerCase().includes(k)).slice(0, 600);
      list.replaceChildren(...rows.map(f => h('label.dsrow' + (known.has(f.path) ? '.known' : ''), h('input', { type: 'checkbox', disabled: known.has(f.path), checked: sel.has(f.path), on: { change: e => { e.target.checked ? sel.add(f.path) : sel.delete(f.path); count.textContent = plural(sel.size, 'file') + ' selected'; } } }),
        h('span.mono', f.path), known.has(f.path) ? h('span.pill', 'registered') : DATA.INSTR[DATA.ext(f.path)] ? h('span.pill.teal', DATA.INSTR[DATA.ext(f.path)]) : null)));
      if (files.length > rows.length) list.append(h('div.tiny.muted', `${files.length - rows.length} more — narrow the filter`)); };
    const fi = h('input.inp', { type: 'search', placeholder: 'Filter, e.g. .nd2 or 2026-10', on: { input: e => { filter = e.target.value; draw(); } } });
    draw();
    modal({ title: 'Register files from “' + ((DATA.roots().find(r => r.id === rootId) || {}).name) + '”', wide: true,
      body: h('div', h('div.row', fi, h('button.btn.sm', { on: { click: () => { files.filter(f => !known.has(f.path) && (!filter || f.path.toLowerCase().includes(filter.toLowerCase()))).forEach(f => sel.add(f.path)); draw(); count.textContent = plural(sel.size, 'file') + ' selected'; } } }, 'Select all shown'), h('label.f', h('span', 'Project'), proj)), count, list),
      actions: [{ label: 'Cancel' }, { label: 'Register', pri: true, run: async () => { if (!sel.size) return; toast('Fingerprinting ' + plural(sel.size, 'file') + '…'); await DATA.register(rootId, files.filter(f => sel.has(f.path)), { projectId: proj.value }); } }] });
  },
};
VIEWS.data = DataView;
