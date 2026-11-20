/* ==========================================================================
   15g · Milestones (V4.18). Gabe: "Change the aims in a theme to milestones,
   which are large overarching goals that are measured in completeness via
   deliverables: either a synthesis note or a specific set of results,
   takeaways, verdicts, etc…"
   - What was an aim is a Milestone: a large goal of a theme. What were its
     weighted milestones are its Deliverables, and the milestone's
     completeness is the share of them delivered (by weight when a weight was
     given, equally otherwise).
   - A deliverable is either a Synthesis note (linked; delivered once its
     synthesis is written — Settings can count the link alone) or a set of
     components of chosen kinds (results, takeaways, verdicts, insights,
     claims, decisions), delivered when as many as it asks for are picked and
     still there. `metAt` is stamped when a deliverable is delivered and
     cleared when it no longer is, so everything that read an aim's milestones
     (the weekly review's boost, the project page's bars, views) keeps working.
   - Data: the `aims` store and its record are kept (sync); a deliverable is a
     milestone row with { type: 'synthesis' | 'set', synth, kinds, need, refs }
     beside its { label, weight, metAt, evidenceRef }. An old row (no type) is
     read as a set of one, its evidence its pick; one marked met without
     evidence stays met.
   - aimEl / newAimDialog (15-portfolio) are replaced; the theme page, the
     project page and the Portfolio say Milestone; Settings → Milestones.
   ========================================================================== */
const MILE = {
  KINDS: [['result', 'Results'], ['takeaway', 'Takeaways'], ['verdict', 'Verdicts'], ['insight', 'Insights'], ['claim', 'Claims'], ['decision', 'Decisions']],
  /** Which components and structures count as each kind of a set. */
  OF: { result: { ck: ['result'], it: ['result', 'evidence'] }, takeaway: { ck: ['insight'], it: ['takeaway'] }, verdict: { ck: ['verdict'], it: [] }, insight: { ck: ['insight'], it: [] }, claim: { ck: [], it: ['claim'] }, decision: { ck: [], it: ['decision'] } },
  FLAG: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"/></svg>',
  on: () => typeof FEAT === 'undefined' || FEAT.on('milestones'),
  /** Does a linked Synthesis note need its synthesis written to count? (Settings) */
  needsWritten: () => { let v = 'written'; try { v = FEAT.tune('milestones', 'synth') || 'written'; } catch (e) { } return v !== 'linked'; },
  type: m => m.type || 'set',
  refs: m => Array.isArray(m.refs) ? m.refs : m.evidenceRef ? [m.evidenceRef] : [],
  kinds: m => Array.isArray(m.kinds) && m.kinds.length ? m.kinds : ['result', 'takeaway', 'claim'],
  need: m => Math.max(1, +m.need || 1),
  /** A picked component or structure that is still there: { b } or { i }. */
  get(ref) {
    if (!ref) return null;
    if (ref.type === 'item') { const i = M.item(ref.id); return i && !i.correctedBy ? { i } : null; }
    const b = M.block(ref.id); return b && b.status === 'live' ? { b } : null;
  },
  text(x) { return x.b ? ((x.b.body || {}).text || M.blockName(x.b)) : x.i.text || ''; },
  kindLabel(x) { if (x.b) { const K = typeof CKINDS !== 'undefined' && CKINDS.get(x.b.ckind); return K ? K.label : 'Component'; } const k = (typeof KIND !== 'undefined' && KIND[x.i.kind]) || null; return k ? k.label : x.i.kind; },
  synthDoc(m) { const d = m.synth && M.doc(m.synth); return d && !d.deleted ? d : null; },
  written: d => !!d && !!String((d.synthesis && d.synthesis.text) || '').trim(),
  /** Is the deliverable delivered now? */
  met(m) {
    if (MILE.type(m) === 'synthesis') { const d = MILE.synthDoc(m); return !!d && (!MILE.needsWritten() || MILE.written(d)); }
    const n = MILE.refs(m).filter(r => MILE.get(r)).length;
    if (!m.type && m.metAt && !n) return true;   // an old milestone marked met without evidence stays met
    return n >= MILE.need(m);
  },
  /** Stamp metAt when delivered, clear it when no longer (only rows that are deliverables; an old row keeps its own). */
  refresh(a) {
    if (!a || !Array.isArray(a.milestones) || a.status === 'superseded') return false; let ch = false;
    a.milestones.forEach(m => { const now = MILE.met(m);
      if (now && !m.metAt) { m.metAt = isoLocal(new Date()); ch = true; }
      else if (!now && m.metAt && m.type) { m.metAt = null; ch = true; } });
    if (ch) { DB.quiet = true; try { DB.put('aims', a); } finally { DB.quiet = false; } }
    return ch;
  },
  /** Weight of a deliverable: its own when every one has one, equal otherwise. */
  weights(a) { const L = a.milestones || [], all = L.length && L.every(m => typeof m.weight === 'number' && m.weight > 0), tot = all ? sum(L.map(m => m.weight)) : L.length; return L.map(m => (all ? m.weight : 1) / (tot || 1)); },
  share(a) { const w = MILE.weights(a); return sum((a.milestones || []).map((m, i) => MILE.met(m) ? w[i] : 0)); },
  /** Equal weights that sum to 1 (two decimals), for new deliverables. */
  equal(n) { const w = Array.from({ length: n }, () => Math.floor(100 / n) / 100); if (n) w[n - 1] = +(1 - sum(w.slice(0, -1))).toFixed(2); return w; },

  /* ---------- the card: a milestone and its deliverables ---------- */
  el(a, opts = {}) {
    MILE.refresh(a);
    const ro = a.status !== 'active' || !!opts.ro, share = MILE.share(a), L = a.milestones || [], done = L.filter(MILE.met).length;
    const flag = h('span.mi-flag'); flag.innerHTML = MILE.FLAG;
    return h('div.card.flat.mi-card' + (a.status === 'superseded' ? '.ghost' : ''), { 'data-aim': a.id, style: { marginBottom: '10px' } },
      h('div.row.mi-h', flag, h('h4', { style: { flex: 1, margin: 0 } }, a.statement), a.status === 'superseded' ? h('span.pill', 'superseded ' + fmtDay(a.supersededAt)) : null, h('span.mono.tiny.mi-pct', Math.round(share * 100) + '%')),
      h('div.bar', { style: { margin: '6px 0 8px' } }, h('i', { style: { width: share * 100 + '%' } })),
      h('div.mi-dlh', h('span', 'Deliverables'), h('span.mi-dln', done + ' of ' + L.length + ' delivered')),
      L.map((m, i) => MILE.row(a, m, ro, MILE.weights(a)[i])),
      ro ? null : h('div.row', { style: { marginTop: '8px' } }, h('span.tiny.muted', { style: { flex: 1 } }, 'Its completeness is the share of its deliverables delivered. Re-scoping makes a new version, so past weeks keep their numbers.'), h('button.btn.xs', { on: { click: () => MILE.dialog(a.themeId, a) } }, 'Re-scope…')));
  },
  row(a, m, ro, w) {
    const met = MILE.met(m), T = MILE.type(m), go = id => App.openComponent(id);
    const tick = h('span.mi-tick' + (met ? '.on' : ''), { title: met ? 'Delivered' + (m.metAt ? ' ' + fmtDay(m.metAt) : '') : 'Not delivered yet', 'aria-label': met ? 'Delivered' : 'Not delivered' }, met ? '✓' : '');
    let what, act = null;
    if (T === 'synthesis') {
      const d = MILE.synthDoc(m);
      what = h('div.mi-sub', h('span.mi-k', 'Synthesis note'), d ? h('a.mi-lk', { href: '#/doc/' + d.id, title: 'Open the Synthesis note' }, '↳ ' + (d.title || 'Synthesis')) : h('span.muted', 'not linked yet'),
        d ? h('span.mi-st' + (MILE.written(d) ? '.ok' : ''), MILE.written(d) ? 'its synthesis is written' : MILE.needsWritten() ? 'write its synthesis to deliver it' : 'linked') : null);
      if (!ro) act = h('button.btn.xs', { title: 'Link the Synthesis note that delivers it', on: { click: () => MILE.pickSynth(a, m) } }, d ? 'Change…' : 'Link…');
    } else {
      const R = MILE.refs(m).map(r => MILE.get(r)).filter(Boolean), need = MILE.need(m), bare = !m.type && m.metAt && !R.length;
      what = h('div.mi-sub', h('span.mi-k', MILE.kinds(m).map(k => (MILE.KINDS.find(x => x[0] === k) || [k, k])[1]).join(' · ')), bare ? null : h('span.mi-cnt', Math.min(R.length, need) + ' of ' + need),
        bare ? h('span.mi-st.warn', 'met without cited evidence') : null,
        R.length ? h('div.mi-picks', R.map(x => h('a.mi-pick', { title: MILE.kindLabel(x) + ' — open it', on: { click: () => go(x.b ? x.b.id : (x.i.originBlockId || x.i.id)) } }, h('span.mi-pk', MILE.kindLabel(x)), snippet(MILE.text(x), 70)))) : null);
      if (!ro) act = h('button.btn.xs', { title: 'Pick the components that deliver it', on: { click: () => MILE.pickSet(a, m) } }, R.length ? 'Change…' : 'Pick…');
    }
    return h('div.msrow.mi-row' + (met ? '.met' : ''), { 'data-type': T, 'data-ms': m.id }, tick, h('div.mi-main', h('div.mi-l', m.label), what), act, h('span.pill.mi-w', { title: 'Its share of the milestone' }, Math.round(w * 100) + '%'));
  },
  save(a) { DB.put('aims', a); MILE.refresh(a); changed(); },

  /* ---------- delivering: link a Synthesis note, pick a set ---------- */
  pickSynth(a, m) {
    const t = M.theme(a.themeId), here = d => d.themeId === a.themeId ? 'In this theme' : t && d.projectId === t.projectId ? 'In this project' : 'Elsewhere';
    const fresh = { fresh: true, created: '9999' };
    const mm = modal({ title: 'Link a Synthesis note — ' + m.label, wide: true, actions: [{ label: 'Cancel' }],
      body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'The deliverable is a Synthesis note' + (MILE.needsWritten() ? '; it is delivered once its synthesis — what it adds up to — is written.' : '.')),
        optionPicker({ placeholder: 'Search Synthesis notes…', sort: 'mi-synth', section: x => x.fresh ? '' : here(x.d),
          items: q => [fresh, ...DB.where('documents', d => typeof SYNTH !== 'undefined' && SYNTH.is(d) && !d.deleted && (!q || String(d.title || '').toLowerCase().includes(q))).map(d => ({ d, created: d.created || '' }))],
          render: x => x.fresh ? h('div', h('b', '＋ A new Synthesis note'), h('span.s', 'In this theme, called “' + m.label + '”')) : h('div', h('span.serif', x.d.title || 'Synthesis'), h('span.s', M.docPath ? M.docPath(x.d) : ''), MILE.written(x.d) ? h('span.pill.teal', 'written') : null),
          onPick: x => { mm.close(); let d = x.d; if (x.fresh) d = M.createDoc({ type: 'reflection', projectId: t ? t.projectId : null, themeId: a.themeId, title: m.label }); m.synth = d.id; if (!m.type) m.type = 'synthesis'; MILE.save(a); toast(x.fresh ? 'A new Synthesis note, linked — write its synthesis to deliver it' : 'Linked'); } })) });
    return mm;
  },
  /** The candidates of a set: components and structures of its kinds, this theme's first. */
  candidates(a, m) {
    const ks = MILE.kinds(m), ck = new Set(ks.flatMap(k => (MILE.OF[k] || {}).ck || [])), it = new Set(ks.flatMap(k => (MILE.OF[k] || {}).it || []));
    const tdocs = new Set(DB.where('documents', d => d.themeId === a.themeId).map(d => d.id));
    const out = [...DB.where('blocks', b => b.status === 'live' && b.ckind && ck.has(b.ckind)).map(b => ({ ref: { type: 'block', id: b.id }, x: { b }, here: tdocs.has(b.docId), created: b.created || '' })),
      ...DB.where('items', i => it.has(i.kind) && !i.correctedBy).map(i => ({ ref: { type: 'item', id: i.id }, x: { i }, here: tdocs.has(i.originDocId), created: i.created || '' }))];
    return out.sort((p, q) => (q.here - p.here) || String(q.created).localeCompare(String(p.created)));
  },
  pickSet(a, m) {
    const key = r => r.type + ':' + r.id, picked = new Set(MILE.refs(m).filter(r => MILE.get(r)).map(key)), all = MILE.candidates(a, m), need = MILE.need(m);
    const q = h('input.inp', { type: 'search', placeholder: 'Search ' + MILE.kinds(m).map(k => (MILE.KINDS.find(x => x[0] === k) || [k, k])[1].toLowerCase()).join(', ') + '…' });
    const count = h('span.mi-pc'), list = h('div.mi-cands');
    const draw = () => { const s = q.value.trim().toLowerCase(); count.textContent = picked.size + ' picked · it asks for ' + need;
      const rows = all.filter(c => !s || MILE.text(c.x).toLowerCase().includes(s));
      list.replaceChildren(...(rows.length ? rows.slice(0, 120).map(c => { const k = key(c.ref), cb = h('input', { type: 'checkbox', checked: picked.has(k), on: { change: e => { if (e.target.checked) picked.add(k); else picked.delete(k); count.textContent = picked.size + ' picked · it asks for ' + need; } } });
        const d = M.doc(c.x.b ? c.x.b.docId : c.x.i.originDocId);
        return h('label.mi-cand', cb, h('span.mi-pk', MILE.kindLabel(c.x)), h('span.mi-ct', snippet(MILE.text(c.x), 110)), h('span.mi-cw', (c.here ? 'this theme · ' : '') + (d ? d.title : ''))); }) : [h('div.empty', 'Nothing of these kinds yet — mark a component as a Result, a Verdict or an Insight, or a sentence as a Takeaway, Claim or Decision.')])); };
    q.addEventListener('input', draw); draw();
    modal({ title: 'Pick what delivers it — ' + m.label, wide: true, body: h('div.mi-pickbox', h('div.row', q, count), list),
      actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => { m.refs = all.filter(c => picked.has(key(c.ref))).map(c => c.ref); m.type = 'set'; if (!m.need) m.need = need; delete m.evidenceRef; MILE.save(a); } }] });
  },

  /* ---------- a new milestone, or a new version of one ---------- */
  dialog(themeId, prev) {
    const st = h('input.inp', { placeholder: 'Map traction force against substrate stiffness, 8–30 kPa', value: prev ? prev.statement : '' });
    const rows = h('div.mi-rows');
    const add = (o = {}) => {
      const type = o.type || 'set', kinds = new Set(o.kinds || ['result']);
      const label = h('input.inp.mi-rl', { placeholder: type === 'synthesis' ? 'The 8 kPa series, synthesised' : '3 Results across the stiffness range', value: o.label || '' });
      const sel = h('select.inp.mi-rt', h('option', { value: 'synthesis', selected: type === 'synthesis' }, 'A Synthesis note'), h('option', { value: 'set', selected: type === 'set' }, 'A set of components'));
      const need = h('input.inp.mono.mi-rn', { type: 'number', min: 1, max: 99, value: o.need || 1, title: 'How many it asks for' });
      const chips = h('div.mi-kc', MILE.KINDS.map(([k, l]) => h('button.mi-kb', { type: 'button', 'aria-pressed': String(kinds.has(k)), on: { click: e => { const on = !kinds.has(k); if (on) kinds.add(k); else if (kinds.size > 1) kinds.delete(k); e.currentTarget.setAttribute('aria-pressed', String(kinds.has(k))); } } }, l)));
      const wt = h('input.inp.mono.mi-rw', { type: 'number', min: 0, max: 1, step: 0.05, placeholder: 'equal', value: o.weight != null && o.keepW ? o.weight : '', title: 'Its weight (optional; blank shares what is left equally)' });
      const setPart = h('div.mi-setp', h('span.tiny.muted', 'of'), chips, h('span.tiny.muted', 'how many'), need);
      const sync = () => { setPart.hidden = sel.value !== 'set'; label.placeholder = sel.value === 'synthesis' ? 'The 8 kPa series, synthesised' : '3 Results across the stiffness range'; };
      sel.addEventListener('change', sync);
      const row = h('div.mi-r', h('div.mi-r1', label, sel, wt, h('button.btn.ghost.xs.mi-rx', { type: 'button', title: 'Remove this deliverable', on: { click: () => { row.remove(); } } }, '✕')), setPart);
      row._get = () => ({ label: label.value.trim(), type: sel.value, kinds: [...kinds], need: Math.max(1, +need.value || 1), weight: wt.value === '' ? null : Math.max(0, +wt.value), from: o });
      rows.append(row); sync(); return row;
    };
    if (prev) (prev.milestones || []).forEach(m => add({ label: m.label, type: MILE.type(m), kinds: m.kinds || (m.type ? null : ['result', 'takeaway', 'claim']), need: m.need || 1, weight: m.weight, keepW: true, m }));
    else { add({ type: 'synthesis' }); add({ type: 'set', kinds: ['result'], need: 3 }); }
    const body = h('div', prev ? h('p.tiny.muted', { style: { marginTop: 0 } }, 'The current version is kept, superseded — past weeks keep computing from it. What was delivered carries over by name.') : h('p.tiny.muted', { style: { marginTop: 0 } }, 'A large, overarching goal of this theme, measured by its deliverables: a Synthesis note, or a set of results, takeaways, verdicts…'),
      h('label.f', h('span', 'Milestone'), st), h('div', { style: { height: '10px' } }), h('div.mi-rh', h('span', 'Deliverables'), h('span.tiny.muted', 'weight optional — blank ones share what is left equally')), rows,
      h('button.btn.xs', { type: 'button', style: { marginTop: '6px' }, on: { click: () => { const r = add(); $('input', r).focus(); } } }, '+ Add a deliverable'));
    modal({ title: prev ? 'Re-scope the milestone (new version)' : 'New milestone', wide: true, body,
      actions: [{ label: 'Cancel' }, { label: prev ? 'Create the new version' : 'Create the milestone', pri: true, run: () => {
        const R = [...rows.children].map(r => r._get()).filter(r => r.label);
        if (!st.value.trim() || !R.length) { toast('A milestone and at least one deliverable'); return false; }
        // a blank weight shares what the given ones leave; when they leave nothing, it weighs as much as the given ones on average
        const given = R.filter(r => r.weight != null), left = Math.max(0, 1 - sum(given.map(r => r.weight))), blanks = R.length - given.length, eq = MILE.equal(R.length);
        const bw = !blanks ? 0 : left > 0.001 ? left / blanks : given.length ? sum(given.map(r => r.weight)) / given.length : 1;
        let W = R.map((r, i) => r.weight != null ? r.weight : bw || eq[i]);
        const tot = sum(W); W = tot > 0 ? W.map(x => +(x / tot).toFixed(4)) : eq;
        const out = R.map((r, i) => { const o = { label: r.label, weight: W[i], type: r.type };
          if (r.type === 'set') { o.kinds = r.kinds; o.need = r.need; }
          const pm = r.from && r.from.m;   // what was delivered carries over (by name)
          const old = pm || (prev && (prev.milestones || []).find(x => x.label === r.label));
          if (old) { if (r.type === 'synthesis' && old.synth) o.synth = old.synth; if (r.type === 'set') { const rf = MILE.refs(old); if (rf.length) o.refs = rf.slice(); } }
          return o; });
        const a = prev ? M.reviseAim(prev, st.value.trim(), out) : M.createAim(themeId, st.value.trim(), out); MILE.refresh(a); changed(); } }] });
  },
};
{
  // a deliverable keeps its own fields (M.createAim knew label, weight, metAt and evidence only)
  const ca = M.createAim; M.createAim = function (themeId, statement, milestones) {
    const a = ca.apply(this, arguments);
    try { let ch = false; (milestones || []).forEach((m, i) => { const t = a.milestones[i]; if (!t || !m) return; ['type', 'synth', 'kinds', 'need', 'refs'].forEach(k => { if (m[k] != null) { t[k] = Array.isArray(m[k]) ? m[k].map(x => typeof x === 'object' ? Object.assign({}, x) : x) : m[k]; ch = true; } }); });
      if (ch) { DB.quiet = true; try { DB.put('aims', a); } finally { DB.quiet = false; } } } catch (e) { console.warn('[milestones]', e); }
    return a; };
  // what drew an aim draws a milestone (the theme page, the export)
  aimEl = function (a, opts) { return MILE.el(a, opts); };
  newAimDialog = function (themeId, prev) { return MILE.dialog(themeId, prev); };
  // a theme's health reads its milestones as delivered now
  const th = IX.themeHealth; IX.themeHealth = function (t) { const H = th.apply(this, arguments); try { (H.aims || []).forEach(a => MILE.refresh(a)); } catch (e) { console.warn('[milestones]', e); } return H; };
  // the Portfolio's pill beside a theme: "2 milestones" (the lab layer draws its own pill; its count is reworded where it is drawn)
  const word = el => { if (!el) return; $$('.pf-sh > .pill', el).forEach(p => { const m = /^(\d+) aims?$/.exec(p.textContent.trim()); if (m) { if (!MILE.on()) p.remove(); else { p.textContent = plural(+m[1], 'milestone'); p.title = 'Its milestones: ' + plural(+m[1], 'large goal') + ', each measured by its deliverables'; } } }); };
  const sec = PFLIST.section; PFLIST.section = function () { const el = sec.apply(this, arguments); try { word(el); } catch (e) { console.warn('[milestones]', e); } return el; };
  // the theme's page: Milestones, + Milestone (switched off: neither)
  const tv = ThemeView.render; ThemeView.render = function (id) {
    const page = tv.apply(this, arguments);
    try { if (!page || !page.querySelectorAll) return page; const on = MILE.on();
      const hd = [...page.querySelectorAll('.sec-h > h2')].find(x => x.textContent.trim() === 'Aims');
      if (hd) { hd.textContent = 'Milestones'; hd.parentElement.classList.add('mi-sec'); hd.after(h('span.k', 'measured by their deliverables'));
        const empty = hd.parentElement.nextElementSibling; if (empty && empty.matches('.list') && /^No aim/.test(empty.textContent.trim())) { empty.classList.add('mi-empty'); $('.empty', empty).textContent = 'No milestone — this theme is exploratory by definition, which feeds the Explore lane.'; }
        if (!on) { hd.parentElement.remove(); $$('.mi-card, .mi-empty', page).forEach(x => x.remove()); } }
      [...page.querySelectorAll('button')].forEach(b => { if (b.textContent.trim() === '+ Aim') { if (!on) b.remove(); else { b.textContent = '+ Milestone'; b.title = 'A large goal of this theme, measured by its deliverables'; } } });
    } catch (e) { console.warn('[milestones]', e); }
    return page; };
  // the project's page: each theme card's milestones (switched off: not shown)
  const pv = ProjectView.render; ProjectView.render = function (id) {
    const page = pv.apply(this, arguments);
    try { if (!page || !page.querySelectorAll) return page; const on = MILE.on();
      $$('.cards > .card', page).forEach(c => [...c.children].filter(x => x.tagName === 'DIV' && x.querySelector(':scope > .bar') && x.querySelector(':scope > .tiny')).forEach(x => { if (!on) x.remove(); else { x.classList.add('mi-pj'); x.title = 'A milestone: its share of deliverables delivered'; } }));
    } catch (e) { console.warn('[milestones]', e); }
    return page; };
}
