/* ==========================================================================
   06 · Derived index — everything here is regenerable from authored stores.
   Never written to disk; rebuilt on every change (cheap at single-user
   scale; see notes for when to move hot paths into IndexedDB stores).
   ========================================================================== */
const IX = {
  rebuild() {
    const t0 = performance.now();
    const blocks = DB.all('blocks').filter(b => b.status !== 'removed'), items = DB.all('items'), wires = DB.all('wires');
    this.blockItems = new Map(); this.itemMentions = new Map(); this.refsOfItem = new Map(); this.refsOfBlock = new Map();
    this.wOut = new Map(); this.wIn = new Map(); this.resolutions = new Map();
    this.termOcc = new Map(); this.blockTerms = new Map(); this.citations = new Map(); this.itemTerms = new Map();
    this.origin = new Map(); this.stepObs = new Map(); this.bound = new Map(); this.links = new Map(); this.linksOut = new Map(); this.fields = [];
    const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };

    for (const b of blocks) {
      for (const mk of b.body.marks || []) {
        if (mk.type === 'struct') { push(this.blockItems, b.id, mk.ref); push(this.itemMentions, mk.ref, { blockId: b.id, origin: (M.item(mk.ref) || {}).originBlockId === b.id }); }
        if (mk.type === 'cite') push(this.citations, mk.ref, b.id);
        if (mk.type === 'link') { push(this.linksOut, b.id, mk); if (mk.ref) push(this.links, mk.ref, { blockId: b.id, mark: mk }); }
      }
      if (b.boundTo && b.boundTo.componentId) push(this.bound, b.boundTo.componentId, b.id);
      for (const f of b.fields || []) this.fields.push({ blockId: b.id, docId: b.docId, key: f.key, value: f.value });
      if (b.kind === 'ref') { if (b.refItemId) push(this.refsOfItem, b.refItemId, b.id); if (b.refBlockId) push(this.refsOfBlock, b.refBlockId, b.id); }
    }
    for (const it of items) { if (it.kind === 'resolution' && it.resolves) push(this.resolutions, it.resolves, it.id); push(this.origin, it.originBlockId, it); if (it.step) push(this.stepObs, it.step.protocolId + ':' + it.step.stepId, it); }
    for (const d of DB.all('documents')) for (const mk of (d.synthesis && d.synthesis.marks) || []) if (mk.type === 'link' && mk.ref) push(this.links, mk.ref, { docId: d.id, mark: mk });
    for (const w of wires) { push(this.wOut, w.from, w); push(this.wIn, w.to, w); }

    // term occurrences: term mark → the sentence it sits in → structures in that sentence
    for (const b of blocks) {
      const tx = b.body.text, marks = b.body.marks || [];
      for (const mk of marks) {
        if (mk.type !== 'term') continue;
        const [ss, se] = sentenceAround(tx, mk.from, mk.to);
        const its = marks.filter(x => x.type === 'struct' && x.from < se && x.to > ss).map(x => x.ref);
        push(this.termOcc, mk.ref, { blockId: b.id, docId: b.docId, from: mk.from, to: mk.to, itemIds: its, direct: true });
        if (!this.blockTerms.has(b.id)) this.blockTerms.set(b.id, new Set());
        this.blockTerms.get(b.id).add(mk.ref);
        its.forEach(i => { if (!this.itemTerms.has(i)) this.itemTerms.set(i, new Set()); this.itemTerms.get(i).add(mk.ref); });
      }
    }
    // a pulled-in structure carries its terms into the note it was pulled into
    for (const b of blocks) {
      if (b.kind !== 'ref' || !b.refItemId) continue;
      const ts = this.itemTerms.get(b.refItemId); if (!ts) continue;
      for (const tid of ts) {
        push(this.termOcc, tid, { blockId: b.id, docId: b.docId, itemIds: [b.refItemId], direct: false });
        if (!this.blockTerms.has(b.id)) this.blockTerms.set(b.id, new Set()); this.blockTerms.get(b.id).add(tid);
      }
    }
    // mentions of an existing structure carry its terms too ("references the previous claim")
    for (const [iid, ms] of this.itemMentions) {
      const ts = this.itemTerms.get(iid); if (!ts) continue;
      for (const m of ms) if (!m.origin) for (const tid of ts) {
        if (!this.blockTerms.has(m.blockId)) this.blockTerms.set(m.blockId, new Set());
        if (!this.blockTerms.get(m.blockId).has(tid)) { this.blockTerms.get(m.blockId).add(tid); push(this.termOcc, tid, { blockId: m.blockId, docId: M.block(m.blockId).docId, itemIds: [iid], direct: false }); }
      }
    }
    this.buildDays();
    this.ms = performance.now() - t0;
  },

  itemsOriginatingIn(blockId) { return this.origin.get(blockId) || []; },
  /** Protocol step roll-up (§5): every structure recorded at this step, any ancestor wording, and every bound run. */
  rollup(protocolBlockId) {
    const out = [], seen = new Set();
    const walkAnc = (id, gen, via) => { if (seen.has(id + ':' + via)) return; seen.add(id + ':' + via); const b = M.block(id); if (!b) return;
      for (const it of this.itemsOriginatingIn(id)) out.push({ it, generation: gen, via, blockId: id });
      for (const runId of via === 'self' ? (this.bound.get(id) || []) : []) for (const it of this.itemsOriginatingIn(runId)) out.push({ it, generation: gen, via: 'run', blockId: runId });
      (b.supersedes || []).forEach(a => walkAnc(a, gen + 1, via)); };
    walkAnc(protocolBlockId, 0, 'self');
    return out;
  },
  boundRuns(protocolBlockId) { const ids = new Set(); const walk = id => { (this.bound.get(id) || []).forEach(x => ids.add(x)); const b = M.block(id); (b && b.supersedes || []).forEach(walk); }; walk(protocolBlockId); return [...ids].map(M.block).filter(Boolean); },
  backlinks(id) { return this.links.get(id) || []; },
  wiresOf(id) { return [...(this.wOut.get(id) || []), ...(this.wIn.get(id) || [])]; },
  itemsOf(blockId) { return [...new Set(this.blockItems.get(blockId) || [])].map(M.item).filter(Boolean); },
  /** Structure kinds present in a block (own marks, or the item it embeds). */
  kindsOf(b) {
    const ks = this.itemsOf(b.id).map(i => i.kind);
    if (b.kind === 'ref' && b.refItemId && M.item(b.refItemId)) ks.unshift(M.item(b.refItemId).kind);
    return [...new Set(ks)];
  },
  status(it) {
    if (!it) return null;
    if (it.status === 'closed') return 'closed';
    if (it.kind === 'barrier') return (this.resolutions.get(it.id) || []).length ? 'resolved' : 'open';
    return it.status;
  },
  degree(id) {
    return (this.wiresOf(id).length) + ((this.itemMentions.get(id) || []).length) + ((this.refsOfItem.get(id) || []).length) + ((this.refsOfBlock.get(id) || []).length) + ((this.blockTerms.get(id) || new Set()).size);
  },
  openBarriers(projectId) {
    return DB.where('items', i => i.kind === 'barrier' && (!projectId || i.projectId === projectId)).filter(i => this.status(i) === 'open');
  },
  pullable(projectId) { return DB.where('items', i => i.kind === 'barrier' && i.status !== 'closed' && (!projectId || i.projectId === projectId)); },

  linkTarget(mk) { if (!mk.ref) return null; return M.doc(mk.ref) ? { type: 'doc', d: M.doc(mk.ref) } : M.block(mk.ref) ? { type: 'block', b: M.block(mk.ref) } : null; },

  /* ---------------- time ---------------- */
  buildDays(now = Date.now()) {
    const days = new Map(), get = d => { if (!days.has(d)) days.set(d, { date: d, iv: [], manual: 0, byTheme: {}, edits: 0, open: 0 }); return days.get(d); };
    for (const iv of TIMER.intervals(now)) for (const p of TIMER.splitByDay(iv.s, iv.e)) { const D = get(p.date); D.iv.push({ s: p.s, e: p.e }); D.byTheme[iv.themeId || '_'] = (D.byTheme[iv.themeId || '_'] || 0) + (p.e - p.s); }
    for (const s of DB.all('sessions')) {
      if (s.entry === 'duration') { const D = get(s.localDate); D.manual += s.seconds * 1000; D.byTheme[s.themeId || '_'] = (D.byTheme[s.themeId || '_'] || 0) + s.seconds * 1000; }
      if (s.state === 'open') get(localDate(s.startedAt || s.endedAt || s.created)).open++;
    }
    for (const b of DB.all('blocks')) { if (b.status === 'removed') continue;
      get(localDate(b.created)).edits++;
      if (b.modified && localDate(b.modified) !== localDate(b.created)) get(localDate(b.modified)).edits++;
      if (b.manualSec) { const D = get(localDate(M.blockTime(b))), d = M.doc(b.docId); D.manual += b.manualSec * 1000; const t = d && d.themeId || '_'; D.byTheme[t] = (D.byTheme[t] || 0) + b.manualSec * 1000; }
    }
    for (const D of days.values()) { D.raw = sum(D.iv.map(x => x.e - x.s)); D.union = TIMER.union(D.iv); D.multi = D.raw - D.union; D.total = D.union + D.manual; }
    this.days = days;
  },
  day(d) { return this.days.get(typeof d === 'string' ? d : localDate(d)) || { date: localDate(d), total: 0, union: 0, multi: 0, manual: 0, byTheme: {}, edits: 0, open: 0 }; },
  level(ms) { const m = ms / 6e4; return m <= 0 ? 0 : m < 45 ? 1 : m < 105 ? 2 : m < 165 ? 3 : m < 240 ? 4 : 5; },

  /* ---------------- weeks & review ---------------- */
  weekStartFor(d) { d = dayStart(d); const ws = settings().weekStartDow; while (d.getDay() !== ws) d = addDays(d, -1); return d; },
  inWin(iso, a, b) { const t = +new Date(iso); return t >= +a && t < +b; },
  weekStats(ws) {
    const a = dayStart(ws), b = addDays(a, 7), inW = x => x && this.inWin(x, a, b);
    const items = DB.where('items', i => inW(i.created));
    const byKind = Object.fromEntries(KINDS.map(k => [k.id, items.filter(i => i.kind === k.id).length]));
    const resolvedBarriers = items.filter(i => i.kind === 'resolution' && i.resolves).length;
    const docsCreated = DB.where('documents', d => inW(d.created)), docsEdited = DB.where('documents', d => inW(d.modified) && !inW(d.created));
    let union = 0, multi = 0, manual = 0; const byTheme = {}, perDay = [];
    for (let i = 0; i < 7; i++) { const D = this.day(addDays(a, i)); union += D.union; multi += D.multi; manual += D.manual; perDay.push(D); for (const [t, v] of Object.entries(D.byTheme)) byTheme[t] = (byTheme[t] || 0) + v; }
    // per-term breakdown by structure kind — the raw stats §6 asked for
    const terms = [];
    for (const t of DB.all('terms')) {
      const ks = {}; let n = 0;
      for (const o of this.termOcc.get(t.id) || []) for (const iid of o.itemIds) { const it = M.item(iid); if (it && inW(it.created)) { ks[it.kind] = (ks[it.kind] || 0) + 1; n++; } }
      if (n) terms.push({ term: t, kinds: ks, n });
    }
    terms.sort((x, y) => y.n - x.n);
    const openSessions = DB.where('sessions', s => s.state === 'open');
    const aimBoost = sum(DB.all('aims').flatMap(am => am.milestones.filter(m => inW(m.metAt)).map(m => m.weight))) * 4;
    return { a, b, items, byKind, resolvedBarriers, docsCreated, docsEdited, union, multi, manual, total: union + manual, byTheme, perDay, terms, openSessions, aimBoost };
  },
  reviewWeeks() {
    const s = settings(), now = new Date(), cur = this.weekStartFor(now);
    const dates = [...DB.all('blocks').map(b => +new Date(b.created)), ...DB.all('sessions').map(x => +new Date(x.created))];
    if (!dates.length) return [];
    let w = this.weekStartFor(new Date(Math.min(...dates))); const out = [];
    while (+w <= +cur) {
      const id = localDate(w), rv = DB.get('reviews', id), availableAt = addDays(w, 7);
      const status = rv && rv.status === 'complete' ? 'complete' : now >= availableAt ? 'pending' : (s.reviewPreview ? 'preview' : 'upcoming');
      out.push({ id, start: w, end: addDays(w, 6), availableAt, status, rv });
      w = addDays(w, 7);
    }
    return out.reverse();
  },
  pendingReviews() { return this.reviewWeeks().filter(w => w.status === 'pending'); },

  /* ---------------- theme health ---------------- */
  themeHealth(t) {
    const docs = DB.where('documents', d => d.themeId === t.id), ids = new Set(docs.map(d => d.id));
    const blocks = DB.where('blocks', b => ids.has(b.docId));
    const last = Math.max(0, ...blocks.map(b => +new Date(b.modified || b.created)), ...DB.where('sessions', s => s.themeId === t.id).map(s => +new Date(s.created)));
    const openB = DB.where('items', i => ids.has(i.originDocId) && i.kind === 'barrier' && this.status(i) === 'open');
    let ms4 = 0; for (let i = 0; i < 28; i++) ms4 += (this.day(addDays(new Date(), -i)).byTheme[t.id] || 0);
    const evid = DB.where('items', i => ids.has(i.originDocId) && (i.kind === 'evidence' || i.kind === 'result')).length;
    const aims = DB.where('aims', a => a.themeId === t.id && a.status === 'active');
    const days = last ? Math.floor((Date.now() - last) / 864e5) : null;
    return { docs, last, days, openB, ms4, evid, aims, stalled: days !== null && days >= 21, wip: docs.filter(d => +new Date(d.modified) > Date.now() - 7 * 864e5).length };
  },

  /* ---------------- term lens: explicit, via, referenced and suggested links ---------------- */
  termGraph(termId, scope, scopeId, withImported) {
    const fam = withImported ? M.termFamily(termId) : [termId];
    const inScope = b => { const d = M.doc(b.docId); if (!d) return false;
      if (scope === 'doc') return d.id === scopeId;
      if (scope === 'theme') return d.themeId === scopeId;
      return d.projectId === scopeId || (withImported && fam.length > 1); };
    const T = new Map();
    for (const tid of fam) for (const o of this.termOcc.get(tid) || []) { const b = M.block(o.blockId); if (b && inScope(b)) T.set(b.id, { id: b.id, b, term: tid }); }
    const nodes = new Map([...T].map(([k, v]) => [k, Object.assign(v, { via: false })]));
    const edges = [], has = new Set(), key = (a, b) => a + '>' + b;
    const add = (e) => { const k = key(e.from, e.to); if (has.has(k)) return; has.add(k); edges.push(e); };
    // implicit "pulled into" + "mentioned in" edges
    const implicit = [];
    for (const b of DB.all('blocks').filter(x => x.status !== 'removed')) {
      if (b.kind === 'ref' && b.refItemId) { const it = M.item(b.refItemId); if (it) implicit.push({ from: it.originBlockId, to: b.id, rel: 'pulled' }); }
      for (const mk of b.body.marks || []) if (mk.type === 'struct') { const it = M.item(mk.ref); if (it && it.originBlockId !== b.id) implicit.push({ from: it.originBlockId, to: b.id, rel: 'mentions' }); }
    }
    const adj = new Map(), padj = (a, e) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(e); };
    for (const w of DB.all('wires')) { padj(w.from, { to: w.to, rel: w.rel, wire: w }); if (!w.directed) padj(w.to, { to: w.from, rel: w.rel, wire: w }); }
    implicit.forEach(e => padj(e.from, { to: e.to, rel: e.rel }));
    // direct edges between term nodes; via-edges through up to 2 intermediates
    for (const a of T.keys()) {
      for (const e of adj.get(a) || []) if (T.has(e.to)) add({ from: a, to: e.to, type: e.wire ? 'x' : 'r', rel: e.rel, wireId: e.wire && e.wire.id });
      const q = [[a, []]], seen = new Set([a]);
      while (q.length) {
        const [cur, path] = q.shift(); if (path.length > 2) continue;
        for (const e of adj.get(cur) || []) {
          if (seen.has(e.to)) continue; seen.add(e.to);
          if (T.has(e.to)) { if (path.length) { add({ from: a, to: e.to, type: 'v', via: path.slice() }); path.forEach(v => { if (!nodes.has(v) && M.block(v)) nodes.set(v, { id: v, b: M.block(v), via: true }); }); } }
          else q.push([e.to, [...path, e.to]]);
        }
      }
    }
    // suggested: same term, kind succession, close in time, nothing connecting them yet
    const SUCC = { claim: ['barrier', 'result', 'takeaway', 'evidence', 'resolution'], barrier: ['resolution', 'decision'], question: ['claim', 'result', 'takeaway'], observation: ['claim', 'barrier'], result: ['takeaway', 'claim'], evidence: ['claim', 'takeaway'], deviation: ['barrier'], resolution: ['result', 'takeaway'] };
    const reach = (a, b) => { const st = [a], sn = new Set([a]); while (st.length) { const c = st.pop(); if (c === b) return true; for (const e of adj.get(c) || []) if (!sn.has(e.to)) { sn.add(e.to); st.push(e.to); } } return false; };
    const win = settings().inferWindowDays * 864e5;
    const tn = [...T.values()].map(n => Object.assign(n, { t: +new Date(M.blockTime(n.b)), kinds: this.kindsOf(n.b) })).sort((x, y) => x.t - y.t);
    for (let j = 0; j < tn.length; j++) {
      const B = tn[j];
      for (let i = j - 1; i >= 0; i--) {
        const A = tn[i]; if (B.t - A.t > win) break;
        const dA = M.doc(A.b.docId), dB = M.doc(B.b.docId);
        if (dA.projectId !== dB.projectId && !withImported) continue;
        if (reach(A.id, B.id) || reach(B.id, A.id)) continue;
        const pair = A.kinds.flatMap(ka => B.kinds.filter(kb => (SUCC[ka] || []).includes(kb)).map(kb => [ka, kb]))[0];
        if (!pair) continue;
        const vk = 'sg:' + A.id + '>' + B.id; if (DB.get('verdicts', vk)) continue;
        add({ from: A.id, to: B.id, type: 's', rel: pair.join('→'), key: vk });
        break; // nearest predecessor only — keeps the lens readable
      }
    }
    // insights from directed paths
    const insights = [], nodeKinds = id => nodes.has(id) ? this.kindsOf(nodes.get(id).b) : [];
    const dirAdj = new Map(); edges.filter(e => e.type !== 's').forEach(e => { const [f, t] = e.rel === 'resolves' ? [e.to, e.from] : [e.from, e.to]; if (!dirAdj.has(f)) dirAdj.set(f, []); dirAdj.get(f).push(t); });
    const paths = (a) => { const out = [], st = [[a, [a]]]; while (st.length) { const [c, p] = st.pop(); for (const n of dirAdj.get(c) || []) if (!p.includes(n)) { out.push([...p, n]); if (p.length < 6) st.push([n, [...p, n]]); } } return out; };
    const label = id => M.blockName(M.block(id)), seenPair = new Set();
    for (const a of T.keys()) {
      const ka = nodeKinds(a); if (!ka.length) continue;
      for (const p of paths(a).sort((x, y) => x.length - y.length)) {
        const z = p[p.length - 1], kz = nodeKinds(z); if (!T.has(z)) continue;
        if (ka.includes('claim') && kz.includes('barrier')) {
          const bk = 'cb:' + a + ':' + (this.itemsOf(z).concat(M.block(z).refItemId ? [M.item(M.block(z).refItemId)] : []).find(i => i && i.kind === 'barrier') || {}).id;
          if (seenPair.has(bk)) continue; seenPair.add(bk);
          const cites = (M.block(a).body.marks || []).filter(m => m.type === 'cite').map(m => M.lib(m.ref)).filter(Boolean);
          insights.push({ cls: 'warn', title: 'A claim on this term preceded a barrier on it', body: `“${label(a)}” ⇝ “${label(z)}” (${p.length - 1} step${p.length > 2 ? 's' : ''}). Check whether the barrier comes from an assumption or a wrong conclusion in the claim.` + (cites.length ? ` The claim cites ${cites.map(c => LIB.shortRef(c)).join(', ')} — the source may report conditions that do not transfer.` : '') + (() => { const cl = this.itemsOf(a).find(i => i.kind === 'claim'); return cl && cl.stance === 'supported' ? ' The claim is still marked supported — consider contesting it.' : ''; })(), path: p });
        }
        if (ka.includes('barrier') && kz.includes('resolution') && !seenPair.has('br:' + a) && seenPair.add('br:' + a)) insights.push({ cls: 'ok', title: 'Barrier → resolution', body: `Resolved in ${Math.max(0, Math.round((+new Date(M.blockTime(M.block(z))) - +new Date(M.blockTime(M.block(a)))) / 864e5))} days across ${new Set(p.map(x => M.block(x).docId)).size} note(s).`, path: p });
        if (ka.includes('claim') && (kz.includes('result') || kz.includes('takeaway')) && p.length >= 3 && !seenPair.has('cr:' + a + z) && seenPair.add('cr:' + a + z)) insights.push({ cls: '', title: 'Claim chain reached a result', body: `${p.length} connected components from “${label(a)}” to “${label(z)}” share this term — treated as one line of evidence.`, path: p });
      }
    }
    for (const n of T.values()) for (const it of this.itemsOf(n.id)) if (it.kind === 'barrier' && this.status(it) === 'open') insights.push({ cls: 'warn', title: 'Open barrier', body: `“${snippet(it.text, 80)}” has no resolution yet.`, path: [n.id] });
    const seenI = new Set(); const uniq = insights.filter(i => { const k = i.title + i.path.join(); if (seenI.has(k)) return false; seenI.add(k); return true; });
    return { nodes: [...nodes.values()], edges, insights: uniq.slice(0, 12), fam };
  },
};

function sentenceAround(t, a, b) {
  let s = a; while (s > 0 && !/[.!?;\n]/.test(t[s - 1])) s--;
  let e = b; while (e < t.length && !/[.!?;\n]/.test(t[e])) e++;
  return [s, Math.min(t.length, e + 1)];
}
