/* ==========================================================================
   14 · Terms & the lens — how a term's components chain together.
   V3.999 (Gabe: "any component containing the term appears as a realistic
   bubble portal look that shows the neighboring links or components to that
   component. If that term reappears within that bubble, then it does not
   create a new bubble centered around it. Terms mentioned in lit reviews do
   not appear in the terms tab … bridges of components containing that term
   to other notes … show up in a clever way … Terms linked to other terms
   within a same component or phrase or links between components are listed
   as a side panel list of synergies … Hovering over a bubble allows you to
   port into it to see the note, and you can click a little bubble button to
   go back"; "Let the user choose the order of bubbles. Holding Control key to
   select multiple synergies should work as well. Update the Terms homepage
   as well to navigate a long list of terms more easily along with their
   stats. I still want highlights of barriers leading to a resolution or
   observations leading to takeaways with the help of other terms … that does
   not add more to complexity or as a new feature"; "Bubbles is the only way
   to view it. I want the bubbles to be slightly dynamic with a clean
   animation.")
   • The Terms page (TermsView): find (/ · ↑ ↓ · Enter), sorts (most used,
     rising, recent, A–Z) cutting the list into groups whose heads stay put,
     the rail that jumps to a group, a project and an open-barrier filter;
     each term's uses, last twelve weeks, structures by kind, open barriers,
     arcs and last use; the side: at a glance, rising, open barriers, key.
   • The term (LensView, #/lens/<term>[/<synergies>[/all]]): bubbles only
     (14e) — a component that uses it with every neighbour, in the order you
     pick (note · time · size); synergies to pick (Ctrl/⌘+click several) and
     look through together; bridges folded into beads; arcs — a barrier and
     its resolution, an observation and its takeaway — on the thread between
     their bubbles, with the days and the term that joined them (TARC).
     Nests and Chain left the term (14d stays for the Atlas; the chain board
     below stays for Export chain).
   ========================================================================== */
/** V3.997 (Gabe: "Terms mentioned in lit reviews do not appear in the terms tab"): a mention in a lit review (a literature note, or a Lit review) is left out of the
    Terms tab and the term's page — Settings → Features → Terms can count them again. */
const TERMLIT = {
  is: d => !!d && (d.type === 'literature' || (typeof LITREV !== 'undefined' && LITREV.is(d))),
  counted: () => typeof FEAT !== 'undefined' && FEAT.tune('terms', 'lit') === 'counted',
  occ(termId) { const all = IX.termOcc.get(termId) || []; return TERMLIT.counted() ? all : all.filter(o => !TERMLIT.is(M.doc(o.docId))); },
};

/** V3.999 · Arcs: a barrier that found its resolution, an observation that became a takeaway. Nothing new to mark — they come from the structures made
    with Ctrl+Enter: a resolution's `resolves`, or a connection between a component holding the one and a component holding the other (an Insight counts
    as a takeaway). `through`: the other terms both ends share — the term that joined them. */
const TARC = {
  kinds(id) { const b = M.block(id), ks = new Set(); (IX.blockItems.get(id) || []).forEach(i => { const it = M.item(i); if (it) ks.add(it.kind); }); (IX.origin.get(id) || []).forEach(it => ks.add(it.kind)); if (b && b.ckind === 'insight') ks.add('takeaway'); return ks; },
  K: { br: ['barrier', 'resolution', 'resolved'], ot: ['observation', 'takeaway', 'became a takeaway'] },
  _c: null, _at: -1,
  all() {
    const stamp = DB.all('items').length + ':' + DB.all('wires').length; if (TARC._c && TARC._at === stamp && TARC._ix === IX.wOut) return TARC._c;
    const out = [], seen = new Set(), live = id => { const b = M.block(id); if (!b || b.status === 'removed') return null; const d = M.doc(b.docId); return d && !d.deleted && (TERMLIT.counted() || !TERMLIT.is(d)) ? b : null; };
    const add = (from, to, k) => { if (!from || !to || from === to) return; const key = from + '>' + to + k; if (seen.has(key)) return; const a = live(from), z = live(to); if (!a || !z) return; seen.add(key);
      out.push({ from, to, k, days: Math.max(0, Math.round((+new Date(M.blockTime(z)) - +new Date(M.blockTime(a))) / 864e5)) }); };
    DB.all('items').forEach(it => { if (it.kind === 'resolution' && it.resolves) { const bi = M.item(it.resolves); if (bi) add(bi.originBlockId, it.originBlockId, 'br'); } });
    DB.all('wires').forEach(w => { const A = TARC.kinds(w.from), Z = TARC.kinds(w.to);
      for (const k of ['br', 'ot']) { const [a, z] = TARC.K[k]; if (A.has(a) && Z.has(z)) add(w.from, w.to, k); else if (Z.has(a) && A.has(z)) add(w.to, w.from, k); } });
    TARC._at = stamp; TARC._ix = IX.wOut; return (TARC._c = out);
  },
  terms: id => IX.blockTerms.get(id) || new Set(),
  through(a, ts) { const Z = TARC.terms(a.to); return [...TARC.terms(a.from)].filter(t => Z.has(t) && !ts.includes(t) && M.term(t)); },
  /** For the Terms page: what a term did in each arc — the barrier's (or observation's) own term, "through" the others; or the term that joined them. */
  roles(termId) {
    const out = [], seen = new Set();
    TARC.all().forEach(a => { const A = TARC.terms(a.from), Z = TARC.terms(a.to); if (!A.has(termId)) return;
      let r; if (!Z.has(termId)) r = { k: a.k, via: TARC.through(a, [termId]).map(t => M.term(t).label) };
      else { const on = [...A].filter(t => !Z.has(t) && M.term(t)); r = on.length ? { k: a.k, of: M.term(on[0]).label } : { k: a.k, via: [] }; }
      const key = r.k + (r.of ? 'o' + r.of : 'v' + r.via.join()); if (seen.has(key)) return; seen.add(key); r.a = a; out.push(r); });
    return out;
  },
  dot: k => h('span.ad', { 'aria-hidden': 'true', style: { '--a': `var(--k-${TARC.K[k][0]})`, '--b': `var(--k-${TARC.K[k][1]})` } }),
  line(r) { const [ka] = TARC.K[r.k];
    return h('div', TARC.dot(r.k), r.of ? [r.k === 'br' ? 'helped resolve a barrier on ' : 'took an observation on ', h('span.term-demo', r.of), r.k === 'br' ? '' : ' to a takeaway']
      : [r.k === 'br' ? 'barrier resolved' : 'observation became a takeaway', r.via.length ? [' through ', h('span.term-demo', r.via[0])] : (' in ' + plural(r.a.days, 'day'))]); },
};

/* ---------- the Terms page ---------- */
const TSTAT = {
  week0() { const d = dayStart(new Date()); const dow = (d.getDay() + 6) % 7; return +d - dow * 864e5 - 11 * 7 * 864e5; },
  rows() {
    let onlyLit = 0; const w0 = TSTAT.week0(), now = Date.now();
    const rows = DB.all('terms').map(t => {
      const occ = TERMLIT.occ(t.id).filter(o => { const b = M.block(o.blockId); return b && b.status !== 'removed'; });
      if (!occ.length && (IX.termOcc.get(t.id) || []).length) { onlyLit++; return null; }
      const ks = {}, opens = [], wk = new Array(12).fill(0); let last = 0;
      occ.forEach(o => { o.itemIds.forEach(i => { const it = M.item(i); if (!it) return; ks[it.kind] = (ks[it.kind] || 0) + 1; if (it.kind === 'barrier' && IX.status(it) === 'open' && !opens.includes(it)) opens.push(it); });
        const tm = +new Date(M.blockTime(M.block(o.blockId)) || 0); if (tm > last) last = tm; const wi = Math.floor((tm - w0) / (7 * 864e5)); if (wi >= 0 && wi < 12) wk[wi]++; });
      const sum = (a, z) => wk.slice(a, z).reduce((x, y) => x + y, 0);
      return { t, occ, uses: occ.length, notes: new Set(occ.map(o => o.docId)).size, ks, opens, open: opens.length, wk, d4: sum(8, 12) - sum(4, 8), last, ago: last ? Math.floor((now - last) / 864e5) : 9999,
        proj: (M.project(t.projectId) || { name: 'General' }).name, projId: t.projectId || '', isNew: t.created && +new Date(t.created) > now - 30 * 864e5, arcs: TARC.roles(t.id) };
    }).filter(Boolean);
    return { rows, onlyLit };
  },
  groups(rows, sort) {
    let defs, key;
    if (sort === 'rising') { defs = [['a', 'Rising', 'Rising'], ['b', 'Steady', 'Steady'], ['c', 'Quieter', 'Quieter']]; key = r => r.d4 >= 2 ? 'a' : r.d4 <= -2 ? 'c' : 'b'; rows.sort((a, b) => b.d4 - a.d4 || b.uses - a.uses); }
    else if (sort === 'recent') { defs = [['a', 'This week', 'Week'], ['b', 'This month', 'Month'], ['c', 'Earlier', 'Earlier']]; key = r => r.ago <= 6 ? 'a' : r.ago <= 30 ? 'b' : 'c'; rows.sort((a, b) => a.ago - b.ago || b.uses - a.uses); }
    else if (sort === 'az') { defs = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(c => [c, c === '#' ? 'Numbers and signs' : c, c]); key = r => { const c = (r.t.label || '?')[0].toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }; rows.sort((a, b) => a.t.label.localeCompare(b.t.label, undefined, { sensitivity: 'base' })); }
    else { const top = Math.max(1, ...rows.map(r => r.uses)), hi = Math.max(3, Math.ceil(top * .5)), mid = Math.max(2, Math.ceil(top * .2));
      const span = mid === hi - 1 ? String(mid) : mid + '–' + (hi - 1); defs = [['a', hi + '+ uses', hi + '+'], ['b', span + (span === '1' ? ' use' : ' uses'), span], ['c', 'Under ' + mid, '<' + mid]]; key = r => r.uses >= hi ? 'a' : r.uses >= mid ? 'b' : 'c'; rows.sort((a, b) => b.uses - a.uses || a.t.label.localeCompare(b.t.label)); }
    return defs.map(([k, label, short]) => ({ k, label, short, rows: rows.filter(r => key(r) === k) }));
  },
  ago: d => d >= 9999 ? '—' : d <= 0 ? 'today' : d < 7 ? d + ' d' : d < 60 ? Math.round(d / 7) + ' w' : Math.round(d / 30) + ' mo',
  KORDER: ['claim', 'observation', 'result', 'takeaway', 'evidence', 'question', 'barrier', 'resolution'],
  spark(r, W, H) {
    const mx = Math.max(2, ...r.wk), X = i => 2 + i * (W - 4) / 11, Y = v => H - 2.5 - v / mx * (H - 6), d = r.wk.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const s = h('span.tl-spk', { role: 'img', 'aria-label': r.t.label + ', uses a week over twelve weeks: ' + r.wk.join(', '),
      html: `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path class="ln" d="${d}"/><circle class="end" cx="${X(11)}" cy="${Y(r.wk[11])}" r="2.2"/><circle class="hov" cx="${X(11)}" cy="${Y(r.wk[11])}" r="3"/></svg>` });
    const w0 = TSTAT.week0();
    s.addEventListener('pointermove', e => { const q = s.getBoundingClientRect(), i = clamp(Math.round((e.clientX - q.left - 2) / (q.width - 4) * 11), 0, 11), c = s.querySelector('.hov');
      c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(r.wk[i])); TSTAT.tip(e, plural(r.wk[i], 'use'), 'week of ' + fmtDay(w0 + i * 7 * 864e5)); });
    s.addEventListener('pointerleave', () => TSTAT.untip());
    return s;
  },
  _tip: null,
  tip(e, a, b) { let t = TSTAT._tip; if (!t || !t.isConnected) { t = TSTAT._tip = h('div.tl-tip', { role: 'tooltip' }); document.body.append(t); } t.replaceChildren(h('b', a), b); t.classList.add('on'); const w = t.offsetWidth; t.style.left = clamp(e.clientX + 12, 8, innerWidth - w - 8) + 'px'; t.style.top = Math.max(8, e.clientY - 46) + 'px'; },
  untip() { if (TSTAT._tip) TSTAT._tip.classList.remove('on'); },
};
const TermsView = {
  canvas: true, title: true,
  st: { q: '', sort: null, proj: 'all', open: false, act: 0, scroll: 0, jump: null, side: null },
  sort() { return TermsView.st.sort || (typeof FEAT !== 'undefined' && FEAT.tune('terms', 'sort')) || 'used'; },
  render() {
    const S = TermsView.st, { rows, onlyLit } = TSTAT.rows(); TermsView._rows = rows; TermsView._onlyLit = onlyLit;
    const uses = rows.reduce((n, r) => n + r.uses, 0), notes = new Set(rows.flatMap(r => r.occ.map(o => o.docId))).size;
    App.setTitle('Terms', [h('span', plural(rows.length, 'term') + ' · ' + plural(uses, 'use') + ' in ' + plural(notes, 'note')), TERMLIT.counted() ? null : h('span', 'lit reviews not counted')]);
    if (S.side == null) S.side = innerWidth >= 820;
    const q = h('input#tl-q', { type: 'search', placeholder: 'Find a term', 'aria-label': 'Find a term', autocomplete: 'off', value: S.q,
      on: { input: e => { S.q = e.target.value; S.act = 0; TermsView.list(true); }, keydown: e => TermsView.nav(e) } });
    const projs = [...new Map(rows.map(r => [r.projId, r.proj])).entries()];
    const side = h('aside.insp.tl-side.nopan.scrolly' + (S.side ? '.open' : ''), h('button.ib.x', { title: 'Hide', on: { click: () => { S.side = false; side.classList.remove('open'); tog.hidden = false; host.classList.remove('side-open'); } } }, '✕'));
    const tog = h('button.btn.sm.tl-tog.nopan', { hidden: S.side, on: { click: () => { S.side = true; side.classList.add('open'); tog.hidden = true; host.classList.add('side-open'); } } }, 'At a glance');
    const host = h('div.canvas-host.tl-host' + (S.side ? '.side-open' : ''),
      h('div.tl-main',
        h('div.tl-tools',
          h('label.tl-q', h('span.ico', { 'aria-hidden': 'true' }, '⌕'), q, h('kbd', '/')),
          h('div.seg.tl-sort', { role: 'group', 'aria-label': 'Sort' }),
          projs.length > 1 ? (projs.length <= 4 ? h('div.tl-chips', { role: 'group', 'aria-label': 'Project' }) : h('select.inp.tl-psel', { 'aria-label': 'Project', on: { change: e => { S.proj = e.target.value; S.act = 0; TermsView.list(true); } } }, h('option', { value: 'all' }, 'All projects'), projs.map(([id, n]) => h('option', { value: id, selected: S.proj === id }, n)))) : null,
          h('button.chip.tl-obf', { type: 'button', title: 'Only the terms with a barrier that has no resolution yet', on: { click: () => { S.open = !S.open; S.act = 0; TermsView.list(true); } } }, 'Open barriers'),
          h('span.spacer'),
          h('button.btn.sm', { title: 'Look through every component in every note and mark each use of each term', on: { click: () => TERMSCAN.rescan() } }, '⟳ Rescan terms')),
        h('div.tl-body', h('nav.tl-rail', { 'aria-label': 'Jump to a group' }),
          h('div.tl-list.scrolly', { on: { scroll: () => { S.scroll = $('.tl-list').scrollTop; TermsView.spy(); }, wheel: () => { S.jump = null; }, touchstart: () => { S.jump = null; } } }))),
      side, tog);
    TermsView._projs = projs; TermsView._host = host;
    host.classList.add('tl-in'); setTimeout(() => host.classList.remove('tl-in'), 900);   // V4.63: the cards rise in once
    TermsView.sidePanel(side, rows, onlyLit);
    return host;
  },
  after() { TermsView.list(false); const L = $('.tl-list'); if (L) { L.scrollTop = TermsView.st.scroll || 0; TermsView.spy(); } },
  filtered() { const S = TermsView.st, q = S.q.trim().toLowerCase(); return TermsView._rows.filter(r => (S.proj === 'all' || r.projId === S.proj) && (!S.open || r.open) && (!q || r.t.label.toLowerCase().includes(q) || (typeof TFORMS !== 'undefined' && TFORMS.forms(r.t).some(f => f.toLowerCase().includes(q))))); },
  list(top) {
    const S = TermsView.st, host = TermsView._host; if (!host || !host.isConnected) return;
    const sort = TermsView.sort(), setSort = k => { S.sort = k; S.act = 0; TermsView.list(true); };
    $('.tl-sort', host).replaceChildren(...[['used', 'Most used'], ['rising', 'Rising'], ['recent', 'Recent'], ['az', 'A–Z']].map(([k, l]) => h('button' + (sort === k ? '.on' : ''), { type: 'button', 'aria-pressed': String(sort === k), on: { click: () => setSort(k) } }, l)));
    const chips = $('.tl-chips', host); if (chips) chips.replaceChildren(...[['all', 'All projects'], ...TermsView._projs].map(([k, l]) => h('button.chip' + (S.proj === k ? '.on' : ''), { type: 'button', 'aria-pressed': String(S.proj === k), on: { click: () => { S.proj = k; S.act = 0; TermsView.list(true); } } }, l)));
    const ob = $('.tl-obf', host); ob.classList.toggle('on', S.open); ob.setAttribute('aria-pressed', String(S.open));
    const G = TSTAT.groups(TermsView.filtered(), sort), L = $('.tl-list', host), maxU = Math.max(1, ...TermsView._rows.map(r => r.uses));
    TermsView._flat = G.flatMap(g => g.rows); S.act = Math.min(S.act, Math.max(0, TermsView._flat.length - 1));
    const cols = h('div.tl-cols', ...[['az', 'Term'], ['used', 'Uses'], ['rising', 'Last 12 weeks'], [null, 'Structures'], ['recent', 'Last', '.r']].map(([k, l, c]) => k ? h('button' + (c || '') + (sort === k ? '.on' : ''), { type: 'button', title: 'Sort by this', on: { click: () => setSort(k) } }, l) : h('span', l)));
    let i = 0;
    const secs = G.filter(g => g.rows.length).map(g => h('section.tl-sec', { 'data-g': g.k }, h('div.tl-g', g.label, h('span', plural(g.rows.length, 'term'))), g.rows.map(r => TermsView.row(r, i++, maxU))));
    const n = TermsView._flat.length;
    L.replaceChildren(cols, ...secs, n ? h('div.tl-end', 'Showing ' + n + ' of ' + plural(TermsView._rows.length, 'term') + '.') : h('div.empty', S.q ? 'No term matches “' + S.q + '”.' : TermsView._rows.length ? 'No term here.' : 'No terms yet'),
      TERMLIT.counted() ? null : h('p.tiny.muted.tl-foot', 'Mentions in lit reviews are not counted' + (TermsView._onlyLit ? ' · ' + plural(TermsView._onlyLit, 'term') + ' used only there ' + (TermsView._onlyLit === 1 ? 'is' : 'are') + ' not listed' : '') + ' — Settings → Features → Terms counts them.'));
    $('.tl-rail', host).replaceChildren(...G.map(g => h('button', { type: 'button', 'data-g': g.k, disabled: !g.rows.length, title: g.label + ' · ' + g.rows.length,
      on: { click: () => { S.jump = g.k; const s = $(`.tl-sec[data-g="${CSS.escape(g.k)}"]`, L); if (s) L.scrollTo({ top: s.offsetTop - cols.offsetHeight, behavior: RM() ? 'auto' : 'smooth' }); TermsView.spy(); } } }, g.short)));
    S.jump = null; if (top) L.scrollTop = 0; TermsView.spy();
  },
  row(r, i, maxU) {
    const S = TermsView.st, ks = TSTAT.KORDER.filter(k => r.ks[k] && KIND[k]);
    return h('div.tl-row' + (i === S.act ? '.act' : ''), { role: 'link', tabindex: '0', 'data-i': i, 'data-term': r.t.id, style: { '--i': Math.min(i, 30) }, 'aria-label': `${r.t.label}: ${plural(r.uses, 'use')} in ${plural(r.notes, 'note')}, last ${TSTAT.ago(r.ago)}`,
      on: { click: e => TermsView.open(r, e), keydown: e => { if (e.key === 'Enter') TermsView.open(r, e); }, mousemove: () => { if (S.act !== i) TermsView.act(i, false); } } },
      h('div.tl-t', h('span.term-demo', TermsView.mark(r.t.label)), h('span.tl-sub', r.proj + ' · ' + plural(r.notes, 'note') + (r.isNew ? ' · new this month' : '') + (r.t.importedFrom ? ' · imported' : ''))),
      h('div.tl-u', h('b', r.uses), h('span.tl-ul', r.uses === 1 ? 'use' : 'uses'), h('span.tl-bar', h('i', { style: { width: Math.max(3, r.uses / maxU * 100) + '%' } }))),
      h('div.tl-w', TSTAT.spark(r, 92, 22), h('span.tl-d', { title: 'Uses in the last 4 weeks against the 4 before' }, r.d4 > 0 ? '▲ ' + r.d4 : r.d4 < 0 ? '▼ ' + -r.d4 : '–')),
      h('div.tl-s', h('div.tl-kds', ks.map(k => h('span.tl-kd', { style: { '--kc': `var(--k-${k})` }, title: r.ks[k] + ' × ' + KIND[k].label.toLowerCase() }, r.ks[k])), r.open ? h('span.tl-ob', { title: 'A barrier with no resolution yet' }, r.open + ' open') : null),
        r.arcs.length ? h('div.tl-arcs', r.arcs.slice(0, 2).map(TARC.line)) : null),
      h('div.tl-l', TSTAT.ago(r.ago)));
  },
  mark(label) { const q = TermsView.st.q.trim(), i = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1; return i < 0 ? label : [label.slice(0, i), h('mark', label.slice(i, i + q.length)), label.slice(i + q.length)]; },
  open(r, e) { const L = $('.tl-list'); if (L) TermsView.st.scroll = L.scrollTop; App.go('#/lens/' + r.t.id); },
  act(i, scroll) { const S = TermsView.st, L = $('.tl-list'); if (!L) return; S.act = i; $$('.tl-row.act', L).forEach(x => x.classList.remove('act')); const r = $(`.tl-row[data-i="${i}"]`, L); if (!r) return; r.classList.add('act');
    if (scroll) { const t = r.offsetTop - 66, b = r.offsetTop + r.offsetHeight - L.clientHeight + 8; if (L.scrollTop > t) L.scrollTop = t; else if (L.scrollTop < b) L.scrollTop = b; } },
  nav(e) { const n = (TermsView._flat || []).length; if (!n) return;
    if (!document.body.classList.contains('f-off-look') && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {   // V4.63: cards in a grid
      e.preventDefault(); const S = TermsView.st, L = $('.tl-list'), R = $$('.tl-row', L), cur = R.find(x => +x.dataset.i === S.act); if (!cur) return TermsView.act(0, true);
      if (e.key === 'ArrowRight') return TermsView.act(Math.min(n - 1, S.act + 1), true); if (e.key === 'ArrowLeft') return TermsView.act(Math.max(0, S.act - 1), true);
      const c = cur.getBoundingClientRect(), down = e.key === 'ArrowDown', cand = R.filter(x => { const q = x.getBoundingClientRect(); return down ? q.top > c.top + 4 : q.top < c.top - 4; });
      if (!cand.length) return; const rowTop = down ? Math.min(...cand.map(x => x.getBoundingClientRect().top)) : Math.max(...cand.map(x => x.getBoundingClientRect().top));
      const line = cand.filter(x => Math.abs(x.getBoundingClientRect().top - rowTop) < 4).sort((a, b) => Math.abs(a.getBoundingClientRect().left - c.left) - Math.abs(b.getBoundingClientRect().left - c.left));
      return TermsView.act(+line[0].dataset.i, true); }
    if (e.key === 'ArrowDown') { e.preventDefault(); TermsView.act(Math.min(n - 1, TermsView.st.act + 1), true); } else if (e.key === 'ArrowUp') { e.preventDefault(); TermsView.act(Math.max(0, TermsView.st.act - 1), true); } else if (e.key === 'Enter') { e.preventDefault(); TermsView.open(TermsView._flat[TermsView.st.act], e); } },
  spy() { const L = $('.tl-list'); if (!L) return; const y = L.scrollTop + 34, secs = $$('.tl-sec', L); let cur = secs.length ? secs[0].dataset.g : null; secs.forEach(s => { if (s.offsetTop <= y) cur = s.dataset.g; }); if (TermsView.st.jump) cur = TermsView.st.jump; $$('.tl-rail button').forEach(b => b.classList.toggle('on', b.dataset.g === cur)); },
  sidePanel(side, rows, onlyLit) {
    const sum = (a, s, e) => a.slice(s, e).reduce((x, y) => x + y, 0), now = rows.reduce((n, r) => n + sum(r.wk, 8, 12), 0), before = rows.reduce((n, r) => n + sum(r.wk, 4, 8), 0), pct = before ? Math.round((now - before) / before * 100) : null;
    const opens = rows.filter(r => r.open), resolved = rows.reduce((n, r) => n + r.arcs.filter(a => a.k === 'br' && !a.of && a.via.length).length, 0), rising = rows.filter(r => r.d4 > 0).sort((a, b) => b.d4 - a.d4 || b.uses - a.uses).slice(0, 4);
    const go = r => App.go('#/lens/' + r.t.id);
    side.append(
      h('div.ins-h', h('div.k', 'At a glance'), h('div.tiny.muted', 'The last four weeks')),
      h('div.ins-s', h('div.tl-tiles',
        h('div.tl-tile.w', h('span.l', 'Uses'), h('span.v', now), h('span.s', pct == null ? 'none the four weeks before' : (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '% on the four weeks before')),
        h('div.tl-tile', h('span.l', 'Terms'), h('span.v', rows.length), h('span.s', plural(rows.filter(r => r.isNew).length, 'new one', 'new ones'))),
        h('div.tl-tile', h('span.l', 'Open barriers'), h('span.v', opens.reduce((n, r) => n + r.open, 0)), h('span.s', resolved + ' resolved through another term')))),
      rising.length ? h('div.ins-s', h('h6', 'Rising', h('span.muted', 'on the four weeks before')), h('div.tl-rise', rising.map(r => h('button', { type: 'button', on: { click: () => go(r) } }, h('span.term-demo', r.t.label), TSTAT.spark(r, 64, 18), h('span.tl-d', '▲ ' + r.d4))))) : null,
      opens.length ? h('div.ins-s', h('h6', 'Open barriers', h('span.muted', opens.length)), h('div.tl-obl', opens.slice(0, 8).map(r => h('button', { type: 'button', on: { click: () => go(r) } }, h('span.term-demo', r.t.label), h('span.q', snippet(r.opens[0].text, 90)))))) : null,
      h('div.ins-s', h('h6', 'Key'), h('div.tl-key', TSTAT.KORDER.filter(k => KIND[k]).map(k => h('span.tl-kd', { style: { '--kc': `var(--k-${k})` } }, KIND[k].label))),
        h('div.tl-key', h('span.tl-kd2', TARC.dot('br'), 'a barrier resolved'), h('span.tl-kd2', TARC.dot('ot'), 'an observation become a takeaway'))));
  },
};

/* ---------- a term: its bubbles ---------- */
const TB = {
  /** Same-note neighbours of a component: its connections, the components it links to, the rest of its region (at most eight). */
  nb(id) {
    const b = M.block(id), out = [], seen = new Set([id]); if (!b) return out;
    const add = (oid, rel) => { if (seen.has(oid)) return; const o = M.block(oid); if (!o || o.docId !== b.docId || o.status === 'removed' || (o.status && o.status !== 'live') || o.kind === 'ink') return; seen.add(oid); out.push({ id: oid, rel }); };
    const rl = r => (typeof REL !== 'undefined' && REL[r] && REL[r].label) || r || '';
    (IX.wOut.get(id) || []).forEach(w => add(w.to, rl(w.rel))); (IX.wIn.get(id) || []).forEach(w => add(w.from, rl(w.rel)));
    (IX.linksOut.get(id) || []).forEach(mk => mk.ref && add(mk.ref, 'links to'));
    if (typeof REGION !== 'undefined') REGION.peers(id).forEach(o => add(o.id, ''));
    return out.slice(0, 8);
  },
  data(t, ts, all, st) {
    const fam = st.imported ? M.termFamily(t.id) : [t.id], others = ts.slice(1), NB = new Map(), nb = id => { if (!NB.has(id)) NB.set(id, TB.nb(id)); return NB.get(id); };
    const live = id => { const b = M.block(id); if (!b || b.status === 'removed') return false; const d = M.doc(b.docId); return !!d && !d.deleted && (TERMLIT.counted() || !TERMLIT.is(d)); };
    const uses = (id, x) => { const s = IX.blockTerms.get(id); return !!s && (x === t.id ? fam.some(f => s.has(f)) : s.has(x)); };
    const usesAny = id => ts.some(x => uses(id, x)), meets = (id, x) => uses(id, x) || nb(id).some(n => uses(n.id, x));
    const occ = new Set(); fam.forEach(f => TERMLIT.occ(f).forEach(o => occ.add(o.blockId)));
    const time = id => +new Date(M.blockTime(M.block(id)) || 0);
    const cands = [...occ].filter(live).filter(id => !others.length || (all ? others.every(x => meets(id, x)) : others.some(x => meets(id, x)))).sort((a, b) => nb(b).length - nb(a).length || time(a) - time(b));
    const taken = new Set(), B = [];
    const mk = (id, extra) => { const inside = nb(id); taken.add(id); inside.forEach(n => { if (usesAny(n.id)) taken.add(n.id); });
      const outs = typeof BRIDGE !== 'undefined' ? BRIDGE.out(id) : [], docs = [...new Map(outs.map(x => [x.docId, x])).values()];
      return Object.assign({ id, inside, beads: others.length ? [] : docs.map(x => ({ docId: x.docId, ref: x.id, why: x.why || '' })) }, extra || {}); };
    cands.forEach(id => { if (!taken.has(id)) B.push(mk(id)); });
    const where = id => B.find(o => o.id === id) || B.find(o => o.inside.some(n => n.id === id));
    // arcs: a barrier and its resolution, an observation and its takeaway, one end of them using the term; the other end, wherever it is, joins as a bubble of its own
    const arcs = TARC.all().filter(a => (where(a.from) || where(a.to)) && (usesAny(a.from) || usesAny(a.to)));
    if (!others.length) arcs.forEach(a => [a.from, a.to].forEach(id => { if (!where(id) && live(id)) B.push(mk(id, { arcOnly: true })); }));   // in a lens of synergies only what meets them
    return { t, ts, fam, B, arcs: arcs.filter(a => where(a.from) && where(a.to)), uses, usesAny, nb, where, time };
  },
  order(D, st) { return st.order || BUBBLE.opt('order') || 'note'; },
  sorted(D, G, order) {
    const B = D.B, idx = B.map((b, i) => i);
    if (order === 'time') return idx.sort((i, j) => D.time(B[i].id) - D.time(B[j].id));
    if (order === 'size') return idx.sort((i, j) => G[j].D - G[i].D);
    const doc = i => M.block(B[i].id).docId, f = {}; idx.forEach(i => { f[doc(i)] = Math.min(f[doc(i)] ?? Infinity, D.time(B[i].id)); });
    return idx.sort((i, j) => (f[doc(i)] - f[doc(j)]) || doc(i).localeCompare(doc(j)) || (D.time(B[i].id) - D.time(B[j].id)));
  },
  /** Rows of bubbles: a note's bubbles together under its name (Note), dated on a rail (Time), the busiest first (Size); two bubbles joined by an arc get room for its label. */
  flow(B, G, W, mode, D) {
    const GAP = 56, GG = 92, AG = 230, ext = i => B[i].beads.length ? 150 * G[i].S : 0, doc = i => M.block(B[i].id).docId, brk = i => mode === 'note' && i > 0 && doc(i) !== doc(i - 1);
    const joined = i => i > 0 && D.arcs.some(a => { const p = D.where(a.from), q = D.where(a.to); return (p === B[i - 1] && q === B[i]) || (p === B[i] && q === B[i - 1]); });
    const gapOf = i => i ? Math.max(brk(i) ? GG : GAP, joined(i) ? AG : 0) : 0;
    const runW = i => { let w = G[i].D + ext(i), j = i + 1; while (mode === 'note' && j < B.length && !brk(j)) { w += gapOf(j) + G[j].D + ext(j); j++; } return w; };
    const rows = []; let row = [], x = 0;
    B.forEach((b, i) => { const w = G[i].D + ext(i), need = row.length ? gapOf(i) + w : w, run = brk(i) ? gapOf(i) + runW(i) : need;
      if (row.length && (x + need > W - 32 || (x + run > W - 32 && runW(i) <= W - 32))) { rows.push(row); row = [i]; x = w; } else { row.push(i); x += need; } });
    if (row.length) rows.push(row);
    const P = [], groups = [], rails = []; let top = mode === 'size' ? 30 : 58;
    rows.forEach(r => {
      const gaps = r.map((i, k) => k ? gapOf(i) : 0), total = r.reduce((s, i, k) => s + gaps[k] + G[i].D + ext(i), 0), maxD = Math.max(...r.map(i => G[i].D));
      let x = Math.max(16, (W - total) / 2);
      r.forEach((i, k) => { x += gaps[k]; P[i] = { x: x + G[i].R, y: top + maxD / 2 }; x += G[i].D + ext(i); });
      if (mode === 'note') { let s = 0; for (let k = 1; k <= r.length; k++) if (k === r.length || brk(r[k])) { const a = r[s], z = r[k - 1]; groups.push({ x0: P[a].x - G[a].R, x1: P[z].x + G[z].R + ext(z), y: top - 32, doc: doc(a), n: k - s }); s = k; } }
      if (mode === 'time') { const a = r[0], z = r[r.length - 1]; rails.push({ x0: P[a].x - G[a].R, x1: P[z].x + G[z].R + ext(z), y: top - 16, ticks: r.map(i => ({ x: P[i].x, label: fmtDay(D.time(B[i].id)) })) }); }
      top += maxD + (mode === 'size' ? 78 : 104);
    });
    return { P, H: top, groups, rails };
  },
  deco(F, L) {
    $$('.tbb-deco', F).forEach(n => n.remove());
    L.groups.forEach(g => { const d = M.doc(g.doc); F.append(h('div.tbb-grp.tbb-deco', { style: { left: g.x0 + 'px', top: g.y + 'px', width: (g.x1 - g.x0) + 'px' } }, h('b', (d && d.title) || 'Untitled'), g.n > 1 ? h('span', g.n + ' bubbles') : null, h('i'))); });
    L.rails.forEach(r => F.append(h('div.tbb-rail.tbb-deco', { style: { left: r.x0 + 'px', top: r.y + 'px', width: (r.x1 - r.x0) + 'px' } }, r.ticks.map(k => h('span.tk', { style: { left: (k.x - r.x0) + 'px' } }, h('span', k.label))))));
  },
};
const LensView = {
  canvas: true, title: true, state: {},
  st(termId) { return LensView.state[termId] || (LensView.state[termId] = { order: null, pick: [], imported: false, scroll: 0, side: null, _for: '' }); },
  args(termId, withStr, mode) { const t = M.term(termId), others = String(withStr || '').split(',').filter(x => x && x !== termId && M.term(x)); return { t, others, all: mode === 'all' && others.length > 1, ts: [termId, ...others] }; },
  hash(termId, others, all) { return '#/lens/' + termId + (others.length ? '/' + others.join(',') + (all && others.length > 1 ? '/all' : '') : ''); },
  sig(termId) { const st = LensView.st(termId); return (st.imported ? M.termFamily(termId) : [termId]).map(f => TERMLIT.occ(f).map(o => o.blockId).join()).join('|') + '|' + TARC.all().length; },
  update(termId, withStr, mode) { if (LensView._sig !== LensView.sig(termId)) { App._mounted = false; App.refresh(); } },
  render(termId, withStr, mode) {
    const A = LensView.args(termId, withStr, mode), t = A.t; if (!t) return h('div.canvas-host', h('div.empty-c', 'Term not found'));
    const st = LensView.st(termId), key = A.ts.join() + (A.all ? '/all' : ''); if (st._for !== key) { st.pick = A.others.slice(); st._for = key; }
    if (st.side == null) st.side = innerWidth >= 820;
    LensView._specs = new Map(); const D = TB.data(t, A.ts, A.all, st); LensView._D = D; LensView._A = A; LensView._sig = LensView.sig(termId);
    const notes = new Set(D.B.map(b => M.block(b.id).docId)), comps = new Set(D.B.flatMap(b => [b.id, ...b.inside.filter(n => D.usesAny(n.id)).map(n => n.id)])), folded = D.B.reduce((n, b) => n + b.beads.length, 0);
    const litN = TERMLIT.counted() ? 0 : (IX.termOcc.get(termId) || []).filter(o => TERMLIT.is(M.doc(o.docId))).length;
    App.setTitle(A.ts.map(x => M.term(x).label).join(A.others.length ? ' × ' : ''), [h('span', 'term · ' + (M.project(t.projectId) || { name: 'General' }).name),
      h('span', D.B.length ? plural(comps.size, 'component') + ' · ' + plural(notes.size, 'note') + ' · ' + plural(D.B.length, 'bubble') + (folded ? ' · ' + plural(folded, 'bridge') + ' folded in' : '') : 'nothing here'), litN ? h('span', 'lit reviews not counted') : null]);
    const order = TB.order(D, st), seg = (items, cur, set, cls) => h('div.seg' + (cls || ''), { role: 'group' }, items.map(([k, l, tip]) => h('button' + (cur === k ? '.on' : ''), { type: 'button', title: tip || '', 'aria-pressed': String(cur === k), on: { click: () => set(k) } }, l)));
    const host = h('div.canvas-host.tbb-host' + (BUBBLE.on() ? '' : '.flat') + (st.side ? '.side-open' : ''));
    const bar = h('div.tbb-bar',
      h('div.tbb-crumb', h('button.chip', { type: 'button', on: { click: () => App.go('#/terms') } }, '← All terms'), A.others.length ? h('button.chip', { type: 'button', on: { click: () => App.go(LensView.hash(termId, [])) } }, '← ' + t.label) : null,
        A.others.length ? h('span.tbb-terms', h('span.term-demo.x', { style: { '--tc': 'var(--teal)' } }, t.label), h('span.tbb-x', '×'), A.others.map((x, i) => [i ? h('span.tbb-x', '·') : null, h('span.term-demo.x', { style: { '--tc': BUBBLE.tcol(x, A.ts) } }, M.term(x).label)])) : null,
        A.others.length > 1 ? h('span.tbb-anyall', 'meeting ', seg([['any', 'any'], ['all', 'all']], A.all ? 'all' : 'any', k => App.go(LensView.hash(termId, A.others, k === 'all')), '.mini')) : null),
      h('div.tbb-ord', h('span', 'Order'), seg([['note', 'Note', 'The bubbles of one note together, under its name'], ['time', 'Time', 'Oldest first, each bubble dated'], ['size', 'Size', 'The busiest bubbles first']], order, k => { st.order = k; $$('.tbb-ord .seg button', host).forEach(b => { const on = b.textContent.toLowerCase() === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); LensView.layout(true); })));
    const field = h('div.tbb-field'), stage = h('div.tbb-stage', field), scroll = h('div.tbb-scroll.scrolly', { on: { scroll: () => { st.scroll = scroll.scrollTop; } } }, bar, stage);
    const side = LensView.side(D, A, st, host), tog = h('button.btn.sm.tbb-tog.nopan', { hidden: st.side, on: { click: () => { st.side = true; side.classList.add('open'); tog.hidden = true; host.classList.add('side-open'); setTimeout(() => LensView.layout(false), 260); } } }, 'Synergies');
    side.querySelector('.ib.x').addEventListener('click', () => { st.side = false; side.classList.remove('open'); tog.hidden = false; host.classList.remove('side-open'); setTimeout(() => LensView.layout(false), 260); });
    host.append(scroll, side, tog);
    LensView._host = host; LensView._field = field; LensView._scroll = scroll; LensView._els = null;
    return host;
  },
  after() { LensView.layout(false); const sc = LensView._scroll, st = LensView._A && LensView.st(LensView._A.t.id); if (sc && st) sc.scrollTop = st.scroll || 0; },
  /** Draw (or move) the bubbles for the stage's width and the order. glide: the same bubbles move to their new places. */
  layout(glide) {
    const D = LensView._D, A = LensView._A, F = LensView._field, host = LensView._host; if (!D || !F || !F.isConnected) return;
    const st = LensView.st(A.t.id), W = F.clientWidth || F.parentNode.clientWidth, narrow = W < 700, order = TB.order(D, st);
    F.classList.toggle('narrow', narrow);
    if (!D.B.length) { F.replaceChildren(h('div.tbb-empty', h('p', A.others.length ? (A.all ? 'No component meets all of them. Try “any”.' : 'Nothing here meets them.') : 'No component uses “' + A.t.label + '” here yet' + (TERMLIT.counted() ? '.' : ' (lit reviews are not counted).')))); F.style.minHeight = ''; return; }
    const S = narrow ? Math.min(1, (W - 28) / Math.max(...D.B.map(b => LensView.geo(b, 1).D))) : 1;
    const G0 = D.B.map(b => LensView.geo(b, S)), idx = TB.sorted(D, G0, order), B = idx.map(i => D.B[i]), G = idx.map(i => G0[i]);
    const L = narrow ? null : TB.flow(B, G, W, order, D), sig = W + '|' + S;
    if (glide && L && LensView._els && LensView._elsSig === sig) {
      F.classList.add('gliding'); B.forEach((b, i) => { const el = LensView._els.get(b.id); if (el) { el.style.left = L.P[i].x + 'px'; el.style.top = L.P[i].y + 'px'; } });
      TB.deco(F, L); clearTimeout(F._gl); F._gl = setTimeout(() => { F.classList.remove('gliding'); LensView.threads(B); }, 640);
    } else {
      const els = new Map(), svg = h('div.tbb-threads'); F.replaceChildren(svg);
      B.forEach((b, i) => { const doc = M.block(b.id).docId; if (narrow && order === 'note' && (!i || doc !== M.block(B[i - 1].id).docId)) F.append(h('div.tbb-grp-n', (M.doc(doc) || {}).title || 'Untitled'));
        const el = LensView.bubble(b, G[i], D, A); if (L) { el.style.left = L.P[i].x + 'px'; el.style.top = L.P[i].y + 'px'; } F.append(el); els.set(b.id, el); });
      LensView._els = els; LensView._elsSig = sig;
      if (L) TB.deco(F, L);
      // the threads once the bubbles have come in (their entrance scales them; the labels must keep clear of where they end up)
      BUBBLE.motion(F); clearTimeout(F._th); F._th = setTimeout(() => LensView.threads(B), RM() ? 0 : 560 + Math.min(B.length - 1, 14) * 45);
    }
    F.style.minHeight = narrow ? '' : Math.max(560, L.H) + 'px';
    LensView.applyPick();
  },
  geo(b, S) { const D = LensView._D; if (!b._g || b._gS !== S) { b._sp = b._sp || { centre: LensView.spec(b.id), around: b.inside.map(n => ({ spec: LensView.spec(n.id), rel: n.rel })) }; b._g = BUBBLE.geometry(b._sp.centre, b._sp.around, S); b._gS = S; } return b._g; },
  spec(id) { const c = LensView._specs || (LensView._specs = new Map()), k = id + '|' + LensView._A.ts.join(); if (!c.has(k)) c.set(k, BUBBLE.spec(id, { terms: LensView._A.ts })); const s = c.get(k); return Object.assign({}, s, { body: s.body ? s.body.cloneNode(true) : null }); },
  bubble(b, g, D, A) {
    const blk = M.block(b.id), d = M.doc(blk.docId), rg = typeof REGION !== 'undefined' && REGION.of(b.id), sp = b._sp;
    const nUses = 1 + b.inside.filter(n => D.usesAny(n.id)).length, arcNear = {};
    D.arcs.forEach(a => { if (a.from === b.id && b.inside.some(n => n.id === a.to)) arcNear[a.to] = TARC.K[a.k][1]; if (a.to === b.id && b.inside.some(n => n.id === a.from)) arcNear[a.from] = TARC.K[a.k][1]; });
    const arcNotes = TARC.all().filter(a => D.arcs.includes(a)).map(a => LensView.arcNote(a, b, D)).filter(Boolean);
    const el = BUBBLE.el({ key: b.id, centre: sp.centre, around: sp.around, S: g.S, label: 'Port into ' + ((d && d.title) || 'the note') + (blk.label ? ' at ' + blk.label : ''),
      region: rg ? { name: rg.r.name, ids: b.inside.filter(n => { const x = REGION.of(n.id); return x && x.r.id === rg.r.id; }).map(n => n.id) } : null,
      caption: { title: (d && d.title) || 'Untitled', sub: (d ? prof(d.type).label.toLowerCase() : '') + (rg ? ' · region ' + rg.r.name : '') + ' · ' + plural(1 + b.inside.length, 'component') + ' · ' + fmtDay(D.time(b.id)), extra: [b.arcOnly ? h('span.tbb-joined', 'joined through another term') : null, ...arcNotes] },
      badge: nUses > 1 ? nUses + ' uses' : null, uses: b.inside.filter(n => D.usesAny(n.id)).map(n => n.id), arcNear,
      beads: b.beads.map(x => { const dd = M.doc(x.docId); return { text: '⇄', label: (dd && dd.title) || 'a note', title: '⇄ bridged to “' + ((dd && dd.title) || 'a note') + '”' + (x.why ? ' — ' + x.why : '') + ' · click: go there · Alt+click: beside', on: e => App.jump(x.ref, e) }; }),
      onPort: (glass, e) => LensView.port(b.id, glass, e) });
    if (b.arcOnly) el.classList.add('arc-only');
    return el;
  },
  /** Port in: visit the note itself, at the component; the back bubble on it (or Esc, or Alt+←) comes back here. Alt+click: beside the note you were in. */
  port(id, glass, e) {
    const b = M.block(id); if (!b) return; const A = LensView._A;
    if (e && e.altKey) { const last = BUBBLE.lastDoc; if (last && last !== b.docId && M.doc(last) && typeof SplitView !== 'undefined') { PANES[1] && (PANES[1].pendingFocus = { reveal: id }); return App.go(SplitView.route([last, b.docId], id)); } return App.openBlock(id); }
    const st = LensView.st(A.t.id); if (LensView._scroll) st.scroll = LensView._scroll.scrollTop;
    BUBBLE.back.arm({ hash: location.hash, label: A.ts.map(x => M.term(x).label).join(' × ') });
    BUBBLE.port(glass, () => App.openBlock(id));
  },
  arcNote(a, b, D) {
    const mine = id => id === b.id || b.inside.some(n => n.id === id); if (mine(a.from) === mine(a.to)) return null;
    const [ka, kb, verb] = TARC.K[a.k], other = M.doc(M.block(mine(a.from) ? a.to : a.from).docId), via = TARC.through(a, D.ts);
    return h('span.tbb-arcn', TARC.dot(a.k), mine(a.from) ? `${KIND[ka].label} ${verb} in ${plural(a.days, 'day')}, in ${(other && other.title) || 'another note'}` : `${KIND[kb].label} of ${ka === 'observation' ? 'an' : 'a'} ${ka} in ${(other && other.title) || 'another note'}`, via.length ? [' · through ', h('span.term-demo', M.term(via[0]).label)] : null);
  },
  /** The threads between bubbles: bridges (dashed, green), connections between notes, and the arcs (the two kinds' colours, an arrow, the days and the term that joined them). */
  threads(B) {
    const F = LensView._field, D = LensView._D; if (!F || !F.isConnected) return; $$('.tbb-arc-l', F).forEach(n => n.remove()); const holder = $('.tbb-threads', F); if (!holder) return;
    if (F.classList.contains('narrow')) { holder.replaceChildren(); return; }
    const R = F.getBoundingClientRect(), P = id => { const el = LensView._els && LensView._els.get(id), g = el && $('.bb-g', el); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, r: r.width / 2 }; };
    const isArc = (x, y) => D.arcs.some(a => (a.from === x && a.to === y) || (a.from === y && a.to === x)), paths = [], defs = [];
    B.forEach(b => b.beads.forEach((s, k) => { const tb = B.find(o => M.block(o.id).docId === s.docId), el = LensView._els.get(b.id), bead = el && $(`.bb-bead[data-k="${k}"]`, el); if (!tb || !bead) return; const a = bead.getBoundingClientRect(), q = P(tb.id); if (!q) return;
      const ax = a.left - R.left + a.width / 2, ay = a.top - R.top + a.height / 2, ang = Math.atan2(ay - q.y, ax - q.x), bx = q.x + Math.cos(ang) * q.r, by = q.y + Math.sin(ang) * q.r;
      paths.push(`<path class="br" d="M${ax} ${ay} Q${(ax + bx) / 2} ${(ay + by) / 2 - 40} ${bx} ${by}"/>`); }));
    const seenW = new Set();
    B.forEach(b => [b.id, ...b.inside.map(n => n.id)].forEach(id => (IX.wOut.get(id) || []).forEach(w => { const z = M.block(w.to), a0 = M.block(id); if (!z || !a0 || z.docId === a0.docId || isArc(id, w.to)) return;
      const ba = D.where(id), bc = D.where(w.to); if (!ba || !bc || ba === bc || seenW.has(w.id)) return; seenW.add(w.id); const p = P(ba.id), q = P(bc.id); if (!p || !q) return;
      const ang = Math.atan2(q.y - p.y, q.x - p.x), sx = p.x + Math.cos(ang) * p.r, sy = p.y + Math.sin(ang) * p.r, ex = q.x - Math.cos(ang) * q.r, ey = q.y - Math.sin(ang) * q.r, rel = (typeof REL !== 'undefined' && REL[w.rel] && REL[w.rel].label) || w.rel || '';
      paths.push(`<path class="wi" d="M${sx} ${sy} L${ex} ${ey}"/><text x="${(sx + ex) / 2 + 6}" y="${(sy + ey) / 2 - 4}">${esc(rel)}</text>`); })));
    const labs = [];
    D.arcs.forEach((arc, k) => { const ba = D.where(arc.from), bb = D.where(arc.to); if (!ba || !bb || ba === bb) return; const p = P(ba.id), q = P(bb.id); if (!p || !q) return;
      const [ka, kb, verb] = TARC.K[arc.k], ang = Math.atan2(q.y - p.y, q.x - p.x), sx = p.x + Math.cos(ang) * p.r, sy = p.y + Math.sin(ang) * p.r, ex = q.x - Math.cos(ang) * (q.r + 3), ey = q.y - Math.sin(ang) * (q.r + 3);
      const len = Math.hypot(ex - sx, ey - sy) || 1, bend = Math.min(46, len * .22), cx = (sx + ex) / 2 - (ey - sy) / len * bend, cy = (sy + ey) / 2 + (ex - sx) / len * bend;
      defs.push(`<linearGradient id="tbag${k}" gradientUnits="userSpaceOnUse" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"><stop offset="0" style="stop-color:var(--k-${ka})"/><stop offset="1" style="stop-color:var(--k-${kb})"/></linearGradient>`);
      const ta = Math.atan2(ey - cy, ex - cx), pt = (u, v) => `${(ex - Math.cos(ta) * u - Math.sin(ta) * v).toFixed(1)} ${(ey - Math.sin(ta) * u + Math.cos(ta) * v).toFixed(1)}`;
      paths.push(`<path class="arc" d="M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}" stroke="url(#tbag${k})"/><path class="arc-h" d="M${ex} ${ey} L${pt(10, 5.5)} L${pt(10, -5.5)}Z" style="fill:var(--k-${kb})"/>`);
      const via = TARC.through(arc, D.ts), lab = h('div.tbb-arc-l', { on: { mouseenter: () => LensView.litArc(arc, true), mouseleave: () => LensView.litArc(arc, false) } },
        h('span.l1', TARC.dot(arc.k), `${KIND[ka].label} ${verb}`), h('span.l2', 'in ' + plural(arc.days, 'day'), via.length ? [h('span.vi', ' · through '), h('span.term-demo', M.term(via[0]).label)] : null));
      labs.push({ lab, x0: (sx + 2 * cx + ex) / 4, y0: (sy + 2 * cy + ey) / 4, nx: -(ey - sy) / len, ny: (ex - sx) / len }); });
    holder.replaceChildren(BUBBLE.svg('svg', { width: R.width, height: R.height, viewBox: `0 0 ${R.width} ${R.height}` }, (defs.length ? `<defs>${defs.join('')}</defs>` : '') + paths.join('')));
    // each label at its curve's middle; moved along it, off any bubble, caption or other label
    const circles = B.map(b => P(b.id)).filter(Boolean);
    labs.forEach(({ lab, x0, y0, nx, ny }) => { F.append(lab); const lw = lab.offsetWidth, lh = lab.offsetHeight;
      const boxes = $$('.bb-cap, .tbb-grp, .tbb-arc-l', F).filter(e => e !== lab).map(e => { const q = e.getBoundingClientRect(); return { l: q.left - R.left - 4, t: q.top - R.top - 4, r: q.right - R.left + 4, b: q.bottom - R.top + 4 }; });
      const clear = (x, y) => !circles.some(c => { const qx = clamp(c.x, x - lw / 2, x + lw / 2), qy = clamp(c.y, y - lh / 2, y + lh / 2); return Math.hypot(qx - c.x, qy - c.y) < c.r - 2; }) && !boxes.some(q => x - lw / 2 < q.r && x + lw / 2 > q.l && y - lh / 2 < q.b && y + lh / 2 > q.t);
      let at = [x0, y0]; for (let s = 0; s <= 30; s++) { const a = [x0 + nx * s * 8, y0 + ny * s * 8], c = [x0 - nx * s * 8, y0 - ny * s * 8]; if (clear(...a)) { at = a; break; } if (clear(...c)) { at = c; break; } }
      lab.style.left = clamp(at[0], lw / 2 + 6, R.width - lw / 2 - 6) + 'px'; lab.style.top = at[1] + 'px'; });
  },
  litArc(a, on) { const D = LensView._D; [a.from, a.to].forEach(id => { $$(`.tbb-field .bb-c[data-id="${id}"]`).forEach(m => m.classList.toggle('glow', on)); const b = D && D.where(id), el = b && LensView._els && LensView._els.get(b.id); if (el) el.classList.toggle('lit', on); }); },
  /* ---------- the side: synergies, bridges folded in, what the wiring says, the key ---------- */
  synergies(D) {
    const t = D.t, fam = new Set(D.fam), out = new Map(), add = (x, k) => { if (fam.has(x) || !M.term(x)) return; const s = out.get(x) || { t: x, kinds: {}, n: 0, arcs: [] }; if (k) { s.kinds[k] = (s.kinds[k] || 0) + 1; s.n++; } out.set(x, s); return s; };
    const ids = new Set(); D.B.forEach(b => [b.id, ...b.inside.map(n => n.id)].forEach(id => { if (D.uses(id, t.id)) ids.add(id); }));
    ids.forEach(id => { const b = M.block(id), tx = (b.body && b.body.text) || '', ms = ((b.body && b.body.marks) || []).filter(m => m.type === 'term' && m.ref);
      const sents = ms.filter(m => fam.has(m.ref)).map(m => sentenceAround(tx, m.from, m.to));
      ms.filter(m => !fam.has(m.ref)).forEach(m => add(m.ref, sents.some(([a, z]) => m.from >= a && m.to <= z) ? 'same phrase' : 'same component'));
      [...TB.nb(id), ...(IX.wOut.get(id) || []).map(w => ({ id: w.to })), ...(IX.wIn.get(id) || []).map(w => ({ id: w.from }))].forEach(n => (IX.blockTerms.get(n.id) || new Set()).forEach(x => add(x, 'linked components'))); });
    D.arcs.forEach(a => TARC.through(a, [t.id]).forEach(x => { const s = add(x); if (s && !s.arcs.includes(a)) s.arcs.push(a); }));
    return [...out.values()].filter(s => s.n || s.arcs.length).sort((a, b) => b.n - a.n);
  },
  side(D, A, st, host) {
    const t = A.t, SY = LensView.synergies(D), lensSet = new Set(A.others), differs = () => st.pick.length !== lensSet.size || st.pick.some(x => !lensSet.has(x));
    const side = h('aside.insp.tbb-side.nopan.scrolly' + (st.side ? '.open' : ''), h('button.ib.x', { title: 'Hide' }, '✕'));
    const syn = h('div.ins-s.tbb-syn'), draw = () => {
      const bar = differs() && (st.pick.length > 1 || (A.others.length && st.pick.length)) ? h('div.tbb-pickbar', h('b', st.pick.length + ' picked'),
        h('button.btn.xs.pri', { type: 'button', on: { click: () => App.go(LensView.hash(t.id, st.pick, A.all)) } }, '◎ Lens on ' + (st.pick.length > 1 ? 'them together' : 'it')), h('button.btn.xs.ghost', { type: 'button', title: 'Esc', on: { click: () => { st.pick = A.others.slice(); draw(); LensView.applyPick(); } } }, 'Clear')) : null;
      syn.replaceChildren(h('h6', 'Synergies', h('span.muted', plural(SY.length, 'term'))),
        h('p.tiny.muted.tbb-sp', SY.length ? 'Terms that meet “' + t.label + '”: in the same phrase, the same component, or a linked one. Click to pick one; Ctrl+click (⌘+click) picks several. The bubbles they meet stay lit; the lens opens them on their own.' : 'No other term meets this one yet.'),
        bar, h('div.tbb-syns', { role: 'group', 'aria-label': 'Synergies' }, SY.map(s => LensView.synRow(s, A, st, draw))));
    };
    draw(); LensView._drawSyn = draw;
    const folded = D.B.flatMap(b => b.beads.map(x => ({ b, x })));
    const G = IX.termGraph(t.id, 'project', t.projectId, st.imported), fam = M.termFamily(t.id);
    side.append(h('div.ins-h', h('div.k', 'Synergies and threads'), h('div.tiny.muted', 'What meets “' + t.label + '”, and what its components led to.')), syn,
      folded.length && !A.others.length ? h('div.ins-s', h('h6', 'Bridges folded in', h('span.muted', folded.length)), h('div.tiny.muted', { style: { marginBottom: '6px' } }, 'A bridged component shows once, with a green bead for each note it went to.'),
        h('div.tbb-fold', folded.map(({ b, x }) => { const a = M.doc(M.block(b.id).docId), z = M.doc(x.docId); return h('div.tbb-fr', { on: { mouseenter: () => LensView.lite(b.id, true), mouseleave: () => LensView.lite(b.id, false), click: e => App.jump(x.ref, e) } }, h('span', (a && a.title) || '—'), h('i', ' ⇄ '), h('span', (z && z.title) || '—')); }))) : null,
      G.insights.length ? h('div.ins-s', h('h6', 'What the wiring says', h('span.muted', G.insights.length)), G.insights.map(i => h('div.insight' + (i.cls ? '.' + i.cls : ''), { on: { mouseenter: () => i.path.forEach(id => LensView.lite(id, true)), mouseleave: () => i.path.forEach(id => LensView.lite(id, false)), click: () => App.openBlock(i.path[i.path.length - 1]) } }, h('b', i.title), i.body))) : null,
      h('div.ins-s', h('h6', 'Key'), h('div.tbb-key', h('div', h('span.k-b'), 'a component and its neighbours, in glass'), h('div', h('span.k-s'), 'bridged to another note'), h('div', h('span.k-l'), 'the bridge, to that note’s bubble'), h('div', h('span.k-w'), 'a connection between notes'), h('div', h('span.k-a'), 'a barrier resolved or a takeaway reached, through another term'))),
      h('div.ins-s.tbb-acts', fam.length > 1 ? h('label.switch', h('input', { type: 'checkbox', checked: st.imported, on: { change: e => { st.imported = e.target.checked; App._mounted = false; App.refresh(); } } }), 'with linked projects') : null,
        h('button.btn.sm', { on: { click: () => { const others = DB.where('projects', p => p.id !== t.projectId); if (!others.length) return toast('No other project to import into'); pickModal('Import “' + t.label + '” into…', 'The imported term stays linked to this one, so the lens can chain across both projects.', others.map(p => ({ label: p.name, run: () => { M.importTerm(t.id, p.id); toast('Imported into ' + p.name); } }))); } } }, 'Import into…'),
        h('button.btn.sm', { on: { click: () => Exporter.chain(t.id, { scope: 'project', scopeId: t.projectId, imported: st.imported }) } }, 'Export chain')),
      TERMLIT.counted() ? null : (n => n ? h('div.ins-s.tiny.muted', plural(n, 'mention') + ' in lit reviews ' + (n === 1 ? 'is' : 'are') + ' not shown here — Settings → Features → Terms counts them.') : null)((IX.termOcc.get(t.id) || []).filter(o => TERMLIT.is(M.doc(o.docId))).length));
    return side;
  },
  synRow(s, A, st, draw) {
    const on = st.pick.includes(s.t), many = on && st.pick.length > 1, mod = e => e.ctrlKey || e.metaKey || e.shiftKey, x = M.term(s.t);
    const tog = e => { const add = mod(e); if (add) { st.pick = on ? st.pick.filter(y => y !== s.t) : [...st.pick, s.t]; } else st.pick = st.pick.length === 1 && on ? [] : [s.t]; draw(); LensView.applyPick(); const r = $(`.tbb-sr[data-t="${s.t}"]`); if (r) r.focus({ preventScroll: true }); };
    return h('div.tbb-sr' + (on ? '.on' : ''), { role: 'button', tabindex: '0', 'aria-pressed': String(on), 'data-t': s.t, title: 'Click to pick · Ctrl+click (⌘+click) to pick several',
      on: { click: e => { if (e.target.closest('.tbb-lens')) return; tog(e); }, keydown: e => { if ((e.key === ' ' || e.key === 'Enter') && e.target === e.currentTarget) { e.preventDefault(); tog(e); } },
        mouseenter: () => s.arcs.forEach(a => LensView.litArc(a, true)), mouseleave: () => s.arcs.forEach(a => LensView.litArc(a, false)) } },
      h('span.nm', h('span.term-demo', x.label)),
      h('button.tbb-lens', { type: 'button', title: many ? 'Lens: “' + A.t.label + '” with the ' + st.pick.length + ' picked terms' : 'Lens: “' + A.t.label + '” with “' + x.label + '”', 'aria-label': many ? 'Lens on the picked terms' : 'Lens on ' + x.label,
        on: { click: e => { e.stopPropagation(); App.go(LensView.hash(A.t.id, many ? st.pick : [s.t], A.all)); } } }, '◎'),
      h('div.ks', ...s.arcs.map(a => h('span.arc', { title: 'It joins ' + (a.k === 'ot' ? 'an observation' : 'a barrier') + ' on “' + A.t.label + '” to its ' + TARC.K[a.k][1] }, TARC.dot(a.k), TARC.K[a.k][0] + ' → ' + TARC.K[a.k][1])), ...Object.entries(s.kinds).map(([k, n]) => h('span', k + ' ' + n))));
  },
  applyPick() {
    const F = LensView._field, A = LensView._A, D = LensView._D; if (!F || !A) return; const st = LensView.st(A.t.id), lensSet = new Set(A.others), act = st.pick.length > 0 && (st.pick.length !== lensSet.size || st.pick.some(x => !lensSet.has(x)));
    F.classList.toggle('picking', act);
    (LensView._els || new Map()).forEach((el, id) => { const b = D.B.find(o => o.id === id); el.classList.toggle('meet', act && !!b && st.pick.some(x => D.uses(b.id, x) || b.inside.some(n => D.uses(n.id, x)))); });
  },
  lite(id, on) { const D = LensView._D, b = D && D.where(id), el = b && LensView._els && LensView._els.get(b.id); if (el) el.classList.toggle('lit', on); },
  /* ---------- the chain board, kept for Export chain (21-export) ---------- */
  TERMCOL: ['#E07A1F', '#3A6FE0', '#2E9E5B', '#B5179E', '#C9A227', '#0FA3B1'],
  termsIn: b => [...new Set(((b && b.body && b.body.marks) || []).filter(m => m.type === 'term' && m.ref).map(m => m.ref))],
  /** The lens as boxes: every component in full, under a header naming its note; lanes by theme or note, columns by day.
   *  Terms sitting in the same boxes are pulled in too, their connections drawn in their own colour. */
  board(G, st, t, P) {
    const el = h('div.lensboard'), svgNS = 'http://www.w3.org/2000/svg';
    if (!G.nodes.length) { el.append(h('div.empty', { style: { padding: '60px' } }, 'No occurrences in this scope.')); return { el, layout: () => [600, 300], legend: null }; }
    st.show = st.show || {};
    // terms that share boxes with this one, most shared first
    const share = new Map(); G.nodes.forEach(n => LensView.termsIn(n.b).forEach(id => { if (id !== t.id && M.term(id)) share.set(id, (share.get(id) || 0) + 1); }));
    const others = [...share.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 6);
    others.forEach((id, i) => { if (st.show[id] == null) st.show[id] = i < 3; });
    const color = id => id === t.id ? null : LensView.TERMCOL[others.indexOf(id) % LensView.TERMCOL.length];
    const nodes = new Map(), edges = [];
    G.nodes.forEach(n => nodes.set(n.id, { id: n.id, b: n.b, via: n.via, terms: new Set([t.id]) }));
    G.edges.forEach(e => edges.push(Object.assign({}, e, { term: t.id })));
    others.filter(id => st.show[id]).forEach(id => { const G2 = IX.termGraph(id, st.scope, st.scopeId, st.imported);
      G2.nodes.forEach(n => { const x = nodes.get(n.id); if (x) x.terms.add(id); else nodes.set(n.id, { id: n.id, b: n.b, via: n.via, terms: new Set([id]), second: true }); });
      G2.edges.forEach(e => edges.push(Object.assign({}, e, { term: id }))); });
    const list = [...nodes.values()].filter(n => n.b).map(n => Object.assign(n, { t: +new Date(M.blockTime(n.b)) })).sort((a, b) => a.t - b.t);
    const laneOf = n => { const d = M.doc(n.b.docId); if (st.scope === 'project') return d.projectId !== t.projectId ? 'P:' + d.projectId : (d.themeId || 'pw:' + d.projectId); if (st.scope === 'theme') return d.id; return d.id; };
    const laneName = k => k.startsWith('P:') ? 'Linked · ' + (M.project(k.slice(2)) || {}).name : k.startsWith('pw:') ? 'Project-wide' : (M.theme(k) ? M.theme(k).name : M.doc(k) ? M.doc(k).title : k);
    list.forEach(n => n.lane = laneOf(n)); const lanes = [...new Set(list.map(n => n.lane))];
    // boxes
    for (const n of list) {
      const d = M.doc(n.b.docId), kinds = IX.kindsOf(n.b), k = kinds[0], ed = h('div.ed.lb-ed'); ED.render(ed, n.b); ed.contentEditable = 'false';
      const tchips = LensView.termsIn(n.b).filter(id => M.term(id)).map(id => { const c = color(id); return h('button.lb-term' + (id === t.id ? '.main' : ''), { style: c ? { '--tc': c } : {}, title: id === t.id ? 'This term' : (st.show[id] ? 'Hide' : 'Show') + ' the connections of “' + M.term(id).label + '”', on: { click: e => { e.stopPropagation(); if (id === t.id) return; if (others.includes(id)) { st.show[id] = !st.show[id]; App._mounted = false; App.refresh(); } else App.go('#/lens/' + id); } } }, M.term(id).label); });
      const box = h('div.lbox.nopan' + (n.via ? '.via' : '') + (n.second ? '.second' : ''), { 'data-id': n.id, style: { '--kc': k ? `var(--k-${k})` : 'var(--rule-2)', '--tc': n.second ? color([...n.terms][0]) : null } },
        h('button.lb-h', { title: 'Open “' + d.title + '” at this component · Alt+click: beside', on: { click: e => { e.stopPropagation(); App.jump(n.id, e); } } }, typechip(d.type), h('span.lb-title', d.title), h('span.lb-go', '↗')),
        h('div.lb-meta', kinds.map(x => kchip(x)), n.via ? h('span.pill', 'via') : null, h('span.spacer'), h('span.mono.tiny.muted', fmtDay(n.t) + ' ' + fmtTime(n.t))),
        n.b.label ? h('div.lb-label', n.b.label) : null, ed,
        tchips.length ? h('div.lb-terms', tchips) : null,
        (() => { const rg = !n.second && REGION.of(n.id), peers = rg ? REGION.peers(n.id) : []; if (!peers.length) return null;
          return h('div.lb-region', { style: { '--rg': rg.r.color || REGION.COLORS[0] }, title: 'Secondary sources: the other components in the same region' }, h('div.lb-rh', '◰ ', h('b', rg.r.name), h('span', ' · same region · ' + plural(peers.length, 'secondary source'))),
            peers.slice(0, 6).map(p => h('a.lb-rm', { on: { click: e => { e.stopPropagation(); App.jump(p.id, e); } } }, IX.kindsOf(p)[0] ? kchip(IX.kindsOf(p)[0]) : null, ' ', h('b', M.blockName(p)), ' ', h('span', snippet(p.body.text || '', 70)))), peers.length > 6 ? h('div.tiny.muted', '+ ' + (peers.length - 6) + ' more') : null); })());
      box.addEventListener('click', e => { if (e.target.closest('.ln,.ct,.mx')) return; App.jump(n.id, e); });
      n.el = box; el.append(box);
    }
    const svg = document.createElementNS(svgNS, 'svg'); svg.classList.add('lb-wires'); el.prepend(svg);
    const legend = others.length ? h('div.ins-s', h('h6', 'Terms in the same boxes'), h('div.tiny.muted', { style: { marginBottom: '6px' } }, 'Their own connections are drawn in their colour.'),
      others.map(id => h('label.lb-leg', h('input', { type: 'checkbox', checked: !!st.show[id], on: { change: e => { st.show[id] = e.target.checked; App._mounted = false; App.refresh(); } } }), h('i', { style: { background: color(id) } }), h('span.term-demo', M.term(id).label), h('span.tiny.muted', plural(share.get(id), 'shared box')), h('a.tiny', { on: { click: e => { e.preventDefault(); App.go('#/lens/' + id); } } }, 'lens ↗')))) : null;
    const layout = () => {
      const BW = 300, GX = 64, LW = 150, TOP = 40, PADY = 18;
      let col = -1, colDay = null, used = new Set(); list.forEach(n => { const dd = localDate(n.t); if (dd !== colDay || used.has(n.lane)) { col++; colDay = dd; used = new Set(); } used.add(n.lane); n.col = col; });
      const laneH = lanes.map(l => Math.max(80, ...list.filter(n => n.lane === l).map(n => n.el.offsetHeight))), laneY = []; let y = TOP; lanes.forEach((l, i) => { laneY.push(y); y += laneH[i] + PADY * 2; });
      const W = LW + (col + 1) * (BW + GX) + 40, H = y;
      $$('.lb-lane,.lb-day', el).forEach(x => x.remove());
      lanes.forEach((l, i) => el.prepend(h('div.lb-lane' + (i % 2 ? '.alt' : ''), { style: { top: laneY[i] + 'px', height: laneH[i] + PADY * 2 + 'px', width: W + 'px' } }, h('span', snippet(laneName(l), 26)))));
      let prev = ''; list.forEach(n => { n.x = LW + n.col * (BW + GX); n.y = laneY[lanes.indexOf(n.lane)] + PADY; n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px'; n.el.style.width = BW + 'px';
        const dd = localDate(n.t); if (dd !== prev) { el.append(h('div.lb-day', { style: { left: n.x + 'px', height: H + 'px' } }, h('span', fmtDay(n.t)))); prev = dd; } });
      // wires: this term's in its usual inks, the others' in their colour
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      let html = '<defs>' + ['mag', 'teal', 'ink-3'].map(c => `<marker id="lm-${c}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--${c})"/></marker>`).join('') + others.map((id, i) => `<marker id="lm-t${i}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${color(id)}"/></marker>`).join('') + '</defs>';
      const pairN = {};
      edges.forEach((e, i) => { const a = nodes.get(e.from), b = nodes.get(e.to); if (!a || !b || !a.el || !b.el) return;
        const pk = [e.from, e.to].sort().join('|'), off = (pairN[pk] = (pairN[pk] || 0) + 1) - 1, oy = off * 7;
        const ah = a.el.offsetHeight, bh = b.el.offsetHeight, fwd = b.x > a.x + 10, back = b.x < a.x - 10;
        let d; if (fwd) { const x1 = a.x + BW, y1 = a.y + Math.min(40, ah / 2) + oy, x2 = b.x, y2 = b.y + Math.min(40, bh / 2) + oy; d = `M${x1},${y1} C${x1 + GX * .7},${y1} ${x2 - GX * .7},${y2} ${x2 - 2},${y2}`; }
        else if (back) { const x1 = a.x, y1 = a.y + 30 + oy, x2 = b.x + BW, y2 = b.y + 30 + oy; d = `M${x1},${y1} C${x1 - GX},${y1} ${x2 + GX},${y2} ${x2 + 2},${y2}`; }
        else { const down = b.y > a.y, x1 = a.x + BW - 30 - oy, y1 = down ? a.y + ah : a.y, x2 = b.x + BW - 30 - oy, y2 = down ? b.y : b.y + bh; d = `M${x1},${y1} C${x1 + 60},${y1 + (down ? 40 : -40)} ${x2 + 60},${y2 + (down ? -40 : 40)} ${x2},${y2 + (down ? -2 : 2)}`; }
        const main = e.term === t.id, oi = others.indexOf(e.term), stroke = main ? (e.type === 'r' ? 'var(--teal)' : e.type === 's' ? 'var(--ink-3)' : 'var(--mag)') : color(e.term), mk = main ? (e.type === 'r' ? 'lm-teal' : e.type === 's' ? 'lm-ink-3' : 'lm-mag') : 'lm-t' + oi;
        html += `<path class="lw ${e.type}${main ? '' : ' other'}" d="${d}" style="stroke:${stroke}" marker-end="url(#${mk})" data-ei="${i}"><title>${esc((main ? '' : '“' + M.term(e.term).label + '” · ') + (e.type === 's' ? 'suggested: ' + e.rel : e.type === 'v' ? 'via ' + (e.via || []).length + ' component(s)' : (REL[e.rel] || { label: e.rel || 'connection' }).label))}</title></path>`; });
      svg.innerHTML = html; el.style.width = W + 'px'; el.style.height = H + 'px';
      return [W, H];
    };
    svg.addEventListener('click', e => { const p = e.target.closest('path.lw.s'); if (p) { const ed = edges[+p.dataset.ei]; LensView.suggest(ed, e.clientX, e.clientY + 10); } });
    return { el, layout, legend };
  },
  svg(G, st, t) {
    const ns = 'http://www.w3.org/2000/svg';
    if (!G.nodes.length) return h('div.empty', { style: { padding: '60px' } }, 'No occurrences in this scope.');
    const laneOf = n => { const d = M.doc(n.b.docId); if (st.scope === 'project') return d.projectId !== t.projectId ? 'P:' + d.projectId : (d.themeId || 'pw:' + d.projectId); return d.id; };
    const laneName = k => k.startsWith('P:') ? 'Linked · ' + (M.project(k.slice(2)) || {}).name : k.startsWith('pw:') ? 'Project-wide' : (M.theme(k) ? M.theme(k).name : M.doc(k) ? M.doc(k).title : k);
    const nodes = G.nodes.map(n => Object.assign(n, { t: +new Date(M.blockTime(n.b)), lane: laneOf(n), kinds: IX.kindsOf(n.b) })).sort((a, b) => a.t - b.t);
    const lanes = [...new Set(nodes.map(n => n.lane))];
    const LW = 168, CW = 168, LH = 84, NW = 140, NH = 52, TOP = 34;
    let col = -1, colDay = null, used = new Set();
    nodes.forEach(n => { const dd = localDate(n.t); if (dd !== colDay || used.has(n.lane)) { col++; colDay = dd; used = new Set(); } used.add(n.lane); n.x = LW + 14 + col * CW; n.y = TOP + lanes.indexOf(n.lane) * LH + (LH - NH) / 2; });
    const W = LW + 28 + (col + 1) * CW, H = TOP + lanes.length * LH + 10;
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
    let html = '<defs><marker id="la" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mag)"/></marker><marker id="lt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--teal)"/></marker><marker id="lg" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink-3)"/></marker></defs>';
    lanes.forEach((l, i) => { html += `<g class="lane"><rect x="0" y="${TOP + i * LH}" width="${W}" height="${LH - 2}" opacity="${i % 2 ? 0.35 : 0.7}"/><text x="12" y="${TOP + i * LH + LH / 2 + 3}">${esc(snippet(laneName(l), 24))}</text></g>`; });
    let prevDay = ''; html += '<g class="ax">';
    nodes.forEach(n => { const dd = localDate(n.t); if (dd !== prevDay) { html += `<line x1="${n.x}" y1="${TOP - 6}" x2="${n.x}" y2="${H}"/><text x="${n.x + 3}" y="${TOP - 12}">${esc(fmtDay(n.t))}</text>`; prevDay = dd; } });
    html += '</g>';
    const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
    G.edges.forEach((e, i) => { const a = pos[e.from], b = pos[e.to]; if (!a || !b) return;
      const fwd = b.x >= a.x, x1 = fwd ? a.x + NW : a.x + NW / 2, y1 = fwd ? a.y + NH / 2 : a.y + NH, x2 = fwd ? b.x : b.x + NW / 2, y2 = fwd ? b.y + NH / 2 : b.y + NH;
      const c = fwd ? `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2 - 2},${y2}` : `M${x1},${y1} C${x1},${y1 + 50} ${x2},${y2 + 50} ${x2},${y2 + 2}`;
      const cls = e.type === 'r' ? 'e r' : 'e ' + e.type, mk = e.type === 's' ? 'lg' : e.type === 'r' ? 'lt' : 'la';
      html += `<path class="${cls}" d="${c}" marker-end="url(#${mk})" data-ei="${i}" ${e.type === 'r' ? 'style="stroke:var(--teal)"' : ''}><title>${esc(e.type === 's' ? 'suggested: ' + e.rel : e.type === 'v' ? 'via ' + e.via.length + ' component(s)' : (REL[e.rel] || { label: e.rel }).label)}</title></path>`; });
    nodes.forEach(n => { const k = n.kinds[0], d = M.doc(n.b.docId);
      html += `<g class="node${n.via ? ' via' : ''}" data-id="${n.id}" transform="translate(${n.x},${n.y})"><rect width="${NW}" height="${NH}" rx="6" ${k ? `style="stroke:var(--k-${k})"` : ''}/>` +
        (k ? `<rect width="4" height="${NH}" rx="2" style="fill:var(--k-${k});stroke:none"/>` : '') +
        `<text class="nk" x="10" y="14" style="fill:${k ? `var(--k-${k})` : 'var(--ink-3)'}">${esc(n.kinds.map(x => KIND[x].label).join(' · ') || (n.via ? 'via' : 'mention'))}</text>` +
        `<text x="10" y="30">${esc(snippet(M.blockName(n.b), 22))}</text><text x="10" y="44" style="fill:var(--ink-3);font-size:9.5px">${esc(snippet((PROFILE[d.type] || {}).label + ' · ' + d.title, 26))}</text></g>`; });
    svg.innerHTML = html;
    svg.addEventListener('click', e => {
      const n = e.target.closest('.node'); if (n) return App.openBlock(n.dataset.id);
      const p = e.target.closest('path.e.s'); if (p) { const ed = LensView._G.edges[+p.dataset.ei]; LensView.suggest(ed, e.clientX, e.clientY + 10); }
    });
    return svg;
  },
  suggest(ed, x, y) {
    const A = M.block(ed.from), B = M.block(ed.to);
    popover(x, y, [h('h5', 'Suggested connection'), h('div.serif', { style: { fontSize: '13.5px' } }, `“${snippet(M.blockName(A), 40)}” → “${snippet(M.blockName(B), 40)}”`),
      h('div.tiny.muted', { style: { margin: '6px 0 10px' } }, `Same term, ${ed.rel.replace('→', ' then ')}, ${Math.round((+new Date(M.blockTime(B)) - +new Date(M.blockTime(A))) / 864e5)} days apart, nothing connects them yet.`),
      h('div.row', RELATIONS.filter(r => ['leads', 'causes', 'resolves', 'supports'].includes(r.id)).map(r => h('button.btn.sm', { on: { click: () => { closePop(); M.wire(A.id, B.id, r.id, true); DB.put('verdicts', { id: ed.key, verdict: 'accepted', at: isoLocal(new Date()) }); toast('Connected'); } } }, r.label)),
        h('button.btn.sm.ghost', { on: { click: () => { closePop(); DB.put('verdicts', { id: ed.key, verdict: 'dismissed', at: isoLocal(new Date()) }); changed(); } } }, 'Dismiss'))]);
  },
  occTable(occ, st) {
    const rows = occ.map(o => ({ o, b: M.block(o.blockId) })).filter(x => x.b).sort((a, b) => +new Date(M.blockTime(b.b)) - +new Date(M.blockTime(a.b)));
    return h('div.list', h('table.t', h('thead', h('tr', h('th', 'When'), h('th', 'Structures'), h('th', 'Component'), h('th', 'Note · theme'), h('th', 'Context'))),
      h('tbody', rows.map(({ o, b }) => { const d = M.doc(b.docId), th = d.themeId && M.theme(d.themeId), s = b.stamp.sessionId && M.session(b.stamp.sessionId);
        return h('tr', { style: { cursor: 'pointer' }, on: { click: () => App.openBlock(b.id) } },
          h('td.mono', { style: { whiteSpace: 'nowrap', fontSize: '11.5px' } }, fmtDay(M.blockTime(b)), ' ', fmtTime(M.blockTime(b))),
          h('td', o.itemIds.map(M.item).filter(Boolean).map(it => kchip(it.kind)), o.direct ? null : h('span.pill', 'carried')),
          h('td', M.blockName(b)), h('td', h('span', typechip(d.type), ' ', d.title), h('div.tiny.muted', th ? th.name : 'project-wide')),
          h('td.tiny.muted', s ? `during timer · +${fmtDur(b.stamp.offsetMs || 0)}` : b.manualSec ? 'manual ' + fmtDur(b.manualSec * 1000) : 'stamped')); }))));
  },
};
VIEWS.terms = TermsView; VIEWS.lens = LensView;
{
  // the Terms page: / finds a term (the navigation bar's / everywhere else); on a term, Esc lets the picked synergies go
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target, typing = t && t.closest && t.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]');
    if (e.key === '/' && App.route.name === 'terms' && !typing && !$('.ovl') && !$('.pop')) { const q = $('#tl-q'); if (q) { e.preventDefault(); e.stopImmediatePropagation(); q.focus(); q.select(); } return; }
    if (e.key === 'Escape' && App.route.name === 'lens' && !typing && !$('.ovl') && !$('.pop') && LensView._A) { const A = LensView._A, st = LensView.st(A.t.id); if (st.pick.length !== A.others.length || st.pick.some(x => !A.others.includes(x))) { st.pick = A.others.slice(); LensView._drawSyn && LensView._drawSyn(); LensView.applyPick(); } }
  }, true);
  // a term's bubbles follow the window's width
  addEventListener('resize', debounce(() => { if (App.route.name === 'lens' && LensView._field && LensView._field.isConnected) { const w = LensView._field.clientWidth; if (Math.abs(w - (LensView._w || 0)) > 4) { LensView._w = w; LensView.layout(false); } } }, 160));
}
