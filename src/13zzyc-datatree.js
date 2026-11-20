/* ==========================================================================
   13zzyc · The data tree (V4.28). Gabe (18 Nov 2026): "Remove the data tab.
   Instead, data used in the experiment gets logged in the note component as
   a list of folders or files as a directory, appearing as a data tree."
   - b.dtree = { items: [entry], mig: [datasetId] } lives on the component,
     so it syncs with the note (the datasets store never leaves a computer).
     An entry: { id, n (its name), dir: 1 and k: [entries] (and more: how
     many were not listed) | s (bytes) and m (modified, ms), at (logged, top
     level), via ('folder' | 'files' | 'drop' | 'dataset'), root (an old
     dataset's folder), h: 1 when a device kept the folder's handle, ds (the
     dataset it came from), st ('new' | 'changed' | 'gone', after a rescan,
     until accepted) and was ({ s, m }) }.
   - Drawn under the component's text: folders and files indented, sizes and
     dates, and per folder "12 files · 3.4 GB". A click folds or unfolds a
     folder (kept on this device). A folder you log shows its first level
     (Settings: or only its name); the folders inside it start folded —
     nothing opens by itself. A folder with more than 12 entries shows the
     first 12 and "+ n more". × removes an entry (Undo brings it back);
     the full path is in each row's tooltip.
   - Ways in: ⋯ → Log data… (a folder, or files); /data (this component, or
     a new "Data" component, from the text or the navigation bar); dropping files or
     folders from Explorer / Finder on the tree, on a component with Alt
     held, or — when the drop holds a folder — anywhere on a component, or
     on the paper (a new "Data" component there). Files alone dropped on the
     paper stay what they were (images, PDFs, pages: 13zzs).
   - The listing is what was there when it was logged: names, places, sizes,
     dates — nothing is copied (up to 1500 entries, six folders deep). Where
     the browser lets the app keep the folder (Chrome / Edge on a computer:
     the handle stays on this device, in blobs, like DATA's folders), ⟳
     Rescan reads it again and marks what is new, changed or gone until you
     accept it; elsewhere the tree says it is as logged on that day.
   - What was bound before (⋯ → Data, materials & code…: the datasets of the
     old Data tab, and a dataset's "produced by" step) comes into that
     component's tree once, on the computer that registered it, grouped by
     folder; the bindings stay for provenance. The old page still opens at
     #/data and with /datasets.
   Settings → Widgets → Data tree (datatree, 20a).
   ========================================================================== */
const DTREE = {
  MAX: 1500, DEPTH: 6, SHOW: 12,
  PATHS: {
    folder: '<path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"/>',
    open: '<path d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"/>',
    file: '<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>',
    rescan: '<path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>',
    chev: '<path d="m8.25 4.5 7.5 7.5-7.5 7.5"/>',
    tree: '<path d="M3.75 4.5h6M3.75 4.5v13.5h6M3.75 11.25h6M13.5 4.5h6.75M13.5 11.25h6.75M13.5 18h6.75"/>',
  },
  STW: { new: 'new since it was logged', changed: 'changed since it was logged', gone: 'no longer in the folder' },
  on: () => typeof FEAT === 'undefined' || FEAT.on('datatree'),
  firstOpen: () => { try { return FEAT.tune('datatree', 'open') !== 'none'; } catch (e) { return true; } },
  can: b => !!b && (b.kind === 'component' || b.kind === 'run') && b.status !== 'removed',
  items: b => (b && b.dtree && Array.isArray(b.dtree.items)) ? b.dtree.items : [],
  shows: b => !!(b && b.dtree && Array.isArray(b.dtree.items)),
  svg(k, sz = 14) { const p = DTREE.PATHS[k]; return p ? '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>' : ''; },
  ico(k, cls, sz) { const s = h('span.' + (cls || 'dt-ic'), { 'data-ico': k }); s.innerHTML = DTREE.svg(k, sz); return s; },

  /* ---------- the listing ---------- */
  sort(list) { return list.sort((a, b) => (!!b.dir - !!a.dir) || String(a.n).localeCompare(String(b.n), undefined, { numeric: true, sensitivity: 'base' })); },
  sortAll(list) { DTREE.sort(list); list.forEach(x => { if (x.dir) DTREE.sortAll(x.k || (x.k = [])); }); return list; },
  /** A folder (FileSystemDirectoryHandle), six folders deep, up to MAX entries in all (cnt is shared across one logging). */
  async fromDir(dh, cnt = { n: 0 }, depth = 0) {
    const e = { n: dh.name, dir: 1, k: [] }; let more = 0;
    try {
      for await (const [name, ch] of dh.entries()) {
        if (!name || name.startsWith('.')) continue;
        if (cnt.n >= DTREE.MAX) { more++; continue; }
        cnt.n++;
        if (ch.kind === 'directory') e.k.push(depth < DTREE.DEPTH - 1 ? await DTREE.fromDir(ch, cnt, depth + 1) : { n: name, dir: 1, k: [], deep: 1 });
        else { try { const f = await ch.getFile(); e.k.push({ n: name, s: f.size, m: f.lastModified }); } catch (er) { e.k.push({ n: name }); } }
      }
    } catch (er) { e.err = 1; }
    if (more) e.more = more; DTREE.sort(e.k); return e;
  },
  /** A handle of either kind; a file whose file is gone gives null. */
  async fromHandle(hd, cnt) {
    if (!hd) return null;
    if (hd.kind === 'directory') return DTREE.fromDir(hd, cnt || { n: 0 });
    try { const f = await hd.getFile(); return { n: hd.name || f.name, s: f.size, m: f.lastModified }; } catch (er) { return null; }
  },
  /** A dropped folder or file read the older way (webkitGetAsEntry). */
  async fromEntry(en, cnt = { n: 0 }, depth = 0) {
    if (!en) return null;
    if (en.isFile) { const f = await new Promise(r => { try { en.file(r, () => r(null)); } catch (er) { r(null); } }); return f ? { n: en.name, s: f.size, m: f.lastModified } : { n: en.name }; }
    const e = { n: en.name, dir: 1, k: [] }, all = []; let more = 0;
    try { const rd = en.createReader(); for (;;) { const batch = await new Promise(r => rd.readEntries(r, () => r([]))); if (!batch.length) break; all.push(...batch); if (all.length > DTREE.MAX * 2) break; } } catch (er) { e.err = 1; }
    for (const c of all) {
      if (!c.name || c.name.startsWith('.')) continue;
      if (cnt.n >= DTREE.MAX) { more++; continue; }
      cnt.n++;
      e.k.push(c.isDirectory && depth >= DTREE.DEPTH - 1 ? { n: c.name, dir: 1, k: [], deep: 1 } : await DTREE.fromEntry(c, cnt, depth + 1));
    }
    if (more) e.more = more; DTREE.sort(e.k); return e;
  },
  /** Files from a file window (<input>; with webkitdirectory each carries its place in the folder). */
  fromFiles(files) {
    const top = [], dirs = new Map(); let n = 0, more = 0;
    const listAt = parts => { let list = top, key = ''; for (const p of parts) { key += '/' + p; let d = dirs.get(key); if (!d) { d = { n: p, dir: 1, k: [] }; dirs.set(key, d); list.push(d); } list = d.k; } return list; };
    for (const f of files) {
      const rel = String(f.webkitRelativePath || f.name || '').split('/').filter(Boolean), name = rel.pop() || f.name;
      if (!name || name.startsWith('.')) continue;
      if (n >= DTREE.MAX) { more++; continue; } n++;
      listAt(rel).push({ n: name, s: f.size, m: f.lastModified });
    }
    DTREE.sortAll(top); if (more && top.length === 1 && top[0].dir) top[0].more = more;
    return top;
  },
  count(list) {
    const c = { dirs: 0, files: 0, bytes: 0, more: 0 };
    const walk = l => (l || []).forEach(e => { if (e.dir) { c.dirs++; c.more += e.more || 0; walk(e.k); } else { c.files++; c.bytes += e.s || 0; } });
    walk(list); return c;
  },
  /** "2 folders · 41 files · 3.4 GB"; a folder's row leaves its folders out. */
  say(c, row) { if (row && !c.files && !c.more) return c.dirs ? plural(c.dirs, 'folder') : 'empty'; const p = []; if (c.dirs && !row) p.push(plural(c.dirs, 'folder')); p.push(plural(c.files, 'file') + (c.more ? ' +' + c.more : '')); if (c.bytes) p.push(DATA.fmtSize(c.bytes)); return p.join(' · '); },

  /* ---------- the handles this device kept (never synced) ---------- */
  hmap: new Map(),
  keep(id, hd) { DTREE.hmap.set(id, hd); const q = DB.quiet; DB.quiet = true; try { DB.put('blobs', { id: 'dth:' + id, handle: hd }); } catch (e) { } finally { DB.quiet = q; } },
  handle(id) { if (DTREE.hmap.has(id)) return DTREE.hmap.get(id); const r = DB.get('blobs', 'dth:' + id); return (r && r.handle) || null; },

  /* ---------- writing the tree ---------- */
  /** One undo step: a change to a component's tree and the moves it causes after (the note settles — what is below it comes up or goes
      down, in later groups of their own), merged as 13zz4 merges a split. Only groups that move other components are taken in. */
  oneStep(at, bid) {
    setTimeout(() => {
      const S = DB.undoStack, mine = S[at]; if (!mine || !mine.entries.some(e => e.store === 'blocks' && e.id === bid)) return;
      const LAY = new Set(['x', 'y', 'shift', 'auto', 'modified']);
      const layout = g => g.entries.length && g.entries.every(e => { if (e.store !== 'blocks' || e.id === bid || !e.prev) return false; const cur = DB.get('blocks', e.id) || {};
        return Object.keys(Object.assign({}, e.prev, cur)).every(k => LAY.has(k) || JSON.stringify(e.prev[k]) === JSON.stringify(cur[k])); });
      let j = at + 1; while (j < S.length && layout(S[j])) j++;
      if (j === at + 1) return;
      const steps = S.splice(at, j - at); S.splice(at, 0, { group: steps[steps.length - 1].group, label: 'data tree', entries: steps.flatMap(g => g.entries) });
    }, 1100);
  },
  /** Write the component (a new undo group), and merge what the note's settling moves into it. */
  save(cur) { DB.beginGroup('data tree'); const at = DB.undoStack.length; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); DTREE.oneStep(at, cur.id); },
  /** Log top-level entries in a component (an entry of the same name and kind is replaced: logged again). */
  log(b, entries, via, handles = []) {
    const cur = b && M.block(b.id); entries = (entries || []).filter(Boolean); if (!cur || !entries.length) return null;
    const T = DTREE.shows(cur) ? cur.dtree : { items: [] }, at = isoLocal(new Date()); let upd = 0;
    entries.forEach((e, i) => {
      e.id = uid('dt'); e.at = at; e.via = via; const hd = handles[i]; if (hd) { DTREE.keep(e.id, hd); e.h = 1; }
      const j = T.items.findIndex(x => x.n === e.n && !!x.dir === !!e.dir && !x.root);
      if (j >= 0) { T.items[j] = e; upd++; } else T.items.push(e);
    });
    cur.dtree = Object.assign({}, T, { items: T.items }); DTREE.save(cur);
    toast('Logged in “' + snippet(M.blockName(cur), 30) + '”: ' + DTREE.say(DTREE.count(entries)) + (upd ? ' · ' + upd + ' logged again' : '') + ' — nothing was copied', 4200);
    return cur;
  },
  /** The entry at a path ("Run 3/beads/field01.nd2") under its top-level entry, with the list holding it. */
  find(cur, path, topId) {
    const items = DTREE.items(cur), top = items.find(x => x.id === topId); if (!top) return null;
    const parts = String(path).split('/'); if (parts.length === 1) return { e: top, list: items };
    let list = top.k || [];
    for (const p of parts.slice(1, -1)) { const d = list.find(x => x.dir && x.n === p); if (!d) return null; list = d.k || (d.k = []); }
    const e = list.find(x => x.n === parts[parts.length - 1]); return e ? { e, list } : null;
  },
  remove(b, path, topId) {
    const cur = M.block(b.id), f = cur && DTREE.find(cur, path, topId); if (!f) return;
    f.list.splice(f.list.indexOf(f.e), 1); DTREE.save(cur);
    toast('“' + snippet(f.e.n, 40) + '” is no longer in the data tree — Undo brings it back');
  },
  /** The empty tree goes (the component stays). */
  drop(b) { const cur = M.block(b.id); if (!cur || !cur.dtree) return; delete cur.dtree; DTREE.save(cur); },
  /** A new component labelled "Data", holding an empty tree, at p on the note. */
  makeAt(d, p) {
    const b = M.addBlock(d.id, null, { kind: 'component', label: 'Data', x: Math.round((p.x || 0) / 14) * 14, y: Math.round((p.y || 0) / 14) * 14, w: 392 });
    const cur = M.block(b.id) || b; cur.dtree = { items: [] }; DB.put('blocks', cur); changed(); return cur;
  },

  /* ---------- rescan: what is new, changed or gone ---------- */
  mark: (e, st) => { e.st = st; return e; },
  /** Merge a fresh listing into the logged one (in place); counts what moved. */
  diff(old, fresh) {
    const out = { nw: 0, ch: 0, gone: 0 };
    if (!old.dir) {
      if (fresh.s !== old.s || fresh.m !== old.m) { if (!old.st || old.st === 'gone') { old.was = { s: old.s, m: old.m }; old.st = 'changed'; } old.s = fresh.s; old.m = fresh.m; out.ch++; }
      else if (old.st === 'gone') delete old.st;
      return out;
    }
    const kids = old.k || (old.k = []), key = x => x.n + (x.dir ? '/' : ''), by = new Map(kids.map(x => [key(x), x])), seen = new Set();
    for (const f of fresh.k || []) {
      const o = by.get(key(f)); seen.add(key(f));
      if (!o) { kids.push(DTREE.mark(f, 'new')); out.nw++; continue; }
      if (o.st === 'gone') delete o.st;
      const d = DTREE.diff(o, f); out.nw += d.nw; out.ch += d.ch; out.gone += d.gone;
    }
    for (const [k, o] of by) if (!seen.has(k)) { if (o.st === 'new') kids.splice(kids.indexOf(o), 1); else if (o.st !== 'gone') { o.st = 'gone'; out.gone++; } }
    if (fresh.more) old.more = fresh.more; else delete old.more;
    DTREE.sort(kids); return out;
  },
  pending(list) { let n = 0; const walk = l => (l || []).forEach(e => { if (e.st) n++; if (e.dir) walk(e.k); }); walk(list); return n; },
  /** Read every top-level entry whose handle this device kept, again. Needs a click (the browser asks for read access after a restart). */
  async rescan(b) {
    const cur = M.block(b.id); if (!cur || !DTREE.shows(cur)) return null;
    const tot = { nw: 0, ch: 0, gone: 0 }; let read = 0, cannot = 0;
    for (const e of DTREE.items(cur)) {
      const hd = e.h ? DTREE.handle(e.id) : null; if (!hd) { cannot++; continue; }
      try { let p = hd.queryPermission ? await hd.queryPermission({ mode: 'read' }) : 'granted'; if (p !== 'granted' && hd.requestPermission) p = await hd.requestPermission({ mode: 'read' }); if (p !== 'granted') { cannot++; continue; } } catch (er) { cannot++; continue; }
      const fresh = await DTREE.fromHandle(hd);
      if (!fresh) { if (e.st !== 'gone') { e.st = 'gone'; tot.gone++; } read++; continue; }
      const d = DTREE.diff(e, fresh); tot.nw += d.nw; tot.ch += d.ch; tot.gone += d.gone; e.seen = isoLocal(new Date()); read++;
    }
    if (read) DTREE.save(cur);
    const moved = tot.nw + tot.ch + tot.gone;
    toast(!read ? 'This device cannot read the folder again — the tree is as it was logged' : (moved ? [tot.nw ? tot.nw + ' new' : '', tot.ch ? tot.ch + ' changed' : '', tot.gone ? tot.gone + ' gone' : ''].filter(Boolean).join(', ') + ' — marked until you accept them' : 'Nothing changed since it was logged') + (cannot ? ' · ' + plural(cannot, 'entry', 'entries') + ' this device cannot read' : ''), 4200);
    return tot;
  },
  /** Accept what a rescan marked: the gone leave, the marks go. */
  accept(b) {
    const cur = M.block(b.id); if (!cur || !DTREE.shows(cur)) return;
    const clean = l => l.filter(e => e.st !== 'gone').map(e => { delete e.st; delete e.was; if (e.dir) e.k = clean(e.k || []); return e; });
    cur.dtree.items = clean(cur.dtree.items); DTREE.save(cur); toast('Accepted — the tree is the folder as it is now');
  },

  /* ---------- the ways in ---------- */
  async pickFolder(b) {
    if (window.showDirectoryPicker) {
      try { const hd = await window.showDirectoryPicker({ mode: 'read', id: 'sis-dtree' }); toast('Reading “' + hd.name + '”…', 1500); return DTREE.log(b, [await DTREE.fromDir(hd)], 'folder', [hd]); }
      catch (er) { if (er && er.name === 'AbortError') return null; toast('The folder could not be read: ' + ((er && er.message) || er)); return null; }
    }
    return DTREE.input(b, true);
  },
  async pickFiles(b) {
    if (window.showOpenFilePicker) {
      try { const hs = await window.showOpenFilePicker({ multiple: true, id: 'sis-dtree' }), es = []; for (const hd of hs) es.push(await DTREE.fromHandle(hd)); return DTREE.log(b, es, 'files', hs); }
      catch (er) { if (er && er.name === 'AbortError') return null; toast('The files could not be read: ' + ((er && er.message) || er)); return null; }
    }
    return DTREE.input(b, false);
  },
  /** Without the folder windows (Safari, Firefox, an iPad): the file window; the listing is recorded the same way, without a rescan. */
  input(b, dir) {
    return new Promise(res => {
      const inp = h('input', { type: 'file', multiple: true, style: { display: 'none' } }); if (dir) { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
      inp.addEventListener('change', () => { const fs = [...(inp.files || [])]; inp.remove(); res(fs.length ? DTREE.log(b, DTREE.fromFiles(fs), dir ? 'folder' : 'files') : null); });
      inp.addEventListener('cancel', () => { inp.remove(); res(null); });
      document.body.append(inp); inp.click();
    });
  },
  /** "Log data in …": a folder, or files. */
  ask(b, x, y) {
    if (!b) return;
    ctxMenu(x, y, [{ head: 'Log data in “' + snippet(M.blockName(b), 28) + '”' },
      { label: 'Add a folder…', sub: 'Its folders and files, as a tree — nothing is copied', run: () => DTREE.pickFolder(b) },
      { label: 'Add files…', sub: 'One or several files', run: () => DTREE.pickFiles(b) },
      { head: 'Or drop files and folders from your computer on the component' }]);
  },
  boxRect(id) { const el = $(`.canvas-host .box[data-id="${id}"]`); if (!el) return { x: innerWidth / 2 - 120, y: innerHeight / 2 }; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + 16), y: Math.round(Math.min(r.bottom, innerHeight - 160)) }; },
  /** Ask once the box is on screen (a new one is drawn on the next refresh). */
  askSoon(b, at) { let n = 0; const go = () => { if ($(`.canvas-host .box[data-id="${b.id}"]`) || n++ > 12) { const r = at || DTREE.boxRect(b.id); DTREE.ask(M.block(b.id) || b, r.x, r.y); } else setTimeout(go, 60); }; setTimeout(go, 40); },

  /* ---------- drawing ---------- */
  st: { open: _ls.get('dtOpen', {}) || {}, all: new Set() },
  saveSt: debounce(() => { const o = {}; Object.entries(DTREE.st.open).forEach(([k, v]) => { if (k[0] !== '_') o[k] = v; }); _ls.set('dtOpen', o); }, 300),
  isOpen(bid, path, depth) { const v = DTREE.st.open[bid + '|' + path]; return v != null ? !!v : depth === 0 && DTREE.firstOpen(); },
  /** The tree of a component: o.ro (a note travelled to: look only), o.pv (a Settings preview: folds, nothing else). */
  el(b, o = {}) {
    const ro = !!(o.ro || o.pv), items = DTREE.items(b), c = DTREE.count(items), pend = DTREE.pending(items);
    const kept = items.filter(e => e.h && DTREE.handle(e.id)), asOf = items.filter(e => !(e.h && DTREE.handle(e.id))).map(e => e.at).filter(Boolean).sort().pop();
    const root = h('div.dt.nopan' + (ro ? '.ro' : '') + (o.pv ? '.pv' : ''), { 'data-dt': b.id, on: { pointerdown: e => { if (e.target.closest('.dt-r, button')) e.stopPropagation(); }, dblclick: e => e.stopPropagation() } });
    root._b = b; root._o = o;
    const btn = (cls, title, html, run) => { const x = h('button.dt-b' + (cls ? '.' + cls : ''), { type: 'button', title, 'aria-label': title, on: { click: e => { e.stopPropagation(); run(e); } } }); x.innerHTML = html; return x; };
    const head = h('div.dt-h', { title: items.length ? (kept.length ? '⟳ reads ' + (kept.length === items.length ? 'it' : plural(kept.length, 'entry', 'entries')) + ' again on this device' : 'As logged' + (asOf ? ' on ' + fmtDayLong(asOf) : '') + ' — this device cannot read the folder again') : '' },
      DTREE.ico('tree', 'dt-hi', 13), h('span.dt-k', 'Data'), h('span.dt-sum', items.length ? DTREE.say(c) : 'nothing logged yet'),
      items.length && !kept.length && asOf ? h('span.dt-as', 'as logged ' + fmtDay(asOf)) : null,
      pend ? h('span.dt-pend', plural(pend, 'change')) : null, h('span.spacer'),
      ro ? null : pend ? h('button.dt-acc', { type: 'button', title: 'The gone leave the tree, the marks go: it becomes the folder as it is now', on: { click: e => { e.stopPropagation(); DTREE.accept(b); } } }, 'Accept') : null,
      ro || !kept.length ? null : btn('dt-re', 'Rescan — read the folder again and mark what is new, changed or gone', DTREE.svg('rescan', 13), () => DTREE.rescan(b)),
      ro ? null : btn('dt-add', 'Log data: a folder, or files', '+', e => { const r = e.currentTarget.getBoundingClientRect(); DTREE.ask(b, r.left, r.bottom + 4); }),
      ro || items.length ? null : btn('dt-del', 'Remove this empty tree (the component stays)', '×', () => DTREE.drop(b)));
    const rows = h('div.dt-rows', { role: 'tree', 'aria-label': 'Data' });
    const walk = (list, depth, base, top, parent) => {
      const key = b.id + '|' + base, all = depth === 0 || DTREE.st.all.has(key), shown = all ? list : list.slice(0, DTREE.SHOW);
      shown.forEach(e => { const path = base ? base + '/' + e.n : e.n, tl = top || e; rows.append(DTREE.row(b, e, depth, path, tl, ro));
        if (e.dir && DTREE.isOpen(b.id, path, depth)) walk(e.k || [], depth + 1, path, tl, e); });
      if (list.length > shown.length) rows.append(h('div.dt-r.dt-more', { role: 'button', tabindex: '0', style: { '--d': depth }, title: 'Show every entry of this folder', on: { click: e => { e.stopPropagation(); DTREE.st.all.add(key); DTREE.redraw(b.id); }, keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); DTREE.st.all.add(key); DTREE.redraw(b.id); } } } }, h('span.dt-tg'), h('span.dt-n', '+ ' + (list.length - shown.length) + ' more')));
      if (parent && parent.more) rows.append(h('div.dt-r.dt-more.off', { style: { '--d': depth } }, h('span.dt-tg'), h('span.dt-n', parent.more + ' more not listed — a folder is read up to ' + DTREE.MAX + ' entries')));
      if (parent && parent.deep && !list.length) rows.append(h('div.dt-r.dt-more.off', { style: { '--d': depth } }, h('span.dt-tg'), h('span.dt-n', 'not read — deeper than ' + DTREE.DEPTH + ' folders')));
    };
    walk(items, 0, '', null, null);
    if (!items.length) rows.append(h('div.dt-empty', ro ? 'Nothing logged.' : 'Drop folders or files from your computer here, or + to choose them. Nothing is copied: the tree lists their names, places, sizes and dates.'));
    root.append(head, rows);
    if (!ro) {
      root.addEventListener('dragover', e => { if ([...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files')) root.classList.add('over'); });
      root.addEventListener('dragleave', e => { if (!root.contains(e.relatedTarget)) root.classList.remove('over'); });
      root.addEventListener('drop', () => root.classList.remove('over'));
    }
    return root;
  },
  row(b, e, depth, path, top, ro) {
    const open = !!e.dir && DTREE.isOpen(b.id, path, depth), full = (top.root ? top.root + '/' : '') + path, c = e.dir ? DTREE.count(e.k) : null;
    const tip = full + '\n' + (e.dir ? DTREE.say(c) + (e.deep ? ' (not read: too deep)' : '') : (e.s != null ? DATA.fmtSize(e.s) : 'size unknown') + (e.m ? ' · modified ' + fmtDayLong(e.m) + ' ' + fmtTime(e.m) : ''))
      + (e.st === 'changed' && e.was ? ' (was ' + DATA.fmtSize(e.was.s) + (e.was.m ? ', ' + fmtDay(e.was.m) : '') + ')' : '')
      + (depth === 0 && e.at ? '\nLogged ' + fmtDayLong(e.at) + ' ' + fmtTime(e.at) + (e.via === 'dataset' ? ' from the old Data tab' : '') : '') + (e.st ? '\n' + DTREE.STW[e.st] : '');
    const flip = ev => { ev.stopPropagation(); DTREE.toggle(b, path, depth); };
    const r = h('div.dt-r' + (e.dir ? '.dir' : '') + (open ? '.open' : '') + (e.st ? '.st-' + e.st : ''), { 'data-p': path, 'data-top': top.id, style: { '--d': depth }, title: tip, role: 'treeitem', 'aria-level': String(depth + 1),
        'aria-expanded': e.dir ? String(open) : null, tabindex: e.dir ? '0' : null,
        on: e.dir ? { click: flip, keydown: ev => { if (ev.target === r && (ev.key === 'Enter' || ev.key === ' ' || ev.key === (open ? 'ArrowLeft' : 'ArrowRight'))) { ev.preventDefault(); flip(ev); } } } : {} },
      h('span.dt-tg', e.dir ? { html: DTREE.svg('chev', 10) } : null), DTREE.ico(e.dir ? (open ? 'open' : 'folder') : 'file'),
      h('span.dt-n', e.n), e.st ? h('span.dt-st', e.st) : null,
      h('span.dt-c', e.dir ? DTREE.say(c, true) : e.s != null ? DATA.fmtSize(e.s) : ''), h('span.dt-m', !e.dir && e.m ? fmtDay(e.m) : ''),
      ro ? null : h('button.dt-x', { type: 'button', title: 'Remove “' + snippet(e.n, 40) + '” from the data tree', 'aria-label': 'Remove ' + e.n, on: { click: ev => { ev.stopPropagation(); DTREE.remove(b, path, top.id); } } }, '×'));
    return r;
  },
  toggle(b, path, depth) { DTREE.st.open[b.id + '|' + path] = !DTREE.isOpen(b.id, path, depth); DTREE.saveSt(); DTREE.redraw(b.id, path); },
  /** Draw a component's tree again where it is (a fold: no refresh of the note). */
  redraw(id, focus) {
    $$(`.dt[data-dt="${id}"]`).forEach(el => {
      const b = (id[0] !== '_' && M.block(id)) || el._b; if (!b) return;
      const n = DTREE.el(b, el._o || {}); el.replaceWith(n);
      if (focus) { const r = [...n.querySelectorAll('.dt-r[data-p]')].find(x => x.dataset.p === focus); if (r && r.tabIndex >= 0) try { r.focus({ preventScroll: true }); } catch (e) { } }
      const host = n.closest('.canvas-host'), pane = host && host._dv; if (pane && pane.drawWires) try { pane.drawWires(); } catch (e) { }
    });
  },
  /** The note folder's Markdown: the tree as a list (13o). */
  md(b) {
    const L = [], cap = 400; let skipped = 0;
    const walk = (list, depth) => (list || []).forEach(e => { if (L.length >= cap) { skipped++; return; }
      L.push('  '.repeat(depth) + '- ' + (e.dir ? e.n + '/ (' + DTREE.say(DTREE.count(e.k), true) + ')' : e.n + (e.s != null ? ' — ' + DATA.fmtSize(e.s) : '') + (e.m ? ', ' + isoLocal(new Date(e.m)).slice(0, 10) : ''))); if (e.dir) walk(e.k, depth + 1); });
    walk(DTREE.items(b), 0);
    return L.length ? '\n**Data:**\n\n' + L.join('\n') + (skipped ? '\n- … ' + skipped + ' more' : '') + '\n' : '';
  },

  /* ---------- the datasets bound before V4.28 ---------- */
  migrate() {
    if (typeof DATA === 'undefined') return 0;
    const all = DB.all('datasets'); if (!all.length) return 0;
    const by = new Map(), add = (bid, ds) => { if (!by.has(bid)) by.set(bid, []); if (!by.get(bid).includes(ds)) by.get(bid).push(ds); };
    DB.all('blocks').forEach(b => { if (!DTREE.can(b)) return; ((b.binds || {}).datasets || []).forEach(id => { const ds = DB.get('datasets', id); if (ds) add(b.id, ds); }); });
    all.forEach(ds => { const b = ds.producedBy && M.block(ds.producedBy); if (b && DTREE.can(b)) add(b.id, ds); });
    let n = 0;
    for (const [bid, list] of by) {
      const b = M.block(bid), T = DTREE.shows(b) ? b.dtree : { items: [] }, done = new Set(T.mig || []), fresh = list.filter(ds => !done.has(ds.id)); if (!fresh.length) continue;
      const tops = new Set();
      fresh.forEach(ds => {
        const rootName = ds.root || 'Data folder'; let top = T.items.find(x => x.dir && x.via === 'dataset' && x.root === rootName);
        if (!top) { top = { id: uid('dt'), n: rootName, root: rootName, dir: 1, k: [], at: ds.created || isoLocal(new Date()), via: 'dataset' }; T.items.push(top); }
        tops.add(top);
        const parts = String(ds.path || ds.name || '').split('/').filter(Boolean), name = parts.pop() || ds.name || 'file'; let l = top.k;
        parts.forEach(p => { let d = l.find(x => x.dir && x.n === p); if (!d) { d = { n: p, dir: 1, k: [] }; l.push(d); } l = d.k; });
        if (!l.some(x => !x.dir && x.n === name)) l.push({ n: name, s: ds.size, m: ds.mtimeMs != null ? ds.mtimeMs : (ds.mtime ? new Date(ds.mtime).getTime() : null), ds: ds.id });
        done.add(ds.id); n++;
      });
      tops.forEach(t => DTREE.sortAll(t.k));
      b.dtree = Object.assign({}, T, { mig: [...done] }); DB.put('blocks', b);
    }
    if (n) changed();
    return n;
  },
};
{
  // the tree, under the component's text (before its chips)
  const bx = DocView.box; DocView.box = function (b, d, p) {
    const el = bx.apply(this, arguments);
    try { if (el && DTREE.on() && DTREE.can(b) && DTREE.shows(b)) { const t = DTREE.el(b, { ro: !!this.travel }), ch = $(':scope > .chips', el); ch ? ch.before(t) : el.append(t); el.classList.add('has-dt'); } } catch (e) { console.warn('[data tree]', e); }
    return el; };
  // ⋯ → Log data…, after "Data, materials & code…" (a run: after "Materials & data of this run…")
  const bm = DocView.boxMenu; DocView.boxMenu = function (b, e) {
    if (!b || !DTREE.on() || !DTREE.can(b) || this.travel) return bm.apply(this, arguments);
    const cm = window.ctxMenu; window.ctxMenu = function (x, y, rows) { window.ctxMenu = cm;
      const i = rows.findIndex(r => r && r !== 'sep' && /^(Data, materials & code|Materials & data of this run)/.test(String(r.label || ''))), at = { x, y };
      const it = { label: 'Log data…', sub: DTREE.items(b).length ? 'Add a folder or files to its data tree' : 'The folders or files it used, as a tree in it — nothing is copied', run: () => DTREE.ask(M.block(b.id) || b, at.x, at.y) };
      const out = rows.slice(); out.splice(i >= 0 ? i : out.length, 0, it); return cm.call(this, x, y, out); };
    try { return bm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // a component holding a tree is not "empty" (Backspace in an empty component removes it)
  const rem = M.removeEmptyBlock; M.removeEmptyBlock = function (b) { if (b && DTREE.items(b).length) return false; return rem.apply(this, arguments); };
  // the note folder's Markdown lists it
  if (typeof VAULT !== 'undefined' && VAULT.component) { const vc = VAULT.component; VAULT.component = function (b) { const md = vc.apply(this, arguments); try { return b && DTREE.shows(b) ? md + DTREE.md(b) : md; } catch (e) { return md; } }; }
  // the datasets bound before: once, with the standard templates (boot, an import)
  if (typeof ensureStandardTemplates === 'function') { const est = ensureStandardTemplates; ensureStandardTemplates = function () { const r = est.apply(this, arguments); try { DTREE.migrate(); } catch (e) { console.warn('[data tree] datasets', e); } return r; }; }
  // /data: this component's tree, or a new "Data" component (no + Insert row: the lab layer gives every row its own icon, and it has none for this yet)
  if (typeof CMD !== 'undefined' && CMD.add) {
    CMD.add({ slash: 'data', label: 'Log data: folders or files as a tree in this component', args: [], alias: ['datatree', 'log-data'], group: 'Note', sub: 'Or a new “Data” component when none is chosen · nothing is copied',
      run: (A, ctx) => {
        if (!DTREE.on()) throw new Error('the data tree is off — Settings → Features → Data tree');
        const d = CMD.need(ctx); let b = ctx.block || (ctx.pane && ctx.pane.sel && M.block(ctx.pane.sel));
        if (b && (b.docId !== d.id || !DTREE.can(b))) b = null;
        let at = null; if (b && ctx.el && ctx.el.getBoundingClientRect) { const r = ctx.el.getBoundingClientRect(); at = { x: Math.round(r.left + 12), y: Math.round(Math.min(r.bottom + 6, innerHeight - 160)) }; }
        if (!b) { const pane = ctx.pane, r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); b = DTREE.makeAt(d, { x: c.x - 200, y: c.y - 100 }); }
        DTREE.askSoon(b, at); return 'Log data in ' + M.blockName(b);
      } });
    // the page of the old Data tab: what was registered there
    CMD.add({ slash: 'datasets', label: 'The datasets registered before the data tree', args: [], alias: ['data-page'], group: 'Go', sub: 'The old Data page: folders, rescans, what each dataset was bound to', run: () => { App.go('#/data'); return 'Datasets'; } });
  }
  // files and folders dropped from the computer: on the tree, on a component with Alt held, or — a drop holding a folder — anywhere on a component or on the paper
  const target = e => {
    const dt = e.dataTransfer, t = e.target; if (!DTREE.on() || !dt || !t || !t.closest || ![...(dt.types || [])].includes('Files')) return null;
    const host = t.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.paper || pane.travel || $('.ovl')) return null;
    const box = t.closest('.box[data-id]'), b = box && M.block(box.dataset.id);
    return { pane, box, b: b && DTREE.can(b) ? b : null, onTree: !!t.closest('.dt:not(.ro)') };
  };
  let overBox = null; const unmark = () => { if (overBox) overBox.classList.remove('dt-over'); overBox = null; };
  document.addEventListener('dragover', e => { const T = target(e); if (!T || !T.b || !(T.onTree || e.altKey)) { unmark(); return; } e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (overBox !== T.box) { unmark(); overBox = T.box; overBox.classList.add('dt-over'); } }, true);
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) unmark(); }, true);
  document.addEventListener('drop', e => {
    unmark(); const T = target(e); if (!T) return;
    // everything is read now: the drop's items are gone once the event is over
    const items = [...(e.dataTransfer.items || [])].filter(i => i.kind === 'file');
    const handles = items.map(i => { try { return i.getAsFileSystemHandle ? i.getAsFileSystemHandle() : null; } catch (er) { return null; } });
    const entries = items.map(i => { try { return i.webkitGetAsEntry ? i.webkitGetAsEntry() : null; } catch (er) { return null; } });
    const files = items.length ? items.map(i => { try { return i.getAsFile(); } catch (er) { return null; } }) : [...(e.dataTransfer.files || [])];
    const hasDir = entries.some(x => x && x.isDirectory), d = M.doc(T.pane.docId); if (!d) return;
    let into = null, at = null;
    if (T.b && (T.onTree || e.altKey || hasDir)) into = T.b;
    else if (!T.box && hasDir) { const w = T.pane.paper.toWorld(e.clientX, e.clientY); at = { x: w.x, y: w.y }; }
    else return;   // files alone, on the paper or a component: as they were (13zzs)
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    (async () => {
      const tops = [], hs = [], cnt = { n: 0 };
      for (let i = 0; i < Math.max(items.length, files.length); i++) {
        let hd = null; try { hd = handles[i] ? await handles[i] : null; } catch (er) { hd = null; }
        if (hd && (hd.kind === 'directory' || hd.kind === 'file')) { const x = await DTREE.fromHandle(hd, cnt); if (x) { tops.push(x); hs.push(hd); continue; } }
        if (entries[i]) { const x = await DTREE.fromEntry(entries[i], cnt); if (x) { tops.push(x); hs.push(null); continue; } }
        const f = files[i]; if (f) { tops.push({ n: f.name, s: f.size, m: f.lastModified }); hs.push(null); }
      }
      if (!tops.length) return toast('Nothing could be read from that drop');
      const b = into || DTREE.makeAt(d, at); DTREE.log(b, tops, 'drop', hs);
    })();
  }, true);
}
