/* ==========================================================================
   13zzzd · The move panel (Gabe, 20 Nov: "Move panels (bridge to, flag for
   synthesis, etc.. show up as a search bar with results or a Portfolio view to
   click on a note in the Portfolio.")
   One panel for every "send this somewhere" action, so they all look and work
   the same:
     Move to another note (MOVE.dialog, 13zb) · Bridge to… (BRIDGE.pickNote,
     13zzu: a component, words, pieces, a selection, a region 13v) · Flag for
     synthesis (SYNTH.choose, 13zzr) · Project & theme… (GENERAL.move, 15b) ·
     Move note to theme (13-docpanels) · Move to… on a Today capture (TCAP, 14a).
   - It opens as a search bar with results: the notes, the ones touched last
     first, each with its kind in its colour (NOTEKIND, 14fc: Experiment · Note ·
     Lit review · Synthesis), its title and its project › theme; typing narrows
     them by title, project, theme or kind. ↑ ↓ choose, Enter picks, Esc closes.
     Where the action can go to a project or a theme, they are listed under the
     notes.
   - Its second view is the Portfolio: the panel steps aside, a bar says what to
     click, and a click on a note in the Portfolio picks it and brings you back to
     where you were. This is the calendar's "Pick in the Portfolio…" (23e, V4.65)
     made shared: PFPICK is that pattern (the bar, the click on a note, Cancel),
     and the calendar uses it too.
   - What an action asks after the target stays its own: a bridge's caption, the
     connections that would cross when a component moves.
   - Settings → Canvas & notes → The move panel (movepanel, 20a): which view it
     opens in (Search or the Portfolio), with a live preview. Off: the plain
     list of notes it replaced.
   MPANEL.pick(o) → { doc } | a project / theme row | null · MPANEL.note(o) → the
   note | null · MPANEL.projectRows(o) · MPANEL.rowEl(o) · MPANEL.preview().
   PFPICK.start(o) · done(docId) · cancel() · stop() · banner().
   ========================================================================== */
/** Choose a note in the Portfolio: the caller waits; a click on a note picks it (and, by default, brings you back to where you were). */
const PFPICK = {
  cur: null, el: null,
  ICON: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5"/></svg>',
  /** o: { text() → what the bar says, onPick(docId), onCancel(), ok?(docId) → may it be picked, refuse?, back? (default true: return to where you were), id?, btnCls?, icon?, extra?: [{ label, run }] } */
  start(o) { PFPICK.cur = Object.assign({ from: location.hash || '#/home' }, o); PFPICK.banner(); App.go('#/portfolio'); },
  banner() {
    const P = PFPICK.cur; if (!P) { if (PFPICK.el) { PFPICK.el.remove(); PFPICK.el = null; } return; }
    if (PFPICK.el) PFPICK.el.remove();
    const btn = (label, run, cls) => h('button' + (cls ? '.' + cls : ''), { type: 'button', on: { click: run } }, label);
    PFPICK.el = h('div.mp-pick', { id: P.id || 'mp-pick', role: 'status' }, P.icon || h('span.mp-pick-i', { html: PFPICK.ICON }), h('span', P.text()),
      (P.extra || []).map(x => btn(x.label, () => x.run(), 'mp-btn' + (P.btnCls ? '.' + P.btnCls : ''))), btn('Cancel', () => PFPICK.cancel(), 'mp-btn' + (P.btnCls ? '.' + P.btnCls : '')));
    document.body.append(PFPICK.el);
  },
  back(P) { if (P.back !== false && P.from && location.hash !== P.from) App.go(P.from); },
  done(docId) {
    const P = PFPICK.cur; if (!P) return; const d = M.doc(docId); if (!d || d.deleted) return;
    if (P.ok && !P.ok(docId)) { toast(P.refuse || 'Pick another note'); return; }
    PFPICK.cur = null; PFPICK.banner(); PFPICK.back(P); P.onPick && P.onPick(docId);
  },
  cancel() { const P = PFPICK.cur; PFPICK.cur = null; PFPICK.banner(); if (!P) return; PFPICK.back(P); P.onCancel && P.onCancel(); },
  /** Close the bar without picking and without telling the caller (it is opening something else). */
  stop(back) { const P = PFPICK.cur; PFPICK.cur = null; PFPICK.banner(); if (P && back) PFPICK.back(P); },
};
{
  // a note opened in the Portfolio (a click on its link or its row) is picked instead
  const go0 = App.go; App.go = function (hash) { if (PFPICK.cur && /^#\/doc\//.test(String(hash))) { const id = decodeURIComponent(String(hash).slice(6).split('/')[0]); if (M.doc(id)) return PFPICK.done(id); } return go0.apply(this, arguments); };
  document.addEventListener('click', e => { if (!PFPICK.cur) return; const a = e.target.closest && e.target.closest('a[href^="#/doc/"]'); if (!a) return; e.preventDefault(); e.stopPropagation(); const id = decodeURIComponent(a.getAttribute('href').slice(6).split('/')[0]); if (M.doc(id)) PFPICK.done(id); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && PFPICK.cur && !$('.ovl') && !(typeof _pop !== 'undefined' && _pop)) { e.preventDefault(); PFPICK.cancel(); } }, true);
}

const MPANEL = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('movepanel'),
  /** The view it opens in: 'search' or 'portfolio'. */
  view: () => (typeof FEAT !== 'undefined' && FEAT.tune('movepanel', 'view') === 'portfolio') ? 'portfolio' : 'search',
  IC: {
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    portfolio: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  },
  /** project › theme of a note, as its row shows it. */
  where(d) { const P = d.projectId && M.project(d.projectId), t = d.themeId && M.theme(d.themeId); return [P ? P.name : 'No project', t ? t.name : null].filter(Boolean).join(' › '); },
  kind(d) { try { return NOTEKIND.of(d); } catch (e) { return 'notes'; } },
  /** The notes it may go to, the ones touched last first (o.rank: higher first; o.pool, o.docs, o.exclude narrow them). */
  pool(o) {
    const ex = new Set(o.exclude || []);
    return (o.pool ? o.pool() : DB.where('documents', d => !d.deleted && !d.archived)).filter(d => d && !ex.has(d.id) && (!o.docs || o.docs(d)))
      .sort((a, b) => ((o.rank ? o.rank(b) - o.rank(a) : 0) || String(b.modified || b.created || '').localeCompare(String(a.modified || a.created || ''))));
  },
  /** The rows for a project / theme choice: o.general adds "No project", o.sub = [project text, theme text], o.here = the note whose place it is now, o.projectId limits it to one project's themes. */
  projectRows(o = {}) {
    const sub = o.sub || ['project-wide', 'theme'], h0 = o.here, rows = [], here = (p, t) => h0 && (h0.projectId || '') === (p || '') && (h0.themeId || null) === (t || null) ? ' · here now' : '';
    if (o.general) rows.push({ projectId: null, themeId: null, label: 'No project (general)', sub: 'Outside every project' + here('', null), tag: 'General' });
    DB.all('projects').filter(p => !o.projectId || p.id === o.projectId).forEach(p => {
      if (!o.projectId) rows.push({ projectId: p.id, themeId: null, label: p.name, sub: sub[0] + here(p.id, null), tag: 'Project' });
      DB.where('themes', t => t.projectId === p.id && t.status === 'active').forEach(t => rows.push({ projectId: p.id, themeId: t.id, label: o.projectId ? t.name : p.name + ' › ' + t.name, sub: sub[1] + here(p.id, t.id), tag: 'Theme' }));
    });
    return q => rows.filter(r => !q || r.label.toLowerCase().includes(q));
  },
  /** One row (real or the preview's): { k (kind), title, sub, when, hint, tag, on, click() }. */
  rowEl(o) {
    return h('div.mp-row' + (o.on ? '.on' : ''), { role: 'option', title: o.title + (o.sub ? '\n' + o.sub : ''), on: { mousedown: e => { e.preventDefault(); o.click && o.click(e); } } },
      o.k ? NOTEKIND.chip(null, 'mp-k', o.k) : h('span.mp-tag', o.tag || ''),
      h('div.mp-tx', h('b.mp-t', o.title), o.sub ? h('span.mp-s', o.sub) : null), o.hint ? h('span.mp-hint', o.hint) : null, o.when ? h('span.mp-w', o.when) : null);
  },
  /** Which view button is on, as the pair of buttons. */
  seg(view, set) {
    const b = (v, label) => h('button.mp-sb' + (view === v ? '.on' : ''), { type: 'button', 'aria-pressed': String(view === v), on: { click: () => set(v) } }, h('span.mp-ic', { html: MPANEL.IC[v] }), label);
    return h('div.mp-seg', { role: 'group', 'aria-label': 'View' }, b('search', 'Search'), b('portfolio', 'Portfolio'));
  },
  /** The panel. o: { title, intro?, notes? (default true), places? (q → rows), pool?, docs?, exclude?, rank?, hint?(d), verb?, refuse?, placeholder? } → a note ({ doc }), a place row, or null. */
  pick(o) {
    o = Object.assign({ title: 'Move to…', notes: true }, o);
    return new Promise(res => {
      let done = false, m = null, leaving = false;
      const finish = v => { if (done) return; done = true; res(v); };
      if (!MPANEL.on()) return MPANEL.plain(o, finish);
      const allowed = () => new Set(MPANEL.pool(o).map(d => d.id));
      const toPortfolio = () => { leaving = true; m && m.close(); const ids = allowed(), here = location.hash;
        PFPICK.start({ text: () => o.verb || o.title + ' — click a note in the Portfolio', ok: id => ids.has(id), refuse: o.refuse || 'That note is not one of the choices — pick another', onPick: id => finish({ doc: M.doc(id) }), onCancel: () => finish(null),
          extra: [{ label: 'Search instead', run: () => { PFPICK.stop(true); setTimeout(() => open(), 60); } }] }); };
      const open = () => {
        leaving = false; const kinds = new Map(), kindOf = d => { if (!kinds.has(d.id)) kinds.set(d.id, MPANEL.kind(d)); return kinds.get(d.id); };
        const q = h('input.inp.mp-q', { type: 'search', placeholder: o.placeholder || (o.places ? (o.notes ? 'Search notes, projects, themes…' : 'Search projects, themes…') : 'Search notes…'), 'aria-label': 'Search' });
        const list = h('div.mp-list', { role: 'listbox' }), foot = h('div.mp-foot'); let cur = [], sel = 0;
        const pickIt = r => { if (!r) return; leaving = true; m.close(); finish(r); };
        const draw = () => {
          const s = q.value.toLowerCase().trim(), toks = s.split(/\s+/).filter(Boolean);
          const all = o.notes ? MPANEL.pool(o).filter(d => !toks.length || toks.every(t => ((d.title || '') + ' ' + MPANEL.where(d) + ' ' + NOTEKIND.LABEL[kindOf(d)]).toLowerCase().includes(t))) : [];
          const shown = all.slice(0, s ? 40 : 12), pl = o.places ? o.places(s) : [], out = []; cur = [];
          const add = (r, el) => { cur.push(r); out.push(el); };
          if (o.notes) { out.push(h('div.mp-h', s ? 'Notes that match' : 'Recent notes', h('span', String(all.length))));
            shown.forEach(d => add({ doc: d }, MPANEL.rowEl({ k: kindOf(d), title: d.title || 'Untitled', sub: MPANEL.where(d), when: fmtWhen(d.modified || d.created), hint: o.hint ? o.hint(d) : null, click: () => pickIt({ doc: d }) })));
            if (!shown.length) out.push(h('div.mp-none', s ? 'No note matches' : 'No note to choose')); if (all.length > shown.length) out.push(h('div.mp-more', '+ ' + (all.length - shown.length) + ' more — keep typing')); }
          if (pl.length) { out.push(h('div.mp-h', o.notes ? 'Projects and themes' : 'Where to', h('span', String(pl.length))));
            pl.slice(0, 40).forEach(r => add(r, MPANEL.rowEl({ tag: r.tag, title: r.label, sub: r.sub, click: () => pickIt(r) }))); }
          else if (!o.notes) out.push(h('div.mp-none', 'Nothing matches'));
          sel = clamp(sel, 0, Math.max(0, cur.length - 1)); list.replaceChildren(...out);
          const rs = $$('.mp-row', list); if (rs[sel]) { rs[sel].classList.add('on'); rs[sel].scrollIntoView({ block: 'nearest' }); }
        };
        q.addEventListener('input', () => { sel = 0; draw(); });
        q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(cur.length - 1, sel + 1); draw(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); } else if (e.key === 'Enter') { e.preventDefault(); pickIt(cur[sel]); } });
        foot.append(h('span', '↑ ↓ choose · Enter picks · Esc closes'), o.notes ? h('span', 'Portfolio: click a note there') : null);
        m = modal({ title: o.title, wide: true, actions: [{ label: 'Cancel' }], onClose: () => { if (!leaving) finish(null); },
          body: h('div.mp', o.intro || null, h('div.mp-bar', q, o.notes ? MPANEL.seg('search', v => { if (v === 'portfolio') toPortfolio(); }) : null), list, foot) });
        draw(); setTimeout(() => q.isConnected && q.focus(), 30);
      };
      if (o.notes && MPANEL.view() === 'portfolio') toPortfolio(); else open();
    });
  },
  /** A note (or nothing). */
  note(o) { return MPANEL.pick(Object.assign({}, o, { places: null })).then(r => r && r.doc || null); },
  /** The move panel switched off: the plain list of notes (and places) it replaced. */
  plain(o, finish) {
    let got = false; const places = o.places || (() => []);
    const m = modal({ title: o.title, wide: true, actions: [{ label: 'Cancel' }], onClose: () => { if (!got) finish(null); },
      body: h('div', o.intro || null, optionPicker({ placeholder: o.places ? 'Search notes, projects, themes…' : 'Search notes…', sort: 'mpanel',
        items: q => [...(o.notes ? MPANEL.pool(o).filter(d => !q || ((d.title || '') + ' ' + M.docPath(d)).toLowerCase().includes(q)).map(doc => ({ doc })) : []), ...places(q)],
        render: r => r.doc ? h('div', typechip(r.doc.type), ' ', r.doc.title || 'Untitled', h('span.s', M.docPath(r.doc))) : h('div', h('b', r.label), h('span.s', r.sub || '')), onPick: r => { got = true; m.close(); finish(r); } })) });
  },
  /** Settings' preview: the panel in the view it opens in (the buttons switch it here, not the setting); the made-up notes can be searched and picked. */
  preview() {
    const st = MPANEL._pv = MPANEL._pv || { view: null, q: '', picked: null }, v = st.view || MPANEL.view(), wrap = h('div.pv-mp');
    const rows = [{ k: 'exp', title: 'Run 3 · 30 kPa', sub: 'Cell mechanics › Edge forces', when: 'today' }, { k: 'notes', title: 'Seeding notes', sub: 'Cell mechanics › Edge forces', when: 'yesterday' },
      { k: 'lit', title: 'Traction force microscopy — a review', sub: 'Cell mechanics', when: '12 Nov' }, { k: 'syn', title: 'Edge traction across stiffness', sub: 'TF-ELISA › Synthesis', when: '9 Nov' }];
    const draw = () => {
      const seg = MPANEL.seg(st.view || MPANEL.view(), x => { st.view = x; draw(); });
      if ((st.view || MPANEL.view()) === 'search') {
        const q = h('input.inp.mp-q', { type: 'search', placeholder: 'Search notes…', value: st.q, 'aria-label': 'Search the example notes', on: { input: e => { st.q = e.target.value; draw(); const i = $('.mp-q', wrap); i && (i.focus(), i.setSelectionRange(st.q.length, st.q.length)); } } });
        const s = st.q.toLowerCase().trim(), L = rows.filter(r => !s || (r.title + ' ' + r.sub + ' ' + NOTEKIND.LABEL[r.k]).toLowerCase().includes(s));
        wrap.replaceChildren(h('div.mp.pv', h('div.mp-bar', q, seg), h('div.mp-list', h('div.mp-h', s ? 'Notes that match' : 'Recent notes', h('span', String(L.length))), L.length ? L.map((r, i) => MPANEL.rowEl(Object.assign({}, r, { on: i === 0 && !st.picked || st.picked === r.title, click: () => { st.picked = r.title; draw(); } }))) : h('div.mp-none', 'No note matches')))); }
      else {
        wrap.replaceChildren(h('div.mp.pv', h('div.mp-bar', h('span.mp-tx', h('b.mp-t', 'The Portfolio')), seg),
          h('div.mp-pfmock', h('div.mp-pick.pv', h('span.mp-pick-i', { html: PFPICK.ICON }), h('span', 'Move “Seed at 40k…” to… — click a note'), h('span.mp-btn', 'Cancel')),
            h('div.mp-pfrows', rows.map(r => h('div.mp-pfrow', NOTEKIND.chip(null, 'mp-k', r.k), h('b', r.title), h('span', r.sub)))))));
      }
      wrap.append(PV.cap(((st.view || MPANEL.view()) === 'portfolio' ? 'Portfolio view: the panel steps aside, a bar says what to click, and a click on a note picks it — you are back where you were. ' : 'Search view: the notes touched last first, each with its kind, its project › theme; type to narrow them. ') + 'It opens in ' + (MPANEL.view() === 'portfolio' ? 'the Portfolio' : 'Search') + '; the buttons here only try the other view.' + (st.picked && (st.view || MPANEL.view()) === 'search' ? ' Picked: “' + st.picked + '”.' : '')));
    };
    draw(); return [wrap];
  },
};
