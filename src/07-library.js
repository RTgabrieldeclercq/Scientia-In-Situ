/* ==========================================================================
   07 · Library — ported from doi-lookup-demo (normaliser, sigil, APA rules,
   BibTeX/RIS/CSL parsers). Paste path works offline; DOI lookup is the
   one narrow, user-triggered outbound request, cached forever.
   ========================================================================== */
const LIB = {
  CSL_ACCEPT: 'application/vnd.citationstyles.csl+json',
  normalizeDoi: s => String(s || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').replace(/\s+/g, ''),
  async resolveDoi(raw) {
    const doi = LIB.normalizeDoi(raw);
    if (!/^10\.\d{4,9}\//.test(doi)) throw new Error('That does not look like a DOI.');
    const hit = DB.all('library').find(l => (l.doi || '').toLowerCase() === doi.toLowerCase());
    if (hit) return Object.assign({}, hit, { _cache: true });
    const res = await fetch('https://doi.org/' + doi, { headers: { Accept: LIB.CSL_ACCEPT }, redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' from doi.org');
    return LIB.fromCsl(await res.json());
  },
  fromCsl(csl) {
    const first = v => Array.isArray(v) ? v[0] : v;
    const parts = (csl.issued && csl.issued['date-parts'] && csl.issued['date-parts'][0]) || [], container = first(csl['container-title']) || '';
    return { doi: csl.DOI || '', cslType: csl.type || '', title: first(csl.title) || '', authors: (csl.author || []).map(a => ({ family: a.family || a.literal || '', given: a.given || '' })),
      container, publisher: csl.publisher || '', year: parts[0] || null, volume: csl.volume || '', issue: csl.issue || '', page: csl.page || csl['article-number'] || '',
      issn: first(csl.ISSN) || '', url: csl.URL || '', isPreprint: csl.type === 'posted-content' || !container, csl };
  },
  parseBibtex(src) {
    const head = src.match(/@(\w+)\s*\{([^,]*),/); if (!head) throw new Error('No BibTeX entry found.');
    const fields = {}, body = src.slice(head.index + head[0].length), re = /(\w[\w\-]*)\s*=\s*(\{|"|)/g; let m;
    while ((m = re.exec(body))) {
      const key = m[1].toLowerCase(), open = m[2]; let i = re.lastIndex, val = '';
      if (open === '{') { let depth = 1; while (i < body.length && depth > 0) { const c = body[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) break; } val += c; i++; } }
      else if (open === '"') { while (i < body.length && body[i] !== '"') { val += body[i]; i++; } }
      else { while (i < body.length && !/[,\n}]/.test(body[i])) { val += body[i]; i++; } }
      re.lastIndex = i + 1; fields[key] = val.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
    }
    const authors = (fields.author || '').split(/\s+and\s+/).filter(Boolean).map(a => { if (a.includes(',')) { const [f, g] = a.split(','); return { family: f.trim(), given: (g || '').trim() }; } const p = a.trim().split(/\s+/); return { family: p.pop() || '', given: p.join(' ') }; });
    const container = fields.journal || fields.booktitle || '';
    return { doi: fields.doi || '', cslType: head[1].toLowerCase(), title: fields.title || '', authors, container, publisher: fields.publisher || '', year: parseInt(fields.year, 10) || null,
      volume: fields.volume || '', issue: fields.number || fields.issue || '', page: (fields.pages || '').replace(/--/g, '-'), issn: fields.issn || '', url: fields.url || '', isPreprint: !container, csl: { _source: 'bibtex', fields } };
  },
  parseRis(src) {
    const f = {}, authors = [];
    src.split(/\r?\n/).forEach(line => { const m = line.match(/^([A-Z][A-Z0-9])\s+-\s*(.*)$/); if (!m) return; const [, tag, val] = m;
      if (tag === 'AU' || tag === 'A1') { if (val.includes(',')) { const [fa, gi] = val.split(','); authors.push({ family: fa.trim(), given: (gi || '').trim() }); } else { const p = val.trim().split(/\s+/); authors.push({ family: p.pop() || '', given: p.join(' ') }); } }
      else if (!(tag in f)) f[tag] = val.trim(); });
    const container = f.JO || f.JF || f.T2 || '';
    return { doi: f.DO || '', cslType: f.TY || '', title: f.TI || f.T1 || '', authors, container, publisher: f.PB || '', year: parseInt((f.PY || f.DA || '').slice(0, 4), 10) || null,
      volume: f.VL || '', issue: f.IS || '', page: f.SP ? (f.EP ? f.SP + '-' + f.EP : f.SP) : (f.C7 || ''), issn: f.SN || '', url: f.UR || '', isPreprint: !container, csl: { _source: 'ris', fields: f } };
  },
  parseAny(src) {
    const t = src.trim(); if (!t) throw new Error('Nothing to parse.');
    if (t.startsWith('{') || t.startsWith('[')) { const j = JSON.parse(t); return LIB.fromCsl(Array.isArray(j) ? j[0] : j); }
    if (t.startsWith('@')) return LIB.parseBibtex(t);
    if (/^[A-Z][A-Z0-9]\s+-\s+/m.test(t)) return LIB.parseRis(t);
    throw new Error('Unrecognised format — expected BibTeX, RIS, or CSL-JSON.');
  },
  add(rec) {
    const ex = rec.doi && DB.all('library').find(l => (l.doi || '').toLowerCase() === rec.doi.toLowerCase());
    if (ex) return ex;
    const r = Object.assign({ id: uid('l'), kind: rec.url && !rec.doi && !rec.authors?.length ? 'link' : 'paper', added: isoLocal(new Date()) }, rec);
    delete r._cache; DB.put('library', r); changed(); return r;
  },

  /* ---------- sigil ---------- */
  KNOWN: { 'proceedings of the national academy of sciences': 'PNAS', 'proceedings of the national academy of sciences of the united states of america': 'PNAS', 'plos one': 'PLOS', 'plos biology': 'PLOS',
    'journal of biological chemistry': 'JBC', 'the journal of biological chemistry': 'JBC', 'journal of cell biology': 'JCB', 'the journal of cell biology': 'JCB', 'biophysical journal': 'BpJ', 'biochemistry': 'Bchm',
    'nature': 'Nature', 'science': 'Science', 'cell': 'Cell', 'nature methods': 'NatMe', 'nature communications': 'NatCo', 'molecular biology of the cell': 'MBoC', 'elife': 'eLife', 'scientific reports': 'SciRp', 'bioinformatics': 'Binf' },
  STOP: new Set(['of', 'the', 'and', 'for', 'in', 'on', 'a', 'an', 'de', 'des', 'la', 'le']),
  sigilText(r) {
    if (r.kind === 'link') return 'URL';
    if (r.isPreprint) return (r.publisher || '').toLowerCase().startsWith('openrxiv') || /biorxiv/i.test(r.publisher || '') ? 'bioRx' : 'Prepr';
    const key = (r.container || '').toLowerCase().replace(/\s+/g, ' ').trim(); if (LIB.KNOWN[key]) return LIB.KNOWN[key];
    const w = key.split(/[\s:,\-]+/).filter(x => x && !LIB.STOP.has(x)); if (!w.length) return '??';
    if (w.length === 1) return w[0].charAt(0).toUpperCase() + w[0].slice(1, 5);
    return w.map(x => x.charAt(0).toUpperCase()).join('').slice(0, 5);
  },
  logoKey: r => 'logo:' + (r.issn || r.container || r.publisher || '').toLowerCase(),
  logoFor(r) { const k = LIB.logoKey(r); return DB.all('blobs').find(b => b.name === k); },
  /** Bring your own logo (§10): one image per journal, stored locally, reused by every paper in it. */
  setLogo(r) { const i = h('input', { type: 'file', accept: 'image/*' }); i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const old = LIB.logoFor(r); if (old) DB.del('blobs', old.id); M.putBlob(rd.result, LIB.logoKey(r), f.type); changed(); toast('Logo stored for ' + (LIB.journal(r.container) || 'this journal')); }; rd.readAsDataURL(f); }; i.click(); },
  sigil(r, size) {
    const logo = r.kind !== 'link' && LIB.logoFor(r);
    if (logo) { const el = h('div.sigil.logo', h('img', { src: logo.data, alt: LIB.journal(r.container) })); if (size) el.setAttribute('style', `width:${size}px;height:${size}px`); return el; }
    const hue = hashHue(r.issn || r.container || r.publisher || r.doi || r.url), dk = isDark();
    const st = dk ? `background:hsl(${hue} 42% 18%);color:hsl(${hue} 70% 74%);border:1px solid hsl(${hue} 40% 30%)` : `background:hsl(${hue} 62% 93%);color:hsl(${hue} 62% 30%);border:1px solid hsl(${hue} 45% 78%)`;
    const el = h('div.sigil', LIB.sigilText(r)); el.setAttribute('style', st + (size ? `;width:${size}px;height:${size}px;font-size:${Math.round(size / 4)}px` : '')); return el;
  },

  /* ---------- APA 7 ---------- */
  initials: g => (g || '').split(/[\s.\-]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + '.').join(' '),
  apaAuthors(list) {
    const f = a => a.family ? (a.family + ', ' + LIB.initials(a.given)).trim() : (a.given || '');
    if (!list || !list.length) return ''; if (list.length === 1) return f(list[0]);
    if (list.length <= 20) return list.slice(0, -1).map(f).join(', ') + ', & ' + f(list[list.length - 1]);
    return list.slice(0, 19).map(f).join(', ') + ', … ' + f(list[list.length - 1]);
  },
  sentenceCase(t) { if (!t) return ''; const fw = t.split(/\s+/)[0] || ''; if (/[A-Z]/.test(fw)) return t; if (!/^[a-z]/.test(t)) return t; return t.charAt(0).toUpperCase() + t.slice(1); },
  JD: { 'plos one': 'PLOS One', 'plos biology': 'PLOS Biology', 'elife': 'eLife', 'journal of biological chemistry': 'Journal of Biological Chemistry', 'proceedings of the national academy of sciences': 'Proceedings of the National Academy of Sciences', 'acs nano': 'ACS Nano', 'mbio': 'mBio' },
  journal(j) { const k = String(j || '').toLowerCase().replace(/\s+/g, ' ').trim(); if (LIB.JD[k]) return LIB.JD[k];
    return String(j || '').replace(/\S+/g, (w, i) => /[A-Z]{2,}/.test(w) ? w : (i > 0 && LIB.STOP.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))); },
  apa(r) {
    if (r.kind === 'link') return [r.title, r.url].filter(Boolean).join('. ');
    const au = LIB.apaAuthors(r.authors), yr = r.year ? '(' + r.year + ').' : '(n.d.).', ti = r.title ? LIB.sentenceCase(r.title).replace(/\.\s*$/, '') + '.' : '';
    const url = r.doi ? 'https://doi.org/' + r.doi : (r.url || '');
    if (r.isPreprint) return [au, yr, ti, r.publisher ? LIB.journal(r.publisher) + '.' : 'Preprint.', url].filter(Boolean).join(' ');
    let src = LIB.journal(r.container); if (r.volume) src += ', ' + r.volume; if (r.issue) src += '(' + r.issue + ')'; if (r.page) src += ', ' + r.page;
    return [au, yr, ti, src + '.', url].filter(Boolean).join(' ');
  },
  shortRef(r) {
    if (!r) return '—'; if (r.kind === 'link') return r.title || r.url;
    const a = r.authors || [], n = a.length === 0 ? (r.publisher || 'Anon.') : a.length === 1 ? a[0].family : a.length === 2 ? `${a[0].family} & ${a[1].family}` : `${a[0].family} et al.`;
    return `${n}, ${r.year || 'n.d.'}`;
  },
  /** Display-time rendering of a cite mark: title | author–year | numbered. */
  citeText(r, mode, n) { if (!r) return '[missing]'; return mode === 'author' ? `(${LIB.shortRef(r)})` : mode === 'number' ? `[${n}]` : r.title; },
  hovercard(r) {
    return h('div.hovercard', LIB.sigil(r), h('div', h('div', { style: { fontFamily: 'var(--f-b)', fontStyle: 'italic', fontSize: '14.5px', lineHeight: 1.35 } }, r.title),
      h('div', { style: { fontSize: '12px', color: 'var(--ink-2)', marginTop: '3px' } }, LIB.apaAuthors(r.authors), r.container ? ' — ' : '', h('i', LIB.journal(r.container)), r.year ? ', ' + r.year : ''),
      h('div.apa', LIB.apa(r))));
  },
  search(q) {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    return DB.all('library').map(r => { const hay = [r.title, r.container, r.year, ...(r.authors || []).map(a => a.family + ' ' + a.given), r.doi].join(' ').toLowerCase();
      return { r, s: toks.every(t => hay.includes(t)) ? toks.length + (hay.indexOf(toks[0] || '') === 0 ? 1 : 0) : 0 }; })
      .filter(x => !toks.length || x.s).sort((a, b) => b.s - a.s || (b.r.year || 0) - (a.r.year || 0)).map(x => x.r);
  },
};
