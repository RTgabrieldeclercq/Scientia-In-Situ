/* ==========================================================================
   13zzzc · A paper or page read beside becomes a popup window (V4.32 —
   Gabe: "Each one of these read beside now gains the option to become a
   popup that is a new window within SiS that can be moved freely (via
   dragging from four anchor points in the middle of each rectangle line),
   resized freely (via corners). These buttons only appear when the cursor
   is on the border of the popup. The popup does not have any buttons
   otherwise. If it just a rounded-rectangle blending in, but with a minor
   shadow or display to show it is superposed on top of the SiS. If you're
   in the popup space, scrolling scrolls through it, panning pans through
   it, clicking and dragging through text selects it, interacting with an
   HTML interacts with it, etc… Holding your mouse still for two seconds
   within the popup space brings up a minimal interface with buttons for
   fitting the content to the popup window (horizontal only) along with
   +/- zoom buttons, maximize, which goes back to your previous read beside
   or maximize position before the popup was triggered.")
   • ⧉ on each pane's bar (beside or full screen) and "⧉ Popup" on the
     maximised view: the file leaves where it was and opens as a popup — a
     window in the app, over everything, the note usable around it. One per
     paper or page; ⧉ again on one already out brings it to the front.
   • At rest: a rounded rectangle with a light shadow, no buttons. Rest on
     its border (a band as wide as Settings says, mostly outside it) and
     four move anchors (the middle of each side) and four corners show;
     they can be grabbed before they show (the cursor says so). A drag on
     an anchor moves it, on a corner resizes it (260 × 180 at least), kept
     on the screen. On a tablet a tap on the border shows them, and the
     bar below, for a while.
   • Inside it is the reader's pane itself (RDOCK's drawing, MXHL's
     highlights, the pen, the scissors if they were on, the page's own
     script): wheel, pan, select, highlight, click in a page.
   • Hold the pointer still in it (2 s, Settings): a small bar — Fit (its
     width to the popup), − % +, Maximize: back where it was before, its
     pane beside the note (tab, side, split, full screen) or the maximised
     view, at the same page. Leaving the popup hides the bar.
   • Clicking one brings it to the front. Places and sizes are kept per
     paper or page on this device (a new one takes the last used); open
     popups stay from note to note, step aside on pages that aren't notes
     and come back with the next note, and after a reload (_ls 'rpop').
   A popup is a pane object like RDOCK's (p.i = -1, p.pop): RDOCK.draw,
   RDOCK.zoom, RVIEW.fit work on it, RDOCK.paneOf / has count it (so its
   card says it is in a popup and quotes go to it).
   ========================================================================== */
const RPOP = {
  list: [], Z: 1215, MINW: 260, MINH: 180,
  ICON: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>',
  MAX: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>',
  on: () => RDOCK.ftOn('rpop'),
  tn: (k, d) => RDOCK.tn('rpop', k, d),
  still: () => clamp(+RPOP.tn('still', '2000') || 2000, 300, 10000),
  reach: () => clamp(+RPOP.tn('reach', '14') || 14, 4, 40),
  reveal: () => clamp(+RPOP.tn('reveal', '1000') || 0, 0, 3000),
  of: id => RPOP.list.find(p => p.id === id) || null,
  ofEl: el => RPOP.list.find(p => p.el && p.el.contains(el)) || null,
  /* ---------- kept on this device ---------- */
  store() { let v = null; try { v = _ls.get('rpop', null); } catch (e) { } v = v && typeof v === 'object' ? v : {}; v.geo = v.geo || {}; v.open = Array.isArray(v.open) ? v.open : []; return v; },
  persist() {
    const st = RPOP.store(); st.open = RPOP.list.map(p => ({ id: p.id, from: p.pop.from, zoom: p.zoom, fit: !!p.fit, at: p.kind === 'pdf' ? RDOCK.where(p) || p.pop.at || null : null, hs: (RVIEW.frame(p) || {})._rv || p.pop.hs || null }));
    RPOP.list.forEach(p => { if (p.geo) { st.geo[p.id] = p.geo; st.last = p.geo; } }); const ks = Object.keys(st.geo); if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(k => delete st.geo[k]);
    _ls.set('rpop', st);
  },
  /* ---------- a popup: a pane without the reader ---------- */
  make(b, st) {
    const p = { i: -1, id: b.id, docId: b.docId, kind: b.kind, side: 'pop', zoom: st.zoom || 1, fit: st.fit !== false, full: false, hover: false, pop: st };
    const btn = (cls, title, fn, inner) => h('button.rp-b' + cls, { type: 'button', title, on: { click: e => { e.stopPropagation(); fn(); RPOP.persist(); } } }, inner);
    p.pg = h('span.rd-pg'); p.hl = h('button.btn.xs'); p.fs = h('button.btn.xs');
    p.zl = h('span.rp-z.mono', { title: 'The zoom' }, '…');
    p.fitB = btn('.rp-fit', 'Fit the width to the window', () => RVIEW.fit(p), 'Fit');
    p.ui = h('div.rp-ui', { role: 'toolbar', 'aria-label': 'Popup' }, p.fitB, btn('', 'Smaller', () => RDOCK.zoom(-1, true, p), '−'), p.zl, btn('', 'Larger', () => RDOCK.zoom(1, true, p), '+'),
      h('button.rp-b.rp-max', { type: 'button', title: st.from && st.from.k === 'max' ? 'Maximize — back to the maximised view' : 'Maximize — back beside the note, where it was', 'aria-label': 'Maximize', html: RPOP.MAX, on: { click: e => { e.stopPropagation(); RPOP.max(p); } } }));
    p.ov = h('div.embed-max.dk-max.rd-dock.rd-docked.rp-ov', { 'data-pane': 'pop' }, h('div.em-bar.rd-bar.rp-bar', h('b.rd-ttl', b.label || ''), p.pg, p.hl, p.fs), h('div.dk-maxc'));
    MXHL.open(p.ov, b.id);
    p.ov.addEventListener('wheel', e => RDOCK.wheel(e, p), { passive: false });
    p.ov.addEventListener('scroll', () => { RDOCK.onScroll(p); clearTimeout(p._ps); p._ps = setTimeout(RPOP.persist, 900); }, true);
    return p;
  },
  /** Where a new popup goes: its own place, else the last used (moved along if another sits there), else the right of the window. */
  place(id) {
    const st = RPOP.store(), W = innerWidth, H = innerHeight; let g = st.geo[id];
    if (!g) { const l = st.last; g = l ? Object.assign({}, l) : { w: Math.round(Math.min(600, W * .42)), h: Math.round(Math.min(H * .74, 760)) }; if (!l) { g.x = W - g.w - 36; g.y = Math.min(96, H * .1); }
      for (let k = 0; k < 8 && RPOP.list.some(q => q.geo && Math.abs(q.geo.x - g.x) < 12 && Math.abs(q.geo.y - g.y) < 12); k++) { g.x -= 28; g.y += 28; } }
    return RPOP.fit(Object.assign({}, g));
  },
  /** Kept on the screen, never smaller than the minimum. */
  fit(g) { const W = innerWidth, H = innerHeight; g.w = clamp(Math.round(+g.w || 480), Math.min(RPOP.MINW, W), W); g.h = clamp(Math.round(+g.h || 400), Math.min(RPOP.MINH, H), H); g.x = clamp(Math.round(+g.x || 0), 0, W - g.w); g.y = clamp(Math.round(+g.y || 0), 0, H - g.h); return g; },
  geo(p, g) { p.geo = RPOP.fit(g); Object.assign(p.el.style, { left: p.geo.x + 'px', top: p.geo.y + 'px', width: p.geo.w + 'px', height: p.geo.h + 'px' }); },
  /** The window around the pane: the body (the pane, the bar that shows when still), the border's band, the anchors and corners. */
  mount(p) {
    const strip = k => h('div.rp-rim.rp-rim-' + k), mv = k => h('div.rp-mv', { 'data-e': k, title: 'Drag to move' }), rz = k => h('div.rp-rz', { 'data-c': k, title: 'Drag to resize' });
    const body = h('div.rp-body', p.ov, p.ui);
    p.el = h('div.rp-pop', { 'data-id': p.id, role: 'dialog', 'aria-label': (M.block(p.id) || {}).label || 'Popup', style: { '--rp-reach': RPOP.reach() + 'px' } }, body, strip('n'), strip('e'), strip('s'), strip('w'), mv('n'), mv('e'), mv('s'), mv('w'), rz('nw'), rz('ne'), rz('sw'), rz('se'));
    document.body.append(p.el); RPOP.geo(p, RPOP.place(p.id)); RPOP.wire(p, body); RPOP.front(p); RPOP.sync();
  },
  wire(p, body) {
    const el = p.el, edge = $$(':scope > .rp-rim, :scope > .rp-mv, :scope > .rp-rz', el);
    // the border: the anchors and corners show after a rest on it (a tap, on a tablet)
    edge.forEach(x => { x.addEventListener('pointerenter', e => RPOP.edgeIn(p, e)); x.addEventListener('pointerleave', () => RPOP.edgeOut(p));
      x.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { RPOP.edgeShow(p, 4000); RPOP.ui(p, true); clearTimeout(p._uh); p._uh = setTimeout(() => { if (!p.el || !p.el.matches(':hover')) RPOP.ui(p, false); }, 4000); } }); });   // a tablet has no hover: a tap on the border shows the anchors and the bar
    $$(':scope > .rp-mv', el).forEach(x => x.addEventListener('pointerdown', e => RPOP.drag(p, e, 'move')));
    $$(':scope > .rp-rz', el).forEach(x => x.addEventListener('pointerdown', e => RPOP.drag(p, e, x.dataset.c)));
    // the bar, after holding still inside
    body.addEventListener('pointermove', e => RPOP.moved(p, e));
    body.addEventListener('pointerenter', () => clearTimeout(p._lt));
    body.addEventListener('pointerleave', () => { clearTimeout(p._it); clearTimeout(p._lt); p._lt = setTimeout(() => RPOP.ui(p, false), 260); });
    body.addEventListener('wheel', () => { if (!p._uiOn) RPOP.moved(p); }, { passive: true });
    body.addEventListener('pointerdown', e => { if (!e.target.closest('.rp-ui') && !p._uiOn) clearTimeout(p._it); });
    p.ov.addEventListener('pointerenter', () => { p.hover = true; }); p.ov.addEventListener('pointerleave', () => { p.hover = false; });
    // a click on one brings it to the front
    el.addEventListener('pointerdown', () => RPOP.front(p), true);
  },
  edgeIn(p, e) { clearTimeout(p._eh); if (p.el.classList.contains('rp-edge')) return; if (e && e.pointerType === 'touch') return; clearTimeout(p._et); const d = RPOP.reveal(); if (!d) return p.el.classList.add('rp-edge'); p._et = setTimeout(() => p.el.classList.add('rp-edge'), d); },
  edgeOut(p) { clearTimeout(p._et); clearTimeout(p._eh); p._eh = setTimeout(() => { if (!p._drag) p.el.classList.remove('rp-edge'); }, 350); },
  edgeShow(p, ms) { clearTimeout(p._et); clearTimeout(p._eh); p.el.classList.add('rp-edge'); p._eh = setTimeout(() => { if (!p._drag) p.el.classList.remove('rp-edge'); }, ms); },
  moved(p, e) {
    if (p._drag) return; if (e && e.buttons) { clearTimeout(p._it); return; } clearTimeout(p._lt);
    if (p._uiOn) return; clearTimeout(p._it); p._it = setTimeout(() => RPOP.ui(p, true), RPOP.still());
  },
  ui(p, on) { p._uiOn = !!on; if (p.el) p.el.classList.toggle('rp-ui-on', !!on); if (on) RVIEW.mark(p); },
  /** A drag on an anchor (move) or a corner (nw · ne · sw · se: resize). */
  drag(p, e, how) {
    if (e.button != null && e.button !== 0) return; e.preventDefault(); e.stopPropagation();
    const g0 = Object.assign({}, p.geo), x0 = e.clientX, y0 = e.clientY, tg = e.currentTarget; p._drag = how; p.el.classList.add('rp-edge', 'rp-dragging'); document.body.classList.add('rp-drag'); RPOP.ui(p, false); clearTimeout(p._it);
    try { tg.setPointerCapture(e.pointerId); } catch (er) { }
    const W = innerWidth, H = innerHeight, mn = Math.min(RPOP.MINW, W), mh = Math.min(RPOP.MINH, H);
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; const dx = ev.clientX - x0, dy = ev.clientY - y0, g = Object.assign({}, g0);
      if (how === 'move') { g.x = g0.x + dx; g.y = g0.y + dy; }
      else { if (/w/.test(how)) { const x = clamp(g0.x + dx, 0, g0.x + g0.w - mn); g.w = g0.w + (g0.x - x); g.x = x; } if (/e/.test(how)) g.w = clamp(g0.w + dx, mn, W - g0.x);
        if (/n/.test(how)) { const y = clamp(g0.y + dy, 0, g0.y + g0.h - mh); g.h = g0.h + (g0.y - y); g.y = y; } if (/s/.test(how)) g.h = clamp(g0.h + dy, mh, H - g0.y); }
      RPOP.geo(p, g); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      p._drag = null; p.el.classList.remove('rp-dragging'); document.body.classList.remove('rp-drag'); RPOP.edgeOut(p); if (how !== 'move') RVIEW.resized(p); RPOP.persist(); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  },
  front(p) { const i = RPOP.list.indexOf(p); if (i < 0) return; if (i !== RPOP.list.length - 1) { RPOP.list.splice(i, 1); RPOP.list.push(p); } RPOP.list.forEach((q, k) => { if (q.el) q.el.style.zIndex = String(RPOP.Z + k); }); },
  /** Popups belong to notes: they step aside on pages that aren't notes (and on a phone). */
  sync() { const away = !App.panes().length || RDOCK.phone(); RPOP.list.forEach(p => p.el && p.el.classList.toggle('rp-away', away)); },
  /* ---------- in and out ---------- */
  /** Open b as a popup with this state: { from, zoom, fit, at, hs }. */
  open(b, st) {
    if (!b || !RDOCK.live(b.id) || RDOCK.phone()) return null; const was = RPOP.of(b.id); if (was) { RPOP.front(was); return was; }
    const p = RPOP.make(b, st); RPOP.list.push(p); return p;
  },
  show(p, clip) {
    RPOP.mount(p); RDOCK.draw(p); if (p.pop.at) RVIEW.goAt(p, p.pop.at); if (p.pop.hs) { const fr = RVIEW.frame(p); if (fr) fr._rvWant = p.pop.hs; }
    if (clip) setTimeout(() => { try { CLIP.toggle(p.id, true); } catch (e) { } }, 400);
    const b = M.block(p.id); if (b) RDOCK.card(b); setTimeout(() => { try { QUOTE.paintMarks(p.id); App.panes().forEach(CLIP.mark); } catch (e) { } }, 700); RPOP.persist();
  },
  /** ⧉ on a pane: the pane gives the file up (the next tab takes it, or the reader closes) and it opens as a popup at the same page and zoom. */
  fromPane(q) {
    const b = q && M.block(q.id); if (!b || !RPOP.on()) return; const S = RDOCK.S_, fr = RVIEW.frame(q), clip = CLIP.on.has(b.id);
    const p = RPOP.open(b, { from: { k: 'pane', pane: q.i, side: S.side, n: S.n, full: !!q.full }, zoom: q.zoom, fit: RVIEW.isFit(q), at: q.kind === 'pdf' ? RDOCK.where(q) : null, hs: fr && fr._rv ? { x: fr._rv.x, y: fr._rv.y } : null });
    if (!p || p.el) return; RDOCK.closeTab(b.id); RPOP.show(p, clip);
  },
  /** "⧉ Popup" on the maximised view. */
  fromMax(b, ov) {
    if (!b || !RPOP.on()) return; const at = b.kind === 'pdf' ? RDOCK.where({ ov }) : null, fr = $('iframe', ov), clip = CLIP.on.has(b.id);
    const p = RPOP.open(b, { from: { k: 'max' }, zoom: 1, fit: true, at, hs: fr && fr._rv ? { x: fr._rv.x, y: fr._rv.y } : null });
    if (!p || p.el) return; MXHL.close(ov); RPOP.show(p, clip);
  },
  /** Take one down (its card shows the file again unless `quiet`). */
  remove(p, quiet) { const i = RPOP.list.indexOf(p); if (i >= 0) RPOP.list.splice(i, 1); if (p.el) p.el.remove(); p.el = null; if (CLIP.on.has(p.id) && !RDOCK.has(p.id)) CLIP.toggle(p.id, false); RPOP.persist(); if (!quiet) { const b = M.block(p.id); if (b) RDOCK.card(b); } },
  close(id) { const p = RPOP.of(id); if (p) RPOP.remove(p); },
  /** Maximize: back where it was before it became a popup, at the same page and zoom. */
  max(p) {
    const b = M.block(p.id), st = p.pop || {}, from = st.from || { k: 'pane' }, at = p.kind === 'pdf' ? RDOCK.where(p) : null, fr = RVIEW.frame(p), hs = fr && fr._rv ? { x: fr._rv.x, y: fr._rv.y } : null, clip = CLIP.on.has(p.id), fit = RVIEW.isFit(p), zoom = p.zoom;
    RPOP.remove(p, true); if (!b || !RDOCK.live(b.id)) return;
    if (from.k === 'max') {
      if (at && b.view !== 'page') { b.cur = at.p - 1; DOCS.save(b); } RDOCK.card(b);
      if (b.kind === 'pdf') DOCS.max(b); else EMBED.max(b);
      const ov = [...$$('.embed-max:not(.rd-dock)')].pop(), mf = ov && $('iframe', ov); if (mf && hs) mf._rvWant = hs; if (clip) setTimeout(() => CLIP.toggle(b.id, true), 400); return;
    }
    const S = RDOCK.S_; S.fit = S.fit || {}; if (fit) S.fit[b.id] = 1; else { delete S.fit[b.id]; S.zoom[b.id] = zoom || 1; }
    const o = { _rp: 1 }; if (!RDOCK.wrap) { if (from.side) o.side = from.side; } else { if (from.n > S.n && RDOCK.splitOn()) RDOCK.setN(from.n); if (from.pane != null && from.pane >= 0) o.pane = from.pane; }
    RDOCK.open(b, o); const q = RDOCK.paneOf(b.id); if (!q) return;
    if (at) RVIEW.goAt(q, at); if (hs) { const f2 = RVIEW.frame(q); if (f2) f2._rvWant = hs; }
    if (from.full && !q.full) RDOCK.full(q); if (clip) setTimeout(() => CLIP.toggle(b.id, true), 400);
  },
  /** Settings → off: every popup goes back where it came from. */
  dockAll() { RPOP.list.slice().forEach(p => RPOP.max(p)); },
  /** Back after a reload, with the next note. */
  restore() {
    if (RPOP.list.length || RPOP._restored || !RPOP.on() || RDOCK.phone() || !App.panes().length) return; RPOP._restored = true;
    RPOP.store().open.forEach(o => { const b = o && M.block(o.id); if (!b || !RDOCK.live(b.id) || RDOCK.has(b.id)) return; const p = RPOP.open(b, { from: o.from || { k: 'pane' }, zoom: o.zoom || 1, fit: o.fit !== false, at: o.at || null, hs: o.hs || null }); if (p && !p.el) RPOP.show(p, false); });
  },
  /** The pane's bar: ⧉. */
  btn(q) { return h('button.btn.xs.rp-btn', { type: 'button', title: 'Make it a popup window — move and resize it over the note', 'aria-label': 'Popup window', html: RPOP.ICON, on: { click: e => { e.stopPropagation(); RPOP.fromPane(q); } } }); },
  /** In a popup's page: the pointer's moves and presses (asked for only by a popup). */
  SCRIPT: `<script>(function(){var P=parent,on=0,l=0,w=0;addEventListener('message',function(e){var d=e.data||{};if(d.sis!=='rv-ask'||!d.moves||on)return;on=1;
addEventListener('pointermove',function(ev){var n=Date.now();if(n-l>120){l=n;P.postMessage({sis:'rv-move',b:ev.buttons||0},'*');}},true);
addEventListener('pointerdown',function(){P.postMessage({sis:'rv-down'},'*');},true);
addEventListener('wheel',function(){var n=Date.now();if(n-w>250){w=n;P.postMessage({sis:'rv-wheel'},'*');}},{passive:true,capture:true});});})();<\/script>`,
  /* ---------- Settings: the live preview ---------- */
  preview() {
    const r = RPOP.reach(), still = RPOP.still() / 1000, rev = RPOP.reveal() / 1000, on = RPOP.on();
    const pl = () => h('div.pv-page', h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-pl'), h('div.pv-pl.s'));
    const pop = h('div.pv-rp-pop', { style: { '--pr': Math.round(r * .6) + 'px' } }, h('div.pv-rp-rim'), h('div.pv-rp-in', h('div.pv-rp-ui', h('span', 'Fit'), h('span', '−'), h('i', '112%'), h('span', '+'), h('span.pv-rp-mx', { html: RPOP.MAX })), pl()),
      ['n', 'e', 's', 'w'].map(k => h('span.pv-rp-mv', { 'data-e': k })), ['nw', 'ne', 'sw', 'se'].map(k => h('span.pv-rp-rz', { 'data-c': k })));
    return [h('div.pv-rp' + (on ? '' : '.off'), h('div.pv-rp-note', h('div.pv-rd-nt', '30 kPa series'), PV.box({ num: 'Step 2', label: 'Run 3', body: 'The edge collapsed at 10 ng/mL.' }), PV.box({ num: 'Block', label: 'Seeding', body: 'Seed at 40k/cm².' })), on ? pop : null),
      PV.cap(on ? 'As if your pointer rested on its border: the four anchors move it, the four corners resize it (they show after ' + (rev ? rev + ' s' : 'no wait') + ', on a band ' + r + ' px wide). Holding still ' + still + ' s inside shows the bar: Fit, − +, Maximize.' : 'Off: no ⧉, and open popups go back where they came from.')];
  },
};
{
  // a popup counts as showing its file: its card says so, quotes and the citation band go to it
  const po = RDOCK.paneOf; RDOCK.paneOf = id => po(id) || RPOP.of(id);
  // opened beside while it is a popup: the popup comes to the front (Maximize opens it beside)
  const ro = RDOCK.open; RDOCK.open = function (b, o) { const p = b && !(o && o._rp) && RPOP.of(b.id); if (p) { RPOP.sync(); return RPOP.front(p); } return ro.apply(this, arguments); };
  // its card's "Put it back here" (and a file that has gone): the popup closes
  const ct = RDOCK.closeTab; RDOCK.closeTab = function (id) { if (RPOP.of(id) && !RDOCK.S_.tabs.includes(id)) { RPOP.close(id); return; } return ct.apply(this, arguments); };
  // its file is never let go while it shows
  const tr = PDFW.trim; PDFW.trim = function () { const keep = RPOP.list.map(p => (M.block(p.id) || {}).media).filter(m => m && !PDFW.pin[m]); keep.forEach(m => { PDFW.pin[m] = 1; }); try { return tr.apply(this, arguments); } finally { keep.forEach(m => { delete PDFW.pin[m]; }); } };
  // RVIEW (13zzzb) fits, zooms and asks pages in popups too
  const al = RVIEW.all; RVIEW.all = () => al().concat(RPOP.list);
  // ⧉ on each pane's bar, before ⤢
  const bd = RDOCK.build; RDOCK.build = function (i, b) { const p = bd.apply(this, arguments); try { if (p && p.fs && !RDOCK.phone()) p.fs.before(RPOP.btn(p)); } catch (e) { console.warn('[rpop]', e); } return p; };
  // "⧉ Popup" on the maximised view (a PDF, an HTML page), before Close
  const mx = (b, kind) => { if (!b || b.kind !== kind || RDOCK.phone()) return; const ov = [...$$('.embed-max:not(.rd-dock)')].pop(), x = ov && [...$$(':scope > .em-bar button', ov)].find(z => /Close/.test(z.textContent)); if (!x) return;
    x.before(h('button.btn.sm.rp-btn.rp-mxbtn', { type: 'button', title: 'Make it a popup window — move and resize it over the note', on: { click: e => { e.stopPropagation(); RPOP.fromMax(M.block(b.id), ov); } } }, h('span', { html: RPOP.ICON }), 'Popup')); };
  const dm = DOCS.max; DOCS.max = function (b) { const r = dm.apply(this, arguments); try { mx(b, 'pdf'); } catch (e) { } return r; };
  const em = EMBED.max; EMBED.max = function (b) { const r = em.apply(this, arguments); try { mx(b, 'html'); } catch (e) { } return r; };
  // the card while its file is in a popup
  ['pdf', 'html'].forEach(k => { const wb = WIDGETS[k].body; WIDGETS[k].body = function (b) { const el = wb.apply(this, arguments); try { if (el && el.classList && el.classList.contains('rd-away') && RPOP.of(b.id)) { const s = $('.rd-away-in > span:not(.rd-away-ic)', el); if (s) s.textContent = 'In a popup window'; } } catch (e) { } return el; }; });
  // a page in a popup: its pointer's moves (for the bar), a press (to the front); a maximised page's scroll (for its popup)
  QUOTE.more = (more => srcId => (more ? more(srcId) : '') + RPOP.SCRIPT)(QUOTE.more);
  RVIEW.msg.push((d, fr) => {
    if (d.sis === 'rv-hi') { if (RPOP.ofEl(fr)) fr.contentWindow.postMessage({ sis: 'rv-ask', moves: 1 }, '*'); else if (fr.closest('.embed-max:not(.rd-dock)')) fr.contentWindow.postMessage({ sis: 'rv-ask' }, '*'); return; }
    const p = RPOP.ofEl(fr); if (!p) return;
    if (d.sis === 'rv-move') RPOP.moved(p, { buttons: d.b }); else if (d.sis === 'rv-down') { RPOP.front(p); if (!p._uiOn) clearTimeout(p._it); } else if (d.sis === 'rv-wheel') { if (!p._uiOn) RPOP.moved(p); }
  });
  // ← → page the popup under the pointer
  window.addEventListener('keydown', e => {
    if (!RPOP.list.length || $('.ovl') || e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))) return;
    const p = RPOP.list.find(x => x.hover && x.kind === 'pdf'), d = !p ? 0 : e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'PageUp' ? -1 : 0; if (!d) return;
    e.preventDefault(); e.stopPropagation(); RDOCK.step(d, p);
  }, true);
  // from note to note they stay; on other pages they step aside; after a reload they come back with the next note; a file gone takes its popup
  const rr = DocView.render; DocView.render = function () { const r = rr.apply(this, arguments); setTimeout(() => { try { RPOP.restore(); RPOP.sync(); } catch (e) { } }, 0); return r; };
  addEventListener('hashchange', () => setTimeout(() => RPOP.sync(), 0));
  addEventListener('resize', () => RPOP.list.forEach(p => { if (p.el && p.geo) RPOP.geo(p, p.geo); }));
  { const ch = changed; let t = null; changed = function (...a) { const r = ch.apply(this, a); clearTimeout(t); t = setTimeout(() => RPOP.list.slice().forEach(p => { if (!RDOCK.live(p.id)) RPOP.remove(p, true); }), 300); return r; }; }
  addEventListener('pagehide', () => { try { if (RPOP.list.length) RPOP.persist(); } catch (e) { } });
  // switched off (by its switch, a preset or the device's own switches): every popup goes back where it came from
  { const fa = FEAT.apply; FEAT.apply = function () { const r = fa.apply(this, arguments); try { if (RPOP.list.length && !RPOP.on()) setTimeout(() => { if (!RPOP.on()) RPOP.dockAll(); }, 0); } catch (e) { } return r; }; }
  // Settings → Reading & sources → Popup windows
  FEAT.def({ id: 'rpop', group: 'reading', label: 'Popup windows', isNew: true,
    desc: '⧉ on a paper or page read beside a note — or “⧉ Popup” when it is maximised — makes it a popup: a window inside the app, over everything, that you move and resize while the note stays usable around it. At rest it is a rounded rectangle with a light shadow and no buttons. Rest the pointer on its border and four anchors (the middle of each side) and four corners show: drag an anchor to move it, a corner to resize it (on a tablet, tap the border). Inside it works like the reader: scroll, pan, select text, highlight, use the page. Hold the pointer still in it and a small bar shows Fit (its width to the window), − and +, and Maximize, which puts it back where it came from — its pane beside the note, or the maximised view. One popup per paper or page; click one to bring it to the front. Their places and sizes are kept on this device, and they stay from note to note. Off: no ⧉, and open popups go back where they came from.',
    changed: v => { try { if (!v) RPOP.dockAll(); } catch (e) { } },
    tune: [{ key: 'still', label: 'The bar shows after holding the pointer still for', type: 'seg', isNew: true, def: '2000', opts: [['1000', '1 s'], ['2000', '2 s'], ['3000', '3 s']], d: 'Inside the popup; moving away hides it' },
      { key: 'reveal', label: 'The anchors and corners show after resting on the border for', type: 'seg', isNew: true, def: '1000', opts: [['0', 'No wait'], ['500', '0.5 s'], ['1000', '1 s']], d: 'They can be dragged before they show — the pointer changes over them' },
      { key: 'reach', label: 'The border reaches', type: 'seg', isNew: true, def: '14', opts: [['8', 'Narrow'], ['14', 'Medium'], ['22', 'Wide']], d: 'How far around the edge counts as the border', changed: () => { try { RPOP.list.forEach(p => p.el && p.el.style.setProperty('--rp-reach', RPOP.reach() + 'px')); } catch (e) { } } }],
    preview: () => RPOP.preview() });
  RVIEW.late('rpop');
}
