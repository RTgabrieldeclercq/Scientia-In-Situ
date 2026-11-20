/* ==========================================================================
   15i · References in the Portfolio (V4.70). Gabe, 20 Nov: "References becomes
   a new section in Portfolio that adds all papers in citation mode within the
   References page referenced per theme."
   Under each theme (and Project-wide, which is also where a project's lit
   reviews are counted — they belong to the project, not to a theme) a
   References section lists every paper cited in the notes there, the way a
   note's own References list does (12-doc synthBox): numbered as they are
   cited — the notes taken in the order they were written, each note's
   citations in the order they come in it (ED.citeNumbers), a paper keeping the
   number it got first — as full references (LIB.apa) or short ones; papers
   cited only by author (ED.citeAuthorOnly) follow, without a number. A click
   opens the paper: its PDF in the reader, a link in the browser, else its
   Library card. "cited in 3 notes" says where. Beside Experiments, Notes and
   Protocols, in the Portfolio's own classes (a group, one more header colour
   --sec-refs, 43-pfrefs.css); the switch gains References, with its count.
   Settings → Tabs & overview → References in the Portfolio (pfrefs, 20a):
   the switch, the form of a reference, how many show before "Show all", and
   whether the section shows where nothing is cited yet.
   PFREFS: on · opt · of · open · row · group.
   ========================================================================== */
const PFREFS = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('pfrefs'),
  opt: (k, d) => { try { const v = FEAT.tune('pfrefs', k); return v == null ? d : v; } catch (e) { return d; } },
  _c: new WeakMap(),
  /** The notes a section's references come from: its own, and — for Project-wide — the project's lit reviews (I: PFLIST.info of the row). */
  docsOf(I, c) {
    if (!c || c.bare) return [];
    const out = (c.docs || []).slice(); if (c.wide) I.parts.lit.forEach(d => { if (!out.includes(d) && !d.deleted) out.push(d); });
    return out;
  },
  /** [{ id, lib, n (null: cited only by author), docs [the notes citing it] }] — numbered ones in number order, then the by-author ones A–Z. */
  of(docs) {
    const map = new Map(), order = docs.slice().sort((a, b) => String(a.created).localeCompare(String(b.created))); let n = 0;
    const add = (id, d) => { const lib = M.lib(id); if (!lib) return null; let e = map.get(id); if (!e) map.set(id, e = { id, lib, n: null, docs: [] }); if (!e.docs.includes(d)) e.docs.push(d); return e; };
    order.forEach(d => { [...ED.citeNumbers(d).keys()].forEach(id => { const e = add(id, d); if (e && e.n == null) e.n = ++n; }); });
    order.forEach(d => ED.citeAuthorOnly(d).forEach(id => add(id, d)));
    const all = [...map.values()];
    return [...all.filter(e => e.n != null).sort((a, b) => a.n - b.n), ...all.filter(e => e.n == null).sort((a, b) => LIB.shortRef(a.lib).localeCompare(LIB.shortRef(b.lib)))];
  },
  /** A section's references, worked out once (its object is made again with each drawing of the Portfolio). */
  section(I, c) { if (!PFREFS._c.has(c)) PFREFS._c.set(c, PFREFS.of(PFREFS.docsOf(I, c))); return PFREFS._c.get(c); },
  /** Open the paper: its PDF in the reader, a link in the browser, else its card in the Library. */
  open(lib, e) {
    if (lib.pdf) return App.go('#/read/' + lib.id);
    if (lib.kind === 'link' && lib.url) return void window.open(lib.url, '_blank', 'noopener');
    App.go('#/library'); setTimeout(() => { try { if (typeof LSHEET !== 'undefined') LSHEET.open(lib); } catch (x) { } }, 300);
  },
  row(e, hidden) {
    const lib = e.lib, go = ev => PFREFS.open(lib, ev), apa = LIB.apa(lib), names = e.docs.map(d => d.title || 'Untitled');
    const el = h('div.pf-n.pf-ref' + (hidden ? '.over' : ''), { role: 'link', tabindex: '0', 'data-lib': lib.id, title: apa + '\n— cited in ' + names.slice(0, 6).join(', ') + (names.length > 6 ? '…' : ''),
      on: { click: go, keydown: ev => { if (ev.target === el && ev.key === 'Enter') { ev.preventDefault(); go(ev); } } } },
      h('span.pf-rnum' + (e.n == null ? '.au' : ''), { title: e.n == null ? 'Cited only by author — no number' : 'Reference ' + e.n }, e.n == null ? '·' : String(e.n)),
      PFREFS.opt('format', 'apa') === 'short' ? [h('span.pf-t', h('b', LIB.shortRef(lib)), ' ', h('span.pf-rt', lib.title || lib.url || 'Paper'))] : h('span.pf-t.pf-apa', apa),
      h('span.spacer'), h('span.pf-tail', 'cited in ' + plural(e.docs.length, 'note')), lib.pdf ? h('span.pf-rpdf', { title: 'It has a PDF' }, 'PDF') : null);
    return el;
  },
  group(E, row, c, flat) {
    const cap = +PFREFS.opt('cap', 8) || 0, over = cap > 0 && E.length > cap + 1;
    const g = h('div.pf-g.pf-gref', { 'data-g': 'refs' }, h('div.pf-gl', h('span', 'References'), h('span.pf-c', E.length)),
      E.length ? E.map((e, i) => PFREFS.row(e, over && i >= cap && !flat)) : h('div.pf-none', 'Nothing cited here yet — a citation in a note (/cite) lists its paper here'));
    if (over && !flat) g.append(h('button.btn.xs.pf-ref-more', { type: 'button', title: 'Show or hide the rest', on: { click: e => { e.stopPropagation(); const on = g.classList.toggle('all'); e.currentTarget.textContent = on ? 'Show fewer' : 'Show all ' + E.length; } } }, 'Show all ' + E.length));
    return g;
  },
};
{
  const cn = PFLIST.counts; PFLIST.counts = function (I, th) {
    const n = cn.apply(this, arguments); if (!PFREFS.on()) return n;
    n.refs = I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).reduce((a, c) => a + PFREFS.section(I, c).length, 0); PFREFS._n = n; return n;   // not added to All: a paper is cited in notes that are counted already
  };
  // each section's References, under its Protocols
  const sec = PFLIST.section; PFLIST.section = function (row, c, body) {
    const el = sec.apply(this, arguments);
    try { if (PFREFS.on() && c && body && body.classList && body.classList.contains('pf-groups')) { const E = PFREFS.section(PFLIST.info(row), c); if (E.length || (PFREFS.opt('empty', false) && !c.bare && row.p && !row.readOnly)) body.append(PFREFS.group(E, row, c)); } } catch (e) { console.warn('[pfrefs]', e); }
    return el;
  };
  // the switch: References only, theme by theme
  const it = PFLIST.items; PFLIST.items = function (row, I, type, th) {
    if (type === 'refs' && !PFREFS.on()) return it.call(this, row, I, 'all', th);
    if (type !== 'refs') return it.apply(this, arguments);
    const out = [], add = el => { el.style.setProperty('--i', out.length); out.push(el); };
    I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => { const E = PFREFS.section(I, c); if (E.length) add(PFLIST.section(row, c, h('div.pf-flat', PFREFS.group(E, row, c, true)))); });
    if (!out.length) add(h('div.pf-none', th !== 'all' ? 'Nothing cited in this theme yet' : 'Nothing cited here yet — a citation in a note lists its paper under its theme'));
    try { if (typeof PFICON !== 'undefined' && PFICON.on()) out.forEach(el => PFICON.dress(el)); } catch (e) { }
    return out;
  };
  const sg = PFLIST.seg; PFLIST.seg = function (opts, cur, onPick, label) {
    if (PFREFS.on() && Array.isArray(opts) && opts.some(o => o[0] === 'notes') && !opts.some(o => o[0] === 'refs')) { opts = opts.slice(); opts.push(['refs', 'References', PFREFS._n ? PFREFS._n.refs : null]); }
    return sg.call(this, opts, cur, onPick, label);
  };
  if (typeof PFICON !== 'undefined') {
    PFICON.PATHS['books'] = '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 20.25h16.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 20.25V7.5a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v12.75"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 9.75h4.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M14.03 20.25 16.6 8.4a1.5 1.5 0 0 0-1.15-1.78l-1.1-.24"/><path stroke-linecap="round" stroke-linejoin="round" d="M13.2 10.2l3.6.78"/>';
    PFICON.BY.refs = 'books';
  }
}
