/* ==========================================================================
   13zzi · Component kinds, wires onto a structure, authors as terms
   (V3.951, Gabe's SiS Shaping, Phase F; rebuilt in V3.955).
   • A component can be a kind of its own — Hypothesis, Question, Verdict,
     Method, Meeting, Feedback, Story (and yours, Settings → Component
     kinds): double-click the label left of its title to choose; none
     chosen is "standard". The kind colours the header and the left edge and
     names the label; the box keeps its shape and fill.
   • Each kind says the ONLY ways it links (CKINDS.BASE[].links): a relation,
     what it links with (a kind, a structure the other component carries, or
     what the other component is: evidence, a question, an image panel, a
     paper…) and the direction. A Hypothesis fuels a question; evidence
     supports or contradicts a hypothesis; a Method tests it… A wire between
     two components goes one of those ways or not at all: a drop offers just
     them (one way connects at once; none says what the kind links to), the
     drop on empty paper lists them, a wire's menu changes it only to another
     of them. Two standard components link as before, any way.
   • Kinds sit on top of structures: a wire can end on a structure inside a
     component, not only on the component. Drop it on the claim, the
     observation… and the wire records `toItem`; it is drawn to that mark,
     and the structure's hover card lists what ends there.
   • Authors of the library's papers are terms of a kind of their own
     ("person", auto, with their papers), marked in the text like any term.
   ========================================================================== */
/* the kinds' own relations, besides the standard ones (02-schema RELATIONS); `next` is the story's bare arrow */
const KREL = [
  { id: 'fuels',       label: 'fuels',       dir: true, verb: 'fuels',        inv: 'fuelled by' },
  { id: 'tests',       label: 'tests',       dir: true, verb: 'tests',        inv: 'tested by' },
  { id: 'predicts',    label: 'predicts',    dir: true, verb: 'predicts',     inv: 'predicted by' },
  { id: 'refines',     label: 'refines',     dir: true, verb: 'refines',      inv: 'refined by' },
  { id: 'answers',     label: 'answers',     dir: true, verb: 'answers',      inv: 'answered by' },
  { id: 'produces',    label: 'produces',    dir: true, verb: 'produces',     inv: 'produced by' },
  { id: 'illustrates', label: 'illustrates', dir: true, verb: 'illustrates',  inv: 'illustrated by' },
  { id: 'next',        label: '',            dir: true, verb: 'goes on into', inv: 'goes on from', arrow: true, name: 'just the arrow' },
];
KREL.forEach(r => { REL[r.id] = r; });
Object.assign(WIRECOL, { fuels: '#c98a1c', tests: '#2f6fb0', predicts: '#7a4fc9', refines: '#5f8f3a', answers: '#3f9a6a', produces: '#3a8f8f', illustrates: '#8a8f98', next: '#55606e' });
const CKINDS = {
  /** What a link can be with — a kind, a structure the component carries, or what the component is — and how it reads. */
  CLASSES: { any: 'anything', hypothesis: 'a Hypothesis', question: 'a question', verdict: 'a Verdict', method: 'a Method', meeting: 'a Meeting', feedback: 'Feedback', story: 'a Story',
    evidence: 'evidence', claim: 'a claim', observation: 'an observation', result: 'a result', barrier: 'a barrier', decision: 'a decision', idea: 'an idea', takeaway: 'a takeaway', resolution: 'a resolution',
    task: 'a task', figure: 'an image panel', run: 'a protocol run', protocol: 'a protocol', material: 'a material', paper: 'a paper', note: 'a note', person: 'a person', data: 'data' },
  BASE: [
    { id: 'hypothesis', label: 'Hypothesis', color: '#9E2A62', links: [
      { rel: 'fuels', with: ['question'] },
      { rel: 'supports', with: ['evidence'], in: true }, { rel: 'contradicts', with: ['evidence'], in: true },
      { rel: 'predicts', with: ['result', 'observation', 'figure'] },
      { rel: 'tests', with: ['method', 'protocol', 'run'], in: true },
      { rel: 'refines', with: ['hypothesis'] },
      { rel: 'resolves', with: ['verdict'], in: true } ] },
    { id: 'question', label: 'Question', color: '#B5761B', links: [
      { rel: 'fuels', with: ['hypothesis'], in: true },
      { rel: 'leads', with: ['hypothesis', 'method'] },
      { rel: 'answers', with: ['verdict', 'evidence', 'claim'], in: true },
      { rel: 'refines', with: ['question'] } ] },
    { id: 'verdict', label: 'Verdict', color: '#1B7A43', links: [
      { rel: 'resolves', with: ['hypothesis', 'question', 'barrier', 'claim'] },
      { rel: 'supports', with: ['evidence', 'claim'], in: true }, { rel: 'contradicts', with: ['evidence', 'claim'], in: true },
      { rel: 'leads', with: ['decision', 'task', 'hypothesis'] } ] },
    { id: 'method', label: 'Method', color: '#2F6FB0', links: [
      { rel: 'tests', with: ['hypothesis'] },
      { rel: 'follows', with: ['protocol', 'method'] },
      { rel: 'needs', with: ['material', 'protocol'] },
      { rel: 'produces', with: ['run', 'evidence', 'figure'] },
      { rel: 'leads', with: ['question'], in: true } ] },
    { id: 'meeting', label: 'Meeting', color: '#6B4FA3', links: [
      { rel: 'leads', with: ['decision', 'task', 'question', 'hypothesis'] },
      { rel: 'related', with: ['person', 'note', 'any'] } ] },
    { id: 'feedback', label: 'Feedback', color: '#C2571A', links: [
      { rel: 'comments', with: ['any'] },
      { rel: 'leads', with: ['task', 'decision'] },
      { rel: 'resolves', with: ['any'], in: true } ] },
    { id: 'story', label: 'Story', color: '#1E5E8C', links: [
      { rel: 'next', with: ['any'] },
      { rel: 'illustrates', with: ['figure'], in: true },
      { rel: 'comments', with: ['feedback'], in: true } ] },
  ],
  /** Your kinds (Settings) carry links too; one made before V3.955 had `targets` — they become links. */
  all() { const own = (settings().ckinds || []).filter(k => k && k.id && k.label).map(k => Object.assign({}, k, { links: Array.isArray(k.links) ? k.links : (k.targets || []).map(t => ({ rel: k.rel || 'related', with: [String(t)] })) })); return [...CKINDS.BASE.filter(k => !own.some(o => o.id === k.id)), ...own]; },
  get: id => CKINDS.all().find(k => k.id === id) || null,
  of: b => b && b.ckind ? CKINDS.get(b.ckind) : null,
  set(b, id) { const cur = M.block(b.id); if (!cur) return; if (id) cur.ckind = id; else delete cur.ckind; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); const K = CKINDS.get(id); toast(K ? K.label + ' — ' + CKINDS.ways(K) : 'A standard component', K ? 5200 : 2400); },
  pick(b, x, y) { ctxMenu(x, y, [{ head: 'What kind of component is this?' }, { label: 'Standard', sub: 'No kind: a plain component, linked any way', run: () => CKINDS.set(b, null) },
    ...CKINDS.all().map(k => ({ label: (b.ckind === k.id ? '✓ ' : '') + k.label, sub: CKINDS.ways(k, 3), run: () => CKINDS.set(b, k.id) })), 'sep', { label: 'Kinds in Settings…', run: () => CMD.run('settings', ['Component kinds']) }]); },
  /* ---------- what a component is, for a link's `with` ---------- */
  carries(b, k) { try { return IX.itemsOf(b.id).some(it => it.kind === k); } catch (e) { return false; } },
  is(b, c) {
    if (!b || !c) return false; if (c === 'any') return true; if (b.ckind === c) return true;
    const text = (b.body && b.body.text) || '', marks = (b.body && b.body.marks) || [];
    if (c === 'question') return CKINDS.carries(b, 'question') || /\?/.test(text);
    if (c === 'paper') return b.kind === 'rmpaper' || b.kind === 'pdf' || marks.some(m => m.type === 'cite');
    if (c === 'evidence') return CKINDS.carries(b, 'evidence') || CKINDS.carries(b, 'observation') || CKINDS.carries(b, 'result') || ['figure', 'plate', 'table', 'plot', 'run', 'rec', 'canvas'].includes(b.kind) || CKINDS.is(b, 'paper');
    if (c === 'data') return ['table', 'plot', 'plate', 'calc'].includes(b.kind);
    if (c === 'note') return b.kind === 'noteref' || b.kind === 'ref';
    if (c === 'person') return marks.some(m => m.type === 'person' || (m.type === 'term' && ((M.term(m.ref) || {}).kind === 'person')));
    if (c === 'material') return b.kind === 'matcard' || b.kind === 'matsheet' || !!b.inventoryId;
    if (c === 'figure') return b.kind === 'figure' || b.kind === 'canvas' || b.kind === 'deck';
    if (KIND[c]) return CKINDS.carries(b, c);
    return b.kind === c;
  },
  named(w) { const L = (w || []).map(c => CKINDS.CLASSES[c] || (CKINDS.get(c) || {}).label && 'a ' + CKINDS.get(c).label || c); return L.length > 1 ? L.slice(0, -1).join(', ') + ' or ' + L[L.length - 1] : L[0] || 'anything'; },
  /** A kind's links in words: "it fuels a question; evidence supports it; …" */
  ways(K, n) { const R = l => REL[l.rel] || { verb: l.rel }; const w = (K.links || []).map(l => l.in ? CKINDS.named(l.with) + ' ' + R(l).verb + ' it' : 'it ' + (R(l).arrow ? 'goes on into' : R(l).verb) + ' ' + CKINDS.named(l.with)); return (n && w.length > n ? w.slice(0, n).join('; ') + '; …' : w.join('; ')) || 'any way'; },
  /** The ways A and B can be wired, given their kinds: [{rel, from, to, dir, R}], the dragged-from end's first; null when neither has a kind. */
  between(A, B) {
    const KA = CKINDS.of(A), KB = CKINDS.of(B); if (!KA && !KB) return null;
    const out = [], seen = new Set(), add = (rel, from, to) => { const R = REL[rel]; if (!R || seen.has(rel)) return; seen.add(rel); out.push({ rel, from: from.id, to: to.id, dir: R.dir !== false, R }); };   // one entry a relation, the dragged-from end's direction first
    const walk = (K, me, other) => (K ? K.links : []).forEach(l => { if (!(l.with || []).some(c => CKINDS.is(other, c))) return; l.in ? add(l.rel, other, me) : add(l.rel, me, other); });
    walk(KA, A, B); walk(KB, B, A);
    try { const def = (settings().relDefaults || {})[BULK.relKey(A.id)], i = out.findIndex(l => l.rel === def); if (i > 0) out.unshift(out.splice(i, 1)[0]); } catch (e) { }
    return out;
  },
  /** The kind's links for a drop on empty paper (13t): each with its direction and what the new component becomes. */
  chainLinks(K, from) { return (K.links || []).map(l => { const R = REL[l.rel] || REL.related, c = l.with[0], kind = CKINDS.get(c); return { id: R.id, label: R.arrow ? R.name : R.label, verb: R.verb, inv: R.inv, dir: R.dir !== false, rev: !!l.in, ckind: kind ? kind.id : null, what: CKINDS.named(l.with) }; }); },
  /** The drop's popover for two kinded components: only their ways. */
  popover(from, to, x, y, L) {
    const name = id => M.endName(id), A = M.block(from), B = M.block(to), KA = CKINDS.of(A), KB = CKINDS.of(B);
    const go = l => { closePop(); M.wire(l.from, l.to, l.rel, l.dir); toast('Connected · ' + (l.R.arrow ? l.R.name : l.R.label)); };
    const list = h('div.opts', L.map((l, i) => h('div.opt' + (i ? '' : '.on'), { on: { click: () => go(l) } }, h('div', h('b', l.R.arrow ? '→ ' + l.R.name : l.R.label), h('span.s', `“${snippet(name(l.from), 26)}” ${l.R.verb} “${snippet(name(l.to), 26)}” · ${i + 1}`)))));
    const pop = popover(x, y, [h('h5', 'How are these connected?'), h('div.tiny.muted.ck-why', (KA ? 'A ' + KA.label : 'This') + ' and ' + (KB ? 'a ' + KB.label.toLowerCase() : 'this') + ' link only these ways · Enter takes the first'), list]);
    pop.tabIndex = -1; pop.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(L[0]); } else if (e.key === 'Escape') { e.stopPropagation(); closePop(); } else if (/^[1-9]$/.test(e.key) && L[+e.key - 1]) { e.preventDefault(); e.stopPropagation(); go(L[+e.key - 1]); } });
    setTimeout(() => pop.focus(), 30);
  },
  refuse(A, B) { const me = CKINDS.of(A) ? A : B, other = me === A ? B : A, K = CKINDS.of(me); toast(`${K.label} links only these ways: ${CKINDS.ways(K)} — “${snippet(M.blockName(other), 24)}” is none of them (give it a kind or a structure)`, 6000); },
  /** How well a candidate answers a kind's links, for the pickers: what it is, what kind it has, what it carries. */
  fits(k, b) { if (!k || !b || !(k.links || []).length) return 0; let s = 0; k.links.forEach(l => { if ((l.with || []).some(c => c !== 'any' && CKINDS.is(b, c))) s += 2; else if ((l.with || []).includes('any')) s += 1; }); return s; },
  /** "→ fuels: question, hypothesis" (it does) · "← supports: evidence" (what does it to it); one per line. */
  parseLinks(s) { const out = []; String(s || '').split(/[\n;]+/).forEach(line => { const m = line.trim().match(/^(->|<-|→|←)?\s*([a-z][\w .'-]*?)\s*:\s*(.+)$/i); if (!m) return; const word = m[2].trim().toLowerCase(), rel = REL[word] ? word : customRel(m[2]); if (!rel) return; const w = m[3].split(/[,/]+/).map(x => x.trim().toLowerCase().replace(/^an? /, '')).filter(Boolean); if (w.length) out.push({ rel, with: w, in: /^(<-|←)$/.test(m[1] || '') || undefined }); }); return out; },
  settingsUI() {
    const row = k => h('div.li', h('span.pill', { style: { background: k.color, color: '#fff' } }, k.label), h('span.t', h('span.s', CKINDS.ways(k))),
      CKINDS.BASE.some(b => b.id === k.id) ? null : h('button.btn.xs.ghost', { on: { click: () => { saveSettings({ ckinds: (settings().ckinds || []).filter(x => x.id !== k.id) }); App.refresh(); } } }, '×'));
    const add = async () => { const label = await askText('A kind of component', 'Its name', ''); if (!label) return;
      const txt = await askText(label, 'Its links, one per line: "→ relation: what it links to" (it does it) or "← relation: what links to it". Relations: ' + [...RELATIONS, ...KREL.filter(r => !r.arrow)].map(r => r.id).join(', ') + ' (or your own word). With: ' + Object.keys(CKINDS.CLASSES).join(', ') + '.', '', { multiline: true, placeholder: '→ fuels: question\n← supports: evidence, claim' });
      const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); if (!id || CKINDS.get(id)) return toast('That kind exists'); const links = CKINDS.parseLinks(txt); if (!links.length) return toast('No link read — "→ relation: what it links to", one per line');
      saveSettings({ ckinds: [...(settings().ckinds || []), { id, label, color: '#' + Math.floor(Math.random() * 0x7fffff + 0x200000).toString(16).padStart(6, '0'), links }] }); App.refresh(); };
    return h('div.ck-settings', h('div.sec'), h('div.sec-h', h('h2', 'Component kinds'), h('span.k', 'double-click the label left of a title')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'A component can be a Hypothesis, a Question, a Verdict, a Story…: double-click the small label left of its title. The kind colours its header and says the only ways it links: a drop between two components offers just those (one way connects at once), and a wire can end on a claim or an observation inside a component.'),
      h('div.list', CKINDS.all().map(row), h('div.li', h('button.btn.sm', { on: { click: add } }, '+ Kind'))));
  },
};
/* ---------- wires that end on a structure ---------- */
const KINDX = {
  pending: null,
  /** The structure mark under a drop (the popover opens 12 px under the pointer). */
  markAt(x, y, toId) { const el = document.elementFromPoint(x, y - 12), st = el && el.closest && el.closest('.st[data-item]'), box = st && st.closest('.box[data-id]'); return st && box && box.dataset.id === toId ? st.dataset.item : null; },
  /** The mark's rect in paper coordinates, for the wire's end. */
  markRect(pane, toId, itemId) { const w = pane.paper && pane.paper.world, box = w && $(`:scope > .box[data-id="${toId}"]`, w), st = box && $(`.st[data-item="${itemId}"]`, box); if (!st) return null; const z = pane.paper.view.z || 1, b = box.getBoundingClientRect(), r = st.getBoundingClientRect(); return { x: box.offsetLeft + (r.left - b.left) / z, y: box.offsetTop + (r.top - b.top) / z, w: Math.max(8, r.width / z), h: Math.max(8, r.height / z) }; },
  endingOn: itemId => DB.where('wires', w => w.toItem === itemId),
};
/* ---------- authors as terms ---------- */
const AUTHORS = {
  key: '', t: null,
  name: a => { if (!a) return ''; if (typeof a === 'string') return a.trim(); return ([a.given, a.family].filter(Boolean).join(' ') || a.literal || a.name || '').trim(); },
  scan() {
    const lib = DB.all('library'), pid = (DB.all('projects')[0] || {}).id || null, by = new Map();
    lib.forEach(r => (r.authors || []).forEach(a => { const n = AUTHORS.name(a); if (n.length < 4 || !/\s/.test(n)) return; (by.get(n) || by.set(n, []).get(n)).push(r.id); }));
    const made = []; by.forEach((papers, name) => { let t = DB.all('terms').find(x => x.kind === 'person' && x.label.toLowerCase() === name.toLowerCase()) || DB.all('terms').find(x => x.label.toLowerCase() === name.toLowerCase());
      if (!t) { t = { id: uid('w'), projectId: pid, label: name, kind: 'person', auto: true, papers: [], importedFrom: null, created: isoLocal(new Date()) }; made.push(t); }
      if (t.kind !== 'person' || JSON.stringify(t.papers || []) !== JSON.stringify(papers)) { t.kind = 'person'; t.papers = papers; DB.put('terms', t); } });
    if (made.length) { try { IX.rebuild(); DB.all('documents').forEach(d => M.liveBlocks(d.id).forEach(b => TERMSCAN.block(b, made))); IX.rebuild(); } catch (e) { } }
    return made.length;
  },
  maybe() { const k = DB.all('library').map(r => r.id + ':' + (r.authors || []).length).join(','); if (k === AUTHORS.key) return; AUTHORS.key = k; clearTimeout(AUTHORS.t); AUTHORS.t = setTimeout(() => { try { const n = AUTHORS.scan(); if (n) { toast(plural(n, 'author') + ' joined the terms'); changed(); } } catch (e) { console.warn('[authors]', e); } }, 1500); },
};
{
  // the label left of the title: the kind (the header in its colour), and double-click to choose it
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (!el || !b || b.kind !== 'component') return el;
    const num = $(':scope > .bh > .num', el); if (!num) return el; const K = CKINDS.of(b); if (K) { num.textContent = K.label; el.classList.add('kinded'); el.style.setProperty('--ck', K.color); el.dataset.ck = K.id; }   // V3.955: `kinded`, not `ck` — `.ck` is the calculator's key (34 px tall), which is what flattened a kinded box in V3.951
    num.title = (K ? K.label + ' — ' + CKINDS.ways(K, 3) + ' · ' : '') + 'Double-click: what kind of component this is'; num.style.cursor = 'pointer';
    num.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); if (this.travel) return; CKINDS.pick(M.block(b.id) || b, e.clientX, e.clientY + 8); });
    return el; };
  // what a kind links with first, in every picker of components
  const cl = CMD.KINDS.component.list; CMD.KINDS.component.list = function (q, ctx, a) { const L = cl.apply(this, arguments), K = ctx && ctx.block && CKINDS.of(ctx.block); if (!K) return L; return L.map(x => Object.assign({}, x, { s: (x.s || 0) + CKINDS.fits(K, x.v) * 50 })).sort((u, v) => v.s - u.s); };
  // a drop: on a structure, the wire ends on it; between kinded components, only their ways (one way at once, none refused)
  const rp = DocView.relationPopover; DocView.relationPopover = function (from, to, x, y) {
    const item = KINDX.markAt(x, y, to); KINDX.pending = item ? { to, item, until: Date.now() + 120000 } : null;
    const A = M.block(from), B = M.block(to), L = A && B ? CKINDS.between(A, B) : null;
    if (L === null) return rp.apply(this, arguments);
    if (!L.length) { KINDX.pending = null; return CKINDS.refuse(A, B); }
    if (L.length === 1) { const l = L[0]; M.wire(l.from, l.to, l.rel, l.dir); toast('Connected · ' + (l.R.arrow ? l.R.name : l.R.label) + ' — the one way a ' + (CKINDS.of(A) || CKINDS.of(B)).label + ' links here'); return; }
    return CKINDS.popover(from, to, x, y, L); };
  const wire = M.wire; M.wire = function (from, to, rel, directed) { const w = wire.apply(this, arguments); const P = KINDX.pending; if (w && P && Date.now() < P.until && (P.to === to || P.to === from)) { KINDX.pending = null; w.toItem = P.item; DB.put('wires', w); } return w; };
  // a wire's menu between kinded components: "Make it" only another of their ways
  const wm = DocView.wireMenu; DocView.wireMenu = function (x, e) { const A = M.block(x.from), B = M.block(x.to), L = A && B ? CKINDS.between(A, B) : null; if (L === null) return wm.apply(this, arguments);
    const cm = ctxMenu; let done = false; window.ctxMenu = function (px, py, items) { if (!done) { done = true; const keep = items.filter(it => it && (it.head || it.danger)); const ways = L.filter(l => !(l.rel === x.rel && l.from === x.from)).map(l => ({ label: 'Make it: ' + (l.R.arrow ? l.R.name : l.R.label) + (l.from === x.from ? '' : ' (the other way)'), run: () => M.setWire(x, { rel: l.rel, directed: l.dir, from: l.from, to: l.to }) }));
      items = [keep[0], ...ways, { label: 'These two link only their kinds’ ways', sub: CKINDS.ways(CKINDS.of(A) || CKINDS.of(B), 4), disabled: true, run() { } }, 'sep', ...keep.slice(1)]; } return cm.call(this, px, py, items); };
    try { return wm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // drawn to the mark
  const gm = DocView.geom; DocView.geom = function (A, B, R) { try { if (A && B && A.id && B.id) { const w = DB.all('wires').find(x => x.toItem && ((x.from === A.id && x.to === B.id) || (x.from === B.id && x.to === A.id))); if (w) { if (w.to === B.id) { const r = KINDX.markRect(this, B.id, w.toItem); if (r) B = Object.assign({}, B, r); } else { const r = KINDX.markRect(this, A.id, w.toItem); if (r) A = Object.assign({}, A, r); } } } } catch (e) { } return gm.call(this, A, B, R); };
  // the structure's hover card says what ends on it
  const ic = ED.itemCard; ED.itemCard = function (itemId) { const card = ic.apply(this, arguments); try { const W = KINDX.endingOn(itemId); if (card && W.length) { const f = $('.hc-f', card); const line = h('div.hc-s', W.length + ' ' + (W.length === 1 ? 'wire ends' : 'wires end') + ' here: ' + W.map(w => M.blockName(M.block(w.from)) + ' ' + ((REL[w.rel] || {}).label || w.rel)).join(' · ')); f ? f.before(line) : card.append(line); } } catch (e) { } return card; };
  // authors as terms: when the library changes, and once at the start; Settings
  const ch = changed; changed = function () { const r = ch.apply(this, arguments); try { AUTHORS.maybe(); } catch (e) { } return r; };
  setTimeout(() => { try { AUTHORS.maybe(); } catch (e) { } }, 3000);
  setTimeout(() => { if (typeof SettingsView === 'undefined') return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
    try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Keys'), sec = h2 && h2.closest('.sec-h'); const ui = CKINDS.settingsUI(); if (sec) sec.before(ui); else out.append(ui); } catch (e) { console.warn('[kinds]', e); }
    return out; }; }, 0);
}
