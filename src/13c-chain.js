/* ==========================================================================
   13c · An experiment is a chain of standalone notes: Planning → Run →
   Analysis → Reflection. The order is data (each profile's `next`), so a
   lab can lengthen or reorder the chain in Settings without code.
   Each note keeps `chain` (the id of the note that started it) and `prev`.
   V4.15 (Gabe: "+ Experiment asks you to name the experiment with the option
   to add it to an experiment sequence/iteration from a theme (e.g., […] Run 2
   in that theme allows you to name it automatically […] Run 3). That name
   carries through to all parts of the experiment and do not add — Planning
   or — Run after the experiment title."):
   • every stage note is titled with the experiment's name alone (the stage is
     its chip, the strip and the Portfolio's stage label); renaming one renames
     them all (M.touchDoc); notes titled "name — Stage" before are renamed once;
   • + Experiment asks the name, and can continue a series of the theme: a
     series is the first experiment's chain id (`series`) with each run's
     number (`run`) on all of a run's notes; picking one names the next run
     ("… Run 2" → "… Run 3", "…" → "… Run 2"). The lab's build (V3.885) made
     + Experiment a note at once: the dialog is kept there too and ends through
     the lab's own path (CHAIN.labStart → App.newDoc → CHAIN.create).
   • the experiment's stages start with the universal text component a general
     note has (02-schema STANDARD_TEMPLATES); the old presets stay as templates
     you can switch on (CHAIN.OLD_PRESETS).
   ========================================================================== */
const CHAIN = {
  /** The first stage: the type no other stage points to, among those with a `stage`. */
  firstType() { const staged = PROFILES.filter(p => (p.stage || p.next) && !p.system), heads = staged.filter(p => !staged.some(q => q.next === p.type));
    // the longest chain wins (a stray staged type of its own doesn't); ties → Planning
    const len = t => { let n = 0; const seen = new Set(); while (t && PROFILE[t] && !seen.has(t)) { seen.add(t); n++; t = PROFILE[t].next; } return n; };
    heads.sort((a, b) => len(b.type) - len(a.type) || (b.type === 'planning') - (a.type === 'planning'));
    return (heads[0] || PROFILE.planning || prof('planning')).type; },
  /** Does stage a come (directly or later) before stage b? */
  precedes(a, b) { const seen = new Set(); for (let t = PROFILE[a] && PROFILE[a].next; t && PROFILE[t] && !seen.has(t); t = PROFILE[t].next) { if (t === b) return true; seen.add(t); } return false; },
  /** A new experiment: its first stage as its own note, titled with its name alone. planProto: a protocol to run in the stage that binds to protocols.
      series / run (V4.15): the series it continues and its number in it (from the dialog, or CHAIN._pending when the lab's path makes it). */
  create({ projectId, themeId, name, date, planProto, series, run }) {
    const P = CHAIN._pending; CHAIN._pending = null; if (P && !series) { series = P.series; run = P.run; }
    const when = date || localDate(new Date()), nm = (name || '').trim() || 'Experiment ' + fmtDay(when + 'T12:00'), t = CHAIN.firstType(), tpl = M.enabledTemplates(t)[0];
    const d = M.createDoc({ type: t, projectId, themeId: themeId || null, title: nm, templateId: tpl ? tpl.id : null, date: when });
    d.chain = d.id; d.chainName = nm; if (planProto) d.planProto = planProto; if (series) { d.series = series; d.run = run || 2; } DB.put('documents', d); if (CHAIN.seen) CHAIN.seen(d); changed(); return d;
  },
  name(d) { return d.chainName || d.title.replace(/\s+—\s+[^—]+$/, ''); },
  members(d) { const id = d.chain; if (!id) return [d]; return DB.where('documents', x => x.chain === id && !x.archived).sort((a, b) => a.created.localeCompare(b.created)); },
  nextOf(d) { const p = prof(d.type); if (!p || !p.next || !PROFILE[p.next]) return null; return DB.where('documents', x => x.prev === d.id && x.type === p.next)[0] || null; },
  /* ---------- V4.15: series of runs ---------- */
  /** "8 kPa series Run 2" → its base and number. */
  RUN_RX: /^(.*?)\s*\bRun\s*(\d+)\s*$/i,
  seriesOn: () => typeof FEAT === 'undefined' || FEAT.on('expseries'),
  /** A run's number: kept on its notes, else read from its name ("… Run 3"), else 1. */
  runOf(d) { if (d.run) return d.run; const m = CHAIN.name(d).match(CHAIN.RUN_RX); return m ? +m[2] : 1; },
  /** The base name of a series ("8 kPa series Run 2" → "8 kPa series"). */
  baseOf(name) { const m = String(name || '').match(CHAIN.RUN_RX); return m && m[1].trim() ? m[1].trim() : String(name || ''); },
  /** The experiments one can continue in a theme (with no theme: the project's experiments outside any): one row per series, its runs in
      order (each run = a chain, by its first note), the latest series first. A lone experiment is a series of one. */
  seriesIn(projectId, themeId) {
    if (!projectId) return [];
    const firsts = new Map();
    DB.where('documents', x => x.chain && !x.deleted && !x.archived && x.type !== 'reflection' && x.projectId === projectId && (themeId ? x.themeId === themeId : !x.themeId))
      .forEach(x => { const f = firsts.get(x.chain); if (!f || String(x.created) < String(f.created)) firsts.set(x.chain, x); });
    const S = new Map();
    firsts.forEach(f => { const id = f.series || f.chain, s = S.get(id) || S.set(id, { id, runs: [] }).get(id); s.runs.push({ chain: f.chain, doc: f, name: CHAIN.name(f), run: CHAIN.runOf(f) }); });
    const out = [...S.values()];
    out.forEach(s => { s.runs.sort((a, b) => a.run - b.run || String(a.doc.created).localeCompare(String(b.doc.created))); s.last = s.runs[s.runs.length - 1]; });
    return out.sort((a, b) => String(b.last.doc.created).localeCompare(String(a.last.doc.created)));
  },
  /** The next run of a series: its number and its name — V4.97: the series' name alone; the number is kept on its notes (`run`), not in the title. */
  nextRun(s) { const n = Math.max(...s.runs.map(r => r.run)) + 1; return { run: n, name: CHAIN.baseOf(s.last.name) }; },
  /* ---------- V4.97 (Gabe: "Each experiment should not have Run x in their note title, but rather have it as information next to their placement in
     Portfolio. The run number also appears when you are in the note canvas."): the run beside the title, never in it ---------- */
  /** The run number to show for a note of an experiment: a run of a series (or a run past the first), else null. */
  runNo(d) {
    if (!d || !d.chain || !CHAIN.seriesOn()) return null; try { if (FEAT.tune('expseries', 'runchip') === false) return null; } catch (e) { }
    const n = d.run || (CHAIN.members(d).find(x => x.run) || {}).run; return n && (d.series || n > 1) ? n : null;
  },
  /** The chip: "Run 3", with the series' name in its tooltip. */
  runChip(d, cls) { const n = CHAIN.runNo(d); if (!n) return null; return h('span.run-chip' + (cls ? '.' + cls : ''), { title: 'Run ' + n + ' of the series “' + CHAIN.baseOf(CHAIN.name(d)) + '”' }, 'Run ' + n); },
  /** Once: a title ending in "Run N" (V4.15's names) loses it; the number stays on the notes (`run`). */
  migrateRuns() {
    if (settings().expRunTitles497) return; let n = 0;
    DB.where('documents', d => d.chain && !d.deleted).forEach(d => { const name = CHAIN.name(d), m = name.match(CHAIN.RUN_RX); if (!m || !m[1].trim()) return; const base = m[1].trim(), k = +m[2];
      if (!d.run) d.run = k; if (d.title === name) d.title = base; if (d.chainName) d.chainName = base; DB.put('documents', d); if (CHAIN.seen) CHAIN.seen(d); n++; });
    saveSettings({ expRunTitles497: true }); if (n) console.info('[experiment runs] ' + n + ' titles lost their "Run N"; the number is on the notes');
  },
  /** A series takes its id the first time a run continues it (the first experiment's chain id), written on every note of its runs with their numbers. */
  openSeries(s) { s.runs.forEach(r => DB.where('documents', x => x.chain === r.chain).forEach(x => { if (x.series !== s.id || !x.run) { x.series = s.id; x.run = x.run || r.run; DB.put('documents', x); } })); },
  /** "+ Experiment": a modal asking for project, theme, the series it continues (if any) and its name, then the first stage as its own note. */
  start(pre = {}) {
    const projects = DB.all('projects'); if (!projects.length) return toast('Create a project first (Portfolio → + Project)');
    const proj = h('select.inp', h('option', { value: '' }, 'No project (general)'), projects.map(p => h('option', { value: p.id, selected: p.id === (pre.projectId || projects[0].id) }, p.name))), th = h('select.inp');
    const name = h('input.inp.cs-name', { placeholder: 'e.g. 8 kPa series', value: pre.title || '' }), date = h('input.inp.mono', { type: 'date', value: pre.date || localDate(new Date()), max: localDate(addDays(new Date(), 366)) });
    const ser = h('select.inp.cs-ser'), serRow = h('label.f.cs-serf', h('span', 'Continue a series'), ser), hint = h('div.tiny.muted.cs-hint');
    let S = [], auto = '';
    const fillThemes = () => th.replaceChildren(h('option', { value: '' }, '— none —'), ...DB.where('themes', t => t.projectId === proj.value && t.status === 'active').map(t => h('option', { value: t.id, selected: t.id === pre.themeId }, t.name)));
    const pickSeries = () => { const s = S.find(x => x.id === ser.value);
      if (s) { const nx = CHAIN.nextRun(s); name.value = auto = nx.name; hint.textContent = 'Run ' + nx.run + ' of “' + CHAIN.baseOf(s.last.name) + '” — after ' + s.runs.map(r => r.name).join(', ') + '. Its runs share one Synthesis.'; }
      else { if (auto && name.value === auto) name.value = ''; auto = ''; hint.textContent = ''; } };
    const fillSeries = () => { S = CHAIN.seriesOn() ? CHAIN.seriesIn(proj.value || null, proj.value ? th.value || null : null) : [];
      ser.replaceChildren(h('option', { value: '' }, '— No: a new experiment —'), ...S.map(s => h('option', { value: s.id }, s.last.name + (s.runs.length > 1 ? ' · ' + plural(s.runs.length, 'run') : ''))));
      serRow.hidden = !S.length; if (pre.series && S.some(x => x.id === pre.series)) ser.value = pre.series; pickSeries(); };
    proj.onchange = () => { fillThemes(); fillSeries(); }; th.onchange = fillSeries; ser.onchange = pickSeries;
    fillThemes(); if (!th.value && th.options.length > 1) th.selectedIndex = 1; fillSeries();
    const chainTxt = [], seen = new Set(); for (let t = CHAIN.firstType(); t && PROFILE[t] && !seen.has(t); t = PROFILE[t].next) { seen.add(t); chainTxt.push(PROFILE[t].stage || PROFILE[t].label); }
    const go = () => {
      const s = S.find(x => x.id === ser.value), nx = s ? CHAIN.nextRun(s) : null; if (s) CHAIN.openSeries(s);
      const A = { projectId: proj.value || null, themeId: proj.value ? th.value || null : null, name: name.value.trim() || (nx ? nx.name : ''), date: date.value, series: s ? s.id : null, run: nx ? nx.run : null };
      // the lab's build makes a note its own way (its first block holds the details): the experiment is made through it
      if (CHAIN.labStart) { CHAIN._pending = s ? { series: s.id, run: nx.run } : null; try { return CHAIN.labStart({ projectId: A.projectId, themeId: A.themeId, title: A.name, date: A.date }); } finally { CHAIN._pending = null; } }
      const d = CHAIN.create(A);
      const first = d.blockIds.map(M.block).find(Boolean); DocView.pendingFocus = first ? { focus: first.id, pos: 0 } : null; App.go('#/doc/' + d.id); return d;
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); m.close(); go(); } });
    const m = modal({ title: 'New experiment', body: h('div.cs-new', h('div.grid2', h('label.f', h('span', 'Project'), proj), h('label.f', h('span', 'Theme'), th)),
      h('div', { style: { marginTop: '10px' } }, serRow), h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', 'Name'), name), h('label.f', h('span', 'Date — earlier for a past experiment'), date)), hint,
      h('div.tiny.muted', { style: { marginTop: '10px' } }, 'Starts with ' + chainTxt[0] + '. Each stage is its own note, all named as the experiment; “Next” at the bottom right of the canvas makes the following one: ' + chainTxt.join(' → ') + '.')),
      actions: [{ label: 'Cancel' }, { label: 'Create', pri: true, run: go }] });
    setTimeout(() => { name.focus(); name.select(); }, 30);
  },
  /** "Next: …" — open the next stage if it exists, otherwise create it as a standalone note that strings from this one. */
  advance(d, e) {
    const p = prof(d.type), have = CHAIN.nextOf(d); if (!p.next) return;
    if (have) return App.jump(have.id, e, true);
    const np = prof(p.next), tpl = M.enabledTemplates(p.next)[0], nm = CHAIN.name(d);
    if (!d.chain) { d.chain = d.id; d.chainName = nm; DB.put('documents', d); }
    const n = M.createDoc({ type: p.next, projectId: d.projectId, themeId: d.themeId, title: nm, templateId: tpl ? tpl.id : null, date: d.backdate || null });   // V4.15: the experiment's name alone
    n.chain = d.chain; n.prev = d.id; n.chainName = nm; if (d.series) { n.series = d.series; n.run = d.run || CHAIN.runOf(d); } DB.put('documents', n); if (CHAIN.seen) { CHAIN.seen(d); CHAIN.seen(n); }
    // protocols planned for this experiment are laid out, ready to run, in the stage that binds to protocols
    if (np.bindsTo === 'protocol') {
      const planned = CHAIN.members(d).map(x => x.planProto && PROTO.defIn(x.planProto)).filter(Boolean).map(x => x.id); // chosen in + Note → Experiment → Run a protocol
      const defs = [...new Set([...planned, ...CHAIN.members(d).flatMap(x => M.liveBlocks(x.id)).filter(b => PROTO.is(b)).map(b => PROTO.defOf(b)).filter(x => x && x.registered).map(x => x.id)])].map(M.block);
      defs.forEach((def, i) => PROTO.newRun(def, n.id, 460, 168 + i * 420));
      // well plates planned for this experiment come along: the plan stays, the wells start empty
      const plates = CHAIN.members(d).flatMap(x => M.liveBlocks(x.id)).filter(b => b.kind === 'plate' && b.status === 'live' && b.stage !== 'run');
      plates.forEach((pl, i) => PLATE.carry(pl, n.id, 460 + (defs.length ? 520 : 0), 168 + i * 560));
    }
    changed(); toast(`${np.stage || np.label} created — it strings from “${d.title}”`);
    App.jump(n.id, e, true);
  },
  /** The bottom-right button on the canvas. */
  button(d, pane) {
    const p = prof(d.type); if (!p || !p.next || !PROFILE[p.next] || pane.travel) return null;
    const np = prof(p.next), have = CHAIN.nextOf(d);
    return h('button.nextbtn.nopan' + (have ? '.have' : ''), { title: have ? `Open “${have.title}” · Alt+click: beside this note` : `Create the ${(np.stage || np.label).toLowerCase()} as its own note · Alt+click: open it beside this one`, on: { click: e => CHAIN.advance(d, e) } },
      h('span.nl', have ? 'Open' : 'Next'), h('b', np.stage || np.label), h('span.na', '→'));
  },
  /** Stage strip for the header: every stage of this experiment, the current one marked. */
  strip(d) {
    if (!d.chain && !prof(d.type).next && !DB.where('documents', x => x.prev === d.id).length) return null;
    const mem = CHAIN.members(d); if (mem.length < 2 && !prof(d.type).stage) return null;
    return h('span.chainstrip', mem.map((x, i) => [i ? h('span.cs-sep', '›') : null, x.id === d.id ? h('b.cs.on', prof(x.type).stage || prof(x.type).label) : h('a.cs', { title: x.title + ' · Alt+click: beside', on: { click: e => App.jump(x.id, e, true) } }, prof(x.type).stage || prof(x.type).label)]));
  },
};

/* ---------- V4.15: one name for an experiment; its stages start as a general note ---------- */
/** The stage presets before V4.15, kept as templates you can switch on (Settings → Templates); deterministic ids, so two devices make one. */
CHAIN.OLD_PRESETS = {
  experiment: [['Aim of this run', ''], ['Setup', ''], ['Run', ''], ['Observe', ''], ['Outcome', '']],
  analysis:   [['Input data', ''], ['Method', ''], ['Pass 1', ''], ['Result', '']],
  planning:   [['Context', ''], ['Option A', ''], ['Option B', ''], ['Decision', '']],
  reflection: [['Summary', ''], ['What to change next time', '']],
};
CHAIN.migrate = function () {
  // a standard template still as it was built in → the universal text component; the preset itself stays, switched off, as a template of its own
  Object.entries(CHAIN.OLD_PRESETS).forEach(([type, rows]) => {
    const std = DB.get('templates', 'tp_std_' + type), same = t => t && Array.isArray(t.blocks) && t.blocks.length === rows.length && t.blocks.every((b, i) => (b.label || '') === rows[i][0] && !(b.body || '') && b.x == null);
    if (same(std)) { std.blocks = [{ label: '', body: '' }]; DB.put('templates', std); }
    const id = 'tp_pre415_' + type; if (PROFILE[type] && !DB.get('templates', id)) DB.put('templates', { id, type, name: (PROFILE[type].stage || PROFILE[type].label) + ' — the preset before V4.15 (' + rows.map(r => r[0]).join(' · ') + ')', isStandard: false, enabled: false, blocks: rows.map(([label, body]) => ({ label, body })) });
  });
  // notes of an experiment titled "name — Stage" (before V4.15) → the name alone, once; then every experiment note's title is remembered (CHAIN.renamed)
  const st = settings(); if (st.expTitles415) { DB.where('documents', d => d.chain).forEach(d => CHAIN.seen && CHAIN.seen(d)); CHAIN.migrateRuns(); return; }
  DB.where('documents', d => d.chain && d.chainName && !d.deleted).forEach(d => { const p = prof(d.type); if (d.title === d.chainName + ' — ' + (p.stage || p.label)) { d.title = d.chainName; DB.put('documents', d); } });
  saveSettings({ expTitles415: true }); DB.where('documents', d => d.chain).forEach(d => CHAIN.seen && CHAIN.seen(d));
  CHAIN.migrateRuns();
};
{
  // run with the standard templates (boot, a changed profile, an import)
  const est = ensureStandardTemplates; ensureStandardTemplates = function () { const r = est.apply(this, arguments); try { CHAIN.migrate(); } catch (e) { console.warn('[experiment titles]', e); } return r; };
  // "That name carries through to all parts of the experiment": a note of an experiment renamed renames the others (and the name)
  const td = M.touchDoc; M.touchDoc = function (d) { const r = td.apply(this, arguments); try { CHAIN.renamed(d); } catch (e) { console.warn('[experiment name]', e); } return r; };
  // only a title that really changed, on a note that carried the experiment's name: each note's title as last seen (drawn, made, renamed)
  CHAIN._titles = new Map(); CHAIN.seen = d => { if (d && d.chain) CHAIN._titles.set(d.id, d.title); };
  CHAIN.renamed = function (d) {
    if (!d || !d.chain || CHAIN._renaming) return; const prev = CHAIN._titles.get(d.id), old = d.chainName, t = String(d.title || '').trim(), stage = x => prof(x.type).stage || prof(x.type).label;
    CHAIN.seen(d);
    if (prev == null || !old || !t || t === prev || t === old) return;
    if (prev !== old && prev !== old + ' — ' + stage(d)) return;   // a note with a title of its own (a series' Synthesis, say): renaming it is its own business
    CHAIN._renaming = true;
    try { CHAIN.members(d).forEach(x => { if (x.id !== d.id && (x.title === old || x.title === old + ' — ' + stage(x))) x.title = t; x.chainName = t; DB.put('documents', x); CHAIN.seen(x); }); d.chainName = t; DB.put('documents', d); }
    finally { CHAIN._renaming = false; }
  };
  const rr = DocView.render; DocView.render = function (docId) { try { const d = M.doc(docId); if (d && d.chain) CHAIN.members(d).forEach(CHAIN.seen); } catch (e) { } return rr.apply(this, arguments); };
  // the lab's build (V3.885, rm/scientia/lab-mode.js) makes + Experiment a note at once; Gabe now wants it to ask the name and offer a series —
  // the dialog stays, and ends through the lab's path (CHAIN.labStart), so the note is made exactly as the lab makes notes
  const mine = CHAIN.start, keep = () => { if (CHAIN.start !== mine) { CHAIN.labStart = CHAIN.start; CHAIN.start = mine; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', keep); else setTimeout(keep, 0);
}
