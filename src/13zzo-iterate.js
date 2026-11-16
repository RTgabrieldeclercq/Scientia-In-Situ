/* ==========================================================================
   13zzo · Iteration (V3.962 — Gabe: "a new Iteration component kind that
   links to a new version of that same component").
   • Iteration on a component (its ⋯ menu; for text, also the kind label's
     menu, double-click it; /iteration) makes its next version beside it:
     a blank component of the same type and kind, made the way + Insert
     makes one (an HTML page, a PDF or slides ask for the new file), wired
     from the version before ("next version"), and under it, like an image
     panel's caption, how it improved — the caret waits there.
   • Each version says which it is (v1, v2…) in its header; a click there
     lists them all, to go to one, or makes the next. /collection iteration
     shows them in the Atlas.
   • A version carries `iter` { of (the one it improves on), root (version
     1), v, why }; version 1 carries nothing — it is v1 once it has a next.
     The notebook folder's Markdown (13o) says which version it is and how
     it improved.
   ========================================================================== */
KREL.push({ id: 'iterates', label: 'next version', dir: true, verb: 'is improved in', inv: 'improves on' }); REL.iterates = KREL[KREL.length - 1];
WIRECOL.iterates = '#0e7490';
const ITER = {
  REL: 'iterates', COLOR: '#0e7490', pending: null, _ix: null,
  /** What a version can be made of; a file asks for the new one. */
  KINDS: ['component', 'figure', 'table', 'plot', 'eq', 'html', 'pdf', 'deck', 'plate'],
  FILE: new Set(['html', 'pdf', 'deck']),
  can: b => !!b && b.status === 'live' && ITER.KINDS.includes(b.kind) && !b.quote,
  what: b => b.kind === 'component' ? 'text component' : (WIDGETS[b.kind] || {}).label || b.kind,
  root: b => b.iter ? b.iter.root || b.iter.of : b.id,
  /** root id → its later versions, oldest first (made again after each change). */
  ix() { if (ITER._ix && ITER._ixRev === DB.revOf.blocks) return ITER._ix; ITER._ixRev = DB.revOf.blocks; /* V3.978: made again when the blocks changed (an undo too, which calls no changed()) */ const m = new Map(); DB.all('blocks').forEach(x => { if (x.status !== 'live' || !x.iter) return; const r = x.iter.root || x.iter.of; (m.get(r) || m.set(r, []).get(r)).push(x); }); m.forEach(L => L.sort((a, c) => a.iter.v - c.iter.v)); return (ITER._ix = m); },
  /** Every version of b's line, v1 first. */
  line(b) { const r = ITER.root(b); return [M.block(r), ...(ITER.ix().get(r) || [])].filter(x => x && x.status === 'live'); },
  /** Which version b is: 0 when it has none. */
  v(b) { return b.iter ? b.iter.v : (ITER.ix().get(b.id) || []).length ? 1 : 0; },
  next(b) { return Math.max(1, ...ITER.line(b).map(x => x.iter ? x.iter.v : 1)) + 1; },
  /** Beside it, to the right, past whatever is there. */
  spot(from, pane) {
    const w = pane.paper.world, el = $(`:scope > .box[data-id="${from.id}"]`, w), W = el ? el.offsetWidth : from.w || 392, H = el ? el.offsetHeight : 200, nw = from.w || W;
    const others = $$(':scope > .box', w).filter(x => x !== el && x.offsetWidth).map(x => ({ left: x.offsetLeft, top: x.offsetTop, right: x.offsetLeft + x.offsetWidth, bottom: x.offsetTop + x.offsetHeight }));
    let x = (from.x || 0) + W + 84; const y = from.y || 0;
    for (let i = 0; i < 12; i++) { const hit = others.filter(o => LAYERS.over({ left: x, top: y, right: x + nw, bottom: y + H }, o)); if (!hit.length) break; x = Math.max(...hit.map(o => o.right)) + 56; }
    return { x: Math.round(x / 14) * 14, y: Math.round(y / 14) * 14 };
  },
  /** The next version: made blank where it goes; attach() makes it a version once it exists. */
  make(from) {
    from = from && M.block(from.id); if (!ITER.can(from)) return toast('A version can be made of text, an image panel, a table, a plot, an equation, an HTML page, a PDF, slides or a well plate');
    const d = M.doc(from.docId), pane = App.panes().find(p => p.docId === from.docId && p.paper && !p.travel); if (!d || !pane) return toast('Open its note first');
    const at = ITER.spot(from, pane), P = ITER.pending = { from: from.id, doc: d.id, kind: from.kind, at, until: Date.now() + 60000 };
    const pf = PLATE.pickFiles; PLATE.pickFiles = function (cb, ...rest) { P.until = 0; P.asked = true; return pf.call(this, fs => { P.until = Date.now() + 60000; return cb(fs); }, ...rest); };   // armed again only when a file is chosen
    try { ITER.blank(from, d, at, pane); } catch (e) { ITER.pending = null; return toast('Could not make the next version: ' + (e.message || e)); } finally { PLATE.pickFiles = pf; }
    if (P.asked && ITER.pending === P) toast('Choose the file of version ' + ITER.next(from) + ' of “' + snippet(M.blockName(from), 32) + '”', 5200);
  },
  blank(from, d, at, pane) {
    const k = from.kind;
    if (k === 'component') return M.addBlock(d.id, null, Object.assign({ kind: 'component', x: at.x, y: at.y, w: from.w || 392 }, from.ckind ? { ckind: from.ckind } : {}));
    if (k === 'figure') { const f = from.fig || {}; return FIG.create(d, at, f.rows || 1, f.cols || 1); }
    if (k === 'table') return TABLE.empty(d, at);
    if (k === 'eq') return EQ.create(d, at, { tex: '' });
    if (k === 'plate') return PLATE.insert(d.id, at.x, at.y, { fmt: from.fmt });
    const row = INSERTS.find(x => x.id === k); if (!row) throw new Error('no blank ' + ITER.what(from) + ' to make');
    return row.run(d, at, pane);
  },
  /** The new component becomes the next version of `fromId`: its size, kind and label, the wire, the question under it. */
  attach(id, fromId, at) {
    const b = M.block(id), from = M.block(fromId); if (!b || !from) return; if (at) { b.x = at.x; b.y = at.y; }   // a plot is made where its table is
    const v = ITER.next(from); b.iter = { of: from.id, root: ITER.root(from), v, why: '' };
    if (from.ckind && !b.ckind) b.ckind = from.ckind;
    if (!ITER.FILE.has(b.kind)) b.label = from.label || b.label;   // a file keeps its own name
    if (from.w) b.w = from.w; if (from.h && b.h != null) b.h = from.h;
    if (b.kind === 'figure' && from.fig && b.fig) b.fig.letters = from.fig.letters;
    b.modified = isoLocal(new Date()); DB.put('blocks', b); M.wire(from.id, b.id, ITER.REL, true); changed();
    const pane = App.panes().find(p => p.docId === b.docId && p.paper); if (pane && pane.reveal) setTimeout(() => pane.reveal(b.id), 120);
    setTimeout(() => ITER.ask(b.id), 300);
    toast('Version ' + v + ' of “' + snippet(M.blockName(from), 32) + '” is ' + (typeof IDECK !== 'undefined' && !IDECK.spread(from) ? 'up, the earlier ones on its slides' : 'beside it') + ': say under it how it improved', 5200);   // V3.974
  },
  /** The caption's words into the version (true when they changed). */
  store(id, ed) { const cur = M.block(id); if (!cur || !cur.iter || !ed.isConnected) return false; const t = ed.innerText.replace(/ /g, ' ').replace(/\s+$/, ''); if (t === (cur.iter.why || '')) return false; cur.iter.why = t; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); return true; },
  ask(id) { const ed = $(`.box[data-id="${id}"] > .iter-why .iter-ed`); if (!ed || ed.contentEditable === 'false') return; ed.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(r); },
  go(id) { App.jump(id, null); },
  /** Under a version: how it improved on the one before (plain text, like an image panel's caption). */
  why(b, ro) {
    const prev = M.block(b.iter.of), pv = prev ? ITER.v(prev) || 1 : b.iter.v - 1;
    const ed = h('div.iter-ed', { contentEditable: ro ? 'false' : 'true', spellcheck: 'true', 'data-ph': `How did v${b.iter.v} improve on v${pv}?` }, b.iter.why || '');   // "true", which every shortcut takes for typing
    const save = debounce(() => ITER.store(b.id, ed), 400);
    ed.addEventListener('input', () => { if (!ed.textContent) ed.replaceChildren(); save(); });
    ed.addEventListener('blur', () => { if (ITER.store(b.id, ed)) changed(); });
    ed.addEventListener('paste', e => { if (CLIPX.files(e.clipboardData).length) return; e.preventDefault(); e.stopPropagation(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\r/g, '')); });
    ed.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') ed.blur(); });
    ['pointerdown', 'mousedown'].forEach(t => ed.addEventListener(t, e => e.stopPropagation()));
    return h('div.iter-why.nopan', h('div.iw-l', 'How v' + b.iter.v + ' improved', prev ? h('a.iw-from', { title: 'Go to v' + pv, on: { click: e => { e.stopPropagation(); ITER.go(prev.id); } } }, 'on v' + pv + ' ↑') : null), ed);
  },
  /** The versions, to go to one, and the next. */
  menu(b, e, ro) {
    const L = ITER.line(b), last = L[L.length - 1] || b;
    ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Versions of “' + snippet(M.blockName(L[0] || b), 30) + '”' },
      ...L.map(x => ({ label: (x.id === b.id ? '✓ ' : '') + 'v' + (ITER.v(x) || 1) + ' · ' + snippet(M.blockName(x), 34), sub: !x.iter ? 'The first' : x.iter.why ? snippet(x.iter.why, 70) : 'How it improved: not said yet', run: () => ITER.go(x.id) })),
      ro ? null : 'sep', ro ? null : { label: 'New iteration', sub: 'v' + ITER.next(b) + ', blank, beside v' + (ITER.v(last) || 1), run: () => ITER.make(last) }]);
  },
};
CKINDS.BASE.push({ id: 'iteration', label: 'Iteration', color: ITER.COLOR, act: true, links: [{ rel: 'iterates', with: ['any'], in: true }, { rel: 'iterates', with: ['any'] }],
  says: 'Makes the next version of the component: blank, beside it, linked; how it improved goes under it' });
{
  // the kind label's menu and Settings: Iteration makes the next version (it is not a kind the component keeps)
  const set = CKINDS.set; CKINDS.set = function (b, id) { const K = id && CKINDS.get(id); if (K && K.act) return ITER.make(M.block(b.id) || b); return set.apply(this, arguments); };
  const ways = CKINDS.ways; CKINDS.ways = function (K) { return K && K.act && K.says ? K.says : ways.apply(this, arguments); };
  // made by + Insert's own code: the component it makes while one is pending is the next version
  const ab = M.addBlock; M.addBlock = function (docId) { const b = ab.apply(this, arguments), P = ITER.pending;
    if (P && b && docId === P.doc && b.kind === P.kind && Date.now() < P.until) { ITER.pending = null; setTimeout(() => ITER.attach(b.id, P.from, P.at), 0); }
    return b; };
  const ch = changed; changed = function () { ITER._ix = null; return ch.apply(this, arguments); };
  // the notebook folder's Markdown: which version, on which, how it improved
  const vc = VAULT.component; VAULT.component = function (b, d, P) { const md = vc.apply(this, arguments); if (!b || !b.iter) return md; const prev = M.block(b.iter.of), pe = prev && P.block.get(prev.id), pv = 'v' + (prev ? ITER.v(prev) || 1 : b.iter.v - 1);
    return md + '\n## Iteration\n- Version ' + b.iter.v + ', improves on ' + (pe ? VAULT.wl(pe, pv) : pv) + '\n' + (b.iter.why ? '- How it improved: ' + b.iter.why.replace(/\s*\n\s*/g, ' ') + '\n' : ''); };
  // ⋯ : New iteration
  const bm = DocView.boxMenu; DocView.boxMenu = function (b, e) {
    if (!ITER.can(b) || this.travel) return bm.call(this, b, e);
    const orig = ctxMenu; ctxMenu = (x, y, rows) => orig(x, y, [rows[0], { label: 'New iteration', sub: 'v' + ITER.next(b) + ': a blank ' + ITER.what(b) + ' beside it, linked — say how it improved', run: () => ITER.make(b) }, ...rows.slice(1)]);
    try { return bm.call(this, b, e); } finally { ctxMenu = orig; }
  };
  // the note drawn again while you write how it improved: your words kept, the caret where it was
  const up = DocView.update; DocView.update = function () {
    const ae = document.activeElement, box = ae && ae.classList && ae.classList.contains('iter-ed') && ae.closest('.box[data-id]'); let pos = 0;
    if (box) { ITER.store(box.dataset.id, ae); const s = getSelection(); if (s.rangeCount && ae.contains(s.anchorNode)) { const r = document.createRange(); r.selectNodeContents(ae); r.setEnd(s.anchorNode, s.anchorOffset); pos = r.toString().length; } }
    const out = up.apply(this, arguments);
    const e2 = box && this.paper && $(`:scope > .box[data-id="${box.dataset.id}"] > .iter-why .iter-ed`, this.paper.world);
    if (e2) { e2.focus({ preventScroll: true }); const t = e2.firstChild, r = document.createRange(); if (t && t.nodeType === 3) r.setStart(t, Math.min(pos, t.length)); else { r.selectNodeContents(e2); r.collapse(false); } getSelection().removeAllRanges(); getSelection().addRange(r); }
    return out; };
  // the version in the header; how it improved under it
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (!el || !b || b.kind === 'ref') return el;
    const v = ITER.v(b); if (!v) return el; const bh = $(':scope > .bh', el), num = bh && $(':scope > .num', bh), ro = !!this.travel;
    const tag = h('button.iter-v', { title: (b.iter ? 'Version ' + v + ' — improves on v' + (ITER.v(M.block(b.iter.of) || {}) || v - 1) : 'Version 1') + ' · click: every version' + (ro ? '' : ', or the next'), on: { click: e => { e.stopPropagation(); ITER.menu(M.block(b.id) || b, e, ro); } } }, 'v' + v);
    if (num) num.after(tag); else if (bh) bh.prepend(tag);
    el.classList.add('iterated'); el.style.setProperty('--it', ITER.COLOR);
    if (b.iter) { const w = ITER.why(b, ro), at = $(':scope > .fields', el) || $(':scope > .chips', el); at ? at.before(w) : el.append(w); }
    return el; };
}
