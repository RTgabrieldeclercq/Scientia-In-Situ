/* ==========================================================================
   14g · References (V4.5). Gabe: "Add a new component kind called reference,
   which registers whatever is in that component for the user to quickly
   lookup or reference in another note. References are unique in which it can
   coexist with another kind. A reference list should become available. Add
   /reference as a command which brings a gallery popup for you to search your
   references. References should live as a separate inner tab of Atlas.
   Reports from HTMLs or PDFs should as well (in an additional tab in Atlas).
   Make the gallery view modern and almost like a clean display of each with
   ease of navigation and search capabilities."
   - A reference is a flag (`b.isRef`, `b.refAt`, `b.refT`), not a kind, so it sits
     beside any kind (a Result and a reference, a Method and a reference) or
     none: a bookmark hangs from the top of the card. Set from the kind picker
     ("Also a reference"), the component's menu, or /reference-mark.
   - /reference [words] opens the gallery over the note: one search (words,
     and type: kind: note: project: tag:), a row of filter chips, cards that
     show each reference as itself (words, image, table, equation, quote), a
     preview. ↑↓←→ move, Enter puts it in this note, Alt+Enter opens where it
     lives, Esc closes. Putting one in a note is a bridge (13zzu: live, it
     points back to its origin) marked `asRef`, drawn quieter: "Reference ·
     from …" and a dashed edge.
   - The Atlas gains two inner tabs beside its room: References (the list:
     gallery or rows, grouped by note, project, kind or date) and Reports
     (13zzy: every PDF and saved page that is a Report, with the figures
     snipped out of it).
   ========================================================================== */
const REFS = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('references'),
  opt: (k, d) => { try { const v = FEAT.tune('references', k); return v == null ? d : v; } catch (e) { return d; } },
  is: b => !!b && !!b.isRef && b.status === 'live',
  /** Every reference in the notebook (lit-review notes too), newest marked first. */
  list() {
    const t = b => b.refT || Date.parse(b.refAt || b.modified || '') || 0;   // refT: when it was marked, to the millisecond (two marked in one second keep their order)
    return DB.where('blocks', b => REFS.is(b) && b.kind !== 'ref' && (d => d && !d.deleted)(M.doc(b.docId))).sort((a, b) => t(b) - t(a));
  },
  toggle(b, on) {
    const cur = M.block(b && b.id); if (!cur) return; on = on == null ? !cur.isRef : !!on; if (!!cur.isRef === on) return;
    if (on) { cur.isRef = true; cur.refAt = isoLocal(new Date()); cur.refT = REFS._t = Math.max(Date.now(), (REFS._t || 0) + 1); } else { delete cur.isRef; delete cur.refAt; delete cur.refT; }
    cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed();
    toast(on ? 'A reference — find it with /reference from any note' : 'No longer a reference');
  },
  /** What it shows as: text · figure · table · equation · quote · pdf · page · other. */
  type(b) {
    if (!b) return 'other'; if (['figure', 'canvas', 'deck'].includes(b.kind)) return 'figure'; if (b.kind === 'pdf') return 'pdf'; if (b.kind === 'html') return 'page';
    if (['table', 'plot', 'plate', 'calc'].includes(b.kind)) return 'table'; if (b.kind === 'eq') return 'equation'; if (b.quote) return 'quote';
    return b.kind === 'component' ? 'text' : 'other';
  },
  TYPES: [['all', 'All'], ['text', 'Text'], ['figure', 'Figure'], ['table', 'Table'], ['equation', 'Equation'], ['quote', 'Quote'], ['pdf', 'PDF'], ['page', 'Page']],
  text: b => String((b.body && b.body.text) || '').replace(/￼/g, '').trim(),
  tex(b) { try { const r = EQ.rec && EQ.rec(b); return (r && r.tex) || (b.eq && b.eq.tex) || ''; } catch (e) { return (b.eq && b.eq.tex) || ''; } },
  /** Its tags: the terms it uses. */
  tags(b) { return [...new Set(((b.body && b.body.marks) || []).filter(m => m.type === 'term' && M.term(m.ref)).map(m => M.term(m.ref).label))]; },
  kindOf: b => { const K = typeof CKINDS !== 'undefined' && CKINDS.of(b); return K || null; },
  where(b) { const d = M.doc(b.docId) || {}; return { note: d.title || 'Untitled', project: (M.project(d.projectId) || {}).name || 'General', doc: d }; },
  /** How many other notes use it (its live copies). */
  uses(b) { try { return new Set(BRIDGE.out(b.id).map(x => x.docId)).size; } catch (e) { return 0; } },
  hay(b) { const w = REFS.where(b), K = REFS.kindOf(b); return [M.blockName(b), REFS.text(b), REFS.tex(b), w.note, w.project, REFS.tags(b).join(' '), K ? K.label : '', REFS.type(b), b.label || '',
    b.kind === 'table' ? REFS.cells(b).flat().join(' ') : ''].join(' ').toLowerCase(); },
  cells(b) { try { const T = b.table || {}, sh = (T.sheets || [])[T.cur || 0]; return ((sh && sh.cells) || []).map(r => (r || []).map(c => c && typeof c === 'object' ? String(c.v != null ? c.v : c.f || '') : String(c == null ? '' : c))); } catch (e) { return []; } },
  parse(q) { const out = { words: [], f: {} }; String(q || '').trim().split(/\s+/).filter(Boolean).forEach(t => { const m = /^(type|kind|note|project|tag):(.+)$/i.exec(t); if (m) out.f[m[1].toLowerCase()] = m[2].toLowerCase(); else out.words.push(t.toLowerCase()); }); return out; },
  /** The references that match: words anywhere in them; fields; the chips' type / kind / project. */
  find(q, o = {}) {
    const P = REFS.parse(q);
    return REFS.list().filter(b => {
      const ty = REFS.type(b), K = REFS.kindOf(b), w = REFS.where(b);
      if (o.type && o.type !== 'all' && ty !== o.type) return false;
      if (o.kind && o.kind !== 'all' && (K ? K.id : 'none') !== o.kind) return false;
      if (o.project && o.project !== 'all' && w.project !== o.project) return false;
      if (P.f.type && !ty.startsWith(P.f.type)) return false;
      if (P.f.kind && !(K ? K.label.toLowerCase() : 'reference').startsWith(P.f.kind)) return false;
      if (P.f.note && !w.note.toLowerCase().includes(P.f.note)) return false;
      if (P.f.project && !w.project.toLowerCase().startsWith(P.f.project)) return false;
      if (P.f.tag && !REFS.tags(b).some(t => t.toLowerCase().startsWith(P.f.tag))) return false;
      if (!P.words.length) return true; const hay = REFS.hay(b); return P.words.every(x => hay.includes(x));
    });
  },
  /** Words lit where they match (escaped first). */
  lit(text, words) {
    let s = String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    (words || []).filter(w => w.length > 1).forEach(w => { s = s.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '\u0001$1\u0002'); });
    return s.replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
  },
  /** A reference as itself, at card size or full. */
  content(b, words, big) {
    const ty = REFS.type(b), W = words || [];
    if (ty === 'figure') { const urls = (b.kind === 'figure' ? FIG.cells(b) : []).map(c => c.media && MEDIA.url(MEDIA.get(c.media))).filter(Boolean);
      return [urls.length ? h('div.rf-imgs' + (urls.length > 1 ? '.many' : ''), (big ? urls : urls.slice(0, 4)).map(u => h('img', { src: u, alt: M.blockName(b), loading: 'lazy' }))) : h('div.rf-none', b.kind === 'canvas' ? 'a canvas' : 'slides'),
        REFS.text(b) ? h('p.rf-tx', { html: REFS.lit(REFS.text(b), W) }) : null]; }
    if (ty === 'table') { const C = REFS.cells(b).filter(r => r.some(x => String(x).trim())); if (!C.length) return h('div.rf-none', b.kind);
      return h('div.rf-tbw', h('table.rf-tb', h('tbody', (big ? C.slice(0, 40) : C.slice(0, 5)).map((r, i) => h('tr', (big ? r : r.slice(0, 3)).map(x => h(i ? 'td' : 'th', { html: REFS.lit(x, W) })))))) ); }
    if (ty === 'equation') { const t = REFS.tex(b); return [h('div.rf-eq', t ? EQ.html(t, true) : M.blockName(b)), big && REFS.text(b) ? h('p.rf-tx', { html: REFS.lit(REFS.text(b), W) }) : null]; }
    if (ty === 'quote') { const q = b.quote || {}; return [h('p.rf-q', { html: '“' + REFS.lit(REFS.text(b), W) + '”' }), h('span.rf-cite', [q.file || q.paper || '', q.page ? 'p. ' + q.page : ''].filter(Boolean).join(' · '))]; }
    if (ty === 'pdf' || ty === 'page') return h('div.rf-doc', h('span.rf-dk', ty === 'pdf' ? 'PDF' : 'Page'), h('b', M.blockName(b)));
    const t = REFS.text(b); return t ? h('p.rf-tx' + (big ? '.big' : ''), { html: REFS.lit(big ? t : t.slice(0, 420), W) }) : h('div.rf-none', M.blockName(b));
  },
  kchip(b) { const K = REFS.kindOf(b); return K ? h('span.rf-k', { style: { '--kc': K.color } }, K.label) : h('span.rf-k.none', 'Reference'); },
  card(b, i, words, on, sel) {
    const w = REFS.where(b);
    return h('button.rf-card' + (sel ? '.sel' : ''), { type: 'button', 'data-id': b.id, 'data-i': i, 'aria-label': M.blockName(b), on },
      h('div.rf-top', REFS.kchip(b), h('span.rf-ty', REFS.type(b))),
      h('div.rf-ct', h('h4', { html: REFS.lit(M.blockName(b), words) }), REFS.content(b, words, false)),
      h('div.rf-foot', w.note + ' › ' + (b.label || M.blockName(b)) + ' · ' + fmtDay(b.refAt || b.created)));
  },
  /* ---------- putting one in a note, opening where it lives ---------- */
  insert(b, ctx) {
    const d = ctx && ctx.doc, pane = ctx && ctx.pane; if (!d || !pane) return REFS.open(b);
    if (b.docId === d.id) { App.jump(b.id); return toast('It lives in this note'); }
    const at = typeof CLIPX !== 'undefined' && CLIPX.spot ? CLIPX.spot(pane) : null;
    const r = BRIDGE.make(b, d, Object.assign({ quiet: true, why: '' }, at ? { at } : {}));
    if (!r) { const dup = DB.where('blocks', x => x.docId === d.id && BRIDGE.is(x) && x.status === 'live' && x.refBlockId === b.id)[0]; if (dup) { App.jump(dup.id); toast('It is in this note already'); } return null; }
    r.asRef = true; DB.put('blocks', r); changed(); setTimeout(() => { try { pane.reveal && pane.reveal(r.id); } catch (e) { } }, 60);
    toast('“' + snippet(M.blockName(b), 40) + '” is in this note — live, it follows the original');
    return r;
  },
  open(b, e) { App.jump(b.id, e); },

  /* ---------- the gallery (/reference) ---------- */
  G: null,
  gallery(o = {}) {
    if (!REFS.on()) return toast('References are off (Settings → Features → References)');
    REFS.close(); const ctx = o.ctx || {}, cur = ctx.doc ? REFS.where({ docId: ctx.doc.id }).project : null;
    const G = REFS.G = { q: o.q || '', type: REFS.opt('type', 'all'), kind: 'all', project: 'all', sel: 0, rows: [], ctx, cur };
    const inp = h('input.rf-qin', { type: 'search', placeholder: 'Search references — words, or type:figure  kind:result  note:gel  tag:…', 'aria-label': 'Search references', autocomplete: 'off', value: G.q,
      on: { input: e => { G.q = e.target.value; G.sel = 0; REFS.draw(); }, keydown: REFS.key } });
    const el = h('div.ovl.rf-ovl', { on: { mousedown: e => { if (e.target === el) REFS.close(); } } },
      h('div.rf-gal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'References' },
        h('div.rf-head', h('span.rf-ic', '⌕'), inp, h('span.rf-n')),
        h('div.rf-chips'), h('div.rf-body', h('div.rf-grid', { role: 'listbox', 'aria-label': 'References' }), h('aside.rf-prev', { 'aria-live': 'polite' })),
        h('div.rf-keys', h('span', h('kbd', '↑ ↓ ← →'), ' move'), h('span', h('kbd', 'Enter'), ctx.doc ? ' put it in this note' : ' open it'), h('span', h('kbd', 'Alt+Enter'), ' open where it lives'), h('span', h('kbd', 'Esc'), ' close'))));
    G.el = el; document.body.append(el); REFS.draw(); setTimeout(() => inp.focus(), 0);
  },
  close() { if (REFS.G && REFS.G.el) REFS.G.el.remove(); REFS.G = null; },
  chips(label, opts, cur, set) { return h('div.rf-fg', h('i', label), opts.map(([k, l]) => h('button.rf-chip' + (cur === k ? '.on' : ''), { type: 'button', 'aria-pressed': String(cur === k), on: { click: () => { set(k); REFS.G.sel = 0; REFS.draw(); } } }, l))); },
  draw() {
    const G = REFS.G; if (!G || !G.el.isConnected) return; const E = s => G.el.querySelector(s), words = REFS.parse(G.q).words;
    let rows = REFS.find(G.q, { type: G.type, kind: G.kind, project: G.project });
    const mine = G.cur && REFS.opt('scope', 'project') === 'project' ? rows.filter(b => REFS.where(b).project === G.cur) : [];
    if (mine.length && mine.length < rows.length) rows = [...mine, ...rows.filter(b => !mine.includes(b))]; G.rows = rows; G.split = mine.length && mine.length < rows.length ? mine.length : 0;
    G.sel = Math.min(G.sel, Math.max(0, rows.length - 1));
    E('.rf-n').textContent = rows.length + ' of ' + REFS.list().length;
    const kinds = [...new Set(REFS.list().map(b => (REFS.kindOf(b) || { id: 'none' }).id))].map(id => [id, id === 'none' ? 'Reference only' : CKINDS.get(id).label]);
    const projs = [...new Set(REFS.list().map(b => REFS.where(b).project))].map(p => [p, p]);
    E('.rf-chips').replaceChildren(REFS.chips('Type', REFS.TYPES.filter(([k]) => k === 'all' || REFS.list().some(b => REFS.type(b) === k)), G.type, k => G.type = k),
      kinds.length > 1 ? REFS.chips('Kind', [['all', 'Any'], ...kinds], G.kind, k => G.kind = k) : null, projs.length > 1 ? REFS.chips('Project', [['all', 'All'], ...projs], G.project, k => G.project = k) : null);
    const on = i => ({ click: () => REFS.pick(i), dblclick: () => REFS.go(false) });
    const cards = rows.map((b, i) => REFS.card(b, i, words, on(i), i === G.sel));
    if (G.split) cards.splice(G.split, 0, h('div.rf-split', 'Other projects'));
    E('.rf-grid').replaceChildren(...(cards.length ? cards : [h('div.rf-empty', REFS.list().length ? 'No reference matches “' + G.q + '”. Try fewer words, or clear a filter.' : 'No references yet. Double-click the label left of a component’s name and switch on “Also a reference”.')]));
    REFS.prev();
  },
  prev() {
    const G = REFS.G, P = G && G.el.querySelector('.rf-prev'); if (!P) return; const b = G.rows[G.sel]; if (!b) { P.replaceChildren(h('p.rf-hint', 'Nothing selected.')); return; }
    const w = REFS.where(b), tags = REFS.tags(b), n = REFS.uses(b);
    P.replaceChildren(h('div.rf-top', REFS.kchip(b), REFS.kindOf(b) ? h('span.rf-k.none', '· Reference') : null), h('h3', M.blockName(b)), h('div.rf-big', REFS.content(b, REFS.parse(G.q).words, true)),
      h('dl.rf-meta', h('dt', 'Lives in'), h('dd', w.note + ' › ' + (b.label || M.blockName(b))), h('dt', 'Project'), h('dd', w.project), tags.length ? [h('dt', 'Tags'), h('dd', tags.join(', '))] : null, h('dt', 'Marked'), h('dd', fmtDay(b.refAt || b.created))),
      h('p.rf-uses', n ? plural(n, 'other note uses', 'other notes use') + ' it' : 'No other note uses it yet'),
      h('div.rf-acts', G.ctx.doc ? h('button.btn.sm.pri', { type: 'button', on: { click: () => REFS.act('insert') } }, 'Put it in this note') : null, h('button.btn.sm', { type: 'button', on: { click: e => REFS.act('open', e) } }, 'Open where it lives')));
  },
  pick(i) { const G = REFS.G; G.sel = i; G.el.querySelectorAll('.rf-card').forEach(c => c.classList.toggle('sel', +c.dataset.i === i)); REFS.prev(); },
  /** Enter (alt: Alt+Enter) — Settings says which of the two Enter does; Alt+Enter does the other. */
  go(alt, e) { const swap = REFS.opt('enter', 'insert') === 'open'; return REFS.act((swap ? !alt : alt) ? 'open' : 'insert', e); },
  act(what, e) { const G = REFS.G, b = G && G.rows[G.sel]; if (!b) return; const ctx = G.ctx; REFS.close(); if (what === 'open' || !ctx.doc) REFS.open(b, e); else REFS.insert(b, ctx); },
  cols() { const cs = [...REFS.G.el.querySelectorAll('.rf-card')]; if (!cs.length) return 1; const t = cs[0].offsetTop; return Math.max(1, cs.filter(c => c.offsetTop === t).length); },
  key(e) {
    const G = REFS.G; if (!G) return; e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); return REFS.close(); } const n = G.rows.length; if (!n) return;
    const mv = d => { e.preventDefault(); REFS.pick(Math.max(0, Math.min(n - 1, G.sel + d))); const el = G.el.querySelector(`.rf-card[data-i="${G.sel}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
    if (e.key === 'ArrowRight') mv(1); else if (e.key === 'ArrowLeft') mv(-1); else if (e.key === 'ArrowDown') mv(REFS.cols()); else if (e.key === 'ArrowUp') mv(-REFS.cols());
    else if (e.key === 'Enter') { e.preventDefault(); REFS.go(e.altKey); }
  },

  /* ---------- the Atlas's inner tabs: Room · References · Reports ---------- */
  tab() { let t = 'room'; try { t = _ls.get('atlasTab', 'room') || 'room'; } catch (e) { } if (t === 'refs' && !REFS.on()) t = 'room'; if (t === 'reports' && !(typeof REPORT !== 'undefined' && REPORT.on())) t = 'room'; return t; },
  setTab(t) { try { _ls.set('atlasTab', t); } catch (e) { } App._mounted = false; App.refresh(); },
  tabs(cur) {
    const T = [['room', 'Room', ''], REFS.on() ? ['refs', 'References', REFS.list().length] : null, typeof REPORT !== 'undefined' && REPORT.on() ? ['reports', 'Reports', REFS.reports().length] : null].filter(Boolean);
    if (T.length < 2) return null;
    return h('div.rf-tabs', { role: 'tablist', 'aria-label': 'The Atlas' }, T.map(([k, l, n]) => h('button' + (cur === k ? '.on' : ''), { type: 'button', role: 'tab', 'data-t': k, 'aria-selected': String(cur === k), on: { click: () => { if (cur !== k) REFS.setTab(k); } } }, l, n !== '' ? h('span.c', String(n)) : null)));
  },
  P: { q: '', by: null, view: null, rq: '' },
  page() {
    const P = REFS.P; P.by = P.by || 'note'; P.view = P.view || REFS.opt('show', 'cards');
    const words = REFS.parse(P.q).words, rows = REFS.find(P.q), total = REFS.list().length;
    App.setTitle('Atlas', [h('span', 'references · ' + plural(total, 'reference'))]);
    const key = { note: b => REFS.where(b).note, project: b => REFS.where(b).project, kind: b => (REFS.kindOf(b) || { label: 'Reference only' }).label, date: b => new Date(String(b.refAt || b.created).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }[P.by];
    const groups = new Map(); rows.forEach(b => { const k = key(b); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); });
    const seg = (opts, cur, set) => h('div.rf-seg', opts.map(([k, l]) => h('button' + (cur === k ? '.on' : ''), { type: 'button', 'data-k': k, on: { click: () => { set(k); App._mounted = false; App.refresh(); } } }, l)));
    const tools = h('div.rf-tools', h('label.rf-pq', h('span', '⌕'), h('input', { type: 'search', placeholder: 'Search references', 'aria-label': 'Search references', value: P.q, on: { input: e => { P.q = e.target.value; const s = e.target.selectionStart; REFS.redrawPage(); const i = $('.rf-page .rf-pq input'); if (i) { i.focus(); i.setSelectionRange(s, s); } } } })),
      h('span.rf-lab', 'Group by'), seg([['note', 'Note'], ['project', 'Project'], ['kind', 'Kind'], ['date', 'Date']], P.by, k => P.by = k),
      h('span.rf-lab', 'Show'), seg([['cards', 'Gallery'], ['list', 'List']], P.view, k => P.view = k),
      h('button.btn.sm', { type: 'button', title: 'The gallery over a note: /reference', on: { click: () => REFS.gallery({}) } }, 'Open the gallery'));
    const open = b => ({ click: e => REFS.open(b, e) });
    const body = !total ? h('div.rf-emptypage', h('h3', 'No references yet'), h('p', 'Any component can be a reference as well as what it is: double-click the label left of its name and switch on “Also a reference”, or choose “Make it a reference” in its menu. Then /reference finds it from any note.'))
      : !rows.length ? h('p.rf-hint', 'No reference matches “' + P.q + '”.')
      : h('div.rf-groups', [...groups].map(([g, rs]) => h('section.rf-grp', h('h5', g, h('span', plural(rs.length, 'reference'))),
        P.view === 'list' ? h('div.rf-rows', rs.map(b => { const w = REFS.where(b), t = REFS.type(b);
          return h('div.rf-row', { role: 'button', tabindex: '0', 'data-id': b.id, on: Object.assign(open(b), { keydown: e => { if (e.key === 'Enter') REFS.open(b, e); } }) },
            h('span.rf-ty', t), h('span.rf-ti', { html: REFS.lit(M.blockName(b), words) }), REFS.kchip(b), h('span.rf-sn', { html: REFS.lit(t === 'equation' ? REFS.tex(b) : REFS.text(b).slice(0, 200), words) }), h('span.rf-wh', w.note), h('span.rf-us', String(REFS.uses(b)))); }))
          : h('div.rf-grid.page', rs.map((b, i) => REFS.card(b, i, words, open(b), false))))));
    return h('div.page.rf-page', tools, body);
  },
  redrawPage() { const p = $('.rf-page'); if (!p) return; const n = REFS.page(); p.replaceWith(n); },
  /** Every PDF and saved page that is a Report, with the figures snipped out of it. */
  reports() { return DB.where('blocks', b => b.status === 'live' && ['pdf', 'html'].includes(b.kind) && b.ckind === 'report' && (d => d && !d.deleted)(M.doc(b.docId))); },
  snips(r) { return DB.where('blocks', b => b.status === 'live' && b.kind === 'figure' && b.clip && b.clip.src === r.id); },
  reportsPage() {
    const P = REFS.P, q = P.rq.trim().toLowerCase(), all = REFS.reports();
    const rows = all.filter(r => !q || [M.blockName(r), REFS.where(r).note, REFS.where(r).project, ...REFS.snips(r).map(M.blockName)].join(' ').toLowerCase().includes(q));
    App.setTitle('Atlas', [h('span', 'reports · ' + plural(all.length, 'report'))]);
    const tools = h('div.rf-tools', h('label.rf-pq', h('span', '⌕'), h('input', { type: 'search', placeholder: 'Search reports and their Results', 'aria-label': 'Search reports', value: P.rq, on: { input: e => { P.rq = e.target.value; const s = e.target.selectionStart; const p = $('.rf-page'); if (p) p.replaceWith(REFS.reportsPage()); const i = $('.rf-page .rf-pq input'); if (i) { i.focus(); i.setSelectionRange(s, s); } } } })),
      h('span.rf-lab', plural(rows.length, 'report') + ' · ' + plural(rows.reduce((n, r) => n + REFS.snips(r).length, 0), 'figure') + ' snipped out of them'));
    const body = !all.length ? h('div.rf-emptypage', h('h3', 'No reports yet'), h('p', 'A PDF or a saved web page becomes a Report: double-click the tag left of its name (“pdf”, “html page”), or ⋯ → What kind is this…. Figures you snip out of a report land as Results and show here under it.'))
      : !rows.length ? h('p.rf-hint', 'No report matches “' + P.rq + '”.')
      : h('div.rf-reps', rows.map(r => { const w = REFS.where(r), S = REFS.snips(r);
        return h('article.rf-rep', { 'data-id': r.id }, h('button.rf-cover.' + r.kind, { type: 'button', title: 'Open it in its note', on: { click: e => REFS.open(r, e) } }, h('span.rf-dk', r.kind === 'pdf' ? 'PDF' : 'Page'), h('b', M.blockName(r))),
          h('div.rf-ri', h('span.rf-k', { style: { '--kc': (CKINDS.get('report') || {}).color || '#46607A' } }, 'Report'), h('h4', { html: REFS.lit(M.blockName(r), q ? [q] : []) }), h('span.rf-src', w.note + ' · ' + w.project)),
          h('div.rf-res', h('span.rf-lb', S.length ? plural(S.length, 'figure') + ' snipped out of it' : 'Nothing snipped out of it yet'),
            S.length ? h('div.rf-strip', S.map(f => { const c = FIG.cells(f)[0], u = c && c.media && MEDIA.url(MEDIA.get(c.media));
              return h('button.rf-thumb', { type: 'button', 'data-id': f.id, on: { click: e => REFS.open(f, e) } }, u ? h('img', { src: u, alt: M.blockName(f), loading: 'lazy' }) : h('span.rf-none', 'figure'), h('span', f.ckind === 'result' ? h('i.rf-dot') : null, M.blockName(f))); })) : null)); }));
    return h('div.page.rf-page', tools, body);
  },
};
{
  // the bookmark on a reference's card, beside its kind; a reference put in another note is quieter than a bridge
  const bx = DocView.box; DocView.box = function (b, d, p) {
    const el = bx.apply(this, arguments); if (!el || !b) return el;
    if (REFS.on() && b.isRef && b.kind !== 'ref') { el.classList.add('is-ref'); el.append(h('span.rf-mark', { title: 'A reference — /reference finds it from any note', 'aria-label': 'a reference' }, h('span.rl', 'Ref'), h('span.rib'))); }
    if (b.kind === 'ref' && b.asRef) { el.classList.add('ref-use'); const k = el.querySelector('.origin .or-k'); if (k) k.textContent = 'Reference · from'; const n = el.querySelector(':scope > .bh > .num'); if (n) n.textContent = 'Reference'; }
    return el; };
  // the kind picker: under the kinds, "Also a reference"
  const pick = CKINDS.pick; CKINDS.pick = function (b) {
    if (!REFS.on() || !b) return pick.apply(this, arguments);
    const cm = window.ctxMenu, cur = M.block(b.id) || b; window.ctxMenu = function (x, y, rows) { window.ctxMenu = cm; return cm.call(this, x, y, [...rows, 'sep', { label: (cur.isRef ? '✓ ' : '') + 'Also a reference', sub: 'Keeps its kind; /reference finds it from any note', run: () => REFS.toggle(cur) }]); };
    try { return pick.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // the component's menu (right-click or ⋯): Make it a reference / No longer a reference
  const bm = DocView.boxMenu; DocView.boxMenu = function (b) {
    if (!REFS.on() || !b || b.kind === 'ref' || b.status !== 'live') return bm.apply(this, arguments);
    const cm = window.ctxMenu; window.ctxMenu = function (x, y, rows) { window.ctxMenu = cm; const i = rows.findIndex(r => r && r.label === 'Bridge to another note…');
      const it = { label: b.isRef ? 'No longer a reference' : 'Make it a reference', sub: b.isRef ? 'It keeps its kind; /reference stops finding it' : 'It keeps its kind; /reference finds it from any note', run: () => REFS.toggle(b) };
      const out = rows.slice(); out.splice(i >= 0 ? i + 1 : 1, 0, it); return cm.call(this, x, y, out); };
    try { return bm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // /reference [words] — the gallery; /reference-mark — this component is a reference
  CMD.add({ slash: 'reference', label: 'A reference…', args: [{ name: 'q', kind: 'text', optional: true, ask: 'search' }], alias: ['references', 'ref'], group: 'Note', sub: 'Search your references in a gallery; Enter puts one in this note, live',
    run: (A, ctx) => { REFS.gallery({ q: (A && A.q) || '', ctx }); } });
  CMD.add({ slash: 'reference-mark', label: 'Make this component a reference', args: [], alias: ['mark-reference'], group: 'Note', sub: 'It keeps its kind; /reference finds it from any note',
    run: (A, ctx) => { const b = ctx && (ctx.block || (ctx.pane && ctx.pane.sel && M.block(ctx.pane.sel))); if (!b) throw new Error('select a component first'); REFS.toggle(b, true); return 'A reference'; } });
  // the Atlas: its inner tabs; the room stays the first
  const ar = ATLAS.render; ATLAS.render = function () {
    const t = REFS.tab(), bar = REFS.tabs(t);
    if (t === 'refs') return h('div.atlas.rf-atlas', bar, REFS.page());
    if (t === 'reports') return h('div.atlas.rf-atlas', bar, REFS.reportsPage());
    const v = ar.apply(this, arguments); if (bar && v) v.prepend(bar); return v; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && REFS.G) { e.preventDefault(); e.stopPropagation(); REFS.close(); } }, true);
}
