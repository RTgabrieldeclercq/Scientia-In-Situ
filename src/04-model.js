/* ==========================================================================
   04 · Model — every authored mutation goes through here so stamps,
   lineage and the journal stay consistent. Nothing is ever deleted except
   an empty, unconnected component the user just made. After a mutation
   call changed(): it rebuilds the derived index and refreshes the view.
   ========================================================================== */
const M = {
  doc: id => DB.get('documents', id), block: id => DB.get('blocks', id), item: id => DB.get('items', id),
  project: id => DB.get('projects', id), theme: id => DB.get('themes', id), term: id => DB.get('terms', id),
  lib: id => DB.get('library', id), session: id => DB.get('sessions', id), aim: id => DB.get('aims', id),

  docBlocks(docId) { const d = M.doc(docId); return d ? d.blockIds.map(M.block).filter(Boolean) : []; },
  liveBlocks(docId) { return M.docBlocks(docId).filter(b => b.status !== 'superseded'); },
  blockTime(b) { return (b.stamp && b.stamp.at) || b.created; },
  docPath(d) {
    if (!d) return '';
    const p = M.project(d.projectId), t = d.themeId && M.theme(d.themeId), sc = prof(d.type).scope;
    return [p && p.name, t ? t.name : sc === 'project' ? 'project-wide' : sc === 'global' ? 'global' : null, d.title].filter(Boolean).join(' › ');
  },
  blockIndex(b) {
    const d = M.doc(b.docId); if (!d) return 0;
    const live = d.blockIds.map(M.block).filter(x => x && x.status !== 'superseded' && x.status !== 'removed' && x.kind !== 'ref');
    const par = b.parent && live.find(x => x.id === b.parent);
    if (par) { const sibs = live.filter(x => x.parent === par.id); return M.blockIndex(par) + '.' + (sibs.indexOf(b) + 1); }
    return live.filter(x => !x.parent || !live.some(y => y.id === x.parent)).indexOf(b) + 1;
  },
  /** Nesting (§3 children): a component can be a substep of the one above it. */
  nestUnder(b, parentId) { const p = parentId && M.block(parentId); b.parent = parentId || null; if (p && p.x != null) { b.x = p.x + 42; } else if (!parentId && b.x != null) b.x = Math.max(0, b.x - 42); DB.put('blocks', b); changed(); },
  blockName(b) {
    if (!b) return '—';
    const d = M.doc(b.docId), p = d && prof(d.type);
    if (b.kind === 'ref') { const it = b.refItemId && M.item(b.refItemId), ob = M.block(b.refBlockId); return it ? `↪ ${KIND[it.kind].label}: ${snippet(it.text, 40)}` : ob ? '↪ ' + M.blockName(ob) : '↪ embedded'; }
    const n = b.status === 'superseded' ? '' : (p && p.ordered ? `${p.noun} ${M.blockIndex(b)}` : '');
    return [n, b.label].filter(Boolean).join(' · ') || snippet(b.body.text, 40) || (p ? p.noun : 'Block');
  },
  /** Structures recorded on a component are immutable once the day turns (§3). */
  isLocked(b) { if (!b || b.kind !== 'component' || b.status === 'superseded') return false; if (localDate(b.created) === localDate(new Date())) return false; return (b.body.marks || []).some(m => m.type === 'struct' && (M.item(m.ref) || {}).originBlockId === b.id); },

  /* ---------------- projects / themes / aims ---------------- */
  createProject(name) { const p = { id: uid('p'), name, status: 'active', created: isoLocal(new Date()) }; DB.put('projects', p); changed(); return p; },
  createTheme(projectId, name, question = '', extra = {}) {
    const t = Object.assign({ id: uid('t'), projectId, name, question, status: 'active', supersedes: [], supersededBy: [], created: isoLocal(new Date()), reshapedAt: null }, extra);
    DB.put('themes', t); changed(); return t;
  },
  /** Theme lineage — retire, re-shape, merge and split all supersede; documents stay reachable. */
  retireTheme(t, reason) { t.status = 'retired'; t.retiredAt = isoLocal(new Date()); t.retireReason = reason || ''; DB.put('themes', t); changed(); },
  reshapeTheme(t, name, question) {
    const n = M.createTheme(t.projectId, name, question, { supersedes: [t.id], reshapedAt: isoLocal(new Date()) });
    t.status = 'superseded'; t.supersededBy = [n.id]; t.supersededAt = isoLocal(new Date()); DB.put('themes', t);
    DB.where('documents', d => d.themeId === t.id && +new Date(d.modified) > Date.now() - 864e5 * 14).forEach(d => { d.themeId = n.id; DB.put('documents', d); });
    DB.where('aims', a => a.themeId === t.id && a.status === 'active').forEach(a => { a.themeId = n.id; DB.put('aims', a); });
    changed(); return n;
  },
  mergeThemes(a, b, name) {
    const n = M.createTheme(a.projectId, name || a.name, a.question, { supersedes: [a.id, b.id] });
    [a, b].forEach(t => { t.status = 'superseded'; t.supersededBy = [n.id]; t.supersededAt = isoLocal(new Date()); DB.put('themes', t);
      DB.where('aims', x => x.themeId === t.id && x.status === 'active').forEach(x => { x.themeId = n.id; DB.put('aims', x); }); });
    changed(); return n;
  },
  splitTheme(t, names) {
    const ns = names.map(nm => M.createTheme(t.projectId, nm, '', { supersedes: [t.id] }));
    t.status = 'superseded'; t.supersededBy = ns.map(x => x.id); t.supersededAt = isoLocal(new Date()); DB.put('themes', t); changed(); return ns;
  },
  themeLineage(t) { const out = []; const walk = (x, g) => (x.supersedes || []).forEach(id => { const a = M.theme(id); if (a) { out.push({ t: a, gen: g }); walk(a, g + 1); } }); walk(t, 1); return out; },
  createAim(themeId, statement, milestones, extra = {}) {
    const a = Object.assign({ id: uid('a'), themeId, statement, status: 'active', supersedes: [], supersededBy: [], created: isoLocal(new Date()),
      milestones: milestones.map(m => ({ id: uid('ms'), label: m.label, weight: m.weight, metAt: m.metAt || null, evidenceRef: m.evidenceRef || null })) }, extra);
    DB.put('aims', a); changed(); return a;
  },
  /** Weights are immutable in place (§16.13): re-scoping creates a new aim version. */
  reviseAim(a, statement, milestones) {
    const n = M.createAim(a.themeId, statement, milestones, { supersedes: [a.id] });
    a.status = 'superseded'; a.supersededBy = [n.id]; a.supersededAt = isoLocal(new Date()); DB.put('aims', a); changed(); return n;
  },
  meetMilestone(aimId, msId, evidenceRef) {
    const a = M.aim(aimId), m = a.milestones.find(x => x.id === msId);
    if (m.metAt) { m.metAt = null; m.evidenceRef = null; } else { m.metAt = isoLocal(new Date()); m.evidenceRef = evidenceRef || null; }
    DB.put('aims', a); changed();
  },

  /* ---------------- documents ---------------- */
  createDoc({ type, projectId, themeId, title, templateId, header, date }) {
    const back = date && date !== localDate(new Date()) ? date : null, now = back ? EDIT.atOn(back) : new Date(), p = prof(type);
    const d = { id: uid('d'), type, scope: p.scope, projectId, themeId: p.scope === 'theme' ? themeId || null : null, title: title || `${p.label} · ${fmtDay(now)}`,
      templateId: templateId || null, header: Object.assign({ tags: [] }, header || {}), blockIds: [], synthesis: { text: '', marks: [] }, citeMode: settings().citeMode,
      layout: { head: { x: 0, y: 0 }, synth: null }, created: isoLocal(now), modified: isoLocal(new Date()), backdate: back };
    DB.put('documents', d);
    const tpl = templateId && DB.get('templates', templateId);
    const rows = tpl ? tpl.blocks : [{ label: '', body: '' }];
    rows.forEach((r, i) => M._newBlock(d, { label: r.label, body: { text: r.body || '', marks: [] }, x: r.x != null ? r.x : null, y: r.y != null ? r.y : null }));
    M.autoLayout(d); DB.put('documents', d); changed(); return d;
  },
  /** Run a protocol: a new experiment whose steps are BOUND to the protocol's steps (§4 — the join that pays off). */
  runProtocol(protocolId, { projectId, themeId, title, startTimer = true }) {
    const pr = M.doc(protocolId), now = new Date();
    const d = { id: uid('d'), type: 'experiment', scope: 'theme', projectId: projectId || pr.projectId, themeId, title: title || `${pr.title} — run ${fmtDay(now)}`, templateId: null,
      header: { tags: [], protocol: pr.title }, blockIds: [], synthesis: { text: '', marks: [] }, citeMode: settings().citeMode, layout: { head: { x: 0, y: 0 } }, created: isoLocal(now), modified: isoLocal(now) };
    DB.put('documents', d);
    for (const s of M.liveBlocks(pr.id).filter(b => b.kind === 'component')) {
      M._newBlock(d, { label: s.label || M.blockName(s), body: { text: s.body.text.replace(/￼/g, ''), marks: [] }, boundTo: { protocolId: pr.id, protocolVersion: pr.modified, componentId: s.id } });
    }
    M.autoLayout(d); DB.put('documents', d);
    if (startTimer) TIMER.start(d.id, true);
    changed(); return d;
  },
  touchDoc(d) { d.modified = isoLocal(new Date()); DB.put('documents', d); },
  setHeader(d, key, val) { d.header = Object.assign({}, d.header, { [key]: val }); M.touchDoc(d); changed(); },

  /** Place components that have no position yet: ordered types in a column, others in a loose grid. */
  autoLayout(d, force) {
    const p = prof(d.type), bs = d.blockIds.map(M.block).filter(b => b && b.status !== 'superseded');
    let y = 140, col = 0;
    const placed = bs.filter(b => b.x != null && !force);
    if (placed.length) y = Math.max(...placed.map(b => b.y + 150)) ;
    bs.forEach((b, i) => {
      if (b.x != null && !force) return;
      if (p.ordered) { b.x = 0; b.y = y; y += 154; }
      else { b.x = (col % 2) * 420; b.y = y; if (col % 2) y += 182; col++; }
      b.y = Math.round(b.y / 14) * 14; b.auto = true; DB.put('blocks', b);
    });
  },

  /* ---------------- blocks (components) ---------------- */
  _newBlock(d, init, afterId) {
    const now = new Date();
    const b = Object.assign({ id: uid('c'), docId: d.id, kind: 'component', label: '', body: { text: '', marks: [] }, status: 'live',
      supersedes: [], supersededBy: [], created: isoLocal(now), modified: isoLocal(now), manualSec: null, step: null, x: null, y: null, w: 392, fields: [], boundTo: null }, init);
    b.stamp = M.stampFor(d.id, now);
    DB.put('blocks', b);
    const i = afterId ? d.blockIds.indexOf(afterId) : -1;
    if (i >= 0) d.blockIds.splice(i + 1, 0, b.id); else d.blockIds.push(b.id);
    return b;
  },
  /** Stamp: creation time, editable within ±window; tied to a running timer on this note (or the note it connects to). */
  stampFor(docId, at = new Date(), viaBlockId) {
    const w = settings().stampWindowHours * 36e5;
    const st = { at: isoLocal(at), from: isoLocal(new Date(+at - w)), to: isoLocal(new Date(+at + w)) };
    const run = TIMER.runningFor(docId) || (viaBlockId && M.block(viaBlockId) && TIMER.runningFor(M.block(viaBlockId).docId));
    if (run) { st.sessionId = run.id; st.offsetMs = TIMER.elapsed(run, +at); }
    return st;
  },
  addBlock(docId, afterId, init = {}) { const d = M.doc(docId); const b = M._newBlock(d, init, afterId); if (b.x == null) { const a = afterId && M.block(afterId); if (a && a.x != null) { b.x = a.x; b.y = a.y + 150; } else M.autoLayout(d); DB.put('blocks', b); } M.touchDoc(d); changed(); return b; },
  saveBlockBody(b, body) { b.body = body; b.modified = isoLocal(new Date()); DB.put('blocks', b); const d = M.doc(b.docId); if (d) M.touchDoc(d); },
  moveBlock(b, x, y) { b.x = x; b.y = y; DB.put('blocks', b); },
  removeEmptyBlock(b) {
    if (b.body.text.trim() || b.supersedes.length || IX.wiresOf(b.id).length || b.kind === 'ref') return false;
    let d = M.doc(b.docId); d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== b.id) }); DB.put('documents', d); DB.del('blocks', b.id); changed(); return true;
  },
  /** Remove a pulled-in reference (the original stays where it was written). */
  removeRef(b) { if (b.kind !== 'ref') return false; let d = M.doc(b.docId); d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== b.id) }); DB.put('documents', d); b.status = 'removed'; DB.put('blocks', b); changed(); return true; },
  setStamp(b, dt) {
    const t = new Date(dt), lo = new Date(b.stamp.from), hi = new Date(b.stamp.to);
    if (t < lo || t > hi) { toast(`Stamps can move within ±${settings().stampWindowHours} h of creation`); return false; }
    b.stamp.at = isoLocal(t); DB.put('blocks', b); changed(); return true;
  },
  setManual(b, sec) { b.manualSec = sec; DB.put('blocks', b); changed(); },
  setFields(b, fields) { b.fields = fields; DB.put('blocks', b); changed(); },

  /** Supersede: the old wording survives beneath its successors (a DAG, §5). */
  splitBlock(b, parts) {
    const d = M.doc(b.docId); let after = b.id; const succ = [];
    parts.forEach((p, i) => { const n = M._newBlock(d, { label: p.label, body: { text: p.text, marks: [] }, supersedes: [b.id], x: b.x + i * 28, y: b.y + i * 168, w: b.w, boundTo: b.boundTo }, after); after = n.id; succ.push(n.id); });
    b.status = 'superseded'; b.supersededBy = succ; b.supersededAt = isoLocal(new Date()); DB.put('blocks', b);
    if (succ.length > 1) { const shift = 168 * (succ.length - 1); M.liveBlocks(d.id).filter(x => x.y > b.y && !succ.includes(x.id)).forEach(x => { x.y += shift; DB.put('blocks', x); }); }
    M.touchDoc(d); changed(); return succ;
  },
  reviseBlock(b) { return M.splitBlock(b, [{ label: b.label, text: b.body.text.replace(/￼/g, '') }]); },
  mergeBlocks(a, bb) {
    const d = M.doc(a.docId);
    const n = M._newBlock(d, { label: a.label || bb.label, body: { text: (a.body.text + ' ' + bb.body.text).replace(/￼/g, ''), marks: [] }, supersedes: [a.id, bb.id], x: a.x, y: a.y, w: Math.max(a.w || 392, bb.w || 392), boundTo: a.boundTo || bb.boundTo }, bb.id);
    [a, bb].forEach(x => { x.status = 'superseded'; x.supersededBy = [n.id]; x.supersededAt = isoLocal(new Date()); DB.put('blocks', x); });
    M.touchDoc(d); changed(); return n;
  },
  /** Generation-aware history of a component and its ancestors (§5 historyFor). */
  historyFor(blockId, depth = Infinity) {
    const seen = new Set(), out = [];
    (function walk(id, gen) {
      if (seen.has(id) || gen > depth) return; seen.add(id);
      const b = M.block(id); if (!b) return;
      IX.itemsOriginatingIn(id).forEach(it => out.push(Object.assign({ generation: gen, at: id }, { it })));
      for (const anc of b.supersedes || []) walk(anc, gen + 1);
    })(blockId, 0);
    return out;
  },

  /* ---------------- items (structures) ---------------- */
  createItem(kind, text, block, extra = {}) {
    const d = M.doc(block.docId);
    const it = Object.assign({ id: uid('i'), kind, text: text.replace(/￼/g, '').trim(), projectId: d.projectId, originDocId: d.id, originBlockId: block.id,
      status: KIND[kind].lifecycle === 'open' ? 'open' : null, stance: kind === 'claim' ? 'supported' : null, resolves: null, sourceRef: kind === 'evidence' ? { type: 'doc', id: d.id } : null,
      relatedClaims: [], corrects: null, created: isoLocal(new Date()) }, extra);
    DB.put('items', it); return it;
  },
  setItem(it, patch) { Object.assign(it, patch); it.modified = isoLocal(new Date()); DB.put('items', it); changed(); },
  /** Before the day turns a wording can be fixed in place; after, a correction is a NEW record that points at the old one. */
  correctItem(it, text) {
    if (localDate(it.created) === localDate(new Date())) { M.setItem(it, { text }); return it; }
    const b = M.block(it.originBlockId) || {};
    const n = Object.assign({}, it, { id: uid('i'), text, corrects: it.id, created: isoLocal(new Date()), relatedClaims: it.relatedClaims || [] });
    DB.put('items', n); it.correctedBy = n.id; DB.put('items', it);
    if (b.id) { b.body.marks.forEach(m => { if (m.type === 'struct' && m.ref === it.id) m.ref = n.id; }); DB.put('blocks', b); }
    changed(); return n;
  },
  closeItem(it) { it.status = 'closed'; it.closedAt = isoLocal(new Date()); DB.put('items', it); changed(); },
  reopenItem(it) { it.status = 'open'; it.closedAt = null; DB.put('items', it); changed(); },
  relateClaims(a, b) { a.relatedClaims = [...new Set([...(a.relatedClaims || []), b.id])]; b.relatedClaims = [...new Set([...(b.relatedClaims || []), a.id])]; DB.put('items', a); DB.put('items', b); changed(); },

  /** Pull a structure (e.g. an unresolved barrier) or a whole component into another note. */
  pullInto(docId, afterId, { itemId, blockId, x, y }) {
    return M.addBlock(docId, afterId, { kind: 'ref', refItemId: itemId || null, refBlockId: blockId || (itemId ? M.item(itemId).originBlockId : null), x: x != null ? x : null, y: y != null ? y : null, w: 392 });
  },

  /* ---------------- wires ---------------- */
  wire(from, to, rel = 'leads', directed = true) {
    if (from === to) return null;
    const w = { id: uid('w'), from, to, rel, directed, created: isoLocal(new Date()) };
    DB.put('wires', w);
    // connecting a fresh component to one whose note has a running timer stamps it against that timer
    [from, to].forEach(id => { const b = M.block(id), other = M.block(id === from ? to : from);
      if (b && other && !(b.stamp && b.stamp.sessionId)) { const r = TIMER.runningFor(other.docId); if (r && +new Date(b.created) > Date.now() - 10 * 6e4) { b.stamp = M.stampFor(b.docId, new Date(b.created), other.id); DB.put('blocks', b); } } });
    changed(); return w;
  },
  setWire(w, patch) { Object.assign(w, patch); DB.put('wires', w); changed(); },
  unwire(id) { DB.del('wires', id); changed(); },

  /* ---------------- terms ---------------- */
  findOrCreateTerm(projectId, label) {
    const key = label.trim().toLowerCase();
    let t = DB.all('terms').find(x => x.projectId === projectId && x.label.toLowerCase() === key);
    if (!t) { t = { id: uid('w'), projectId, label: label.trim(), importedFrom: null, created: isoLocal(new Date()) }; DB.put('terms', t); }
    return t;
  },
  importTerm(termId, toProjectId) {
    const src = M.term(termId);
    let t = DB.all('terms').find(x => x.projectId === toProjectId && x.label.toLowerCase() === src.label.toLowerCase());
    if (t) { t.importedFrom = t.importedFrom || termId; DB.put('terms', t); }
    else { t = { id: uid('w'), projectId: toProjectId, label: src.label, importedFrom: termId, created: isoLocal(new Date()) }; DB.put('terms', t); }
    changed(); return t;
  },
  termFamily(termId) {
    const all = DB.all('terms'), fam = new Set([termId]); let grew = true;
    while (grew) { grew = false; for (const t of all) { if (fam.has(t.id) && t.importedFrom && !fam.has(t.importedFrom)) { fam.add(t.importedFrom); grew = true; } if (t.importedFrom && fam.has(t.importedFrom) && !fam.has(t.id)) { fam.add(t.id); grew = true; } } }
    return [...fam];
  },

  /* ---------------- flags (on anything) ---------------- */
  flagFor(type, id) { return DB.all('flags').find(f => f.targetType === type && f.targetId === id && f.status === 'open'); },
  setFlag(type, id, reason = '') {
    const prevF = DB.all('flags').filter(f => f.targetType === type && f.targetId === id).sort((a, b) => b.created.localeCompare(a.created))[0];
    DB.put('flags', { id: uid('f'), targetType: type, targetId: id, reason, carry: 0, reflagged: prevF ? (prevF.reflagged || 0) + 1 : 0, status: 'open', created: isoLocal(new Date()), history: [] }); changed();
  },
  clearFlag(type, id) { const f = M.flagFor(type, id); if (f) { f.status = 'resolved'; f.resolvedAt = isoLocal(new Date()); f.resolvedBy = { type: 'unflag' }; DB.put('flags', f); changed(); } },
  async toggleFlag(type, id) { if (M.flagFor(type, id)) { M.clearFlag(type, id); toast('Flag cleared'); } else { const r = await askText('Flag for the weekly review', 'Reason (optional)'); if (r !== null) { M.setFlag(type, id, r); toast('Flagged — it will come up at the next review'); } } },
  describeTarget(type, id) {
    if (type === 'block') { const b = M.block(id); return b ? { title: M.blockName(b), sub: M.docPath(M.doc(b.docId)), go: () => App.openBlock(id) } : null; }
    if (type === 'item') { const it = M.item(id); return it ? { title: `${KIND[it.kind].label}: ${snippet(it.text, 70)}`, sub: M.docPath(M.doc(it.originDocId)), kind: it.kind, go: () => App.openBlock(it.originBlockId) } : null; }
    if (type === 'doc') { const d = M.doc(id); return d ? { title: d.title, sub: M.docPath(d), go: () => App.go('#/doc/' + id) } : null; }
    if (type === 'library') { const l = M.lib(id); return l ? { title: l.title, sub: LIB.shortRef(l), go: () => App.go('#/library') } : null; }
    if (type === 'term') { const t = M.term(id); return t ? { title: t.label, sub: 'term', go: () => App.go('#/lens/' + id) } : null; }
    if (type === 'theme') { const t = M.theme(id); return t ? { title: t.name, sub: 'theme', go: () => App.go('#/theme/' + id) } : null; }
    return null;
  },

  /* ---------------- templates & profiles ---------------- */
  templatesFor(type) { return DB.all('templates').filter(t => t.type === type).sort((a, b) => (b.isStandard - a.isStandard) || a.name.localeCompare(b.name)); },
  enabledTemplates(type) { return M.templatesFor(type).filter(t => t.enabled); },
  saveAsTemplate(doc, name) {
    const live = M.liveBlocks(doc.id).filter(b => b.kind === 'component'), x0 = Math.min(...live.map(b => b.x || 0)), y0 = Math.min(...live.map(b => b.y || 0));
    const t = { id: uid('tp'), type: doc.type, name, isStandard: false, enabled: true, blocks: live.map(b => ({ label: b.label, body: '', x: (b.x || 0) - x0, y: (b.y || 0) - y0 + 140 })) };
    DB.put('templates', t); changed(); return t;
  },
  saveProfile(p) { DB.put('profiles', p); loadProfiles(); ensureStandardTemplates(); changed(); },

  /* ---------------- blobs ---------------- */
  putBlob(dataUrl, name, mime) { const b = { id: uid('bl'), mime: mime || 'image/png', name: name || '', data: dataUrl, created: isoLocal(new Date()) }; DB.put('blobs', b); return b; },
};

function ensureStandardTemplates() {
  for (const p of userProfiles()) {
    if (M.templatesFor(p.type).some(t => t.isStandard)) continue;
    const rows = STANDARD_TEMPLATES[p.type] || [['', '']];
    DB.put('templates', { id: 'tp_std_' + p.type, type: p.type, name: `Standard ${p.label.toLowerCase()}`, isStandard: true, enabled: true, blocks: rows.map(([label, body]) => ({ label, body })) });
  }
}

let _changedT = null, _suppress = 0;
function changed() {
  IX.rebuild(); DB.beginGroup();
  if (_suppress) return;
  clearTimeout(_changedT);
  _changedT = setTimeout(() => App.refresh(), 0);
}
