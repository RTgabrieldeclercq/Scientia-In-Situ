/* ==========================================================================
   14h · Floats (V4.7). Gabe: "Add a new kind, called a float. Floats are items
   that need to belong to a new note in the future, but is not organized or
   created yet. Bring up /float to bring up a hemisphere dome of floating float
   components that you can drag into the current note you are into … Once a
   float is placed into a note, it is an assigned float and is no longer part
   of the floats. Floats show up as bridges from where they were from." Then:
   "it should not be a kind, but tracked like a kind. You can right click a
   component to make it a float, or use the command on preselected components
   via the Ctrl button. The float color should be light purple or sky blue.
   The float symbol should be a cloud. I want the dome to be completely in
   phase with the bottom of the canvas and blend in to the note canvas in a
   gradient with the same color palette showing since the bubble/lens should
   be optically clear and glistening."
   - A float is a flag beside the kind (like a reference, 14g): `b.afloat =
     { at, t }` when marked; `b.afloat.to = { docId, blockId, at }` once it is
     placed — an assigned float, no longer among the floats. (Not `b.float`:
     CLIP.lift uses that for a clip lying on its paper.) Its card shows a
     cloud and "afloat" in the float colour (--float, a sky lavender).
   - Making floats: right-click → Make it a float / No longer a float; with
     components selected (Ctrl), /float (or the selection bar's Make floats)
     makes them all floats, one Undo; with nothing selected /float opens the
     dome.
   - The dome rises from the bottom edge of the canvas, its base on that edge,
     and fades into the note through a gradient of the note's own paper; the
     glass is clear (no fill): a bright rim, the rim bending what lies behind
     it (BUBBLE.warp, where the browser can), two small highlights. The floats
     drift inside as glass beads — coloured by kind (or where they came from,
     or age), oldest lowest — turning slowly, still while the pointer is in
     the dome. Rest 1 s on one (or click it) for its preview: Place here, Open
     where it was written. Drag one out onto the note: it lands as a bridge
     from where it was written ("Float · from …"), one Undo, and leaves the
     dome; "Back to the floats" on the bridge undoes the placing.
   API (the Monthly review uses it)
   • FLOATS.isFloat(b) — marked, live, not placed.
   • FLOATS.waiting() — the floats, oldest first (lit reviews left out).
   • FLOATS.placed() — the assigned floats (their originals).
   • FLOATS.mark(ids) / FLOATS.unmark(ids) — one Undo each call.
   • FLOATS.place(blockId, docId, at) — the bridge into that note at { x, y }
     (or a free spot), marks the original assigned; returns the bridge.
   • FLOATS.back(bridgeId) — the placed float goes back to the floats.
   • FLOATS.open(ctx) — the dome on the current note's canvas; FLOATS.close().
   • FLOATS.old(b) — days it has waited (null when not a waiting float).
   ========================================================================== */
const FLOATS = {
  CLOUD: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.4 18.6h9.4a4.3 4.3 0 0 0 .62-8.55 6.05 6.05 0 0 0-11.55-.9A4.75 4.75 0 0 0 7.4 18.6z" fill="currentColor"/></svg>',
  on: () => typeof FEAT === 'undefined' || FEAT.on('floats'),
  opt(k, d) { try { const v = FEAT.tune('floats', k); return v == null ? d : v; } catch (e) { return d; } },
  cloud(cls) { const s = h('span.fl-cl' + (cls ? '.' + cls : '')); s.innerHTML = FLOATS.CLOUD; return s; },
  lit(b) { try { return typeof TERMLIT !== 'undefined' && TERMLIT.is(M.doc(b.docId)); } catch (e) { return false; } },
  live: b => !!b && b.status === 'live' && b.kind !== 'ref' && (d => !!d && !d.deleted)(M.doc(b.docId)),
  isFloat: b => FLOATS.live(b) && !!b.afloat && !b.afloat.to,
  t: b => (b && b.afloat && (b.afloat.t || Date.parse(b.afloat.at || ''))) || 0,
  waiting() { return DB.where('blocks', b => FLOATS.isFloat(b) && !FLOATS.lit(b)).sort((a, b) => FLOATS.t(a) - FLOATS.t(b)); },
  placed() { return DB.where('blocks', b => FLOATS.live(b) && !!b.afloat && !!b.afloat.to); },
  old(b) { return FLOATS.isFloat(b) ? Math.max(0, Math.floor((Date.now() - FLOATS.t(b)) / 864e5)) : null; },
  isOld(b) { const d = FLOATS.old(b); return d != null && d >= (+FLOATS.opt('old', 14) || 14); },
  mark(ids) {
    const L = [...new Set(ids || [])].map(M.block).filter(b => FLOATS.live(b) && !(b.afloat && !b.afloat.to)); if (!L.length) return 0;
    DB.beginGroup('float'); let t = Date.now();
    L.forEach(cur => { cur.afloat = { at: isoLocal(new Date()), t: t++ }; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); });
    changed(); toast(L.length === 1 ? '“' + snippet(M.blockName(L[0]), 40) + '” is a float — /float in any note brings it' : plural(L.length, 'float') + ' — /float in any note brings them'); FLOATS.redraw(); return L.length;
  },
  unmark(ids) {
    const L = [...new Set(ids || [])].map(M.block).filter(b => b && b.afloat); if (!L.length) return 0;
    DB.beginGroup('float'); L.forEach(cur => { delete cur.afloat; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); });
    changed(); toast(L.length === 1 ? 'No longer a float' : plural(L.length, 'component') + ' no longer floats'); FLOATS.redraw(); return L.length;
  },
  place(blockId, docId, at) {
    const b = M.block(blockId), d = M.doc(docId); if (!FLOATS.isFloat(b) || !d) return null;
    if (b.docId === d.id) { toast('It was written in this note — place it in another'); return null; }
    DB.beginGroup('float'); const g = DB.group;   // changed() (inside BRIDGE.make's M.addBlock) starts a new undo group; the writes after it rejoin this one — one Ctrl+Z
    const r = BRIDGE.make(b, d, Object.assign({ quiet: true, why: '' }, at ? { at } : {})); if (!r) { toast('It is in this note already'); return null; }
    DB.group = g;
    try { if (typeof CLIP !== 'undefined' && CLIP.lift) CLIP.lift(r); } catch (e) { }   // it lies where it was dropped, over what is there, until moved (as a paste or a snip does, V3.996) — no push, one Undo
    r.asFloat = true; DB.put('blocks', r);
    const cur = M.block(blockId); cur.afloat = Object.assign({}, cur.afloat, { to: { docId: d.id, blockId: r.id, at: isoLocal(new Date()) } }); cur.modified = isoLocal(new Date()); DB.put('blocks', cur);
    try { IX.rebuild(); } catch (e) { } changed();
    toast('“' + snippet(M.blockName(b), 40) + '” is placed — a bridge from “' + snippet((M.doc(b.docId) || {}).title || 'its note', 30) + '” · Ctrl+Z takes it back');
    FLOATS.redraw(); return r;
  },
  back(refId) {
    const r = M.block(refId); if (!r || r.kind !== 'ref' || !r.asFloat) return false; const o = M.block(r.refBlockId);
    DB.beginGroup('float'); const g = DB.group; M.removeRef(r); DB.group = g;   // one Ctrl+Z (M.removeRef calls changed(), which starts a new group)
    if (o && o.afloat) { const a = Object.assign({}, o.afloat); delete a.to; o.afloat = a; o.modified = isoLocal(new Date()); DB.put('blocks', o); }
    try { IX.rebuild(); } catch (e) { } changed(); toast('Back to the floats'); FLOATS.redraw(); return true;
  },
  /** The components selected now: boxes (Ctrl+click, the lasso) and Ctrl-held selections of words. */
  selected() {
    const ids = new Set(); try { if (typeof BULK !== 'undefined') BULK.ids().forEach(id => ids.add(id)); } catch (e) { }
    try { if (typeof MSEL !== 'undefined') (MSEL.pieces || []).forEach(p => p && p.blockId && ids.add(p.blockId)); } catch (e) { }
    return [...ids].filter(id => FLOATS.live(M.block(id)));
  },
  colour(b) {
    const by = FLOATS.opt('by', 'kind');
    if (by === 'origin') { let x = 0; for (const c of String(b.docId)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return 'hsl(' + (x % 360) + ' 55% 58%)'; }
    if (by === 'age') { const d = FLOATS.old(b) || 0, k = Math.min(1, d / ((+FLOATS.opt('old', 14) || 14) * 1.5)); return 'color-mix(in srgb, var(--ink-4) ' + Math.round(k * 80) + '%, var(--float))'; }
    const K = typeof CKINDS !== 'undefined' && CKINDS.of(b); if (K) return K.color;
    try { const it = IX.itemsOf(b.id)[0], k = it && KIND[it.kind]; if (k) return 'var(--k-' + it.kind + ')'; } catch (e) { }
    return 'var(--float)';
  },

  /* ---------- the dome ---------- */
  D: null,
  canBackdrop: (() => { try { return CSS.supports('backdrop-filter', 'url(#x)') || CSS.supports('-webkit-backdrop-filter', 'url(#x)'); } catch (e) { return false; } })(),
  open(ctx) {
    if (!FLOATS.on()) return toast('Floats are off (Settings → Features → Floats)');
    const pane = (ctx && ctx.pane && ctx.pane.paper) ? ctx.pane : App.panes().find(p => p && p.paper && p.docId);
    if (!pane || !pane.paper) return toast('Open a note, then /float');
    FLOATS.close(); const host = pane.paper.el, r = host.getBoundingClientRect();
    const D = Math.max(220, Math.round(Math.min(r.width * .74, r.height * .8, 820) / 8) * 8), RR = D / 2;   // most of the note stays free to drop on
    const Dm = { pane, host, D, RR, rot: 0, hold: false, hot: null, rest: 0, prev: null, drag: null, q: '', beads: new Map(), raf: 0, last: 0 };
    const spec = BUBBLE.svg ? BUBBLE.svg('svg', { class: 'fl-spec', viewBox: '0 0 200 100', 'aria-hidden': 'true' },
      '<ellipse cx="44" cy="27" rx="9" ry="3" transform="rotate(-26 44 27)" fill="url(#bb-hl)" opacity=".8"/><ellipse cx="53" cy="32.5" rx="3.2" ry="1.2" transform="rotate(-26 53 32.5)" fill="url(#bb-hl)" opacity=".55"/>') : null;
    try { BUBBLE.defs(); } catch (e) { }
    const wid = FLOATS.canBackdrop && BUBBLE.warp ? BUBBLE.warp(D) : null;
    const field = h('div.fl-field'), q = h('input.fl-q', { type: 'search', placeholder: 'Search the floats', 'aria-label': 'Search the floats', autocomplete: 'off', on: { input: e => { Dm.q = e.target.value.trim().toLowerCase(); FLOATS.build(); }, keydown: e => { if (e.key === 'Escape') { e.preventDefault(); FLOATS.close(); } } } });
    const dome = h('div.fl-dome', { style: wid ? { '--bd': `url(#${wid})` } : {}, on: { pointerenter: () => { Dm.hold = true; }, pointerleave: () => { Dm.hold = false; FLOATS.unhot(); }, pointermove: e => FLOATS.move(e), pointerdown: e => e.stopPropagation(), wheel: e => e.stopPropagation() } },
      h('div.fl-glass'), spec, field);
    const ui = h('div.fl-ui', { on: { pointerdown: e => e.stopPropagation() } }, FLOATS.cloud(), h('b.fl-n'), q, h('button.fl-x', { type: 'button', title: 'Close (Esc)', 'aria-label': 'Close the floats', on: { click: () => FLOATS.close() } }, '×'));
    const wrap = h('div.fl-wrap', { style: { '--D': D + 'px', '--R': RR + 'px' }, role: 'dialog', 'aria-label': 'Floats' }, h('div.fl-skirt'), dome, ui);
    Dm.wrap = wrap; Dm.dome = dome; Dm.field = field; Dm.ui = ui; FLOATS.D = Dm; host.append(wrap);
    FLOATS.build(); FLOATS.loop(); requestAnimationFrame(() => wrap.classList.add('up'));
    return Dm;
  },
  close() { const Dm = FLOATS.D; if (!Dm) return; cancelAnimationFrame(Dm.raf); clearTimeout(Dm.rest); FLOATS.unprev(); if (Dm.drag && Dm.drag.ghost) Dm.drag.ghost.remove(); Dm.wrap.remove(); FLOATS.D = null; },
  redraw() { const Dm = FLOATS.D; if (!Dm) return; if (!Dm.host.isConnected) return FLOATS.close(); FLOATS.build(); },
  /** The beads: the floats there are (minus this note's own), placed on the hemisphere — golden-angle round it, oldest lowest. */
  build() {
    const Dm = FLOATS.D; if (!Dm) return; const here = Dm.pane.docId;
    const all = FLOATS.waiting(), L = all.filter(b => b.docId !== here && (!Dm.q || (M.blockName(b) + ' ' + ((b.body && b.body.text) || '') + ' ' + ((M.doc(b.docId) || {}).title || '')).toLowerCase().includes(Dm.q)));
    Dm.list = L; Dm.ui.querySelector('.fl-n').textContent = plural(L.length, 'float') + (Dm.q && L.length !== all.length ? ' of ' + all.length : '');
    const keep = new Set(L.map(b => b.id)); [...Dm.beads.keys()].forEach(id => { if (!keep.has(id)) { Dm.beads.get(id).el.remove(); Dm.beads.delete(id); } });
    const n = L.length;
    L.forEach((b, i) => {
      const k = n > 1 ? i / (n - 1) : .5, old = FLOATS.isOld(b), el0 = Dm.beads.get(b.id);
      const e = (old ? .06 : .14) + (old ? .32 : 1.02) * k, a = i * 2.39996;   // elevation (rad): oldest lowest; azimuth: the golden angle
      if (el0) { Object.assign(el0, { e, a, old }); el0.el.classList.toggle('old', old); return; }
      const days = FLOATS.old(b), el = h('button.fl-b' + (old ? '.old' : ''), { type: 'button', 'data-id': b.id, 'aria-label': M.blockName(b) + ' — a float from ' + ((M.doc(b.docId) || {}).title || 'a note'), style: { '--kc': FLOATS.colour(b) },
        on: { pointerdown: ev => FLOATS.down(ev, b), click: ev => { ev.stopPropagation(); if (Dm.drag && Dm.drag.moved) return; FLOATS.preview(b); } } }, old && days != null ? h('span.fl-age', days + ' d') : null);
      Dm.field.append(el); Dm.beads.set(b.id, { el, e, a, old, b });
    });
    if (!n) { if (!Dm.field.querySelector('.fl-empty')) Dm.field.append(h('div.fl-empty', FLOATS.cloud(), h('span', all.length ? 'Nothing here matches' : 'No floats waiting — right-click a component → Make it a float'))); }
    else { const em = Dm.field.querySelector('.fl-empty'); if (em) em.remove(); }
    FLOATS.frame(true);
  },
  /** Where each bead is now: the hemisphere turned by rot, seen a little from above; nearer is larger and on top. */
  frame(force) {
    const Dm = FLOATS.D; if (!Dm) return; const RR = Dm.RR, rx = RR * .84, ry = RR * .84;
    Dm.beads.forEach(o => {
      const az = o.a + Dm.rot, ce = Math.cos(o.e), x = ce * Math.cos(az), z = ce * Math.sin(az), y = Math.sin(o.e), dep = (z + 1) / 2;
      const px = RR + x * rx, py = RR - y * ry - z * RR * .08, d = Math.round((o.old ? 22 : 28) * (.72 + .5 * dep));
      if (!force && o.px === px && o.py === py) return; o.px = px; o.py = py; o.d = d;
      const s = o.el.style; s.left = px.toFixed(1) + 'px'; s.top = py.toFixed(1) + 'px'; s.setProperty('--d', d + 'px'); s.zIndex = String(10 + Math.round(dep * 50)); s.opacity = (o.old ? .5 : .62) + .38 * dep;
    });
  },
  loop() {
    const Dm = FLOATS.D; if (!Dm) return;
    const step = t => { if (FLOATS.D !== Dm) return; const dt = Dm.last ? Math.min(64, t - Dm.last) : 16; Dm.last = t;
      const spin = FLOATS.opt('spin', 'slow') === 'slow' && !RM() && !Dm.hold && !Dm.drag;
      if (spin) { Dm.rot += dt * .00009; FLOATS.frame(); }
      Dm.raf = requestAnimationFrame(step); };
    Dm.raf = requestAnimationFrame(step);
  },
  /** The bead under the pointer, by geometry: the front-most whose disc holds it; the one you are on keeps it until you leave its disc (+8 px). */
  at(cx, cy) {
    const Dm = FLOATS.D; if (!Dm) return null; const r = Dm.dome.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
    const H = Dm.hot && Dm.beads.get(Dm.hot); if (H && Math.hypot(x - H.px, y - H.py) <= H.d / 2 + 8) return Dm.hot;
    let best = null, z = -1; Dm.beads.forEach((o, id) => { if (Math.hypot(x - o.px, y - o.py) <= o.d / 2 + 3) { const zi = +o.el.style.zIndex || 0; if (zi > z) { z = zi; best = id; } } });
    return best;
  },
  move(e) {
    const Dm = FLOATS.D; if (!Dm || Dm.drag) return; const id = FLOATS.at(e.clientX, e.clientY);
    if (id === Dm.hot) return; FLOATS.unhot(); if (!id) return;
    Dm.hot = id; const o = Dm.beads.get(id); o.el.classList.add('hot', 'rest');
    const ms = +FLOATS.opt('rest', 1000) || 1000; o.el.style.setProperty('--rest', ms + 'ms');
    Dm.rest = setTimeout(() => { if (FLOATS.D === Dm && Dm.hot === id) FLOATS.preview(o.b); }, ms);
  },
  unhot() { const Dm = FLOATS.D; if (!Dm) return; clearTimeout(Dm.rest); if (Dm.hot) { const o = Dm.beads.get(Dm.hot); if (o) o.el.classList.remove('hot', 'rest'); } Dm.hot = null; },
  /** Its preview, over the dome: what it is, where it was written, Place here · Open where it was written. */
  preview(b) {
    const Dm = FLOATS.D; if (!Dm) return; FLOATS.unprev(); const o = Dm.beads.get(b.id); if (o) o.el.classList.remove('rest');
    const d = M.doc(b.docId) || {}, K = typeof CKINDS !== 'undefined' && CKINDS.of(b), days = FLOATS.old(b);
    let body = null; if (b.kind !== 'component') { try { const sp = BUBBLE.spec(b.id); body = sp && sp.body; } catch (e) { } }   // a figure, a table… as the bubbles draw it; words at reading size
    if (!body) body = h('p', snippet(String((b.body && b.body.text) || '').replace(/￼/g, ''), 260) || M.blockName(b));
    const card = h('div.fl-prev', { role: 'dialog', 'aria-label': M.blockName(b), on: { pointerdown: e => e.stopPropagation() } },
      h('div.fl-ph', FLOATS.cloud(), h('span', 'Float'), K ? h('span.fl-pk', { style: { '--kc': K.color } }, K.label) : null, h('span.sp'), h('button.fl-px', { type: 'button', 'aria-label': 'Close', on: { click: () => FLOATS.unprev() } }, '×')),
      h('b.fl-pt', M.blockName(b)), h('div.fl-pb', body),
      h('div.fl-pw', 'from ', h('i', d.title || 'a note'), days != null ? ' · waiting ' + (days ? plural(days, 'day') : 'since today') : ''),
      h('div.fl-pa', h('button.btn.sm.pri', { type: 'button', on: { click: () => { FLOATS.unprev(); FLOATS.place(b.id, Dm.pane.docId, FLOATS.spot()); } } }, 'Place here'),
        h('button.btn.sm', { type: 'button', on: { click: e => { FLOATS.close(); App.jump(b.id, e); } } }, 'Open where it was written')));
    Dm.prev = card; Dm.wrap.append(card);
  },
  unprev() { const Dm = FLOATS.D; if (Dm && Dm.prev) { Dm.prev.remove(); Dm.prev = null; } },
  /** A free spot in view, above the dome. */
  spot() {
    const Dm = FLOATS.D; const P = Dm && Dm.pane.paper; if (!P) return null; const r = P.rect();
    if (FLOATS.opt('place', 'drop') === 'centre' && typeof CLIPX !== 'undefined' && CLIPX.spot) return CLIPX.spot(Dm.pane);
    return P.toWorld(r.left + r.width / 2 - 196, r.top + Math.max(40, (r.height - Dm.RR) * .38));
  },
  /* dragging a bead out onto the note */
  down(e, b) {
    const Dm = FLOATS.D; if (!Dm || e.button > 0) return; e.stopPropagation(); FLOATS.unhot();
    const x0 = e.clientX, y0 = e.clientY; Dm.drag = { id: b.id, moved: false };
    const mv = ev => { const g = Dm.drag; if (!g) return; if (!g.moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      if (!g.moved) { g.moved = true; FLOATS.unprev(); g.ghost = h('div.fl-ghost', FLOATS.cloud(), h('b', snippet(M.blockName(b), 44)), h('span', 'from ' + snippet((M.doc(b.docId) || {}).title || 'a note', 28))); document.body.append(g.ghost); Dm.host.classList.add('fl-drop'); const o = Dm.beads.get(b.id); if (o) o.el.classList.add('lift'); }
      g.ghost.style.left = ev.clientX + 'px'; g.ghost.style.top = ev.clientY + 'px'; const over = FLOATS.inDome(ev.clientX, ev.clientY); g.ghost.classList.toggle('back', over); };
    const up = ev => { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); const g = Dm.drag; Dm.host.classList.remove('fl-drop');
      const o = Dm.beads.get(b.id); if (o) o.el.classList.remove('lift');
      if (g && g.moved) { if (g.ghost) g.ghost.remove(); const hr = Dm.host.getBoundingClientRect(), inHost = ev.clientX >= hr.left && ev.clientX <= hr.right && ev.clientY >= hr.top && ev.clientY <= hr.bottom;
        if (inHost && !FLOATS.inDome(ev.clientX, ev.clientY)) { const at = FLOATS.opt('place', 'drop') === 'centre' ? FLOATS.spot() : Dm.pane.paper.toWorld(ev.clientX - 30, ev.clientY - 18); FLOATS.place(b.id, Dm.pane.docId, at); } }
      setTimeout(() => { if (FLOATS.D === Dm) Dm.drag = null; }, 0); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },
  /** Inside the dome's glass (the half disc), not just its box. */
  inDome(cx, cy) { const Dm = FLOATS.D; if (!Dm) return false; const r = Dm.dome.getBoundingClientRect(), x = cx - (r.left + r.width / 2), y = r.bottom - cy; return y >= 0 && Math.hypot(x, y) <= Dm.RR; },
};
{
  // the card: a cloud and "afloat" while it waits; "assigned float" once placed; a placed float's bridge says "Float · from" and can go back
  const bx = DocView.box; DocView.box = function (b, d, p) {
    const el = bx.apply(this, arguments); if (!el || !b) return el;
    if (FLOATS.on() && b.afloat && b.kind !== 'ref') {
      if (!b.afloat.to) { const days = FLOATS.old(b), old = FLOATS.isOld(b); el.classList.add('is-float'); if (old) el.classList.add('fl-old');
        el.append(h('span.fl-mark', { title: 'A float — it waits for a note; /float in that note brings it' + (days ? ' · waiting ' + plural(days, 'day') : ''), 'aria-label': 'a float' }, FLOATS.cloud(), h('span', 'afloat'), old && days != null ? h('span.fl-d', days + ' d') : null)); }
      else { const to = M.doc(b.afloat.to.docId); el.classList.add('fl-assigned'); el.append(h('span.fl-mark.done', { title: 'An assigned float — placed in “' + ((to && to.title) || 'a note') + '”' }, FLOATS.cloud('o'), h('span', 'assigned float'))); }
    }
    if (b.kind === 'ref' && b.asFloat) {
      el.classList.add('float-use'); const k = el.querySelector('.origin .or-k'); if (k) k.textContent = 'Float · from';
      const n = el.querySelector(':scope > .bh > .num'); if (n) n.textContent = 'Float';
      const top = el.querySelector('.origin .or-top'); const o = M.block(b.refBlockId), when = o && o.afloat && o.afloat.to && o.afloat.to.at;
      if (top && !top.querySelector('.fl-back')) { if (when) top.append(h('span.fl-when', fmtDay(when))); if (FLOATS.on() && !(this && this.travel)) top.append(h('button.fl-back', { type: 'button', title: 'Take it out of this note: it floats again, waiting', on: { pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation(); FLOATS.back(b.id); } } }, '↩ Back to the floats')); }
    }
    return el; };
  // the component's menu (right-click or ⋯): Make it a float / No longer a float; on a placed float's bridge, Back to the floats
  const bm = DocView.boxMenu; DocView.boxMenu = function (b) {
    if (!FLOATS.on() || !b || b.status !== 'live') return bm.apply(this, arguments);
    const sel = FLOATS.selected(), many = sel.length > 1 && sel.includes(b.id);
    let it = null;
    if (b.kind === 'ref' && b.asFloat) it = { label: 'Back to the floats', sub: 'Out of this note; it waits among the floats again', run: () => FLOATS.back(b.id) };
    else if (b.kind !== 'ref') it = many ? { label: 'Make them floats (' + sel.length + ')', sub: 'Each keeps its kind; /float in a note brings them', run: () => FLOATS.mark(sel) }
      : FLOATS.isFloat(b) ? { label: 'No longer a float', sub: 'It stays where it is, as it is', run: () => FLOATS.unmark([b.id]) }
      : b.afloat && b.afloat.to ? null : { label: 'Make it a float', sub: 'It keeps its kind and waits for a note; /float there brings it', run: () => FLOATS.mark([b.id]) };
    if (!it) return bm.apply(this, arguments);
    const cm = window.ctxMenu; window.ctxMenu = function (x, y, rows) { window.ctxMenu = cm; const i = rows.findIndex(r => r && (r.label === 'Make it a reference' || r.label === 'No longer a reference' || r.label === 'Bridge to another note…'));
      const out = rows.slice(); out.splice(i >= 0 ? i + 1 : 1, 0, it); return cm.call(this, x, y, out); };
    try { return bm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // the selection's bar: Make floats
  const ps = INK.paintSel; INK.paintSel = function () { ps.apply(this, arguments); try { if (!FLOATS.on()) return; const sel = INK.sel, pane = sel && sel.pane; if (!pane || !pane.paper || typeof BULK === 'undefined') return; const B = BULK.blocks().filter(FLOATS.live); if (!B.length) return;
    const bar = $('.ink-selbar', pane.paper.world); if (!bar || $('.fl-bulk', bar)) return; const g = $('.bulk-g', bar) || bar;
    g.append(h('button.btn.xs.fl-bulk', { title: 'Each one keeps its kind and waits for a note; /float there brings them', on: { click: e => { e.stopPropagation(); FLOATS.mark(B.map(b => b.id)); } } }, FLOATS.cloud(), ' Make floats')); } catch (e) { } };
  // /float — with components selected (Ctrl), they become floats; with none, the dome
  CMD.add({ slash: 'float', label: 'Floats…', args: [], alias: ['floats', 'dome'], group: 'Note', sub: 'Selected components become floats; with none selected, the dome of floats to drag into this note',
    run: (A, ctx) => { if (!FLOATS.on()) throw new Error('Floats are off — Settings → Features → Floats'); const sel = FLOATS.selected(); if (sel.length) { const n = FLOATS.mark(sel); return n ? plural(n, 'float') : 'Already floats'; } FLOATS.open(ctx); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && FLOATS.D && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.fl-q'))) { e.preventDefault(); e.stopPropagation(); if (FLOATS.D.prev) FLOATS.unprev(); else FLOATS.close(); } }, true);
  addEventListener('resize', () => { if (FLOATS.D) { const c = FLOATS.D.pane; FLOATS.close(); FLOATS.open({ pane: c }); } });
}
