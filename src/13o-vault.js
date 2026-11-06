/* ==========================================================================
   13o · Your notebook folder. Chosen in Settings, remembered outside the
   app, written continuously by serve.py, so nothing depends on the browser
   keeping its storage or on which copy of the app you launch:
     .scientia/record.json  the whole record (plus daily copies) — reloaded on launch
     images/                media you add
     Markdown               one file per component, Obsidian style:
                        <Project>/<Theme>/<Note>/<NN label>.md with YAML front
                        matter, [[wikilinks]] for connections, links and terms,
                        ==highlights== for structures, $…$ for equations; plus a
                        note file that embeds its components, term and library pages.
   The vault is a mirror: edit in the app; files the app did not write are never touched.
   ========================================================================== */
const DATA_EPOCH = 1; // the data generation this install belongs to. Never lower it; raising it wipes once (after a kept copy).
const DISK = {
  on: false, nb: null, meta: null, recent: [], last: null, lastVault: null, error: null, paused: false, _sent: new Map(), _manifestLoaded: false, _t: null,
  async info() { try { const r = await fetch('api/notebook', { cache: 'no-store' }); const j = await r.json(); DISK.nb = j.path || null; DISK.meta = j.record || null; DISK.recent = j.recent || []; DISK.config = j.config; } catch { DISK.nb = null; DISK.meta = null; DISK.server = false; return null; } DISK.server = true; DISK.on = !!DISK.nb; return DISK.nb; },
  async exportRecord(reason) {
    const data = await DB.exportAll(); data.stores.blobs = (data.stores.blobs || []).filter(b => !(b.id === '_backupHandle' || String(b.id).startsWith('dsroot:')));
    data.epoch = DATA_EPOCH; data.reason = reason; data.build = BUILD; data.savedAt = new Date().toISOString(); return data;
  },
  /** The whole record → <notebook>/.scientia/record.json (plus a daily copy). */
  async snapshot(reason = 'auto') {
    if (!DISK.on || DISK.paused) return false;
    try { const data = await DISK.exportRecord(reason);
      const r = await fetch('api/snapshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'refused');
      _ls.set('nbSavedAt', data.savedAt); DISK.meta = j.meta; DISK.last = new Date(); DISK.error = null; return true; } catch (e) { DISK.error = String(e.message || e); return false; }
  },
  /** A named copy (before a wipe or a load) — in the notebook if there is one, else in the app's backup/ folder. */
  async keep(name) { try { const data = await DISK.exportRecord(name); const r = await fetch('api/snapshot?keep=' + encodeURIComponent(name), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return (await r.json()).ok; } catch { return false; } },
  isEmpty: () => !DB.all('projects').length && !DB.all('documents').length && !DB.all('library').length,
  /** Replace what this browser holds with the notebook's record, then start again. */
  async load() {
    const r = await fetch('api/snapshot', { cache: 'no-store' }); if (!r.ok) throw new Error('No record in the notebook');
    const data = await r.json(); if (!DISK.isEmpty()) await DISK.keep('browser-before-load');
    DISK.paused = true; await DB.importAll(data); _ls.set('nbSavedAt', data.savedAt || (DISK.meta || {}).savedAt || null);
    setTimeout(() => location.reload(), 150); return true;
  },
  /**
   * On launch: if the notebook holds a record this browser has not seen (a fresh install, another browser, a cleared cache), load it.
   * Otherwise this browser's record is the newer one and is saved into the notebook.
   */
  async boot() {
    await DISK.info(); if (!DISK.on) return 'none';
    const m = DISK.meta, mine = _ls.get('nbSavedAt', null);
    if (m && m.savedAt && m.savedAt !== mine && (DISK.isEmpty() || !mine || m.savedAt > mine)) { await DISK.load(); return 'loading'; }
    return 'ok';
  },
  async connect(path) {
    const r = await fetch('api/notebook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, media: DB.all('media').map(m => String(m.path || '').replace(/^images\//, '')).filter(Boolean) }) }); const j = await r.json();
    if (!j.ok) { toast('Could not use that folder: ' + (j.error || '?')); return; }
    DISK.nb = j.path; DISK.meta = j.record; DISK.on = true; DISK._sent = new Map(); DISK._manifestLoaded = false;
    if (j.record && j.record.records && !DISK.isEmpty()) {
      pickModal('This notebook already has data', `${j.record.records} records, saved ${fmtWhen(j.record.savedAt)}. This browser holds its own data too.`, [
        { label: 'Load the notebook', sub: 'Replaces what this browser shows; a copy of the browser’s data is kept in the notebook', run: () => DISK.load() },
        { label: 'Keep this browser’s data', sub: 'Saved into the notebook; its earlier record is kept as a copy', run: async () => { await fetch('api/snapshot?keep=notebook-before-overwrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await (await fetch('api/snapshot', { cache: 'no-store' })).text() }); await DISK.snapshot('connect'); VAULT.sync(true); App.refresh(); } }]);
      return;
    }
    if (j.record && j.record.records) return DISK.load();
    await DISK.snapshot('connect'); await VAULT.sync(true); toast('Notebook connected — everything is saved there from now on'); App.refresh();
  },
  async browse() { const r = await fetch('api/notebook/browse', { method: 'POST' }); const j = await r.json(); if (!j.ok) { toast(j.error || 'No folder dialog'); return null; } return j.path; },
  /** Called on every write: the record and the Markdown follow a few seconds later. */
  touch() { if (!DISK.on || DISK.paused) return; clearTimeout(DISK._t); DISK._t = setTimeout(async () => { await DISK.snapshot(); await VAULT.sync(); }, 3000); },
  /** Only one tab saves into the notebook. */
  lock() { try { if (!navigator.locks) return; navigator.locks.request('scientia-notebook', { ifAvailable: true }, l => { if (!l) { DISK.paused = true; DISK.error = 'Another tab of the app is open — this one does not save to the notebook'; setTimeout(() => toast(DISK.error), 800); return; } return new Promise(() => { }); }); } catch { } },
};

const VAULT = {
  /** A file or folder name Obsidian and Windows both accept. */
  safe(s, max = 80) { s = String(s || '').replace(/[\\/:*?"<>|#^\[\]\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, ''); return (s || 'untitled').slice(0, max).trim(); },
  yq: s => JSON.stringify(String(s == null ? '' : s)),
  folderOf(d) {
    if (d.type === 'day') return ['Days'];
    const p = M.project(d.projectId), t = d.themeId && M.theme(d.themeId), sc = prof(d.type).scope;
    if (!p) return ['Global', VAULT.safe(prof(d.type).label)];
    return [VAULT.safe(p.name), t ? VAULT.safe(t.name) : sc === 'global' ? 'Global' : '_Project-wide'];
  },
  /** Every note gets a unique folder; every component a unique file inside it. */
  plan() {
    const docs = DB.where('documents', d => !d.archived), used = new Set(), P = { doc: new Map(), block: new Map(), term: new Map(), lib: new Map() };
    const uniq = (dir, name) => { let n = name, i = 2; while (used.has((dir + '/' + n).toLowerCase())) n = name + ' ' + i++; used.add((dir + '/' + n).toLowerCase()); return n; };
    docs.sort((a, b) => (a.created || '').localeCompare(b.created || ''));
    for (const d of docs) {
      const dir = VAULT.folderOf(d).join('/'), name = uniq(dir, VAULT.safe(d.type === 'day' ? (d.dayDate || localDate(d.created)) : d.title || 'Untitled')), base = dir + '/' + name;
      P.doc.set(d.id, { dir: base, file: base + '.md', link: base, title: d.title || name });
      const live = M.liveBlocks(d.id).filter(b => b.status !== 'removed'); let n = 0;
      for (const b of live) { n++; const lab = b.kind === 'eq' ? EQ.label(b) : d.type === 'day' ? fmtTime(b.created).replace(':', '') + ' ' + snippet(b.body.text || '', 40) : M.blockName(b);
        const fn = uniq(base, String(n).padStart(2, '0') + ' ' + VAULT.safe(lab, 60)); P.block.set(b.id, { file: base + '/' + fn + '.md', link: base + '/' + fn, name: lab }); }
    }
    for (const t of DB.all('terms')) { const p = M.project(t.projectId), dir = (p ? VAULT.safe(p.name) : 'Global') + '/Terms'; P.term.set(t.id, { file: dir + '/' + uniq(dir, VAULT.safe(t.label)) + '.md' }); P.term.get(t.id).link = P.term.get(t.id).file.slice(0, -3); }
    for (const r of DB.all('library')) { const nm = uniq('Library', VAULT.safe((LIB.shortRef ? LIB.shortRef(r) : '') + ' ' + snippet(r.title || '', 50))); P.lib.set(r.id, { file: 'Library/' + nm + '.md', link: 'Library/' + nm }); }
    return P;
  },
  wl: (x, label) => x ? '[[' + x.link + (label ? '|' + String(label).replace(/[\[\]|]/g, ' ') : '') + ']]' : (label || ''),
  /** A component's text with its marks as Markdown. */
  text(b, P) {
    const body = b.body || { text: '' }, text = body.text || '', marks = (body.marks || []).filter(m => m.to > m.from);
    const cuts = new Set([0, text.length]); marks.forEach(m => { cuts.add(m.from); cuts.add(m.to); });
    const pts = [...cuts].sort((x, y) => x - y), inStruct = pos => marks.some(m => m.type === 'struct' && m.from <= pos && m.to > pos);
    const target = m => { if (m.type === 'term') return P.term.get(m.ref); const tg = IX.linkTarget(m); return tg ? (tg.type === 'doc' ? P.doc.get(tg.d.id) : P.block.get(tg.b.id)) : null; };
    let out = '', hl = false, fcur = [];
    const FO = { b: '**', i: '*', u: '<u>' }, FC = { b: '**', i: '*', u: '</u>' };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], z = pts[i + 1], seg = text.slice(a, z), cov = marks.filter(m => m.from <= a && m.to >= z);
      const fs = ['b', 'i', 'u'].filter(s => cov.some(m => m.type === 'fmt' && m.s === s));
      if (fs.join() !== fcur.join()) { out += fcur.slice().reverse().map(s => FC[s]).join(''); hl && (out += '==', hl = false); fcur = fs; out += fcur.map(s => FO[s]).join(''); }
      const st = inStruct(a); if (st !== hl) { out += '=='; hl = st; }
      const math = cov.find(m => m.type === 'math'); if (math) { out += math.display ? '\n$$' + math.tex + '$$\n' : '$' + math.tex + '$'; continue; }
      const cite = cov.find(m => m.type === 'cite'); if (cite) { const r = M.lib(cite.ref); out += VAULT.wl(P.lib.get(cite.ref), r ? LIB.shortRef(r) : 'citation'); continue; }
      // a link or term opens where it starts and closes where it ends: [[target|its words]]
      const ln = cov.find(m => m.type === 'link') || cov.find(m => m.type === 'term');
      if (ln && ln.from === a) { const t = target(ln); out += '[[' + (t ? t.link : (ln.title || text.slice(ln.from, ln.to)).replace(/[\[\]|]/g, ' ')) + '|'; }
      out += ln ? seg.replace(/[\[\]|]/g, ' ') : seg;
      if (ln && ln.to === z) out += ']]';
    }
    if (hl) out += '=='; out += fcur.slice().reverse().map(s => FC[s]).join('');
    return out.replace(/==(\s*)==/g, '$1');
  },
  fm(o) { return '---\n' + Object.entries(o).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => k + ': ' + (Array.isArray(v) ? '[' + v.map(VAULT.yq).join(', ') + ']' : typeof v === 'number' || typeof v === 'boolean' ? v : VAULT.yq(v))).join('\n') + '\n---\n'; },
  component(b, d, P) {
    const its = IX.itemsOf(b.id), terms = [...(IX.blockTerms.get(b.id) || [])].map(M.term).filter(Boolean), me = P.block.get(b.id);
    const L = [VAULT.fm({ id: b.id, note: VAULT.wl(P.doc.get(d.id), d.title), note_type: prof(d.type).label, kind: b.kind, label: b.label || null, created: b.created, modified: b.modified, timed: b.stamp && b.stamp.at || null,
      structures: [...new Set(its.map(i => i.kind))], terms: terms.map(t => t.label), tags: [...new Set(['scientia', ...its.map(i => i.kind)])] }), '# ' + me.name, ''];
    if (b.kind === 'eq') { const q = EQ.data(b); L.push('$$' + q.tex + '$$', ''); const vs = EQ.terms(q.tex); if (vs.length) { L.push('| Term | Name | Unit |', '|---|---|---|'); vs.forEach(v => { const V = (q.vars || {})[v.k] || {}; L.push(`| $${v.tex}$ | ${V.name || ''} | ${V.unit || ''} |`); }); L.push(''); } if (EQ.rec(b)) L.push('Registered as **' + EQ.rec(b).name + '**', ''); }
    else if (b.kind === 'figure' && b.fig) { FIG.cells(b).forEach((c, i) => { const m = c.media && MEDIA.get(c.media); if (!m) return; const it = c.itemId && M.item(c.itemId); L.push(`- **${FIG.letter(i)}** ${c.caption || ''}${it ? ' — ' + KIND[it.kind].label : ''} (\`${m.path || m.name}\`${c.crop ? ', cropped' : ''})`); }); L.push('', VAULT.text(b, P), ''); }
    else if (b.kind === 'calc') { L.push('```', ...(b.hist || []).map(x => (x.note ? x.note + ' ' : '') + x.e + ' = ' + CALC.fmt(x.v)), '```', ''); }
    else if (b.kind === 'ref') { const ob = M.block(b.refBlockId), it = b.refItemId && M.item(b.refItemId); L.push('Pulled in: ' + (it ? KIND[it.kind].label + ' — ' + it.text + ' (' + VAULT.wl(P.block.get(it.originBlockId), 'origin') + ')' : ob ? VAULT.wl(P.block.get(ob.id), M.blockName(ob)) : '—'), ''); }
    else if (b.kind === 'component' || !b.kind) L.push(VAULT.text(b, P), '');
    else L.push((b.body && b.body.text) || '', '');
    if (b.anchor && b.anchor.source) { const r = M.lib(b.anchor.source); L.push('> Highlight, p. ' + b.anchor.page + ' of ' + VAULT.wl(P.lib.get(b.anchor.source), r ? LIB.shortRef(r) : 'paper'), ''); }
    if (its.length) { L.push('## Structures'); its.forEach(it => { const st = IX.status(it); L.push(`- **${KIND[it.kind].label}**${st ? ' (' + st + ')' : ''}${it.stance ? ' · ' + it.stance : ''}: ${it.text}`); }); L.push(''); }
    const ws = IX.wiresOf(b.id).map(w => { const out = w.from === b.id, o = M.block(out ? w.to : w.from); if (!o || o.status === 'removed') return null; const rel = REL[w.rel] || REL.related; return `- ${w.directed ? (out ? '→ ' + rel.label : '← ' + rel.inv) : '↔ ' + rel.label} ${VAULT.wl(P.block.get(o.id), M.blockName(o))}${o.docId !== b.docId ? ' (' + (M.doc(o.docId) || {}).title + ')' : ''}`; }).filter(Boolean);
    if (ws.length) L.push('## Connections', ...ws, '');
    const B = b.binds || {}; const bl = [...(B.datasets || []).map(id => { const x = DB.get('datasets', id); return x ? 'Dataset: ' + x.path : null; }), ...(B.resources || []).map(id => { const r = M.doc(id); return r ? 'Material: ' + VAULT.wl(P.doc.get(r.id), r.title) : null; }), ...(B.from || []).map(id => M.block(id) ? 'Made from: ' + VAULT.wl(P.block.get(id), M.blockName(M.block(id))) : null), B.code ? 'Code: ' + B.code : null].filter(Boolean);
    if (bl.length) L.push('## Provenance', ...bl.map(x => '- ' + x), '');
    return L.join('\n');
  },
  note(d, P) {
    const H = d.header || {}, fields = (prof(d.type).headerFields || []).map(f => [f.label, H[f.key]]).filter(([, v]) => v);
    const L = [VAULT.fm({ id: d.id, type: prof(d.type).label, project: (M.project(d.projectId) || {}).name || null, theme: (d.themeId && (M.theme(d.themeId) || {}).name) || null, created: d.created, modified: d.modified, tags: [...(H.tags || []), 'scientia/note'], date: d.dayDate || null }), '# ' + (d.title || 'Untitled'), ''];
    fields.forEach(([k, v]) => L.push('**' + k + ':** ' + v)); if (fields.length) L.push('');
    if ((d.materials || []).length) L.push('**Materials:** ' + d.materials.map(M.doc).filter(Boolean).map(r => VAULT.wl(P.doc.get(r.id), r.title)).join(', '), '');
    M.liveBlocks(d.id).filter(b => b.status !== 'removed').forEach(b => { const x = P.block.get(b.id); if (x) L.push('![[' + x.link + ']]', ''); });
    if (d.type === 'resource') { const H = d.header || {}, m = d.mat || {}, K = (typeof MATKIND !== 'undefined' && MATKIND[H.kind]) || { fields: [] };
      const rows = [['Kind', H.kind], ['Status', m.status], ['Source', m.source === 'bought' ? 'bought' : 'made here'], ['Made on', m.madeAt ? fmtDay(m.madeAt) + ' ' + fmtTime(m.madeAt) : ''], ['Made by', m.madeBy], ['Supplier', H.supplier], ['Catalogue no.', H.cat], ['Lot', H.lot], ['Received', H.received], ['Expires', H.expires],
        ...K.fields.map(([k, l]) => [l, H[k]]), ['Concentration', H.conc], ['Stored at', H.location], ['Amount left', H.left], ['Amount made', H.amount]].filter(([, v]) => v);
      if (rows.length) L.push('| | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${String(v).replace(/\|/g, '/')} |`), '');
      if ((m.ingredients || []).length) L.push('## Ingredients', '| Ingredient | Amount | Lot |', '|---|---|---|', ...m.ingredients.map(x => `| ${x.matId && P.doc.get(x.matId) ? VAULT.wl(P.doc.get(x.matId), x.name) : x.name || ''} | ${[x.amount, x.unit].filter(Boolean).join(' ')} | ${x.lot || ''} |`), '');
      if (m.notes) L.push('## Method', m.notes, '');
      if ((m.log || []).length) L.push('## Log', ...m.log.map(x => `- ${fmtDay(x.at)} ${fmtTime(x.at)} — ${x.text}`), '');
      const from = (d.supersedes || []).map(id => P.doc.get(id)).filter(Boolean); if (from.length) L.push('Made after: ' + from.map(x => VAULT.wl(x, x.title)).join(', '), '');
    }
    if ((d.regions || []).length) { L.push('## Regions'); d.regions.forEach(r => L.push('- **' + r.name + '**' + ((r.timed || []).length ? ' (timed ' + fmtDur(sum(r.timed.map(t => t.sec)) * 1000) + ')' : '') + ': ' + r.members.map(id => P.block.get(id)).filter(Boolean).map(x => VAULT.wl(x, x.name)).join(', '))); L.push(''); }
    if (d.synthesis && d.synthesis.text) L.push('## Synthesis', d.synthesis.text, '');
    return L.join('\n');
  },
  term(t, P) { const occ = IX.termOcc.get(t.id) || [], prim = [...new Set(occ.map(o => o.blockId))], sec = [...new Set(prim.flatMap(id => REGION.peers(id).map(p => p.id)))].filter(id => !prim.includes(id));
    return [VAULT.fm({ id: t.id, type: 'term', project: (M.project(t.projectId) || {}).name || null, tags: ['scientia/term'] }), '# ' + t.label, '', ...prim.map(id => M.block(id) ? '- ' + VAULT.wl(P.block.get(id), M.blockName(M.block(id))) : null).filter(Boolean), '',
      ...(sec.length ? ['## Via regions (secondary)', ...sec.map(id => { const r = REGION.of(id); return '- ' + VAULT.wl(P.block.get(id), M.blockName(M.block(id))) + (r ? ' — region “' + r.r.name + '”' : ''); }), ''] : [])].join('\n'); },
  lib(r, P) { return [VAULT.fm({ id: r.id, type: 'reference', title: r.title, year: r.year || null, doi: r.doi || null, container: r.container || null, tags: ['scientia/library'] }), '# ' + (r.title || 'Untitled'), '', LIB.apa ? LIB.apa(r) : '', ''].join('\n'); },
  /** The whole vault as {path: content}. */
  build() {
    const P = VAULT.plan(), F = new Map();
    for (const d of DB.where('documents', d => !d.archived)) { const x = P.doc.get(d.id); if (!x) continue; F.set(x.file, VAULT.note(d, P));
      for (const b of M.liveBlocks(d.id).filter(b => b.status !== 'removed')) { const y = P.block.get(b.id); if (y) try { F.set(y.file, VAULT.component(b, d, P)); } catch (e) { F.set(y.file, '# ' + y.name + '\n\n' + ((b.body && b.body.text) || '') + '\n'); } } }
    for (const t of DB.all('terms')) F.set(P.term.get(t.id).file, VAULT.term(t, P));
    for (const r of DB.all('library')) F.set(P.lib.get(r.id).file, VAULT.lib(r, P));
    if (typeof REM !== 'undefined' && DB.all('reminders').length) { const open = REM.open(), done = DB.all('reminders').filter(r => r.done);
      F.set('Reminders.md', [VAULT.fm({ type: 'reminders', tags: ['scientia/reminders'] }), '# Reminders', '', ...open.map(x => `- [ ] ${REMKIND[x.r.kind].label}: **${x.r.title}** — ${REM.fmtAt(x)}${x.r.where ? ' · ' + x.r.where : ''}${x.r.repeat && x.r.repeat !== 'none' ? ' · ' + x.r.repeat : ''}${x.r.docId && P.doc.get(x.r.docId) ? ' · ' + VAULT.wl(P.doc.get(x.r.docId), (M.doc(x.r.docId) || {}).title) : ''}`), '', ...(done.length ? ['## Done', ...done.map(r => `- [x] ${r.title} — ${fmtDay(r.at)}`)] : []), ''].join('\n')); }
    return F;
  },
  /** Send only what changed; delete files the app wrote earlier that no longer exist. */
  async sync(full) {
    if (!DISK.on || DISK.paused || DISK.isEmpty() && !DISK._sent.size && !full) return;
    try {
      if (!DISK._manifestLoaded) { const r = await fetch('api/vault', { cache: 'no-store' }); const j = await r.json(); (j.files || []).forEach(([p, h]) => DISK._sent.set(p, h)); DISK._manifestLoaded = true; }
      const F = VAULT.build(), writes = [], deletes = [];
      for (const [p, c] of F) { const hh = VAULT.hash(c); if (full || DISK._sent.get(p) !== hh) writes.push({ path: p, content: c, hash: hh }); }
      for (const p of DISK._sent.keys()) if (!F.has(p)) deletes.push(p);
      if (!writes.length && !deletes.length) { DISK.lastVault = new Date(); return; }
      for (let i = 0; i < Math.max(writes.length, 1); i += 400) {
        const part = writes.slice(i, i + 400), r = await fetch('api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: part, deletes: i ? [] : deletes }) }), j = await r.json();
        if (!j.ok) throw new Error(j.error || 'vault refused');
        part.forEach(w => DISK._sent.set(w.path, w.hash)); if (!i) deletes.forEach(p => DISK._sent.delete(p));
      }
      DISK.lastVault = new Date(); DISK.vaultFiles = F.size; DISK.error = null;
    } catch (e) { DISK.error = String(e.message || e); }
  },
  hash(s) { let h1 = 0x811c9dc5, h2 = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = (h2 * 31 + c) | 0; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36); },
};
