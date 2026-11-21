/* ==========================================================================
   20e · Hot notes (V4.50 — Gabe: "on the right of Settings, add Hot Notes,
   which allows you to quickly open notes that you set as favorites. It
   starts off by showing most visited (i.e., higher traffic), and the option
   to add a favorite via those suggested, or a + button. Simply deselecting
   the golden star when you hover on them removes them from the hot notes.
   The label of the note (experiment v. note v. lit review v. synthesis)
   appears to its left with the color code. along with the banner of the
   project appearing lightly underneath it.")
   - A button at the right of the tab row, after Settings: a star, "Hot
     notes" and how many. A click opens the panel under it; Esc, a click
     outside, the button again or opening a note closes it. Nothing opens by
     itself.
   - Your hot notes: the notes you starred (settings().hotNotes — the
     notebook's settings, so they follow you to every device), the most
     visited first. Each row: the note's kind at its left in its colour
     (NOTEKIND, 14fc: Experiment · Note · Lit review · Synthesis), its title,
     its project › theme, and the banner lightly underneath — its theme's
     banner (the image, else the one drawn from its name), else one drawn
     from the project's name. On hover its golden star shows; a click on it
     takes the note out. A click on the row opens the note.
   - Most visited: the notes you open most on this device (counted as you go
     to them, _ls 'hotVisits'), those not starred yet, an empty star to add
     each. With no hot note yet the panel starts with them; with no visit yet,
     the notes edited last.
   - +: a search across every note, to star any of them.
   - V4.92 (Gabe: "Hot notes appear in the tab next to it."): your hot notes
     also sit in the tab row, right after the button — each a small tab with
     its kind's colour and its title; a click opens it, the note you are in
     is lit. As many as fit (Settings: up to 3, 5 or 8, or none); the rest
     are behind "+n", which opens the panel.
   HOT: favs() · isFav(id) · toggle(id, on) · visit(id) · visits() · top(n, skip) · open() · close() · paint() · rowEl(o) · strip() · fit().
   Settings → Tabs & overview → Hot notes (hotnotes, 20a): the switch, how many suggestions, the preview.
   ========================================================================== */
const HOT = {
  STAR: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M10.79 3.21c.45-1.08 1.97-1.08 2.42 0l1.97 4.73 5.1.41c1.17.09 1.64 1.55.75 2.31l-3.89 3.33 1.19 4.98c.27 1.14-.97 2.04-1.97 1.43L12 17.73l-4.36 2.67c-1 .61-2.24-.29-1.97-1.43l1.19-4.98-3.89-3.33c-.89-.76-.42-2.22.75-2.31l5.1-.41 1.97-4.73Z"/></svg>',
  STAR_O: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.39a.56.56 0 0 1-.84.61l-4.73-2.89a.56.56 0 0 0-.59 0l-4.72 2.89a.56.56 0 0 1-.84-.61l1.28-5.39a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .47-.35l2.13-5.11Z"/></svg>',
  el: null, btn: null, q: null,
  on: () => typeof FEAT === 'undefined' || FEAT.on('hotnotes'),
  live: id => { const d = id && M.doc(id); return d && !d.deleted && !d.archived ? d : null; },
  list: () => { const s = settings().hotNotes; return Array.isArray(s) ? s : []; },
  isFav: id => HOT.list().includes(id),
  visits() { let v = null; try { v = _ls.get('hotVisits', null); } catch (e) { } return v && typeof v === 'object' ? v : {}; },
  visit(id) {
    if (!id || !M.doc(id)) return; const V = HOT.visits(), v = V[id] || { n: 0, t: 0 }; v.n++; v.t = Date.now(); V[id] = v;
    const ks = Object.keys(V); if (ks.length > 240) ks.sort((a, b) => V[a].t - V[b].t).slice(0, ks.length - 240).forEach(k => delete V[k]);
    try { _ls.set('hotVisits', V); } catch (e) { }
  },
  /** Your hot notes: the starred, the most visited first (then as starred). */
  favs() { const V = HOT.visits(), L = HOT.list(); return L.map(HOT.live).filter(Boolean).sort((a, b) => ((V[b.id] || {}).n || 0) - ((V[a.id] || {}).n || 0) || L.indexOf(a.id) - L.indexOf(b.id)); },
  /** The most visited not starred yet (with no visit yet: the notes edited last). */
  top(n, skip) {
    const V = HOT.visits(), ok = d => d && !d.deleted && !d.archived && d.type !== 'day' && !skip.has(d.id);
    const seen = Object.keys(V).map(M.doc).filter(ok).sort((a, b) => (V[b.id].n - V[a.id].n) || (V[b.id].t - V[a.id].t));
    if (seen.length) return { how: 'visits', docs: seen.slice(0, n) };
    return { how: 'edited', docs: DB.where('documents', ok).sort((a, b) => String(b.modified || b.created || '').localeCompare(String(a.modified || a.created || ''))).slice(0, n) };
  },
  suggest: () => { let n = 5; try { n = +FEAT.tune('hotnotes', 'suggest') || 5; } catch (e) { } return clamp(n, 1, 12); },
  toggle(id, on) {
    const L = HOT.list().slice(), has = L.includes(id); if (on === has || !M.doc(id)) return;
    saveSettings({ hotNotes: has ? L.filter(x => x !== id) : L.concat([id]) });
    HOT.count(); if (HOT.el) HOT.paint();
    toast(has ? 'Out of your hot notes' : 'In your hot notes — the star at the right of Settings', 2200);
  },
  /** The banner under a row: its theme's (image, else drawn from its name), else drawn from its project's name. */
  banner(d) {
    try {
      const t = d.themeId && M.theme(d.themeId), P = d.projectId && M.project(d.projectId);
      if (t) { const rec = t.banner && MEDIA.get(t.banner); if (rec) { const im = MEDIA.el(rec, { cls: 'hn-bim' }); return im; } return BANNER.drawn(t.id + '|' + t.name); }
      if (P) return BANNER.drawn(P.id + '|' + P.name);
    } catch (e) { }
    return null;
  },
  sub(d) { const P = d.projectId && M.project(d.projectId), t = d.themeId && M.theme(d.themeId); return [P ? P.name : 'No project', t ? t.name : null].filter(Boolean).join(' › '); },
  /** One row (real or the preview's): { id, title, sub, k, ban, fav, open(), star() }. */
  rowEl(o) {
    const ban = h('div.hn-ban', { 'aria-hidden': 'true' }); if (o.ban) { if (typeof o.ban === 'string') ban.innerHTML = o.ban; else ban.append(o.ban); }
    const star = h('button.hn-star', { type: 'button', 'aria-pressed': String(!!o.fav), title: o.fav ? 'Take it out of your hot notes' : 'Add it to your hot notes', 'aria-label': (o.fav ? 'Remove ' : 'Add ') + o.title + (o.fav ? ' from' : ' to') + ' your hot notes', html: o.fav ? HOT.STAR : HOT.STAR_O, on: { click: e => { e.stopPropagation(); o.star && o.star(); } } });
    return h('div.hn-row' + (o.fav ? '.fav' : ''), { role: 'link', tabindex: '0', 'data-id': o.id || '', title: o.title + (o.sub ? '\n' + o.sub : ''),
      on: { click: () => o.open && o.open(), keydown: e => { if (e.key === 'Enter') { e.preventDefault(); o.open && o.open(); } } } },
      ban, NOTEKIND.chip(null, 'hn-k', o.k), h('div.hn-tx', h('b.hn-t', o.title), o.sub ? h('span.hn-s', o.sub) : null), star);
  },
  row(d, fav) { return HOT.rowEl({ id: d.id, title: d.title || 'Untitled', sub: HOT.sub(d), k: NOTEKIND.of(d), ban: HOT.banner(d), fav, open: () => { HOT.close(); App.go('#/doc/' + d.id); }, star: () => HOT.toggle(d.id) }); },
  /* ---------- the button and the panel ---------- */
  count() { const b = HOT.btn; if (!b) return; const n = HOT.favs().length, c = $('.hn-cnt', b); if (c) c.textContent = n ? String(n) : ''; HOT.strip(); },
  /* ---------- V4.92: the hot notes in the tab row, after the button ---------- */
  inline: () => { let n = 5; try { const v = FEAT.tune('hotnotes', 'inline'); n = v == null ? 5 : +v; } catch (e) { } return HOT.on() ? clamp(isNaN(n) ? 5 : n, 0, 12) : 0; },
  strip() {
    const S = HOT.sbox; if (!S) return; const n = HOT.inline(), F = n ? HOT.favs().slice(0, n) : [], cur = App.route && App.route.name === 'doc' ? App.route.args[0] : null;
    S.hidden = !F.length;
    S.replaceChildren(...F.map(d => h('a.hn-tab' + (d.id === cur ? '.on' : ''), { href: '#/doc/' + d.id, 'data-id': d.id, 'data-sk': NOTEKIND.of(d), title: (d.title || 'Untitled') + ' — ' + HOT.sub(d), 'aria-current': d.id === cur ? 'page' : null, on: { click: () => HOT.close() } },
      h('span.hn-tk', { 'aria-hidden': 'true' }), h('span.hn-tt', d.title || 'Untitled'))),
      h('button.hn-more', { type: 'button', hidden: true, title: 'The rest of your hot notes', on: { click: e => { e.stopPropagation(); HOT.el ? HOT.close() : HOT.open(); } } }, '+0'));
    requestAnimationFrame(() => HOT.fit());
  },
  /** As many as fit in the tab row; the rest behind "+n". */
  fit() {
    const S = HOT.sbox, nav = S && S.parentNode; if (!S || !nav || S.hidden) return; const T = $$('.hn-tab', S), more = $('.hn-more', S); T.forEach(t => { t.hidden = false; }); more.hidden = true;
    const lim = () => nav.getBoundingClientRect().left + nav.clientWidth - 4; let hid = 0;
    for (let i = T.length - 1; i >= 0 && S.getBoundingClientRect().right > lim(); i--) { T[i].hidden = true; hid++; more.hidden = false; more.textContent = '+' + hid; }
    if (hid && S.getBoundingClientRect().right > lim()) { const vis = T.filter(t => !t.hidden); if (vis.length) { vis[vis.length - 1].hidden = true; more.textContent = '+' + (hid + 1); } }
  },
  mount() {
    const nav = $('#tabs'); if (!nav) return;
    if (!HOT.sbox) HOT.sbox = h('span#hotstrip.hn-strip', { role: 'group', 'aria-label': 'Your hot notes' });
    if (HOT.btn && HOT.btn.isConnected) { if (HOT.sbox !== nav.lastElementChild || HOT.btn.nextSibling !== HOT.sbox) nav.append(HOT.btn, HOT.sbox); HOT.strip(); return; }
    HOT.btn = h('button#hotbtn.hot-btn', { type: 'button', title: 'Hot notes — the notes you starred, and the ones you open most', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', on: { click: e => { e.stopPropagation(); HOT.el ? HOT.close() : HOT.open(); } } },
      h('span.hn-ic', { html: HOT.STAR_O }), h('span.hn-l', 'Hot notes'), h('span.hn-cnt'));
    nav.append(HOT.btn, HOT.sbox); HOT.count();
  },
  open() {
    if (!HOT.on()) return; HOT.close(); HOT.q = null;
    const el = HOT.el = h('div.hn-pop', { role: 'dialog', 'aria-label': 'Hot notes' }); document.body.append(el); HOT.paint(); HOT.place();
    HOT.btn && (HOT.btn.classList.add('on'), HOT.btn.setAttribute('aria-expanded', 'true'));
    HOT._out = e => { if (HOT.el && !HOT.el.contains(e.target) && !(HOT.btn && HOT.btn.contains(e.target))) HOT.close(); };
    HOT._key = e => { if (e.key === 'Escape' && HOT.el) { e.preventDefault(); e.stopPropagation(); HOT.close(); if (HOT.btn) HOT.btn.focus(); } };
    document.addEventListener('pointerdown', HOT._out, true); document.addEventListener('keydown', HOT._key, true);
    setTimeout(() => { const f = HOT.el && $('.hn-row, .hn-add', HOT.el); if (f) f.focus({ preventScroll: true }); }, 30);
  },
  close() {
    if (!HOT.el) return; HOT.el.remove(); HOT.el = null;
    document.removeEventListener('pointerdown', HOT._out, true); document.removeEventListener('keydown', HOT._key, true);
    if (HOT.btn) { HOT.btn.classList.remove('on'); HOT.btn.setAttribute('aria-expanded', 'false'); }
  },
  place() { const el = HOT.el, b = HOT.btn; if (!el || !b) return; const r = b.getBoundingClientRect(), w = el.offsetWidth || 380; el.style.top = Math.round(r.bottom + 6) + 'px'; el.style.left = Math.round(clamp(r.right - w, 8, innerWidth - w - 8)) + 'px'; },
  paint() {
    const el = HOT.el; if (!el) return; const F = HOT.favs(), skip = new Set(F.map(d => d.id)), T = HOT.top(HOT.suggest(), skip);
    const add = h('button.hn-add' + (HOT.q != null ? '.on' : ''), { type: 'button', title: 'Star any note — find it by its title', 'aria-label': 'Add a note to your hot notes', 'aria-expanded': String(HOT.q != null), on: { click: e => { e.stopPropagation(); HOT.q = HOT.q == null ? '' : null; HOT.paint(); if (HOT.q != null) setTimeout(() => { const i = HOT.el && $('.hn-q', HOT.el); if (i) i.focus(); }, 20); } } }, '+');
    const parts = [h('div.hn-head', h('span.hn-hic', { html: HOT.STAR }), h('b', 'Hot notes'), h('span.hn-n', F.length ? String(F.length) : ''), add)];
    if (HOT.q != null) {
      const inp = h('input.inp.hn-q', { type: 'search', placeholder: 'Find a note to star…', value: HOT.q, 'aria-label': 'Find a note to star', on: { input: e => { HOT.q = e.target.value; HOT.paintFound(); } } });
      parts.push(h('div.hn-find', inp, h('div.hn-found')));
    }
    parts.push(F.length ? h('div.hn-list', F.map(d => HOT.row(d, true))) : h('p.hn-empty', 'Star the notes you open most — they stay here, one click away, on every device.'));
    if (T.docs.length) parts.push(h('div.hn-sh', T.how === 'visits' ? 'Most visited' : 'Edited last'), h('div.hn-list.hn-sug', T.docs.map(d => HOT.row(d, false))));
    el.replaceChildren(...parts); if (HOT.q != null) HOT.paintFound();
  },
  paintFound() {
    const host = HOT.el && $('.hn-found', HOT.el); if (!host) return; const q = String(HOT.q || '').trim().toLowerCase();
    if (!q) { host.replaceChildren(); return; }
    const hits = DB.where('documents', d => !d.deleted && !d.archived && d.type !== 'day' && String(d.title || '').toLowerCase().includes(q)).sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || ''))).slice(0, 8);
    host.replaceChildren(...(hits.length ? hits.map(d => HOT.row(d, HOT.isFav(d.id))) : [h('p.hn-empty', 'No note is called that.')]));
  },
  /** Settings' preview: the panel as it looks, three made-up notes, the star of one hovered; the stars work here. */
  preview() {
    const st = HOT._pv = HOT._pv || { fav: { a: true, b: true, c: false } }, wrap = h('div.pv-hn');
    const rows = [{ id: 'a', title: 'Run 3 · 30 kPa', sub: 'Cell mechanics › Edge forces', k: 'exp', key: 'pv-a|Edge forces' }, { id: 'b', title: 'Traction force microscopy — a review', sub: 'Cell mechanics', k: 'lit', key: 'pv-b|Cell mechanics' }, { id: 'c', title: 'Edge traction across stiffness', sub: 'TF-ELISA › Synthesis', k: 'syn', key: 'pv-c|TF-ELISA' }];
    const draw = () => { const n = HOT.suggest();
      wrap.replaceChildren(h('div.hn-pop.pv', h('div.hn-head', h('span.hn-hic', { html: HOT.STAR }), h('b', 'Hot notes'), h('span.hn-n', String(rows.filter(r => st.fav[r.id]).length)), h('button.hn-add', { type: 'button', tabindex: '-1' }, '+')),
        h('div.hn-list', rows.filter(r => st.fav[r.id]).map(r => HOT.rowEl(Object.assign({}, r, { fav: true, ban: BANNER.drawn(r.key), star: () => { st.fav[r.id] = false; draw(); } })))),
        h('div.hn-sh', 'Most visited'), h('div.hn-list.hn-sug', rows.filter(r => !st.fav[r.id]).map(r => HOT.rowEl(Object.assign({}, r, { fav: false, ban: BANNER.drawn(r.key), star: () => { st.fav[r.id] = true; draw(); } }))))),
        h('div.pv-hnrow', h('span.pv-hnt', 'Settings'), h('span.hot-btn.pv', h('span.hn-ic', { html: HOT.STAR_O }), h('span.hn-l', 'Hot notes'), h('span.hn-cnt', String(rows.filter(r => st.fav[r.id]).length))),
          HOT.inline() ? h('span.hn-strip', rows.filter(r => st.fav[r.id]).slice(0, HOT.inline()).map(r => h('span.hn-tab', { 'data-sk': r.k }, h('span.hn-tk'), h('span.hn-tt', r.title)))) : null),
        PV.cap('Hover a hot note: its golden star shows, and a click takes it out; an empty star adds one. Up to ' + n + ' of your most visited notes are suggested. ' + (HOT.inline() ? 'Your hot notes also sit in the tab row, after the button — up to ' + HOT.inline() + ', as many as fit.' : 'They are not shown in the tab row.') + ' Try the stars here.')); };
    draw(); return [wrap];
  },
};
{
  // the button, at the right of the tab row (after Settings)
  const rt = App.renderTabs; App.renderTabs = function () { const r = rt.apply(this, arguments); try { HOT.mount(); } catch (e) { console.warn('[hot notes]', e); } return r; };
  // a visit: going to a note (a split counts each of its notes)
  const seen = () => { try { const r = App.parse(); if (r.name === 'doc' && r.args[0]) HOT.visit(r.args[0]); else if (r.name === 'split' && typeof SplitView !== 'undefined') SplitView.parse(r.args).docs.forEach(id => HOT.visit(id)); } catch (e) { } };
  addEventListener('hashchange', () => { HOT.close(); seen(); setTimeout(() => HOT.strip(), 0); });
  const ready = setInterval(() => { if (!window.__ready) return; clearInterval(ready); seen(); HOT.count(); }, 200);
  addEventListener('resize', () => { HOT.place(); HOT.fit(); });
  // the switch: off, no button (and the panel closes)
  const ap = FEAT.apply; FEAT.apply = function () { const r = ap.apply(this, arguments); try { if (!HOT.on()) HOT.close(); } catch (e) { } return r; };
}
