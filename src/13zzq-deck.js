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
   • V3.970 (Gabe: "you cannot go back and forth between versions or create
     a third iteration"; "resizing one of the components resizes all other
     equally"): ‹ › the dots and + answer a mouse or pen click (the swipe
     took the pointer at once, so the click went to the strip); a version
     picked in the version tag's menu goes on top; the deck has one size —
     resize the card on top and every version takes its width (and height),
     on screen as you drag and in the record when you let go.
   • V3.974 (Gabe: "The iteration cards should actually reside not as a
     deck, but a set of 'slides' that you can scroll through vertical of the
     component on the left, like PowerPoint. Just click on the version you
     want and brings it up in the component window."): the component shows
     one version; a column of slides inside its left edge lists them all (a
     picture's thumbnail, a page's name, a text's first words), scrolls
     when they are many, and a click brings that version up; + at its foot
     makes the next. The other versions are not drawn. ↑ ↓ (or ← →) with
     the component selected go through them.
   • V3.978 (Gabe: "The slide deck format of the iteration should have a
     preview in the slides to the left. Versions can be deleted from an
     iteration panel."): each slide shows its version as it looks — the
     version's own box, drawn small (previews, after the note is drawn; a
     page or a PDF shows its name where its frame was). × on a slide (or its
     right-click menu) deletes that version at once, as a component is
     deleted (Ctrl+Z brings it back): the line closes up — the next improves
     on the one before it, the second becomes the first when the first goes,
     one left is a component again — and is numbered again (drop). With a pen
     hand a touch on × does nothing (the palm, as on the command bar).
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
  stack(b) { const r = M.block(ITER.root(b)); if (!r) return; const t = IDECK.top(b);
    // the top card's spot and size for every version (written while still spread, so no card's size wins over the top's), then the deck
    ITER.line(b).forEach(x => { if (x.id === t.id) return; let ch = false; if (x.x !== t.x || x.y !== t.y) { x.x = t.x; x.y = t.y; ch = true; }
      if (t.w && x.w !== t.w) { x.w = t.w; ch = true; } if (t.h != null && x.h != null && x.h !== t.h) { x.h = t.h; ch = true; } if (ch) DB.put('blocks', x); });
    delete r.iterSpread; DB.put('blocks', r); IDECK.widen(b, 1); changed(); },
  spreadOut(b) { const r = M.block(ITER.root(b)); if (!r) return; IDECK.widen(b, -1); r.iterSpread = true; DB.put('blocks', r); const L = ITER.line(b); let x = L[0].x || 0; L.forEach((v, i) => { if (!i) return; x += (L[i - 1].w || 392) + 84; v.x = Math.round(x / 14) * 14; v.y = L[0].y || 0; DB.put('blocks', v); }); changed(); },
  SLW: 104,   // the slides' width (CSS --slw): a line shown as slides is that much wider, so its content keeps its size
  /** Every version wider (+1) or narrower (−1) by the slides' width; the root remembers that the line is widened. */
  widen(b, dir) { const r = M.block(ITER.root(b)); if (!r || !!r.iterSlides === dir > 0) return false;
    const W = Math.max(240, (IDECK.top(b).w || 392) + dir * IDECK.SLW);   // one width for all (the one-size rule would copy a half-done one)
    ITER.line(b).forEach(x => { if (x.w !== W) { x.w = W; DB.put('blocks', x); } }); r.iterSlides = dir > 0 || undefined; if (!r.iterSlides) delete r.iterSlides; DB.put('blocks', r); return true; },
  /** A version's picture on its slide: an image panel's first picture, a file's name, a text's first words. */
  thumb(x) {
    try { const c = x.kind === 'figure' && (FIG.cells(x) || []).find(c => c && c.media), rec = c && MEDIA.get(c.media); if (rec && rec.kind === 'image') return h('img.isl-img', { src: MEDIA.url(rec), alt: '', loading: 'lazy', draggable: 'false' }); } catch (e) { }
    if (x.kind === 'html' || x.kind === 'pdf' || x.kind === 'deck') return h('span.isl-file', x.web ? 'Website' : x.kind === 'pdf' ? 'PDF' : x.kind === 'deck' ? 'Slides' : 'HTML page', h('span', snippet(x.label || M.blockName(x), 40)));
    const t = String((x.body && x.body.text) || '').replace(/\uFFFC/g, ' ').trim();
    return h('span.isl-txt', t ? snippet(t, 120) : (WIDGETS[x.kind] || {}).label || 'empty');
  },
  /** The slides: every version, the one on screen marked; + makes the next. Inside the component's left edge. */
  slides(b, ro) {
    const L = ITER.line(b), att = IDECK.attempts(b), word = k => (att ? 'attempt ' : 'v') + (k + 1);
    const del = (e, x) => { e.stopPropagation(); e.preventDefault(); if (typeof NAV !== 'undefined' && NAV.palmOff && NAV.palmOff(e)) return; IDECK.drop(x.id); };
    const el = h('div.iter-slides.nopan', { title: 'The versions — click one to bring it up' },
      L.map((x, k) => h('button.isl' + (x.id === b.id ? '.on' : ''), { type: 'button', 'data-id': x.id, title: (att ? 'Attempt ' : 'Version ') + (k + 1) + (x.iter && x.iter.why ? ' — ' + snippet(x.iter.why, 140) : k === 0 ? ' — the first' : ''),
        on: { click: e => { e.stopPropagation(); if (x.id !== b.id) IDECK.to(b, x.id); },
          contextmenu: e => { e.preventDefault(); e.stopPropagation(); if (ro) return; ctxMenu(e.clientX, e.clientY + 6, [{ head: (att ? 'Attempt ' : 'Version ') + (k + 1) }, x.id !== b.id ? { label: 'Bring it up', run: () => IDECK.to(b, x.id) } : null,
            { label: 'Delete ' + word(k), danger: true, sub: 'The others close up and are numbered again · Ctrl+Z brings it back', run: () => IDECK.drop(x.id) }].filter(Boolean)); } } },
        h('span.isl-n', word(k)), IDECK.thumb(x),
        ro ? null : h('span.isl-x', { role: 'button', title: 'Delete ' + word(k) + ' — Ctrl+Z brings it back', on: { click: e => del(e, x), pointerdown: e => e.stopPropagation() } }, '×'))),
      ro ? null : h('button.isl-new', { type: 'button', title: att ? 'A new attempt' : 'A new version', on: { click: e => { e.stopPropagation(); ITER.make(L[L.length - 1]); } } }, '+'));
    // the slides scroll on their own; a press there neither drags the component nor pans the paper
    ['pointerdown', 'mousedown', 'dblclick', 'contextmenu', 'wheel'].forEach(t => el.addEventListener(t, e => e.stopPropagation()));
    setTimeout(() => { const on = $('.isl.on', el); if (on && el.scrollHeight > el.clientHeight + 2) on.scrollIntoView({ block: 'nearest' }); }, 0);
    return el;
  },
  /** V3.978 — each slide shows its version as it looks: that version's box, drawn small (once the note is drawn and its widgets have
      drawn themselves). */
  previews(pane) {
    const w = pane && pane.paper && pane.paper.world; if (!w || !w.isConnected || pane.travel) return;
    $$(':scope > .box.deck-top > .iter-slides', w).forEach(col => $$(':scope > .isl[data-id]', col).forEach(sl => { if ($(':scope > .isl-pv', sl)) return;
      const src = $(`:scope > .box[data-id="${sl.dataset.id}"]`, w), x = M.block(sl.dataset.id); if (!src || !x) return;
      try { const pv = IDECK.preview(src, x, sl); if (pv) { const old = $(':scope > .isl-img, :scope > .isl-txt, :scope > .isl-file', sl); old ? old.replaceWith(pv) : sl.append(pv); IDECK.fit(pv); } } catch (e) { console.warn('[slide preview]', e); } }));
  },
  /** A copy of the version's box that does nothing: no ids, no data-id (the app finds a box by it), nothing editable, frames as their names. */
  preview(src, x, sl) {
    const top = src.classList.contains('deck-top'), c = src.cloneNode(true);
    c.classList.remove('deck-hid', 'deck-top', 'has-slides', 'sel', 'selected', 'multi', 'drag', 'website-live'); c.removeAttribute('data-id'); c.removeAttribute('id');
    $$('.iter-slides, .port, .rz, .embed-rz, .embed-tools, :scope > .bh, :scope > .iter-why', c).forEach(e => e.remove());   // the content, not the header: the slide says which version
    $$('[data-id]', c).forEach(e => e.removeAttribute('data-id')); $$('[id]', c).forEach(e => e.removeAttribute('id'));
    $$('[contenteditable]', c).forEach(e => e.setAttribute('contenteditable', 'false')); $$('input,textarea,select,button', c).forEach(e => { e.tabIndex = -1; });
    const sc = [...src.querySelectorAll('canvas')]; [...c.querySelectorAll('canvas')].forEach((k, i) => { const s = sc[i]; if (s && s.width && s.height) try { k.width = s.width; k.height = s.height; k.getContext('2d').drawImage(s, 0, 0); } catch (e) { } });
    $$('iframe', c).forEach(f => f.replaceWith(h('div.isl-frame', { style: { height: f.style.height || (f.parentElement && f.parentElement.style.height) || '300px' } }, x.web ? 'Website' : x.kind === 'pdf' ? 'PDF' : 'Page', h('b', snippet(x.label || M.blockName(x), 60)))));
    $$('video', c).forEach(v => { v.removeAttribute('autoplay'); v.preload = 'metadata'; v.muted = true; });
    // the width it is drawn at (the one on screen has the slides inside its edge); text is laid out narrower, so its words show larger
    const W = x.kind === 'component' ? 240 : Math.max(160, (x.w || 392) - (top ? IDECK.SLW : 0));
    Object.assign(c.style, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', margin: '0', boxShadow: 'none', transformOrigin: '0 0', pointerEvents: 'none' });
    c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true');
    const pv = h('span.isl-pv', { 'data-w': W }, c); return pv;
  },
  /** The copy scaled to the slide's width; the slide as tall as it, up to a limit. */
  fit(pv) { const c = pv.firstChild, W = +pv.dataset.w || 392, sw = Math.max(40, pv.clientWidth || 80), s = sw / W; c.style.transform = 'scale(' + s + ')'; pv.style.height = Math.round(Math.min(150, Math.max(30, (c.offsetHeight || 200) * s))) + 'px'; },
  /** V3.978 — a version deleted (from its slide): the line closes up and is numbered again; one left is a component again. One Ctrl+Z. */
  drop(id) {
    const x = M.block(id); if (!x || x.status !== 'live') return; const L = ITER.line(x), k = L.findIndex(y => y.id === id); if (k < 0 || L.length < 2) return;
    const why = EDIT.blocker([id]); if (why) return toast(why, 5000);
    const root = L[0], rest = L.filter(y => y.id !== id), nr = rest[0], shown = IDECK.top(x).id, att = IDECK.attempts(x), name = (att ? 'Attempt ' : 'Version ') + (k + 1);
    const bg = DB.beginGroup; DB.beginGroup('delete-version'); DB.beginGroup = () => { };   // one undo step, whatever is called on the way
    try {
    if (rest.length === 1) IDECK.widen(root, -1);   // one left: a component again, its own width
    const R0 = M.block(root.id), flags = { iterSlides: R0.iterSlides, iterSpread: R0.iterSpread };
    rest.forEach((y, i) => { const cur = M.block(y.id); if (!cur) return;
      if (i === 0) { delete cur.iter; if (rest.length === 1) { delete cur.iterSlides; delete cur.iterSpread; } else if (cur.id !== root.id) Object.keys(flags).forEach(f => { if (flags[f]) cur[f] = flags[f]; }); DB.put('blocks', cur); return; }
      let of = cur.iter.of === id ? (x.iter ? x.iter.of : nr.id) : cur.iter.of; if (!rest.some(r => r.id === of)) of = rest[i - 1].id;
      const was = cur.iter.of; cur.iter = Object.assign({}, cur.iter, { root: nr.id, of, v: i + 1 }); DB.put('blocks', cur);
      if (of !== was && !DB.where('wires', w => w.from === of && w.to === cur.id && w.rel === ITER.REL).length) DB.put('wires', { id: uid('w'), from: of, to: cur.id, rel: ITER.REL, directed: true, created: isoLocal(new Date()) }); });   // M.wire's record, without its side effects
    EDIT.purge(EDIT.footprint([id]));
    } finally { DB.beginGroup = bg; }
    IDECK.shown.delete(root.id); if (rest.length > 1) IDECK.shown.set(nr.id, shown === id ? rest[Math.min(k, rest.length - 1)].id : shown);
    DB.beginGroup(); IX.rebuild(); changed();
    toast(name + ' deleted' + (rest.length === 1 ? ' — one version left, a component again' : ' — the others are numbered again') + ' · Ctrl+Z brings it back', 4500);
  },
  /** One size for the whole deck (V3.970 — Gabe: "resizing one of the components resizes all other equally to keep that card deck
   *  feel"): the card just saved gives its width, and its height when it has one (a page, a PDF), to the other versions. */
  size(rec) {
    if (IDECK.spread(rec)) return 0; let n = 0;
    ITER.line(rec).forEach(x => { if (x.id === rec.id) return; let ch = false;
      if (rec.w && x.w !== rec.w) { x.w = rec.w; ch = true; } if (rec.h != null && x.h != null && x.h !== rec.h) { x.h = rec.h; ch = true; }
      if (ch) { DB.put('blocks', x); n++; $$(`.box[data-id="${x.id}"]`).forEach(e => { e.style.width = x.w + 'px'; }); } });
    return n;
  },
  /** After a note is drawn: the versions share the spot of the one on screen (a move of it moves them all); a line shown as slides
   *  for the first time (a new second version, or a deck from before V3.974) is widened once by the slides' width. */
  after(pane) {
    const w = pane.paper && pane.paper.world, d = M.doc(pane.docId); if (!w || pane.travel || !d) return; let wide = false;
    $$(':scope > .box.deck-top', w).forEach(tEl => { const b = M.block(tEl.dataset.id); if (!b) return;
      ITER.line(b).forEach(x => { if (x.id !== b.id && ((x.x || 0) !== (b.x || 0) || (x.y || 0) !== (b.y || 0))) { x.x = b.x; x.y = b.y; DB.put('blocks', x); } });
      if (IDECK.widen(b, 1)) wide = true; });
    if (wide) setTimeout(() => { changed(); }, 0);
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
    ctxMenu = (x, y, rows) => orig(x, y, [...rows, 'sep', IDECK.spread(b) ? { label: 'Show as slides', sub: 'One version on screen, all of them as slides on its left', run: () => IDECK.stack(b) } : { label: 'Spread out', sub: 'Every version beside the one before, each its own size', run: () => IDECK.spreadOut(b) }]);
    try { return mn.apply(this, arguments); } finally { ctxMenu = orig; } };
  // the component on screen carries the slides; the other versions are not drawn
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (!el || !b || b.kind === 'ref' || !ITER.v(b) || IDECK.spread(b)) return el;
    if (b.id === IDECK.top(b).id) { el.classList.add('deck-top', 'has-slides'); el.prepend(IDECK.slides(b, !!this.travel)); } else el.classList.add('deck-hid');
    return el; };
  const up = DocView.update; DocView.update = function () { const out = up.apply(this, arguments); try { IDECK.after(this); } catch (e) { } return out; };
  // V3.978: the previews, once the note's widgets have drawn themselves (an image panel lays its pictures out a frame later)
  const fl = DocView.fill; DocView.fill = function () { const out = fl.apply(this, arguments), pane = this; requestAnimationFrame(() => setTimeout(() => IDECK.previews(pane), 80)); return out; };
  // "boxes never overlap" (12 settle): the versions not drawn sit that out, then follow the one on screen
  const se = DocView.settle; DocView.settle = function () { const d = M.doc(this.docId); if (!d || this.travel || prof(d.type).ordered) return se.apply(this, arguments);
    const lb = M.liveBlocks; M.liveBlocks = function (id) { const L = lb.apply(this, arguments); return id === d.id ? L.filter(b => !IDECK.beneath(b)) : L; };
    let r; try { r = se.apply(this, arguments); } finally { M.liveBlocks = lb; } try { IDECK.after(this); } catch (e) { } return r; };
  // the "next version" wires inside a deck are not drawn (the list is the caller's: trimmed in place)
  const lay = WIRES.layout; WIRES.layout = function (list, R) { for (let i = list.length - 1; i >= 0; i--) { const x = list[i].x; if (x && x.rel === ITER.REL) { const a = M.block(x.from); if (a && !IDECK.spread(a)) list.splice(i, 1); } } return lay.apply(this, arguments); };
  // V3.970: a version picked in the version tag's menu (or "on v1 ↑" under a card) goes on top of its deck
  const go = ITER.go; ITER.go = function (id) { const b = M.block(id); if (!b || b.kind === 'ref' || !ITER.v(b) || IDECK.spread(b)) return go.apply(this, arguments);
    IDECK.shown.set(ITER.root(b), id); const pane = IDECK.pane(b); if (pane) IDECK.refresh(b); return go.apply(this, arguments); };
  // V3.970: one size for the deck — whatever saves a card's size (the grips of 12, 13g, 13zk) gives it to the other versions;
  // not while the sync writes what came from elsewhere (that device did the same), and not a deck that is spread out
  let sizing = false;
  const put = DB.put; DB.put = function (store, rec) { const r = put.apply(this, arguments);
    if (store === 'blocks' && !sizing && rec && rec.status === 'live' && rec.kind !== 'ref' && !(typeof SYNC !== 'undefined' && SYNC.applying) && (rec.iter || ITER.ix().has(rec.id))) {
      sizing = true; try { IDECK.size(rec); } catch (e) { } finally { sizing = false; } }
    return r; };
  // ↑ ↓ (or ← →) with the component selected: the version before or after
  document.addEventListener('keydown', e => { const K = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }; if (!K[e.key]) return; if (e.ctrlKey || e.metaKey || e.altKey || $('.ovl')) return; const a = document.activeElement; if (a && a.closest && a.closest('input,textarea,[contenteditable="true"]')) return;
    const pane = App.pane; const b = pane && pane.sel && M.block(pane.sel); if (!b || !ITER.v(b) || IDECK.spread(b) || IDECK.top(b).id !== b.id) return; e.preventDefault(); IDECK.show(b, K[e.key]); });
}
