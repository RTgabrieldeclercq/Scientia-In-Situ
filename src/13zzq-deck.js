/* ==========================================================================
   13zzq · Iteration as a deck (V3.967 — Gabe: "Iteration should stack as a
   deck of cards with an easy right or left swipe through iterations. Make a
   troubleshooting kind that also contains this feature.")
   • The versions of a component stack at one spot, the newest on top, the
     older ones peeking out beneath. A strip under the header says which is
     on top ("v2 of 3"), with ‹ › and the dots; drag the strip left or right
     (a swipe), or press ← → with the card selected, to go through them. The
     "next version" wires inside a deck are not drawn. A new version lands on
     the deck. The version tag's menu: "Spread out" lays the versions beside
     each other as before (the first version carries iterSpread); "Stack as
     a deck" brings them back.
   • Troubleshooting, a component kind: Problem / Tried / Outcome, filled in
     when the kind is set on an empty component; each attempt is a new
     version on the deck ("attempt 2 of 3", "+ New attempt").
   ========================================================================== */
const IDECK = {
  shown: new Map(),   // root id → the version on top this session (default: the newest)
  spread: b => { const r = M.block(ITER.root(b)); return !!(r && r.iterSpread); },
  top(b) { const L = ITER.line(b); if (!L.length) return b; const id = IDECK.shown.get(ITER.root(b)); return L.find(x => x.id === id) || L[L.length - 1]; },
  pane: b => App.panes().find(p => p.docId === b.docId && p.paper),
  refresh(b) { const pane = IDECK.pane(b); if (pane && pane.update) pane.update(); else App.refresh(); },
  attempts: b => { const K = b.ckind && CKINDS.get(b.ckind); return !!(K && K.attempts); },
  /** A version under the card on top of its deck. */
  beneath: b => !!b && b.kind !== 'ref' && ITER.v(b) > 0 && !IDECK.spread(b) && IDECK.top(b).id !== b.id,
  /** The version i steps away (−1 older, +1 newer) goes on top. */
  show(b, dir) { const L = ITER.line(b), i = L.findIndex(x => x.id === IDECK.top(b).id), j = Math.max(0, Math.min(L.length - 1, i + dir)); if (j === i || i < 0) return; IDECK.to(b, L[j].id); },
  to(b, id) { IDECK.shown.set(ITER.root(b), id); IDECK.refresh(b); const pane = IDECK.pane(b); if (pane && pane.select) setTimeout(() => pane.select(id), 0); },
  /** Every version at one spot (the top's), or beside each other from the first. */
  stack(b) { const r = M.block(ITER.root(b)); if (!r) return; delete r.iterSpread; DB.put('blocks', r); const t = IDECK.top(b); ITER.line(b).forEach(x => { if (x.id !== t.id && (x.x !== t.x || x.y !== t.y)) { x.x = t.x; x.y = t.y; DB.put('blocks', x); } }); changed(); },
  spreadOut(b) { const r = M.block(ITER.root(b)); if (!r) return; r.iterSpread = true; DB.put('blocks', r); const L = ITER.line(b); let x = L[0].x || 0; L.forEach((v, i) => { if (!i) return; x += (L[i - 1].w || 392) + 84; v.x = Math.round(x / 14) * 14; v.y = L[0].y || 0; DB.put('blocks', v); }); changed(); },
  /** The strip under the header of the card on top. */
  strip(b, ro) {
    const L = ITER.line(b), i = L.findIndex(x => x.id === b.id), n = L.length, att = IDECK.attempts(b), word = att ? 'attempt' : 'v';
    const go = (e, dir) => { e.stopPropagation(); IDECK.show(b, dir); };
    const el = h('div.iter-deck.nopan', { title: 'Swipe, ‹ ›, or ← → with the card selected: the other versions' },
      h('button', { type: 'button', title: 'Older', disabled: i <= 0, on: { click: e => go(e, -1) } }, '‹'),
      h('span.id-dots', L.map((x, k) => h('i' + (k === i ? '.on' : ''), { title: (att ? 'Attempt ' : 'v') + (k + 1) + (x.iter && x.iter.why ? ' — ' + snippet(x.iter.why, 60) : ''), on: { click: e => { e.stopPropagation(); IDECK.to(b, x.id); } } }))),
      h('span.id-l', (att ? 'attempt ' : 'v') + (i + 1) + ' of ' + n),
      h('button', { type: 'button', title: 'Newer', disabled: i >= n - 1, on: { click: e => go(e, 1) } }, '›'),
      ro ? null : h('button.id-new', { type: 'button', title: att ? 'A new attempt on the deck' : 'A new version on the deck', on: { click: e => { e.stopPropagation(); ITER.make(L[n - 1]); } } }, '+'));
    // the swipe: a horizontal drag on the strip; the paper and the card stay put
    let d0 = null; const stop = e => e.stopPropagation();
    ['mousedown', 'click', 'dblclick', 'contextmenu'].forEach(t => el.addEventListener(t, stop));
    el.addEventListener('pointerdown', e => { e.stopPropagation(); d0 = { x: e.clientX, y: e.clientY, id: e.pointerId }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointerup', e => { if (!d0) return; const dx = e.clientX - d0.x, dy = e.clientY - d0.y; d0 = null; if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) IDECK.show(b, dx < 0 ? 1 : -1); });
    el.addEventListener('pointercancel', () => { d0 = null; });
    return el;
  },
  /** After a note is drawn: the deck's versions share the top card's spot (a move of any card moved the deck), and the cards beneath take its height. */
  after(pane) {
    const w = pane.paper && pane.paper.world, d = M.doc(pane.docId); if (!w || pane.travel || !d || prof(d.type).ordered) return;
    $$(':scope > .box.deck-top', w).forEach(tEl => { const b = M.block(tEl.dataset.id); if (!b) return; const H = tEl.offsetHeight;
      ITER.line(b).forEach(x => { if (x.id === b.id) return;
        if ((x.x || 0) !== (b.x || 0) || (x.y || 0) !== (b.y || 0)) { x.x = b.x; x.y = b.y; DB.put('blocks', x); }
        const u = $(`:scope > .box[data-id="${x.id}"]`, w); if (!u) return; const k = +u.dataset.under || 1; u.style.left = ((b.x || 0) + 7 * k) + 'px'; u.style.top = ((b.y || 0) + 7 * k) + 'px'; if (H) u.style.height = H + 'px'; });
    });
  },
};
CKINDS.BASE.push({ id: 'troubleshooting', label: 'Troubleshooting', color: '#B2361F', attempts: true, skeleton: 'Problem: \n\nTried: \n\nOutcome: ',
  links: [{ rel: 'resolves', with: ['barrier'] }, { rel: 'leads', with: ['resolution', 'decision', 'method'] }, { rel: 'iterates', with: ['troubleshooting'] }] });
{
  // a new version lands on the deck, becomes the card on top, and a Troubleshooting attempt starts with the skeleton
  const sp = ITER.spot; ITER.spot = function (from, pane) { if (from && !IDECK.spread(from)) return { x: from.x || 0, y: from.y || 0 }; return sp.apply(this, arguments); };
  const at = ITER.attach; ITER.attach = function (id, fromId) { const r = at.apply(this, arguments); const b = M.block(id); if (!b) return r;
    IDECK.shown.set(ITER.root(b), b.id); const K = b.ckind && CKINDS.get(b.ckind);
    if (K && K.skeleton && b.kind === 'component' && !((b.body || {}).text || '').trim()) { b.body = { text: K.skeleton, marks: [] }; DB.put('blocks', b); }
    IDECK.refresh(b); return r; };
  // the kind set on an empty component: its skeleton
  const st = CKINDS.set; CKINDS.set = function (b, id) { const r = st.apply(this, arguments); const K = id && CKINDS.get(id), cur = M.block(b.id);
    if (K && K.skeleton && cur && cur.kind === 'component' && !((cur.body || {}).text || '').trim()) { cur.body = { text: K.skeleton, marks: [] }; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); } return r; };
  // the version tag's menu: deck or spread
  const mn = ITER.menu; ITER.menu = function (b, e, ro) { if (ro) return mn.apply(this, arguments); const orig = ctxMenu;
    ctxMenu = (x, y, rows) => orig(x, y, [...rows, 'sep', IDECK.spread(b) ? { label: 'Stack as a deck', sub: 'Every version at one spot, the newest on top; swipe through them', run: () => IDECK.stack(b) } : { label: 'Spread out', sub: 'Every version beside the one before, as they were', run: () => IDECK.spreadOut(b) }]);
    try { return mn.apply(this, arguments); } finally { ctxMenu = orig; } };
  // the cards: the one on top gets the strip; the others stack beneath it
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (!el || !b || b.kind === 'ref' || !ITER.v(b) || IDECK.spread(b)) return el;
    const L = ITER.line(b), top = IDECK.top(b), i = L.findIndex(x => x.id === b.id), ti = L.findIndex(x => x.id === top.id);
    const ord = !!(d && prof(d.type).ordered);   // an ordered note places its boxes in a column: the cards beneath are hidden, not stacked
    if (b.id === top.id) { el.classList.add('deck-top'); const bh = $(':scope > .bh', el); if (bh) bh.after(IDECK.strip(b, !!this.travel)); if (!ord && !el.style.zIndex) el.style.zIndex = '4'; }
    else if (ord) el.classList.add('deck-hid');
    else { const k = Math.min(3, Math.abs(ti - i)); el.classList.add('deck-under'); el.dataset.under = k; el.style.left = ((top.x || 0) + 7 * k) + 'px'; el.style.top = ((top.y || 0) + 7 * k) + 'px'; el.style.zIndex = String(4 - k); }
    return el; };
  const up = DocView.update; DocView.update = function () { const out = up.apply(this, arguments); try { IDECK.after(this); } catch (e) { } return out; };
  // "boxes never overlap" (12 settle) pushes each box below the one it covers: the cards beneath a deck sit that out, then follow the top
  const se = DocView.settle; DocView.settle = function () { const d = M.doc(this.docId); if (!d || this.travel || prof(d.type).ordered) return se.apply(this, arguments);
    const lb = M.liveBlocks; M.liveBlocks = function (id) { const L = lb.apply(this, arguments); return id === d.id ? L.filter(b => !IDECK.beneath(b)) : L; };
    let r; try { r = se.apply(this, arguments); } finally { M.liveBlocks = lb; } try { IDECK.after(this); } catch (e) { } return r; };
  // the "next version" wires inside a deck are not drawn (the list is the caller's: trimmed in place)
  const lay = WIRES.layout; WIRES.layout = function (list, R) { for (let i = list.length - 1; i >= 0; i--) { const x = list[i].x; if (x && x.rel === ITER.REL) { const a = M.block(x.from); if (a && !IDECK.spread(a)) list.splice(i, 1); } } return lay.apply(this, arguments); };
  // ← → with the card on top selected
  document.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; if (e.ctrlKey || e.metaKey || e.altKey || $('.ovl')) return; const a = document.activeElement; if (a && a.closest && a.closest('input,textarea,[contenteditable="true"]')) return;
    const pane = App.pane; const b = pane && pane.sel && M.block(pane.sel); if (!b || !ITER.v(b) || IDECK.spread(b) || IDECK.top(b).id !== b.id) return; e.preventDefault(); IDECK.show(b, e.key === 'ArrowRight' ? 1 : -1); });
}
