/* ==========================================================================
   19b · Activity in the Portfolio (V4.19). Gabe: "Remove Activity tab → Make
   the Activity interactable in Portfolio for each Project or Theme." — "The
   project or theme activity health you see in the Portfolio can be clicked
   on."
   - The activity a project or a theme shows in the Portfolio is a button: its
     heat strip, "active 2d ago" / "stalled 25d", its "activity 34 · 4 wk" (a
     project's in its header, a theme's in its section; a row's strip in the
     list too, Settings permitting). A click opens its activity in a panel at
     the right (a full-width sheet on a narrow screen), closed with ✕ or Esc:
     why it is active or stalled and how that is counted, its activity over
     eight weeks, the time recorded in it, its notes still in their two weeks,
     what moved (each line goes to the note), and for a project its themes
     (each opens its own, ‹ comes back). Nothing opens on hover.
   - #/activity — the tab's old address, Today's "Activity →" — opens the
     Portfolio with the whole notebook in the panel: the old tab's ten weeks,
     its themes on one scale and the weekly numbers (19 ActivityView's parts).
   - The theme page's eight weeks and its activity tiles open the same panel.
   - Settings → Portfolio activity (20a): off, the strips are plain again and
     #/activity is the old page.
   ========================================================================== */
const PFACT = {
  cur: null, stack: [], el: null, from: null,
  on: () => typeof FEAT === 'undefined' || FEAT.on('pfactivity'),
  rows: () => { try { return FEAT.tune('pfactivity', 'rows') !== false; } catch (e) { return true; } },
  /** A Portfolio row's scope: its project, or the notes outside any project. */
  ofRow: r => !r ? null : r.p ? { kind: 'project', id: r.p.id } : r.general ? { kind: 'general' } : null,
  /** What a scope holds: its name, its notes, the themes whose time is its time (null: all time; []: none), its themes. */
  resolve(s) {
    const live = d => !!d && !d.deleted && d.type !== 'review' && d.type !== 'day';
    if (!s) return null;
    if (s.kind === 'theme') {
      const t = M.theme(s.id); if (!t) return null; const p = M.project(t.projectId);
      return { kind: 'theme', name: t.name, eyebrow: (p ? p.name + ' · ' : '') + 'Theme', href: '#/theme/' + t.id, docs: DB.where('documents', d => d.themeId === t.id && live(d)), themeIds: [t.id], themes: [] };
    }
    if (s.kind === 'project') {
      const p = M.project(s.id); if (!p) return null; const all = DB.where('themes', t => t.projectId === p.id);
      return { kind: 'project', name: p.name, eyebrow: 'Project', href: '#/project/' + p.id, docs: DB.where('documents', d => d.projectId === p.id && live(d)), themeIds: all.map(t => t.id),
        themes: all.filter(t => t.status === 'active').sort((a, b) => String(a.name).localeCompare(String(b.name))) };
    }
    if (s.kind === 'general') return { kind: 'general', name: 'Outside any project', eyebrow: 'General', docs: (typeof GENERAL !== 'undefined' ? GENERAL.docs() : []).filter(live), themeIds: [], themes: [] };
    return { kind: 'all', name: 'The whole notebook', eyebrow: 'Notebook', docs: DB.where('documents', live), themeIds: null,
      themes: DB.where('themes', t => t.status === 'active').sort((a, b) => String(a.name).localeCompare(String(b.name))) };
  },
  /** Active, stalled or not yet — and why, in a sentence. */
  state(A) {
    if (A.days == null) return { word: 'no activity yet', cls: '', why: 'Nothing has scored here yet. A note scores in the two weeks from its date.' };
    const ago = A.days === 0 ? 'today' : A.days === 1 ? 'yesterday' : A.days + ' days ago';
    if (A.days >= 21) return { word: 'stalled ' + A.days + 'd', cls: 'warn', why: 'Stalled: the last moment that scored was ' + ago + ' — three weeks without any is a stall.' };
    return { word: A.days === 0 ? 'active today' : A.days === 1 ? 'active yesterday' : 'active ' + A.days + 'd ago', cls: 'ok', why: 'Active: the last moment that scored was ' + ago + '. It stalls after three weeks without any.' };
  },
  /** Every moment that scored in these notes (PFKIT.events: the same rules as the score), newest first. */
  moments(docs) { return docs.flatMap(d => PFKIT.events(d)).sort((a, b) => b.t - a.t); },
  /** Time recorded in the last `days` days: in these themes, in all (null), or none ([]). */
  ms(themeIds, days) { let ms = 0; if (themeIds && !themeIds.length) return 0; for (let i = 0; i < days; i++) { const D = IX.day(addDays(new Date(), -i)); ms += themeIds ? themeIds.reduce((a, id) => a + (D.byTheme[id] || 0), 0) : D.total; } return ms; },

  /* ---------- the panel ---------- */
  open(s, from) { if (!PFACT.on() || !PFACT.resolve(s)) return; PFACT.stack = []; PFACT.cur = s; PFACT.from = from || null; PFACT.draw(); },
  drill(s) { PFACT.stack.push(PFACT.cur); PFACT.cur = s; PFACT.draw(true); },
  back() { if (!PFACT.stack.length) return; PFACT.cur = PFACT.stack.pop(); PFACT.draw(true); },
  close() {
    const el = PFACT.el; if (!el) return; PFACT.el = null; PFACT.cur = null; PFACT.stack = [];
    document.removeEventListener('keydown', PFACT.key, true); removeEventListener('resize', PFACT.place);
    el.classList.remove('in'); setTimeout(() => el.remove(), RM() ? 0 : 220);
    try { if (PFACT.from && PFACT.from.isConnected) PFACT.from.focus({ preventScroll: true }); } catch (e) { } PFACT.from = null;
  },
  /** Esc closes it — unless a dialog or menu is open above it (that Esc is theirs). */
  key(e) { if (e.key !== 'Escape' || !PFACT.el || $('.ovl') || $('.pop')) return; e.preventDefault(); e.stopPropagation(); PFACT.close(); },
  /** Under the header, at the right; the whole width on a narrow screen. */
  place() { const el = PFACT.el; if (!el) return; const v = $('#view'), top = v ? Math.max(0, Math.round(v.getBoundingClientRect().top)) : 0; el.style.top = top + 'px'; },
  draw(top) {
    const S = PFACT.resolve(PFACT.cur); if (!S) return PFACT.close();
    let el = PFACT.el, keep = 0;
    if (!el) {
      el = PFACT.el = h('aside.pfa', { role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Activity' });
      el.addEventListener('pointerdown', e => e.stopPropagation()); document.body.append(el);
      document.addEventListener('keydown', PFACT.key, true); addEventListener('resize', PFACT.place);
      PFACT.place(); requestAnimationFrame(() => el.classList.add('in'));
    } else { const b = $('.pfa-b', el); keep = top || !b ? 0 : b.scrollTop; }
    const A = PFKIT.activity(S.docs, 28, 56), st = PFACT.state(A), since = Date.now() - 28 * 864e5;
    const mo = PFACT.moments(S.docs), recent = mo.filter(e => e.t >= since);
    const n = { comp: recent.filter(e => e.b).length, struct: recent.filter(e => e.it && !PFKIT.SCORE[e.it.kind]).length,
      take: recent.filter(e => e.it && e.it.kind === 'takeaway').length, res: recent.filter(e => e.it && e.it.kind === 'result').length };
    const go = (fn) => e => { e.preventDefault(); PFACT.close(); fn(e); };
    const head = h('div.pfa-hd',
      PFACT.stack.length ? h('button.pfa-back', { type: 'button', title: 'Back to ' + (PFACT.resolve(PFACT.stack[PFACT.stack.length - 1]) || {}).name, on: { click: () => PFACT.back() } }, '‹') : null,
      h('div.pfa-tl', h('div.pfa-eb', S.eyebrow + ' · activity'), h('h3', S.href ? h('a', { href: S.href, title: 'Open its page', on: { click: go(() => App.go(S.href)) } }, S.name) : S.name)),
      h('button.pfa-x', { type: 'button', title: 'Close (Esc)', 'aria-label': 'Close', on: { click: () => PFACT.close() } }, '✕'));
    const sec = (title, k, ...kids) => h('section.pfa-s', h('div.pfa-sh', h('h4', title), k ? h('span.k', k) : null), ...kids);
    // health: the score, the state and why, what it is made of, how it is counted
    const health = h('section.pfa-s.pfa-health',
      h('div.pfa-top', h('div.pfa-big', h('b', String(A.score)), h('span', 'activity · 4 wk')), h('span.pfa-st' + (st.cls ? '.' + st.cls : ''), st.word)),
      h('p.pfa-why', st.why),
      h('div.pfa-n', [['components made', n.comp, '+1'], ['structures marked', n.struct, '+3'], ['takeaways', n.take, '+10'], ['results', n.res, '+10']].map(([l, c, w]) => h('div', h('b', String(c)), h('span', l), h('i', w + ' each')))),
      h('p.pfa-how', 'How it is counted: a note scores only in the two weeks from its date — a component made +1, a structure marked +3, a takeaway or a result +10; lit reviews score nothing. The score is the last four weeks. While in focus (Calendar → Focus) each moment counts double.'));
    const act = sec('Activity', '8 weeks', PFKIT.heat(A.perDay, { weeks: 8, cell: 11 }));
    // time recorded (presence, not progress)
    const t4 = PFACT.ms(S.themeIds, 28), t1 = PFACT.ms(S.themeIds, 7);
    const time = S.themeIds && !S.themeIds.length ? sec('Time recorded', null, h('p.pfa-none', 'Time is recorded by theme; the notes outside any project have none of their own.'))
      : sec('Time recorded', S.themeIds ? '8 weeks' + (S.kind === 'project' ? ' · in its themes' : '') : '10 weeks',
        h('div.pfa-tt', h('span', h('b', t4 ? fmtDur(t4) : '—'), ' in 4 weeks'), h('span', h('b', t1 ? fmtDur(t1) : '—'), ' in 7 days')),
        S.themeIds ? heatmapEl({ weeks: 8, themeIds: S.themeIds, cell: 11 }) : [heatmapEl({ weeks: 10, cell: 11 }), legendEl()]);
    // notes still in their two weeks
    const open = S.docs.map(d => ({ d, a: PFKIT.noteAct(d) })).filter(x => x.a.open).sort((x, y) => +x.a.until - +y.a.until);
    const notes = sec('Notes in their two weeks', open.length ? plural(open.length, 'note') : null,
      open.length ? h('div.pfa-list', open.map(({ d, a }) => h('a.pfa-li', { href: '#/doc/' + d.id, title: d.title || '', on: { click: go(() => App.go('#/doc/' + d.id)) } },
        typechip(d.type), h('span.pfa-t', d.title || 'Untitled'), h('span.pfa-m', 'activity ' + a.score + ' · until ' + fmtDay(a.until)))))
        : h('p.pfa-none', 'No note is in its two weeks: a new note, or one dated now, counts again.'));
    // what moved: each moment that scored in the last four weeks, by day
    const days = new Map(); recent.slice(0, 60).forEach(e => { const k = localDate(new Date(e.t)); (days.get(k) || days.set(k, []).get(k)).push(e); });
    const line = e => { const id = e.b ? e.b.id : e.it.originBlockId, d = e.d;
      return h('a.pfa-li.pfa-mv', { href: '#/doc/' + d.id, title: 'Go to it in ' + (d.title || 'the note'), on: { click: go(() => id && M.block(id) ? App.openComponent(id) : App.go('#/doc/' + d.id)) } },
        e.b ? h('span.pfa-kd', 'component') : kchip(e.it.kind), h('span.pfa-t', snippet(e.b ? (String((e.b.body || {}).text || '').trim() || M.blockName(e.b)) : e.it.text, 90)),
        h('span.pfa-m', (d.title ? snippet(d.title, 34) + ' · ' : '') + '+' + e.s)); };
    const moved = sec('What moved', recent.length ? plural(recent.length, 'moment') + ' · 4 weeks' : '4 weeks',
      recent.length ? h('div.pfa-days', [...days].map(([k, L]) => h('div.pfa-day', h('div.pfa-dh', fmtDayLong(k + 'T12:00')), L.map(line)))) : h('p.pfa-none', 'Nothing has scored in the last four weeks.'),
      recent.length > 60 ? h('p.pfa-none', '… and ' + (recent.length - 60) + ' earlier') : null);
    // a project's (or the notebook's) themes: each opens its own
    const themes = S.themes.length ? sec('Themes', S.kind === 'all' ? 'every active theme' : plural(S.themes.length, 'active theme'), h('div.pfa-list', S.themes.map(t => {
      const H = IX.themeHealth(t), st2 = PFACT.state({ days: H.actDays == null ? H.days : H.actDays });
      return h('button.pfa-li.pfa-th', { type: 'button', title: 'Open the activity of ' + t.name, on: { click: () => PFACT.drill({ kind: 'theme', id: t.id }) } },
        h('span.pfa-t', t.name, S.kind === 'all' ? h('span.pfa-m', ' · ' + ((M.project(t.projectId) || {}).name || '')) : null), PFKIT.heat(H.actMap, { weeks: 6, cell: 5 }),
        h('span.pfa-m', 'activity ' + (H.act || 0)), h('span.pfa-st.sm' + (st2.cls ? '.' + st2.cls : ''), st2.word), h('span.pfa-go', '›'));
    }))) : null;
    // the whole notebook: what the Activity tab showed
    const all = S.kind === 'all' ? [sec('Time by theme', 'same scale · a gap three columns wide is a stalled theme', ActivityView.byTheme(S.themes, 10, 8)),
      sec('Weekly numbers', 'the accessible view of the chart', h('div.pfa-wide', ActivityView.weekly()))] : [];
    const body = h('div.pfa-b', health, act, time, themes, notes, moved, ...all);
    el.replaceChildren(head, body); el.setAttribute('aria-label', 'Activity of ' + S.name); el.classList.toggle('pfa-all', S.kind === 'all');
    if (keep) body.scrollTop = keep;
    if (top) { const x = $('.pfa-x', el); if (x) x.focus({ preventScroll: true }); }
  },

  /** Make a strip, a state or a score open its activity: a click, Enter or Space — never a hover. */
  hot(el, sc, name, before) {
    if (!el || !sc || el.classList.contains('pfa-hot')) return;
    el.classList.add('pfa-hot'); el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.title = (el.title ? el.title + ' · ' : '') + 'Click: the activity of ' + name; el.setAttribute('aria-label', 'The activity of ' + name);
    const open = e => { e.preventDefault(); e.stopPropagation(); if (before) before(); PFACT.open(sc, el); };
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(e); });
  },
};
{
  const hot = PFACT.hot, warn = (w, e) => console.warn('[pf activity] ' + w, e);
  // the open project's header: its eight weeks, its score, its state
  const det = PortfolioView.detail; PortfolioView.detail = function (row) {
    const body = det.apply(this, arguments);
    try { const sc = PFACT.on() && body && PFACT.ofRow(row); if (sc) { hot($('.pf-top > .hmwrap', body), sc, row.name);
      const st = $('.pf-stats', body); if (st) [...st.children].forEach(c => { if (/^(activity \d|active |stalled|no activity)/.test(c.textContent.trim())) hot(c, sc, row.name); }); } } catch (e) { warn('detail', e); }
    return body; };
  // a theme's section: its heat, its score, "stalled"
  const sec = PFLIST.section; PFLIST.section = function (row, c) {
    const el = sec.apply(this, arguments);
    try { if (PFACT.on() && el && c && c.t) { const sc = { kind: 'theme', id: c.t.id }, sh = $(':scope > .pf-sh', el);
      if (sh) { hot($(':scope > .pf-say', sh), sc, c.t.name); hot($(':scope > .hmwrap', sh), sc, c.t.name); $$(':scope > .pill', sh).forEach(p => { if (/^stalled/.test(p.textContent)) hot(p, sc, c.t.name); }); } } } catch (e) { warn('section', e); }
    return el; };
  // the list: a row's strip opens it too (the row is picked first)
  const rnd = PortfolioView.render; PortfolioView.render = function () {
    const root = rnd.apply(this, arguments);
    try { if (PFACT.on() && PFACT.rows() && root) { const rows = PortfolioView.groups().filter(g => g && g.rows).flatMap(g => g.rows);
      $$('.pf-row', root).forEach(el => { const r = rows.find(x => x.id === el.dataset.row), sc = PFACT.ofRow(r); if (sc) hot($('.pf-rs .hmwrap', el), sc, r.name, () => { if (el.getAttribute('aria-current') !== 'true') el.click(); }); }); } } catch (e) { warn('rows', e); }
    return root; };
  // the theme page: its eight weeks and its activity tiles
  const tv = ThemeView.render; ThemeView.render = function (id) {
    const page = tv.apply(this, arguments);
    try { const t = M.theme(id); if (PFACT.on() && page && t) { const sc = { kind: 'theme', id: t.id };
      const h2 = $$('.sec-h h2', page).find(x => x.textContent === 'Activity'), hm = h2 && h2.closest('.sec-h').nextElementSibling; if (hm && hm.classList.contains('hmwrap')) hot(hm, sc, t.name);
      $$('.tiles .tile', page).forEach(x => { const l = $('.l', x); if (l && /^(activity · 4 wk|since last activity)/.test(l.textContent)) hot(x, sc, t.name); }); } } catch (e) { warn('theme page', e); }
    return page; };
  // #/activity: the Portfolio, with the whole notebook in the panel (the old page while the feature is off)
  const old = VIEWS.activity;
  VIEWS.activity = { title: true, render(...a) {
    if (!PFACT.on()) return old.render(...a);
    setTimeout(() => { history.replaceState(null, '', '#/portfolio'); App.refresh(); PFACT.open({ kind: 'all' }); }, 0);
    return h('div'); } };
  // away from the Portfolio, a project or a theme, it closes; a change while it is open draws it again
  const rf = App.refresh; App.refresh = function () {
    const r = rf.apply(this, arguments);
    try { if (PFACT.el) { if (!PFACT.on() || !['portfolio', 'project', 'theme'].includes(App.route.name)) PFACT.close(); else PFACT.draw(); } } catch (e) { warn('refresh', e); }
    return r; };
}
