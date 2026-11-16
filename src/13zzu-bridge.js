/* ==========================================================================
   13zzu · Node bridges (V3.981 — Gabe: "The link to a note should be merged
   with pulled in components or excerpts … These should become known as
   node bridges.")
   A bridge is a component, or a passage of one, shown live in another note
   (kind 'ref' with refBlockId; refSpan for a passage, 13zzt), with a caption
   under it there saying why it was bridged (b.why).
   • In the original note the words bridged are underlined (green; Settings →
     Structures → Bridges changes it), and a component that isn't text says
     "bridged" beside its kind. Double-click either: go to the note it is
     bridged to, or open that note beside this one.
   • Made by copy and paste into another note (components, or words copied
     in a component), the Ctrl+Enter strip's "Bridge to a note…", the editing
     bar, right-click (or ⋯) on any component → "Bridge to another note…",
     the selection bar's "Bridge to…", dragging a component into another
     pane, and /bridge <component> <note> [why].
   • Replaces "Link to a note…" (and the ↗ after linked words: links made
     before still work and are underlined the same way), "Embed in another
     note…", "Pull into…" and the "⇲ in N other notes" chip.
   ========================================================================== */
const BRIDGE = {
  COLOR: '#1f9d55',
  fresh: new Set(),
  /** A bridge: a component or a passage of one from another note (a pulled-in structure is not one). */
  is: b => !!b && b.kind === 'ref' && !!b.refBlockId && !b.refItemId,
  /** Written in its box's own editor: not a widget, a protocol, ink or a bridge. */
  isText: b => !!b && !!b.body && b.kind !== 'ref' && b.kind !== 'ink' && !PROTO.is(b) && !(typeof WIDGETS !== 'undefined' && WIDGETS[b.kind]),
  /** The live bridges of this component in other notes. */
  out(id) {
    const o = M.block(id); if (!o) return [];
    return (IX.refsOfBlock.get(id) || []).map(M.block).filter(x => BRIDGE.is(x) && x.status === 'live' && x.docId !== o.docId && (d => d && !d.deleted)(M.doc(x.docId)));
  },
  /** Where the bridged words are in its text now: [{ from, to, ids }] — a whole component is all of it. */
  spans(b) {
    const text = String((b.body && b.body.text) || ''); if (!text.trim()) return [];
    const by = new Map();
    for (const x of BRIDGE.out(b.id)) {
      const at = x.refSpan ? EXCERPT.locate(x.refSpan, text) : [0, text.length]; if (!at || at[1] <= at[0]) continue;
      const k = at[0] + ':' + at[1]; if (!by.has(k)) by.set(k, { from: at[0], to: at[1], ids: [] }); by.get(k).ids.push(x.id);
    }
    return [...by.values()];
  },
  /** For ED.render, in the component's own box: its bridged words as marks the editor underlines (never saved: ED.read keeps only real marks). */
  marks(b) { try { return BRIDGE.isText(b) && b.status === 'live' ? BRIDGE.spans(b).map((s, i) => ({ id: '_br' + i, type: 'bridge', from: s.from, to: s.to, ids: s.ids.join(',') })) : []; } catch (e) { return []; } },
  /** "bridged" beside the kind: a component that isn't text (or has no words to underline). */
  tagged: b => !BRIDGE.isText(b) || !String((b.body && b.body.text) || '').trim(),
  /** Make one: the component src (or the passage span { from, to, text } of it) in note dest, with why. A bridge given as src bridges its original. */
  make(src, dest, o = {}) {
    if (!src || !dest) return null; let keep = null;
    if (src.kind === 'ref') { if (src.refItemId) { toast('A pulled-in structure isn’t bridged — bridge the component it comes from'); return null; } keep = src.refSpan || null; src = M.block(src.refBlockId); }
    if (!src || src.status !== 'live') { toast('Nothing to bridge: it was removed'); return null; }
    if (src.docId === dest.id) { toast('It is in “' + snippet(dest.title || 'this note', 40) + '” already — a bridge goes to another note'); return null; }
    const text = String((src.body && src.body.text) || ''); let refSpan = keep ? Object.assign({}, keep) : null;
    if (o.span) {
      let a = Math.max(0, o.span.from | 0), z = Math.min(text.length, o.span.to | 0);
      if (o.span.text != null && CLIPX.norm(text.slice(a, z)) !== CLIPX.norm(o.span.text)) { const i = text.indexOf(o.span.text); if (i >= 0) { a = i; z = i + o.span.text.length; } }   // changed since it was selected
      while (a < z && /\s/.test(text[a])) a++; while (z > a && /\s/.test(text[z - 1])) z--;
      const lead = text.length - text.trimStart().length, end = text.trimEnd().length;
      refSpan = z > a && !(a <= lead && z >= end) && text.slice(a, z).replace(/￼/g, '').trim() ? { from: a, to: z, exact: text.slice(a, z), prefix: text.slice(Math.max(0, a - EXCERPT.AROUND), a), suffix: text.slice(z, z + EXCERPT.AROUND) } : null;
    }
    const dup = DB.where('blocks', x => x.docId === dest.id && BRIDGE.is(x) && x.status === 'live' && x.refBlockId === src.id && (refSpan ? !!x.refSpan && x.refSpan.exact === refSpan.exact : !x.refSpan))[0];
    if (dup) { if (!o.quiet) toast('Already bridged to “' + snippet(dest.title || 'that note', 40) + '”'); return null; }
    const at = o.at || MOVE.spot(dest);
    return M.addBlock(dest.id, null, Object.assign({ kind: 'ref', refItemId: null, refBlockId: src.id, x: Math.round(at.x / 14) * 14, y: Math.round(at.y / 14) * 14, w: 392, why: String(o.why || '').trim() }, refSpan ? { refSpan } : {}));
  },
  /** Which note: any other one. */
  pickNote(title, notId) {
    return new Promise(res => { let got = false;
      const m = modal({ title, wide: true, actions: [{ label: 'Cancel' }], onClose: () => { if (!got) res(null); }, body: optionPicker({ placeholder: 'Search notes…', sort: 'bridge-note',
        items: q => DB.where('documents', x => x.id !== notId && !x.deleted && !x.archived && (!q || ((x.title || '') + ' ' + M.docPath(x)).toLowerCase().includes(q))).sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || ''))),
        render: x => h('div', typechip(x.type), ' ', x.title || 'Untitled', h('span.s', M.docPath(x))), onPick: x => { got = true; m.close(); res(x); } }) }); });
  },
  /** Why: the caption under it there ('' is allowed; null — Cancel — bridges nothing). */
  ask(dest, what) { return askText('Bridge to “' + snippet(dest.title || 'Untitled', 40) + '”', 'Why bridge ' + what + ' there? It shows as a caption under it.', '', { placeholder: 'What it is for in that note…' }); },
  /** Pick the note, say why, bridge: the component, or the passage o.span of it. */
  async to(src, o = {}) {
    const orig = src && (src.kind === 'ref' ? M.block(src.refBlockId) : src); if (!orig) return null;
    const what = o.span ? '“' + snippet(String(o.span.text || '').replace(/￼/g, ''), 40) + '”' : '“' + snippet(M.blockName(orig), 40) + '”';
    const dest = o.dest || await BRIDGE.pickNote('Bridge ' + what + ' to…', orig.docId); if (!dest) return null;
    if (dest.id === orig.docId) { toast('That is its own note — a bridge goes to another note'); return null; }
    const why = o.why != null ? o.why : await BRIDGE.ask(dest, what); if (why == null) return null;
    DB.beginGroup('bridge'); const nb = BRIDGE.make(src, dest, { span: o.span, why }); if (!nb) return null;
    IX.rebuild(); changed(); BRIDGE.said(dest, 1); return nb;
  },
  said(dest, n) { toast((n > 1 ? plural(n, 'bridge') + ' made' : 'Bridged') + ' to “' + snippet(dest.title || 'Untitled', 40) + '” — double-click the underline (or “bridged”) to go there or open it beside', 4500); },
  /** The words selected in a component (the Ctrl+Enter strip, the editing bar, right-click). */
  fromText(el, b, sel) {
    const cur = M.block(b.id); if (!cur || !sel || !(sel.to > sel.from)) { toast('Select the words to bridge first'); return null; }
    const body = ED.read(el, cur.body.marks); if (body.text !== cur.body.text) { M.saveBlockBody(cur, body); IX.rebuild(); }
    return BRIDGE.to(M.block(b.id), { span: { from: sel.from, to: sel.to, text: body.text.slice(sel.from, sel.to) } });
  },
  /** Several pieces held at once (13z): one note, one reason, a bridge each. */
  async pieces(ps) {
    const P = ps.filter(p => M.block(p.blockId) && p.to > p.from); if (!P.length) return false; const d0 = M.block(P[0].blockId).docId;
    const dest = await BRIDGE.pickNote('Bridge ' + plural(P.length, 'piece') + ' to…', d0); if (!dest) return false;
    const why = await BRIDGE.ask(dest, P.length > 1 ? 'them' : 'it'); if (why == null) return false;
    DB.beginGroup('bridge'); const at = MOVE.spot(dest); let n = 0;
    P.forEach(p => { const b = M.block(p.blockId), t = String((b.body && b.body.text) || ''); if (BRIDGE.make(b, dest, { span: { from: p.from, to: p.to, text: t.slice(p.from, p.to) }, why, at: { x: at.x, y: at.y + n * 150 }, quiet: true })) n++; });
    IX.rebuild(); changed(); if (n) BRIDGE.said(dest, n); else toast('Already bridged to “' + snippet(dest.title || 'that note', 40) + '”'); return n > 0;
  },
  /** The caption under a bridge: why it is here. Typed in place; Enter or leaving it keeps it. */
  caption(b, ro) {
    const v = String(b.why || '');
    if (ro) return v ? h('div.br-why', h('span.br-why-k', '⇄ why'), h('div.br-why-t', v)) : null;
    const save = () => { const cur = M.block(b.id); if (!cur) return; const nv = ta.value.trim(); if (String(cur.why || '') === nv) return; cur.why = nv; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); };
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(18, ta.scrollHeight) + 'px'; };
    const stop = e => e.stopPropagation();
    const ta = h('textarea.br-why-in.nopan', { rows: 1, placeholder: 'Why is it bridged here? Say what it is for in this note…', title: 'Why this is bridged here — Enter keeps it',
      on: { input: fit, change: save, blur: save, pointerdown: stop, mousedown: stop, click: stop, dblclick: stop,
        keydown: e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } else if (e.key === 'Escape') { ta.value = String((M.block(b.id) || b).why || ''); ta.blur(); } } } }, v);
    requestAnimationFrame(fit);
    return h('div.br-why' + (v ? '' : '.empty') + (!v && BRIDGE.fresh.has(b.id) ? '.ask' : ''), h('span.br-why-k', { title: 'Why this is bridged here' }, '⇄ why'), ta);
  },
  /** A bridge just made: its empty caption pulses for a moment, asking why. */
  flash(id) { BRIDGE.fresh.add(id); setTimeout(() => BRIDGE.fresh.delete(id), 8000); },
  /** Double-click on bridged words, on "bridged", or on a link made before bridges. */
  dbl(t, e) {
    const box = t.closest('.box.cmp[data-id]'), from = box && M.block(box.dataset.id); if (!from) return;
    if (t.classList.contains('ln')) {
      const mk = ((from.body && from.body.marks) || []).find(m => m.id === t.dataset.m); if (!mk) return; const tg = IX.linkTarget(mk);
      if (!tg) return ED.followLink(from, mk.id, e);
      return tg.type === 'doc' ? BRIDGE.menu(e, [{ id: tg.d.id, isDoc: true, title: tg.d.title, sub: M.docPath(tg.d) }], t, 'Linked to')
        : BRIDGE.menu(e, [{ id: tg.b.id, isDoc: false, title: (M.doc(tg.b.docId) || {}).title || 'Untitled', sub: M.blockName(tg.b) }], t, 'Linked to');
    }
    let ids = [];
    if (t.classList.contains('br-tag')) ids = BRIDGE.out(from.id).map(x => x.id);
    else { const s = new Set(); for (let x = t; x && x.classList && !x.classList.contains('ed'); x = x.parentElement) if (x.classList.contains('br')) String(x.dataset.br || '').split(',').filter(Boolean).forEach(i => s.add(i)); ids = [...s]; }
    const L = ids.map(M.block).filter(x => x && x.status === 'live').map(x => { const d = M.doc(x.docId) || {}; return { id: x.id, isDoc: false, title: d.title || 'Untitled', sub: x.why ? '“' + snippet(x.why, 70) + '”' : M.docPath(d) }; });
    if (L.length) BRIDGE.menu(e, L, t, 'Bridged to');
  },
  menu(e, L, t, head) {
    const one = L.length === 1;
    ctxMenu(e.clientX, e.clientY + 8, [{ head: one ? head + ' “' + snippet(L[0].title, 36) + '”' : head + ' ' + L.length + ' notes' }, ...L.flatMap((x, i) => [
      !one && i ? 'sep' : null, !one ? { head: x.title } : null,
      { label: 'Go to ' + (one ? 'the note' : 'it'), sub: x.sub || '', run: () => x.isDoc ? App.go('#/doc/' + x.id) : App.openBlock(x.id) },
      { label: 'Open it beside this note', sub: 'side by side', run: () => App.openSide(x.id, t, x.isDoc) }])]);
  },
};
{
  // the box: a bridge has its caption; a bridged component that isn't text says so beside its kind
  const bx = DocView.box; DocView.box = function (b, d, p) {
    const el = bx.apply(this, arguments); if (!el || !b) return el;
    try {
      if (BRIDGE.is(b)) { el.classList.add('bridge'); const cap = BRIDGE.caption(b, !!this.travel); if (cap) { const ch = $(':scope > .chips', el); ch ? ch.before(cap) : el.append(cap); } }
      else if (b.kind !== 'ref' && b.status === 'live') {
        const out = BRIDGE.out(b.id); if (out.length) { el.classList.add('bridged');
          if (BRIDGE.tagged(b)) { const num = $(':scope > .bh > .num', el), names = [...new Set(out.map(x => (M.doc(x.docId) || {}).title || 'Untitled'))];
            const tag = h('span.br-tag', { title: 'Bridged to ' + names.map(n => '“' + n + '”').join(', ') + ' · double-click: go there, or open it beside' }, '⇄ bridged');
            num ? num.after(tag) : $(':scope > .bh', el) && $(':scope > .bh', el).prepend(tag); } }
      }
    } catch (e) { console.warn('[bridge]', e); }
    return el;
  };
  // every bridge made — pasted, dragged across, pulled — asks why for a moment
  const ab = M.addBlock; M.addBlock = function (docId, afterId, init) { const b = ab.apply(this, arguments); try { if (b && init && init.kind === 'ref' && init.refBlockId && !init.refItemId) BRIDGE.flash(b.id); } catch (e) { } return b; };
  // double-click: where it is bridged to (the second click of a double-click doesn't select a word there)
  const SEL = '.ed .br, .ed .ln, .br-tag';
  document.addEventListener('mousedown', e => { if (e.detail >= 2 && !e.ctrlKey && !e.metaKey && e.target.closest && e.target.closest(SEL)) e.preventDefault(); }, true);
  document.addEventListener('dblclick', e => { if (e.ctrlKey || e.metaKey || !e.target.closest) return; const t = e.target.closest(SEL); if (!t || !t.closest('.box.cmp')) return; e.preventDefault(); e.stopPropagation(); try { BRIDGE.dbl(t, e); } catch (x) { console.warn('[bridge]', x); } }, true);
}
