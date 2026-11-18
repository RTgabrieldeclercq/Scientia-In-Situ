/* ==========================================================================
   13zzzb · Read beside: Fit, zoom and 100%; full screen from where it is,
   and back; in the note and back (V4.31 — Gabe: "When you maximize a PDF
   or HTML from the beside view and close it, it goes back in the beside
   view rather than fully closing it from the tab set." · "Read beside for
   HTMLs, PDFs, etc… gains a Fit feature along with manual zooms and
   resetting to 100%. It also gains the option to go full screen from where
   it is at, while being able to go back and forth between beside, and in
   the note based on the note selected for where it is related/mentioned.")
   What it adds to the reader beside a note (13zzb RDOCK), from outside:
   • The zoom is the page's own size: 100% is a PDF page as wide as it is in
     points (the lab's paper reader counts it the same way), so a zoom keeps
     its size whatever the pane does. Each pane's bar: − 100% + Fit — the %
     goes back to 100% when clicked; Fit puts the page's width to the pane
     and keeps it fitted as the pane changes size (split, ⇄, the window,
     full screen) until you zoom by hand. HTML pages and saved websites get
     the same (the page scaled; Fit makes a page wider than the pane fit).
     Kept per tab, as before (RDOCK.S_.zoom, and S.fit beside it).
   • ⤢ full screen keeps the page, the place in it and the zoom (before, a
     zoom grew with the wider column); Close in full screen brings it back
     beside — the tab stays in the set (Settings can make it close the tab).
   • In a note (the arrow into a box): the notes the file is embedded in —
     its own card first — and those that mention it (17e Cited in). Pick an
     embed: the file leaves the reader and the note shows it in its card, at
     the page you were on; "◧ Back beside" on that card puts it back in the
     pane and side it came from, at its zoom and place (kept on this device,
     _ls 'rview:came'). A mention: the note goes there, the reader stays.
   • HTML pages report their scroll and width to the app (a small script in
     their copy, after 13zze's and 13zzm's), so a page that moves keeps its
     place.
   The one hook in 13zzb: RDOCK.rel(p), the share of the width a pane's PDF
   is drawn at (read when its pages are laid out).
   ========================================================================== */
const RVIEW = {
  ZOOMS: [.5, .6, .75, .9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3],
  IN: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25"/></svg>',
  pw: new Map(), want: {},
  on: () => RDOCK.ftOn('rview'),
  tn: (k, d) => RDOCK.tn('rview', k, d),
  /** Every pane that shows a file: the reader's (13zzzc adds the popups). */
  all: () => RDOCK.panes.filter(Boolean),
  ofFrame: fr => RVIEW.all().find(p => p.ov && p.ov.contains(fr)) || null,
  frame: p => p && p.ov && $('.dk-maxc > iframe', p.ov),
  /* ---------- the zoom: the page's own size, or fitted ---------- */
  isFit(p) { if (!p || !RVIEW.on()) return false; if (p.fit == null) { const S = RDOCK.S_; p.fit = !!(S.fit && S.fit[p.id]); } return !!p.fit; },
  pwOf(p) { const b = p && M.block(p.id); return (b && RVIEW.pw.get(b.media)) || 0; },
  /** A PDF's page width at 100%: its first page, in points. */
  loadPw(p) {
    const b = M.block(p.id), m = b && MEDIA.get(b.media); if (!m) return Promise.reject(new Error('no file')); if (RVIEW.pw.get(m.id)) return Promise.resolve(RVIEW.pw.get(m.id));
    return PDFW.load(m).then(pdf => pdf.getPage(1)).then(pg => { const v = pg.getViewport({ scale: 1 }); RVIEW.pw.set(m.id, v.width); if (!PDFW.aspect.has(m.id)) PDFW.aspect.set(m.id, v.height / v.width); return v.width; });
  },
  /** The width a pane's page fills: its stage's, less the sides (as PDFW.full counts it). */
  room(p) { const s = RDOCK.stage(p); return s ? Math.max(200, s.clientWidth - 16) : 0; },
  /** The zoom shown (1 = 100%); fitted, what fills the pane (0 while a PDF's size is still being read). */
  abs(p) {
    if (p.kind === 'html') return RVIEW.isFit(p) ? RVIEW.hfit(p) : (p.zoom || 1);
    if (!RVIEW.isFit(p)) return p.zoom || 1; const w = RVIEW.room(p), pw = RVIEW.pwOf(p); return w && pw ? w / pw : 0;
  },
  /** RDOCK.rel: fitted, the stage's width; else the page's own size times the zoom. Off: the zoom is a share of the width, as before. */
  rel(p) { if (!RVIEW.on()) return p.zoom || 1; if (RVIEW.isFit(p)) return 1; const w = RVIEW.room(p), pw = RVIEW.pwOf(p); return w && pw ? (p.zoom || 1) * pw / w : 1; },
  /** The bar says what the zoom is, and whether Fit is on. */
  mark(p) {
    if (!p || !p.zl || !RVIEW.on()) return; const f = RVIEW.isFit(p), z = RVIEW.abs(p); if (f && z) p.zoom = z;
    p.zl.textContent = z ? Math.round(z * 100) + '%' : 'Fit';
    if (p.fitB) { p.fitB.classList.toggle('on', f); p.fitB.setAttribute('aria-pressed', String(f)); }
  },
  /** Fit: the page's width to the pane, kept fitted as the pane changes size until a zoom by hand. */
  fit(p) {
    if (!p) return; p.fit = true; if (p.i >= 0) { const S = RDOCK.S_; (S.fit || (S.fit = {}))[p.id] = 1; RDOCK.save(); }
    if (p.kind === 'pdf') RDOCK.draw(p); else { RVIEW.hz(p); RVIEW.mark(p); }
  },
  /** n sizes up (n > 0) or down from z, on RDOCK.ZOOMS. */
  step(z, n) { const Z = RDOCK.ZOOMS; if (n > 0) { const up = Z.filter(x => x > z + 1e-3); return up.length ? up[Math.min(up.length, n) - 1] : Z[Z.length - 1]; } const dn = Z.filter(x => x < z - 1e-3); return dn.length ? dn[Math.max(0, dn.length + n)] : Z[0]; },
  keepLast(z) { try { _ls.set('rview:last', z); } catch (e) { } },
  /** A tab opened for the first time: as Settings says (Fit, the last zoom used, 100%). */
  start(b) {
    const S = RDOCK.S_, t = RVIEW.tn('start', 'fit'), last = +_ls.get('rview:last', 0) || 0; S.fit = S.fit || {};
    if (t === '100') S.zoom[b.id] = 1; else if (t === 'last' && last) S.zoom[b.id] = last; else S.fit[b.id] = 1;
  },
  /** An HTML page at the zoom: the frame scaled, its size divided by the zoom so the page lays out at that width. */
  hz(p) {
    const fr = RVIEW.frame(p); if (!fr) return;
    const z = RVIEW.on() ? clamp(RVIEW.abs(p) || 1, .25, 4) : 1, one = Math.abs(z - 1) < .005; p._hz = one ? 1 : z;
    p.ov.classList.toggle('rv-hzoom', !one);
    Object.assign(fr.style, one ? { width: '', height: '', transform: '', transformOrigin: '', flex: '' } : { width: 100 / z + '%', height: 100 / z + '%', transform: 'scale(' + z + ')', transformOrigin: '0 0', flex: 'none' });
  },
  /** Fitted, an HTML page is at 100% — smaller when its content is wider than the pane (a fixed-width report). */
  hfit(p) { const c = p.ov && $('.dk-maxc', p.ov), w = c ? c.clientWidth : 0; return p._sw && w ? Math.min(1, w / p._sw) : 1; },
  /** The pane changed size: a fitted page fits again (a zoom by hand keeps its size). */
  resized(p) {
    if (!p.ov || !p.ov.isConnected) return;
    const c = $('.dk-maxc', p.ov), w = c ? c.clientWidth : 0; if (!w || Math.abs(w - (p._rw || 0)) < 2) return;
    clearTimeout(p._rt); p._rt = setTimeout(() => { if (!p.ov || !p.ov.isConnected) return; const c2 = $('.dk-maxc', p.ov), w2 = c2 ? c2.clientWidth : 0; if (Math.abs(w2 - (p._rw || 0)) < 2) return;
      p._rw = w2; if (p.kind === 'pdf') { if (RVIEW.isFit(p)) RDOCK.draw(p); } else { RVIEW.hz(p); RVIEW.mark(p); } }, 140);
  },
  /** What a pane's bar gains: − 100% + Fit (an HTML page's too), In a note, and Close in full screen coming back beside. */
  dress(p, b) {
    if (!p || !p.ov) return; const bar = $(':scope > .em-bar', p.ov); if (!bar) return;
    const btn = (label, title, fn, cls) => h('button.btn.xs' + (cls || ''), { type: 'button', title, on: { click: e => { e.stopPropagation(); fn(e); } } }, label);
    p.zl.title = 'Back to 100% — the page at its own size';
    let grp = p.zl.parentNode && p.zl.parentNode.classList && p.zl.parentNode.classList.contains('rd-grp') ? p.zl.parentNode : null;
    if (!grp) { grp = h('div.rd-grp.rv-hgrp', btn('−', 'Smaller', () => RDOCK.zoom(-1, true, p)), p.zl, btn('+', 'Larger', () => RDOCK.zoom(1, true, p))); const t = $('.rd-ttl', bar); t ? t.after(grp) : bar.prepend(grp); }
    p.fitB = btn('Fit', 'Fit the width to the pane — it stays fitted as the pane changes size, until you zoom by hand', () => RVIEW.fit(p), '.rv-fit'); grp.append(p.fitB);
    p.inB = h('button.btn.xs.rv-in', { type: 'button', title: 'Show it in a note — its card, or another note it is in (“◧ Back beside” on the card brings it back here)', 'aria-label': 'Show it in a note', html: RVIEW.IN, on: { click: e => { e.stopPropagation(); RVIEW.noteMenu(p, e); } } });
    const sw = $('.rd-swap', bar); sw ? sw.before(p.inB) : p.fs.before(p.inB);
    const x = $('.rd-x', bar); if (x) { x._t0 = x.title; x.addEventListener('click', e => { if (p.full && RVIEW.tn('fullClose', 'beside') !== 'close') { e.stopImmediatePropagation(); e.stopPropagation(); RDOCK.full(p); } }, true); }
    if (p.kind === 'html') RVIEW.hz(p); RVIEW.mark(p);
  },
  closeTitle(p) { const x = p && p.ov && $('.rd-x', p.ov); if (!x) return; const back = p.full && RVIEW.tn('fullClose', 'beside') !== 'close'; x.title = back ? 'Back beside the note — the tab stays open (Esc)' : (x._t0 || x.title); },
  /* ---------- in the note, and back beside ---------- */
  came() { if (!RVIEW._came) { let v = null; try { v = _ls.get('rview:came', null); } catch (e) { } RVIEW._came = v && typeof v === 'object' ? v : {}; } return RVIEW._came; },
  cameOf: id => RVIEW.came()[id] || null,
  remember(id, c) { const all = RVIEW.came(); all[id] = Object.assign({ t: Date.now() }, c); Object.keys(all).sort((a, z) => (all[z].t || 0) - (all[a].t || 0)).slice(20).forEach(k => delete all[k]); _ls.set('rview:came', all); },
  forget(id, quiet) { const all = RVIEW.came(); if (!all[id]) return; delete all[id]; _ls.set('rview:came', all); if (!quiet) { const b = M.block(id); if (b) RDOCK.card(b); } },
  /** The notes the file is in (its card first) and those that mention it. */
  noteMenu(p, e) {
    const b = M.block(p.id); if (!b) return; const X = typeof RDX !== 'undefined' ? RDX : null, lib = X ? X.libOf(b) : null, what = b.kind === 'html' ? 'page' : 'paper';
    const others = lib ? X.embedsOf(lib).filter(x => x.id !== b.id && MEDIA.get(x.media)) : [], ments = lib ? X.citedIn(lib, b.id).filter(r => r.t !== 'embed') : [];
    const dt = id => (M.doc(id) || {}).title || 'Untitled', r = (e.currentTarget || e.target).getBoundingClientRect();
    ctxMenu(Math.max(8, Math.min(innerWidth - 320, r.right - 300)), r.bottom + 6, [{ head: 'Show it in a note' },
      { label: dt(b.docId), sub: 'Its card — the ' + what + ' leaves the reader; “◧ Back beside” on the card brings it back', run: () => RVIEW.toNote(p, b) },
      ...others.map(x => ({ label: dt(x.docId), sub: 'Embedded there too — shown in that card', run: () => RVIEW.toNote(p, x) })),
      ments.length ? 'sep' : null, ments.length ? { head: 'Mentioned in — the reader stays' } : null,
      ...ments.map(m => ({ label: dt(m.b.docId), sub: (X.KL[m.t] || '') + ' · ' + M.blockName(m.b), run: () => App.jump(m.b.id) }))].filter(Boolean));
  },
  /** The file out of the reader, into the note at its card (at the page you were on); where it came from is remembered. */
  toNote(p, tb) {
    const b = M.block(p.id); tb = tb && M.block(tb.id); if (!b || !tb) return; const S = RDOCK.S_, at = p.kind === 'pdf' ? RDOCK.where(p) : null, fr = p.kind === 'html' ? RVIEW.frame(p) : null, hs = fr && fr._rv ? { x: fr._rv.x, y: fr._rv.y } : null;
    RVIEW.remember(tb.id, { src: p.id, pane: p.i, side: S.side, n: S.n, full: !!p.full, zoom: p.zoom, fit: RVIEW.isFit(p), at, hs });
    if (tb.id === b.id && at && b.kind === 'pdf' && b.view !== 'page') { b.cur = at.p - 1; DOCS.save(b); }
    if (tb.id === b.id && hs) RVIEW.want[tb.id] = hs;
    RDOCK.closeTab(p.id); RDOCK.follow(tb.id);
    if (at && tb.kind === 'pdf' && tb.media === b.media && tb.view !== 'page') RVIEW.cardAt(tb.id, at);
  },
  /** The card's pages to page n — again for a moment, as the note settles (a viewer moved into a new box starts at its top), until you scroll it yourself. */
  cardAt(id, at) {
    const t0 = Date.now(), go = () => { if (Date.now() - t0 > 2500) return; const s = $(`.box[data-id="${id}"] .pdfw .pdf-stage`), sl = s && $(`.pdf-slot[data-p="${at.p}"]`, s);
      if (s && s._rvUser) return;
      if (sl && sl.offsetHeight) { const want = sl.offsetTop - 4 + Math.round((at.f || 0) * sl.offsetHeight); if (Math.abs(s.scrollTop - want) > 8) s.scrollTop = want;
        if (!s._rvHook) { s._rvHook = 1; ['wheel', 'pointerdown', 'touchstart', 'keydown'].forEach(k => s.addEventListener(k, () => { s._rvUser = 1; }, { passive: true, once: true })); } }
      setTimeout(go, 100); };
    setTimeout(go, 60);
  },
  /** "◧ Back beside": into the pane and side it came from, at its zoom and place. */
  back(id) {
    const c = RVIEW.cameOf(id), b = M.block(id); RVIEW.forget(id, true); if (!b || !RDOCK.live(id)) return;
    const S = RDOCK.S_; S.fit = S.fit || {};
    if (c) { if (c.fit) S.fit[id] = 1; else { delete S.fit[id]; S.zoom[id] = c.zoom || 1; } }
    const at = b.kind !== 'pdf' ? null : c && c.at && (b.cur || 0) === c.at.p - 1 ? c.at : b.cur ? { p: b.cur + 1, f: 0 } : c && c.at;
    const cf = b.kind === 'html' ? $$('iframe').find(f => f._qsrc === id && !RVIEW.ofFrame(f) && f._rv) : null, hs = cf ? { x: cf._rv.x, y: cf._rv.y } : c && c.hs;
    const o = {}; if (c && !RDOCK.wrap && c.side) o.side = c.side;
    if (c && RDOCK.wrap) { if (c.n > S.n && RDOCK.splitOn()) RDOCK.setN(c.n); if (c.pane != null && c.pane >= 0) o.pane = c.pane; }
    RDOCK.open(b, o);
    const p = RDOCK.paneOf(id); if (!p) return;
    if (at) RVIEW.goAt(p, at); if (hs) { const fr = RVIEW.frame(p); if (fr) fr._rvWant = hs; }
    if (c && c.full && !p.full) RDOCK.full(p);
  },
  /** A pane to page n at fraction f, once its pages are laid out. */
  goAt(p, at) {
    if (!at) return; let n = 100;
    const go = () => { if (!p.ov || !p.ov.isConnected) return; const s = RDOCK.stage(p), sl = s && $(`.pdf-slot[data-p="${at.p}"]`, s); if (!sl || !sl.offsetHeight) return --n > 0 && setTimeout(go, 60);
      requestAnimationFrame(() => requestAnimationFrame(() => { s.scrollTop = RDOCK.top(s, sl) + (at.f || 0) * sl.offsetHeight; RDOCK.onScroll(p); })); };
    go();
  },
  /** On a card that came out of the reader: "◧ Back beside". */
  chip(el, b, pane, ro) {
    if (!el || !el.classList || el.classList.contains('rd-away') || !b || !(pane && pane.paper)) return; const old = el.querySelector(':scope > .rv-back'), c = RVIEW.cameOf(b.id);
    if (!c || ro || RDOCK.has(b.id) || RDOCK.phone()) { if (old) old.remove(); return; } if (old) return;
    el.append(h('div.rv-back.nopan', h('button.rv-bk', { type: 'button', title: 'Back to the reader beside the note — the pane and side it came from, where you were reading', on: { click: e => { e.stopPropagation(); RVIEW.back(b.id); }, pointerdown: e => e.stopPropagation() } }, '◧ Back beside'),
      h('button.rv-bx', { type: 'button', title: 'Keep it here', 'aria-label': 'Keep it here', on: { click: e => { e.stopPropagation(); RVIEW.forget(b.id); }, pointerdown: e => e.stopPropagation() } }, '×')));
  },
  /** The frame's report, once the app asks for it (a page in a pane or a popup; a card's stays quiet): { x, y } scrolled, sw its content's width, iw its own. */
  SCRIPT: `<script>(function(){var P=parent,t=0,on=0;function rep(){P.postMessage({sis:'rv-size',x:scrollX,y:scrollY,sw:Math.max(document.documentElement.scrollWidth,document.body?document.body.scrollWidth:0),iw:innerWidth},'*');}function later(){clearTimeout(t);t=setTimeout(rep,140);}
function hi(){P.postMessage({sis:'rv-hi'},'*');}if(document.readyState==='complete')setTimeout(hi,0);else addEventListener('load',hi);
addEventListener('message',function(e){var d=e.data||{};if(d.sis==='rv-to'){scrollTo(d.x||0,d.y||0);if(on)later();}if(d.sis==='rv-ask'){if(!on){on=1;addEventListener('scroll',later,{passive:true});addEventListener('resize',later);}rep();}});})();<\/script>`,
  /** Other modules' handlers for the frames' rv- messages: (data, frame) (13zzzc: the pointer in a popup). */
  msg: [],
  /** Put a feature of this module at the end of its group on the Features board (it registers before 20a). */
  late(id) { setTimeout(() => { const L = FEAT.list, f = FEAT.by[id], i = L.indexOf(f); if (i < 0) return; L.splice(i, 1); let k = -1; L.forEach((x, j) => { if (x.group === f.group) k = j; }); L.splice(k + 1, 0, f); }, 0); },
  /* ---------- Settings: the live preview ---------- */
  preview() {
    const wrap = h('div'), start = RVIEW.tn('start', 'fit'), fc = RVIEW.tn('fullClose', 'beside'), FZ = 1.18; let fit = start !== '100', z = 1;
    const draw = () => {
      const shown = fit ? FZ : z, b = (t, title, fn, on) => h('button.pv-rv-b' + (on ? '.on' : ''), { type: 'button', title, on: { click: e => { e.stopPropagation(); fn(); draw(); } } }, t);
      const page = h('div.pv-rv-page', { style: { width: Math.round(100 * shown / FZ) + '%' } }, h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-pl'));
      wrap.replaceChildren(h('div.pv-rv', h('div.pv-rv-bar', h('b', 'Style et al., 2014'), h('span.pv-rv-g', '‹ 3 / 9 ›'),
        h('span.pv-rv-g', b('−', 'Smaller', () => { z = Math.max(.6, Math.round(((fit ? FZ : z) - .15) * 100) / 100); fit = false; }), b(Math.round(shown * 100) + '%', 'Back to 100%', () => { fit = false; z = 1; }), b('+', 'Larger', () => { z = Math.min(1.6, Math.round(((fit ? FZ : z) + .15) * 100) / 100); fit = false; }), b('Fit', 'Fit the width', () => { fit = true; }, fit)),
        h('span.pv-rv-i', { html: RVIEW.IN }), h('span.pv-rv-g', '⤢')), h('div.pv-rv-desk', page)),
        PV.cap((fit ? 'Fitted: the page fills the pane and stays fitted as the pane changes size. ' : 'At ' + Math.round(shown * 100) + '%: the page keeps its size; the % goes back to 100%. ') + 'A new tab opens ' + ({ fit: 'fitted', last: 'at the last zoom you used', 100: 'at 100%' }[start] || 'fitted') + '; Close in full screen ' + (fc === 'close' ? 'closes the tab.' : 'brings it back beside, the tab still open.') + ' Try − + and Fit here.'));
    };
    draw(); return [wrap];
  },
};
RDOCK.ZOOMS = RVIEW.ZOOMS;
RDOCK.rel = p => RVIEW.rel(p);
{
  // the tabs' zooms are the page's own size from now on (S.zv 2); a zoom kept before, a share of the width, is let go once; S.fit beside S.zoom
  const ld = RDOCK.load; RDOCK.load = function () { const S = ld.apply(this, arguments); let t = {}; try { t = _ls.get('rtabs', null) || {}; } catch (e) { }
    if (t.zv !== 2) S.zoom = {}; S.zv = 2; S.fit = {}; Object.keys(t.fit || {}).forEach(k => { if (S.tabs.includes(k)) S.fit[k] = 1; }); return S; };
  // a pane: a tab opened for the first time as Settings says; its bar dressed
  const bd = RDOCK.build; RDOCK.build = function (i, b) {
    const S = RDOCK.S_; S.fit = S.fit || {}; if (RVIEW.on() && b && S.zoom[b.id] == null && !S.fit[b.id]) RVIEW.start(b);
    const p = bd.apply(this, arguments); try { RVIEW.dress(p, b); } catch (e) { console.warn('[rview]', e); } return p;
  };
  // drawn: a PDF at a zoom waits for its page size; then the bar says the zoom, an HTML page is scaled
  const dr = RDOCK.draw; RDOCK.draw = function (p = RDOCK.st) {
    if (!p || !p.ov || !RVIEW.on()) return dr.apply(this, arguments);
    if (p.kind === 'pdf' && !RVIEW.pwOf(p)) { const b = M.block(p.id); if (b && b.status === 'live' && MEDIA.get(b.media)) { const fit = RVIEW.isFit(p);
      const go = () => { if (!p.ov || !p.ov.isConnected) return; if (!fit) dr.call(RDOCK, p); RVIEW.mark(p); };
      if (fit) { const r = dr.apply(this, arguments); RVIEW.loadPw(p).then(go, () => { }); const c = $('.dk-maxc', p.ov); p._rw = c ? c.clientWidth : 0; return r; }
      RVIEW.loadPw(p).then(go, () => dr.call(RDOCK, p)); return; } }
    const r = dr.apply(this, arguments); const c = $('.dk-maxc', p.ov); p._rw = c ? c.clientWidth : 0;
    if (p.kind === 'html') RVIEW.hz(p); RVIEW.mark(p); return r;
  };
  // a zoom by hand ends Fit; an HTML page zooms too
  const zm = RDOCK.zoom; RDOCK.zoom = function (v, step, p = RDOCK.st) {
    if (!p || !RVIEW.on()) return zm.apply(this, arguments);
    const S = RDOCK.S_, wasFit = RVIEW.isFit(p); if (wasFit) p.zoom = RVIEW.abs(p) || p.zoom || 1; p.fit = false; if (S.fit) delete S.fit[p.id];
    const z = step ? RVIEW.step(p.zoom || 1, v) : v;   // a step from a fitted zoom goes to the next size up or down
    if (p.kind === 'html') { p.zoom = clamp(z, .25, 4); S.zoom[p.id] = p.zoom; RDOCK.save(); RVIEW.hz(p); RVIEW.mark(p); RVIEW.keepLast(p.zoom); return; }
    const z0 = p.zoom, r = zm.call(this, z, false, p); if (Math.abs(p.zoom - z0) < 1e-3 && wasFit && p.i >= 0) { S.zoom[p.id] = p.zoom; RDOCK.save(); }
    RVIEW.mark(p); RVIEW.keepLast(p.zoom); return r;
  };
  // the window, ⇄, ◫ or full screen changed a pane's size (RDOCK.layout says so with a resize; a ResizeObserver here would race the canvas's own)
  addEventListener('resize', () => { if (RVIEW.on()) RVIEW.all().forEach(p => RVIEW.resized(p)); });
  // ⤢ and ◧: Close says where it goes
  const fu = RDOCK.full; RDOCK.full = function (p = RDOCK.st) { const r = fu.apply(this, arguments); try { RVIEW.closeTitle(p); } catch (e) { } return r; };
  // opened beside by any other way: its card no longer offers "◧ Back beside"
  const ro = RDOCK.open; RDOCK.open = function (b) { if (b && RVIEW.cameOf(b.id)) RVIEW.forget(b.id, true); return ro.apply(this, arguments); };
  // a card that came out of the reader: "◧ Back beside"
  ['pdf', 'html'].forEach(k => { const wb = WIDGETS[k].body; WIDGETS[k].body = function (b, d, pane, ro2) { const el = wb.apply(this, arguments); try { if (RVIEW.on()) RVIEW.chip(el, b, pane, ro2); } catch (e) { } return el; }; });
  // HTML pages report their scroll and width (after 13zze's state and 13zzm's snips)
  QUOTE.more = (more => srcId => (more ? more(srcId) : '') + RVIEW.SCRIPT)(QUOTE.more);
  addEventListener('message', e => { const d = e.data; if (!d || typeof d.sis !== 'string' || d.sis.slice(0, 3) !== 'rv-') return;
    const fr = [...document.querySelectorAll('iframe')].find(f => f.contentWindow === e.source); if (!fr) return;
    if (d.sis === 'rv-hi') { const p = RVIEW.ofFrame(fr), w = fr._rvWant || (!p && fr._qsrc && RVIEW.want[fr._qsrc]);   // a page has loaded: a pane's (or a popup's) reports from now on; one that should be scrolled is
      if (w) { fr._rvWant = null; if (!p) delete RVIEW.want[fr._qsrc]; fr.contentWindow.postMessage({ sis: 'rv-to', x: w.x, y: w.y }, '*'); }
      if (p) fr.contentWindow.postMessage({ sis: 'rv-ask' }, '*'); }
    if (d.sis === 'rv-size') { fr._rv = { x: +d.x || 0, y: +d.y || 0, sw: +d.sw || 0, iw: +d.iw || 0 };
      const p = RVIEW.ofFrame(fr); if (p && (p._hz || 1) === 1) { const wide = d.sw > d.iw + 1 ? +d.sw : 0; if (wide !== (p._sw || 0)) { p._sw = wide; if (RVIEW.isFit(p)) { RVIEW.hz(p); RVIEW.mark(p); } } } }
    RVIEW.msg.forEach(f => { try { f(d, fr); } catch (er) { console.warn('[rview msg]', er); } }); });
  // Settings → Reading & sources (after the other reading features: 20a registers them later)
  FEAT.def({ id: 'rview', group: 'reading', label: 'Fit, zoom and full screen beside a note', isNew: true, presets: { simple: true },
    desc: 'Each paper or page read beside a note gets − and + with its zoom, which goes back to 100% (the page at its own size) when clicked, and Fit: its width to the pane, kept fitted as the pane changes size until you zoom by hand. HTML pages and saved websites too. ⤢ full screen keeps the page, the place in it and the zoom, and so does coming back; Close in full screen brings it back beside, the tab still open. The arrow into a box shows it in a note — its card, or another note it is embedded in — at the page you were on, out of the reader; “◧ Back beside” on that card puts it back where it was. Off: no Fit, no zoom on pages, no “in a note”; a PDF’s zoom is a share of the pane’s width, as before.',
    changed: () => { try { if (RDOCK.wrap) RDOCK.remount(); App.refresh(); } catch (e) { } },
    tune: [{ key: 'start', label: 'A paper or page opens at', type: 'seg', isNew: true, def: 'fit', opts: [['fit', 'Fit'], ['last', 'The last zoom you used'], ['100', '100%']], d: 'The first time it is opened in a tab; after that, as you left it' },
      { key: 'fullClose', label: 'Close, in full screen', type: 'seg', isNew: true, def: 'beside', opts: [['beside', 'Brings it back beside'], ['close', 'Closes the tab']], d: 'Esc and ◧ always bring it back beside', changed: () => { try { RVIEW.all().forEach(RVIEW.closeTitle); } catch (e) { } } }],
    preview: () => RVIEW.preview() });
  RVIEW.late('rview');
}
