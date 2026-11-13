/* ==========================================================================
   13zzv · Bridgeway: a note's bridges at its edges, and the bar that walks them
   (V3.990 — Gabe: "notes that are bridged to the current note show up as
   circled arrows in the fading area of the canvas near the border … Pulled in
   components have their note appear on the left border, while bridging
   components's notes destination appear on the right … a temporary bridge
   navigation will appear above the canvas and below the tabs … the top 3 note
   bridges that you use the most appear. They are reset every 2 weeks." Then:
   "Edge style should be half-moons, but should become beads when in full
   screen. Bar style should be 2.")
   • The edges, in each pane's faded margin: one circle per note. Left, the
     notes this note's bridges and pulled-in structures come from; right, the
     notes its own components are bridged (or pulled) to. Both arrows point
     right: the note reads as a stream. The number is how many; a dashed ring,
     structures pulled in only. Level with the component (the highest of
     them), following the paper; one out of view waits at the top or bottom
     with a caret; they push each other apart. Half-moons, half under the
     edge (pointing slides one in); in full screen (HANDS.full: there the
     screen's edge pans the note) beads, inside the margin.
     Pointing: the note's name, a thread to each of its components. Click: go
     there and land on the bridged component (in a split, in that pane);
     Alt+click: beside; right-click: choose the bridge. Touch: the first tap
     shows, the second goes.
   • The bar (#bwbar, under the tabs): the trail of notes crossed, stops on a
     line with the ring you crossed by between them (→ out to where it went,
     ← back to where it came from), ‹ › along it; and the three pairs of
     notes crossed between most this fortnight (both ways together; in
     fortnights from Mon 9 Nov 2026; settings.bridgeUse, so every device has
     the same three). It opens when you cross a bridge (a circle, the
     underline's Go to, "bridged from", a pulled-in structure's "appears in",
     the bar) and in a note of the three; it closes when you leave the notes
     for another tab, and comes back with Alt+← / Alt+→ to a note of the
     trail. × closes it until tomorrow (settings.bridgeBarShut); Settings →
     Structures → Bridges turns it off (settings.bridgeBar).
   ========================================================================== */
const BWAY = {
  ANCHOR: '2026-11-09', TRAIL: 12, GAP: 38, TOP: 84, BOTTOM: 100,   // clear of what sits in a note's corners: its tools and zoom (top), its Next button and the hand (bottom)
  trail: [], at: -1, token: null, hist: 0, step: null, shown: false, cur: null, withTrail: false, bumped: null,
  I: {
    arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 8h9.6M8.6 4.2 12.4 8l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    car: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 6.5 5 3.5l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bridge: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 11.5h13M3 11.5V8.2a5 5 0 0 1 10 0v3.3M6 11.5V9.4M10 11.5V9.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  },
  on: () => settings().bridgeBar !== false,
  shut: () => settings().bridgeBarShut === localDate(new Date()),
  beads: () => typeof HANDS !== 'undefined' && !!HANDS.full && HANDS.full(),
  alive: id => { const d = id && M.doc(id); return !!d && !d.deleted; },
  name: id => (M.doc(id) || {}).title || 'Untitled',

  /* ---------------- the counts: pairs of notes, by fortnight ---------------- */
  /** The first day of this fortnight: Mondays two weeks apart from ANCHOR. */
  since(now = new Date()) { const a = parseDay(BWAY.ANCHOR), n = Math.floor(Math.round((dayStart(now) - a) / 864e5) / 14); return localDate(addDays(a, n * 14)); },
  use() { const u = settings().bridgeUse, s = BWAY.since(); return u && u.since === s && u.n ? u : { since: s, n: {}, at: {} }; },
  key: (a, b) => [a, b].sort().join('|'),
  count(a, b) {
    if (!a || !b || a === b) return; const u = BWAY.use(), k = BWAY.key(a, b), n = Object.assign({}, u.n), at = Object.assign({}, u.at);
    n[k] = (n[k] || 0) + 1; at[k] = Date.now(); saveSettings({ bridgeUse: { since: u.since, n, at } }); BWAY.bumped = k;
  },
  top() { const u = BWAY.use(); return Object.keys(u.n).filter(k => u.n[k] > 0 && k.split('|').every(BWAY.alive)).sort((a, b) => u.n[b] - u.n[a] || (u.at[b] || 0) - (u.at[a] || 0)).slice(0, 3); },

  /* ---------------- the edges ---------------- */
  /** A note's two margins: { l, r }, each [{ doc, here: [its component ids], bridges, pulled, items: [{ here, there, why, pulled, label }] }]. */
  groups(docId) {
    const L = new Map(), R = new Map();
    const add = (G, doc, here, there, why, pulled, label) => { if (!G.has(doc)) G.set(doc, { doc, here: [], bridges: 0, pulled: 0, items: [] }); const g = G.get(doc);
      if (!g.here.includes(here)) g.here.push(here); pulled ? g.pulled++ : g.bridges++; g.items.push({ here, there, why: why || '', pulled, label }); };
    for (const b of M.docBlocks(docId)) {
      if (!b || b.status !== 'live') continue;
      if (b.kind === 'ref') {   // shown here from another note: a bridge, or a structure pulled in
        const ob = b.refBlockId && M.block(b.refBlockId), it = b.refItemId && M.item(b.refItemId), src = ob ? ob.docId : it && it.originDocId;
        if (src && src !== docId && BWAY.alive(src)) add(L, src, b.id, ob ? ob.id : it.originBlockId || null, b.why, !!b.refItemId, ob ? M.blockName(ob) : snippet(it.text || 'Pulled in', 40));
        continue;
      }
      for (const x of BRIDGE.out(b.id)) add(R, x.docId, b.id, x.id, x.why, false, M.blockName(b));
      for (const it of IX.itemsOf(b.id)) for (const rid of IX.refsOfItem.get(it.id) || []) {
        const x = M.block(rid); if (x && x.status === 'live' && x.docId !== docId && BWAY.alive(x.docId)) add(R, x.docId, b.id, x.id, '', true, M.blockName(b));
      }
    }
    return { l: [...L.values()], r: [...R.values()] };
  },
  /** On every drawing of a note: its circles (kept as they are when nothing changed, so a pointed one stays open). */
  build(P) {
    const pa = P && P.paper; if (!pa) return;
    let E = pa._bw;
    if (!E) { E = pa._bw = { P, l: h('div.bw-edge.l'), r: h('div.bw-edge.r'), svg: SV('svg', { class: 'bw-threads', 'aria-hidden': 'true' }), rects: new Map(), hov: null, sig: '' }; pa.el.append(E.svg, E.l, E.r); }
    E.P = P;
    const G = P.travel && P.travel.viewer ? { l: [], r: [] } : BWAY.groups(P.docId);
    const sig = JSON.stringify([G.l, G.r].map(S => S.map(g => [g.doc, g.here, g.bridges, g.pulled, BWAY.name(g.doc)])));
    if (sig !== E.sig) { E.sig = sig; E.hov = null; E.svg.replaceChildren(); E.l.replaceChildren(...G.l.map(g => BWAY.mk(P, 'l', g))); E.r.replaceChildren(...G.r.map(g => BWAY.mk(P, 'r', g))); }
    else { [...E.l.children].forEach((el, i) => { el._g = G.l[i]; }); [...E.r.children].forEach((el, i) => { el._g = G.r[i]; }); }
    BWAY.measure(P); BWAY.place(P);
  },
  mk(P, side, g) {
    const n = g.bridges + g.pulled, name = BWAY.name(g.doc), bits = [g.bridges ? plural(g.bridges, 'bridge') : '', g.pulled ? g.pulled + ' pulled in' : ''].filter(Boolean).join(' · ');
    const say = side === 'l' ? '“' + name + '”: ' + bits + ' in this note come' + (n === 1 ? 's' : '') + ' from it' : '“' + name + '”: ' + plural(n, 'component') + ' of this note ' + (n === 1 ? 'is' : 'are') + ' there';
    const el = h('button.bw-mk.nopan' + (g.bridges ? '' : '.pulled'), { type: 'button', 'data-doc': g.doc, 'aria-label': say + '. Click to go there, Alt+click to open it beside, right-click to choose the bridge.' },
      h('span.bw-car', { html: BWAY.I.car }), h('span.bw-ring', { html: BWAY.I.arrow }), n > 1 ? h('span.bw-n', String(n)) : null,
      h('span.bw-lbl', h('b', snippet(name, 44)), h('span', bits + (side === 'l' ? ' from it' : ' there'))));
    el._g = g; el._side = side; el._P = P;
    let pt = 'mouse';
    el.addEventListener('pointerdown', e => { pt = e.pointerType; e.stopPropagation(); });
    el.addEventListener('mouseenter', () => BWAY.hover(el, true)); el.addEventListener('mouseleave', () => BWAY.hover(el, false));
    el.addEventListener('focus', () => BWAY.hover(el, true)); el.addEventListener('blur', () => { el.classList.remove('open'); BWAY.hover(el, false); });
    el.addEventListener('click', e => {
      e.stopPropagation();
      if (pt === 'touch' && !el.classList.contains('open')) { $$('.bw-mk.open').forEach(x => x.classList.remove('open')); el.classList.add('open'); BWAY.hover(el, true); return; }   // the first tap shows
      const land = el._g.items.map(i => i.there).find(id => id && M.block(id));
      BWAY.go(P.docId, el._g.doc, side, land || null, e, el);
    });
    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); BWAY.menu(el, e); });
    el.addEventListener('dblclick', e => e.stopPropagation());
    return el;
  },
  /** Where its components are on the paper (world): read when the note is drawn or a component moves, not on every pan. */
  measure(P) {
    const E = P && P.paper && P.paper._bw; if (!E) return; E.rects = new Map();
    [...E.l.children, ...E.r.children].forEach(el => (el._g ? el._g.here : []).forEach(id => { if (!E.rects.has(id)) { const r = P.rectOf(id); if (r) E.rects.set(id, r); } }));
  },
  /** Level with their components, on every view change. */
  place(P) {
    const pa = P && P.paper, E = pa && pa._bw; if (!E || !E.l.isConnected) return;
    const H = pa.el.clientHeight, v = pa.view, beads = BWAY.beads(), top = BWAY.TOP, bot = BWAY.BOTTOM, G = BWAY.GAP;
    pa.el.classList.toggle('bw-beads', beads);
    [E.l, E.r].forEach(side => {
      const items = [...side.children].map(el => {
        const ys = (el._g ? el._g.here : []).map(id => E.rects.get(id)).filter(Boolean).map(r => v.y + (r.y + 15) * v.z), vis = ys.filter(y => y > 6 && y < H - 6);
        let want, off = null;
        if (vis.length) want = Math.min(...vis);
        else if (ys.length) { const up = ys.filter(y => y <= 6), dn = ys.filter(y => y >= H - 6); if (up.length && (!dn.length || -Math.max(...up) < Math.min(...dn) - H)) { want = top; off = 'up'; } else { want = H - bot; off = 'down'; } }
        else { want = H / 2; off = 'none'; }
        return { el, want, off };
      }).sort((a, b) => a.want - b.want);
      let prev = -1e9; items.forEach(it => { it.y = Math.max(it.want, top, prev + G); prev = it.y; });
      let next = 1e9; for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; it.y = Math.min(it.y, H - bot, next - G); next = it.y; }
      items.forEach(it => { it.el.style.setProperty('--y', Math.round(it.y) + 'px'); it.el._y = it.y; it.el.classList.toggle('up', it.off === 'up'); it.el.classList.toggle('down', it.off === 'down'); });
    });
    if (E.hov) BWAY.threads(P, false);
  },
  placeAll() { App.panes().forEach(P => BWAY.place(P)); },
  hover(el, on) {
    const P = el._P, E = P && P.paper && P.paper._bw; if (!E) return;
    $$('.box.bw-lit', P.paper.world).forEach(b => b.classList.remove('bw-lit'));
    if (!on) { if (E.hov === el) { E.hov = null; E.svg.replaceChildren(); } return; }
    E.hov = el; BWAY.threads(P, true);
  },
  /** A thread from the pointed circle to each of its components in view. */
  threads(P, fresh) {
    const pa = P.paper, E = pa._bw, el = E.hov; if (!el || !el.isConnected) { E.svg.replaceChildren(); return; }
    const v = pa.view, W = pa.el.clientWidth, H = pa.el.clientHeight, side = el._side, dir = side === 'l' ? 1 : -1, beads = pa.el.classList.contains('bw-beads');
    const band = clamp(W * .05, 44, 80), mx = beads ? (side === 'l' ? band / 2 : W - band / 2) : (side === 'l' ? 17 : W - 17), my = el._y || 0, r = beads ? 13 : 16, out = [];
    (el._g ? el._g.here : []).forEach(id => {
      const q = E.rects.get(id); if (!q) return; const ty = v.y + (q.y + 15) * v.z; if (ty < 4 || ty > H - 4) return;
      const tx = side === 'l' ? v.x + q.x * v.z - 3 : v.x + (q.x + q.w) * v.z + 3, sx = mx + dir * (r + 2), dx = Math.max(24, Math.abs(tx - sx) * .45);
      out.push({ d: `M${sx},${my} C${sx + dir * dx},${my} ${tx - dir * dx},${ty} ${tx},${ty}`, tx, ty });
      const bx = $(`.box[data-id="${id}"]`, pa.world); if (bx) bx.classList.add('bw-lit');
    });
    if (fresh || E.svg.childElementCount !== out.length * 2) {
      E.svg.replaceChildren(...out.flatMap(p => { const pth = SV('path', { d: p.d, pathLength: '1' }); if (!RM()) pth.style.strokeDashoffset = '1'; return [pth, SV('circle', { cx: p.tx, cy: p.ty, r: '2.6' })]; }));
      if (!RM()) requestAnimationFrame(() => requestAnimationFrame(() => $$('path', E.svg).forEach(p => { p.style.strokeDashoffset = '0'; })));
    } else out.forEach((p, i) => { E.svg.children[i * 2].setAttribute('d', p.d); E.svg.children[i * 2 + 1].setAttribute('cx', p.tx); E.svg.children[i * 2 + 1].setAttribute('cy', p.ty); });
  },
  /** Right-click: each bridge with its why; pick where to land. */
  menu(el, e) {
    const g = el._g, P = el._P, side = el._side, name = BWAY.name(g.doc);
    ctxMenu(e.clientX, e.clientY + 8, [{ head: (side === 'l' ? 'From “' : 'To “') + snippet(name, 40) + '”' },
      ...g.items.filter(i => i.there && M.block(i.there)).map(i => ({ label: i.label + (i.pulled ? ' · pulled in' : ''), sub: i.why ? '“' + snippet(i.why, 70) + '”' : i.pulled ? 'a structure pulled in' : 'no why yet', run: ev => BWAY.go(P.docId, g.doc, side, i.there, ev, el) })),
      'sep', { label: 'Open it beside this note', sub: 'side by side', run: () => BWAY.go(P.docId, g.doc, side, (g.items.find(i => i.there && M.block(i.there)) || {}).there || null, { altKey: true }, el) }]);
  },

  /* ---------------- crossing ---------------- */
  /** A move from note `from` to note `to` along a bridge (via 'l': to where it came from, 'r': to where it went, 'bar'): counted, and the bar follows, once the note is on screen. */
  arm(from, to, via) {
    if (!from || !to || from === to) return; BWAY.token = { from, to, via: via || 'r', t: Date.now() };
    setTimeout(() => { const k = BWAY.token; if (k && k.to === to && App.panes().some(p => p.docId === to)) BWAY.route(); }, 700);   // already open in a pane: no new drawing
  },
  /** Cross: land on component `land` (else the note), in this pane in a split, beside with Alt. */
  go(from, to, via, land, e, el) {
    BWAY.arm(from, to, via);
    if (e && e.altKey) return App.openSide(land || to, el || null, !land);
    if (el && App.route.name === 'split') return App.replacePane(land || to, el, !land);
    if (land) App.openBlock(land); else App.go('#/doc/' + to);
  },
  /** After every drawing of the page: what the bar shows. Out of the notes it closes; the trail stays for Alt+← / Alt+→. */
  route() {
    const ids = App.panes().map(p => p.docId).filter(BWAY.alive), now = Date.now(), tk = BWAY.token;
    if (!ids.length) { BWAY.token = null; BWAY.step = null; return BWAY.show(false); }
    if (tk && now - tk.t < 6000 && ids.includes(tk.to)) {
      BWAY.token = null; BWAY.count(tk.from, tk.to);
      const c = BWAY.trail[BWAY.at]; if (!c || c.id !== tk.from) { BWAY.trail = [{ id: tk.from }]; BWAY.at = 0; }   // from a note off the trail: a new one
      BWAY.trail = BWAY.trail.slice(0, BWAY.at + 1); BWAY.trail.push({ id: tk.to, via: tk.via, fresh: true });
      if (BWAY.trail.length > BWAY.TRAIL) BWAY.trail.shift(); BWAY.at = BWAY.trail.length - 1;
      BWAY.arrived(tk); return BWAY.show(true, tk.to, true);
    }
    if (tk && now - tk.t >= 6000) BWAY.token = null;
    const st = BWAY.step; BWAY.step = null;
    if (st && ids.includes(st.to) && BWAY.trail[st.at] && BWAY.trail[st.at].id === st.to) { BWAY.at = st.at; return BWAY.show(true, st.to, true); }   // ‹ › or a stop on the bar
    const j = BWAY.trail.findIndex(t => ids.includes(t.id));
    if (now - BWAY.hist < 3000) { BWAY.hist = 0; if (j >= 0) { const k = BWAY.trail.findIndex(t => t.id === ids[0]); BWAY.at = k >= 0 ? k : j; return BWAY.show(true, BWAY.trail[BWAY.at].id, true); } }   // Alt+← / Alt+→ back to the trail
    if (BWAY.shown && BWAY.cur && ids.includes(BWAY.cur)) return BWAY.show(true, BWAY.cur, BWAY.withTrail);   // the same note, drawn again
    const main = ids[0];
    if (BWAY.top().some(k => k.split('|').includes(main))) { const k = BWAY.trail.findIndex(t => t.id === main); if (k >= 0) BWAY.at = k; return BWAY.show(true, main, k >= 0); }
    BWAY.show(false);
  },
  /** Landed: the note slides in from the side it was crossed to; the circle back ripples once. */
  arrived(tk) {
    if (RM()) return;
    requestAnimationFrame(() => {
      const P = App.panes().find(p => p.docId === tk.to); if (!P || !P.host) return;
      P.host.classList.remove('bw-from-l', 'bw-from-r'); void P.host.offsetWidth; P.host.classList.add(tk.via === 'l' ? 'bw-from-l' : 'bw-from-r');
      setTimeout(() => P.host && P.host.classList.remove('bw-from-l', 'bw-from-r'), 400);
      setTimeout(() => { const m = P.paper && $(`.bw-mk[data-doc="${tk.from}"]`, P.paper.el); if (m) { m.classList.add('bw-rip'); setTimeout(() => m.classList.remove('bw-rip'), 1000); } }, 120);
    });
  },

  /* ---------------- the bar ---------------- */
  show(on, cur, withTrail) {
    on = !!on && BWAY.on() && !BWAY.shut();
    const was = BWAY.shown; BWAY.shown = on; if (on) { BWAY.cur = cur; BWAY.withTrail = !!withTrail; }
    let w = $('#bwbar');
    if (!w) { const tabs = $('#tabs'); if (!tabs || !on) return; w = h('div#bwbar.bw-bar', h('div.bw-clip', h('nav.bw-in', { 'aria-label': 'Bridges' }))); tabs.after(w);
      w.addEventListener('transitionend', e => { if (e.target === w) BWAY.placeAll(); }); }
    if (on) { const sig = JSON.stringify([cur, BWAY.withTrail, BWAY.at, BWAY.trail.map(t => t.id + (t.via || '') + (t.fresh ? '*' : '')), BWAY.top(), BWAY.use().n, BWAY.bumped, BWAY.trail.map(t => BWAY.name(t.id))]);
      if (sig !== BWAY.sig || !w.classList.contains('on')) { BWAY.sig = sig; BWAY.paint(); } }   // changed() draws the page after every edit: the bar only when it shows something else
    w.classList.toggle('on', on);
    if (was !== on && RM()) BWAY.placeAll();
    BWAY.bumped = null;
  },
  paint() {
    const w = $('#bwbar'); if (!w) return; const box = $('.bw-in', w), cur = BWAY.cur, T = BWAY.withTrail ? BWAY.trail : [];
    const trail = h('div.bw-trail');
    T.forEach((t, i) => {
      if (i) trail.append(h('span.bw-hop' + (t.via === 'l' ? '.back' : ''), { title: t.via === 'l' ? 'went back to where it came from' : t.via === 'bar' ? 'from the bar' : 'followed a bridge out' }, h('span', { html: t.via === 'bar' ? BWAY.I.bridge : BWAY.I.arrow })));
      const here = i === BWAY.at;
      trail.append(h('button.bw-st' + (here ? '.cur' : '') + (i > BWAY.at ? '.ahead' : '') + (t.fresh && here ? '.new' : ''), { type: 'button', title: BWAY.name(t.id), 'aria-current': here ? 'page' : null,
        on: { click: () => { if (!here) BWAY.walkTo(i); } } }, h('i'), snippet(BWAY.name(t.id), 30)));
      t.fresh = false;
    });
    const u = BWAY.use(), tops = BWAY.top().map(k => {
      const [a, b] = k.split('|'), inIt = cur === a || cur === b, other = cur === a ? b : a;
      const btn = id => h('button' + (id === cur ? '.here' : ''), { type: 'button', title: id === cur ? 'You are here' : 'Go to “' + BWAY.name(id) + '”', on: { click: () => BWAY.pair(a, b, id) } }, snippet(BWAY.name(id), 22));
      return h('span.bw-p' + (k === BWAY.bumped ? '.bump' : ''), { title: '“' + BWAY.name(a) + '” ⇄ “' + BWAY.name(b) + '” · ' + plural(u.n[k], 'crossing') + ' since ' + fmtDay(parseDay(u.since)) },
        inIt ? [h('span.bw-x', '⇄'), btn(other)] : [btn(a), h('span.bw-x', '⇄'), btn(b)], h('span.bw-c', String(u.n[k])));
    });
    box.replaceChildren(
      h('span.bw-k', { html: BWAY.I.bridge + '<span>Bridges</span>' }),
      T.length > 1 ? h('span.bw-nav', h('button', { type: 'button', title: 'Back along the trail', 'aria-label': 'Back along the trail', disabled: BWAY.at <= 0, html: BWAY.I.prev, on: { click: () => BWAY.walkTo(BWAY.at - 1) } }),
        h('button', { type: 'button', title: 'Forward along the trail', 'aria-label': 'Forward along the trail', disabled: BWAY.at >= T.length - 1, html: BWAY.I.next, on: { click: () => BWAY.walkTo(BWAY.at + 1) } })) : null,
      T.length > 1 ? trail : h('div.bw-trail'),
      tops.length ? h('div.bw-top', h('span.bw-tk', 'Most used'), tops) : null,
      h('button.bw-close', { type: 'button', title: 'Close the bar until tomorrow (Settings → Structures → Bridges turns it off)', 'aria-label': 'Close the bridge bar until tomorrow', html: BWAY.I.x, on: { click: () => BWAY.close() } }));
    requestAnimationFrame(() => { const c = $('.bw-st.cur', trail); if (c && trail.scrollWidth > trail.clientWidth) trail.scrollLeft = c.offsetLeft - trail.clientWidth + c.offsetWidth + 24; });
  },
  walkTo(i) { const t = BWAY.trail[i]; if (!t || !BWAY.alive(t.id)) return; BWAY.step = { to: t.id, at: i }; App.go('#/doc/' + t.id); },
  /** A pair on the bar: from one of its notes, a crossing to the other; from neither, just a way there. */
  pair(a, b, id) {
    if (id === BWAY.cur) return; const other = id === a ? b : a, here = App.panes().map(p => p.docId);
    if (here.includes(other)) { const g = BWAY.groups(other), x = [...g.l, ...g.r].find(y => y.doc === id), land = x && x.items.map(i => i.there).find(t => t && M.block(t));
      return BWAY.go(other, id, 'bar', land || null, null, null); }
    App.go('#/doc/' + id);
  },
  close() { saveSettings({ bridgeBarShut: localDate(new Date()) }); BWAY.show(false); toast('The bridge bar is closed until tomorrow. Settings → Structures → Bridges turns it off for good', 5000); },
};
{
  // the circles follow the paper, and are drawn with the note (every pane: they share DocView's methods)
  const ap = Paper.prototype.apply; Paper.prototype.apply = function () { ap.apply(this, arguments); if (this._bw) try { BWAY.place(this._bw.P); } catch (e) { } };
  const fl = DocView.fill; DocView.fill = function () { const r = fl.apply(this, arguments); try { BWAY.build(this); } catch (e) { console.warn('[bridgeway]', e); } return r; };
  const dw = DocView.drawWires; DocView.drawWires = function () { const r = dw.apply(this, arguments); try { if (this.paper && this.paper._bw) { BWAY.measure(this); BWAY.place(this); } } catch (e) { } return r; };
  // the bar follows the page; Alt+← / Alt+→ bring it back to the trail
  const rf = App.refresh; App.refresh = function () { const r = rf.apply(this, arguments); try { BWAY.route(); } catch (e) { console.warn('[bridgeway]', e); } return r; };
  const hg = HIST.go; HIST.go = function () { BWAY.hist = Date.now(); return hg.apply(this, arguments); };
  // half-moons, or beads in full screen
  const full = debounce(() => BWAY.placeAll(), 120);
  document.addEventListener('fullscreenchange', full); addEventListener('resize', full);
  document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('.bw-mk')) $$('.bw-mk.open').forEach(x => { x.classList.remove('open'); BWAY.hover(x, false); }); }, true);
}
