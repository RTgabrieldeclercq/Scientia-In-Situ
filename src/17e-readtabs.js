/* ==========================================================================
   17e · Reading across notes (V4.2 — Gabe: "The origin note of the
   embedded paper or HTML brings you to it when you switch tabs when you are
   in the beside view. Papers that are cited in other notes are brought up as
   a choice for where to navigate when you are reading it." · "A quote from a
   paper has the citation more visible, like the recent update to the bridge
   origin annotation showing up on the bridge component. A quote or excerpt
   of a quote or paper bridged to another note carries both the bridge and
   citation origin annotations. Clicking on the citation annotation opens the
   paper in the beside view.")
   What the reader beside a note (13zzb: tabs, ◫ split) learns from the
   Library:
   • + on the tab row: the papers and pages of your notes, and the papers of
     the Library with a PDF — one that isn't in a note yet opens on its
     literature note, where the Library's reader keeps its highlights.
   • A tab of a paper of the Library is named by its short reference.
   • Cited in: the notes that cite the paper you are reading (a /cite mark)
     and the other notes it is embedded in — a line of them under each pane's
     bar and "Cited in · N" (the components, with their words; click: go
     there, the reader stays; Alt+click: beside). A paper or page not linked
     to the Library can be linked from there.
   • A quote shows where it is from in a band like a bridge's (V3.994): the
     paper's reference, the page, its title and the note it is embedded in
     when that is another. A quote, a passage of one, a highlight of the
     Library's reader or the paper itself bridged to another note carries
     both bands — the bridge's, then the citation's. Click the citation band:
     the paper opens beside the note (a tab), at the quote.
   • The Library's reader (#/read/…) shows the same tabs (click: the note it
     is in, read beside it), ◧ Beside its note, + and Cited in.
   ========================================================================== */
const RDX = {
  /** The Library's entry for an embedded paper or page: linked by hand, the same file, the paper record an older notebook may carry (rmPaper, read only), the page's address. */
  libOf(b) {
    if (!b) return null; if (b.libId) { const l = M.lib(b.libId); if (l) return l; }
    const all = DB.all('library'), u = b.web && (b.web.final || b.web.url);
    return all.find(l => l.pdf && b.media && l.pdf === b.media) || (b.rmPaper ? all.find(l => String(l.rmId || l.id) === String(b.rmPaper)) : null) || (u ? all.find(l => l.url && RDX.sameUrl(l.url, u)) : null) || null;
  },
  sameUrl(a, b) { const n = x => String(x || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase(); return !!a && !!b && n(a) === n(b); },
  KL: { cite: 'cites it', embed: 'embeds it', shows: 'shows it' },
  alive: b => !!b && b.status === 'live' && !!M.doc(b.docId) && !M.doc(b.docId).deleted,
  /** The components that show this paper (or page). */
  embedsOf(lib) { return lib ? DB.where('blocks', b => RDOCK.KINDS[b.kind] && RDX.alive(b) && (RDX.libOf(b) || {}).id === lib.id) : []; },
  /** An embed to read the paper in: one on its literature note, or any; else a new one on its literature note (where the Library's reader keeps its highlights). */
  embedFor(lib) {
    if (!lib) return null; const es = RDX.embedsOf(lib).filter(b => MEDIA.get(b.media)), lit = READER.litDoc(lib, false), e = (lit && es.find(b => b.docId === lit.id)) || es[0]; if (e) return e;
    if (!lib.pdf || !MEDIA.get(lib.pdf)) return null;
    const d = READER.litDoc(lib), live = M.liveBlocks(d.id), x0 = live.length ? Math.min(...live.map(b => b.x || 0)) - 700 : 0, y0 = live.length ? Math.min(...live.map(b => b.y || 0)) : 0;
    const b = M.addBlock(d.id, null, { kind: 'pdf', label: lib.title || 'Paper', media: lib.pdf, libId: lib.id, x: Math.round(x0 / 14) * 14, y: Math.round(y0 / 14) * 14, w: 616, h: 560, view: 'scroll', cur: 0 });
    IX.rebuild(); changed(); return M.block(b.id) || b;
  },
  /** Where the paper is cited (a /cite mark) and, as Settings says, the other notes it is embedded in: [{ t: 'cite' | 'embed', b }] */
  citedIn(lib, exceptId) {
    if (!lib) return []; const seen = new Set(), out = [];
    (IX.citations.get(lib.id) || []).forEach(id => { const b = M.block(id); if (b && RDX.alive(b) && !seen.has(id)) { seen.add(id); out.push({ t: 'cite', b }); } });
    if (RDOCK.tn('citedin', 'embeds', true) !== false) { const es = RDX.embedsOf(lib), eid = new Set(es.map(b => b.id));
      es.forEach(b => { if (b.id !== exceptId && !seen.has(b.id)) { seen.add(b.id); out.push({ t: 'embed', b }); } });
      DB.where('blocks', x => BRIDGE.is(x) && !x.refSpan && eid.has(x.refBlockId) && RDX.alive(x)).forEach(b => { if (!seen.has(b.id)) { seen.add(b.id); out.push({ t: 'shows', b }); } }); }   // the paper bridged into a note
    return out;
  },
  /** A few words of a citing component, round the citation. */
  words(b, lib) {
    const t = (b.body && b.body.text) || '', mk = ((b.body && b.body.marks) || []).find(m => m.type === 'cite' && lib && m.ref === lib.id), ref = lib ? '(' + LIB.shortRef(lib) + ')' : '';
    if (!mk) return snippet(t.replace(/￼/g, ref), 110);
    const a = Math.max(0, mk.from - 70), z = Math.min(t.length, mk.to + 50);
    return (a > 0 ? '…' : '') + t.slice(a, mk.from).replace(/￼/g, '') + ref + t.slice(mk.to, z).replace(/￼/g, '') + (z < t.length ? '…' : '');
  },
  /** The list: by note, the components, their words. Click: go there (the reader stays); Alt+click: beside. */
  list(lib, exceptId, close) {
    const rows = RDX.citedIn(lib, exceptId), by = new Map(); rows.forEach(r => { if (!by.has(r.b.docId)) by.set(r.b.docId, []); by.get(r.b.docId).push(r); });
    if (!rows.length) return h('div.rcx-none', 'No note cites it yet — /cite in a note does.');
    return h('div.rcx-list', [...by].map(([docId, rs]) => { const d = M.doc(docId);
      return h('div.rcx-note', h('div.rcx-nt', { title: M.docPath(d) }, d.title || 'Untitled', h('span', M.docPath(d).split(' › ').slice(0, -1).join(' › '))),
        rs.map(r => h('button.rcx-row', { type: 'button', title: 'Go to it — the reader stays · Alt+click: beside', on: { click: e => { e.stopPropagation(); close && close(); App.jump(r.b.id, e); } } },
          h('span.rcx-k' + (r.t !== 'cite' ? '.emb' : ''), RDX.KL[r.t]), h('b', M.blockName(r.b)), r.t === 'cite' ? h('span.rcx-w', RDX.words(r.b, lib)) : null))); }));
  },
  /** Cited in · N on a pane's bar: the list in a popover. A paper not linked to the Library is linked from here. */
  menu(src, at) {
    const lib = RDX.libOf(src), r = at.getBoundingClientRect(), what = src.kind === 'html' ? 'page' : 'paper';
    const pop = popover(Math.max(8, r.left - 140), r.bottom + 6, [h('h5', 'Cited in'),
      lib ? h('div.rcx-ref', h('b', LIB.shortRef(lib)), ' ', snippet(lib.title || lib.url || '', 90)) : h('div.rcx-ref', 'This ' + what + ' isn’t linked to a paper of the Library, so its citations can’t be found.'),
      lib ? RDX.list(lib, src.id, () => closePop()) : h('button.btn.xs', { on: { click: () => { closePop(); RDX.link(src); } } }, 'Link it to a paper of the Library…')], { cls: 'pop rcx-pop' });
    return pop;
  },
  link(src) {
    const m = modal({ title: 'Which paper of the Library is it?', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search the Library…', sort: 'rdlink',
      items: q => DB.all('library').filter(l => !q || ((l.title || '') + ' ' + LIB.shortRef(l) + ' ' + (l.doi || '')).toLowerCase().includes(q)),
      render: l => h('div', h('b', LIB.shortRef(l)), ' ', h('span.serif', snippet(l.title || l.url || '', 90))),
      onPick: l => { m.close(); const b = M.block(src.id); if (!b) return; b.libId = l.id; DB.put('blocks', b); changed(); toast('Linked to ' + LIB.shortRef(l) + ' — its citations show now'); setTimeout(() => { const p = RDOCK.paneOf(b.id); if (p) RDOCK.open(M.block(b.id), { pane: p.i }); }, 50); } }) });
  },
  /** The line under a pane's bar: Cited in · the notes, one chip each (one component: straight there; several: the list). */
  strip(p, b) {
    if (!p || !p.ov || !RDOCK.ftOn('citedin') || RDOCK.tn('citedin', 'strip', true) === false) return; const lib = RDX.libOf(b); if (!lib) return;
    const rows = RDX.citedIn(lib, b.id); if (!rows.length) return; const by = new Map(); rows.forEach(r => { if (!by.has(r.b.docId)) by.set(r.b.docId, []); by.get(r.b.docId).push(r); });
    const el = h('div.rcx-strip', h('span.rcx-sk', 'Cited in'), [...by].map(([docId, rs]) => h('button.rcx-chip', { type: 'button', title: rs.map(r => M.blockName(r.b)).join(' · ') + '\nClick: go there — the reader stays · Alt+click: beside',
      on: { click: e => { e.stopPropagation(); if (rs.length === 1) return App.jump(rs[0].b.id, e); const rr = e.currentTarget.getBoundingClientRect(); popover(rr.left, rr.bottom + 6, [h('h5', (M.doc(docId) || {}).title || 'Note'), h('div.rcx-list', rs.map(r => h('button.rcx-row', { type: 'button', on: { click: ev => { closePop(); App.jump(r.b.id, ev); } } }, h('span.rcx-k' + (r.t !== 'cite' ? '.emb' : ''), RDX.KL[r.t]), h('b', M.blockName(r.b)), r.t === 'cite' ? h('span.rcx-w', RDX.words(r.b, lib)) : null)))], { cls: 'pop rcx-pop' }); } } },
      (M.doc(docId) || {}).title || 'Untitled', rs.length > 1 ? h('span', rs.length) : null)));
    const bar = $(':scope > .em-bar', p.ov); if (bar) bar.after(el);
  },
  /* ---------- where a quote is from: the citation band ---------- */
  /** What a component quotes, as a source: a quote (its embed → the Library), a highlight of the Library's reader, an embedded paper or page itself. */
  citeOf(ob) {
    if (!ob) return null;
    if (ob.quote && ob.quote.src && !ob.quote.note) { const src = M.block(ob.quote.src); return { kind: 'quote', src: src && src.status !== 'removed' ? src : null, lib: src ? RDX.libOf(src) : null, page: ob.quote.page || null, q: ob, file: ob.quote.file || '' }; }
    if (ob.anchor && ob.anchor.source && M.lib(ob.anchor.source)) { const lib = M.lib(ob.anchor.source); return { kind: 'hl', src: null, lib, page: ob.anchor.page || null, q: ob, rects: ob.anchor.rects || null }; }
    if (RDOCK.KINDS[ob.kind]) return { kind: 'embed', src: ob, lib: RDX.libOf(ob), page: null };
    return null;
  },
  band(c, d) {
    const lib = c.lib, src = c.src, page = c.kind === 'embed' && src && src.kind === 'html' ? null : c.page, html = src && src.kind === 'html';
    const title = lib ? (lib.title || lib.url || 'Paper') : src ? (src.label || c.file || (html ? 'Page' : 'PDF')) : (c.file || 'the paper');
    const ref = lib && lib.kind !== 'link' && (lib.authors || []).length ? LIB.shortRef(lib) : '', sd = src && M.doc(src.docId), elsewhere = sd && d && sd.id !== d.id;
    const K = c.kind === 'embed' ? (html ? '❝ The page' : '❝ The paper') : c.kind === 'hl' ? '❝ Highlighted in' : '❝ Quoted from', full = RDOCK.tn('citeband', 'detail', 'full') !== 'short', gone = !src && !lib;
    const open = e => { e.stopPropagation(); e.preventDefault(); if (!gone) RDX.openCite(c, e); };
    const path = [ref && full ? snippet(title, 110) : '', elsewhere ? 'in ' + (sd.title || 'Untitled') : '', lib && lib.year && !ref ? lib.year : ''].filter(Boolean).join(' · ');
    return h('div.origin.or-cite' + (gone ? '.or-gone' : ''), { title: gone ? 'The paper is no longer here' : 'Click: open the ' + (html ? 'page' : 'paper') + ' beside the note' + (page ? ', at p. ' + page : '') + (c.q ? ', at the passage' : ''), on: { click: open } },
      h('div.or-top', h('span.or-k', K), h('a.or-note', ref || snippet(title, 70)), page ? h('span.or-pg', 'p. ' + page) : null, gone ? null : h('button.or-go', { type: 'button', title: 'Open it beside the note', on: { click: open } }, '◧')),
      path && !gone ? h('div.or-path', path) : null);
  },
  /** The citation band clicked: the paper beside the note (a tab), at the quote; or, as Settings says, in its card. */
  openCite(c, e) {
    let src = c.src && c.src.status === 'live' ? c.src : null;
    if (!src && c.lib) src = RDX.embedFor(c.lib);
    if (!src) { if (c.lib && c.lib.pdf) return App.go('#/read/' + c.lib.id + (c.page ? '/' + c.page : '')); return toast('The paper isn’t here any more'); }
    if (RDOCK.tn('citeband', 'click', 'beside') === 'card' || RDOCK.phone() || (e && e.altKey)) { if (c.q && c.q.quote) return QUOTE.goto(M.block(c.q.id)); return App.openBlock(src.id); }
    RDOCK.open(M.block(src.id));
    const q = c.q && c.q.quote ? M.block(c.q.id) : null, page = c.page; let n = 0;
    const go = () => { const p = RDOCK.paneOf(src.id); if (!p) return; const pdf = src.kind === 'pdf';
      if (q && pdf) { if ($(`.pdf-slot[data-p="${q.quote.page || 1}"] canvas`, p.ov)) return setTimeout(() => MXHL.goto(src.id, q), 250); }
      else if (q) { if ($('iframe', p.ov)) return setTimeout(() => MXHL.goto(src.id, q), 900); }
      else if (page && pdf) { if (RDOCK.goPage(p, page, c.rects && c.rects[0] ? c.rects[0][1] : 0)) return; }
      else return;
      if (++n < 80) setTimeout(go, 100); };
    setTimeout(go, 200);
  },
  color() { const v = RDOCK.tn('citeband', 'color', '#3b5bdb'); try { document.documentElement.style.setProperty('--cite', /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#3b5bdb'); } catch (e) { } },
  /* ---------- + on the tab row ---------- */
  picker() {
    const S = RDOCK.S_, docOk = b => RDX.alive(b) && MEDIA.get(b.media);
    const items = q => { const emb = [], lib = [];
      DB.where('blocks', b => RDOCK.KINDS[b.kind] && docOk(b)).forEach(b => { const l = RDX.libOf(b), txt = (RDOCK.label(b) + ' ' + (b.label || '') + ' ' + (l ? (l.title || '') + ' ' + LIB.shortRef(l) : '') + ' ' + ((M.doc(b.docId) || {}).title || '')).toLowerCase(); if (!q || txt.includes(q)) emb.push({ t: 'emb', x: b, lib: l }); });
      DB.all('library').filter(l => l.pdf && MEDIA.get(l.pdf) && !RDX.embedsOf(l).length).forEach(l => { if (!q || ((l.title || '') + ' ' + LIB.shortRef(l)).toLowerCase().includes(q)) lib.push({ t: 'lib', x: l }); });
      const rank = o => S.tabs.includes(o.x.id) ? 0 : o.x.kind === 'pdf' ? 1 : 2;
      return emb.sort((a, z) => rank(a) - rank(z) || (z.x.modified || '').localeCompare(a.x.modified || '')).concat(lib); };
    const m = modal({ title: 'Open in a tab', wide: true, actions: [{ label: 'Cancel' }], body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'A paper or page of any note opens beside the one you are in. A paper of the Library that isn’t in a note yet opens on its literature note.'),
      optionPicker({ placeholder: 'Search papers and pages…', sort: 'rdtabs', items, section: o => o.t === 'lib' ? 'In the Library, not in a note yet' : S.tabs.includes(o.x.id) ? 'Open in a tab already' : o.x.kind === 'html' ? 'Pages in your notes' : 'Papers in your notes',
        render: o => o.t === 'lib' ? h('div', h('span.rd-tk', 'PDF'), ' ', h('b', LIB.shortRef(o.x)), ' ', h('span.serif', snippet(o.x.title || '', 90)), h('span.s', 'Library — opens on its literature note'))
          : h('div', h('span.rd-tk', o.x.kind === 'pdf' ? 'PDF' : 'Page'), ' ', h('b', RDOCK.label(o.x)), o.lib && RDOCK.label(o.x) !== o.lib.title ? h('span.serif', ' ' + snippet(o.lib.title || '', 70)) : null, h('span.s', M.docPath(M.doc(o.x.docId)))),
        onPick: o => { m.close(); const b = o.t === 'lib' ? RDX.embedFor(o.x) : o.x; if (!b) return toast('That paper has no PDF here'); if (RDOCK.wrap && App.panes().length) RDOCK.open(M.block(b.id)); else RDX.goTab(b.id); } })) });
  },
  /** From outside a note (the Library's reader): this tab, read beside the note it is in. */
  goTab(id) {
    const b = M.block(id); if (!b) return; const S = RDOCK.S_;
    if (!RDOCK.tabsOn()) { App.openBlock(id); return setTimeout(() => RDOCK.open(M.block(id)), 400); }
    if (!S.tabs.includes(id)) { S.tabs.push(id); RDOCK.trimTabs(); } const k = S.show.indexOf(id); if (k >= 0) S.act = k; else S.show[clamp(S.act, 0, S.n - 1)] = id; S.open = true; RDOCK.save();
    if (RDOCK.wrap && App.panes().length) { RDOCK.open(b); return RDOCK.follow(id); }
    App.openBlock(id);
  },
};
{
  // a tab of a paper of the Library: its short reference (or its title, as Settings says)
  const lb = RDOCK.label; RDOCK.label = function (b) { const l = b && RDX.libOf(b); if (l && l.kind !== 'link' && (l.authors || []).length) return RDOCK.tn('rtabs', 'names', 'ref') === 'title' ? snippet(l.title || lb(b), 60) : LIB.shortRef(l); return lb(b); };
  RDOCK.picker = RDX.picker;
  // Cited in · N on each pane's bar, and the line of notes under it
  RDOCK.extras.push((p, b) => { if (!RDOCK.ftOn('citedin')) return null; const lib = RDX.libOf(b), n = lib ? RDX.citedIn(lib, b.id).length : 0;
    return h('button.btn.xs.rcx-btn' + (n ? '.on' : ''), { title: lib ? 'The notes that cite this ' + (b.kind === 'html' ? 'page' : 'paper') + ' — click one to go there' : 'Not linked to the Library yet: link it to find its citations', on: { click: e => { e.stopPropagation(); RDX.menu(M.block(b.id), e.currentTarget); } } }, n ? 'Cited in · ' + n : 'Cited in'); });
  const bd = RDOCK.build; RDOCK.build = function (i, b) { const p = bd.apply(this, arguments); try { RDX.strip(p, b); } catch (e) { console.warn('[cited in]', e); } return p; };
  // the quote: its band at the top, instead of "❝ from …"
  const bx = DocView.box; DocView.box = function (b, d) { const el = bx.apply(this, arguments);
    if (el && b && b.quote && !b.quote.note && RDOCK.ftOn('citeband')) { try { const c = RDX.citeOf(b); if (c) { const f = $(':scope > .q-from', el); if (f) f.remove(); const ed = $(':scope > .ed', el), band = RDX.band(c, d || M.doc(b.docId)); ed ? el.insertBefore(band, ed) : el.append(band); el.classList.add('q-cited'); } } catch (e) { console.warn('[cite band]', e); } }
    return el; };
  // a bridge of a quote, a passage of one, a highlight or the paper itself: the bridge's band, then the citation's
  const rc = DocView.refCard; DocView.refCard = function (b, d) { const card = rc.apply(this, arguments);
    if (!card || !b || b.refItemId || !RDOCK.ftOn('citeband')) return card;
    try { const c = RDX.citeOf(M.block(b.refBlockId)); if (c) { const band = RDX.band(c, d); band.classList.add('or-2'); const o = card.querySelector(':scope > .origin'); o ? o.after(band) : card.prepend(band); card.classList.add('has-cite'); } } catch (e) { console.warn('[cite band]', e); }
    return card; };
  // the Library's reader: the tabs, ◧ Beside its note, + and Cited in
  const rv = ReaderView.render; ReaderView.render = function (libId, page) { const host = rv.apply(this, arguments), lib = M.lib(libId), bar = host && $(':scope > .rd-bar', host);
    if (bar && lib && !RDOCK.phone()) { const back = bar.firstChild, S = RDOCK.S_;
      const tabs = RDOCK.tabsOn() && RDOCK.tn('rtabs', 'libtabs', true) !== false && S.tabs.length ? h('div.rd-tabs.rd-libtabs', h('div.rd-tl', S.tabs.map(M.block).filter(Boolean).map(b => h('div.rd-tab' + ((RDX.libOf(b) || {}).id === lib.id ? '.act' : ''), { role: 'tab', tabindex: '0', title: RDOCK.label(b) + ' — read it beside its note, ' + ((M.doc(b.docId) || {}).title || ''), on: { click: () => RDX.goTab(b.id), keydown: e => { if (e.key === 'Enter') RDX.goTab(b.id); } } }, h('span.rd-tk', b.kind === 'pdf' ? 'PDF' : 'Page'), h('span.rd-tn', RDOCK.label(b))))),
        h('button.rd-tadd', { type: 'button', title: 'Open another paper or page in a tab', on: { click: e => RDOCK.picker(e) } }, '+')) : null;
      const beside = lib.pdf && MEDIA.get(lib.pdf) ? h('button.btn.sm.rcx-beside', { title: 'Read it beside its literature note — a tab of the reader, with your notes in the other half', on: { click: () => { const e = RDX.embedFor(lib); if (e) RDX.goTab(e.id); } } }, '◧ Beside its note') : null;
      if (tabs) back.after(tabs); const lit = [...bar.children].find(x => /Literature note/.test(x.textContent)); if (beside) (lit ? lit.before(beside) : bar.append(beside)); }
    return host; };
  const ds = ReaderView.drawSide; ReaderView.drawSide = function () { const r = ds.apply(this, arguments);
    if (this.side && this.lib && RDOCK.ftOn('citedin')) { const n = RDX.citedIn(this.lib).length; this.side.prepend(h('div.rcx-side', h('div.rd-sh', h('b', n ? 'Cited in · ' + n : 'Cited in'), h('div.tiny.muted', 'The notes that cite this paper, and the notes it is in — click one to go there')), RDX.list(this.lib, null))); }
    return r; };
  RDX.color();
}
