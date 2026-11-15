/* ==========================================================================
   17e · Library search, and a paper's reading state (V4.1 — Gabe: "The
   search in the library should be updated to be better and have more ways to
   search").
   One query language, the lab Library's (rm/js/library.js _parseQuery:
   field:value, "a phrase", -word, added:7d), with more fields:
     title:  author: (au:)  year: (2014 · 2010-2016 · >2018 · <=2005)
     journal:  doi:  shelf: (theme: topic:)  focus: (group:) — "shelf › focus"
     cited: (in:) the notes that cite it · hl: its highlights · quote: the
     quotes taken from its PDF in notes · note: the notes on its highlights and
     the structures taken from it · text: the PDF's own words (read once in a
     session) · is: unread reading read annotated cited uncited unfiled pdf
     nopdf link paper preprint flagged · added: today 7d 30d year 2026-10
     older · kind: paper|link · a OR b
   Plain words look in the record (title, authors, journal, year, DOI, the
   names of its shelves and foci), then, with "inside" on, in its highlights,
   quotes and notes; each result says where it matched. Facets count what the
   results hold. A smart focus (17d) is a saved query: its papers are the ones
   that match, with the ones put in it by hand.
   LIBSTATE: unread · reading · read. Set by hand on the paper's sheet; a paper
   with highlights and no state counts as reading; opening its PDF makes an
   unread one "reading" (Settings → Reading state).
   LIB.search keeps its plain behaviour; a query with fields goes through here,
   so the citation picker understands author: and year: too.
   ========================================================================== */
const LIBSTATE = {
  LABEL: { unread: 'Not opened', reading: 'Reading', read: 'Read' },
  of(r, f) { if (!r) return 'unread'; if (r.readState) return r.readState; const F = f || (LSEARCH._ix && LSEARCH._ix.get(r.id)); return F && F.hl.length ? 'reading' : 'unread'; },
  set(r, s) { if (!r || r.readState === s) return; DB.beginGroup('library'); DB.put('library', Object.assign({}, r, { readState: s, readAt: isoLocal(new Date()) })); changed(); },
  /** The reader opened this paper's PDF. */
  opened(id) { try { if (!FEAT.on('libread') || !FEAT.tune('libread', 'auto')) return; const r = M.lib(id); if (r && r.pdf && !r.readState) LIBSTATE.set(r, 'reading'); } catch (e) { } },
};

const LSEARCH = {
  FIELDS: { title: 'title', author: 'author', au: 'author', year: 'year', y: 'year', journal: 'journal', j: 'journal', doi: 'doi', shelf: 'shelf', theme: 'shelf', topic: 'shelf', focus: 'focus', group: 'focus',
    cited: 'cited', in: 'cited', hl: 'hl', highlight: 'hl', quote: 'quote', note: 'note', text: 'text', is: 'is', added: 'added', kind: 'kind' },
  IS: ['unread', 'reading', 'read', 'annotated', 'cited', 'uncited', 'unfiled', 'pdf', 'nopdf', 'link', 'paper', 'preprint', 'flagged'],
  HINT: { title: 'words in the title', author: 'an author’s name', year: '2014 · 2010-2016 · >2018', journal: 'a journal', doi: 'part of a DOI', shelf: 'on a shelf', focus: 'in a focus (shelf › focus)', cited: 'cited in a note with these words',
    highlight: 'words in its highlights', quote: 'words in the quotes taken from it', note: 'notes on its highlights, structures from it', text: 'the PDF’s own words', is: 'unread · reading · read · annotated · cited · unfiled…',
    added: 'today · 7d · 30d · year · 2026-10', kind: 'paper · link', theme: 'the lab’s word for shelf', topic: 'the lab’s word for shelf', group: 'the lab’s word for focus' },

  /* ---------- the query ---------- */
  /** → [{ neg, field, v, phrase, any? }] — `any` holds the alternatives of an OR. Unknown "x:" words stay plain words. */
  parse(q) {
    const out = [], re = /(-?)(?:([a-z]+):)?(?:"([^"]*)"?|(\S+))/gi; let m, or = false;
    while ((m = re.exec(q || ''))) {
      const raw = m[0]; if (!raw.trim()) continue; if (raw === 'OR') { or = true; continue; }
      const key = m[2] && m[2].toLowerCase(), f = key && LSEARCH.FIELDS[key]; let v = (m[3] != null ? m[3] : m[4] || '').trim();
      if (key && !f) v = key + ':' + v;
      if (!v) continue;
      const t = { neg: m[1] === '-', field: f || null, v: v.toLowerCase(), phrase: m[3] != null };
      if (or && out.length) { const last = out[out.length - 1]; if (!last.any) last.any = [Object.assign({}, last)]; last.any.push(t); or = false; } else out.push(t);
    }
    return out;
  },
  unparse(t) { return t.any ? t.any.map(LSEARCH.unparse).join(' OR ') : (t.neg ? '-' : '') + (t.field ? t.field + ':' : '') + (t.phrase || /\s/.test(t.v) ? '"' + t.v + '"' : t.v); },
  quoteV: v => /\s/.test(v) ? '"' + v + '"' : v,

  /* ---------- what each paper holds (built once, again when the notebook changes) ---------- */
  _ix: null, _sig: '', _smart: new Map(), _depth: 0,
  bust() { LSEARCH._ix = null; LSEARCH._smart = new Map(); },
  sig: () => ['library', 'libsets', 'blocks', 'documents', 'items', 'flags'].map(s => DB.all(s).length).join(':') + ':' + (IX.citations ? IX.citations.size : 0),
  index() {
    const s = LSEARCH.sig(); if (LSEARCH._ix && LSEARCH._sig === s) return LSEARCH._ix;
    const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
    const lit = new Map(); DB.where('documents', d => d.type === 'literature' && d.libId).forEach(d => lit.set(d.libId, d));
    const embeds = new Map(), embBy = new Map(), quotesBy = new Map(), itemsBy = new Map();
    DB.where('blocks', b => b.kind === 'pdf' && b.media && b.status === 'live').forEach(b => { embeds.set(b.id, b); push(embBy, b.media, b); });
    DB.where('blocks', b => b.quote && b.quote.src && b.status === 'live').forEach(q => { const e = embeds.get(q.quote.src); if (e) push(quotesBy, e.media, q); });
    DB.where('items', it => it.sourceRef && it.sourceRef.type === 'library' && it.sourceRef.id).forEach(it => push(itemsBy, it.sourceRef.id, it));
    const F = new Map();
    for (const r of DB.all('library')) {
      const d = lit.get(r.id), hlb = d ? M.liveBlocks(d.id).filter(b => b.anchor && b.anchor.source === r.id && b.status !== 'removed') : [];
      const txt = b => (b && b.body && b.body.text) || '';
      const hl = hlb.map(b => ({ b, page: b.anchor.page, text: txt(b) }));
      const notes = hlb.flatMap(b => (typeof READER.notesOf === 'function' ? READER.notesOf(b) : []).map(n => ({ b: n, page: b.anchor.page, text: txt(n) })))
        .concat((itemsBy.get(r.id) || []).map(it => ({ it, page: it.sourceRef.page || null, text: it.text || '' })));
      const quotes = ((r.pdf && quotesBy.get(r.pdf)) || []).map(q => ({ b: q, page: q.quote.page || null, text: q.quote.exact || txt(q), doc: M.doc(q.docId) }));
      const citeIds = IX.citations.get(r.id) || [], cites = [...new Set(citeIds.map(id => (M.block(id) || {}).docId).filter(Boolean))].map(M.doc).filter(Boolean);
      F.set(r.id, { r, hl, notes, quotes, cites, citeIds, embeds: (r.pdf && embBy.get(r.pdf)) || [] });
    }
    LSEARCH._ix = F; LSEARCH._sig = s; LSEARCH._smart = new Map(); return F;
  },
  facts(r) { return LSEARCH.index().get(r.id) || { r, hl: [], notes: [], quotes: [], cites: [], citeIds: [], embeds: [] }; },

  /* ---------- foci, hand-picked and smart ---------- */
  smartOn: () => typeof FEAT === 'undefined' || FEAT.on('libsmart'),
  smartSet(g) {
    if (!g || !g.query || !LSEARCH.smartOn()) return new Set(); LSEARCH.index();
    const c = LSEARCH._smart.get(g.id); if (c && c.q === g.query) return c.set;
    let ids = []; LSEARCH._depth++; try { ids = LSEARCH.run(g.query, { inside: true }).map(x => x.r.id); } finally { LSEARCH._depth--; }   // inside a smart focus, foci are the hand-picked ones (no loops)
    const set = new Set(ids); LSEARCH._smart.set(g.id, { q: g.query, set }); return set;
  },
  /** The papers of a focus: put there by hand, and (a smart focus) the ones its query finds. */
  handOff: g => !!g.query && LSEARCH.smartOn() && typeof FEAT !== 'undefined' && FEAT.tune('libsmart', 'hand') === false,   // Settings → Smart foci: only what the search finds
  members(g) { const s = new Set(LSEARCH.handOff(g) ? [] : (g.paperIds || []).filter(id => M.lib(id))); if (g.query && !LSEARCH._depth) LSEARCH.smartSet(g).forEach(id => s.add(id)); return s; },
  fociOf(r) { return LGROUP.allGroups().filter(g => ((g.paperIds || []).includes(r.id) && !LSEARCH.handOff(g)) || (g.query && !LSEARCH._depth && LSEARCH.smartOn() && LSEARCH.smartSet(g).has(r.id))); },
  fpath(g) { const th = g.themeId && LGROUP.get(g.themeId); return (th ? th.name + ' › ' : '') + g.name; },

  /* ---------- does a paper hold this part of the query? → why, or null ---------- */
  has: (s, v) => String(s == null ? '' : s).toLowerCase().includes(v),
  authors: r => (r.authors || []).map(a => ((a.given || '') + ' ' + (a.family || '')).trim()).filter(Boolean),
  days(r) { const t = Date.parse(String(r.added || '').replace(' ', 'T')); return isNaN(t) ? 1e9 : Math.floor((Date.now() - t) / 864e5); },
  yearOk(y, v) { y = +y || 0; let m; if ((m = v.match(/^(\d{4})\s*-\s*(\d{4})$/))) return y >= +m[1] && y <= +m[2]; if ((m = v.match(/^(>=?|<=?)\s*(\d{4})$/))) return m[1] === '>' ? y > +m[2] : m[1] === '>=' ? y >= +m[2] : m[1] === '<' ? y < +m[2] : y <= +m[2]; return !!y && String(y).startsWith(v); },
  addedOk(r, v) { const d = LSEARCH.days(r); let m; if (v === 'today') return d < 1; if ((m = v.match(/^(\d+)d$/))) return d <= +m[1]; if (v === 'year') return d <= 365; if (v === 'older') return d > 90;
    if ((m = v.match(/^(\d{4})-(\d{2})$/))) return String(r.added || '').slice(0, 7) === m[1] + '-' + m[2]; return true; },
  state(f) { return LIBSTATE.of(f.r, f); },
  inside(f, v) {
    const has = LSEARCH.has, hl = f.hl.find(x => has(x.text, v)); if (hl) return { f: 'highlight · p. ' + hl.page, s: hl.text, b: hl.b };
    const q = f.quotes.find(x => has(x.text, v)); if (q) return { f: 'quote · ' + ((q.doc && q.doc.title) || 'a note'), s: q.text, b: q.b };
    const n = f.notes.find(x => has(x.text, v)); if (n) return { f: n.it ? 'structure' : 'note' + (n.page ? ' · p. ' + n.page : ''), s: n.text, b: n.b };
    return null;
  },
  inText(r, v) { const T = typeof RD2 !== 'undefined' && RD2._texts && RD2._texts.get(r.id); if (!T) return null; for (let i = 0; i < T.length; i++) if (T[i].toLowerCase().includes(v)) return { f: 'pdf · p. ' + (i + 1), s: T[i] }; return null; },
  test(f, t, opt) {
    const r = f.r, v = t.v, has = LSEARCH.has, R = (k, s, x) => Object.assign({ f: k, s: String(s == null ? '' : s) }, x || {});
    switch (t.field) {
      case null: case undefined: {
        if (has(r.title, v)) return R('title', r.title);
        const a = LSEARCH.authors(r).find(x => has(x, v)); if (a) return R('author', a);
        if (has(r.container, v) || has(r.publisher, v)) return R('journal', r.container || r.publisher);
        if (String(r.year || '') === v) return R('year', r.year);
        if (has(r.doi, v)) return R('doi', r.doi);
        if (r.kind === 'link' && has(r.url, v)) return R('link', r.url);
        const g = LSEARCH.fociOf(r).find(g => has(LSEARCH.fpath(g), v)); if (g) return R('focus', LSEARCH.fpath(g));
        if (opt.inside) { const x = LSEARCH.inside(f, v); if (x) return x; }
        if (opt.text) { const x = LSEARCH.inText(r, v); if (x) return x; }
        return null; }
      case 'title': return has(r.title, v) ? R('title', r.title) : null;
      case 'author': { const a = LSEARCH.authors(r).find(x => has(x, v)); return a ? R('author', a) : null; }
      case 'year': return LSEARCH.yearOk(r.year, v) ? R('year', r.year) : null;
      case 'journal': return has(r.container, v) || has(r.publisher, v) ? R('journal', r.container || r.publisher) : null;
      case 'doi': return has(r.doi, v) ? R('doi', r.doi) : null;
      case 'shelf': { const g = LSEARCH.fociOf(r).find(g => { const th = g.themeId && LGROUP.get(g.themeId); return th && has(th.name, v); }); return g ? R('shelf', LGROUP.get(g.themeId).name) : null; }
      case 'focus': { const g = LSEARCH.fociOf(r).find(g => has(LSEARCH.fpath(g), v) || has(g.name, v)); return g ? R('focus', LSEARCH.fpath(g)) : null; }
      case 'cited': { const d = f.cites.find(d => has(d.title, v) || has(M.docPath ? M.docPath(d) : d.title, v)); return d ? R('cited in', d.title || 'Untitled', { doc: d }) : null; }
      case 'hl': { const x = f.hl.find(x => has(x.text, v)); return x ? R('highlight · p. ' + x.page, x.text, { b: x.b }) : null; }
      case 'quote': { const x = f.quotes.find(x => has(x.text, v)); return x ? R('quote · ' + ((x.doc && x.doc.title) || 'a note'), x.text, { b: x.b }) : null; }
      case 'note': { const x = f.notes.find(x => has(x.text, v)); return x ? R(x.it ? 'structure' : 'note', x.text, { b: x.b }) : null; }
      case 'text': return LSEARCH.inText(r, v);
      case 'added': return LSEARCH.addedOk(r, v) ? R('added', fmtDay ? fmtDay(r.added) : r.added) : null;
      case 'kind': return (r.kind || 'paper') === v ? R('kind', v) : null;
      case 'is': {
        const st = LSEARCH.state(f), ok = { unread: st === 'unread', reading: st === 'reading', read: st === 'read', annotated: f.hl.length > 0, cited: f.cites.length > 0, uncited: !f.cites.length, unfiled: !LSEARCH.fociOf(r).length,
          pdf: !!r.pdf, nopdf: !r.pdf, link: r.kind === 'link', paper: r.kind !== 'link', preprint: !!r.isPreprint, flagged: !!M.flagFor('library', r.id) }[v];
        return ok ? R('state', v) : null; }
    }
    return null;
  },
  /** → [{ r, f, why: [{ f, s, v }], score }] */
  run(q, opt = {}) {
    const F = LSEARCH.index(), toks = LSEARCH.parse(q), out = [];
    for (const f of F.values()) {
      const why = []; let ok = true, score = 0;
      for (const t of toks) {
        let hit = null; for (const a of (t.any || [t])) { hit = LSEARCH.test(f, a, opt); if (hit) break; }
        if (t.neg ? hit : !hit) { ok = false; break; }
        if (t.neg) continue;
        why.push(Object.assign({ v: t.v }, hit)); score += /^title/.test(hit.f) ? 3 : /^author/.test(hit.f) ? 2 : /highlight|quote|note|pdf|structure/.test(hit.f) ? .6 : 1;
        if (!t.field && opt.inside && !/highlight|quote|note|pdf|structure/.test(hit.f)) { const x = LSEARCH.inside(f, t.v); if (x) why.push(Object.assign({ v: t.v }, x)); }   // found on the record: say too where it sits inside
      }
      if (ok) out.push({ r: f.r, f, why, score });
    }
    return out;
  },
  records(q) { return LSEARCH.sort(LSEARCH.run(q, { inside: false }), 'rel').map(x => x.r); },
  SORTS: [['rel', 'Best match'], ['new', 'Newest'], ['old', 'Oldest'], ['added', 'Recently added'], ['cited', 'Most cited in notes'], ['hl', 'Most highlighted'], ['az', 'Title A–Z'], ['au', 'First author A–Z']],
  sort(R, how) {
    const fam = r => ((r.authors || [])[0] || {}).family || r.title || '';
    const by = { rel: (a, b) => b.score - a.score || (b.r.year || 0) - (a.r.year || 0), new: (a, b) => (b.r.year || 0) - (a.r.year || 0), old: (a, b) => (a.r.year || 9999) - (b.r.year || 9999), added: (a, b) => String(b.r.added || '').localeCompare(String(a.r.added || '')),
      cited: (a, b) => b.f.cites.length - a.f.cites.length, hl: (a, b) => b.f.hl.length - a.f.hl.length, az: (a, b) => String(a.r.title || '').localeCompare(String(b.r.title || '')), au: (a, b) => fam(a.r).localeCompare(fam(b.r)) }[how] || ((a, b) => b.score - a.score);
    return R.slice().sort(by);
  },
  /** What the results hold: years (in bins), reading states, journals, shelves. */
  facets(R) {
    const ys = R.map(x => +x.r.year).filter(Boolean), y0 = ys.length ? Math.min(...ys) : 2000, y1 = ys.length ? Math.max(...ys) : 2026, step = Math.max(1, Math.ceil((y1 - y0 + 1) / 16)), bins = [];
    for (let y = y0; y <= y1; y += step) bins.push({ a: y, z: Math.min(y1, y + step - 1), n: ys.filter(v => v >= y && v < y + step).length });
    const cnt = (f) => { const m = new Map(); R.forEach(x => [].concat(f(x) || []).forEach(k => m.set(k, (m.get(k) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); };
    const states = ['unread', 'reading', 'read'].map(k => [k, R.filter(x => LSEARCH.state(x.f) === k).length]).concat([['annotated', R.filter(x => x.f.hl.length).length], ['cited', R.filter(x => x.f.cites.length).length]]);
    const journals = cnt(x => x.r.kind === 'link' ? null : (x.r.container || null)).slice(0, 6);
    const shelves = cnt(x => [...new Set(LSEARCH.fociOf(x.r).map(g => g.themeId).filter(Boolean))]).map(([id, n]) => [LGROUP.get(id), n]).filter(x => x[0]);
    return { bins, y0, y1, states, journals, shelves };
  },
  /** Suggestions for the word being typed: a field, or a value of the field. */
  suggest(before) {
    const m = before.match(/(-?)([a-z]*)(:?)("?[^\s"]*)$/i); if (!m || (!m[2] && !m[3])) return null;
    let L = [];
    if (!m[3]) { const w = m[2].toLowerCase(); if (w.length < 1) return null; L = Object.keys(LSEARCH.FIELDS).filter(k => k.startsWith(w) && k !== w && k.length > 2).slice(0, 7).map(k => ({ ins: m[1] + k + ':', label: k + ':', hint: LSEARCH.HINT[k] || '' })); }
    else {
      const f = LSEARCH.FIELDS[m[2].toLowerCase()], v = m[4].replace(/^"/, '').toLowerCase(), L0 = [];
      if (f === 'shelf') LGROUP.themes().forEach(t => L0.push([t.name, plural(LGROUP.groups(t.id).length, 'focus', 'foci')]));
      else if (f === 'focus') LGROUP.allGroups().forEach(g => L0.push([LSEARCH.fpath(g), plural(LSEARCH.members(g).size, 'paper')]));
      else if (f === 'is') LSEARCH.IS.forEach(x => L0.push([x, '']));
      else if (f === 'journal') [...new Set(DB.all('library').map(r => r.container).filter(Boolean))].forEach(x => L0.push([x, '']));
      else if (f === 'author') [...new Set(DB.all('library').flatMap(r => (r.authors || []).map(a => a.family).filter(Boolean)))].forEach(x => L0.push([x, '']));
      else if (f === 'cited') [...new Set([].concat(...[...LSEARCH.index().values()].map(x => x.cites)))].forEach(d => L0.push([d.title || 'Untitled', 'a note']));
      else if (f === 'added') ['today', '7d', '30d', 'year', 'older'].forEach(x => L0.push([x, '']));
      else if (f === 'year') ['>2019', '2010-2019', '<2010'].forEach(x => L0.push([x, '']));
      else if (f === 'kind') ['paper', 'link'].forEach(x => L0.push([x, '']));
      L = L0.filter(([x]) => x.toLowerCase().includes(v) && x.toLowerCase() !== v).slice(0, 8).map(([x, hint]) => ({ ins: m[1] + m[2] + ':' + LSEARCH.quoteV(x.toLowerCase()) + ' ', label: x, hint, val: true }));
    }
    return { list: L, from: before.length - m[0].length };
  },
  /** Read the words of every PDF once in this session (RD2 keeps them), so text: and "inside the PDFs" can find them. */
  async loadTexts(onStep) {
    if (typeof RD2 === 'undefined' || !RD2.texts) return 0;
    const ids = DB.all('library').filter(r => r.pdf && typeof MEDIA !== 'undefined' && MEDIA.get(r.pdf) && !RD2._texts.has(r.id)).map(r => r.id); let n = 0;
    for (const id of ids) { try { await RD2.texts(id); } catch (e) { RD2._texts.set(id, []); } n++; if (onStep) onStep(n, ids.length); }
    return ids.length;
  },
  textsReady: () => typeof RD2 !== 'undefined' && DB.all('library').filter(r => r.pdf).every(r => RD2._texts.has(r.id)),
  /** The words of a reason, with the matched part marked and the rest trimmed round it. */
  mark(s, v, pad = 60) {
    s = String(s || ''); const i = v ? s.toLowerCase().indexOf(v) : -1; if (i < 0) return s.length > pad * 2.4 ? s.slice(0, pad * 2.4) + '…' : s;
    const a = Math.max(0, i - pad), z = Math.min(s.length, i + v.length + pad);
    return [a ? '…' : '', s.slice(a, i), h('mark', s.slice(i, i + v.length)), s.slice(i + v.length, z), z < s.length ? '…' : ''];
  },
};

/* the citation picker and anything else that asks LIB.search: a query with fields goes through LSEARCH */
{ const s0 = LIB.search; LIB.search = function (q) { try { if (typeof FEAT !== 'undefined' && FEAT.on('libsearch') && /(^|\s)-?[a-z]+:\S|"|\sOR\s/i.test(q || '')) return LSEARCH.records(q); } catch (e) { console.warn('[libsearch]', e); } return s0.apply(this, arguments); }; }
/* opening a paper's PDF in the reader makes it "reading" */
{ const r0 = ReaderView.render; ReaderView.render = function (libId) { LIBSTATE.opened(libId); return r0.apply(this, arguments); }; }
