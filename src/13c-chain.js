/* ==========================================================================
   13c · An experiment is a chain of standalone notes: Planning → Run →
   Analysis → Reflection. The order is data (each profile's `next`), so a
   lab can lengthen or reorder the chain in Settings without code.
   Each note keeps `chain` (the id of the note that started it) and `prev`.
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
  /** A new experiment: its first stage as its own note. planProto: a protocol to run in the stage that binds to protocols. */
  create({ projectId, themeId, name, date, planProto }) {
    const when = date || localDate(new Date()), nm = (name || '').trim() || 'Experiment ' + fmtDay(when + 'T12:00'), t = CHAIN.firstType(), tpl = M.enabledTemplates(t)[0];
    const d = M.createDoc({ type: t, projectId, themeId: themeId || null, title: `${nm} — ${prof(t).stage || prof(t).label}`, templateId: tpl ? tpl.id : null, date: when });
    d.chain = d.id; d.chainName = nm; if (planProto) d.planProto = planProto; DB.put('documents', d); changed(); return d;
  },
  name(d) { return d.chainName || d.title.replace(/\s+—\s+[^—]+$/, ''); },
  members(d) { const id = d.chain; if (!id) return [d]; return DB.where('documents', x => x.chain === id && !x.archived).sort((a, b) => a.created.localeCompare(b.created)); },
  nextOf(d) { const p = prof(d.type); if (!p || !p.next || !PROFILE[p.next]) return null; return DB.where('documents', x => x.prev === d.id && x.type === p.next)[0] || null; },
  /** "+ Experiment": a modal asking for project, theme and name, then the first stage as its own note. */
  start(pre = {}) {
    const projects = DB.all('projects'); if (!projects.length) return toast('Create a project first (Portfolio → + Project)');
    const proj = h('select.inp', h('option', { value: '' }, 'No project (general)'), projects.map(p => h('option', { value: p.id, selected: p.id === (pre.projectId || projects[0].id) }, p.name))), th = h('select.inp');
    const name = h('input.inp', { placeholder: 'e.g. 8 kPa series, run 3' }), date = h('input.inp.mono', { type: 'date', value: pre.date || localDate(new Date()), max: localDate(addDays(new Date(), 366)) });
    const fillThemes = () => th.replaceChildren(h('option', { value: '' }, '— none —'), ...DB.where('themes', t => t.projectId === proj.value && t.status === 'active').map(t => h('option', { value: t.id, selected: t.id === pre.themeId }, t.name)));
    proj.onchange = fillThemes; fillThemes(); if (!th.value && th.options.length > 1) th.selectedIndex = 1;
    const chainTxt = [], seen = new Set(); for (let t = CHAIN.firstType(); t && PROFILE[t] && !seen.has(t); t = PROFILE[t].next) { seen.add(t); chainTxt.push(PROFILE[t].stage || PROFILE[t].label); }
    const go = () => {
      const d = CHAIN.create({ projectId: proj.value || null, themeId: proj.value ? th.value : null, name: name.value, date: date.value });
      const first = d.blockIds.map(M.block).find(Boolean); DocView.pendingFocus = first ? { focus: first.id, pos: 0 } : null; App.go('#/doc/' + d.id);
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); m.close(); go(); } });
    const m = modal({ title: 'New experiment', body: h('div', h('div.grid2', h('label.f', h('span', 'Project'), proj), h('label.f', h('span', 'Theme'), th)), h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', 'Name'), name), h('label.f', h('span', 'Date — earlier for a past experiment'), date)),
      h('div.tiny.muted', { style: { marginTop: '10px' } }, 'Starts with ' + chainTxt[0] + '. Each stage is its own note; “Next” at the bottom right of the canvas makes the following one: ' + chainTxt.join(' → ') + '.')),
      actions: [{ label: 'Cancel' }, { label: 'Create', pri: true, run: go }] });
    setTimeout(() => name.focus(), 30);
  },
  /** "Next: …" — open the next stage if it exists, otherwise create it as a standalone note that strings from this one. */
  advance(d, e) {
    const p = prof(d.type), have = CHAIN.nextOf(d); if (!p.next) return;
    if (have) return App.jump(have.id, e, true);
    const np = prof(p.next), tpl = M.enabledTemplates(p.next)[0], nm = CHAIN.name(d);
    if (!d.chain) { d.chain = d.id; d.chainName = nm; DB.put('documents', d); }
    const n = M.createDoc({ type: p.next, projectId: d.projectId, themeId: d.themeId, title: `${nm} — ${np.stage || np.label}`, templateId: tpl ? tpl.id : null, date: d.backdate || null });
    n.chain = d.chain; n.prev = d.id; n.chainName = nm; DB.put('documents', n);
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
