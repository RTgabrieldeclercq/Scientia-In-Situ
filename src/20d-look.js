/* ==========================================================================
   20d · Look and motion (Gabe: "B is the best. Rethink the UI and animations
   of the entire lab notebook to match this style." — B, "edge rail and
   bookshelf", in the design canvas). The look itself is CSS (36-look.css,
   loaded last, under body:not(.f-off-look)); this module adds the few things
   CSS cannot draw, around the modules' own code, which stays as it was:
   • the side panel of every reader (17g's .sf-col): its host gets .lk-fold
     while it is folded, so the column glides shut instead of jumping, and a
     capsule rail (.lk-rail) floats at the right edge: the highlighter (the
     count in its tooltip), then one dot per highlight colour with its count;
     a click opens the panel (a dot also brings its first highlight into
     view). Beside a note too (its own fold, 17g's setB).
   • the mini library (17j): its grip becomes a capsule of the project's
     shelves (dots and counts; a click or a drag opens it, as before); the
     panel gains Book / List — spines on a shelf, or the rows — kept on this
     device (_ls 'lookLib'); its papers come in one after another.
   • navigation: #view gets .lk-nav for a moment when the route changes, so
     the new page fades in and rises (and nothing re-animates on a redraw).
   • Movement (Full / Calm / Still): body.lk-calm / body.lk-still.
   • V4.44 (the rest of the boards, Gabe: "The rest is approved" — not the
     Portfolio): highlights by page on a thread in every reader's panel
     (markers only: the panel's own lists, filters and counts are untouched);
     the reader gliding between beside the note and the whole window (⤢, ◧,
     Esc — wrapped outermost round RDOCK.full); popups rising out of their
     pane (⧉) and shrinking back into their tab on × and Maximize (RPOP.back /
     max / fromPane / fromMax); Freewrite's Convert one box after another
     (FREEW.show); the data tree's files dropping in (DTREE.toggle). The pills'
     wheels and the Settings sidebar are CSS only (36-look.css). Every motion
     reads its time from 36-look.css (LOOK.dur), so Still and reduced motion
     turn it off.
   LOOK:
     on()           the feature on
     motion()       'full' | 'calm' | 'still' (Settings → Look and motion)
     libMode()      'book' | 'list' (this device)   setLib(v)
     paint()        apply the setting: body classes, rails, grips, panels
     rail(col)      the capsule for one side panel (made once, counted again)
     dressLib(p)    Book / List on one mini library panel
     grip(g)        the shelves' capsule on one mini library grip
   ========================================================================== */
const LOOK = {
  BOOK: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 20V6M9 20V4M13 20V7M17.5 20l2.5-13"/><path d="M3 20h18"/></svg>',
  LIST: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  SPINE_H: [130, 158, 120, 146, 162, 138],
  on: () => typeof FEAT === 'undefined' || FEAT.on('look'),
  motion() { let m = 'full'; try { m = FEAT.tune('look', 'motion') || 'full'; } catch (e) { } return m === 'calm' || m === 'still' ? m : 'full'; },
  libMode() { let v = null; try { v = _ls.get('lookLib', null); } catch (e) { } return v === 'list' ? 'list' : 'book'; },
  setLib(v) { try { _ls.set('lookLib', v === 'list' ? 'list' : 'book'); } catch (e) { } $$('.rs-lib').forEach(LOOK.dressLib); $$('.pv-lk').forEach(n => n._draw && n._draw()); },
  paint() {
    const b = document.body; if (!b) return; const m = LOOK.motion();
    b.classList.toggle('lk-calm', m === 'calm'); b.classList.toggle('lk-still', m === 'still');
    $$('.sf-col').forEach(LOOK.rail); $$('.rs-lib').forEach(LOOK.dressLib); $$('.rs-grip').forEach(LOOK.grip);
  },
  /* ---------- the side panel's capsule ---------- */
  /** A highlight colour's name: the reader's colours, then the kinds; else none. */
  colourName(c) {
    const v = String(c || '').trim().toLowerCase(); if (!v) return '';
    try { const R = (typeof READER !== 'undefined' && READER.COLORS) || {}; const k = Object.keys(R).find(x => String(R[x]).toLowerCase() === v); if (k) return k[0].toUpperCase() + k.slice(1); } catch (e) { }
    try { const ks = (typeof settings === 'function' && settings().kinds) || {}; const id = Object.keys(KIND).find(x => String((ks[x] && ks[x].color) || KIND[x].color || '').toLowerCase() === v); if (id) return KIND[id].label || id; } catch (e) { }
    return '';
  },
  /** The highlights in a panel, by colour, in the order they first appear: [{ col, n, name }]. */
  count(side) {
    const by = new Map(); if (!side) return [];
    side.querySelectorAll('.rd-ann').forEach(a => { const c = (a.style.getPropertyValue('--hc') || '').trim(); if (!c) return; by.set(c, (by.get(c) || 0) + 1); });
    return [...by].map(([col, n]) => ({ col, n, name: LOOK.colourName(col) }));
  },
  rail(col) {
    const host = col && col.parentNode; if (!host || !host.classList || !host.classList.contains('sf-host')) return;
    let folded = false; try { folded = SIDEFOLD.foldedAt(col); } catch (e) { }
    host.classList.toggle('lk-fold', !!folded);
    // the page beside it changed width: a fitted page fits again once the glide is over (13zzzb listens only to the window)
    if (host._lkF !== !!folded) { const first = host._lkF === undefined; host._lkF = !!folded; if (!first) LOOK.refit(); }
    let r = $(':scope > .lk-rail', host);
    if (!r) {
      r = h('div.lk-rail', { role: 'group', 'aria-label': 'Highlights and notes, folded' }); host.append(r);
      r.addEventListener('pointerdown', e => e.stopPropagation());
    }
    const side = $(':scope > .mx-side, :scope > .rd-side', col), C = LOOK.count(side), all = C.reduce((a, x) => a + x.n, 0);
    const key = C.map(x => x.col + ':' + x.n).join('|'); if (r._key === key && r.childElementCount) return; r._key = key;
    const open = c => e => { e.stopPropagation(); e.preventDefault(); if (SIDEFOLD.foldedAt(col)) SIDEFOLD.click(col);
      if (c) setTimeout(() => { const a = [...col.querySelectorAll('.rd-ann')].find(x => (x.style.getPropertyValue('--hc') || '').trim() === c); if (a) { a.scrollIntoView({ block: 'nearest' }); a.classList.add('lk-lit'); setTimeout(() => a.classList.remove('lk-lit'), 1200); } }, 650); };
    const btn = (inner, label, tip, c) => h('button.lk-rb', { type: 'button', 'aria-label': label, on: { click: open(c) } }, inner, h('span.lk-tip', tip));
    const main = btn(h('span', { html: SIDEFOLD.PEN }), 'Open the highlights and notes', SIDEFOLD.TITLE + (all ? ' · ' + all : ''));
    r.replaceChildren(main, ...(C.length ? [h('span.lk-sep'), ...C.map(x => btn([h('span.lk-dot', { style: { background: x.col } }), h('span.lk-n', String(x.n))], (x.name || 'These') + ' highlights: open the panel', (x.name || 'Highlights') + ' · ' + x.n, x.col))] : []));
  },
  refit() { const go = () => { try { if (typeof RVIEW !== 'undefined' && RVIEW.on()) RVIEW.all().forEach(p => RVIEW.resized(p)); } catch (e) { } }; setTimeout(go, 90); setTimeout(go, 700); },
  /* ---------- V4.44: motion helpers ---------- */
  /** A motion time from 36-look.css, in seconds — 0 when the look is off, Movement is Still, or the computer asks for reduced motion. */
  dur(v) { if (!LOOK.on() || !document.body) return 0; const s = getComputedStyle(document.body).getPropertyValue(v).trim(); const n = parseFloat(s); return n > 0 ? (/ms$/.test(s) ? n / 1000 : n) : 0; },
  /** inset(…) that clips box `a` (a rect) down to box `b` (a rect inside or around it). */
  inset: (a, b, round = 0) => `inset(${Math.round(b.top - a.top)}px ${Math.round(a.right - b.right)}px ${Math.round(a.bottom - b.bottom)}px ${Math.round(b.left - a.left)}px round ${round}px)`,
  /** Highlights by page on a thread (board B): a "Page N" marker before the first highlight of each page, in the panel's own lists; the
      highlights stay where the panel put them (its filters and counts read them as before). Run again after every redraw; does nothing
      when the markers are already right. */
  pageOf(a) { const t = ($(':scope > .row .mono', a) || {}).textContent || ''; const m = t.match(/p\.\s*(\d+)/); return m ? +m[1] : 0; },
  thread(side) {
    if (!side) return; const anns = [...side.querySelectorAll('.rd-ann')], plan = [], pars = new Set(anns.map(a => a.parentNode));
    pars.forEach(par => { let prev = null; [...par.children].forEach(ch => { if (!ch.classList.contains('rd-ann')) return; const pg = LOOK.pageOf(ch); if (pg !== prev) plan.push([ch, pg]); prev = pg; }); });
    const old = side.querySelectorAll('.lk-pn');
    if (old.length === plan.length && plan.every(([a, pg]) => { const m = a.previousElementSibling; return m && m.classList.contains('lk-pn') && m.dataset.p === String(pg); })) { pars.forEach(p => p.classList.add('lk-thr')); return; }
    old.forEach(m => m.remove());
    plan.forEach(([a, pg]) => a.before(h('div.lk-pn', { 'data-p': String(pg), 'aria-hidden': 'true' }, pg ? 'Page ' + pg : 'Without a page')));
    pars.forEach(p => p.classList.add('lk-thr'));
  },
  /** ⤢ / ◧ / Esc: the reader glides between beside the note and the whole window. Growing, the full-screen pane is uncovered from where
      the pane was; going back, it stays over the window a moment and shrinks onto its place beside the note. */
  fullGlide(p, r0) {
    const d = LOOK.dur('--lk-dg'), ov = p && p.ov; if (!d || !ov || !ov.isConnected || ov.closest('.rp-pop') || !r0 || !r0.width) return;
    if (ov._lkG) ov._lkG(); const r1 = ov.getBoundingClientRect(); if (!r1.width || (Math.abs(r1.width - r0.width) < 2 && Math.abs(r1.height - r0.height) < 2)) return;
    const keep = ['position', 'left', 'top', 'width', 'height', 'z-index', 'margin', 'inset', 'clip-path', 'transition', 'will-change'];
    ov.style.transition = 'none';
    if (p.full) ov.style.clipPath = LOOK.inset(r1, r0, 12);
    else { Object.assign(ov.style, { position: 'fixed', inset: 'auto', left: r0.left + 'px', top: r0.top + 'px', width: r0.width + 'px', height: r0.height + 'px', zIndex: '1250', margin: '0' }); ov.style.clipPath = 'inset(0px 0px 0px 0px round 0px)'; }
    ov.style.willChange = 'clip-path'; ov.classList.add('lk-gliding'); void ov.offsetWidth;
    ov.style.transition = `clip-path ${d}s var(--lk-glide)`;
    ov.style.clipPath = p.full ? 'inset(0px 0px 0px 0px round 0px)' : LOOK.inset(r0, r1, 0);
    let t = 0; const done = () => { clearTimeout(t); ov._lkG = null; keep.forEach(k => ov.style.removeProperty(k)); ov.classList.remove('lk-gliding'); LOOK.refit(); };
    t = setTimeout(done, d * 1000 + 60); ov._lkG = done;
  },
  /** A popup shrinks back toward where the file went — into its tab when the reader shows one, else onto the middle of the pane, the
      maximised view or its card — keeping its shape (one scale), and fades as it lands. `to` = { r: rect, tab: true when it is a tab }. */
  flyOut(el, r0, to) {
    const d = LOOK.dur('--lk-dr') * 1.3; if (!d || !el) return Element.prototype.remove.call(el);
    if (!el.isConnected) document.body.append(el);
    Object.assign(el.style, { pointerEvents: 'none', transformOrigin: '0 0', transition: 'none' }); el.classList.add('lk-flying'); void el.offsetWidth;
    let tf = 'translateY(10px) scale(.92)';
    if (to && to.r && to.r.width) { const r = to.r, s = to.tab ? Math.max(.12, Math.min(r.width / r0.width, r.height / r0.height)) : Math.min(.5, r.width / r0.width, r.height / r0.height);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2; tf = `translate(${Math.round(cx - r0.left - r0.width * s / 2)}px,${Math.round(cy - r0.top - r0.height * s / 2)}px) scale(${s.toFixed(4)})`; }
    el.style.transition = `transform ${d}s var(--lk-glide), opacity ${(d * .8).toFixed(3)}s ease-in ${(d * .2).toFixed(3)}s`;
    el.style.transform = tf; el.style.opacity = '0';
    setTimeout(() => Element.prototype.remove.call(el), d * 1000 + 60);
  },
  /** …and a new popup rises out of the pane (or the maximised view) it came from. */
  flyIn(el, r0) {
    const d = LOOK.dur('--lk-ds'); if (!d || !el || !r0 || !r0.width) return; const r1 = el.getBoundingClientRect(); if (!r1.width || !r1.height) return;
    Object.assign(el.style, { transformOrigin: '0 0', transition: 'none', transform: `translate(${Math.round(r0.left - r1.left)}px,${Math.round(r0.top - r1.top)}px) scale(${(r0.width / r1.width).toFixed(4)},${(r0.height / r1.height).toFixed(4)})`, opacity: '.55' });
    el.classList.add('lk-flying'); void el.offsetWidth;
    el.style.transition = `transform ${d}s var(--lk-soft), opacity ${(d * .6).toFixed(3)}s ease-out`; el.style.transform = ''; el.style.opacity = '';
    setTimeout(() => { if (!el.isConnected) return; ['transform-origin', 'transition', 'transform', 'opacity'].forEach(k => el.style.removeProperty(k)); el.classList.remove('lk-flying'); }, d * 1000 + 60);
  },
  /** × or Maximize on a popup: RPOP.remove takes it down inside `run` — here it stays on screen until it has flown to where the file went. */
  popAway(p, run) {
    const el = p && p.el; if (!el || !el.isConnected || !LOOK.dur('--lk-dr')) return run();
    const r0 = el.getBoundingClientRect(), id = p.id; let gone = false;
    el.remove = () => { gone = true; };
    let res; try { res = run(); } finally { delete el.remove; }
    if (!gone) return res;
    const vis = x => x && x.isConnected && x.getClientRects().length ? x.getBoundingClientRect() : null, q = RDOCK.paneOf(id);
    const tab = vis($(`.rd-tabs .rd-tab[data-id="${CSS.escape(id)}"]`));
    const r1 = tab || (q && vis(q.ov)) || vis([...$$('.embed-max:not(.rd-dock)')].pop()) || vis($(`.box[data-id="${CSS.escape(id)}"]`));
    LOOK.flyOut(el, r0, r1 ? { r: r1, tab: !!tab } : null); return res;
  },
  /** Freewrite's Convert: the note it will make comes in one box after another (and its links after them). */
  fwConvert() {
    const st = typeof FREEW !== 'undefined' && FREEW.st, side = st && st.side; if (!side || !LOOK.dur('--lk-ds')) return;
    const bs = $$('.fw-mb', side); bs.forEach((b, i) => b.style.setProperty('--lk-i', String(Math.min(i, 8))));
    side.style.setProperty('--lk-n', String(Math.min(bs.length, 8)));
    side.classList.remove('lk-conv'); void side.offsetWidth; side.classList.add('lk-conv');
    clearTimeout(side._lkC); side._lkC = setTimeout(() => side.classList.remove('lk-conv'), 1600);
  },
  /** A folder of the data tree opened: its files drop in one after another. */
  dtOpen(id, path) {
    if (!LOOK.dur('--lk-dr')) return;
    $$(`.dt[data-dt="${CSS.escape(id)}"]`).forEach(el => { let i = 0; $$('.dt-r[data-p]', el).forEach(r => { const p = r.dataset.p || ''; if (p.startsWith(path + '/') && !p.slice(path.length + 1).includes('/')) { r.style.setProperty('--lk-di', String(Math.min(i++, 8))); r.classList.add('lk-drop'); } }); });
  },
  /* ---------- the mini library ---------- */
  dressLib(p) {
    if (!p || !p.classList) return; const mode = LOOK.libMode();
    p.classList.toggle('lk-book', mode === 'book'); p.classList.toggle('lk-list', mode === 'list');
    const head = $(':scope > .rs-lh', p);
    if (head && !$(':scope > .lk-tog', head)) {
      const b = (v, label, html) => h('button', { type: 'button', 'data-v': v, 'aria-label': label, title: label, html, on: { click: e => { e.stopPropagation(); LOOK.setLib(v); } } });
      const tog = h('div.lk-tog', { role: 'group', 'aria-label': 'Show papers as' }, b('book', 'Spines on a shelf', LOOK.BOOK), b('list', 'A list', LOOK.LIST));
      const x = $(':scope > .rs-lx', head); x ? x.before(tog) : head.append(tog);
    }
    if (head) $$(':scope > .lk-tog button', head).forEach(x => { const on = x.dataset.v === mode; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    // one after another (eight at most), each spine its own height
    $$('.rs-paper', p).forEach((x, i) => { x.style.setProperty('--d', Math.min(i, 8) * 45 + 'ms'); x.style.setProperty('--h', LOOK.SPINE_H[i % LOOK.SPINE_H.length] + 'px'); });
  },
  /** The grip as a capsule: the library, then a dot per shelf of this project with its papers' count. */
  grip(g) {
    if (!g || !g.classList) return; g.classList.add('lk-grip');
    let papers = 0, shelves = [];
    try { const k = RSET.live() ? RDOCK.S_.cur : (RSET.ctxKey() || RSET.NONE); shelves = RLIB.shelves(k).mine.map(t => { const n = LGROUP.groups(t.id).reduce((a, f) => a + [...LGROUP.members(f)].map(M.lib).filter(RLIB.openable).length, 0); papers += n; return { t, n }; }); } catch (e) { }
    const key = shelves.map(s => s.t.id + ':' + s.n).join('|'); if (g._key === key && $(':scope > .lk-gi', g)) return; g._key = key;
    const old = $(':scope > .lk-gi', g); if (old) old.remove();
    const rb = (inner, tip) => h('span.lk-rb', { 'aria-hidden': 'true' }, inner, h('span.lk-tip', tip));
    const box = h('span.lk-gi.lk-rail-l', rb(h('span', { html: LOOK.BOOK }), 'Library' + (papers ? ' · ' + papers : '')),
      ...(shelves.length ? [h('span.lk-sep'), ...shelves.slice(0, 6).map(s => rb([h('span.lk-dot', { style: Object.assign({ background: 'var(--sc,var(--teal))' }, LGROUP.sh(s.t)) }), h('span.lk-n', s.n ? String(s.n) : '')], s.t.name))] : []));
    g.append(box);
  },
  /* ---------- Settings: the live preview ---------- */
  preview() {
    const wrap = h('div.pv-lk'); let folded = false;
    const draw = () => {
      const on = LOOK.on(), m = LOOK.motion(), lib = LOOK.libMode();
      wrap.className = 'pv-lk ' + (on ? m : 'off');
      const toggle = e => { if (e) e.stopPropagation(); folded = !folded; draw(); };
      const page = h('div.pv-lk-page', h('div.pv-lk-pg', h('i.h'), h('i'), h('i.y'), h('i'), h('i', { style: { width: '80%' } }), h('i')));
      const side = h('div.pv-lk-side' + (folded ? '.f' : ''), h('div.pv-lk-si', ['#F6D55C', '#7FB3E8', '#F28BB0'].map(c => h('b', { style: { '--hc': c } }))));
      const rail = on && folded ? h('div.pv-lk-rail', ['#F6D55C', '#7FB3E8', '#F28BB0'].map(c => h('button', { type: 'button', tabindex: '-1', 'aria-label': 'Open the panel', on: { click: toggle } }, h('i', { style: { background: c } })))) : null;
      const strip = !on && folded ? h('div.pv-lk-strip', { title: 'Open the panel', on: { click: toggle } }) : null;
      const shelf = h('div.pv-lk-shelf', [70, 58, 66, 52, 62].map((x, i) => h('span', { style: { height: x + 'px', opacity: String(1 - i * .1) } })));
      const list = h('div.pv-lk-list', [1, 2, 3, 4].map(() => h('span')));
      const libBtn = (v, l) => h('button.btn.sm' + (lib === v ? '.on' : ''), { type: 'button', on: { click: e => { e.stopPropagation(); LOOK.setLib(v); } } }, l);
      const what = m === 'full' ? 'glides shut over half a second and a capsule of its colours springs in' : m === 'calm' ? 'closes a little faster, with no spring' : 'closes at once, without moving';
      wrap.replaceChildren(h('div.pv-lk-win', page, side, rail, strip),
        h('div.pv-lk-row', h('button.btn.sm', { type: 'button', on: { click: toggle } }, folded ? 'Open the panel' : 'Fold the panel'), h('span.sp', { style: { flex: '1' } }), libBtn('book', 'Spines'), libBtn('list', 'List')),
        h('div.pv-lk-row', lib === 'book' ? shelf : list),
        PV.cap(on ? 'The edge-rail look. Fold the panel: it ' + what + '. The mini library shows ' + (lib === 'book' ? 'spines on a shelf' : 'a list') + ' on this device.' : 'Off: the look from before; the panel folds to a capsule without gliding, and the mini library is a list.'));
    };
    wrap._draw = draw; draw(); return [wrap];
  },
};
{
  // Settings → Look and motion: Movement, and the switch, applied at once
  const ap = FEAT.apply; FEAT.apply = function () { const r = ap.apply(this, arguments); try { LOOK.paint(); } catch (e) { } return r; };
  // every side panel: its fold as a class on its host, and its capsule
  const ar = SIDEFOLD.aria; SIDEFOLD.aria = function (col) { const r = ar.apply(this, arguments); try { LOOK.rail(col); } catch (e) { console.warn('[look]', e); } return r; };
  const wr = SIDEFOLD.wrap; SIDEFOLD.wrap = function (side) {
    const col = wr.apply(this, arguments);
    try { if (col) { const s = $(':scope > .mx-side, :scope > .rd-side', col); LOOK.thread(s); LOOK.rail(col); if (s) new MutationObserver(() => { LOOK.thread(s); LOOK.rail(col); }).observe(s, { childList: true, subtree: true }); } } catch (e) { console.warn('[look]', e); }
    return col;
  };
  // V4.44 — ⤢ / ◧ / Esc: the reader glides between beside the note and the whole window (outermost wrapper: it sees the pane before and after)
  const fu = RDOCK.full; RDOCK.full = function (p = RDOCK.st) { const r0 = p && p.ov && p.ov.isConnected ? p.ov.getBoundingClientRect() : null; const r = fu.apply(this, arguments); try { if (r0) LOOK.fullGlide(p, r0); } catch (e) { console.warn('[look]', e); } return r; };
  // V4.44 — popups: × and Maximize fly back to where the file goes; ⧉ makes one rise out of its pane
  const pb = RPOP.back; RPOP.back = function (p) { return LOOK.popAway(p, () => pb.apply(this, arguments)); };
  const pm = RPOP.max; RPOP.max = function (p) { return LOOK.popAway(p, () => pm.apply(this, arguments)); };
  const fp = RPOP.fromPane; RPOP.fromPane = function (q) { const r0 = q && q.ov && q.ov.isConnected ? q.ov.getBoundingClientRect() : null, id = q && q.id; const r = fp.apply(this, arguments); try { const p = id && RPOP.of(id); if (p && p.el && r0) LOOK.flyIn(p.el, r0); } catch (e) { console.warn('[look]', e); } return r; };
  const fm = RPOP.fromMax; RPOP.fromMax = function (b, ov) { const r0 = ov && ov.isConnected ? ov.getBoundingClientRect() : null; const r = fm.apply(this, arguments); try { const p = b && RPOP.of(b.id); if (p && p.el && r0) LOOK.flyIn(p.el, r0); } catch (e) { console.warn('[look]', e); } return r; };
  // V4.44 — Freewrite's Convert, one box after another; the data tree's files dropping in
  if (typeof FREEW !== 'undefined') { const fs = FREEW.show; FREEW.show = function () { const r = fs.apply(this, arguments); try { LOOK.fwConvert(); } catch (e) { } return r; }; }
  if (typeof DTREE !== 'undefined') { const dt = DTREE.toggle; DTREE.toggle = function (b, path, depth) { const was = DTREE.isOpen(b.id, path, depth); const r = dt.apply(this, arguments); try { if (!was) LOOK.dtOpen(b.id, path); } catch (e) { } return r; }; }
  const sb = SIDEFOLD.setB; SIDEFOLD.setB = function () { const r = sb.apply(this, arguments); try { $$('.sf-col').forEach(LOOK.rail); } catch (e) { } return r; };
  // the mini library: Book / List on its panel, the shelves' capsule on its grip
  const fl = RLIB.fill; RLIB.fill = function (p) { const r = fl.apply(this, arguments); try { LOOK.dressLib(p); } catch (e) { console.warn('[look]', e); } return r; };
  const gr = RLIB.grip; RLIB.grip = function (ov) { const r = gr.apply(this, arguments); try { const g = $(':scope > .mx-row > .rs-grip', ov); if (g) LOOK.grip(g); } catch (e) { console.warn('[look]', e); } return r; };
  const pt = RLIB.paint; RLIB.paint = function () { const r = pt.apply(this, arguments); try { $$('.rs-grip').forEach(LOOK.grip); } catch (e) { } return r; };
  // a new page fades in and rises, only when the route changes. V4.43: the class goes on after the view is drawn — App.refresh sets
  // #view's className, which wiped it when it was added before (so the rise never played); a redraw within the rise ends it
  let navT = 0, navNext = false;
  addEventListener('hashchange', () => { navNext = true; });
  const rf = App.refresh; App.refresh = function () { const r = rf.apply(this, arguments);
    if (navNext) { navNext = false; const v = document.getElementById('view'); if (v) { v.classList.add('lk-nav'); clearTimeout(navT); navT = setTimeout(() => v.classList.remove('lk-nav'), 450); } }
    return r; };
  try { LOOK.paint(); } catch (e) { }
}
