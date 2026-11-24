/* ==========================================================================
   15e · Synthesis notes (V4.16). Gabe: "Synthesis notes are for each
   experiment or experiment iteration batch (e.g., […] Run 2 and […] Run 3
   link to the same Synthesis note. Synthesis notes live in their own
   category in the Portfolio in the same area as Notes and Lit Reviews, but
   above them." — and: "The synthesis component automatically created in a
   note is now attached to the initial note component, and appears as legend
   text underneath its note in the Portfolio view. This synthesis showing can
   be disabled in the Portfolio tab."
   • One Synthesis per series (13c V4.15: `series`, `run`): a run's Next from
     its Analysis opens the series' Synthesis and adds the run to it
     (`synthRuns`, the runs' chain ids) — it gathers from every run it covers
     (SYNTH.others), says which in its "notes to synthesize" and in each run's
     stage strip. A lone experiment keeps its own, as before. The first
     Synthesis of a series is titled with the series' name ("… Run 2" → "…").
   • The Portfolio: Syntheses, a category above Notes in each theme (the
     right-hand column: Syntheses then Notes; data-g "syn") and a choice in
     its switch before Notes (seg key "syn"); a Synthesis note leaves its
     experiment's row for it.
   • A note's "what this note adds up to" (12-doc synthBox) is drawn inside
     its first block (`.hsynth` in the head box), so it moves with it; in the
     Portfolio its words are a muted line under the note's row — off from the
     Portfolio's own switch, or Settings → Synthesis notes.
   Settings → Features → Canvas & notes → Synthesis notes (`synthnotes`):
   off, all three go back to how they were.
   ========================================================================== */
const SYNN = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('synthnotes'),
  legend: () => SYNN.on() && (typeof FEAT === 'undefined' || FEAT.tune('synthnotes', 'legend') !== false),
  /** The runs (chain ids) a Synthesis covers: those it was given, else its own experiment's. */
  runsOf: s => Array.isArray(s.synthRuns) && s.synthRuns.length ? s.synthRuns : s.chain ? [s.chain] : [],
  /** The Synthesis of a series (the first made, if two were). */
  noteOf: series => DB.where('documents', x => x.type === 'reflection' && !x.deleted && x.series === series).sort((a, b) => String(a.created).localeCompare(String(b.created)))[0] || null,
  /** A run's notes other than Synthesis ones, in order. */
  runNotes: ch => DB.where('documents', x => x.chain === ch && !x.deleted && !x.archived && x.type !== 'reflection').sort((a, b) => String(a.created).localeCompare(String(b.created))),
  /** The runs a Synthesis covers, by their first note: [{ chain, doc, name, run }], in run order. */
  runs(s) { return SYNN.runsOf(s).map(ch => { const L = SYNN.runNotes(ch); return L[0] ? { chain: ch, doc: L[0], name: CHAIN.name(L[0]), run: CHAIN.runOf(L[0]) } : null; }).filter(Boolean).sort((a, b) => a.run - b.run); },
  /** The note a run's Synthesis stage leads to: the series' Synthesis (null for a lone experiment, or when it is off). */
  seriesNext(d) { if (!SYNN.on() || !d || !d.series || SYNTH.is(d)) return null; const p = prof(d.type); return p && p.next === 'reflection' ? SYNN.noteOf(d.series) : null; },
  /** The Portfolio's last split (its sections are drawn one at a time: split, then its groups). */
  _last: null, _n: null,
};
{
  const stop = e => e.stopPropagation();
  /* ---------- one Synthesis per series ---------- */
  const nx = CHAIN.nextOf; CHAIN.nextOf = function (d) { const r = nx.apply(this, arguments); if (r) return r; try { return SYNN.seriesNext(d); } catch (e) { return null; } };
  const adv = CHAIN.advance; CHAIN.advance = function (d, e) {
    let s = null; try { s = SYNN.seriesNext(d); } catch (x) { }
    if (s && !SYNN.runsOf(s).includes(d.chain)) {   // Run 3 comes to the series' Synthesis: it covers Run 3 from now on, and gathers it
      const cur = M.doc(s.id); cur.synthRuns = [...SYNN.runsOf(cur), d.chain]; DB.put('documents', cur); changed();
      setTimeout(() => { const g = SYNTH.gather(M.doc(s.id), true); toast('Run ' + CHAIN.runOf(d) + ' joins the series’ synthesis' + (g ? ' — ' + plural(g, 'thing') + ' gathered' : ''), 3200); }, 0);
    }
    const r = adv.apply(this, arguments);
    try {   // the first Synthesis of a series: the series' own, titled with its name
      const n = !s && SYNN.on() && d && d.series ? CHAIN.nextOf(d) : null;
      if (n && SYNTH.is(n) && !Array.isArray(n.synthRuns)) { const cur = M.doc(n.id); cur.series = d.series; cur.synthRuns = [d.chain]; if (cur.title === CHAIN.name(d)) cur.title = CHAIN.baseOf(CHAIN.name(d)) || cur.title; DB.put('documents', cur); if (CHAIN.seen) CHAIN.seen(cur); changed(); }
    } catch (x) { console.warn('[series synthesis]', x); }
    return r;
  };
  // it gathers from every run it covers
  const so = SYNTH.others; SYNTH.others = function (d) {
    const L = so.apply(this, arguments); if (!SYNN.on() || !d || !SYNTH.is(d) || !d.series) return L;
    const seen = new Set([d.id, ...L.map(x => x.id)]);
    SYNN.runsOf(d).forEach(ch => SYNN.runNotes(ch).forEach(x => { if (!seen.has(x.id)) { seen.add(x.id); L.push(x); } }));
    return L;
  };
  // "notes to synthesize" says which runs, and lists the other runs' notes
  const ob = WIDGETS.synthof.body; WIDGETS.synthof.body = function (b, d) {
    const el = ob.apply(this, arguments);
    try {
      const s = M.doc(b.docId) || d; if (!SYNN.on() || !s || !s.series || !el) return el; const R = SYNN.runs(s); if (!R.length) return el;
      const head = el.querySelector('.sy-h'); if (head) head.textContent = 'Notes this synthesizes';
      const line = h('div.sy-runs', h('span', 'The series’ synthesis — it covers '), R.map((r, i) => [i ? (i === R.length - 1 ? ' and ' : ', ') : '', h('a', { href: '#/doc/' + r.doc.id, title: 'Open it', on: { pointerdown: stop } }, 'Run ' + r.run)]), '.');   // V4.103: by number (V4.97)
      if (head) head.after(line); else el.prepend(line);
      let list = el.querySelector('.sy-list'); if (!list) { list = h('div.sy-list'); line.after(list); }
      const shown = new Set([...list.querySelectorAll('a.sy-t')].map(a => (a.getAttribute('href') || '').replace('#/doc/', '')));
      R.filter(r => r.chain !== s.chain).forEach(r => SYNN.runNotes(r.chain).forEach(x => { if (shown.has(x.id)) return; shown.add(x.id);
        list.append(h('div.sy-row', typechip(x.type), h('a.sy-t', { href: '#/doc/' + x.id, title: 'Open it', on: { pointerdown: stop } }, x.title || 'Untitled'), h('span.mono.tiny.muted', fmtDay(x.created)), h('span.spacer'), h('span.tiny.muted', 'Run ' + r.run))); }));
    } catch (x) { console.warn('[series synthesis]', x); }
    return el;
  };
  // each run's stage strip leads to the series' Synthesis
  const st = CHAIN.strip; CHAIN.strip = function (d) {
    const el = st.apply(this, arguments);
    try { const s = SYNN.seriesNext(d) || (SYNN.on() && d && d.series && !SYNTH.is(d) ? SYNN.noteOf(d.series) : null);
      if (el && s && s.chain !== d.chain && SYNN.runsOf(s).includes(d.chain)) el.append(h('span.cs-sep', '›'), h('a.cs.cs-syn', { title: '“' + s.title + '” — the series’ synthesis · Alt+click: beside', on: { click: e => App.jump(s.id, e, true) } }, prof('reflection').stage || 'Synthesis')); } catch (x) { }
    return el;
  };

  /* ---------- a note's synthesis, in its first block ---------- */
  const sbx = DocView.synthBox, hbx = DocView.headBox;
  DocView.synthBox = function () { return SYNN.on() ? h('div.synth-at', { hidden: true }) : sbx.apply(this, arguments); };
  DocView.headBox = function (d) {
    const el = hbx.apply(this, arguments); if (!SYNN.on() || !el || !d) return el;
    try { const box = sbx.call(this, M.doc(d.id) || d, []), sec = h('div.hsynth', { title: '' }, ...[...box.childNodes]); el.classList.add('has-synth'); el.append(sec); } catch (x) { console.warn('[note synthesis]', x); }
    return el;
  };

  /* ---------- the Portfolio: Syntheses, and each note's synthesis under it ---------- */
  const sp = PFLIST.split; PFLIST.split = function (docs, order) {
    if (!SYNN.on()) { const r0 = sp.apply(this, arguments); r0.syns = []; SYNN._last = r0; return r0; }
    const syn = docs.filter(SYNTH.is), r = sp.call(this, docs.filter(d => !SYNTH.is(d)), order);
    r.syns = PFKIT.entries(syn, order).flatMap(e => e.doc ? [e] : e.docs.map(doc => ({ doc })));
    SYNN._last = r; return r;
  };
  const cn = PFLIST.counts; PFLIST.counts = function (I, th) {
    const n = cn.apply(this, arguments); let syn = 0;
    if (SYNN.on()) I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => { syn += c.docs.filter(SYNTH.is).length; });
    n.syn = syn; n.all += syn; SYNN._n = n; return n;
  };
  SYNN.group = (E, row) => h('div.pf-g.pf-gsyn', { 'data-g': 'syn' }, h('div.pf-gl', h('span', 'Syntheses'), h('span.pf-c', E.length)), E.map(e => PFLIST.entry(e, row)));
  // in each theme: Experiments | Syntheses above Notes (one column, so the two-column grid keeps Experiments beside them)
  const gr = PFLIST.group; PFLIST.group = function (label, E, row) {
    const el = gr.apply(this, arguments); const S = SYNN._last;
    if (label !== 'Notes' || !SYNN.on() || !S || !S.syns || !S.syns.length) return el;
    return h('div.pf-gcol', SYNN.group(S.syns, row), el);
  };
  // the switch's Syntheses: only them, theme by theme
  const it = PFLIST.items; PFLIST.items = function (row, I, type, th) {
    if (type !== 'syn' || !SYNN.on()) return it.apply(this, arguments);
    const order = row.p ? PFKIT.sortOf(row.p.id) : 'date', out = [], add = el => { el.style.setProperty('--i', out.length); out.push(el); };
    I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => { const S = PFLIST.split(c.docs, order); if (S.syns.length) add(PFLIST.section(row, c, h('div.pf-flat', S.syns.map(e => PFLIST.entry(e, row))))); });
    if (!out.length) add(h('div.pf-none', th !== 'all' ? 'No synthesis in this theme yet' : 'No synthesis here yet — Next from an Analysis makes one, or /synthesis'));
    return out;
  };
  const sg = PFLIST.seg; PFLIST.seg = function (opts, cur, onPick, label) {
    if (SYNN.on() && Array.isArray(opts) && opts.some(o => o[0] === 'notes') && opts.some(o => o[0] === 'exp') && !opts.some(o => o[0] === 'syn')) {
      const i = opts.findIndex(o => o[0] === 'notes'); opts = opts.slice(); opts.splice(i, 0, ['syn', 'Syntheses', SYNN._n ? SYNN._n.syn : null]);
    }
    return sg.call(this, opts, cur, onPick, label);
  };
  const nt = PFLIST.note; PFLIST.note = function (d) {
    const el = nt.apply(this, arguments);
    try { const t = SYNN.legend() && d ? String((d.synthesis && d.synthesis.text) || '').trim() : ''; if (t) { el.classList.add('has-leg'); el.append(h('div.pf-leg', { title: 'What this note adds up to' }, snippet(t.replace(/\s+/g, ' '), 240))); } } catch (x) { }
    return el;
  };
  // the Portfolio's own switch for those lines, beside its switch and the theme chips
  const dt = PortfolioView.detail; PortfolioView.detail = function () {
    const body = dt.apply(this, arguments);
    try { const ctl = body && body.querySelector('.pf-ctl'); if (ctl && SYNN.on()) { const onNow = SYNN.legend();
      ctl.append(h('button.pf-legtog', { type: 'button', 'aria-pressed': String(onNow), title: onNow ? 'Hide what each note adds up to under its row' : 'Show what each note adds up to under its row',
        on: { click: () => { FEAT.setTune('synthnotes', 'legend', !SYNN.legend()); App.refresh(); } } }, h('span.pf-legd', { 'aria-hidden': 'true' }), 'Syntheses under notes')); } } catch (x) { }
    return body;
  };
}
