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
    try { if (col) { LOOK.rail(col); const s = $(':scope > .mx-side, :scope > .rd-side', col); if (s) new MutationObserver(() => LOOK.rail(col)).observe(s, { childList: true, subtree: true }); } } catch (e) { console.warn('[look]', e); }
    return col;
  };
  const sb = SIDEFOLD.setB; SIDEFOLD.setB = function () { const r = sb.apply(this, arguments); try { $$('.sf-col').forEach(LOOK.rail); } catch (e) { } return r; };
  // the mini library: Book / List on its panel, the shelves' capsule on its grip
  const fl = RLIB.fill; RLIB.fill = function (p) { const r = fl.apply(this, arguments); try { LOOK.dressLib(p); } catch (e) { console.warn('[look]', e); } return r; };
  const gr = RLIB.grip; RLIB.grip = function (ov) { const r = gr.apply(this, arguments); try { const g = $(':scope > .mx-row > .rs-grip', ov); if (g) LOOK.grip(g); } catch (e) { console.warn('[look]', e); } return r; };
  const pt = RLIB.paint; RLIB.paint = function () { const r = pt.apply(this, arguments); try { $$('.rs-grip').forEach(LOOK.grip); } catch (e) { } return r; };
  // a new page fades in and rises, only when the route changes
  let navT = 0;
  addEventListener('hashchange', () => { const v = document.getElementById('view'); if (!v) return; v.classList.add('lk-nav'); clearTimeout(navT); navT = setTimeout(() => v.classList.remove('lk-nav'), 450); });
  try { LOOK.paint(); } catch (e) { }
}
